const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  asyncHandler,
  sendSuccess,
  formatValidationErrors,
  AppError
} = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { prisma } = require('../config/prisma');
const openAIService = require('../services/OpenAIService');
const bubblesInsightsService = require('../services/BubblesInsightsService');
const WorkflowActionService = require('../services/WorkflowActionService'); // From bubbles2.js
const KnowledgeBaseService = require('../services/KnowledgeBaseService'); // From bubbles2.js

const router = express.Router();
const workflowActionService = new WorkflowActionService();
const knowledgeBaseService = new KnowledgeBaseService();


// Apply authentication to all routes
router.use(authenticateToken);

// Bubbles AI Context Manager (from bubbles.js)
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
      });
    }
    return this.userSessions.get(userId);
  }

  // Add message to conversation history
  addToHistory(userId, userMessage, aiResponse) {
    const session = this.getUserSession(userId);
    session.conversationHistory.push({ role: 'user', content: userMessage });
    session.conversationHistory.push({ role: 'assistant', content: aiResponse });
    // Keep history to a reasonable length
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }
  }
  
  resetHistory(userId) {
      this.userSessions.delete(userId);
  }
}

const contextManager = new BubblesContextManager();

/**
 * COMBINED SYSTEM PROMPT: Merges the detailed persona from bubbles.js 
 * with the tool-calling functionality from bubbles2.js.
 */
const getSystemPrompt = (user, projectContext) => {
    const userName = user.fullName || `${user.firstName} ${user.lastName}`;
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Tool definitions from bubbles2.js
    const tools = [
        {
            name: 'mark_line_item_complete_and_notify',
            description: 'Marks a workflow task as complete and alerts the next person in the sequence. Use this for prompts like "Check off [task name]".',
            parameters: {
                type: 'object',
                properties: { lineItemName: { type: 'string', description: 'The exact name of the line item to mark as complete.' } },
                required: ['lineItemName']
            }
        },
        {
            name: 'get_incomplete_items_in_phase',
            description: 'Lists all tasks that are not yet complete for a specific phase of the current project.',
            parameters: {
                type: 'object',
                properties: { phaseName: { type: 'string', description: 'The name of the phase, e.g., "Lead", "Prospect".' } },
                required: ['phaseName']
            }
        },
        {
            name: 'find_blocking_task',
            description: 'Identifies the single task that is currently preventing a project phase from moving forward.',
            parameters: {
                type: 'object',
                properties: { phaseName: { type: 'string', description: 'The name of the phase to check.' } },
                required: ['phaseName']
            }
        },
        {
            name: 'check_phase_readiness',
            description: 'Checks if all tasks in a phase are complete and if the project can advance to the next phase.',
            parameters: {
                type: 'object',
                properties: { phaseName: { type: 'string', description: 'The name of the phase to verify for completion.' } },
                required: ['phaseName']
            }
        },
        {
            name: 'reassign_task',
            description: 'Reassigns a task (and its alert) to a different team member.',
            parameters: {
                type: 'object',
                properties: {
                    lineItemName: { type: 'string', description: 'The name of the task to reassign.' },
                    newUserEmail: { type: 'string', description: 'The email address of the team member to reassign the task to.' }
                },
                required: ['lineItemName', 'newUserEmail']
            }
        },
        {
            name: 'answer_company_question',
            description: 'Searches the historical knowledge base for broad, multi-project, or historical questions.',
            parameters: {
                type: 'object',
                properties: { question: { type: 'string', description: 'The user\'s question for the knowledge base.' } },
                required: ['question']
            }
        },
    ];

    // Persona and rules from bubbles.js
    let prompt = `You are "Bubbles," an expert AI assistant for Kenstruction, a premier roofing and construction company. Your user is ${userName}. Today is ${currentDate}.

Your persona is:
- **Professional & Proactive:** You anticipate needs and provide clear, actionable information.
- **Concise:** Get straight to the point. Use bullet points and bold text for clarity.
- **An Expert:** You understand construction and roofing terminology.
- **A Copilot:** Your goal is to help the user manage their projects more effectively.

Current Project Context:
`;

    if (projectContext && projectContext.projectName) {
        prompt += `- **Project Name:** ${projectContext.projectName} (ID: ${projectContext.id})\n`;
        prompt += `- **Status:** ${projectContext.status || 'N/A'}\n`;
        prompt += `- **Progress:** ${projectContext.progress || 0}%\n`;
    } else {
        prompt += `- No specific project is currently selected. You must ask the user to select one if their query is project-specific.\n`;
    }

    prompt += `
Interaction Rules:
1.  **Tool-First Approach:** Your primary role is to translate user requests into one of your available tools. You MUST use a tool if the request matches a function. Respond ONLY with the JSON for the tool call. Do not add any conversational text or markdown.
2.  **General Conversation:** If the request is a general question not covered by a tool, you may answer it directly. Use Markdown for formatting (e.g., \`### Headers\`, \`* Lists\`, \`**Bold Text**\`).
3.  Keep conversational responses focused and under 150 words unless a detailed report is requested.
4.  End your conversational responses by suggesting 2-3 relevant next actions the user might want to take.

Available tools:
${JSON.stringify(tools, null, 2)}
`;
    return prompt;
};


// Validation rules
const chatValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
  body('projectId')
    .optional({ nullable: true })
    .isString()
    .withMessage('Project ID must be a string if provided'),
];

/**
 * @desc    Chat with Bubbles AI Assistant
 * @route   POST /api/bubbles/chat
 * @access  Private
 * @summary This new chat route uses the powerful tool-calling architecture from bubbles2.js
 */
router.post('/chat', chatValidation, asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: formatValidationErrors(errors) });
    }

    const { message, projectId } = req.body;
    const userId = req.user.id;

    // Handle conversation reset
    if (message.toLowerCase().trim() === '/reset') {
        contextManager.resetHistory(userId);
        return sendSuccess(res, 200, { response: { content: "I've reset our conversation. How can I assist you now?" } });
    }

    // Get project context
    const projectContext = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;

    if (!projectContext && (message.includes('task') || message.includes('phase'))) { // Basic check for project-specific requests
        return sendSuccess(res, 200, { response: { content: "Please select a project first. I need a project context to perform workflow actions." } });
    }

    const systemPrompt = getSystemPrompt(req.user, projectContext);
    const session = contextManager.getUserSession(userId);
    const aiResponse = await openAIService.generateResponse(message, { systemPrompt, conversationHistory: session.conversationHistory });
    
    let finalResponseContent = '';

    // Tool-calling logic from bubbles2.js
    try {
        const toolCall = JSON.parse(aiResponse.content);
        if (toolCall.tool && toolCall.parameters) {
            let toolResult;
            const params = toolCall.parameters;
            const newUser = params.newUserEmail ? await prisma.user.findUnique({ where: { email: params.newUserEmail } }) : null;

            switch (toolCall.tool) {
                case 'mark_line_item_complete_and_notify':
                    toolResult = await workflowActionService.markLineItemComplete(projectContext.id, params.lineItemName, userId);
                    break;
                
                case 'get_incomplete_items_in_phase':
                    const items = await workflowActionService.getIncompleteItemsInPhase(projectContext.id, params.phaseName);
                    const responseMessage = items.length > 0
                      ? `Here are the incomplete tasks for the ${params.phaseName} phase:\n${items.map(i => `- ${i.itemName} (section: ${i.sectionName})`).join('\n')}`
                      : `All tasks in the ${params.phaseName} phase are complete.`;
                    toolResult = { success: true, message: responseMessage };
                    break;

                case 'find_blocking_task':
                    const task = await workflowActionService.findBlockingTask(projectContext.id, params.phaseName);
                    toolResult = { success: true, message: task ? `The current blocker in the ${params.phaseName} phase is "${task.itemName}".` : `There are no blocking tasks; the ${params.phaseName} phase is complete.` };
                    break;

                case 'check_phase_readiness':
                    toolResult = await workflowActionService.canAdvancePhase(projectContext.id, params.phaseName);
                    break;

                case 'reassign_task':
                    if (!newUser) toolResult = { success: false, message: `I couldn't find a user with the email "${params.newUserEmail}".` };
                    else toolResult = await workflowActionService.reassignTask(params.lineItemName, newUser.id, projectContext.id);
                    break;

                case 'answer_company_question':
                    const answer = await knowledgeBaseService.answerQuestion(params.question);
                    toolResult = { success: true, message: answer };
                    break;

                default:
                    toolResult = { success: false, message: `The tool "${toolCall.tool}" is not recognized.` };
            }

            // Second AI call to formulate a natural response
            const confirmationPrompt = `The user's action was processed. The result was: ${JSON.stringify(toolResult)}. Formulate a brief, natural, and friendly confirmation message for the user based on this result. Also suggest 2-3 relevant next actions.`;
            const finalAiResponse = await openAIService.generateSingleResponse(confirmationPrompt);
            finalResponseContent = finalAiResponse.content;
        } else {
             // This is not a tool call, so it's a direct answer.
            finalResponseContent = aiResponse.content;
        }
    } catch (e) {
        // If JSON.parse fails, it's a direct conversational response from the AI
        finalResponseContent = aiResponse.content;
    }

    contextManager.addToHistory(userId, message, finalResponseContent);
    
    const io = req.app.get('io');
    if (io) {
        io.to(`user_${userId}`).emit('bubbles_response', {
            response: { content: finalResponseContent },
        });
    }

    sendSuccess(res, 200, { response: { content: finalResponseContent } });
}));

// @desc    Get user's Bubbles conversation history
// @route   GET /api/bubbles/history
// @access  Private
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20 } = req.query;
  
  const session = contextManager.getUserSession(userId);
  const history = session.conversationHistory.slice(-parseInt(limit)).reverse();

  sendSuccess(res, 200, {
    history,
    totalMessages: session.conversationHistory.length,
    activeProject: session.activeProject?.projectName || null,
  }, 'Conversation history retrieved');
}));

// @desc    Reset Bubbles conversation context
// @route   POST /api/bubbles/reset
// @access  Private
router.post('/reset', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  contextManager.userSessions.delete(userId);
  sendSuccess(res, 200, { message: 'Conversation context reset successfully' }, 'Bubbles context reset');
}));

// @desc    Get Bubbles capabilities and status
// @route   GET /api/bubbles/status
// @access  Private
router.get('/status', asyncHandler(async (req, res) => {
  const capabilities = {
    projectManagement: { status: 'active', features: ['workflow_tracking', 'progress_monitoring'] },
    alertManagement: { status: 'active', features: ['alert_creation', 'alert_monitoring'] },
    intelligentInsights: { status: 'active', features: ['predictive_analysis', 'risk_assessment'] },
    aiIntegration: openAIService.getStatus()
  };

  sendSuccess(res, 200, {
    capabilities,
    version: '2.0.0', // Updated version
    status: 'operational'
  }, 'Bubbles status retrieved');
}));

// --- INSIGHTS ROUTES ---

// @desc    Get AI-powered project insights
// @route   GET /api/bubbles/insights/project/:projectId
// @access  Private
router.get('/insights/project/:projectId', asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId);
  const userId = req.user.id;
  const insights = await bubblesInsightsService.generateProjectInsights(projectId, userId);
  sendSuccess(res, 200, { projectId, insights, generatedAt: new Date() }, 'Project insights generated');
}));

// @desc    Get portfolio-level insights
// @route   GET /api/bubbles/insights/portfolio
// @access  Private
router.get('/insights/portfolio', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const insights = await bubblesInsightsService.generatePortfolioInsights(userId);
  sendSuccess(res, 200, { userId, ...insights, generatedAt: new Date() }, 'Portfolio insights generated');
}));

// @desc    Get project completion prediction
// @route   GET /api/bubbles/insights/prediction/:projectId
// @access  Private
router.get('/insights/prediction/:projectId', asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId);
  const prediction = await bubblesInsightsService.predictProjectCompletion(projectId);
  if (!prediction) {
    return res.status(404).json({ success: false, message: 'Project not found or prediction unavailable' });
  }
  sendSuccess(res, 200, prediction, 'Project completion prediction generated');
}));

// @desc    Get project risk analysis
// @route   GET /api/bubbles/insights/risks/:projectId
// @access  Private
router.get('/insights/risks/:projectId', asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId);
  const risks = await bubblesInsightsService.identifyRisks(projectId);
  sendSuccess(res, 200, {
    projectId,
    risks,
    riskLevel: risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low',
    generatedAt: new Date()
  }, 'Risk analysis completed');
}));

// @desc    Get optimization recommendations
// @route   GET /api/bubbles/insights/optimization/:projectId
// @access  Private
router.get('/insights/optimization/:projectId', asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId);
  const recommendations = await bubblesInsightsService.generateOptimizationRecommendations(projectId);
  sendSuccess(res, 200, {
    projectId,
    recommendations,
    totalRecommendations: recommendations.length,
    generatedAt: new Date()
  }, 'Optimization recommendations generated');
}));


module.exports = router;
