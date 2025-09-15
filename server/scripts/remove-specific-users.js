const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const usersToRemove = [
  'Seed User 10',
  'Seed User 1', 
  'Sarah Thompson',
  'Michael Chen',
  'Logan Price',
  'Jessica Martinez',
  'James Rodriguez',
  'Emily Davis',
  'David Wilson',
  'Daniel Miller',
  'Christopher Brown',
  'Amanda Garcia'
];

async function removeUsers() {
  try {
    console.log('🔍 Starting user removal process...');
    
    // First, let's see what users exist with these names
    const existingUsers = await prisma.user.findMany({
      where: {
        OR: usersToRemove.map(name => ({
          OR: [
            { firstName: { contains: name.split(' ')[0] }, lastName: { contains: name.split(' ')[1] || '' } },
            { firstName: { contains: name }, lastName: { contains: '' } }
          ]
        }))
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    console.log(`📋 Found ${existingUsers.length} users to remove:`);
    existingUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
    });

    if (existingUsers.length === 0) {
      console.log('✅ No users found with those names. Nothing to remove.');
      return;
    }

    // Get user IDs
    const userIds = existingUsers.map(user => user.id);

    // Delete related records first (to avoid foreign key constraints)
    console.log('🗑️  Deleting related records...');
    
    // Delete workflow alerts
    const deletedAlerts = await prisma.workflowAlert.deleteMany({
      where: {
        OR: [
          { assignedToId: { in: userIds } },
          { createdById: { in: userIds } }
        ]
      }
    });
    console.log(`  - Deleted ${deletedAlerts.count} workflow alerts`);

    // Delete project team members
    const deletedTeamMembers = await prisma.projectTeamMember.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`  - Deleted ${deletedTeamMembers.count} project team members`);

    // Delete tasks
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        OR: [
          { assignedToId: { in: userIds } },
          { createdById: { in: userIds } }
        ]
      }
    });
    console.log(`  - Deleted ${deletedTasks.count} tasks`);

    // Delete documents
    const deletedDocuments = await prisma.document.deleteMany({
      where: { uploadedById: { in: userIds } }
    });
    console.log(`  - Deleted ${deletedDocuments.count} documents`);

    // Delete company assets
    const deletedAssets = await prisma.companyAsset.deleteMany({
      where: { uploadedById: { in: userIds } }
    });
    console.log(`  - Deleted ${deletedAssets.count} company assets`);

    // Delete messages
    const deletedMessages = await prisma.message.deleteMany({
      where: { senderId: { in: userIds } }
    });
    console.log(`  - Deleted ${deletedMessages.count} messages`);

    // Delete calendar events
    const deletedEvents = await prisma.calendarEvent.deleteMany({
      where: { organizerId: { in: userIds } }
    });
    console.log(`  - Deleted ${deletedEvents.count} calendar events`);

    // Delete notifications
    const deletedNotifications = await prisma.notification.deleteMany({
      where: { recipientId: { in: userIds } }
    });
    console.log(`  - Deleted ${deletedNotifications.count} notifications`);

    // Delete workflow steps
    const deletedWorkflowSteps = await prisma.workflowStep.deleteMany({
      where: {
        OR: [
          { assignedToId: { in: userIds } },
          { completedById: { in: userIds } }
        ]
      }
    });
    console.log(`  - Deleted ${deletedWorkflowSteps.count} workflow steps`);

    // Finally, delete the users
    console.log('🗑️  Deleting users...');
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });

    console.log(`✅ Successfully removed ${deletedUsers.count} users and all their related data.`);
    
    // Show remaining users
    const remainingUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });
    
    console.log(`\n📊 Remaining users in database: ${remainingUsers.length}`);
    remainingUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
    });

  } catch (error) {
    console.error('❌ Error removing users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
console.log('🚀 Starting user removal script...');
removeUsers()
  .then(() => {
    console.log('✅ User removal completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ User removal failed:', error);
    process.exit(1);
  });
