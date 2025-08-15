const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler, 
  AppError, 
  formatValidationErrors 
} = require('../middleware/errorHandler');
// const { transformWorkflowStep, transformWorkflowSubTask } = require('../utils/workflowMapping'); // DEPRECATED
const WorkflowInitializationService = require('../services/workflowInitializationService');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');
const WorkflowCompletionHandler = require('../services/WorkflowCompletionHandler');

const router = express.Router();

console.log('🔧 WORKFLOW ROUTES: Loading workflow routes module');

// **CRITICAL: Data transformation for frontend compatibility**
const transformWorkflowForFrontend = async (projectId, tracker, workflowStatus) => {
  if (!tracker) return null;
  
  // Get all line items to show as "steps" for frontend compatibility
  const allLineItems = await prisma.workflowLineItem.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      section: {
        include: {
          phase: true
        }
      }
    }
  });

  // Get completed items
  const completedItems = await prisma.completedWorkflowItem.findMany({
    where: { trackerId: tracker.id },
    select: { lineItemId: true }
  });
  const completedItemIds = new Set(completedItems.map(item => item.lineItemId));

  // Transform line items to legacy step format
  const steps = allLineItems.map((item, index) => {
    const isCompleted = completedItemIds.has(item.id);
    const isCurrent = item.id === tracker.currentLineItemId;
    
    return {
      id: item.id,
      _id: item.id,
      stepId: `${item.section.sectionNumber}${item.itemLetter}`,
      stepName: item.itemName,
      name: item.itemName,
      description: item.description || item.itemName,
      phase: item.section.phase.phaseType,
      section: item.section.displayName,
      lineItem: item.itemName,
      isActive: isCurrent,
      isCompleted: isCompleted,
      completed: isCompleted,
      completedAt: isCompleted ? completedItems.find(c => c.lineItemId === item.id)?.completedAt : null,
      defaultResponsible: item.responsibleRole,
      assignedTo: null,
      assignedToId: null,
      estimatedDuration: item.estimatedMinutes || 30,
      alertPriority: 'MEDIUM',
      alertDays: item.alertDays || 1,
      notes: '',
      subTasks: []
    };
  });

  return {
    id: tracker.id,
    _id: tracker.id,
    project: projectId,
    projectId: projectId,
    status: workflowStatus?.isComplete ? 'COMPLETED' : 'IN_PROGRESS',
    overallProgress: workflowStatus?.progress || 0,
    currentStepIndex: workflowStatus?.completedItems || 0,
    workflowStartDate: tracker.createdAt,
    enableAlerts: true,
    alertMethods: ['IN_APP', 'EMAIL'],
    escalationEnabled: true,
    escalationDelayDays: 2,
    teamAssignments: {},
    createdAt: tracker.createdAt,
    updatedAt: tracker.updatedAt,
    steps: steps
  };
};

// Test endpoint to debug the issue
router.get('/test', asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { message: 'Test endpoint working' },
    message: 'Test successful'
  });
}));

// @desc    Get current workflow position (NEW DATABASE-DRIVEN)
// @route   GET /api/workflows/position/:projectId
// @access  Private
router.get('/position/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  const position = await WorkflowProgressionService.getCurrentPosition(projectId);
  
  res.status(200).json({
    success: true,
    data: position,
    message: 'Current workflow position retrieved successfully'
  });
}));

// @desc    Get workflow status (OPTIMIZED DATABASE-DRIVEN)
// @route   GET /api/workflows/status/:projectId
// @access  Private
router.get('/status/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // OPTIMIZED: Try optimized status first, fallback to original
  const status = await WorkflowProgressionService.getOptimizedWorkflowStatus(projectId) ||
                 await WorkflowProgressionService.getWorkflowStatus(projectId);
  
  res.status(200).json({
    success: true,
    data: status,
    message: 'Optimized workflow status retrieved successfully'
  });
}));

// @desc    Get complete workflow data for UI display
// @route   GET /api/workflows/data/:projectId
// @access  Private
router.get('/data/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const tracker = await WorkflowProgressionService.getCurrentPosition(projectId);
    const updatedData = await WorkflowCompletionHandler.getUpdatedWorkflowData(projectId, tracker);
    
    res.status(200).json({
      success: true,
      data: updatedData,
      message: 'Complete workflow data retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error getting workflow data:', error);
    throw new AppError('Failed to get workflow data', 500);
  }
}));

// @desc    Get workflow for a project (ENHANCED WITH NEW SYSTEM)
// @route   GET /api/workflows/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  console.log(`🔍 WORKFLOW: Fetching workflow for projectId: ${projectId}`);
  
  try {
    let project = null;
    
    // Try to find project by ID first
    try {
      project = await prisma.project.findUnique({
        where: { id: projectId }
      });
    } catch (error) {
      console.log(`🔍 WORKFLOW: ID lookup failed, trying project number`);
    }
    
    // If not found by ID, try by project number if it's numeric
    if (!project && /^\d+$/.test(projectId)) {
      console.log(`🔍 WORKFLOW: Trying to find by project number: ${projectId}`);
      project = await prisma.project.findUnique({
        where: { projectNumber: parseInt(projectId) }
      });
    }
    
    if (!project) {
      console.log(`🔍 WORKFLOW: Project not found`);
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // OPTIMIZED: Get workflow tracker and status using optimized methods
    const tracker = await WorkflowProgressionService.getCurrentPosition(project.id);
    const workflowStatus = await WorkflowProgressionService.getOptimizedWorkflowStatus(project.id) ||
                          await WorkflowProgressionService.getWorkflowStatus(project.id);
    
    // Transform to frontend-compatible format
    const transformedWorkflow = await transformWorkflowForFrontend(project.id, tracker, workflowStatus);
    
    console.log(`✅ WORKFLOW: Found workflow with ${transformedWorkflow.steps?.length || 0} steps, progress: ${workflowStatus.progress}%`);
    
    return res.status(200).json({
      success: true,
      data: transformedWorkflow,
      message: 'Workflow retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error fetching workflow:', error);
    throw new AppError('Failed to fetch workflow', 500);
  }
}));

// @desc    Complete a workflow line item (MODERNIZED)
// @route   POST /api/workflows/complete-item
// @access  Private
router.post('/complete-item', 
  [
    body('projectId').isString().withMessage('Project ID is required'),
    body('lineItemId').isString().withMessage('Line Item ID is required'),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatValidationErrors(errors)
      });
    }

    const { projectId, lineItemId, notes } = req.body;
    const userId = req.user?.id || null;

    console.log(`📝 Processing line item completion: ${lineItemId} for project ${projectId}`);

    try {
      // Use new workflow completion service
      const WorkflowCompletionService = require('../services/WorkflowCompletionService');
      const result = await WorkflowCompletionService.completeLineItem(
        projectId,
        lineItemId,
        userId,
        notes
      );

      // Generate alert for next item if workflow continues
      let nextAlert = null;
      if (result.nextItem) {
        nextAlert = await WorkflowCompletionService.generateAlertForCurrentItem(projectId);
      }

      res.status(200).json({
        success: true,
        data: {
          completed: result.completedItem,
          next: result.nextItem,
          progress: result.progress,
          alert: nextAlert
        },
        message: result.nextItem 
          ? `Line item completed. Next: ${result.nextItem.lineItemName}`
          : 'Workflow completed successfully!'
      });

    } catch (error) {
      console.error('❌ Error completing line item:', error);
      throw new AppError(error.message || 'Failed to complete line item', 500);
    }
}));

// @desc    Complete a workflow step (LEGACY - redirects to new system)
// @route   POST /api/workflows/:workflowId/steps/:stepId/complete
// @access  Private
router.post('/:workflowId/steps/:stepId/complete', asyncHandler(async (req, res) => {
  const { workflowId, stepId } = req.params;
  const { notes = '', alertId } = req.body;
  
  console.log(`🔄 WORKFLOW: Completing step ${stepId} in workflow ${workflowId}`);
  
  try {
    // Find the workflow with project info
    const workflow = await prisma.projectWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        project: true,
        steps: {
          include: {
            subTasks: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }
    
    // Find the specific step
    const step = workflow.steps.find(s => s.id === stepId || s.stepId === stepId);
    
    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Workflow step not found'
      });
    }
    
    // CRITICAL FIX: Mark the completed step's alert as dismissed FIRST
    if (alertId) {
      try {
        await prisma.workflowAlert.updateMany({
          where: { 
            OR: [
              { id: alertId },
              { AND: [
                { projectId: workflow.project.id },
                { stepId: step.id },
                { status: 'ACTIVE' }
              ]}
            ]
          },
          data: { 
            status: 'COMPLETED',
            isRead: true,
            completedAt: new Date()
          }
        });
        console.log(`✅ WORKFLOW: Marked alert ${alertId} as completed`);
      } catch (alertError) {
        console.error('❌ WORKFLOW: Error updating alert status:', alertError);
      }
    }

    // Update the step to completed
    const updatedStep = await prisma.workflowStep.update({
      where: { id: step.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completionNotes: notes,
        actualEndDate: new Date()
      }
    });
    
    // Mark all subtasks as completed
    if (step.subTasks && step.subTasks.length > 0) {
      await prisma.workflowSubTask.updateMany({
        where: { stepId: step.id },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      });
    }
    
    // Calculate new progress
    const allSteps = await prisma.workflowStep.findMany({
      where: { workflowId: workflowId },
      orderBy: { createdAt: 'asc' }
    });
    
    const completedSteps = allSteps.filter(s => s.isCompleted);
    const newProgress = allSteps.length > 0 ? Math.round((completedSteps.length / allSteps.length) * 100) : 0;
    
    // Update workflow progress and status
    const workflowStatus = newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
    await prisma.projectWorkflow.update({
      where: { id: workflowId },
      data: {
        overallProgress: newProgress,
        currentStepIndex: completedSteps.length,
        status: workflowStatus,
        actualCompletionDate: workflowStatus === 'COMPLETED' ? new Date() : null
      }
    });
    
    // Update project progress
    await prisma.project.update({
      where: { id: workflow.projectId },
      data: {
        progress: newProgress,
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'
      }
    });
    
    // CRITICAL: Find and activate the next sequential step
    const nextStep = allSteps.find((s, index) => {
      // Find the first uncompleted step after the current step
      const currentStepIndex = allSteps.findIndex(as => as.id === step.id);
      return index > currentStepIndex && !s.isCompleted;
    });
    
    if (nextStep) {
      console.log(`🔄 WORKFLOW: Activating next step: ${nextStep.stepName} (${nextStep.stepId})`);
      
      // Mark the next step as active by setting its start date
      await prisma.workflowStep.update({
        where: { id: nextStep.id },
        data: {
          actualStartDate: new Date()
        }
      });
      
      // CRITICAL FIX: Use WorkflowUpdateService to properly generate alerts
      const WorkflowUpdateService = require('../services/workflowUpdateService');
      try {
        await WorkflowUpdateService.generateNextStepAlerts(workflow.project.id);
        console.log(`📨 WORKFLOW: Generated new alerts for remaining steps`);
      } catch (alertError) {
        console.error('❌ WORKFLOW: Error generating new step alerts:', alertError);
      }
    }
    
    // ENHANCED: Generate project messages for step completion
    try {
      const ProjectMessageService = require('../services/ProjectMessageService');
      const messages = await ProjectMessageService.onWorkflowStepCompletion(updatedStep, workflow.project);
      console.log(`📨 WORKFLOW: Generated ${messages.length} project messages for step completion`);
    } catch (messageError) {
      console.error('⚠️ WORKFLOW: Error generating project messages:', messageError);
      // Don't fail the workflow completion if message generation fails
    }
    
    console.log(`✅ WORKFLOW: Step completed, new progress: ${newProgress}%`);
    
    res.status(200).json({
      success: true,
      data: {
        step: updatedStep,
        workflow: { id: workflowId, overallProgress: newProgress },
        newProgress,
        nextStep: nextStep ? {
          id: nextStep.id,
          stepId: nextStep.stepId,
          stepName: nextStep.stepName,
          phase: nextStep.phase
        } : null
      },
      message: 'Workflow step completed successfully'
    });
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error completing step:', error);
    throw new AppError('Failed to complete workflow step', 500);
  }
}));

// @desc    Complete a workflow subtask
// @route   POST /api/workflows/:workflowId/steps/:stepId/subtasks/:subTaskId/complete
// @access  Private
router.post('/:workflowId/steps/:stepId/subtasks/:subTaskId/complete', asyncHandler(async (req, res) => {
  const { workflowId, stepId, subTaskId } = req.params;
  const { notes = '' } = req.body;
  
  console.log(`🔄 WORKFLOW: Completing subtask ${subTaskId} in step ${stepId}`);
  
  try {
    // Find the subtask with step and workflow info
    const subTask = await prisma.workflowSubTask.findFirst({
      where: {
        AND: [
          { step: { workflowId: workflowId } },
          { step: { id: stepId } },
          { id: subTaskId }
        ]
      },
      include: {
        step: true
      }
    });
    
    if (!subTask) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found'
      });
    }
    
    // Update the subtask
    const updatedSubTask = await prisma.workflowSubTask.update({
      where: { id: subTask.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        notes: notes
      }
    });
    
    // Check if all subtasks in this step are completed
    const allSubTasks = await prisma.workflowSubTask.findMany({
      where: { stepId: stepId }
    });
    
    const allCompleted = allSubTasks.every(st => st.isCompleted);
    
    console.log(`✅ WORKFLOW: Subtask completed. All subtasks completed: ${allCompleted}`);
    
    // If all subtasks are completed and the parent step is not completed, auto-complete it
    if (allCompleted && !subTask.step.isCompleted) {
      console.log(`🔄 WORKFLOW: All subtasks completed, auto-completing parent step`);
      
      // Use the existing step completion logic
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/workflows/${workflowId}/steps/${stepId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify({
          notes: `Auto-completed: All subtasks finished`
        })
      });
      
      const stepCompletionResult = await response.json();
      
      res.status(200).json({
        success: true,
        data: { 
          subTask: updatedSubTask,
          stepCompleted: true,
          stepCompletionResult: stepCompletionResult.data
        },
        message: 'Subtask completed and parent step auto-completed'
      });
    } else {
      res.status(200).json({
        success: true,
        data: { 
          subTask: updatedSubTask,
          stepCompleted: false
        },
        message: 'Subtask completed successfully'
      });
    }
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error completing subtask:', error);
    throw new AppError('Failed to complete subtask', 500);
  }
}));

// @desc    Update workflow step
// @route   PUT /api/workflows/project/:projectId/workflow/:stepId
// @access  Private
router.put('/project/:projectId/workflow/:stepId', asyncHandler(async (req, res) => {
  const { projectId, stepId } = req.params;
  const { completed } = req.body;
  
  console.log(`🔄 WORKFLOW: Updating step ${stepId} for project ${projectId} - completed: ${completed}`);
  
  try {
    // Find project
    let project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project && /^\d+$/.test(projectId)) {
      project = await prisma.project.findUnique({
        where: { projectNumber: parseInt(projectId) }
      });
    }
    
    if (!project) {
      console.log(`❌ WORKFLOW: Project not found: ${projectId}`);
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Get or create workflow for the project
    let workflow = await prisma.projectWorkflow.findUnique({
      where: { projectId: project.id },
      include: {
        steps: {
          include: {
            subTasks: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (!workflow) {
      console.log(`🔄 WORKFLOW: Creating new workflow for project ${project.id}`);
      // Create workflow if it doesn't exist
      workflow = await prisma.projectWorkflow.create({
        data: {
          projectId: project.id,
          status: 'IN_PROGRESS',
          overallProgress: 0,
          currentStepIndex: 0,
          enableAlerts: true,
          alertMethods: ['EMAIL'],
          escalationEnabled: false,
          escalationDelayDays: 3
        },
        include: {
          steps: {
            include: {
              subTasks: true
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });
    }
    
    // Find or create the workflow step
    let step = workflow.steps.find(s => 
      s.id === stepId || 
      s.stepId === stepId || 
      s.stepName === stepId
    );
    
    if (!step) {
      console.log(`🔄 WORKFLOW: Creating new step ${stepId}`);
      // Create new step if it doesn't exist
      step = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          stepId: stepId,
          stepName: stepId,
          description: `Custom workflow step: ${stepId}`,
          phase: 'LEAD',
          defaultResponsible: 'OFFICE',
          estimatedDuration: 1,
          stepOrder: 1,
          isCompleted: completed,
          completedAt: completed ? new Date() : null,
          scheduledStartDate: new Date(),
          scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          alertPriority: 'LOW',
          alertDays: 1
        }
      });
    } else {
      console.log(`🔄 WORKFLOW: Updating existing step ${step.id}`);
      // Update existing step
      step = await prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          isCompleted: completed,
          completedAt: completed ? new Date() : null,
          actualEndDate: completed ? new Date() : null
        }
      });
    }
    
    // Calculate new progress
    const allSteps = await prisma.workflowStep.findMany({
      where: { workflowId: workflow.id },
      orderBy: { createdAt: 'asc' }
    });
    
    const completedSteps = allSteps.filter(s => s.isCompleted);
    const newProgress = allSteps.length > 0 ? Math.round((completedSteps.length / allSteps.length) * 100) : 0;
    
    // Update workflow progress
    const workflowStatus = newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
    await prisma.projectWorkflow.update({
      where: { id: workflow.id },
      data: {
        overallProgress: newProgress,
        currentStepIndex: completedSteps.length,
        status: workflowStatus,
        actualCompletionDate: workflowStatus === 'COMPLETED' ? new Date() : null
      }
    });
    
    // Update project progress
    await prisma.project.update({
      where: { id: project.id },
      data: {
        progress: newProgress,
        status: workflowStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'
      }
    });
    
    console.log(`✅ WORKFLOW: Step ${stepId} updated successfully - completed: ${completed}, progress: ${newProgress}%`);
    
    res.status(200).json({
      success: true,
      data: {
        step: {
          id: step.id,
          stepId: step.stepId,
          stepName: step.stepName,
          isCompleted: step.isCompleted,
          completedAt: step.completedAt
        },
        workflow: {
          id: workflow.id,
          overallProgress: newProgress,
          status: workflowStatus
        },
        project: {
          id: project.id,
          progress: newProgress
        }
      },
      message: 'Workflow step updated successfully'
    });
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error updating workflow step:', error);
    console.error('❌ WORKFLOW: Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new AppError(`Failed to update workflow step: ${error.message}`, 500);
  }
}));

// @desc    Get workflow progress summary
// @route   GET /api/workflows/project/:projectId/progress
// @access  Private
router.get('/project/:projectId/progress', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  try {
    // Find project
    let project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project && /^\d+$/.test(projectId)) {
      project = await prisma.project.findUnique({
        where: { projectNumber: parseInt(projectId) }
      });
    }
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Get workflow with steps
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
    
    if (!workflow) {
      return res.status(200).json({
        success: true,
        data: {
          project: project.id,
          overallProgress: 0,
          totalSteps: 0,
          completedSteps: 0,
          currentPhase: 'Lead'
        },
        message: 'No workflow found'
      });
    }
    
    const completedSteps = workflow.steps.filter(step => step.isCompleted);
    const currentStep = workflow.steps.find(step => !step.isCompleted);
    
    const progressSummary = {
      project: project.id,
      overallProgress: workflow.overallProgress,
      totalSteps: workflow.steps.length,
      completedSteps: completedSteps.length,
      currentPhase: currentStep?.phase || 'Completion',
      currentStep: currentStep ? {
        stepId: currentStep.stepId,
        stepName: currentStep.stepName,
        phase: currentStep.phase
      } : null
    };
    
    res.status(200).json({
      success: true,
      data: progressSummary,
      message: 'Workflow progress retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error fetching progress:', error);
    throw new AppError('Failed to fetch workflow progress', 500);
  }
}));

// @desc    Get all workflow line items (ADMIN ONLY)
// @route   GET /api/workflows/line-items
// @access  Private (Admin)
router.get('/line-items', asyncHandler(async (req, res) => {
  console.log('🔍 WORKFLOW: Fetching all line items for admin management');
  
  try {
    const lineItems = await prisma.workflowLineItem.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        section: {
          include: {
            phase: {
              select: {
                id: true,
                phaseType: true,
                phaseName: true
              }
            }
          }
        }
      }
    });
    
    const formattedItems = lineItems.map(item => ({
      id: item.id,
      itemLetter: item.itemLetter,
      itemName: item.itemName,
      responsibleRole: item.responsibleRole,
      displayOrder: item.displayOrder,
      description: item.description,
      estimatedMinutes: item.estimatedMinutes,
      alertDays: item.alertDays,
      section: {
        id: item.section.id,
        displayName: item.section.displayName,
        sectionNumber: item.section.sectionNumber
      },
      phase: {
        id: item.section.phase.id,
        phaseType: item.section.phase.phaseType,
        phaseName: item.section.phase.phaseName
      }
    }));
    
    console.log(`✅ WORKFLOW: Retrieved ${formattedItems.length} line items`);
    
    res.status(200).json({
      success: true,
      data: formattedItems,
      message: 'Line items retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error fetching line items:', error);
    throw new AppError('Failed to fetch line items', 500);
  }
}));

// @desc    Update workflow line item name (ADMIN ONLY)
// @route   PUT /api/workflows/line-items/:id
// @access  Private (Admin)
router.put('/line-items/:id', 
  [
    body('itemName').isString().isLength({ min: 1, max: 500 }).withMessage('Item name must be between 1 and 500 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatValidationErrors(errors)
      });
    }

    const { id } = req.params;
    const { itemName } = req.body;
    
    console.log(`📝 WORKFLOW: Updating line item ${id} name to: "${itemName}"`);
    
    try {
      // Check if line item exists
      const existingItem = await prisma.workflowLineItem.findUnique({
        where: { id },
        include: {
          section: {
            include: { phase: true }
          }
        }
      });
      
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Line item not found'
        });
      }
      
      // Update the line item name
      const updatedItem = await prisma.workflowLineItem.update({
        where: { id },
        data: { 
          itemName,
          updatedAt: new Date()
        },
        include: {
          section: {
            include: { phase: true }
          }
        }
      });
      
      console.log(`✅ WORKFLOW: Successfully updated line item ${id} name`);
      
      res.status(200).json({
        success: true,
        data: {
          id: updatedItem.id,
          itemLetter: updatedItem.itemLetter,
          itemName: updatedItem.itemName,
          oldName: existingItem.itemName,
          section: updatedItem.section.displayName,
          phase: updatedItem.section.phase.phaseName
        },
        message: 'Line item updated successfully'
      });
      
    } catch (error) {
      console.error('❌ WORKFLOW: Error updating line item:', error);
      throw new AppError('Failed to update line item', 500);
    }
}));

// @desc    Bulk update workflow line items (ADMIN ONLY)
// @route   PUT /api/workflows/line-items/bulk
// @access  Private (Admin)
router.put('/line-items/bulk', 
  [
    body('updates').isArray({ min: 1 }).withMessage('Updates array is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatValidationErrors(errors)
      });
    }

    const { updates } = req.body;
    
    // Manual validation for nested array items
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and must not be empty'
      });
    }
    
    // Validate each update item
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      if (!update.id || typeof update.id !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Update item ${i + 1}: ID is required and must be a string`
        });
      }
      if (!update.itemName || typeof update.itemName !== 'string' || update.itemName.length === 0 || update.itemName.length > 500) {
        return res.status(400).json({
          success: false,
          message: `Update item ${i + 1}: itemName must be a string between 1 and 500 characters`
        });
      }
    }
    
    console.log(`📝 WORKFLOW: Bulk updating ${updates.length} line items`);
    
    try {
      const results = [];
      const errors = [];
      
      // Process each update in a transaction for safety
      await prisma.$transaction(async (tx) => {
        for (const update of updates) {
          try {
            // Check if line item exists
            const existingItem = await tx.workflowLineItem.findUnique({
              where: { id: update.id },
              select: { id: true, itemName: true }
            });
            
            if (!existingItem) {
              errors.push({ id: update.id, error: 'Line item not found' });
              continue;
            }
            
            // Update the line item
            const updatedItem = await tx.workflowLineItem.update({
              where: { id: update.id },
              data: { 
                itemName: update.itemName,
                updatedAt: new Date()
              },
              select: {
                id: true,
                itemName: true,
                itemLetter: true
              }
            });
            
            results.push({
              id: updatedItem.id,
              itemLetter: updatedItem.itemLetter,
              oldName: existingItem.itemName,
              newName: updatedItem.itemName
            });
            
          } catch (itemError) {
            console.error(`❌ Error updating item ${update.id}:`, itemError);
            errors.push({ id: update.id, error: itemError.message });
          }
        }
      });
      
      console.log(`✅ WORKFLOW: Bulk update completed - ${results.length} successful, ${errors.length} errors`);
      
      res.status(200).json({
        success: true,
        data: {
          updated: results,
          errors: errors,
          summary: {
            total: updates.length,
            successful: results.length,
            failed: errors.length
          }
        },
        message: `Bulk update completed - ${results.length} items updated successfully`
      });
      
    } catch (error) {
      console.error('❌ WORKFLOW: Error in bulk update:', error);
      throw new AppError('Failed to perform bulk update', 500);
    }
}));

module.exports = router; 