const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
// Authentication middleware removed - all users can manage tasks
const Task = require('../models/Task');
const Project = require('../models/Project');

const router = express.Router();

// Helper function to update project progress based on task completion
const updateProjectProgress = async (projectId) => {
  try {
    // Get all tasks for the project
    const tasks = await Task.find({ project: projectId });
    
    if (tasks.length === 0) {
      return;
    }
    
    // Calculate progress based on completed tasks
    const completedTasks = tasks.filter(task => task.status === 'Done');
    const progressPercentage = Math.round((completedTasks.length / tasks.length) * 100);
    
    // Update project progress
    await Project.findByIdAndUpdate(projectId, {
      progress: progressPercentage,
      updatedAt: new Date()
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
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
  body('status')
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Status must be pending, in_progress, completed, or cancelled'),
  body('type')
    .isIn(['task', 'alert'])
    .withMessage('Type must be task or alert'),
  body('assignedTo')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Assigned to must be between 2 and 100 characters'),
  body('projectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer'),
  body('dueDate')
    .optional()
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
    type, 
    assignedTo, 
    projectId,
    search, 
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    overdue = false
  } = req.query;

  // Build filter object
  let filter = {};
  
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (type) filter.type = type;
  if (assignedTo) filter.assignedTo = new RegExp(assignedTo, 'i');
  if (projectId) filter.projectId = parseInt(projectId);
  
  // Filter for overdue tasks
  if (overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: 'completed' };
  }
  
  // Add search functionality
  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { assignedTo: new RegExp(search, 'i') },
      { projectName: new RegExp(search, 'i') }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Task.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, tasks, pageNum, limitNum, total, 'Tasks retrieved successfully');
}));

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const task = await Task.findOne({ id: parseInt(req.params.id) });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  sendSuccess(res, 200, { task }, 'Task retrieved successfully');
}));

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
router.post('/', taskValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  // Get the highest ID and increment
  const lastTask = await Task.findOne().sort({ id: -1 });
  const newId = lastTask ? lastTask.id + 1 : 1;

  // If projectId is provided, get project name
  let projectName = '';
  if (req.body.projectId) {
    const project = await Project.findOne({ id: req.body.projectId });
    if (project) {
      projectName = project.name;
    }
  }

  // Create task with auto-generated ID
  const taskData = {
    ...req.body,
    id: newId,
    projectName,
    createdBy: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const task = await Task.create(taskData);

  // Auto-update project progress
  if (task.project) {
    await updateProjectProgress(task.project);
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('task_created', {
    task,
    createdBy: req.user._id,
    timestamp: new Date()
  });

  // If assigned to someone, emit notification
  if (task.assignedTo) {
    io.emit('task_assigned', {
      task,
      assignedTo: task.assignedTo,
      assignedBy: req.user._id,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 201, { task }, 'Task created successfully');
}));

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('assignedTo').optional().trim().isLength({ min: 2, max: 100 }),
  body('dueDate').optional().isISO8601(),
  body('estimatedHours').optional().isFloat({ min: 0.1, max: 1000 }),
  body('actualHours').optional().isFloat({ min: 0.1, max: 1000 })
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

  const taskId = parseInt(req.params.id);
  const oldTask = await Task.findOne({ id: taskId });

  if (!oldTask) {
    return next(new AppError('Task not found', 404));
  }

  // Update project name if projectId changed
  let updateData = { ...req.body, updatedAt: new Date() };
  if (req.body.projectId && req.body.projectId !== oldTask.projectId) {
    const project = await Project.findOne({ id: req.body.projectId });
    if (project) {
      updateData.projectName = project.name;
    }
  }

  const task = await Task.findOneAndUpdate(
    { id: taskId },
    updateData,
    { new: true, runValidators: true }
  );

  // Auto-update project progress if task status changed
  if (req.body.status && task.project) {
    await updateProjectProgress(task.project);
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('task_updated', {
    task,
    updatedBy: req.user._id,
    timestamp: new Date()
  });

  // If assignment changed, emit notification
  if (req.body.assignedTo && req.body.assignedTo !== oldTask.assignedTo) {
    io.emit('task_reassigned', {
      task,
      previousAssignee: oldTask.assignedTo,
      newAssignee: req.body.assignedTo,
      reassignedBy: req.user._id,
      timestamp: new Date()
    });
  }

  // If status changed to completed, emit completion notification
  if (req.body.status === 'completed' && oldTask.status !== 'completed') {
    io.emit('task_completed', {
      task,
      completedBy: req.user._id,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 200, { task }, 'Task updated successfully');
}));

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Manager and above)
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const taskId = parseInt(req.params.id);
  
  const task = await Task.findOneAndDelete({ id: taskId });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Auto-update project progress after task deletion
  if (task.project) {
    await updateProjectProgress(task.project);
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('task_deleted', {
    taskId,
    deletedBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, null, 'Task deleted successfully');
}));

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
// @access  Private
router.patch('/:id/status', [
  body('status')
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Status must be pending, in_progress, completed, or cancelled')
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

  const taskId = parseInt(req.params.id);
  const { status } = req.body;

  const oldTask = await Task.findOne({ id: taskId });

  if (!oldTask) {
    return next(new AppError('Task not found', 404));
  }

  // Update completion date if status is completed
  const updateData = { status, updatedAt: new Date() };
  if (status === 'completed' && oldTask.status !== 'completed') {
    updateData.completedAt = new Date();
  }

  const task = await Task.findOneAndUpdate(
    { id: taskId },
    updateData,
    { new: true }
  );

  // Auto-update project progress
  if (task.project) {
    await updateProjectProgress(task.project);
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('task_status_updated', {
    taskId,
    status,
    updatedBy: req.user._id,
    timestamp: new Date()
  });

  // If completed, emit completion notification
  if (status === 'completed' && oldTask.status !== 'completed') {
    io.emit('task_completed', {
      task,
      completedBy: req.user._id,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 200, { task }, 'Task status updated successfully');
}));

// @desc    Assign task to user
// @route   PATCH /api/tasks/:id/assign
// @access  Private (Manager and above)
router.patch('/:id/assign', [
  body('assignedTo')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Assigned to must be between 2 and 100 characters')
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

  const taskId = parseInt(req.params.id);
  const { assignedTo } = req.body;

  const oldTask = await Task.findOne({ id: taskId });

  if (!oldTask) {
    return next(new AppError('Task not found', 404));
  }

  const task = await Task.findOneAndUpdate(
    { id: taskId },
    { assignedTo, updatedAt: new Date() },
    { new: true }
  );

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('task_assigned', {
    task,
    previousAssignee: oldTask.assignedTo,
    newAssignee: assignedTo,
    assignedBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, { task }, 'Task assigned successfully');
}));

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
router.post('/:id/comments', [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters')
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

  const taskId = parseInt(req.params.id);
  const { content } = req.body;

  const task = await Task.findOne({ id: taskId });

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Get the highest comment ID and increment
  const lastCommentId = task.comments && task.comments.length > 0 
    ? Math.max(...task.comments.map(c => c.id))
    : 0;

  const newComment = {
    id: lastCommentId + 1,
    author: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
    content,
    createdAt: new Date()
  };

  task.comments = task.comments || [];
  task.comments.push(newComment);
  task.updatedAt = new Date();
  await task.save();

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('task_comment_added', {
    taskId,
    comment: newComment,
    timestamp: new Date()
  });

  sendSuccess(res, 201, { comment: newComment }, 'Comment added successfully');
}));

// @desc    Get tasks by project
// @route   GET /api/tasks/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { status, priority, assignedTo } = req.query;

  // Build filter object
  let filter = { projectId };
  
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = new RegExp(assignedTo, 'i');

  const tasks = await Task.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, 200, { tasks, count: tasks.length }, 'Project tasks retrieved successfully');
}));

// @desc    Get tasks assigned to user
// @route   GET /api/tasks/assigned/:assignedTo
// @access  Private
router.get('/assigned/:assignedTo', asyncHandler(async (req, res) => {
  const assignedTo = req.params.assignedTo;
  const { status, priority, overdue } = req.query;

  // Build filter object
  let filter = { assignedTo: new RegExp(assignedTo, 'i') };
  
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  
  // Filter for overdue tasks
  if (overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: 'completed' };
  }

  const tasks = await Task.find(filter)
    .sort({ dueDate: 1, priority: -1 })
    .lean();

  sendSuccess(res, 200, { tasks, count: tasks.length }, 'Assigned tasks retrieved successfully');
}));

// @desc    Get task statistics
// @route   GET /api/tasks/stats/overview
// @access  Private (Manager and above)
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = await Task.aggregate([
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' },
        averageEstimatedHours: { $avg: '$estimatedHours' }
      }
    }
  ]);

  const statusStats = await Task.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const priorityStats = await Task.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  const typeStats = await Task.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get overdue tasks count
  const overdueCount = await Task.countDocuments({
    dueDate: { $lt: new Date() },
    status: { $ne: 'completed' }
  });

  const overview = stats[0] || {
    totalTasks: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0,
    averageEstimatedHours: 0
  };

  sendSuccess(res, 200, {
    overview: { ...overview, overdueCount },
    byStatus: statusStats,
    byPriority: priorityStats,
    byType: typeStats
  }, 'Task statistics retrieved successfully');
}));

// @desc    Search tasks
// @route   GET /api/tasks/search/query
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
  
  const tasks = await Task.find({
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { assignedTo: searchRegex },
      { projectName: searchRegex }
    ]
  })
  .limit(parseInt(limit))
  .select('id title type status priority assignedTo projectName dueDate')
  .lean();

  sendSuccess(res, 200, { tasks, count: tasks.length }, 'Search results retrieved successfully');
}));

module.exports = router; 