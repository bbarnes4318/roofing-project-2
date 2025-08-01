const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AlertSchedulerService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  // Start the alert scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Alert scheduler is already running');
      return;
    }

    // Run every 5 minutes to check for workflow alerts
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.checkWorkflowAlerts();
      } catch (error) {
        console.error('❌ Error in alert scheduler:', error);
      }
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;
    console.log('🚀 Alert scheduler started - checking workflow deadlines every 5 minutes');
    
    // Run initial check
    this.checkWorkflowAlerts();
  }

  // Stop the alert scheduler
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('⏹️ Alert scheduler stopped');
    }
  }

  // Main method to check all workflow alerts
  async checkWorkflowAlerts() {
    try {
      console.log('🔍 Checking workflow alerts...');
      
      // Get all active workflows with populated project data
      const workflows = await prisma.projectWorkflow.findMany({
        where: {
          status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }
        },
        include: {
          project: {
            select: {
              id: true,
              projectName: true,
                             customer: {
                 select: {
                   id: true,
                   primaryName: true
                 }
               }
            }
          },
          steps: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              },
              subTasks: true
            }
          },

        }
      });

      let totalAlerts = 0;
      let skippedWorkflows = 0;

      for (const workflow of workflows) {
        // CRITICAL: Skip workflows with deleted projects or no steps
        if (!workflow.project || !workflow.project.id || !workflow.steps || workflow.steps.length === 0) {
          if (!workflow.project) {
            console.log(`⚠️ Skipping workflow ${workflow.id} - associated project was deleted`);
            skippedWorkflows++;
            
            // Clean up orphaned workflows
            try {
              await prisma.projectWorkflow.delete({
                where: { id: workflow.id }
              });
              console.log(`🧹 Cleaned up orphaned workflow ${workflow.id}`);
            } catch (cleanupError) {
              console.error(`❌ Error cleaning up orphaned workflow ${workflow.id}:`, cleanupError);
            }
          } else if (!workflow.steps || workflow.steps.length === 0) {
            console.log(`⚠️ Skipping workflow ${workflow.id} - no steps defined`);
            skippedWorkflows++;
          }
          continue;
        }

        // Additional validation: Check if project actually exists in database
        const projectExists = await prisma.project.findUnique({
          where: { id: workflow.project.id }
        });
        if (!projectExists) {
          console.log(`⚠️ Skipping workflow ${workflow.id} - project ${workflow.project.id} not found in database`);
          skippedWorkflows++;
          
          // Clean up workflow for non-existent project
          try {
            await prisma.projectWorkflow.delete({
              where: { id: workflow.id }
            });
            console.log(`🧹 Cleaned up workflow ${workflow.id} for non-existent project`);
          } catch (cleanupError) {
            console.error(`❌ Error cleaning up workflow ${workflow.id}:`, cleanupError);
          }
          continue;
        }

        const alertsGenerated = await this.processWorkflowSteps(workflow);
        totalAlerts += alertsGenerated;
      }

      console.log(`✅ Alert check completed - ${totalAlerts} alerts generated, ${skippedWorkflows} workflows skipped/cleaned`);
    } catch (error) {
      console.error('❌ Error checking workflow alerts:', error);
    }
  }

  // Process individual workflow steps for alerts
  async processWorkflowSteps(workflow) {
    let alertCount = 0;
    const now = new Date();

    for (const step of workflow.steps) {
      if (step.isCompleted || !step.scheduledEndDate) continue;

      const daysUntilDue = Math.ceil((step.scheduledEndDate - now) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.ceil((now - step.scheduledEndDate) / (1000 * 60 * 60 * 24));

      // Determine alert priority based on step configuration
      const alertPriority = this.determineAlertPriority(step, daysUntilDue, daysOverdue);
      
      if (alertPriority) {
        const alertGenerated = await this.generateWorkflowAlert(workflow, step, alertPriority, daysUntilDue, daysOverdue);
        if (alertGenerated) alertCount++;
      }
    }

    return alertCount;
  }

  // Determine if an alert should be sent and what priority
  determineAlertPriority(step, daysUntilDue, daysOverdue) {
    const alertTriggers = step.alertTriggers || {};
    const priority = alertTriggers.priority || 'MEDIUM';
    
    // If overdue, always send alert
    if (daysOverdue > 0) {
      const overdueIntervals = alertTriggers.overdueIntervals || [1, 3, 7, 14];
      if (overdueIntervals.includes(daysOverdue)) {
        return 'HIGH'; // Overdue items are always high priority
      }
      return null;
    }

    // Check based on priority level
    switch (priority) {
      case 'HIGH': // Urgent - same day
        if (daysUntilDue <= 0) return 'HIGH';
        break;
      
      case 'MEDIUM': // Important - 24-48 hrs (1-2 days)
        if (daysUntilDue <= 2 && daysUntilDue >= 0) return 'MEDIUM';
        break;
      
      case 'LOW': // Within a few days (3-5 days)
        if (daysUntilDue <= 5 && daysUntilDue >= 0) return 'LOW';
        break;
    }

    return null;
  }

  // Generate workflow alert notification
  async generateWorkflowAlert(workflow, step, alertPriority, daysUntilDue, daysOverdue) {
    try {
      // Defensive check - ensure project exists
      if (!workflow.project) {
        console.log(`⚠️ Cannot generate alert for step ${step.stepName} - workflow has no associated project`);
        return false;
      }

      // Get recipients for the alert
      const recipients = await this.getAlertRecipients(workflow, step);
      
      if (recipients.length === 0) {
        console.log(`⚠️ No recipients found for step ${step.stepName} in project ${workflow.project.projectName}`);
        return false;
      }

      // Generate alert message
      const alertMessage = this.generateAlertMessage(workflow, step, alertPriority, daysUntilDue, daysOverdue);
      
      // Check if we've already sent this alert recently (avoid spam)
      const recentAlert = await this.checkRecentAlert(workflow.project.id, step.id, alertPriority.toLowerCase());
      if (recentAlert) {
        return false; // Don't send duplicate alerts
      }

      // Create notifications for each recipient
      const notifications = [];
      for (const recipient of recipients) {
        // Map priority to lowercase for validation
        const validPriority = alertPriority.toLowerCase();
        
                 // Map alert type based on urgency - use valid enum values
         let notificationType = 'WORKFLOW_ALERT';
        
                 const notification = await prisma.notification.create({
           data: {
             title: `${alertPriority} Priority Alert`,
             message: alertMessage,
             type: notificationType,
             recipientId: recipient.id,
             actionUrl: `/projects/${workflow.project.id}/workflow`,
             actionData: {
               workflowId: workflow.id,
               stepId: step.id,
               stepName: step.stepName,
               phase: step.phase,
               daysUntilDue,
               daysOverdue,
               projectName: workflow.project.projectName,
               priority: validPriority
             }
           }
         });
        notifications.push(notification);
      }

      console.log(`🔔 Generated ${alertPriority} priority workflow alert for step "${step.stepName}" in project "${workflow.project.projectName}" (${recipients.length} recipients)`);
      return true;

    } catch (error) {
      console.error('❌ Error generating workflow alert:', error);
      return false;
    }
  }

  // Get recipients for workflow alerts
  async getAlertRecipients(workflow, step) {
    const recipients = new Set();

    // 1. Primary assignee (specific user assigned to step)
    if (step.assignedTo) {
      recipients.add(step.assignedTo.id);
    }

    // 2. Team members assigned to the role (from teamAssignments)
    const defaultRole = step.defaultResponsible;
    if (workflow.teamAssignments) {
      const teamAssignment = workflow.teamAssignments;
      if (teamAssignment.office) {
        teamAssignment.office.forEach(user => {
          if (user && user.id) recipients.add(user.id);
        });
      }
      if (teamAssignment.administration) {
        teamAssignment.administration.forEach(user => {
          if (user && user.id) recipients.add(user.id);
        });
      }
      if (teamAssignment.project_manager) {
        teamAssignment.project_manager.forEach(user => {
          if (user && user.id) recipients.add(user.id);
        });
      }
      if (teamAssignment.field_director) {
        teamAssignment.field_director.forEach(user => {
          if (user && user.id) recipients.add(user.id);
        });
      }
      if (teamAssignment.roof_supervisor) {
        teamAssignment.roof_supervisor.forEach(user => {
          if (user && user.id) recipients.add(user.id);
        });
      }
    }

    // 3. Alert recipients (primary, escalation, cc)
    if (step.alertTriggers && step.alertTriggers.alertRecipients) {
      const alertRecipients = step.alertTriggers.alertRecipients;
      
      if (alertRecipients.primary) {
        alertRecipients.primary.forEach(user => {
          if (user) recipients.add(user.toString());
        });
      }
      
      if (alertRecipients.escalation) {
        alertRecipients.escalation.forEach(user => {
          if (user) recipients.add(user.toString());
        });
      }
      
      if (alertRecipients.cc) {
        alertRecipients.cc.forEach(user => {
          if (user) recipients.add(user.toString());
        });
      }
    }

    // Convert Set to array of user objects
    const recipientIds = Array.from(recipients);
    const users = await prisma.user.findMany({
      where: { id: { in: recipientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });
    
    return users;
  }

  // Generate alert message based on priority and timing
  generateAlertMessage(workflow, step, priority, daysUntilDue, daysOverdue) {
    const projectName = workflow.project.projectName;
    const stepName = step.stepName;
    const phase = step.phase;
    
    // Calculate progress information
    const completedSubTasks = step.subTasks ? step.subTasks.filter(st => st.isCompleted).length : 0;
    const totalSubTasks = step.subTasks ? step.subTasks.length : 0;
    const progressText = totalSubTasks > 0 ? ` (${completedSubTasks}/${totalSubTasks} sub-tasks completed)` : '';

    if (daysOverdue > 0) {
      return `🚨 OVERDUE: ${phase} step "${stepName}" for project "${projectName}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue${progressText}. Immediate attention required!`;
    }

    switch (priority) {
      case 'HIGH':
        if (daysUntilDue === 0) {
          return `🚨 URGENT: ${phase} step "${stepName}" for project "${projectName}" is due TODAY${progressText}. Immediate action required!`;
        } else {
          return `🚨 URGENT: ${phase} step "${stepName}" for project "${projectName}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${progressText}. High priority!`;
        }
      
      case 'MEDIUM':
        return `⚠️ IMPORTANT: ${phase} step "${stepName}" for project "${projectName}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${progressText}. Please prioritize.`;
      
      case 'LOW':
        return `📋 REMINDER: ${phase} step "${stepName}" for project "${projectName}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${progressText}. Please plan accordingly.`;
      
      default:
        return `📋 Workflow reminder: ${phase} step "${stepName}" for project "${projectName}" requires attention${progressText}.`;
    }
  }

  // Check if we've sent a similar alert recently to avoid spam
  async checkRecentAlert(projectId, stepId, priority) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentAlert = await prisma.notification.findFirst({
      where: {
        actionData: {
          path: ['stepId'],
          equals: stepId
        },
        type: 'WORKFLOW_ALERT',
        createdAt: {
          gte: oneDayAgo
        }
      }
    });

    return !!recentAlert;
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('🔧 Manual alert check triggered');
    await this.checkWorkflowAlerts();
  }

  // Get alert statistics
  async getAlertStatistics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

         const stats = await prisma.notification.groupBy({
       by: ['priority'],
       where: {
         type: 'WORKFLOW_ALERT',
         createdAt: { gte: oneWeekAgo }
       },
       _count: {
         id: true
       }
     });

     // Get last 24h count
     const last24hStats = await prisma.notification.groupBy({
       by: ['priority'],
       where: {
         type: 'WORKFLOW_ALERT',
         createdAt: { gte: oneDayAgo }
       },
       _count: {
         id: true
       }
     });

    const totalLast24h = last24hStats.reduce((sum, stat) => sum + stat._count.id, 0);

    return {
      weekly: stats.map(stat => ({
        _id: stat.priority,
        count: stat._count.id,
        last24h: last24hStats.find(s => s.priority === stat.priority)?._count.id || 0
      })),
      totalLast24h
    };
  }
}

module.exports = new AlertSchedulerService(); 