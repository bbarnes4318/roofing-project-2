#!/usr/bin/env node

const { prisma } = require('../config/prisma');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');

(async () => {
  try {
    const projects = await prisma.project.findMany({ select: { id: true, projectName: true } });
    let initialized = 0;
    for (const p of projects) {
      const existing = await prisma.projectWorkflowTracker.findFirst({ where: { projectId: p.id, isMainWorkflow: true } });
      if (!existing) {
        await WorkflowProgressionService.initializeProjectWorkflow(p.id, 'ROOFING', true, 'LEAD');
        initialized++;
        console.log(`Initialized workflow tracker for project: ${p.projectName}`);
      }
    }
    console.log(`Done. Initialized ${initialized} tracker(s).`);
    process.exit(0);
  } catch (e) {
    console.error('Error initializing trackers:', e);
    process.exit(1);
  }
})();