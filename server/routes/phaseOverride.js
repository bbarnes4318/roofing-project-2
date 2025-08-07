const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler, 
  AppError, 
  formatValidationErrors 
} = require('../middleware/errorHandler');

const router = express.Router();

console.log('🔧 PHASE OVERRIDE ROUTES: Loading phase override routes module');

// Helper function to create auto-log message for conversation feed
const createAutoLogMessage = (fromPhase, toPhase, userName, projectName, timestamp) => {
  return `[${userName}] manually updated the project phase from ${fromPhase} to ${toPhase} for project "${projectName}" on ${timestamp}.`;
};

// Helper function to get phases that should be suppressed (all phases between fromPhase and toPhase)
const getPhasesBetween = (fromPhase, toPhase) => {
  const phaseOrder = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'];
  
  const fromIndex = phaseOrder.indexOf(fromPhase);
  const toIndex = phaseOrder.indexOf(toPhase);
  
  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return [];
  }
  
  // Return all phases between fromPhase and toPhase (exclusive)
  return phaseOrder.slice(fromIndex + 1, toIndex);
};

// Helper function to create conversation log message for phase override
const createPhaseOverrideLogMessage = async (project, override, autoLogMessage) => {
  try {
    // First, find or create a conversation for this project
    let conversation = await prisma.conversation.findFirst({
      where: {
        type: 'PROJECT',
        // Use participants to identify project conversations
        participants: {
          some: {
            userId: override.overriddenById
          }
        }
      }
    });

    // If no conversation exists, create one for the project
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: 'PROJECT',
          title: `Project Discussion - ${project.projectName || project.name || 'Unnamed Project'}`,
          participants: {
            create: {
              userId: override.overriddenById,
              role: 'MEMBER'
            }
          }
        }
      });
    }

    // Create a system message in the conversation
    await prisma.message.create({
      data: {
        text: autoLogMessage,
        messageType: 'SYSTEM',
        conversationId: conversation.id,
        senderId: override.overriddenById,
        systemData: {
          type: 'phase_override',
          overrideId: override.id,
          fromPhase: override.fromPhase,
          toPhase: override.toPhase,
          projectId: project.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log(`📝 PHASE OVERRIDE: Created conversation log message for project ${project.id}`);
  } catch (error) {
    // Don't fail the override if logging fails, just log the error
    console.error('❌ PHASE OVERRIDE: Failed to create conversation log message:', error);
    console.error('❌ PHASE OVERRIDE: Error details:', error.message);
  }
};

// @desc    Get available phases for override
// @route   GET /api/phase-override/phases
// @access  Private
router.get('/phases', asyncHandler(async (req, res) => {
  const availablePhases = [
    { value: 'LEAD', label: '🟨 Lead Phase', description: 'Customer information input, property evaluation, PM assignment' },
    { value: 'PROSPECT', label: '🟧 Prospect Phase', description: 'Site inspection, estimate preparation, insurance processing' },
    { value: 'APPROVED', label: '🟩 Approved Phase', description: 'Material ordering, permit processing, production preparation' },
    { value: 'EXECUTION', label: '🔧 Execution Phase', description: 'Field installation, progress monitoring, quality assurance' },
    { value: 'SECOND_SUPPLEMENT', label: '🌀 2nd Supplement Phase', description: 'Insurance supplement creation, follow-up, customer updates' },
    { value: 'COMPLETION', label: '🏁 Completion Phase', description: 'Final inspection, financial processing, warranty registration' }
  ];

  res.status(200).json({
    success: true,
    data: availablePhases,
    message: 'Available phases retrieved successfully'
  });
}));

// @desc    Get current phase and override history for a project
// @route   GET /api/phase-override/project/:projectId/status
// @access  Private
router.get('/project/:projectId/status', asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  try {
    // Find project
    let project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    if (!project && /^\d+$/.test(projectId)) {
      project = await prisma.project.findUnique({
        where: { projectNumber: parseInt(projectId) },
        include: {
          workflow: {
            include: {
              steps: {
                orderBy: { createdAt: 'asc' }
              }
            }
          }
        }
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get override history
    const overrideHistory = await prisma.projectPhaseOverride.findMany({
      where: { projectId: project.id },
      include: {
        overriddenBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Determine current phase
    let currentPhase = 'LEAD'; // Default
    if (project.workflow && project.workflow.steps.length > 0) {
      // Find the most recent active step to determine current phase
      const activeStep = project.workflow.steps.find(step => !step.isCompleted);
      if (activeStep) {
        currentPhase = activeStep.phase;
      } else {
        // All steps completed - project is in completion phase
        currentPhase = 'COMPLETION';
      }
    }

    // Check for active overrides
    const activeOverride = await prisma.projectPhaseOverride.findFirst({
      where: { 
        projectId: project.id,
        isActive: true 
      },
      include: {
        overriddenBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: {
        projectId: project.id,
        projectName: project.projectName || project.name,
        currentPhase: activeOverride ? activeOverride.toPhase : currentPhase,
        hasActiveOverride: !!activeOverride,
        activeOverride: activeOverride,
        overrideHistory: overrideHistory
      },
      message: 'Project phase status retrieved successfully'
    });

  } catch (error) {
    console.error('❌ PHASE OVERRIDE: Error fetching project status:', error);
    throw new AppError('Failed to fetch project phase status', 500);
  }
}));

// @desc    Override project phase
// @route   POST /api/phase-override/project/:projectId/override
// @access  Private
router.post('/project/:projectId/override', [
  body('toPhase').isIn(['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'])
    .withMessage('Invalid target phase'),
  body('reason').optional().isLength({ max: 500 })
    .withMessage('Reason must be 500 characters or less'),
  body('userId').notEmpty()
    .withMessage('User ID is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: formatValidationErrors(errors.array())
    });
  }

  const { projectId } = req.params;
  const { toPhase, reason, userId } = req.body;

  try {
    // Find project with workflow
    let project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        customer: true
      }
    });

    if (!project && /^\d+$/.test(projectId)) {
      project = await prisma.project.findUnique({
        where: { projectNumber: parseInt(projectId) },
        include: {
          workflow: {
            include: {
              steps: {
                orderBy: { createdAt: 'asc' }
              }
            }
          },
          customer: true
        }
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.workflow) {
      return res.status(400).json({
        success: false,
        message: 'Project workflow not found'
      });
    }

    // Find user performing the override
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine current phase
    let currentPhase = 'LEAD'; // Default
    if (project.workflow.steps.length > 0) {
      const activeStep = project.workflow.steps.find(step => !step.isCompleted);
      if (activeStep) {
        currentPhase = activeStep.phase;
      } else {
        currentPhase = 'COMPLETION';
      }
    }

    // Check if there's already an active override
    const existingOverride = await prisma.projectPhaseOverride.findFirst({
      where: { 
        projectId: project.id,
        isActive: true 
      }
    });

    if (existingOverride) {
      currentPhase = existingOverride.toPhase;
    }

    // Check if we're already in the target phase
    if (currentPhase === toPhase) {
      return res.status(400).json({
        success: false,
        message: `Project is already in ${toPhase} phase`
      });
    }

    // Deactivate any existing active overrides
    if (existingOverride) {
      await prisma.projectPhaseOverride.update({
        where: { id: existingOverride.id },
        data: { isActive: false }
      });
    }

    // Create auto-log message
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const projectName = project.projectName || project.name || `Project #${project.projectNumber}`;
    const timestamp = new Date().toLocaleString();
    const autoLogMessage = createAutoLogMessage(currentPhase, toPhase, userName, projectName, timestamp);

    // Determine phases to suppress alerts for (all skipped phases)
    const suppressAlertsFor = getPhasesBetween(currentPhase, toPhase);

    // Create the phase override record
    const override = await prisma.projectPhaseOverride.create({
      data: {
        projectId: project.id,
        workflowId: project.workflow.id,
        fromPhase: currentPhase,
        toPhase: toPhase,
        overriddenById: userId,
        reason: reason || `Manual phase override to ${toPhase}`,
        suppressAlertsFor: suppressAlertsFor,
        autoLogMessage: autoLogMessage,
        isActive: true
      },
      include: {
        overriddenBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Update project phase if it has one
    await prisma.project.update({
      where: { id: project.id },
      data: {
        phase: toPhase
      }
    });

    // Create automatic conversation message for logging
    await createPhaseOverrideLogMessage(project, override, autoLogMessage);

    console.log(`✅ PHASE OVERRIDE: Successfully overrode project ${project.id} from ${currentPhase} to ${toPhase}`);
    console.log(`📝 PHASE OVERRIDE: Suppressing alerts for phases: ${suppressAlertsFor.join(', ')}`);

    // Emit real-time update via Socket.io
    try {
      const io = req.app.get('socketio');
      if (io) {
        io.to(`project_${project.id}`).emit('phaseOverride', {
          type: 'phase_override',
          projectId: project.id,
          fromPhase: currentPhase,
          toPhase: toPhase,
          overriddenBy: {
            id: user.id,
            name: userName
          },
          timestamp: new Date().toISOString(),
          autoLogMessage: autoLogMessage,
          suppressedPhases: suppressAlertsFor
        });
        
        console.log(`📡 PHASE OVERRIDE: Emitted real-time update for project ${project.id}`);
      }
    } catch (socketError) {
      console.error('❌ PHASE OVERRIDE: Error emitting socket event:', socketError);
      // Don't fail the override if socket emission fails
    }

    res.status(200).json({
      success: true,
      data: {
        override: override,
        fromPhase: currentPhase,
        toPhase: toPhase,
        suppressedPhases: suppressAlertsFor,
        autoLogMessage: autoLogMessage,
        project: {
          id: project.id,
          name: projectName,
          newPhase: toPhase
        }
      },
      message: `Project phase successfully overridden to ${toPhase}`
    });

  } catch (error) {
    console.error('❌ PHASE OVERRIDE: Error creating override:', error);
    throw new AppError('Failed to override project phase', 500);
  }
}));

// @desc    Revert phase override
// @route   POST /api/phase-override/project/:projectId/revert
// @access  Private
router.post('/project/:projectId/revert', [
  body('userId').notEmpty()
    .withMessage('User ID is required'),
  body('overrideId').notEmpty()
    .withMessage('Override ID is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: formatValidationErrors(errors.array())
    });
  }

  const { projectId } = req.params;
  const { userId, overrideId } = req.body;

  try {
    // Find the override
    const override = await prisma.projectPhaseOverride.findUnique({
      where: { id: overrideId },
      include: {
        project: true,
        overriddenBy: true
      }
    });

    if (!override) {
      return res.status(404).json({
        success: false,
        message: 'Override not found'
      });
    }

    if (override.projectId !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Override does not belong to this project'
      });
    }

    if (!override.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Override is not active'
      });
    }

    // Find user performing the revert
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Deactivate the override
    await prisma.projectPhaseOverride.update({
      where: { id: overrideId },
      data: { isActive: false }
    });

    // Revert project phase back to the original phase
    await prisma.project.update({
      where: { id: projectId },
      data: {
        phase: override.fromPhase
      }
    });

    // Create revert log message
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const projectName = override.project.projectName || override.project.name || `Project #${override.project.projectNumber}`;
    const timestamp = new Date().toLocaleString();
    const revertLogMessage = `[${userName}] reverted the project phase override back to ${override.fromPhase} for project "${projectName}" on ${timestamp}.`;

    console.log(`✅ PHASE OVERRIDE: Successfully reverted project ${projectId} from ${override.toPhase} back to ${override.fromPhase}`);

    res.status(200).json({
      success: true,
      data: {
        revertedFrom: override.toPhase,
        revertedTo: override.fromPhase,
        revertLogMessage: revertLogMessage,
        project: {
          id: projectId,
          name: projectName,
          newPhase: override.fromPhase
        }
      },
      message: `Project phase reverted back to ${override.fromPhase}`
    });

  } catch (error) {
    console.error('❌ PHASE OVERRIDE: Error reverting override:', error);
    throw new AppError('Failed to revert project phase override', 500);
  }
}));

// @desc    Get suppressed alerts for a project
// @route   GET /api/phase-override/project/:projectId/suppressed-alerts
// @access  Private
router.get('/project/:projectId/suppressed-alerts', asyncHandler(async (req, res) => {
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

    // Get all active overrides for this project
    const activeOverrides = await prisma.projectPhaseOverride.findMany({
      where: { 
        projectId: project.id,
        isActive: true 
      },
      include: {
        suppressedAlerts: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Collect all suppressed alerts
    const suppressedAlerts = activeOverrides.reduce((alerts, override) => {
      return alerts.concat(override.suppressedAlerts);
    }, []);

    res.status(200).json({
      success: true,
      data: {
        projectId: project.id,
        activeOverrides: activeOverrides.length,
        suppressedAlerts: suppressedAlerts,
        totalSuppressed: suppressedAlerts.length
      },
      message: 'Suppressed alerts retrieved successfully'
    });

  } catch (error) {
    console.error('❌ PHASE OVERRIDE: Error fetching suppressed alerts:', error);
    throw new AppError('Failed to fetch suppressed alerts', 500);
  }
}));

module.exports = router;