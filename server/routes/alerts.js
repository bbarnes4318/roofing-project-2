const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { 
  managerAndAbove, 
  projectManagerAndAbove 
} = require('../middleware/auth');
const Notification = require('../models/Notification');
const AlertSchedulerService = require('../services/AlertSchedulerService');

const router = express.Router();

// @desc    Get all alerts for current user (or all alerts if user has permission)
// @route   GET /api/alerts
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    type, 
    priority, 
    read,
    userId,
    status, // Add status parameter
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  let filter = {};
  
  // If userId is specified, filter by that user
  if (userId) {
    filter.user = userId;
  }
  // If no userId specified, check if user has permission to view all alerts
  else if (req.user.role === 'Owner' || req.user.role === 'Manager' || req.user.role === 'Admin') {
    // Managers and above can view all alerts (no user filter)
    // Don't add user filter - will show all alerts
  }
  // Regular users can only see their own alerts
  else {
    filter.user = req.user._id;
  }
  
  if (type) {
    if (type === 'workflow') {
      filter.type = 'Work Flow Line Item';
    } else if (type === 'general') {
      filter.type = 'General';
    } else {
      filter.type = type;
    }
  }
  
  if (priority) filter.priority = priority;
  if (read !== undefined) filter.read = read === 'true';
  
  // Handle status parameter (active means unread/unacknowledged alerts)
  if (status === 'active') {
    filter.isRead = { $ne: true }; // Not read or read field doesn't exist
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const [alerts, total] = await Promise.all([
    Notification.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'firstName lastName email')
      .populate('relatedProject', 'projectName name')
      .lean(),
    Notification.countDocuments(filter)
  ]);

  // DEBUG: Log what's being returned to frontend
  if (alerts.length > 0) {
    console.log('🔍 DEBUG: API Response Sample:', {
      alertId: alerts[0]._id,
      hasMetadata: !!alerts[0].metadata,
      metadataKeys: alerts[0].metadata ? Object.keys(alerts[0].metadata) : [],
      projectName: alerts[0].metadata?.projectName,
      stepName: alerts[0].metadata?.stepName,
      phase: alerts[0].metadata?.phase,
      relatedProject: alerts[0].relatedProject ? { 
        id: alerts[0].relatedProject._id, 
        projectName: alerts[0].relatedProject.projectName,
        name: alerts[0].relatedProject.name 
      } : null
    });
  }

  sendPaginatedResponse(res, alerts, pageNum, limitNum, total, 'Alerts retrieved successfully');
}));

// @desc    Create general alert
// @route   POST /api/alerts
// @access  Private (Manager and above)
router.post('/', managerAndAbove, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('priority')
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),
  body('recipients.*')
    .isMongoId()
    .withMessage('Each recipient must be a valid user ID'),
  body('relatedProject')
    .optional()
    .isMongoId()
    .withMessage('Related project must be a valid project ID')
], asyncHandler(async (req, res, next) => {
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
    const notification = await Notification.create({
      user: recipientId,
      type: 'other', // General alerts as specified by user
      priority,
      message: `${title}: ${message}`,
      relatedProject,
      data: {
        createdBy: req.user._id,
        createdByName: `${req.user.firstName} ${req.user.lastName}`,
        isManualAlert: true,
        title: title
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
router.patch('/:id/read', asyncHandler(async (req, res, next) => {
  const alert = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!alert) {
    return next(new AppError('Alert not found', 404));
  }

  sendSuccess(res, 200, { alert }, 'Alert marked as read');
}));

// @desc    Mark all alerts as read
// @route   PATCH /api/alerts/read-all
// @access  Private
router.patch('/read-all', asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  sendSuccess(res, 200, { 
    modifiedCount: result.modifiedCount 
  }, 'All alerts marked as read');
}));

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const alert = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!alert) {
    return next(new AppError('Alert not found', 404));
  }

  sendSuccess(res, 200, null, 'Alert deleted successfully');
}));

// @desc    Assign alert to another team member
// @route   PATCH /api/alerts/:id/assign
// @access  Private
router.patch('/:id/assign', 
  [
    body('assignedTo').isMongoId().withMessage('Assigned to must be a valid user ID')
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
    const User = require('../models/User');
    const targetUser = await User.findById(assignedTo);
    if (!targetUser) {
      return next(new AppError('Target user not found', 404));
    }

    // Find the current alert
    const currentAlert = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!currentAlert) {
      return next(new AppError('Alert not found', 404));
    }

    // Create a new alert for the assigned user
    const newAlert = await Notification.create({
      user: assignedTo,
      type: currentAlert.type,
      priority: currentAlert.priority,
      message: currentAlert.message,
      relatedProject: currentAlert.relatedProject,
      data: {
        ...currentAlert.data,
        reassignedFrom: req.user._id,
        reassignedFromName: `${req.user.firstName} ${req.user.lastName}`,
        reassignedAt: new Date()
      }
    });

    // Remove the alert from current user
    await Notification.findByIdAndDelete(req.params.id);

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
  const userId = req.user._id;

  // Get user's alert statistics
  const stats = await Notification.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$isRead', false] }, 1, 0]
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            isRead: '$isRead'
          }
        },
        byType: {
          $push: {
            type: '$type',
            isRead: '$isRead'
          }
        }
      }
    }
  ]);

  // Process priority breakdown
  const priorityStats = { Low: { total: 0, unread: 0 }, Medium: { total: 0, unread: 0 }, High: { total: 0, unread: 0 } };
  const typeStats = { 'Work Flow Line Item': { total: 0, unread: 0 }, 'General': { total: 0, unread: 0 } };

  if (stats.length > 0) {
    stats[0].byPriority.forEach(item => {
      if (priorityStats[item.priority]) {
        priorityStats[item.priority].total++;
        if (!item.isRead) priorityStats[item.priority].unread++;
      }
    });

    stats[0].byType.forEach(item => {
      if (typeStats[item.type]) {
        typeStats[item.type].total++;
        if (!item.isRead) typeStats[item.type].unread++;
      }
    });
  }

  const result = {
    total: stats.length > 0 ? stats[0].total : 0,
    unread: stats.length > 0 ? stats[0].unread : 0,
    byPriority: priorityStats,
    byType: typeStats
  };

  sendSuccess(res, 200, result, 'Alert statistics retrieved successfully');
}));

// @desc    Trigger manual workflow alert check (Admin only)
// @route   POST /api/alerts/check-workflow
// @access  Private (Manager and above)
router.post('/check-workflow', managerAndAbove, asyncHandler(async (req, res) => {
  await AlertSchedulerService.triggerManualCheck();
  
  sendSuccess(res, 200, null, 'Manual workflow alert check triggered');
}));

// @desc    Get workflow alert statistics (Admin only)
// @route   GET /api/alerts/workflow-stats
// @access  Private (Manager and above)
router.get('/workflow-stats', managerAndAbove, asyncHandler(async (req, res) => {
  const stats = await AlertSchedulerService.getAlertStatistics();
  
  sendSuccess(res, 200, stats, 'Workflow alert statistics retrieved successfully');
}));

// @desc    Get alerts by project
// @route   GET /api/alerts/project/:projectId
// @access  Private (Project Manager and above)
router.get('/project/:projectId', projectManagerAndAbove, asyncHandler(async (req, res) => {
  const { priority, type, page = 1, limit = 20 } = req.query;
  
  let filter = { relatedProject: req.params.projectId };
  
  if (priority) filter.priority = priority;
  if (type) {
    if (type === 'workflow') {
      filter.type = 'Work Flow Line Item';
    } else if (type === 'general') {
      filter.type = 'General';
    }
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [alerts, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'firstName lastName email')
      .populate('relatedProject', 'projectName name')
      .lean(),
    Notification.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, alerts, pageNum, limitNum, total, 'Project alerts retrieved successfully');
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
    const ProjectWorkflow = require('../models/ProjectWorkflow');
    
    const workflows = await ProjectWorkflow.find({})
      .populate('project', 'projectName status')
      .select('project status overallProgress currentStepIndex steps.stepName steps.isCompleted steps.scheduledStartDate steps.scheduledEndDate');
    
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

module.exports = router; 