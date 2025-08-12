const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAlertsAPI() {
  try {
    console.log('=== TESTING ALERTS API ===');
    
    // Simulate the exact query the frontend makes
    const where = {
      status: 'ACTIVE'  // This is what the frontend sends
    };
    
    console.log('Query conditions:', where);
    
    // Run the same query as the API
    const alerts = await prisma.workflowAlert.findMany({
      where,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            status: true,
            customer: {
              select: {
                id: true,
                primaryName: true,
                primaryEmail: true,
                primaryPhone: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    console.log(`\nFound ${alerts.length} ACTIVE alerts:`);
    alerts.forEach((alert, i) => {
      console.log(`${i+1}. ${alert.title}`);
      console.log(`   Assigned to: ${alert.assignedTo?.firstName} ${alert.assignedTo?.lastName} (${alert.assignedTo?.email})`);
      console.log(`   Project: ${alert.project?.projectName}`);
      console.log(`   Status: ${alert.status}`);
      console.log('');
    });
    
    // Check total count
    const totalCount = await prisma.workflowAlert.count({ where });
    console.log(`Total ACTIVE alerts in database: ${totalCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAlertsAPI();
