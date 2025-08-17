const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { PrismaClient } = require('@prisma/client');
const openAIService = require('../services/OpenAIService');

const prisma = new PrismaClient();
const router = express.Router();

// Bubbles AI Context Manager
class BubblesContextManager {
  constructor() {
    this.userSessions = new Map(); // Store user context and conversation state
  }

  // Get or create user session
  getUserSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        conversationHistory: [],
        activeProject: null,
        preferences: {},
        lastActivity: new Date()
      });
    }
    return this.userSessions.get(userId);
  }

  // Update user context
  updateUserContext(userId, context) {
    const session = this.getUserSession(userId);
    Object.assign(session, context);
    session.lastActivity = new Date();
  }

  // Add message to conversation history
  addToHistory(userId, message, response) {
    const session = this.getUserSession(userId);
    session.conversationHistory.push({
      timestamp: new Date(),
      message,
      response,
      projectContext: session.activeProject
    });
    
    // Keep only last 50 messages to manage memory
    if (session.conversationHistory.length > 50) {
      session.conversationHistory = session.conversationHistory.slice(-50);
    }
  }
}

const contextManager = new BubblesContextManager();

// Enhanced AI Response Generator with Project Context
const generateBubblesResponse = async (message, userId, projectContext = {}) => {
  const session = contextManager.getUserSession(userId);
  
  // Prepare context for AI service
  const aiContext = {
    projectName: projectContext.projectName,
    progress: projectContext.progress,
    status: projectContext.status,
    userRole: session.userRole,
    conversationHistory: session.conversationHistory,
    workflowStatus: projectContext.workflowStatus,
    activeAlerts: projectContext.activeAlerts
  };

  // Use OpenAI service for intelligent responses
  const response = await openAIService.generateResponse(message, aiContext);
  
  // Add timestamp and session info
  response.timestamp = new Date();
  response.sessionId = `bubbles_${userId}_${Date.now()}`;
  
  return response;
};

// Validation rules
const chatValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
  body('projectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object')
];

// @desc    Chat with Bubbles AI Assistant
// @route   POST /api/bubbles/chat
// @access  Private
router.post('/chat', chatValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { message, projectId, context = {} } = req.body;
  const userId = req.user.id;

  // Get project context if projectId provided
  let projectContext = {};
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectManager: {
          select: { firstName: true, lastName: true }
        },
        workflow: {
          include: {
            phases: {
              include: {
                sections: {
                  include: {
                    lineItems: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (project) {
      projectContext = {
        projectName: project.projectName,
        progress: project.progress,
        status: project.status,
        estimateValue: project.estimateValue,
        timeline: `${project.startDate} to ${project.endDate}`,
        projectManager: project.projectManager ? 
          `${project.projectManager.firstName} ${project.projectManager.lastName}` : null,
        workflowStatus: project.workflow ? 'Active' : 'Not configured'
      };
    }
  }

  // Update user context
  contextManager.updateUserContext(userId, {
    activeProject: projectContext,
    lastMessage: message,
    ...context
  });

  // Generate AI response
  const aiResponse = await generateBubblesResponse(message, userId, projectContext);

  // Add to conversation history
  contextManager.addToHistory(userId, message, aiResponse);

  // Log the interaction
  const chatLog = {
    userId,
    userName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
    message,
    response: aiResponse.content,
    responseType: aiResponse.type,
    confidence: aiResponse.confidence,
    projectId: projectId || null,
    context: { ...context, ...projectContext },
    timestamp: new Date()
  };

  // Emit real-time update
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${userId}`).emit('bubbles_response', {
      message,
      response: aiResponse,
      timestamp: new Date(),
      sessionId: `bubbles_${userId}_${Date.now()}`
    });
  }

  sendSuccess(res, 200, {
    message,
    response: aiResponse,
    chatLog,
    sessionContext: {
      conversationLength: contextManager.getUserSession(userId).conversationHistory.length,
      activeProject: projectContext.projectName || null
    }
  }, 'Bubbles response generated successfully');
}));

// @desc    Execute Bubbles action
// @route   POST /api/bubbles/action
// @access  Private
router.post('/action', asyncHandler(async (req, res, next) => {
  const { actionType, parameters = {} } = req.body;
  const userId = req.user.id;

  let result = {};

  switch (actionType) {
    case 'complete_task':
      if (parameters.lineItemId && parameters.projectId) {
        // Call existing workflow completion endpoint
        const workflowResponse = await fetch(`${req.protocol}://${req.get('host')}/api/workflows/complete-item`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({
            projectId: parameters.projectId,
            lineItemId: parameters.lineItemId,
            notes: `Completed via Bubbles AI Assistant`
          })
        });
        
        if (workflowResponse.ok) {
          result = {
            success: true,
            message: 'Task marked as complete successfully',
            action: 'Task completion confirmed'
          };
        } else {
          result = {
            success: false,
            message: 'Failed to complete task',
            error: 'Workflow service unavailable'
          };
        }
      } else {
        result = {
          success: false,
          message: 'Missing required parameters: lineItemId and projectId'
        };
      }
      break;

    case 'create_alert':
      if (parameters.projectId && parameters.message) {
        const alert = await prisma.workflowAlert.create({
          data: {
            projectId: parameters.projectId,
            message: parameters.message,
            priority: parameters.priority || 'MEDIUM',
            assignedTo: userId,
            createdBy: userId,
            alertType: 'MANUAL',
            status: 'ACTIVE'
          }
        });
        
        result = {
          success: true,
          message: 'Alert created successfully',
          alertId: alert.id
        };
      } else {
        result = {
          success: false,
          message: 'Missing required parameters: projectId and message'
        };
      }
      break;

    case 'list_projects':
      const projects = await prisma.project.findMany({
        where: { isArchived: false },
        select: {
          id: true,
          projectName: true,
          status: true,
          progress: true,
          priority: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      });
      
      result = {
        success: true,
        projects,
        count: projects.length
      };
      break;

    case 'check_alerts':
      const alerts = await prisma.workflowAlert.findMany({
        where: {
          assignedTo: userId,
          status: 'ACTIVE'
        },
        include: {
          project: {
            select: { projectName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      result = {
        success: true,
        alerts,
        count: alerts.length
      };
      break;

    default:
      result = {
        success: false,
        message: `Unknown action type: ${actionType}`
      };
  }

  // Emit real-time update for action completion
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${userId}`).emit('bubbles_action_complete', {
      actionType,
      result,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 200, result, 'Bubbles action executed');
}));

// @desc    Get user's Bubbles conversation history
// @route   GET /api/bubbles/history
// @access  Private
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20 } = req.query;
  
  const session = contextManager.getUserSession(userId);
  const history = session.conversationHistory
    .slice(-parseInt(limit))
    .reverse(); // Most recent first

  sendSuccess(res, 200, {
    history,
    totalMessages: session.conversationHistory.length,
    activeProject: session.activeProject?.projectName || null,
    lastActivity: session.lastActivity
  }, 'Conversation history retrieved');
}));

// @desc    Reset Bubbles conversation context
// @route   POST /api/bubbles/reset
// @access  Private
router.post('/reset', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Clear user session
  contextManager.userSessions.delete(userId);
  
  sendSuccess(res, 200, {
    message: 'Conversation context reset successfully'
  }, 'Bubbles context reset');
}));

// @desc    Get Bubbles capabilities and status
// @route   GET /api/bubbles/status
// @access  Private
router.get('/status', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const session = contextManager.getUserSession(userId);
  
  const capabilities = {
    projectManagement: {
      status: 'active',
      features: ['workflow_tracking', 'progress_monitoring', 'status_updates']
    },
    alertManagement: {
      status: 'active',
      features: ['alert_creation', 'alert_monitoring', 'auto_assignment']
    },
    taskAutomation: {
      status: 'active',
      features: ['task_completion', 'workflow_progression', 'team_coordination']
    },
    intelligentInsights: {
      status: 'active',
      features: ['predictive_analysis', 'optimization_suggestions', 'risk_assessment']
    },
    naturalLanguage: {
      status: 'active',
      features: ['command_parsing', 'context_awareness', 'conversational_interface']
    },
    aiIntegration: openAIService.getStatus()
  };

  sendSuccess(res, 200, {
    capabilities,
    userSession: {
      conversationLength: session.conversationHistory.length,
      activeProject: session.activeProject?.projectName || null,
      lastActivity: session.lastActivity
    },
    version: '1.0.0',
    status: 'operational'
  }, 'Bubbles status retrieved');
}));

module.exports = router;