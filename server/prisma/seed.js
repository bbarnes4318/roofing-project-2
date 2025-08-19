const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with essential data');
  
  // Clear existing data (in correct order to avoid foreign key constraints)
  await prisma.roleAssignment.deleteMany();
  await prisma.completedWorkflowItem.deleteMany();
  await prisma.projectWorkflowTracker.deleteMany();
  await prisma.workflowAlert.deleteMany();
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

  // Create essential users for role assignments
  console.log('👥 Creating essential users...');
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Owner',
        email: 'sarah.owner@kenstruction.com',
        password: 'hashedpassword', // In real app, this would be properly hashed
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Mike',
        lastName: 'Rodriguez',
        email: 'mike.rodriguez@kenstruction.com',
        password: 'hashedpassword',
        role: 'PROJECT_MANAGER',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Jennifer',
        lastName: 'Williams',
        email: 'jennifer.williams@kenstruction.com',
        password: 'hashedpassword',
        role: 'FOREMAN',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@kenstruction.com',
        password: 'hashedpassword',
        role: 'MANAGER',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Lisa',
        lastName: 'Johnson',
        email: 'lisa.johnson@kenstruction.com',
        password: 'hashedpassword',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Tom',
        lastName: 'Anderson',
        email: 'tom.anderson@kenstruction.com',
        password: 'hashedpassword',
        role: 'FOREMAN',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@kenstruction.com',
        password: 'hashedpassword',
        role: 'WORKER',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Robert',
        lastName: 'Smith',
        email: 'robert.smith@kenstruction.com',
        password: 'hashedpassword',
        role: 'PROJECT_MANAGER',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@kenstruction.com',
        password: 'hashedpassword',
        role: 'MANAGER',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'James',
        lastName: 'Wilson',
        email: 'james.wilson@kenstruction.com',
        password: 'hashedpassword',
        role: 'FOREMAN',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Patricia',
        lastName: 'Brown',
        email: 'patricia.brown@kenstruction.com',
        password: 'hashedpassword',
        role: 'WORKER',
        isActive: true,
        createdAt: new Date()
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Charles',
        lastName: 'Jones',
        email: 'charles.jones@kenstruction.com',
        password: 'hashedpassword',
        role: 'PROJECT_MANAGER',
        isActive: true,
        createdAt: new Date()
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users successfully`);

  // Create default role assignments
  console.log('🎯 Creating default role assignments...');
  
  const roleAssignments = await Promise.all([
    // Mike Rodriguez as default Project Manager
    prisma.roleAssignment.create({
      data: {
        roleType: 'PROJECT_MANAGER',
        userId: users.find(u => u.firstName === 'Mike').id,
        assignedAt: new Date(),
        assignedById: users.find(u => u.firstName === 'Sarah').id
      }
    }),
    // Tom Anderson as default Field Director
    prisma.roleAssignment.create({
      data: {
        roleType: 'FIELD_DIRECTOR',
        userId: users.find(u => u.firstName === 'Tom').id,
        assignedAt: new Date(),
        assignedById: users.find(u => u.firstName === 'Sarah').id
      }
    }),
    // Maria Garcia as default Office Staff
    prisma.roleAssignment.create({
      data: {
        roleType: 'OFFICE_STAFF',
        userId: users.find(u => u.firstName === 'Maria').id,
        assignedAt: new Date(),
        assignedById: users.find(u => u.firstName === 'Sarah').id
      }
    }),
    // Lisa Johnson as default Administration
    prisma.roleAssignment.create({
      data: {
        roleType: 'ADMINISTRATION',
        userId: users.find(u => u.firstName === 'Lisa').id,
        assignedAt: new Date(),
        assignedById: users.find(u => u.firstName === 'Sarah').id
      }
    })
  ]);

  console.log(`✅ Created ${roleAssignments.length} default role assignments`);
  console.log('🌱 Database seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error during clearing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
