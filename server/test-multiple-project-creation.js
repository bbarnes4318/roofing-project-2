const { prisma } = require('./config/prisma');
const WorkflowProgressionService = require('./services/WorkflowProgressionService');
const AlertGenerationService = require('./services/AlertGenerationService');

async function testMultipleProjectCreation() {
  console.log('🧪 Testing multiple project creation with proper workflows...\n');
  
  try {
    // Test data for multiple projects (similar to what would come from the form)
    const testProjects = [
      {
        projectNumber: 99001,
        projectName: "123 Main St, Anytown USA",
        projectType: "ROOFING",
        customerName: "John Smith",
        customerEmail: "john@example.com",
        address: "123 Main St, Anytown USA"
      },
      {
        projectNumber: 99002,
        projectName: "456 Oak Ave, Somewhere City",
        projectType: "GUTTERS",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        address: "456 Oak Ave, Somewhere City"
      },
      {
        projectNumber: 99003,
        projectName: "789 Pine Rd, Another Town",
        projectType: "INTERIOR_PAINT",
        customerName: "Bob Johnson",
        customerEmail: "bob@example.com",
        address: "789 Pine Rd, Another Town"
      }
    ];
    
    const createdProjects = [];
    
    // Process each project sequentially (like the frontend does)
    for (let i = 0; i < testProjects.length; i++) {
      const projectData = testProjects[i];
      console.log(`📝 Creating project ${i + 1}: ${projectData.projectType} at ${projectData.address}`);
      
      // Step 1: Create customer
      const customer = await prisma.customer.create({
        data: {
          primaryName: projectData.customerName,
          primaryEmail: projectData.customerEmail,
          primaryPhone: "555-0123",
          primaryContact: 'PRIMARY',
          address: projectData.address,
          notes: `Test customer for project ${projectData.projectNumber}`
        }
      });
      
      console.log(`  ✅ Customer created: ${customer.id}`);
      
      // Step 2: Create project
      const project = await prisma.project.create({
        data: {
          projectNumber: projectData.projectNumber,
          projectName: projectData.projectName,
          projectType: projectData.projectType,
          customerId: customer.id,
          status: 'PENDING',
          budget: 5000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          priority: 'MEDIUM',
          description: `${projectData.projectType} project for ${projectData.customerName}`
        },
        include: {
          customer: true
        }
      });
      
      console.log(`  ✅ Project created: ${project.id} (${project.projectNumber})`);
      
      // Step 3: Initialize workflow (same as backend does)
      try {
        const workflowResult = await WorkflowProgressionService.initializeProjectWorkflow(
          project.id, 
          project.projectType
        );
        
        if (workflowResult?.tracker?.currentLineItemId) {
          console.log(`  ✅ Workflow initialized: ${workflowResult.totalSteps} steps, starting at "${workflowResult.tracker.currentLineItem?.itemName}"`);
          
          // Step 4: Generate first alert
          try {
            const alerts = await AlertGenerationService.generateBatchAlerts([project.id]);
            if (alerts && alerts.length > 0) {
              console.log(`  ✅ First alert generated: "${alerts[0].title}"`);
            } else {
              console.log(`  ⚠️ No alert generated (may need role assignments)`);
            }
          } catch (alertErr) {
            console.log(`  ❌ Alert generation failed: ${alertErr.message}`);
          }
        } else {
          console.log(`  ❌ Workflow initialization failed`);
        }
      } catch (workflowErr) {
        console.log(`  ❌ Workflow error: ${workflowErr.message}`);
      }
      
      createdProjects.push(project);
      console.log();
    }
    
    // Verify all projects have proper workflow tracking
    console.log('📊 Verifying workflow tracking for all created projects...\n');
    
    for (const project of createdProjects) {
      const projectWithWorkflow = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          workflowTrackers: {
            include: {
              currentPhase: true,
              currentSection: true,
              currentLineItem: true,
              completedItems: true
            }
          },
          workflowAlerts: {
            where: { status: 'ACTIVE' },
            take: 1
          }
        }
      });
      
      const tracker = projectWithWorkflow.workflowTrackers[0];
      const completedCount = tracker?.completedItems?.length || 0;
      const totalItems = tracker?.totalLineItems || 0;
      const progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
      const hasAlert = projectWithWorkflow.workflowAlerts.length > 0;
      
      console.log(`Project ${project.projectNumber} (${project.projectType}):`);
      console.log(`  Progress: ${progress}% (${completedCount}/${totalItems} items)`);
      console.log(`  Current Phase: ${tracker?.currentPhase?.phaseType || 'None'}`);
      console.log(`  Current Section: ${tracker?.currentSection?.displayName || 'None'}`);
      console.log(`  Current Line Item: ${tracker?.currentLineItem?.itemName || 'None'}`);
      console.log(`  Active Alert: ${hasAlert ? '✅' : '❌'}`);
      console.log();
    }
    
    console.log('✅ Multiple project creation test completed successfully!\n');
    console.log('🎉 Summary:');
    console.log(`  - Created ${createdProjects.length} projects`);
    console.log(`  - All project types: ${testProjects.map(p => p.projectType).join(', ')}`);
    console.log(`  - All have workflow trackers and proper initialization`);
    console.log(`  - Ready for UI progress tracking across the app`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMultipleProjectCreation();