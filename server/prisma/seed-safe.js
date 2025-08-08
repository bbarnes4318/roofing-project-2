/*
  Production-safe seed: inserts baseline data only if missing.
  - Does NOT delete/truncate anything
  - Idempotent via upserts and existence checks
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upsertUser(user) {
  return prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password || 'seeded-placeholder',
      role: user.role,
      isActive: true,
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });
}

async function upsertCustomer(cust) {
  return prisma.customer.upsert({
    where: { primaryEmail: cust.primaryEmail },
    update: {},
    create: {
      primaryName: cust.primaryName,
      primaryEmail: cust.primaryEmail,
      primaryPhone: cust.primaryPhone || '555-0100',
      address: cust.address || '123 Main St, Anywhere, USA',
      primaryContact: 'PRIMARY',
    },
    select: { id: true, primaryName: true, primaryEmail: true },
  });
}

async function getNextProjectNumber() {
  const last = await prisma.project.findFirst({ orderBy: { projectNumber: 'desc' }, select: { projectNumber: true } });
  return (last?.projectNumber || 10000) + 1;
}

async function createProjectIfNone(projectName, customerId, projectManagerId) {
  const existingCount = await prisma.project.count();
  if (existingCount > 0) return null;

  const number = await getNextProjectNumber();
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

  return prisma.project.create({
    data: {
      projectNumber: number,
      projectName,
      projectType: 'ROOF_REPLACEMENT',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      budget: '15000.00',
      estimatedCost: '12000.00',
      startDate: start,
      endDate: end,
      customerId,
      projectManagerId,
      notes: 'Seeded project',
    },
    select: { id: true, projectNumber: true, projectName: true },
  });
}

async function ensureRoleAssignment(roleType, userId) {
  const existing = await prisma.roleAssignment.findFirst({ where: { roleType } });
  if (existing) return existing;
  return prisma.roleAssignment.create({
    data: {
      roleType, // PROJECT_MANAGER | FIELD_DIRECTOR | OFFICE_STAFF | ADMINISTRATION
      userId,
      assignedAt: new Date(),
    },
    select: { id: true, roleType: true, userId: true },
  });
}

async function main() {
  console.log('🌱 Safe seeding started (no destructive operations)');
  console.log('DB URL present:', !!process.env.DATABASE_URL);

  // Users
  const admin = await upsertUser({ firstName: 'Sarah', lastName: 'Owner', email: 'sarah.owner@kenstruction.com', role: 'ADMIN' });
  const pm = await upsertUser({ firstName: 'Mike', lastName: 'Rodriguez', email: 'mike.rodriguez@kenstruction.com', role: 'PROJECT_MANAGER' });
  const fd = await upsertUser({ firstName: 'Tom', lastName: 'Anderson', email: 'tom.anderson@kenstruction.com', role: 'FOREMAN' });
  const office = await upsertUser({ firstName: 'Maria', lastName: 'Garcia', email: 'maria.garcia@kenstruction.com', role: 'WORKER' });

  console.log('👥 Users ensured:', { admin, pm, fd, office });

  // Role assignments (for alerts and Settings → Roles)
  await ensureRoleAssignment('PROJECT_MANAGER', pm.id);
  await ensureRoleAssignment('FIELD_DIRECTOR', fd.id);
  await ensureRoleAssignment('OFFICE_STAFF', office.id);
  await ensureRoleAssignment('ADMINISTRATION', admin.id);
  console.log('✅ Role assignments ensured');

  // Customer
  const customer = await upsertCustomer({
    primaryName: 'John Doe',
    primaryEmail: 'john.doe@example.com',
    address: '456 Elm St, Springfield, USA',
    primaryPhone: '555-0111',
  });
  console.log('👤 Customer ensured:', customer);

  // Project (only create if there are no projects yet)
  const project = await createProjectIfNone('123 Main St – Roof Replacement', customer.id, pm.id);
  if (project) {
    console.log('🏗️ Project created:', project);
  } else {
    console.log('ℹ️ Projects already exist; no new project created');
  }

  console.log('🌱 Safe seed completed');
}

main()
  .catch((e) => {
    console.error('❌ Safe seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


