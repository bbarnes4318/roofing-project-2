const { prisma } = require('./config/prisma');

async function verifyFix() {
  try {
    console.log('🔍 Verifying project 99003 fix...\n');
    
    const project = await prisma.project.findFirst({
      where: { projectNumber: 99003 },
      include: {
        customer: true,
        workflowTrackers: {
          include: {
            currentPhase: true,
            currentSection: true,
            currentLineItem: true,
            completedItems: true
          }
        }
      }
    });
    
    if (!project) {
      console.log('❌ Project 99003 not found');
      return;
    }
    
    console.log('✅ Project 99003 Details:');
    console.log(`  Number: ${project.projectNumber}`);
    console.log(`  Name: ${project.projectName}`);
    console.log(`  Type: ${project.projectType}`);
    console.log(`  Customer: ${project.customer.primaryName}`);
    console.log(`  Status: ${project.status}`);
    
    const tracker = project.workflowTrackers[0];
    if (tracker) {
      console.log('\n✅ Workflow Tracker:');
      console.log(`  Workflow Type: ${tracker.workflowType}`);
      console.log(`  Trade Name: ${tracker.tradeName}`);
      console.log(`  Is Main: ${tracker.isMainWorkflow}`);
      console.log(`  Total Line Items: ${tracker.totalLineItems} ← FIXED!`);
      console.log(`  Completed Items: ${tracker.completedItems?.length || 0}`);
      
      const progress = tracker.totalLineItems > 0 
        ? Math.round((tracker.completedItems?.length || 0) / tracker.totalLineItems * 100)
        : 0;
      console.log(`  Progress: ${progress}%`);
      console.log(`  Current Phase: ${tracker.currentPhase?.phaseType}`);
      console.log(`  Current Section: ${tracker.currentSection?.displayName}`);
      console.log(`  Current Line Item: ${tracker.currentLineItem?.itemName}`);
    }
    
    // Now test the trade breakdown that will be used by the frontend
    console.log('\n🧮 Testing Trade Breakdown Logic:');
    
    // Simulate what the frontend progress calculation would do
    const completedItems = tracker?.completedItems || [];
    const totalLineItems = tracker?.totalLineItems || 0;
    
    console.log(`  Project has workflowTrackers: ${project.workflowTrackers.length}`);
    console.log(`  Single workflow project with ${totalLineItems} total items`);
    
    // This is the logic from calculateRealMultipleWorkflowBreakdown
    const trades = [];
    project.workflowTrackers.forEach((t, index) => {
      const workflowTypeName = t.workflowType === 'ROOFING' ? 'Roofing' : 
                              t.workflowType === 'GUTTERS' ? 'Gutters' :
                              t.workflowType === 'INTERIOR_PAINT' ? 'Interior Paint' : t.workflowType;
      
      const completedCount = t.completedItems?.length || 0;
      const totalCount = t.totalLineItems || 25; // This was the bug!
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      trades.push({
        name: t.tradeName || workflowTypeName,
        laborProgress: progress,
        completedItems: completedCount,
        totalItems: totalCount,
        isMainTrade: t.isMainWorkflow || index === 0,
        workflowType: t.workflowType
      });
    });
    
    console.log('\n✅ Trade Breakdown Result:');
    trades.forEach((trade, i) => {
      console.log(`  Trade ${i + 1}: ${trade.name} (${trade.workflowType})`);
      console.log(`    Progress: ${trade.laborProgress}%`);
      console.log(`    Items: ${trade.completedItems}/${trade.totalItems}`);
      console.log(`    Main Trade: ${trade.isMainTrade}`);
    });
    
    // Should only show 1 trade: "Interior Paint" with correct item count
    const shouldShowSingle = trades.length === 1 && trades[0].name === 'interior paint' && trades[0].totalItems === 17;
    console.log(`\n${shouldShowSingle ? '✅' : '❌'} Expected: Single "Interior Paint" trade with 17 items`);
    console.log(`${shouldShowSingle ? '✅' : '❌'} Actual: ${trades.length} trade(s), "${trades[0]?.name}" with ${trades[0]?.totalItems} items`);
    
    if (shouldShowSingle) {
      console.log('\n🎉 SUCCESS! Bob Johnson\'s project will now show correctly in progress charts!');
    } else {
      console.log('\n❌ Still has issues - needs more fixes');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFix();