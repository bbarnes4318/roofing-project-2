const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Database cleared - no seed data will be created');
  
  // Clear existing data (in correct order to avoid foreign key constraints)
  await prisma.workflowStepAttachment.deleteMany();
  await prisma.workflowSubTask.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.projectWorkflow.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.documentDownload.deleteMany();
  await prisma.document.deleteMany();
  await prisma.calendarEventAttendee.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.projectTeamMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ All data cleared successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error during clearing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
