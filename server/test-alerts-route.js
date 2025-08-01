const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAlertsRoute() {
  try {
    console.log('Testing simple alerts query...\n');
    
    // Test 1: Count all alerts
    const alertCount = await prisma.workflowAlert.count();
    console.log(`Total alerts in DB: ${alertCount}`);
    
    // Test 2: Get first 3 alerts with minimal fields
    const alerts = await prisma.workflowAlert.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        status: true,
        isRead: true,
        createdAt: true
      }
    });
    
    console.log('\nFirst 3 alerts (minimal):');
    alerts.forEach(alert => {
      console.log(`- ${alert.title} (${alert.status}, read: ${alert.isRead})`);
    });
    
    // Test 3: Try with includes to see if that breaks it
    console.log('\nTrying with includes...');
    const alertsWithIncludes = await prisma.workflowAlert.findMany({
      take: 2,
      include: {
        project: {
          include: {
            customer: true
          }
        },
        step: true,
        assignedTo: true
      }
    });
    
    console.log(`Got ${alertsWithIncludes.length} alerts with includes`);
    
    // Test 4: Check active status filter
    const activeAlerts = await prisma.workflowAlert.count({
      where: {
        status: 'ACTIVE'
      }
    });
    
    console.log(`\nActive alerts: ${activeAlerts}`);
    
  } catch (error) {
    console.error('Error testing alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAlertsRoute();