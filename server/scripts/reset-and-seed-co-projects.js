/*
  Reset and seed fresh Colorado projects and customers (NON-SCHEMA-CHANGING)
  - Deletes ONLY project-related data and customers
  - Preserves users, role assignments, and global config
  - Seeds 20 projects and customers with realistic Colorado data
  - Distributes projects across phases approximately equally
  - Initializes workflow trackers at the specified starting phase
*/

const { PrismaClient } = require('@prisma/client');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');

const prisma = new PrismaClient();

function pick(arr, idx) { return arr[idx % arr.length]; }

const cities = [
  'Denver, CO 80202',
  'Colorado Springs, CO 80903',
  'Aurora, CO 80012',
  'Fort Collins, CO 80521',
  'Lakewood, CO 80226',
  'Thornton, CO 80241',
  'Arvada, CO 80003',
  'Westminster, CO 80031',
  'Pueblo, CO 81003',
  'Boulder, CO 80302',
  'Greeley, CO 80631',
  'Longmont, CO 80501',
  'Loveland, CO 80538',
  'Broomfield, CO 80020',
  'Centennial, CO 80112'
];

const streets = [
  'Main St', 'Elm St', 'Maple Ave', 'Pine St', 'Oak St', 'Cedar Ave', 'Walnut St', 'Spruce St',
  'Cherry St', 'Broadway', 'Colfax Ave', 'Lincoln Ave', 'Havana St', 'Arapahoe Rd', 'Quebec St'
];

const firstNames = ['Jacob','Emma','Olivia','Liam','Noah','Sophia','Mason','Isabella','Ethan','Ava','Lucas','Mia','Logan','Amelia','Elijah','Harper','James','Evelyn','Aiden','Abigail'];
const lastNames  = ['Johnson','Smith','Williams','Brown','Jones','Garcia','Miller','Davis','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee'];

const areaCodes = ['303','720','719','970'];

const projectTypes = ['ROOFING','GUTTERS','INTERIOR_PAINT'];
const phases = ['LEAD','PROSPECT','APPROVED','EXECUTION','SECOND_SUPPLEMENT','COMPLETION'];
// 20 projects across 6 phases → distribute as evenly as possible
const phaseDistribution = ['LEAD','LEAD','LEAD','LEAD', 'PROSPECT','PROSPECT','PROSPECT','PROSPECT', 'APPROVED','APPROVED','APPROVED', 'EXECUTION','EXECUTION','EXECUTION', 'SECOND_SUPPLEMENT','SECOND_SUPPLEMENT', 'COMPLETION','COMPLETION','COMPLETION','COMPLETION'];

function makePhone(idx) {
  const ac = areaCodes[idx % areaCodes.length];
  const mid = 555;
  const last = String(1000 + (idx % 9000)).slice(-4);
  return `(${ac}) ${mid}-${last}`;
}

function emailFrom(name, idx) {
  const base = name.toLowerCase().replace(/[^a-z]/g,'');
  const domain = 'coloroofers.co';
  return `${base}${idx}@${domain}`;
}

function addressAt(idx) {
  const num = 100 + (idx * 3);
  const street = pick(streets, idx);
  const city = pick(cities, idx);
  return `${num} ${street}, ${city}`;
}

async function getNextProjectNumber() {
  const last = await prisma.project.findFirst({ orderBy: { projectNumber: 'desc' }, select: { projectNumber: true } });
  return (last?.projectNumber || 10000) + 1;
}

async function findProjectManagers() {
  const pms = await prisma.user.findMany({
    where: { role: { in: ['PROJECT_MANAGER','MANAGER'] } },
    select: { id: true, firstName: true, lastName: true, role: true }
  });
  // Fallback to any active user if none
  if (pms.length === 0) {
    const any = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
    return any;
  }
  return pms;
}

async function clearProjectsAndCustomers() {
  console.log('🧹 Clearing existing projects and related data (customers included)...');
  // Collect project IDs first
  const projects = await prisma.project.findMany({ select: { id: true } });
  const projectIds = projects.map(p => p.id);

  if (projectIds.length > 0) {
    // Alerts
    await prisma.workflowAlert.deleteMany({ where: { projectId: { in: projectIds } } });
    // Trackers → completed items then trackers
    const trackers = await prisma.projectWorkflowTracker.findMany({ where: { projectId: { in: projectIds } }, select: { id: true } });
    const trackerIds = trackers.map(t => t.id);
    if (trackerIds.length > 0) {
      await prisma.completedWorkflowItem.deleteMany({ where: { trackerId: { in: trackerIds } } });
      await prisma.projectWorkflowTracker.deleteMany({ where: { id: { in: trackerIds } } });
    }
    // Tasks, members, docs, calendar, messages
    await prisma.task.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectTeamMember.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.document.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.calendarEvent.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectMessage.deleteMany({ where: { projectId: { in: projectIds } } });
    // Finally delete projects
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }

  // Remove all customers (fresh customer set requested)
  await prisma.customer.deleteMany({});
  console.log('✅ Cleared projects and customers');
}

async function main() {
  console.log('🌱 Reset + seed (Colorado) started');

  await clearProjectsAndCustomers();

  const pms = await findProjectManagers();
  if (pms.length === 0) {
    throw new Error('No active users found to assign as project managers');
  }

  const createdProjects = [];

  for (let i = 0; i < 20; i++) {
    const fn = pick(firstNames, i);
    const ln = pick(lastNames, i);
    const primaryName = `${fn} ${ln}`;
    const secondaryName = `${pick(firstNames, i+7)} ${pick(lastNames, i+11)}`;
    const address = addressAt(i);
    const primaryEmail = emailFrom(`${fn}.${ln}`, i);
    const secondaryEmail = emailFrom(`${secondaryName.split(' ')[0]}.${secondaryName.split(' ')[1]}`, i+50);
    const primaryPhone = makePhone(i);
    const secondaryPhone = makePhone(i+100);

    const customer = await prisma.customer.create({
      data: {
        primaryName,
        primaryEmail,
        primaryPhone,
        secondaryName,
        secondaryEmail,
        secondaryPhone,
        address,
        primaryContact: 'PRIMARY'
      },
      select: { id: true, primaryName: true }
    });

    const pmUser = pick(pms, i);
    const projectType = pick(projectTypes, i);
    const projectNumber = await getNextProjectNumber();
    // Use address as projectName for realism
    const projectName = `${address} – ${projectType.replace('_',' ')}`;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (21 + (i % 20)) * 24 * 60 * 60 * 1000);
    const status = (['COMPLETION'].includes(phaseDistribution[i])) ? 'COMPLETED' : 'IN_PROGRESS';

    const project = await prisma.project.create({
      data: {
        projectNumber,
        projectName,
        projectType,
        status,
        priority: 'MEDIUM',
        budget: '18000.00',
        estimatedCost: '15000.00',
        startDate,
        endDate,
        customerId: customer.id,
        projectManagerId: pmUser.id,
        notes: `Colorado residential ${projectType.toLowerCase()} project`,
        // Set phase explicitly (server transforms prefer tracker, but keep this too)
        phase: phaseDistribution[i]
      },
      select: { id: true, projectNumber: true, projectName: true }
    });

    // Initialize workflow and set starting phase
    try {
      await WorkflowProgressionService.initializeProjectWorkflow(
        project.id,
        projectType || 'ROOFING',
        true,
        phaseDistribution[i]
      );
    } catch (e) {
      console.warn(`⚠️ Failed to initialize workflow for ${project.projectNumber}:`, e?.message || e);
    }

    createdProjects.push(project);
  }

  console.log(`✅ Seeded ${createdProjects.length} projects with Colorado customers`);
}

main()
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


