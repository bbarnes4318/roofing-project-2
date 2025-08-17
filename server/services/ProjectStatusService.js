const { prisma } = require('../config/prisma');

class ProjectStatusService {
  /**
   * Update project status based on workflow phase
   * @param {string} projectId - Project ID
   * @param {string} phaseType - Current phase type
   * @param {boolean} isCompleted - Whether the workflow is completed
   */
  static async updateProjectStatus(projectId, phaseType = null, isCompleted = false) {
    try {
      // Get current project and workflow state
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          workflowTracker: {
            include: {
              currentPhase: true
            }
          }
        }
      });

      if (!project) {
        console.error(`Project ${projectId} not found`);
        return null;
      }

      // Determine the current phase if not provided
      const currentPhase = phaseType || project.workflowTracker?.currentPhase?.phaseType;
      
      let newStatus = project.status;
      
      // Apply status automation rules
      if (isCompleted) {
        // If workflow is completed (final line item in COMPLETED phase done)
        newStatus = 'COMPLETED';
        console.log(`✅ Project ${projectId} workflow completed - setting status to COMPLETED`);
      } else if (currentPhase === 'LEAD') {
        // During LEAD phase, status should be PENDING
        newStatus = 'PENDING';
        console.log(`📋 Project ${projectId} in LEAD phase - setting status to PENDING`);
      } else if (currentPhase && currentPhase !== 'LEAD') {
        // Any phase beyond LEAD should be IN_PROGRESS
        newStatus = 'IN_PROGRESS';
        console.log(`🚀 Project ${projectId} beyond LEAD phase - setting status to IN_PROGRESS`);
      }

      // Only update if status changed
      if (newStatus !== project.status) {
        const updatedProject = await prisma.project.update({
          where: { id: projectId },
          data: { 
            status: newStatus,
            updatedAt: new Date()
          }
        });
        
        console.log(`📊 Updated project ${projectId} status from ${project.status} to ${newStatus}`);
        return updatedProject;
      }

      return project;
      
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    }
  }

  /**
   * Check if the current line item is the final one in COMPLETED phase
   * @param {string} lineItemId - Line item ID
   */
  static async isCompletedPhaseFinalItem(lineItemId) {
    try {
      // Get the line item with its section and phase
      const lineItem = await prisma.workflowLineItem.findUnique({
        where: { id: lineItemId },
        include: {
          section: {
            include: {
              phase: true
            }
          }
        }
      });

      if (!lineItem) {
        return false;
      }

      // Check if this is in the COMPLETED phase
      if (lineItem.section.phase.phaseType !== 'COMPLETED') {
        return false;
      }

      // Find the last line item in the COMPLETED phase
      const lastLineItem = await prisma.workflowLineItem.findFirst({
        where: {
          section: {
            phase: {
              phaseType: 'COMPLETED'
            }
          },
          isActive: true
        },
        orderBy: {
          displayOrder: 'desc'
        }
      });

      // Check if this is the last line item
      return lastLineItem?.id === lineItemId;
      
    } catch (error) {
      console.error('Error checking if line item is final:', error);
      return false;
    }
  }

  /**
   * Validate project status value
   * @param {string} status - Status to validate
   */
  static isValidStatus(status) {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    return validStatuses.includes(status);
  }

  /**
   * Get projects by status
   * @param {string} status - Status to filter by
   */
  static async getProjectsByStatus(status) {
    try {
      if (!this.isValidStatus(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: PENDING, IN_PROGRESS, COMPLETED`);
      }

      const projects = await prisma.project.findMany({
        where: { status },
        include: {
          customer: {
            select: {
              primaryName: true,
              primaryEmail: true
            }
          },
          projectManager: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          workflowTracker: {
            include: {
              currentPhase: true,
              currentSection: true,
              currentLineItem: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return projects;
      
    } catch (error) {
      console.error('Error fetching projects by status:', error);
      throw error;
    }
  }

  /**
   * Batch update project statuses based on workflow states
   * This can be run as a cleanup/sync operation
   */
  static async syncAllProjectStatuses() {
    try {
      console.log('🔄 Starting project status sync...');
      
      const projects = await prisma.project.findMany({
        where: {
          status: {
            not: 'COMPLETED'
          }
        },
        include: {
          workflowTracker: {
            include: {
              currentPhase: true,
              currentLineItem: true
            }
          }
        }
      });

      let updatedCount = 0;
      
      for (const project of projects) {
        // Check if workflow is completed
        let isCompleted = false;
        if (project.workflowTracker?.currentLineItemId) {
          isCompleted = await this.isCompletedPhaseFinalItem(
            project.workflowTracker.currentLineItemId
          );
        }

        // Update status based on current phase
        const result = await this.updateProjectStatus(
          project.id,
          project.workflowTracker?.currentPhase?.phaseType,
          isCompleted
        );
        
        if (result && result.status !== project.status) {
          updatedCount++;
        }
      }

      console.log(`✅ Project status sync complete. Updated ${updatedCount} projects.`);
      return updatedCount;
      
    } catch (error) {
      console.error('Error syncing project statuses:', error);
      throw error;
    }
  }
}

module.exports = ProjectStatusService;