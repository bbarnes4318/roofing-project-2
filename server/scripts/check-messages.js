const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMessages() {
  try {
    const conversationCount = await prisma.conversation.count();
    console.log('Total conversations:', conversationCount);
    
    const messageCount = await prisma.message.count();
    console.log('Total messages:', messageCount);
    
    if (conversationCount > 0) {
      const conversations = await prisma.conversation.findMany({
        take: 3,
        include: {
          messages: {
            take: 2,
            include: {
              sender: true
            }
          }
        }
      });
      
      console.log('\nSample conversations:');
      conversations.forEach((conv, i) => {
        console.log(`${i + 1}. ${conv.title} (${conv.messages.length} messages)`);
        conv.messages.forEach((msg, j) => {
          console.log(`   Message ${j + 1}: ${msg.text.substring(0, 50)}...`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error checking messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();