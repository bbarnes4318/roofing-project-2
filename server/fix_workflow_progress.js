/**
 * Quick fix script to align workflow steps completion with project progress
 * This will mark steps as completed based on project progress percentage
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWorkflowProgress() {
  console.log('🔧 Starting workflow progress fix...');
  
  try {
    // Get all projects with workflow steps and progress > 0
    const projects = await prisma.project.findMany({
      where: {
        progress: { gt: 0 }
      },
      include: {
        workflow: {
          include: {
            steps: true
          }
        }
      }
    });

    console.log(`📊 Found ${projects.length} projects with progress > 0`);

    for (const project of projects) {
      if (!project.workflow || !project.workflow.steps || project.workflow.steps.length === 0) {
        console.log(`⏭️ Skipping project ${project.projectNumber} - no workflow steps`);
        continue;
      }

      const progress = project.progress || 0;
      const totalSteps = project.workflow.steps.length;
      const expectedCompletedSteps = Math.floor((progress / 100) * totalSteps);

      console.log(`\n🔍 Project ${project.projectNumber}: ${progress}% progress`);
      console.log(`   Total steps: ${totalSteps}, Expected completed: ${expectedCompletedSteps}`);

      // Sort steps by stepId to get consistent order
      const sortedSteps = project.workflow.steps.sort((a, b) => a.stepId.localeCompare(b.stepId));
      
      // Group steps by phase in workflow order
      const phaseOrder = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'];
      const stepsByPhase = {};
      
      sortedSteps.forEach(step => {
        const phase = step.phase?.toUpperCase() || 'LEAD';
        if (!stepsByPhase[phase]) stepsByPhase[phase] = [];
        stepsByPhase[phase].push(step);
      });

      // Determine which steps should be completed based on progress
      let stepsToComplete = [];
      let remainingCompletions = expectedCompletedSteps;

      for (const phase of phaseOrder) {
        const phaseSteps = stepsByPhase[phase] || [];
        if (remainingCompletions <= 0) break;
        
        const stepsToCompleteInPhase = Math.min(remainingCompletions, phaseSteps.length);
        stepsToComplete.push(...phaseSteps.slice(0, stepsToCompleteInPhase));
        remainingCompletions -= stepsToCompleteInPhase;
        
        console.log(`   Phase ${phase}: completing ${stepsToCompleteInPhase}/${phaseSteps.length} steps`);
      }

      // Update steps to completed
      const completionTime = new Date();
      for (const step of stepsToComplete) {
        if (!step.isCompleted) {
          await prisma.workflowStep.update({
            where: { id: step.id },
            data: {
              isCompleted: true,
              completedAt: completionTime
            }
          });
          console.log(`   ✅ Marked step as completed: ${step.stepId}`);
        }
      }

      console.log(`✅ Updated project ${project.projectNumber}: ${stepsToComplete.length} steps marked completed`);
    }

    console.log('\n🎉 Workflow progress fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing workflow progress:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixWorkflowProgress();
}

module.exports = { fixWorkflowProgress };