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
const activityValidation = [
  body('type')
    .isIn(['PROJECT_CREATED', 'PROJECT_UPDATED', 'TASK_CREATED', 'TASK_COMPLETED', 'MESSAGE_SENT', 'DOCUMENT_UPLOADED', 'MILESTONE_REACHED', 'MEETING_SCHEDULED', 'PAYMENT_RECEIVED', 'CHANGE_ORDER', 'INSPECTION_COMPLETED', 'MATERIAL_DELIVERED', 'CREW_ASSIGNED', 'WEATHER_DELAY', 'CLIENT_FEEDBACK', 'ISSUE_REPORTED', 'PERMIT_APPROVED', 'SAFETY_INCIDENT', 'QUALITY_CHECK'])
    .withMessage('Invalid activity type'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Description must be between 5 and 500 characters'),
  body('projectId')
    .optional()
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Priority must be LOW, MEDIUM, or HIGH'),
  body('metadata')
    .optional()
    .isJSON()
    .withMessage('Metadata must be valid JSON')
];

// @desc    Get all activities with filtering and pagination
// @route   GET /api/activities
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    type, 
    projectId, 
    priority,
    userId,
    search, 
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    dateFrom,
    dateTo
  } = req.query;

  // Build where object
  let where = {};
  
  if (type) {
    where.type = type.toUpperCase();
  }
  
  if (projectId) {
    where.projectId = projectId;
  }
  
  if (priority) {
    where.priority = priority.toUpperCase();
  }
  
  if (userId) {
    where.userId = userId;
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }
  
  // Add search functionality
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { project: { projectName: { contains: search, mode: 'insensitive' } } },
      { user: { 
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      }}
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build sort object
  let orderBy = {};
  orderBy[sortBy] = sortOrder.toLowerCase();

  try {
    // Execute query with pagination
    const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            status: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy,
      skip,
      take
    }),
    prisma.activity.count({ where })
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / take);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      },
      message: 'Activities retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw new AppError('Failed to fetch activities', 500);
  }
}));

// @desc    Get single activity
// @route   GET /api/activities/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const activity = await prisma.activity.findUnique({
    where: { id: req.params.id },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true,
          progress: true
        }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          role: true
        }
      }
    }
  });

  if (!activity) {
    return next(new AppError('Activity not found', 404));
  }

  res.json({
    success: true,
    data: { activity },
    message: 'Activity retrieved successfully'
  });
}));

// @desc    Create new activity
// @route   POST /api/activities
// @access  Private
router.post('/', activityValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const {
    type,
    description,
    projectId,
    priority,
    metadata,
    userId
  } = req.body;

  // Verify project exists if provided
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return next(new AppError('Project not found', 404));
    }
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Create activity
  const activity = await prisma.activity.create({
    data: {
      type: type.toUpperCase(),
      description,
      projectId,
      priority: priority ? priority.toUpperCase() : 'MEDIUM',
      metadata: metadata ? JSON.parse(metadata) : null,
      userId
    },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    data: { activity },
    message: 'Activity created successfully'
  });
}));

// @desc    Update activity
// @route   PUT /api/activities/:id
// @access  Private
router.put('/:id', activityValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const activityId = req.params.id;
  const {
    type,
    description,
    projectId,
    priority,
    metadata
  } = req.body;

  // Check if activity exists
  const existingActivity = await prisma.activity.findUnique({
    where: { id: activityId }
  });

  if (!existingActivity) {
    return next(new AppError('Activity not found', 404));
  }

  // Verify project exists if provided
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return next(new AppError('Project not found', 404));
    }
  }

  // Prepare update data
  const updateData = {
    type: type ? type.toUpperCase() : undefined,
    description,
    projectId,
    priority: priority ? priority.toUpperCase() : undefined,
    metadata: metadata ? JSON.parse(metadata) : undefined
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  // Update activity
  const updatedActivity = await prisma.activity.update({
    where: { id: activityId },
    data: updateData,
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: { activity: updatedActivity },
    message: 'Activity updated successfully'
  });
}));

// @desc    Delete activity
// @route   DELETE /api/activities/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const activity = await prisma.activity.findUnique({
    where: { id: req.params.id }
  });

  if (!activity) {
    return next(new AppError('Activity not found', 404));
  }

  await prisma.activity.delete({
    where: { id: req.params.id }
  });

  res.json({
    success: true,
    message: 'Activity deleted successfully'
  });
}));

// @desc    Get activities by project
// @route   GET /api/activities/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const { type, priority, limit = 50 } = req.query;

  let where = { projectId };

  if (type) {
    where.type = type.toUpperCase();
  }

  if (priority) {
    where.priority = priority.toUpperCase();
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit)
  });

  res.json({
    success: true,
    data: { activities },
    message: 'Project activities retrieved successfully'
  });
}));

// @desc    Get activities by user
// @route   GET /api/activities/user/:userId
// @access  Private
router.get('/user/:userId', asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { type, projectId, limit = 50 } = req.query;

  let where = { userId };

  if (type) {
    where.type = type.toUpperCase();
  }

  if (projectId) {
    where.projectId = projectId;
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit)
  });

  res.json({
    success: true,
    data: { activities },
    message: 'User activities retrieved successfully'
  });
}));

// @desc    Get activity statistics
// @route   GET /api/activities/stats
// @access  Private
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const { projectId, userId, days = 30 } = req.query;

  let where = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (userId) {
    where.userId = userId;
  }

  if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    where.createdAt = { gte: startDate };
  }

  const [
    totalActivities,
    activitiesByType,
    activitiesByUser,
    recentActivities
  ] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.groupBy({
      by: ['type'],
      where,
      _count: { type: true }
    }),
    prisma.activity.groupBy({
      by: ['userId'],
      where,
      _count: { userId: true }
    }),
    prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  res.json({
    success: true,
    data: {
      totalActivities,
      activitiesByType,
      activitiesByUser,
      recentActivities
    }
  });
}));

module.exports = router; 