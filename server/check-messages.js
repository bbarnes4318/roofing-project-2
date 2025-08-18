const { prisma } = require('./config/prisma');

async function checkProjectMessages() {
  try {
    console.log('🔍 Checking project messages status...\n');
    
    // First, find David Chen user
    const davidChen = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'David', mode: 'insensitive' } },
          { lastName: { contains: 'Chen', mode: 'insensitive' } },
          { email: { contains: 'david', mode: 'insensitive' } }
        ]
      }
    });
    
    if (davidChen) {
      console.log(`✅ Found David Chen user:`);
      console.log(`   ID: ${davidChen.id}`);
      console.log(`   Name: ${davidChen.firstName} ${davidChen.lastName}`);
      console.log(`   Email: ${davidChen.email}`);
      console.log(`   Role: ${davidChen.role}`);
    } else {
      console.log('❌ David Chen user not found');
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Check ProjectMessage table
    console.log('\n📨 Checking ProjectMessage table...');
    const projectMessages = await prisma.projectMessage.findMany({
      include: {
        author: {
          select: { firstName: true, lastName: true, email: true }
        },
        project: {
          select: { projectNumber: true, projectName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Total ProjectMessages: ${projectMessages.length}`);
    
    if (projectMessages.length > 0) {
      console.log('\nRecent ProjectMessages:');
      projectMessages.forEach((msg, index) => {
        console.log(`${index + 1}. Project ${msg.project?.projectNumber}: "${msg.content?.substring(0, 50)}..."`);
        console.log(`   Author: ${msg.author?.firstName} ${msg.author?.lastName} (${msg.author?.email})`);
        console.log(`   Created: ${msg.createdAt}`);
        console.log('');
      });
    }
    
    // Check Message table (if it exists)
    console.log('\n📧 Checking Message table...');
    try {
      const messages = await prisma.message.findMany({
        include: {
          sender: {
            select: { firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      console.log(`Total Messages: ${messages.length}`);
      
      if (messages.length > 0) {
        console.log('\nRecent Messages:');
        messages.forEach((msg, index) => {
          console.log(`${index + 1}. "${msg.content?.substring(0, 50)}..."`);
          console.log(`   Sender: ${msg.sender?.firstName} ${msg.sender?.lastName} (${msg.sender?.email})`);
          console.log(`   Created: ${msg.createdAt}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('Message table may not exist or accessible:', error.message);
    }
    
    // If David Chen exists, check messages specifically for him
    if (davidChen) {
      console.log('\n' + '='.repeat(50));
      console.log(`\n🎯 Messages specifically for/from David Chen (${davidChen.id}):`);
      
      // ProjectMessages from David
      const davidProjectMessages = await prisma.projectMessage.findMany({
        where: { authorId: davidChen.id },
        include: {
          project: {
            select: { projectNumber: true, projectName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`David's ProjectMessages: ${davidProjectMessages.length}`);
      davidProjectMessages.forEach((msg, index) => {
        console.log(`${index + 1}. Project ${msg.project?.projectNumber}: "${msg.content?.substring(0, 50)}..."`);
        console.log(`   Created: ${msg.createdAt}`);
      });
      
      // Regular Messages from David
      try {
        const davidMessages = await prisma.message.findMany({
          where: { senderId: davidChen.id },
          orderBy: { createdAt: 'desc' }
        });
        
        console.log(`\nDavid's regular Messages: ${davidMessages.length}`);
        davidMessages.forEach((msg, index) => {
          console.log(`${index + 1}. "${msg.content?.substring(0, 50)}..."`);
          console.log(`   Created: ${msg.createdAt}`);
        });
      } catch (error) {
        console.log('Could not query Messages for David:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjectMessages();