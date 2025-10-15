const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedFeedbackSystem() {
  console.log('🌱 Seeding feedback system...');

  try {
    // Create badges
    const badges = [
      {
        code: 'FIRST_REPORT',
        name: 'First Report',
        description: 'Submitted your first feedback',
        icon: '🎯',
        category: 'ACHIEVEMENT',
        points: 10
      },
      {
        code: 'BUG_HUNTER',
        name: 'Bug Hunter',
        description: 'Reported 5 bugs',
        icon: '🐛',
        category: 'CONTRIBUTION',
        points: 25
      },
      {
        code: 'IDEA_GENERATOR',
        name: 'Idea Generator',
        description: 'Submitted 3 ideas',
        icon: '💡',
        category: 'CONTRIBUTION',
        points: 20
      },
      {
        code: 'IMPROVEMENT_MASTER',
        name: 'Improvement Master',
        description: 'Submitted 3 improvements',
        icon: '🔧',
        category: 'CONTRIBUTION',
        points: 20
      },
      {
        code: 'TOP_CONTRIBUTOR',
        name: 'Top Contributor',
        description: 'Top contributor this month',
        icon: '⭐',
        category: 'ACHIEVEMENT',
        points: 50
      },
      {
        code: 'STREAK_7',
        name: 'Week Warrior',
        description: '7-day activity streak',
        icon: '🔥',
        category: 'ACHIEVEMENT',
        points: 15
      },
      {
        code: 'STREAK_30',
        name: 'Month Master',
        description: '30-day activity streak',
        icon: '🏆',
        category: 'ACHIEVEMENT',
        points: 100
      },
      {
        code: 'HELPFUL_COMMENTER',
        name: 'Helpful Commenter',
        description: 'Received 10 upvotes on comments',
        icon: '💬',
        category: 'COLLABORATION',
        points: 30
      },
      {
        code: 'DEVELOPER_RESPONSE',
        name: 'Developer Response',
        description: 'Received a developer response',
        icon: '👨‍💻',
        category: 'COLLABORATION',
        points: 5
      },
      {
        code: 'ACCEPTED_FEEDBACK',
        name: 'Accepted Feedback',
        description: 'Your feedback was accepted',
        icon: '✅',
        category: 'ACHIEVEMENT',
        points: 50
      }
    ];

    for (const badge of badges) {
      await prisma.badge.upsert({
        where: { code: badge.code },
        update: badge,
        create: badge
      });
    }

    console.log('✅ Badges seeded successfully');

    // Create some sample feedback (optional - for testing)
    const users = await prisma.user.findMany({ take: 3 });
    
    if (users.length > 0) {
      const sampleFeedback = [
        {
          type: 'BUG',
          title: 'Dashboard loading slowly on mobile devices',
          description: 'The dashboard takes 5+ seconds to load on mobile devices, especially on slower connections. This affects productivity when working in the field.',
          severity: 'HIGH',
          tags: ['mobile', 'performance', 'dashboard'],
          authorId: users[0].id
        },
        {
          type: 'IMPROVEMENT',
          title: 'Add bulk actions for project management',
          description: 'It would be great to select multiple projects and perform bulk actions like archiving, status updates, or assigning to team members.',
          severity: null,
          tags: ['projects', 'bulk-actions', 'productivity'],
          authorId: users[0].id
        },
        {
          type: 'IDEA',
          title: 'AI-powered project timeline predictions',
          description: 'Use AI to predict project completion dates based on historical data, team performance, and external factors like weather.',
          severity: null,
          tags: ['ai', 'predictions', 'timeline', 'analytics'],
          authorId: users[0].id
        }
      ];

      for (const feedback of sampleFeedback) {
        await prisma.feedback.create({
          data: feedback
        });
      }

      console.log('✅ Sample feedback created');
    }

    console.log('🎉 Feedback system seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding feedback system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedFeedbackSystem()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
