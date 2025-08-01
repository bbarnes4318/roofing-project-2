const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Test endpoint to verify backend is working
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date()
  });
});

// Test endpoint to get projects without authentication (for testing)
router.get('/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        projectManager: true
      }
    });

    res.json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
});

// Test endpoint to get workflows without authentication (for testing)
router.get('/workflows', async (req, res) => {
  try {
    const workflows = await prisma.projectWorkflow.findMany({
      include: {
        project: {
          include: {
            customer: true,
            projectManager: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: workflows,
      count: workflows.length
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflows',
      error: error.message
    });
  }
});

// Test endpoint to get alerts without authentication (for testing)
router.get('/alerts', async (req, res) => {
  try {
    // Get only real workflow alerts from the database
    const workflowAlerts = await prisma.notification.findMany({
      where: {
        type: 'WORKFLOW_ALERT'
      },
      include: {
        recipient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get all projects and workflows for reference
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        projectManager: true
      }
    });

    // Get all workflows to map workflowId to projectId
    const workflows = await prisma.projectWorkflow.findMany({
      select: {
        id: true,
        projectId: true
      }
    });

    // Transform workflow alerts to match frontend expectations
    const transformedAlerts = workflowAlerts.map(alert => {
      // Find the project by matching the projectNumber from actionData to project projectNumber
      const projectNumberFromAlert = alert.actionData?.projectNumber;
      const project = projects.find(p => p.projectNumber === projectNumberFromAlert);
      
      return {
        _id: alert.id,
        id: alert.id,
        title: alert.title,
        message: alert.message,
        type: alert.type,
        isRead: alert.isRead,
        readAt: alert.readAt,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt,
        project: project ? {
          _id: project.id,
          id: project.id,
          projectName: project.projectName, // Use projectName (which is the address)
          projectNumber: project.projectNumber,
          customer: {
            primaryName: project.customer?.primaryName || 'Unknown Customer'
          }
        } : null,
        metadata: {
          stepName: alert.actionData?.stepName || alert.title,
          projectName: alert.actionData?.projectName || project?.projectName || 'Unknown Project',
          projectNumber: project?.projectNumber,
          daysOverdue: alert.actionData?.daysOverdue,
          daysUntilDue: alert.actionData?.daysUntilDue,
          priority: alert.actionData?.priority || 'medium',
          phase: alert.actionData?.phase
        },
        recipient: alert.recipient,
        recipientId: alert.recipientId,
        actionUrl: alert.actionUrl,
        actionData: alert.actionData,
        // Add relatedProject for compatibility with frontend
        relatedProject: project ? {
          _id: project.id,
          projectName: project.projectName,
          projectNumber: project.projectNumber,
          customer: {
            primaryName: project.customer?.primaryName || 'Unknown Customer'
          }
        } : null
      };
    });

    res.json({
      success: true,
      data: transformedAlerts,
      count: transformedAlerts.length
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      details: error.message
    });
  }
});

// Fix existing alerts to include projectNumber
router.post('/fix-alerts-project-numbers', async (req, res) => {
  try {
    // Get all projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        projectName: true
      }
    });

    // Get all workflow alerts
    const workflowAlerts = await prisma.notification.findMany({
      where: {
        type: 'WORKFLOW_ALERT'
      }
    });

    let updatedCount = 0;

    for (const alert of workflowAlerts) {
      const projectNameFromAlert = alert.actionData?.projectName;
      if (projectNameFromAlert) {
        const project = projects.find(p => p.projectName === projectNameFromAlert);
        if (project) {
          // Update the alert's actionData to include projectNumber
          const updatedActionData = {
            ...alert.actionData,
            projectNumber: project.projectNumber
          };

          await prisma.notification.update({
            where: { id: alert.id },
            data: {
              actionData: updatedActionData
            }
          });

          updatedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Updated ${updatedCount} alerts with project numbers`,
      updatedCount
    });

  } catch (error) {
    console.error('Error fixing alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix alerts',
      error: error.message
    });
  }
});

// Generate meaningful alerts for existing projects
router.post('/generate-project-alerts', async (req, res) => {
  try {
    // Get all projects with their details
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        projectManager: true,
        teamMembers: {
          include: {
            user: true
          }
        }
      }
    });

    const generatedAlerts = [];

    for (const project of projects) {
      const alerts = [];

      // 1. Project Status Alerts
      if (project.status === 'PENDING') {
        alerts.push({
          title: 'Project Ready to Start',
          message: `Project ${project.projectName} is pending and ready to begin. Customer: ${project.customer.primaryName}`,
          type: 'PROJECT_UPDATE',
          recipientId: project.projectManagerId,
          actionUrl: `/projects/${project.id}`,
          actionData: {
            projectId: project.id,
            projectName: project.projectName,
            customerName: project.customer.primaryName
          }
        });
      }

      if (project.status === 'IN_PROGRESS') {
        // Progress-based alerts
        if (project.progress < 25) {
          alerts.push({
            title: 'Project Started',
            message: `Project ${project.projectName} has begun. Current progress: ${project.progress}%`,
            type: 'PROJECT_UPDATE',
            recipientId: project.projectManagerId,
            actionUrl: `/projects/${project.id}`,
            actionData: { projectId: project.id, progress: project.progress }
          });
        } else if (project.progress >= 50 && project.progress < 75) {
          alerts.push({
            title: 'Project Milestone Reached',
            message: `Project ${project.projectName} is ${project.progress}% complete. Great progress!`,
            type: 'PROJECT_UPDATE',
            recipientId: project.projectManagerId,
            actionUrl: `/projects/${project.id}`,
            actionData: { projectId: project.id, progress: project.progress }
          });
        } else if (project.progress >= 90) {
          alerts.push({
            title: 'Project Nearing Completion',
            message: `Project ${project.projectName} is ${project.progress}% complete. Final stages approaching.`,
            type: 'PROJECT_UPDATE',
            recipientId: project.projectManagerId,
            actionUrl: `/projects/${project.id}`,
            actionData: { projectId: project.id, progress: project.progress }
          });
        }
      }

      if (project.status === 'ON_HOLD') {
        alerts.push({
          title: 'Project On Hold',
          message: `Project ${project.projectName} has been placed on hold. Action required.`,
          type: 'WORKFLOW_ALERT',
          recipientId: project.projectManagerId,
          actionUrl: `/projects/${project.id}`,
          actionData: { projectId: project.id, status: project.status }
        });
      }

      if (project.status === 'COMPLETED') {
        alerts.push({
          title: 'Project Completed',
          message: `Congratulations! Project ${project.projectName} has been completed successfully.`,
          type: 'TASK_COMPLETED',
          recipientId: project.projectManagerId,
          actionUrl: `/projects/${project.id}`,
          actionData: { projectId: project.id, status: project.status }
        });
      }

      // 2. Deadline Alerts
      if (project.endDate) {
        const endDate = new Date(project.endDate);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
          alerts.push({
            title: 'Project Deadline Approaching',
            message: `Project ${project.projectName} deadline is in ${daysUntilDeadline} days. Current progress: ${project.progress}%`,
            type: 'REMINDER',
            recipientId: project.projectManagerId,
            actionUrl: `/projects/${project.id}`,
            actionData: { projectId: project.id, daysUntilDeadline, progress: project.progress }
          });
        } else if (daysUntilDeadline < 0) {
          alerts.push({
            title: 'Project Overdue',
            message: `Project ${project.projectName} is ${Math.abs(daysUntilDeadline)} days overdue. Immediate attention required.`,
            type: 'WORKFLOW_ALERT',
            recipientId: project.projectManagerId,
            actionUrl: `/projects/${project.id}`,
            actionData: { projectId: project.id, daysOverdue: Math.abs(daysUntilDeadline) }
          });
        }
      }

      // 3. Budget Alerts
      if (project.actualCost && project.budget) {
        const budget = parseFloat(project.budget);
        const actualCost = parseFloat(project.actualCost);
        const overage = ((actualCost - budget) / budget) * 100;

        if (overage > 10) {
          alerts.push({
            title: 'Budget Overrun Alert',
            message: `Project ${project.projectName} is ${overage.toFixed(1)}% over budget. Current: $${actualCost.toLocaleString()}, Budget: $${budget.toLocaleString()}`,
            type: 'WORKFLOW_ALERT',
            recipientId: project.projectManagerId,
            actionUrl: `/projects/${project.id}`,
            actionData: { projectId: project.id, overage: overage.toFixed(1), actualCost, budget }
          });
        }
      }

      // 4. Team Assignment Alerts
      for (const teamMember of project.teamMembers) {
        if (teamMember.role === 'Worker') {
          alerts.push({
            title: 'New Task Assignment',
            message: `You have been assigned to project ${project.projectName} as a worker.`,
            type: 'TASK_ASSIGNED',
            recipientId: teamMember.userId,
            actionUrl: `/projects/${project.id}`,
            actionData: { projectId: project.id, projectName: project.projectName, role: teamMember.role }
          });
        }
      }

      // Create alerts in database
      for (const alert of alerts) {
        const createdAlert = await prisma.notification.create({
          data: alert
        });
        generatedAlerts.push(createdAlert);
      }
    }

    res.json({
      success: true,
      message: `Generated ${generatedAlerts.length} meaningful alerts for ${projects.length} projects`,
      data: generatedAlerts,
      count: generatedAlerts.length
    });

  } catch (error) {
    console.error('Error generating project alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate project alerts',
      error: error.message
    });
  }
});

module.exports = router; 