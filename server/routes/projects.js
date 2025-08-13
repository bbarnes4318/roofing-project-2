const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { prisma } = require('../config/prisma');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');
const AlertGenerationService = require('../services/AlertGenerationService');
const { cacheService } = require('../config/redis');
const { transformWorkflowStep, transformWorkflowSubTask } = require('../utils/workflowMapping');

const router = express.Router();

// Helper: return canonical phase key used across the app (e.g., 'LEAD','PROSPECT',...)
const getProjectPhaseKey = (project) => {
  // FIXED: Use ProjectWorkflowTracker for accurate phase determination
  if (project.workflowTracker) {
    const tracker = project.workflowTracker;
    
    // Check for phase overrides first
    if (project.phaseOverrides && project.phaseOverrides.length > 0) {
      const override = project.phaseOverrides[0];
      if (override.toPhase) {
        console.log(`📍 Using phase override: ${override.toPhase} for project ${project.id}`);
        return override.toPhase;
      }
    }
    
    // Get phase from current workflow position
    if (tracker.currentPhase && tracker.currentPhase.phaseType) {
      const phaseType = tracker.currentPhase.phaseType;
      console.log(`📍 Using tracker phase: ${phaseType} for project ${project.id}`);
      return phaseType;
    }
    
    // Fallback to current line item's phase if available
    if (tracker.currentLineItem && tracker.currentLineItem.section && tracker.currentLineItem.section.phase) {
      const phaseType = tracker.currentLineItem.section.phase.phaseType;
      console.log(`📍 Using line item phase: ${phaseType} for project ${project.id}`);
      return phaseType;
    }
    
    // If workflow is complete (no current items), project should be in COMPLETION phase
    if (!tracker.currentPhaseId && !tracker.currentSectionId && !tracker.currentLineItemId) {
      console.log(`📍 Workflow complete, using COMPLETION phase for project ${project.id}`);
      return 'COMPLETION';
    }
  }

  // FIXED: If project has workflow steps, find current phase based on WORKFLOW ORDER not alphabetical
  if (project.workflow && project.workflow.steps && project.workflow.steps.length > 0) {
    // Define proper phase order for workflow progression
    const phaseOrder = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'];
    
    console.log(`🔍 Calculating phase for project ${project.id}, total steps: ${project.workflow.steps.length}`);
    
    // Find first incomplete step in phase order
    let currentPhase = 'COMPLETION'; // Default if all complete
    
    for (const phase of phaseOrder) {
      const phaseSteps = project.workflow.steps.filter(step => 
        step.phase?.toUpperCase() === phase
      );
      const incompleteSteps = phaseSteps.filter(step => !step.isCompleted);
      
      console.log(`📊 Phase ${phase}: ${phaseSteps.length} total steps, ${incompleteSteps.length} incomplete`);
      
      if (incompleteSteps.length > 0) {
        currentPhase = phase;
        console.log(`📍 Using phase: ${phase} for project ${project.id} (found incomplete step: ${incompleteSteps[0].stepId})`);
        break;
      }
    }
    
    if (currentPhase === 'COMPLETION') {
      console.log(`📍 All workflow phases complete for project ${project.id}`);
    }
    
    return currentPhase;
  }

  // Fallback to status-based mapping if no workflow data
  if (project.status) {
    const statusPhaseMap = {
      'PENDING': 'LEAD',
      'IN_PROGRESS': 'EXECUTION',
      'INPROGRESS': 'EXECUTION',
      'ACTIVE': 'EXECUTION',
      'COMPLETED': 'COMPLETION',
      'ON_HOLD': 'LEAD'
    };
    const key = String(project.status).toUpperCase();
    console.log(`📍 Using status-based phase: ${key} for project ${project.id}`);
    return statusPhaseMap[key] || 'LEAD';
  }
  
  console.log(`📍 Using default LEAD phase for project ${project.id}`);
  return 'LEAD';
};

// Helper: pretty display for phase
const getProjectPhaseDisplay = (phaseKey) => {
  const displayMap = {
    'LEAD': 'Lead',
    'PROSPECT': 'Prospect',
    'APPROVED': 'Approved',
    'EXECUTION': 'Execution',
    'SECOND_SUPPLEMENT': '2nd Supplement',
    'COMPLETION': 'Completion'
  };
  return displayMap[phaseKey] || phaseKey;
};

// **CRITICAL: Data transformation layer for frontend compatibility**
const transformProjectForFrontend = (project) => {
  if (!project) return null;
  
  return {
    // Keep both ID formats for compatibility
    id: project.id,
    _id: project.id,
    
    // Project details
    projectId: project.projectNumber?.toString() || project.id,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    projectType: project.projectType,
    status: project.status,
    priority: project.priority,
    description: project.description,
    progress: project.progress || 0,
    
    // Financial
    budget: project.budget ? parseFloat(project.budget) : 0,
    estimatedCost: project.estimatedCost ? parseFloat(project.estimatedCost) : null,
    actualCost: project.actualCost ? parseFloat(project.actualCost) : null,
    
    // Dates
    startDate: project.startDate,
    endDate: project.endDate,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    
    // Address - map projectName to address for frontend compatibility
    address: project.projectName, // projectName contains the address
    location: project.projectName,
    
    // Customer mapping - frontend expects both customer and client
    customer: project.customer ? {
      id: project.customer.id,
      _id: project.customer.id,
      name: project.customer.primaryName,
      firstName: project.customer.primaryName.split(' ')[0] || '',
      lastName: project.customer.primaryName.split(' ').slice(1).join(' ') || '',
      primaryName: project.customer.primaryName,
      secondaryName: project.customer.secondaryName,
      email: project.customer.primaryEmail,
      primaryEmail: project.customer.primaryEmail,
      secondaryEmail: project.customer.secondaryEmail,
      phone: project.customer.primaryPhone,
      primaryPhone: project.customer.primaryPhone,
      secondaryPhone: project.customer.secondaryPhone,
      primaryContact: project.customer.primaryContact,
      address: project.customer.address,
      createdAt: project.customer.createdAt
    } : null,
    
    // Also provide client alias for compatibility
    client: project.customer ? {
      id: project.customer.id,
      _id: project.customer.id,
      name: project.customer.primaryName,
      email: project.customer.primaryEmail,
      phone: project.customer.primaryPhone,
      clientName: project.customer.primaryName,
      clientEmail: project.customer.primaryEmail,
      clientPhone: project.customer.primaryPhone
    } : null,
    
    // Project Manager
    projectManager: project.projectManager ? {
      id: project.projectManager.id,
      _id: project.projectManager.id,
      firstName: project.projectManager.firstName,
      lastName: project.projectManager.lastName,
      email: project.projectManager.email,
      phone: project.projectManager.phone,
      role: project.projectManager.role
    } : null,
    
    // Project Manager Contact Information (NEW FIELDS)
    pmPhone: project.pmPhone,
    pmEmail: project.pmEmail,
    
    // Team members
    teamMembers: project.teamMembers ? project.teamMembers.map(member => ({
      id: member.user?.id || member.id,
      _id: member.user?.id || member.id,
      firstName: member.user?.firstName || '',
      lastName: member.user?.lastName || '',
      email: member.user?.email || '',
      role: member.role || member.user?.role || ''
    })) : [],
    
    // DEPRECATED: Legacy workflow field - use currentWorkflowItem instead
    workflow: project.workflow ? {
      id: project.workflow.id,
      status: project.workflow.status || 'IN_PROGRESS',
      // Remove steps array - use currentWorkflowItem for workflow data
      steps: []
    } : null,
    // Provide both canonical key and display value for the phase
    phase: getProjectPhaseKey(project),
    phaseDisplay: getProjectPhaseDisplay(getProjectPhaseKey(project)),
    
    // ENABLED: currentWorkflowItem now that ProjectWorkflowTracker is properly populated
    currentWorkflowItem: project.workflowTracker ? {
      phase: project.workflowTracker.currentPhase?.phaseType || null,
      phaseDisplay: project.workflowTracker.currentPhase?.phaseName || null,
      section: project.workflowTracker.currentSection?.displayName || null,
      lineItem: project.workflowTracker.currentLineItem?.itemName || null,
      lineItemId: project.workflowTracker.currentLineItem?.id || null,
      sectionId: project.workflowTracker.currentSectionId || null,
      phaseId: project.workflowTracker.currentPhaseId || null,
      isComplete: !project.workflowTracker.currentPhaseId && !project.workflowTracker.currentSectionId && !project.workflowTracker.currentLineItemId
    } : null,
    
    // Additional fields for compatibility
    archived: project.archived || false,
    archivedAt: project.archivedAt,
    notes: project.notes
  };
};

// (Deprecated) getProjectPhase: replaced by getProjectPhaseKey/getProjectPhaseDisplay

// Helper function to enhance projects with calculated progress data
const enhanceProjectsWithProgress = async (projects) => {
  return projects.map(project => {
    // Add calculated progress data (simplified for now)
    project.calculatedProgress = {
      overall: project.progress || 0,
      materials: Math.max(0, (project.progress || 0) - 10),
      labor: Math.min(100, (project.progress || 0) + 5),
      trades: [],
      totalSteps: 0, // Use currentWorkflowItem for step counting
      completedSteps: 0 // Use currentWorkflowItem for completion tracking
    };
    
    return project;
  });
};

// Validation rules for project creation
const projectValidation = [
  body('projectName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Project name must be between 2 and 200 characters'),
  body('projectType')
    .isIn(['ROOF_REPLACEMENT', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION', 'SIDING_INSTALLATION', 'WINDOW_REPLACEMENT', 'FLOORING', 'PAINTING', 'ELECTRICAL_WORK', 'PLUMBING', 'HVAC', 'DECK_CONSTRUCTION', 'LANDSCAPING', 'OTHER'])
    .withMessage('Invalid project type'),
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'])
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
  body('customerId')
    .isString()
    .withMessage('Customer ID must be provided')
];

// @desc    Get all projects with filtering and pagination
// @route   GET /api/projects
// @access  Private
router.get('/', cacheService.middleware('projects', 60), asyncHandler(async (req, res) => {
  const { 
    status, 
    projectType, 
    priority, 
    customer,
    search, 
    page: pageRaw = 1, 
    limit: limitRaw = 50, // Increased default limit for better performance
    sortBy: sortByRaw = 'createdAt',
    sortOrder: sortOrderRaw = 'desc',
    includeArchived = false
  } = req.query;

  // Sanitize pagination
  const pageNum = Number.isFinite(+pageRaw) && +pageRaw > 0 ? parseInt(pageRaw) : 1;
  const limitNum = Number.isFinite(+limitRaw) && +limitRaw > 0 && +limitRaw <= 200 ? parseInt(limitRaw) : 50;
  const skip = (pageNum - 1) * limitNum;

  // Sanitize sorting - whitelist sortable fields
  const allowedSortFields = new Set([
    'createdAt', 'updatedAt', 'projectNumber', 'projectName',
    'status', 'priority', 'startDate', 'endDate'
  ]);
  const sortBy = allowedSortFields.has(String(sortByRaw)) ? String(sortByRaw) : 'createdAt';
  const sortOrder = String(sortOrderRaw).toLowerCase() === 'asc' ? 'asc' : 'desc';

  // Build filter object for Prisma
  let where = {};
  
  if (status) where.status = status;
  if (projectType) where.projectType = projectType;
  if (priority) where.priority = priority;
  if (customer) where.customerId = customer;
  
  // Filter archived projects
  if (includeArchived === 'true') {
    // Include all projects
  } else if (includeArchived === 'only') {
    where.archived = true;
  } else {
    where.archived = false;
  }
  
  // Add search functionality
  if (search) {
    where.OR = [
      { projectName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { customer: { 
          OR: [
            { primaryName: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } }
          ]
        }
      }
    ];
  }

  // Build sort object
  const orderBy = {};
  orderBy[sortBy] = sortOrder;

  try {
    // Execute query with pagination and population using Prisma
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          customer: {
            select: {
              id: true,
              primaryName: true,
              primaryEmail: true,
              primaryPhone: true,
              secondaryName: true,
              secondaryEmail: true,
              secondaryPhone: true,
              address: true
            }
          },
          projectManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true
            }
          },
          teamMembers: {
            select: {
              id: true,
              role: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true
                }
              }
            },
            take: 10 // Limit team members for performance
          },
          workflow: {
            select: {
              id: true,
              currentStepIndex: true,
              overallProgress: true,
              status: true,
              steps: {
                select: {
                  id: true,
                  stepId: true,
                  stepName: true,
                  phase: true,
                  isCompleted: true,
                  completedAt: true,
                  actualStartDate: true
                },
                orderBy: {
                  stepId: 'asc'
                }
              }
            }
          },
            }
          },
          phaseOverrides: {
            where: { isActive: true },
            select: {
              id: true,
              fromPhase: true,
              toPhase: true,
              suppressAlertsFor: true,
              isActive: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          },
          _count: {
            select: {
              tasks: true,
              documents: true,
              workflowAlerts: true
            }
          },
          workflowTracker: {
            include: {
              currentPhase: {
                select: {
                  id: true,
                  phaseType: true,
                  phaseName: true
                }
              },
              currentSection: {
                select: {
                  id: true,
                  displayName: true
                }
              },
              currentLineItem: {
                select: {
                  id: true,
                  itemName: true,
                  section: {
                    select: {
                      displayName: true,
                      phase: {
                        select: {
                          phaseType: true,
                          phaseName: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    // Transform projects for frontend compatibility
    const transformedProjects = projects.map(transformProjectForFrontend);
    
    // Enhance projects with calculated progress data
    const enhancedProjects = await enhanceProjectsWithProgress(transformedProjects);

    sendPaginatedResponse(res, enhancedProjects, pageNum, limitNum, total, 'Projects retrieved successfully');
  } catch (error) {
    console.error('Error fetching projects:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    // Fail soft in production to keep UI functional
    return sendPaginatedResponse(
      res,
      [],
      pageNum,
      limitNum,
      0,
      'Unable to fetch projects at this time'
    );
  }
}));

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        },
        workflow: {
          select: {
            id: true,
            currentStepIndex: true,
            overallProgress: true,
            status: true,
            steps: {
              select: {
                id: true,
                stepId: true,
                stepName: true,
                phase: true,
                isCompleted: true,
                completedAt: true,
                actualStartDate: true
              },
              orderBy: {
                stepId: 'asc'
              }
            }
          }
        },
        phaseOverrides: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        documents: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        workflowTracker: {
          include: {
            currentPhase: {
              select: {
                id: true,
                phaseType: true,
                phaseName: true
              }
            },
            currentSection: {
              select: {
                id: true,
                displayName: true
              }
            },
            currentLineItem: {
              select: {
                id: true,
                itemName: true,
                section: {
                  select: {
                    displayName: true,
                    phase: {
                      select: {
                        phaseType: true,
                        phaseName: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    // Transform project for frontend compatibility
    const transformedProject = transformProjectForFrontend(project);
    
    sendSuccess(res, 200, transformedProject, 'Project retrieved successfully');
  } catch (error) {
    console.error('Error fetching project:', error);
    return next(new AppError('Failed to fetch project', 500));
  }
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

  try {
    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: req.body.customerId }
    });
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Verify project manager exists if provided
    if (req.body.projectManagerId) {
      const projectManager = await prisma.user.findUnique({
        where: { id: req.body.projectManagerId }
      });
      if (!projectManager) {
        return next(new AppError('Project manager not found', 404));
      }
    }

    // Generate unique project number
    const lastProject = await prisma.project.findFirst({
      orderBy: { projectNumber: 'desc' }
    });
    const nextProjectNumber = (lastProject?.projectNumber || 10000) + 1;

    // Create project data
    const projectData = {
      projectNumber: nextProjectNumber,
      projectName: req.body.projectName || customer.address, // Use customer address as project name
      projectType: req.body.projectType,
      status: req.body.status || 'PENDING',
      priority: req.body.priority || 'MEDIUM',
      description: req.body.description,
      budget: parseFloat(req.body.budget),
      estimatedCost: req.body.estimatedCost ? parseFloat(req.body.estimatedCost) : null,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      customerId: req.body.customerId,
      projectManagerId: req.body.projectManagerId || null,
      pmPhone: req.body.pmPhone || null,
      pmEmail: req.body.pmEmail || null,
      notes: req.body.notes || null
    };

    // Create project
    const project = await prisma.project.create({
      data: projectData,
      include: {
        customer: true,
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true
          }
        }
      }
    });

    // OPTIMIZED: Initialize workflow with template-instance integration
    try {
      const workflowResult = await WorkflowProgressionService.initializeProjectWorkflow(
        project.id, 
        project.projectType === 'ROOF_REPLACEMENT' ? 'ROOFING' : 'GENERAL'
      );
      
      if (workflowResult?.tracker?.currentLineItemId) {
        // Alert is automatically generated in optimized workflow
        console.log(`✅ Optimized workflow initialized with ${workflowResult.totalSteps} steps`);
      }
    } catch (werr) {
      console.warn('⚠️ Optimized workflow init failed (project still created):', werr?.message);
    }

    // Transform project for frontend compatibility
    const transformedProject = transformProjectForFrontend(project);

    sendSuccess(res, 201, transformedProject, 'Project created successfully');
  } catch (error) {
    console.error('Error creating project:', error);
    return next(new AppError('Failed to create project', 500));
  }
}));

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
router.put('/:id', asyncHandler(async (req, res, next) => {
  try {
    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!existingProject) {
      return next(new AppError('Project not found', 404));
    }

    // Verify customer exists if being updated
    if (req.body.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: req.body.customerId }
      });
      if (!customer) {
        return next(new AppError('Customer not found', 404));
      }
    }

    // Verify project manager exists if being updated
    if (req.body.projectManagerId) {
      const projectManager = await prisma.user.findUnique({
        where: { id: req.body.projectManagerId }
      });
      if (!projectManager) {
        return next(new AppError('Project manager not found', 404));
      }
    }

    // Prepare update data
    const updateData = {};
    
    if (req.body.projectName !== undefined) updateData.projectName = req.body.projectName;
    if (req.body.projectType !== undefined) updateData.projectType = req.body.projectType;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.priority !== undefined) updateData.priority = req.body.priority;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.budget !== undefined) updateData.budget = parseFloat(req.body.budget);
    if (req.body.estimatedCost !== undefined) updateData.estimatedCost = req.body.estimatedCost ? parseFloat(req.body.estimatedCost) : null;
    if (req.body.actualCost !== undefined) updateData.actualCost = req.body.actualCost ? parseFloat(req.body.actualCost) : null;
    if (req.body.startDate !== undefined) updateData.startDate = new Date(req.body.startDate);
    if (req.body.endDate !== undefined) updateData.endDate = new Date(req.body.endDate);
    if (req.body.customerId !== undefined) updateData.customerId = req.body.customerId;
    if (req.body.projectManagerId !== undefined) updateData.projectManagerId = req.body.projectManagerId;
    if (req.body.pmPhone !== undefined) updateData.pmPhone = req.body.pmPhone;
    if (req.body.pmEmail !== undefined) updateData.pmEmail = req.body.pmEmail;
    if (req.body.progress !== undefined) updateData.progress = parseInt(req.body.progress);
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.archived !== undefined) updateData.archived = req.body.archived;

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        customer: true,
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
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

    // Transform project for frontend compatibility
    const transformedProject = transformProjectForFrontend(updatedProject);

    // Invalidate cache for projects
    await cacheService.invalidateRelated('project', req.params.id);

    sendSuccess(res, 200, transformedProject, 'Project updated successfully');
  } catch (error) {
    console.error('Error updating project:', error);
    return next(new AppError('Failed to update project', 500));
  }
}));

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    await prisma.project.delete({
      where: { id: req.params.id }
    });

    // Invalidate cache for projects
    await cacheService.invalidateRelated('project', req.params.id);

    sendSuccess(res, null, 'Project deleted successfully');
  } catch (error) {
    console.error('Error deleting project:', error);
    return next(new AppError('Failed to delete project', 500));
  }
}));

// @desc    Archive/Unarchive project
// @route   PATCH /api/projects/:id/archive
// @access  Private
router.patch('/:id/archive', asyncHandler(async (req, res, next) => {
  try {
    const { archived = true } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        archived: archived,
        archivedAt: archived ? new Date() : null
      },
      include: {
        customer: true,
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true
          }
        }
      }
    });

    // Transform project for frontend compatibility
    const transformedProject = transformProjectForFrontend(updatedProject);

    // Invalidate cache for projects
    await cacheService.invalidateRelated('project', req.params.id);

    sendSuccess(res, 200, transformedProject, `Project ${archived ? 'archived' : 'unarchived'} successfully`);
  } catch (error) {
    console.error('Error archiving project:', error);
    return next(new AppError('Failed to archive project', 500));
  }
}));

module.exports = router; 