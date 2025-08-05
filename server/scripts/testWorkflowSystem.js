const { PrismaClient } = require('@prisma/client');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');

const prisma = new PrismaClient();

async function testWorkflowSystem() {
  try {
    console.log('🧪 Testing Workflow System...\n');
    
    // 1. Check if workflow structure is loaded
    const phaseCount = await prisma.workflowPhase.count();
    const sectionCount = await prisma.workflowSection.count();
    const lineItemCount = await prisma.workflowLineItem.count();
    
    console.log('📊 Workflow Structure:');
    console.log(`   - Phases: ${phaseCount}`);
    console.log(`   - Sections: ${sectionCount}`);
    console.log(`   - Line Items: ${lineItemCount}`);
    
    if (phaseCount === 0) {
      console.log('\n❌ No workflow structure found. Please run importWorkflow.js first.');
      return;
    }
    
    // 2. Get a test project
    const project = await prisma.project.findFirst({
      where: { status: 'IN_PROGRESS' }
    });
    
    if (!project) {
      console.log('\n⚠️ No active project found for testing.');
      return;
    }
    
    console.log(`\n🏗️ Testing with project: ${project.projectName} (${project.projectNumber})`);
    
    // 3. Get current workflow position
    console.log('\n📍 Getting current workflow position...');
    const position = await WorkflowProgressionService.getCurrentPosition(project.id);
    
    if (position.currentLineItem) {
      console.log(`   Current Phase: ${position.currentPhase?.phaseName}`);
      console.log(`   Current Section: ${position.currentSection?.sectionName}`);
      console.log(`   Current Line Item: ${position.currentLineItem?.itemName}`);
    }
    
    // 4. Get workflow status
    console.log('\n📈 Getting workflow status...');
    const status = await WorkflowProgressionService.getWorkflowStatus(project.id);
    console.log(`   Progress: ${status.progress}%`);
    console.log(`   Completed Items: ${status.completedItems}/${status.totalItems}`);
    console.log(`   Is Complete: ${status.isComplete}`);
    
    // 5. Test alert generation
    console.log('\n🚨 Testing alert generation...');
    const tracker = await WorkflowProgressionService.getCurrentPosition(project.id);
    
    if (tracker.currentLineItem) {
      console.log(`   Would generate alert for: "${tracker.currentLineItem.itemName}"`);
      console.log(`   Section: ${tracker.currentLineItem.section.displayName}`);
      console.log(`   Responsible: ${tracker.currentLineItem.responsibleRole}`);
    }
    
    console.log('\n✅ Workflow system test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testWorkflowSystem();