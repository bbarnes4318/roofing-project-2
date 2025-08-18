const { PrismaClient } = require('@prisma/client');
const workflowProgressionService = require('./services/WorkflowProgressionService');

const prisma = new PrismaClient();

async function testMultipleWorkflows() {
  console.log('🧪 Testing multiple workflow functionality...');

  try {
    // Find a test project
    const project = await prisma.project.findFirst({
      where: {
        projectNumber: {
          in: [20000, 20001, 20002]
        }
      }
    });

    if (!project) {
      console.log('❌ No test project found. Please create a project first.');
      return;
    }

    console.log(`📋 Using project: ${project.projectName} (${project.projectNumber})`);

    // Clear any existing workflow trackers for clean test
    console.log('🧹 Clearing existing workflow trackers...');
    await prisma.projectWorkflowTracker.deleteMany({
      where: { projectId: project.id }
    });

    // Initialize multiple workflows for this project
    console.log('🔄 Initializing multiple workflows...');
    const workflows = ['ROOFING', 'GUTTERS', 'INTERIOR_PAINT'];
    
    const trackers = await workflowProgressionService.initializeMultipleWorkflows(project.id, workflows);
    
    console.log(`✅ Successfully created ${trackers.length} workflow trackers:`);
    trackers.forEach((tracker, index) => {
      console.log(`  ${index + 1}. ${tracker.workflowType} (${tracker.isMainWorkflow ? 'Main' : 'Additional'}) - ID: ${tracker.id}`);
    });

    // Get the updated project with all workflows
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
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

    console.log('\n📊 Project workflow summary:');
    updatedProject.workflowTrackers.forEach((tracker, index) => {
      console.log(`  ${index + 1}. ${tracker.workflowType}:`);
      console.log(`     - Current Phase: ${tracker.currentPhase?.phaseName || 'None'}`);
      console.log(`     - Current Section: ${tracker.currentSection?.displayName || 'None'}`);
      console.log(`     - Current Line Item: ${tracker.currentLineItem?.itemName || 'None'}`);
      console.log(`     - Completed Items: ${tracker.completedItems?.length || 0}`);
      console.log(`     - Is Main Workflow: ${tracker.isMainWorkflow}`);
    });

    // Simulate trade breakdown calculation (without importing frontend service)
    console.log('\n📈 Simulated trade breakdown:');
    updatedProject.workflowTrackers.forEach((tracker, index) => {
      const completedItems = tracker.completedItems?.length || 0;
      const totalItems = 25; // Estimated for now
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      console.log(`  ${index + 1}. ${tracker.workflowType}:`);
      console.log(`     - Progress: ${progress}%`);
      console.log(`     - Completed Items: ${completedItems}`);
      console.log(`     - Total Items: ${totalItems}`);
      console.log(`     - Is Main Trade: ${tracker.isMainWorkflow}`);
      console.log(`     - Trade Name: ${tracker.tradeName || tracker.workflowType}`);
    });

    console.log('\n✅ Multiple workflow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing multiple workflows:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the test
testMultipleWorkflows()
  .catch((error) => {
    console.error('Failed to test multiple workflows:', error);
    process.exit(1);
  });