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
  if (project.workflowTrackers && project.workflowTrackers.length > 0) {
    const tracker = project.workflowTrackers.find(t => t.isMainWorkflow) || project.workflowTrackers[0];
    
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

  // Use workflow tracker to determine the current phase
  // This block is now deprecated since we don't have a workflow field anymore

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

// Helper function to get total line items count for a workflow
const getTotalLineItemsCount = async (workflowType = 'ROOFING') => {
  try {
    const count = await prisma.workflowLineItem.count({
      where: {
        isActive: true,
        section: {
          isActive: true,
          phase: {
            isActive: true
          }
        }
      }
    });
    return count || 25; // Default estimate
  } catch (error) {
    console.error('Error counting total line items:', error);
    return 25; // Default estimate
  }
};

// **CRITICAL: Data transformation layer for frontend compatibility**
// Accept optional precomputed totalLineItems to avoid repeated DB counts in list endpoints
const transformProjectForFrontend = async (project, precomputedTotalLineItems) => {
  if (!project) return null;
  
  // Get total line items count for progress calculation
  const totalLineItems = typeof precomputedTotalLineItems === 'number'
    ? precomputedTotalLineItems
    : await getTotalLineItemsCount();
  
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
    
    // Address - use customer's address as the single source of truth
    address: project.customer?.address || null,
    location: project.customer?.address || null,
    
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
    
    // DEPRECATED: Legacy workflow field - removed, use currentWorkflowItem instead
    workflow: null,
    // Provide both canonical key and display value for the phase
    phase: getProjectPhaseKey(project),
    phaseDisplay: getProjectPhaseDisplay(getProjectPhaseKey(project)),
    
    // ENABLED: currentWorkflowItem now that ProjectWorkflowTracker is properly populated
    currentWorkflowItem: (project.workflowTrackers && project.workflowTrackers.length > 0) ? (() => {
      const mainTracker = project.workflowTrackers.find(t => t.isMainWorkflow) || project.workflowTrackers[0];
      return {
        phase: mainTracker.currentPhase?.phaseType || null,
        phaseDisplay: mainTracker.currentPhase?.phaseName || null,
        section: mainTracker.currentSection?.displayName || null,
        lineItem: mainTracker.currentLineItem?.itemName || null,
        lineItemId: mainTracker.currentLineItem?.id || null,
        sectionId: mainTracker.currentSectionId || null,
        phaseId: mainTracker.currentPhaseId || null,
        isComplete: !mainTracker.currentPhaseId && !mainTracker.currentSectionId && !mainTracker.currentLineItemId,
        completedItems: mainTracker.completedItems || [],
        totalLineItems: totalLineItems
      };
    })() : null,
    
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
    .isIn(['ROOFING', 'GUTTERS', 'INTERIOR_PAINT'])
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
    .withMessage('Customer ID must be provided'),
  body('startingPhase')
    .optional()
    .isIn(['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'])
    .withMessage('Invalid starting phase')
];

// @desc    Get all projects with filtering and pagination
// @route   GET /api/projects
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  // Temporarily disabled cache: cacheService.middleware('projects', 60)
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
          _count: {
            select: {
              tasks: true,
              documents: true,
              workflowAlerts: true
            }
          },
          workflowTrackers: {
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
              },
              completedItems: {
                select: {
                  id: true,
                  lineItemId: true,
                  phaseId: true,
                  sectionId: true,
                  completedAt: true,
                  completedById: true
                }
              }
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    // Compute shared values once for the page of results
    const totalLineItems = await getTotalLineItemsCount();

    // Transform projects for frontend compatibility using shared totalLineItems
    const transformedProjects = await Promise.all(
      projects.map(project => transformProjectForFrontend(project, totalLineItems))
    );
    
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
        // workflow and phaseOverrides not present in active schema
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
        workflowTrackers: {
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
            },
            completedItems: {
              select: {
                id: true,
                lineItemId: true,
                phaseId: true,
                sectionId: true,
                completedAt: true,
                completedById: true
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
    const transformedProject = await transformProjectForFrontend(project);
    
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

    // Verify project manager exists if provided - if not found, continue without one
    let validatedProjectManagerId = null;
    if (req.body.projectManagerId) {
      const projectManager = await prisma.user.findUnique({
        where: { id: req.body.projectManagerId }
      });
      if (projectManager) {
        validatedProjectManagerId = req.body.projectManagerId;
      } else {
        console.warn(`Project manager ${req.body.projectManagerId} not found, continuing without project manager`);
      }
    }

    // Determine default project manager if none provided
    let resolvedProjectManagerId = validatedProjectManagerId;
    if (!resolvedProjectManagerId && process.env.DEFAULT_PM_USER_ID) {
      const envUser = await prisma.user.findUnique({ where: { id: process.env.DEFAULT_PM_USER_ID } });
      if (envUser && envUser.isActive) {
        resolvedProjectManagerId = envUser.id;
      }
    }

    // Use user-provided project number or auto-generate if not provided
    let projectNumber;
    if (req.body.projectNumber) {
      projectNumber = parseInt(req.body.projectNumber);
    } else {
      const lastProject = await prisma.project.findFirst({
        orderBy: { projectNumber: 'desc' }
      });
      projectNumber = (lastProject?.projectNumber || 10000) + 1;
    }

    // Create project data
    const projectData = {
      projectNumber: projectNumber,
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
      projectManagerId: resolvedProjectManagerId,
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

    // OPTIMIZED: Initialize workflow(s) with template-instance integration
    try {
      // Check if multiple trade types are provided for multiple workflows
      const tradeTypes = req.body.tradeTypes;
      
      if (tradeTypes && Array.isArray(tradeTypes) && tradeTypes.length > 1) {
        // Initialize multiple workflows for multiple trade types
        console.log(`🔧 Initializing multiple workflows for project ${project.id}:`, tradeTypes);
        const workflowResult = await WorkflowProgressionService.initializeMultipleWorkflows(
          project.id,
          tradeTypes
        );
        console.log(`✅ Successfully initialized ${tradeTypes.length} workflows for project ${project.id}`);
      } else {
        // Initialize single workflow with starting phase
        const workflowResult = await WorkflowProgressionService.initializeProjectWorkflow(
          project.id, 
          project.projectType || 'ROOFING',
          true, // isMainWorkflow
          req.body.startingPhase || 'LEAD' // Pass starting phase
        );
      }
      
      if (workflowResult?.tracker?.currentLineItemId) {
        console.log(`✅ Optimized workflow initialized with ${workflowResult.totalSteps} steps`);
        
        // CRITICAL: Generate first alert immediately for the new project
        try {
          const alerts = await AlertGenerationService.generateBatchAlerts([project.id]);
          if (alerts && alerts.length > 0) {
            console.log(`✅ First alert generated for new project ${project.id}: "${alerts[0].title}"`);
          } else {
            console.warn(`⚠️ No alert generated for new project ${project.id} - may need role assignments`);
          }
        } catch (alertErr) {
          console.error(`❌ Failed to generate first alert for project ${project.id}:`, alertErr?.message);
        }
      }
    } catch (werr) {
      console.warn('⚠️ Optimized workflow init failed (project still created):', werr?.message);
    }

    // Transform project for frontend compatibility
    const transformedProject = await transformProjectForFrontend(project);

    // Invalidate caches so the new project and related lists show up immediately
    try {
      await cacheService.invalidateRelated('project', project.id);
    } catch (cacheErr) {
      console.warn('⚠️ Cache invalidation failed after project create:', cacheErr?.message);
    }

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
    const transformedProject = await transformProjectForFrontend(updatedProject);

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
    const transformedProject = await transformProjectForFrontend(updatedProject);

    // Invalidate cache for projects
    await cacheService.invalidateRelated('project', req.params.id);

    sendSuccess(res, 200, transformedProject, `Project ${archived ? 'archived' : 'unarchived'} successfully`);
  } catch (error) {
    console.error('Error archiving project:', error);
    return next(new AppError('Failed to archive project', 500));
  }
}));

module.exports = router; 