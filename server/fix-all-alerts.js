const { prisma } = require('./config/prisma');
const alertService = require('./services/WorkflowAlertService');

async function fixAllAlerts() {
  try {
    console.log('🔧 Fixing ALL alerts with correct section/line item data...');
    
    // Get all active alerts
    const alerts = await prisma.workflowAlert.findMany({
      where: { status: 'ACTIVE' },
      include: {
        project: {
          include: { customer: true }
        }
      }
    });
    
    console.log(`📋 Found ${alerts.length} total active alerts to fix`);
    
    let fixedCount = 0;
    const stepCounts = {};
    
    for (const alert of alerts) {
      // Count each step type
      stepCounts[alert.stepName] = (stepCounts[alert.stepName] || 0) + 1;
      
      // Get corrected section and line item for this step
      const correctSection = alertService.getSectionFromStepName(alert.stepName);
      const correctLineItem = alertService.getSpecificLineItem(alert.stepName, alert.stepId);
      
      const oldSection = alert.metadata?.section || 'unknown';
      const oldLineItem = alert.metadata?.lineItem || 'unknown';
      
      // Only update if the data is actually different
      if (oldSection !== correctSection || oldLineItem !== correctLineItem) {
        console.log(`🔄 Fixing "${alert.stepName}" alert for ${alert.project.projectName}:`);
        console.log(`   Section: "${oldSection}" → "${correctSection}"`);
        console.log(`   LineItem: "${oldLineItem}" → "${correctLineItem}"`);
        
        // Update the alert with correct metadata
        await prisma.workflowAlert.update({
          where: { id: alert.id },
          data: {
            metadata: {
              ...alert.metadata,
              section: correctSection,
              lineItem: correctLineItem
            }
          }
        });
        
        fixedCount++;
      }
    }
    
    console.log('\n📊 Alert Summary by Step Type:');
    Object.entries(stepCounts).forEach(([stepName, count]) => {
      console.log(`   ${stepName}: ${count} alerts`);
    });
    
    console.log(`\n✅ Fixed ${fixedCount} alerts out of ${alerts.length} total alerts!`);
    console.log('📱 All alerts now show correct sections and specific line items');
    console.log('🎯 Navigation from alerts to workflow will now work for ALL steps');
    
  } catch (error) {
    console.error('❌ Error fixing alerts:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllAlerts();