/*
 * Cleanup script to remove old alerts with "General Workflow" or incorrect data
 */

const { prisma } = require('../config/prisma');

async function cleanupOldAlerts() {
  console.log('🔍 Finding old alerts with incorrect data...');
  
  // Find alerts with "General Workflow" or incorrect section names
  const oldAlerts = await prisma.workflowAlert.findMany({
    where: {
      OR: [
        {
          metadata: {
            path: ['section'],
            equals: 'General Workflow'
          }
        },
        {
          metadata: {
            path: ['section'],
            equals: 'Unknown Section'
          }
        },
        {
          title: {
            contains: 'General Workflow'
          }
        }
      ]
    }
  });

  console.log(`Found ${oldAlerts.length} old alerts with incorrect data`);

  if (oldAlerts.length === 0) {
    console.log('✅ No old alerts found to clean up');
    return;
  }

  // Show what we found
  oldAlerts.forEach(alert => {
    console.log(`- Alert: ${alert.title}`);
    console.log(`  Section: ${alert.metadata?.section || 'N/A'}`);
    console.log(`  Line Item: ${alert.metadata?.lineItem || 'N/A'}`);
  });

  // Delete the old alerts
  let deletedAlerts = 0;
  for (const alert of oldAlerts) {
    console.log(`Deleting alert: ${alert.title}`);
    await prisma.workflowAlert.delete({
      where: { id: alert.id }
    });
    deletedAlerts++;
  }

  console.log(`\n✅ Cleanup complete:`);
  console.log(`- Deleted ${deletedAlerts} old alerts with incorrect data`);
}

cleanupOldAlerts()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Error during cleanup:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
