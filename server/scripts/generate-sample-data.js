const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateSampleData() {
  console.log('🚀 Starting sample data generation...');

  // Sample Colorado customers with realistic data
  const customers = [
    {
      primaryName: "Michael Johnson",
      primaryPhone: "(720) 555-3421",
      primaryEmail: "michael.johnson@gmail.com",
      secondaryName: "Sarah Johnson",
      secondaryPhone: "(720) 555-3422",
      secondaryEmail: "sarah.johnson@gmail.com",
      address: "1245 Pearl Street, Boulder, CO 80302",
      city: "Boulder",
      state: "CO",
      zip: "80302",
      notes: "Preferred morning appointments"
    },
    {
      primaryName: "Robert Williams",
      primaryPhone: "(303) 555-8765",
      primaryEmail: "robert.williams@yahoo.com",
      secondaryName: "Jennifer Williams",
      secondaryPhone: "(303) 555-8766",
      secondaryEmail: "jen.williams@yahoo.com",
      address: "3890 S Broadway, Englewood, CO 80113",
      city: "Englewood",
      state: "CO",
      zip: "80113",
      notes: "Has two properties - this is primary residence"
    },
    {
      primaryName: "David Anderson",
      primaryPhone: "(970) 555-2341",
      primaryEmail: "david.anderson@outlook.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "567 Mountain View Drive, Fort Collins, CO 80521",
      city: "Fort Collins",
      state: "CO",
      zip: "80521",
      notes: "Commercial property owner"
    },
    {
      primaryName: "Lisa Martinez",
      primaryPhone: "(719) 555-4567",
      primaryEmail: "lisa.martinez@gmail.com",
      secondaryName: "Carlos Martinez",
      secondaryPhone: "(719) 555-4568",
      secondaryEmail: "carlos.martinez@gmail.com",
      address: "2134 Cascade Avenue, Colorado Springs, CO 80903",
      city: "Colorado Springs",
      state: "CO",
      zip: "80903",
      notes: "Spanish-speaking household"
    },
    {
      primaryName: "James Thompson",
      primaryPhone: "(303) 555-9876",
      primaryEmail: "james.thompson@hotmail.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "789 Sherman Street, Denver, CO 80203",
      city: "Denver",
      state: "CO",
      zip: "80203",
      notes: "Historic home - requires special care"
    },
    {
      primaryName: "Patricia Davis",
      primaryPhone: "(720) 555-3456",
      primaryEmail: "patricia.davis@gmail.com",
      secondaryName: "Mark Davis",
      secondaryPhone: "(720) 555-3457",
      secondaryEmail: "mark.davis@gmail.com",
      address: "4521 E 17th Avenue, Aurora, CO 80010",
      city: "Aurora",
      state: "CO",
      zip: "80010",
      notes: "Insurance claim in progress"
    },
    {
      primaryName: "Christopher Miller",
      primaryPhone: "(303) 555-2234",
      primaryEmail: "chris.miller@yahoo.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "1122 Federal Boulevard, Westminster, CO 80030",
      city: "Westminster",
      state: "CO",
      zip: "80030",
      notes: "Rental property"
    },
    {
      primaryName: "Barbara Wilson",
      primaryPhone: "(970) 555-7890",
      primaryEmail: "barbara.wilson@gmail.com",
      secondaryName: "Thomas Wilson",
      secondaryPhone: "(970) 555-7891",
      secondaryEmail: "tom.wilson@gmail.com",
      address: "891 College Avenue, Grand Junction, CO 81501",
      city: "Grand Junction",
      state: "CO",
      zip: "81501",
      notes: "Solar panel installation requested"
    },
    {
      primaryName: "Daniel Garcia",
      primaryPhone: "(720) 555-5678",
      primaryEmail: "daniel.garcia@outlook.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "2345 Wadsworth Boulevard, Lakewood, CO 80214",
      city: "Lakewood",
      state: "CO",
      zip: "80214",
      notes: "Emergency repair needed"
    },
    {
      primaryName: "Nancy Rodriguez",
      primaryPhone: "(303) 555-3478",
      primaryEmail: "nancy.rodriguez@gmail.com",
      secondaryName: "Jose Rodriguez",
      secondaryPhone: "(303) 555-3479",
      secondaryEmail: "jose.rodriguez@gmail.com",
      address: "678 Speer Boulevard, Denver, CO 80204",
      city: "Denver",
      state: "CO",
      zip: "80204",
      notes: "High-rise condo complex"
    },
    {
      primaryName: "Paul Brown",
      primaryPhone: "(719) 555-9012",
      primaryEmail: "paul.brown@hotmail.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "4567 Academy Boulevard, Colorado Springs, CO 80918",
      city: "Colorado Springs",
      state: "CO",
      zip: "80918",
      notes: "Military veteran - discount applied"
    },
    {
      primaryName: "Karen Taylor",
      primaryPhone: "(303) 555-4523",
      primaryEmail: "karen.taylor@yahoo.com",
      secondaryName: "Steve Taylor",
      secondaryPhone: "(303) 555-4524",
      secondaryEmail: "steve.taylor@yahoo.com",
      address: "3456 Quebec Street, Denver, CO 80207",
      city: "Denver",
      state: "CO",
      zip: "80207",
      notes: "Referred by previous customer"
    },
    {
      primaryName: "Frank Martinez",
      primaryPhone: "(970) 555-6789",
      primaryEmail: "frank.martinez@gmail.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "123 Main Street, Pueblo, CO 81003",
      city: "Pueblo",
      state: "CO",
      zip: "81003",
      notes: "Downtown commercial building"
    },
    {
      primaryName: "Susan Clark",
      primaryPhone: "(720) 555-2345",
      primaryEmail: "susan.clark@outlook.com",
      secondaryName: "Richard Clark",
      secondaryPhone: "(720) 555-2346",
      secondaryEmail: "richard.clark@outlook.com",
      address: "5678 Hampden Avenue, Cherry Hills Village, CO 80113",
      city: "Cherry Hills Village",
      state: "CO",
      zip: "80113",
      notes: "Luxury home - premium materials requested"
    },
    {
      primaryName: "Joseph White",
      primaryPhone: "(303) 555-6780",
      primaryEmail: "joseph.white@gmail.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "901 17th Street, Denver, CO 80202",
      city: "Denver",
      state: "CO",
      zip: "80202",
      notes: "Office building - weekend work only"
    },
    {
      primaryName: "Margaret Harris",
      primaryPhone: "(719) 555-3456",
      primaryEmail: "margaret.harris@yahoo.com",
      secondaryName: "William Harris",
      secondaryPhone: "(719) 555-3457",
      secondaryEmail: "william.harris@yahoo.com",
      address: "2345 Garden of the Gods Road, Colorado Springs, CO 80907",
      city: "Colorado Springs",
      state: "CO",
      zip: "80907",
      notes: "Near tourist area - careful scheduling needed"
    },
    {
      primaryName: "Charles Moore",
      primaryPhone: "(970) 555-8901",
      primaryEmail: "charles.moore@hotmail.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "789 Mountain Avenue, Steamboat Springs, CO 80487",
      city: "Steamboat Springs",
      state: "CO",
      zip: "80487",
      notes: "Vacation home - seasonal access only"
    },
    {
      primaryName: "Linda Jackson",
      primaryPhone: "(303) 555-2367",
      primaryEmail: "linda.jackson@gmail.com",
      secondaryName: "Gary Jackson",
      secondaryPhone: "(303) 555-2368",
      secondaryEmail: "gary.jackson@gmail.com",
      address: "4321 Tennyson Street, Denver, CO 80212",
      city: "Denver",
      state: "CO",
      zip: "80212",
      notes: "Berkeley neighborhood - historic district"
    },
    {
      primaryName: "Kevin Lewis",
      primaryPhone: "(720) 555-4578",
      primaryEmail: "kevin.lewis@outlook.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "567 Union Boulevard, Lakewood, CO 80228",
      city: "Lakewood",
      state: "CO",
      zip: "80228",
      notes: "HOA approval required"
    },
    {
      primaryName: "Betty Walker",
      primaryPhone: "(303) 555-8902",
      primaryEmail: "betty.walker@yahoo.com",
      secondaryName: "Donald Walker",
      secondaryPhone: "(303) 555-8903",
      secondaryEmail: "donald.walker@yahoo.com",
      address: "8901 Colfax Avenue, Aurora, CO 80011",
      city: "Aurora",
      state: "CO",
      zip: "80011",
      notes: "Senior citizens - flexible scheduling"
    },
    {
      primaryName: "George Hall",
      primaryPhone: "(970) 555-3456",
      primaryEmail: "george.hall@gmail.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "234 College Avenue, Fort Collins, CO 80524",
      city: "Fort Collins",
      state: "CO",
      zip: "80524",
      notes: "Near CSU campus"
    },
    {
      primaryName: "Dorothy Young",
      primaryPhone: "(719) 555-6789",
      primaryEmail: "dorothy.young@hotmail.com",
      secondaryName: "Raymond Young",
      secondaryPhone: "(719) 555-6790",
      secondaryEmail: "raymond.young@hotmail.com",
      address: "5678 Pikes Peak Avenue, Colorado Springs, CO 80909",
      city: "Colorado Springs",
      state: "CO",
      zip: "80909",
      notes: "Mountain property - weather dependent"
    },
    {
      primaryName: "Kenneth King",
      primaryPhone: "(303) 555-5678",
      primaryEmail: "kenneth.king@gmail.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "3456 Park Avenue West, Denver, CO 80205",
      city: "Denver",
      state: "CO",
      zip: "80205",
      notes: "RiNo district property"
    },
    {
      primaryName: "Maria Scott",
      primaryPhone: "(720) 555-9012",
      primaryEmail: "maria.scott@yahoo.com",
      secondaryName: "Andrew Scott",
      secondaryPhone: "(720) 555-9013",
      secondaryEmail: "andrew.scott@yahoo.com",
      address: "7890 Belleview Avenue, Greenwood Village, CO 80111",
      city: "Greenwood Village",
      state: "CO",
      zip: "80111",
      notes: "Tech park office building"
    },
    {
      primaryName: "Brian Adams",
      primaryPhone: "(303) 555-3478",
      primaryEmail: "brian.adams@outlook.com",
      secondaryName: null,
      secondaryPhone: null,
      secondaryEmail: null,
      address: "1234 Market Street, Denver, CO 80202",
      city: "Denver",
      state: "CO",
      zip: "80202",
      notes: "LoDo district - permit parking only"
    }
  ];

  // Project types and descriptions
  const projectTypes = [
    { type: "ROOF_REPLACEMENT", description: "Complete tear-off and replacement of existing roof system", name: "Full Roof Replacement" },
    { type: "SIDING_INSTALLATION", description: "Complete exterior siding replacement", name: "Siding Installation" },
    { type: "WINDOW_REPLACEMENT", description: "Window replacement and installation", name: "Window Replacement" },
    { type: "KITCHEN_REMODEL", description: "Complete kitchen renovation and remodeling", name: "Kitchen Remodel" },
    { type: "BATHROOM_RENOVATION", description: "Bathroom renovation and modernization", name: "Bathroom Renovation" },
    { type: "FLOORING", description: "Hardwood and tile flooring installation", name: "Flooring Installation" },
    { type: "PAINTING", description: "Interior and exterior painting services", name: "Painting Services" },
    { type: "ELECTRICAL_WORK", description: "Electrical system upgrades and repairs", name: "Electrical Work" },
    { type: "PLUMBING", description: "Plumbing installation and repair services", name: "Plumbing Services" },
    { type: "HVAC", description: "Heating, ventilation, and air conditioning work", name: "HVAC Services" }
  ];

  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  const statusDistribution = [8, 9, 8]; // Evenly distributed

  try {
    // First, get or create a default user to be the project manager
    let defaultUser = await prisma.user.findFirst({
      where: { email: 'demo@kenstruction.com' }
    });

    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          email: 'demo@kenstruction.com',
          password: '$2b$10$dummyhashedpassword', // This is a dummy hash
          firstName: 'Demo',
          lastName: 'Manager',
          phone: '(303) 555-0000',
          role: 'PROJECT_MANAGER',
          position: 'Project Manager',
          department: 'Operations',
          isActive: true,
          isVerified: true
        }
      });
      console.log('✅ Created demo user for project management');
    }

    // Create customers and projects
    let statusIndex = 0;
    let currentStatusCount = 0;
    let projectNumber = 20000;

    for (let i = 0; i < 25; i++) {
      const customer = customers[i];
      const projectType = projectTypes[i % projectTypes.length];
      
      // Determine status based on distribution
      if (currentStatusCount >= statusDistribution[statusIndex]) {
        statusIndex++;
        currentStatusCount = 0;
      }
      const status = statuses[statusIndex];
      currentStatusCount++;

      console.log(`Creating customer ${i + 1}/25: ${customer.primaryName}`);

      // Create customer (with unique email handling)
      const uniqueEmail = `${customer.primaryEmail.split('@')[0]}_${i}@${customer.primaryEmail.split('@')[1]}`;
      const uniqueSecondaryEmail = customer.secondaryEmail ? `${customer.secondaryEmail.split('@')[0]}_${i}@${customer.secondaryEmail.split('@')[1]}` : null;
      
      const createdCustomer = await prisma.customer.create({
        data: {
          primaryName: customer.primaryName,
          primaryPhone: customer.primaryPhone,
          primaryEmail: uniqueEmail,
          secondaryName: customer.secondaryName,
          secondaryPhone: customer.secondaryPhone,
          secondaryEmail: uniqueSecondaryEmail,
          address: customer.address,
          notes: `${customer.notes}. Source: ${['Referral', 'Website', 'Cold Call', 'Advertisement', 'Social Media'][i % 5]}. City: ${customer.city}, ${customer.state} ${customer.zip}`,
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Random date within last 90 days
        }
      });

      // Create project
      const startDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + (7 + Math.random() * 21) * 24 * 60 * 60 * 1000);

      const createdProject = await prisma.project.create({
        data: {
          projectNumber: projectNumber++,
          projectName: `${projectType.name} - ${customer.primaryName.split(' ')[1]}`,
          customerId: createdCustomer.id,
          projectManagerId: defaultUser.id,
          status: status,
          projectType: projectType.type, // Use enum value
          description: projectType.description,
          startDate: startDate,
          endDate: status === 'COMPLETED' ? endDate : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          budget: 5000 + Math.floor(Math.random() * 45000), // $5,000 to $50,000
          actualCost: status === 'COMPLETED' ? 4500 + Math.floor(Math.random() * 40000) : null,
          progress: status === 'PENDING' ? 0 : status === 'IN_PROGRESS' ? 25 + Math.floor(Math.random() * 50) : 100,
          priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
          notes: `${projectType.description}. Customer: ${customer.primaryName} at ${customer.address}. Notes: ${customer.notes}`,
          createdAt: startDate,
          updatedAt: new Date()
        }
      });

      // Initialize workflow for the project
      const workflow = await prisma.projectWorkflow.create({
        data: {
          projectId: createdProject.id,
          workflowType: 'ROOFING',
          status: 'IN_PROGRESS',
          createdById: defaultUser.id
        }
      });

      // Define phase types for distribution
      const phaseTypes = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'];
      
      // Distribute projects evenly across phases based on their status
      let targetPhaseType;
      if (status === 'PENDING') {
        targetPhaseType = ['LEAD', 'PROSPECT'][i % 2]; // Alternate between LEAD and PROSPECT
      } else if (status === 'IN_PROGRESS') {
        targetPhaseType = ['APPROVED', 'EXECUTION'][i % 2]; // Alternate between APPROVED and EXECUTION
      } else { // COMPLETED
        targetPhaseType = ['SECOND_SUPPLEMENT', 'COMPLETION'][i % 2]; // Alternate between final phases
      }

      // Get the target phase and its first section and line item
      const targetPhase = await prisma.workflowPhase.findFirst({
        where: { phaseType: targetPhaseType },
        include: {
          sections: {
            include: {
              lineItems: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
                take: 1
              }
            },
            orderBy: { displayOrder: 'asc' },
            take: 1
          }
        }
      });

      if (targetPhase && targetPhase.sections[0] && targetPhase.sections[0].lineItems[0]) {
        // Create tracker for the project positioned at the appropriate phase
        await prisma.projectWorkflowTracker.create({
          data: {
            projectId: createdProject.id,
            currentLineItemId: targetPhase.sections[0].lineItems[0].id,
            currentSectionId: targetPhase.sections[0].id,
            currentPhaseId: targetPhase.id,
            phaseStartedAt: startDate,
            sectionStartedAt: startDate,
            lineItemStartedAt: startDate
          }
        });
      }

      console.log(`✅ Created project ${createdProject.projectNumber}: ${createdProject.projectName} (${status})`);
    }

    console.log('\n🎉 Successfully created 25 projects and customers!');
    
    // Show summary
    const projectCount = await prisma.project.count();
    const customerCount = await prisma.customer.count();
    const pendingCount = await prisma.project.count({ where: { status: 'PENDING' } });
    const inProgressCount = await prisma.project.count({ where: { status: 'IN_PROGRESS' } });
    const completedCount = await prisma.project.count({ where: { status: 'COMPLETED' } });

    console.log('\n📊 Database Summary:');
    console.log(`   Total Customers: ${customerCount}`);
    console.log(`   Total Projects: ${projectCount}`);
    console.log(`   - Pending: ${pendingCount}`);
    console.log(`   - In Progress: ${inProgressCount}`);
    console.log(`   - Completed: ${completedCount}`);

  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateSampleData()
  .then(() => {
    console.log('✅ Sample data generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });