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
const AlertCacheService = require('../services/AlertCacheService');
// const { transformWorkflowStep } = require('../utils/workflowMapping'); // DEPRECATED - Now using database
const WorkflowProgressionService = require('../services/WorkflowProgressionService');

const router = express.Router();

// **CRITICAL: Generate real-time alerts with batch optimization**
const generateRealTimeAlerts = async (limit = 10) => {
  try {
    console.log('🔍 GENERATING REAL-TIME ALERTS with batch optimization...');
    
    // Get limited projects in Lead/Pending or In Progress
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['PENDING','IN_PROGRESS'] }
      },
      select: { id: true },
      take: limit
    });

    if (projects.length === 0) {
      console.log('No active projects found — returning fallback OFFICE alerts for demo');
      const now = new Date();
      const fallback = [
        {
          id: 'fallback-alert-1',
          _id: 'fallback-alert-1',
          type: 'Work Flow Line Item',
          priority: 'High',
          status: 'ACTIVE',
          title: 'Office: Review Insurance Docs',
          message: 'Please review the insurance documentation for upcoming projects.',
          stepName: 'Review Insurance Docs',
          isRead: false,
          createdAt: now,
          dueDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
          workflowId: 'fallback-workflow',
          stepId: 'fallback-step-1',
          projectId: 'GENERAL',
          metadata: {
            projectId: 'GENERAL',
            projectName: 'General',
            customerName: 'All Customers',
            phase: 'GENERAL',
            section: 'General Workflow',
            lineItem: 'Review Insurance Docs',
            responsibleRole: 'OFFICE'
          }
        },
        {
          id: 'fallback-alert-2',
          _id: 'fallback-alert-2',
          type: 'Work Flow Line Item',
          priority: 'Medium',
          status: 'ACTIVE',
          title: 'Office: Send Customer Welcome Emails',
          message: 'Send welcome emails to newly added customers.',
          stepName: 'Send Welcome Emails',
          isRead: false,
          createdAt: now,
          dueDate: new Date(now.getTime() + 72 * 60 * 60 * 1000),
          workflowId: 'fallback-workflow',
          stepId: 'fallback-step-2',
          projectId: 'GENERAL',
          metadata: {
            projectId: 'GENERAL',
            projectName: 'General',
            customerName: 'All Customers',
            phase: 'GENERAL',
            section: 'General Workflow',
            lineItem: 'Send Welcome Emails',
            responsibleRole: 'OFFICE'
          }
        }
      ];
      return fallback;
    }

    // Ensure trackers exist for these projects so active line items are defined
    try {
      const WorkflowProgressionService = require('../services/WorkflowProgressionService');
      for (const p of projects) {
        await WorkflowProgressionService.getCurrentPosition(p.id);
      }
    } catch (e) {
      console.warn('⚠️ Could not ensure trackers for projects:', e?.message);
    }

    // Use batch alert generation
    const AlertGenerationService = require('../services/AlertGenerationService');
    const alerts = await AlertGenerationService.generateBatchAlerts(
      projects.map(p => p.id)
    );

    // Transform for frontend compatibility
    const transformedAlerts = alerts.map(alert => ({
      id: alert.id,
      _id: alert.id,
      type: alert.type,
      priority: alert.priority,
      status: alert.status,
      title: alert.title,
      message: alert.message,
      stepName: alert.stepName,
      isRead: alert.isRead,
      read: alert.isRead,
      createdAt: alert.createdAt,
      dueDate: alert.dueDate,
      workflowId: alert.workflowId,
      stepId: alert.stepId,
      projectId: alert.projectId,
      section: alert.metadata?.section,
      lineItem: alert.stepName,
      relatedProject: {
        id: alert.projectId,
        _id: alert.projectId,
        projectNumber: alert.metadata?.projectNumber,
        projectName: alert.metadata?.projectName,
        customer: {
          primaryName: alert.metadata?.customerName,
          address: alert.metadata?.address
        }
      },
      metadata: alert.metadata
    }));

    console.log(`✅ Generated ${transformedAlerts.length} real-time alerts (batch optimized)`);
    return transformedAlerts;
    
  } catch (error) {
    console.error('❌ Error generating real-time alerts:', error);
    return [];
  }
};

// **CRITICAL: Mock alerts for frontend compatibility while we transition**
const generateMockAlerts = async () => {
  try {
    // This function is now just a wrapper around generateRealTimeAlerts
    // since we're fully using the database-driven workflow
    console.log('🔄 Redirecting to database-driven alerts...');
    return await generateRealTimeAlerts();
  } catch (error) {
    console.error('Error generating mock alerts:', error);
    return [];
  }
};

// @desc    Get all alerts for current user (or all alerts if user has permission)
// @route   GET /api/alerts
// @access  Private
router.get('/', asyncHandler(async (req, res, next) => {
  const {
    status = 'ACTIVE',
    priority,
    assignedToId,
    projectId,
    page: pageRaw = 1,
    limit: limitRaw = 50,
    sortBy: sortByRaw = 'createdAt',
    sortOrder: sortOrderRaw = 'desc'
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

  // TEMPORARILY REMOVED: User role filtering to debug alert display
  // TODO: Re-implement proper role filtering after alerts are working

  // Calculate pagination (sanitized)
  const pageNum = Number.isFinite(+pageRaw) && +pageRaw > 0 ? parseInt(pageRaw) : 1;
  const limitNum = Number.isFinite(+limitRaw) && +limitRaw > 0 && +limitRaw <= 200 ? parseInt(limitRaw) : 50;
  const skip = (pageNum - 1) * limitNum;

  // Build sort object (sanitized)
  const allowedSortFields = new Set([
    'createdAt', 'updatedAt', 'priority', 'status', 'title'
  ]);
  const sortBy = allowedSortFields.has(String(sortByRaw)) ? String(sortByRaw) : 'createdAt';
  const sortOrder = String(sortOrderRaw).toLowerCase() === 'asc' ? 'asc' : 'desc';
  const orderBy = {};
  orderBy[sortBy] = sortOrder;

  console.log('🚨 ALERTS ROUTE: Fetching workflow alerts...');
  
  try {
    // Check cache first for user alerts
    const cacheKey = `user-alerts:${req.user?.id || 'all'}`;
    let alerts = null;
    let total = 0;
    
    // Try to get from cache if it's the first page
    if (pageNum === 1 && req.user?.id) {
      const cached = AlertCacheService.getCachedUserAlerts(req.user.id);
      if (cached) {
        console.log(`📦 Returning cached alerts for user ${req.user.id}`);
        alerts = cached;
        total = cached.length;
      }
    }
    
    // If not in cache, fetch from database
    if (!alerts) {
      [alerts, total] = await Promise.all([
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
        step: false, // Disabled - many alerts don't have valid step_id
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
      
      // Cache the results for user-specific queries
      if (pageNum === 1 && req.user?.id && assignedToId === req.user.id) {
        AlertCacheService.cacheUserAlerts(req.user.id, alerts, 60);
      }
    }
    
    console.log(`🚨 ALERTS ROUTE: Found ${alerts.length} alerts from database`);
    
    // Only generate missing alerts if database is empty (migration fallback)
    let finalAlerts = alerts;
    if (alerts.length === 0 && pageNum === 1) {
      console.log('🚨 ALERTS ROUTE: No alerts in database, generating batch alerts...');
      
      // Generate alerts using batch optimization
      const realAlerts = await generateRealTimeAlerts(limitNum);
      
      // Filter real alerts based on status if provided
      if (where.status) {
        finalAlerts = realAlerts.filter(alert => {
          const alertStatus = alert.status || 'ACTIVE';
          return alertStatus === where.status;
        });
      } else {
        finalAlerts = realAlerts;
      }
      console.log(`🚨 ALERTS ROUTE: Generated ${finalAlerts.length} real-time alerts`);
      
      // Return real alerts with proper response format
      return sendPaginatedResponse(res, finalAlerts, pageNum, limitNum, finalAlerts.length, 'Alerts retrieved successfully');
    }
    
    const transformed = alerts.map(alert => {
      // For database alerts, metadata should already contain the correct values
      const metadata = alert.metadata || {};
      
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
        // CRITICAL: Use metadata values for section and lineItem
        section: metadata.section || 'General Workflow',
        lineItem: metadata.lineItem || alert.stepName,
        relatedProject: {
          _id: alert.project.id,
          projectName: alert.project.projectName,
          projectNumber: alert.project.projectNumber,
          name: alert.project.customer?.primaryName || 'Unknown Customer'
        },
        metadata: {
          stepName: alert.stepName,
          cleanTaskName: metadata.lineItem || alert.stepName,
          projectId: alert.projectId,
          projectName: alert.project.projectName,
          projectNumber: alert.project.projectNumber,
          customerName: alert.project.customer?.primaryName,
          phase: metadata.phase || 'UNKNOWN',
          // CRITICAL: Use metadata values
          section: metadata.section || 'General Workflow',
          lineItem: metadata.lineItem || alert.stepName,
          workflowId: alert.workflowId,
          stepId: alert.stepId,
          responsibleRole: metadata.responsibleRole,
          trackerId: metadata.trackerId
        }
      };
    });
    
    // Send paginated response
    sendPaginatedResponse(res, transformed, pageNum, limitNum, total, 'Alerts retrieved successfully');
  } catch (error) {
    console.error('Error fetching alerts:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return sendPaginatedResponse(
      res,
      [],
      pageNum,
      limitNum,
      0,
      'Unable to fetch alerts at this time'
    );
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
  
  const alert = await prisma.workflowAlert.update({
    where: { id },
    data: { 
      isRead: true,
      readAt: new Date()
    }
  });
  
  // Invalidate cache for the user
  if (req.user?.id) {
    AlertCacheService.invalidateUserAlerts(req.user.id);
  }
  
  sendSuccess(res, alert, 'Alert marked as read successfully');
}));

// @desc    Acknowledge alert
// @route   PATCH /api/alerts/:id/acknowledge
// @access  Private
router.patch('/:id/acknowledge', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const alert = await prisma.workflowAlert.update({
    where: { id },
    data: { 
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedById: req.user?.id || null
    }
  });
  
  // Invalidate cache for the user
  if (req.user?.id) {
    AlertCacheService.invalidateUserAlerts(req.user.id);
  }
  
  sendSuccess(res, alert, 'Alert acknowledged successfully');
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
  
  const alert = await prisma.workflowAlert.update({
    where: { id },
    data: {
      status: 'DISMISSED',
      acknowledgedAt: new Date()
    }
  });
  
  // Invalidate cache
  if (alert.assignedToId) {
    AlertCacheService.invalidateUserAlerts(alert.assignedToId);
  }
  if (alert.projectId) {
    AlertCacheService.invalidateProjectAlerts(alert.projectId);
  }
  
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

    // Find and update the current alert
    const currentAlert = await prisma.workflowAlert.findUnique({
      where: { id: req.params.id }
    });

    if (!currentAlert) {
      return next(new AppError('Alert not found', 404));
    }

    // Update the alert with new assignment
    const updatedAlert = await prisma.workflowAlert.update({
      where: { id: req.params.id },
      data: {
        assignedToId: assignedTo,
        metadata: {
          ...currentAlert.metadata,
          reassignedFrom: req.user?.id,
          reassignedFromName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
          reassignedAt: new Date().toISOString(),
          originalAssignee: currentAlert.assignedToId || currentAlert.metadata?.originalAssignee
        }
      }
    });

    // Log the assignment in the alert history
    console.log(`✅ Alert ${req.params.id} assigned from ${req.user?.firstName} ${req.user?.lastName} to ${targetUser.firstName} ${targetUser.lastName}`);

    // Invalidate cache for both users
    if (currentAlert.assignedToId) {
      AlertCacheService.invalidateUserAlerts(currentAlert.assignedToId);
    }
    AlertCacheService.invalidateUserAlerts(assignedTo);

    // Emit real-time notification to assigned user
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${assignedTo}`).emit('alert_assigned', {
        alert: updatedAlert,
        assignedBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
        message: `Alert "${currentAlert.title}" has been assigned to you`
      });
    }

    sendSuccess(res, { 
      alert: updatedAlert,
      assignedTo: `${targetUser.firstName} ${targetUser.lastName}`
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