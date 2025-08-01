const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkProductionData() {
  try {
    console.log('🔍 Checking production database...');
    
    const users = await prisma.user.count();
    const projects = await prisma.project.count();
    const customers = await prisma.customer.count();
    const workflows = await prisma.projectWorkflow.count();
    const messages = await prisma.message.count();
    
    console.log('=== PRODUCTION DATABASE STATUS ===');
    console.log('Users:', users);
    console.log('Projects:', projects);
    console.log('Customers:', customers);
    console.log('Workflows:', workflows);
    console.log('Messages:', messages);
    
    if (projects > 0) {
      console.log('\n=== SAMPLE PROJECTS ===');
      const sampleProjects = await prisma.project.findMany({
        take: 5,
        include: {
          customer: true,
          projectManager: true
        }
      });
      
      sampleProjects.forEach(project => {
        console.log(`- #${project.projectNumber}: ${project.customer?.primaryName} - ${project.projectName}`);
      });
    }
    
    if (messages > 0) {
      console.log('\n=== SAMPLE MESSAGES ===');
      const sampleMessages = await prisma.message.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
      });
      
      sampleMessages.forEach(msg => {
        console.log(`- ${msg.senderName}: ${msg.content}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking production database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionData();