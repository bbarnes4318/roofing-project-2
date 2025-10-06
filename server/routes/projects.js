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
  // Use ProjectWorkflowTracker for accurate phase determination
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
    
    // Get phase from related workflow phase if present
    if (tracker?.currentPhase?.phaseType) {
      const phaseType = tracker.currentPhase.phaseType;
      // console.log(`📍 Using tracker phase (related): ${phaseType} for project ${project.id}`);
      return phaseType;
    }
    
    // Fallback to current line item's phase would go here if needed
    
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
        workflowType: workflowType,
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
  const trackerType = (project.workflowTrackers && project.workflowTrackers[0]?.workflowType) || project.projectType || 'ROOFING';
  const totalLineItems = typeof precomputedTotalLineItems === 'number'
    ? precomputedTotalLineItems
    : await getTotalLineItemsCount(trackerType);
  
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
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    
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
      createdAt: project.customer.createdAt,
      created_at: project.customer.createdAt
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
      clientPhone: project.customer.primaryPhone,
      createdAt: project.customer.createdAt,
      created_at: project.customer.createdAt
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

    // Lead Source
    leadSource: project.leadSource ? {
      id: project.leadSource.id,
      name: project.leadSource.name,
      isActive: project.leadSource.isActive
    } : null,
    leadSourceName: project.leadSource?.name || null,
    
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
      const trackerPhaseType = mainTracker?.currentPhase?.phaseType || null;
      const trackerPhaseName = mainTracker?.currentPhase?.phaseName || (trackerPhaseType ? getProjectPhaseDisplay(trackerPhaseType) : null);
      const sectionName = mainTracker?.currentSection?.displayName || mainTracker?.currentSection?.sectionName || null;
      const lineItemName = mainTracker?.currentLineItem ? [
        mainTracker.currentLineItem.itemLetter,
        mainTracker.currentLineItem.itemName
      ].filter(Boolean).join('. ') : null;
      return {
        phase: trackerPhaseType,
        phaseDisplay: trackerPhaseName,
        section: sectionName,
        lineItem: lineItemName,
        lineItemId: mainTracker.currentLineItemId || null,
        sectionId: mainTracker.currentSectionId || null,
        phaseId: mainTracker.currentPhaseId || null,
        isComplete: !mainTracker.currentPhaseId && !mainTracker.currentSectionId && !mainTracker.currentLineItemId,
        completedItems: mainTracker.completedItems || [],
        totalLineItems: mainTracker.totalLineItems || totalLineItems
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
    .withMessage('Invalid starting phase'),
  body('leadSourceId')
    .optional()
    .isString()
    .withMessage('Lead Source ID must be a string')
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
    sortBy: sortByRaw = 'created_at',
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
    console.log('🔍 Where clause:', where);
    console.log('🔍 OrderBy clause:', orderBy);
    
    // Execute query with customer include; if lead_source_id missing, retry without leadSource
    let projects, total;
    try {
      [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          include: {
            customer: true,
            leadSource: true,
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
            workflowTrackers: {
              select: {
                id: true,
                isMainWorkflow: true,
                currentPhaseId: true,
                currentSectionId: true,
                currentLineItemId: true,
                totalLineItems: true,
                // include related workflow phase to derive current phase
                currentPhase: {
                  select: { phaseType: true, phaseName: true }
                },
                currentSection: {
                  select: { sectionName: true, displayName: true }
                },
                currentLineItem: {
                  select: { itemLetter: true, itemName: true }
                },
                completedItems: {
                  select: {
                    id: true,
                    lineItemId: true,
                    sectionId: true,
                    phaseId: true,
                    completedAt: true
                  }
                }
              }
            }
          }
        }),
        prisma.project.count({ where })
      ]);
    } catch (e) {
      if (e?.code === 'P2022' && (e?.message?.includes('lead_source_id') || String(e?.meta?.column || '').includes('lead_source_id'))) {
        console.warn('⚠️ lead_source_id missing; retrying project list without leadSource include');
        [projects, total] = await Promise.all([
          prisma.project.findMany({
            where,
            orderBy,
            skip,
            take: limitNum,
            include: {
              customer: true,
              // leadSource omitted due to missing column
              workflowTrackers: {
                select: {
                  id: true,
                  isMainWorkflow: true,
                  currentPhaseId: true,
                  currentSectionId: true,
                  currentLineItemId: true,
                  totalLineItems: true,
                  currentPhase: { select: { phaseType: true, phaseName: true } },
                  currentSection: { select: { sectionName: true, displayName: true } },
                  currentLineItem: { select: { itemLetter: true, itemName: true } },
                  completedItems: { select: { id: true, lineItemId: true, sectionId: true, phaseId: true, completedAt: true } }
                }
              }
            }
          }),
          prisma.project.count({ where })
        ]);
      } else {
        throw e;
      }
    }

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
    let project;
    try {
      project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: {
          customer: true,
          leadSource: true,
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
              assignedTo: { select: { id: true, firstName: true, lastName: true } }
            }
          },
          documents: {
            include: {
              uploadedBy: { select: { id: true, firstName: true, lastName: true } }
            }
          },
          workflowTrackers: {
            select: {
              id: true,
              isMainWorkflow: true,
              currentPhaseId: true,
              currentSectionId: true,
              currentLineItemId: true,
              totalLineItems: true,
              currentPhase: { select: { phaseType: true, phaseName: true } },
              currentSection: { select: { sectionName: true, displayName: true } },
              currentLineItem: { select: { itemLetter: true, itemName: true } },
              completedItems: { select: { id: true, lineItemId: true, sectionId: true, phaseId: true, completedAt: true } }
            }
          }
        }
      });
    } catch (e) {
      if (e?.code === 'P2022' && (e?.message?.includes('lead_source_id') || String(e?.meta?.column || '').includes('lead_source_id'))) {
        console.warn('⚠️ lead_source_id missing; retrying project detail without leadSource include');
        project = await prisma.project.findUnique({
          where: { id: req.params.id },
          include: {
            customer: true,
            // leadSource omitted due to missing column
            projectManager: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
            teamMembers: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } } },
            tasks: { include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } } },
            documents: { include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } } },
            workflowTrackers: { select: { id: true, isMainWorkflow: true, currentPhaseId: true, currentSectionId: true, currentLineItemId: true, totalLineItems: true, currentPhase: { select: { phaseType: true, phaseName: true } }, currentSection: { select: { sectionName: true, displayName: true } }, currentLineItem: { select: { itemLetter: true, itemName: true } }, completedItems: { select: { id: true, lineItemId: true, sectionId: true, phaseId: true, completedAt: true } } } }
          }
        });
      } else {
        throw e;
      }
    }

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    // Re-fetch project with workflow trackers for accurate response
    let projectForResponse = project;
    try {
      projectForResponse = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          customer: true,
          leadSource: true,
          projectManager: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
          workflowTrackers: { select: { id: true, isMainWorkflow: true, currentPhaseId: true, currentSectionId: true, currentLineItemId: true, totalLineItems: true, currentPhase: { select: { phaseType: true, phaseName: true } }, completedItems: { select: { id: true, lineItemId: true, sectionId: true, phaseId: true, completedAt: true } } } }
        }
      });
    } catch (refetchErr) {
      if (refetchErr?.code === 'P2022' && (refetchErr?.message?.includes('lead_source_id') || String(refetchErr?.meta?.column || '').includes('lead_source_id'))) {
        console.warn('⚠️ lead_source_id missing on refetch; retrying without leadSource include');
        try {
          projectForResponse = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
              customer: true,
              // leadSource omitted due to missing column
              projectManager: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
              workflowTrackers: { select: { id: true, isMainWorkflow: true, currentPhaseId: true, currentSectionId: true, currentLineItemId: true, totalLineItems: true, currentPhase: { select: { phaseType: true, phaseName: true } }, completedItems: { select: { id: true, lineItemId: true, sectionId: true, phaseId: true, completedAt: true } } } }
            }
          });
        } catch (e2) {
          console.warn('⚠️ Fallback refetch also failed:', e2?.message || e2);
        }
      } else {
        console.warn('⚠️ Failed to refetch project with workflowTrackers:', refetchErr?.message);
      }
    }

    // Transform project for frontend compatibility
    const transformedProject = await transformProjectForFrontend(projectForResponse);
    
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
    console.log('🔍 Project manager validation - req.body.projectManagerId:', req.body.projectManagerId);
    if (req.body.projectManagerId) {
      const projectManager = await prisma.user.findUnique({
        where: { id: req.body.projectManagerId }
      });
      console.log('🔍 Found project manager:', !!projectManager, projectManager?.firstName, projectManager?.lastName);
      if (projectManager) {
        validatedProjectManagerId = req.body.projectManagerId;
        console.log('✅ Project manager validated:', validatedProjectManagerId);
      } else {
        console.warn(`Project manager ${req.body.projectManagerId} not found, continuing without project manager`);
      }
    }

    // Determine default project manager if none provided
    let resolvedProjectManagerId = validatedProjectManagerId;
    console.log('🔍 Resolved project manager ID:', resolvedProjectManagerId);
    if (!resolvedProjectManagerId && process.env.DEFAULT_PM_USER_ID) {
      const envUser = await prisma.user.findUnique({ where: { id: process.env.DEFAULT_PM_USER_ID } });
      if (envUser && envUser.isActive) {
        resolvedProjectManagerId = envUser.id;
        console.log('🔍 Using default project manager:', resolvedProjectManagerId);
      }
    }
    console.log('🔍 Final project manager ID for project:', resolvedProjectManagerId);

    // Verify lead source exists if provided
    let resolvedLeadSourceId = null;
    if (req.body.leadSourceId) {
      try {
        const ls = await prisma.leadSource.findUnique({ 
          where: { id: req.body.leadSourceId },
          select: { id: true }
        });
        if (ls) {
          resolvedLeadSourceId = ls.id;
        } else {
          console.warn(`Lead source ${req.body.leadSourceId} not found, continuing without lead source`);
        }
      } catch (error) {
        console.warn(`Error checking lead source ${req.body.leadSourceId}:`, error.message);
        // Continue without lead source if there's a database issue
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
      leadSourceId: resolvedLeadSourceId,
      notes: req.body.notes || null
    };

    // Create project (fallback if lead_source_id missing)
    let project;
    try {
      project = await prisma.project.create({
        data: projectData,
        include: {
          customer: true,
          leadSource: true,
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
    } catch (e) {
      if (e?.code === 'P2022' && (e?.message?.includes('lead_source_id') || String(e?.meta?.column || '').includes('lead_source_id'))) {
        console.warn('⚠️ lead_source_id missing; creating project without leadSource and retrying');
        const fallbackData = { ...projectData };
        delete fallbackData.leadSourceId;
        project = await prisma.project.create({
          data: fallbackData,
          include: {
            customer: true,
            // leadSource omitted due to missing column
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
      } else {
        throw e;
      }
    }

    // Create project folder in Documents & Resources using direct Prisma operations
    try {
      // Get or create Projects root folder
      let projectsRoot = await prisma.companyAsset.findFirst({
        where: {
          title: 'Projects',
          parentId: null,
          type: 'FOLDER',
          isActive: true
        }
      });
      
      if (!projectsRoot) {
        projectsRoot = await prisma.companyAsset.create({
          data: {
            title: 'Projects',
            folderName: 'Projects',
            type: 'FOLDER',
            parentId: null,
            uploadedById: req.user.id,
            accessLevel: 'private',
            path: 'Projects',
            metadata: {
              icon: 'folder',
              color: '#3B82F6',
              createdBy: `${req.user.firstName} ${req.user.lastName}`,
              createdAt: new Date().toISOString()
            },
            isActive: true
          }
        });
        console.log('✅ Created Projects root folder');
      }
      
      // Create project folder with correct format: "Project Number - Primary Customer Contact"
      const primaryContact = project.customer?.primaryName || project.customer?.firstName + ' ' + project.customer?.lastName || 'Unknown';
      const folderName = `${project.projectNumber} - ${primaryContact}`;
      
      // Check if project folder already exists
      const existingFolder = await prisma.companyAsset.findFirst({
        where: {
          title: folderName,
          parentId: projectsRoot.id,
          type: 'FOLDER',
          isActive: true
        }
      });
      
      if (!existingFolder) {
        const projectFolder = await prisma.companyAsset.create({
          data: {
            title: folderName,
            folderName: folderName,
            type: 'FOLDER',
            parentId: projectsRoot.id,
            uploadedById: req.user.id,
            accessLevel: 'private',
            path: `${projectsRoot.path}/${folderName}`,
            metadata: {
              projectId: project.id,
              projectNumber: project.projectNumber,
              customerName: primaryContact,
              address: project.projectName,
              isProjectFolder: true,
              icon: 'folder',
              color: '#10B981',
              createdBy: `${req.user.firstName} ${req.user.lastName}`,
              createdAt: new Date().toISOString()
            },
            isActive: true
          }
        });
        
        console.log('✅ Created project folder:', folderName, 'with ID:', projectFolder.id);
        console.log('📁 Project folder details:', {
          id: projectFolder.id,
          name: projectFolder.title,
          parentId: projectFolder.parentId,
          metadata: projectFolder.metadata
        });
      } else {
        console.log('📁 Project folder already exists:', folderName);
      }
    } catch (folderError) {
      console.warn('⚠️ Failed to create project folder:', folderError.message);
      // Don't fail project creation if folder creation fails
    }

    // OPTIMIZED: Initialize workflow(s) with template-instance integration
    let workflowInit = null;
    try {
      // Check if multiple trade types are provided for multiple workflows
      const tradeTypes = req.body.tradeTypes;
      
      if (tradeTypes && Array.isArray(tradeTypes) && tradeTypes.length > 1) {
        // Initialize multiple workflows for multiple trade types
        console.log(`🔧 Initializing multiple workflows for project ${project.id}:`, tradeTypes);
        workflowInit = await WorkflowProgressionService.initializeMultipleWorkflows(
          project.id,
          tradeTypes
        );
        console.log(`✅ Successfully initialized ${tradeTypes.length} workflows for project ${project.id}`);
      } else {
        // Initialize single workflow with starting phase
        workflowInit = await WorkflowProgressionService.initializeProjectWorkflow(
          project.id, 
          project.projectType || 'ROOFING',
          true, // isMainWorkflow
          req.body.startingPhase || 'LEAD' // Pass starting phase
        );
      }
      
      // Determine if there is a current active item
      const hasActiveItem = Array.isArray(workflowInit)
        ? workflowInit.some(t => t?.currentLineItemId)
        : Boolean(workflowInit?.tracker?.currentLineItemId);

      if (hasActiveItem) {
        const totalSteps = Array.isArray(workflowInit) ? null : workflowInit.totalSteps;
        if (totalSteps != null) {
          console.log(`✅ Optimized workflow initialized with ${totalSteps} steps`);
        } else {
          console.log(`✅ Optimized workflows initialized`);
        }
        
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

    // Re-fetch project with workflow trackers for accurate response
    let projectForResponse = project;
    try {
      projectForResponse = await prisma.project.findUnique({
        where: { id: project.id },
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
          workflowTrackers: {
            select: {
              id: true,
              isMainWorkflow: true,
              currentPhaseId: true,
              currentSectionId: true,
              currentLineItemId: true,
              totalLineItems: true,
              currentPhase: { select: { phaseType: true, phaseName: true } },
              currentSection: { select: { sectionName: true, displayName: true } },
              currentLineItem: { select: { itemLetter: true, itemName: true } }
            }
          }
        }
      });
    } catch (refetchErr) {
      console.warn('⚠️ Failed to refetch project with workflowTrackers:', refetchErr?.message);
    }

    // Transform project for frontend compatibility
    const transformedProject = await transformProjectForFrontend(projectForResponse);
    
    console.log('🔍 Project manager in response:', {
      projectManagerId: projectForResponse?.projectManager?.id,
      projectManagerName: projectForResponse?.projectManager ? `${projectForResponse.projectManager.firstName} ${projectForResponse.projectManager.lastName}` : 'Not assigned'
    });

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

    // Verify lead source exists if being updated
    if (req.body.leadSourceId) {
      const ls = await prisma.leadSource.findUnique({ where: { id: req.body.leadSourceId } });
      if (!ls || !ls.isActive) {
        return next(new AppError('Lead source not found or inactive', 404));
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
    if (req.body.leadSourceId !== undefined) updateData.leadSourceId = req.body.leadSourceId || null;

    // Update project (fallback if lead_source_id missing)
    console.log('Updating project with data:', updateData);
    let updatedProject;
    try {
      updatedProject = await prisma.project.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          customer: true,
          leadSource: true,
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
          workflowTrackers: {
            select: {
              id: true,
              isMainWorkflow: true,
              currentPhaseId: true,
              currentSectionId: true,
              currentLineItemId: true,
              totalLineItems: true,
              currentPhase: { select: { phaseType: true, phaseName: true } },
              currentSection: { select: { sectionName: true, displayName: true } },
              currentLineItem: { select: { itemLetter: true, itemName: true } }
            }
          }
        }
      });
    } catch (e) {
      if (e?.code === 'P2022' && (e?.message?.includes('lead_source_id') || String(e?.meta?.column || '').includes('lead_source_id'))) {
        console.warn('⚠️ lead_source_id missing; retrying update without leadSource and without mutating leadSourceId');
        const dataNoLeadSource = { ...updateData };
        delete dataNoLeadSource.leadSourceId;
        updatedProject = await prisma.project.update({
          where: { id: req.params.id },
          data: dataNoLeadSource,
          include: {
            customer: true,
            // leadSource omitted due to missing column
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
                  select: { id: true, firstName: true, lastName: true, email: true, role: true }
                }
              }
            },
            workflowTrackers: {
              select: {
                id: true,
                isMainWorkflow: true,
                currentPhaseId: true,
                currentSectionId: true,
                currentLineItemId: true,
                totalLineItems: true,
                currentPhase: { select: { phaseType: true, phaseName: true } },
                currentSection: { select: { sectionName: true, displayName: true } },
                currentLineItem: { select: { itemLetter: true, itemName: true } }
              }
            }
          }
        });
      } else {
        throw e;
      }
    }

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
        },
        workflowTrackers: {
          select: {
            id: true,
            isMainWorkflow: true,
            currentPhaseId: true,
            currentSectionId: true,
            currentLineItemId: true,
            totalLineItems: true,
            currentPhase: { select: { phaseType: true, phaseName: true } }
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

// Add team member to project
router.post('/:id/team-members', asyncHandler(async (req, res, next) => {
  const { userId, role } = req.body;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  try {
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if team member already exists
    const existingMember = await prisma.projectTeamMember.findFirst({
      where: {
        projectId: req.params.id,
        userId: userId
      }
    });

    if (existingMember) {
      return sendSuccess(res, 200, existingMember, 'Team member already exists');
    }

    // Create team member
    const teamMember = await prisma.projectTeamMember.create({
      data: {
        projectId: req.params.id,
        userId: userId,
        role: role || 'TEAM_MEMBER'
      },
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
    });

    sendSuccess(res, 201, teamMember, 'Team member added successfully');
  } catch (error) {
    console.error('Error adding team member:', error);
    return next(new AppError('Failed to add team member', 500));
  }
}));

module.exports = router;