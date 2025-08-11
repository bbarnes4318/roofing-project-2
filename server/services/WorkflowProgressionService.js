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
   * Complete a line item and progress to the next (TRANSACTION-SAFE with alert generation)
   */
  async completeLineItem(projectId, lineItemId, completedById = null, notes = null, io = null) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get tracker with minimal data
        const tracker = await tx.projectWorkflowTracker.findUnique({
          where: { projectId },
          select: { 
            id: true, 
            currentLineItemId: true,
            currentPhaseId: true,
            currentSectionId: true
          }
        });

        if (!tracker || tracker.currentLineItemId !== lineItemId) {
          throw new Error('Can only complete the current active line item');
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

        // Find next position
        const nextPosition = await this.findNextLineItem(
          tracker.currentPhaseId,
          tracker.currentSectionId,
          tracker.currentLineItemId
        );

        // Update tracker
        const updatedTracker = await tx.projectWorkflowTracker.update({
          where: { id: tracker.id },
          data: {
            lastCompletedItemId: lineItemId,
            ...nextPosition.updates
          }
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
        let newAlert = null;
        if (nextPosition.updates.currentLineItemId) {
          try {
            // Get line item data for alert
            const lineItemData = await prisma.workflowLineItem.findUnique({
              where: { id: nextPosition.updates.currentLineItemId },
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
                  workflowStep = await prisma.workflowStep.create({
                    data: {
                      workflowId: projectWorkflow.id,
                      stepName: lineItemData.itemName,
                      description: lineItemData.description || lineItemData.itemName,
                      responsibleRole: lineItemData.responsibleRole,
                      estimatedHours: Math.ceil(lineItemData.estimatedMinutes / 60),
                      status: 'PENDING',
                      priority: 'MEDIUM',
                      displayOrder: lineItemData.displayOrder
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
                    createdById: completedById
                  }
                });

                console.log(`✅ Created alert for next line item: ${lineItemData.itemName}`);
              }
            }
          } catch (alertError) {
            console.error('Error creating alert:', alertError);
            // Don't fail the entire transaction if alert creation fails
          }
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