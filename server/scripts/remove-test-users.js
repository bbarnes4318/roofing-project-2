require('dotenv').config();

const path = require('path');
const { prisma } = require('../config/prisma');

const targetUsers = [
  { firstName: 'Local', lastName: 'Test' },
  { firstName: 'Seed', lastName: 'User' },
  { firstName: 'Seed', lastName: 'User2' },
  { firstName: 'Seed', lastName: 'User3' },
  { firstName: 'Seed', lastName: 'User4' },
  { firstName: 'Seed', lastName: 'User5' },
  { firstName: 'Seed', lastName: 'User6' },
  { firstName: 'Seed', lastName: 'User7' },
  { firstName: 'Seed', lastName: 'User8' },
  { firstName: 'Seed', lastName: 'User9' },
  { firstName: 'Test', lastName: 'User' },
  { firstName: 'Test2', lastName: 'User2' }
];

async function removeUserById(tx, userId) {
  // Null-out optional FKs first, then delete required dependents, then the user
  await tx.workflowAlert.updateMany({ where: { assignedToId: userId }, data: { assignedToId: null } });
  await tx.workflowAlert.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await tx.project.updateMany({ where: { projectManagerId: userId }, data: { projectManagerId: null } });
  await tx.project.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await tx.projectMessage.updateMany({ where: { authorId: userId }, data: { authorId: null } });
  await tx.completedWorkflowItem.updateMany({ where: { completedById: userId }, data: { completedById: null } });
  await tx.securityEvent.updateMany({ where: { userId }, data: { userId: null } });
  await tx.securityEvent.updateMany({ where: { resolvedBy: userId }, data: { resolvedBy: null } });

  // Delete dependent rows with required FKs
  await tx.projectMessageRecipient.deleteMany({ where: { userId } });
  await tx.notification.deleteMany({ where: { recipientId: userId } });
  await tx.documentDownload.deleteMany({ where: { userId } });
  await tx.document.deleteMany({ where: { uploadedById: userId } });
  await tx.message.deleteMany({ where: { senderId: userId } });
  await tx.calendarEvent.deleteMany({ where: { organizerId: userId } });
  await tx.task.deleteMany({ where: { assignedToId: userId } });
  await tx.task.updateMany({ where: { createdById: userId }, data: { createdById: null } });
  await tx.projectTeamMember.deleteMany({ where: { userId } });
  await tx.roleAssignment.deleteMany({ where: { userId } });
  await tx.conversationParticipant.deleteMany({ where: { userId } });

  // Finally, delete the user
  await tx.user.delete({ where: { id: userId } });
}

async function main() {
  console.log('🔎 Searching for test/seed users to remove...');

  const usersToRemove = await prisma.user.findMany({
    where: {
      OR: targetUsers.map(({ firstName, lastName }) => ({
        AND: [
          { firstName: { equals: firstName, mode: 'insensitive' } },
          { lastName: { equals: lastName, mode: 'insensitive' } }
        ]
      }))
    },
    select: { id: true, firstName: true, lastName: true, email: true }
  });

  if (usersToRemove.length === 0) {
    console.log('✅ No matching users found. Nothing to remove.');
    return;
  }

  console.log(`🧹 Preparing to remove ${usersToRemove.length} user(s):`);
  for (const u of usersToRemove) {
    console.log(` - ${u.firstName} ${u.lastName} <${u.email}>`);
  }

  for (const user of usersToRemove) {
    try {
      console.log(`\n🚮 Removing user ${user.firstName} ${user.lastName} (${user.id})...`);
      await prisma.$transaction(async (tx) => {
        await removeUserById(tx, user.id);
      });
      console.log(`✅ Removed ${user.firstName} ${user.lastName}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${user.firstName} ${user.lastName}:`, error.message);
    }
  }

  console.log('\n🎉 Done removing specified users');
}

main()
  .catch((e) => {
    console.error('❌ Error during user removal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


