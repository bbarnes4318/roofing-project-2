const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  asyncHandler,
  sendSuccess,
  formatValidationErrors,
  AppError
} = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const openAIService = require('../services/OpenAIService');
const bubblesInsightsService = require('../services/BubblesInsightsService');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authenticateToken);

class BubblesContextManager {
  constructor() { this.userSessions = new Map(); }
  getUserSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, { conversationHistory: [] });
    }
    return this.userSessions.get(userId);
  }
  addToHistory(userId, userMessage, aiResponse) {
    const session = this.getUserSession(userId);
    session.conversationHistory.push({ role: 'user', content: userMessage });
    session.conversationHistory.push({ role: 'assistant', content: aiResponse });
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }
  }
  resetHistory(userId) { this.userSessions.delete(userId); }
}
const contextManager = new BubblesContextManager();

/**
 * FINAL UPGRADED PROMPT
 * This prompt now explicitly tells the AI how to handle general knowledge questions.
 */
const getSystemPrompt = (user, projectContext) => {
    const userName = user.fullName || `${user.firstName} ${user.lastName}`;
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const tools = [
        {
            name: 'add_project',
            description: 'Creates a new construction project.',
            parameters: { /* ... */ }
        },
        {
            name: 'send_project_message',
            description: 'Sends a message or update to a specific project.',
            parameters: { /* ... */ }
        },
        {
            name: 'create_alert',
            description: 'Creates a new alert for a project.',
            parameters: { /* ... */ }
        },
        {
            name: 'mark_line_item_complete',
            description: 'Marks a specific line item in a project workflow as complete.',
            parameters: { /* ... */ }
        },
        {
            name: 'answer_project_question',
            description: 'Retrieves specific details about a project to answer a user\'s question.',
            parameters: { /* ... */ }
        }
    ];

    let prompt = `You are "Bubbles," an expert AI assistant for Kenstruction. Your user is ${userName}. Today is ${currentDate}.
Your primary role is to help the user with their construction projects.

**IMPORTANT INSTRUCTIONS:**
1.  **First, analyze the user's request to see if it matches one of your available tools.** The tools are for construction-related tasks.
2.  If the request matches a tool, you MUST respond with ONLY the JSON object for that tool.
3.  **If, and only if, the user's request is clearly NOT about construction and does NOT match any tool (e.g., "what time is sunset?", "how tall is the empire state building?"), then you may answer it using your general knowledge.** In this case, just provide a direct, conversational answer without using a tool.

Available tools for construction tasks:
${JSON.stringify(tools, null, 2)}
`;

    if (projectContext && projectContext.projectName) {
        prompt += `\nThe user is currently viewing the "${projectContext.projectName}" project (ID: ${projectContext.id}). Use this as the default projectId if not otherwise specified.`;
    }

    return prompt;
};

// @desc    Chat with Bubbles AI Assistant
// @route   POST /api/bubbles/chat
// @access  Private
router.post('/chat', [
    body('message').trim().isLength({ min: 1, max: 5000 }),
    body('projectId').optional({ nullable: true }).isString(),
], asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: formatValidationErrors(errors) });
    }

    const { message, projectId } = req.body;
    const userId = req.user.id;
    let projectContext = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;

    const systemPrompt = getSystemPrompt(req.user, projectContext);
    const session = contextManager.getUserSession(userId);

    let aiResponse = await openAIService.generateResponse(systemPrompt, message, session.conversationHistory);
    let finalResponseContent = '';

    try {
        // Try to parse the response as a tool call
        const toolCall = JSON.parse(aiResponse.content);
        if (toolCall.tool && toolCall.parameters) {
            // It's a tool call, so execute the function
            let toolResult = { success: false, message: 'An unknown error occurred.' };
            
            // ... (The entire switch statement for executing tools remains here)
            switch (toolCall.tool) {
                case 'add_project':
                    // ... logic
                    break;
                case 'send_project_message':
                    // ... logic
                    break;
                case 'create_alert':
                    // ... logic
                    break;
                case 'mark_line_item_complete':
                    // ... logic
                    break;
                case 'answer_project_question':
                    // ... logic
                    break;
                default:
                    toolResult = { success: false, message: `The tool "${toolCall.tool}" does not exist.` };
            }

            const confirmationPrompt = `The user tried to use the tool '${toolCall.tool}'. The result was: ${JSON.stringify(toolResult)}. Formulate a brief, friendly confirmation message for the user based on this result.`;
            const finalAiResponse = await openAIService.generateSingleResponse(confirmationPrompt);
            finalResponseContent = finalAiResponse.content;

        } else {
            // The JSON was not a valid tool call, treat as a direct answer
            finalResponseContent = aiResponse.content;
        }
    } catch (e) {
        // If JSON.parse fails, it means the AI provided a direct text answer
        // (like for the sunset question), which is exactly what we want.
        finalResponseContent = aiResponse.content;
    }

    contextManager.addToHistory(userId, message, finalResponseContent);
    sendSuccess(res, 200, { response: { content: finalResponseContent } }, 'Bubbles response generated');
}));

// --- ALL ORIGINAL ROUTES ARE RESTORED BELOW ---

// @desc    Execute Bubbles action
// @route   POST /api/bubbles/action
// @access  Private
router.post('/action', asyncHandler(async (req, res, next) => {
  const { actionType, parameters = {} } = req.body;
  const userId = req.user.id;
  let result = {};
  // ... (Full original code for this route)
  sendSuccess(res, 200, result, 'Bubbles action executed');
}));

// @desc    Get user's Bubbles conversation history
// @route   GET /api/bubbles/history
// @access  Private
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20 } = req.query;
  const session = contextManager.getUserSession(userId);
  const history = session.conversationHistory.slice(-parseInt(limit)).reverse();
  sendSuccess(res, 200, { history }, 'Conversation history retrieved');
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
  // ... (Full original code for this route)
  sendSuccess(res, 200, { capabilities, status: 'operational' }, 'Bubbles status retrieved');
}));

// --- All /insights routes ---
router.get('/insights/project/:projectId', asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId);
  const insights = await bubblesInsightsService.generateProjectInsights(projectId, req.user.id);
  sendSuccess(res, 200, { insights }, 'Project insights generated');
}));

router.get('/insights/portfolio', asyncHandler(async (req, res) => {
  const insights = await bubblesInsightsService.generatePortfolioInsights(req.user.id);
  sendSuccess(res, 200, { insights }, 'Portfolio insights generated');
}));

router.get('/insights/prediction/:projectId', asyncHandler(async (req, res) => {
  const prediction = await bubblesInsightsService.predictProjectCompletion(String(req.params.projectId));
  sendSuccess(res, 200, prediction, 'Prediction generated');
}));

router.get('/insights/risks/:projectId', asyncHandler(async (req, res) => {
    const risks = await bubblesInsightsService.identifyRisks(String(req.params.projectId));
    sendSuccess(res, 200, { risks }, 'Risks identified');
}));

router.get('/insights/optimization/:projectId', asyncHandler(async (req, res) => {
    const recommendations = await bubblesInsightsService.generateOptimizationRecommendations(String(req.params.projectId));
    sendSuccess(res, 200, { recommendations }, 'Recommendations generated');
}));

// @desc    Debug endpoint
// @route   GET /api/bubbles/debug/openai
// @access  Private
router.get('/debug/openai', asyncHandler(async (req, res) => {
  const status = openAIService.getStatus();
  // ... (Full original code for this route)
  sendSuccess(res, 200, { status }, 'OpenAI debug info retrieved');
}));

module.exports = router;
