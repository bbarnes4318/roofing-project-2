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

// Simple test endpoint to check if routes are reloading
router.get('/simple', (req, res) => {
  res.json({
    success: true,
    message: 'Simple test endpoint working',
    timestamp: new Date()
  });
});

// Test endpoint to get projects without authentication (for testing)
router.get('/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        customer: {
          select: {
            primaryName: true,
            primaryEmail: true,
            primaryPhone: true,
            address: true
          }
        },
        projectManager: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        teamMembers: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
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

// Test endpoint to get alerts without authentication (for testing)
router.get('/alerts', async (req, res) => {
  try {
    // Import the generateMockAlerts function from alerts route
    const alertsModule = require('./alerts');
    const generateMockAlerts = alertsModule.generateMockAlerts;
    
    // Generate mock alerts based on real project data
    const alerts = await generateMockAlerts();
    
    // Apply any query filters
    let filteredAlerts = alerts;
    if (req.query.status === 'active') {
      filteredAlerts = alerts.filter(alert => !alert.isRead);
    }
    
    res.json({
      success: true,
      data: filteredAlerts,
      count: filteredAlerts.length
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

// Test workflow endpoints to bypass the loading issue
router.get('/workflow/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    // Find project by ID or project number
    let project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project && /^\d+$/.test(projectId)) {
      project = await prisma.project.findUnique({
        where: { projectNumber: parseInt(projectId) }
      });
    }
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Get workflow for the project
    const workflow = await prisma.projectWorkflow.findUnique({
      where: { projectId: project.id },
      include: {
        steps: {
          include: {
            subTasks: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (!workflow) {
      // Return mock workflow structure
      const mockWorkflow = {
        project: project.id,
        projectId: project.id,
        steps: [],
        completedSteps: [],
        progress: 0,
        overallProgress: 0,
        currentStepIndex: 0,
        status: 'NOT_STARTED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return res.status(200).json({
        success: true,
        data: mockWorkflow,
        message: 'Workflow retrieved successfully'
      });
    }
    
    // Transform workflow for frontend compatibility
    const transformedWorkflow = {
      id: workflow.id,
      project: workflow.projectId,
      projectId: workflow.projectId,
      status: workflow.status,
      overallProgress: workflow.overallProgress,
      currentStepIndex: workflow.currentStepIndex,
      steps: workflow.steps ? workflow.steps.map(step => ({
        id: step.id,
        stepId: step.stepId,
        stepName: step.stepName,
        phase: step.phase,
        isCompleted: step.isCompleted,
        completed: step.isCompleted,
        completedAt: step.completedAt,
        subTasks: step.subTasks ? step.subTasks.map(subTask => ({
          id: subTask.id,
          subTaskName: subTask.subTaskName,
          isCompleted: subTask.isCompleted,
          completedAt: subTask.completedAt
        })) : []
      })) : []
    };
    
    res.status(200).json({
      success: true,
      data: transformedWorkflow,
      message: 'Workflow retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow',
      error: error.message
    });
  }
});

// Test workflow step update endpoint
router.put('/workflow/:projectId/step/:stepId', async (req, res) => {
  const { projectId, stepId } = req.params;
  const { completed } = req.body;
  
  try {
    // Find project
    let project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project && /^\d+$/.test(projectId)) {
      project = await prisma.project.findUnique({
        where: { projectNumber: parseInt(projectId) }
      });
    }
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Get or create workflow for the project
    let workflow = await prisma.projectWorkflow.findUnique({
      where: { projectId: project.id },
      include: {
        steps: {
          include: {
            subTasks: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (!workflow) {
      // Create workflow if it doesn't exist
      workflow = await prisma.projectWorkflow.create({
        data: {
          projectId: project.id,
          status: 'IN_PROGRESS',
          overallProgress: 0,
          currentStepIndex: 0,
          enableAlerts: true,
          alertMethods: ['EMAIL'],
          escalationEnabled: false,
          escalationDelayDays: 3
        },
        include: {
          steps: {
            include: {
              subTasks: true
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });
    }
    
    // Find or create the workflow step
    let step = workflow.steps.find(s => 
      s.id === stepId || 
      s.stepId === stepId || 
      s.stepName === stepId
    );
    
    if (!step) {
      // Create new step if it doesn't exist
      step = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          stepId: stepId,
          stepName: stepId,
          description: `Custom workflow step: ${stepId}`,
          phase: 'LEAD',
          defaultResponsible: 'OFFICE',
          estimatedDuration: 1,
          isCompleted: completed,
          completedAt: completed ? new Date() : null,
          scheduledStartDate: new Date(),
          scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          alertPriority: 'MEDIUM',
          alertDays: 1
        }
      });
    } else {
      // Update existing step
      step = await prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          isCompleted: completed,
          completedAt: completed ? new Date() : null,
          actualEndDate: completed ? new Date() : null
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        step: {
          id: step.id,
          stepId: step.stepId,
          stepName: step.stepName,
          isCompleted: step.isCompleted,
          completedAt: step.completedAt
        }
      },
      message: 'Workflow step updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workflow step',
      error: error.message
    });
  }
});

module.exports = router; 