console.log('🚀 Starting simple user check...');

const { PrismaClient } = require('@prisma/client');

console.log('📦 Prisma client loaded');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

console.log('🔌 Prisma client created');

async function checkUsers() {
  try {
    console.log('🔍 Attempting to connect to database...');
    
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      });
      
      console.log('👥 Sample users:');
      users.forEach(user => {
        console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    console.log('🔌 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('✅ Disconnected');
  }
}

checkUsers();
