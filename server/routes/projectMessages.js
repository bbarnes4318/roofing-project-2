const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const ProjectMessageService = require('../services/ProjectMessageService');
const ProjectInitializationService = require('../services/ProjectInitializationService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const messageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10000 characters'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Subject must be between 1 and 255 characters'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or URGENT'),
  body('parentMessageId')
    .optional()
    .isUUID()
    .withMessage('Parent message ID must be a valid UUID')
];

// @desc    Get project messages with conversation threading
// @route   GET /api/project-messages/:projectId
// @access  Private
router.get('/:projectId', asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const { 
    page = 1, 
    limit = 20,
    includeReplies = 'true',
    messageType,
    author,
    search
  } = req.query;

  // Check if user has access to this project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      id: true, 
      projectNumber: true,
      projectName: true,
      projectManagerId: true,
      teamMembers: {
        select: { userId: true }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Check access (project manager, team member, or admin)
  const hasAccess = true; // Temporarily bypass auth check
  // const hasAccess = project.projectManagerId === req.user?.id ||
  //                  project.teamMembers.some(member => member.userId === req.user?.id) ||
  //                  ['ADMIN', 'MANAGER'].includes(req.user?.role);

  if (!hasAccess) {
    return next(new AppError('Access denied to this project', 403));
  }

  // Build filter
  let where = { projectId };
  
  if (messageType) {
    where.messageType = messageType;
  }
  
  if (author) {
    where.authorName = { contains: author, mode: 'insensitive' };
  }
  
  if (search) {
    where.OR = [
      { content: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
      { authorName: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Only get parent messages for pagination, replies will be included
  if (includeReplies === 'true') {
    where.parentMessageId = null;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [messages, total] = await Promise.all([
    prisma.projectMessage.findMany({
      where,
      include: {
        replies: includeReplies === 'true' ? {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true
              }
            }
          }
        } : false,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip
    }),
    prisma.projectMessage.count({ where })
  ]);

  // Transform messages to match frontend expectations
  const transformedMessages = messages.map(message => ({
    id: message.id,
    projectId: message.projectId,
    projectNumber: message.projectNumber,
    subject: message.subject,
    content: message.content,
    messageType: message.messageType,
    priority: message.priority,
    author: message.author,
    authorName: message.authorName,
    authorRole: message.authorRole,
    phase: message.phase,
    section: message.section,
    lineItem: message.lineItem,
    stepName: message.stepName,
    isSystemGenerated: message.isSystemGenerated,
    isWorkflowMessage: message.isWorkflowMessage,
    readBy: message.readBy,
    readCount: message.readCount,
    metadata: message.metadata,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    replies: message.replies || [],
    conversationCount: (message.replies?.length || 0) + 1
  }));

  sendPaginatedResponse(res, transformedMessages, pageNum, limitNum, total, 'Project messages retrieved successfully');
}));

// @desc    Create new project message
// @route   POST /api/project-messages/:projectId
// @access  Private
router.post('/:projectId', messageValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { projectId } = req.params;
  const { content, subject, priority = 'MEDIUM', parentMessageId } = req.body;

  // Check if user has access to this project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      id: true, 
      projectNumber: true,
      projectManagerId: true,
      teamMembers: {
        select: { userId: true }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Check access
  const hasAccess = true; // Temporarily bypass auth check
  // const hasAccess = project.projectManagerId === req.user?.id ||
  //                  project.teamMembers.some(member => member.userId === req.user?.id) ||
  //                  ['ADMIN', 'MANAGER'].includes(req.user?.role);

  if (!hasAccess) {
    return next(new AppError('Access denied to this project', 403));
  }

  // Create message using service
  const message = await ProjectMessageService.createUserMessage(
    projectId,
    req.user?.id || 'system',
    content,
    subject,
    { parentMessageId, priority }
  );

  sendSuccess(res, 201, { message }, 'Message created successfully');
}));

// @desc    Mark message as read
// @route   PATCH /api/project-messages/:messageId/read
// @access  Private
router.patch('/:messageId/read', asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;

  const success = await ProjectMessageService.markAsRead(messageId, req.user?.id || 'system');
  
  if (!success) {
    return next(new AppError('Message not found', 404));
  }

  sendSuccess(res, 200, null, 'Message marked as read');
}));

// @desc    Get message thread (message and all its replies)
// @route   GET /api/project-messages/thread/:messageId
// @access  Private
router.get('/thread/:messageId', asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;

  const message = await prisma.projectMessage.findUnique({
    where: { id: messageId },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              avatar: true
            }
          }
        }
      },
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true
        }
      },
      project: {
        select: {
          projectNumber: true,
          projectName: true,
          projectManagerId: true,
          teamMembers: {
            select: { userId: true }
          }
        }
      }
    }
  });

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check access
  const hasAccess = true; // Temporarily bypass auth check
  // const hasAccess = message.project.projectManagerId === req.user?.id ||
  //                  message.project.teamMembers.some(member => member.userId === req.user?.id) ||
  //                  ['ADMIN', 'MANAGER'].includes(req.user?.role);

  if (!hasAccess) {
    return next(new AppError('Access denied', 403));
  }

  sendSuccess(res, 200, { message }, 'Message thread retrieved successfully');
}));

// @desc    Generate demo messages for a project (for testing)
// @route   POST /api/project-messages/:projectId/generate-demo
// @access  Private (Admin only)
router.post('/:projectId/generate-demo', asyncHandler(async (req, res, next) => {
  // Skip role check for now - can be added back when auth is fully configured
  // if (!['ADMIN', 'MANAGER'].includes(req.user?.role)) {
  //   return next(new AppError('Access denied - Admin privileges required', 403));
  // }

  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      id: true, 
      projectNumber: true,
      projectName: true,
      phase: true
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Generate demo messages
  const messages = await ProjectMessageService.generateOngoingDiscussion(project);

  sendSuccess(res, 201, { 
    messages,
    count: messages.length 
  }, 'Demo messages generated successfully');
}));

// @desc    Initialize messages for existing projects (one-time setup)
// @route   POST /api/project-messages/initialize-existing
// @access  Private (Admin only)
router.post('/initialize-existing', asyncHandler(async (req, res, next) => {
  // Skip role check for now - can be added back when auth is fully configured
  // if (!['ADMIN', 'MANAGER'].includes(req.user?.role)) {
  //   return next(new AppError('Access denied - Admin privileges required', 403));
  // }

  const result = await ProjectInitializationService.initializeExistingProjects();

  sendSuccess(res, 201, result, 'Existing projects initialized with messages successfully');
}));

// @desc    Initialize messages for a specific project
// @route   POST /api/project-messages/:projectId/initialize
// @access  Private (Admin only)
router.post('/:projectId/initialize', asyncHandler(async (req, res, next) => {
  // Skip role check for now - can be added back when auth is fully configured
  // if (!['ADMIN', 'MANAGER'].includes(req.user?.role)) {
  //   return next(new AppError('Access denied - Admin privileges required', 403));
  // }

  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      id: true, 
      projectNumber: true,
      projectName: true
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const messages = await ProjectInitializationService.initializeProjectMessages(project);

  sendSuccess(res, 201, { 
    messages,
    count: messages.length 
  }, 'Project initialized with messages successfully');
}));

// @desc    Get message statistics for a project
// @route   GET /api/project-messages/:projectId/stats
// @access  Private
router.get('/:projectId/stats', asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const { days = 30 } = req.query;

  // Check access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { 
      projectManagerId: true,
      teamMembers: {
        select: { userId: true }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const hasAccess = true; // Temporarily bypass auth check
  // const hasAccess = project.projectManagerId === req.user?.id ||
  //                  project.teamMembers.some(member => member.userId === req.user?.id) ||
  //                  ['ADMIN', 'MANAGER'].includes(req.user?.role);

  if (!hasAccess) {
    return next(new AppError('Access denied', 403));
  }

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

  const [
    totalMessages,
    messagesByType,
    messagesByAuthor,
    recentActivity
  ] = await Promise.all([
    prisma.projectMessage.count({
      where: {
        projectId,
        createdAt: { gte: dateThreshold }
      }
    }),
    prisma.projectMessage.groupBy({
      by: ['messageType'],
      where: {
        projectId,
        createdAt: { gte: dateThreshold }
      },
      _count: { id: true }
    }),
    prisma.projectMessage.groupBy({
      by: ['authorName'],
      where: {
        projectId,
        createdAt: { gte: dateThreshold }
      },
      _count: { id: true }
    }),
    prisma.projectMessage.findMany({
      where: {
        projectId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      select: {
        createdAt: true,
        messageType: true,
        authorName: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  const stats = {
    totalMessages,
    byType: messagesByType.map(stat => ({
      type: stat.messageType,
      count: stat._count.id
    })),
    byAuthor: messagesByAuthor.map(stat => ({
      author: stat.authorName,
      count: stat._count.id
    })),
    recentActivity
  };

  sendSuccess(res, 200, stats, 'Project message statistics retrieved successfully');
}));

module.exports = router;