const { prisma } = require('./config/prisma');

async function cleanDuplicateAlerts() {
  console.log('🧹 Cleaning up duplicate and stale workflow alerts...\n');
  
  try {
    // 1. Find all alerts grouped by project and line item
    const allAlerts = await prisma.workflowAlert.findMany({
      orderBy: [
        { projectId: 'asc' },
        { lineItemId: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    console.log(`📊 Found ${allAlerts.length} total alerts\n`);
    
    // Group alerts by projectId + lineItemId
    const alertGroups = {};
    allAlerts.forEach(alert => {
      const key = `${alert.projectId}_${alert.lineItemId}`;
      if (!alertGroups[key]) {
        alertGroups[key] = [];
      }
      alertGroups[key].push(alert);
    });
    
    let duplicatesFound = 0;
    let alertsDeleted = 0;
    
    // Check each group for duplicates
    for (const [key, alerts] of Object.entries(alertGroups)) {
      if (alerts.length > 1) {
        console.log(`Found ${alerts.length} alerts for ${key}:`);
        
        // Keep only the most recent ACTIVE alert, delete others
        let hasActiveAlert = false;
        const alertsToDelete = [];
        
        alerts.forEach(alert => {
          console.log(`  - ${alert.status} alert created at ${alert.createdAt}`);
          
          if (alert.status === 'ACTIVE') {
            if (hasActiveAlert) {
              // Already have an active alert, delete this duplicate
              alertsToDelete.push(alert.id);
            } else {
              hasActiveAlert = true;
            }
          } else if (alert.status === 'COMPLETED') {
            // Delete all completed alerts to avoid constraint issues
            alertsToDelete.push(alert.id);
          }
        });
        
        if (alertsToDelete.length > 0) {
          duplicatesFound++;
          console.log(`  🗑️ Deleting ${alertsToDelete.length} duplicate/completed alerts`);
          
          const deleteResult = await prisma.workflowAlert.deleteMany({
            where: {
              id: { in: alertsToDelete }
            }
          });
          
          alertsDeleted += deleteResult.count;
        }
        console.log('');
      }
    }
    
    // 2. Also delete any COMPLETED alerts (they shouldn't exist with our new logic)
    const completedAlerts = await prisma.workflowAlert.deleteMany({
      where: {
        status: 'COMPLETED'
      }
    });
    
    if (completedAlerts.count > 0) {
      console.log(`🗑️ Deleted ${completedAlerts.count} COMPLETED alerts\n`);
      alertsDeleted += completedAlerts.count;
    }
    
    // 3. Delete alerts for completed line items
    console.log('🔍 Checking for alerts on already-completed line items...');
    
    const activeAlerts = await prisma.workflowAlert.findMany({
      where: { status: 'ACTIVE' },
      include: {
        project: {
          include: {
            workflowTrackers: {
              include: {
                completedItems: true
              }
            }
          }
        }
      }
    });
    
    const alertsForCompletedItems = [];
    
    for (const alert of activeAlerts) {
      if (alert.lineItemId && alert.project.workflowTrackers.length > 0) {
        const tracker = alert.project.workflowTrackers[0];
        const isCompleted = tracker.completedItems.some(item => 
          item.lineItemId === alert.lineItemId
        );
        
        if (isCompleted) {
          alertsForCompletedItems.push(alert.id);
          console.log(`  Found alert for already-completed item: ${alert.title}`);
        }
      }
    }
    
    if (alertsForCompletedItems.length > 0) {
      const deleteResult = await prisma.workflowAlert.deleteMany({
        where: {
          id: { in: alertsForCompletedItems }
        }
      });
      
      console.log(`  🗑️ Deleted ${deleteResult.count} alerts for completed items\n`);
      alertsDeleted += deleteResult.count;
    }
    
    console.log('\n📊 Summary:');
    console.log(`  - Groups with duplicates: ${duplicatesFound}`);
    console.log(`  - Total alerts deleted: ${alertsDeleted}`);
    console.log(`  - Remaining active alerts: ${allAlerts.length - alertsDeleted}`);
    
    console.log('\n✅ Alert cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error cleaning alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicateAlerts();