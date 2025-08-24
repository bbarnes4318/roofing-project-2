const { prisma } = require('../config/prisma');

class OverdueAlertService {
  /**
   * Check for overdue alerts and escalate them to HIGH priority
   * Also notify project managers
   */
  static async checkAndEscalateOverdueAlerts() {
    try {
      if (!process.env.DATABASE_URL) {
        // No database configured; skip silently
        return [];
      }
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

        // Notify/assign project manager without violating unique constraint
        if (alert.project?.projectManagerId && alert.assignedToId !== alert.project.projectManagerId) {
          // Check for an existing ACTIVE alert for the same project + line item
          const existingActive = await prisma.workflowAlert.findFirst({
            where: {
              projectId: alert.projectId,
              lineItemId: alert.lineItemId,
              status: 'ACTIVE'
            }
          });

          if (existingActive) {
            // Reassign the existing alert to the PM and bump metadata
            const updated = await prisma.workflowAlert.update({
              where: { id: existingActive.id },
              data: {
                assignedToId: alert.project.projectManagerId,
                priority: 'HIGH',
                metadata: {
                  ...(existingActive.metadata || {}),
                  escalatedAt: now,
                  previousAssignee: alert.assignedToId,
                  escalationType: 'OVERDUE_PM_REASSIGN'
                }
              }
            });
            escalatedAlerts.push(updated);
          } else {
            // Safe create when no ACTIVE exists for same (project,lineItem)
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
      if (!process.env.DATABASE_URL) {
        return [];
      }
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
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️ Overdue alert scheduler disabled: DATABASE_URL not set');
      return;
    }
    console.log(`📅 Starting overdue alert scheduler (checking every ${intervalMinutes} minutes)`);
    // Run immediately on startup
    this.checkAndEscalateOverdueAlerts();
    // Then run periodically
    setInterval(async () => {
      console.log('🔄 Running scheduled overdue alert check...');
      await this.checkAndEscalateOverdueAlerts();
    }, intervalMinutes * 60 * 1000);
  }
}

module.exports = OverdueAlertService;