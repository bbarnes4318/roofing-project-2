const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

class WorkflowAlertService {
  constructor() {
    this.alertHistory = new Map(); // Track sent alerts to prevent duplicates
    
    this.init();
  }

  init() {
    // Remove time-based polling - alerts will be triggered by workflow step completions
    console.log('🚨 WorkflowAlertService initialized - alerts triggered by workflow step completions');

    // Schedule daily cleanup of old alert history
    cron.schedule('0 0 * * *', () => {
      this.cleanupAlertHistory();
    });
  }

  /**
   * Main method to check all workflows and send alerts
   */
  async checkAndSendAlerts() {
    try {
      console.log('🔍 Checking workflow alerts...');
      
      const activeWorkflows = await prisma.projectWorkflow.findMany({
        where: {
          // Since we removed status field, find workflows that have steps defined
          steps: {
            some: {} // At least one step exists
          }
        },
        include: {
          project: true,
          steps: {
            include: {
              subTasks: true
            }
          }
        }
      });

      console.log(`📋 Found ${activeWorkflows.length} active workflows to check`);

      let totalAlerts = 0;
      let skippedWorkflows = 0;
      
      for (const workflow of activeWorkflows) {
        // CRITICAL: Skip workflows with deleted projects
        if (!workflow.project || !workflow.project.id) {
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
      
      // Get steps requiring alerts
      const stepsRequiringAlerts = this.getStepsRequiringAlerts(workflow);
      
      console.log(`📋 Found ${stepsRequiringAlerts.length} steps requiring alerts`);
      
      for (const alertInfo of stepsRequiringAlerts) {
        const { step, alertType, daysUntilDue, daysOverdue } = alertInfo;
        
        console.log(`⚠️ Alert needed: ${step.stepName} (${alertType}) - Due: ${daysUntilDue || 'N/A'}, Overdue: ${daysOverdue || 'N/A'}`);
        
        // Check if we've already sent this alert recently
        const alertKey = `${workflow.id}_${step.stepId}_${alertType}`;
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
      console.error(`❌ Error checking alerts for workflow ${workflow.id}:`, error);
    }
    
    console.log(`📊 Generated ${alertsToSend.length} alerts for workflow ${workflow.id}`);
    return alertsToSend;
  }

  /**
   * Get steps that require alerts based on due dates and completion status
   */
  getStepsRequiringAlerts(workflow) {
    const alerts = [];
    const now = new Date();
    
    for (const step of workflow.steps) {
      if (step.isCompleted) continue;
      
      const scheduledEndDate = step.scheduledEndDate;
      if (!scheduledEndDate) continue;
      
      const daysUntilDue = Math.ceil((scheduledEndDate - now) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.ceil((now - scheduledEndDate) / (1000 * 60 * 60 * 24));
      
      let alertType = null;
      
      if (daysOverdue > 0) {
        alertType = 'overdue';
      } else if (daysUntilDue <= 1) {
        alertType = 'urgent';
      } else if (daysUntilDue <= step.alertDays) {
        alertType = 'warning';
      }
      
      if (alertType) {
        alerts.push({
          step,
          alertType,
          daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0
        });
      }
    }
    
    return alerts;
  }

  /**
   * Get recipients for an alert based on step configuration and alert type
   */
  async getAlertRecipients(workflow, step, alertType) {
    const recipients = [];
    
    try {
      // Get the project with team members
      const project = await prisma.project.findUnique({
        where: { id: workflow.project.id },
        include: {
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  isActive: true
                }
              }
            }
          },
          projectManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
              isActive: true
            }
          }
        }
      });
      
      if (!project) {
        console.log(`⚠️ No project found for workflow ${workflow.id}`);
        return [];
      }
      
      console.log(`📋 Finding recipients for step "${step.stepName}" in project "${project.projectName}"`);
      console.log(`   Step defaultResponsible: ${step.defaultResponsible}`);
      console.log(`   Step assignedTo: ${step.assignedToId}`);

      // Primary recipient: assigned team member or users with the default responsible role
      if (step.assignedToId) {
        console.log(`🔍 Looking for assigned user: ${step.assignedToId}`);
        const assignedUser = await prisma.user.findUnique({
          where: { id: step.assignedToId }
        });
        if (assignedUser && assignedUser.isActive) {
          recipients.push(assignedUser);
          console.log(`👤 Added assigned user: ${assignedUser.firstName} ${assignedUser.lastName}`);
        } else {
          console.log(`❌ Assigned user not found or inactive`);
        }
      } else {
        console.log(`🔍 No assigned user, looking for users with role: ${step.defaultResponsible}`);
        
        // **CRITICAL: Map workflow roles to specific users from project-phases.txt**
        const specificUserMapping = {
          'OFFICE': ['Office User'], // Office user handles lead phase tasks
          'ADMINISTRATION': ['Admin User'], // Admin user handles insurance, agreements, financial processing
          'PROJECT_MANAGER': ['Project Manager'], // Project Manager handles site inspection, estimates
          'FIELD_DIRECTOR': ['Field Director'], // Field Director handles installation
          'ROOF_SUPERVISOR': ['Roof Supervisor'] // Roof Supervisor handles quality checks
        };
        
        const targetUserNames = specificUserMapping[step.defaultResponsible] || [];
        console.log(`   Looking for specific users: [${targetUserNames.join(', ')}]`);
        
        // Find users by their specific names
        const specificUsers = await prisma.user.findMany({
          where: {
            AND: [
              { isActive: true },
              {
                OR: targetUserNames.map(name => ({
                  AND: [
                    { firstName: name.split(' ')[0] },
                    { lastName: name.split(' ')[1] }
                  ]
                }))
              }
            ]
          }
        });
        
        console.log(`   Found ${specificUsers.length} specific users for ${step.defaultResponsible}:`);
        specificUsers.forEach(user => {
          console.log(`     - ${user.firstName} ${user.lastName} (${user.role})`);
        });
        
        if (specificUsers.length > 0) {
          recipients.push(...specificUsers);
        } else {
          // Fallback to role-based mapping if specific users not found
          console.log(`⚠️ No specific users found, falling back to role-based mapping`);
          
          const roleMapping = {
            'OFFICE': ['ADMIN', 'MANAGER'],
            'ADMINISTRATION': ['ADMIN', 'MANAGER'],
            'PROJECT_MANAGER': ['PROJECT_MANAGER', 'MANAGER'],
            'FIELD_DIRECTOR': ['PROJECT_MANAGER', 'MANAGER'],
            'ROOF_SUPERVISOR': ['PROJECT_MANAGER', 'WORKER', 'MANAGER']
          };
          
          const mappedRoles = roleMapping[step.defaultResponsible] || [step.defaultResponsible];
          console.log(`   Mapped roles: ${step.defaultResponsible} -> [${mappedRoles.join(', ')}]`);
          
          // Fall back to users with the mapped responsible roles
          const roleUsers = await prisma.user.findMany({
            where: {
              role: { in: mappedRoles },
              isActive: true
            }
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
            
            const fallbackUsers = await prisma.user.findMany({
              where: {
                role: { in: ['ADMIN', 'MANAGER'] },
                isActive: true
              }
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
              const allUsers = await prisma.user.findMany({
                where: { isActive: true },
                select: { firstName: true, lastName: true, role: true, email: true }
              });
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
      }

      // Add project manager for urgent and overdue alerts
      if ((alertType === 'urgent' || alertType === 'overdue') && project.projectManager) {
        recipients.push(project.projectManager);
        console.log(`👨‍💼 Added project manager: ${project.projectManager.firstName} ${project.projectManager.lastName}`);
      }

      // For overdue items, also alert managers and admins
      if (alertType === 'overdue') {
        const managementUsers = await prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'MANAGER'] },
            isActive: true
          }
        });
        recipients.push(...managementUsers);
        console.log(`🏢 Added ${managementUsers.length} management users for overdue alert`);
      }
      
      // Remove duplicates
      const uniqueRecipients = recipients.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
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
      const projectName = project.projectName || 'Unknown Project';
      
      console.log(`🔧 Creating alert for ${recipient.firstName} ${recipient.lastName} (${recipient.id})`);
      console.log(`   Project: ${projectName} (${project.id})`);
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
          notificationType = 'WORKFLOW_ALERT';
          break;
        case 'urgent':
          notificationType = 'WORKFLOW_ALERT';
          break;
        case 'overdue':
          notificationType = 'WORKFLOW_ALERT';
          break;
        default:
          notificationType = 'WORKFLOW_ALERT';
      }
      
      // Create notification
      const notification = await prisma.notification.create({
        data: {
          title: `Workflow Alert: ${step.stepName}`,
          message: message,
          type: notificationType,
          recipientId: recipient.id,
          actionUrl: `/projects/${project.id}/workflow`,
          actionData: {
            workflowId: workflow.id,
            stepId: step.stepId,
            stepName: step.stepName,
            cleanTaskName: this.getCleanTaskName(step.stepName),
            phase: step.phase,
            daysUntilDue: daysUntilDue || 0,
            daysOverdue: daysOverdue || 0,
            projectName: projectName,
            user: step.defaultResponsible || 'Unknown'
          }
        }
      });
      
      console.log(`📨 ✅ Successfully created ${alertType} alert for ${recipient.firstName} ${recipient.lastName} - ${step.phase}: ${step.stepName}`);
      console.log(`   Notification ID: ${notification.id}`);
      
      return notification;
      
    } catch (error) {
      console.error('❌ Error creating workflow alert:', error.message);
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
      case 'warning': return 'MEDIUM';
      case 'urgent': return 'HIGH';
      case 'overdue': return 'HIGH';
      default: return 'MEDIUM';
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
      const workflow = await prisma.projectWorkflow.findUnique({
        where: { id: workflowId },
        include: {
          steps: {
            include: {
              subTasks: true
            }
          }
        }
      });
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      const step = workflow.steps.find(s => s.stepId === stepId);
      
      if (!step) {
        throw new Error('Step not found');
      }
      
      // Mark step as completed
      await prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedById: completedBy,
          completionNotes: notes,
          actualEndDate: new Date()
        }
      });
      
      // Mark all sub-tasks as completed
      if (step.subTasks && step.subTasks.length > 0) {
        await prisma.workflowSubTask.updateMany({
          where: {
            stepId: step.id,
            isCompleted: false
          },
          data: {
            isCompleted: true,
            completedAt: new Date(),
            completedById: completedBy
          }
        });
      }
      
      // Update workflow progress
      const allSteps = await prisma.workflowStep.findMany({
        where: { workflowId }
      });
      
      const completedSteps = allSteps.filter(s => s.isCompleted).length;
      const overallProgress = Math.round((completedSteps / allSteps.length) * 100);
      
      await prisma.projectWorkflow.update({
        where: { id: workflowId },
        data: {
          overallProgress,
          lastModifiedById: completedBy,
          currentStepIndex: completedSteps,
          status: completedSteps >= allSteps.length ? 'COMPLETED' : 'IN_PROGRESS',
          actualCompletionDate: completedSteps >= allSteps.length ? new Date() : null
        }
      });
      
      // Send completion notification
      await this.sendStepCompletionNotification(workflow, step, completedBy);
      
      // TRIGGER ALERTS FOR NEXT STEP IMMEDIATELY
      const nextStep = allSteps[completedSteps];
      if (nextStep && !nextStep.isCompleted) {
        console.log(`🔔 Step "${step.stepName}" completed - triggering alerts for next step "${nextStep.stepName}"`);
        
        // Get the updated workflow with the completed step
        const updatedWorkflow = await prisma.projectWorkflow.findUnique({
          where: { id: workflowId },
          include: {
            project: true,
            steps: {
              include: {
                subTasks: true
              }
            }
          }
        });
        
        // Check and send alerts for the next step
        const nextStepAlerts = await this.checkWorkflowAlerts(updatedWorkflow);
        console.log(`📨 Generated ${nextStepAlerts.length} alerts for next step "${nextStep.stepName}"`);
      }
      
      return {
        success: true,
        workflow: workflow,
        nextStep: allSteps[completedSteps] || null
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
      const workflow = await prisma.projectWorkflow.findUnique({
        where: { id: workflowId },
        include: {
          steps: {
            include: {
              subTasks: true
            }
          }
        }
      });
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      const step = workflow.steps.find(s => s.stepId === stepId);
      
      if (!step) {
        throw new Error('Step not found');
      }
      
      const subTask = step.subTasks.find(st => st.subTaskId === subTaskId);
      
      if (!subTask) {
        throw new Error('Subtask not found');
      }
      
      // Update the subtask
      const updatedSubTask = await prisma.workflowSubTask.update({
        where: { id: subTask.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedById: completedBy,
          notes: notes,
          actualEndDate: new Date()
        }
      });
      
      // Check if all sub-tasks in this step are now completed
      const allSubTasks = await prisma.workflowSubTask.findMany({
        where: { stepId: step.id }
      });
      
      const allSubTasksCompleted = allSubTasks.every(st => st.isCompleted);
      
      let stepCompleted = false;
      let nextStep = null;
      
      if (allSubTasksCompleted && !step.isCompleted) {
        // Auto-complete the step if all sub-tasks are done
        await prisma.workflowStep.update({
          where: { id: step.id },
          data: {
            isCompleted: true,
            completedAt: new Date(),
            completedById: completedBy,
            actualEndDate: new Date()
          }
        });
        
        stepCompleted = true;
        
        // Update workflow progress
        const allSteps = await prisma.workflowStep.findMany({
          where: { workflowId }
        });
        
        const completedSteps = allSteps.filter(s => s.isCompleted).length;
        const overallProgress = Math.round((completedSteps / allSteps.length) * 100);
        
        await prisma.projectWorkflow.update({
          where: { id: workflowId },
          data: {
            overallProgress,
            lastModifiedById: completedBy,
            currentStepIndex: completedSteps,
            status: completedSteps >= allSteps.length ? 'COMPLETED' : 'IN_PROGRESS',
            actualCompletionDate: completedSteps >= allSteps.length ? new Date() : null
          }
        });
        
        // Send completion notification
        await this.sendStepCompletionNotification(workflow, step, completedBy);
        
        // TRIGGER ALERTS FOR NEXT STEP IMMEDIATELY (when step is auto-completed)
        nextStep = allSteps[completedSteps];
        if (nextStep && !nextStep.isCompleted) {
          console.log(`🔔 Step "${step.stepName}" auto-completed - triggering alerts for next step "${nextStep.stepName}"`);
          
          // Get the updated workflow with the completed step
          const updatedWorkflow = await prisma.projectWorkflow.findUnique({
            where: { id: workflowId },
            include: {
              project: true,
              steps: {
                include: {
                  subTasks: true
                }
              }
            }
          });
          
          // Check and send alerts for the next step
          const nextStepAlerts = await this.checkWorkflowAlerts(updatedWorkflow);
          console.log(`📨 Generated ${nextStepAlerts.length} alerts for next step "${nextStep.stepName}"`);
        }
      }
      
      return {
        success: true,
        subTask: updatedSubTask,
        stepCompleted: stepCompleted,
        nextStep: nextStep
      };
      
    } catch (error) {
      console.error('❌ Error completing subtask:', error);
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
      const projectName = project.projectName || 'Unknown Project';
      
      // Get team members to notify
      const projectData = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          projectManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      });
      
      const recipients = [];
      
      if (projectData.projectManager) {
        recipients.push(projectData.projectManager);
      }
      
      // Add relevant team members
      const relevantRoles = ['ADMIN', 'MANAGER'];
      for (const teamMember of projectData.teamMembers) {
        if (relevantRoles.includes(teamMember.user.role)) {
          recipients.push(teamMember.user);
        }
      }
      
      // Create completion notifications
      for (const recipient of recipients) {
        if (recipient.id === completedBy) {
          continue; // Don't notify the person who completed it
        }
        
        await prisma.notification.create({
          data: {
            title: `Step Completed: ${step.stepName}`,
            message: `✅ ${step.phase} step "${step.stepName}" completed for ${projectName}`,
            type: 'WORKFLOW_ALERT',
            recipientId: recipient.id,
            actionUrl: `/projects/${project.id}/workflow`,
            actionData: {
              workflowId: workflow.id,
              stepId: step.stepId,
              stepName: step.stepName,
              phase: step.phase,
              completedBy: completedBy,
              completedAt: step.completedAt,
              overallProgress: workflow.overallProgress
            }
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error sending step completion notification:', error);
    }
  }

  /**
   * Trigger initial alerts for a new workflow or when workflow is started
   */
  async triggerInitialAlerts(workflowId) {
    try {
      console.log(`🚀 Triggering initial alerts for workflow ${workflowId}`);
      
      const workflow = await prisma.projectWorkflow.findUnique({
        where: { id: workflowId },
        include: {
          project: true,
          steps: {
            include: {
              subTasks: true
            }
          }
        }
      });
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      
      // Check and send alerts for the first step
      const alerts = await this.checkWorkflowAlerts(workflow);
      console.log(`📨 Generated ${alerts.length} initial alerts for workflow ${workflowId}`);
      
      return alerts;
      
    } catch (error) {
      console.error('❌ Error triggering initial alerts:', error);
      return [];
    }
  }

  /**
   * Trigger immediate alert check for a specific project
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
      
      const workflow = await prisma.projectWorkflow.findFirst({
        where: { projectId },
        include: {
          project: true,
          steps: {
            include: {
              subTasks: true
            }
          }
        }
      });
      
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