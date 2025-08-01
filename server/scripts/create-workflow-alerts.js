const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createWorkflowAlerts() {
  try {
    console.log('Creating workflow alerts for all projects...');

    // Get all projects
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        workflow: true
      }
    });

    console.log(`Found ${projects.length} projects`);

    // Get users to assign alerts to
    const users = await prisma.user.findMany();
    if (users.length === 0) {
      console.error('No users found!');
      return;
    }

    // Workflow steps for each phase
    const workflowSteps = {
      'LEAD': [
        'Make sure the name is spelled correctly',
        'Make sure the email is correct. Send a confirmation email to confirm email.',
        'Input answers from Question Checklist into notes',
        'Record property details',
        'Add Home View photos – Maps',
        'Add Street View photos – Google Maps',
        'Add elevation screenshot – PPRBD',
        'Add property age – County Assessor Website',
        'Evaluate ladder requirements – By looking at the room',
        'Use workflow from Lead Assigning Flowchart',
        'Select and brief the Project Manager',
        'Call Customer and coordinate with PM schedule',
        'Create Calendar Appointment in AL'
      ],
      'PROSPECT': [
        'Take site photos',
        'Complete inspection form',
        'Document material colors',
        'Capture Hover photos',
        'Present upgrade options',
        'Fill out Estimate Form',
        'Write initial estimate – AccuLynx',
        'Write Customer Pay Estimates',
        'Send for Approval',
        'Compare field vs insurance estimates',
        'Identify supplemental items',
        'Draft estimate in Xactimate',
        'Trade cost analysis',
        'Prepare Estimate Forms',
        'Match AL estimates',
        'Calculate customer pay items',
        'Send shingle/class4 email – PDF',
        'Review and send signature request',
        'Record in QuickBooks',
        'Process deposit',
        'Collect signed disclaimers'
      ],
      'APPROVED': [
        'Confirm shingle choice',
        'Order materials',
        'Create labor orders',
        'Send labor order to roofing crew',
        'Pull permits',
        'All pictures in Job (Gutter, Ventilation, Elevation)',
        'Verify Labor Order in Scheduler',
        'Verify Material Orders',
        'Subcontractor Work'
      ],
      'EXECUTION': [
        'Document work start',
        'Capture progress photos',
        'Daily Job Progress Note',
        'Upload Pictures',
        'Completion photos – Roof Supervisor',
        'Complete inspection – Roof Supervisor',
        'Upload Roof Packet',
        'Verify Packet is complete – Admin',
        'Confirm start date',
        'Confirm material/labor for all trades',
        'Coordinate with subcontractors',
        'Verify subcontractor permits'
      ],
      '2ND_SUPP': [
        'Assess additional damage',
        'Document supplement needs',
        'Prepare supplement estimate',
        'Execute additional scope',
        'Document additional work',
        'Update completion status'
      ],
      'COMPLETION': [
        'Final inspection completed',
        'Customer walkthrough',
        'Submit warranty information',
        'Process final payment',
        'Send satisfaction survey',
        'Collect customer feedback',
        'Update customer records'
      ]
    };

    let alertsCreated = 0;

    // For each project, create 3-8 workflow alerts
    for (const project of projects) {
      const phase = project.status || 'IN_PROGRESS';
      const phaseKey = phase === 'IN_PROGRESS' ? 'EXECUTION' : 
                      phase === 'COMPLETED' ? 'COMPLETION' :
                      phase === 'PENDING' ? 'LEAD' : 'APPROVED';
      
      const steps = workflowSteps[phaseKey] || workflowSteps['LEAD'];
      
      // Create 3-8 random alerts per project
      const alertCount = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < alertCount; i++) {
        const randomStep = steps[Math.floor(Math.random() * steps.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        // Create alert with realistic data
        const alert = {
          title: `${randomStep} - ${project.customer.primaryName}`,
          message: `${randomStep} is required for project #${project.projectNumber} at ${project.projectName}`,
          type: 'WORKFLOW_ALERT',
          priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
          status: 'ACTIVE',
          recipientId: randomUser.id,
          dueDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000), // Due within 2 weeks
          metadata: {
            projectId: project.id,
            projectNumber: project.projectNumber,
            projectName: project.projectName,
            customerName: project.customer.primaryName,
            customerPhone: project.customer.primaryPhone,
            customerEmail: project.customer.primaryEmail,
            address: project.projectName,
            stepName: randomStep,
            phase: phaseKey,
            workflowId: project.workflow?.id || null,
            assignedTo: randomUser.firstName + ' ' + randomUser.lastName,
            defaultResponsible: ['OFFICE', 'ADMINISTRATION', 'PROJECT_MANAGER', 'FIELD_DIRECTOR'][Math.floor(Math.random() * 4)]
          },
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Created within last week
        };

        try {
          await prisma.notification.create({
            data: {
              title: alert.title,
              message: alert.message,
              type: alert.type,
              recipientId: alert.recipientId,
              isRead: false,
              actionData: alert.metadata,
              createdAt: alert.createdAt
            }
          });
          alertsCreated++;
        } catch (error) {
          // Skip if duplicate
          if (!error.message.includes('Unique constraint')) {
            console.error('Error creating notification:', error.message);
          }
        }
      }
    }

    console.log(`Successfully created ${alertsCreated} workflow alerts!`);
    console.log('Current Alerts section should now show many alerts.');

  } catch (error) {
    console.error('Error creating workflow alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createWorkflowAlerts();