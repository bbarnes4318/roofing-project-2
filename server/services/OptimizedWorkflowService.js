/**
 * Optimized Workflow Service
 * Updated: 2025-08-12
 * Purpose: Handle workflow operations with consolidated template-instance system
 */

const { prisma } = require('../config/prisma');

class OptimizedWorkflowService {
  /**
   * Initialize workflow for a new project with both template and instance systems
   */
  async initializeProjectWorkflow(projectId, workflowType = 'ROOFING') {
    try {
      return await prisma.$transaction(async (tx) => {
        // Create project workflow instance
        const projectWorkflow = await tx.projectWorkflow.create({
          data: {
            projectId,
            workflowType,
            status: 'IN_PROGRESS',
            currentStepIndex: 0,
            overallProgress: 0,
            workflowStartDate: new Date(),
            enableAlerts: true,
            alertMethods: ['IN_APP', 'EMAIL'],
            escalationEnabled: true,
            escalationDelayDays: 2
          }
        });

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

        // Create workflow steps from template
        let stepOrder = 1;
        const createdSteps = [];

        for (const section of firstPhase.sections) {
          for (const lineItem of section.lineItems) {
            const step = await tx.workflowStep.create({
              data: {
                stepId: `${section.sectionNumber}${lineItem.itemLetter}`,
                stepName: lineItem.itemName,
                description: lineItem.description || '',
                phase: firstPhase.phaseType,
                defaultResponsible: lineItem.responsibleRole,
                estimatedDuration: lineItem.estimatedMinutes,
                stepOrder,
                alertPriority: 'MEDIUM',
                alertDays: lineItem.alertDays,
                workflowId: projectWorkflow.id,
                // Link to template system
                templatePhaseId: firstPhase.id,
                templateSectionId: section.id,
                templateLineItemId: lineItem.id,
                state: stepOrder === 1 ? 'ACTIVE' : 'PENDING'
              }
            });
            createdSteps.push(step);
            stepOrder++;
          }
        }

        // Create project workflow tracker
        const firstSection = firstPhase.sections[0];
        const firstLineItem = firstSection?.lineItems[0];
        const firstStep = createdSteps[0];

        const tracker = await tx.projectWorkflowTracker.create({
          data: {
            projectId,
            currentPhaseId: firstPhase.id,
            currentSectionId: firstSection?.id,
            currentLineItemId: firstLineItem?.id,
            currentStepId: firstStep?.id,
            workflowInstanceId: projectWorkflow.id,
            phaseStartedAt: new Date(),
            sectionStartedAt: new Date(),
            lineItemStartedAt: new Date()
          }
        });

        // Generate initial alert for first step
        if (firstStep) {
          await this.generateAlertForStep(tx, firstStep, projectId);
        }

        console.log(`✅ Initialized optimized workflow for project ${projectId} with ${createdSteps.length} steps`);
        
        return {
          projectWorkflow,
          tracker,
          steps: createdSteps,
          totalSteps: createdSteps.length
        };
      });
    } catch (error) {
      console.error('❌ Error initializing project workflow:', error);
      throw error;
    }
  }

  /**
   * Complete a workflow line item and progress to next
   */
  async completeWorkflowItem(projectId, stepId, completedById, notes) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get current step with template references
        const currentStep = await tx.workflowStep.findUnique({
          where: { id: stepId },
          include: {
            workflow: true,
            templatePhase: true,
            templateSection: true,
            templateLineItem: true
          }
        });

        if (!currentStep) {
          throw new Error('Workflow step not found');
        }

        if (currentStep.isCompleted) {
          throw new Error('Step is already completed');
        }

        // Mark step as completed
        await tx.workflowStep.update({
          where: { id: stepId },
          data: {
            isCompleted: true,
            completedAt: new Date(),
            completedById,
            completionNotes: notes,
            state: 'COMPLETED'
          }
        });

        // Record completion in history
        const tracker = await tx.projectWorkflowTracker.findUnique({
          where: { projectId }
        });

        if (tracker) {
          await tx.completedWorkflowItem.create({
            data: {
              trackerId: tracker.id,
              phaseId: currentStep.templatePhaseId,
              sectionId: currentStep.templateSectionId,
              lineItemId: currentStep.templateLineItemId,
              completedAt: new Date(),
              completedById,
              notes
            }
          });
        }

        // Progress to next step using database function
        const nextStepResult = await tx.$queryRaw`
          SELECT * FROM progress_to_next_workflow_step(${projectId}, ${stepId})
        `;

        const nextStep = nextStepResult[0];

        // Update workflow progress
        const totalSteps = await tx.workflowStep.count({
          where: { workflowId: currentStep.workflowId }
        });

        const completedSteps = await tx.workflowStep.count({
          where: { 
            workflowId: currentStep.workflowId,
            isCompleted: true
          }
        });

        const overallProgress = Math.round((completedSteps / totalSteps) * 100);

        await tx.projectWorkflow.update({
          where: { id: currentStep.workflowId },
          data: { overallProgress }
        });

        // Generate alert for next step if exists
        if (nextStep?.next_step_id) {
          const nextStepRecord = await tx.workflowStep.findUnique({
            where: { id: nextStep.next_step_id }
          });
          
          if (nextStepRecord) {
            await this.generateAlertForStep(tx, nextStepRecord, projectId);
          }
        }

        console.log(`✅ Completed step ${currentStep.stepName} for project ${projectId}`);
        
        return {
          completedStep: currentStep,
          nextStep: nextStep || null,
          progress: overallProgress,
          totalSteps,
          completedSteps: completedSteps
        };
      });
    } catch (error) {
      console.error('❌ Error completing workflow item:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive project workflow status
   */
  async getProjectWorkflowStatus(projectId) {
    try {
      // Use optimized database view
      const status = await prisma.$queryRaw`
        SELECT * FROM workflow_status_view WHERE project_id = ${projectId}
      `;

      if (!status || status.length === 0) {
        return null;
      }

      const projectStatus = status[0];

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

      return {
        ...projectStatus,
        completedItems,
        activeAlerts,
        alertCount: activeAlerts.length
      };
    } catch (error) {
      console.error('❌ Error getting workflow status:', error);
      throw error;
    }
  }

  /**
   * Get multiple project statuses efficiently
   */
  async getMultipleProjectStatuses(projectIds) {
    try {
      const statuses = await prisma.$queryRaw`
        SELECT * FROM get_multiple_project_statuses(${projectIds})
      `;

      return statuses;
    } catch (error) {
      console.error('❌ Error getting multiple project statuses:', error);
      throw error;
    }
  }

  /**
   * Advance project to next phase with validation
   */
  async advanceToNextPhase(projectId, userId, reason) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Use database function for safe phase advancement
        const result = await tx.$queryRaw`
          SELECT * FROM advance_to_next_phase(${projectId}, ${userId})
        `;

        const advancement = result[0];

        if (!advancement.success) {
          throw new Error(advancement.message);
        }

        // Create workflow steps for new phase if needed
        await this.createStepsForPhase(tx, projectId, advancement.new_phase_id);

        console.log(`✅ Advanced project ${projectId} to phase: ${advancement.new_phase_name}`);
        
        return advancement;
      });
    } catch (error) {
      console.error('❌ Error advancing to next phase:', error);
      throw error;
    }
  }

  /**
   * Create workflow steps for a specific phase
   */
  async createStepsForPhase(tx, projectId, phaseId) {
    try {
      // Get project workflow
      const projectWorkflow = await tx.projectWorkflow.findFirst({
        where: { projectId }
      });

      if (!projectWorkflow) {
        throw new Error('Project workflow not found');
      }

      // Get phase template with sections and line items
      const phase = await tx.workflowPhase.findUnique({
        where: { id: phaseId },
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

      if (!phase) {
        throw new Error('Phase template not found');
      }

      // Get current max step order
      const maxOrder = await tx.workflowStep.findFirst({
        where: { workflowId: projectWorkflow.id },
        orderBy: { stepOrder: 'desc' },
        select: { stepOrder: true }
      });

      let stepOrder = (maxOrder?.stepOrder || 0) + 1;
      const createdSteps = [];

      for (const section of phase.sections) {
        for (const lineItem of section.lineItems) {
          const step = await tx.workflowStep.create({
            data: {
              stepId: `${section.sectionNumber}${lineItem.itemLetter}`,
              stepName: lineItem.itemName,
              description: lineItem.description || '',
              phase: phase.phaseType,
              defaultResponsible: lineItem.responsibleRole,
              estimatedDuration: lineItem.estimatedMinutes,
              stepOrder,
              alertPriority: 'MEDIUM',
              alertDays: lineItem.alertDays,
              workflowId: projectWorkflow.id,
              templatePhaseId: phase.id,
              templateSectionId: section.id,
              templateLineItemId: lineItem.id,
              state: stepOrder === (maxOrder?.stepOrder || 0) + 1 ? 'ACTIVE' : 'PENDING'
            }
          });
          createdSteps.push(step);
          stepOrder++;
        }
      }

      // Update tracker with first step of new phase
      if (createdSteps.length > 0) {
        const firstStep = createdSteps[0];
        const firstSection = phase.sections[0];
        const firstLineItem = firstSection?.lineItems[0];

        await tx.projectWorkflowTracker.update({
          where: { projectId },
          data: {
            currentPhaseId: phase.id,
            currentSectionId: firstSection?.id,
            currentLineItemId: firstLineItem?.id,
            currentStepId: firstStep.id,
            phaseStartedAt: new Date(),
            sectionStartedAt: new Date(),
            lineItemStartedAt: new Date()
          }
        });

        // Generate alert for first step
        await this.generateAlertForStep(tx, firstStep, projectId);
      }

      return createdSteps;
    } catch (error) {
      console.error('❌ Error creating steps for phase:', error);
      throw error;
    }
  }

  /**
   * Generate alert for a workflow step
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
   * Get workflow performance metrics
   */
  async getWorkflowPerformanceMetrics(phaseType = null) {
    try {
      let whereClause = '';
      if (phaseType) {
        whereClause = `WHERE phase_type = '${phaseType}'`;
      }

      const metrics = await prisma.$queryRaw`
        SELECT * FROM workflow_performance_metrics ${whereClause}
        ORDER BY completion_count DESC
      `;

      return metrics;
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Search workflow items with full-text search
   */
  async searchWorkflowItems(searchTerm, projectId = null) {
    try {
      let projectFilter = '';
      if (projectId) {
        projectFilter = `AND project_id = '${projectId}'`;
      }

      const results = await prisma.$queryRaw`
        SELECT 
          wli.id,
          wli.item_name,
          wli.description,
          ws.section_name,
          wp.phase_name,
          ts_rank(wli.search_vector, plainto_tsquery('english', ${searchTerm})) as rank
        FROM workflow_line_items wli
        JOIN workflow_sections ws ON wli.section_id = ws.id
        JOIN workflow_phases wp ON ws.phase_id = wp.id
        LEFT JOIN workflow_steps wst ON wli.id = wst.template_line_item_id
        WHERE wli.search_vector @@ plainto_tsquery('english', ${searchTerm})
        ${projectFilter}
        ORDER BY rank DESC
        LIMIT 20
      `;

      return results;
    } catch (error) {
      console.error('❌ Error searching workflow items:', error);
      throw error;
    }
  }

  /**
   * Validate workflow state transition
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
   * Update workflow step state
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

module.exports = new OptimizedWorkflowService();