const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { prisma } = require('../config/prisma');
const { cacheService } = require('../config/redis');
const { transformWorkflowStep } = require('../utils/workflowMapping');

const router = express.Router();

// **CRITICAL: Generate real-time alerts based on actual workflow states**
const generateRealTimeAlerts = async () => {
  try {
    console.log('🔍 GENERATING REAL-TIME ALERTS from workflow states...');
    
    // Get all active projects with their workflows and current steps
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] }
      },
      include: {
        customer: true,
        projectManager: true,
        workflow: {
          include: {
            steps: {
              where: { 
                isCompleted: false // Get all incomplete steps
              },
              orderBy: { stepOrder: 'asc' }
            }
          }
        }
      }
    });

    const realTimeAlerts = [];
    
    for (const project of projects) {
      if (!project.workflow || !project.workflow.steps.length) {
        console.log(`⚠️ Project ${project.projectName} has no active workflow steps`);
        continue;
      }

      // Get the current active step (first incomplete step)
      const currentStep = project.workflow.steps[0];
      if (!currentStep) continue;

      console.log(`📋 Creating alert for project: ${project.projectName}, step: ${currentStep.stepName}`);

      // Transform the step to get proper section and line item
      const transformedStep = transformWorkflowStep({
        stepName: currentStep.stepName,
        phase: project.currentPhase || project.phase || currentStep.phase
      });

      const alert = {
        id: `realtime_${project.id}_${currentStep.id}`,
        _id: `realtime_${project.id}_${currentStep.id}`,
        type: 'Work Flow Line Item',
        priority: currentStep.alertPriority || 'MEDIUM',
        status: 'ACTIVE',
        title: `${currentStep.stepName} - ${project.customer?.primaryName || project.projectName}`,
        message: `${currentStep.stepName} is ready to begin for project ${project.projectName}`,
        stepName: currentStep.stepName,
        isRead: false,
        read: false,
        createdAt: new Date(),
        dueDate: currentStep.scheduledEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
        workflowId: project.workflow.id,
        stepId: currentStep.id,
        projectId: project.id,
        section: transformedStep?.section || 'General Workflow',
        lineItem: transformedStep?.lineItem || currentStep.stepName,
        relatedProject: {
          id: project.id,
          _id: project.id,
          projectNumber: project.projectNumber,
          projectName: project.projectName,
          address: project.projectName,
          customer: {
            id: project.customer?.id,
            name: project.customer?.primaryName,
            primaryName: project.customer?.primaryName,
            phone: project.customer?.primaryPhone,
            email: project.customer?.primaryEmail,
            address: project.customer?.address
          },
          projectManager: project.projectManager ? {
            id: project.projectManager.id,
            firstName: project.projectManager.firstName,
            lastName: project.projectManager.lastName
          } : null
        },
        metadata: {
          projectId: project.id,
          projectNumber: project.projectNumber,
          projectName: project.projectName,
          customerName: project.customer?.primaryName,
          customerPhone: project.customer?.primaryPhone,
          customerEmail: project.customer?.primaryEmail,
          customerAddress: project.customer?.address,
          address: project.projectName,
          stepName: currentStep.stepName,
          stepId: currentStep.id,
          workflowId: project.workflow.id,
          phase: project.currentPhase || project.phase || currentStep.phase,
          section: transformedStep?.section || 'General Workflow',
          lineItem: transformedStep?.lineItem || currentStep.stepName,
          cleanTaskName: transformedStep?.lineItem || currentStep.stepName
        }
      };

      realTimeAlerts.push(alert);
    }

    console.log(`✅ Generated ${realTimeAlerts.length} real-time alerts from workflow states`);
    return realTimeAlerts;
    
  } catch (error) {
    console.error('❌ Error generating real-time alerts:', error);
    return [];
  }
};

// **CRITICAL: Mock alerts for frontend compatibility while we transition**
const generateMockAlerts = async () => {
  try {
    // Get some real projects from the database to create realistic alerts
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        projectManager: true,
        workflow: {
          include: {
            steps: {
              where: { 
                isCompleted: false,
                isActive: true  // Only get the current active step
              },
              orderBy: { stepOrder: 'asc' }
            }
          }
        }
      }
    });

    const mockAlerts = [];
    
    projects.forEach((project, index) => {
      if (project.workflow && project.workflow.steps.length > 0) {
        // Only create alert for the FIRST active step (current step)
        const currentStep = project.workflow.steps[0];
        if (currentStep) {
          // Use the project's current phase, not the step's phase
          const projectPhase = project.currentPhase || project.phase || currentStep.phase;
          
          // CRITICAL: Transform the step to get proper section and line item
          const transformedStep = transformWorkflowStep({
            stepName: currentStep.stepName,
            phase: projectPhase
          });
          
          mockAlerts.push({
            id: `alert_${project.id}_${currentStep.id}`,
            _id: `alert_${project.id}_${currentStep.id}`,
            type: 'Work Flow Line Item',
            priority: currentStep.alertPriority || 'Low',
            title: `${currentStep.stepName} - ${project.customer.primaryName}`,
            message: `${currentStep.stepName} is due for project at ${project.projectName}`,
            isRead: false,
            read: false,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
            dueDate: currentStep.scheduledEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
            // CRITICAL: Add workflow and step IDs to main alert object for completion
            workflowId: project.workflow.id,
            stepId: currentStep.id,
            stepName: currentStep.stepName,
            // Add transformed section and line item to main alert object
            section: transformedStep?.section || 'General Workflow',
            lineItem: transformedStep?.lineItem || currentStep.stepName,
            relatedProject: {
              id: project.id,
              _id: project.id,
              projectNumber: project.projectNumber,
              projectName: project.projectName,
              address: project.projectName,
              customer: {
                id: project.customer.id,
                name: project.customer.primaryName,
                primaryName: project.customer.primaryName,
                phone: project.customer.primaryPhone,
                email: project.customer.primaryEmail,
                address: project.customer.address
              },
              projectManager: project.projectManager ? {
                id: project.projectManager.id,
                firstName: project.projectManager.firstName,
                lastName: project.projectManager.lastName
              } : null
            },
            metadata: {
              projectId: project.id,
              projectNumber: project.projectNumber,
              projectName: project.projectName,
              customerName: project.customer.primaryName,
              customerPhone: project.customer.primaryPhone,
              customerEmail: project.customer.primaryEmail,
              customerAddress: project.customer.address,
              address: project.projectName,
              stepName: currentStep.stepName,
              stepId: currentStep.stepId,
              workflowId: project.workflow.id,
              phase: projectPhase, // Use project's current phase
              description: currentStep.description,
              // Add transformed section and line item to metadata
              section: transformedStep?.section || 'General Workflow',
              lineItem: transformedStep?.lineItem || currentStep.stepName,
              cleanTaskName: transformedStep?.lineItem || currentStep.stepName
            }
          });
        }
      }
    });

    return mockAlerts;
  } catch (error) {
    console.error('Error generating mock alerts:', error);
    return [];
  }
};

// @desc    Get all alerts for current user (or all alerts if user has permission)
// @route   GET /api/alerts
// @access  Private
router.get('/', cacheService.middleware('alerts', 30), asyncHandler(async (req, res, next) => {
  const {
    status = 'ACTIVE',
    priority,
    assignedToId,
    projectId,
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  const where = {};
  // Normalize status to uppercase to match database enum
  if (status) {
    const normalizedStatus = status.toString().toUpperCase();
    // Only add to where clause if it's a valid status
    const validStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'DISMISSED', 'COMPLETED'];
    if (validStatuses.includes(normalizedStatus)) {
      where.status = normalizedStatus;
    }
  }
  // Normalize priority to uppercase to match database enum  
  if (priority) {
    const normalizedPriority = priority.toString().toUpperCase();
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (validPriorities.includes(normalizedPriority)) {
      where.priority = normalizedPriority;
    }
  }
  if (assignedToId) where.assignedToId = assignedToId;
  if (projectId) where.projectId = projectId;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const orderBy = {};
  orderBy[sortBy] = sortOrder;

  console.log('🚨 ALERTS ROUTE: Fetching workflow alerts...');
  
  try {
    // Execute query with pagination
    const [alerts, total] = await Promise.all([
      prisma.workflowAlert.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            status: true,
            customer: {
              select: {
                id: true,
                primaryName: true,
                primaryEmail: true,
                primaryPhone: true
              }
            }
          }
        },
        step: {
          select: {
            id: true,
            stepId: true,
            stepName: true,
            phase: true,
            isCompleted: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    }),
    prisma.workflowAlert.count({ where })
  ]);
    
    console.log(`🚨 ALERTS ROUTE: Found ${alerts.length} alerts from database`);
    
    // CRITICAL FIX: Generate real alerts from workflow states instead of mock data
    let finalAlerts = alerts;
    if (alerts.length === 0) {
      console.log('🚨 ALERTS ROUTE: No alerts in database, checking for active workflow steps...');
      
      // Generate real alerts based on active workflow steps
      const realAlerts = await generateRealTimeAlerts();
      
      // Filter real alerts based on status if provided
      if (where.status) {
        finalAlerts = realAlerts.filter(alert => {
          const alertStatus = alert.status || 'ACTIVE';
          return alertStatus === where.status;
        }).slice(0, limitNum);
      } else {
        finalAlerts = realAlerts.slice(0, limitNum);
      }
      console.log(`🚨 ALERTS ROUTE: Generated ${finalAlerts.length} real-time alerts`);
      
      // Return real alerts with proper response format
      return sendPaginatedResponse(res, finalAlerts, pageNum, limitNum, finalAlerts.length, 'Alerts retrieved successfully');
    }
    
    const transformed = alerts.map(alert => {
      // Transform the workflow step to get section and lineItem
      const transformedStep = alert.step ? transformWorkflowStep(alert.step) : null;
      
      return {
        _id: alert.id,
        id: alert.id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        stepName: alert.stepName,
        priority: alert.priority.charAt(0) + alert.priority.slice(1).toLowerCase(),
        isRead: alert.isRead,
        read: alert.isRead,
        createdAt: alert.createdAt,
        dueDate: alert.dueDate,
        workflowId: alert.workflowId,
        stepId: alert.stepId,
        // CRITICAL: Add section and lineItem fields
        section: transformedStep?.section || 'General Workflow',
        lineItem: transformedStep?.lineItem || alert.stepName,
        relatedProject: {
          _id: alert.project.id,
          projectName: alert.project.projectName,
          projectNumber: alert.project.projectNumber,
          name: alert.project.customer?.primaryName || 'Unknown Customer'
        },
        metadata: {
          stepName: alert.stepName,
          cleanTaskName: alert.stepName,
          projectId: alert.projectId,
          projectName: alert.project.projectName,
          projectNumber: alert.project.projectNumber,
          customerName: alert.project.customer?.primaryName,
          phase: alert.step?.phase || 'UNKNOWN',
          // CRITICAL: Add section and lineItem to metadata
          section: transformedStep?.section || 'General Workflow',
          lineItem: transformedStep?.lineItem || alert.stepName,
          workflowId: alert.workflowId,
          stepId: alert.stepId
        }
      };
    });
    
    // Send paginated response
    sendPaginatedResponse(res, transformed, pageNum, limitNum, total, 'Alerts retrieved successfully');
  } catch (error) {
    next(error);
  }
}));

// @desc    Create general alert
// @route   POST /api/alerts
// @access  Private (Manager and above)
router.post('/', asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { title, message, priority, recipients, relatedProject } = req.body;

  // Create notifications for each recipient
  const notifications = [];
  for (const recipientId of recipients) {
    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'OTHER',
        priority: priority.toUpperCase(),
        message: `${title}: ${message}`,
        relatedProjectId: relatedProject,
        actionData: {
          createdBy: req.user.id,
          createdByName: `${req.user.firstName} ${req.user.lastName}`,
          isManualAlert: true,
          title: title
        }
      }
    });
    notifications.push(notification);
  }

  // Emit real-time notifications via Socket.IO
  const io = req.app.get('io');
  if (io) {
    for (const notification of notifications) {
      io.to(`user_${notification.user}`).emit('general_alert', {
        notification,
        type: 'General',
        priority,
        title,
        message,
        createdBy: `${req.user.firstName} ${req.user.lastName}`
      });
    }
  }

  sendSuccess(res, 201, { 
    notifications: notifications.length,
    recipients: recipients.length 
  }, 'General alert sent successfully');
}));

// @desc    Mark alert as read
// @route   PATCH /api/alerts/:id/read
// @access  Private
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // For now, just return success since we're using mock data
  sendSuccess(res, { id, read: true }, 'Alert marked as read successfully');
}));

// @desc    Mark all alerts as read
// @route   PATCH /api/alerts/read-all
// @access  Private
router.patch('/read-all', asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { 
      userId: req.user.id, 
      isRead: false 
    },
    data: { 
      isRead: true, 
      readAt: new Date() 
    }
  });

  sendSuccess(res, 200, { 
    modifiedCount: result.modifiedCount 
  }, 'All alerts marked as read');
}));

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // For now, just return success since we're using mock data
  sendSuccess(res, null, 'Alert dismissed successfully');
}));

// @desc    Assign alert to another team member
// @route   PATCH /api/alerts/:id/assign
// @access  Private
router.patch('/:id/assign', 
  [
    body('assignedTo').isString().withMessage('Assigned to must be a valid user ID')
  ],
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatValidationErrors(errors)
      });
    }

    const { assignedTo } = req.body;
    
    // Verify the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: assignedTo }
    });
    if (!targetUser) {
      return next(new AppError('Target user not found', 404));
    }

    // Find the current alert
    const currentAlert = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!currentAlert) {
      return next(new AppError('Alert not found', 404));
    }

    // Create a new alert for the assigned user
    const newAlert = await prisma.notification.create({
      data: {
        userId: assignedTo,
        type: currentAlert.type,
        priority: currentAlert.priority,
        message: currentAlert.message,
        relatedProjectId: currentAlert.relatedProjectId,
        actionData: {
          ...currentAlert.actionData,
          reassignedFrom: req.user.id,
          reassignedFromName: `${req.user.firstName} ${req.user.lastName}`,
          reassignedAt: new Date()
        }
      }
    });

    // Remove the alert from current user
    await prisma.notification.delete({
      where: { id: req.params.id }
    });

    // Emit real-time notification to assigned user
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${assignedTo}`).emit('alert_assigned', {
        alert: newAlert,
        assignedBy: `${req.user.firstName} ${req.user.lastName}`,
        message: `Alert "${currentAlert.title}" has been assigned to you`
      });
    }

    sendSuccess(res, 200, { 
      alert: newAlert,
      assignedTo: targetUser.firstName + ' ' + targetUser.lastName
    }, 'Alert assigned successfully');
  })
);

// @desc    Get alert statistics
// @route   GET /api/alerts/stats
// @access  Private
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const alerts = await generateMockAlerts();
    
    const stats = {
      total: alerts.length,
      unread: alerts.filter(alert => !alert.read).length,
      high: alerts.filter(alert => alert.priority === 'High').length,
      medium: alerts.filter(alert => alert.priority === 'Medium').length,
      low: alerts.filter(alert => alert.priority === 'Low').length,
      workflow: alerts.filter(alert => alert.type === 'Work Flow Line Item').length
    };
    
    sendSuccess(res, stats, 'Alert statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching alert statistics:', error);
    throw new AppError('Failed to fetch alert statistics', 500);
  }
}));

// @desc    Trigger manual workflow alert check (Admin only)
// @route   POST /api/alerts/check-workflow
// @access  Private (Manager and above)
router.post('/check-workflow', asyncHandler(async (req, res) => {
  await AlertSchedulerService.triggerManualCheck();
  
  sendSuccess(res, 200, null, 'Manual workflow alert check triggered');
}));

// @desc    Get workflow alert statistics (Admin only)
// @route   GET /api/alerts/workflow-stats
// @access  Private (Manager and above)
router.get('/workflow-stats', asyncHandler(async (req, res) => {
  const stats = await AlertSchedulerService.getAlertStatistics();
  
  sendSuccess(res, 200, stats, 'Workflow alert statistics retrieved successfully');
}));

// @desc    Get alerts by project
// @route   GET /api/alerts/project/:projectId
// @access  Private (Project Manager and above)
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const alerts = await generateMockAlerts();
    const projectAlerts = alerts.filter(alert => 
      alert.relatedProject?.id === projectId || 
      alert.metadata?.projectId === projectId
    );
    
    sendSuccess(res, projectAlerts, 'Project alerts retrieved successfully');
  } catch (error) {
    console.error('Error fetching project alerts:', error);
    throw new AppError('Failed to fetch project alerts', 500);
  }
}));

// @desc    Manually trigger alert generation (for testing/debugging)
// @route   POST /api/alerts/trigger
// @access  Private (admin only)
router.post('/trigger', async (req, res) => {
  try {
    console.log('🔴 MANUAL ALERT TRIGGER requested');
    
    const WorkflowAlertService = require('../services/WorkflowAlertService');
    const alertService = new WorkflowAlertService();
    
    const result = await alertService.triggerImmediateAlertCheck();
    
    res.json({
      success: true,
      message: 'Alert check triggered successfully',
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error triggering manual alert check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger alert check',
      error: error.message
    });
  }
});

// @desc    Check workflow status for debugging
// @route   GET /api/alerts/debug-workflows
// @access  Private (admin only)
router.get('/debug-workflows', async (req, res) => {
  try {
    const workflows = await prisma.projectWorkflow.findMany({
      include: {
        project: {
          select: {
            projectName: true,
            status: true
          }
        },
        steps: {
          select: {
            stepName: true,
            isCompleted: true,
            scheduledStartDate: true,
            scheduledEndDate: true
          }
        }
      }
    });
    
    const workflowSummary = workflows.map(wf => ({
      projectName: wf.project?.projectName || 'Unknown',
      projectStatus: wf.project?.status || 'Unknown',
      workflowStatus: wf.status,
      progress: wf.overallProgress,
      currentStep: wf.currentStepIndex,
      totalSteps: wf.steps.length,
      completedSteps: wf.steps.filter(s => s.isCompleted).length,
      steps: wf.steps.map(step => ({
        name: step.stepName,
        completed: step.isCompleted,
        scheduledStart: step.scheduledStartDate,
        scheduledEnd: step.scheduledEndDate
      }))
    }));
    
    res.json({
      success: true,
      totalWorkflows: workflows.length,
      workflows: workflowSummary
    });
    
  } catch (error) {
    console.error('❌ Error debugging workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug workflows',
      error: error.message
    });
  }
});

// Legacy route compatibility for frontend
router.get('/test/alerts', async (req, res) => {
  // Redirect to main alerts endpoint
  try {
    const alerts = await generateMockAlerts();
    
    // Apply any query filters
    let filteredAlerts = alerts;
    if (req.query.status === 'active') {
      filteredAlerts = alerts.filter(alert => !alert.isRead);
    }
    
    res.json({
      success: true,
      data: filteredAlerts,
      message: 'Alerts retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching test alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts'
    });
  }
});

module.exports = { router, generateMockAlerts }; 