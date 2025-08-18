const { prisma } = require('./config/prisma');

async function debugMessages() {
  try {
    console.log('🔍 Debugging message recipients and current user...\n');
    
    // Find David Chen user
    const davidChen = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'David', mode: 'insensitive' } },
          { lastName: { contains: 'Chen', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`✅ Current user (David Chen): ${davidChen.id}`);
    console.log(`   Name: ${davidChen.firstName} ${davidChen.lastName}`);
    console.log(`   Email: ${davidChen.email}\n`);
    
    // Get all project messages and show their recipients
    const messages = await prisma.projectMessage.findMany({
      include: {
        author: { select: { firstName: true, lastName: true, email: true } },
        project: { select: { projectNumber: true, projectName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📨 Total ProjectMessages: ${messages.length}\n`);
    
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. Message ID: ${msg.id}`);
      console.log(`   Content: "${msg.content?.substring(0, 50)}..."`);
      console.log(`   Author: ${msg.author?.firstName} ${msg.author?.lastName}`);
      console.log(`   Project: ${msg.project?.projectNumber} - ${msg.project?.projectName}`);
      console.log(`   Recipients in readBy: ${JSON.stringify(msg.readBy)}`);
      console.log(`   AuthorId: ${msg.authorId}`);
      console.log(`   Created: ${msg.createdAt}`);
      console.log('');
    });
    
    // Show what frontend filtering expects
    console.log('🎯 Frontend filtering logic expects:');
    console.log(`   - currentUser.id: ${davidChen.id}`);
    console.log(`   - activity.recipients: Array containing user IDs or 'ALL'`);
    console.log(`   - Messages should be visible if logged-in user ID is in recipients array OR 'ALL' is in array`);
    
    console.log('\n🔧 The issue might be:');
    console.log('   1. ProjectMessage.readBy field might not be used as recipients');
    console.log('   2. Messages might not have proper recipients array set');
    console.log('   3. Frontend might be using wrong user ID format');
    
  } catch (error) {
    console.error('❌ Error debugging messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMessages();