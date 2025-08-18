const { prisma } = require('./config/prisma');

async function checkProject99003() {
  try {
    console.log('🔍 Investigating project 99003 (Bob Johnson, Interior Paint)...\n');
    
    const projects = await prisma.project.findMany({
      where: { 
        OR: [
          { projectNumber: 99003 },
          { customer: { primaryName: { contains: 'Bob Johnson' } } }
        ]
      },
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
    
    console.log(`Found ${projects.length} project(s) for Bob Johnson:\n`);
    
    projects.forEach((project, index) => {
      console.log(`Project ${index + 1}:`);
      console.log(`  - ID: ${project.id}`);
      console.log(`  - Number: ${project.projectNumber}`);
      console.log(`  - Name: ${project.projectName}`);
      console.log(`  - Type: ${project.projectType}`);
      console.log(`  - Customer: ${project.customer.primaryName}`);
      console.log(`  - Status: ${project.status}`);
      console.log(`  - Workflow Trackers: ${project.workflowTrackers.length}`);
      
      project.workflowTrackers.forEach((tracker, tIndex) => {
        console.log(`    Tracker ${tIndex + 1}:`);
        console.log(`      - Workflow Type: ${tracker.workflowType}`);
        console.log(`      - Trade Name: ${tracker.tradeName || 'N/A'}`);
        console.log(`      - Is Main: ${tracker.isMainWorkflow}`);
        console.log(`      - Current Phase: ${tracker.currentPhase?.phaseType || 'None'}`);
        console.log(`      - Current Section: ${tracker.currentSection?.displayName || 'None'}`);
        console.log(`      - Current Line Item: ${tracker.currentLineItem?.itemName || 'None'}`);
        console.log(`      - Completed Items: ${tracker.completedItems?.length || 0}`);
        console.log(`      - Total Line Items: ${tracker.totalLineItems || 0}`);
      });
      console.log('');
    });
    
    // Now let's see what the trade breakdown calculation is doing
    console.log('🧮 Testing trade breakdown calculation...\n');
    
    if (projects.length > 0) {
      const project = projects[0]; // Test with the first project
      
      // Import the WorkflowProgressService
      const WorkflowProgressService = require('../src/services/workflowProgress.js');
      
      const progressData = WorkflowProgressService.calculateProjectProgress(project);
      console.log('Progress calculation result:');
      console.log(`  Overall: ${progressData.overall}%`);
      console.log(`  Current Phase: ${progressData.currentPhase}`);
      console.log(`  Completed Line Items: ${progressData.completedLineItems}`);
      console.log(`  Total Line Items: ${progressData.totalLineItems}`);
      
      const tradeBreakdown = WorkflowProgressService.calculateTradeBreakdown(
        project, 
        progressData.completedLineItems || [], 
        progressData.totalLineItems || 0, 
        null
      );
      
      console.log(`  Trade Breakdown: ${tradeBreakdown.length} trades`);
      tradeBreakdown.forEach((trade, i) => {
        console.log(`    Trade ${i + 1}: ${trade.name} - ${trade.laborProgress}% (${trade.completedItems}/${trade.totalItems})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProject99003();