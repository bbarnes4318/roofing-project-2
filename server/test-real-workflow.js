const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealWorkflow() {
  try {
    console.log('🧪 Testing REAL workflow completion in production...\n');
    
    // 1. Find a project with an active workflow tracker
    const project = await prisma.project.findFirst({
      where: {
        workflowTracker: {
          isNot: null
        }
      },
      include: {
        workflowTracker: true
      }
    });

    if (!project) {
      console.log('❌ No project with workflow tracker found');
      return;
    }

    console.log(`📋 Testing with project: ${project.projectName} (${project.id})`);
    
    // 2. Check current workflow state
    const tracker = project.workflowTracker;
    if (!tracker || !tracker.currentLineItemId) {
      console.log('❌ No active line item found');
      return;
    }

    console.log(`📍 Current line item: ${tracker.currentLineItemId}`);
    
    // 3. Get current line item details
    const currentLineItem = await prisma.workflowLineItem.findUnique({
      where: { id: tracker.currentLineItemId }
    });

    if (!currentLineItem) {
      console.log('❌ Current line item not found');
      return;
    }

    console.log(`📝 Current item: ${currentLineItem.itemName}`);
    
    // 4. Count active alerts BEFORE completion
    const alertsBefore = await prisma.workflowAlert.count({
      where: {
        projectId: project.id,
        status: 'ACTIVE'
      }
    });

    console.log(`🚨 Active alerts before: ${alertsBefore}`);
    
    // 5. Check if there are any alerts for this specific step
    const stepAlerts = await prisma.workflowAlert.findMany({
      where: {
        projectId: project.id,
        stepName: currentLineItem.itemName
      }
    });

    console.log(`🔍 Alerts for current step "${currentLineItem.itemName}": ${stepAlerts.length}`);
    stepAlerts.forEach(alert => {
      console.log(`  - ${alert.title} (${alert.status})`);
    });
    
    // 6. ACTUALLY COMPLETE THE LINE ITEM
    console.log('\n🔄 COMPLETING LINE ITEM...');
    const WorkflowProgressionService = require('./services/WorkflowProgressionService');
    
    const result = await WorkflowProgressionService.completeLineItem(
      project.id,
      tracker.currentLineItemId,
      'test-user-id',
      'Production test completion'
    );

    console.log('\n✅ Workflow completion result:');
    console.log(`  - Tracker updated: ${result.tracker ? 'YES' : 'NO'}`);
    console.log(`  - New line item: ${result.tracker?.currentLineItemId || 'NONE'}`);
    console.log(`  - Workflow complete: ${result.isWorkflowComplete}`);
    console.log(`  - New alert created: ${result.newAlert ? 'YES' : 'NO'}`);
    console.log(`  - Alerts completed: ${result.completedAlertsCount}`);
    
    // 7. Count active alerts AFTER completion
    const alertsAfter = await prisma.workflowAlert.count({
      where: {
        projectId: project.id,
        status: 'ACTIVE'
      }
    });

    console.log(`🚨 Active alerts after: ${alertsAfter}`);
    
    // 8. Check if the old alerts were marked completed
    const completedAlerts = await prisma.workflowAlert.findMany({
      where: {
        projectId: project.id,
        stepName: currentLineItem.itemName,
        status: 'COMPLETED'
      }
    });

    console.log(`✅ Completed alerts for "${currentLineItem.itemName}": ${completedAlerts.length}`);
    
    // 9. Check if new alert was created
    if (result.newAlert) {
      console.log('\n📢 New alert created:');
      console.log(`  - Title: ${result.newAlert.title}`);
      console.log(`  - Status: ${result.newAlert.status}`);
      console.log(`  - Assigned to: ${result.newAlert.assignedToId}`);
    }

    // 10. Verify the fix worked
    console.log('\n🎯 VERIFICATION:');
    if (result.completedAlertsCount > 0) {
      console.log('✅ FIX WORKED: Old alerts were marked as completed');
    } else {
      console.log('❌ FIX FAILED: No alerts were marked as completed');
    }
    
    if (result.newAlert) {
      console.log('✅ FIX WORKED: New alert was created for next step');
    } else {
      console.log('❌ FIX FAILED: No new alert was created');
    }

  } catch (error) {
    console.error('❌ Error testing real workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRealWorkflow();
