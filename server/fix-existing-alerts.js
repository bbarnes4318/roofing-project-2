const { prisma } = require('./config/prisma');
const alertService = require('./services/WorkflowAlertService');

async function fixExistingAlerts() {
  try {
    console.log('🔧 Fixing existing alerts with correct section/line item data...');
    
    // Get all active alerts with incorrect data
    const alerts = await prisma.workflowAlert.findMany({
      where: { 
        status: 'ACTIVE',
        stepName: 'Project Closeout'
      },
      include: {
        project: {
          include: { customer: true }
        }
      }
    });
    
    console.log(`📋 Found ${alerts.length} "Project Closeout" alerts to fix`);
    
    for (const alert of alerts) {
      // Get corrected section and line item
      const correctSection = alertService.getSectionFromStepName('Project Closeout');
      const correctLineItem = alertService.getSpecificLineItem('Project Closeout', 'completion_2');
      
      console.log(`🔄 Fixing alert for ${alert.project.projectName}:`);
      console.log(`   Old: Section="${alert.metadata?.section || 'unknown'}", LineItem="${alert.metadata?.lineItem || 'unknown'}"`);
      console.log(`   New: Section="${correctSection}", LineItem="${correctLineItem}"`);
      
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
    }
    
    console.log('✅ All Project Closeout alerts have been fixed!');
    console.log('📱 The dashboard will now show:');
    console.log('   Section: "Project Closeout – Administration 📝"');
    console.log('   Line Item: "Final inspection completed"');
    
  } catch (error) {
    console.error('❌ Error fixing alerts:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingAlerts();