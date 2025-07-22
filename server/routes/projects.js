const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
// Authentication middleware removed - all users can manage projects
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const User = require('../models/User');
const ProjectWorkflow = require('../models/ProjectWorkflow');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const ProjectProgressService = require('../services/ProjectProgressService');

const router = express.Router();

// Helper function to enhance projects with calculated progress data
const enhanceProjectsWithProgress = async (projects) => {
  const enhancedProjects = await Promise.all(
    projects.map(async (project) => {
      try {
        // Get project workflow to calculate progress
        const workflow = await ProjectWorkflow.findOne({ project: project._id }).lean();
        
        if (workflow) {
          // Attach workflow to project for progress calculation
          project.workflow = workflow;
          
          // Calculate progress using the service
          const progressData = ProjectProgressService.calculateProjectProgress(project);
          
          // Add calculated progress to project
          project.calculatedProgress = progressData;
          project.progress = progressData.overall; // Update main progress field
        } else {
          // No workflow found, set default progress
          project.calculatedProgress = {
            overall: 0,
            materials: 0,
            labor: 0,
            trades: [],
            totalSteps: 0,
            completedSteps: 0
          };
        }
        
        return project;
      } catch (error) {
        console.error(`Error calculating progress for project ${project._id}:`, error);
        // Return project with default progress on error
        project.calculatedProgress = {
          overall: 0,
          materials: 0,
          labor: 0,
          trades: [],
          totalSteps: 0,
          completedSteps: 0
        };
        return project;
      }
    })
  );
  
  return enhancedProjects;
};

// Validation rules for project creation
const projectValidation = [
  body('projectName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Project name must be between 2 and 200 characters'),
  body('projectType')
    .isIn(['Roof Replacement', 'Kitchen Remodel', 'Bathroom Renovation', 'Siding Installation', 'Window Replacement', 'Flooring', 'Painting', 'Electrical Work', 'Plumbing', 'HVAC', 'Deck Construction', 'Landscaping', 'Other'])
    .withMessage('Invalid project type'),
  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'On Hold'])
    .withMessage('Invalid project status'),
  body('budget')
    .isNumeric()
    .withMessage('Budget must be a number'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
  body('customer')
    .isMongoId()
    .withMessage('Customer must be a valid ID'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
  body('projectManager')
    .optional()
    .isMongoId()
    .withMessage('Project manager must be a valid ID'),
  body('teamMembers')
    .optional()
    .isArray()
    .withMessage('Team members must be an array'),
  body('teamMembers.*')
    .optional()
    .isMongoId()
    .withMessage('Each team member must be a valid ID')
];

// @desc    Get all projects with filtering and pagination
// @route   GET /api/projects
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    status, 
    projectType, 
    priority, 
    customer,
    search, 
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false
  } = req.query;

  // Build filter object
  let filter = {};
  
  if (status) filter.status = status;
  if (projectType) filter.projectType = projectType;
  if (priority) filter.priority = priority;
  if (customer) filter.customer = customer;
  
  // Filter archived projects by default unless specifically requested
  if (includeArchived === 'true') {
    // Include all projects (archived and non-archived)
  } else if (includeArchived === 'only') {
    // Only show archived projects
    filter.archived = true;
  } else {
    // Default: exclude archived projects
    filter.archived = { $ne: true };
  }
  
  // Add search functionality
  if (search) {
    filter.$or = [
      { projectName: new RegExp(search, 'i') },
      { address: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination and population
  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('customer', 'name email phone')
      .populate('teamMembers', 'firstName lastName email role')
      .populate('projectManager', 'firstName lastName email')
      .populate('files', 'name category fileSize')
      .lean(),
    Project.countDocuments(filter)
  ]);

  // Enhance projects with calculated progress data
  const enhancedProjects = await enhanceProjectsWithProgress(projects);

  sendPaginatedResponse(res, enhancedProjects, pageNum, limitNum, total, 'Projects retrieved successfully');
}));

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate('customer', 'name email phone address')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email')
    .populate('files', 'name category fileSize uploadedBy createdAt');

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([project]);

  sendSuccess(res, 200, { project: enhancedProject[0] }, 'Project retrieved successfully');
}));

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
router.post('/', projectValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  // Verify customer exists
  const customer = await Customer.findById(req.body.customer);
  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  // Verify project manager exists if provided
  if (req.body.projectManager) {
    const projectManager = await User.findById(req.body.projectManager);
    if (!projectManager) {
      return next(new AppError('Project manager not found', 404));
    }
  }

  // Verify team members exist if provided
  if (req.body.teamMembers && req.body.teamMembers.length > 0) {
    const teamMembers = await User.find({ _id: { $in: req.body.teamMembers } });
    if (teamMembers.length !== req.body.teamMembers.length) {
      return next(new AppError('One or more team members not found', 404));
    }
  }

  // Create project
  const project = await Project.create(req.body);

  // Populate the created project for response
  await project.populate([
    { path: 'customer', select: 'name email phone' },
    { path: 'teamMembers', select: 'firstName lastName email role' },
    { path: 'projectManager', select: 'firstName lastName email' }
  ]);

  // Automatically create workflow for the new project
  try {
    console.log(`🔧 Creating workflow for new project: ${project.projectName}`);
    
    // Get all users for team assignments
    const users = await User.find({});
    const adminUsers = users.filter(u => u.role === 'admin');
    const managerUsers = users.filter(u => u.role === 'manager');
    const foremanUsers = users.filter(u => u.role === 'foreman');
    const projectManagerUsers = users.filter(u => u.role === 'project_manager');
    
    // Create basic workflow with Lead phase steps
    const workflowData = {
      project: project._id,
      status: 'in_progress',
      overallProgress: 0,
      currentStepIndex: 0,
      workflowStartDate: new Date(),
      steps: [
        {
          stepId: 'lead_1',
          stepName: 'Input Customer Information',
          phase: 'Lead',
          orderInPhase: 1,
          defaultResponsible: 'office',
          isCompleted: false,
          description: 'Enter and verify customer contact information',
          estimatedDuration: 2, // days
          scheduledStartDate: new Date(),
          scheduledEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          subTasks: [
            {
              subTaskId: 'lead_1_1',
              subTaskName: 'Enter customer contact info',
              isCompleted: false
            },
            {
              subTaskId: 'lead_1_2',
              subTaskName: 'Verify customer details',
              isCompleted: false
            }
          ],
          alertTriggers: {
            priority: 'Medium',
            overdueIntervals: [1, 3, 7]
          }
        },
        {
          stepId: 'lead_2',
          stepName: 'Complete Questions to Ask Checklist',
          phase: 'Lead',
          orderInPhase: 2,
          defaultResponsible: 'office',
          isCompleted: false,
          description: 'Complete initial customer questionnaire',
          estimatedDuration: 2, // days
          scheduledStartDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          scheduledEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
          subTasks: [
            {
              subTaskId: 'lead_2_1',
              subTaskName: 'Complete initial questions',
              isCompleted: false
            },
            {
              subTaskId: 'lead_2_2',
              subTaskName: 'Review answers',
              isCompleted: false
            }
          ],
          alertTriggers: {
            priority: 'Medium',
            overdueIntervals: [1, 3, 7]
          }
        },
        {
          stepId: 'lead_3',
          stepName: 'Input Lead Property Information',
          phase: 'Lead',
          orderInPhase: 3,
          defaultResponsible: 'office',
          isCompleted: false,
          description: 'Enter property details and specifications',
          estimatedDuration: 2, // days
          scheduledStartDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          scheduledEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
          subTasks: [
            {
              subTaskId: 'lead_3_1',
              subTaskName: 'Enter property details',
              isCompleted: false
            },
            {
              subTaskId: 'lead_3_2',
              subTaskName: 'Verify property information',
              isCompleted: false
            }
          ],
          alertTriggers: {
            priority: 'Medium',
            overdueIntervals: [1, 3, 7]
          }
        }
      ],
      teamAssignments: {
        office: [...adminUsers.map(u => u._id), ...managerUsers.map(u => u._id)],
        administration: adminUsers.map(u => u._id),
        project_manager: [...projectManagerUsers.map(u => u._id), ...managerUsers.map(u => u._id)],
        field_director: foremanUsers.map(u => u._id),
        roof_supervisor: managerUsers.map(u => u._id)
      }
    };
    
    const workflow = await ProjectWorkflow.create(workflowData);
    console.log(`✅ Workflow created successfully for project: ${project.projectName} (Workflow ID: ${workflow._id})`);
    
    // Trigger immediate alert check for the new project
    try {
      console.log(`🚨 Triggering immediate alert check for new project: ${project.projectName}`);
      const WorkflowAlertService = require('../services/WorkflowAlertService');
      const alertService = new WorkflowAlertService();
      const alerts = await alertService.checkAlertsForProject(project._id);
      console.log(`✅ Generated ${alerts.length} immediate alerts for new project`);
    } catch (alertError) {
      console.error(`❌ Error generating immediate alerts for project ${project.projectName}:`, alertError.message);
      // Don't fail project creation if alert generation fails
    }
  } catch (workflowError) {
    console.error(`❌ Error creating workflow for project ${project.projectName}:`, workflowError.message);
    // Don't fail project creation if workflow creation fails
  }

  // Update customer's associated projects
  await Customer.findByIdAndUpdate(
    req.body.customer,
    { $addToSet: { associatedProjects: project._id } }
  );

  // Emit real-time update
  const io = req.app.get('io');
  if (io) {
    io.emit('project_created', {
      project,
      createdBy: req.user?._id,
      timestamp: new Date()
    });
  }

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([project]);

  sendSuccess(res, 201, { project: enhancedProject[0] }, 'Project created successfully with default workflow');
}));

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
router.put('/:id', [
  body('projectName').optional().trim().isLength({ min: 2, max: 200 }),
  body('projectType').optional().isIn(['Roof Replacement', 'Kitchen Remodel', 'Bathroom Renovation', 'Siding Installation', 'Window Replacement', 'Flooring', 'Painting', 'Electrical Work', 'Plumbing', 'HVAC', 'Deck Construction', 'Landscaping', 'Other']),
  body('status').optional().isIn(['Pending', 'In Progress', 'Completed', 'On Hold']),
  body('budget').optional().isNumeric(),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('customer').optional().isMongoId(),
  body('projectManager').optional().isMongoId(),
  body('teamMembers').optional().isArray(),
  body('teamMembers.*').optional().isMongoId()
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

  // Verify customer exists if being updated
  if (req.body.customer) {
    const customer = await Customer.findById(req.body.customer);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }
  }

  // Verify project manager exists if being updated
  if (req.body.projectManager) {
    const projectManager = await User.findById(req.body.projectManager);
    if (!projectManager) {
      return next(new AppError('Project manager not found', 404));
    }
  }

  // Verify team members exist if being updated
  if (req.body.teamMembers && req.body.teamMembers.length > 0) {
    const teamMembers = await User.find({ _id: { $in: req.body.teamMembers } });
    if (teamMembers.length !== req.body.teamMembers.length) {
      return next(new AppError('One or more team members not found', 404));
    }
  }

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate('customer', 'name email phone')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  if (io) {
    io.to(`project_${req.params.id}`).emit('project_updated', {
      project,
      updatedBy: req.user?._id,
      timestamp: new Date()
    });
  }

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([project]);

  sendSuccess(res, 200, { project: enhancedProject[0] }, 'Project updated successfully');
}));

// @desc    Archive project
// @route   PATCH /api/projects/:id/archive
// @access  Private
router.patch('/:id/archive', asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Toggle archive status
  const isArchived = !project.archived;
  
  const updatedProject = await Project.findByIdAndUpdate(
    req.params.id,
    { 
      archived: isArchived,
      archivedAt: isArchived ? new Date() : null
    },
    { new: true }
  )
    .populate('customer', 'name email phone')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');

  // Emit real-time update
  const io = req.app.get('io');
  if (io) {
    io.emit(isArchived ? 'project_archived' : 'project_unarchived', {
      projectId: req.params.id,
      project: updatedProject,
      archivedBy: req.user?._id,
      timestamp: new Date()
    });
  }

  const action = isArchived ? 'archived' : 'unarchived';
  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([updatedProject]);

  sendSuccess(res, 200, { project: enhancedProject[0] }, `Project ${action} successfully`);
}));

// @desc    Delete project and all associated data
// @route   DELETE /api/projects/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  try {
    console.log(`🗑️ Starting deletion of project: ${project.projectName} (${project._id})`);

    // Delete all associated data in parallel for better performance
    const deletionPromises = [
      // Delete project workflows
      ProjectWorkflow.deleteMany({ project: project._id }),
      
      // Delete notifications related to this project
      Notification.deleteMany({ projectId: project._id }),
      
      // Delete tasks related to this project
      Task.deleteMany({ projectId: project._id }),
      
      // Delete activities related to this project
      Activity.deleteMany({ projectId: project._id })
    ];

    const deletionResults = await Promise.allSettled(deletionPromises);
    
    // Log deletion results
    const [workflowResult, notificationResult, taskResult, activityResult] = deletionResults;
    
    if (workflowResult.status === 'fulfilled') {
      console.log(`✅ Deleted ${workflowResult.value.deletedCount} project workflows`);
    } else {
      console.error('❌ Error deleting project workflows:', workflowResult.reason);
    }
    
    if (notificationResult.status === 'fulfilled') {
      console.log(`✅ Deleted ${notificationResult.value.deletedCount} notifications`);
    } else {
      console.error('❌ Error deleting notifications:', notificationResult.reason);
    }
    
    if (taskResult.status === 'fulfilled') {
      console.log(`✅ Deleted ${taskResult.value.deletedCount} tasks`);
    } else {
      console.error('❌ Error deleting tasks:', taskResult.reason);
    }
    
    if (activityResult.status === 'fulfilled') {
      console.log(`✅ Deleted ${activityResult.value.deletedCount} activities`);
    } else {
      console.error('❌ Error deleting activities:', activityResult.reason);
    }

    // Remove project from customer's associated projects
    await Customer.findByIdAndUpdate(
      project.customer,
      { $pull: { associatedProjects: project._id } }
    );
    console.log(`✅ Removed project from customer's associated projects`);

    // Delete the project itself
    await Project.findByIdAndDelete(req.params.id);
    console.log(`✅ Project deleted successfully`);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('project_deleted', {
        projectId: req.params.id,
        projectName: project.projectName,
        deletedBy: req.user?._id,
        timestamp: new Date()
      });
    }

    sendSuccess(res, 200, null, 'Project and all associated data deleted successfully');
  } catch (error) {
    console.error('❌ Error during project deletion:', error);
    return next(new AppError('Failed to delete project and associated data', 500));
  }
}));

// @desc    Update project progress
// @route   PATCH /api/projects/:id/progress
// @access  Private
router.patch('/:id/progress', [
  body('progress')
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100')
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

  const { progress } = req.body;

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { progress },
    { new: true }
  )
    .populate('customer', 'name email phone')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${req.params.id}`).emit('project_progress_updated', {
    projectId: req.params.id,
    progress,
    updatedBy: req.user._id,
    timestamp: new Date()
  });

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([project]);

  sendSuccess(res, 200, { project: enhancedProject[0] }, 'Project progress updated successfully');
}));

// @desc    Update project status
// @route   PATCH /api/projects/:id/status
// @access  Private
router.patch('/:id/status', [
  body('status')
    .isIn(['Pending', 'In Progress', 'Completed', 'On Hold'])
    .withMessage('Invalid project status')
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

  const { status } = req.body;

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  )
    .populate('customer', 'name email phone')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${req.params.id}`).emit('project_status_updated', {
    projectId: req.params.id,
    status,
    updatedBy: req.user._id,
    timestamp: new Date()
  });

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([project]);

  sendSuccess(res, 200, { project: enhancedProject[0] }, 'Project status updated successfully');
}));

// @desc    Add team member to project
// @route   POST /api/projects/:id/team-members
// @access  Private
router.post('/:id/team-members', [
  body('userId')
    .isMongoId()
    .withMessage('User ID must be valid')
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { userId } = req.body;

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { teamMembers: userId } },
    { new: true }
  )
    .populate('customer', 'name email phone')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${req.params.id}`).emit('team_member_added', {
    projectId: req.params.id,
    userId,
    addedBy: req.user._id,
    timestamp: new Date()
  });

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([project]);

  sendSuccess(res, 200, { project: enhancedProject[0] }, 'Team member added successfully');
}));

// @desc    Remove team member from project
// @route   DELETE /api/projects/:id/team-members/:userId
// @access  Private
router.delete('/:id/team-members/:userId', asyncHandler(async (req, res, next) => {
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $pull: { teamMembers: req.params.userId } },
    { new: true }
  )
    .populate('customer', 'name email phone')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${req.params.id}`).emit('team_member_removed', {
    projectId: req.params.id,
    userId: req.params.userId,
    removedBy: req.user._id,
    timestamp: new Date()
  });

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([project]);

  sendSuccess(res, 200, { project: enhancedProject[0] }, 'Team member removed successfully');
}));

// @desc    Get project statistics
// @route   GET /api/projects/stats/overview
// @access  Private
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = await Project.aggregate([
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        totalBudget: { $sum: '$budget' },
        averageBudget: { $avg: '$budget' },
        averageProgress: { $avg: '$progress' }
      }
    }
  ]);

  const statusStats = await Project.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBudget: { $sum: '$budget' }
      }
    }
  ]);

  const typeStats = await Project.aggregate([
    {
      $group: {
        _id: '$projectType',
        count: { $sum: 1 },
        totalBudget: { $sum: '$budget' }
      }
    }
  ]);

  const priorityStats = await Project.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  const overview = stats[0] || {
    totalProjects: 0,
    totalBudget: 0,
    averageBudget: 0,
    averageProgress: 0
  };

  sendSuccess(res, 200, {
    overview,
    byStatus: statusStats,
    byType: typeStats,
    byPriority: priorityStats
  }, 'Project statistics retrieved successfully');
}));

// @desc    Search projects
// @route   GET /api/projects/search
// @access  Private
router.get('/search', asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  const searchRegex = new RegExp(q.trim(), 'i');
  
  const projects = await Project.find({
    $or: [
      { projectName: searchRegex },
      { address: searchRegex },
      { description: searchRegex }
    ]
  })
    .limit(parseInt(limit))
    .populate('customer', 'name email phone')
    .populate('projectManager', 'firstName lastName email')
    .select('projectName projectType status address customer projectManager progress priority')
    .lean();

  // Enhance projects with calculated progress data
  const enhancedProjects = await enhanceProjectsWithProgress(projects);

  sendSuccess(res, 200, { projects: enhancedProjects }, 'Search results retrieved successfully');
}));

// @desc    Get project progress with workflow data
// @route   GET /api/projects/:id/progress
// @access  Private
router.get('/:id/progress', asyncHandler(async (req, res, next) => {
  const projectId = req.params.id;
  
  // Get project
  const project = await Project.findById(projectId)
    .populate('customer', 'name email phone')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Get workflow
  const workflow = await ProjectWorkflow.findOne({ project: projectId }).lean();

  let progressData = {
    project: project,
    overallProgress: project.progress || 0,
    workflowProgress: 0,
    currentPhase: 'Lead',
    totalSteps: 0,
    completedSteps: 0,
    trades: [
      {
        name: project.projectType || 'Main Trade',
        laborProgress: project.progress || 0,
        materialsDelivered: project.progress >= 50, // Simple logic: materials delivered when 50% complete
        workflowSteps: []
      }
    ]
  };

  if (workflow && workflow.steps) {
    const completedSteps = workflow.steps.filter(step => step.isCompleted).length;
    const totalSteps = workflow.steps.length;
    
    progressData.workflowProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    progressData.totalSteps = totalSteps;
    progressData.completedSteps = completedSteps;
    
    // Update overall progress to match workflow
    progressData.overallProgress = progressData.workflowProgress;
    
    // Determine current phase
    const activeStep = workflow.steps.find(step => !step.isCompleted);
    if (activeStep) {
      progressData.currentPhase = activeStep.phase;
    } else if (completedSteps === totalSteps) {
      progressData.currentPhase = 'Completion';
    }
    
    // Update the main trade with workflow data
    progressData.trades[0].laborProgress = progressData.workflowProgress;
    progressData.trades[0].workflowSteps = workflow.steps.map(step => ({
      stepId: step.stepId,
      stepName: step.stepName,
      phase: step.phase,
      isCompleted: step.isCompleted,
      completedAt: step.completedAt,
      scheduledEndDate: step.scheduledEndDate
    }));
  }

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([progressData]);

  sendSuccess(res, 200, enhancedProject[0], 'Project progress retrieved successfully');
}));

module.exports = router; 