const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('Creating test users...');
    
    // Hash a default password
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const testUsers = [
      {
        id: 'user-1',
        firstName: 'Sarah',
        lastName: 'Owner',
        email: 'sarah@company.com',
        password: hashedPassword,
        role: 'ADMIN',
        workflowAssignment: 'OFFICE',
        isActive: true
      },
      {
        id: 'user-2',
        firstName: 'John',
        lastName: 'Manager',
        email: 'john@company.com',
        password: hashedPassword,
        role: 'MANAGER',
        workflowAssignment: 'PROJECT_MANAGER',
        isActive: true
      },
      {
        id: 'user-3',
        firstName: 'Lisa',
        lastName: 'Admin',
        email: 'lisa@company.com',
        password: hashedPassword,
        role: 'ADMIN',
        workflowAssignment: 'ADMIN',
        isActive: true
      },
      {
        id: 'user-4',
        firstName: 'Mike',
        lastName: 'Crew',
        email: 'mike@company.com',
        password: hashedPassword,
        role: 'WORKER',
        workflowAssignment: 'FIELD_CREW',
        isActive: true
      },
      {
        id: 'user-5',
        firstName: 'Tom',
        lastName: 'Supervisor',
        email: 'tom@company.com',
        password: hashedPassword,
        role: 'FOREMAN',
        workflowAssignment: 'ROOF_SUPERVISOR',
        isActive: true
      },
      {
        id: 'user-6',
        firstName: 'Alex',
        lastName: 'Director',
        email: 'alex@company.com',
        password: hashedPassword,
        role: 'MANAGER',
        workflowAssignment: 'FIELD_DIRECTOR',
        isActive: true
      }
    ];

    for (const userData of testUsers) {
      try {
        await prisma.user.upsert({
          where: { id: userData.id },
          update: userData,
          create: userData
        });
        console.log(`✅ Created/updated user: ${userData.firstName} ${userData.lastName}`);
      } catch (error) {
        console.error(`❌ Error creating user ${userData.firstName}:`, error.message);
      }
    }

    console.log('✅ Test users created successfully!');
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();