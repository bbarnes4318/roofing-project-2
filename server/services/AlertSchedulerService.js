const cron = require('node-cron');
const ProjectWorkflow = require('../models/ProjectWorkflow');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Project = require('../models/Project');

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
      const workflows = await ProjectWorkflow.find({
        status: { $in: ['not_started', 'in_progress'] }
      })
        .populate('project', 'projectName customer')
        .populate('steps.assignedTo', 'firstName lastName email')
        .populate('teamAssignments.office teamAssignments.administration teamAssignments.project_manager teamAssignments.field_director teamAssignments.roof_supervisor', 'firstName lastName email');

      let totalAlerts = 0;
      let skippedWorkflows = 0;

      for (const workflow of workflows) {
        // CRITICAL: Skip workflows with deleted projects or no steps
        if (!workflow.project || !workflow.project._id || !workflow.steps || workflow.steps.length === 0) {
          if (!workflow.project) {
            console.log(`⚠️ Skipping workflow ${workflow._id} - associated project was deleted`);
            skippedWorkflows++;
            
            // Clean up orphaned workflows
            try {
              await ProjectWorkflow.findByIdAndDelete(workflow._id);
              console.log(`🧹 Cleaned up orphaned workflow ${workflow._id}`);
            } catch (cleanupError) {
              console.error(`❌ Error cleaning up orphaned workflow ${workflow._id}:`, cleanupError);
            }
          } else if (!workflow.steps || workflow.steps.length === 0) {
            console.log(`⚠️ Skipping workflow ${workflow._id} - no steps defined`);
            skippedWorkflows++;
          }
          continue;
        }

        // Additional validation: Check if project actually exists in database
        const projectExists = await Project.findById(workflow.project._id);
        if (!projectExists) {
          console.log(`⚠️ Skipping workflow ${workflow._id} - project ${workflow.project._id} not found in database`);
          skippedWorkflows++;
          
          // Clean up workflow for non-existent project
          try {
            await ProjectWorkflow.findByIdAndDelete(workflow._id);
            console.log(`🧹 Cleaned up workflow ${workflow._id} for non-existent project`);
          } catch (cleanupError) {
            console.error(`❌ Error cleaning up workflow ${workflow._id}:`, cleanupError);
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
    const priority = alertTriggers.priority || 'Medium';
    
    // If overdue, always send alert
    if (daysOverdue > 0) {
      const overdueIntervals = alertTriggers.overdueIntervals || [1, 3, 7, 14];
      if (overdueIntervals.includes(daysOverdue)) {
        return 'High'; // Overdue items are always high priority
      }
      return null;
    }

    // Check based on priority level
    switch (priority) {
      case 'High': // Urgent - same day
        if (daysUntilDue <= 0) return 'High';
        break;
      
      case 'Medium': // Important - 24-48 hrs (1-2 days)
        if (daysUntilDue <= 2 && daysUntilDue >= 0) return 'Medium';
        break;
      
      case 'Low': // Within a few days (3-5 days)
        if (daysUntilDue <= 5 && daysUntilDue >= 0) return 'Low';
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
      const recentAlert = await this.checkRecentAlert(workflow.project._id, step.stepId, alertPriority.toLowerCase());
      if (recentAlert) {
        return false; // Don't send duplicate alerts
      }

      // Create notifications for each recipient
      const notifications = [];
      for (const recipient of recipients) {
        // Map priority to lowercase for validation
        const validPriority = alertPriority.toLowerCase();
        
        // Map alert type based on urgency
        let notificationType = 'workflow_step_warning';
        if (daysOverdue > 0) {
          notificationType = 'workflow_step_overdue';
        } else if (alertPriority === 'High') {
          notificationType = 'workflow_step_urgent';
        }
        
        const notification = await Notification.create({
          user: recipient._id, // Fixed: use 'user' not 'recipient'
          type: notificationType, // Use valid enum value
          priority: validPriority, // Use lowercase priority
          message: alertMessage,
          relatedProject: workflow.project._id,
          metadata: {
            workflowId: workflow._id,
            stepId: step.stepId,
            stepName: step.stepName,
            phase: step.phase,
            daysUntilDue,
            daysOverdue,
            projectName: workflow.project.projectName
          }
        });
        notifications.push(notification);
      }

      // Emit real-time notifications via Socket.IO
      const io = require('../server').io;
      if (io) {
        for (const notification of notifications) {
          io.to(`user_${notification.recipient}`).emit('workflow_alert', {
            notification,
            type: 'Work Flow Line Item',
            priority: alertPriority,
            step: step.stepName,
            project: workflow.project.projectName
          });
        }
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
      recipients.add(step.assignedTo);
    }

    // 2. Team members assigned to the role (from teamAssignments)
    const defaultRole = step.defaultResponsible;
    if (workflow.teamAssignments && workflow.teamAssignments[defaultRole]) {
      workflow.teamAssignments[defaultRole].forEach(user => {
        if (user && user._id) recipients.add(user._id.toString());
      });
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
    const users = await User.find({ _id: { $in: recipientIds } });
    
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
      case 'High':
        if (daysUntilDue === 0) {
          return `🚨 URGENT: ${phase} step "${stepName}" for project "${projectName}" is due TODAY${progressText}. Immediate action required!`;
        } else {
          return `🚨 URGENT: ${phase} step "${stepName}" for project "${projectName}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${progressText}. High priority!`;
        }
      
      case 'Medium':
        return `⚠️ IMPORTANT: ${phase} step "${stepName}" for project "${projectName}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${progressText}. Please prioritize.`;
      
      case 'Low':
        return `📋 REMINDER: ${phase} step "${stepName}" for project "${projectName}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${progressText}. Please plan accordingly.`;
      
      default:
        return `📋 Workflow reminder: ${phase} step "${stepName}" for project "${projectName}" requires attention${progressText}.`;
    }
  }

  // Check if we've sent a similar alert recently to avoid spam
  async checkRecentAlert(projectId, stepId, priority) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentAlert = await Notification.findOne({
      relatedProject: projectId,
      'metadata.stepId': stepId,
      priority: priority,
      createdAt: { $gte: oneDayAgo }
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

    const stats = await Notification.aggregate([
      {
        $match: {
          type: { $in: ['workflow_step_warning', 'workflow_step_overdue', 'workflow_step_urgent'] },
          createdAt: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          last24h: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', oneDayAgo] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return {
      weekly: stats,
      totalLast24h: stats.reduce((sum, stat) => sum + stat.last24h, 0)
    };
  }
}

module.exports = new AlertSchedulerService(); 