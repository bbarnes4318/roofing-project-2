const { prisma } = require('../config/prisma');

// OPTIMIZED: Import the optimized workflow functions
// These provide template-instance integration and performance improvements

class WorkflowProgressionService {
  /**
   * MODERNIZED: Initialize workflow using only template system (no WorkflowStep creation)
   */
  async initializeProjectWorkflow(projectId, workflowType = 'ROOFING') {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get the first phase from template system
        const firstPhase = await tx.workflowPhase.findFirst({
          where: { isActive: true, isCurrent: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            sections: {
              where: { isActive: true, isCurrent: true },
              orderBy: { displayOrder: 'asc' },
              include: {
                lineItems: {
                  where: { isActive: true, isCurrent: true },
                  orderBy: { displayOrder: 'asc' }
                }
              }
            }
          }
        });

        if (!firstPhase) {
          throw new Error('No active workflow template found');
        }

        const firstSection = firstPhase.sections[0];
        const firstLineItem = firstSection?.lineItems[0];

        if (!firstLineItem) {
          throw new Error('No line items found in first workflow section');
        }

        // Create project workflow tracker using template references only
        const tracker = await tx.projectWorkflowTracker.create({
          data: {
            projectId,
            currentPhaseId: firstPhase.id,
            currentSectionId: firstSection.id,
            currentLineItemId: firstLineItem.id,
            phaseStartedAt: new Date(),
            sectionStartedAt: new Date(),
            lineItemStartedAt: new Date()
          },
          include: {
            currentPhase: true,
            currentSection: true,
            currentLineItem: true
          }
        });

        console.log(`✅ Initialized workflow for project ${projectId} starting with: ${firstLineItem.itemName}`);
        
        return {
          tracker,
          firstPhase,
          firstSection,
          firstLineItem,
          totalSteps: await this.getTotalLineItemCount(tx)
        };
      });
    } catch (error) {
      console.error('Error initializing project workflow:', error);
      throw error;
    }
  }

  /**
   * Get total count of active line items
   */
  async getTotalLineItemCount(tx) {
    return await tx.workflowLineItem.count({
      where: {
        isActive: true,
        isCurrent: true
      }
    });
  }

  /**
   * Get current workflow position for a project
   */
  async getCurrentPosition(projectId) {
    try {
      const tracker = await prisma.projectWorkflowTracker.findUnique({
        where: { projectId },
        include: {
          currentPhase: true,
          currentSection: true,
          currentLineItem: {
            include: {
              section: {
                include: {
                  phase: true
                }
              }
            }
          }
        }
      });

      if (!tracker) {
        // Initialize if not exists
        return await this.initializeProjectWorkflow(projectId);
      }

      return tracker;
    } catch (error) {
      console.error('Error getting current position:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Complete workflow item with template-instance consistency
   */
  async completeLineItem(projectId, lineItemId, completedById = null, notes = null, io = null) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // OPTIMIZED: Get tracker with instance references
        const tracker = await tx.projectWorkflowTracker.findUnique({
          where: { projectId },
          select: { 
            id: true, 
            currentLineItemId: true,
            currentPhaseId: true,
            currentSectionId: true,
            currentStepId: true,
            workflowInstanceId: true
          }
        });

        console.log(`🔍 VALIDATION: tracker.currentLineItemId: ${tracker?.currentLineItemId}, requested lineItemId: ${lineItemId}`);
        
        if (!tracker) {
          throw new Error('No workflow tracker found for project');
        }
        
        // Allow completing any line item (not just the current active one)
        // This enables users to complete workflow items in any order
        console.log(`✅ VALIDATION: Allowing completion of line item ${lineItemId}`);
        
        // Check if the line item exists in the workflow
        const lineItemExists = await tx.workflowLineItem.findUnique({
          where: { id: lineItemId },
          select: { id: true, itemName: true }
        });
        
        if (!lineItemExists) {
          throw new Error(`Line item ${lineItemId} not found in workflow`);
        }

        // OPTIMIZED: Mark corresponding workflow step as completed
        if (tracker.currentStepId) {
          await tx.workflowStep.update({
            where: { id: tracker.currentStepId },
            data: {
              isCompleted: true,
              completedAt: new Date(),
              completedById,
              completionNotes: notes,
              state: 'COMPLETED'
            }
          });
        }

        // Record completion
        const completion = await tx.completedWorkflowItem.create({
          data: {
            trackerId: tracker.id,
            phaseId: tracker.currentPhaseId,
            sectionId: tracker.currentSectionId,
            lineItemId: lineItemId,
            completedById,
            notes
          }
        });

        // OPTIMIZED: Use database function for progression
        const nextStepResult = await tx.$queryRaw`
          SELECT * FROM progress_to_next_workflow_step(${projectId}, ${tracker.currentStepId})
        `;

        const nextStep = nextStepResult[0];

        // Find next position in template system
        // If completing the current line item, find the next one
        // If completing a different line item, keep current position but update completed items
        console.log(`🔍 NEXT POSITION: Looking for next line item after completed: ${lineItemId}`);
        const nextPosition = await this.findNextLineItem(
          tracker.currentPhaseId,
          tracker.currentSectionId,
          lineItemId
        );
        console.log(`🔍 NEXT POSITION: Found next position:`, JSON.stringify(nextPosition, null, 2));

        // Update tracker
        // Only update current position if we completed the current active line item
        // Otherwise just track the completion
        const trackerUpdates = {
          lastCompletedItemId: lineItemId
        };
        
        // If completing the current active line item, advance to next position
        if (tracker.currentLineItemId === lineItemId && nextPosition.updates.currentLineItemId) {
          console.log(`🔄 ADVANCING: Moving from ${lineItemId} to ${nextPosition.updates.currentLineItemId}`);
          Object.assign(trackerUpdates, nextPosition.updates);
        } else {
          console.log(`📝 TRACKING: Completed ${lineItemId} but keeping current position at ${tracker.currentLineItemId}`);
        }
        
        const updatedTracker = await tx.projectWorkflowTracker.update({
          where: { id: tracker.id },
          data: trackerUpdates
        });

        // Complete old alerts WITHIN TRANSACTION
        // Get the line item data to find the step name
        const lineItemData = await tx.workflowLineItem.findUnique({
          where: { id: lineItemId }
        });
        
        let completedAlerts = { count: 0 };
        if (lineItemData) {
          // Complete alerts by project and step name
          completedAlerts = await tx.workflowAlert.updateMany({
            where: { 
              projectId: projectId,
              stepName: lineItemData.itemName,
              status: 'ACTIVE' 
            },
            data: { 
              status: 'COMPLETED',
              acknowledgedAt: new Date()
            }
          });
        }

        // Generate new alert AFTER transaction
        // Find next uncompleted line item that needs an alert
        let alertLineItemId = null;
        
        // First priority: if we're advancing to a new line item, generate alert for it
        if (nextPosition.updates.currentLineItemId && tracker.currentLineItemId === lineItemId) {
          alertLineItemId = nextPosition.updates.currentLineItemId;
          console.log(`🔔 ALERT GENERATION: Advancing to next item, will generate alert for: ${alertLineItemId}`);
        } else {
          // Otherwise, find the first uncompleted line item that doesn't have an active alert
          console.log(`🔔 ALERT GENERATION: Finding next uncompleted line item that needs an alert`);
          
          // Get all completed line items for this project
          const completedItems = await prisma.completedWorkflowItem.findMany({
            where: { trackerId: tracker.id },
            select: { lineItemId: true }
          });
          const completedItemIds = new Set(completedItems.map(item => item.lineItemId));
          
          // Get all active alerts for this project
          const activeAlerts = await prisma.workflowAlert.findMany({
            where: { 
              projectId: projectId,
              status: 'ACTIVE'
            },
            select: { stepName: true }
          });
          const alertedStepNames = new Set(activeAlerts.map(alert => alert.stepName));
          
          // Find next uncompleted line item that doesn't have an alert
          const nextUncompleted = await prisma.workflowLineItem.findFirst({
            where: {
              isActive: true,
              id: { notIn: Array.from(completedItemIds) }
            },
            orderBy: { displayOrder: 'asc' },
            include: {
              section: {
                include: {
                  phase: true
                }
              }
            }
          });
          
          if (nextUncompleted && !alertedStepNames.has(nextUncompleted.itemName)) {
            alertLineItemId = nextUncompleted.id;
            console.log(`🔔 ALERT GENERATION: Found uncompleted item without alert: ${nextUncompleted.itemName} (${alertLineItemId})`);
          }
        }
        
        console.log(`🔔 ALERT GENERATION: Will generate alert for line item: ${alertLineItemId}`);
        let newAlert = null;
        if (alertLineItemId) {
          console.log(`🔔 ALERT GENERATION: Starting alert generation for line item: ${alertLineItemId}`);
          try {
            // Get line item data for alert
            const lineItemData = await prisma.workflowLineItem.findUnique({
              where: { id: alertLineItemId },
              include: {
                section: {
                  include: {
                    phase: true
                  }
                }
              }
            });

            if (lineItemData) {
              // Get project data
              const projectData = await prisma.project.findUnique({
                where: { id: projectId },
                include: {
                  customer: true,
                  projectManager: true
                }
              });

              // Find the project workflow
              const projectWorkflow = await prisma.projectWorkflow.findFirst({
                where: { projectId: projectId }
              });

              if (projectData && projectWorkflow) {
                // Create or find a WorkflowStep for this line item
                let workflowStep = await prisma.workflowStep.findFirst({
                  where: {
                    workflowId: projectWorkflow.id,
                    stepName: lineItemData.itemName
                  }
                });

                if (!workflowStep) {
                  // Create a new workflow step for this line item
                  // Generate stepId based on phase and step name
                  const stepId = `${lineItemData.section.phase?.phaseType || 'GENERAL'}-${lineItemData.itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                  
                  workflowStep = await prisma.workflowStep.create({
                    data: {
                      workflowId: projectWorkflow.id,
                      stepId: stepId,
                      stepName: lineItemData.itemName,
                      description: lineItemData.description || lineItemData.itemName,
                      phase: lineItemData.section.phase?.phaseType || 'LEAD',
                      defaultResponsible: lineItemData.responsibleRole,
                      estimatedDuration: Math.ceil(lineItemData.estimatedMinutes / 60),
                      stepOrder: lineItemData.displayOrder
                    }
                  });
                }

                // Create alert with proper relationships
                newAlert = await prisma.workflowAlert.create({
                  data: {
                    type: 'Work Flow Line Item',
                    priority: 'MEDIUM',
                    status: 'ACTIVE',
                    title: `${lineItemData.itemName} - ${projectData.customer?.primaryName || 'Customer'}`,
                    message: `${lineItemData.itemName} is now ready to be completed for project ${projectData.projectName}`,
                    stepName: lineItemData.itemName,
                    responsibleRole: lineItemData.responsibleRole,
                    dueDate: new Date(Date.now() + (lineItemData.alertDays || 1) * 24 * 60 * 60 * 1000),
                    projectId: projectId,
                    workflowId: projectWorkflow.id,
                    stepId: workflowStep.id,
                    assignedToId: projectData.projectManagerId,
                    createdById: completedById,
                    metadata: {
                      phase: lineItemData.section.phase.phaseType,
                      phaseId: lineItemData.section.phase.id,
                      section: lineItemData.section.displayName,
                      sectionId: lineItemData.section.id,
                      lineItem: lineItemData.itemName,
                      lineItemId: alertLineItemId,
                      projectNumber: projectData.projectNumber,
                      projectId: projectId,
                      workflowId: projectWorkflow.id,
                      responsibleRole: lineItemData.responsibleRole
                    }
                  }
                });

                console.log(`✅ Created alert for next line item: ${lineItemData.itemName}`);
              }
            }
          } catch (alertError) {
            console.error('❌ ALERT GENERATION: Error creating alert:', alertError);
            console.error('❌ ALERT GENERATION: Alert error details:', alertError.message);
            // Don't fail the entire transaction if alert creation fails
          }
        } else {
          console.log(`🔔 ALERT GENERATION: No next line item found, not generating alert`);
        }

        console.log(`✅ Completed line item and progressed workflow for project ${projectId}`);
        
        return {
          tracker: updatedTracker,
          completion,
          completedPhase: nextPosition.completedPhase,
          completedSection: nextPosition.completedSection,
          isWorkflowComplete: nextPosition.isComplete,
          newAlert,
          completedAlertsCount: completedAlerts.count
        };
      }, {
        maxWait: 5000, // 5 second max wait
        timeout: 10000 // 10 second timeout
      });

      // Emit socket events AFTER transaction commits successfully
      if (io && result.newAlert) {
        // Emit to assigned user
        io.to(`user_${result.newAlert.assignedToId}`).emit('new_alert', {
          id: result.newAlert.id,
          title: result.newAlert.title,
          message: result.newAlert.message,
          priority: result.newAlert.priority,
          projectId: result.newAlert.projectId
        });
        
        // Emit workflow update to project room
        io.to(`project_${projectId}`).emit('workflow_updated', {
          projectId,
          lineItemCompleted: lineItemId,
          newActiveItem: result.tracker.currentLineItemId,
          isComplete: result.isWorkflowComplete
        });
        
        // Request alerts refresh
        io.to(`project_${projectId}`).emit('alerts_refresh', {
          projectId,
          type: 'workflow_progression'
        });
      }

      return result;
    } catch (error) {
      console.error('Error completing line item:', error);
      throw error;
    }
  }

  /**
   * Find the next line item in the workflow (OPTIMIZED with raw SQL)
   */
  async findNextLineItem(currentPhaseId, currentSectionId, currentLineItemId) {
    try {
      // Get current item position with single query
      const currentItem = await prisma.$queryRaw`
        SELECT 
          wli.id,
          wli."displayOrder" AS "displayOrder",
          wli.section_id AS "sectionId",
          ws."displayOrder" AS "sectionOrder",
          ws.phase_id AS "phaseId",
          wp."displayOrder" AS "phaseOrder"
        FROM workflow_line_items wli
        JOIN workflow_sections ws ON wli.section_id = ws.id
        JOIN workflow_phases wp ON ws.phase_id = wp.id
        WHERE wli.id = ${currentLineItemId}
      `;

      if (!currentItem?.[0]) {
        throw new Error('Current line item not found');
      }

      const current = currentItem[0];

      // Try to find next item in same section
      const nextInSection = await prisma.$queryRaw`
        SELECT id, "displayOrder" AS "displayOrder"
        FROM workflow_line_items
        WHERE section_id = ${current.sectionId}
          AND "displayOrder" > ${current.displayOrder}
          AND "isActive" = true
        ORDER BY "displayOrder" ASC
        LIMIT 1
      `;

      if (nextInSection?.[0]) {
        return {
          updates: {
            currentLineItemId: nextInSection[0].id,
            lineItemStartedAt: new Date()
          },
          completedSection: false,
          completedPhase: false,
          isComplete: false
        };
      }

      // Find next section in same phase
      const nextSection = await prisma.$queryRaw`
        SELECT ws.id, wli.id AS "firstLineItemId"
        FROM workflow_sections ws
        JOIN workflow_line_items wli ON ws.id = wli.section_id
        WHERE ws.phase_id = ${current.phaseId}
          AND ws."displayOrder" > ${current.sectionOrder}
          AND ws."isActive" = true
          AND wli."isActive" = true
        ORDER BY ws."displayOrder" ASC, wli."displayOrder" ASC
        LIMIT 1
      `;

      if (nextSection?.[0]) {
        return {
          updates: {
            currentSectionId: nextSection[0].id,
            currentLineItemId: nextSection[0].firstLineItemId,
            sectionStartedAt: new Date(),
            lineItemStartedAt: new Date()
          },
          completedSection: true,
          completedPhase: false,
          isComplete: false
        };
      }

      // Find next phase
      const nextPhase = await prisma.$queryRaw`
        SELECT wp.id AS "phaseId", ws.id AS "sectionId", wli.id AS "lineItemId"
        FROM workflow_phases wp
        JOIN workflow_sections ws ON wp.id = ws.phase_id
        JOIN workflow_line_items wli ON ws.id = wli.section_id
        WHERE wp."displayOrder" > ${current.phaseOrder}
          AND wp."isActive" = true
          AND ws."isActive" = true
          AND wli."isActive" = true
        ORDER BY wp."displayOrder" ASC, ws."displayOrder" ASC, wli."displayOrder" ASC
        LIMIT 1
      `;

      if (nextPhase?.[0]) {
        return {
          updates: {
            currentPhaseId: nextPhase[0].phaseId,
            currentSectionId: nextPhase[0].sectionId,
            currentLineItemId: nextPhase[0].lineItemId,
            phaseStartedAt: new Date(),
            sectionStartedAt: new Date(),
            lineItemStartedAt: new Date()
          },
          completedSection: true,
          completedPhase: true,
          isComplete: false
        };
      }

      // Workflow complete
      return {
        updates: {
          currentPhaseId: null,
          currentSectionId: null,
          currentLineItemId: null
        },
        completedSection: true,
        completedPhase: true,
        isComplete: true
      };
    } catch (error) {
      console.error('Error finding next line item:', error);
      throw error;
    }
  }

  /**
   * Get workflow status for a project
   */
  async getWorkflowStatus(projectId) {
    try {
      const tracker = await this.getCurrentPosition(projectId);
      
      // Get the project with phase overrides
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          phaseOverrides: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      // Count completed items
      const completedCount = await prisma.completedWorkflowItem.count({
        where: { trackerId: tracker.id }
      });

      // Count total items
      const totalItems = await prisma.workflowLineItem.count({
        where: { isActive: true }
      });

      // If there's an active phase override, we need to count skipped phase items as completed
      let adjustedCompletedCount = completedCount;
      if (project?.phaseOverrides?.length > 0) {
        const override = project.phaseOverrides[0];
        const skippedPhases = override.suppressAlertsFor || [];
        
        // Count items in skipped phases
        if (skippedPhases.length > 0) {
          const skippedItemsCount = await prisma.workflowLineItem.count({
            where: {
              isActive: true,
              section: {
                phase: {
                  phaseType: {
                    in: skippedPhases
                  }
                }
              }
            }
          });
          
          // Add skipped items to completed count for progress calculation
          adjustedCompletedCount += skippedItemsCount;
          console.log(`📊 Added ${skippedItemsCount} skipped items to progress calculation for project ${projectId}`);
        }
      }

      // Calculate progress percentage with adjusted count
      const progress = totalItems > 0 ? Math.round((adjustedCompletedCount / totalItems) * 100) : 0;

      return {
        tracker,
        completedItems: completedCount,
        skippedItems: adjustedCompletedCount - completedCount,
        adjustedCompletedItems: adjustedCompletedCount,
        totalItems,
        progress,
        hasPhaseOverride: project?.phaseOverrides?.length > 0,
        isComplete: tracker.currentLineItemId === null
      };
    } catch (error) {
      console.error('Error getting workflow status:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Generate alert for a workflow step
   */
  async generateAlertForStep(tx, step, projectId) {
    try {
      // Check if alert already exists
      const existingAlert = await tx.workflowAlert.findFirst({
        where: {
          projectId,
          stepId: step.id,
          status: 'ACTIVE'
        }
      });

      if (existingAlert) {
        return existingAlert;
      }

      const alert = await tx.workflowAlert.create({
        data: {
          type: 'Work Flow Line Item',
          priority: step.alertPriority,
          status: 'ACTIVE',
          title: `Action Required: ${step.stepName}`,
          message: `Please complete the workflow step: ${step.stepName}`,
          stepName: step.stepName,
          projectId,
          workflowId: step.workflowId,
          stepId: step.id,
          responsibleRole: step.defaultResponsible,
          dueDate: new Date(Date.now() + (step.alertDays * 24 * 60 * 60 * 1000))
        }
      });

      console.log(`✅ Generated alert for step: ${step.stepName}`);
      return alert;
    } catch (error) {
      console.error('❌ Error generating alert:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Get comprehensive project workflow status using database view
   */
  async getOptimizedWorkflowStatus(projectId) {
    try {
      // Use optimized database view
      const status = await prisma.$queryRaw`
        SELECT * FROM workflow_status_view WHERE project_id = ${projectId}
      `;

      if (!status || status.length === 0) {
        return null;
      }

      const projectStatus = status[0];

      // Get the project with phase overrides
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          phaseOverrides: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      // Get completed items for progress tracking
      const completedItems = await prisma.completedWorkflowItem.findMany({
        where: {
          tracker: {
            projectId
          }
        },
        include: {
          tracker: {
            include: {
              currentPhase: true,
              currentSection: true,
              currentLineItem: true
            }
          }
        },
        orderBy: { completedAt: 'desc' }
      });

      // Get active alerts
      const activeAlerts = await prisma.workflowAlert.findMany({
        where: {
          projectId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      });

      // Adjust progress if there are phase overrides
      let adjustedProgress = projectStatus.overall_progress || 0;
      if (project?.phaseOverrides?.length > 0) {
        const override = project.phaseOverrides[0];
        const skippedPhases = override.suppressAlertsFor || [];
        
        if (skippedPhases.length > 0) {
          // Get total items and items in skipped phases
          const totalItems = await prisma.workflowLineItem.count({
            where: { isActive: true }
          });
          
          const skippedItemsCount = await prisma.workflowLineItem.count({
            where: {
              isActive: true,
              section: {
                phase: {
                  phaseType: {
                    in: skippedPhases
                  }
                }
              }
            }
          });
          
          // Recalculate progress with skipped items counted as completed
          const adjustedCompletedCount = completedItems.length + skippedItemsCount;
          adjustedProgress = totalItems > 0 ? Math.round((adjustedCompletedCount / totalItems) * 100) : 0;
          
          console.log(`📊 Adjusted progress for project ${projectId}: ${adjustedProgress}% (added ${skippedItemsCount} skipped items)`);
        }
      }

      return {
        ...projectStatus,
        completedItems,
        activeAlerts,
        alertCount: activeAlerts.length,
        overall_progress: adjustedProgress,
        hasPhaseOverride: project?.phaseOverrides?.length > 0
      };
    } catch (error) {
      console.error('❌ Error getting optimized workflow status:', error);
      // Fallback to original method
      return await this.getWorkflowStatus(projectId);
    }
  }

  /**
   * OPTIMIZED: Validate workflow state transition
   */
  async validateStateTransition(stepId, newState) {
    try {
      const step = await prisma.workflowStep.findUnique({
        where: { id: stepId },
        select: { state: true, assignedToId: true }
      });

      if (!step) {
        throw new Error('Workflow step not found');
      }

      const validTransitions = {
        'PENDING': ['ACTIVE', 'SKIPPED'],
        'ACTIVE': ['IN_PROGRESS', 'SKIPPED'],
        'IN_PROGRESS': ['COMPLETED', 'BLOCKED'],
        'BLOCKED': ['ACTIVE', 'IN_PROGRESS'],
        'SKIPPED': ['ACTIVE'],
        'COMPLETED': ['ACTIVE'] // Allow reopening if needed
      };

      const allowedTransitions = validTransitions[step.state] || [];
      
      if (!allowedTransitions.includes(newState)) {
        throw new Error(`Invalid state transition from ${step.state} to ${newState}`);
      }

      if (newState === 'IN_PROGRESS' && !step.assignedToId) {
        throw new Error('Cannot set state to IN_PROGRESS without assignment');
      }

      return true;
    } catch (error) {
      console.error('❌ Error validating state transition:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Update workflow step state
   */
  async updateStepState(stepId, newState, userId) {
    try {
      await this.validateStateTransition(stepId, newState);

      const updatedStep = await prisma.workflowStep.update({
        where: { id: stepId },
        data: { 
          state: newState,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Updated step ${stepId} state to ${newState}`);
      return updatedStep;
    } catch (error) {
      console.error('❌ Error updating step state:', error);
      throw error;
    }
  }
}

module.exports = new WorkflowProgressionService();