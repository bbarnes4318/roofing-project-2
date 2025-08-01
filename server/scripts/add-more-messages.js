const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Expanded message templates for more variety
const messageTemplates = [
  // Customer Communications
  {
    subject: 'Question about shingle color',
    contents: [
      'Hi, I was looking at the shingle samples again and I\'m torn between Estate Gray and Charcoal. Which would you recommend for our home style?',
      'Great question! For your colonial-style home with the brick accents, I\'d recommend the Estate Gray. It provides nice contrast without being too dark.',
      'That makes sense. Let\'s go with Estate Gray then. Thanks for the advice!'
    ]
  },
  {
    subject: 'Concerns about weather forecast',
    contents: [
      'I see there\'s rain in the forecast for next week. Will this affect our installation schedule?',
      'We\'re monitoring the weather closely. Light rain won\'t affect us, but if heavy storms are predicted, we may need to adjust by a day or two.',
      'I appreciate the update. Please keep me informed if any changes are needed.'
    ]
  },
  {
    subject: 'Dumpster placement',
    contents: [
      'Where will the dumpster be placed? I\'m concerned about our driveway and landscaping.',
      'We\'ll place it on the street if possible, or use plywood to protect your driveway. We always avoid landscaping areas.',
      'Perfect, thank you for being considerate of our property.'
    ]
  },
  // Project Updates
  {
    subject: 'Day 1 Progress Update',
    contents: [
      'Great progress today! We completed the tear-off of the old shingles and inspected the decking. Found a few areas that need replacement as discussed.',
      'Thanks for the update. How much additional cost for the decking replacement?',
      'As quoted, it\'s $4.50 per sq ft. We found approximately 150 sq ft that needs replacement, so $675 total.',
      'That\'s reasonable. Please proceed with the repairs.'
    ]
  },
  {
    subject: 'Materials delivered',
    contents: [
      'All materials have been delivered and secured on site. We\'re ready to begin installation tomorrow morning at 7:30 AM.',
      'Great! Will someone be supervising the crew?',
      'Yes, our lead foreman Jose will be on-site the entire time. He has 15 years of experience.'
    ]
  },
  {
    subject: 'Unexpected damage found',
    contents: [
      'During tear-off, we discovered some termite damage on the fascia boards. Sending photos now.',
      'Oh no! How bad is it? What are our options?',
      'It\'s localized to about 20 feet of fascia. We can replace it for $450, or you can have a carpenter handle it separately.',
      'Please go ahead and replace it. Better to handle it all at once.'
    ]
  },
  // Technical Discussions
  {
    subject: 'Ventilation recommendations',
    contents: [
      'Based on your attic size, I recommend adding 4 more roof vents for proper ventilation. This will help prevent ice dams and extend shingle life.',
      'What\'s the cost for the additional vents?',
      'It\'s $125 per vent installed, so $500 total. This includes the vents, installation, and proper flashing.',
      'That sounds like a good investment. Please add them.'
    ]
  },
  {
    subject: 'Gutter assessment',
    contents: [
      'While we\'re up there, we noticed your gutters have some issues. Several sections are pulling away from the fascia.',
      'Can you fix them or do I need a gutter company?',
      'We can re-secure them for $200, but they\'re pretty old. You might want to consider replacement in the next year or two.',
      'Let\'s re-secure them for now. I\'ll budget for new gutters next year.'
    ]
  },
  {
    subject: 'Satellite dish relocation',
    contents: [
      'We need to temporarily remove your satellite dish. Do you want us to reinstall it in the same location?',
      'Actually, can you move it to a less visible spot?',
      'Sure, we can mount it on the back slope where it won\'t be seen from the street. No extra charge.',
      'That would be perfect, thank you!'
    ]
  },
  // Insurance Related
  {
    subject: 'Supplement approved',
    contents: [
      'Great news! The insurance company approved our supplement for the additional damage. You won\'t owe anything extra.',
      'That\'s a relief! How much did they approve?',
      'They approved an additional $3,200 for the decking replacement and upgraded ice & water shield.',
      'Excellent. Thanks for handling that negotiation.'
    ]
  },
  {
    subject: 'Insurance inspection scheduled',
    contents: [
      'Your insurance adjuster wants to do a final inspection. They\'re available Thursday at 2 PM.',
      'I can\'t make Thursday. Is Friday possible?',
      'Let me check... Yes, they can do Friday at 10 AM. Does that work?',
      'Friday at 10 AM is perfect. I\'ll be there.'
    ]
  },
  {
    subject: 'Depreciation check',
    contents: [
      'Don\'t forget to send the completion certificate to your insurance for the depreciation check.',
      'How do I do that? This is my first claim.',
      'Just email them the completion certificate and final invoice. They should release the held-back depreciation within 30 days.',
      'Thanks for the reminder. I\'ll send it today.'
    ]
  },
  // Scheduling
  {
    subject: 'Crew running early',
    contents: [
      'Good news! We finished another job early. Can we start your roof tomorrow instead of Monday?',
      'Tomorrow works great! What time?',
      'We\'ll arrive at 7:30 AM. Please make sure cars are out of the driveway.',
      'Will do. Looking forward to getting started!'
    ]
  },
  {
    subject: 'Weather delay update',
    contents: [
      'Unfortunately, the storm system is moving slower than expected. We need to push back to Thursday.',
      'That\'s frustrating but I understand. Will this affect the completion date?',
      'We\'ll work Saturday to stay on schedule. You\'ll still be done by end of week.',
      'I appreciate you making up the time. See you Thursday.'
    ]
  },
  {
    subject: 'Final inspection time',
    contents: [
      'We\'re wrapping up the final details. Can you do a walk-through inspection at 4 PM today?',
      'I won\'t be home until 5:30. Is that too late?',
      'That works fine. I\'ll meet you at 5:30 for the final inspection.',
      'Perfect. See you then.'
    ]
  },
  // Quality and Warranty
  {
    subject: 'Workmanship warranty details',
    contents: [
      'Your 10-year workmanship warranty is now active. Keep this email for your records.',
      'What exactly does the warranty cover?',
      'It covers any installation defects, leaks due to improper installation, and flashing issues. Normal wear is covered by the manufacturer warranty.',
      'Great, thanks for clarifying. I\'ll file this with my important documents.'
    ]
  },
  {
    subject: 'Photo documentation',
    contents: [
      'I\'ve uploaded all progress photos to your project file. You can access them anytime for insurance or resale purposes.',
      'This is great! Can I get high-resolution copies?',
      'Absolutely. I\'ll email you a Dropbox link with all high-res photos by end of day.',
      'Much appreciated. These will be helpful for our records.'
    ]
  },
  {
    subject: 'Six-month follow-up',
    contents: [
      'Just checking in 6 months after your roof installation. Any issues or concerns?',
      'Everything looks great! We had some heavy storms last month and no problems at all.',
      'Excellent! Remember, we offer free annual inspections. Would you like to schedule one?',
      'Yes, let\'s schedule for next month. Thanks for following up!'
    ]
  },
  // Payment and Financial
  {
    subject: 'Payment plan options',
    contents: [
      'As discussed, we offer 0% financing for 12 months through our partner. Are you interested?',
      'What\'s the application process like?',
      'It\'s a simple 5-minute online application. Most approvals are instant. I can send you the link.',
      'Please send it. I\'d like to preserve my cash flow.'
    ]
  },
  {
    subject: 'Final invoice',
    contents: [
      'I\'ve attached the final invoice. The total matches our contract with the approved additions.',
      'I see the total. When is payment due?',
      'Payment is due upon completion, but you have 5 business days. We accept check, card, or ACH.',
      'I\'ll send an ACH transfer tomorrow. Thanks for the great work!'
    ]
  },
  {
    subject: 'Referral program',
    contents: [
      'Thanks again for choosing us! We offer $200 for each referral that becomes a customer.',
      'That\'s great! My neighbor was asking about our roof. Can I give them your number?',
      'Absolutely! Have them mention your name and we\'ll credit you once their project is complete.',
      'Will do. You guys did such a great job, happy to refer others.'
    ]
  },
  // Specific Issues
  {
    subject: 'Permit approved',
    contents: [
      'Good news - the city approved our permit this morning. We\'re all set to begin.',
      'That was faster than expected! Did they have any special requirements?',
      'Just need to keep the permit posted and visible. I\'ll laminate it and post it on your front window.',
      'Sounds good. Thanks for handling all the paperwork.'
    ]
  },
  {
    subject: 'Color match concern',
    contents: [
      'I noticed the new shingles look slightly different than the sample. Is this normal?',
      'Yes, new shingles often look different than weathered samples. They\'ll mellow out in a few weeks.',
      'OK, that makes sense. Just wanted to make sure we got the right color.',
      'Definitely the right color. I double-checked the order. Give it 30 days and you\'ll see the true color.'
    ]
  },
  {
    subject: 'Cleanup reminder',
    contents: [
      'We\'ll do final cleanup tomorrow including magnetic sweep for nails. Anything specific you want us to focus on?',
      'Please be extra careful around the kids\' play area and the garden beds.',
      'Absolutely. We\'ll do an extra thorough sweep in those areas and hand-pick any debris from the gardens.',
      'Thank you for being so thorough. Safety is our top priority.'
    ]
  },
  // Neighbor Relations
  {
    subject: 'Neighbor complaint',
    contents: [
      'Your neighbor stopped by concerned about debris in their yard. We\'re addressing it immediately.',
      'Oh no! I hope they weren\'t too upset. Which neighbor?',
      'The house to the north. We\'re cleaning their yard now and I personally apologized. All good now.',
      'Thanks for handling that professionally. I\'ll touch base with them too.'
    ]
  },
  {
    subject: 'Street parking',
    contents: [
      'Quick heads up - we\'ll need to park a material truck on the street tomorrow for about 2 hours.',
      'Will it block the neighbors\' driveways?',
      'No, we\'ll make sure all driveways remain accessible. Just wanted you to be aware.',
      'Thanks for the notice. I\'ll let the neighbors know.'
    ]
  },
  {
    subject: 'Project completion celebration',
    contents: [
      'Your roof is complete! We left a small gift on your doorstep as a thank you for choosing us.',
      'How thoughtful! We just found it - love the plant and the card. Thank you!',
      'Our pleasure! Enjoy your new roof and don\'t hesitate to call if you need anything.',
      'Will do. Thanks again for everything!'
    ]
  }
];

// Function to get random date in past X days
function getRandomPastDate(daysAgo = 60) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return date;
}

async function addMoreMessages() {
  try {
    console.log('Starting to add more messages to existing projects...');

    // Get all existing projects
    const projects = await prisma.project.findMany({
      include: {
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${projects.length} existing projects`);

    // Get existing users
    const users = await prisma.user.findMany();
    if (users.length === 0) {
      console.error('No users found! Please run the seed-projects script first.');
      return;
    }

    let totalMessagesCreated = 0;

    // For each project, add many more messages
    for (const project of projects) {
      // Find or create a conversation for this project
      let conversation = await prisma.conversation.findFirst({
        where: {
          title: {
            contains: project.projectNumber.toString()
          }
        }
      });

      if (!conversation) {
        // Create a new conversation if none exists
        conversation = await prisma.conversation.create({
          data: {
            title: `Project #${project.projectNumber} - ${project.customer.primaryName}`,
            description: `Messages for ${project.projectName}`,
            isGroup: true
          }
        });

        // Add users to conversation
        for (const user of users) {
          await prisma.conversationParticipant.create({
            data: {
              conversationId: conversation.id,
              userId: user.id,
              role: user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
            }
          }).catch(() => {}); // Ignore if already exists
        }
      }

      // Add 15-25 message threads per project
      const messageThreadCount = Math.floor(Math.random() * 11) + 15;
      
      for (let i = 0; i < messageThreadCount; i++) {
        const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
        const messageDate = getRandomPastDate(90); // Spread over 90 days
        
        // Create the main message
        const mainUser = users[Math.floor(Math.random() * users.length)];
        const mainMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: mainUser.id,
            text: `**${template.subject}**\n\n${template.contents[0]}`,
            messageType: 'TEXT',
            createdAt: messageDate
          }
        });
        totalMessagesCreated++;

        // Create the reply chain
        let previousMessageId = mainMessage.id;
        let currentDate = new Date(messageDate);
        
        for (let j = 1; j < template.contents.length; j++) {
          // Add some time between messages (30 minutes to 4 hours)
          currentDate = new Date(currentDate.getTime() + (Math.random() * 3.5 + 0.5) * 60 * 60 * 1000);
          
          // Alternate between users or randomly select
          const replyUser = users[Math.floor(Math.random() * users.length)];
          
          const replyMessage = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: replyUser.id,
              replyToId: previousMessageId,
              text: template.contents[j],
              messageType: 'TEXT',
              createdAt: currentDate
            }
          });
          
          previousMessageId = replyMessage.id;
          totalMessagesCreated++;
        }
      }

      console.log(`Added ${messageThreadCount} message threads to project ${project.projectNumber}`);
    }

    console.log(`\nSuccessfully created ${totalMessagesCreated} total messages across all projects!`);
    console.log('The Project Messages sections should now have plenty of content to display.');

  } catch (error) {
    console.error('Error adding messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreMessages();