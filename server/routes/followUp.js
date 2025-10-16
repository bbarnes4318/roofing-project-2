const express = require('express');
const { prisma } = require('../config/prisma');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { 
  managerAndAbove 
} = require('../middleware/auth');

const router = express.Router();

// @desc    Get follow-up settings for user
// @route   GET /api/follow-up/settings
// @access  Private
router.get('/settings', managerAndAbove, asyncHandler(async (req, res) => {
  try {
  const userId = req.user.id;

  let settings = await prisma.followUpSettings.findUnique({
    where: { userId }
  });

  // Create default settings if they don't exist
  if (!settings) {
    settings = await prisma.followUpSettings.create({
      data: {
        userId,
        isEnabled: false,
        taskFollowUpDays: 7,
        reminderFollowUpDays: 3,
        alertFollowUpDays: 5,
        maxFollowUpAttempts: 3,
        followUpMessage: "This is a follow-up reminder for your task/reminder. Please take action if needed."
      }
    });
  }

  res.json({
    success: true,
    data: { settings },
    message: 'Follow-up settings retrieved successfully'
  });
  } catch (error) {
    console.error('Error in follow-up settings route:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
}));

// @desc    Update follow-up settings for user
// @route   PUT /api/follow-up/settings
// @access  Private
router.put('/settings', [
  body('isEnabled')
    .optional()
    .isBoolean()
    .withMessage('isEnabled must be a boolean'),
  body('taskFollowUpDays')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Task follow-up days must be between 0 and 365'),
  body('taskFollowUpHours')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Task follow-up hours must be between 0 and 23'),
  body('taskFollowUpMinutes')
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage('Task follow-up minutes must be between 0 and 59'),
  body('reminderFollowUpDays')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Reminder follow-up days must be between 0 and 365'),
  body('reminderFollowUpHours')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Reminder follow-up hours must be between 0 and 23'),
  body('reminderFollowUpMinutes')
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage('Reminder follow-up minutes must be between 0 and 59'),
  body('alertFollowUpDays')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Alert follow-up days must be between 0 and 365'),
  body('alertFollowUpHours')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Alert follow-up hours must be between 0 and 23'),
  body('alertFollowUpMinutes')
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage('Alert follow-up minutes must be between 0 and 59'),
  body('maxFollowUpAttempts')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Max follow-up attempts must be between 1 and 10'),
  body('followUpMessage')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Follow-up message must be between 1 and 1000 characters')
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const {
    isEnabled,
    taskFollowUpDays,
    taskFollowUpHours,
    taskFollowUpMinutes,
    reminderFollowUpDays,
    reminderFollowUpHours,
    reminderFollowUpMinutes,
    alertFollowUpDays,
    alertFollowUpHours,
    alertFollowUpMinutes,
    maxFollowUpAttempts,
    followUpMessage
  } = req.body;

  const userId = req.user.id;

  // Upsert settings
  const settings = await prisma.followUpSettings.upsert({
    where: { userId },
    update: {
      isEnabled: isEnabled !== undefined ? isEnabled : undefined,
      taskFollowUpDays: taskFollowUpDays !== undefined ? taskFollowUpDays : undefined,
      taskFollowUpHours: taskFollowUpHours !== undefined ? taskFollowUpHours : undefined,
      taskFollowUpMinutes: taskFollowUpMinutes !== undefined ? taskFollowUpMinutes : undefined,
      reminderFollowUpDays: reminderFollowUpDays !== undefined ? reminderFollowUpDays : undefined,
      reminderFollowUpHours: reminderFollowUpHours !== undefined ? reminderFollowUpHours : undefined,
      reminderFollowUpMinutes: reminderFollowUpMinutes !== undefined ? reminderFollowUpMinutes : undefined,
      alertFollowUpDays: alertFollowUpDays !== undefined ? alertFollowUpDays : undefined,
      alertFollowUpHours: alertFollowUpHours !== undefined ? alertFollowUpHours : undefined,
      alertFollowUpMinutes: alertFollowUpMinutes !== undefined ? alertFollowUpMinutes : undefined,
      maxFollowUpAttempts: maxFollowUpAttempts !== undefined ? maxFollowUpAttempts : undefined,
      followUpMessage: followUpMessage !== undefined ? followUpMessage : undefined
    },
    create: {
      userId,
      isEnabled: isEnabled !== undefined ? isEnabled : false,
      taskFollowUpDays: taskFollowUpDays !== undefined ? taskFollowUpDays : 7,
      taskFollowUpHours: taskFollowUpHours !== undefined ? taskFollowUpHours : 0,
      taskFollowUpMinutes: taskFollowUpMinutes !== undefined ? taskFollowUpMinutes : 0,
      reminderFollowUpDays: reminderFollowUpDays !== undefined ? reminderFollowUpDays : 3,
      reminderFollowUpHours: reminderFollowUpHours !== undefined ? reminderFollowUpHours : 0,
      reminderFollowUpMinutes: reminderFollowUpMinutes !== undefined ? reminderFollowUpMinutes : 0,
      alertFollowUpDays: alertFollowUpDays !== undefined ? alertFollowUpDays : 5,
      alertFollowUpHours: alertFollowUpHours !== undefined ? alertFollowUpHours : 0,
      alertFollowUpMinutes: alertFollowUpMinutes !== undefined ? alertFollowUpMinutes : 0,
      maxFollowUpAttempts: maxFollowUpAttempts !== undefined ? maxFollowUpAttempts : 3,
      followUpMessage: followUpMessage !== undefined ? followUpMessage : "This is a follow-up reminder for your task/reminder. Please take action if needed."
    }
  });

  res.json({
    success: true,
    data: { settings },
    message: 'Follow-up settings updated successfully'
  });
}));

// @desc    Get follow-up tracking for user
// @route   GET /api/follow-up/tracking
// @access  Private
router.get('/tracking', asyncHandler(async (req, res) => {
  const { 
    status, 
    page = 1, 
    limit = 20,
    sortBy = 'scheduledFor',
    sortOrder = 'asc'
  } = req.query;

  // Build where object
  let where = {
    assignedToId: req.user.id
  };

  if (status) {
    where.status = status.toUpperCase();
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build sort object
  let orderBy = {};
  orderBy[sortBy] = sortOrder.toLowerCase();

  // Get follow-up tracking
  const tracking = await prisma.followUpTracking.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      project: {
        select: {
          id: true,
          projectName: true,
          projectNumber: true
        }
      }
    }
  });

  // Get total count
  const total = await prisma.followUpTracking.count({ where });

  // Calculate pagination info
  const totalPages = Math.ceil(total / take);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      tracking,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    },
    message: 'Follow-up tracking retrieved successfully'
  });
}));

// @desc    Cancel a follow-up
// @route   PUT /api/follow-up/tracking/:id/cancel
// @access  Private
router.put('/tracking/:id/cancel', [
  body('reason')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Cancellation reason must be between 1 and 500 characters')
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;

  // Check if follow-up exists and belongs to user
  const followUp = await prisma.followUpTracking.findFirst({
    where: {
      id,
      assignedToId: userId,
      status: 'PENDING'
    }
  });

  if (!followUp) {
    return next(new AppError('Follow-up not found or already processed', 404));
  }

  // Cancel the follow-up
  const updatedFollowUp = await prisma.followUpTracking.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledReason: reason
    }
  });

  res.json({
    success: true,
    data: { followUp: updatedFollowUp },
    message: 'Follow-up cancelled successfully'
  });
}));

// @desc    Mark follow-up as completed
// @route   PUT /api/follow-up/tracking/:id/complete
// @access  Private
router.put('/tracking/:id/complete', asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Check if follow-up exists and belongs to user
  const followUp = await prisma.followUpTracking.findFirst({
    where: {
      id,
      assignedToId: userId,
      status: { in: ['PENDING', 'SENT'] }
    }
  });

  if (!followUp) {
    return next(new AppError('Follow-up not found or already processed', 404));
  }

  // Mark as completed
  const updatedFollowUp = await prisma.followUpTracking.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });

  res.json({
    success: true,
    data: { followUp: updatedFollowUp },
    message: 'Follow-up marked as completed'
  });
}));

// @desc    Get follow-up statistics
// @route   GET /api/follow-up/stats
// @access  Private
router.get('/stats', managerAndAbove, asyncHandler(async (req, res) => {
  try {
  const userId = req.user.id;

  const [
    totalFollowUps,
    pendingFollowUps,
    completedFollowUps,
    cancelledFollowUps,
    overdueFollowUps
  ] = await Promise.all([
    prisma.followUpTracking.count({
      where: { assignedToId: userId }
    }),
    prisma.followUpTracking.count({
      where: { 
        assignedToId: userId,
        status: 'PENDING'
      }
    }),
    prisma.followUpTracking.count({
      where: { 
        assignedToId: userId,
        status: 'COMPLETED'
      }
    }),
    prisma.followUpTracking.count({
      where: { 
        assignedToId: userId,
        status: 'CANCELLED'
      }
    }),
    prisma.followUpTracking.count({
      where: { 
        assignedToId: userId,
        status: 'PENDING',
        scheduledFor: { lt: new Date() }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      total: totalFollowUps,
      pending: pendingFollowUps,
      completed: completedFollowUps,
      cancelled: cancelledFollowUps,
      overdue: overdueFollowUps
    },
    message: 'Follow-up statistics retrieved successfully'
  });
  } catch (error) {
    console.error('Error in follow-up stats route:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
}));

// @desc    Create follow-up for a task/reminder/alert (internal use)
// @route   POST /api/follow-up/create
// @access  Private (Manager and above)
router.post('/create', managerAndAbove, [
  body('originalItemId')
    .notEmpty()
    .withMessage('Original item ID is required'),
  body('originalItemType')
    .isIn(['TASK', 'REMINDER', 'ALERT', 'WORKFLOW_ALERT'])
    .withMessage('Invalid original item type'),
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required'),
  body('assignedToId')
    .notEmpty()
    .withMessage('Assigned to ID is required'),
  body('followUpDays')
    .isInt({ min: 1, max: 365 })
    .withMessage('Follow-up days must be between 1 and 365'),
  body('followUpMessage')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Follow-up message must be between 1 and 1000 characters')
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const {
    originalItemId,
    originalItemType,
    projectId,
    assignedToId,
    followUpDays,
    followUpMessage,
    metadata
  } = req.body;

  // Verify project and user exist
  const [project, user] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.user.findUnique({ where: { id: assignedToId } })
  ]);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Calculate scheduled date
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + followUpDays);

  // Create follow-up tracking
  const followUp = await prisma.followUpTracking.create({
    data: {
      originalItemId,
      originalItemType,
      projectId,
      assignedToId,
      followUpDays,
      scheduledFor,
      followUpMessage,
      metadata
    },
    include: {
      project: {
        select: {
          id: true,
          projectName: true,
          projectNumber: true
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
  });

  res.status(201).json({
    success: true,
    data: { followUp },
    message: 'Follow-up created successfully'
  });
}));

module.exports = router;
