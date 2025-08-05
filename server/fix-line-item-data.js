const { prisma } = require('./config/prisma');

async function fixLineItemData() {
  try {
    console.log('🔧 Fixing line item data in alerts...');
    
    // Get all active alerts
    const alerts = await prisma.workflowAlert.findMany({
      where: { status: 'ACTIVE' }
    });
    
    console.log(`📋 Found ${alerts.length} alerts to fix`);
    
    let fixedCount = 0;
    
    for (const alert of alerts) {
      // The line item should be the stepName, not a subtask
      const correctLineItem = alert.stepName;
      
      // Check if it needs fixing
      if (alert.metadata?.lineItem !== correctLineItem) {
        console.log(`🔄 Fixing "${alert.stepName}" alert:`);
        console.log(`   Old lineItem: "${alert.metadata?.lineItem}"`);
        console.log(`   New lineItem: "${correctLineItem}"`);
        
        // Update with correct line item
        await prisma.workflowAlert.update({
          where: { id: alert.id },
          data: {
            metadata: {
              ...alert.metadata,
              lineItem: correctLineItem
            }
          }
        });
        
        fixedCount++;
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} alerts!`);
    console.log('📱 Line items now correctly show step names instead of subtasks');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixLineItemData();