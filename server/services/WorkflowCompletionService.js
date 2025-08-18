const { prisma } = require('../config/prisma');
const AlertGenerationService = require('./AlertGenerationService');

class WorkflowCompletionService {
  /**
   * Complete a workflow line item and progress to the next one
   * @param {string} projectId - Project ID
   * @param {string} lineItemId - Line Item ID to complete
   * @param {string} userId - User ID who completed the item
   * @param {string} notes - Optional completion notes
   * @returns {Promise<Object>} Completion result
   */
  static async completeLineItem(projectId, lineItemId, userId = null, notes = '') {
    console.log(`🚀 Starting line item completion: ${lineItemId} for project ${projectId}`);
    
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Get current project workflow tracker - use findFirst instead of findUnique
        const tracker = await tx.projectWorkflowTracker.findFirst({
          where: { 
            projectId,
            isMainWorkflow: true // Get the main workflow tracker
          },
          include: {
            currentLineItem: {
              include: {
                section: {
                  include: {
                    phase: true
                  }
                }
              }
            },
            currentSection: true,
            currentPhase: true
          }
        });

        if (!tracker) {
          throw new Error(`No workflow tracker found for project ${projectId}`);
        }

        // 2. Verify the line item being completed is the current active one
        if (tracker.currentLineItemId !== lineItemId) {
          console.warn(`⚠️ Completing non-current line item ${lineItemId}, current is ${tracker.currentLineItemId}`);
        }

        // 3. Get the line item being completed
        const completingLineItem = await tx.workflowLineItem.findUnique({
          where: { id: lineItemId },
          include: {
            section: {
              include: {
                phase: true
              }
            }
          }
        });

        if (!completingLineItem) {
          throw new Error(`Line item ${lineItemId} not found`);
        }

        // 4. Record the completion
        const completedItem = await tx.completedWorkflowItem.create({
          data: {
            trackerId: tracker.id,
            phaseId: completingLineItem.section.phase.id,
            sectionId: completingLineItem.section.id,
            lineItemId: lineItemId,
            completedById: userId,
            notes: notes || null,
            completedAt: new Date()
          }
        });

        console.log(`✅ Recorded completion: ${completedItem.id}`);

        // 5. Find the next line item in workflow order
        const nextLineItem = await this.findNextLineItem(tx, projectId, completingLineItem);

        // 6. Update the tracker with new position
        let trackerUpdate = {
          lastCompletedItemId: lineItemId,
          updatedAt: new Date()
        };

        if (nextLineItem) {
          trackerUpdate.currentLineItemId = nextLineItem.id;
          trackerUpdate.currentSectionId = nextLineItem.section.id;
          trackerUpdate.currentPhaseId = nextLineItem.section.phase.id;
          trackerUpdate.lineItemStartedAt = new Date();
          
          // Update phase/section start times if they changed
          if (nextLineItem.section.id !== tracker.currentSectionId) {
            trackerUpdate.sectionStartedAt = new Date();
          }
          if (nextLineItem.section.phase.id !== tracker.currentPhaseId) {
            trackerUpdate.phaseStartedAt = new Date();
          }
        } else {
          // Workflow is complete
          trackerUpdate.currentLineItemId = null;
          trackerUpdate.currentSectionId = null;
          trackerUpdate.currentPhaseId = null;
          console.log('🎉 Workflow completed for project');
        }

        const updatedTracker = await tx.projectWorkflowTracker.update({
          where: { id: tracker.id },
          data: trackerUpdate,
          include: {
            currentLineItem: {
              include: {
                section: {
                  include: {
                    phase: true
                  }
                }
              }
            },
            currentSection: true,
            currentPhase: true
          }
        });

        // 7. Update project progress percentage
        const totalItems = await tx.workflowLineItem.count({
          where: {
            isActive: true,
            isCurrent: true
          }
        });

        const completedCount = await tx.completedWorkflowItem.count({
          where: {
            trackerId: tracker.id
          }
        });

        const progressPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        await tx.project.update({
          where: { id: projectId },
          data: {
            progress: progressPercentage,
            updatedAt: new Date()
          }
        });

        // 8. Delete existing active alerts for the completed item
        // We delete instead of updating to COMPLETED to avoid unique constraint violations
        await tx.workflowAlert.deleteMany({
          where: {
            projectId: projectId,
            lineItemId: lineItemId,
            status: 'ACTIVE'
          }
        });

        console.log(`✅ Line item completion successful. Next item: ${nextLineItem?.itemName || 'WORKFLOW COMPLETE'}`);

        return {
          success: true,
          completedItem: {
            id: completedItem.id,
            lineItemId: lineItemId,
            lineItemName: completingLineItem.itemName,
            sectionName: completingLineItem.section.displayName,
            phaseName: completingLineItem.section.phase.phaseName
          },
          nextItem: nextLineItem ? {
            id: nextLineItem.id,
            lineItemName: nextLineItem.itemName,
            sectionName: nextLineItem.section.displayName,
            phaseName: nextLineItem.section.phase.phaseName,
            responsibleRole: nextLineItem.responsibleRole
          } : null,
          progress: {
            completed: completedCount,
            total: totalItems,
            percentage: progressPercentage
          },
          tracker: updatedTracker
        };
      });
    } catch (error) {
      console.error('❌ Error completing line item:', error);
      throw error;
    }
  }

  /**
   * Find the next line item in workflow order
   * @param {Object} tx - Prisma transaction
   * @param {string} projectId - Project ID
   * @param {Object} currentLineItem - Current line item object
   * @returns {Promise<Object|null>} Next line item or null if complete
   */
  static async findNextLineItem(tx, projectId, currentLineItem) {
    // Get all completed items for this project
    const completedItems = await tx.completedWorkflowItem.findMany({
      where: {
        tracker: {
          projectId: projectId
        }
      },
      select: {
        lineItemId: true
      }
    });

    const completedLineItemIds = completedItems.map(item => item.lineItemId);

    // Find next line item in the same section first
    const nextInSection = await tx.workflowLineItem.findFirst({
      where: {
        sectionId: currentLineItem.sectionId,
        displayOrder: { gt: currentLineItem.displayOrder },
        isActive: true,
        isCurrent: true,
        id: { notIn: completedLineItemIds }
      },
      include: {
        section: {
          include: {
            phase: true
          }
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    if (nextInSection) {
      return nextInSection;
    }

    // Find next section in the same phase
    const nextSection = await tx.workflowSection.findFirst({
      where: {
        phaseId: currentLineItem.section.phaseId,
        displayOrder: { gt: currentLineItem.section.displayOrder },
        isActive: true,
        isCurrent: true
      },
      include: {
        lineItems: {
          where: {
            isActive: true,
            isCurrent: true,
            id: { notIn: completedLineItemIds }
          },
          include: {
            section: {
              include: {
                phase: true
              }
            }
          },
          orderBy: {
            displayOrder: 'asc'
          }
        },
        phase: true
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    if (nextSection && nextSection.lineItems.length > 0) {
      return nextSection.lineItems[0];
    }

    // Find next phase
    const nextPhase = await tx.workflowPhase.findFirst({
      where: {
        displayOrder: { gt: currentLineItem.section.phase.displayOrder },
        isActive: true,
        isCurrent: true
      },
      include: {
        sections: {
          where: {
            isActive: true,
            isCurrent: true
          },
          include: {
            lineItems: {
              where: {
                isActive: true,
                isCurrent: true,
                id: { notIn: completedLineItemIds }
              },
              include: {
                section: {
                  include: {
                    phase: true
                  }
                }
              },
              orderBy: {
                displayOrder: 'asc'
              }
            }
          },
          orderBy: {
            displayOrder: 'asc'
          }
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    if (nextPhase && nextPhase.sections.length > 0) {
      const firstSection = nextPhase.sections[0];
      if (firstSection.lineItems.length > 0) {
        return firstSection.lineItems[0];
      }
    }

    // No more items found - workflow is complete
    return null;
  }

  /**
   * Generate alert for newly active line item
   * @param {string} projectId - Project ID
   * @returns {Promise<Object|null>} Created alert or null
   */
  static async generateAlertForCurrentItem(projectId) {
    try {
      const alerts = await AlertGenerationService.generateBatchAlerts([projectId]);
      return alerts.length > 0 ? alerts[0] : null;
    } catch (error) {
      console.error('❌ Error generating alert for current item:', error);
      return null;
    }
  }
}

module.exports = WorkflowCompletionService;