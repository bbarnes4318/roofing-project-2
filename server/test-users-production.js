require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProductionUsers() {
  try {
    console.log('=== TESTING PRODUCTION DATABASE ===');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Count all users
    const totalUsers = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${totalUsers}`);
    
    // Count active users
    const activeUsers = await prisma.user.count({
      where: { isActive: true }
    });
    console.log(`✅ Active users: ${activeUsers}`);
    
    // Count inactive users
    const inactiveUsers = await prisma.user.count({
      where: { isActive: false }
    });
    console.log(`❌ Inactive users: ${inactiveUsers}`);
    
    // Get all users with details
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });
    
    console.log('\n=== ALL USERS IN DATABASE ===');
    users.forEach((u, i) => {
      console.log(`${i+1}. ${u.firstName} ${u.lastName} (${u.email})
   Role: ${u.role}
   Active: ${u.isActive ? '✅' : '❌'}
   ID: ${u.id}`);
    });
    
    // Check role assignments
    const roleAssignments = await prisma.roleAssignment.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            isActive: true
          }
        }
      }
    });
    
    console.log('\n=== CURRENT ROLE ASSIGNMENTS ===');
    if (roleAssignments.length === 0) {
      console.log('No role assignments found');
    } else {
      roleAssignments.forEach((ra, i) => {
        console.log(`${i+1}. ${ra.roleType} -> ${ra.user.firstName} ${ra.user.lastName} (Active: ${ra.user.isActive ? '✅' : '❌'})`);
      });
    }
    
    // Test the /api/roles/users endpoint logic
    console.log('\n=== SIMULATING API ENDPOINT QUERY ===');
    const apiUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      },
      where: {
        isActive: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });
    
    console.log(`API would return ${apiUsers.length} users`);
    
    // Check if we need to activate users
    if (activeUsers < totalUsers) {
      console.log('\n⚠️  WARNING: Some users are inactive!');
      console.log('Run the following to activate all users:');
      console.log('npm run activate-users');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testProductionUsers();