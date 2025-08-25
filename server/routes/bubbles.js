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

// ---- Project resolution helpers ----
function extractProjectNumberFromText(text) {
  if (!text) return null;
  const m = String(text).match(/(?:project\s*#?|#)\s*(\d{3,7})/i) || String(text).match(/\b(\d{4,7})\b/);
  return m ? parseInt(m[1], 10) : null;
}

function tokenizeName(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

async function resolveProjectFromMessage(message) {
  const projectNumber = extractProjectNumberFromText(message);
  let candidates = [];

  if (projectNumber) {
    candidates = await prisma.project.findMany({
      where: { projectNumber: projectNumber },
      include: { customer: true },
      take: 5
    });
    if (candidates.length === 1) return { project: candidates[0] };
  }

  // Try customer primary name fuzzy contains using tokens length >= 2
  const tokens = tokenizeName(message).filter(t => t.length >= 3);
  if (tokens.length >= 1) {
    // Search by concatenated tokens in primaryName
    candidates = await prisma.project.findMany({
      where: {
        customer: {
          primaryName: { contains: tokens.join(' '), mode: 'insensitive' }
        }
      },
      include: { customer: true },
      take: 10
    });
    if (candidates.length === 1) return { project: candidates[0] };

    // If none, try OR on individual tokens (at least 2 tokens)
    if (candidates.length === 0 && tokens.length >= 2) {
      candidates = await prisma.project.findMany({
        where: {
          OR: tokens.map(t => ({ customer: { primaryName: { contains: t, mode: 'insensitive' } } }))
        },
        include: { customer: true },
        take: 10
      });
    }
  }

  if (candidates.length === 1) {
    return { project: candidates[0] };
  }
  if (candidates.length > 1) {
    return { multiple: candidates };
  }
  return { project: null };
}

// Helper: derive intent and handle locally when AI is unavailable or returns plain text
async function handleHeuristicIntent(message, projectContext, userId) {
  const text = String(message || '').toLowerCase();
  if (!projectContext) return { handled: false };

  // Project status summary
  if (text.includes('status') || text.includes('project status')) {
    // Pull basic status from DB
    const [tracker, activeAlerts] = await Promise.all([
      prisma.projectWorkflowTracker.findFirst({
        where: { projectId: projectContext.id, isMainWorkflow: true },
        select: { id: true, currentLineItemId: true }
      }),
      prisma.workflowAlert.count({ where: { projectId: projectContext.id, status: 'ACTIVE' } })
    ]);

    let currentStep = null;
    let phaseName = null;
    if (tracker?.currentLineItemId) {
      const li = await prisma.workflowLineItem.findUnique({
        where: { id: tracker.currentLineItemId },
        select: { itemName: true, section: { select: { phase: { select: { phaseType: true } } } } }
      });
      currentStep = li?.itemName || null;
      phaseName = li?.section?.phase?.phaseType || null;
    }

    const pct = typeof projectContext.progress === 'number' ? Math.round(projectContext.progress) : null;
    const content = [
      `**${projectContext.projectName || 'Project'} — Status**`,
      pct !== null ? `- Progress: ${pct}%` : null,
      phaseName ? `- Phase: ${phaseName}` : null,
      currentStep ? `- Current step: ${currentStep}` : null,
      `- Active alerts: ${activeAlerts}`,
      '',
      'Next actions:',
      '- Check blocking tasks',
      '- Show incomplete tasks in current phase',
      '- Reassign current step'
    ].filter(Boolean).join('\n');

    return { handled: true, content };
  }

  // Complete/mark task
  if (text.includes('check off') || text.includes('complete') || text.includes('mark')) {
    // Prefer explicit quoted name
    let lineItemName = null;
    const match = message.match(/"([^"]+)"/);
    if (match) {
      lineItemName = match[1];
    } else {
      // Fallback: fuzzy token search (longer tokens only)
      const tokens = text.split(/[^a-z0-9]+/i).filter(t => t && t.length >= 4);
      // Search by the first meaningful token that matches a line item
      for (const token of tokens) {
        const li = await prisma.workflowLineItem.findFirst({
          where: {
            isActive: true,
            isCurrent: true,
            itemName: { contains: token, mode: 'insensitive' }
          },
          select: { itemName: true, id: true }
        });
        if (li) { lineItemName = li.itemName; break; }
      }
    }
    if (lineItemName) {
      const result = await workflowActionService.markLineItemComplete(projectContext.id, lineItemName, userId);
      return { handled: true, content: result.message || `Marked "${lineItemName}" complete.` };
    }
  }

  // Incomplete items
  if (text.includes('incomplete')) {
    // Try to infer current phase via tracker
    const tracker = await prisma.projectWorkflowTracker.findFirst({
      where: { projectId: projectContext.id, isMainWorkflow: true },
      select: { currentLineItemId: true }
    });
    let phaseName = null;
    if (tracker?.currentLineItemId) {
      const li = await prisma.workflowLineItem.findUnique({
        where: { id: tracker.currentLineItemId },
        select: { section: { select: { phase: { select: { phaseType: true } } } } }
      });
      phaseName = li?.section?.phase?.phaseType || null;
    }
    if (phaseName) {
      const items = await workflowActionService.getIncompleteItemsInPhase(projectContext.id, phaseName);
      const msg = items.length
        ? `Incomplete tasks in ${phaseName}:\n${items.map(i => `- ${i.itemName} (section: ${i.sectionName})`).join('\n')}`
        : `All tasks in ${phaseName} are complete.`;
      return { handled: true, content: msg };
    }
  }

  // Blocking task
  if (text.includes('blocking')) {
    const tracker = await prisma.projectWorkflowTracker.findFirst({
      where: { projectId: projectContext.id, isMainWorkflow: true },
      select: { currentLineItemId: true }
    });
    let phaseName = null;
    if (tracker?.currentLineItemId) {
      const li = await prisma.workflowLineItem.findUnique({
        where: { id: tracker.currentLineItemId },
        select: { section: { select: { phase: { select: { phaseType: true } } } } }
      });
      phaseName = li?.section?.phase?.phaseType || null;
    }
    if (phaseName) {
      const blocker = await workflowActionService.findBlockingTask(projectContext.id, phaseName);
      return { handled: true, content: blocker ? `Blocker in ${phaseName}: "${blocker.itemName}".` : `No blockers in ${phaseName}.` };
    }
  }

  // Next line item
  if (text.includes('next') && (text.includes('line item') || text.includes('task') || text.includes('step'))) {
    const tracker = await prisma.projectWorkflowTracker.findFirst({
      where: { projectId: projectContext.id, isMainWorkflow: true },
      select: { currentLineItemId: true }
    });
    if (tracker?.currentLineItemId) {
      const li = await prisma.workflowLineItem.findUnique({
        where: { id: tracker.currentLineItemId },
        select: { 
          itemName: true, 
          section: { 
            select: { 
              phase: { select: { phaseType: true, phaseName: true } },
              sectionName: true
            } 
          } 
        }
      });
      if (li) {
        const phaseName = li.section?.phase?.phaseName || li.section?.phase?.phaseType || 'Current Phase';
        const sectionName = li.section?.sectionName || 'Current Section';
        return { 
          handled: true, 
          content: `**Next Line Item:** ${li.itemName}\n\n**Location:** ${sectionName} (${phaseName})\n\n**Status:** Ready to complete\n\n**Next actions:**\n• Complete this task\n• Check for blocking items\n• Review phase progress` 
        };
      }
    }
    return { handled: true, content: 'I couldn\'t find the current line item. Let me check the project status.' };
  }

  return { handled: false };
}


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
  addToHistory(userId, userMessage, aiResponse, projectContext = null) {
    const session = this.getUserSession(userId);
    
    // Add project context to the session if provided
    if (projectContext) {
      session.activeProject = projectContext;
    }
    
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
 * BULLETPROOF SYSTEM PROMPT: Designed to work every single time without fail
 */
const getSystemPrompt = (user, projectContext) => {
    const userName = user.fullName || `${user.firstName} ${user.lastName}`;
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Tool definitions from bubbles2.js
    const tools = [
        {
            name: 'mark_line_item_complete_and_notify',
            description: 'Marks a workflow task as complete and alerts the next person in the sequence. Uses the currently selected project. Use this for prompts like "Check off [task name]".',
            parameters: {
                type: 'object',
                properties: { lineItemName: { type: 'string', description: 'The exact name of the line item to mark as complete.' } },
                required: ['lineItemName']
            }
        },
        {
            name: 'get_incomplete_items_in_phase',
            description: 'Lists all tasks that are not yet complete for a specific phase of the currently selected project.',
            parameters: {
                type: 'object',
                properties: { phaseName: { type: 'string', description: 'The name of the phase, e.g., "Lead", "Prospect".' } },
                required: ['phaseName']
            }
        },
        {
            name: 'find_blocking_task',
            description: 'Identifies the single task that is currently preventing a project phase from moving forward in the currently selected project.',
            parameters: {
                type: 'object',
                properties: { phaseName: { type: 'string', description: 'The name of the phase to check.' } },
                required: ['phaseName']
            }
        },
        {
            name: 'check_phase_readiness',
            description: 'Checks if all tasks in a phase are complete and if the currently selected project can advance to the next phase.',
            parameters: {
                type: 'object',
                properties: { phaseName: { type: 'string', description: 'The name of the phase to verify for completion.' } },
                required: ['phaseName']
            }
        },
        {
            name: 'reassign_task',
            description: 'Reassigns a task (and its alert) to a different team member in the currently selected project.',
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

    // BULLETPROOF PROMPT CONSTRUCTION
    let prompt = `# BUBBLES AI ASSISTANT - BULLETPROOF SYSTEM PROMPT

## IDENTITY & CONTEXT
You are "Bubbles," an expert AI assistant for Kenstruction, a premier roofing and construction company.
- **User:** ${userName}
- **Date:** ${currentDate}
- **Role:** Project workflow copilot and assistant

## CORE PERSONALITY TRAITS
1. **Professional & Proactive:** Anticipate needs, provide clear actionable information
2. **Concise:** Get straight to the point, use bullet points and bold text
3. **Expert:** Understand construction and roofing terminology
4. **Copilot:** Help manage projects more effectively
5. **Context-Aware:** ALWAYS maintain project context throughout conversation
6. **Never Ask Twice:** Once project is selected, NEVER ask for project identification again

## CRITICAL PROJECT CONTEXT RULES
${projectContext && projectContext.projectName ? `
### ✅ ACTIVE PROJECT SELECTED
**Project Name:** ${projectContext.projectName}
**Project ID:** ${projectContext.id}
**Project Number:** #${String(projectContext.projectNumber).padStart(5, '0')}
**Status:** ${projectContext.status || 'N/A'}
**Progress:** ${projectContext.progress || 0}%
**Customer:** ${projectContext.customer?.primaryName || 'N/A'}

### 🚨 MANDATORY RULES WHEN PROJECT IS SELECTED:
1. **NEVER ask for project numbers, customer names, or any project identification**
2. **ALWAYS use project ID "${projectContext.id}" for all operations**
3. **Project context persists for ALL subsequent questions**
4. **If user asks about this project, answer directly without asking for identification**
5. **All tools automatically use the selected project - no need to specify project**

### 🔧 OPERATIONS WITH SELECTED PROJECT:
- All workflow tools use project ID "${projectContext.id}" automatically
- All status queries use the selected project
- All task operations use the selected project
- All phase operations use the selected project
- All customer queries use the selected project

` : `
### ❌ NO PROJECT SELECTED
- User must select a project for project-specific queries
- Ask user to select a project if query is project-specific
`}

## INTERACTION PROTOCOL

### STEP 1: ANALYZE REQUEST
1. Determine if request is project-specific or general
2. If project-specific and no project selected: Ask user to select project
3. If project-specific and project selected: Use selected project immediately
4. If general question: Answer directly

### STEP 2: RESPONSE GENERATION
1. **For ACTIONABLE requests** (complete tasks, check status, etc.): Use JSON tool call format
2. **For GENERAL QUESTIONS** (what is next, how to do something, etc.): Respond conversationally in natural language
3. **For PROJECT STATUS queries**: Provide direct answers using project context
4. **Context Maintenance:** Always maintain project context
5. **No Repetition:** Never ask for project identification twice

### STEP 3: FORMATTING
- Use Markdown formatting (headers, bold, lists)
- Keep responses under 150 words unless detailed report requested
- End with 2-3 relevant next actions
- Use bullet points for clarity

## AVAILABLE TOOLS
${JSON.stringify(tools, null, 2)}

## FINAL MANDATORY INSTRUCTIONS

### 🚨 CRITICAL: PROJECT CONTEXT RULES
${projectContext && projectContext.projectName ? `
**PROJECT IS SELECTED:** ${projectContext.projectName} (ID: ${projectContext.id})
- ✅ USE this project for ALL project-related questions
- ✅ NEVER ask for project numbers or customer names
- ✅ Project context persists throughout entire conversation
- ✅ All tools use this project automatically
- ❌ NEVER ask "Tell me the project number" or similar
- ❌ NEVER ask for customer identification
- ❌ NEVER ask for project identification

### 🎯 RESPONSE GUIDELINES:
- **For "what is next" questions**: Answer directly with current line item info
- **For "how to" questions**: Provide helpful guidance
- **For status questions**: Give current project status
- **For actionable requests**: Use JSON tool calls
- **For general questions**: Respond conversationally
` : `
**NO PROJECT SELECTED:**
- Ask user to select project for project-specific queries
- Answer general questions directly
`}

### 🎯 RESPONSE PATTERNS
1. **Project Status Query:** Provide status using selected project (conversational response)
2. **Task Query:** Use tools with selected project (JSON tool call)
3. **Phase Query:** Use tools with selected project (JSON tool call)
4. **General Question:** Answer directly (conversational response)
5. **Multiple Projects:** Ask user to choose specific project (conversational response)

### ⚠️ ERROR PREVENTION
- If you ask for project identification when project is selected: YOU ARE MAKING AN ERROR
- If you ask for customer name when project is selected: YOU ARE MAKING AN ERROR
- If you ask for project number when project is selected: YOU ARE MAKING AN ERROR
- Project context is established and should be used for ALL subsequent questions

## CONVERSATION FLOW
1. User asks question
2. Check if project-specific
3. If project-specific and project selected: Answer using selected project
4. If project-specific and no project: Ask user to select project
5. If general: Answer directly
6. Maintain context for next question

**REMEMBER:** Once a project is selected, it remains selected for the entire conversation. Never ask for project identification again.`;

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

    // Allow quick command: "use project <#number>" or by ID
    const useMatch = String(message).match(/^\s*use\s+project\s+([#]?(\d{3,7})|([a-z0-9-]{8,}))/i);
    if (useMatch) {
      let selected = null;
      if (useMatch[2]) {
        const pn = parseInt(useMatch[2], 10);
        selected = await prisma.project.findFirst({ where: { projectNumber: pn } });
      } else if (useMatch[3]) {
        selected = await prisma.project.findUnique({ where: { id: useMatch[3] } });
      }
      if (selected) {
        const session = contextManager.getUserSession(userId);
        // Ensure we have customer information for the session
        const projectWithCustomer = await prisma.project.findUnique({
          where: { id: selected.id },
          include: { customer: true }
        });
        session.activeProject = projectWithCustomer;
        return sendSuccess(res, 200, { response: { content: `Active project set: #${String(selected.projectNumber).padStart(5, '0')} — ${selected.projectName}` } });
      }
      return sendSuccess(res, 200, { response: { content: 'I could not find that project. Please provide a valid project number or customer name.' } });
    }

    // Get or resolve project context
    let projectContext = projectId ? await prisma.project.findUnique({ 
        where: { id: projectId },
        include: { customer: true }
    }) : null;
    const session = contextManager.getUserSession(userId);

    // BULLETPROOF CONTEXT VALIDATION
    const validateAndMaintainContext = () => {
        // Ensure project context is properly set
        if (projectContext && !session.activeProject) {
            session.activeProject = projectContext;
        }
        
        // If we have a projectId but no projectContext, try to recover from session
        if (projectId && !projectContext && session.activeProject) {
            projectContext = session.activeProject;
        }
        
        // Final validation - if we still don't have project context but should
        if (projectId && !projectContext) {
            console.warn('⚠️ Project context lost - attempting recovery');
            // Try to fetch project again
            return prisma.project.findUnique({ 
                where: { id: projectId },
                include: { customer: true }
            }).then(recovered => {
                if (recovered) {
                    projectContext = recovered;
                    session.activeProject = recovered;
                    return recovered;
                }
                return null;
            });
        }
        
        return Promise.resolve(projectContext);
    };

    // Validate and maintain context
    projectContext = await validateAndMaintainContext();

    // If message explicitly mentions a project number, override active project
    const explicitProjectNumber = extractProjectNumberFromText(message);
    if (explicitProjectNumber) {
      const override = await prisma.project.findFirst({ 
          where: { projectNumber: explicitProjectNumber },
          include: { customer: true }
      });
      if (override) {
        projectContext = override;
        session.activeProject = override;
      }
    }

    if (!projectContext) {
      // Try previous active project in session
      if (session.activeProject) {
        projectContext = session.activeProject;
      } else {
        const resolved = await resolveProjectFromMessage(message);
        if (resolved.project) {
          projectContext = resolved.project;
          session.activeProject = projectContext;
        } else if (resolved.multiple && resolved.multiple.length > 0) {
          // Ask user to choose, provide suggested actions
          const suggestions = resolved.multiple.slice(0, 5).map(p => ({
            label: `Use project #${String(p.projectNumber).padStart(5, '0')} — ${p.projectName}`,
            action: `Use project #${p.projectNumber}`
          }));
          return sendSuccess(res, 200, { response: {
            content: 'I found multiple projects. Please choose one:',
            suggestedActions: suggestions
          } });
        }
      }
    }

    // Ensure project context is set in session if we have it
    if (projectContext && !session.activeProject) {
      session.activeProject = projectContext;
    }

    if (!projectContext && (message.includes('task') || message.includes('phase') || /project/i.test(message))) {
        return sendSuccess(res, 200, { response: { content: 'Please provide a project number or primary customer name so I can look it up.' } });
    }

    // Build richer project context for better answers
    let contextExtras = {};
    if (projectContext) {
      const [tracker, activeAlertsCount, nextDueAlert] = await Promise.all([
        prisma.projectWorkflowTracker.findFirst({
          where: { projectId: projectContext.id, isMainWorkflow: true },
          select: { id: true, currentLineItemId: true, currentPhaseId: true }
        }),
        prisma.workflowAlert.count({ where: { projectId: projectContext.id, status: 'ACTIVE' } }),
        prisma.workflowAlert.findFirst({
          where: { projectId: projectContext.id, status: 'ACTIVE', dueDate: { not: null } },
          orderBy: { dueDate: 'asc' },
          select: { id: true, title: true, dueDate: true, priority: true }
        })
      ]);

      let currentStepName = null;
      let currentPhaseName = null;
      if (tracker?.currentLineItemId) {
        const li = await prisma.workflowLineItem.findUnique({
          where: { id: tracker.currentLineItemId },
          select: { itemName: true, section: { select: { phase: { select: { phaseType: true, phaseName: true } } } } }
        });
        currentStepName = li?.itemName || null;
        currentPhaseName = li?.section?.phase?.phaseName || li?.section?.phase?.phaseType || null;
      }

      contextExtras = {
        activeAlerts: activeAlertsCount,
        workflowStatus: currentPhaseName || projectContext.status || null,
        currentStep: currentStepName,
        nextDueAlert: nextDueAlert ? {
          title: nextDueAlert.title,
          dueDate: nextDueAlert.dueDate,
          priority: nextDueAlert.priority
        } : null
      };
    }

    const systemPrompt = getSystemPrompt(req.user, projectContext);
    
    // BULLETPROOF FINAL INSTRUCTION
    const finalInstruction = projectContext && projectContext.projectName ? 
        `\n\n🚨 FINAL BULLETPROOF INSTRUCTION: You are working with project "${projectContext.projectName}" (ID: ${projectContext.id}). NEVER ask for project numbers, customer names, or any project identification. Use this project for ALL project-related questions.

## RESPONSE FORMAT INSTRUCTIONS:
- For ACTIONABLE requests (complete tasks, check status, etc.): Respond with JSON tool call format
- For GENERAL QUESTIONS (what is next, how to do something, etc.): Respond conversationally in natural language
- For PROJECT STATUS queries: Provide direct answers using project context
- NEVER ask for project identification when project is already selected` : 
        '';
    
    const completeSystemPrompt = systemPrompt + finalInstruction;
    
    // Reuse the existing session reference declared earlier
    const aiResponse = await openAIService.generateResponse(message, {
      systemPrompt: completeSystemPrompt,
      conversationHistory: session.conversationHistory,
      projectName: projectContext?.projectName,
      progress: projectContext?.progress,
      status: projectContext?.status,
      projectContext: projectContext, // Pass the full project context
      ...contextExtras
    });
    
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
                    const answer = await knowledgeBaseService.answerQuestion(params.question, projectContext);
                    toolResult = { success: true, message: answer };
                    break;
                default:
                    toolResult = { success: false, message: `The tool "${toolCall.tool}" is not recognized.` };
            }

            // Second AI call to formulate a natural response with bulletproof context
            const confirmationPrompt = `# CONFIRMATION RESPONSE GENERATOR

## CONTEXT
- **Project:** ${projectContext?.projectName || 'No project selected'}
- **Project ID:** ${projectContext?.id || 'N/A'}
- **User Action:** ${message}
- **Tool Result:** ${JSON.stringify(toolResult)}

## MANDATORY INSTRUCTIONS
1. **Use the selected project context** - ${projectContext?.projectName || 'No project selected'}
2. **NEVER ask for project numbers or customer names** - project is already selected
3. **Answer naturally and conversationally** based on the tool result
4. **Suggest 2-3 relevant next actions** for the user
5. **Keep response under 100 words** unless detailed explanation needed
6. **Use proper formatting** with bullet points and bold text

## RESPONSE FORMAT
- Brief confirmation of the action taken
- Natural explanation of the result
- 2-3 suggested next actions as bullet points
- Maintain project context throughout

## EXAMPLE RESPONSE PATTERN
"✅ [Action completed] for ${projectContext?.projectName || 'the project'}.

[Brief explanation of what happened]

**Next actions:**
• [Action 1]
• [Action 2] 
• [Action 3]"

Generate a natural, helpful response following this pattern.`;
            const finalAiResponse = await openAIService.generateSingleResponse(confirmationPrompt, projectContext);
            finalResponseContent = finalAiResponse.content;
        } else {
             // This is not a tool call, so it's a direct answer.
            finalResponseContent = aiResponse.content;
        }
    } catch (e) {
        // Heuristic handling for common intents when AI didn't return JSON
        const heuristic = await handleHeuristicIntent(message, projectContext, userId);
        if (heuristic.handled) {
            finalResponseContent = heuristic.content;
        } else {
            // For general questions, use the AI response directly instead of forcing JSON
            if (message.toLowerCase().includes('what') || message.toLowerCase().includes('how') || message.toLowerCase().includes('next') || message.toLowerCase().includes('line item')) {
                finalResponseContent = aiResponse.content;
            } else {
                // Retry with stricter instruction to respond ONLY with JSON tool call for actionable requests
                const strictPrompt = `${systemPrompt}\n\nIMPORTANT: Respond ONLY with a JSON object like {"tool": <name>, "parameters": { ... }} for actionable requests. No extra text.`;
                const strictResponse = await openAIService.generateResponse(message, { systemPrompt: strictPrompt });
            try {
                const toolCall = JSON.parse(strictResponse.content);
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
                            const answer = await knowledgeBaseService.answerQuestion(params.question, projectContext);
                            toolResult = { success: true, message: answer };
                            break;
                        default:
                            toolResult = { success: false, message: `The tool "${toolCall.tool}" is not recognized.` };
                    }

                    const confirmationPrompt = `# CONFIRMATION RESPONSE GENERATOR

## CONTEXT
- **Project:** ${projectContext?.projectName || 'No project selected'}
- **Project ID:** ${projectContext?.id || 'N/A'}
- **User Action:** ${message}
- **Tool Result:** ${JSON.stringify(toolResult)}

## MANDATORY INSTRUCTIONS
1. **Use the selected project context** - ${projectContext?.projectName || 'No project selected'}
2. **NEVER ask for project numbers or customer names** - project is already selected
3. **Answer naturally and conversationally** based on the tool result
4. **Suggest 2-3 relevant next actions** for the user
5. **Keep response under 100 words** unless detailed explanation needed
6. **Use proper formatting** with bullet points and bold text

## RESPONSE FORMAT
- Brief confirmation of the action taken
- Natural explanation of the result
- 2-3 suggested next actions as bullet points
- Maintain project context throughout

## EXAMPLE RESPONSE PATTERN
"✅ [Action completed] for ${projectContext?.projectName || 'the project'}.

[Brief explanation of what happened]

**Next actions:**
• [Action 1]
• [Action 2] 
• [Action 3]"

Generate a natural, helpful response following this pattern.`;
                    const finalAiResponse = await openAIService.generateSingleResponse(confirmationPrompt, projectContext);
                    finalResponseContent = finalAiResponse.content;
                } else {
                    finalResponseContent = strictResponse.content;
                }
            } catch (e2) {
                // If still not JSON, just return the conversational response
                finalResponseContent = strictResponse.content;
            }
        }
    }

    contextManager.addToHistory(userId, message, finalResponseContent, projectContext);
    
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

// @desc    Get current step (phase, section, line item) for a project
// @route   GET /api/bubbles/project/:projectId/current-step
// @access  Private
router.get('/project/:projectId/current-step', asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId);
  const tracker = await prisma.projectWorkflowTracker.findFirst({
    where: { projectId, isMainWorkflow: true },
    select: { id: true, currentLineItemId: true, currentPhaseId: true }
  });
  if (!tracker) {
    return sendSuccess(res, 200, { current: null }, 'No workflow tracker');
  }
  let li = null;
  if (tracker.currentLineItemId) {
    li = await prisma.workflowLineItem.findUnique({
      where: { id: tracker.currentLineItemId },
      select: {
        id: true,
        itemName: true,
        responsibleRole: true,
        section: { select: { id: true, displayName: true, phase: { select: { id: true, phaseType: true, phaseName: true } } } }
      }
    });
  }
  // Fallback: compute first incomplete item in current phase
  if (!li) {
    let phaseName = null;
    if (tracker.currentPhaseId) {
      const phase = await prisma.workflowPhase.findUnique({ where: { id: tracker.currentPhaseId }, select: { phaseType: true, phaseName: true } });
      phaseName = phase?.phaseType || phase?.phaseName || null;
    }
    if (phaseName) {
      try {
        const items = await new WorkflowActionService().getIncompleteItemsInPhase(projectId, phaseName);
        if (items && items.length > 0) {
          const first = items[0];
          return sendSuccess(res, 200, { current: {
            lineItemId: first.id,
            lineItemName: first.itemName,
            sectionId: null,
            sectionName: first.sectionName,
            phaseId: null,
            phaseType: first.phaseName || phaseName,
            phaseName: first.phaseName || phaseName,
            responsibleRole: null
          } }, 'Current step fetched (computed)');
        }
      } catch (_) {}
    }

    // Fallback 2: derive from active workflow alerts
    try {
      const alert = await prisma.workflowAlert.findFirst({
        where: { projectId, status: 'ACTIVE', lineItemId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: {
          lineItemId: true,
          lineItem: {
            select: {
              id: true,
              itemName: true,
              responsibleRole: true,
              section: { select: { id: true, displayName: true, phase: { select: { id: true, phaseType: true, phaseName: true } } } }
            }
          }
        }
      });
      if (alert?.lineItem) {
        const li2 = alert.lineItem;
        return sendSuccess(res, 200, { current: {
          lineItemId: li2.id,
          lineItemName: li2.itemName,
          sectionId: li2.section?.id,
          sectionName: li2.section?.displayName,
          phaseId: li2.section?.phase?.id,
          phaseType: li2.section?.phase?.phaseType,
          phaseName: li2.section?.phase?.phaseName,
          responsibleRole: li2.responsibleRole
        } }, 'Current step fetched (from active alert)');
      }
    } catch (_) {}

    // Fallback 3: compute first active item across current active phase/sections
    try {
      const wfType = tracker?.workflowType || 'ROOFING';
      const phaseAny = await prisma.workflowPhase.findFirst({
        where: { isActive: true, isCurrent: true, workflowType: wfType },
        orderBy: { displayOrder: 'asc' },
        include: {
          sections: {
            where: { isActive: true, isCurrent: true },
            orderBy: { displayOrder: 'asc' },
            include: { lineItems: { where: { isActive: true, isCurrent: true }, orderBy: { displayOrder: 'asc' } } }
          }
        }
      });
      const firstSection = phaseAny?.sections?.[0] || null;
      const firstItem = firstSection?.lineItems?.[0] || null;
      if (firstItem) {
        return sendSuccess(res, 200, { current: {
          lineItemId: firstItem.id,
          lineItemName: firstItem.itemName,
          sectionId: firstSection.id,
          sectionName: firstSection.displayName,
          phaseId: phaseAny.id,
          phaseType: phaseAny.phaseType,
          phaseName: phaseAny.phaseName,
          responsibleRole: firstItem.responsibleRole
        } }, 'Current step fetched (first active)');
      }
    } catch (_) {}
  }
  const current = li ? {
    lineItemId: li.id,
    lineItemName: li.itemName,
    sectionId: li.section?.id,
    sectionName: li.section?.displayName,
    phaseId: li.section?.phase?.id,
    phaseType: li.section?.phase?.phaseType,
    phaseName: li.section?.phase?.phaseName,
    responsibleRole: li.responsibleRole
  } : null;
  sendSuccess(res, 200, { current }, 'Current step fetched');
}));


module.exports = router;
