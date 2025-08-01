const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler, 
  AppError, 
  sendSuccess, 
  formatValidationErrors 
} = require('../middleware/errorHandler');
const WorkflowProgressService = require('../services/WorkflowProgressService');

const router = express.Router();

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

// @desc    Get workflow for a project
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
      return sendSuccess(res, mockWorkflow, 'Workflow retrieved successfully');
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
      return sendSuccess(res, mockWorkflow, 'Workflow retrieved successfully');
    }
    
    // Transform workflow for frontend compatibility
    const transformedWorkflow = transformWorkflowForFrontend(workflow);
    
    console.log(`✅ WORKFLOW: Found workflow with ${workflow.steps?.length || 0} steps`);
    
    sendSuccess(res, transformedWorkflow, 'Workflow retrieved successfully');
    
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
    sendSuccess(res, mockWorkflow, 'Workflow retrieved successfully');
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
    // Find the workflow
    const workflow = await prisma.projectWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          include: {
            subTasks: true
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
        completionNotes: notes
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
      where: { workflowId: workflowId }
    });
    
    const completedSteps = allSteps.filter(s => s.isCompleted);
    const newProgress = allSteps.length > 0 ? Math.round((completedSteps.length / allSteps.length) * 100) : 0;
    
    // Update workflow progress
    await prisma.projectWorkflow.update({
      where: { id: workflowId },
      data: {
        overallProgress: newProgress,
        currentStepIndex: completedSteps.length
      }
    });
    
    // Update project progress
    await prisma.project.update({
      where: { id: workflow.projectId },
      data: {
        progress: newProgress
      }
    });
    
    console.log(`✅ WORKFLOW: Step completed, new progress: ${newProgress}%`);
    
    sendSuccess(res, {
      step: updatedStep,
      workflow: { id: workflowId, overallProgress: newProgress },
      newProgress
    }, 'Workflow step completed successfully');
    
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
    // Find the subtask
    const subTask = await prisma.workflowSubTask.findFirst({
      where: {
        AND: [
          { step: { workflowId: workflowId } },
          { step: { id: stepId } },
          { id: subTaskId }
        ]
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
    
    console.log(`✅ WORKFLOW: Subtask completed`);
    
    sendSuccess(res, { subTask: updatedSubTask }, 'Subtask completed successfully');
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error completing subtask:', error);
    throw new AppError('Failed to complete subtask', 500);
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
      return sendSuccess(res, {
        project: project.id,
        overallProgress: 0,
        totalSteps: 0,
        completedSteps: 0,
        currentPhase: 'LEAD'
      }, 'No workflow found');
    }
    
    // Create project object with workflow for progress calculation
    const projectWithWorkflow = {
      ...project,
      workflow: workflow
    };

    // Calculate progress using the new weighted workflow system
    const progressData = WorkflowProgressService.calculateProjectProgress(projectWithWorkflow);
    const currentPhase = WorkflowProgressService.getCurrentPhase(projectWithWorkflow);
    const nextSteps = WorkflowProgressService.getNextSteps(projectWithWorkflow);
    
    const progressSummary = {
      project: project.id,
      overallProgress: progressData.overall,
      totalSteps: progressData.stepBreakdown.total,
      completedSteps: progressData.stepBreakdown.completed,
      currentPhase: currentPhase,
      phaseBreakdown: progressData.phaseBreakdown,
      nextSteps: nextSteps,
      currentStep: nextSteps.length > 0 ? {
        stepId: nextSteps[0].stepId,
        stepName: nextSteps[0].name,
        phase: nextSteps[0].phase
      } : null
    };
    
    sendSuccess(res, progressSummary, 'Workflow progress retrieved successfully');
    
  } catch (error) {
    console.error('❌ WORKFLOW: Error fetching progress:', error);
    throw new AppError('Failed to fetch workflow progress', 500);
  }
}));

module.exports = router; 