const { prisma } = require('../config/prisma');

class WorkflowProgressionService {
  /**
   * Initialize workflow tracker for a new project
   */
  async initializeProjectWorkflow(projectId) {
    try {
      // Get the first phase, section, and line item
      const firstPhase = await prisma.workflowPhase.findFirst({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          sections: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            take: 1,
            include: {
              lineItems: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
                take: 1
              }
            }
          }
        }
      });

      if (!firstPhase || !firstPhase.sections[0] || !firstPhase.sections[0].lineItems[0]) {
        throw new Error('No active workflow structure found');
      }

      const firstSection = firstPhase.sections[0];
      const firstLineItem = firstSection.lineItems[0];

      // Create workflow tracker
      const tracker = await prisma.projectWorkflowTracker.create({
        data: {
          projectId,
          currentPhaseId: firstPhase.id,
          currentSectionId: firstSection.id,
          currentLineItemId: firstLineItem.id,
          phaseStartedAt: new Date(),
          sectionStartedAt: new Date(),
          lineItemStartedAt: new Date()
        }
      });

      console.log(`✅ Initialized workflow for project ${projectId}`);
      return tracker;
    } catch (error) {
      console.error('Error initializing project workflow:', error);
      throw error;
    }
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
   * Complete a line item and progress to the next
   */
  async completeLineItem(projectId, lineItemId, completedById = null, notes = null) {
    try {
      const tracker = await this.getCurrentPosition(projectId);
      
      // Verify this is the current line item
      if (tracker.currentLineItemId !== lineItemId) {
        throw new Error('Can only complete the current active line item');
      }

      // Record completion
      await prisma.completedWorkflowItem.create({
        data: {
          trackerId: tracker.id,
          phaseId: tracker.currentPhaseId,
          sectionId: tracker.currentSectionId,
          lineItemId: lineItemId,
          completedById,
          notes
        }
      });

      // Find the next line item
      const nextPosition = await this.findNextLineItem(
        tracker.currentPhaseId,
        tracker.currentSectionId,
        tracker.currentLineItemId
      );

      // Update tracker with new position
      const updateData = {
        lastCompletedItemId: lineItemId,
        ...nextPosition.updates
      };

      const updatedTracker = await prisma.projectWorkflowTracker.update({
        where: { id: tracker.id },
        data: updateData,
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

      console.log(`✅ Completed line item and progressed workflow for project ${projectId}`);
      
      return {
        tracker: updatedTracker,
        completedPhase: nextPosition.completedPhase,
        completedSection: nextPosition.completedSection,
        isWorkflowComplete: nextPosition.isComplete
      };
    } catch (error) {
      console.error('Error completing line item:', error);
      throw error;
    }
  }

  /**
   * Find the next line item in the workflow
   */
  async findNextLineItem(currentPhaseId, currentSectionId, currentLineItemId) {
    try {
      // Get current line item with its order
      const currentItem = await prisma.workflowLineItem.findUnique({
        where: { id: currentLineItemId },
        include: {
          section: {
            include: {
              phase: true,
              lineItems: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' }
              }
            }
          }
        }
      });

      if (!currentItem) {
        throw new Error('Current line item not found');
      }

      // Try to find next line item in the same section
      const nextItemInSection = currentItem.section.lineItems.find(
        item => item.displayOrder > currentItem.displayOrder
      );

      if (nextItemInSection) {
        return {
          updates: {
            currentLineItemId: nextItemInSection.id,
            lineItemStartedAt: new Date()
          },
          completedPhase: false,
          completedSection: false,
          isComplete: false
        };
      }

      // No more items in section, find next section in phase
      const currentPhase = await prisma.workflowPhase.findUnique({
        where: { id: currentPhaseId },
        include: {
          sections: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            include: {
              lineItems: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
                take: 1
              }
            }
          }
        }
      });

      const nextSection = currentPhase.sections.find(
        section => section.displayOrder > currentItem.section.displayOrder && section.lineItems.length > 0
      );

      if (nextSection && nextSection.lineItems[0]) {
        return {
          updates: {
            currentSectionId: nextSection.id,
            currentLineItemId: nextSection.lineItems[0].id,
            sectionStartedAt: new Date(),
            lineItemStartedAt: new Date()
          },
          completedPhase: false,
          completedSection: true,
          isComplete: false
        };
      }

      // No more sections in phase, find next phase
      const allPhases = await prisma.workflowPhase.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          sections: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            take: 1,
            include: {
              lineItems: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
                take: 1
              }
            }
          }
        }
      });

      const nextPhase = allPhases.find(
        phase => phase.displayOrder > currentPhase.displayOrder && 
                 phase.sections.length > 0 && 
                 phase.sections[0].lineItems.length > 0
      );

      if (nextPhase) {
        return {
          updates: {
            currentPhaseId: nextPhase.id,
            currentSectionId: nextPhase.sections[0].id,
            currentLineItemId: nextPhase.sections[0].lineItems[0].id,
            phaseStartedAt: new Date(),
            sectionStartedAt: new Date(),
            lineItemStartedAt: new Date()
          },
          completedPhase: true,
          completedSection: true,
          isComplete: false
        };
      }

      // No more phases, workflow is complete
      return {
        updates: {
          currentLineItemId: null,
          currentSectionId: null,
          currentPhaseId: null
        },
        completedPhase: true,
        completedSection: true,
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
      
      // Count completed items
      const completedCount = await prisma.completedWorkflowItem.count({
        where: { trackerId: tracker.id }
      });

      // Count total items
      const totalItems = await prisma.workflowLineItem.count({
        where: { isActive: true }
      });

      // Calculate progress percentage
      const progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

      return {
        tracker,
        completedItems: completedCount,
        totalItems,
        progress,
        isComplete: tracker.currentLineItemId === null
      };
    } catch (error) {
      console.error('Error getting workflow status:', error);
      throw error;
    }
  }
}

module.exports = new WorkflowProgressionService();