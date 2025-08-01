const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
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
const AlertSchedulerService = require('../services/AlertSchedulerService');

const prisma = new PrismaClient();
const router = express.Router();

// Mock alerts generation function
const generateMockAlerts = async () => {
  try {
    console.log('🔍 Generating mock alerts...');
    
    const projects = await prisma.project.findMany({
      take: 5,
      include: {
        customer: true,
        projectManager: true,
        workflow: {
          include: {
            steps: {
              where: { isCompleted: false }
            }
          }
        }
      }
    });

    console.log(`🔍 Found ${projects.length} projects`);
    
    const mockAlerts = [];
    
    projects.forEach((project, index) => {
      console.log(`🔍 Processing project: ${project.projectName} (${project.id})`);
      console.log(`🔍 Project has workflow: ${!!project.workflow}`);
      console.log(`🔍 Workflow has ${project.workflow?.steps?.length || 0} steps`);
      
      if (project.workflow && project.workflow.steps.length > 0) {
        project.workflow.steps.forEach((step, stepIndex) => {
          console.log(`🔍 Creating alert for step: ${step.stepName} (completed: ${step.isCompleted})`);
          
          mockAlerts.push({
            id: `alert_${project.id}_${step.id}`,
            _id: `alert_${project.id}_${step.id}`,
            type: 'Work Flow Line Item',
            priority: step.alertPriority || 'Medium',
            title: `${step.stepName} - ${project.customer.primaryName}`,
            message: `${step.stepName} is due for project at ${project.projectName}`,
            isRead: false,
            read: false,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            dueDate: step.scheduledEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
            workflowId: project.workflow.id,
            stepId: step.id,
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
              stepName: step.stepName,
              stepId: step.stepId,
              workflowId: project.workflow.id,
              phase: step.phase,
              description: step.description
            }
          });
        });
      } else {
        // Create a fallback alert if no workflow steps found
        console.log(`🔍 Creating fallback alert for project: ${project.projectName}`);
        mockAlerts.push({
          id: `alert_${project.id}_fallback`,
          _id: `alert_${project.id}_fallback`,
          type: 'Work Flow Line Item',
          priority: 'Medium',
          title: `Project Setup - ${project.customer.primaryName}`,
          message: `Project setup is needed for ${project.projectName}`,
          isRead: false,
          read: false,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          workflowId: project.workflow?.id || 'no-workflow',
          stepId: 'fallback',
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
            address: project.projectName,
            stepName: 'Project Setup',
            stepId: 'fallback',
            workflowId: project.workflow?.id || 'no-workflow',
            phase: 'LEAD',
            description: 'Project setup and initialization'
          }
        });
      }
    });

    console.log(`✅ Generated ${mockAlerts.length} mock alerts`);
    return mockAlerts;
  } catch (error) {
    console.error('❌ Error generating mock alerts:', error);
    return [];
  }
};

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

  try {
    console.log('🔍 Alerts endpoint called - using mock alerts for demo');
    
    // For demo purposes, return mock alerts instead of database alerts
    let alerts = await generateMockAlerts();
    
    // Apply filters
    if (type && type === 'workflow') {
      alerts = alerts.filter(alert => alert.type === 'Work Flow Line Item');
    }
    
    if (priority) {
      alerts = alerts.filter(alert => alert.priority === priority);
    }
    
    if (read !== undefined) {
      alerts = alerts.filter(alert => alert.read === (read === 'true'));
    }
    
    if (status === 'active') {
      alerts = alerts.filter(alert => !alert.isRead);
    }
    
    // Apply sorting
    alerts.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (sortOrder === 'desc') {
        return new Date(bVal) - new Date(aVal);
      } else {
        return new Date(aVal) - new Date(bVal);
      }
    });
    
    console.log(`✅ Returning ${alerts.length} mock alerts`);
    
    // Return all alerts without pagination
    res.json({
      success: true,
      data: alerts,
      message: 'Alerts retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error in alerts endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
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