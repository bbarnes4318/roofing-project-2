const { prisma } = require('../config/prisma');
const projectService = require('../services/projectService');

async function seedSimpleProjects() {
  try {
    console.log('Creating simple seed data...');

    // Get or create office user
    let officeUser = await prisma.user.findFirst({
      where: { email: 'office@company.com' }
    });
    
    if (!officeUser) {
      officeUser = await prisma.user.create({
        data: {
          firstName: 'Office',
          lastName: 'User',
          email: 'office@company.com',
          phone: '303-555-0100',
          role: 'ADMIN',
          password: 'password123'
        }
      });
    }

    // Get or create PM
    let projectManager = await prisma.user.findFirst({
      where: { email: 'pm@company.com' }
    });
    
    if (!projectManager) {
      projectManager = await prisma.user.create({
        data: {
          firstName: 'Mike',
          lastName: 'Johnson', 
          email: 'pm@company.com',
          phone: '303-555-0001',
          role: 'PROJECT_MANAGER',
          password: 'password123'
        }
      });
    }

    // Phase distribution: Lead 10%, Prospect 25%, Approved 25%, Execution 25%, Supplement 10%, Completion 5%
    const targetPhases = [
      { phase: 'LEAD', count: 2 },
      { phase: 'PROSPECT', count: 5 },
      { phase: 'APPROVED', count: 5 },
      { phase: 'EXECUTION', count: 5 },
      { phase: 'SUPPLEMENT', count: 2 },
      { phase: 'COMPLETION', count: 1 }
    ];

    const customers = [
      { name: 'John Smith', address: '1234 Oak St, Denver, CO 80202' },
      { name: 'Jane Doe', address: '5678 Pine Ave, Boulder, CO 80301' },
      { name: 'Bob Johnson', address: '9012 Elm Dr, Aurora, CO 80012' },
      { name: 'Mary Wilson', address: '3456 Maple Ln, Lakewood, CO 80226' },
      { name: 'Tom Brown', address: '7890 Cedar Blvd, Westminster, CO 80031' },
      { name: 'Lisa Davis', address: '2345 Birch St, Arvada, CO 80002' },
      { name: 'Mike Miller', address: '6789 Spruce Way, Thornton, CO 80229' },
      { name: 'Sarah Taylor', address: '1357 Aspen Ct, Broomfield, CO 80020' },
      { name: 'David Anderson', address: '2468 Willow Dr, Commerce City, CO 80022' },
      { name: 'Amy Martinez', address: '9753 Poplar Ave, Englewood, CO 80110' },
      { name: 'Chris Lee', address: '8642 Cypress Ln, Wheat Ridge, CO 80033' },
      { name: 'Jennifer Garcia', address: '7531 Hickory St, Golden, CO 80401' },
      { name: 'Kevin Rodriguez', address: '4826 Walnut Blvd, Littleton, CO 80120' },
      { name: 'Michelle Lewis', address: '3915 Chestnut Dr, Parker, CO 80134' },
      { name: 'Jason Walker', address: '6248 Magnolia Way, Castle Rock, CO 80109' },
      { name: 'Nicole Hall', address: '5137 Dogwood Ct, Highlands Ranch, CO 80126' },
      { name: 'Ryan Allen', address: '8259 Redwood Ave, Centennial, CO 80111' },
      { name: 'Amanda Young', address: '9371 Sycamore St, Greenwood Village, CO 80111' },
      { name: 'Brandon King', address: '7462 Cottonwood Dr, Lakewood, CO 80214' },
      { name: 'Stephanie Wright', address: '4583 Juniper Ln, Denver, CO 80220' }
    ];

    let projectIndex = 0;

    for (const phaseGroup of targetPhases) {
      for (let i = 0; i < phaseGroup.count; i++) {
        const customerData = customers[projectIndex];
        const projectNumber = 20000 + projectIndex + 1;

        // Create customer
        const customer = await prisma.customer.create({
          data: {
            primaryName: customerData.name,
            primaryEmail: `${customerData.name.toLowerCase().replace(' ', '.')}@email.com`,
            primaryPhone: `303-555-${String(projectIndex + 1).padStart(4, '0')}`,
            address: customerData.address,
            primaryContact: 'PRIMARY'
          }
        });

        // Create project
        const project = await prisma.project.create({
          data: {
            projectNumber: projectNumber,
            projectName: customerData.address,
            projectType: 'ROOF_REPLACEMENT',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            description: `Roof replacement project for ${customerData.name}`,
            progress: 50,
            budget: 25000,
            estimatedCost: 25000,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            customerId: customer.id,
            projectManagerId: projectManager.id,
            pmPhone: projectManager.phone,
            pmEmail: projectManager.email
          }
        });

        // Create workflow
        await projectService.createDefaultWorkflow(project.id);

        // Get workflow with steps
        const workflow = await prisma.projectWorkflow.findFirst({
          where: { projectId: project.id },
          include: {
            steps: {
              orderBy: { stepId: 'asc' }
            }
          }
        });

        // Complete steps up to the target phase
        if (workflow && workflow.steps.length > 0) {
          const phaseOrder = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SUPPLEMENT', 'COMPLETION'];
          const targetPhaseIndex = phaseOrder.indexOf(phaseGroup.phase);

          for (const step of workflow.steps) {
            const stepPhaseIndex = phaseOrder.indexOf(step.phase);
            
            // Complete all steps from phases before the target phase
            if (stepPhaseIndex < targetPhaseIndex) {
              await prisma.workflowStep.update({
                where: { id: step.id },
                data: {
                  isCompleted: true,
                  completedAt: new Date(),
                  completedById: officeUser.id
                }
              });
            }
            // For target phase, complete some steps randomly to show progress
            else if (stepPhaseIndex === targetPhaseIndex) {
              const shouldComplete = Math.random() < 0.3; // 30% chance to complete steps in current phase
              if (shouldComplete) {
                await prisma.workflowStep.update({
                  where: { id: step.id },
                  data: {
                    isCompleted: true,
                    completedAt: new Date(),
                    completedById: officeUser.id
                  }
                });
              }
            }
          }
        }

        console.log(`Created project ${projectNumber} for ${phaseGroup.phase} phase`);
        projectIndex++;
      }
    }

    console.log(`✅ Successfully created 20 projects with proper phase distribution`);

  } catch (error) {
    console.error('❌ Error seeding projects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSimpleProjects();