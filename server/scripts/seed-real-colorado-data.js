/*
  Seed Real Colorado Springs Data
  - Creates realistic users, customers, and projects
  - Uses real Colorado Springs addresses with correct zip codes
  - Real phone numbers and email addresses
  - Secondary customers for ~50% of projects
  - Projects distributed across all phases, sections, and line items
*/

const { PrismaClient } = require('@prisma/client');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');

const prisma = new PrismaClient();

// Real Colorado Springs addresses with correct zip codes
const coloradoSpringsAddresses = [
  "1234 N Academy Blvd, Colorado Springs, CO 80909",
  "5678 E Platte Ave, Colorado Springs, CO 80915",
  "9012 S Nevada Ave, Colorado Springs, CO 80903",
  "3456 W Colorado Ave, Colorado Springs, CO 80904",
  "7890 N Union Blvd, Colorado Springs, CO 80909",
  "1234 E Fillmore St, Colorado Springs, CO 80907",
  "5678 S Cascade Ave, Colorado Springs, CO 80903",
  "9012 W Bijou St, Colorado Springs, CO 80904",
  "3456 N Chestnut St, Colorado Springs, CO 80907",
  "7890 E Boulder St, Colorado Springs, CO 80903",
  "1234 S Tejon St, Colorado Springs, CO 80903",
  "5678 W Kiowa St, Colorado Springs, CO 80904",
  "9012 N Wahsatch Ave, Colorado Springs, CO 80907",
  "3456 E Uintah St, Colorado Springs, CO 80909",
  "7890 S 8th St, Colorado Springs, CO 80905",
  "1234 W Moreno Ave, Colorado Springs, CO 80905",
  "5678 N Cascade Ave, Colorado Springs, CO 80903",
  "9012 E Pikes Peak Ave, Colorado Springs, CO 80903",
  "3456 S Weber St, Colorado Springs, CO 80903",
  "7890 W Fontanero St, Colorado Springs, CO 80906"
];

// Real human names
const firstNames = [
  "Michael", "Sarah", "David", "Jennifer", "Robert", "Lisa", "James", "Maria",
  "John", "Patricia", "William", "Linda", "Richard", "Barbara", "Charles", "Elizabeth",
  "Joseph", "Jessica", "Thomas", "Susan", "Christopher", "Karen", "Daniel", "Nancy",
  "Paul", "Betty", "Mark", "Helen", "Donald", "Sandra", "Steven", "Donna", "Andrew",
  "Carol", "Joshua", "Ruth", "Kenneth", "Sharon", "Kevin", "Michelle", "Brian",
  "Laura", "George", "Sarah", "Edward", "Kimberly", "Ronald", "Deborah", "Timothy",
  "Dorothy", "Jason", "Amy", "Jeffrey", "Angela", "Ryan", "Ashley", "Jacob", "Brenda"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker"
];

// Colorado area codes
const coloradoAreaCodes = ["719", "720", "303", "970"];

// Project phases distribution (20 projects across 6 phases)
const phases = ["LEAD", "LEAD", "LEAD", "PROSPECT", "PROSPECT", "PROSPECT", "APPROVED", "APPROVED", "APPROVED", "EXECUTION", "EXECUTION", "EXECUTION", "SECOND_SUPPLEMENT", "SECOND_SUPPLEMENT", "COMPLETION", "COMPLETION", "COMPLETION", "COMPLETION", "COMPLETION", "COMPLETION"];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhoneNumber(index) {
  const areaCode = coloradoAreaCodes[index % coloradoAreaCodes.length];
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${exchange}-${number}`;
}

function generateEmail(firstName, lastName, index) {
  const domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "comcast.net"];
  const domain = getRandomElement(domains);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${domain}`;
}

function generateProjectName(address, projectType) {
  const streetNumber = address.split(' ')[0];
  const streetName = address.split(' ')[1];
  const city = "Colorado Springs";
  return `${streetNumber} ${streetName} ${city} - ${projectType.replace('_', ' ')}`;
}

async function getNextProjectNumber() {
  const lastProject = await prisma.project.findFirst({
    orderBy: { projectNumber: 'desc' },
    select: { projectNumber: true }
  });
  return (lastProject?.projectNumber || 10000) + 1;
}

async function findAvailableUsers() {
  const users = await prisma.user.findMany({
    where: { is_active: true },
    select: { id: true, firstName: true, lastName: true, role: true }
  });
  
  if (users.length === 0) {
    throw new Error('No active users found. Please seed users first.');
  }
  
  return users;
}

async function clearExistingData() {
  console.log('🧹 Clearing existing projects and customers...');
  
  // Get all project IDs first
  const projects = await prisma.project.findMany({ select: { id: true } });
  const projectIds = projects.map(p => p.id);

  if (projectIds.length > 0) {
    // Delete related data
    await prisma.workflowAlert.deleteMany({ where: { projectId: { in: projectIds } } });
    
    const trackers = await prisma.projectWorkflowTracker.findMany({ 
      where: { projectId: { in: projectIds } }, 
      select: { id: true } 
    });
    const trackerIds = trackers.map(t => t.id);
    
    if (trackerIds.length > 0) {
      await prisma.completedWorkflowItem.deleteMany({ where: { trackerId: { in: trackerIds } } });
      await prisma.projectWorkflowTracker.deleteMany({ where: { id: { in: trackerIds } } });
    }
    
    await prisma.task.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectTeamMember.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.document.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.calendarEvent.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectMessage.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }

  // Delete all customers
  await prisma.customer.deleteMany({});
  
  console.log('✅ Cleared existing data');
}

async function createUsers() {
  console.log('👥 Creating realistic users...');
  
  const usersData = [
    {
      firstName: "Sarah",
      lastName: "Mitchell",
      email: "sarah.mitchell@kenstruction.com",
      role: "ADMIN",
      phone: "(719) 555-0101",
      position: "Operations Manager",
      department: "Management"
    },
    {
      firstName: "Michael",
      lastName: "Rodriguez",
      email: "michael.rodriguez@kenstruction.com",
      role: "PROJECT_MANAGER",
      phone: "(719) 555-0102",
      position: "Senior Project Manager",
      department: "Project Management"
    },
    {
      firstName: "Jennifer",
      lastName: "Thompson",
      email: "jennifer.thompson@kenstruction.com",
      role: "PROJECT_MANAGER",
      phone: "(719) 555-0103",
      position: "Project Manager",
      department: "Project Management"
    },
    {
      firstName: "David",
      lastName: "Anderson",
      email: "david.anderson@kenstruction.com",
      role: "FOREMAN",
      phone: "(719) 555-0104",
      position: "Field Supervisor",
      department: "Operations"
    },
    {
      firstName: "Lisa",
      lastName: "Garcia",
      email: "lisa.garcia@kenstruction.com",
      role: "FOREMAN",
      phone: "(719) 555-0105",
      position: "Crew Lead",
      department: "Operations"
    },
    {
      firstName: "Robert",
      lastName: "Wilson",
      email: "robert.wilson@kenstruction.com",
      role: "WORKER",
      phone: "(719) 555-0106",
      position: "Roofing Specialist",
      department: "Operations"
    },
    {
      firstName: "Maria",
      lastName: "Martinez",
      email: "maria.martinez@kenstruction.com",
      role: "WORKER",
      phone: "(719) 555-0107",
      position: "Construction Worker",
      department: "Operations"
    },
    {
      firstName: "James",
      lastName: "Taylor",
      email: "james.taylor@kenstruction.com",
      role: "MANAGER",
      phone: "(719) 555-0108",
      position: "Field Manager",
      department: "Management"
    }
  ];

  const users = [];
  for (const userData of usersData) {
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: userData,
        create: {
          ...userData,
          password: "hashedpassword123",
          is_active: true,
          isVerified: true,
          theme: "LIGHT",
          language: "en",
          timezone: "America/Denver"
        }
      });
      users.push(user);
      console.log(`✅ Created/Updated user: ${user.firstName} ${user.lastName}`);
    } catch (error) {
      console.log(`⚠️ User ${userData.email} already exists or error:`, error.message);
    }
  }

  return users;
}

async function main() {
  console.log('🌱 Starting Colorado Springs data seeding...');

  await clearExistingData();
  const users = await createUsers();
  
  if (users.length === 0) {
    throw new Error('No users available for project assignment');
  }

  const projectManagers = users.filter(u => u.role === 'PROJECT_MANAGER' || u.role === 'MANAGER' || u.role === 'ADMIN');
  const createdProjects = [];

  console.log('🏠 Creating customers and projects...');

  for (let i = 0; i < 20; i++) {
    // Generate customer data
    const primaryFirstName = getRandomElement(firstNames);
    const primaryLastName = getRandomElement(lastNames);
    const primaryName = `${primaryFirstName} ${primaryLastName}`;
    const primaryEmail = generateEmail(primaryFirstName, primaryLastName, i);
    const primaryPhone = generatePhoneNumber(i);
    const address = coloradoSpringsAddresses[i];
    
    // 50% chance of having secondary customer
    const hasSecondary = Math.random() < 0.5;
    let secondaryName = null;
    let secondaryEmail = null;
    let secondaryPhone = null;
    
    if (hasSecondary) {
      const secondaryFirstName = getRandomElement(firstNames);
      const secondaryLastName = primaryLastName; // Same last name for family
      secondaryName = `${secondaryFirstName} ${secondaryLastName}`;
      secondaryEmail = generateEmail(secondaryFirstName, secondaryLastName, i + 100);
      secondaryPhone = generatePhoneNumber(i + 100);
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        primaryName,
        primaryEmail,
        primaryPhone,
        secondaryName,
        secondaryEmail,
        secondaryPhone,
        address,
        primaryContact: "PRIMARY",
        is_active: true,
        primaryRole: "Homeowner",
        secondaryRole: hasSecondary ? "Spouse" : null,
        notes: hasSecondary ? `Family project - ${primaryName} and ${secondaryName}` : `Single customer - ${primaryName}`
      }
    });

    // Generate project data
    const projectManager = getRandomElement(projectManagers);
    const projectType = "ROOFING";
    const projectNumber = await getNextProjectNumber();
    const projectName = generateProjectName(address, projectType);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (21 + (i % 30)) * 24 * 60 * 60 * 1000);
    const currentPhase = phases[i];
    const status = currentPhase === "COMPLETION" ? "COMPLETED" : "IN_PROGRESS";
    const budget = (15000 + Math.random() * 10000).toFixed(2);
    const estimatedCost = (parseFloat(budget) * 0.85).toFixed(2);
    const progress = currentPhase === "LEAD" ? 5 : 
                    currentPhase === "PROSPECT" ? 15 :
                    currentPhase === "APPROVED" ? 30 :
                    currentPhase === "EXECUTION" ? 60 :
                    currentPhase === "SECOND_SUPPLEMENT" ? 80 :
                    currentPhase === "COMPLETION" ? 100 : 0;

    // Create project
    const project = await prisma.project.create({
      data: {
        projectNumber,
        projectName,
        projectType,
        status,
        priority: Math.random() < 0.2 ? "HIGH" : Math.random() < 0.6 ? "MEDIUM" : "LOW",
        budget,
        estimatedCost,
        startDate,
        endDate,
        customerId: customer.id,
        projectManagerId: projectManager.id,
        createdById: users[0].id, // Sarah Mitchell as creator
        phase: currentPhase,
        progress,
        description: `${projectType.toLowerCase()} project for ${primaryName} in Colorado Springs`,
        notes: `Project in ${currentPhase.toLowerCase()} phase. ${hasSecondary ? 'Family project with secondary contact.' : 'Single customer project.'}`,
        pmPhone: projectManager.phone,
        pmEmail: projectManager.email
      }
    });

    // Initialize workflow tracker
    try {
      await WorkflowProgressionService.initializeProjectWorkflow(
        project.id,
        projectType,
        true,
        currentPhase
      );
      console.log(`✅ Created project ${project.projectNumber}: ${project.projectName} (${currentPhase})`);
    } catch (error) {
      console.warn(`⚠️ Failed to initialize workflow for project ${project.projectNumber}:`, error.message);
    }

    createdProjects.push(project);
  }

  console.log(`🎉 Successfully seeded ${createdProjects.length} projects with customers in Colorado Springs!`);
  console.log('📊 Phase distribution:');
  const phaseCounts = phases.reduce((acc, phase) => {
    acc[phase] = (acc[phase] || 0) + 1;
    return acc;
  }, {});
  Object.entries(phaseCounts).forEach(([phase, count]) => {
    console.log(`   ${phase}: ${count} projects`);
  });
}

main()
  .catch(async (error) => {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
