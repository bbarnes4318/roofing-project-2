const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAlerts() {
  try {
    const alertCount = await prisma.notification.count({
      where: { type: 'WORKFLOW_ALERT' }
    });
    
    console.log(`Total workflow alerts in database: ${alertCount}`);
    
    const recentAlerts = await prisma.notification.findMany({
      where: { type: 'WORKFLOW_ALERT' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        message: true,
        createdAt: true,
        actionData: true
      }
    });
    
    console.log('\nSample alerts:');
    recentAlerts.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.title}`);
      console.log(`   Project: ${alert.actionData?.projectName || 'Unknown'}`);
      console.log(`   Created: ${alert.createdAt.toISOString()}`);
    });
    
  } catch (error) {
    console.error('Error verifying alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAlerts();