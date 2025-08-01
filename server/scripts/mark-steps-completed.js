const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function markStepsCompleted() {
  try {
    console.log('✅ Marking some workflow steps as completed...');

    const workflows = await prisma.projectWorkflow.findMany({
      include: {
        steps: {
          orderBy: { stepId: 'asc' }
        }
      }
    });

    console.log(`Found ${workflows.length} workflows`);

    for (const workflow of workflows) {
      console.log(`\n📋 Processing workflow for project: ${workflow.projectId}`);
      
      // Mark some steps as completed to show progress
      const stepsToComplete = [
        'input_customer_info',
        'site_inspection',
        'write_estimate'
      ];

      for (const step of workflow.steps) {
        if (stepsToComplete.includes(step.stepId)) {
          if (!step.isCompleted) {
            console.log(`  ✅ Marking ${step.stepId} as completed`);
            await prisma.workflowStep.update({
              where: { id: step.id },
              data: {
                isCompleted: true,
                completedAt: new Date(),
                updatedAt: new Date()
              }
            });
          } else {
            console.log(`  ℹ️  ${step.stepId} already completed`);
          }
        }
      }

      // Update workflow progress
      await updateWorkflowProgress(workflow.id);
    }

    console.log('🎉 Successfully marked steps as completed!');
  } catch (error) {
    console.error('❌ Error marking steps completed:', error);
  } finally {
    await prisma.$disconnect();
  }
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
markStepsCompleted(); 