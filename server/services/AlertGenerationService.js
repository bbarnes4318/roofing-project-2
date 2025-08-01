const { prisma } = require('../config/prisma');

class AlertGenerationService {
  /**
   * Generate alerts for all line items in a section when the section starts
   * @param {string} projectId - Project ID
   * @param {string} workflowId - Workflow ID
   * @param {string} sectionName - Name of the section that's starting
   * @param {string} phase - Phase the section belongs to
   */
  static async generateSectionAlerts(projectId, workflowId, sectionName, phase) {
    try {
      console.log(`🚨 Generating alerts for section: ${sectionName} in phase: ${phase}`);
      
      // Get the project and workflow details
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          customer: true,
          projectManager: true,
          workflow: {
            include: {
              steps: {
                where: {
                  phase: phase,
                  // Steps that belong to this section (you may need to add section field to steps)
                  // For now, we'll generate alerts for all incomplete steps in the phase
                  isCompleted: false
                }
              }
            }
          }
        }
      });

      if (!project || !project.workflow) {
        console.error('Project or workflow not found');
        return [];
      }

      const alerts = [];
      
      // Generate one alert per line item (step) in the section
      for (const step of project.workflow.steps) {
        // Determine who should receive the alert based on step responsibility
        const assignedToId = step.assignedToId || project.projectManagerId;
        
        const alert = await prisma.workflowAlert.create({
          data: {
            type: 'Work Flow Line Item',
            priority: step.alertPriority || 'MEDIUM',
            status: 'ACTIVE',
            
            // Content
            title: `${step.stepName} - ${project.customer.primaryName}`,
            message: `${step.stepName} is now ready to be completed for project at ${project.projectName}`,
            stepName: step.stepName,
            
            // Due date (if step has scheduled end date)
            dueDate: step.scheduledEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
            
            // Relationships
            projectId: projectId,
            workflowId: workflowId,
            stepId: step.id,
            
            // Assignment
            assignedToId: assignedToId,
            
            // Metadata
            metadata: {
              phase: phase,
              section: sectionName,
              projectNumber: project.projectNumber,
              projectName: project.projectName,
              customerName: project.customer.primaryName,
              stepDescription: step.description
            }
          }
        });
        
        alerts.push(alert);
        console.log(`✅ Created alert for step: ${step.stepName}`);
      }
      
      console.log(`🎯 Generated ${alerts.length} alerts for section: ${sectionName}`);
      return alerts;
      
    } catch (error) {
      console.error('Error generating section alerts:', error);
      throw error;
    }
  }

  /**
   * Clear existing alerts for a project/workflow
   * @param {string} projectId - Project ID
   * @param {string} workflowId - Workflow ID
   */
  static async clearProjectAlerts(projectId, workflowId) {
    try {
      const result = await prisma.workflowAlert.deleteMany({
        where: {
          projectId: projectId,
          workflowId: workflowId,
          status: 'ACTIVE'
        }
      });
      
      console.log(`🧹 Cleared ${result.count} active alerts for project`);
      return result;
      
    } catch (error) {
      console.error('Error clearing alerts:', error);
      throw error;
    }
  }

  /**
   * Mark an alert as completed when its step is completed
   * @param {string} stepId - Step ID
   */
  static async completeStepAlerts(stepId) {
    try {
      const result = await prisma.workflowAlert.updateMany({
        where: {
          stepId: stepId,
          status: 'ACTIVE'
        },
        data: {
          status: 'COMPLETED',
          acknowledgedAt: new Date()
        }
      });
      
      console.log(`✅ Marked ${result.count} alerts as completed for step`);
      return result;
      
    } catch (error) {
      console.error('Error completing step alerts:', error);
      throw error;
    }
  }

  /**
   * Get all active alerts for a user
   * @param {string} userId - User ID
   */
  static async getUserAlerts(userId) {
    try {
      const alerts = await prisma.workflowAlert.findMany({
        where: {
          assignedToId: userId,
          status: 'ACTIVE'
        },
        include: {
          project: {
            include: {
              customer: true
            }
          },
          step: true
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ]
      });
      
      return alerts;
      
    } catch (error) {
      console.error('Error fetching user alerts:', error);
      throw error;
    }
  }

  /**
   * Get all active alerts for a project
   * @param {string} projectId - Project ID
   */
  static async getProjectAlerts(projectId) {
    try {
      const alerts = await prisma.workflowAlert.findMany({
        where: {
          projectId: projectId,
          status: 'ACTIVE'
        },
        include: {
          assignedTo: true,
          step: true
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });
      
      return alerts;
      
    } catch (error) {
      console.error('Error fetching project alerts:', error);
      throw error;
    }
  }
}

module.exports = AlertGenerationService;