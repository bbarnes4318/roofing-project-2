const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestProject() {
  try {
    console.log('Creating test project...');
    
    // Create a test customer first
    const customer = await prisma.customer.create({
      data: {
        primaryName: 'Test Customer',
        primaryEmail: 'test@example.com', 
        primaryPhone: '555-1234',
        address: '123 Test Street, Test City, TC 12345'
      }
    });
    
    // Create a test user as project manager
    let projectManager;
    try {
      projectManager = await prisma.user.findFirst({
        where: { email: 'admin@example.com' }
      });
      
      if (!projectManager) {
        projectManager = await prisma.user.create({
          data: {
            firstName: 'Test',
            lastName: 'Manager',
            email: 'admin@example.com',
            password: 'hashedpassword',
            role: 'ADMIN'
          }
        });
      }
    } catch (error) {
      console.log('Using existing project manager or creating fallback');
    }
    
    // Create test project
    const project = await prisma.project.create({
      data: {
        projectNumber: 12345,
        projectName: '123 Test Street Roofing',
        projectType: 'ROOF_REPLACEMENT',
        status: 'IN_PROGRESS',
        description: 'Test project for checkbox functionality',
        budget: 25000.00,
        customerId: customer.id,
        projectManagerId: projectManager?.id
      }
    });
    
    // Create workflow for the project
    const workflow = await prisma.projectWorkflow.create({
      data: {
        projectId: project.id,
        workflowType: 'ROOFING',
        status: 'IN_PROGRESS',
        currentStepIndex: 0,
        overallProgress: 0,
        enableAlerts: true,
        alertMethods: ['EMAIL']
      }
    });
    
    // Create test workflow steps
    const steps = [
      {
        stepId: 'initial-inspection',
        stepName: 'Initial Inspection',
        description: 'Conduct initial roof inspection',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        isCompleted: false
      },
      {
        stepId: 'estimate-approval', 
        stepName: 'Estimate Approval',
        description: 'Get customer approval on estimate',
        phase: 'APPROVED',
        defaultResponsible: 'SALES',
        estimatedDuration: 2,
        isCompleted: false
      },
      {
        stepId: 'material-order',
        stepName: 'Material Order',
        description: 'Order roofing materials',
        phase: 'EXECUTION',
        defaultResponsible: 'OFFICE',
        estimatedDuration: 1,
        isCompleted: false
      }
    ];
    
    for (const stepData of steps) {
      await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          ...stepData,
          scheduledStartDate: new Date(),
          scheduledEndDate: new Date(Date.now() + stepData.estimatedDuration * 24 * 60 * 60 * 1000),
          alertPriority: 'MEDIUM',
          alertDays: 1
        }
      });
    }
    
    console.log(`✅ Test project created successfully!`);
    console.log(`Project ID: ${project.id}`);
    console.log(`Project Number: ${project.projectNumber}`);
    console.log(`Workflow ID: ${workflow.id}`);
    console.log(`Created ${steps.length} workflow steps`);
    
    return { project, workflow };
    
  } catch (error) {
    console.error('❌ Error creating test project:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestProject();