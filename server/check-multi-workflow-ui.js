const { prisma } = require('./config/prisma');

async function checkMultiWorkflowUI() {
  try {
    console.log('🔍 Investigating multi-workflow UI access...\n');
    
    // Get project 20000 which has multiple workflows
    const project = await prisma.project.findFirst({
      where: { projectNumber: 20000 },
      include: {
        customer: true,
        workflowTrackers: {
          include: {
            currentPhase: true,
            currentSection: true,
            currentLineItem: true,
            completedItems: true
          },
          orderBy: { isMainWorkflow: 'desc' } // Main first
        }
      }
    });
    
    if (!project) {
      console.log('❌ Project 20000 not found');
      return;
    }
    
    console.log('📋 Project 20000 - Multi-Workflow Example:');
    console.log(`  Name: ${project.projectName}`);
    console.log(`  Main Type: ${project.projectType}`);
    console.log(`  Customer: ${project.customer.primaryName}`);
    console.log(`  Workflow Trackers: ${project.workflowTrackers.length}`);
    console.log();
    
    project.workflowTrackers.forEach((tracker, index) => {
      const isMain = tracker.isMainWorkflow ? ' (MAIN)' : '';
      console.log(`  ${index + 1}. ${tracker.workflowType}${isMain}`);
      console.log(`     Trade Name: ${tracker.tradeName || 'N/A'}`);
      console.log(`     Current Phase: ${tracker.currentPhase?.phaseType || 'None'}`);
      console.log(`     Current Section: ${tracker.currentSection?.displayName || 'None'}`);
      console.log(`     Current Line Item: ${tracker.currentLineItem?.itemName || 'None'}`);
      console.log(`     Total Items: ${tracker.totalLineItems || 0}`);
      console.log(`     Completed: ${tracker.completedItems?.length || 0}`);
      console.log();
    });
    
    console.log('🤔 Current UI Problem:');
    console.log('   The frontend likely only shows the MAIN workflow tracker');
    console.log('   Users cannot see or interact with additional trade workflows');
    console.log('   Example: User sees ROOFING workflow but not GUTTERS or INTERIOR_PAINT');
    console.log();
    
    console.log('💡 Potential Solutions:');
    console.log('   1. Add workflow tabs/toggle in Project Detail page');
    console.log('   2. Show all workflows in a tabbed interface');
    console.log('   3. Add workflow selector dropdown');
    console.log('   4. Create separate workflow pages per trade');
    console.log('   5. Show all workflows simultaneously with trade labels');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMultiWorkflowUI();