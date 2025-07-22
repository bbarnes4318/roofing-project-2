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
  managerAndAbove 
} = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    isRead, 
    type, 
    priority,
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build options object
  const options = {
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
  };

  if (isRead !== undefined) {
    options.isRead = isRead === 'true';
  }

  if (type) {
    options.type = type;
  }

  if (priority) {
    options.priority = priority;
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const notifications = await Notification.findForUser(req.user._id, options);
  const total = await Notification.countDocuments({
    user: req.user._id,
    expiresAt: { $gt: new Date() },
    ...(options.isRead !== undefined && { isRead: options.isRead }),
    ...(options.type && { type: options.type }),
    ...(options.priority && { priority: options.priority })
  });

  sendPaginatedResponse(res, notifications, pageNum, limitNum, total, 'Notifications retrieved successfully');
}));

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread/count
// @access  Private
router.get('/unread/count', asyncHandler(async (req, res) => {
  const unreadCount = await Notification.getUnreadCount(req.user._id);

  sendSuccess(res, 200, { unreadCount }, 'Unread count retrieved successfully');
}));

// @desc    Mark notification as read
// @route   POST /api/notifications/:id/read
// @access  Private
router.post('/:id/read', asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  // Check if notification belongs to current user
  if (notification.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied', 403));
  }

  // Mark as read
  await notification.markAsRead();

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`user_${req.user._id}`).emit('notification_read', {
    notificationId: req.params.id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, { notification }, 'Notification marked as read');
}));

// @desc    Mark notification as unread
// @route   POST /api/notifications/:id/unread
// @access  Private
router.post('/:id/unread', asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  // Check if notification belongs to current user
  if (notification.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied', 403));
  }

  // Mark as unread
  await notification.markAsUnread();

  sendSuccess(res, 200, { notification }, 'Notification marked as unread');
}));

// @desc    Mark all notifications as read
// @route   POST /api/notifications/read-all
// @access  Private
router.post('/read-all', asyncHandler(async (req, res) => {
  const { type } = req.body;

  const result = await Notification.markAllAsReadForUser(req.user._id, type);

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`user_${req.user._id}`).emit('notifications_read_all', {
    type: type || 'all',
    count: result.modifiedCount,
    timestamp: new Date()
  });

  sendSuccess(res, 200, { 
    markedCount: result.modifiedCount 
  }, `All ${type || ''} notifications marked as read`);
}));

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  // Check if notification belongs to current user
  if (notification.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied', 403));
  }

  // Check if notification can be deleted
  if (!notification.canBeDeleted()) {
    return next(new AppError('Notification cannot be deleted. Mark as read first or wait for expiration.', 400));
  }

  await Notification.findByIdAndDelete(req.params.id);

  sendSuccess(res, 200, null, 'Notification deleted successfully');
}));

// @desc    Create notification (Admin/Manager only)
// @route   POST /api/notifications
// @access  Private (Manager and above)
router.post('/', managerAndAbove, [
  body('user')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
  body('type')
    .optional()
    .isIn([
      'task_assigned', 'task_completed', 'task_overdue', 'project_updated',
      'project_completed', 'message_received', 'document_uploaded',
      'calendar_event', 'deadline_approaching', 'system_announcement',
      'user_mention', 'approval_required', 'payment_due',
      'inspection_scheduled', 'material_delivered', 'other'
    ])
    .withMessage('Invalid notification type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('link')
    .optional()
    .isURL()
    .withMessage('Link must be a valid URL')
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

  const notificationData = {
    ...req.body,
    type: req.body.type || 'other',
    priority: req.body.priority || 'medium'
  };

  const notification = await Notification.createNotification(notificationData);

  sendSuccess(res, 201, { notification }, 'Notification created successfully');
}));

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id)
    .populate('relatedProject', 'projectName')
    .populate('relatedTask', 'title')
    .populate('relatedUser', 'firstName lastName avatar')
    .populate('relatedDocument', 'fileName')
    .populate('relatedEvent', 'title start');

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  // Check if notification belongs to current user or user is admin/manager
  const hasAccess = notification.user.toString() === req.user._id.toString() ||
                   ['admin', 'manager'].includes(req.user.role);

  if (!hasAccess) {
    return next(new AppError('Access denied', 403));
  }

  sendSuccess(res, 200, { notification }, 'Notification retrieved successfully');
}));

// @desc    Extend notification expiration
// @route   PATCH /api/notifications/:id/extend
// @access  Private
router.patch('/:id/extend', [
  body('hours')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Hours must be between 1 and 168 (1 week)')
], asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  // Check if notification belongs to current user
  if (notification.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied', 403));
  }

  const hours = req.body.hours || 24;
  await notification.extendExpiration(hours);

  sendSuccess(res, 200, { notification }, `Notification expiration extended by ${hours} hours`);
}));

// @desc    Get notification statistics (Admin/Manager only)
// @route   GET /api/notifications/stats/overview
// @access  Private (Manager and above)
router.get('/stats/overview', managerAndAbove, asyncHandler(async (req, res) => {
  const { days = 30, userId } = req.query;

  const stats = await Notification.getStatistics(userId, parseInt(days));

  sendSuccess(res, 200, stats, 'Notification statistics retrieved successfully');
}));

// @desc    Cleanup expired notifications (Admin only)
// @route   DELETE /api/notifications/cleanup/expired
// @access  Private (Manager and above)
router.delete('/cleanup/expired', managerAndAbove, asyncHandler(async (req, res) => {
  const result = await Notification.cleanupExpired();

  sendSuccess(res, 200, { 
    deletedCount: result.deletedCount 
  }, `${result.deletedCount} expired notifications cleaned up`);
}));

// @desc    Get notifications by type (Admin/Manager only)
// @route   GET /api/notifications/type/:type
// @access  Private (Manager and above)
router.get('/type/:type', managerAndAbove, asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { 
    userId, 
    isRead, 
    limit = 50,
    page = 1 
  } = req.query;

  const options = {
    limit: parseInt(limit),
    userId,
    isRead: isRead !== undefined ? isRead === 'true' : undefined
  };

  const notifications = await Notification.findByType(type, options);
  const total = await Notification.countDocuments({
    type,
    ...(options.userId && { user: options.userId }),
    ...(options.isRead !== undefined && { isRead: options.isRead })
  });

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  sendPaginatedResponse(res, notifications, pageNum, limitNum, total, `${type} notifications retrieved successfully`);
}));

// @desc    Broadcast notification to multiple users (Admin/Manager only)
// @route   POST /api/notifications/broadcast
// @access  Private (Manager and above)
router.post('/broadcast', managerAndAbove, [
  body('users')
    .isArray({ min: 1 })
    .withMessage('Users array is required with at least one user'),
  body('users.*')
    .isMongoId()
    .withMessage('All user IDs must be valid'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
  body('type')
    .optional()
    .isIn([
      'task_assigned', 'task_completed', 'task_overdue', 'project_updated',
      'project_completed', 'message_received', 'document_uploaded',
      'calendar_event', 'deadline_approaching', 'system_announcement',
      'user_mention', 'approval_required', 'payment_due',
      'inspection_scheduled', 'material_delivered', 'other'
    ])
    .withMessage('Invalid notification type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent')
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

  const { users, message, type = 'system_announcement', priority = 'medium', link, data } = req.body;

  // Create notifications for all users
  const notifications = await Promise.all(
    users.map(userId => 
      Notification.createNotification({
        user: userId,
        message,
        type,
        priority,
        link,
        data,
        groupKey: `broadcast_${Date.now()}` // Group broadcasts together
      })
    )
  );

  sendSuccess(res, 201, { 
    notifications,
    count: notifications.length 
  }, `Broadcast sent to ${notifications.length} users`);
}));

module.exports = router; 