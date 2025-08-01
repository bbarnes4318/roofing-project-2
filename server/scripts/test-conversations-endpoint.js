const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConversationsQuery() {
  try {
    console.log('Testing the exact query from the API endpoint...');
    
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    console.log(`Successfully retrieved ${conversations.length} conversations`);
    
    if (conversations.length > 0) {
      console.log('\nFirst conversation structure:');
      console.log('Title:', conversations[0].title);
      console.log('Messages count:', conversations[0].messages.length);
      
      if (conversations[0].messages.length > 0) {
        const firstMessage = conversations[0].messages[0];
        console.log('First message text:', firstMessage.text.substring(0, 100) + '...');
        console.log('Sender:', firstMessage.sender ? `${firstMessage.sender.firstName} ${firstMessage.sender.lastName}` : 'No sender');
      }
    }
    
  } catch (error) {
    console.error('Error testing conversations query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConversationsQuery();