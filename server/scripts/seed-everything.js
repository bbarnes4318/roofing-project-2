/*
 * Seed everything: users, customers, projects, trackers, alerts, messages
 * Usage: node server/scripts/seed-everything.js 10   # seeds N of each core entity
 */

const { prisma } = require('../config/prisma');

// Real Colorado data for seeding
const coloradoNames = [
  'James Rodriguez', 'Sarah Thompson', 'Michael Chen', 'Emily Davis', 'David Wilson',
  'Jessica Martinez', 'Christopher Brown', 'Amanda Garcia', 'Daniel Miller', 'Ashley Johnson',
  'Robert Taylor', 'Nicole Anderson', 'Matthew Thomas', 'Stephanie White', 'Joshua Lee',
  'Rachel Moore', 'Andrew Jackson', 'Lauren Martin', 'Ryan Clark', 'Megan Lewis',
  'Kevin Hall', 'Brittany Young', 'Steven Allen', 'Amber King', 'Brian Wright',
  'Danielle Green', 'Jason Baker', 'Heather Adams', 'Eric Nelson', 'Tiffany Carter'
];

const coloradoAddresses = [
  '1234 Mountain View Dr, Denver, CO 80202',
  '5678 Pine Street, Boulder, CO 80301',
  '9012 Oak Avenue, Colorado Springs, CO 80901',
  '3456 Elm Road, Fort Collins, CO 80521',
  '7890 Cedar Lane, Aurora, CO 80010',
  '2345 Aspen Way, Lakewood, CO 80215',
  '6789 Spruce Circle, Westminster, CO 80020',
  '0123 Maple Drive, Arvada, CO 80002',
  '4567 Birch Street, Thornton, CO 80229',
  '8901 Willow Road, Pueblo, CO 81001',
  '2345 Redwood Ave, Greeley, CO 80631',
  '6789 Sequoia Blvd, Longmont, CO 80501',
  '0123 Douglas St, Loveland, CO 80537',
  '4567 Ponderosa Dr, Grand Junction, CO 81501',
  '8901 Lodgepole Way, Durango, CO 81301',
  '2345 Juniper Lane, Steamboat Springs, CO 80487',
  '6789 Cottonwood Rd, Aspen, CO 81611',
  '0123 Blue Spruce Ave, Vail, CO 81657',
  '4567 Lodgepole Circle, Breckenridge, CO 80424',
  '8901 Aspen Grove Dr, Telluride, CO 81435',
  '2345 Pine Ridge Way, Estes Park, CO 80517',
  '6789 Mountain Meadow Rd, Glenwood Springs, CO 81601',
  '0123 Valley View St, Montrose, CO 81401',
  '4567 Canyon Crest Dr, Gunnison, CO 81230',
  '8901 Mesa Verde Way, Cortez, CO 81321',
  '2345 San Juan Ave, Pagosa Springs, CO 81147',
  '6789 Rio Grande Blvd, Alamosa, CO 81101',
  '0123 Sangre de Cristo Dr, Salida, CO 81201',
  '4567 Arkansas River Way, Buena Vista, CO 81211',
  '8901 Collegiate Peak Rd, Leadville, CO 80461',
  '2345 Continental Divide Dr, Frisco, CO 80443',
  '6789 Ten Mile Circle, Dillon, CO 80435',
  '0123 Summit County Way, Silverthorne, CO 80498',
  '4567 Blue River Dr, Keystone, CO 80435',
  '8901 Snake River Rd, Copper Mountain, CO 80443'
];

const coloradoEmails = [
  'james.rodriguez@colorado.com', 'sarah.thompson@colorado.com', 'michael.chen@colorado.com',
  'emily.davis@colorado.com', 'david.wilson@colorado.com', 'jessica.martinez@colorado.com',
  'christopher.brown@colorado.com', 'amanda.garcia@colorado.com', 'daniel.miller@colorado.com',
  'ashley.johnson@colorado.com', 'robert.taylor@colorado.com', 'nicole.anderson@colorado.com',
  'matthew.thomas@colorado.com', 'stephanie.white@colorado.com', 'joshua.lee@colorado.com',
  'rachel.moore@colorado.com', 'andrew.jackson@colorado.com', 'lauren.martin@colorado.com',
  'ryan.clark@colorado.com', 'megan.lewis@colorado.com', 'kevin.hall@colorado.com',
  'brittany.young@colorado.com', 'steven.allen@colorado.com', 'amber.king@colorado.com',
  'brian.wright@colorado.com', 'danielle.green@colorado.com', 'jason.baker@colorado.com',
  'heather.adams@colorado.com', 'eric.nelson@colorado.com', 'tiffany.carter@colorado.com'
];

const coloradoPhones = [
  '303-555-0101', '303-555-0102', '303-555-0103', '303-555-0104', '303-555-0105',
  '303-555-0106', '303-555-0107', '303-555-0108', '303-555-0109', '303-555-0110',
  '720-555-0101', '720-555-0102', '720-555-0103', '720-555-0104', '720-555-0105',
  '720-555-0106', '720-555-0107', '720-555-0108', '720-555-0109', '720-555-0110',
  '970-555-0101', '970-555-0102', '970-555-0103', '970-555-0104', '970-555-0105',
  '970-555-0106', '970-555-0107', '970-555-0108', '970-555-0109', '970-555-0110'
];

const customerNames = [
  'George Matthews', 'Wilma Miller', 'Robert Johnson', 'Patricia Davis', 'Michael Wilson',
  'Linda Brown', 'James Taylor', 'Barbara Anderson', 'David Martinez', 'Elizabeth Garcia',
  'Richard Rodriguez', 'Jennifer Lopez', 'Thomas Gonzalez', 'Maria Hernandez', 'Christopher Perez',
  'Susan Moore', 'Daniel Jackson', 'Lisa Thompson', 'Matthew White', 'Nancy Harris',
  'Anthony Clark', 'Karen Lewis', 'Mark Robinson', 'Betty Walker', 'Donald Young',
  'Helen Allen', 'Steven King', 'Sandra Wright', 'Paul Green', 'Donna Baker'
];

const customerEmails = [
  'george.matthews@email.com', 'wilma.miller@email.com', 'robert.johnson@email.com',
  'patricia.davis@email.com', 'michael.wilson@email.com', 'linda.brown@email.com',
  'james.taylor@email.com', 'barbara.anderson@email.com', 'david.martinez@email.com',
  'elizabeth.garcia@email.com', 'richard.rodriguez@email.com', 'jennifer.lopez@email.com',
  'thomas.gonzalez@email.com', 'maria.hernandez@email.com', 'christopher.perez@email.com',
  'susan.moore@email.com', 'daniel.jackson@email.com', 'lisa.thompson@email.com',
  'matthew.white@email.com', 'nancy.harris@email.com', 'anthony.clark@email.com',
  'karen.lewis@email.com', 'mark.robinson@email.com', 'betty.walker@email.com',
  'donald.young@email.com', 'helen.allen@email.com', 'steven.king@email.com',
  'sandra.wright@email.com', 'paul.green@email.com', 'donna.baker@email.com'
];

const customerPhones = [
  '303-555-0201', '303-555-0202', '303-555-0203', '303-555-0204', '303-555-0205',
  '303-555-0206', '303-555-0207', '303-555-0208', '303-555-0209', '303-555-0210',
  '720-555-0201', '720-555-0202', '720-555-0203', '720-555-0204', '720-555-0205',
  '720-555-0206', '720-555-0207', '720-555-0208', '720-555-0209', '720-555-0210',
  '970-555-0201', '970-555-0202', '970-555-0203', '970-555-0204', '970-555-0205',
  '970-555-0206', '970-555-0207', '970-555-0208', '970-555-0209', '970-555-0210'
];

function randFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function ensurePhasesSectionsLineItems() {
  const phases = await prisma.workflowPhase.findMany({ include: { sections: { include: { lineItems: true } } } });
  if (phases.length > 0) return phases;
  throw new Error('No workflow template found (phases/sections/line items). Upload those first.');
}

async function seedUsers(n) {
  const roles = ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const fullName = coloradoNames[i % coloradoNames.length];
    const [firstName, lastName] = fullName.split(' ');
    const email = coloradoEmails[i % coloradoEmails.length];
    const phone = coloradoPhones[i % coloradoPhones.length];
    const u = await prisma.user.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        phone,
        role: randFrom(roles),
        theme: 'LIGHT',
        language: 'en'
      },
      create: {
        firstName,
        lastName,
        email,
        password: 'Temp#12345',
        phone,
        role: randFrom(roles),
        theme: 'LIGHT',
        language: 'en'
      }
    });
    out.push(u);
  }
  return out;
}

async function seedCustomers(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const name = customerNames[i % customerNames.length];
    const email = customerEmails[i % customerEmails.length];
    const phone = coloradoPhones[i % coloradoPhones.length];
    const address = coloradoAddresses[i % coloradoAddresses.length];
    const c = await prisma.customer.upsert({
      where: { primaryEmail: email },
      update: {
        primaryName: name,
        primaryPhone: phone,
        address,
        isActive: true
      },
      create: {
        primaryName: name,
        primaryEmail: email,
        primaryPhone: phone,
        address,
        isActive: true
      }
    });
    out.push(c);
  }
  return out;
}

async function seedProjects(n, users, customers) {
  const projectTypes = ['ROOFING', 'GUTTERS', 'INTERIOR_PAINT'];
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  const out = [];
  const agg = await prisma.project.aggregate({ _max: { projectNumber: true } });
  const startNum = (agg._max.projectNumber || 80000) + 1;
  for (let i = 0; i < n; i++) {
    const customer = randFrom(customers);
    const pm = randFrom(users);
    const projectNumber = startNum + i;
    const projectType = randFrom(projectTypes);
    const projectName = `${customer.primaryName} - ${projectType} Project`;
    const data = {
      projectNumber,
      projectName,
      projectType,
      status: randFrom(statuses),
      description: `${projectType} project for ${customer.primaryName}`,
      priority: 'MEDIUM',
      budget: '10000.00',
      startDate: new Date(),
      endDate: daysFromNow(30),
      customerId: customer.id,
      projectManagerId: pm.id,
      createdById: pm.id
    };
    const p = await prisma.project.upsert({
      where: { projectNumber },
      update: {
        projectName: data.projectName,
        status: data.status,
        description: data.description,
        priority: data.priority,
        endDate: data.endDate,
        projectManagerId: data.projectManagerId
      },
      create: data
    });
    out.push(p);
  }
  return out;
}

async function seedTrackersForProjects(projects) {
  const phases = await prisma.workflowPhase.findMany();
  const out = [];
  for (const proj of projects) {
    const phase = randFrom(phases);
    const t = await prisma.projectWorkflowTracker.create({
      data: {
        projectId: proj.id,
        currentPhaseId: phase?.id || null,
        isMainWorkflow: true,
        workflowType: 'ROOFING',
        totalLineItems: 0
      }
    });
    out.push(t);
  }
  return out;
}

async function seedAlertsMessages(projects, users) {
  // Get actual workflow data from the database
  const phases = await prisma.workflowPhase.findMany({ 
    include: { 
      sections: { 
        include: { 
          lineItems: true 
        } 
      } 
    } 
  });
  
  const out = { alerts: [], messages: [] };
  
  for (const proj of projects) {
    const author = randFrom(users);
    
    // Pick a random phase that has sections
    const phase = randFrom(phases.filter(p => p.sections.length > 0));
    if (!phase) continue;
    
    // Pick a random section that has line items
    const section = randFrom(phase.sections.filter(s => s.lineItems.length > 0));
    if (!section) continue;
    
    // Pick a random line item
    const lineItem = randFrom(section.lineItems);

    const alert = await prisma.workflowAlert.create({
      data: {
        title: `Action needed: ${lineItem.itemName}`,
        message: `Please complete ${lineItem.itemName} for project ${proj.projectName}.`,
        stepName: lineItem.itemName,
        projectId: proj.id,
        assignedToId: author.id,
        createdById: author.id,
        priority: 'MEDIUM',
        status: 'ACTIVE',
        dueDate: daysFromNow(7),
        lineItemId: lineItem.id,
        phaseId: phase.id,
        sectionId: section.id,
        responsibleRole: lineItem.responsibleRole || 'OFFICE'
      }
    });
    out.alerts.push(alert);

    const msg = await prisma.projectMessage.create({
      data: {
        content: `Workflow update for ${proj.projectName}: ${lineItem.itemName} is ready for completion.`,
        subject: 'Workflow Update',
        projectId: proj.id,
        projectNumber: proj.projectNumber,
        authorId: author.id,
        authorName: `${author.firstName} ${author.lastName}`,
        isSystemGenerated: false,
        isWorkflowMessage: true,
        stepName: lineItem.itemName,
        phase: phase.phaseType || 'EXECUTION',
        section: section.sectionName,
        lineItem: lineItem.itemName,
        priority: 'MEDIUM'
      }
    });
    out.messages.push(msg);
  }
  return out;
}

async function main() {
  const N = parseInt(process.argv[2] || '10', 10);
  await ensurePhasesSectionsLineItems();

  console.log(`Seeding ${N} users, ${N} customers, ${N} projects, plus trackers/alerts/messages...`);
  const users = await seedUsers(N);
  const customers = await seedCustomers(N);
  const projects = await seedProjects(N, users, customers);
  const trackers = await seedTrackersForProjects(projects);
  const { alerts, messages } = await seedAlertsMessages(projects, users);

  console.log('Seed summary:');
  console.log({ users: users.length, customers: customers.length, projects: projects.length, trackers: trackers.length, alerts: alerts.length, messages: messages.length });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


