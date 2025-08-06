require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateAllUsers() {
  try {
    console.log('🔄 Activating all users in database...');
    
    // Update all users to be active
    const result = await prisma.user.updateMany({
      where: {
        isActive: false
      },
      data: {
        isActive: true
      }
    });
    
    console.log(`✅ Activated ${result.count} users`);
    
    // Verify all users are now active
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { isActive: true }
    });
    
    console.log(`\n📊 Total users: ${totalUsers}`);
    console.log(`✅ Active users: ${activeUsers}`);
    
    if (totalUsers === activeUsers) {
      console.log('🎉 All users are now active!');
    } else {
      console.log('⚠️  Some users are still inactive');
    }
    
    // List all users
    const users = await prisma.user.findMany({
      select: {
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
    
    console.log('\n=== ALL USERS ===');
    users.forEach((u, i) => {
      console.log(`${i+1}. ${u.firstName} ${u.lastName} - ${u.role} (Active: ${u.isActive ? '✅' : '❌'})`);
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

activateAllUsers();