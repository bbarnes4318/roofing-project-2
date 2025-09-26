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
// Authentication middleware removed - all users can manage tasks

const prisma = new PrismaClient();
const router = express.Router();

// Helper function to update project progress based on task completion
const updateProjectProgress = async (projectId) => {
  try {
    // Get all tasks for the project
    const tasks = await prisma.task.findMany({ where: { projectId } });
    
    if (tasks.length === 0) {
      return;
    }
    
    // Calculate progress based on completed tasks
    const completedTasks = tasks.filter(task => task.status === 'DONE');
    const progressPercentage = Math.round((completedTasks.length / tasks.length) * 100);
    
    // Update project progress
    await prisma.project.update({
      where: { id: projectId },
      data: {
        progress: progressPercentage,
        updatedAt: new Date()
      }
    });
    
    console.log(`📊 Project ${projectId} progress updated to ${progressPercentage}%`);
  } catch (error) {
    console.error('Error updating project progress:', error);
  }
};

// Validation rules
const taskValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Task title must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Task description must be less than 2000 characters'),
  body('priority')
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Priority must be LOW, MEDIUM, or HIGH'),
  body('status')
    .isIn(['TO_DO', 'IN_PROGRESS', 'DONE'])
    .withMessage('Status must be TO_DO, IN_PROGRESS, or DONE'),
  body('category')
    .optional()
    .isIn(['PLANNING', 'DESIGN', 'CONSTRUCTION', 'INSPECTION', 'DOCUMENTATION', 'COMMUNICATION', 'OTHER'])
    .withMessage('Invalid category'),
  body('assignedToId')
    .optional()
    .isUUID()
    .withMessage('Assigned to ID must be a valid UUID'),
  body('projectId')
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Estimated hours must be between 0.1 and 1000')
];

// @desc    Get all tasks with filtering and pagination
// @route   GET /api/tasks
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    status, 
    priority, 
    category, 
    assignedToId, 
    projectId,
    search, 
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    overdue = false
  } = req.query;

  // Build filter object
  let where = {};

  if (status) {
    where.status = status.toUpperCase();
  }

  if (priority) {
    where.priority = priority.toUpperCase();
  }

  if (category) {
    where.category = category.toUpperCase();
  }

  if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (projectId) {
    where.projectId = projectId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (overdue === 'true') {
    where.dueDate = { lt: new Date() };
    where.status = { not: 'DONE' };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build sort object
  let orderBy = {};
  orderBy[sortBy] = sortOrder.toLowerCase();

  // Get tasks with relations including comments
  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    },
    orderBy,
    skip,
    take
  });

  // Get total count
  const total = await prisma.task.count({ where });

  // Calculate pagination info
  const totalPages = Math.ceil(total / take);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
  });
}));

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          phone: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true,
          progress: true
        }
      },
      dependencies: {
        include: {
          parentTask: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      },
      dependents: {
        include: {
          dependentTask: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  res.json({
    success: true,
    data: { task }
  });
}));

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
router.post('/', taskValidation, asyncHandler(async (req, res, next) => {
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
    description,
    dueDate,
    priority,
    status,
    category,
    estimatedHours,
    tags,
    notes,
    projectId,
    assignedToId,
    createdById
  } = req.body;

  // Verify project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Verify assigned user exists if provided
  if (assignedToId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId }
    });

    if (!assignedUser) {
      return next(new AppError('Assigned user not found', 404));
    }
  }

  // Create task
  const task = await prisma.task.create({
    data: {
      title,
      description,
      dueDate: new Date(dueDate),
      priority: priority.toUpperCase(),
      status: status.toUpperCase(),
      category: category ? category.toUpperCase() : 'OTHER',
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      tags: tags || [],
      notes,
      projectId,
      assignedToId: assignedToId || createdById, // Default to creator if no assignee
      createdById
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: { task }
  });
}));

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', taskValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const taskId = req.params.id;
  const {
    title,
    description,
    dueDate,
    priority,
    status,
    category,
    estimatedHours,
    actualHours,
    tags,
    notes,
    assignedToId
  } = req.body;

  // Check if task exists
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!existingTask) {
    return next(new AppError('Task not found', 404));
  }

  // Verify assigned user exists if provided
  if (assignedToId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId }
    });

    if (!assignedUser) {
      return next(new AppError('Assigned user not found', 404));
    }
  }

  // Prepare update data
  const updateData = {
    title,
    description,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    priority: priority ? priority.toUpperCase() : undefined,
    status: status ? status.toUpperCase() : undefined,
    category: category ? category.toUpperCase() : undefined,
    estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
    actualHours: actualHours ? parseFloat(actualHours) : undefined,
    tags: tags || undefined,
    notes,
    assignedToId,
    completedAt: status === 'DONE' ? new Date() : null
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  // Update task
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      }
    }
  });

  // Update project progress if status changed
  if (status && status !== existingTask.status) {
    await updateProjectProgress(updatedTask.projectId);
  }

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: { task: updatedTask }
  });
}));

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      project: {
        select: { id: true }
      }
    }
  });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  await prisma.task.delete({
    where: { id: req.params.id }
  });

  // Update project progress
  await updateProjectProgress(task.project.id);

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
}));

// @desc    Get tasks by project
// @route   GET /api/tasks/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const { status, priority, assignedToId } = req.query;

  let where = { projectId };

  if (status) {
    where.status = status.toUpperCase();
  }

  if (priority) {
    where.priority = priority.toUpperCase();
  }

  if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { tasks }
  });
}));

// @desc    Get tasks by user
// @route   GET /api/tasks/user/:userId
// @access  Private
router.get('/user/:userId', asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { status, priority, overdue } = req.query;

  let where = { assignedToId: userId };

  if (status) {
    where.status = status.toUpperCase();
  }

  if (priority) {
    where.priority = priority.toUpperCase();
  }

  if (overdue === 'true') {
    where.dueDate = { lt: new Date() };
    where.status = { not: 'DONE' };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  res.json({
    success: true,
    data: { tasks }
  });
}));

// @desc    Get tasks by project number (for AI assistant)
// @route   GET /api/tasks/project-number/:projectNumber
// @access  Private  
router.get('/project-number/:projectNumber', asyncHandler(async (req, res, next) => {
  const { projectNumber } = req.params;
  const { status, priority, assignedToId } = req.query;

  // First find the project by project number
  const project = await prisma.project.findFirst({
    where: { projectNumber: projectNumber }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  let where = { projectId: project.id };

  if (status) {
    where.status = status.toUpperCase();
  }

  if (priority) {
    where.priority = priority.toUpperCase();
  }

  if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true,
          progress: true
        }
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  res.json({
    success: true,
    data: { 
      project: {
        id: project.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        status: project.status,
        progress: project.progress
      },
      tasks 
    },
    message: `Found ${tasks.length} tasks for project #${projectNumber}`
  });
}));

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const { projectId, assignedToId } = req.query;

  let where = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  const [
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    tasksByPriority,
    tasksByCategory
  ] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: 'DONE' } }),
    prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.task.count({ 
      where: { 
        ...where, 
        dueDate: { lt: new Date() },
        status: { not: 'DONE' }
      } 
    }),
    prisma.task.groupBy({
      by: ['priority'],
      where,
      _count: { priority: true }
    }),
    prisma.task.groupBy({
      by: ['category'],
      where,
      _count: { category: true }
    })
  ]);

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  res.json({
    success: true,
    data: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate,
      tasksByPriority,
      tasksByCategory
    }
  });
}));

// @route   POST /api/tasks/comments
// @desc    Create new task comment
// @access  Private
router.post('/comments', [
  body('taskId')
    .notEmpty()
    .withMessage('Task ID is required'),
  body('comment')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
], asyncHandler(async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { taskId, comment, userId } = req.body;

  // Verify task exists
  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Create the comment
  const taskComment = await prisma.taskComment.create({
    data: {
      content: comment,
      taskId,
      userId: userId || 'default-user-id' // Fallback if no userId provided
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    data: taskComment,
    message: 'Comment added successfully'
  });
}));

// @route   GET /api/tasks/:taskId/comments
// @desc    Get all comments for a specific task
// @access  Private
router.get('/:taskId/comments', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Verify task exists
  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [comments, totalComments] = await Promise.all([
    prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.taskComment.count({ where: { taskId } })
  ]);

  sendPaginatedResponse(
    res,
    comments,
    totalComments,
    parseInt(page),
    parseInt(limit),
    'Comments retrieved successfully'
  );
}));

module.exports = router; 
