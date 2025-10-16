const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
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

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    isRead, 
    type, 
    page = 1, 
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  // Build where object
  let where = {
    recipientId: req.user.id
  };

  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }

  if (type) {
    where.type = type.toUpperCase();
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build sort object
  let orderBy = {};
  orderBy[sortBy] = sortOrder.toLowerCase();

  // Get notifications
  const notifications = await prisma.notification.findMany({
    where,
    orderBy,
    skip,
    take
  });

  // Get total count
  const total = await prisma.notification.count({ where });

  // Calculate pagination info
  const totalPages = Math.ceil(total / take);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    },
    message: 'Notifications retrieved successfully'
  });
}));

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread/count
// @access  Private
router.get('/unread/count', asyncHandler(async (req, res) => {
  const unreadCount = await prisma.notification.count({
    where: {
      recipientId: req.user.id,
      isRead: false
    }
  });

  res.json({
    success: true,
    data: { unreadCount },
    message: 'Unread count retrieved successfully'
  });
}));

// @desc    Mark notification as read
// @route   POST /api/notifications/:id/read
// @access  Private
router.post('/:id/read', asyncHandler(async (req, res, next) => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id }
  });

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  // Check if notification belongs to current user
  if (notification.recipientId !== req.user.id) {
    return next(new AppError('Access denied', 403));
  }

  // Mark as read
  const updatedNotification = await prisma.notification.update({
    where: { id: req.params.id },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  res.json({
    success: true,
    data: { notification: updatedNotification },
    message: 'Notification marked as read'
  });
}));

// @desc    Mark notification as unread
// @route   POST /api/notifications/:id/unread
// @access  Private
router.post('/:id/unread', asyncHandler(async (req, res, next) => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id }
  });

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  // Check if notification belongs to current user
  if (notification.recipientId !== req.user.id) {
    return next(new AppError('Access denied', 403));
  }

  // Mark as unread
  const updatedNotification = await prisma.notification.update({
    where: { id: req.params.id },
    data: {
      isRead: false,
      readAt: null
    }
  });

  res.json({
    success: true,
    data: { notification: updatedNotification },
    message: 'Notification marked as unread'
  });
}));

// @desc    Mark all notifications as read
// @route   POST /api/notifications/read-all
// @access  Private
router.post('/read-all', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      recipientId: req.user.id,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id }
  });

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  // Check if notification belongs to current user
  if (notification.recipientId !== req.user.id) {
    return next(new AppError('Access denied', 403));
  }

  await prisma.notification.delete({
    where: { id: req.params.id }
  });

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
}));

// @desc    Create notification (for system use)
// @route   POST /api/notifications
// @access  Private (Manager and above)
router.post('/', managerAndAbove, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('type')
    .isIn(['TASK_ASSIGNED', 'TASK_COMPLETED', 'PROJECT_UPDATE', 'WORKFLOW_ALERT', 'SYSTEM_MESSAGE', 'REMINDER'])
    .withMessage('Invalid notification type'),
  body('recipientId')
    .isUUID()
    .withMessage('Recipient ID must be a valid UUID'),
  body('actionUrl')
    .optional()
    .isURL()
    .withMessage('Action URL must be a valid URL'),
  body('actionData')
    .optional()
    .isJSON()
    .withMessage('Action data must be valid JSON')
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
    title,
    message,
    type,
    recipientId,
    actionUrl,
    actionData
  } = req.body;

  // Verify recipient exists
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId }
  });

  if (!recipient) {
    return next(new AppError('Recipient not found', 404));
  }

  // Create notification
  const notification = await prisma.notification.create({
    data: {
      title,
      message,
      type: type.toUpperCase(),
      recipientId,
      actionUrl,
      actionData: actionData ? JSON.parse(actionData) : null
    }
  });

  res.status(201).json({
    success: true,
    data: { notification },
    message: 'Notification created successfully'
  });
}));

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
router.get('/stats', asyncHandler(async (req, res) => {
  const [
    totalNotifications,
    unreadNotifications,
    notificationsByType,
    recentNotifications
  ] = await Promise.all([
    prisma.notification.count({
      where: { recipientId: req.user.id }
    }),
    prisma.notification.count({
      where: {
        recipientId: req.user.id,
        isRead: false
      }
    }),
    prisma.notification.groupBy({
      by: ['type'],
      where: { recipientId: req.user.id },
      _count: { type: true }
    }),
    prisma.notification.findMany({
      where: { recipientId: req.user.id },
      orderBy: { created_at: 'desc' },
      take: 5
    })
  ]);

  res.json({
    success: true,
    data: {
      totalNotifications,
      unreadNotifications,
      notificationsByType,
      recentNotifications
    }
  });
}));

module.exports = router; 