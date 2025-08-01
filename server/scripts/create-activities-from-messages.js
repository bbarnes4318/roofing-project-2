const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createActivitiesFromMessages() {
  try {
    console.log('Creating activities data structure for dashboard...');

    // First, let's create a simple activities table if it doesn't exist
    // For now, we'll store activities as project notes since there's no Activity model

    // Get all conversations with messages
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          include: {
            sender: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Get last 5 messages per conversation
        }
      }
    });

    console.log(`Found ${conversations.length} conversations`);

    // Get all projects
    const projects = await prisma.project.findMany({
      include: {
        customer: true
      }
    });

    // Create a map of project numbers to projects
    const projectMap = {};
    projects.forEach(project => {
      projectMap[project.projectNumber] = project;
    });

    let activitiesCreated = 0;

    // For each conversation, extract project info and create activity-like data
    for (const conversation of conversations) {
      // Try to extract project number from conversation title
      const projectNumberMatch = conversation.title.match(/#(\d+)/);
      if (!projectNumberMatch) continue;

      const projectNumber = parseInt(projectNumberMatch[1]);
      const project = projectMap[projectNumber];
      
      if (!project) continue;

      // For each message in the conversation, append to project notes
      for (const message of conversation.messages) {
        // Extract subject from message text
        const subjectMatch = message.text.match(/\*\*(.+?)\*\*/);
        const subject = subjectMatch ? subjectMatch[1] : 'Project Update';
        const content = message.text.replace(/\*\*(.+?)\*\*\n\n/, '');

        // Create activity-like entry in project notes
        const activityEntry = `
[${message.createdAt.toISOString()}] - ${subject}
From: ${message.sender.firstName} ${message.sender.lastName}
${content}
---`;

        // Append to project notes
        const currentNotes = project.notes || '';
        const updatedNotes = currentNotes + '\n' + activityEntry;

        await prisma.project.update({
          where: { id: project.id },
          data: {
            notes: updatedNotes.slice(-2000) // Keep last 2000 characters
          }
        });

        activitiesCreated++;
      }
    }

    console.log(`Created ${activitiesCreated} activity entries in project notes`);

    // Now let's create a temporary solution for the dashboard
    // We'll create notification records that can be displayed as activities
    console.log('Creating notifications as activities for dashboard...');

    let notificationsCreated = 0;

    for (const conversation of conversations) {
      const projectNumberMatch = conversation.title.match(/#(\d+)/);
      if (!projectNumberMatch) continue;

      const projectNumber = parseInt(projectNumberMatch[1]);
      const project = projectMap[projectNumber];
      
      if (!project) continue;

      // Create notifications from recent messages
      for (const message of conversation.messages.slice(0, 3)) {
        const subjectMatch = message.text.match(/\*\*(.+?)\*\*/);
        const subject = subjectMatch ? subjectMatch[1] : 'Project Update';
        const content = message.text.replace(/\*\*(.+?)\*\*\n\n/, '').substring(0, 200);

        try {
          await prisma.notification.create({
            data: {
              recipientId: message.senderId,
              type: 'PROJECT_UPDATE',
              title: subject,
              message: content,
              isRead: true,
              metadata: {
                projectId: project.id,
                projectNumber: project.projectNumber,
                projectName: project.projectName,
                customerName: project.customer.primaryName,
                messageId: message.id,
                conversationId: conversation.id,
                subject: subject,
                timestamp: message.createdAt,
                author: `${message.sender.firstName} ${message.sender.lastName}`,
                avatar: message.sender.firstName.charAt(0),
                priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
              },
              createdAt: message.createdAt
            }
          });
          notificationsCreated++;
        } catch (error) {
          // Ignore duplicate errors
          if (!error.message.includes('Unique constraint')) {
            console.error('Error creating notification:', error.message);
          }
        }
      }
    }

    console.log(`Created ${notificationsCreated} notifications as activities`);
    console.log('Dashboard should now display project messages!');

  } catch (error) {
    console.error('Error creating activities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createActivitiesFromMessages();