/**
 * Workflow Updates API Route
 * Handles updating workflow steps and automatic phase progression
 */

const express = require('express');
const router = express.Router();
const { prisma } = require('../config/prisma');
const WorkflowUpdateService = require('../services/workflowUpdateService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @route   PUT /api/workflow-updates/:projectId/steps/:stepId
 * @desc    Update a workflow step completion status
 * @access  Private
 */
router.put('/:projectId/steps/:stepId', asyncHandler(async (req, res) => {
    const { projectId, stepId } = req.params;
    const { isCompleted } = req.body;

    console.log(`📝 Updating workflow step ${stepId} for project ${projectId}`);

    if (typeof isCompleted !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'isCompleted must be a boolean value'
        });
    }

    try {
        // Update the workflow step and recalculate phase
        const updatedProject = await WorkflowUpdateService.updateWorkflowStep(
            projectId,
            stepId,
            isCompleted
        );

        // Get the updated workflow data
        const workflow = await prisma.workflow.findFirst({
            where: { projectId },
            include: {
                steps: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        // Return the updated project with workflow
        res.json({
            success: true,
            message: `Workflow step ${isCompleted ? 'completed' : 'unchecked'}`,
            data: {
                project: updatedProject,
                workflow: workflow,
                phase: updatedProject.phase,
                progress: updatedProject.progress
            }
        });

    } catch (error) {
        console.error('❌ Error updating workflow step:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update workflow step',
            error: error.message
        });
    }
}));

/**
 * @route   POST /api/workflow-updates/:projectId/bulk-update
 * @desc    Update multiple workflow steps at once
 * @access  Private
 */
router.post('/:projectId/bulk-update', asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { updates } = req.body; // Array of { stepId, isCompleted }

    if (!Array.isArray(updates)) {
        return res.status(400).json({
            success: false,
            message: 'Updates must be an array'
        });
    }

    try {
        // Update each step
        for (const update of updates) {
            await prisma.workflowStep.update({
                where: { id: update.stepId },
                data: {
                    isCompleted: update.isCompleted,
                    completedAt: update.isCompleted ? new Date() : null
                }
            });
        }

        // Recalculate phase and progress
        const newPhase = await WorkflowUpdateService.calculateCurrentPhase(projectId);
        const newProgress = await WorkflowUpdateService.calculateProjectProgress(projectId);

        // Update project
        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: {
                phase: newPhase,
                progress: newProgress,
                updatedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Workflow steps updated',
            data: {
                project: updatedProject,
                phase: newPhase,
                progress: newProgress
            }
        });

    } catch (error) {
        console.error('❌ Error bulk updating workflow steps:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update workflow steps',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/workflow-updates/:projectId/phase
 * @desc    Get current phase calculation for a project
 * @access  Private
 */
router.get('/:projectId/phase', asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    try {
        const currentPhase = await WorkflowUpdateService.calculateCurrentPhase(projectId);
        const progress = await WorkflowUpdateService.calculateProjectProgress(projectId);

        res.json({
            success: true,
            data: {
                projectId,
                currentPhase,
                progress
            }
        });

    } catch (error) {
        console.error('❌ Error getting project phase:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get project phase',
            error: error.message
        });
    }
}));

module.exports = router;