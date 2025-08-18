const { prisma } = require('./config/prisma');
const api = require('./routes/projects'); // For testing the actual endpoint logic

async function testMultiTradeProject() {
  try {
    console.log('🧪 Testing multi-trade project creation...\n');
    
    // First, create a test customer
    const testCustomer = await prisma.customer.create({
      data: {
        primaryName: 'Test Multi-Trade Customer',
        primaryEmail: 'multitrade@test.com',
        primaryPhone: '(555) 123-4567',
        address: '123 Multi-Trade Street, Test City, CO 80123'
      }
    });
    
    console.log(`✅ Created test customer: ${testCustomer.primaryName} (ID: ${testCustomer.id})\n`);
    
    // Test project data with multiple trade types
    const testProjectData = {
      projectNumber: 88888,
      projectName: 'Multi-Trade Test Project',
      projectType: 'ROOFING', // Primary trade type
      tradeTypes: ['ROOFING', 'GUTTERS', 'INTERIOR_PAINT'], // All trade types
      customerId: testCustomer.id,
      status: 'PENDING',
      budget: 15000,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'MEDIUM',
      description: 'Test project with multiple trade types: Roofing, Gutters, and Interior Paint'
    };
    
    console.log('🔧 Project data to create:', {
      projectNumber: testProjectData.projectNumber,
      primaryTrade: testProjectData.projectType,
      allTrades: testProjectData.tradeTypes,
      customerName: testCustomer.primaryName
    });
    
    // Create project via API call (simulate the frontend request)
    console.log('\n📡 Making API call to create multi-trade project...');
    
    const response = await fetch('http://localhost:5000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add mock auth header if needed
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify(testProjectData)
    });
    
    if (!response.ok) {
      console.error('❌ API call failed:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error response:', errorData);
      return;
    }
    
    const createdProject = await response.json();
    console.log('✅ Project created via API:', createdProject.success ? 'SUCCESS' : 'FAILED');
    
    if (createdProject.success) {
      const projectId = createdProject.data.id;
      console.log(`   Project ID: ${projectId}`);
      console.log(`   Project Number: ${createdProject.data.projectNumber}`);
      
      // Check if multiple workflows were created
      console.log('\n🔍 Checking created workflows...');
      
      const workflows = await prisma.projectWorkflowTracker.findMany({
        where: { projectId: projectId },
        include: {
          currentPhase: true,
          currentSection: true,
          currentLineItem: true
        },
        orderBy: { isMainWorkflow: 'desc' }
      });
      
      console.log(`✅ Found ${workflows.length} workflow tracker(s):`);
      
      workflows.forEach((workflow, index) => {
        const isMain = workflow.isMainWorkflow ? ' (MAIN)' : '';
        console.log(`   ${index + 1}. ${workflow.workflowType}${isMain}`);
        console.log(`      Trade Name: ${workflow.tradeName || 'N/A'}`);
        console.log(`      Current Phase: ${workflow.currentPhase?.phaseType || 'None'}`);
        console.log(`      Current Line Item: ${workflow.currentLineItem?.itemName || 'None'}`);
        console.log(`      Total Items: ${workflow.totalLineItems || 0}`);
      });
      
      // Test expectations
      const expectedWorkflows = testProjectData.tradeTypes.length;
      if (workflows.length === expectedWorkflows) {
        console.log(`\n✅ SUCCESS: Created ${expectedWorkflows} workflows as expected!`);
        
        // Check that we have the correct trade types
        const createdTradeTypes = workflows.map(w => w.workflowType).sort();
        const expectedTradeTypes = testProjectData.tradeTypes.sort();
        
        if (JSON.stringify(createdTradeTypes) === JSON.stringify(expectedTradeTypes)) {
          console.log('✅ SUCCESS: All expected trade types were created!');
          console.log(`   Expected: ${expectedTradeTypes.join(', ')}`);
          console.log(`   Created: ${createdTradeTypes.join(', ')}`);
        } else {
          console.log('❌ MISMATCH: Created trade types do not match expected');
          console.log(`   Expected: ${expectedTradeTypes.join(', ')}`);
          console.log(`   Created: ${createdTradeTypes.join(', ')}`);
        }
        
      } else {
        console.log(`❌ FAILED: Expected ${expectedWorkflows} workflows, but got ${workflows.length}`);
      }
      
    } else {
      console.error('❌ Project creation failed:', createdProject);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
console.log('Starting multi-trade project creation test...\n');
testMultiTradeProject();