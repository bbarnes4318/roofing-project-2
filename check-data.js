const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    const users = await prisma.user.count();
    const projects = await prisma.project.count(); 
    const customers = await prisma.customer.count();
    const workflows = await prisma.projectWorkflow.count();
    const messages = await prisma.message.count();
    
    console.log('=== DATABASE STATUS ===');
    console.log('Users:', users);
    console.log('Projects:', projects);
    console.log('Customers:', customers);
    console.log('Workflows:', workflows);
    console.log('Messages:', messages);
    
    if (projects > 0) {
      const sampleProject = await prisma.project.findFirst({
        include: {
          customer: true,
          projectManager: true
        }
      });
      console.log('\n=== SAMPLE PROJECT ===');
      console.log('Project:', sampleProject?.projectName);
      console.log('Customer:', sampleProject?.customer?.primaryName);
      console.log('PM:', sampleProject?.projectManager?.firstName);
    }
    
  } catch (error) {
    console.error('Database Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();