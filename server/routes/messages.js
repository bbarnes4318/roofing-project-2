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
const { prisma } = require('../config/prisma');
const router = express.Router();

// Validation rules
const messageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('type')
    .isIn(['DIRECT', 'PROJECT', 'GROUP', 'ANNOUNCEMENT'])
    .withMessage('Message type must be DIRECT, PROJECT, GROUP, or ANNOUNCEMENT'),
  body('recipientId')
    .optional()
    .isUUID()
    .withMessage('Recipient ID must be a valid UUID'),
  body('projectId')
    .optional()
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Priority must be LOW, MEDIUM, or HIGH'),
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
    sortBy = 'created_at',
    sortOrder = 'desc',
    unreadOnly = false
  } = req.query;

  // Build filter object - Show ALL messages to all users
  let where = {};
  
  if (type) where.type = type;
  if (projectId) where.projectId = projectId;
  if (recipientId) where.recipientId = recipientId;
  if (senderId) where.senderId = senderId;
  if (priority) where.priority = priority;
  
  // Filter for unread messages only
  if (unreadOnly === 'true') {
    where.readBy = { not: { has: req.user.id } };
  }
  
  // Add search functionality
  if (search) {
    where.OR = [
      { content: { contains: search, mode: 'insensitive' } },
      { senderName: { contains: search, mode: 'insensitive' } },
      { recipientName: { contains: search, mode: 'insensitive' } },
      { projectName: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const orderBy = {};
  orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';

  // Execute query with pagination
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            projectName: true
          }
        }
      }
    }),
    prisma.message.count({ where })
  ]);

  sendPaginatedResponse(res, messages, pageNum, limitNum, total, 'Messages retrieved successfully');
}));

// @desc    Get all conversations with messages for dashboard
// @route   GET /api/messages/conversations
// @access  Private
router.get('/conversations', asyncHandler(async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    include: {
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }
    },
    orderBy: {
      updated_at: 'desc'
    }
  });

  sendSuccess(res, 200, conversations, 'Conversations retrieved successfully');
}));

// @desc    Get message by ID
// @route   GET /api/messages/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const message = await prisma.message.findUnique({
    where: { id: req.params.id },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
    }
  });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Allow all users to access all messages
  // No access restrictions - all messages are viewable by all users

  // Mark as read if user is recipient
  if (message.recipientId === req.user.id && 
      !message.readBy?.includes(req.user.id)) {
    const updatedReadBy = message.readBy || [];
    updatedReadBy.push(req.user.id);
    
    await prisma.message.update({
      where: { id: req.params.id },
      data: {
        readBy: updatedReadBy,
        readAt: new Date()
      }
    });
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

  const { content, type, recipientId, projectId, priority = 'MEDIUM', attachments = [] } = req.body;

  // Get recipient and project names
  let recipientName = '';
  let projectName = '';
  
  if (recipientId) {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { firstName: true, lastName: true }
    });
    if (recipient) {
      recipientName = `${recipient.firstName} ${recipient.lastName}`;
    }
  }
  
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectName: true }
    });
    if (project) {
      projectName = project.projectName;
    }
  }

  // Create message
  const messageData = {
    content,
    type,
    recipientId,
    projectId,
    projectName,
    priority,
    attachments,
    senderId: req.user.id,
    senderName: `${req.user.firstName} ${req.user.lastName}`,
    senderAvatar: req.user.avatar || '',
    recipientName,
    participants: type === 'GROUP' ? [req.user.id, recipientId] : undefined
  };

  const message = await prisma.message.create({
    data: messageData,
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
    }
  });

  sendSuccess(res, 201, { message }, 'Message sent successfully');
}));

// @desc    Update message
// @route   PUT /api/messages/:id
// @access  Private (Only sender can update)
router.put('/:id', [
  body('content').optional().trim().isLength({ min: 1, max: 5000 }),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH'])
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

  const message = await prisma.message.findUnique({
    where: { id: req.params.id }
  });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is the sender
  if (message.senderId !== req.user.id) {
    return next(new AppError('Only the sender can update this message', 403));
  }

  // Update message
  const updatedMessage = await prisma.message.update({
    where: { id: req.params.id },
    data: { 
      ...req.body, 
      updated_at: new Date(),
      isEdited: true 
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
    }
  });

  sendSuccess(res, 200, { message: updatedMessage }, 'Message updated successfully');
}));

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private (Sender or Manager and above)
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const message = await prisma.message.findUnique({
    where: { id: req.params.id }
  });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is the sender or has manager privileges
  const isSender = message.senderId === req.user.id;
  const isManager = ['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(req.user.role);

  if (!isSender && !isManager) {
    return next(new AppError('Access denied', 403));
  }

  await prisma.message.delete({
    where: { id: req.params.id }
  });

  sendSuccess(res, 200, null, 'Message deleted successfully');
}));

// @desc    Mark message as read
// @route   PATCH /api/messages/:id/read
// @access  Private
router.patch('/:id/read', asyncHandler(async (req, res, next) => {
  const message = await prisma.message.findUnique({
    where: { id: req.params.id }
  });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is the recipient
  const isRecipient = message.recipientId === req.user.id ||
                     message.participants?.includes(req.user.id);

  if (!isRecipient) {
    return next(new AppError('Access denied', 403));
  }

  // Mark as read
  const updatedReadBy = message.readBy || [];
  if (!updatedReadBy.includes(req.user.id)) {
    updatedReadBy.push(req.user.id);
    
    await prisma.message.update({
      where: { id: req.params.id },
      data: {
        readBy: updatedReadBy,
        readAt: new Date()
      }
    });
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
  const where = {
    type: 'DIRECT',
    OR: [
      { senderId: req.user.id, recipientId: otherUserId },
      { senderId: otherUserId, recipientId: req.user.id }
    ]
  };

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limitNum,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      }
    }),
    prisma.message.count({ where })
  ]);

  // Mark messages as read
  const messageIds = messages.map(m => m.id);
  await prisma.message.updateMany({
    where: { 
      id: { in: messageIds },
      recipientId: req.user.id,
      readBy: { not: { has: req.user.id } }
    },
    data: {
      readBy: { push: req.user.id },
      readAt: new Date()
    }
  });

  sendPaginatedResponse(res, messages.reverse(), pageNum, limitNum, total, 'Conversation retrieved successfully');
}));

// @desc    Get project messages
// @route   GET /api/messages/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const { page = 1, limit = 50 } = req.query;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    type: 'PROJECT',
    projectId
  };

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limitNum,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            projectName: true
          }
        }
      }
    }),
    prisma.message.count({ where })
  ]);

  sendPaginatedResponse(res, messages.reverse(), pageNum, limitNum, total, 'Project messages retrieved successfully');
}));

// @desc    Get unread messages count
// @route   GET /api/messages/unread/count
// @access  Private
router.get('/unread/count', asyncHandler(async (req, res) => {
  const unreadCount = await prisma.message.count({
    where: {
      OR: [
        { recipientId: req.user.id },
        { participants: { has: req.user.id } }
      ],
      readBy: { not: { has: req.user.id } }
    }
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

  const stats = await prisma.message.groupBy({
    by: ['type'],
    where: {
      created_at: { gte: dateThreshold }
    },
    _count: {
      id: true
    }
  });

  const priorityStats = await prisma.message.groupBy({
    by: ['priority'],
    where: {
      created_at: { gte: dateThreshold }
    },
    _count: {
      id: true
    }
  });

  const totalMessages = await prisma.message.count({
    where: {
      created_at: { gte: dateThreshold }
    }
  });

  const uniqueSenders = await prisma.message.groupBy({
    by: ['senderId'],
    where: {
      created_at: { gte: dateThreshold }
    },
    _count: {
      id: true
    }
  });

  const uniqueRecipients = await prisma.message.groupBy({
    by: ['recipientId'],
    where: {
      created_at: { gte: dateThreshold },
      recipientId: { not: null }
    },
    _count: {
      id: true
    }
  });

  const overview = {
    totalMessages,
    uniqueSendersCount: uniqueSenders.length,
    uniqueRecipientsCount: uniqueRecipients.length
  };

  sendSuccess(res, 200, {
    overview,
    byType: stats.map(stat => ({
      _id: stat.type,
      count: stat._count.id
    })),
    byPriority: priorityStats.map(stat => ({
      _id: stat.priority,
      count: stat._count.id
    }))
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

  const searchQuery = q.trim();
  
  // Only search messages where user is sender or recipient
  const messages = await prisma.message.findMany({
    where: {
      AND: [
        {
          OR: [
            { senderId: req.user.id },
            { recipientId: req.user.id },
            { type: 'ANNOUNCEMENT' },
            { participants: { has: req.user.id } }
          ]
        },
        {
          OR: [
            { content: { contains: searchQuery, mode: 'insensitive' } },
            { senderName: { contains: searchQuery, mode: 'insensitive' } },
            { recipientName: { contains: searchQuery, mode: 'insensitive' } },
            { projectName: { contains: searchQuery, mode: 'insensitive' } }
          ]
        }
      ]
    },
    take: parseInt(limit),
    select: {
      id: true,
      content: true,
      type: true,
      senderName: true,
      recipientName: true,
      projectName: true,
      created_at: true,
      priority: true
    }
  });

  sendSuccess(res, 200, { messages, count: messages.length }, 'Search results retrieved successfully');
}));


module.exports = router; 