const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProjectPhases() {
  try {
    // Get all projects with their workflows
    const projects = await prisma.project.findMany({
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { stepId: 'asc' }
            }
          }
        }
      }
    });

    console.log('Found', projects.length, 'projects to update');

    for (const project of projects) {
      if (!project.workflow || !project.workflow.steps) continue;
      
      // Find the first incomplete step to determine phase
      const incompleteStep = project.workflow.steps.find(step => !step.isCompleted);
      const phase = incompleteStep ? incompleteStep.phase : 'COMPLETION';
      
      // Update project with phase
      await prisma.project.update({
        where: { id: project.id },
        data: { 
          phase: phase,
          status: phase === 'COMPLETION' ? 'COMPLETED' : 'IN_PROGRESS'
        }
      });
      
      console.log(`Updated project ${project.projectNumber}: phase = ${phase}`);
    }
    
    console.log('✅ All projects updated with phase data');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProjectPhases();