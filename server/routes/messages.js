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
const Message = require('../models/Message');
const Project = require('../models/Project');
const User = require('../models/User');

const router = express.Router();

// Validation rules
const messageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('type')
    .isIn(['direct', 'project', 'group', 'announcement'])
    .withMessage('Message type must be direct, project, group, or announcement'),
  body('recipientId')
    .optional()
    .isMongoId()
    .withMessage('Recipient ID must be a valid MongoDB ObjectId'),
  body('projectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array')
];

// @desc    Get all messages with filtering and pagination
// @route   GET /api/messages
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    type, 
    projectId, 
    recipientId,
    senderId,
    priority,
    search, 
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    unreadOnly = false
  } = req.query;

  // Build filter object
  let filter = {};
  
  // Show messages where user is sender or recipient
  filter.$or = [
    { senderId: req.user._id },
    { recipientId: req.user._id },
    { type: 'announcement' }, // Everyone can see announcements
    { 'participants': req.user._id } // Group messages
  ];
  
  if (type) filter.type = type;
  if (projectId) filter.projectId = parseInt(projectId);
  if (recipientId) filter.recipientId = recipientId;
  if (senderId) filter.senderId = senderId;
  if (priority) filter.priority = priority;
  
  // Filter for unread messages only
  if (unreadOnly === 'true') {
    filter.readBy = { $ne: req.user._id };
  }
  
  // Add search functionality
  if (search) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { content: new RegExp(search, 'i') },
        { senderName: new RegExp(search, 'i') },
        { recipientName: new RegExp(search, 'i') },
        { projectName: new RegExp(search, 'i') }
      ]
    });
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Message.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, messages, pageNum, limitNum, total, 'Messages retrieved successfully');
}));

// @desc    Get message by ID
// @route   GET /api/messages/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const message = await Message.findOne({ id: parseInt(req.params.id) });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user has access to this message
  const hasAccess = message.senderId.toString() === req.user._id.toString() ||
                   message.recipientId?.toString() === req.user._id.toString() ||
                   message.type === 'announcement' ||
                   message.participants?.includes(req.user._id);

  if (!hasAccess) {
    return next(new AppError('Access denied', 403));
  }

  // Mark as read if user is recipient
  if (message.recipientId?.toString() === req.user._id.toString() && 
      !message.readBy?.includes(req.user._id)) {
    message.readBy = message.readBy || [];
    message.readBy.push(req.user._id);
    message.readAt = new Date();
    await message.save();
  }

  sendSuccess(res, 200, { message }, 'Message retrieved successfully');
}));

// @desc    Send new message
// @route   POST /api/messages
// @access  Private
router.post('/', messageValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { content, type, recipientId, projectId, priority = 'Medium', attachments = [] } = req.body;

  // Get the highest ID and increment
  const lastMessage = await Message.findOne().sort({ id: -1 });
  const newId = lastMessage ? lastMessage.id + 1 : 1;

  // Get recipient and project names
  let recipientName = '';
  let projectName = '';
  
  if (recipientId) {
    const recipient = await User.findById(recipientId);
    if (recipient) {
      recipientName = recipient.fullName || `${recipient.firstName} ${recipient.lastName}`;
    }
  }
  
  if (projectId) {
    const project = await Project.findOne({ id: projectId });
    if (project) {
      projectName = project.name;
    }
  }

  // Create message with auto-generated ID
  const messageData = {
    id: newId,
    content,
    type,
    recipientId,
    projectId,
    projectName,
    priority,
    attachments,
    senderId: req.user._id,
    senderName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
    senderAvatar: req.user.avatar || '',
    recipientName,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const message = await Message.create(messageData);

  // Emit real-time update
  const io = req.app.get('io');
  
  // Send to recipient if direct message
  if (type === 'direct' && recipientId) {
    io.to(`user_${recipientId}`).emit('new_message', {
      message,
      timestamp: new Date()
    });
  }
  
  // Send to project room if project message
  if (type === 'project' && projectId) {
    io.to(`project_${projectId}`).emit('project_message', {
      message,
      timestamp: new Date()
    });
  }
  
  // Send to all users if announcement
  if (type === 'announcement') {
    io.emit('announcement', {
      message,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 201, { message }, 'Message sent successfully');
}));

// @desc    Update message
// @route   PUT /api/messages/:id
// @access  Private (Only sender can update)
router.put('/:id', [
  body('content').optional().trim().isLength({ min: 1, max: 5000 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High'])
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

  const messageId = parseInt(req.params.id);
  const message = await Message.findOne({ id: messageId });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is the sender
  if (message.senderId.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the sender can update this message', 403));
  }

  // Update message
  const updatedMessage = await Message.findOneAndUpdate(
    { id: messageId },
    { 
      ...req.body, 
      updatedAt: new Date(),
      isEdited: true 
    },
    { new: true, runValidators: true }
  );

  // Emit real-time update
  const io = req.app.get('io');
  
  if (message.type === 'direct' && message.recipientId) {
    io.to(`user_${message.recipientId}`).emit('message_updated', {
      message: updatedMessage,
      timestamp: new Date()
    });
  }
  
  if (message.type === 'project' && message.projectId) {
    io.to(`project_${message.projectId}`).emit('project_message_updated', {
      message: updatedMessage,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 200, { message: updatedMessage }, 'Message updated successfully');
}));

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private (Sender or Manager and above)
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const messageId = parseInt(req.params.id);
  const message = await Message.findOne({ id: messageId });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is the sender or has manager privileges
  const isSender = message.senderId.toString() === req.user._id.toString();
  const isManager = ['admin', 'manager', 'project_manager'].includes(req.user.role);

  if (!isSender && !isManager) {
    return next(new AppError('Access denied', 403));
  }

  await Message.findOneAndDelete({ id: messageId });

  // Emit real-time update
  const io = req.app.get('io');
  
  if (message.type === 'direct' && message.recipientId) {
    io.to(`user_${message.recipientId}`).emit('message_deleted', {
      messageId,
      timestamp: new Date()
    });
  }
  
  if (message.type === 'project' && message.projectId) {
    io.to(`project_${message.projectId}`).emit('project_message_deleted', {
      messageId,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 200, null, 'Message deleted successfully');
}));

// @desc    Mark message as read
// @route   PATCH /api/messages/:id/read
// @access  Private
router.patch('/:id/read', asyncHandler(async (req, res, next) => {
  const messageId = parseInt(req.params.id);
  const message = await Message.findOne({ id: messageId });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is the recipient
  const isRecipient = message.recipientId?.toString() === req.user._id.toString() ||
                     message.participants?.includes(req.user._id);

  if (!isRecipient) {
    return next(new AppError('Access denied', 403));
  }

  // Mark as read
  message.readBy = message.readBy || [];
  if (!message.readBy.includes(req.user._id)) {
    message.readBy.push(req.user._id);
    message.readAt = new Date();
    await message.save();
  }

  sendSuccess(res, 200, { message }, 'Message marked as read');
}));

// @desc    Get conversation between two users
// @route   GET /api/messages/conversation/:userId
// @access  Private
router.get('/conversation/:userId', asyncHandler(async (req, res) => {
  const otherUserId = req.params.userId;
  const { page = 1, limit = 50 } = req.query;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Find messages between current user and other user
  const filter = {
    type: 'direct',
    $or: [
      { senderId: req.user._id, recipientId: otherUserId },
      { senderId: otherUserId, recipientId: req.user._id }
    ]
  };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Message.countDocuments(filter)
  ]);

  // Mark messages as read
  await Message.updateMany(
    { 
      id: { $in: messages.map(m => m.id) },
      recipientId: req.user._id,
      readBy: { $ne: req.user._id }
    },
    { 
      $push: { readBy: req.user._id },
      readAt: new Date()
    }
  );

  sendPaginatedResponse(res, messages.reverse(), pageNum, limitNum, total, 'Conversation retrieved successfully');
}));

// @desc    Get project messages
// @route   GET /api/messages/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { page = 1, limit = 50 } = req.query;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    type: 'project',
    projectId
  };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Message.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, messages.reverse(), pageNum, limitNum, total, 'Project messages retrieved successfully');
}));

// @desc    Get unread messages count
// @route   GET /api/messages/unread/count
// @access  Private
router.get('/unread/count', asyncHandler(async (req, res) => {
  const unreadCount = await Message.countDocuments({
    $or: [
      { recipientId: req.user._id },
      { participants: req.user._id }
    ],
    readBy: { $ne: req.user._id }
  });

  sendSuccess(res, 200, { unreadCount }, 'Unread messages count retrieved successfully');
}));

// @desc    Get message statistics
// @route   GET /api/messages/stats/overview
// @access  Private (Manager and above)
router.get('/stats/overview', managerAndAbove, asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

  const stats = await Message.aggregate([
    {
      $match: {
        createdAt: { $gte: dateThreshold }
      }
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        uniqueSenders: { $addToSet: '$senderId' },
        uniqueRecipients: { $addToSet: '$recipientId' }
      }
    },
    {
      $project: {
        totalMessages: 1,
        uniqueSendersCount: { $size: '$uniqueSenders' },
        uniqueRecipientsCount: { $size: '$uniqueRecipients' }
      }
    }
  ]);

  const typeStats = await Message.aggregate([
    {
      $match: {
        createdAt: { $gte: dateThreshold }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  const priorityStats = await Message.aggregate([
    {
      $match: {
        createdAt: { $gte: dateThreshold }
      }
    },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  const overview = stats[0] || {
    totalMessages: 0,
    uniqueSendersCount: 0,
    uniqueRecipientsCount: 0
  };

  sendSuccess(res, 200, {
    overview,
    byType: typeStats,
    byPriority: priorityStats
  }, 'Message statistics retrieved successfully');
}));

// @desc    Search messages
// @route   GET /api/messages/search/query
// @access  Private
router.get('/search/query', asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  const searchRegex = new RegExp(q.trim(), 'i');
  
  // Only search messages where user is sender or recipient
  const messages = await Message.find({
    $and: [
      {
        $or: [
          { senderId: req.user._id },
          { recipientId: req.user._id },
          { type: 'announcement' },
          { participants: req.user._id }
        ]
      },
      {
        $or: [
          { content: searchRegex },
          { senderName: searchRegex },
          { recipientName: searchRegex },
          { projectName: searchRegex }
        ]
      }
    ]
  })
  .limit(parseInt(limit))
  .select('id content type senderName recipientName projectName createdAt priority')
  .lean();

  sendSuccess(res, 200, { messages, count: messages.length }, 'Search results retrieved successfully');
}));

module.exports = router; 