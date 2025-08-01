const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupAlerts() {
  console.log('🧹 Cleaning up alerts database...\n');

  try {
    // Delete all notifications that are not real workflow alerts
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        type: {
          in: ['TASK_ASSIGNED', 'PROJECT_UPDATE', 'REMINDER', 'TASK_COMPLETED', 'SYSTEM_MESSAGE']
        }
      }
    });

    console.log(`✅ Deleted ${deleteResult.count} old test notifications`);

    // Get remaining workflow alerts
    const remainingAlerts = await prisma.notification.findMany({
      where: {
        type: 'WORKFLOW_ALERT'
      },
      include: {
        recipient: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log(`📋 Remaining workflow alerts: ${remainingAlerts.length}`);
    
    remainingAlerts.forEach(alert => {
      const projectName = alert.metadata?.projectName || alert.actionData?.projectName;
      const recipient = alert.recipient;
      console.log(`   - ${alert.title} for ${projectName} (${recipient.firstName} ${recipient.lastName})`);
    });

    console.log('\n🎉 Alert cleanup completed!');
    console.log('🌐 The Dashboard "Current Alerts" section should now show only real workflow alerts with proper project data.');

  } catch (error) {
    console.error('❌ Error cleaning up alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAlerts(); 