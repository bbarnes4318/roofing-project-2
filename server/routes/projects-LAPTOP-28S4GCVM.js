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
// Authentication middleware removed - all users can manage projects
const ProjectProgressService = require('../services/ProjectProgressService');
const WorkflowProgressService = require('../services/WorkflowProgressService');

const prisma = new PrismaClient();

const router = express.Router();

// Helper function to enhance projects with calculated progress data
const enhanceProjectsWithProgress = async (projects) => {
  const enhancedProjects = await Promise.all(
    projects.map(async (project) => {
      try {
        // Get project workflow to calculate progress
        const workflow = await prisma.projectWorkflow.findUnique({
          where: { projectId: project.id },
          include: {
            steps: {
              include: {
                subTasks: true
              }
            }
          }
        });
        
        if (workflow) {
          // Attach workflow to project for progress calculation
          project.workflow = workflow;
          
          // Calculate progress using the new weighted workflow system
          const progressData = WorkflowProgressService.calculateProjectProgress(project);
          
          // Add calculated progress to project
          project.calculatedProgress = progressData;
          project.progress = progressData.overall; // Update main progress field
          project.currentPhase = WorkflowProgressService.getCurrentPhase(project);
          project.nextSteps = WorkflowProgressService.getNextSteps(project);
        } else {
          // No workflow found, set default progress
          project.calculatedProgress = {
            overall: 0,
            phaseBreakdown: {},
            stepBreakdown: { total: 0, completed: 0 },
            totalWeight: 0,
            completedWeight: 0
          };
          project.currentPhase = 'LEAD';
          project.nextSteps = [];
        }
        
        return project;
      } catch (error) {
        console.error(`Error calculating progress for project ${project.id}:`, error);
        // Return project with default progress on error
        project.calculatedProgress = {
          overall: 0,
          phaseBreakdown: {},
          stepBreakdown: { total: 0, completed: 0 },
          totalWeight: 0,
          completedWeight: 0
        };
        project.currentPhase = 'LEAD';
        project.nextSteps = [];
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
    .notEmpty()
    .withMessage('Customer must be provided'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Priority must be LOW, MEDIUM, or HIGH'),
  body('projectManager')
    .optional()
    .notEmpty()
    .withMessage('Project manager must be a valid ID'),
  body('teamMembers')
    .optional()
    .isArray()
    .withMessage('Team members must be an array'),
  body('teamMembers.*')
    .optional()
    .notEmpty()
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
  let where = {};
  
  if (status) where.status = status;
  if (projectType) where.projectType = projectType;
  if (priority) where.priority = priority;
  if (customer) where.customerId = customer;
  
  // Filter archived projects by default unless specifically requested
  if (includeArchived === 'true') {
    // Include all projects (archived and non-archived)
  } else if (includeArchived === 'only') {
    // Only show archived projects
    where.archived = true;
  } else {
    // Default: exclude archived projects
    where.archived = false;
  }
  
  // Add search functionality
  if (search) {
    where.OR = [
      { projectName: { contains: search, mode: 'insensitive' } },
      { projectName: { contains: search, mode: 'insensitive' } }, // This is the address field
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const orderBy = {};
  orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';

  // Execute query with pagination and relations
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        customer: {
          select: {
            primaryName: true,
            primaryEmail: true,
            primaryPhone: true
          }
        },
        projectManager: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        },
        documents: {
          select: {
            fileName: true,
            fileType: true,
            fileSize: true
          }
        },
        workflow: {
          include: {
            steps: {
              orderBy: {
                stepId: 'asc'
              }
            }
          }
        }
      }
    }),
    prisma.project.count({ where })
  ]);

  // Enhance projects with calculated progress data
  const enhancedProjects = await enhanceProjectsWithProgress(projects);

  sendPaginatedResponse(res, enhancedProjects, pageNum, limitNum, total, 'Projects retrieved successfully');
}));

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true,
          address: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      },
      documents: {
        select: {
          fileName: true,
          fileType: true,
          fileSize: true,
          uploadedBy: true,
          createdAt: true
        }
      },
      workflow: {
        include: {
          steps: {
            orderBy: {
              stepId: 'asc'
            }
          }
        }
      }
    }
  });

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
  const customer = await prisma.customer.findUnique({
    where: { id: req.body.customer }
  });
  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  // Verify project manager exists if provided
  if (req.body.projectManager) {
    const projectManager = await prisma.user.findUnique({
      where: { id: req.body.projectManager }
    });
    if (!projectManager) {
      return next(new AppError('Project manager not found', 404));
    }
  }

  // Verify team members exist if provided
  if (req.body.teamMembers && req.body.teamMembers.length > 0) {
    const teamMembers = await prisma.user.findMany({
      where: { id: { in: req.body.teamMembers } }
    });
    if (teamMembers.length !== req.body.teamMembers.length) {
      return next(new AppError('One or more team members not found', 404));
    }
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      projectNumber: Math.floor(10000 + Math.random() * 90000),
      projectName: req.body.projectName,
      projectType: req.body.projectType,
      status: req.body.status || 'PENDING',
      budget: parseFloat(req.body.budget),
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      description: req.body.description,
      priority: req.body.priority || 'MEDIUM',
      customerId: req.body.customer,
      projectManagerId: req.body.projectManager,
      notes: req.body.notes
    },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  // Automatically create workflow for the new project
  try {
    console.log(`🔧 Creating workflow for new project: ${project.projectName}`);
    
    // Get all users for team assignments
    const users = await prisma.user.findMany();
    const adminUsers = users.filter(u => u.role === 'ADMIN');
    const managerUsers = users.filter(u => u.role === 'MANAGER');
    const foremanUsers = users.filter(u => u.role === 'FOREMAN');
    const projectManagerUsers = users.filter(u => u.role === 'PROJECT_MANAGER');
    
    // Create basic workflow with Lead phase steps
    const workflow = await prisma.projectWorkflow.create({
      data: {
        projectId: project.id,
        status: 'IN_PROGRESS',
        overallProgress: 0,
        currentStepIndex: 0,
        workflowStartDate: new Date(),
        teamAssignments: {
          office: [...adminUsers.map(u => u.id), ...managerUsers.map(u => u.id)],
          administration: adminUsers.map(u => u.id),
          project_manager: [...projectManagerUsers.map(u => u.id), ...managerUsers.map(u => u.id)],
          field_director: foremanUsers.map(u => u.id),
          roof_supervisor: managerUsers.map(u => u.id)
        }
      }
    });
    
    console.log(`✅ Workflow created successfully for project: ${project.projectName} (Workflow ID: ${workflow.id})`);
    
    // Create workflow steps
    const steps = [
      {
        stepId: 'lead_1',
        stepName: 'Input Customer Information',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        isCompleted: false,
        description: 'Enter and verify customer contact information',
        estimatedDuration: 2,
        scheduledStartDate: new Date(),
        scheduledEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        alertPriority: 'MEDIUM',
        alertDays: 1,
        overdueIntervals: [1, 3, 7],
        dependencies: [],
        workflowId: workflow.id
      },
      {
        stepId: 'lead_2',
        stepName: 'Complete Questions to Ask Checklist',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        isCompleted: false,
        description: 'Complete initial customer questionnaire',
        estimatedDuration: 2,
        scheduledStartDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        scheduledEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        alertPriority: 'MEDIUM',
        alertDays: 1,
        overdueIntervals: [1, 3, 7],
        dependencies: ['lead_1'],
        workflowId: workflow.id
      },
      {
        stepId: 'lead_3',
        stepName: 'Input Lead Property Information',
        phase: 'LEAD',
        defaultResponsible: 'OFFICE',
        isCompleted: false,
        description: 'Enter property details and specifications',
        estimatedDuration: 2,
        scheduledStartDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        scheduledEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        alertPriority: 'MEDIUM',
        alertDays: 1,
        overdueIntervals: [1, 3, 7],
        dependencies: ['lead_2'],
        workflowId: workflow.id
      }
    ];
    
    for (const stepData of steps) {
      const step = await prisma.workflowStep.create({
        data: stepData
      });
      
      // Create subtasks for each step
      const subtasks = [
        {
          subTaskId: `${stepData.stepId}_1`,
          subTaskName: `Complete ${stepData.stepName}`,
          isCompleted: false,
          stepId: step.id
        },
        {
          subTaskId: `${stepData.stepId}_2`,
          subTaskName: `Verify ${stepData.stepName}`,
          isCompleted: false,
          stepId: step.id
        }
      ];
      
      for (const subtaskData of subtasks) {
        await prisma.workflowSubTask.create({
          data: subtaskData
        });
      }
    }
    
  } catch (workflowError) {
    console.error(`❌ Error creating workflow for project ${project.projectName}:`, workflowError.message);
    // Don't fail project creation if workflow creation fails
  }

  // Emit real-time update
  const io = req.app.get('io');
  if (io) {
    io.emit('project_created', {
      project,
      createdBy: req.user?.id,
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
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']),
  body('budget').optional().isNumeric(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('customer').optional().notEmpty(),
  body('projectManager').optional().notEmpty(),
  body('teamMembers').optional().isArray(),
  body('teamMembers.*').optional().notEmpty()
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
    const customer = await prisma.customer.findUnique({
      where: { id: req.body.customer }
    });
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }
  }

  // Verify project manager exists if being updated
  if (req.body.projectManager) {
    const projectManager = await prisma.user.findUnique({
      where: { id: req.body.projectManager }
    });
    if (!projectManager) {
      return next(new AppError('Project manager not found', 404));
    }
  }

  // Verify team members exist if being updated
  if (req.body.teamMembers && req.body.teamMembers.length > 0) {
    const teamMembers = await prisma.user.findMany({
      where: { id: { in: req.body.teamMembers } }
    });
    if (teamMembers.length !== req.body.teamMembers.length) {
      return next(new AppError('One or more team members not found', 404));
    }
  }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      projectName: req.body.projectName,
      projectType: req.body.projectType,
      status: req.body.status,
      budget: req.body.budget ? parseFloat(req.body.budget) : undefined,
      priority: req.body.priority,
      progress: req.body.progress ? parseInt(req.body.progress) : undefined,
      customerId: req.body.customer,
      projectManagerId: req.body.projectManager,
      description: req.body.description,
      notes: req.body.notes
    },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  if (io) {
    io.to(`project_${req.params.id}`).emit('project_updated', {
      project,
      updatedBy: req.user?.id,
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
  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Toggle archive status
  const isArchived = !project.archived;
  
  const updatedProject = await prisma.project.update({
    where: { id: req.params.id },
    data: { 
      archived: isArchived,
      archivedAt: isArchived ? new Date() : null
    },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });

  // Emit real-time update
  const io = req.app.get('io');
  if (io) {
    io.emit(isArchived ? 'project_archived' : 'project_unarchived', {
      projectId: req.params.id,
      project: updatedProject,
      archivedBy: req.user?.id,
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
  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  try {
    console.log(`🗑️ Starting deletion of project: ${project.projectName} (${project.id})`);

    // Delete all associated data in parallel for better performance
    const deletionPromises = [
      // Delete project workflows
      prisma.projectWorkflow.deleteMany({ where: { projectId: project.id } }),
      
      // Delete notifications related to this project
      prisma.notification.deleteMany({ where: { projectId: project.id } }),
      
      // Delete tasks related to this project
      prisma.task.deleteMany({ where: { projectId: project.id } }),
      
      // Delete activities related to this project
      prisma.activity.deleteMany({ where: { projectId: project.id } })
    ];

    const deletionResults = await Promise.allSettled(deletionPromises);
    
    // Log deletion results
    const [workflowResult, notificationResult, taskResult, activityResult] = deletionResults;
    
    if (workflowResult.status === 'fulfilled') {
      console.log(`✅ Deleted ${workflowResult.value.count} project workflows`);
    } else {
      console.error('❌ Error deleting project workflows:', workflowResult.reason);
    }
    
    if (notificationResult.status === 'fulfilled') {
      console.log(`✅ Deleted ${notificationResult.value.count} notifications`);
    } else {
      console.error('❌ Error deleting notifications:', notificationResult.reason);
    }
    
    if (taskResult.status === 'fulfilled') {
      console.log(`✅ Deleted ${taskResult.value.count} tasks`);
    } else {
      console.error('❌ Error deleting tasks:', taskResult.reason);
    }
    
    if (activityResult.status === 'fulfilled') {
      console.log(`✅ Deleted ${activityResult.value.count} activities`);
    } else {
      console.error('❌ Error deleting activities:', activityResult.reason);
    }

    // Delete the project itself
    await prisma.project.delete({
      where: { id: req.params.id }
    });
    console.log(`✅ Project deleted successfully`);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('project_deleted', {
        projectId: req.params.id,
        projectName: project.projectName,
        deletedBy: req.user?.id,
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

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { progress },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${req.params.id}`).emit('project_progress_updated', {
    projectId: req.params.id,
    progress,
    updatedBy: req.user.id,
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
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'])
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

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { status },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${req.params.id}`).emit('project_status_updated', {
    projectId: req.params.id,
    status,
    updatedBy: req.user.id,
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
    .notEmpty()
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
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Add team member
  await prisma.projectTeamMember.create({
    data: {
      projectId: req.params.id,
      userId: userId,
      role: user.role
    }
  });

  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${req.params.id}`).emit('team_member_added', {
    projectId: req.params.id,
    userId,
    addedBy: req.user.id,
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
  // Remove team member
  await prisma.projectTeamMember.deleteMany({
    where: {
      projectId: req.params.id,
      userId: req.params.userId
    }
  });

  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${req.params.id}`).emit('team_member_removed', {
    projectId: req.params.id,
    userId: req.params.userId,
    removedBy: req.user.id,
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
  const [totalProjects, totalBudget, averageBudget, averageProgress] = await Promise.all([
    prisma.project.count(),
    prisma.project.aggregate({
      _sum: { budget: true }
    }),
    prisma.project.aggregate({
      _avg: { budget: true }
    }),
    prisma.project.aggregate({
      _avg: { progress: true }
    })
  ]);

  const statusStats = await prisma.project.groupBy({
    by: ['status'],
    _count: { status: true },
    _sum: { budget: true }
  });

  const typeStats = await prisma.project.groupBy({
    by: ['projectType'],
    _count: { projectType: true },
    _sum: { budget: true }
  });

  const priorityStats = await prisma.project.groupBy({
    by: ['priority'],
    _count: { priority: true }
  });

  const overview = {
    totalProjects,
    totalBudget: totalBudget._sum.budget || 0,
    averageBudget: averageBudget._avg.budget || 0,
    averageProgress: averageProgress._avg.progress || 0
  };

  sendSuccess(res, 200, {
    overview,
    byStatus: statusStats.map(stat => ({
      _id: stat.status,
      count: stat._count.status,
      totalBudget: stat._sum.budget
    })),
    byType: typeStats.map(stat => ({
      _id: stat.projectType,
      count: stat._count.projectType,
      totalBudget: stat._sum.budget
    })),
    byPriority: priorityStats.map(stat => ({
      _id: stat.priority,
      count: stat._count.priority
    }))
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

  const searchTerm = q.trim();
  
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { projectName: { contains: searchTerm, mode: 'insensitive' } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ]
    },
    take: parseInt(limit),
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    select: {
      projectName: true,
      projectType: true,
      status: true,
      address: true,
      customer: true,
      projectManager: true,
      progress: true,
      priority: true
    }
  });

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
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      customer: {
        select: {
          primaryName: true,
          primaryEmail: true,
          primaryPhone: true
        }
      },
      projectManager: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      teamMembers: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Get workflow with complete step data
  const workflow = await prisma.projectWorkflow.findUnique({
    where: { projectId: projectId },
    include: {
      steps: {
        include: {
          subTasks: true
        }
      }
    }
  });

  // Create project object with workflow for progress calculation
  const projectWithWorkflow = {
    ...project,
    workflow: workflow
  };

  // Calculate progress using the new weighted workflow system
  const progressData = WorkflowProgressService.calculateProjectProgress(projectWithWorkflow);
  const currentPhase = WorkflowProgressService.getCurrentPhase(projectWithWorkflow);
  const nextSteps = WorkflowProgressService.getNextSteps(projectWithWorkflow);

  let enhancedProgressData = {
    project: project,
    overallProgress: progressData.overall,
    workflowProgress: progressData.overall,
    currentPhase: currentPhase,
    totalSteps: progressData.stepBreakdown.total,
    completedSteps: progressData.stepBreakdown.completed,
    phaseBreakdown: progressData.phaseBreakdown,
    nextSteps: nextSteps,
    trades: [
      {
        name: project.projectType || 'Main Trade',
        laborProgress: progressData.overall,
        materialsDelivered: progressData.overall >= 50, // Simple logic: materials delivered when 50% complete
        workflowSteps: workflow ? workflow.steps.map(step => ({
          stepId: step.stepId,
          stepName: step.stepName,
          phase: step.phase,
          isCompleted: step.isCompleted,
          completedAt: step.completedAt,
          scheduledEndDate: step.scheduledEndDate
        })) : []
      }
    ]
  };

  // Enhance project with calculated progress data
  const enhancedProject = await enhanceProjectsWithProgress([enhancedProgressData]);

  sendSuccess(res, 200, enhancedProject[0], 'Project progress retrieved successfully');
}));

module.exports = router; 