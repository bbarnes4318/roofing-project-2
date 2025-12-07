const express = require('express');
const OpenAI = require('openai');
const crypto = require('crypto');
const EmbeddingService = require('../services/EmbeddingService');
const { findAssetByMention } = require('../services/AssetLookup');
const { prisma } = require('../config/prisma');
const bubblesContextService = require('../services/BubblesContextService');
const emailService = require('../services/EmailService');
const proactiveNotificationsService = require('../services/ProactiveNotificationsService');
const crossProjectAnalyticsService = require('../services/CrossProjectAnalyticsService');

const router = express.Router();

// Date parsing helper functions (replicated from bubbles.js)
function nextBusinessDaysFromNow(days = 2) {
  const d = new Date();
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  d.setHours(17, 0, 0, 0);
  return d;
}

function parseDueDateFromText(text) {
  try {
    const lower = String(text || '').toLowerCase();
    const now = new Date();
    if (/(due\s*)?today\b/.test(lower)) {
      const d = new Date(); d.setHours(17,0,0,0); return d;
    }
    if (/(due\s*)?tomorrow\b/.test(lower)) {
      const d = new Date(); d.setDate(d.getDate()+1); d.setHours(17,0,0,0); return d;
    }
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    for (let i=0;i<7;i++) {
      if (lower.includes(days[i])) {
        const target = new Date(now);
        const diff = (i - now.getDay() + 7) % 7 || 7;
        target.setDate(now.getDate() + diff);
        target.setHours(17,0,0,0);
        return target;
      }
    }
    const byMatch = lower.match(/by\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (byMatch) {
      const m = parseInt(byMatch[1],10);
      const d = parseInt(byMatch[2],10);
      const y = byMatch[3] ? parseInt(byMatch[3],10) : now.getFullYear();
      const dt = new Date(y, m-1, d, 17, 0, 0, 0);
      return dt;
    }
  } catch (_) {}
  return nextBusinessDaysFromNow(2);
}

function parseReminderDateTimeFromText(text) {
  try {
    const lower = String(text || '').toLowerCase();
    const now = new Date();
    const timeMatch = lower.match(/(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    let base = new Date(now);
    if (/tomorrow/.test(lower)) base.setDate(base.getDate()+1);
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    for (let i=0;i<7;i++) {
      if (lower.includes(days[i])) {
        const target = new Date(now);
        const diff = (i - now.getDay() + 7) % 7 || 7;
        target.setDate(now.getDate() + diff);
        if (timeMatch) {
          let h = parseInt(timeMatch[1],10);
          const min = timeMatch[2] ? parseInt(timeMatch[2],10) : 0;
          const ampm = timeMatch[3];
          if (ampm === 'pm' && h < 12) h += 12;
          if (ampm === 'am' && h === 12) h = 0;
          target.setHours(h, min, 0, 0);
        } else {
          target.setHours(9, 0, 0, 0);
        }
        return target;
      }
    }
    if (timeMatch) {
      let h = parseInt(timeMatch[1],10);
      const min = timeMatch[2] ? parseInt(timeMatch[2],10) : 0;
      const ampm = timeMatch[3];
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      base.setHours(h, min, 0, 0);
      return base;
    }
    const d = nextBusinessDaysFromNow(1);
    d.setHours(9,0,0,0);
    return d;
  } catch (_) {}
  const d = nextBusinessDaysFromNow(1);
  d.setHours(9,0,0,0);
  return d;
}

// Import tool execution and system prompt from bubbles.js
// We'll create a shared version or import directly
let executeToolCall, getSystemPrompt, getCurrentWorkflowData;
try {
  // Try to load WorkflowActionService for workflow tools
  let WorkflowActionService, workflowActionService;
  try {
    WorkflowActionService = require('../services/WorkflowActionService');
    workflowActionService = new WorkflowActionService();
  } catch (e) {
    workflowActionService = null;
  }

  // Replicate executeToolCall function for VAPI
  executeToolCall = async function(toolName, args, context) {
    const { user, projectContext, currentWorkflowData } = context;
    
    console.log(`🔧 VAPI-EXECUTE-TOOL: ${toolName}`, args);
    
    try {
      // Data access tools
      if (toolName === 'get_all_projects') {
        const projects = await bubblesContextService.getAllProjects(args);
        return { success: true, data: projects, count: projects.length };
      }
      if (toolName === 'get_all_tasks') {
        if (!args.projectId && projectContext) args.projectId = projectContext.id;
        const tasks = await bubblesContextService.getAllTasks(args);
        return { success: true, data: tasks, count: tasks.length };
      }
      if (toolName === 'get_all_messages') {
        if (!args.projectId && projectContext) args.projectId = projectContext.id;
        const messages = await bubblesContextService.getAllMessages(args);
        return { success: true, data: messages, count: messages.length };
      }
      if (toolName === 'get_all_emails') {
        if (!args.projectId && projectContext) args.projectId = projectContext.id;
        const emails = await bubblesContextService.getAllEmails(args);
        return { success: true, data: emails, count: emails.length };
      }
      if (toolName === 'get_all_reminders') {
        if (!args.projectId && projectContext) args.projectId = projectContext.id;
        if (!args.organizerId) args.organizerId = user.id;
        const reminders = await bubblesContextService.getAllReminders(args);
        return { success: true, data: reminders, count: reminders.length };
      }
      if (toolName === 'get_customer_info') {
        let customer = null;
        if (args.customerId) {
          customer = await bubblesContextService.getCustomerContext(args.customerId);
        } else if (args.customerName) {
          const customers = await bubblesContextService.getAllCustomers({ search: args.customerName, limit: 1 });
          customer = customers.length > 0 ? customers[0] : null;
        } else if (projectContext?.customerId) {
          customer = await bubblesContextService.getCustomerContext(projectContext.customerId);
        }
        if (!customer) return { success: false, error: 'Customer not found' };
        const summary = await bubblesContextService.getCustomerSummary(customer.id);
        return { success: true, data: summary };
      }
      if (toolName === 'get_user_info') {
        let targetUser = null;
        if (args.userId) {
          targetUser = await bubblesContextService.getUserContext(args.userId);
        } else if (args.userEmail) {
          const users = await bubblesContextService.getAllUsers({ search: args.userEmail, limit: 1 });
          targetUser = users.length > 0 ? users[0] : null;
        }
        if (!targetUser) return { success: false, error: 'User not found' };
        const workload = await bubblesContextService.getUserWorkload(targetUser.id);
        return { success: true, data: { user: targetUser, workload } };
      }
      if (toolName === 'search_all_data') {
        if (!args.query) return { success: false, error: 'Search query is required' };
        const results = await bubblesContextService.searchAllData(args.query);
        return { success: true, data: results };
      }
      
      // ==================== PHASE 4: PROACTIVE & ANALYTICS TOOLS ====================
      
      if (toolName === 'get_proactive_summary') {
        const summary = await proactiveNotificationsService.getProactiveSummary(args.userId || user.id);
        return { success: true, data: summary, message: `Found ${summary.overdueTasks.count} overdue tasks, ${summary.upcomingDeadlines.count} upcoming deadlines, ${summary.communicationGaps.count} communication gaps, and ${summary.overdueAlerts.count} overdue alerts.` };
      }
      if (toolName === 'get_portfolio_analytics') {
        const analytics = await crossProjectAnalyticsService.getAnalyticsSummary();
        return { success: true, data: analytics };
      }
      if (toolName === 'get_resource_allocation') {
        const allocation = await crossProjectAnalyticsService.getResourceAllocation();
        return { success: true, data: allocation };
      }
      if (toolName === 'get_bottlenecks') {
        const bottlenecks = await crossProjectAnalyticsService.identifyBottlenecks();
        return { success: true, data: bottlenecks };
      }
      if (toolName === 'get_team_workload') {
        const workload = await crossProjectAnalyticsService.getTeamWorkload();
        return { success: true, data: workload };
      }
      
      // Workflow tools (require projectContext and workflowActionService)
      if (toolName === 'mark_line_item_complete_and_notify') {
        if (!projectContext) return { success: false, error: 'No project selected' };
        if (!workflowActionService) return { success: false, error: 'WorkflowActionService not available' };
        const result = await workflowActionService.markLineItemComplete(projectContext.id, args.lineItemName, user.id);
        return { success: true, data: result, message: `Marked "${args.lineItemName}" as complete` };
      }
      if (toolName === 'get_incomplete_items_in_phase') {
        if (!projectContext) return { success: false, error: 'No project selected' };
        if (!workflowActionService) return { success: false, error: 'WorkflowActionService not available' };
        const items = await workflowActionService.getIncompleteItemsInPhase(projectContext.id, args.phaseName);
        return { success: true, data: items, count: items.length };
      }
      if (toolName === 'find_blocking_task') {
        if (!projectContext) return { success: false, error: 'No project selected' };
        if (!workflowActionService) return { success: false, error: 'WorkflowActionService not available' };
        const blocker = await workflowActionService.findBlockingTask(projectContext.id, args.phaseName);
        return { success: true, data: blocker, found: !!blocker };
      }
      if (toolName === 'check_phase_readiness') {
        if (!projectContext) return { success: false, error: 'No project selected' };
        if (!workflowActionService) return { success: false, error: 'WorkflowActionService not available' };
        const readiness = await workflowActionService.checkPhaseReadiness(projectContext.id, args.phaseName);
        return { success: true, data: readiness };
      }
      if (toolName === 'reassign_task') {
        if (!projectContext) return { success: false, error: 'No project selected' };
        if (!workflowActionService) return { success: false, error: 'WorkflowActionService not available' };
        const result = await workflowActionService.reassignTask(projectContext.id, args.lineItemName, args.newUserEmail);
        return { success: true, data: result };
      }
      if (toolName === 'answer_company_question') {
        const KnowledgeBaseService = require('../services/KnowledgeBaseService');
        const kbService = new KnowledgeBaseService();
        const answer = await kbService.answerQuestion(args.question, projectContext);
        return { success: true, data: { answer } };
      }
      
      // ==================== STANDALONE ACTION TOOLS (PHASE 2) ====================
      
      if (toolName === 'create_task') {
        let effectiveProjectId = args.projectId || (projectContext?.id || null);
        if (!effectiveProjectId) {
          return { success: false, error: 'Project ID is required. Please select a project or provide a projectId.' };
        }
        const project = await prisma.project.findUnique({ where: { id: effectiveProjectId } });
        if (!project) return { success: false, error: 'Project not found' };
        let assignedToId = args.assignedToId || null;
        if (!assignedToId && args.assignedToEmail) {
          const assignedUser = await prisma.user.findUnique({ where: { email: args.assignedToEmail } });
          if (!assignedUser) return { success: false, error: `User with email ${args.assignedToEmail} not found` };
          assignedToId = assignedUser.id;
        }
        if (!assignedToId) assignedToId = project.projectManagerId || user.id;
        const dueDate = args.dueDate ? parseDueDateFromText(args.dueDate) : nextBusinessDaysFromNow(2);
        const priority = args.priority && ['LOW', 'MEDIUM', 'HIGH'].includes(args.priority.toUpperCase()) ? args.priority.toUpperCase() : 'MEDIUM';
        const attachments = [];
        if (args.documentIds && Array.isArray(args.documentIds) && args.documentIds.length > 0) {
          for (const docId of args.documentIds) {
            const asset = await prisma.companyAsset.findUnique({ where: { id: docId } });
            if (asset) attachments.push({ assetId: asset.id, title: asset.title || 'Document', mimeType: asset.mimeType || 'application/octet-stream', fileUrl: asset.fileUrl || null, thumbnailUrl: asset.thumbnailUrl || null });
          }
        }
        const task = await prisma.task.create({
          data: {
            title: args.title.slice(0, 255),
            description: args.description ? args.description.slice(0, 2000) : null,
            dueDate, priority, status: 'TO_DO', category: 'DOCUMENTATION',
            projectId: effectiveProjectId, assignedToId, createdById: user.id,
            notes: attachments.length > 0 ? `Attached documents: ${attachments.map(a => a.title).join(', ')}` : null
          }
        });
        if (attachments.length > 0) {
          try {
            await prisma.projectMessage.create({
              data: {
                content: `Task "${task.title}" created with attached documents.`,
                subject: `Task: ${task.title}`, messageType: 'USER_MESSAGE', priority: 'MEDIUM',
                authorId: user.id, authorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Bubbles AI',
                authorRole: user.role || 'AI_ASSISTANT', projectId: effectiveProjectId, projectNumber: project.projectNumber,
                isSystemGenerated: false, isWorkflowMessage: false,
                metadata: { taskId: task.id, taskTitle: task.title, attachments: attachments, source: 'bubbles_ai_create_task' }
              }
            });
          } catch (_) {}
        }
        return { success: true, data: { task: { id: task.id, title: task.title, description: task.description, dueDate: task.dueDate, priority: task.priority, status: task.status, projectId: task.projectId, assignedToId: task.assignedToId, attachments: attachments.map(a => ({ id: a.assetId, title: a.title })) } }, message: `Task "${task.title}" created successfully${attachments.length > 0 ? ` with ${attachments.length} document(s) attached` : ''}.` };
      }
      
      if (toolName === 'create_reminder') {
        let effectiveProjectId = args.projectId || (projectContext?.id || null);
        if (!effectiveProjectId) return { success: false, error: 'Project ID is required. Please select a project or provide a projectId.' };
        const project = await prisma.project.findUnique({ where: { id: effectiveProjectId } });
        if (!project) return { success: false, error: 'Project not found' };
        const startTime = args.startTime ? parseReminderDateTimeFromText(args.startTime) : (() => { const d = nextBusinessDaysFromNow(1); d.setHours(9, 0, 0, 0); return d; })();
        let endTime = args.endTime ? new Date(args.endTime) : new Date(startTime.getTime() + 30 * 60 * 1000);
        if (isNaN(endTime.getTime())) return { success: false, error: 'Invalid endTime format. Use ISO date string.' };
        const eventType = args.eventType && ['REMINDER', 'MEETING', 'DEADLINE'].includes(args.eventType.toUpperCase()) ? args.eventType.toUpperCase() : 'REMINDER';
        const attendeeUserIds = [];
        if (args.attendeeIds && Array.isArray(args.attendeeIds)) attendeeUserIds.push(...args.attendeeIds);
        if (args.attendeeEmails && Array.isArray(args.attendeeEmails)) {
          for (const email of args.attendeeEmails) {
            const attendeeUser = await prisma.user.findUnique({ where: { email } });
            if (attendeeUser) attendeeUserIds.push(attendeeUser.id);
          }
        }
        const attachments = [];
        if (args.documentIds && Array.isArray(args.documentIds) && args.documentIds.length > 0) {
          for (const docId of args.documentIds) {
            const asset = await prisma.companyAsset.findUnique({ where: { id: docId } });
            if (asset) attachments.push({ assetId: asset.id, title: asset.title || 'Document', mimeType: asset.mimeType || 'application/octet-stream', fileUrl: asset.fileUrl || null, thumbnailUrl: asset.thumbnailUrl || null });
          }
        }
        const event = await prisma.calendarEvent.create({
          data: {
            title: args.title.slice(0, 120),
            description: args.description ? args.description.slice(0, 2000) : (attachments.length > 0 ? `Attached documents: ${attachments.map(a => a.title).join(', ')}` : null),
            startTime, endTime, isAllDay: false, eventType, status: 'CONFIRMED',
            projectId: effectiveProjectId, organizerId: user.id,
            attendees: attendeeUserIds.length > 0 ? { create: attendeeUserIds.map(userId => ({ userId, status: 'REQUIRED', response: 'NO_RESPONSE' })) } : undefined
          }
        });
        if (attachments.length > 0) {
          try {
            await prisma.projectMessage.create({
              data: {
                content: `Reminder "${event.title}" created with attached documents.`,
                subject: `Reminder: ${event.title}`, messageType: 'USER_MESSAGE', priority: 'MEDIUM',
                authorId: user.id, authorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Bubbles AI',
                authorRole: user.role || 'AI_ASSISTANT', projectId: effectiveProjectId, projectNumber: project.projectNumber,
                isSystemGenerated: false, isWorkflowMessage: false,
                metadata: { eventId: event.id, eventTitle: event.title, attachments: attachments, source: 'bubbles_ai_create_reminder' }
              }
            });
          } catch (_) {}
        }
        return { success: true, data: { reminder: { id: event.id, title: event.title, description: event.description, startTime: event.startTime, endTime: event.endTime, eventType: event.eventType, projectId: event.projectId, organizerId: event.organizerId, attendeeIds: attendeeUserIds, attachments: attachments.map(a => ({ id: a.assetId, title: a.title })) } }, message: `Reminder "${event.title}" created successfully${attachments.length > 0 ? ` with ${attachments.length} document(s) attached` : ''}${attendeeUserIds.length > 0 ? ` and ${attendeeUserIds.length} attendee(s)` : ''}.` };
      }
      
      if (toolName === 'send_email') {
        if (!args.subject || !args.body || !args.recipientEmails || !Array.isArray(args.recipientEmails) || args.recipientEmails.length === 0) {
          return { success: false, error: 'subject, body, and recipientEmails (array) are required' };
        }
        let effectiveProjectId = args.projectId || (projectContext?.id || null);
        let project = effectiveProjectId ? await prisma.project.findUnique({ where: { id: effectiveProjectId } }) : null;
        const emailAttachments = [];
        if (args.documentIds && Array.isArray(args.documentIds) && args.documentIds.length > 0) {
          for (const docId of args.documentIds) {
            const asset = await prisma.companyAsset.findUnique({ where: { id: docId } });
            if (asset) emailAttachments.push({ documentId: asset.id, title: asset.title, fileUrl: asset.fileUrl || null });
          }
        }
        const results = [];
        const allRecipients = [...args.recipientEmails];
        const ccList = args.cc && Array.isArray(args.cc) ? args.cc : [];
        const bccList = args.bcc && Array.isArray(args.bcc) ? args.bcc : [];
        const html = emailService.createEmailTemplate({
          title: args.subject, content: args.body.replace(/\n/g, '<br>'),
          footer: `This email was sent via Bubbles AI Assistant by ${user.firstName} ${user.lastName}` + (project ? `<br><br><strong>Project:</strong> ${project.projectName}<br><strong>Project #:</strong> ${project.projectNumber}` : '')
        });
        for (const recipientEmail of allRecipients) {
          try {
            const emailResult = await emailService.sendEmail({
              to: recipientEmail, cc: ccList.length > 0 ? ccList : undefined, bcc: bccList.length > 0 ? bccList : undefined,
              subject: args.subject, html, text: args.body, attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
              replyTo: user.email, tags: { sentBy: user.id, projectId: effectiveProjectId || undefined, recipientEmail: recipientEmail, source: 'bubbles_ai_standalone_email' }
            });
            await emailService.logEmail({
              senderId: user.id, senderEmail: user.email, senderName: `${user.firstName} ${user.lastName}`,
              to: [recipientEmail], cc: ccList.length > 0 ? ccList : undefined, bcc: bccList.length > 0 ? bccList : undefined,
              subject: args.subject, text: args.body, html, attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
              messageId: emailResult.messageId, projectId: effectiveProjectId || undefined, emailType: 'bubbles_ai', status: 'sent',
              tags: { source: 'bubbles_ai_standalone_email', hasAttachments: emailAttachments.length > 0 },
              metadata: { documentIds: args.documentIds || [], documentTitles: emailAttachments.map(a => a.title), sentViaTool: true }
            });
            results.push({ recipient: recipientEmail, success: true, messageId: emailResult.messageId });
          } catch (emailErr) {
            console.error(`Failed to send email to ${recipientEmail}:`, emailErr);
            results.push({ recipient: recipientEmail, success: false, error: emailErr.message });
          }
        }
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        return { success: successCount > 0, data: { results, sentCount: successCount, failedCount: failCount, recipients: allRecipients, attachments: emailAttachments.map(a => ({ id: a.documentId, title: a.title })) }, message: `Email sent to ${successCount} recipient(s)${failCount > 0 ? ` (${failCount} failed)` : ''}${emailAttachments.length > 0 ? ` with ${emailAttachments.length} document(s) attached` : ''}.` };
      }
      
      return { success: false, error: `Unknown tool: ${toolName}` };
    } catch (error) {
      console.error(`❌ VAPI-EXECUTE-TOOL ERROR (${toolName}):`, error);
      return { success: false, error: error.message || 'Tool execution failed', details: error.stack };
    }
  };

  // Helper to get current workflow data
  getCurrentWorkflowData = async function(projectId) {
    const tracker = await prisma.projectWorkflowTracker.findFirst({
      where: { projectId, isMainWorkflow: true },
      select: { id: true, currentLineItemId: true, currentPhaseId: true, workflowType: true }
    });
    
    let li = null;
    if (tracker?.currentLineItemId) {
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
    
    if (li) {
      return {
        lineItemId: li.id,
        lineItemName: li.itemName,
        sectionId: li.section?.id,
        sectionName: li.section?.displayName,
        phaseId: li.section?.phase?.id,
        phaseType: li.section?.phase?.phaseType,
        phaseName: li.section?.phase?.phaseName,
        responsibleRole: li.responsibleRole
      };
    }
    
    return null;
  };

} catch (e) {
  console.error('❌ VAPI: Failed to load tool execution functions:', e);
}
 

const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o';
const openaiClient = (() => {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  return apiKey ? new OpenAI({ apiKey }) : null;
})();

function authVapi(req, res, next) {
  const incoming = req.header('X-VAPI-KEY') || req.header('x-vapi-key');
  const expected = (process.env.VAPI_INTERNAL_KEY || '').trim();
  if (!expected) return res.status(500).json({ success: false, message: 'Server missing VAPI_INTERNAL_KEY' });
  if (!incoming || incoming !== expected) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
}

// Build system prompt with tools for VAPI (similar to bubbles.js but voice-optimized)
async function buildVapiSystemPrompt(user, projectContext, currentWorkflowData, tools) {
  const userName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Fetch user context
  let userWorkload = null;
  try {
    if (user?.id) {
      userWorkload = await bubblesContextService.getUserWorkload(user.id);
    }
  } catch (e) {
    console.error('❌ VAPI: Error fetching user workload:', e);
  }

  let prompt = `# BUBBLES AI ASSISTANT - VOICE MODE

## IDENTITY & CONTEXT
You are "Bubbles," an expert AI assistant for Kenstruction, a premier roofing and construction company.
- **User:** ${userName}
- **Date:** ${currentDate}
- **Mode:** Voice conversation (keep responses concise - 10-20 seconds when spoken)

## VOICE-SPECIFIC INSTRUCTIONS
- Speak naturally and conversationally
- Keep responses SHORT (under 100 words for voice)
- Use simple, clear language
- Avoid complex lists - use short sentences
- For questions requiring data, use the available tools

## CRITICAL: MANDATORY TOOL USAGE FOR DATA QUESTIONS
**You MUST use the available tools to answer ANY questions about projects, tasks, messages, emails, customers, or any application data.**

RULES YOU MUST FOLLOW:
1. When asked "how many projects" → ALWAYS call \`get_all_projects\` first
2. When asked about a specific project → call \`get_all_projects\` with search parameter
3. When asked about tasks or workload → call \`get_all_tasks\`
4. When asked about emails → call \`get_all_emails\`
5. When asked about messages → call \`get_all_messages\`
6. When asked about reminders/calendar → call \`get_all_reminders\`
7. **NEVER make up project names, numbers, customer names, or any data**
8. **NEVER say "I don't have access" - you DO have access through these tools**
9. If a tool returns empty results, say "I didn't find any matching records"
10. If a tool returns data, summarize it concisely for voice

## COMPREHENSIVE DATA ACCESS
You have COMPLETE ACCESS to ALL application data through tools:
- Use \`get_all_projects\` to find projects by name, number, status, phase
- Use \`get_all_tasks\` to find tasks, workload, overdue items
- Use \`get_all_messages\` to find communication history
- Use \`get_all_emails\` to find email history and tracking
- Use \`get_all_reminders\` to find calendar events
- Use \`get_customer_info\` to find customer information
- Use \`get_user_info\` to find team member information
- Use \`search_all_data\` for general searches

${projectContext && projectContext.projectName ? `
## ACTIVE PROJECT
**Project:** ${projectContext.projectName} (#${String(projectContext.projectNumber).padStart(5, '0')})
**Progress:** ${projectContext.progress || 0}%
**Customer:** ${projectContext.customer?.primaryName || 'N/A'}
${currentWorkflowData ? `
**Current Phase:** ${currentWorkflowData.phaseName || currentWorkflowData.phaseType || 'N/A'}
**Current Task:** ${currentWorkflowData.lineItemName || 'N/A'}
` : ''}
` : ''}

${userWorkload ? `
## YOUR WORKLOAD
- Tasks: ${userWorkload.tasks.total} (${userWorkload.tasks.overdue} overdue)
- Active Alerts: ${userWorkload.alerts.active}
- Upcoming Reminders: ${userWorkload.reminders.upcoming}
` : ''}

## RESPONSE FORMAT
- Keep responses under 100 words for voice
- Use natural, conversational language
- If you need to call a tool, do so and then summarize the results concisely
- After calling a tool, report the ACTUAL data returned - never invent data`;

  return prompt;
}

function buildRagMessages({ chunks, userQuery, systemPrompt }) {
  const system = {
    role: 'system',
    content: systemPrompt || 'You are the company\'s AI assistant. Speak naturally and conversationally. Keep responses concise (10-20 seconds when spoken).'
  };
  const contextBlocks = chunks.map((c) => {
    const meta = c.metadata || {};
    return {
      role: 'user',
      content: `--- DOCUMENT START ---\nfileId: ${c.fileId}\npage: ${meta.page || ''}\nchunkId: ${c.chunkId || ''}\nsnippet: ${c.snippet || ''}\n--- DOCUMENT END ---`
    };
  });
  const instruction = {
    role: 'user',
    content: `Voice call user said: ${userQuery}. If this is a general conversation, answer naturally without citing docs. If it requires facts from documents, use the context above and include brief citations in brackets. Return plain text only.`
  };
  return [system, ...contextBlocks, instruction];
}


// ===== Helpers already defined at top of file (nextBusinessDaysFromNow, parseDueDateFromText, parseReminderDateTimeFromText) =====


function extractProjectNumberFromText(text) {
  if (!text) return null;
  const m = String(text).match(/(?:project\s*#?|#)\s*(\d{3,7})/i) || String(text).match(/\b(\d{4,7})\b/);
  return m ? parseInt(m[1], 10) : null;
}

// Helper: extract recipient names from freeform voice text (prefers "to", supports "for")
function extractRecipientNamesFromVoice(message) {
  try {
    const text = String(message || '');
    const lower = text.toLowerCase();
    const toMatch = lower.match(/\bto\b([\s\S]*?)(?:$|\bwith a message\b|\bmessage saying\b)/i);
    const forMatch = lower.match(/\bfor\b([\s\S]*?)(?:$|\bwith a message\b|\bmessage saying\b)/i);
    let segment = '';
    if (toMatch && toMatch[1]) segment = text.slice(toMatch.index + 2, toMatch.index + 2 + toMatch[1].length);
    if (!segment && forMatch && forMatch[1]) segment = text.slice(forMatch.index + 3, forMatch.index + 3 + forMatch[1].length);
    segment = (segment || '').trim();
    if (!segment) return [];
    segment = segment
      .replace(/project\s*#?\s*\d+/ig, '')
      .replace(/project\s+[a-z0-9\s]+/ig, '')
      .replace(/\s+for\s+project[\s\S]*$/i, '')
      .replace(/\s+with a message[\s\S]*$/i, '')
      .replace(/\s+message saying[\s\S]*$/i, '');
    const parts = segment
      .split(/,|\band\b/i)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    const blocklist = new Set(['the','team','customer','primary','contact','manager','project']);
    return parts.map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p && !blocklist.has(p.toLowerCase()));
  } catch (_) {
    return [];
  }
}

// Using shared AssetLookup.findAssetByMention via import above

// POST /api/vapi/assistant-query
// Auth: header X-VAPI-KEY must match VAPI_INTERNAL_KEY
router.post('/vapi/assistant-query', authVapi, async (req, res) => {
  try {
    const raw = req.body || {};
    
    // Log incoming request for debugging
    console.log('[Vapi] ===== INCOMING REQUEST =====');
    console.log('[Vapi] Request body keys:', Object.keys(raw));
    console.log('[Vapi] Raw body:', JSON.stringify(raw, null, 2).slice(0, 2000));
    
    // CRITICAL: Handle Vapi's nested message structure
    // Vapi sends: { "message": { "type": "tool-calls", "toolCalls": [...] } }
    // We need to extract the query from toolCalls[].function.arguments.query
    let query = '';
    let projectId = null;
    let userId = null;
    let userName = null;
    let returnActions = false;
    let contextFileIds = [];
    
    // Check if this is a Vapi tool-call request with nested message structure
    if (raw.message && raw.message.toolCalls && Array.isArray(raw.message.toolCalls)) {
      console.log('[Vapi] Detected Vapi tool-calls message format');
      const toolCall = raw.message.toolCalls[0];
      if (toolCall && toolCall.function && toolCall.function.arguments) {
        const args = toolCall.function.arguments;
        query = args.query || '';
        projectId = args.projectId || args.projectid || args.project_id || null;
        userId = args.userId || args.user_id || null;
        userName = args.userName || args.user_name || null;
        returnActions = args.returnActions === true || args.returnActions === 'true';
        contextFileIds = args.contextFileIds || [];
        console.log('[Vapi] Extracted from toolCall:', { query: String(query).slice(0, 100), projectId, userId, returnActions });
      }
    } else {
      // Fallback: Accept multiple possible field names coming from Vapi UI schema builder
      projectId = raw.projectId ?? raw.projectid ?? raw.project_id ?? raw.project ?? req.query.projectId ?? req.query.projectid ?? null;
      query = raw.query ?? raw.input ?? raw.text ?? req.query.query ?? req.query.q ?? '';
      // If query is still an object (from raw.message being an object), extract string
      if (typeof query === 'object' && query !== null) {
        query = query.query || query.text || query.input || '';
      }
      contextFileIds = raw.contextFileIds ?? raw.context_file_ids ?? raw.fileIds ?? raw.file_ids ?? [];
      userId = raw.userId || raw.user_id || null;
      userName = raw.userName || raw.user_name || null;
      returnActions = raw.returnActions === true || (req.header('X-Return-Actions') === '1');
    }
    
    // Also allow Vapi variable values to carry context
    const vars = raw.variableValues ?? raw.variables ?? raw.vars ?? raw.turn?.variables ?? {};
    if (!projectId) {
      projectId = vars.projectId ?? vars.project_id ?? vars.projectid ?? null;
    }
    if (!userId) {
      userId = vars.userId ?? vars.user_id ?? null;
    }
    
    console.log('[Vapi] Final parsed params:', { projectId, query: String(query).slice(0, 100), userId, userName, hasVars: !!vars, varKeys: Object.keys(vars || {}) });

    // Normalize contextFileIds to array
    if (!Array.isArray(contextFileIds)) {
      if (typeof contextFileIds === 'string') {
        try {
          const parsed = JSON.parse(contextFileIds);
          contextFileIds = Array.isArray(parsed) ? parsed : (String(contextFileIds).includes(',') ? String(contextFileIds).split(',').map(s => s.trim()).filter(Boolean) : [String(contextFileIds)]);
        } catch (_) {
          contextFileIds = String(contextFileIds).includes(',') ? String(contextFileIds).split(',').map(s => s.trim()).filter(Boolean) : (contextFileIds ? [String(contextFileIds)] : []);
        }
      } else if (contextFileIds && typeof contextFileIds === 'object') {
        // handle accidental object map -> use its values
        contextFileIds = Object.values(contextFileIds).map(String);
      } else {
        contextFileIds = [];
      }
    }

    // Validate query
    if (!query || String(query).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }

    // returnActions is already set above from tool call parsing or fallback

    // Voice doc attach intent: handle before RAG/LLM
    const lower = String(query).toLowerCase();
    const wantsSend = /(send|share|attach|email|message)\b/.test(lower);
    const docyIntent = /(\.(pdf|docx|doc|xlsx|csv|txt|jpg|jpeg|png)\b|document|file|permit|estimate|warranty|checklist|manual|policy|form|guide|photo|image)/.test(lower);
    try { console.log('[Vapi] intent flags', { wantsSend, docyIntent, query: String(query).slice(0,140) }); } catch(_) {}

    if (wantsSend) {
      // Resolve project by provided id or by number in text
      let proj = null;
      if (projectId) {
        try {
          proj = await prisma.project.findUnique({ where: { id: String(projectId) }, select: { id: true, projectNumber: true, projectName: true, projectManagerId: true } });
        } catch(e) { try { console.warn('[Vapi] project lookup by projectId failed', e?.message || e); } catch(_) {} }
      }
      if (!proj) {
        const pnum = extractProjectNumberFromText(query);
        if (pnum) {
          try { proj = await prisma.project.findFirst({ where: { projectNumber: pnum }, select: { id: true, projectNumber: true, projectName: true, projectManagerId: true } }); } catch(e) { try { console.warn('[Vapi] project lookup by number failed', e?.message || e); } catch(_) {} }
        }
      }

      if (!proj) {
        const msg = 'I need a project to send that to. Please say the project number, for example “Send to project #12345…”.';
        if (returnActions) return res.json({ actions: [{ type: 'say', text: msg }] });
        return res.json({ success: false, message: msg });
      }

      // Find asset from mention (even if docyIntent was false, still attempt)
      let asset = null;
      try { asset = await findAssetByMention(prisma, query); } catch(e) { try { console.warn('[Vapi] findAssetByMention error', e?.message || e); } catch(_) {} }
      try { console.log('[Vapi] asset lookup result', { found: !!asset, title: asset?.title, id: asset?.id }); } catch(_) {}
      if (!asset) {
        const msg = 'I couldn\'t find that document in Documents & Resources. Try mentioning more of the file name or the checklist name.';
        if (returnActions) return res.json({ actions: [{ type: 'say', text: msg }] });
        return res.json({ success: false, message: msg });
      }

      // Extract and resolve recipients (prefer explicit internal users, not customers)
      const recipientNames = extractRecipientNamesFromVoice(query);
      let recipients = [];
      if (recipientNames.length > 0) {
        const ors = [];
        for (const n of recipientNames) {
          const [fn, ln] = String(n).split(/\s+/);
          if (fn && ln) {
            ors.push({ AND: [ { firstName: { contains: fn, mode: 'insensitive' } }, { lastName: { contains: ln, mode: 'insensitive' } } ] });
          } else if (fn) {
            ors.push({ OR: [ { firstName: { contains: fn, mode: 'insensitive' } }, { lastName: { contains: fn, mode: 'insensitive' } } ] });
          }
        }
        if (ors.length) {
          try {
            recipients = await prisma.user.findMany({ where: { OR: ors }, select: { id: true, firstName: true, lastName: true, email: true } });
          } catch(e) { try { console.warn('[Vapi] recipient lookup failed', e?.message || e); } catch(_) {} }
        }
      }
      try { console.log('[Vapi] recipients resolved', { names: recipientNames, count: (recipients||[]).length }); } catch(_) {}
      // Fallback: specific internal target or project manager
      if (recipients.length === 0) {
        try {
          if (lower.includes('sarah owner')) {
            const sarah = await prisma.user.findFirst({
              where: { AND: [ { firstName: { contains: 'Sarah', mode: 'insensitive' } }, { lastName: { contains: 'Owner', mode: 'insensitive' } } ] },
              select: { id: true, firstName: true, lastName: true, email: true }
            });
            if (sarah) recipients = [sarah];
          }
          if (recipients.length === 0 && (lower.includes('owner') || lower.includes('project manager'))) {
            const projFull = await prisma.project.findUnique({ where: { id: proj.id }, select: { projectManagerId: true } });
            if (projFull?.projectManagerId) {
              const pmUser = await prisma.user.findUnique({ where: { id: projFull.projectManagerId }, select: { id: true, firstName: true, lastName: true, email: true } });
              if (pmUser) recipients = [pmUser];
            }
          }
        } catch (_) {}
      }

      // Extract message content - improved logic to capture user's actual message
      let userContent = '';
      
      // First try to extract from specific patterns
      const sayingIdx = lower.indexOf('message saying');
      if (sayingIdx !== -1) {
        let extracted = query.slice(sayingIdx + 'message saying'.length).replace(/^[:\s-]+/, '').trim();
        // If the content is quoted, extract just the quoted part with proper quote handling
        const doubleQuoteMatch = extracted.match(/^"([^"]+)"$/);
        if (doubleQuoteMatch) {
          userContent = doubleQuoteMatch[1].trim();
        } else {
          const singleQuoteMatch = extracted.match(/^'([^']+)'$/);
          if (singleQuoteMatch) {
            userContent = singleQuoteMatch[1].trim();
          } else {
            userContent = extracted;
          }
        }
      }
      if (!userContent) {
        const withIdx = lower.indexOf('with a message');
        if (withIdx !== -1) {
          let extracted = query.slice(withIdx + 'with a message'.length).replace(/^[:\s-]+/, '').trim();
          // If the content is quoted, extract just the quoted part with proper quote handling
          const doubleQuoteMatch = extracted.match(/^"([^"]+)"$/);
          if (doubleQuoteMatch) {
            userContent = doubleQuoteMatch[1].trim();
          } else {
            const singleQuoteMatch = extracted.match(/^'([^']+)'$/);
            if (singleQuoteMatch) {
              userContent = singleQuoteMatch[1].trim();
            } else {
              userContent = extracted;
            }
          }
        }
      }
      
      // If no specific patterns found, try to extract the main message content
      if (!userContent) {
        let cleanMessage = query;
        
        // Remove document references (quoted filenames)
        cleanMessage = cleanMessage.replace(/["'][^"']*\.(pdf|docx?|txt|jpg|png|gif)["']/gi, '');
        
        // Remove common attachment phrases
        cleanMessage = cleanMessage.replace(/\b(attach|send|share|include)\s+(this\s+)?(document|file|pdf|doc)\b/gi, '');
        cleanMessage = cleanMessage.replace(/\b(with|and)\s+(this\s+)?(document|file|pdf|doc)\b/gi, '');
        
        // Clean up extra whitespace
        cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim();
        
        // If we have meaningful content left, use it
        if (cleanMessage.length > 3 && !cleanMessage.match(/^(send|attach|share|include)$/i)) {
          userContent = cleanMessage;
        }
      }

      // Build attachment
      const fileUrl = asset?.versions?.[0]?.fileUrl || asset?.fileUrl || null;
      const attachment = {
        assetId: asset.id || null,
        title: asset.title || 'Document',
        mimeType: asset.mimeType || 'application/octet-stream',
        fileUrl,
        thumbnailUrl: asset.thumbnailUrl || null
      };

      // Create project message
      const authorName = raw.userName || raw.username || raw.user_name || 'Voice Assistant';
      const authorId = raw.userId || raw.user_id || null;
      const lowerPriority = lower.includes('high') ? 'HIGH' : (lower.includes('low') ? 'LOW' : 'MEDIUM');
      const pm = await prisma.projectMessage.create({
        data: {
          content: userContent || `Shared document: ${attachment.title}`,
          subject: `Document: ${attachment.title}`,
          messageType: 'USER_MESSAGE',
          priority: lowerPriority,
          authorId: authorId || undefined,
          authorName,
          authorRole: 'VOICE_ASSISTANT',
          projectId: proj.id,
          projectNumber: proj.projectNumber,
          isSystemGenerated: false,
          isWorkflowMessage: false,
          metadata: { attachments: [attachment] }
        }
      });
      try { console.log('[Vapi] projectMessage created', { id: pm.id, projectId: proj.id, subject: `Document: ${attachment.title}` }); } catch(_) {}

      if (recipients.length > 0) {
        try {
          await prisma.projectMessageRecipient.createMany({ data: recipients.map(r => ({ messageId: pm.id, userId: r.id })) });
          try { console.log('[Vapi] recipients inserted for message', { messageId: pm.id, count: recipients.length }); } catch(_) {}
        } catch(e) { try { console.warn('[Vapi] create recipients failed', e?.message || e); } catch(_) {} }
      }

      // Socket.IO broadcast so the activity feed updates live
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`project_${proj.id}`).emit('newMessage', { projectId: proj.id, subject: `Document: ${attachment.title}`, messageId: pm.id });
          if (recipients.length > 0) {
            recipients.forEach(r => {
              io.to(`user_${r.id}`).emit('newMessage', { projectId: proj.id, subject: `Document: ${attachment.title}`, messageId: pm.id, recipientId: r.id });
            });
          }
        }
      } catch (_) {}

      // Optional Task
      let createdTask = null;
      const intendsTask = /\b(task|todo|to-do)\b/.test(lower) || /assign|follow up/.test(lower);
      if (intendsTask) {
        let assignedToId = recipients?.[0]?.id || null;
        if (!assignedToId) {
          try {
            const projFull = await prisma.project.findUnique({ where: { id: proj.id }, select: { projectManagerId: true } });
            assignedToId = projFull?.projectManagerId || authorId || null;
          } catch (_) { assignedToId = authorId || null; }
        }
        const due = parseDueDateFromText(query);
        const taskTitle = (userContent && userContent.length <= 80) ? userContent : `Review: ${attachment.title}`;
        try {
          createdTask = await prisma.task.create({
            data: {
              title: taskTitle.slice(0, 200),
              description: `Auto-created from Voice when sending ${attachment.title}.` + (userContent ? `\n\nNote: ${userContent}` : ''),
              dueDate: due,
              priority: lowerPriority,
              status: 'TO_DO',
              category: 'DOCUMENTATION',
              projectId: proj.id,
              assignedToId: assignedToId || (authorId || undefined),
              createdById: authorId || undefined
            }
          });
        } catch (_) {}
      }

      // Optional Reminder
      let createdReminder = null;
      const intendsReminder = /\b(remind|reminder|calendar|event)\b/.test(lower);
      if (intendsReminder) {
        try {
          const start = parseReminderDateTimeFromText(query);
          const end = new Date(start.getTime() + 30 * 60 * 1000);
          const event = await prisma.calendarEvent.create({
            data: {
              title: `Follow-up: ${attachment.title}`.slice(0, 120),
              description: `Auto-created from Voice when sending ${attachment.title}.` + (userContent ? `\n\nNote: ${userContent}` : ''),
              startTime: start,
              endTime: end,
              isAllDay: false,
              eventType: 'REMINDER',
              status: 'CONFIRMED',
              projectId: proj.id,
              organizerId: authorId || (recipients?.[0]?.id) || (proj.projectManagerId) || undefined,
              attendees: recipients?.length ? { create: recipients.map(r => ({ userId: r.id, status: 'REQUIRED', response: 'NO_RESPONSE' })) } : undefined
            }
          });
          createdReminder = event;
        } catch (_) {}
      }

      const parts = [];
      parts.push(`Attached "${attachment.title}" to a new project message for project #${proj.projectNumber}` + (recipients.length ? ` and notified ${recipients.map(r => r.firstName + ' ' + r.lastName).join(', ')}` : '') + '.');
      if (createdTask) parts.push(`Created task "${createdTask.title}" (due ${new Date(createdTask.dueDate).toLocaleString()}).`);
      if (createdReminder) parts.push(`Set a reminder for ${new Date(createdReminder.startTime).toLocaleString()}.`);
      const ack = parts.join(' ');

      if (returnActions) return res.json({ actions: [{ type: 'say', text: ack }] });
      return res.json({ success: true, answer: ack, messageId: pm.id, attachments: [attachment], taskId: createdTask?.id, reminderId: createdReminder?.id });
    }

    let chunks = [];
    if (Array.isArray(contextFileIds) && contextFileIds.length > 0) {
      const top = await EmbeddingService.semanticSearch({ projectId, query, topK: 24 });
      const allow = new Set(contextFileIds.map(String));
      chunks = top.filter((t) => allow.has(String(t.fileId))).slice(0, 12);
    } else {
      // Only retrieve if the user asked something document-specific, otherwise skip to keep it conversational
      // Simple heuristic: keywords
      const docy = /(\b(document|pdf|file|permit|estimate|photo|image|xactimate|warranty|form|checklist|manual|policy|procedure|sds|msds|safety|handbook|guide|spec|specification|blueprint|plan|invoice|receipt|contract|start the day|upfront)\b|page\s+\d+)/i.test(query || '');
      if (!docy) {
        // Minimal debug to trace why RAG was skipped during voice calls
        try { console.log('[Vapi] Skipping semanticSearch (no doc keywords) for query:', String(query).slice(0, 140)); } catch (_) {}
      }
      if (docy) {
        let topProject = [];
        let topGlobal = [];
        try {
          if (projectId) topProject = await EmbeddingService.semanticSearch({ projectId, query, topK: 12 });
        } catch (e) {
          try { console.warn('[Vapi] Project semanticSearch failed:', e?.message || e); } catch (_) {}
        }
        try {
          topGlobal = await EmbeddingService.semanticSearch({ projectId: null, query, topK: 12 });
        } catch (e) {
          try { console.warn('[Vapi] Global semanticSearch failed:', e?.message || e); } catch (_) {}
        }
        const merged = [...(topProject || []), ...(topGlobal || [])]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 12);
        chunks = merged;
        try { console.log('[Vapi] semanticSearch results - project:', (topProject||[]).length, 'global:', (topGlobal||[]).length, 'merged:', merged.length); } catch (_) {}
      }
    }

    if (!openaiClient) {
      if (returnActions) {
        // Fallback voice line when LLM unavailable
        return res.json({ actions: [
          { type: 'say', text: 'I can’t access the knowledge service right now, but I’m still here to help with general questions.' }
        ]});
      }
      return res.json({ success: true, data: { answer: 'OpenAI not configured on server.' } });
    }

    // Get user and project context for VAPI
    let user = null;
    let projectContext = null;
    let currentWorkflowData = null;
    
    try {
      // Try to get user from request (VAPI may pass userId via variableValues)
      const userId = raw.userId || raw.user_id || vars.userId || vars.user_id || null;
      console.log('[Vapi] Looking up user with ID:', userId);
      
      if (userId) {
        user = await prisma.user.findUnique({ 
          where: { id: String(userId) },
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        });
      }
      
      // CRITICAL: If no user found, default to first admin/manager for data access
      // This ensures tools always have user context for database queries
      // Note: UserRole enum values are: ADMIN, MANAGER, PROJECT_MANAGER, FOREMAN, WORKER, CLIENT
      if (!user) {
        console.log('[Vapi] No user from request, looking up fallback user...');
        user = await prisma.user.findFirst({
          where: { 
            OR: [
              { role: 'ADMIN' },
              { role: 'MANAGER' },
              { role: 'PROJECT_MANAGER' }
            ]
          },
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        });
        if (user) {
          console.log('[Vapi] Using fallback user for context:', user.email, 'role:', user.role);
        } else {
          console.warn('[Vapi] WARNING: No fallback user found - tools may not work correctly');
        }
      } else {
        console.log('[Vapi] User found:', user.email);
      }
      
      // Get project context if projectId is provided
      if (projectId) {
        projectContext = await prisma.project.findUnique({
          where: { id: String(projectId) },
          include: { customer: true }
        });
        
        if (projectContext && getCurrentWorkflowData) {
          try {
            currentWorkflowData = await getCurrentWorkflowData(projectContext.id);
          } catch (e) {
            console.error('❌ VAPI: Error getting workflow data:', e);
          }
        }
      }
    } catch (e) {
      console.error('❌ VAPI: Error loading context:', e);
    }

    // Build comprehensive system prompt with tools (same as bubbles.js)
    const workflowTools = [
      { name: 'mark_line_item_complete_and_notify', description: 'Marks a workflow task as complete. Uses the currently selected project.', parameters: { type: 'object', properties: { lineItemName: { type: 'string' } }, required: ['lineItemName'] } },
      { name: 'get_incomplete_items_in_phase', description: 'Lists incomplete tasks for a phase.', parameters: { type: 'object', properties: { phaseName: { type: 'string' } }, required: ['phaseName'] } },
      { name: 'find_blocking_task', description: 'Finds blocking task in a phase.', parameters: { type: 'object', properties: { phaseName: { type: 'string' } }, required: ['phaseName'] } },
      { name: 'check_phase_readiness', description: 'Checks if phase can advance.', parameters: { type: 'object', properties: { phaseName: { type: 'string' } }, required: ['phaseName'] } },
      { name: 'reassign_task', description: 'Reassigns a task to a team member.', parameters: { type: 'object', properties: { lineItemName: { type: 'string' }, newUserEmail: { type: 'string' } }, required: ['lineItemName', 'newUserEmail'] } },
      { name: 'answer_company_question', description: 'Searches knowledge base.', parameters: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] } },
      { name: 'create_task', description: 'Creates a standalone task with optional document attachments.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, dueDate: { type: 'string' }, priority: { type: 'string' }, projectId: { type: 'string' }, assignedToEmail: { type: 'string' }, assignedToId: { type: 'string' }, documentIds: { type: 'array', items: { type: 'string' } } }, required: ['title'] } },
      { name: 'create_reminder', description: 'Creates a standalone calendar reminder/event with optional document attachments.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, startTime: { type: 'string' }, endTime: { type: 'string' }, eventType: { type: 'string' }, projectId: { type: 'string' }, attendeeEmails: { type: 'array', items: { type: 'string' } }, attendeeIds: { type: 'array', items: { type: 'string' } }, documentIds: { type: 'array', items: { type: 'string' } } }, required: ['title'] } },
      { name: 'send_email', description: 'Sends a standalone email with optional document attachments.', parameters: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' }, recipientEmails: { type: 'array', items: { type: 'string' } }, projectId: { type: 'string' }, documentIds: { type: 'array', items: { type: 'string' } }, cc: { type: 'array', items: { type: 'string' } }, bcc: { type: 'array', items: { type: 'string' } } }, required: ['subject', 'body', 'recipientEmails'] } }
    ];
    
    const dataAccessTools = [
      { name: 'get_all_projects', description: 'Get all projects with filters.', parameters: { type: 'object', properties: { status: { type: 'string' }, phase: { type: 'string' }, search: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
      { name: 'get_all_tasks', description: 'Get all tasks with filters.', parameters: { type: 'object', properties: { projectId: { type: 'string' }, assignedToId: { type: 'string' }, status: { type: 'string' }, overdue: { type: 'boolean' }, limit: { type: 'number' } }, required: [] } },
      { name: 'get_all_messages', description: 'Get all project messages.', parameters: { type: 'object', properties: { projectId: { type: 'string' }, search: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
      { name: 'get_all_emails', description: 'Get all emails with tracking.', parameters: { type: 'object', properties: { projectId: { type: 'string' }, status: { type: 'string' }, limit: { type: 'number' } }, required: [] } },
      { name: 'get_all_reminders', description: 'Get all calendar events.', parameters: { type: 'object', properties: { projectId: { type: 'string' }, upcoming: { type: 'boolean' }, limit: { type: 'number' } }, required: [] } },
      { name: 'get_customer_info', description: 'Get customer information.', parameters: { type: 'object', properties: { customerId: { type: 'string' }, customerName: { type: 'string' } }, required: [] } },
      { name: 'get_user_info', description: 'Get user information and workload.', parameters: { type: 'object', properties: { userId: { type: 'string' }, userEmail: { type: 'string' } }, required: [] } },
      { name: 'search_all_data', description: 'Search across all data types.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
      { name: 'get_proactive_summary', description: 'Get proactive notifications (overdue tasks, deadlines, gaps).', parameters: { type: 'object', properties: { userId: { type: 'string' } }, required: [] } },
      { name: 'get_portfolio_analytics', description: 'Get portfolio analytics (status, allocation, bottlenecks, workload).', parameters: { type: 'object', properties: {}, required: [] } },
      { name: 'get_resource_allocation', description: 'Get resource allocation analysis.', parameters: { type: 'object', properties: {}, required: [] } },
      { name: 'get_bottlenecks', description: 'Identify bottlenecks across projects.', parameters: { type: 'object', properties: {}, required: [] } },
      { name: 'get_team_workload', description: 'Get team workload analysis.', parameters: { type: 'object', properties: {}, required: [] } }
    ];
    
    const allTools = [...workflowTools, ...dataAccessTools];
    const tools = allTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    const systemPrompt = await buildVapiSystemPrompt(user || { firstName: 'User', lastName: '' }, projectContext, currentWorkflowData, allTools);
    const messages = buildRagMessages({ chunks, userQuery: query, systemPrompt });
    
    // Make OpenAI call with tools
    const requestConfig = {
      model: OPENAI_CHAT_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 300
    };
    
    // Add tools for function calling
    if (tools && tools.length > 0) {
      requestConfig.tools = tools;
      requestConfig.tool_choice = 'auto';
    }
    
    const chat = await openaiClient.chat.completions.create(requestConfig);
    const message = chat?.choices?.[0]?.message || {};
    let text = message.content || '';
    const functionCalls = message.tool_calls || null;
    const used = chunks.length > 0;

    // Handle function calls if present
    if (functionCalls && functionCalls.length > 0 && executeToolCall) {
      console.log('🔧 VAPI: AI requested tool calls:', functionCalls.length, 'user:', user?.email || 'none');
      
      const toolResults = [];
      for (let i = 0; i < functionCalls.length; i++) {
        const toolCall = functionCalls[i];
        try {
          const toolName = toolCall.function?.name || null;
          if (!toolName) continue;
          
          let toolArgs = toolCall.function?.arguments || {};
          let parsedArgs = {};
          try {
            if (typeof toolArgs === 'string') {
              parsedArgs = JSON.parse(toolArgs);
            } else {
              parsedArgs = toolArgs;
            }
          } catch (e) {
            parsedArgs = {};
          }
          
          console.log(`🔧 VAPI: Executing tool "${toolName}" with args:`, JSON.stringify(parsedArgs));
          
          const result = await executeToolCall(toolName, parsedArgs, {
            user: user || { id: raw.userId || null },
            projectContext,
            currentWorkflowData
          });
          
          console.log(`✅ VAPI: Tool "${toolName}" returned:`, result.success ? `${result.count || 'N/A'} items` : `error: ${result.error}`);
          
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        } catch (toolError) {
          console.error(`❌ VAPI: Tool execution error:`, toolError);
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: false, error: toolError.message || 'Tool execution failed' })
          });
        }
      }
      
      // Make follow-up call with tool results
      if (toolResults.length > 0) {
        const followUpMessages = [
          ...messages,
          {
            role: 'assistant',
            content: text || null,
            tool_calls: functionCalls
          },
          ...toolResults
        ];
        
        const followUpChat = await openaiClient.chat.completions.create({
          model: OPENAI_CHAT_MODEL,
          messages: followUpMessages,
          temperature: 0.4,
          max_tokens: 300
        });
        
        text = followUpChat?.choices?.[0]?.message?.content || text || 'OK';
        console.log('✅ VAPI: Follow-up response generated with tool results');
      }
    }

    if (returnActions) {
      // Return Vapi actions directly for tools that expect actions output
      return res.json({ actions: [
        { type: 'say', text }
      ]});
    }

    // Default: plain JSON that can be mapped to variables in Vapi
    return res.json({ success: true, answer: text, usedDocs: used, data: { answer: text, usedDocs: used } });
  } catch (err) {
    console.error('POST /vapi/assistant-query error:', err);
    return res.status(500).json({ success: false, message: 'Vapi assistant query failed' });
  }
});

module.exports = router;

// ===== Custom Knowledge Base (Vapi) =====
// POST /api/vapi/kb/search
// Vapi will call this when a knowledge-base search is needed.
// Verifies x-vapi-signature if provided, then returns documents array.
router.post('/vapi/kb/search', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    // Verify signature if header is present and VAPI_WEBHOOK_SECRET is set
    try {
      const sig = req.header('x-vapi-signature') || req.header('X-VAPI-SIGNATURE');
      const secret = (process.env.VAPI_WEBHOOK_SECRET || '').trim();
      if (sig && secret) {
        const computed = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
        if (sig !== `sha256=${computed}`) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }
    } catch (e) {
      // If signature verification throws, do not block; proceed without signature
      try { console.warn('[Vapi KB] Signature verification error:', e?.message || e); } catch (_) {}
    }

    const payload = req.body || {};
    const msg = payload.message || {};
    const msgs = Array.isArray(msg.messages) ? msg.messages : [];
    const userMsgs = msgs.filter(m => m && m.role === 'user' && typeof m.content === 'string');
    const latestQuery = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : '';
    if (!latestQuery || String(latestQuery).trim().length === 0) {
      return res.json({ documents: [] });
    }

    // Retrieve top chunks from embeddings (global scope). Optionally merge project scope if provided later.
    let results = [];
    try {
      results = await EmbeddingService.semanticSearch({ projectId: null, query: latestQuery, topK: 6 });
    } catch (e) {
      try { console.warn('[Vapi KB] semanticSearch failed:', e?.message || e); } catch (_) {}
      results = [];
    }

    // Format documents for Vapi Knowledge Base
    const documents = (results || []).map(r => {
      const page = r?.metadata?.page ? ` page ${r.metadata.page}` : '';
      const header = `source [file:${r.fileId || ''}${page}]`;
      // Provide the snippet plus a small source line to help the model cite internally
      const content = `${r.snippet || ''}\n\n(${header})`;
      return {
        content,
        similarity: Number(r.score || 0),
        uuid: `${r.fileId || 'file'}:${r.chunkId || 'chunk'}`
      };
    });

    try { console.log('[Vapi KB] Returned documents:', documents.length); } catch (_) {}
    return res.json({ documents });
  } catch (err) {
    console.error('POST /vapi/kb/search error:', err);
    return res.json({ documents: [], error: 'Search temporarily unavailable' });
  }
});
