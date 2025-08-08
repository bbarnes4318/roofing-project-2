const express = require('express');
const { prisma } = require('../config/prisma');

const router = express.Router();

router.get('/snapshot', async (req, res) => {
  try {
    const [
      users, customers, projects, projectWorkflows, projectWorkflowTrackers,
      workflowPhases, workflowSections, workflowSteps, workflowSubTasks, roleAssignments,
      counts
    ] = await Promise.all([
      prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.customer.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.project.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.projectWorkflow.findMany({ take: 5, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.projectWorkflowTracker?.findMany({ take: 5, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.workflowPhase?.findMany({ take: 5 }).catch(() => []),
      prisma.workflowSection?.findMany({ take: 5 }).catch(() => []),
      prisma.workflowStep?.findMany({ take: 5, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.workflowSubTask?.findMany({ take: 5 }).catch(() => []),
      prisma.roleAssignment?.findMany({ take: 5, orderBy: { createdAt: 'desc' } }).catch(() => []),
      (async () => ({
        users: await prisma.user.count(),
        customers: await prisma.customer.count(),
        projects: await prisma.project.count(),
        project_workflows: await prisma.projectWorkflow.count().catch(() => 'n/a'),
        project_workflow_trackers: await prisma.projectWorkflowTracker?.count().catch(() => 'n/a'),
        workflow_phases: await prisma.workflowPhase?.count().catch(() => 'n/a'),
        workflow_sections: await prisma.workflowSection?.count().catch(() => 'n/a'),
        workflow_steps: await prisma.workflowStep?.count().catch(() => 'n/a'),
        workflow_subtasks: await prisma.workflowSubTask?.count().catch(() => 'n/a'),
        role_assignments: await prisma.roleAssignment?.count().catch(() => 'n/a')
      }))()
    ]);

    const dbUrl = process.env.DATABASE_URL || '';
    const redactedDb = dbUrl ? dbUrl.replace(/:\/\/[^:]+:([^@]+)@/, '://***:***@') : '';

    res.json({
      success: true,
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      databaseUrlPreview: redactedDb.slice(0, 60) + '...' + redactedDb.slice(-20),
      counts,
      samples: {
        users,
        customers,
        projects,
        projectWorkflows,
        projectWorkflowTrackers,
        workflowPhases,
        workflowSections,
        workflowSteps,
        workflowSubTasks,
        roleAssignments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;



