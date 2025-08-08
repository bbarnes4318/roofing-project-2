#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const entries = await Promise.all([
      prisma.user.count().then(v => ['users', v]),
      prisma.customer.count().then(v => ['customers', v]),
      prisma.project.count().then(v => ['projects', v]),
      prisma.projectWorkflow.count().then(v => ['project_workflows', v]),
      prisma.projectWorkflowTracker.count().then(v => ['project_workflow_trackers', v]).catch(() => ['project_workflow_trackers', 'n/a']),
      prisma.workflowStep.count().then(v => ['workflow_steps', v]),
      prisma.workflowSubTask.count().then(v => ['workflow_subtasks', v]).catch(() => ['workflow_subtasks', 'n/a']),
      prisma.workflowSection.count().then(v => ['workflow_sections', v]).catch(() => ['workflow_sections', 'n/a']),
      prisma.workflowPhase.count().then(v => ['workflow_phases', v]).catch(() => ['workflow_phases', 'n/a']),
      prisma.roleAssignment.count().then(v => ['role_assignments', v]),
    ]);
    const result = Object.fromEntries(entries);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('check-counts error:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();


