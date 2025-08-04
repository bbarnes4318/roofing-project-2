const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

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
      
      const activeWorkflows = await prisma.projectWorkflow.findMany({
        where: {
          status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }
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
        
        // Check for section-based alerts first (new projects or completed sections)
        const sectionAlerts = await this.checkSectionBasedAlerts(workflow);
        totalAlerts += sectionAlerts.length;
        
        // Check for traditional time-based alerts
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
   * Check section-based alerts (new projects or completed sections)
   */
  async checkSectionBasedAlerts(workflow) {
    const alertsToSend = [];
    
    try {
      // Check if this is a new project (no steps completed yet)
      const completedSteps = workflow.steps.filter(step => step.isCompleted);
      const isNewProject = completedSteps.length === 0;
      
      if (isNewProject) {
        console.log(`🆕 New project detected: ${workflow.project.projectName}`);
        
        // CRITICAL: Create alerts for ALL active (incomplete) steps in current workflow
        // This handles CSV imports that start at any phase/section/line item
        const activeSteps = workflow.steps.filter(step => !step.isCompleted);
        
        console.log(`📋 Creating alerts for ${activeSteps.length} active steps in new project`);
        
        for (const step of activeSteps) {
          const stepKey = `${workflow.id}_step_${step.id}`;
          
          if (!this.hasRecentAlert(stepKey, 'section_start')) {
            console.log(`🔥 Creating alert for active step: ${step.stepName} (${step.phase})`);
            
            const recipients = await this.getAlertRecipients(workflow, step, 'section_start');
            
            for (const recipient of recipients) {
              try {
                const alert = await this.createWorkflowAlert(workflow, step, recipient, 'section_start', 0, 0);
                alertsToSend.push(alert);
              } catch (error) {
                console.error(`❌ Failed to create alert for step ${step.stepName}:`, error);
              }
            }
            
            // Mark this step as having alerts sent
            this.markAlertSent(stepKey, 'section_start');
          }
        }
        
        console.log(`📨 Created ${alertsToSend.length} alerts for new project workflow`);
      } else {
        // Check for recently completed sections that should trigger next section alerts
        const nextActiveSection = this.getNextActiveSection(workflow);
        
        if (nextActiveSection) {
          const { phase, section } = nextActiveSection;
          
          // Check if this section has any active alerts already
          const sectionKey = `${workflow.id}_section_${phase}_${section}`;
          
          if (!this.hasRecentAlert(sectionKey, 'section_start')) {
            console.log(`📂 Next active section detected: ${section} in ${phase} phase`);
            
            const alerts = await this.createSectionAlerts(workflow, phase, section);
            alertsToSend.push(...alerts);
            
            // Mark this section as having alerts sent
            this.markAlertSent(sectionKey, 'section_start');
            
            console.log(`📨 Created ${alerts.length} alerts for section: ${section}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error checking section-based alerts for workflow ${workflow.id}:`, error);
    }
    
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
        // Check if this alert should be suppressed due to phase override
        const shouldSuppress = await this.shouldSuppressAlert(workflow, step);
        
        if (!shouldSuppress) {
          alerts.push({
            step,
            alertType,
            daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
            daysOverdue: daysOverdue > 0 ? daysOverdue : 0
          });
        }
      }
    }
    
    return alerts;
  }

  /**
   * Check if a section is completed by checking all its line items
   */
  isSectionCompleted(workflow, sectionName) {
    const sectionSteps = workflow.steps.filter(step => {
      return this.getSectionFromStepName(step.stepName) === sectionName;
    });
    
    if (sectionSteps.length === 0) return false;
    
    return sectionSteps.every(step => step.isCompleted);
  }

  /**
   * Get the next section that should receive alerts
   */
  getNextActiveSection(workflow) {
    const phaseOrder = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', '2ND_SUPP', 'COMPLETION'];
    const currentPhase = workflow.currentPhase || 'LEAD';
    
    // Get sections for current phase
    const phaseSections = this.getSectionsForPhase(currentPhase);
    
    // Find first incomplete section in current phase
    for (const section of phaseSections) {
      if (!this.isSectionCompleted(workflow, section)) {
        return { phase: currentPhase, section };
      }
    }
    
    // If current phase is complete, move to next phase
    const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
    if (currentPhaseIndex < phaseOrder.length - 1) {
      const nextPhase = phaseOrder[currentPhaseIndex + 1];
      const nextPhaseSections = this.getSectionsForPhase(nextPhase);
      
      if (nextPhaseSections.length > 0) {
        return { phase: nextPhase, section: nextPhaseSections[0] };
      }
    }
    
    return null;
  }

  /**
   * Create alerts for all line items in a section
   */
  async createSectionAlerts(workflow, phase, sectionName) {
    const sectionSteps = workflow.steps.filter(step => {
      return step.phase === phase && this.getSectionFromStepName(step.stepName) === sectionName;
    });
    
    const alerts = [];
    
    for (const step of sectionSteps) {
      if (!step.isCompleted) {
        const alertData = {
          type: 'section_start',
          title: `Section Started: ${sectionName}`,
          message: `New section "${sectionName}" is now active. Complete: ${step.stepName}`,
          actionData: {
            workflowId: workflow.id,
            projectId: workflow.projectId,
            stepId: step.id,
            stepName: step.stepName,
            phase: phase,
            section: sectionName,
            priority: 'medium',
            defaultResponsible: step.responsibleRole || 'OFFICE'
          },
          priority: 'medium'
        };
        
        const recipients = await this.getAlertRecipients(workflow, step, 'section_start');
        
        for (const recipient of recipients) {
          try {
            const alert = await this.createWorkflowAlert(workflow, step, recipient, 'section_start', 0, 0);
            alerts.push(alert);
          } catch (error) {
            console.error(`❌ Failed to create section alert for user ${recipient.id}:`, error);
          }
        }
      }
    }
    
    return alerts;
  }

  /**
   * Get section name from step name
   */
  getSectionFromStepName(stepName) {
    // Map common step patterns to section names
    const sectionMappings = {
      // LEAD Phase
      'Input Customer Information': 'Input Customer Information',
      'Complete Questions': 'Complete Questions to Ask Checklist',
      'Input Lead Property': 'Input Lead Property Information',
      'Assign A Project Manager': 'Assign A Project Manager',
      'Schedule Initial Inspection': 'Schedule Initial Inspection',
      
      // PROSPECT Phase
      'Site Inspection': 'Site Inspection',
      'Write Estimate': 'Write Estimate',
      'Present Estimate': 'Present Estimate',
      'Follow Up': 'Follow Up',
      
      // APPROVED Phase
      'Contract & Permitting': 'Contract & Permitting',
      'Production Order': 'Production Order',
      'Schedule Job': 'Schedule Job',
      
      // EXECUTION Phase
      'Job Preparation': 'Job Preparation',
      'Installation': 'Installation',
      'Quality Control': 'Quality Control',
      'Final Inspection': 'Final Inspection',
      
      // 2ND_SUPP Phase
      'Supplement Assessment': 'Supplement Assessment',
      'Additional Work': 'Additional Work',
      
      // COMPLETION Phase
      'Project Closeout': 'Project Closeout',
      'Customer Satisfaction': 'Customer Satisfaction'
    };
    
    // Try direct mapping first
    for (const [key, section] of Object.entries(sectionMappings)) {
      if (stepName.includes(key)) {
        return section;
      }
    }
    
    // Default fallback
    return stepName.split(' - ')[0] || stepName;
  }

  /**
   * Get sections for a specific phase
   */
  getSectionsForPhase(phase) {
    const phaseSections = {
      'LEAD': [
        'Input Customer Information',
        'Complete Questions to Ask Checklist', 
        'Input Lead Property Information',
        'Assign A Project Manager',
        'Schedule Initial Inspection'
      ],
      'PROSPECT': [
        'Site Inspection',
        'Write Estimate', 
        'Present Estimate',
        'Follow Up'
      ],
      'APPROVED': [
        'Contract & Permitting',
        'Production Order',
        'Schedule Job'
      ],
      'EXECUTION': [
        'Job Preparation',
        'Installation',
        'Quality Control', 
        'Final Inspection'
      ],
      '2ND_SUPP': [
        'Supplement Assessment',
        'Additional Work'
      ],
      'COMPLETION': [
        'Project Closeout',
        'Customer Satisfaction'
      ]
    };
    
    return phaseSections[phase] || [];
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
        
        // Map workflow roles to actual database roles
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
      
      // CRITICAL: Create actual WorkflowAlert record instead of just Notification
      const workflowAlert = await prisma.workflowAlert.create({
        data: {
          type: 'Work Flow Line Item',
          priority: priority,
          status: 'ACTIVE',
          title: `${step.stepName} - ${project.customer?.primaryName || projectName}`,
          message: message,
          stepName: step.stepName,
          responsibleRole: step.defaultResponsible || 'OFFICE',
          isRead: false,
          dueDate: step.scheduledEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
          projectId: project.id,
          workflowId: workflow.id,
          stepId: step.id,
          assignedToId: recipient.id,
          createdById: null, // System generated
          metadata: {
            alertType: alertType,
            daysUntilDue: daysUntilDue || 0,
            daysOverdue: daysOverdue || 0,
            phase: step.phase,
            section: this.getSectionFromStepName(step.stepName),
            lineItem: step.stepName,
            projectName: projectName,
            customerName: project.customer?.primaryName,
            cleanTaskName: this.getCleanTaskName(step.stepName)
          }
        }
      });
      
      // Also create notification for immediate UI updates
      const notification = await prisma.notification.create({
        data: {
          title: `Workflow Alert: ${step.stepName}`,
          message: message,
          type: 'WORKFLOW_ALERT',
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
            workflowAlertId: workflowAlert.id
          }
        }
      });
      
      console.log(`📨 ✅ Successfully created ${alertType} alert for ${recipient.firstName} ${recipient.lastName} - ${step.phase}: ${step.stepName}`);
      console.log(`   WorkflowAlert ID: ${workflowAlert.id}`);
      console.log(`   Notification ID: ${notification.id}`);
      
      return workflowAlert;
      
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
      'overdue': 24 * 60 * 60 * 1000, // 24 hours
      'section_start': 7 * 24 * 60 * 60 * 1000 // 7 days - section alerts should not repeat frequently
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
        throw new Error('Sub-task not found');
      }
      
      // Mark sub-task as completed
      await prisma.workflowSubTask.update({
        where: { id: subTask.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedById: completedBy,
          notes
        }
      });
      
      // Check if all sub-tasks are completed
      const allSubTasks = await prisma.workflowSubTask.findMany({
        where: { stepId: step.id }
      });
      
      const allSubTasksCompleted = allSubTasks.every(st => st.isCompleted);
      
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
      }
      
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

  /**
   * Check if an alert should be suppressed due to phase override
   */
  async shouldSuppressAlert(workflow, step) {
    try {
      // Get active phase overrides for this workflow
      const activeOverrides = await prisma.projectPhaseOverride.findMany({
        where: {
          workflowId: workflow.id,
          isActive: true
        }
      });

      if (activeOverrides.length === 0) {
        return false; // No active overrides, don't suppress
      }

      // Check if the step's phase is in any of the suppressed phases
      for (const override of activeOverrides) {
        if (override.suppressAlertsFor.includes(step.phase)) {
          console.log(`🔕 Suppressing alert for step "${step.stepName}" in phase "${step.phase}" due to phase override to "${override.toPhase}"`);
          
          // Log this suppression for audit trail
          await this.logSuppressedAlert(override, step);
          
          return true; // Suppress this alert
        }
      }

      return false; // Don't suppress
    } catch (error) {
      console.error('❌ Error checking alert suppression:', error);
      return false; // Default to not suppressing on error
    }
  }

  /**
   * Log a suppressed alert for audit trail
   */
  async logSuppressedAlert(override, step) {
    try {
      // Generate a unique alert ID for tracking
      const originalAlertId = `alert_${override.workflowId}_${step.id}_${Date.now()}`;
      
      await prisma.suppressedWorkflowAlert.create({
        data: {
          originalAlertId: originalAlertId,
          overrideId: override.id,
          suppressedPhase: step.phase,
          suppressedStepId: step.id,
          suppressedStepName: step.stepName,
          originalTitle: `${step.stepName} Alert`,
          originalMessage: `Alert for step "${step.stepName}" was suppressed due to phase override`,
          originalPriority: step.alertPriority || 'MEDIUM',
          suppressionReason: `Phase override from ${override.fromPhase} to ${override.toPhase} - alerts for ${step.phase} phase are suppressed`
        }
      });

      console.log(`📝 Logged suppressed alert for step "${step.stepName}" in phase "${step.phase}"`);
    } catch (error) {
      console.error('❌ Error logging suppressed alert:', error);
    }
  }
}

// Export singleton instance
module.exports = new WorkflowAlertService(); 