const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addWorkflowStepsToProjects() {
  try {
    console.log('🔧 Adding workflow steps to existing projects...');

    // Get all projects that don't have workflows
    const projects = await prisma.project.findMany({
      include: {
        workflow: {
          include: {
            steps: true
          }
        }
      }
    });

    console.log(`Found ${projects.length} projects`);

    for (const project of projects) {
      console.log(`Processing project: ${project.projectName} (${project.id})`);

      // Create workflow if it doesn't exist
      let workflow = project.workflow;
      if (!workflow) {
        console.log(`Creating workflow for project: ${project.projectName}`);
        workflow = await prisma.projectWorkflow.create({
          data: {
            projectId: project.id,
            workflowType: 'ROOFING',
            status: 'IN_PROGRESS',
            currentStepIndex: 0,
            overallProgress: 0,
            enableAlerts: true,
            alertMethods: ['IN_APP', 'EMAIL'],
            escalationEnabled: true,
            escalationDelayDays: 2
          }
        });
      }

      // Check if workflow already has steps
      if (workflow.steps && workflow.steps.length > 0) {
        console.log(`Workflow already has ${workflow.steps.length} steps, skipping...`);
        continue;
      }

      // Create workflow steps based on project type and insurance status
      const isInsuranceClaim = project.isInsuranceClaim !== false; // Default to true
      const steps = getDefaultWorkflowSteps(isInsuranceClaim);

      console.log(`Creating ${steps.length} workflow steps for project: ${project.projectName}`);

      for (const stepData of steps) {
        const step = await prisma.workflowStep.create({
          data: {
            ...stepData,
            workflowId: workflow.id
          }
        });

        // Create subtasks for each step
        if (stepData.subTasks && stepData.subTasks.create) {
          for (const subtaskData of stepData.subTasks.create) {
            await prisma.workflowSubTask.create({
              data: {
                ...subtaskData,
                stepId: step.id
              }
            });
          }
        }
      }

      // Update workflow progress
      await updateWorkflowProgress(workflow.id);

      console.log(`✅ Completed workflow setup for project: ${project.projectName}`);
    }

    console.log('🎉 Successfully added workflow steps to all projects!');
  } catch (error) {
    console.error('❌ Error adding workflow steps:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getDefaultWorkflowSteps(isInsuranceClaim = true) {
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
      description: 'Prepare and review project agreement',
      phase: 'PROSPECT',
      defaultResponsible: 'ADMINISTRATION',
      estimatedDuration: 1,
      alertPriority: 'MEDIUM',
      dependencies: ['prospect_3'],
      subTasks: {
        create: [
          { subTaskId: 'prospect_4_1', subTaskName: 'Review agreement terms' },
          { subTaskId: 'prospect_4_2', subTaskName: 'Prepare customer documents' }
        ]
      }
    },
    {
      stepId: 'prospect_5',
      stepName: 'Agreement Signing',
      description: 'Process agreement signing and documentation',
      phase: 'PROSPECT',
      defaultResponsible: 'ADMINISTRATION',
      estimatedDuration: 1,
      alertPriority: 'MEDIUM',
      dependencies: ['prospect_4'],
      subTasks: {
        create: [
          { subTaskId: 'prospect_5_1', subTaskName: 'Review agreement with customer and send a signature request' },
          { subTaskId: 'prospect_5_2', subTaskName: 'Record in QuickBooks' },
          { subTaskId: 'prospect_5_3', subTaskName: 'Process deposit' },
          { subTaskId: 'prospect_5_4', subTaskName: 'Send and collect signatures for any applicable disclaimers' }
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
      description: 'Final preparation before work begins',
      phase: 'APPROVED',
      defaultResponsible: 'PROJECT_MANAGER',
      estimatedDuration: 1,
      alertPriority: 'MEDIUM',
      dependencies: ['approved_2'],
      subTasks: {
        create: [
          { subTaskId: 'approved_3_1', subTaskName: 'Schedule start date' },
          { subTaskId: 'approved_3_2', subTaskName: 'Notify customer of start date' }
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

    // 🌀 SUPPLEMENT PHASE (4 steps)
    {
      stepId: 'supplement_1',
      stepName: 'Create Supp in Xactimate',
      description: 'Create supplemental estimate in Xactimate',
      phase: 'SUPPLEMENT',
      defaultResponsible: 'ADMINISTRATION',
      estimatedDuration: 2,
      alertPriority: 'MEDIUM',
      dependencies: ['execution_2'],
      subTasks: {
        create: [
          { subTaskId: 'supplement_1_1', subTaskName: 'Check Roof Packet & Checklist' },
          { subTaskId: 'supplement_1_2', subTaskName: 'Create supplemental estimate' }
        ]
      }
    },
    {
      stepId: 'supplement_2',
      stepName: 'Follow-Up Calls',
      description: 'Follow up with insurance and customer',
      phase: 'SUPPLEMENT',
      defaultResponsible: 'ADMINISTRATION',
      estimatedDuration: 1,
      alertPriority: 'MEDIUM',
      dependencies: ['supplement_1'],
      subTasks: {
        create: [
          { subTaskId: 'supplement_2_1', subTaskName: 'Call insurance adjuster' },
          { subTaskId: 'supplement_2_2', subTaskName: 'Follow up with customer' }
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
          { subTaskId: 'supplement_3_1', subTaskName: 'Review approved supplement' },
          { subTaskId: 'supplement_3_2', subTaskName: 'Update project documentation' }
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

async function updateWorkflowProgress(workflowId) {
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

    // Calculate progress using the weighted system
    const { PHASES, WORKFLOW_STEPS } = require('../data/constants');
    
    let totalWeight = 0;
    let completedWeight = 0;

    // Process each phase
    Object.keys(PHASES).forEach(phaseKey => {
      const phase = PHASES[phaseKey];
      const phaseSteps = WORKFLOW_STEPS[phaseKey] || [];
      
      let phaseWeight = 0;
      let phaseCompletedWeight = 0;

      // Process each step in the phase
      phaseSteps.forEach(stepDef => {
        const step = workflow.steps.find(s => s.stepId === stepDef.id);
        const stepWeight = stepDef.weight;
        
        // Check if step is conditional and should be included
        const shouldIncludeStep = !stepDef.conditional || shouldIncludeConditionalStep(stepDef, project);
        
        if (shouldIncludeStep) {
          phaseWeight += stepWeight;
          
          if (step && step.isCompleted) {
            phaseCompletedWeight += stepWeight;
          }
        }
      });

      totalWeight += phaseWeight;
      completedWeight += phaseCompletedWeight;
    });

    // Calculate overall progress
    const overallProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

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

    console.log(`Updated workflow progress: ${completedWeight}/${totalWeight} = ${overallProgress}%`);
    
  } catch (error) {
    console.error('Error updating workflow progress:', error);
  }
}

function shouldIncludeConditionalStep(stepDef, project) {
  // Logic for conditional steps based on step ID
  // Note: Most steps in the current database are not conditional
  switch (stepDef.id) {
    case 'supplement_1': // Create Supp in Xactimate
      return project.projectType && ['ROOF_REPLACEMENT', 'FULL_EXTERIOR'].includes(project.projectType);
    
    case 'supplement_2': // Follow-Up Calls
      return project.projectType && ['ROOF_REPLACEMENT', 'FULL_EXTERIOR', 'KITCHEN_REMODEL'].includes(project.projectType);
    
    case 'supplement_3': // Review Approved Supp
      return project.projectType && ['FULL_EXTERIOR', 'KITCHEN_REMODEL'].includes(project.projectType);
    
    case 'supplement_4': // Customer Update
      return project.projectType && ['FULL_EXTERIOR', 'KITCHEN_REMODEL'].includes(project.projectType);
    
    default:
      return true;
  }
}

// Run the script
addWorkflowStepsToProjects(); 