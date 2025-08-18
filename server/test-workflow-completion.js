const { prisma } = require('./config/prisma');

async function testWorkflowCompletion() {
  console.log('🔍 Testing workflow completion functionality...\n');
  
  try {
    // 1. Find an active alert
    const activeAlert = await prisma.workflowAlert.findFirst({
      where: {
        status: 'ACTIVE'
      },
      include: {
        project: true
      }
    });
    
    if (!activeAlert) {
      console.log('❌ No active alerts found to test');
      return;
    }
    
    console.log(`Found active alert: ${activeAlert.title}`);
    console.log(`Project: ${activeAlert.project.projectName} (#${activeAlert.project.projectNumber})`);
    console.log(`Line Item ID: ${activeAlert.lineItemId}`);
    console.log(`Project ID: ${activeAlert.projectId}\n`);
    
    // 2. Check if workflow tracker exists
    const tracker = await prisma.projectWorkflowTracker.findFirst({
      where: {
        projectId: activeAlert.projectId,
        isMainWorkflow: true
      },
      include: {
        currentLineItem: true,
        completedItems: {
          take: 5,
          orderBy: { completedAt: 'desc' }
        }
      }
    });
    
    if (!tracker) {
      console.log('❌ No workflow tracker found for this project');
      
      // Try to find any tracker for this project
      const anyTracker = await prisma.projectWorkflowTracker.findFirst({
        where: { projectId: activeAlert.projectId }
      });
      
      if (anyTracker) {
        console.log(`Found tracker but not main: ${anyTracker.id}`);
        console.log(`Is main workflow: ${anyTracker.isMainWorkflow}`);
      }
      
      return;
    }
    
    console.log(`✅ Found workflow tracker: ${tracker.id}`);
    console.log(`Current line item: ${tracker.currentLineItem?.itemName || 'None'}`);
    console.log(`Current line item ID: ${tracker.currentLineItemId}`);
    console.log(`Alert line item ID: ${activeAlert.lineItemId}`);
    console.log(`Match: ${tracker.currentLineItemId === activeAlert.lineItemId ? 'YES' : 'NO'}\n`);
    
    // 3. Check if line item exists
    if (activeAlert.lineItemId) {
      const lineItem = await prisma.workflowLineItem.findUnique({
        where: { id: activeAlert.lineItemId },
        include: {
          section: {
            include: {
              phase: true
            }
          }
        }
      });
      
      if (!lineItem) {
        console.log('❌ Line item not found in database!');
        return;
      }
      
      console.log(`✅ Line item exists: ${lineItem.itemName}`);
      console.log(`Section: ${lineItem.section.displayName}`);
      console.log(`Phase: ${lineItem.section.phase.phaseName}`);
    }
    
    // 4. Test the completion service directly
    console.log('\n🚀 Testing WorkflowCompletionService.completeLineItem()...');
    
    const WorkflowCompletionService = require('./services/WorkflowCompletionService');
    
    try {
      const result = await WorkflowCompletionService.completeLineItem(
        activeAlert.projectId,
        activeAlert.lineItemId,
        null, // userId
        'Test completion from debug script'
      );
      
      console.log('✅ SUCCESS! Line item completed');
      console.log(`Completed: ${result.completedItem.lineItemName}`);
      if (result.nextItem) {
        console.log(`Next item: ${result.nextItem.lineItemName}`);
      } else {
        console.log('Workflow complete!');
      }
      
    } catch (serviceError) {
      console.log('❌ Service error:', serviceError.message);
      console.log('\nFull error:');
      console.error(serviceError);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkflowCompletion();