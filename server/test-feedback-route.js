const { prisma } = require('./config/prisma');

async function testFeedbackRoute() {
  try {
    console.log('Testing simplified feedback query...');
    
    // Test 1: Basic feedback query
    const basicFeedback = await prisma.feedback.findMany({
      take: 1
    });
    console.log('✅ Basic feedback query works:', basicFeedback.length, 'items');
    
    // Test 2: Feedback with author
    const feedbackWithAuthor = await prisma.feedback.findMany({
      take: 1,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    console.log('✅ Feedback with author works:', feedbackWithAuthor.length, 'items');
    
    // Test 3: Feedback with _count
    const feedbackWithCount = await prisma.feedback.findMany({
      take: 1,
      include: {
        _count: {
          select: {
            votes: true,
            comments: true
          }
        }
      }
    });
    console.log('✅ Feedback with _count works:', feedbackWithCount.length, 'items');
    
    // Test 4: Full query like in the route
    const fullFeedback = await prisma.feedback.findMany({
      take: 1,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true
          }
        },
        _count: {
          select: {
            votes: true,
            comments: true
          }
        },
        comments: {
          select: {
            isDeveloper: true
          }
        }
      }
    });
    console.log('✅ Full feedback query works:', fullFeedback.length, 'items');
    
  } catch (error) {
    console.error('❌ Error in feedback query:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFeedbackRoute();
