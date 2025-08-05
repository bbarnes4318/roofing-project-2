const { prisma } = require('./config/prisma');

async function checkAlertData() {
  try {
    const alerts = await prisma.workflowAlert.findMany({
      where: { status: 'ACTIVE' },
      select: { stepName: true, metadata: true },
      take: 10
    });
    
    console.log('🔍 Current alert data:');
    alerts.forEach((alert, index) => {
      console.log(`Alert ${index + 1}:`);
      console.log(`  Step Name: ${alert.stepName}`);
      console.log(`  Metadata section: ${alert.metadata?.section}`);
      console.log(`  Metadata lineItem: ${alert.metadata?.lineItem}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlertData();