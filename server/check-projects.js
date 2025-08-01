const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProjects() {
  try {
    console.log('Checking existing projects...');
    
    const projects = await prisma.project.findMany({
      include: {
        workflow: {
          include: {
            steps: true
          }
        }
      }
    });
    
    console.log(`Found ${projects.length} projects:`);
    
    projects.forEach(project => {
      console.log(`- Project ${project.projectNumber}: ${project.projectName}`);
      console.log(`  ID: ${project.id}`);
      console.log(`  Status: ${project.status}`);
      if (project.workflow) {
        console.log(`  Workflow: ${project.workflow.steps.length} steps`);
      } else {
        console.log(`  No workflow`);
      }
      console.log('');
    });
    
    return projects;
    
  } catch (error) {
    console.error('❌ Error checking projects:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();