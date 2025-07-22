const ProjectWorkflow = require('../models/ProjectWorkflow');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Project = require('../models/Project');
const cron = require('node-cron');

class WorkflowAlertService {
  constructor() {
    this.alertHistory = new Map(); // Track sent alerts to prevent duplicates
    this.init();
  }

  init() {
    // Schedule alert checks every hour
    cron.schedule('0 * * * *', () => {
      this.checkAndSendAlerts();
    });

    // Schedule daily cleanup of old alert history
    cron.schedule('0 0 * * *', () => {
      this.cleanupAlertHistory();
    });

    console.log('🚨 WorkflowAlertService initialized with scheduled tasks');
  }

  /**
   * Main method to check all workflows and send alerts
   */
  async checkAndSendAlerts() {
    try {
      console.log('🔍 Checking workflow alerts...');
      
      const activeWorkflows = await ProjectWorkflow.find({
        status: { $in: ['not_started', 'in_progress'] }
      }).populate('project');

      console.log(`📋 Found ${activeWorkflows.length} active workflows to check`);

      let totalAlerts = 0;
      let skippedWorkflows = 0;
      
      for (const workflow of activeWorkflows) {
        // CRITICAL: Skip workflows with deleted projects
        if (!workflow.project || !workflow.project._id) {
          console.log(`⚠️ Skipping workflow ${workflow._id} - associated project was deleted`);
          skippedWorkflows++;
          
          // Clean up orphaned workflows
          try {
            await ProjectWorkflow.findByIdAndDelete(workflow._id);
            console.log(`🧹 Cleaned up orphaned workflow ${workflow._id}`);
          } catch (cleanupError) {
            console.error(`❌ Error cleaning up orphaned workflow ${workflow._id}:`, cleanupError);
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
        
        const alerts = await this.checkWorkflowAlerts(workflow);
        totalAlerts += alerts.length;
      }

      console.log(`✅ Alert check completed - ${totalAlerts} alerts generated, ${skippedWorkflows} workflows skipped/cleaned`);
      
    } catch (error) {
      console.error('❌ Error checking workflow alerts:', error);
    }
  }

  /**
   * Check a specific workflow for alert conditions
   */
  async checkWorkflowAlerts(workflow) {
    const alertsToSend = [];
    
    try {
      console.log(`🔍 Checking workflow for project: ${workflow.project.projectName || 'Unknown'} (${workflow.steps.length} steps)`);
      
      // Use the same logic as the workflow routes
      const stepsRequiringAlerts = workflow.getStepsRequiringAlerts();
      
      console.log(`📋 Found ${stepsRequiringAlerts.length} steps requiring alerts`);
      
      for (const alertInfo of stepsRequiringAlerts) {
        const { step, alertType, daysUntilDue, daysOverdue } = alertInfo;
        
        console.log(`⚠️ Alert needed: ${step.stepName} (${alertType}) - Due: ${daysUntilDue || 'N/A'}, Overdue: ${daysOverdue || 'N/A'}`);
        
        // Check if we've already sent this alert recently
        const alertKey = `${workflow._id}_${step.stepId}_${alertType}`;
        if (this.hasRecentAlert(alertKey, alertType)) {
          console.log(`🔕 Skipping recent alert for ${step.stepName}`);
          continue;
        }

        // Get recipients for this alert
        const recipients = await this.getAlertRecipients(workflow, step, alertType);
        
        if (recipients.length === 0) {
          console.log(`⚠️ No recipients found for step ${step.stepName} in project ${workflow.project.projectName}`);
          continue;
        }
        
        // Create and send alerts
        for (const recipient of recipients) {
          const alert = await this.createWorkflowAlert(
            workflow,
            step,
            recipient,
            alertType,
            daysUntilDue || 0,
            daysOverdue || 0
          );
          
          if (alert) {
            alertsToSend.push(alert);
          }
        }
        
        // Mark alert as sent
        this.markAlertSent(alertKey, alertType);
        console.log(`📨 Generated ${alertType} alert for step "${step.stepName}" to ${recipients.length} recipients`);
      }
      
    } catch (error) {
      console.error(`❌ Error checking alerts for workflow ${workflow._id}:`, error);
    }
    
    console.log(`📊 Generated ${alertsToSend.length} alerts for workflow ${workflow._id}`);
    return alertsToSend;
  }

  /**
   * Get recipients for an alert based on step configuration and alert type
   */
  async getAlertRecipients(workflow, step, alertType) {
    const recipients = [];
    
    try {
      // Get the project first
      const project = await Project.findById(workflow.project._id || workflow.project)
        .populate('teamMembers', 'firstName lastName email role')
        .populate('projectManager', 'firstName lastName email role');
      
      if (!project) {
        console.log(`⚠️ No project found for workflow ${workflow._id}`);
        return [];
      }
      
      console.log(`📋 Finding recipients for step "${step.stepName}" in project "${project.projectName}"`);
      console.log(`   Step defaultResponsible: ${step.defaultResponsible}`);
      console.log(`   Step assignedTo: ${step.assignedTo}`);

      // Primary recipient: assigned team member or users with the default responsible role
      if (step.assignedTo) {
        console.log(`🔍 Looking for assigned user: ${step.assignedTo}`);
        const assignedUser = await User.findById(step.assignedTo);
        if (assignedUser && assignedUser.isActive) {
          recipients.push(assignedUser);
          console.log(`👤 Added assigned user: ${assignedUser.firstName} ${assignedUser.lastName}`);
        } else {
          console.log(`❌ Assigned user not found or inactive`);
        }
      } else {
        console.log(`🔍 No assigned user, looking for users with role: ${step.defaultResponsible}`);
        
        // Map workflow roles to actual database roles
        const roleMapping = {
          'office': ['admin', 'manager'],
          'administration': ['admin', 'manager'],
          'project_manager': ['project_manager', 'manager'],
          'field_director': ['project_manager', 'manager'],
          'roof_supervisor': ['project_manager', 'worker', 'manager']
        };
        
        const mappedRoles = roleMapping[step.defaultResponsible] || [step.defaultResponsible];
        console.log(`   Mapped roles: ${step.defaultResponsible} -> [${mappedRoles.join(', ')}]`);
        
        // Fall back to users with the mapped responsible roles
        const roleUsers = await User.find({
          role: { $in: mappedRoles },
          isActive: true
        });
        
        console.log(`   Found ${roleUsers.length} users with mapped roles: [${mappedRoles.join(', ')}]`);
        
        if (roleUsers.length > 0) {
          recipients.push(...roleUsers);
          console.log(`👥 Added ${roleUsers.length} users with mapped roles from ${step.defaultResponsible}:`);
          roleUsers.forEach(user => {
            console.log(`     - ${user.firstName} ${user.lastName} (${user.role})`);
          });
        } else {
          // If no users with specific role, fall back to admin/manager users
          console.log(`⚠️ No users found with role: ${step.defaultResponsible}, falling back to admin/manager users`);
          
          const fallbackUsers = await User.find({
            role: { $in: ['admin', 'manager'] },
            isActive: true
          });
          
          console.log(`   Found ${fallbackUsers.length} admin/manager users`);
          
          if (fallbackUsers.length > 0) {
            recipients.push(...fallbackUsers);
            console.log(`👥 Added ${fallbackUsers.length} fallback admin/manager users:`);
            fallbackUsers.forEach(user => {
              console.log(`     - ${user.firstName} ${user.lastName} (${user.role})`);
            });
          } else {
            console.log(`❌ No admin/manager users found either!`);
            
            // Let's see what users actually exist
            const allUsers = await User.find({ isActive: true }).select('firstName lastName role email');
            console.log(`   🔧 DEBUG: Found ${allUsers.length} active users in total:`);
            allUsers.slice(0, 5).forEach(user => {
              console.log(`     - ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
            });
            if (allUsers.length > 5) {
              console.log(`     ... and ${allUsers.length - 5} more`);
            }
          }
        }
      }

      // Add project manager for urgent and overdue alerts
      if ((alertType === 'urgent' || alertType === 'overdue') && project.projectManager) {
        recipients.push(project.projectManager);
        console.log(`👨‍💼 Added project manager: ${project.projectManager.firstName} ${project.projectManager.lastName}`);
      }

      // For overdue items, also alert managers and admins
      if (alertType === 'overdue') {
        const managementUsers = await User.find({
          role: { $in: ['admin', 'manager'] },
          isActive: true
        });
        recipients.push(...managementUsers);
        console.log(`🏢 Added ${managementUsers.length} management users for overdue alert`);
      }
      
      // Remove duplicates
      const uniqueRecipients = recipients.filter((user, index, self) => 
        index === self.findIndex(u => u._id.toString() === user._id.toString())
      );
      
      if (uniqueRecipients.length === 0) {
        console.log(`⚠️ No recipients found for step ${step.stepName} in project ${project.projectName}`);
      } else {
        console.log(`✅ Found ${uniqueRecipients.length} recipients for step ${step.stepName}`);
      }
      
      return uniqueRecipients;
      
    } catch (error) {
      console.error('❌ Error getting alert recipients:', error);
      return [];
    }
  }

  /**
   * Create a workflow alert notification
   */
  async createWorkflowAlert(workflow, step, recipient, alertType, daysUntilDue, daysOverdue) {
    try {
      const project = workflow.project;
      const projectName = project.projectName || project.name || 'Unknown Project';
      
      console.log(`🔧 Creating alert for ${recipient.firstName} ${recipient.lastName} (${recipient._id})`);
      console.log(`   Project: ${projectName} (${project._id || project})`);
      console.log(`   Step: ${step.stepName} (${step.stepId})`);
      console.log(`   Alert Type: ${alertType}`);
      
      // Generate alert message
      const message = this.generateAlertMessage(
        projectName,
        step,
        alertType,
        daysUntilDue,
        daysOverdue
      );
      
      console.log(`   Message: ${message}`);
      
      // Determine priority
      const priority = this.getAlertPriority(alertType);
      console.log(`   Priority: ${priority}`);
      
      // Determine correct notification type
      let notificationType;
      switch (alertType) {
        case 'warning':
          notificationType = 'workflow_step_warning';
          break;
        case 'urgent':
          notificationType = 'workflow_step_urgent';
          break;
        case 'overdue':
          notificationType = 'workflow_step_overdue';
          break;
        default:
          notificationType = 'workflow_step_warning';
      }
      
      // Prepare notification data with all required fields including metadata
      const notificationData = {
        user: recipient._id,
        message: message,
        type: notificationType,
        priority: priority,
        relatedProject: project._id || project,
        metadata: {
          workflowId: workflow._id,
          stepId: step.stepId,
          stepName: step.stepName,
          cleanTaskName: this.getCleanTaskName(step.stepName),
          phase: step.phase,
          daysUntilDue: daysUntilDue || 0,
          daysOverdue: daysOverdue || 0,
          projectName: projectName
        }
      };
      
      console.log(`   📝 Creating notification: user=${recipient._id}, type=${notificationType}, priority=${priority}`);
      console.log(`   📝 Message: "${message}"`);
      console.log(`   📝 Project: ${projectName} (${project._id || project})`);
      console.log(`   📝 Step: ${step.stepName} in phase ${step.phase}`);
      
      // Create notification
      const notification = await Notification.create(notificationData);
      
      console.log(`📨 ✅ Successfully created ${alertType} alert for ${recipient.firstName} ${recipient.lastName} - ${step.phase}: ${step.stepName}`);
      console.log(`   Notification ID: ${notification._id}`);
      
      return notification;
      
    } catch (error) {
      console.error('❌ Error creating workflow alert:', error.message);
      if (error.errors) {
        console.error('   Validation errors:');
        Object.keys(error.errors).forEach(key => {
          console.error(`     ${key}: ${error.errors[key].message}`);
        });
      }
      console.error('   Full error:', error);
      return null;
    }
  }

  /**
   * Generate alert message based on step and alert type
   */
  generateAlertMessage(projectName, step, alertType, daysUntilDue, daysOverdue) {
    const stepName = step.stepName;
    const phase = step.phase;
    
    // Create clean task description for display
    const cleanTaskName = this.getCleanTaskName(stepName);
    
    // Add sub-task progress if available
    let progressText = '';
    if (step.subTasks && step.subTasks.length > 0) {
      const completed = step.subTasks.filter(st => st.isCompleted).length;
      const total = step.subTasks.length;
      progressText = ` (${completed}/${total} sub-tasks complete)`;
    }
    
    // Create helpful action guidance instead of confusing "Responsible" text
    const actionGuidance = this.getActionGuidance(stepName, step.defaultResponsible);
    
    switch (alertType) {
      case 'warning':
        return `${stepName} for ${projectName} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${progressText}. ${actionGuidance}`;
      
      case 'urgent':
        if (daysUntilDue === 0) {
          return `${stepName} for ${projectName} is due TODAY${progressText}! ${actionGuidance}`;
        } else {
          return `${stepName} for ${projectName} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${progressText}! ${actionGuidance}`;
        }
      
      case 'overdue':
        return `${stepName} for ${projectName} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue${progressText}! ${actionGuidance}`;
      
      default:
        return `${stepName} for ${projectName} requires attention${progressText}. ${actionGuidance}`;
    }
  }

  /**
   * Get helpful action guidance instead of confusing "Responsible" labels
   */
  getActionGuidance(stepName, responsible) {
    // Provide specific, actionable guidance based on the step
    const stepGuidanceMap = {
      'Input Customer Information': 'Gather and enter customer contact details, project requirements, and preferences',
      'Complete Questions to Ask Checklist': 'Review and complete the initial customer questionnaire',
      'Input Lead Property Information': 'Document property details, measurements, and site conditions',
      'Assign A Project Manager': 'Select and assign the appropriate project manager for this job',
      'Schedule Initial Inspection': 'Contact customer to schedule the initial site inspection',
      'Site Inspection': 'Conduct thorough site inspection and document findings',
      'Write Estimate': 'Prepare detailed cost estimate based on inspection and requirements',
      'Insurance Process': 'Submit insurance claims and coordinate with adjuster if applicable',
      'Agreement Preparation': 'Prepare and review contract documents for customer approval',
      'Agreement Signing': 'Schedule contract signing appointment with customer',
      'Administrative Setup': 'Set up project files, permits, and administrative requirements',
      'Pre-Job Actions': 'Complete all pre-construction activities and permit approvals',
      'Prepare for Production': 'Order materials, schedule crew, and prepare for construction start',
      'Verify Labor Orders': 'Confirm crew scheduling and labor assignments',
      'Verify Material Orders': 'Ensure all materials are ordered and delivery is scheduled',
      'Installation Process': 'Begin construction work according to project specifications',
      'Quality Check': 'Perform quality inspection and address any issues',
      'Daily Progress Documentation': 'Update project progress and document daily activities',
      'Customer Updates': 'Communicate progress updates to the customer',
      'Subcontractor Coordination': 'Coordinate with subcontractors and schedule work',
      'Create Supplement in Xactimate': 'Prepare insurance supplement documentation',
      'Insurance Follow-up': 'Follow up with insurance company on claim status',
      'Final Inspection': 'Conduct final walkthrough and address any punch list items',
      'Financial Processing': 'Process final invoicing and payment collection',
      'AR Follow-Up': 'Follow up on outstanding payment balances',
      'Project Closeout': 'Complete all closeout procedures and documentation',
      'Warranty Registration': 'Register warranty information and provide to customer'
    };
    
    return stepGuidanceMap[stepName] || 'Complete this task to proceed with the project';
  }

  /**
   * Convert long step names to clean task descriptions for UI display
   */
  getCleanTaskName(stepName) {
    const taskMap = {
      'Input Customer Information': 'Customer info',
      'Complete Questions to Ask Checklist': 'Initial questionnaire', 
      'Input Lead Property Information': 'Property details',
      'Assign A Project Manager': 'PM assignment',
      'Schedule Initial Inspection': 'Schedule inspection',
      'Site Inspection': 'Site inspection',
      'Write Estimate': 'Create estimate',
      'Insurance Process': 'Insurance process',
      'Agreement Preparation': 'Prepare agreement',
      'Agreement Signing': 'Contract signing',
      'Administrative Setup': 'Admin setup',
      'Pre-Job Actions': 'Permit approval',
      'Prepare for Production': 'Production prep',
      'Verify Labor Orders': 'Labor scheduling',
      'Verify Material Orders': 'Material delivery',
      'Installation Process': 'Installation',
      'Quality Check': 'Quality inspect',
      'Daily Progress Documentation': 'Progress update',
      'Customer Updates': 'Customer update',
      'Subcontractor Coordination': 'Crew scheduling',
      'Create Supplement in Xactimate': 'Insurance supplement',
      'Insurance Follow-up': 'Insurance follow-up',
      'Final Inspection': 'Final inspection',
      'Financial Processing': 'Invoice payment',
      'AR Follow-Up': 'Payment follow-up',
      'Project Closeout': 'Project closeout',
      'Warranty Registration': 'Warranty setup',
      'Equipment Rental': 'Equipment rental',
      'Material Handling': 'Material handling'
    };
    
    return taskMap[stepName] || stepName.replace(/^(Input|Complete|Schedule|Create|Process|Prepare|Verify|Conduct)\s+/, '').toLowerCase();
  }

  /**
   * Get alert priority based on alert type
   */
  getAlertPriority(alertType) {
    switch (alertType) {
      case 'warning': return 'medium';
      case 'urgent': return 'high';
      case 'overdue': return 'urgent';
      default: return 'medium';
    }
  }

  /**
   * Get notification type based on step and alert type
   */
  getNotificationType(step, alertType) {
    if (alertType === 'overdue') {
      return 'workflow_step_overdue';
    } else if (alertType === 'urgent') {
      return 'workflow_step_urgent';
    } else {
      return 'workflow_step_warning';
    }
  }

  /**
   * Check if we've sent a recent alert to prevent spam
   */
  hasRecentAlert(alertKey, alertType) {
    const now = Date.now();
    const lastSent = this.alertHistory.get(alertKey);
    
    if (!lastSent) return false;
    
    // Different intervals for different alert types
    const intervals = {
      'warning': 24 * 60 * 60 * 1000, // 24 hours
      'urgent': 12 * 60 * 60 * 1000,  // 12 hours
      'overdue': 24 * 60 * 60 * 1000  // 24 hours
    };
    
    const interval = intervals[alertType] || intervals['warning'];
    
    return (now - lastSent) < interval;
  }

  /**
   * Mark an alert as sent
   */
  markAlertSent(alertKey, alertType) {
    this.alertHistory.set(alertKey, Date.now());
  }

  /**
   * Clean up old alert history
   */
  cleanupAlertHistory() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [key, timestamp] of this.alertHistory.entries()) {
      if (now - timestamp > maxAge) {
        this.alertHistory.delete(key);
      }
    }
    
    console.log('🧹 Cleaned up old alert history');
  }

  /**
   * Complete workflow step with sub-task tracking
   */
  async completeWorkflowStep(workflowId, stepId, completedBy, notes = '') {
    try {
      const workflow = await ProjectWorkflow.findById(workflowId);
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      const step = workflow.steps.find(s => s.stepId === stepId);
      
      if (!step) {
        throw new Error('Step not found');
      }
      
      // Mark step as completed
      step.isCompleted = true;
      step.completedAt = new Date();
      step.completedBy = completedBy;
      step.completionNotes = notes;
      step.actualEndDate = new Date();
      
      // Mark all sub-tasks as completed
      if (step.subTasks) {
        step.subTasks.forEach(subTask => {
          if (!subTask.isCompleted) {
            subTask.isCompleted = true;
            subTask.completedAt = new Date();
            subTask.completedBy = completedBy;
          }
        });
      }
      
      // Update workflow progress
      const completedSteps = workflow.steps.filter(s => s.isCompleted).length;
      workflow.overallProgress = Math.round((completedSteps / workflow.steps.length) * 100);
      
      // Check if this was the current step
      if (workflow.currentStep && workflow.currentStep.stepId === stepId) {
        workflow.currentStepIndex += 1;
        
        // Check if workflow is complete
        if (workflow.currentStepIndex >= workflow.steps.length) {
          workflow.status = 'completed';
          workflow.actualCompletionDate = new Date();
        }
      }
      
      workflow.lastModifiedBy = completedBy;
      await workflow.save();
      
      // Send completion notification
      await this.sendStepCompletionNotification(workflow, step, completedBy);
      
      return {
        success: true,
        workflow: workflow,
        nextStep: workflow.currentStep
      };
      
    } catch (error) {
      console.error('❌ Error completing workflow step:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete individual sub-task
   */
  async completeSubTask(workflowId, stepId, subTaskId, completedBy, notes = '') {
    try {
      const workflow = await ProjectWorkflow.findById(workflowId);
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      const step = workflow.steps.find(s => s.stepId === stepId);
      
      if (!step) {
        throw new Error('Step not found');
      }
      
      const subTask = step.subTasks.find(st => st.subTaskId === subTaskId);
      
      if (!subTask) {
        throw new Error('Sub-task not found');
      }
      
      // Mark sub-task as completed
      subTask.isCompleted = true;
      subTask.completedAt = new Date();
      subTask.completedBy = completedBy;
      subTask.notes = notes;
      
      // Check if all sub-tasks are completed
      const allSubTasksCompleted = step.subTasks.every(st => st.isCompleted);
      
      if (allSubTasksCompleted && !step.isCompleted) {
        // Auto-complete the step if all sub-tasks are done
        step.isCompleted = true;
        step.completedAt = new Date();
        step.completedBy = completedBy;
        step.actualEndDate = new Date();
        
        // Update workflow progress
        const completedSteps = workflow.steps.filter(s => s.isCompleted).length;
        workflow.overallProgress = Math.round((completedSteps / workflow.steps.length) * 100);
        
        // Send completion notification
        await this.sendStepCompletionNotification(workflow, step, completedBy);
      }
      
      workflow.lastModifiedBy = completedBy;
      await workflow.save();
      
      return {
        success: true,
        workflow: workflow,
        stepCompleted: allSubTasksCompleted
      };
      
    } catch (error) {
      console.error('❌ Error completing sub-task:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send notification when a step is completed
   */
  async sendStepCompletionNotification(workflow, step, completedBy) {
    try {
      const project = workflow.project;
      const projectName = project.projectName || project.name || 'Unknown Project';
      
      // Get team members to notify
      const projectData = await Project.findById(project._id || project)
        .populate('teamMembers')
        .populate('projectManager');
      
      const recipients = [];
      
      if (projectData.projectManager) {
        recipients.push(projectData.projectManager);
      }
      
      // Add relevant team members
      const relevantRoles = ['admin', 'manager'];
      for (const teamMember of projectData.teamMembers) {
        if (relevantRoles.includes(teamMember.role)) {
          recipients.push(teamMember);
        }
      }
      
      // Add step-specific recipients
      if (step.alertRecipients) {
        if (step.alertRecipients.primary) recipients.push(...step.alertRecipients.primary);
        if (step.alertRecipients.escalation) recipients.push(...step.alertRecipients.escalation);
      }
      
      // Create completion notifications
      for (const recipient of recipients) {
        if (recipient._id.toString() === completedBy.toString()) {
          continue; // Don't notify the person who completed it
        }
        
        await Notification.create({
          user: recipient._id,
          message: `✅ ${step.phase} step "${step.stepName}" completed for ${projectName}`,
          type: 'workflow_step_completed',
          priority: 'medium',
          relatedProject: project._id || project,
          link: `/projects/${project._id || project}/workflow`,
          data: {
            workflowId: workflow._id,
            stepId: step.stepId,
            stepName: step.stepName,
            phase: step.phase,
            completedBy: completedBy,
            completedAt: step.completedAt,
            overallProgress: workflow.overallProgress
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error sending step completion notification:', error);
    }
  }

  /**
   * Manually trigger immediate alert check (for testing/debugging)
   */
  async triggerImmediateAlertCheck() {
    console.log('🔴 MANUAL TRIGGER: Checking workflow alerts immediately...');
    return await this.checkAndSendAlerts();
  }

  /**
   * Check alerts for a specific project immediately (for new projects)
   */
  async checkAlertsForProject(projectId) {
    try {
      console.log(`🔍 Checking alerts specifically for project: ${projectId}`);
      
      const workflow = await ProjectWorkflow.findOne({ project: projectId }).populate('project');
      
      if (!workflow) {
        console.log(`⚠️ No workflow found for project ${projectId}`);
        return [];
      }
      
      console.log(`📋 Found workflow for project: ${workflow.project?.projectName || 'Unknown'}`);
      console.log(`   Workflow status: ${workflow.status}`);
      console.log(`   Steps: ${workflow.steps.length}`);
      
      const alerts = await this.checkWorkflowAlerts(workflow);
      console.log(`📨 Generated ${alerts.length} alerts for project ${projectId}`);
      
      return alerts;
      
    } catch (error) {
      console.error(`❌ Error checking alerts for project ${projectId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new WorkflowAlertService(); 