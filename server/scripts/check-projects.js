#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('DB URL present:', !!process.env.DATABASE_URL);
    const count = await prisma.project.count();
    console.log('Total projects:', count);
    const recent = await prisma.project.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, projectNumber: true, projectName: true, status: true, archived: true }
    });
    console.log('Recent projects:', recent);
  } catch (e) {
    console.error('check-projects error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();


