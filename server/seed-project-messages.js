const { prisma } = require('./config/prisma');

async function seedProjectMessages() {
  try {
    console.log('🌱 Seeding ProjectMessage records...');
    
    // Get a few projects to attach messages to
    const projects = await prisma.project.findMany({
      take: 3,
      select: {
        id: true,
        projectName: true,
        projectNumber: true
      }
    });
    
    if (projects.length === 0) {
      console.log('❌ No projects found to attach messages to');
      return;
    }
    
    const davidChenId = 'cmeceqna60007qdkdllcz0jf5';
    
    // Create sample messages
    const messagesToCreate = [
      {
        content: 'Initial assessment completed. Ready to proceed with material planning.',
        subject: 'Assessment Complete',
        messageType: 'WORKFLOW_UPDATE',
        priority: 'MEDIUM',
        authorId: davidChenId,
        authorName: 'David Chen',
        authorRole: 'MANAGER',
        projectId: projects[0].id,
        projectNumber: projects[0].projectNumber,
        phase: 'LEAD',
        section: 'Initial Assessment',
        lineItem: 'Site Evaluation',
        isSystemGenerated: false,
        isWorkflowMessage: true
      },
      {
        content: 'Customer has approved the contract terms. Moving to scheduling phase.',
        subject: 'Contract Approved',
        messageType: 'PHASE_COMPLETION',
        priority: 'HIGH',
        authorId: davidChenId,
        authorName: 'David Chen',
        authorRole: 'MANAGER',
        projectId: projects[0].id,
        projectNumber: projects[0].projectNumber,
        phase: 'APPROVED',
        section: 'Contract & Permitting',
        lineItem: 'Contract Execution',
        isSystemGenerated: false,
        isWorkflowMessage: true
      }
    ];
    
    // Add messages for additional projects if available
    if (projects.length > 1) {
      messagesToCreate.push({
        content: 'Materials have been ordered and delivery is scheduled for next week.',
        subject: 'Materials Ordered',
        messageType: 'USER_MESSAGE',
        priority: 'MEDIUM',
        authorId: davidChenId,
        authorName: 'David Chen',
        authorRole: 'MANAGER',
        projectId: projects[1].id,
        projectNumber: projects[1].projectNumber,
        phase: 'EXECUTION',
        section: 'Material Management',
        lineItem: 'Material Ordering',
        isSystemGenerated: false,
        isWorkflowMessage: false
      });
    }
    
    // Create the messages
    for (const messageData of messagesToCreate) {
      const message = await prisma.projectMessage.create({
        data: messageData
      });
      console.log(`✅ Created message: "${message.subject}" for project ${message.projectNumber}`);
    }
    
    console.log(`🎉 Successfully created ${messagesToCreate.length} sample ProjectMessage records`);
    
  } catch (error) {
    console.error('❌ Error seeding ProjectMessage records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedProjectMessages();