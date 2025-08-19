#!/usr/bin/env node
/*
  Seed one demo customer + project and initialize workflow (non-destructive).
*/
const { PrismaClient } = require('@prisma/client');
const WorkflowInitializationService = require('../services/workflowInitializationService');

const prisma = new PrismaClient();

async function getNextProjectNumber() {
  const last = await prisma.project.findFirst({ orderBy: { projectNumber: 'desc' }, select: { projectNumber: true } });
  return (last?.projectNumber || 10000) + 1;
}

async function main() {
  console.log('🌱 Seeding one demo project (non-destructive)…');
  console.log('DB URL present:', !!process.env.DATABASE_URL);

  // Ensure a PM exists (Mike)
  const pm = await prisma.user.upsert({
    where: { email: 'mike.rodriguez@kenstruction.com' },
    update: {},
    create: {
      firstName: 'Mike',
      lastName: 'Rodriguez',
      email: 'mike.rodriguez@kenstruction.com',
      password: 'seeded-placeholder',
      role: 'PROJECT_MANAGER',
      isActive: true,
    },
    select: { id: true, email: true }
  });

  const ts = Date.now();
  const customer = await prisma.customer.upsert({
    where: { primaryEmail: `demo.customer.${ts}@example.com` },
    update: {},
    create: {
      primaryName: 'Demo Customer',
      primaryEmail: `demo.customer.${ts}@example.com`,
      primaryPhone: '555-0199',
      address: '789 demo ave, sample city, USA',
      primaryContact: 'PRIMARY',
    },
    select: { id: true, primaryName: true, primaryEmail: true }
  });

  const projectNumber = await getNextProjectNumber();
  const start = new Date();
  const end = new Date(start.getTime() + 21 * 24 * 60 * 60 * 1000);

  const project = await prisma.project.create({
    data: {
      projectNumber,
      projectName: 'Demo Roof Replacement – 789 Demo Ave',
      projectType: 'ROOFING',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      budget: '18000.00',
      estimatedCost: '15000.00',
      startDate: start,
      endDate: end,
      customerId: customer.id,
      projectManagerId: pm.id,
      notes: 'Seeded demo project',
    },
    select: { id: true, projectNumber: true, projectName: true }
  });
  console.log('🏗️ Created demo project:', project);

  // Initialize workflow and default steps
  await WorkflowInitializationService.ensureWorkflowExists(project.id);
  console.log('✅ Workflow initialized for demo project');

  console.log('🌱 Demo project seed complete');
}

main()
  .catch(err => {
    console.error('❌ Demo seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


