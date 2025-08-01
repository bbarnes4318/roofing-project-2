const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');
  
  // Clear existing data (in correct order to avoid foreign key constraints)
  console.log('🧹 Clearing existing data...');
  await prisma.workflowStepAttachment.deleteMany();
  await prisma.workflowSubTask.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.projectWorkflow.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.documentDownload.deleteMany();
  await prisma.document.deleteMany();
  await prisma.calendarEventAttendee.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.projectTeamMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ All data cleared successfully');

  // Create users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        firstName: 'Office',
        lastName: 'Staff',
        email: 'office@kenstruction.com',
        password: hashedPassword,
        phone: '303-555-0001',
        position: 'Office',
        department: 'Administration',
        bio: 'Office staff handling customer information and lead management',
        role: 'MANAGER',
        isActive: true,
        isVerified: true,
        skills: ['Customer Service', 'Data Entry', 'Communication'],
        experience: 3,
        theme: 'LIGHT',
        notificationPreferences: { sms: true, email: true, inApp: true },
        language: 'en',
        timezone: 'America/Denver'
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@kenstruction.com',
        password: hashedPassword,
        phone: '303-555-0002',
        position: 'Administration',
        department: 'Administration',
        bio: 'Administrative staff handling insurance processes and agreements',
        role: 'MANAGER',
        isActive: true,
        isVerified: true,
        skills: ['Insurance Processing', 'Documentation', 'Agreement Management'],
        experience: 5,
        theme: 'LIGHT',
        notificationPreferences: { sms: true, email: true, inApp: true },
        language: 'en',
        timezone: 'America/Denver'
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Project',
        lastName: 'Manager',
        email: 'pm@kenstruction.com',
        password: hashedPassword,
        phone: '303-555-0003',
        position: 'Project Manager',
        department: 'Operations',
        bio: 'Project manager handling site inspections and estimates',
        role: 'PROJECT_MANAGER',
        isActive: true,
        isVerified: true,
        skills: ['Site Inspection', 'Estimating', 'Project Management'],
        experience: 8,
        theme: 'LIGHT',
        notificationPreferences: { sms: true, email: true, inApp: true },
        language: 'en',
        timezone: 'America/Denver'
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Field',
        lastName: 'Crew',
        email: 'fieldcrew@kenstruction.com',
        password: hashedPassword,
        phone: '303-555-0004',
        position: 'Field Crew',
        department: 'Field Operations',
        bio: 'Field crew member handling installation and quality checks',
        role: 'WORKER',
        isActive: true,
        isVerified: true,
        skills: ['Installation', 'Quality Control', 'Safety Procedures'],
        experience: 4,
        theme: 'LIGHT',
        notificationPreferences: { sms: true, email: true, inApp: true },
        language: 'en',
        timezone: 'America/Denver'
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Roof',
        lastName: 'Supervisor',
        email: 'roofsupervisor@kenstruction.com',
        password: hashedPassword,
        phone: '303-555-0005',
        position: 'Roof Supervisor',
        department: 'Field Operations',
        bio: 'Roof supervisor handling quality checks and completion photos',
        role: 'FOREMAN',
        isActive: true,
        isVerified: true,
        skills: ['Quality Control', 'Supervision', 'Safety Management'],
        experience: 6,
        theme: 'LIGHT',
        notificationPreferences: { sms: true, email: true, inApp: true },
        language: 'en',
        timezone: 'America/Denver'
      }
    }),
    prisma.user.create({
      data: {
        firstName: 'Field',
        lastName: 'Director',
        email: 'fielddirector@kenstruction.com',
        password: hashedPassword,
        phone: '303-555-0006',
        position: 'Field Director',
        department: 'Field Operations',
        bio: 'Field director overseeing installation and project execution',
        role: 'FOREMAN',
        isActive: true,
        isVerified: true,
        skills: ['Project Execution', 'Team Leadership', 'Installation Management'],
        experience: 7,
        theme: 'LIGHT',
        notificationPreferences: { sms: true, email: true, inApp: true },
        language: 'en',
        timezone: 'America/Denver'
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create customers
  console.log('👥 Creating customers...');
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        primaryName: 'John Smith',
        primaryEmail: 'john.smith@email.com',
        primaryPhone: '303-555-0101',
        secondaryName: 'Mary Smith',
        secondaryEmail: 'mary.smith@email.com',
        secondaryPhone: '303-555-0201',
        primaryContact: 'PRIMARY',
        address: '1234 Mountain View Dr, Denver, CO 80202',
        notes: 'Complete roof replacement with architectural shingles and new gutters'
      }
    }),
    prisma.customer.create({
      data: {
        primaryName: 'Sarah Johnson',
        primaryEmail: 'sarah.johnson@email.com',
        primaryPhone: '303-555-0102',
        secondaryName: 'Thomas Johnson',
        secondaryEmail: 'thomas.johnson@email.com',
        secondaryPhone: '303-555-0202',
        primaryContact: 'PRIMARY',
        address: '5678 Pine Ridge Ln, Boulder, CO 80301',
        notes: 'Emergency roof repair after hail damage with insurance claim'
      }
    }),
    prisma.customer.create({
      data: {
        primaryName: 'Michael Davis',
        primaryEmail: 'michael.davis@email.com',
        primaryPhone: '303-555-0103',
        secondaryName: 'Jennifer Davis',
        secondaryEmail: 'jennifer.davis@email.com',
        secondaryPhone: '303-555-0203',
        primaryContact: 'PRIMARY',
        address: '0123 Ridge Rd, Westminster, CO 80030',
        notes: 'Full roof replacement including chimney flashing repair'
      }
    }),
    prisma.customer.create({
      data: {
        primaryName: 'Christopher Rodriguez',
        primaryEmail: 'chris.rodriguez@email.com',
        primaryPhone: '303-555-0109',
        secondaryName: 'Richard Brown',
        secondaryEmail: 'richard.brown@email.com',
        secondaryPhone: '303-555-0204',
        primaryContact: 'PRIMARY',
        address: '4567 Valley View Ln, Arvada, CO 80002',
        notes: 'Roof replacement with new skylights and ventilation'
      }
    }),
    prisma.customer.create({
      data: {
        primaryName: 'Amanda Martinez',
        primaryEmail: 'amanda.martinez@email.com',
        primaryPhone: '303-555-0110',
        secondaryName: 'Linda Jones',
        secondaryEmail: 'linda.jones@email.com',
        secondaryPhone: '303-555-0205',
        primaryContact: 'PRIMARY',
        address: '8901 Highland Dr, Thornton, CO 80229',
        notes: 'Emergency roof repair with temporary tarping'
      }
    })
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // Create projects
  console.log('🏗️ Creating projects...');
  const projects = await Promise.all([
    prisma.project.create({
             data: {
         projectNumber: 12405,
         projectName: '1234 Mountain View Dr, Denver, CO 80202',
         projectType: 'ROOF_REPLACEMENT',
         progress: 45,
        description: 'Complete roof replacement with architectural shingles and new gutters',
        priority: 'HIGH',
        budget: 26186.53,
        estimatedCost: 28166.23,
        startDate: new Date('2024-09-05'),
        endDate: new Date('2024-10-07'),
        isInsuranceClaim: false,
        pmPhone: '303-555-0001',
        pmEmail: 'john.smith@kenstruction.com',
                 customerId: customers[0].id,
         projectManagerId: users[2].id,
         createdById: users[0].id
      }
    }),
    prisma.project.create({
             data: {
         projectNumber: 32475,
         projectName: '5678 Pine Ridge Ln, Boulder, CO 80301',
         projectType: 'ROOF_REPLACEMENT',
         progress: 60,
        description: 'Emergency roof repair after hail damage with insurance claim',
        priority: 'MEDIUM',
        budget: 45521.94,
        estimatedCost: 42812.63,
        startDate: new Date('2024-03-21'),
        endDate: new Date('2024-04-30'),
        isInsuranceClaim: true,
        pmPhone: '303-555-0001',
        pmEmail: 'john.smith@kenstruction.com',
                 customerId: customers[1].id,
         projectManagerId: users[2].id,
         createdById: users[0].id
      }
    }),
    prisma.project.create({
                           data: {
          projectNumber: 58027,
          projectName: '4567 Valley View Ln, Arvada, CO 80002',
          projectType: 'ROOF_REPLACEMENT',
          progress: 0,
        description: 'Roof replacement with new skylights and ventilation',
        priority: 'LOW',
        budget: 46531.34,
        estimatedCost: 42010.77,
        startDate: new Date('2024-03-22'),
        endDate: new Date('2024-05-18'),
        isInsuranceClaim: false,
        pmPhone: '303-555-0001',
        pmEmail: 'john.smith@kenstruction.com',
                 customerId: customers[3].id,
         projectManagerId: users[2].id,
         createdById: users[0].id
      }
    }),
    prisma.project.create({
             data: {
         projectNumber: 39399,
         projectName: '8901 Highland Dr, Thornton, CO 80229',
         projectType: 'ROOF_REPLACEMENT',
         progress: 21,
        description: 'Emergency roof repair with temporary tarping',
        priority: 'HIGH',
        budget: 23782.15,
        estimatedCost: 22956.32,
        startDate: new Date('2024-09-21'),
        endDate: new Date('2024-11-12'),
        isInsuranceClaim: false,
        pmPhone: '303-555-0001',
        pmEmail: 'john.smith@kenstruction.com',
                 customerId: customers[4].id,
         projectManagerId: users[2].id,
         createdById: users[0].id
      }
    }),
    prisma.project.create({
             data: {
         projectNumber: 42872,
         projectName: '8901 Canyon View, Evergreen, CO 80439',
         projectType: 'ROOF_REPLACEMENT',
         progress: 85,
        description: 'Complete roof replacement with warranty upgrade',
        priority: 'LOW',
        budget: 42222.63,
        estimatedCost: 39064.51,
        startDate: new Date('2024-06-22'),
        endDate: new Date('2024-07-22'),
        isInsuranceClaim: true,
        pmPhone: '303-555-0001',
        pmEmail: 'john.smith@kenstruction.com',
                 customerId: customers[2].id,
         projectManagerId: users[2].id,
         createdById: users[0].id
      }
    })
  ]);

  console.log(`✅ Created ${projects.length} projects`);

  // Create project team members
  console.log('👥 Creating project team members...');
  const teamMembers = await Promise.all([
         prisma.projectTeamMember.create({
       data: {
         projectId: projects[0].id,
         userId: users[2].id,
         role: 'Project Manager'
       }
     }),
     prisma.projectTeamMember.create({
       data: {
         projectId: projects[0].id,
         userId: users[5].id,
         role: 'Field Director'
       }
     }),
     prisma.projectTeamMember.create({
       data: {
         projectId: projects[0].id,
         userId: users[3].id,
         role: 'Field Crew'
       }
     }),
     prisma.projectTeamMember.create({
       data: {
         projectId: projects[1].id,
         userId: users[2].id,
         role: 'Project Manager'
       }
     }),
     prisma.projectTeamMember.create({
       data: {
         projectId: projects[1].id,
         userId: users[5].id,
         role: 'Field Director'
       }
     }),
     prisma.projectTeamMember.create({
       data: {
         projectId: projects[1].id,
         userId: users[3].id,
         role: 'Field Crew'
       }
     })
  ]);

  console.log(`✅ Created ${teamMembers.length} team members`);

  // Create workflows
  console.log('🔄 Creating project workflows...');
  const workflows = await Promise.all([
    prisma.projectWorkflow.create({
      data: {
        projectId: projects[0].id,
        workflowType: 'ROOFING',
        currentStepIndex: 2,
        overallProgress: 45,
        enableAlerts: true,
        alertMethods: ['IN_APP', 'EMAIL'],
        createdById: users[0].id,
        lastModifiedById: users[0].id
      }
    }),
    prisma.projectWorkflow.create({
      data: {
        projectId: projects[1].id,
        workflowType: 'ROOFING',
        currentStepIndex: 3,
        overallProgress: 60,
        enableAlerts: true,
        alertMethods: ['IN_APP', 'EMAIL'],
        createdById: users[0].id,
        lastModifiedById: users[0].id
      }
    }),
    prisma.projectWorkflow.create({
      data: {
        projectId: projects[2].id,
        workflowType: 'ROOFING',
        currentStepIndex: 0,
        overallProgress: 0,
        enableAlerts: true,
        alertMethods: ['IN_APP', 'EMAIL'],
        createdById: users[0].id,
        lastModifiedById: users[0].id
      }
    }),
    prisma.projectWorkflow.create({
      data: {
        projectId: projects[3].id,
        workflowType: 'ROOFING',
        currentStepIndex: 1,
        overallProgress: 21,
        enableAlerts: true,
        alertMethods: ['IN_APP', 'EMAIL'],
        createdById: users[0].id,
        lastModifiedById: users[0].id
      }
    }),
    prisma.projectWorkflow.create({
      data: {
        projectId: projects[4].id,
        workflowType: 'ROOFING',
        currentStepIndex: 4,
        overallProgress: 85,
        enableAlerts: true,
        alertMethods: ['IN_APP', 'EMAIL'],
        createdById: users[0].id,
        lastModifiedById: users[0].id
      }
    })
  ]);

  console.log(`✅ Created ${workflows.length} workflows`);

  // Create workflow steps
  console.log('📋 Creating workflow steps...');
  const steps = [];
  
  for (let i = 0; i < workflows.length; i++) {
    const workflow = workflows[i];
    const project = projects[i];
    
    // Create steps for each workflow
                   const workflowSteps = [
               {
           stepId: 'input_customer_info',
           stepName: 'Input Customer Information',
           phase: 'LEAD',
           description: 'Input customer information and verify details',
           estimatedDuration: 5,
           defaultResponsible: 'OFFICE',
                       scheduledStartDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            scheduledEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
           isCompleted: true,
           alertPriority: 'MEDIUM',
           assignedToId: users[0].id, // Office
           workflowId: workflow.id
         },
                            {
           stepId: 'site_inspection',
           stepName: 'Site Inspection',
           phase: 'PROSPECT',
           description: 'Conduct site inspection and take photos',
           estimatedDuration: 5,
           defaultResponsible: 'PROJECT_MANAGER',
                       scheduledStartDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            scheduledEndDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
           isCompleted: true,
           alertPriority: 'MEDIUM',
           assignedToId: users[2].id, // Project Manager
           workflowId: workflow.id
         },
                            {
           stepId: 'write_estimate',
           stepName: 'Write Estimate',
           phase: 'PROSPECT',
           description: 'Write estimate and prepare proposal',
           estimatedDuration: 5,
           defaultResponsible: 'PROJECT_MANAGER',
           scheduledStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
           scheduledEndDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
           isCompleted: i < 2, // Only first 2 projects have this completed
           alertPriority: 'MEDIUM',
           assignedToId: users[2].id, // Project Manager
           workflowId: workflow.id
         },
               {
           stepId: 'agreement_signing',
           stepName: 'Agreement Signing',
           phase: 'APPROVED',
           description: 'Review and sign agreement',
           estimatedDuration: 2,
           defaultResponsible: 'ADMINISTRATION',
                       scheduledStartDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            scheduledEndDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
           isCompleted: i < 2,
           alertPriority: 'HIGH',
           assignedToId: users[1].id, // Admin
           workflowId: workflow.id
         },
               {
           stepId: 'installation',
           stepName: 'Installation',
           phase: 'EXECUTION',
           description: 'Install roofing materials and components',
           estimatedDuration: 2,
           defaultResponsible: 'FIELD_DIRECTOR',
                       scheduledStartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            scheduledEndDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
           isCompleted: false,
           alertPriority: 'MEDIUM',
           assignedToId: users[5].id, // Field Director
           workflowId: workflow.id
         },
               {
           stepId: 'quality_check',
           stepName: 'Quality Check',
           phase: 'EXECUTION',
           description: 'Conduct quality inspection and completion photos',
           estimatedDuration: 4,
           defaultResponsible: 'ROOF_SUPERVISOR',
                       scheduledStartDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            scheduledEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
           isCompleted: false,
           alertPriority: 'HIGH',
           assignedToId: users[4].id, // Roof Supervisor
           workflowId: workflow.id
         },
               {
           stepId: 'project_closeout',
           stepName: 'Project Closeout',
           phase: 'COMPLETION',
           description: 'Complete project documentation and closeout',
           estimatedDuration: 2,
           defaultResponsible: 'OFFICE',
                       scheduledStartDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            scheduledEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
           isCompleted: false,
           alertPriority: 'HIGH',
           assignedToId: users[0].id, // Office
           workflowId: workflow.id
         },
               {
           stepId: 'financial_processing',
           stepName: 'Financial Processing',
           phase: 'COMPLETION',
           description: 'Process final invoices and payments',
           estimatedDuration: 3,
           defaultResponsible: 'ADMINISTRATION',
                       scheduledStartDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            scheduledEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
           isCompleted: false,
           alertPriority: 'MEDIUM',
           assignedToId: users[1].id, // Admin
           workflowId: workflow.id
         }
    ];

    for (const stepData of workflowSteps) {
      const step = await prisma.workflowStep.create({
        data: stepData
      });
      steps.push(step);
    }
  }

  console.log(`✅ Created ${steps.length} workflow steps`);

  // Create workflow subtasks
  console.log('📝 Creating workflow subtasks...');
  const subtasks = [];
  
  for (const step of steps) {
              const subtaskData = [
        {
          subTaskId: 'initial_assessment',
          subTaskName: 'Initial Assessment',
          description: 'Conduct initial assessment of requirements',
          isCompleted: step.isCompleted,
          stepId: step.id
        },
        {
          subTaskId: 'documentation',
          subTaskName: 'Documentation',
          description: 'Complete required documentation',
          isCompleted: step.isCompleted,
          stepId: step.id
        },
        {
          subTaskId: 'quality_check',
          subTaskName: 'Quality Check',
          description: 'Perform quality control check',
          isCompleted: step.isCompleted,
          stepId: step.id
        },
        {
          subTaskId: 'final_review',
          subTaskName: 'Final Review',
          description: 'Conduct final review and approval',
          isCompleted: step.isCompleted,
          stepId: step.id
        }
    ];

    for (const subtask of subtaskData) {
      const createdSubtask = await prisma.workflowSubTask.create({
        data: subtask
      });
      subtasks.push(createdSubtask);
    }
  }

  console.log(`✅ Created ${subtasks.length} workflow subtasks`);

  // Create notifications/alerts
  console.log('🔔 Creating notifications and alerts...');
  const notifications = [];
  
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const workflow = workflows[i];
    const customer = customers[i];
    
    // Create overdue alerts for incomplete steps
    const incompleteSteps = steps.filter(step => 
      step.workflowId === workflow.id && !step.isCompleted
    );

    for (const step of incompleteSteps) {
      const alertData = {
        title: `Workflow Alert: ${step.stepName}`,
        message: `${step.stepName} for ${project.projectName} is due in 2 days (0/4 sub-tasks complete)! Complete this task to proceed with the project`,
        type: 'WORKFLOW_ALERT',
        isRead: false,
        recipientId: step.assignedToId,
        actionUrl: `/projects/${project.id}/workflow`,
        actionData: {
          phase: step.phase,
          stepId: step.id,
          stepName: step.stepName,
          workflowId: workflow.id,
          daysOverdue: 2,
          projectName: project.projectName,
          daysUntilDue: 0,
          cleanTaskName: step.stepName.toLowerCase().replace(/\s+/g, ' ')
        }
      };

      const notification = await prisma.notification.create({
        data: alertData
      });
      notifications.push(notification);
    }
  }

  console.log(`✅ Created ${notifications.length} notifications`);

  console.log('🎉 Database seeding completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Customers: ${customers.length}`);
  console.log(`   - Projects: ${projects.length}`);
  console.log(`   - Team Members: ${teamMembers.length}`);
  console.log(`   - Workflows: ${workflows.length}`);
  console.log(`   - Workflow Steps: ${steps.length}`);
  console.log(`   - Workflow Subtasks: ${subtasks.length}`);
  console.log(`   - Notifications: ${notifications.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
