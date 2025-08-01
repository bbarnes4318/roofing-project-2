const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function addMessages() {
  try {
    console.log('📧 Adding messages to production database...');
    
    const officeUser = await prisma.user.findFirst({
      where: { email: 'office@company.com' }
    });
    
    const projects = await prisma.project.findMany({
      take: 10 // Get first 10 projects
    });

    const sampleMessages = [
      { content: 'Initial consultation completed successfully', subject: 'Consultation Complete' },
      { content: 'Insurance claim submitted to provider', subject: 'Insurance Claim' },
      { content: 'Materials ordered and scheduled for delivery', subject: 'Material Delivery' },
      { content: 'Installation crew assigned to project', subject: 'Crew Assignment' },
      { content: 'Quality inspection passed all requirements', subject: 'Quality Inspection' },
      { content: 'Customer walkthrough scheduled for next week', subject: 'Customer Communication' },
      { content: 'Project timeline updated based on weather conditions', subject: 'Project Update' },
      { content: 'Permit application submitted to city office', subject: 'Permitting' },
      { content: 'Site preparation completed ahead of schedule', subject: 'Site Preparation' },
      { content: 'Final cleanup and debris removal completed', subject: 'Project Completion' }
    ];

    let messageCount = 0;
    
    for (let i = 0; i < projects.length && i < sampleMessages.length; i++) {
      const project = projects[i];
      const messageData = sampleMessages[i];
      
      await prisma.message.create({
        data: {
          content: messageData.content,
          text: messageData.content, // Add the required text field
          type: 'PROJECT',
          projectId: project.id,
          senderId: officeUser.id,
          senderName: `${officeUser.firstName} ${officeUser.lastName}`,
          senderAvatar: '',
          priority: 'MEDIUM',
          projectName: project.projectName,
          subject: messageData.subject
        }
      });
      
      messageCount++;
      console.log(`✅ Added message for project #${project.projectNumber}`);
    }

    console.log(`🎉 Successfully added ${messageCount} messages to production database!`);
    
    // Final count
    const totalMessages = await prisma.message.count();
    console.log(`📊 Total messages in database: ${totalMessages}`);
    
  } catch (error) {
    console.error('❌ Error adding messages:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addMessages();