const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    const projects = await prisma.project.findMany();
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length > 0) {
      console.log('First project:', projects[0].name || 'Unnamed');
    }
    
    // Test other tables
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    const messages = await prisma.message.findMany();
    console.log(`Found ${messages.length} messages`);
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
