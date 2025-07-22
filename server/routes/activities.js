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
const Activity = require('../models/Activity');
const Project = require('../models/Project');

const router = express.Router();

// Validation rules
const activityValidation = [
  body('type')
    .isIn(['project_created', 'project_updated', 'task_created', 'task_completed', 'message_sent', 'document_uploaded', 'milestone_reached', 'meeting_scheduled', 'payment_received', 'change_order', 'inspection_completed', 'material_delivered', 'crew_assigned', 'weather_delay', 'client_feedback', 'issue_reported', 'permit_approved', 'safety_incident', 'quality_check'])
    .withMessage('Invalid activity type'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Description must be between 5 and 500 characters'),
  body('projectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
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

  // Build filter object
  let filter = {};
  
  if (type) filter.type = type;
  if (projectId) filter.projectId = parseInt(projectId);
  if (priority) filter.priority = priority;
  if (userId) filter.userId = userId;
  
  // Date range filter
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  
  // Add search functionality
  if (search) {
    filter.$or = [
      { description: new RegExp(search, 'i') },
      { projectName: new RegExp(search, 'i') },
      { userName: new RegExp(search, 'i') }
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
  const [activities, total] = await Promise.all([
    Activity.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Activity.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, activities, pageNum, limitNum, total, 'Activities retrieved successfully');
}));

// @desc    Get activity by ID
// @route   GET /api/activities/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const activity = await Activity.findOne({ id: parseInt(req.params.id) });

  if (!activity) {
    return next(new AppError('Activity not found', 404));
  }

  sendSuccess(res, 200, { activity }, 'Activity retrieved successfully');
}));

// @desc    Create new activity
// @route   POST /api/activities
// @access  Private
router.post('/', activityValidation, asyncHandler(async (req, res, next) => {
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
  const lastActivity = await Activity.findOne().sort({ id: -1 });
  const newId = lastActivity ? lastActivity.id + 1 : 1;

  // If projectId is provided, get project name
  let projectName = '';
  if (req.body.projectId) {
    const project = await Project.findOne({ id: req.body.projectId });
    if (project) {
      projectName = project.name;
    }
  }

  // Create activity with auto-generated ID
  const activityData = {
    ...req.body,
    id: newId,
    projectName,
    userId: req.user._id,
    userName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
    userAvatar: req.user.avatar || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const activity = await Activity.create(activityData);

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('activity_created', {
    activity,
    timestamp: new Date()
  });

  // If project-related, emit to project room
  if (activity.projectId) {
    io.to(`project_${activity.projectId}`).emit('project_activity', {
      activity,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 201, { activity }, 'Activity created successfully');
}));

// @desc    Update activity
// @route   PUT /api/activities/:id
// @access  Private (Manager and above)
router.put('/:id', managerAndAbove, [
  body('description').optional().trim().isLength({ min: 5, max: 500 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('metadata').optional().isObject()
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

  const activityId = parseInt(req.params.id);
  
  const activity = await Activity.findOneAndUpdate(
    { id: activityId },
    { ...req.body, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!activity) {
    return next(new AppError('Activity not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('activity_updated', {
    activity,
    updatedBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, { activity }, 'Activity updated successfully');
}));

// @desc    Delete activity
// @route   DELETE /api/activities/:id
// @access  Private (Manager and above)
router.delete('/:id', managerAndAbove, asyncHandler(async (req, res, next) => {
  const activityId = parseInt(req.params.id);
  
  const activity = await Activity.findOneAndDelete({ id: activityId });

  if (!activity) {
    return next(new AppError('Activity not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('activity_deleted', {
    activityId,
    deletedBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, null, 'Activity deleted successfully');
}));

// @desc    Get activities by project
// @route   GET /api/activities/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { type, priority, limit = 50 } = req.query;

  // Build filter object
  let filter = { projectId };
  
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  const activities = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  sendSuccess(res, 200, { activities, count: activities.length }, 'Project activities retrieved successfully');
}));

// @desc    Get activities by user
// @route   GET /api/activities/user/:userId
// @access  Private
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const { type, priority, limit = 50 } = req.query;

  // Build filter object
  let filter = { userId };
  
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  const activities = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  sendSuccess(res, 200, { activities, count: activities.length }, 'User activities retrieved successfully');
}));

// @desc    Get recent activities
// @route   GET /api/activities/recent
// @access  Private
router.get('/recent/feed', asyncHandler(async (req, res) => {
  const { limit = 20, hours = 24 } = req.query;

  const timeThreshold = new Date();
  timeThreshold.setHours(timeThreshold.getHours() - parseInt(hours));

  const activities = await Activity.find({
    createdAt: { $gte: timeThreshold }
  })
  .sort({ createdAt: -1 })
  .limit(parseInt(limit))
  .lean();

  sendSuccess(res, 200, { activities, count: activities.length }, 'Recent activities retrieved successfully');
}));

// @desc    Get activity statistics
// @route   GET /api/activities/stats/overview
// @access  Private (Manager and above)
router.get('/stats/overview', managerAndAbove, asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

  const stats = await Activity.aggregate([
    {
      $match: {
        createdAt: { $gte: dateThreshold }
      }
    },
    {
      $group: {
        _id: null,
        totalActivities: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueProjects: { $addToSet: '$projectId' }
      }
    },
    {
      $project: {
        totalActivities: 1,
        uniqueUsersCount: { $size: '$uniqueUsers' },
        uniqueProjectsCount: { $size: '$uniqueProjects' }
      }
    }
  ]);

  const typeStats = await Activity.aggregate([
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

  const priorityStats = await Activity.aggregate([
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

  // Daily activity trend
  const dailyStats = await Activity.aggregate([
    {
      $match: {
        createdAt: { $gte: dateThreshold }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  const overview = stats[0] || {
    totalActivities: 0,
    uniqueUsersCount: 0,
    uniqueProjectsCount: 0
  };

  sendSuccess(res, 200, {
    overview,
    byType: typeStats,
    byPriority: priorityStats,
    dailyTrend: dailyStats
  }, 'Activity statistics retrieved successfully');
}));

// @desc    Search activities
// @route   GET /api/activities/search/query
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
  
  const activities = await Activity.find({
    $or: [
      { description: searchRegex },
      { projectName: searchRegex },
      { userName: searchRegex },
      { type: searchRegex }
    ]
  })
  .limit(parseInt(limit))
  .select('id type description projectName userName createdAt priority')
  .lean();

  sendSuccess(res, 200, { activities, count: activities.length }, 'Search results retrieved successfully');
}));

// @desc    Create activity automatically (helper function for other routes)
// @route   POST /api/activities/auto
// @access  Private (Internal use)
router.post('/auto', asyncHandler(async (req, res) => {
  const { type, description, projectId, priority = 'Medium', metadata = {} } = req.body;

  // Get the highest ID and increment
  const lastActivity = await Activity.findOne().sort({ id: -1 });
  const newId = lastActivity ? lastActivity.id + 1 : 1;

  // If projectId is provided, get project name
  let projectName = '';
  if (projectId) {
    const project = await Project.findOne({ id: projectId });
    if (project) {
      projectName = project.name;
    }
  }

  // Create activity with auto-generated ID
  const activityData = {
    id: newId,
    type,
    description,
    projectId,
    projectName,
    priority,
    metadata,
    userId: req.user._id,
    userName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
    userAvatar: req.user.avatar || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const activity = await Activity.create(activityData);

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('activity_created', {
    activity,
    timestamp: new Date()
  });

  // If project-related, emit to project room
  if (activity.projectId) {
    io.to(`project_${activity.projectId}`).emit('project_activity', {
      activity,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 201, { activity }, 'Activity created automatically');
}));

module.exports = router; 