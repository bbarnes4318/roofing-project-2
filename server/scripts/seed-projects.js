const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const projectService = require('../services/projectService');

// Realistic Colorado addresses
const coloradoAddresses = [
  { street: '1234 Mountain View Dr', city: 'Denver', state: 'CO', zip: '80202' },
  { street: '5678 Aspen Ridge Ln', city: 'Boulder', state: 'CO', zip: '80301' },
  { street: '9012 Pine Creek Rd', city: 'Colorado Springs', state: 'CO', zip: '80903' },
  { street: '3456 Summit Peak Way', city: 'Fort Collins', state: 'CO', zip: '80521' },
  { street: '7890 Red Rock Blvd', city: 'Lakewood', state: 'CO', zip: '80226' },
  { street: '2345 Alpine Meadows Ct', city: 'Aurora', state: 'CO', zip: '80012' },
  { street: '6789 Valley Vista Dr', city: 'Centennial', state: 'CO', zip: '80111' },
  { street: '1357 Canyon Ridge Pl', city: 'Westminster', state: 'CO', zip: '80031' },
  { street: '2468 Deer Trail Ave', city: 'Arvada', state: 'CO', zip: '80002' },
  { street: '9753 Eagle Nest Ln', city: 'Littleton', state: 'CO', zip: '80120' },
  { street: '8642 Riverstone Dr', city: 'Parker', state: 'CO', zip: '80134' },
  { street: '7531 Meadowbrook Way', city: 'Castle Rock', state: 'CO', zip: '80109' },
  { street: '4826 Highland Park Blvd', city: 'Highlands Ranch', state: 'CO', zip: '80126' },
  { street: '3915 Wildflower Ct', city: 'Thornton', state: 'CO', zip: '80229' },
  { street: '6248 Sunset Ridge Dr', city: 'Broomfield', state: 'CO', zip: '80020' },
  { street: '5137 Silver Fox Run', city: 'Commerce City', state: 'CO', zip: '80022' },
  { street: '8259 Blue Sky Way', city: 'Englewood', state: 'CO', zip: '80110' },
  { street: '9371 Forest Glen Rd', city: 'Wheat Ridge', state: 'CO', zip: '80033' },
  { street: '7462 Prairie Wind Ln', city: 'Greenwood Village', state: 'CO', zip: '80111' },
  { street: '4583 Mountain Shadow Dr', city: 'Golden', state: 'CO', zip: '80401' }
];

// Realistic customer names
const customerNames = [
  { first: 'John', last: 'Anderson' },
  { first: 'Sarah', last: 'Thompson' },
  { first: 'Michael', last: 'Rodriguez' },
  { first: 'Jennifer', last: 'Williams' },
  { first: 'Robert', last: 'Johnson' },
  { first: 'Emily', last: 'Davis' },
  { first: 'David', last: 'Martinez' },
  { first: 'Lisa', last: 'Brown' },
  { first: 'James', last: 'Wilson' },
  { first: 'Maria', last: 'Garcia' },
  { first: 'William', last: 'Taylor' },
  { first: 'Patricia', last: 'Moore' },
  { first: 'Richard', last: 'Jackson' },
  { first: 'Linda', last: 'White' },
  { first: 'Charles', last: 'Harris' },
  { first: 'Barbara', last: 'Clark' },
  { first: 'Joseph', last: 'Lewis' },
  { first: 'Susan', last: 'Walker' },
  { first: 'Thomas', last: 'Hall' },
  { first: 'Karen', last: 'Allen' }
];

// Realistic message subjects and content
const messageTemplates = [
  {
    subject: 'Initial Inspection Scheduled',
    contents: [
      'We have scheduled your initial roof inspection for {date} at {time}. Our project manager will assess the condition and provide recommendations.',
      'Please ensure someone is available at the property during the inspection window. The process typically takes 1-2 hours.',
      'If you need to reschedule, please contact us at least 24 hours in advance.'
    ]
  },
  {
    subject: 'Material Selection',
    contents: [
      'Please review the attached shingle samples and color options for your roofing project.',
      'We recommend the Owens Corning Duration shingles in Estate Gray based on your home\'s architecture.',
      'The upgraded Class 4 impact-resistant shingles are available for an additional $1,200.',
      'Please confirm your selection by end of week so we can place the material order.'
    ]
  },
  {
    subject: 'Insurance Claim Update',
    contents: [
      'Good news! Your insurance company has approved the claim for full roof replacement.',
      'The approved amount is $18,500 with a $1,000 deductible.',
      'We will handle all supplemental negotiations if additional damage is found during tear-off.',
      'Please send us a copy of the approval letter for our records.'
    ]
  },
  {
    subject: 'Project Timeline',
    contents: [
      'Your roofing project is scheduled to begin on {date}.',
      'Weather permitting, the installation will take 2-3 days to complete.',
      'Day 1: Tear-off and deck inspection\nDay 2: Installation of underlayment and shingles\nDay 3: Ridge caps, flashing, and final cleanup',
      'We will notify you immediately if weather causes any delays.'
    ]
  },
  {
    subject: 'Permit Approved',
    contents: [
      'The building permit for your roofing project has been approved by the city.',
      'Permit #2024-ROOF-{number} is posted and visible from the street.',
      'All required inspections have been scheduled with the building department.',
      'This permit is valid for 6 months from the issue date.'
    ]
  },
  {
    subject: 'Additional Work Discovered',
    contents: [
      'During tear-off, we discovered some decking that needs replacement.',
      'Approximately 200 sq ft of plywood shows water damage and rot.',
      'The cost for replacement is $4.50 per sq ft ($900 total).',
      'Please approve this additional work so we can proceed without delays.',
      'Photos of the damaged areas have been uploaded to your project file.'
    ]
  },
  {
    subject: 'Weather Delay Notice',
    contents: [
      'Due to the forecasted storms this week, we need to postpone your installation.',
      'Your new start date is {date}, weather permitting.',
      'All materials have been delivered and secured on-site.',
      'We apologize for the inconvenience and appreciate your understanding.'
    ]
  },
  {
    subject: 'Quality Inspection Complete',
    contents: [
      'Our quality control manager has completed the final inspection of your new roof.',
      'All work meets or exceeds manufacturer specifications and building codes.',
      'A few minor touch-ups were identified and completed today.',
      'Your warranty documentation will be mailed within 5 business days.'
    ]
  },
  {
    subject: 'Payment Reminder',
    contents: [
      'This is a friendly reminder that your second payment of ${amount} is due.',
      'You can pay online through our secure portal or mail a check.',
      'Please reference invoice #{invoice} with your payment.',
      'Thank you for choosing us for your roofing needs!'
    ]
  },
  {
    subject: 'Warranty Registration',
    contents: [
      'Your new roof has been registered with the manufacturer for warranty coverage.',
      'Registration #: {number}\nCoverage: 50-year limited lifetime',
      'Please keep this information with your important documents.',
      'We also provide a 10-year workmanship warranty on the installation.'
    ]
  }
];

// Function to generate phone number
function generatePhoneNumber() {
  const areaCodes = ['303', '720', '719', '970'];
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const prefix = Math.floor(Math.random() * 900) + 100;
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${prefix}-${suffix}`;
}

// Function to generate project number (5-digit)
function generateProjectNumber(index) {
  // Generate a unique 5-digit number using timestamp + index
  const timestamp = Date.now();
  const baseNumber = 20000 + index * 100;
  return baseNumber + (timestamp % 100);
}

// Function to get random date in past 90 days
function getRandomPastDate(daysAgo = 90) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

// Function to get random future date
function getRandomFutureDate(daysAhead = 60) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead));
  return date;
}

async function seedProjects() {
  try {
    console.log('Starting to seed projects...');

    // Get or create users for assignments
    let projectManager = await prisma.user.findFirst({
      where: { email: 'pm@company.com' }
    });

    if (!projectManager) {
      projectManager = await prisma.user.create({
        data: {
          email: 'pm@company.com',
          password: 'password123',
          firstName: 'Mike',
          lastName: 'Johnson',
          role: 'PROJECT_MANAGER',
          phone: '303-555-0001'
        }
      });
    }

    let officeUser = await prisma.user.findFirst({
      where: { email: 'office@company.com' }
    });

    if (!officeUser) {
      officeUser = await prisma.user.create({
        data: {
          email: 'office@company.com',
          password: 'password123',
          firstName: 'Sarah',
          lastName: 'Smith',
          role: 'ADMIN',
          phone: '303-555-0002'
        }
      });
    }

    // Define phase distribution based on target percentages:
    // Lead: 10%, Prospect: 25%, Approved: 25%, Execution: 25%, Supplement: 10%, Completion: 5%
    const phaseDistribution = [
      { phase: 'LEAD', count: 2 },        // 10% of 20 = 2
      { phase: 'PROSPECT', count: 5 },    // 25% of 20 = 5  
      { phase: 'APPROVED', count: 5 },    // 25% of 20 = 5
      { phase: 'EXECUTION', count: 5 },   // 25% of 20 = 5
      { phase: '2ND_SUPP', count: 2 },    // 10% of 20 = 2
      { phase: 'COMPLETION', count: 1 }   // 5% of 20 = 1
    ];
    
    // Create phase assignment array
    const phaseAssignments = [];
    phaseDistribution.forEach(({ phase, count }) => {
      for (let i = 0; i < count; i++) {
        phaseAssignments.push(phase);
      }
    });
    
    // Shuffle the phase assignments to distribute randomly
    for (let i = phaseAssignments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [phaseAssignments[i], phaseAssignments[j]] = [phaseAssignments[j], phaseAssignments[i]];
    }

    // Create projects
    for (let i = 0; i < 20; i++) {
      const customer = customerNames[i];
      const address = coloradoAddresses[i];
      const projectNumber = generateProjectNumber(i);
      const phase = phaseAssignments[i];
      
      // Create or find customer
      const customerEmail = `${customer.first.toLowerCase()}.${customer.last.toLowerCase()}@email.com`;
      const customerPhone = generatePhoneNumber();
      
      let createdCustomer = await prisma.customer.findUnique({
        where: { primaryEmail: customerEmail }
      });

      if (!createdCustomer) {
        createdCustomer = await prisma.customer.create({
          data: {
            primaryName: `${customer.first} ${customer.last}`,
            primaryEmail: customerEmail,
            primaryPhone: customerPhone,
            address: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
            notes: `Insurance: ${['State Farm', 'Allstate', 'USAA', 'Farmers', 'Progressive'][Math.floor(Math.random() * 5)]}\nClaim #: ${Math.floor(Math.random() * 900000) + 100000}`,
            // Add secondary customer for some projects (30% chance)
            ...(Math.random() < 0.3 ? {
              secondaryName: `${customerNames[(i + 5) % 20].first} ${customer.last}`,
              secondaryEmail: `${customerNames[(i + 5) % 20].first.toLowerCase()}.${customer.last.toLowerCase()}@email.com`,
              secondaryPhone: generatePhoneNumber()
            } : {})
          }
        });
      }

      // Create project
      const estimateValue = Math.floor(Math.random() * 25000) + 10000;
      const startDate = getRandomPastDate(30);
      const endDate = getRandomFutureDate(30);
      
      const project = await prisma.project.create({
        data: {
          projectNumber: projectNumber, // Already an integer
          projectName: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
          projectType: 'ROOF_REPLACEMENT',
          customerId: createdCustomer.id,
          status: phase === 'COMPLETION' ? 'COMPLETED' : 'IN_PROGRESS',
          priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
          description: `Complete roof replacement for ${customer.first} ${customer.last}. ${['Hail damage', 'Wind damage', 'Age-related wear', 'Storm damage'][Math.floor(Math.random() * 4)]} claim.`,
          startDate: startDate,
          endDate: endDate,
          budget: estimateValue,
          estimatedCost: estimateValue,
          actualCost: phase === 'COMPLETION' ? estimateValue * 0.95 : null,
          progress: phase === 'COMPLETION' ? 100 : Math.floor(Math.random() * 80) + 10,
          notes: `Roof Type: ${['Asphalt Shingle', 'Tile', 'Metal', 'Flat/TPO'][Math.floor(Math.random() * 4)]}\nRoof Pitch: ${Math.floor(Math.random() * 8) + 4}/12\nSquares: ${Math.floor(Math.random() * 30) + 15}\nStories: ${Math.floor(Math.random() * 2) + 1}\nTrades: ${['Roofing', 'Gutters', 'Siding', 'Windows'].slice(0, Math.floor(Math.random() * 3) + 1).join(', ')}`,
          pmPhone: projectManager.phone,
          pmEmail: projectManager.email,
          projectManagerId: projectManager.id
        }
      });

      // Create workflow for project using projectService
      await projectService.createDefaultWorkflow(project.id);
      
      // Fetch the created workflow with steps
      const workflow = await prisma.projectWorkflow.findFirst({
        where: { projectId: project.id },
        include: {
          steps: {
            include: {
              subTasks: true
            },
            orderBy: { stepId: 'asc' }
          }
        }
      });
      
      // Complete workflow steps based on project's progress within its current phase
      if (workflow && workflow.steps.length > 0) {
        // Find which steps belong to the current phase
        const phaseSteps = workflow.steps.filter(step => step.phase === phase);
        
        if (phaseSteps.length > 0) {
          // Calculate how many steps within this phase to complete based on project progress
          const progressRatio = project.progress / 100;
          const stepsToCompleteInPhase = Math.floor(phaseSteps.length * progressRatio);
          
          // Also need to complete all steps from previous phases
          const phaseOrder = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', '2ND_SUPP', 'COMPLETION'];
          const currentPhaseIndex = phaseOrder.indexOf(phase);
          
          // Mark all steps from previous phases as completed
          for (let phaseIdx = 0; phaseIdx < currentPhaseIndex; phaseIdx++) {
            const previousPhaseSteps = workflow.steps.filter(step => step.phase === phaseOrder[phaseIdx]);
            for (const step of previousPhaseSteps) {
              await prisma.workflowStep.update({
                where: { id: step.id },
                data: {
                  isCompleted: true,
                  completedAt: new Date(),
                  completedById: officeUser.id
                }
              });
              
              // Complete all subtasks for this step
              if (step.subTasks && step.subTasks.length > 0) {
                for (const subTask of step.subTasks) {
                  await prisma.workflowSubTask.update({
                    where: { id: subTask.id },
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
          
          // Mark steps within current phase as completed based on progress
          for (let i = 0; i < stepsToCompleteInPhase && i < phaseSteps.length; i++) {
            const step = phaseSteps[i];
            await prisma.workflowStep.update({
              where: { id: step.id },
              data: {
                isCompleted: true,
                completedAt: new Date(),
                completedById: officeUser.id
              }
            });
            
            // Complete all subtasks for this step
            if (step.subTasks && step.subTasks.length > 0) {
              for (const subTask of step.subTasks) {
                await prisma.workflowSubTask.update({
                  where: { id: subTask.id },
                  data: {
                    isCompleted: true,
                    completedAt: new Date(),
                    completedById: officeUser.id
                  }
                });
              }
            }
          }
          
          // Update workflow current step index
          const allCompletedSteps = workflow.steps.filter(step => {
            const stepPhaseIndex = phaseOrder.indexOf(step.phase);
            if (stepPhaseIndex < currentPhaseIndex) return true;
            if (stepPhaseIndex === currentPhaseIndex) {
              const stepIndexInPhase = phaseSteps.findIndex(s => s.id === step.id);
              return stepIndexInPhase < stepsToCompleteInPhase;
            }
            return false;
          });
          
          const nextIncompleteStep = workflow.steps.find(step => {
            const stepPhaseIndex = phaseOrder.indexOf(step.phase);
            if (stepPhaseIndex < currentPhaseIndex) return false;
            if (stepPhaseIndex === currentPhaseIndex) {
              const stepIndexInPhase = phaseSteps.findIndex(s => s.id === step.id);
              return stepIndexInPhase >= stepsToCompleteInPhase;
            }
            return true;
          });
          
          await prisma.projectWorkflow.update({
            where: { id: workflow.id },
            data: {
              currentStepIndex: nextIncompleteStep ? workflow.steps.findIndex(s => s.id === nextIncompleteStep.id) : workflow.steps.length - 1,
              overallProgress: project.progress,
              status: phase === 'COMPLETION' && project.progress === 100 ? 'COMPLETED' : 'IN_PROGRESS'
            }
          });
        }
      }

      // Create project conversation for messages
      const conversation = await prisma.conversation.create({
        data: {
          title: `Project #${project.projectNumber} - ${customer.first} ${customer.last}`,
          description: `Messages for ${project.projectName}`,
          isGroup: true
        }
      });

      // Add users to conversation
      await prisma.conversationParticipant.createMany({
        data: [
          {
            conversationId: conversation.id,
            userId: projectManager.id,
            role: 'MEMBER',
            joinedAt: new Date()
          },
          {
            conversationId: conversation.id,
            userId: officeUser.id,
            role: 'ADMIN',
            joinedAt: new Date()
          }
        ]
      });

      // Create messages for this project (5-10 messages per project)
      const messageCount = Math.floor(Math.random() * 6) + 5;
      const users = [projectManager, officeUser];
      
      for (let j = 0; j < messageCount; j++) {
        const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        const messageDate = getRandomPastDate(60);
        
        // Create main message
        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            text: `**${template.subject}**\n\n${template.contents[0]
              .replace('{date}', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString())
              .replace('{time}', ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'][Math.floor(Math.random() * 4)])
              .replace('{number}', Math.floor(Math.random() * 9000) + 1000)
              .replace('{amount}', (estimateValue * 0.5).toFixed(2))
              .replace('{invoice}', projectNumber + '-01')}`,
            messageType: 'TEXT',
            createdAt: messageDate
          }
        });

        // Add replies to some messages (30% chance)
        if (Math.random() < 0.3 && template.contents.length > 1) {
          for (let k = 1; k < Math.min(template.contents.length, 3); k++) {
            const replyUser = users[Math.floor(Math.random() * users.length)];
            const replyDate = new Date(messageDate);
            replyDate.setHours(replyDate.getHours() + k * 2);
            
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                senderId: replyUser.id,
                replyToId: message.id,
                text: template.contents[k],
                messageType: 'TEXT',
                createdAt: replyDate
              }
            });
          }
        }
      }

      // Create some tasks for the project
      const taskTitles = [
        'Complete initial roof inspection',
        'Submit insurance claim documentation',
        'Order materials from supplier',
        'Schedule installation crew',
        'Pull building permits',
        'Conduct final quality inspection'
      ];

      for (let k = 0; k < 3; k++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) + 7);
        
        await prisma.task.create({
          data: {
            projectId: project.id,
            title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
            description: `Task for ${project.projectName}`,
            dueDate: dueDate,
            priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
            status: ['TO_DO', 'IN_PROGRESS', 'DONE'][Math.floor(Math.random() * 3)],
            assignedToId: users[Math.floor(Math.random() * users.length)].id,
            createdById: officeUser.id
          }
        });
      }

      console.log(`Created project ${i + 1}: ${project.projectNumber} - ${project.projectName}`);
    }

    console.log('Successfully seeded 20 projects with messages and activities!');
  } catch (error) {
    console.error('Error seeding projects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedProjects();