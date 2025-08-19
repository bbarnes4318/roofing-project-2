const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Colorado Springs realistic addresses
const coloradoSpringsAddresses = [
  { address: "1425 Garden of the Gods Rd", city: "Colorado Springs", state: "CO", zip: "80907", county: "El Paso" },
  { address: "3204 N Academy Blvd", city: "Colorado Springs", state: "CO", zip: "80917", county: "El Paso" },
  { address: "785 Citadel Dr E", city: "Colorado Springs", state: "CO", zip: "80909", county: "El Paso" },
  { address: "1502 S Nevada Ave", city: "Colorado Springs", state: "CO", zip: "80905", county: "El Paso" },
  { address: "2316 E Platte Ave", city: "Colorado Springs", state: "CO", zip: "80909", county: "El Paso" },
  { address: "4225 Centennial Blvd", city: "Colorado Springs", state: "CO", zip: "80922", county: "El Paso" },
  { address: "1842 Austin Bluffs Pkwy", city: "Colorado Springs", state: "CO", zip: "80918", county: "El Paso" },
  { address: "6125 Barnes Rd", city: "Colorado Springs", state: "CO", zip: "80922", county: "El Paso" },
  { address: "2409 W Colorado Ave", city: "Colorado Springs", state: "CO", zip: "80904", county: "El Paso" },
  { address: "5138 N Union Blvd", city: "Colorado Springs", state: "CO", zip: "80918", county: "El Paso" },
  { address: "1215 Lake Ave", city: "Colorado Springs", state: "CO", zip: "80906", county: "El Paso" },
  { address: "3890 Palmer Park Blvd", city: "Colorado Springs", state: "CO", zip: "80909", county: "El Paso" },
  { address: "1624 S 8th St", city: "Colorado Springs", state: "CO", zip: "80905", county: "El Paso" },
  { address: "4562 Astrozon Blvd", city: "Colorado Springs", state: "CO", zip: "80916", county: "El Paso" },
  { address: "2816 E Fountain Blvd", city: "Colorado Springs", state: "CO", zip: "80910", county: "El Paso" },
  { address: "5240 Research Dr", city: "Colorado Springs", state: "CO", zip: "80920", county: "El Paso" },
  { address: "1945 Mesa Rd", city: "Colorado Springs", state: "CO", zip: "80904", county: "El Paso" },
  { address: "3728 Galley Rd", city: "Colorado Springs", state: "CO", zip: "80909", county: "El Paso" },
  { address: "2145 Broadmoor Valley Rd", city: "Colorado Springs", state: "CO", zip: "80906", county: "El Paso" },
  { address: "4819 Constitution Ave", city: "Colorado Springs", state: "CO", zip: "80915", county: "El Paso" },
  { address: "6240 Tutt Blvd", city: "Colorado Springs", state: "CO", zip: "80923", county: "El Paso" },
  { address: "1534 Cheyenne Blvd", city: "Colorado Springs", state: "CO", zip: "80906", county: "El Paso" },
  { address: "3612 Jeannine Dr", city: "Colorado Springs", state: "CO", zip: "80917", county: "El Paso" },
  { address: "2890 S Circle Dr", city: "Colorado Springs", state: "CO", zip: "80906", county: "El Paso" },
  { address: "4205 Deerfield Hills Rd", city: "Colorado Springs", state: "CO", zip: "80922", county: "El Paso" },
  { address: "1743 S Tejon St", city: "Colorado Springs", state: "CO", zip: "80905", county: "El Paso" },
  { address: "5412 Alteza Dr", city: "Colorado Springs", state: "CO", zip: "80917", county: "El Paso" },
  { address: "2667 Dublin Blvd", city: "Colorado Springs", state: "CO", zip: "80918", county: "El Paso" },
  { address: "3945 Maizeland Rd", city: "Colorado Springs", state: "CO", zip: "80909", county: "El Paso" },
  { address: "1289 Kelly Johnson Blvd", city: "Colorado Springs", state: "CO", zip: "80920", county: "El Paso" },
  { address: "4672 Rusina Rd", city: "Colorado Springs", state: "CO", zip: "80911", county: "El Paso" },
  { address: "2341 Carmel Dr", city: "Colorado Springs", state: "CO", zip: "80910", county: "El Paso" },
  { address: "5829 Corporate Dr", city: "Colorado Springs", state: "CO", zip: "80919", county: "El Paso" },
  { address: "1456 Manitou Ave", city: "Manitou Springs", state: "CO", zip: "80829", county: "El Paso" },
  { address: "3178 Flying Horse Club Dr", city: "Colorado Springs", state: "CO", zip: "80921", county: "El Paso" }
];

// Realistic customer data
const customerData = [
  {
    primaryName: "Robert Martinez",
    primaryEmail: "robert.martinez@gmail.com",
    primaryPhone: "(719) 555-0142",
    secondaryName: "Jennifer Martinez",
    secondaryEmail: "jennifer.martinez@outlook.com",
    secondaryPhone: "(719) 555-0143",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Michael Thompson",
    primaryEmail: "mthompson@yahoo.com",
    primaryPhone: "(719) 555-0256",
    primaryRole: "Property Owner"
  },
  {
    primaryName: "Sarah Chen",
    primaryEmail: "sarah.chen@hotmail.com",
    primaryPhone: "(719) 555-0378",
    secondaryName: "David Chen",
    secondaryEmail: "dchen.colorado@gmail.com",
    secondaryPhone: "(719) 555-0379",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Amanda Rodriguez",
    primaryEmail: "amanda.rodriguez@icloud.com",
    primaryPhone: "(719) 555-0491",
    primaryRole: "Homeowner"
  },
  {
    primaryName: "James Wilson",
    primaryEmail: "james.wilson@comcast.net",
    primaryPhone: "(719) 555-0634",
    secondaryName: "Lisa Wilson",
    secondaryEmail: "lisa.wilson@gmail.com",
    secondaryPhone: "(719) 555-0635",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Brian Anderson",
    primaryEmail: "banderson.springs@outlook.com",
    primaryPhone: "(719) 555-0718",
    primaryRole: "Property Manager"
  },
  {
    primaryName: "Katherine Johnson",
    primaryEmail: "katherine.johnson@gmail.com",
    primaryPhone: "(719) 555-0832",
    secondaryName: "Mark Johnson",
    secondaryEmail: "mark.j.colorado@yahoo.com",
    secondaryPhone: "(719) 555-0833",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Thomas Garcia",
    primaryEmail: "tgarcia@centurylink.net",
    primaryPhone: "(719) 555-0945",
    primaryRole: "Homeowner"
  },
  {
    primaryName: "Michelle Lee",
    primaryEmail: "michelle.lee@gmail.com",
    primaryPhone: "(719) 555-1067",
    secondaryName: "Christopher Lee",
    secondaryEmail: "chris.lee@outlook.com",
    secondaryPhone: "(719) 555-1068",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Daniel Brown",
    primaryEmail: "daniel.brown@icloud.com",
    primaryPhone: "(719) 555-1189",
    primaryRole: "Property Owner"
  },
  {
    primaryName: "Rachel Davis",
    primaryEmail: "rachel.davis@hotmail.com",
    primaryPhone: "(719) 555-1234",
    secondaryName: "Kevin Davis",
    secondaryEmail: "kevin.davis@gmail.com",
    secondaryPhone: "(719) 555-1235",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Steven Miller",
    primaryEmail: "steven.miller@yahoo.com",
    primaryPhone: "(719) 555-1356",
    primaryRole: "Homeowner"
  },
  {
    primaryName: "Lauren White",
    primaryEmail: "lauren.white@outlook.com",
    primaryPhone: "(719) 555-1478",
    secondaryName: "Jason White",
    secondaryEmail: "jason.white@comcast.net",
    secondaryPhone: "(719) 555-1479",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Gregory Taylor",
    primaryEmail: "greg.taylor@gmail.com",
    primaryPhone: "(719) 555-1592",
    primaryRole: "Property Owner"
  },
  {
    primaryName: "Nicole Clark",
    primaryEmail: "nicole.clark@icloud.com",
    primaryPhone: "(719) 555-1634",
    secondaryName: "Ryan Clark",
    secondaryEmail: "ryan.clark@yahoo.com",
    secondaryPhone: "(719) 555-1635",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Patricia Lewis",
    primaryEmail: "patricia.lewis@hotmail.com",
    primaryPhone: "(719) 555-1756",
    primaryRole: "Homeowner"
  },
  {
    primaryName: "Charles Hall",
    primaryEmail: "charles.hall@gmail.com",
    primaryPhone: "(719) 555-1878",
    secondaryName: "Mary Hall",
    secondaryEmail: "mary.hall@outlook.com",
    secondaryPhone: "(719) 555-1879",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Matthew Young",
    primaryEmail: "matthew.young@comcast.net",
    primaryPhone: "(719) 555-1923",
    primaryRole: "Property Manager"
  },
  {
    primaryName: "Elizabeth King",
    primaryEmail: "elizabeth.king@gmail.com",
    primaryPhone: "(719) 555-2045",
    secondaryName: "Andrew King",
    secondaryEmail: "andrew.king@icloud.com",
    secondaryPhone: "(719) 555-2046",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Joseph Wright",
    primaryEmail: "joseph.wright@yahoo.com",
    primaryPhone: "(719) 555-2167",
    primaryRole: "Homeowner"
  },
  {
    primaryName: "Ashley Lopez",
    primaryEmail: "ashley.lopez@outlook.com",
    primaryPhone: "(719) 555-2289",
    secondaryName: "Benjamin Lopez",
    secondaryEmail: "ben.lopez@gmail.com",
    secondaryPhone: "(719) 555-2290",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "William Scott",
    primaryEmail: "william.scott@hotmail.com",
    primaryPhone: "(719) 555-2334",
    primaryRole: "Property Owner"
  },
  {
    primaryName: "Stephanie Green",
    primaryEmail: "stephanie.green@icloud.com",
    primaryPhone: "(719) 555-2456",
    secondaryName: "Anthony Green",
    secondaryEmail: "anthony.green@comcast.net",
    secondaryPhone: "(719) 555-2457",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  },
  {
    primaryName: "Jonathan Adams",
    primaryEmail: "jonathan.adams@gmail.com",
    primaryPhone: "(719) 555-2578",
    primaryRole: "Homeowner"
  },
  {
    primaryName: "Melissa Baker",
    primaryEmail: "melissa.baker@yahoo.com",
    primaryPhone: "(719) 555-2634",
    secondaryName: "Paul Baker",
    secondaryEmail: "paul.baker@outlook.com",
    secondaryPhone: "(719) 555-2635",
    primaryRole: "Homeowner",
    secondaryRole: "Co-Owner"
  }
];

// Project data with varied trade types
const projectData = [
  {
    projectName: "Complete Roof Replacement - Garden of the Gods",
    projectType: "ROOFING",
    description: "Full roof replacement with architectural shingles, gutters, and downspouts",
    priority: "HIGH",
    budget: 24500.00,
    estimatedCost: 22800.00,
    tradeCount: 1
  },
  {
    projectName: "Seamless Gutter Installation - Academy Blvd",
    projectType: "GUTTERS",
    description: "New seamless gutters with leaf guards and proper drainage",
    priority: "MEDIUM",
    budget: 3200.00,
    estimatedCost: 2950.00,
    tradeCount: 1
  },
  {
    projectName: "Interior Paint & Roof Repair - Citadel Dr",
    projectType: "ROOFING",
    description: "Interior painting throughout home and minor roof repairs",
    priority: "MEDIUM",
    budget: 8750.00,
    estimatedCost: 8200.00,
    tradeCount: 2
  },
  {
    projectName: "Storm Damage Roof Restoration - Nevada Ave",
    projectType: "ROOFING",
    description: "Insurance claim for hail damage roof replacement and gutters",
    priority: "HIGH",
    budget: 31200.00,
    estimatedCost: 28900.00,
    tradeCount: 2
  },
  {
    projectName: "Custom Gutter System - Platte Ave",
    projectType: "GUTTERS",
    description: "Designer copper gutters with decorative downspouts",
    priority: "LOW",
    budget: 5800.00,
    estimatedCost: 5400.00,
    tradeCount: 1
  },
  {
    projectName: "Multi-Trade Renovation - Centennial Blvd",
    projectType: "ROOFING",
    description: "Roof replacement, new gutters, and interior paint refresh",
    priority: "HIGH",
    budget: 18900.00,
    estimatedCost: 17500.00,
    tradeCount: 3
  },
  {
    projectName: "Residential Interior Paint - Austin Bluffs",
    projectType: "INTERIOR_PAINT",
    description: "Complete interior painting including ceilings and trim",
    priority: "MEDIUM",
    budget: 4500.00,
    estimatedCost: 4200.00,
    tradeCount: 1
  },
  {
    projectName: "Commercial Roof Replacement - Barnes Rd",
    projectType: "ROOFING",
    description: "Large commercial flat roof with TPO membrane",
    priority: "HIGH",
    budget: 45600.00,
    estimatedCost: 42300.00,
    tradeCount: 1
  },
  {
    projectName: "Gutter Repair & Paint Touch-up - Colorado Ave",
    projectType: "GUTTERS",
    description: "Gutter repair and exterior trim paint",
    priority: "LOW",
    budget: 2100.00,
    estimatedCost: 1950.00,
    tradeCount: 2
  },
  {
    projectName: "Historic Home Restoration - Union Blvd",
    projectType: "ROOFING",
    description: "Slate roof restoration with custom gutters and interior paint",
    priority: "HIGH",
    budget: 38700.00,
    estimatedCost: 35800.00,
    tradeCount: 3
  },
  {
    projectName: "Lake House Paint Project - Lake Ave",
    projectType: "INTERIOR_PAINT",
    description: "Interior and exterior painting for lakefront property",
    priority: "MEDIUM",
    budget: 6800.00,
    estimatedCost: 6300.00,
    tradeCount: 1
  },
  {
    projectName: "Roof & Gutter Package - Palmer Park",
    projectType: "ROOFING",
    description: "Asphalt shingle roof with coordinated gutter system",
    priority: "MEDIUM",
    budget: 16200.00,
    estimatedCost: 15100.00,
    tradeCount: 2
  },
  {
    projectName: "Downtown Condo Paint - S 8th St",
    projectType: "INTERIOR_PAINT",
    description: "Modern color scheme for downtown condominium",
    priority: "LOW",
    budget: 3400.00,
    estimatedCost: 3150.00,
    tradeCount: 1
  },
  {
    projectName: "Industrial Gutter System - Astrozon Blvd",
    projectType: "GUTTERS",
    description: "Heavy-duty commercial gutter installation",
    priority: "HIGH",
    budget: 8900.00,
    estimatedCost: 8200.00,
    tradeCount: 1
  },
  {
    projectName: "Luxury Home Complete - Fountain Blvd",
    projectType: "ROOFING",
    description: "Premium roof, gutters, and interior paint package",
    priority: "HIGH",
    budget: 42300.00,
    estimatedCost: 39100.00,
    tradeCount: 3
  },
  {
    projectName: "Research Facility Roof - Research Dr",
    projectType: "ROOFING",
    description: "Specialized roofing for research facility with equipment",
    priority: "HIGH",
    budget: 52800.00,
    estimatedCost: 48900.00,
    tradeCount: 1
  },
  {
    projectName: "Mesa Home Interior - Mesa Rd",
    projectType: "INTERIOR_PAINT",
    description: "Neutral palette interior painting throughout",
    priority: "MEDIUM",
    budget: 5200.00,
    estimatedCost: 4850.00,
    tradeCount: 1
  },
  {
    projectName: "Galley Road Gutters - Galley Rd",
    projectType: "GUTTERS",
    description: "Gutter replacement with improved drainage solutions",
    priority: "MEDIUM",
    budget: 4100.00,
    estimatedCost: 3800.00,
    tradeCount: 1
  },
  {
    projectName: "Broadmoor Valley Estate - Broadmoor Valley",
    projectType: "ROOFING",
    description: "Luxury estate roof, gutters, and paint coordination",
    priority: "HIGH",
    budget: 67200.00,
    estimatedCost: 62400.00,
    tradeCount: 3
  },
  {
    projectName: "Constitution Ave Paint - Constitution Ave",
    projectType: "INTERIOR_PAINT",
    description: "Patriotic color scheme interior painting",
    priority: "LOW",
    budget: 3800.00,
    estimatedCost: 3500.00,
    tradeCount: 1
  },
  {
    projectName: "Tutt Boulevard Roof - Tutt Blvd",
    projectType: "ROOFING",
    description: "Metal roof installation with matching gutters",
    priority: "MEDIUM",
    budget: 28400.00,
    estimatedCost: 26200.00,
    tradeCount: 2
  },
  {
    projectName: "Cheyenne Blvd Renovation - Cheyenne Blvd",
    projectType: "ROOFING",
    description: "Complete home exterior renovation package",
    priority: "HIGH",
    budget: 35600.00,
    estimatedCost: 33100.00,
    tradeCount: 3
  },
  {
    projectName: "Jeannine Dr Gutters - Jeannine Dr",
    projectType: "GUTTERS",
    description: "Seamless aluminum gutters with oversized downspouts",
    priority: "MEDIUM",
    budget: 3600.00,
    estimatedCost: 3350.00,
    tradeCount: 1
  },
  {
    projectName: "Circle Drive Paint Project - S Circle Dr",
    projectType: "INTERIOR_PAINT",
    description: "Open concept living area complete repaint",
    priority: "MEDIUM",
    budget: 4700.00,
    estimatedCost: 4350.00,
    tradeCount: 1
  },
  {
    projectName: "Deerfield Hills Premium - Deerfield Hills",
    projectType: "ROOFING",
    description: "High-end architectural shingles with premium gutters and interior paint",
    priority: "HIGH",
    budget: 39800.00,
    estimatedCost: 36900.00,
    tradeCount: 3
  }
];

// Workflow phases distribution
const workflowDistribution = [
  { phase: 'LEAD', projects: [0, 1, 2, 3, 4] },
  { phase: 'PROSPECT', projects: [5, 6, 7, 8, 9] },
  { phase: 'APPROVED', projects: [10, 11, 12, 13, 14] },
  { phase: 'EXECUTION', projects: [15, 16, 17, 18, 19] },
  { phase: 'SECOND_SUPPLEMENT', projects: [20, 21, 22] },
  { phase: 'COMPLETION', projects: [23, 24] }
];

async function main() {
  console.log('🌱 Seeding realistic project data...');
  
  try {
    // Clear existing demo/test data (keep basic users and workflow templates)
    console.log('🧹 Clearing existing project data...');
    await prisma.workflowAlert.deleteMany({});
    await prisma.completedWorkflowItem.deleteMany({});
    await prisma.projectWorkflowTracker.deleteMany({});
    await prisma.projectTeamMember.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.customer.deleteMany({});
    console.log('✅ Cleared existing project data');
    
    // Get existing users for project manager assignment
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['PROJECT_MANAGER', 'ADMIN', 'MANAGER']
        }
      }
    });
    
    if (users.length === 0) {
      throw new Error('No project managers found. Please run the basic seed first.');
    }

    console.log('👥 Creating 25 realistic customers...');
    
    // Create customers
    const customers = [];
    for (let i = 0; i < 25; i++) {
      const addressData = coloradoSpringsAddresses[i];
      const customerInfo = customerData[i];
      
      const customer = await prisma.customer.create({
        data: {
          ...customerInfo,
          address: addressData.address,
          notes: `Customer located in ${addressData.city}, ${addressData.county} County. Created for realistic testing.`
        }
      });
      customers.push(customer);
    }
    
    console.log(`✅ Created ${customers.length} customers`);

    console.log('🏗️ Creating 25 realistic projects...');
    
    // Get workflow data for assignment
    const workflowPhases = await prisma.workflowPhase.findMany({
      include: {
        sections: {
          include: {
            lineItems: true
          }
        }
      }
    });
    
    // Create projects
    const projects = [];
    for (let i = 0; i < 25; i++) {
      const projectInfo = projectData[i];
      const customer = customers[i];
      const projectManager = users[Math.floor(Math.random() * users.length)];
      
      // Generate realistic dates
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 60) - 30); // Random ±30 days
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 21 + Math.floor(Math.random() * 30)); // 21-51 days duration
      
      const project = await prisma.project.create({
        data: {
          projectNumber: 20001 + i,
          projectName: projectInfo.projectName,
          projectType: projectInfo.projectType,
          status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 3)],
          priority: projectInfo.priority,
          budget: projectInfo.budget,
          estimatedCost: projectInfo.estimatedCost,
          actualCost: projectInfo.estimatedCost + (Math.random() - 0.5) * 1000, // Some variance
          startDate: startDate,
          endDate: endDate,
          description: projectInfo.description,
          notes: `${projectInfo.tradeCount} trade${projectInfo.tradeCount > 1 ? 's' : ''} involved. Generated for realistic testing.`,
          pmPhone: projectManager.phone || "(719) 555-0100",
          pmEmail: projectManager.email,
          customerId: customer.id,
          projectManagerId: projectManager.id,
          createdById: projectManager.id,
          phase: null // Will be set by workflow tracker
        }
      });
      
      projects.push(project);
    }
    
    console.log(`✅ Created ${projects.length} projects`);

    console.log('⚙️ Creating workflow trackers and distributing across phases...');
    
    // Create workflow trackers distributed across phases
    for (const phaseGroup of workflowDistribution) {
      const phase = workflowPhases.find(p => p.phaseType === phaseGroup.phase);
      if (!phase) continue;

      for (const projectIndex of phaseGroup.projects) {
        if (projectIndex >= projects.length) continue;
        
        const project = projects[projectIndex];
        const sections = phase.sections.sort((a, b) => a.displayOrder - b.displayOrder);
        
        // Pick a random section within the phase
        const sectionIndex = Math.floor(Math.random() * sections.length);
        const section = sections[sectionIndex];
        const lineItems = section.lineItems.sort((a, b) => a.displayOrder - b.displayOrder);
        
        // Pick a random line item within the section
        const lineItemIndex = Math.floor(Math.random() * lineItems.length);
        const currentLineItem = lineItems[lineItemIndex];
        
        // Create workflow tracker
        await prisma.projectWorkflowTracker.create({
          data: {
            projectId: project.id,
            currentPhaseId: phase.id,
            currentSectionId: section.id,
            currentLineItemId: currentLineItem.id,
            phaseStartedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Started up to 7 days ago
            sectionStartedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Started up to 3 days ago
            lineItemStartedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Started up to 1 day ago
            workflowType: 'ROOFING',
            totalLineItems: lineItems.length
          }
        });
        
        // Update project phase
        await prisma.project.update({
          where: { id: project.id },
          data: { phase: phaseGroup.phase }
        });
        
        // Create some completed items for projects past LEAD phase
        if (phaseGroup.phase !== 'LEAD') {
          const completedCount = Math.floor(Math.random() * lineItemIndex + 1);
          
          for (let i = 0; i < completedCount; i++) {
            const tracker = await prisma.projectWorkflowTracker.findFirst({
              where: { projectId: project.id }
            });
            
            if (tracker && i < lineItems.length) {
              await prisma.completedWorkflowItem.create({
                data: {
                  trackerId: tracker.id,
                  phaseId: phase.id,
                  sectionId: section.id,
                  lineItemId: lineItems[i].id,
                  completedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
                  notes: `Completed as part of ${phaseGroup.phase} phase progression`
                }
              });
            }
          }
        }
      }
    }
    
    console.log('✅ Workflow trackers created and distributed across phases');

    // Create some workflow alerts for active projects
    console.log('🚨 Creating realistic workflow alerts...');
    
    const activeProjects = projects.slice(0, 15); // First 15 projects get alerts
    
    for (const project of activeProjects) {
      const tracker = await prisma.projectWorkflowTracker.findFirst({
        where: { projectId: project.id },
        include: {
          currentLineItem: true,
          currentPhase: true,
          currentSection: true
        }
      });
      
      if (tracker && tracker.currentLineItem) {
        // Create alert for current line item
        await prisma.workflowAlert.create({
          data: {
            title: `${tracker.currentLineItem.itemName} - ${project.projectName}`,
            message: `Line item "${tracker.currentLineItem.itemName}" is ready for completion in project ${project.projectNumber}.`,
            stepName: tracker.currentLineItem.itemName,
            priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
            status: 'ACTIVE',
            dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Due in next 7 days
            projectId: project.id,
            assignedToId: project.projectManagerId,
            responsibleRole: tracker.currentLineItem.responsibleRole,
            lineItemId: tracker.currentLineItem.id,
            phaseId: tracker.currentPhaseId,
            sectionId: tracker.currentSectionId,
            metadata: {
              autoGenerated: true,
              workflowType: 'ROOFING',
              estimatedMinutes: tracker.currentLineItem.estimatedMinutes
            }
          }
        });
      }
    }
    
    console.log('✅ Created workflow alerts for active projects');

    console.log('\n📊 Realistic Data Summary:');
    console.log(`  • 25 customers with Colorado Springs addresses`);
    console.log(`  • 25 projects across ${workflowDistribution.length} phases`);
    console.log(`  • Projects distributed: LEAD(5), PROSPECT(5), APPROVED(5), EXECUTION(5), SECOND_SUPPLEMENT(3), COMPLETION(2)`);
    console.log(`  • Trade types: ROOFING(17), GUTTERS(5), INTERIOR_PAINT(3)`);
    console.log(`  • Multiple trade projects: ${projectData.filter(p => p.tradeCount > 1).length}`);
    console.log(`  • Workflow alerts created for 15 active projects`);
    console.log(`  • Realistic budget range: $2,100 - $67,200`);

  } catch (error) {
    console.error('❌ Error during realistic data seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Realistic seed error:', e);
    process.exit(1);
  });