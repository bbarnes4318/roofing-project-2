const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listProjects() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        status: true
      },
      take: 10
    });

    console.log(`Found ${projects.length} projects:`);
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.projectName} (#${project.projectNumber}) - ${project.status}`);
      console.log(`   ID: ${project.id}`);
    });
    
  } catch (error) {
    console.error('Error listing projects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listProjects();