const { prisma } = require('../config/prisma');
const WorkflowProgressService = require('./WorkflowProgressService');

class ProjectService {
  
  // **CRITICAL: Get project with complete workflow data**
  async getProjectById(projectId) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          customer: true,
          projectManager: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          teamMembers: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, role: true }
              }
            }
          },
          // **CRITICAL: Include complete workflow with all phases, sections, and line items**
          workflow: {
            include: {
              steps: {
                include: {
                  subTasks: true,
                  assignedTo: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                  },
                  completedBy: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                  }
                },
                orderBy: { stepId: 'asc' }
              },
              createdBy: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          tasks: {
            include: {
              assignedTo: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          documents: {
            include: {
              uploadedBy: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return project;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  // **CRITICAL: Get project workflow with all phases, sections, and line items**
  async getProjectWorkflow(projectId) {
    try {
      const workflow = await prisma.projectWorkflow.findUnique({
        where: { projectId },
        include: {
          project: {
            select: { id: true, projectName: true, projectNumber: true, status: true }
          },
          steps: {
            include: {
              subTasks: true,
              assignedTo: {
                select: { id: true, firstName: true, lastName: true, email: true }
              },
              completedBy: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            },
            orderBy: { stepId: 'asc' }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          lastModifiedBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      if (!workflow) {
        // If no workflow exists, create default workflow for the project
        console.log(`No workflow found for project ${projectId}, creating default workflow...`);
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { projectType: true }
        });

                 if (project) {
           return await this.createDefaultWorkflow(projectId, project.projectType, null, project.isInsuranceClaim);
         }
        
        throw new Error('Project workflow not found and could not create default');
      }

      return workflow;
    } catch (error) {
      console.error('Error fetching project workflow:', error);
      throw error;
    }
  }

  // Create a new project with customer address as projectName (NEW REQUIREMENT)
  async createProject(projectData, userId) {
    try {
      // Generate 5-digit project number
      const lastProject = await prisma.project.findFirst({
        orderBy: { projectNumber: 'desc' },
        select: { projectNumber: true }
      });
      
      const projectNumber = lastProject ? lastProject.projectNumber + 1 : 10001;

      // Get customer to use address as projectName (NEW REQUIREMENT)
      const customer = await prisma.customer.findUnique({
        where: { id: projectData.customerId },
        select: { address: true, primaryName: true, secondaryName: true }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

             const project = await prisma.project.create({
         data: {
           projectNumber,
           projectName: customer.address, // projectName = customer address (NEW REQUIREMENT)
           projectType: projectData.projectType,
           description: projectData.description,
           priority: projectData.priority || 'MEDIUM',
           budget: projectData.budget,
           estimatedCost: projectData.estimatedCost,
           startDate: new Date(projectData.startDate),
           endDate: new Date(projectData.endDate),
           customerId: projectData.customerId,
           projectManagerId: projectData.projectManagerId,
           createdById: userId,
           notes: projectData.notes,
           isInsuranceClaim: projectData.isInsuranceClaim !== false // Default to true if not specified
         },
        include: {
          customer: true,
          projectManager: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      // **CRITICAL: Create complete workflow with conditional prospect phase based on insurance status**
      const isInsuranceClaim = projectData.isInsuranceClaim !== false; // Default to true if not specified
      await this.createDefaultWorkflow(project.id, project.projectType, userId, isInsuranceClaim);

      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Update project (keeping projectName and customer address in sync)
  async updateProject(projectId, updateData, userId) {
    try {
      // If customer is being changed, update projectName to new customer's address
      let projectName = updateData.projectName;
      
      if (updateData.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: updateData.customerId },
          select: { address: true }
        });
        
        if (customer) {
          projectName = customer.address; // Keep projectName = customer address
        }
      }

      const project = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...updateData,
          projectName, // Ensure projectName stays in sync with customer address
          updatedAt: new Date()
        },
        include: {
          customer: true,
          projectManager: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          workflow: {
            include: {
              steps: {
                include: { subTasks: true },
                orderBy: { stepId: 'asc' }
              }
            }
          }
        }
      });

      return project;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // **CRITICAL: Update workflow step completion status**
  async updateWorkflowStep(projectId, stepId, updateData) {
    try {
      console.log(`Updating workflow step ${stepId} for project ${projectId}:`, updateData);

      // Find the workflow step
      const step = await prisma.workflowStep.findFirst({
        where: {
          AND: [
            { stepId: stepId },
            { workflow: { projectId: projectId } }
          ]
        },
        include: {
          workflow: true,
          subTasks: true
        }
      });

      if (!step) {
        throw new Error(`Workflow step ${stepId} not found for project ${projectId}`);
      }

      // Update the step
      const updatedStep = await prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          isCompleted: updateData.completed,
          completedAt: updateData.completed ? new Date() : null,
          completedById: updateData.completed ? updateData.userId : null,
          notes: updateData.notes || step.notes,
          updatedAt: new Date()
        },
        include: {
          subTasks: true,
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          completedBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      // Update workflow progress
      await this.updateWorkflowProgress(step.workflowId);

      return updatedStep;
    } catch (error) {
      console.error('Error updating workflow step:', error);
      throw error;
    }
  }

  // **CRITICAL: Update workflow subtask completion status**
  async updateWorkflowSubTask(projectId, stepId, subTaskId, updateData) {
    try {
      console.log(`Updating subtask ${subTaskId} for step ${stepId} in project ${projectId}:`, updateData);

      // Find the subtask
      const subTask = await prisma.workflowSubTask.findFirst({
        where: {
          AND: [
            { subTaskId: subTaskId },
            { step: { stepId: stepId } },
            { step: { workflow: { projectId: projectId } } }
          ]
        },
        include: {
          step: {
            include: { workflow: true }
          }
        }
      });

      if (!subTask) {
        throw new Error(`Workflow subtask ${subTaskId} not found`);
      }

      // Update the subtask
      const updatedSubTask = await prisma.workflowSubTask.update({
        where: { id: subTask.id },
        data: {
          isCompleted: updateData.completed,
          completedAt: updateData.completed ? new Date() : null,
          completedById: updateData.completed ? updateData.userId : null,
          notes: updateData.notes || subTask.notes,
          updatedAt: new Date()
        }
      });

      // Update workflow progress
      await this.updateWorkflowProgress(subTask.step.workflowId);

      return updatedSubTask;
    } catch (error) {
      console.error('Error updating workflow subtask:', error);
      throw error;
    }
  }

  // Calculate and update workflow progress using weighted system
  async updateWorkflowProgress(workflowId) {
    try {
      const workflow = await prisma.projectWorkflow.findUnique({
        where: { id: workflowId },
        include: {
          project: true,
          steps: {
            include: { subTasks: true }
          }
        }
      });

      if (!workflow) return;

      // Create project object with workflow data for progress calculation
      const project = {
        ...workflow.project,
        workflow: workflow
      };

      // Calculate progress using the new weighted system
      const progressData = WorkflowProgressService.calculateProjectProgress(project);
      const overallProgress = progressData.overall;

      await prisma.projectWorkflow.update({
        where: { id: workflowId },
        data: {
          overallProgress: overallProgress,
          updatedAt: new Date()
        }
      });

      // Also update the project's progress field
      await prisma.project.update({
        where: { id: workflow.projectId },
        data: {
          progress: overallProgress,
          updatedAt: new Date()
        }
      });

      console.log(`Updated workflow progress using weighted system: ${progressData.completedWeight}/${progressData.totalWeight} = ${overallProgress}%`);
      
      return progressData;
    } catch (error) {
      console.error('Error updating workflow progress:', error);
      throw error;
    }
  }

  // **CRITICAL: Create default workflow with all 27 steps**
  async createDefaultWorkflow(projectId, projectType, userId = null, isInsuranceClaim = true) {
    try {
      console.log(`Creating default workflow for project ${projectId} (${projectType}) - Insurance: ${isInsuranceClaim}`);

      // Map project types to workflow types
      const workflowTypeMapping = {
        'ROOF_REPLACEMENT': 'ROOFING',
        'KITCHEN_REMODEL': 'KITCHEN_REMODEL',
        'BATHROOM_RENOVATION': 'BATHROOM_RENOVATION',
        'SIDING_INSTALLATION': 'SIDING',
        'WINDOW_REPLACEMENT': 'WINDOWS',
        'FLOORING': 'GENERAL',
        'PAINTING': 'GENERAL',
        'ELECTRICAL_WORK': 'GENERAL',
        'PLUMBING': 'GENERAL',
        'HVAC': 'GENERAL',
        'DECK_CONSTRUCTION': 'GENERAL',
        'LANDSCAPING': 'GENERAL',
        'OTHER': 'GENERAL'
      };

      const workflowType = workflowTypeMapping[projectType] || 'GENERAL';

      // Create workflow with conditional prospect phase based on insurance status
      const workflow = await prisma.projectWorkflow.create({
        data: {
          projectId,
          workflowType,
          status: 'NOT_STARTED',
          currentStepIndex: 0,
          overallProgress: 0,
          enableAlerts: true,
          alertMethods: ['IN_APP', 'EMAIL'],
          escalationEnabled: true,
          escalationDelayDays: 2,
          createdById: userId,
          // Create workflow steps with conditional prospect phase
          steps: {
            create: this.getDefaultWorkflowSteps(isInsuranceClaim)
          }
        },
        include: {
          steps: {
            include: { subTasks: true },
            orderBy: { stepId: 'asc' }
          }
        }
      });

      const stepCount = workflow.steps.length;
      console.log(`✅ Created default workflow with ${stepCount} steps (Insurance: ${isInsuranceClaim})`);
      return workflow;
    } catch (error) {
      console.error('Error creating default workflow:', error);
      throw error;
    }
  }

  // **CRITICAL: Default workflow steps with conditional prospect phase based on insurance status**
  getDefaultWorkflowSteps(isInsuranceClaim = true) {
    // Define all the steps
    const leadSteps = [
      // 🟨 LEAD PHASE (5 steps)
      {
        stepId: 'lead_1',
        stepName: 'Input Customer Information',
        description: 'Input customer information and verify details',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        alertDays: 1,
        overdueIntervals: [1, 3, 7, 14],
        dependencies: [],
        subTasks: {
          create: [
            { subTaskId: 'lead_1_1', subTaskName: 'Make sure the name is spelled correctly' },
            { subTaskId: 'lead_1_2', subTaskName: 'Make sure the email is correct. Send a confirmation email to confirm email.' }
          ]
        }
      },
      {
        stepId: 'lead_2',
        stepName: 'Complete Questions to Ask Checklist',
        description: 'Complete customer questions checklist and record details',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['lead_1'],
        subTasks: {
          create: [
            { subTaskId: 'lead_2_1', subTaskName: 'Input answers from Question Checklist into notes' },
            { subTaskId: 'lead_2_2', subTaskName: 'Record property details' }
          ]
        }
      },
      {
        stepId: 'lead_3',
        stepName: 'Input Lead Property Information',
        description: 'Gather and input all property information and photos',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['lead_2'],
        subTasks: {
          create: [
            { subTaskId: 'lead_3_1', subTaskName: 'Add Home View photos – Maps' },
            { subTaskId: 'lead_3_2', subTaskName: 'Add Street View photos – Google Maps' },
            { subTaskId: 'lead_3_3', subTaskName: 'Add elevation screenshot – PPRBD' },
            { subTaskId: 'lead_3_4', subTaskName: 'Add property age – County Assessor Website' },
            { subTaskId: 'lead_3_5', subTaskName: 'Evaluate ladder requirements – By looking at the room' }
          ]
        }
      },
      {
        stepId: 'lead_4',
        stepName: 'Assign A Project Manager',
        description: 'Select and assign project manager using workflow',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['lead_3'],
        subTasks: {
          create: [
            { subTaskId: 'lead_4_1', subTaskName: 'Use workflow from Lead Assigning Flowchart' },
            { subTaskId: 'lead_4_2', subTaskName: 'Select and brief the Project Manager' }
          ]
        }
      },
      {
        stepId: 'lead_5',
        stepName: 'Schedule Initial Inspection',
        description: 'Coordinate and schedule initial inspection',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['lead_4'],
        subTasks: {
          create: [
            { subTaskId: 'lead_5_1', subTaskName: 'Call Customer and coordinate with PM schedule' },
            { subTaskId: 'lead_5_2', subTaskName: 'Create Calendar Appointment in AL' }
          ]
        }
      }
    ];

    // Define prospect steps based on insurance status
    const prospectSteps = isInsuranceClaim ? [
      // 🟧 PROSPECT PHASE (5 steps) - Insurance Claim
      {
        stepId: 'prospect_1',
        stepName: 'Site Inspection',
        description: 'Conduct comprehensive site inspection',
        phase: 'PROSPECT',
        defaultResponsible: 'PROJECT_MANAGER',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['lead_5'],
        subTasks: {
          create: [
            { subTaskId: 'prospect_1_1', subTaskName: 'Take site photos' },
            { subTaskId: 'prospect_1_2', subTaskName: 'Complete inspection form' },
            { subTaskId: 'prospect_1_3', subTaskName: 'Document material colors' },
            { subTaskId: 'prospect_1_4', subTaskName: 'Capture Hover photos' },
            { subTaskId: 'prospect_1_5', subTaskName: 'Present upgrade options' }
          ]
        }
      },
      {
        stepId: 'prospect_2',
        stepName: 'Write Estimate',
        description: 'Prepare detailed project estimate',
        phase: 'PROSPECT',
        defaultResponsible: 'PROJECT_MANAGER',
        estimatedDuration: 2,
        alertPriority: 'MEDIUM',
        dependencies: ['prospect_1'],
        subTasks: {
          create: [
            { subTaskId: 'prospect_2_1', subTaskName: 'Fill out Estimate Form' },
            { subTaskId: 'prospect_2_2', subTaskName: 'Write initial estimate – AccuLynx' },
            { subTaskId: 'prospect_2_3', subTaskName: 'Write Customer Pay Estimates' },
            { subTaskId: 'prospect_2_4', subTaskName: 'Send for Approval' }
          ]
        }
      },
      {
        stepId: 'prospect_3',
        stepName: 'Insurance Process',
        description: 'Process insurance estimates and supplements',
        phase: 'PROSPECT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 2,
        alertPriority: 'MEDIUM',
        dependencies: ['prospect_2'],
        subTasks: {
          create: [
            { subTaskId: 'prospect_3_1', subTaskName: 'Compare field vs insurance estimates' },
            { subTaskId: 'prospect_3_2', subTaskName: 'Identify supplemental items' },
            { subTaskId: 'prospect_3_3', subTaskName: 'Draft estimate in Xactimate' }
          ]
        }
      },
      {
        stepId: 'prospect_4',
        stepName: 'Agreement Preparation',
        description: 'Prepare customer agreement and estimates',
        phase: 'PROSPECT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['prospect_3'],
        subTasks: {
          create: [
            { subTaskId: 'prospect_4_1', subTaskName: 'Trade cost analysis' },
            { subTaskId: 'prospect_4_2', subTaskName: 'Prepare Estimate Forms' },
            { subTaskId: 'prospect_4_3', subTaskName: 'Match AL estimates' },
            { subTaskId: 'prospect_4_4', subTaskName: 'Calculate customer pay items' },
            { subTaskId: 'prospect_4_5', subTaskName: 'Send shingle/class4 email – PDF' }
          ]
        }
      },
      {
        stepId: 'prospect_5',
        stepName: 'Agreement Signing',
        description: 'Process agreement signing and deposits',
        phase: 'PROSPECT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['prospect_4'],
        subTasks: {
          create: [
            { subTaskId: 'prospect_5_1', subTaskName: 'Review and send signature request' },
            { subTaskId: 'prospect_5_2', subTaskName: 'Record in QuickBooks' },
            { subTaskId: 'prospect_5_3', subTaskName: 'Process deposit' },
            { subTaskId: 'prospect_5_4', subTaskName: 'Collect signed disclaimers' }
          ]
        }
      }
    ] : [
      // 🟪 PROSPECT NON-INSURANCE PHASE (2 steps) - Non-Insurance
      {
        stepId: 'prospect_non_insurance_1',
        stepName: 'Write Estimate',
        description: 'Write estimate for non-insurance projects',
        phase: 'PROSPECT_NON_INSURANCE',
        defaultResponsible: 'PROJECT_MANAGER',
        estimatedDuration: 2,
        alertPriority: 'MEDIUM',
        dependencies: ['lead_5'],
        subTasks: {
          create: [
            { subTaskId: 'prospect_non_insurance_1_1', subTaskName: 'Fill out Estimate Forms' },
            { subTaskId: 'prospect_non_insurance_1_2', subTaskName: 'Write initial estimate in AL and send customer for approval' },
            { subTaskId: 'prospect_non_insurance_1_3', subTaskName: 'Follow up with customer for approval' },
            { subTaskId: 'prospect_non_insurance_1_4', subTaskName: 'Let Office know the agreement is ready to sign' }
          ]
        }
      },
      {
        stepId: 'prospect_non_insurance_2',
        stepName: 'Agreement Signing',
        description: 'Process agreement signing for non-insurance projects',
        phase: 'PROSPECT_NON_INSURANCE',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['prospect_non_insurance_1'],
        subTasks: {
          create: [
            { subTaskId: 'prospect_non_insurance_2_1', subTaskName: 'Review agreement with customer and send a signature request' },
            { subTaskId: 'prospect_non_insurance_2_2', subTaskName: 'Record in QuickBooks' },
            { subTaskId: 'prospect_non_insurance_2_3', subTaskName: 'Process deposit' },
            { subTaskId: 'prospect_non_insurance_2_4', subTaskName: 'Send and collect signatures for any applicable disclaimers' }
          ]
        }
      }
    ];

    // Define the remaining steps
    const remainingSteps = [
      // 🟩 APPROVED PHASE (3 steps)
      {
        stepId: 'approved_1',
        stepName: 'Administrative Setup',
        description: 'Setup administrative requirements for project',
        phase: 'APPROVED',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: isInsuranceClaim ? ['prospect_5'] : ['prospect_non_insurance_2'], // Conditional dependency
        subTasks: {
          create: [
            { subTaskId: 'approved_1_1', subTaskName: 'Confirm shingle choice' },
            { subTaskId: 'approved_1_2', subTaskName: 'Order materials' },
            { subTaskId: 'approved_1_3', subTaskName: 'Create labor orders' },
            { subTaskId: 'approved_1_4', subTaskName: 'Send labor order to roofing crew' }
          ]
        }
      },
      {
        stepId: 'approved_2',
        stepName: 'Pre-Job Actions',
        description: 'Complete pre-job requirements',
        phase: 'APPROVED',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['approved_1'],
        subTasks: {
          create: [
            { subTaskId: 'approved_2_1', subTaskName: 'Pull permits' }
          ]
        }
      },
      {
        stepId: 'approved_3',
        stepName: 'Prepare for Production',
        description: 'Final production preparation and coordination',
        phase: 'APPROVED',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 2,
        alertPriority: 'MEDIUM',
        dependencies: ['approved_2'],
        subTasks: {
          create: [
            { subTaskId: 'approved_3_1', subTaskName: 'All pictures in Job (Gutter, Ventilation, Elevation)' },
            { subTaskId: 'approved_3_2', subTaskName: 'Verify Labor Order in Scheduler - Correct Dates' },
            { subTaskId: 'approved_3_3', subTaskName: 'Verify Labor Order in Scheduler - Correct crew' },
            { subTaskId: 'approved_3_4', subTaskName: 'Send install schedule email to customer' },
            { subTaskId: 'approved_3_5', subTaskName: 'Verify Material Orders - Confirmations from supplier' },
            { subTaskId: 'approved_3_6', subTaskName: 'Verify Material Orders - Call if no confirmation' },
            { subTaskId: 'approved_3_7', subTaskName: 'Provide special crew instructions' },
            { subTaskId: 'approved_3_8', subTaskName: 'Subcontractor Work - Work order in scheduler' },
            { subTaskId: 'approved_3_9', subTaskName: 'Subcontractor Work - Schedule subcontractor' },
            { subTaskId: 'approved_3_10', subTaskName: 'Subcontractor Work - Communicate with customer' }
          ]
        }
      },

      // 🔧 EXECUTION PHASE (5 steps)
      {
        stepId: 'execution_1',
        stepName: 'Installation',
        description: 'Field installation and documentation',
        phase: 'EXECUTION',
        defaultResponsible: 'FIELD_DIRECTOR',
        estimatedDuration: 5,
        alertPriority: 'MEDIUM',
        dependencies: ['approved_3'],
        subTasks: {
          create: [
            { subTaskId: 'execution_1_1', subTaskName: 'Document work start' },
            { subTaskId: 'execution_1_2', subTaskName: 'Capture progress photos' },
            { subTaskId: 'execution_1_3', subTaskName: 'Daily Job Progress Note - Work started/finished' },
            { subTaskId: 'execution_1_4', subTaskName: 'Daily Job Progress Note - Days and people needed' },
            { subTaskId: 'execution_1_5', subTaskName: 'Daily Job Progress Note - Format: 2 Guys for 4 hours' },
            { subTaskId: 'execution_1_6', subTaskName: 'Upload Pictures' }
          ]
        }
      },
      {
        stepId: 'execution_2',
        stepName: 'Quality Check',
        description: 'Quality inspection and documentation',
        phase: 'EXECUTION',
        defaultResponsible: 'ROOF_SUPERVISOR',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['execution_1'],
        subTasks: {
          create: [
            { subTaskId: 'execution_2_1', subTaskName: 'Completion photos – Roof Supervisor' },
            { subTaskId: 'execution_2_2', subTaskName: 'Complete inspection – Roof Supervisor' },
            { subTaskId: 'execution_2_3', subTaskName: 'Upload Roof Packet' },
            { subTaskId: 'execution_2_4', subTaskName: 'Verify Packet is complete – Admin' }
          ]
        }
      },
      {
        stepId: 'execution_3',
        stepName: 'Multiple Trades',
        description: 'Coordinate multiple trade work',
        phase: 'EXECUTION',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['execution_2'],
        subTasks: {
          create: [
            { subTaskId: 'execution_3_1', subTaskName: 'Confirm start date' },
            { subTaskId: 'execution_3_2', subTaskName: 'Confirm material/labor for all trades' }
          ]
        }
      },
      {
        stepId: 'execution_4',
        stepName: 'Subcontractor Work',
        description: 'Manage subcontractor coordination',
        phase: 'EXECUTION',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['execution_3'],
        subTasks: {
          create: [
            { subTaskId: 'execution_4_1', subTaskName: 'Confirm dates' },
            { subTaskId: 'execution_4_2', subTaskName: 'Communicate with customer' }
          ]
        }
      },
      {
        stepId: 'execution_5',
        stepName: 'Update Customer',
        description: 'Customer completion notification and payment',
        phase: 'EXECUTION',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['execution_4'],
        subTasks: {
          create: [
            { subTaskId: 'execution_5_1', subTaskName: 'Notify of completion' },
            { subTaskId: 'execution_5_2', subTaskName: 'Share photos' },
            { subTaskId: 'execution_5_3', subTaskName: 'Send 2nd half payment link' }
          ]
        }
      },

      // 🌀 2ND SUPPLEMENT PHASE (4 steps)
      {
        stepId: 'supplement_1',
        stepName: 'Create Supp in Xactimate',
        description: 'Create supplement in Xactimate system',
        phase: 'SUPPLEMENT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 2,
        alertPriority: 'MEDIUM',
        dependencies: ['execution_5'],
        subTasks: {
          create: [
            { subTaskId: 'supplement_1_1', subTaskName: 'Check Roof Packet & Checklist' },
            { subTaskId: 'supplement_1_2', subTaskName: 'Label photos' },
            { subTaskId: 'supplement_1_3', subTaskName: 'Add to Xactimate' },
            { subTaskId: 'supplement_1_4', subTaskName: 'Submit to insurance' }
          ]
        }
      },
      {
        stepId: 'supplement_2',
        stepName: 'Follow-Up Calls',
        description: 'Insurance follow-up calls',
        phase: 'SUPPLEMENT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 7,
        alertPriority: 'MEDIUM',
        dependencies: ['supplement_1'],
        subTasks: {
          create: [
            { subTaskId: 'supplement_2_1', subTaskName: 'Call 2x/week until updated estimate' }
          ]
        }
      },
      {
        stepId: 'supplement_3',
        stepName: 'Review Approved Supp',
        description: 'Review and process approved supplement',
        phase: 'SUPPLEMENT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['supplement_2'],
        subTasks: {
          create: [
            { subTaskId: 'supplement_3_1', subTaskName: 'Update trade cost' },
            { subTaskId: 'supplement_3_2', subTaskName: 'Prepare counter-supp or email' },
            { subTaskId: 'supplement_3_3', subTaskName: 'Add to AL Estimate' }
          ]
        }
      },
      {
        stepId: 'supplement_4',
        stepName: 'Customer Update',
        description: 'Update customer on supplement status',
        phase: 'SUPPLEMENT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['supplement_3'],
        subTasks: {
          create: [
            { subTaskId: 'supplement_4_1', subTaskName: 'Share 2 items minimum' },
            { subTaskId: 'supplement_4_2', subTaskName: 'Let them know next steps' }
          ]
        }
      },

      // 🏁 COMPLETION PHASE (2 steps)
      {
        stepId: 'completion_1',
        stepName: 'Financial Processing',
        description: 'Process final financial items',
        phase: 'COMPLETION',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 2,
        alertPriority: 'MEDIUM',
        dependencies: ['supplement_4'],
        subTasks: {
          create: [
            { subTaskId: 'completion_1_1', subTaskName: 'Verify worksheet' },
            { subTaskId: 'completion_1_2', subTaskName: 'Final invoice & payment link' },
            { subTaskId: 'completion_1_3', subTaskName: 'AR follow-up calls' }
          ]
        }
      },
      {
        stepId: 'completion_2',
        stepName: 'Project Closeout',
        description: 'Final project closeout and documentation',
        phase: 'COMPLETION',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['completion_1'],
        subTasks: {
          create: [
            { subTaskId: 'completion_2_1', subTaskName: 'Final project documentation' },
            { subTaskId: 'completion_2_2', subTaskName: 'Warranty information' },
            { subTaskId: 'completion_2_3', subTaskName: 'Customer satisfaction survey' }
          ]
        }
      }
    ];

    // Return combined steps array
    return [...leadSteps, ...prospectSteps, ...remainingSteps];
  }
        alertPriority: 'MEDIUM',
        dependencies: ['execution_4'],
        subTasks: {
          create: [
            { subTaskId: 'execution_5_1', subTaskName: 'Notify of completion' },
            { subTaskId: 'execution_5_2', subTaskName: 'Share photos' },
            { subTaskId: 'execution_5_3', subTaskName: 'Send 2nd half payment link' }
          ]
        }
      },

      // 🌀 2ND SUPPLEMENT PHASE (4 steps)
      {
        stepId: 'supplement_1',
        stepName: 'Create Supp in Xactimate',
        description: 'Create supplement in Xactimate system',
        phase: 'SUPPLEMENT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 2,
        alertPriority: 'MEDIUM',
        dependencies: ['execution_5'],
        subTasks: {
          create: [
            { subTaskId: 'supplement_1_1', subTaskName: 'Check Roof Packet & Checklist' },
            { subTaskId: 'supplement_1_2', subTaskName: 'Label photos' },
            { subTaskId: 'supplement_1_3', subTaskName: 'Add to Xactimate' },
            { subTaskId: 'supplement_1_4', subTaskName: 'Submit to insurance' }
          ]
        }
      },
      {
        stepId: 'supplement_2',
        stepName: 'Follow-Up Calls',
        description: 'Insurance follow-up calls',
        phase: 'SUPPLEMENT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 7,
        alertPriority: 'MEDIUM',
        dependencies: ['supplement_1'],
        subTasks: {
          create: [
            { subTaskId: 'supplement_2_1', subTaskName: 'Call 2x/week until updated estimate' }
          ]
        }
      },
      {
        stepId: 'supplement_3',
        stepName: 'Review Approved Supp',
        description: 'Review and process approved supplement',
        phase: 'SUPPLEMENT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['supplement_2'],
        subTasks: {
          create: [
            { subTaskId: 'supplement_3_1', subTaskName: 'Update trade cost' },
            { subTaskId: 'supplement_3_2', subTaskName: 'Prepare counter-supp or email' },
            { subTaskId: 'supplement_3_3', subTaskName: 'Add to AL Estimate' }
          ]
        }
      },
      {
        stepId: 'supplement_4',
        stepName: 'Customer Update',
        description: 'Update customer on supplement status',
        phase: 'SUPPLEMENT',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['supplement_3'],
        subTasks: {
          create: [
            { subTaskId: 'supplement_4_1', subTaskName: 'Share 2 items minimum' },
            { subTaskId: 'supplement_4_2', subTaskName: 'Let them know next steps' }
          ]
        }
      },

      // 🏁 COMPLETION PHASE (2 steps)
      {
        stepId: 'completion_1',
        stepName: 'Financial Processing',
        description: 'Process final financial items',
        phase: 'COMPLETION',
        defaultResponsible: 'ADMINISTRATION',
        estimatedDuration: 2,
        alertPriority: 'MEDIUM',
        dependencies: ['supplement_4'],
        subTasks: {
          create: [
            { subTaskId: 'completion_1_1', subTaskName: 'Verify worksheet' },
            { subTaskId: 'completion_1_2', subTaskName: 'Final invoice & payment link' },
            { subTaskId: 'completion_1_3', subTaskName: 'AR follow-up calls' }
          ]
        }
      },
      {
        stepId: 'completion_2',
        stepName: 'Project Closeout',
        description: 'Complete project closeout procedures',
        phase: 'COMPLETION',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        alertPriority: 'MEDIUM',
        dependencies: ['completion_1'],
        subTasks: {
          create: [
            { subTaskId: 'completion_2_1', subTaskName: 'Register warranty' },
            { subTaskId: 'completion_2_2', subTaskName: 'Send documentation' },
            { subTaskId: 'completion_2_3', subTaskName: 'Submit insurance paperwork' },
            { subTaskId: 'completion_2_4', subTaskName: 'Send final receipt and close job' }
          ]
        }
      }
    ];
  }

  // Get all projects with basic information
  async getAllProjects(filters = {}) {
    try {
      const where = {};
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.projectManagerId) {
        where.projectManagerId = filters.projectManagerId;
      }
      
      if (filters.archived !== undefined) {
        where.archived = filters.archived;
      }

      const projects = await prisma.project.findMany({
        where,
        include: {
          customer: {
            select: { id: true, primaryName: true, primaryEmail: true, primaryPhone: true, address: true }
          },
          projectManager: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          workflow: {
            select: { overallProgress: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  // Delete project and all related data
  async deleteProject(projectId) {
    try {
      // Prisma will handle cascade deletes based on schema configuration
      await prisma.project.delete({
        where: { id: projectId }
      });

      return { success: true, message: 'Project deleted successfully' };
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
}

module.exports = new ProjectService(); 