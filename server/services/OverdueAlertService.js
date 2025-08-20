const { prisma } = require('../config/prisma');

class OverdueAlertService {
  static intervalId = null; // Store interval reference for cleanup
  
  /**
   * Check for overdue alerts and escalate them to HIGH priority
   * Also notify project managers
   */
  static async checkAndEscalateOverdueAlerts() {
    try {
      const now = new Date();
      
      // Find all active alerts that are overdue
      const overdueAlerts = await prisma.workflowAlert.findMany({
        where: {
          status: 'ACTIVE',
          dueDate: {
            lt: now
          },
          priority: {
            not: 'HIGH'
          }
        },
        include: {
          project: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              projectManagerId: true,
              projectManager: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (overdueAlerts.length === 0) {
        console.log('✅ No overdue alerts found');
        return [];
      }

      console.log(`⚠️ Found ${overdueAlerts.length} overdue alerts to escalate`);

      // Escalate each overdue alert
      const escalatedAlerts = [];
      
      for (const alert of overdueAlerts) {
        // Update existing alert to HIGH priority
        await prisma.workflowAlert.update({
          where: { id: alert.id },
          data: {
            priority: 'HIGH',
            metadata: {
              ...alert.metadata,
              escalatedAt: now,
              previousPriority: alert.priority,
              escalationReason: 'OVERDUE'
            }
          }
        });

        // Create a new HIGH ALERT notification for the project manager
        if (alert.project?.projectManagerId && alert.assignedToId !== alert.project.projectManagerId) {
          const pmAlert = await prisma.workflowAlert.create({
            data: {
              type: 'HIGH ALERT - Overdue Task',
              priority: 'HIGH',
              status: 'ACTIVE',
              title: `OVERDUE: ${alert.title}`,
              message: `Alert "${alert.title}" is overdue and requires immediate attention. Originally assigned to another team member.`,
              stepName: alert.stepName,
              responsibleRole: 'PROJECT_MANAGER',
              dueDate: alert.dueDate,
              projectId: alert.projectId,
              workflowId: alert.workflowId,
              lineItemId: alert.lineItemId,
              sectionId: alert.sectionId,
              phaseId: alert.phaseId,
              assignedToId: alert.project.projectManagerId,
              metadata: {
                ...alert.metadata,
                originalAlertId: alert.id,
                originalAssignee: alert.assignedToId,
                escalationType: 'OVERDUE_PM_NOTIFICATION',
                escalatedAt: now
              }
            }
          });
          
          escalatedAlerts.push(pmAlert);
        }

        escalatedAlerts.push(alert);
      }

      console.log(`✅ Escalated ${escalatedAlerts.length} overdue alerts to HIGH priority`);
      return escalatedAlerts;
      
    } catch (error) {
      console.error('Error checking overdue alerts:', error);
      throw error;
    }
  }

  /**
   * Get all overdue alerts for reporting
   */
  static async getOverdueAlerts(projectId = null) {
    try {
      const where = {
        status: 'ACTIVE',
        dueDate: {
          lt: new Date()
        }
      };

      if (projectId) {
        where.projectId = projectId;
      }

      const overdueAlerts = await prisma.workflowAlert.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              customer: {
                select: {
                  primaryName: true
                }
              }
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ]
      });

      return overdueAlerts;
      
    } catch (error) {
      console.error('Error fetching overdue alerts:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic check for overdue alerts
   * This should be called from a cron job or scheduler
   */
  static startOverdueAlertScheduler(intervalMinutes = 60) {
    console.log(`📅 Starting overdue alert scheduler (checking every ${intervalMinutes} minutes)`);
    
    // Clear any existing interval to prevent duplicates
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('🧹 Cleared existing overdue alert scheduler');
    }
    
    // Run immediately on startup
    this.checkAndEscalateOverdueAlerts();
    
    // Then run periodically and store the interval reference
    this.intervalId = setInterval(async () => {
      console.log('🔄 Running scheduled overdue alert check...');
      await this.checkAndEscalateOverdueAlerts();
    }, intervalMinutes * 60 * 1000);
  }
  
  /**
   * Stop the overdue alert scheduler
   */
  static stopOverdueAlertScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Stopped overdue alert scheduler');
    }
  }
}

module.exports = OverdueAlertService;