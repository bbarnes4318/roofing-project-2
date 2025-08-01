const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creating test data...');
    
    // Find or create customer
    let customer = await prisma.customer.findFirst();
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          primaryName: 'Test Customer',
          primaryEmail: 'test@customer.com',
          primaryPhone: '555-1234',
          address: '123 Test Street, Test City, TC 12345'
        }
      });
      console.log('Created customer');
    }
    
    // Find or create user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: 'Test',
          lastName: 'Manager',
          email: 'test@manager.com',
          password: 'hashedpassword123',
          role: 'ADMIN'
        }
      });
      console.log('Created user');
    }
    
    // Create project with all required fields
    const project = await prisma.project.create({
      data: {
        projectNumber: 12345,
        projectName: '123 Test Street Roofing Project',
        projectType: 'ROOF_REPLACEMENT',
        status: 'IN_PROGRESS',
        description: 'Test project for checkbox functionality',
        budget: 25000.00,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        customerId: customer.id,
        projectManagerId: user.id
      }
    });
    console.log(`Created project ${project.projectNumber}`);
    
    // Create workflow
    const workflow = await prisma.projectWorkflow.create({
      data: {
        projectId: project.id,
        workflowType: 'ROOFING',
        status: 'IN_PROGRESS',
        currentStepIndex: 0,
        overallProgress: 0,
        enableAlerts: true,
        alertMethods: ['EMAIL'],
        escalationEnabled: false,
        escalationDelayDays: 3
      }
    });
    console.log('Created workflow');
    
    // Create workflow steps
    const steps = [
      { stepId: 'inspection', stepName: 'Initial Inspection', isCompleted: false },
      { stepId: 'estimate', stepName: 'Create Estimate', isCompleted: false },
      { stepId: 'approval', stepName: 'Customer Approval', isCompleted: false },
      { stepId: 'materials', stepName: 'Order Materials', isCompleted: false },
      { stepId: 'installation', stepName: 'Install Roof', isCompleted: false }
    ];
    
    for (const stepData of steps) {
      await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          stepId: stepData.stepId,
          stepName: stepData.stepName,
          description: `${stepData.stepName} step`,
          phase: 'LEAD',
          defaultResponsible: 'OFFICE',
          estimatedDuration: 1,
          isCompleted: stepData.isCompleted,
          scheduledStartDate: new Date(),
          scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          alertPriority: 'MEDIUM',
          alertDays: 1
        }
      });
    }
    console.log(`Created ${steps.length} workflow steps`);
    
    console.log(`\n✅ TEST DATA CREATED SUCCESSFULLY!`);
    console.log(`Project ID: ${project.id}`);
    console.log(`Project Number: ${project.projectNumber}`);
    console.log(`You can now test checkboxes with project ${project.projectNumber}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();