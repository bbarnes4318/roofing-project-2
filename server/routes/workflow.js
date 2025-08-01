const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler, 
  AppError, 
  formatValidationErrors 
} = require('../middleware/errorHandler');

const router = express.Router();

console.log('🔧 WORKFLOW ROUTES: Loading workflow routes module');

// **CRITICAL: Data transformation for frontend compatibility**
const transformWorkflowForFrontend = (workflow) => {
  if (!workflow) return null;
  
  return {
    id: workflow.id,
    _id: workflow.id,
    project: workflow.projectId,
    projectId: workflow.projectId,
    status: workflow.status,
    overallProgress: workflow.overallProgress,
    currentStepIndex: workflow.currentStepIndex,
    workflowStartDate: workflow.workflowStartDate,
    workflowEndDate: workflow.workflowEndDate,
    estimatedCompletionDate: workflow.estimatedCompletionDate,
    actualCompletionDate: workflow.actualCompletionDate,
    enableAlerts: workflow.enableAlerts,
    alertMethods: workflow.alertMethods,
    escalationEnabled: workflow.escalationEnabled,
    escalationDelayDays: workflow.escalationDelayDays,
    teamAssignments: workflow.teamAssignments,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    steps: workflow.steps ? workflow.steps.map(step => ({
      id: step.id,
      _id: step.id,
      stepId: step.stepId,
      stepName: step.stepName,
      description: step.description,
      phase: step.phase,
      defaultResponsible: step.defaultResponsible,
      estimatedDuration: step.estimatedDuration,
      scheduledStartDate: step.scheduledStartDate,
      scheduledEndDate: step.scheduledEndDate,
      actualStartDate: step.actualStartDate,
      actualEndDate: step.actualEndDate,
      isCompleted: step.isCompleted,
      completed: step.isCompleted, // Alias for compatibility
      completedAt: step.completedAt,
      assignedTo: step.assignedToId,
      assignedToId: step.assignedToId,
      alertPriority: step.alertPriority,
      alertDays: step.alertDays,
      overdueIntervals: step.overdueIntervals,
      notes: step.notes,
      completionNotes: step.completionNotes,
      dependencies: step.dependencies,
      subTasks: step.subTasks ? step.subTasks.map(subTask => ({
        id: subTask.id,
        _id: subTask.id,
        subTaskId: subTask.subTaskId,
        subTaskName: subTask.subTaskName,
        description: subTask.description,
        isCompleted: subTask.isCompleted,
        completedAt: subTask.completedAt,
        completedById: subTask.completedById,
        notes: subTask.notes
      })) : []
    })) : []
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

// @desc    Get workflow for a project
// @route   GET /api/workflows/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  console.log(`🔍 WORKFLOW: Fetching workflow for projectId: ${projectId}`);
  // Force server reload
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
      console.log(`🔍 WORKFLOW: Project not found, returning mock workflow`);
      // Return mock workflow for compatibility
      const mockWorkflow = {
        project: projectId,
        projectId: projectId,
        steps: [],
        completedSteps: [],
        progress: 0,
        overallProgress: 0,
        currentStepIndex: 0,
        status: 'NOT_STARTED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return res.status(200).json({
        success: true,
        data: mockWorkflow,
        message: 'Workflow retrieved successfully'
      });
    }
    
    // Get workflow for the project
    const workflow = await prisma.projectWorkflow.findUnique({
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
      console.log(`🔍 WORKFLOW: No workflow found for project, returning mock`);
      // Return mock workflow structure
      const mockWorkflow = {
        project: project.id,
        projectId: project.id,
        steps: [],
        completedSteps: [],
        progress: 0,
        overallProgress: 0,
        currentStepIndex: 0,
        status: 'NOT_STARTED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return res.status(200).json({
        success: true,
        data: mockWorkflow,
        message: 'Workflow retrieved successfully'
      });
    }
    
    // Transform workflow for frontend compatibility
    const transformedWorkflow = transformWorkflowForFrontend(workflow);
    
    console.log(`✅ WORKFLOW: Found workflow with ${workflow.steps?.length || 0} steps`);
    
    return res.status(200).json({
      success: true,
      data: transformedWorkflow,
      message: 'Workflow retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error fetching workflow:', error);
    
    // Return mock workflow on error to prevent frontend crashes
    const mockWorkflow = {
      project: projectId,
      projectId: projectId,
      steps: [],
      completedSteps: [],
      progress: 0,
      overallProgress: 0,
      currentStepIndex: 0,
      status: 'NOT_STARTED',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    res.status(200).json({
      success: true,
      data: mockWorkflow,
      message: 'Workflow retrieved successfully'
    });
  }
}));

// @desc    Complete a workflow step
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
      
      // CRITICAL: Generate alert for the newly activated step
      const WorkflowAlertService = require('../services/WorkflowAlertService');
      
      // Create immediate alert for the next step
      const alertInfo = {
        step: nextStep,
        alertType: 'urgent', // New steps are urgent by default
        daysUntilDue: nextStep.scheduledEndDate ? 
          Math.ceil((new Date(nextStep.scheduledEndDate) - new Date()) / (1000 * 60 * 60 * 24)) : 1,
        daysOverdue: 0
      };
      
      // Get recipients for the alert
      const recipients = await WorkflowAlertService.getAlertRecipients(workflow, nextStep, 'urgent');
      
      // Create alerts for each recipient
      for (const recipient of recipients) {
        await WorkflowAlertService.createWorkflowAlert(
          workflow,
          nextStep,
          recipient,
          'urgent',
          alertInfo.daysUntilDue,
          0
        );
      }
      
      console.log(`📨 WORKFLOW: Generated alerts for next step to ${recipients.length} recipients`);
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
          isCompleted: completed,
          completedAt: completed ? new Date() : null,
          scheduledStartDate: new Date(),
          scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          alertPriority: 'MEDIUM',
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

module.exports = router; 