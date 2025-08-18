const { prisma } = require('./config/prisma');

async function fixMessageRecipients() {
  try {
    console.log('🔧 Fixing project message recipients...\n');
    
    // Find David Chen user
    const davidChen = await prisma.user.findFirst({
      where: {
        firstName: { contains: 'David', mode: 'insensitive' },
        lastName: { contains: 'Chen', mode: 'insensitive' }
      }
    });
    
    console.log(`✅ Found David Chen: ${davidChen.id}\n`);
    
    // Get all ProjectMessages - we'll update them all to make sure they have proper recipients
    const emptyRecipientMessages = await prisma.projectMessage.findMany({
      where: {
        // Get all messages - we'll check and fix recipients for all of them
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
        project: { select: { projectNumber: true, projectName: true } }
      }
    });
    
    console.log(`📨 Found ${emptyRecipientMessages.length} messages to check\n`);
    
    // Fix each message by setting proper recipients
    for (const message of emptyRecipientMessages) {
      console.log(`Checking message: "${message.content?.substring(0, 40)}..."`);
      console.log(`  Project: ${message.project?.projectNumber}`);
      console.log(`  Author: ${message.author?.firstName} ${message.author?.lastName}`);
      console.log(`  Current readBy: ${JSON.stringify(message.readBy)}`);
      
      // Check if message already has recipients
      if (message.readBy && message.readBy.length > 0) {
        console.log(`  → Message already has recipients, skipping\n`);
        continue;
      }
      
      // Set recipients based on message context
      let recipients = [];
      
      // If David Chen is the author, add 'ALL' so everyone can see his messages
      // Also add David's ID so he can see his own messages
      if (message.authorId === davidChen.id) {
        recipients = ['ALL', davidChen.id];
        console.log(`  → David is author: Setting recipients to ['ALL', '${davidChen.id}']`);
      } else {
        // For messages from others, add David and ALL
        recipients = ['ALL', davidChen.id];
        console.log(`  → Other author: Setting recipients to ['ALL', '${davidChen.id}']`);
      }
      
      // Update the message
      await prisma.projectMessage.update({
        where: { id: message.id },
        data: { readBy: recipients }
      });
      
      console.log(`  ✅ Updated recipients\n`);
    }
    
    console.log(`\n✅ Fixed ${emptyRecipientMessages.length} messages with proper recipients`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const fixedMessages = await prisma.projectMessage.findMany({
      where: { authorId: davidChen.id },
      select: {
        id: true,
        content: true,
        readBy: true,
        project: { select: { projectNumber: true } }
      }
    });
    
    fixedMessages.forEach((msg, index) => {
      console.log(`${index + 1}. Project ${msg.project?.projectNumber}: Recipients = ${JSON.stringify(msg.readBy)}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing message recipients:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMessageRecipients();