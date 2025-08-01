const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStepIds() {
  try {
    console.log('🔍 Checking step IDs in database...');

    const workflows = await prisma.projectWorkflow.findMany({
      include: {
        steps: {
          orderBy: { stepId: 'asc' }
        }
      }
    });

    console.log(`Found ${workflows.length} workflows`);

    for (const workflow of workflows) {
      console.log(`\n📋 Workflow for project: ${workflow.projectId}`);
      console.log(`Steps (${workflow.steps.length}):`);
      
      workflow.steps.forEach(step => {
        console.log(`  - ${step.stepId}: ${step.stepName} (${step.phase}) - Completed: ${step.isCompleted}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking step IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStepIds(); 