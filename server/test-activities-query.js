const { prisma } = require('./config/prisma');

async function testActivitiesQuery() {
  try {
    console.log('🔍 Testing activities query...');
    
    // Simulate the exact query from activities route
    const where = {};
    const orderBy = { createdAt: 'desc' };
    const skip = 0;
    const limitNum = 50;
    
    console.log('🔍 Query parameters:', { where, orderBy, skip, limitNum });
    
    const [messages, total] = await Promise.all([
      prisma.projectMessage.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          project: {
            select: {
              id: true,
              projectName: true,
              projectNumber: true
            }
          }
        }
      }),
      prisma.projectMessage.count({ where })
    ]);
    
    console.log(`✅ Query successful! Found ${messages.length} messages, total: ${total}`);
    
    messages.forEach(msg => {
      console.log(`📝 Message: "${msg.subject}" by ${msg.authorName} - Project: ${msg.project?.projectName || msg.projectNumber}`);
    });
    
  } catch (error) {
    console.error('❌ Error in activities query:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testActivitiesQuery();