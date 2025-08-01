const { prisma } = require('../config/prisma');
const projectService = require('../services/projectService');

async function seedFinalProjects() {
  try {
    console.log('Creating final seed data with proper phase distribution...');

    // Create users
    const officeUser = await prisma.user.create({
      data: {
        firstName: 'Office',
        lastName: 'User',
        email: 'office@company.com',
        phone: '303-555-0100',
        role: 'ADMIN',
        password: 'password123'
      }
    });

    const projectManager = await prisma.user.create({
      data: {
        firstName: 'Mike',
        lastName: 'Johnson', 
        email: 'pm@company.com',
        phone: '303-555-0001',
        role: 'PROJECT_MANAGER',
        password: 'password123'
      }
    });

    // Project data with specific phase targets
    const projectData = [
      // LEAD projects (2 projects - 10%)
      { name: 'John Smith', address: '1234 Oak St, Denver, CO 80202', targetPhase: 'LEAD' },
      { name: 'Jane Doe', address: '5678 Pine Ave, Boulder, CO 80301', targetPhase: 'LEAD' },
      
      // PROSPECT projects (5 projects - 25%)
      { name: 'Bob Johnson', address: '9012 Elm Dr, Aurora, CO 80012', targetPhase: 'PROSPECT' },
      { name: 'Mary Wilson', address: '3456 Maple Ln, Lakewood, CO 80226', targetPhase: 'PROSPECT' },
      { name: 'Tom Brown', address: '7890 Cedar Blvd, Westminster, CO 80031', targetPhase: 'PROSPECT' },
      { name: 'Lisa Davis', address: '2345 Birch St, Arvada, CO 80002', targetPhase: 'PROSPECT' },
      { name: 'Mike Miller', address: '6789 Spruce Way, Thornton, CO 80229', targetPhase: 'PROSPECT' },
      
      // APPROVED projects (5 projects - 25%)
      { name: 'Sarah Taylor', address: '1357 Aspen Ct, Broomfield, CO 80020', targetPhase: 'APPROVED' },
      { name: 'David Anderson', address: '2468 Willow Dr, Commerce City, CO 80022', targetPhase: 'APPROVED' },
      { name: 'Amy Martinez', address: '9753 Poplar Ave, Englewood, CO 80110', targetPhase: 'APPROVED' },
      { name: 'Chris Lee', address: '8642 Cypress Ln, Wheat Ridge, CO 80033', targetPhase: 'APPROVED' },
      { name: 'Jennifer Garcia', address: '7531 Hickory St, Golden, CO 80401', targetPhase: 'APPROVED' },
      
      // EXECUTION projects (5 projects - 25%)
      { name: 'Kevin Rodriguez', address: '4826 Walnut Blvd, Littleton, CO 80120', targetPhase: 'EXECUTION' },
      { name: 'Michelle Lewis', address: '3915 Chestnut Dr, Parker, CO 80134', targetPhase: 'EXECUTION' },
      { name: 'Jason Walker', address: '6248 Magnolia Way, Castle Rock, CO 80109', targetPhase: 'EXECUTION' },
      { name: 'Nicole Hall', address: '5137 Dogwood Ct, Highlands Ranch, CO 80126', targetPhase: 'EXECUTION' },
      { name: 'Ryan Allen', address: '8259 Redwood Ave, Centennial, CO 80111', targetPhase: 'EXECUTION' },
      
      // SUPPLEMENT projects (2 projects - 10%)
      { name: 'Amanda Young', address: '9371 Sycamore St, Greenwood Village, CO 80111', targetPhase: 'SUPPLEMENT' },
      { name: 'Brandon King', address: '7462 Cottonwood Dr, Lakewood, CO 80214', targetPhase: 'SUPPLEMENT' },
      
      // COMPLETION projects (1 project - 5%)
      { name: 'Stephanie Wright', address: '4583 Juniper Ln, Denver, CO 80220', targetPhase: 'COMPLETION' }
    ];

    for (let i = 0; i < projectData.length; i++) {
      const data = projectData[i];
      const projectNumber = 20000 + i + 1;

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          primaryName: data.name,
          primaryEmail: `${data.name.toLowerCase().replace(' ', '.')}@email.com`,
          primaryPhone: `303-555-${String(i + 1).padStart(4, '0')}`,
          address: data.address,
          primaryContact: 'PRIMARY'
        }
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          projectNumber: projectNumber,
          projectName: data.address,
          projectType: 'ROOF_REPLACEMENT',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          description: `Roof replacement project for ${data.name}`,
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
        include: { steps: { orderBy: { stepId: 'asc' } } }
      });

      if (workflow && workflow.steps.length > 0) {
        // Complete steps to put project in target phase
        for (const step of workflow.steps) {
          let shouldComplete = false;

          // Determine completion based on target phase
          switch (data.targetPhase) {
            case 'LEAD':
              // Complete some LEAD steps randomly
              shouldComplete = step.phase === 'LEAD' && Math.random() < 0.6;
              break;
              
            case 'PROSPECT':
              // Complete all LEAD, some PROSPECT
              shouldComplete = step.phase === 'LEAD' || (step.phase === 'PROSPECT' && Math.random() < 0.7);
              break;
              
            case 'APPROVED':
              // Complete all LEAD, PROSPECT, some APPROVED
              shouldComplete = step.phase === 'LEAD' || step.phase === 'PROSPECT' || (step.phase === 'APPROVED' && Math.random() < 0.6);
              break;
              
            case 'EXECUTION':
              // Complete all LEAD, PROSPECT, APPROVED, some EXECUTION
              shouldComplete = step.phase === 'LEAD' || step.phase === 'PROSPECT' || step.phase === 'APPROVED' || (step.phase === 'EXECUTION' && Math.random() < 0.7);
              break;
              
            case 'SUPPLEMENT':
              // Complete all previous phases, some SUPPLEMENT
              shouldComplete = step.phase === 'LEAD' || step.phase === 'PROSPECT' || step.phase === 'APPROVED' || step.phase === 'EXECUTION' || (step.phase === 'SUPPLEMENT' && Math.random() < 0.6);
              break;
              
            case 'COMPLETION':
              // Complete all phases except COMPLETION
              shouldComplete = step.phase !== 'COMPLETION';
              break;
          }

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

      console.log(`Created project ${projectNumber} for ${data.targetPhase} phase: ${data.name}`);
    }

    console.log(`✅ Successfully created ${projectData.length} projects with proper phase distribution`);

  } catch (error) {
    console.error('❌ Error seeding projects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedFinalProjects();