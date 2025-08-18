const { prisma } = require('./config/prisma');

async function testProjectMessages() {
  try {
    console.log('🔍 Testing ProjectMessage query...');
    
    // First check if table exists and count records
    const count = await prisma.projectMessage.count();
    console.log(`📊 Total ProjectMessage records: ${count}`);
    
    // Try to fetch a few records
    const messages = await prisma.projectMessage.findMany({
      take: 5,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        project: {
          select: {
            id: true,
            projectName: true,
            projectNumber: true
          }
        }
      }
    });
    
    console.log(`✅ Fetched ${messages.length} sample messages:`);
    messages.forEach(msg => {
      console.log(`  - ${msg.subject} (${msg.authorName}) - Project: ${msg.project?.projectName || msg.projectNumber}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing ProjectMessage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProjectMessages();