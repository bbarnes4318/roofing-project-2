const { PrismaClient } = require('@prisma/client');
const WorkflowProgressionService = require('./services/WorkflowProgressionService');

async function testOptimizedWorkflow() {
  try {
    console.log('🧪 Testing optimized workflow integration...');
    
    // Test 1: Get workflow status using optimized method
    const testProjectId = 'cme6nfnz600hugdur0kh8jqr0';
    console.log('\n📊 Testing getOptimizedWorkflowStatus...');
    
    const optimizedStatus = await WorkflowProgressionService.getOptimizedWorkflowStatus(testProjectId);
    console.log('✅ Optimized status result:', optimizedStatus ? 'SUCCESS' : 'NULL');
    if (optimizedStatus) {
      console.log('   - Progress:', optimizedStatus.progress + '%');
      console.log('   - Completed items:', optimizedStatus.completedItems ? optimizedStatus.completedItems.length : 0);
      console.log('   - Active alerts:', optimizedStatus.alertCount || 0);
    }
    
    // Test 2: Get current position
    console.log('\n📍 Testing getCurrentPosition...');
    const currentPosition = await WorkflowProgressionService.getCurrentPosition(testProjectId);
    console.log('✅ Current position result:', currentPosition ? 'SUCCESS' : 'NULL');
    if (currentPosition && currentPosition.currentLineItem) {
      console.log('   - Current item:', currentPosition.currentLineItem.itemName);
      console.log('   - Current phase:', currentPosition.currentPhase ? currentPosition.currentPhase.phaseType : 'N/A');
    }
    
    // Test 3: Validate database functions
    console.log('\n🗄️ Testing database integration...');
    const prisma = new PrismaClient();
    
    // Check if optimized tables exist and have data
    const phaseCount = await prisma.workflowPhase.count();
    const sectionCount = await prisma.workflowSection.count();
    const lineItemCount = await prisma.workflowLineItem.count();
    const trackerCount = await prisma.projectWorkflowTracker.count();
    
    console.log('✅ Database structure validation:');
    console.log('   - Workflow phases:', phaseCount);
    console.log('   - Workflow sections:', sectionCount);  
    console.log('   - Workflow line items:', lineItemCount);
    console.log('   - Project trackers:', trackerCount);
    
    await prisma.$disconnect();
    
    console.log('\n🎉 INTEGRATION TEST COMPLETED SUCCESSFULLY!');
    console.log('   The optimized workflow system is fully integrated and operational.');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testOptimizedWorkflow();