const { prisma } = require('./config/prisma');
const WorkflowProgressionService = require('./services/WorkflowProgressionService');

async function testMultiTradeDirect() {
  try {
    console.log('🧪 Testing multi-trade project creation (direct)...\n');
    
    // First, create a test customer
    const testCustomer = await prisma.customer.create({
      data: {
        primaryName: 'Test Multi-Trade Customer Direct',
        primaryEmail: 'multitradedirect@test.com',
        primaryPhone: '(555) 123-9999',
        address: '456 Multi-Trade Avenue, Direct City, CO 80456'
      }
    });
    
    console.log(`✅ Created test customer: ${testCustomer.primaryName} (ID: ${testCustomer.id})\n`);
    
    // Create project directly
    const project = await prisma.project.create({
      data: {
        projectNumber: 99999,
        projectName: 'Direct Multi-Trade Test Project',
        projectType: 'ROOFING', // Primary trade type
        customerId: testCustomer.id,
        status: 'PENDING',
        budget: 15000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        description: 'Direct test project with multiple trade types'
      },
      include: {
        customer: true
      }
    });
    
    console.log(`✅ Created project: ${project.projectName} (ID: ${project.id})`);
    console.log(`   Project Number: ${project.projectNumber}`);
    console.log(`   Primary Trade: ${project.projectType}\n`);
    
    // Test multiple workflow initialization
    const tradeTypes = ['ROOFING', 'GUTTERS', 'INTERIOR_PAINT'];
    
    console.log(`🔧 Initializing multiple workflows for trades: ${tradeTypes.join(', ')}`);
    
    const workflows = await WorkflowProgressionService.initializeMultipleWorkflows(
      project.id,
      tradeTypes
    );
    
    console.log(`✅ Successfully initialized ${workflows.length} workflows\n`);
    
    // Verify the workflows were created correctly
    console.log('🔍 Verifying created workflows...');
    
    const createdWorkflows = await prisma.projectWorkflowTracker.findMany({
      where: { projectId: project.id },
      include: {
        currentPhase: true,
        currentSection: true,
        currentLineItem: true
      },
      orderBy: { isMainWorkflow: 'desc' }
    });
    
    console.log(`📋 Found ${createdWorkflows.length} workflow tracker(s):`);
    
    createdWorkflows.forEach((workflow, index) => {
      const isMain = workflow.isMainWorkflow ? ' (MAIN)' : '';
      console.log(`   ${index + 1}. ${workflow.workflowType}${isMain}`);
      console.log(`      Trade Name: ${workflow.tradeName || 'N/A'}`);
      console.log(`      Current Phase: ${workflow.currentPhase?.phaseType || 'None'}`);
      console.log(`      Current Section: ${workflow.currentSection?.displayName || 'None'}`);
      console.log(`      Current Line Item: ${workflow.currentLineItem?.itemName || 'None'}`);
      console.log(`      Total Items: ${workflow.totalLineItems || 0}`);
      console.log('');
    });
    
    // Verify expectations
    const expectedWorkflows = tradeTypes.length;
    const createdTradeTypes = createdWorkflows.map(w => w.workflowType).sort();
    const expectedTradeTypes = tradeTypes.sort();
    
    console.log('🎯 Test Results:');
    
    // Check workflow count
    if (createdWorkflows.length === expectedWorkflows) {
      console.log(`✅ PASS: Created ${expectedWorkflows} workflows as expected`);
    } else {
      console.log(`❌ FAIL: Expected ${expectedWorkflows} workflows, got ${createdWorkflows.length}`);
    }
    
    // Check trade types
    if (JSON.stringify(createdTradeTypes) === JSON.stringify(expectedTradeTypes)) {
      console.log('✅ PASS: All expected trade types were created');
      console.log(`   Expected: ${expectedTradeTypes.join(', ')}`);
      console.log(`   Created: ${createdTradeTypes.join(', ')}`);
    } else {
      console.log('❌ FAIL: Created trade types do not match expected');
      console.log(`   Expected: ${expectedTradeTypes.join(', ')}`);
      console.log(`   Created: ${createdTradeTypes.join(', ')}`);
    }
    
    // Check main workflow
    const mainWorkflows = createdWorkflows.filter(w => w.isMainWorkflow);
    if (mainWorkflows.length === 1) {
      console.log(`✅ PASS: Exactly one main workflow (${mainWorkflows[0].workflowType})`);
    } else {
      console.log(`❌ FAIL: Expected 1 main workflow, found ${mainWorkflows.length}`);
    }
    
    // Check that each workflow has proper line items
    const hasProperLineItems = createdWorkflows.every(w => w.totalLineItems > 0 && w.currentLineItem);
    if (hasProperLineItems) {
      console.log('✅ PASS: All workflows have proper line items and current state');
    } else {
      console.log('❌ FAIL: Some workflows missing line items or current state');
    }
    
    console.log('\n🎉 Multi-trade project creation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMultiTradeDirect();