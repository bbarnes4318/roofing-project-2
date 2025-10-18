const { prisma } = require('./config/prisma');

async function testFeedback() {
  try {
    console.log('Testing basic Prisma connection...');
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    console.log('Testing feedback query...');
    const feedback = await prisma.feedback.findMany({
      take: 1
    });
    console.log('✅ Feedback query works:', feedback.length, 'items found');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFeedback();
