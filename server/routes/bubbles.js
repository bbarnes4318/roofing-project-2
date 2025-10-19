const express = require('express');
const expressValidator = require('express-validator');
const { body, validationResult } = expressValidator;
const {
  asyncHandler,
  sendSuccess,
  formatValidationErrors,
  AppError
} = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { prisma } = require('../config/prisma');
const EmbeddingService = require('../services/EmbeddingService');
const IngestionService = require('../services/IngestionService');
const path = require('path');
const fs = require('fs').promises;
const { findAssetByMention } = require('../services/AssetLookup');
const emailService = require('../services/EmailService');
const bubblesContextService = require('../services/BubblesContextService');

// Try to load services with error handling
let openAIService, bubblesInsightsService, WorkflowActionService, workflowActionService;

try {
  openAIService = require('../services/OpenAIService');
  console.log('✅ Bubbles: OpenAIService loaded');
} catch (error) {
  console.error('❌ Bubbles: Failed to load OpenAIService:', error.message);
  openAIService = null;
}

// Helper: extract recipient names from freeform message (supports "to" and "for" phrases)
function extractRecipientNames(message) {
  try {
    const text = String(message || '');
    const lower = text.toLowerCase();
    // Capture segment after ' to ' (preferred) or ' for ' until end or until 'with a message' / 'message saying'
    const toMatch = lower.match(/\bto\b([\s\S]*?)(?:$|\bwith a message\b|\bmessage saying\b)/i);
    const forMatch = lower.match(/\bfor\b([\s\S]*?)(?:$|\bwith a message\b|\bmessage saying\b)/i);
    let segment = '';
    if (toMatch && toMatch[1]) segment = text.slice(toMatch.index + 2, toMatch.index + 2 + toMatch[1].length);
    if (!segment && forMatch && forMatch[1]) segment = text.slice(forMatch.index + 3, forMatch.index + 3 + forMatch[1].length);
    segment = (segment || '').trim();
    if (!segment) return [];
    // Remove obvious project mentions that might pollute names
    segment = segment
      .replace(/project\s*#?\s*\d+/ig, '')
      .replace(/project\s+[a-z0-9\s]+/ig, '')
      .replace(/\s+for\s+project[\s\S]*$/i, '')
      .replace(/\s+with a message[\s\S]*$/i, '')
      .replace(/\s+message saying[\s\S]*$/i, '');
    // Split by comma or ' and '
    const parts = segment
      .split(/,|\band\b/i)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    // Filter out non-name words that sometimes appear
    const blocklist = new Set(['the', 'team', 'customer', 'primary', 'contact', 'manager', 'project']);
    return parts
      .map(p => p.replace(/\s+/g, ' ').trim())
      .filter(p => p && !blocklist.has(p.toLowerCase()));
  } catch (_) {
    return [];
  }
}

// --- Simple natural language date parsers ---
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
    // Keywords: today, tomorrow
    if (/(due\s*)?today\b/.test(lower)) {
      const d = new Date(); d.setHours(17,0,0,0); return d;
    }
    if (/(due\s*)?tomorrow\b/.test(lower)) {
      const d = new Date(); d.setDate(d.getDate()+1); d.setHours(17,0,0,0); return d;
    }
    // Day of week names
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    for (let i=0;i<7;i++) {
      if (lower.includes(days[i])) {
        const target = new Date(now);
        const diff = (i - now.getDay() + 7) % 7 || 7; // next occurrence (at least next week if today)
        target.setDate(now.getDate() + diff);
        target.setHours(17,0,0,0);
        return target;
      }
    }
    // by <date>
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

    // "remind me at 4pm" today
    const timeMatch = lower.match(/(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    let base = new Date(now);
    if (/tomorrow/.test(lower)) base.setDate(base.getDate()+1);

    // Day names
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

    // If time specified, use base date
    if (timeMatch) {
      let h = parseInt(timeMatch[1],10);
      const min = timeMatch[2] ? parseInt(timeMatch[2],10) : 0;
      const ampm = timeMatch[3];
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      base.setHours(h, min, 0, 0);
      return base;
    }

    // Fallback: next business day at 9am
    const d = nextBusinessDaysFromNow(1);
    d.setHours(9,0,0,0);
    return d;
  } catch (_) {}
  const d = nextBusinessDaysFromNow(1);
  d.setHours(9,0,0,0);
  return d;
}

async function readAssetCurrentFile(asset) {
  try {
    const fileUrl = asset?.versions?.[0]?.fileUrl || asset?.fileUrl;
    if (!fileUrl) return null;
    const safePath = String(fileUrl).replace(/^\\|^\//, '');
    const abs = path.join(__dirname, '..', safePath);
    let exists = await fs.access(abs).then(() => true).catch(() => false);
    // Fallback: scan uploads/company-assets/<year>/<month>/ for a file that matches the asset title slug
    let effectiveAbs = abs;
    if (!exists) {
      try {
        const uploadRoot = path.join(__dirname, '..', 'uploads', 'company-assets');
        const baseTitle = String(asset.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const years = await fs.readdir(uploadRoot).catch(() => []);
        for (const y of years) {
          const yearDir = path.join(uploadRoot, y);
          const months = await fs.readdir(yearDir).catch(() => []);
          for (const m of months) {
            const monthDir = path.join(yearDir, m);
            const files = await fs.readdir(monthDir).catch(() => []);
            const hit = files.find(f => f.toLowerCase().includes(baseTitle));
            if (hit) {
              effectiveAbs = path.join(monthDir, hit);
              exists = true;
              break;
            }
          }
          if (exists) break;
        }
      } catch (_) {}
    }
    if (!exists) return null;
    const buffer = await fs.readFile(effectiveAbs);
    // Prefer per-page extraction for PDFs
    const mime = asset.mimeType || (asset.title?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    if (mime === 'application/pdf') {
      const pages = await IngestionService.extractPdfPages(buffer);
      const text = pages.map(p => p.text).join('\n');
      return { text, pages };
    }
    // Fallback: treat as utf8 text
    return { text: buffer.toString('utf8'), pages: [] };
  } catch (e) {
    console.warn('⚠️ readAssetCurrentFile failed:', e?.message || e);
    return null;
  }
}

function extractNumberedSteps(rawText, maxSteps = 20) {
  if (!rawText) return [];
  const text = String(rawText).replace(/\r\n?/g, '\n');
  // Strategy: split by lines and accumulate sections starting with a number (1-20) followed by ., ) or -
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const steps = [];
  let current = null;
  let currentNum = null;
  const startRe = /^(\d{1,2})[\.)\-]\s*(.*)$/;
  for (const line of lines) {
    const m = line.match(startRe);
    if (m) {
      const num = parseInt(m[1], 10);
      const content = m[2].trim();
      if (current && currentNum !== null) {
        steps.push({ n: currentNum, text: current.trim() });
      }
      current = content || '';
      currentNum = num;
      if (steps.length >= maxSteps) break;
    } else if (current !== null) {
      // continuation of previous step
      current += (current ? ' ' : '') + line;
    }
  }
  if (current && currentNum !== null) {
    steps.push({ n: currentNum, text: current.trim() });
  }
  // Sort by number and dedupe
  const dedup = [];
  const seen = new Set();
  for (const s of steps) {
    if (!seen.has(s.n)) {
      seen.add(s.n);
      dedup.push(s);
    }
  }
  dedup.sort((a, b) => a.n - b.n);
  return dedup;
}

try {
  bubblesInsightsService = require('../services/BubblesInsightsService');
  console.log('✅ Bubbles: BubblesInsightsService loaded');
} catch (error) {
  console.error('❌ Bubbles: Failed to load BubblesInsightsService:', error.message);
  bubblesInsightsService = null;
}

try {
  WorkflowActionService = require('../services/WorkflowActionService');
  workflowActionService = new WorkflowActionService();
  console.log('✅ Bubbles: WorkflowActionService loaded');
} catch (error) {
  console.error('❌ Bubbles: Failed to load WorkflowActionService:', error.message);
  WorkflowActionService = null;
  workflowActionService = null;
}

const router = express.Router();

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
    // Pull workflow and alerts; format per business rules
    const [tracker, activeAlerts] = await Promise.all([
      prisma.projectWorkflowTracker.findFirst({
        where: { projectId: projectContext.id, isMainWorkflow: true },
        select: { id: true, currentLineItemId: true }
      }),
      prisma.workflowAlert.count({ where: { projectId: projectContext.id, status: 'ACTIVE' } })
    ]);

    let current = { phaseName: null, sectionName: null, lineItemName: null };
    if (tracker?.currentLineItemId) {
      const li = await prisma.workflowLineItem.findUnique({
        where: { id: tracker.currentLineItemId },
        select: { 
          itemName: true, 
          section: { select: { displayName: true, phase: { select: { phaseType: true, phaseName: true } } } }
        }
      });
      current.lineItemName = li?.itemName || null;
      current.sectionName = li?.section?.displayName || null;
      current.phaseName = li?.section?.phase?.phaseName || li?.section?.phase?.phaseType || null;
    }

    const pct = typeof projectContext.progress === 'number' ? Math.round(projectContext.progress) : null;

    // Fetch next few actions: next line items within current section/phase
    let nextItems = [];
    if (tracker?.currentLineItemId) {
      const curr = await prisma.workflowLineItem.findUnique({
        where: { id: tracker.currentLineItemId },
        select: { sectionId: true, displayOrder: true, section: { select: { lineItems: { select: { itemName: true, displayOrder: true }, orderBy: { displayOrder: 'asc' } } } } }
      });
      if (curr?.section?.lineItems) {
        nextItems = curr.section.lineItems
          .filter(li => li.displayOrder > (curr.displayOrder || 0))
          .slice(0, 3)
          .map(li => li.itemName);
      }
    }

    const content = [
      `**Project Name:** ${projectContext.projectName || 'Project'}`,
      `**Project Number:** #${String(projectContext.projectNumber || '').padStart(5, '0')}`,
      pct !== null ? `**Progress:** ${pct}%` : null,
      '',
      '**Phase**',
      current.phaseName ? `${current.phaseName}` : 'N/A',
      '',
      '**Section**',
      current.sectionName ? `${current.sectionName}` : 'N/A',
      '',
      '**Line Item**',
      current.lineItemName ? `${current.lineItemName}` : 'N/A',
      '',
      '**Next Actions:**',
      nextItems.length ? nextItems.map(i => `- ${i}`).join('\n') : '- No upcoming items found',
    ].filter(v => v !== null).join('\n');

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
          content: `**Next Line Item:** ${li.itemName}\n\n**Location:** ${sectionName} (${phaseName})\n\n**Next actions:**\n• Complete this task\n• Check for blocking items\n• Review phase progress` 
        };
      }
    }
    return { handled: true, content: 'I couldn\'t find the current line item. Let me check the project status.' };
  }

  return { handled: false };
}

// Helper function to get current workflow data for a project (same logic as the API endpoint)
async function getCurrentWorkflowData(projectId) {
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
}

// Heuristic general answer for common topics when OpenAI is unavailable
function heuristicGeneralAnswer(message) {
  const q = String(message || '').toLowerCase();

  // Roofing recommendations by climate/location
  if (q.includes('roof') || q.includes('roofing')) {
    const mentionsMiami = q.includes('miami') || q.includes('fl') || q.includes('florida');
    const mentionsWarehouse = q.includes('warehouse');
    const mentionsTpo = q.includes('tpo');
    const mentionsEpdm = q.includes('epdm');
    const mentionsMetal = q.includes('metal');

    if (mentionsMiami) {
      return [
        '**Recommendation for Miami, FL:**',
        '- **Hurricane‑rated metal (standing seam)** or **concrete/clay tile** for steep‑slope homes (great wind uplift, long life).',
        '- **TPO/PVC single‑ply** for low‑slope areas (reflective, heat‑welded seams, good in high heat/humidity).',
        '- Avoid standard **EPDM** in high UV + heat unless fully adhered and protected (white EPDM less common).',
        '',
        '**Why:** Miami has high wind, salt air, extreme UV, and heavy rains. Use Miami‑Dade/High‑Velocity Hurricane Zone (HVHZ) approved assemblies, proper underlayment, and corrosion‑resistant fasteners.',
        '',
        '**Next steps:**',
        '- Confirm roof slope and code zone (HVHZ).',
        '- Choose light/reflective color for energy savings.',
        '- Get wind‑uplift engineering and permit set.'
      ].join('\n');
    }

    if (mentionsTpo && mentionsEpdm) {
      return [
        '**TPO vs. EPDM (quick guide):**',
        '- **TPO:** white/reflective, heat‑welded seams, good in hot climates; seams are strong; watch for quality of membrane brand.',
        '- **EPDM:** black (or white), glued/taped seams, excellent longevity in temperate climates; can run hotter in sun.',
        '',
        '**Pick TPO** for hot/sunny climates or energy savings; **Pick EPDM** for cold/temperate zones or retrofit over certain decks.'
      ].join('\n');
    }

    if (mentionsWarehouse) {
      return [
        '**Warehouse roof options:**',
        '- **TPO/PVC single‑ply** (reflective, fast install, good seams).',
        '- **Coatings** (if existing roof is sound) for cost‑effective life extension.',
        '- **Metal retrofit** with insulation if structure allows.',
        '',
        '**Decide by:** deck condition, slope, budget, and required warranty length.'
      ].join('\n');
    }

    // Generic roofing guidance
    return [
      '**Roof selection factors:** climate, slope, deck condition, code/wind zone, energy goals, budget, desired warranty.',
      '- Low‑slope: TPO/PVC; Steep‑slope: metal or architectural shingle/tile.',
      '- In hot climates, prefer reflective membranes or light‑colored metal/tile.'
    ].join('\n');
  }

  // Fallback generic answer
  return 'I can help with that. Give me a bit more detail (context, goals, constraints) and I\'ll recommend specific options with pros/cons.';
}


// Apply authentication to all routes
router.use(authenticateToken);

// Test route to verify bubbles routes are loading
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Bubbles routes are working!' });
});

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
const getSystemPrompt = (user, projectContext, currentWorkflowData = null) => {
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

## COMPLETE ROOFING PROJECT WORKFLOW KNOWLEDGE
You have complete knowledge of the Kenstruction workflow with ALL phases, sections, and line items:

### 1. LEAD PHASE
**Input Customer Information**
- Confirm name is spelled correctly. (OFFICE)
- Validate customer's email and send confirmation. (OFFICE)
- call customer (PROJECT_MANAGER)

**Complete Questions to Ask Checklist**
- Input Question Checklist answers (OFFICE)
- Record property details. (OFFICE)

**Input Lead Supporting Property Information**
- Add Home View photos from Maps. (OFFICE)
- Add Street View photos from Google Maps. (OFFICE)
- Add elevation screenshot from PPRBD. (OFFICE)
- Add property age from County Assessor Website. (OFFICE)
- Evaluate ladder requirements. (OFFICE)

**Assign A Project Manager**
- Select and brief the Project Manager. (OFFICE)

**Schedule Initial Inspection**
- Call customer to arrange schedule (OFFICE)
- Create AL appointment for PM. (OFFICE)

### 2. PROSPECT PHASE
**Site Inspection**
- Take site photos. (PROJECT_MANAGER)
- Complete Inspection form. (PROJECT_MANAGER)
- Document material colors. (PROJECT_MANAGER)
- Capture Hover photos. (PROJECT_MANAGER)
- Present upgrade options. (PROJECT_MANAGER)

**Write Estimate**
- Fill out the Estimate Form. (PROJECT_MANAGER)
- Write initial estimate in AccuLynx. (PROJECT_MANAGER)
- Write Customer Pay Estimates. (PROJECT_MANAGER)

**Insurance Process**
- Compare estimates between Field and Insurance. (ADMINISTRATION)
- Identify supplemental items. (ADMINISTRATION)
- Draft Upfront Estimate into Xactimat. (ADMINISTRATION)

**Agreement Preparation**
- Complete trade cost analysis. (ADMINISTRATION)
- Prepare estimate forms. (ADMINISTRATION)
- Match AL Estimate to Trade Costs for applicable trades. (ADMINISTRATION)
- Calculate customer pay items. (ADMINISTRATION)

**Agreement Signing**
- Review agreement with customer and send signature request. (ADMINISTRATION)
- Record in QuickBooks (ADMINISTRATION)
- Process deposit (ADMINISTRATION)
- Review agreement with customer and send signature request. (ADMINISTRATION)

### 3. APPROVED PHASE
**Administrative Setup**
- Order materials. (ADMINISTRATION)
- Create labor orders. (ADMINISTRATION)

**Pre-Job Actions**
- Pull necessary permits. (OFFICE)
- Call 811 Dig if a fence or deck is involved. (OFFICE)

**Prepare for Production**
- If roof, confirm Gutter & Ventilation images. (ADMINISTRATION)
- Re-save Elevation Picture to the top of AL. (ADMINISTRATION)

**Verify Labor Order in Scheduler**
- Correct all dates. (ADMINISTRATION)
- Ensure correct crew is selected. (ADMINISTRATION)
- Send customer reminder confirmation. (ADMINISTRATION)

**Verify Material Orders**
- Order from suppliers (ADMINISTRATION)
- Confirm receipt of supplier confirmation email. (ADMINISTRATION)

**If trade is for subcontractor**
- Create subcontractor work order for scheduler. (ADMINISTRATION)
- Schedule subcontractor work. (ADMINISTRATION)
- Communicate with customer for subcontractor scheduling. (ADMINISTRATION)

**Does the job have paint?**
- Determine paint color status and create Crew Instructions. (ADMINISTRATION)

### 4. EXECUTION PHASE
**Installation Process**
- Document work start. (OFFICE)
- Capture progress photos. (OFFICE)

**Monitor progress**
- Add a daily Job Progress Note (include work started and finished). (OFFICE)
- If delayed, document extra days and people needed. (OFFICE)
- Upload pictures for the day. (OFFICE)

**Quality Check**
- Upload completion photos for all jobs. (OFFICE)
- Complete roof inspection. (OFFICE)
- Upload Roof Packet if it's a roof job. (ROOF_SUPERVISOR)
- Check that the Roof Packet is filled out completely. (ROOF_SUPERVISOR)

**If Doing Multiple Trades**
- Confirm start date of each additional trade. (ADMINISTRATION)
- Confirm material and labor orders have been created for every trade. (ADMINISTRATION)

**If doing Subcontractor work**
- Confirm Work Start Date with the subcontractor. (ADMINISTRATION)
- Follow up on dates of work for the subcontractor. (ADMINISTRATION)
- Communicate the homeowner subcontractor schedule. (ADMINISTRATION)

**Update Customer**
- Inform the customer that work is finished OR if subcontractors are still scheduled. (ADMINISTRATION)
- Send 2-4 photos of in-progress or finished work. (ADMINISTRATION)

### 5. SECOND_SUPPLEMENT PHASE
**Create Supp in Xactimate for Insurance**
- Check the Supp section on the Roof Packet. (ADMINISTRATION)
- Check on items from the Supp section in the Roof Checklist. (ADMINISTRATION)
- Check in-progress photos from the job. (ADMINISTRATION)
- Label photos for insurance submission. (ADMINISTRATION)
- Add items to the Xactimate estimate. (ADMINISTRATION)
- Submit supplement to insurance. (ADMINISTRATION)
- Call insurance until you receive an updated estimate. (ADMINISTRATION)

**Call on the Supp submission twice a week**
- Call 2x per week on supplement submission. (ADMINISTRATION)

**Review Approved Items in Supp After Receiving it**
- Update the estimate with trade costs. (ADMINISTRATION)
- Counter-submit for missing items OR add supp number into AL Est/Invoice (ADMINISTRATION)

**Update Customer**
- Update customer on 2 items: going back 2 insurance, need help contacting, matching final supp payment (ADMINISTRATION)

### 6. COMPLETION PHASE
**Final Inspection**
- Schedule a permit inspection. (OFFICE)
- Document inspection results. (OFFICE)

**Financial Processing**
- Verify the financial worksheet. (ADMINISTRATION)
- Send the final invoice and payment link to the customer. (ADMINISTRATION)
- Handle supplement claims. (ADMINISTRATION)
- AR Follow Up: 1st call. (ADMINISTRATION)
- AR Follow Up: 2nd call. (ADMINISTRATION)
- AR Follow Up: 3rd call. (ADMINISTRATION)

**Project Closeout**
- Register warranty. (OFFICE)
- Send warranty documentation. (OFFICE)
- Submit insurance documentation. (OFFICE)
- Send receipt for final payments. Close job. (OFFICE)

## ROOFING TECHNICAL KNOWLEDGE BASE
**Ice and Water Shield for Colorado Roofing**

**Core Summary**: Ice and water shield is a self-adhering waterproof membrane required by Colorado building codes. Its main purpose is to prevent leaks caused by ice dams, which are common in Colorado due to heavy snow and freeze-thaw cycles.

**Code Requirements**:
- **Mandate**: Colorado follows the International Residential Code (IRC), which requires an ice and water barrier
- **Location**: Must be installed at the roof's eaves
- **Measurement**: Must extend from roof's edge to at least 24 inches inside the exterior wall line
- **Enforcement**: Local building departments across Colorado enforce this rule

**Purpose and Importance**:
- **Primary Function**: Prevent water damage from ice dams
- **Ice Dam Definition**: A ridge of ice that forms at roof edge, stopping melting snow from draining and causing water to back up under shingles
- **Why Colorado Needs It**: Heavy snow provides moisture, freeze-thaw cycles (sunny days melt/cold nights freeze), attic heat loss warms roof causing snow to melt and refreeze at eaves
- **How It Works**: Self-sealing membrane forms watertight seal around roofing nails and staples

**Key Vulnerable Areas** (install ice and water shield at):
- **Eaves**: Required by code - 24 inches inside wall line
- **Valleys**: Where two roof planes meet and water concentrates
- **Roof Penetrations**: Around vents, pipes, skylights
- **Transition Areas**: Where roof meets wall (dormers)

**Product and Installation**:
- **Product Choice**: Use high-quality, high-temperature-rated membrane (Colorado's intense sun degrades cheaper adhesives)
- **Installation Steps**: Clean/dry deck, apply smoothly avoiding wrinkles, overlap and seal seams per manufacturer directions

## CRITICAL PROJECT CONTEXT RULES
${projectContext && projectContext.projectName ? `
### ✅ ACTIVE PROJECT SELECTED
**Project Name:** ${projectContext.projectName}
**Project Number:** #${String(projectContext.projectNumber).padStart(5, '0')}
**Progress:** ${projectContext.progress || 0}%
**Customer:** ${projectContext.customer?.primaryName || 'N/A'}
${currentWorkflowData ? `
**Current Workflow Status:**
- **Phase:** ${currentWorkflowData.phaseName || currentWorkflowData.phaseType || 'N/A'}
- **Section:** ${currentWorkflowData.sectionName || 'N/A'}
- **Current Line Item:** ${currentWorkflowData.lineItemName || 'N/A'}
- **Responsible Role:** ${currentWorkflowData.responsibleRole || 'N/A'}
` : ''}

### 🚨 MANDATORY RULES WHEN PROJECT IS SELECTED:
1. **NEVER ask for project numbers, customer names, or any project identification**
2. **ALWAYS use internal project ID for operations, but NEVER display it**
3. **Project context persists for ALL subsequent questions**
4. **If user asks about this project, answer directly without asking for identification**
5. **All tools automatically use the selected project - no need to specify project**
6. **ALWAYS use the REAL workflow data provided above - NEVER make up fake phases or line items**
7. **NEVER display a field named "Status"; show Phase, Section, Line Item, and Next Actions instead**

### 🔧 OPERATIONS WITH SELECTED PROJECT:
- All workflow tools use the internal project ID automatically (do not display it)
- All status queries use the selected project
- All task operations use the selected project
- All phase operations use the selected project
- All customer queries use the selected project
- **ALWAYS reference the real phase, section, and line item data provided above**

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
Write naturally in short paragraphs. Do not use numbered lists. Avoid heavy formatting, headings, and bold text. Keep responses under 150 words unless the user asks for more detail. If you suggest next steps, add a short inline sentence at the end like: Next: do X, then Y.

### STEP 3: FORMATTING
Write naturally in short paragraphs.
Do not use numbered lists. Avoid heavy formatting, headings, and bold text.
Keep responses under 150 words unless the user asks for more detail.
If you suggest next steps, add a short inline sentence at the end like: Next: do X, then Y.

## AVAILABLE TOOLS
${JSON.stringify(tools, null, 2)}

## FINAL MANDATORY INSTRUCTIONS

### 🚨 CRITICAL: PROJECT CONTEXT RULES
${projectContext && projectContext.projectName ? `
**PROJECT IS SELECTED:** ${projectContext.projectName}
- ✅ USE this project for ALL project-related questions
- ✅ NEVER ask for project numbers or customer names
- ✅ Project context persists throughout entire conversation
- ✅ All tools use this project automatically
- ✅ When referencing the project, display the Project Number (not the ID)
- ❌ NEVER ask "Tell me the project number" or similar
- ❌ NEVER ask for customer identification
- ❌ NEVER ask for project identification

### 🎯 RESPONSE GUIDELINES:
- **For "what is next" questions**: Answer directly with current line item info from the real workflow data above
- **For "how to" questions**: Provide helpful guidance
- **For status questions**: Provide these fields only, in this order: Project Name, Project Number, Progress; Phase, Section, Line Item; Next Actions (list the next few line items). Never show a field named "Status".
- **For actionable requests**: Use JSON tool calls
- **For general questions**: Respond conversationally
- **CRITICAL**: ALWAYS use the real phase, section, and line item data provided above - NEVER make up fake workflow information
- **If workflow data shows "N/A"**: Say the information is not available rather than guessing or making up fake data
` : `
**NO PROJECT SELECTED:**
- Ask user to select project for project-specific queries
- Answer general questions directly
`}

### 🎯 RESPONSE PATTERNS
1. **Project Status Query:** Provide fields as specified (no "Status" field)
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
 * @desc    Complete a pending action with selected recipients
 * @route   POST /api/bubbles/complete-action
 * @access  Private
 */
router.post('/complete-action', asyncHandler(async (req, res) => {
  const { pendingAction, selectedRecipientIds = [], customEmails = [] } = req.body;

  console.log('🔍 COMPLETE-ACTION: Received request');
  console.log('🔍 COMPLETE-ACTION: pendingAction:', JSON.stringify(pendingAction, null, 2));
  console.log('🔍 COMPLETE-ACTION: selectedRecipientIds:', selectedRecipientIds);
  console.log('🔍 COMPLETE-ACTION: customEmails:', customEmails);

  if (!pendingAction || (selectedRecipientIds.length === 0 && customEmails.length === 0)) {
    return res.status(400).json({ success: false, message: 'Please select at least one recipient or provide custom email addresses.' });
  }

  try {
    // Fetch selected recipients (team members)
    let recipients = [];
    if (selectedRecipientIds.length > 0) {
      recipients = await prisma.user.findMany({
        where: { id: { in: selectedRecipientIds } },
        select: { id: true, firstName: true, lastName: true, email: true }
      });
      console.log('🔍 COMPLETE-ACTION: Fetched recipients from DB:', recipients);
    }

    // Add custom email recipients
    const customRecipients = customEmails.map(email => ({
      email,
      firstName: email.split('@')[0],
      lastName: '',
      isCustom: true
    }));

    const allRecipients = [...recipients, ...customRecipients];

    if (allRecipients.length === 0) {
      return sendSuccess(res, 400, { response: { content: 'No valid recipients found.' } });
    }

    // Handle different action types
    if (pendingAction.type === 'send_document_message') {
      // Fetch the asset
      const asset = await prisma.companyAsset.findUnique({
        where: { id: pendingAction.assetId }
      });
      if (!asset) {
        return sendSuccess(res, 404, { response: { content: 'Document not found.' } });
      }

      // Fetch the project
      const proj = await prisma.project.findUnique({ where: { id: pendingAction.projectId } });
      if (!proj) {
        return sendSuccess(res, 404, { response: { content: 'Project not found.' } });
      }

      // Build attachment metadata
      // CompanyAsset has fileUrl directly on it
      const attachment = {
        assetId: asset.id || null,
        title: asset.title || 'Document',
        mimeType: asset.mimeType || 'application/octet-stream',
        fileUrl: asset.fileUrl || null,
        thumbnailUrl: asset.thumbnailUrl || null
      };

      // Create project message
      const pm = await prisma.projectMessage.create({
        data: {
          content: pendingAction.message || `Shared document: ${attachment.title}`,
          subject: `Document: ${attachment.title}`,
          messageType: 'USER_MESSAGE',
          priority: 'MEDIUM',
          authorId: req.user.id,
          authorName: `${req.user.firstName || 'Bubbles'} ${req.user.lastName || 'AI'}`.trim(),
          authorRole: req.user.role || 'AI_ASSISTANT',
          projectId: proj.id,
          projectNumber: proj.projectNumber,
          isSystemGenerated: false,
          isWorkflowMessage: false,
          metadata: { attachments: [attachment] }
        }
      });

      // Add recipients (only team members, not custom emails)
      const teamMemberRecipients = allRecipients.filter(r => !r.isCustom);
      console.log('🔍 COMPLETE-ACTION: Team member recipients to add:', teamMemberRecipients);
      if (teamMemberRecipients.length > 0) {
        const recipientData = teamMemberRecipients.map(r => ({ messageId: pm.id, userId: r.id }));
        console.log('🔍 COMPLETE-ACTION: Creating ProjectMessageRecipient records:', recipientData);
        await prisma.projectMessageRecipient.createMany({
          data: recipientData
        });
        console.log('🔍 COMPLETE-ACTION: ProjectMessageRecipient records created successfully');
      }

      const recipientNames = allRecipients.map(r =>
        r.isCustom ? r.email : `${r.firstName} ${r.lastName}`
      ).join(', ');
      const ack = `📨 Internal message sent with "${attachment.title}" to ${recipientNames} for project #${proj.projectNumber}.`;
      console.log('🔍 COMPLETE-ACTION: Sending success response:', ack);
      return sendSuccess(res, 200, { response: { content: ack }, messageId: pm.id, attachments: [attachment] });
    }

    if (pendingAction.type === 'send_document_email') {
      // Fetch the asset
      const asset = await prisma.companyAsset.findUnique({
        where: { id: pendingAction.assetId }
      });
      if (!asset) {
        return sendSuccess(res, 404, { response: { content: 'Document not found.' } });
      }

      // Fetch the project
      const proj = await prisma.project.findUnique({ where: { id: pendingAction.projectId } });
      if (!proj) {
        return sendSuccess(res, 404, { response: { content: 'Project not found.' } });
      }

      // Prepare email attachment
      const emailAttachment = { documentId: asset.id };

      // Build email subject and body
      const subject = `Document: ${asset.title}`;
      const emailBody = pendingAction.message || `Please find the attached document: ${asset.title}`;
      const html = emailService.createEmailTemplate({
        title: subject,
        content: `<p>${emailBody.replace(/\n/g, '<br>')}</p>` +
                 (proj ? `<p><strong>Project:</strong> ${proj.projectName}<br><strong>Project #:</strong> ${proj.projectNumber}</p>` : ''),
        footer: `This email was sent via Bubbles AI Assistant by ${req.user.firstName} ${req.user.lastName}`
      });

      // Send emails to all recipients
      const results = [];
      for (const recipient of allRecipients) {
        try {
          const recipientName = recipient.isCustom
            ? recipient.email
            : `${recipient.firstName} ${recipient.lastName}`;

          const result = await emailService.sendEmail({
            to: recipient.email,
            subject,
            html,
            text: emailBody,
            attachments: [emailAttachment],
            replyTo: req.user.email,
            tags: {
              sentBy: req.user.id,
              projectId: proj.id,
              recipientType: recipient.isCustom ? 'external' : 'user',
              source: 'bubbles_ai'
            }
          });
          results.push({ recipient: recipientName, success: true, messageId: result.messageId });

          // Log email to database
          await emailService.logEmail({
            senderId: req.user.id,
            senderEmail: req.user.email,
            senderName: `${req.user.firstName} ${req.user.lastName}`,
            to: [recipient.email],
            subject,
            text: emailBody,
            html,
            attachments: [emailAttachment],
            messageId: result.messageId,
            projectId: proj.id,
            emailType: 'bubbles_ai',
            status: 'sent',
            tags: { source: 'bubbles_ai', documentAttachment: true, recipientType: recipient.isCustom ? 'external' : 'internal' },
            metadata: { assetId: asset.id, assetTitle: asset.title }
          });
        } catch (emailErr) {
          const recipientName = recipient.isCustom
            ? recipient.email
            : `${recipient.firstName} ${recipient.lastName}`;
          results.push({ recipient: recipientName, success: false, error: emailErr.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      let response = `📧 Email sent successfully to ${successCount} recipient${successCount !== 1 ? 's' : ''}`;
      if (failCount > 0) {
        response += ` (${failCount} failed)`;
      }
      response += `:\n\n**Subject:** ${subject}\n**Recipients:** ${results.filter(r => r.success).map(r => r.recipient).join(', ')}\n**Attachment:** ${asset.title}`;

      return sendSuccess(res, 200, {
        response: { content: response },
        emailResults: results,
        emailsSent: successCount
      });
    }

    if (pendingAction.type === 'send_email') {
      // Send email to selected recipients (includes both team members and custom emails)
      const results = [];
      for (const recipient of allRecipients) {
        try {
          const recipientName = recipient.isCustom
            ? recipient.email
            : `${recipient.firstName} ${recipient.lastName}`;

          const result = await emailService.sendEmail({
            to: recipient.email,
            subject: pendingAction.subject,
            html: pendingAction.body,
            text: pendingAction.body,
            attachments: pendingAction.attachments || [],
            replyTo: req.user.email,
            tags: {
              sentBy: req.user.id,
              projectId: pendingAction.projectId,
              recipientType: recipient.isCustom ? 'external' : 'user',
              source: 'bubbles_ai'
            }
          });
          results.push({ recipient: recipientName, success: true, messageId: result.messageId });

          // Log email to database
          await emailService.logEmail({
            senderId: req.user.id,
            senderEmail: req.user.email,
            senderName: `${req.user.firstName} ${req.user.lastName}`,
            to: [recipient.email],
            subject: pendingAction.subject,
            text: pendingAction.body,
            html: pendingAction.body,
            attachments: pendingAction.attachments || [],
            messageId: result.messageId,
            projectId: pendingAction.projectId,
            emailType: 'bubbles_ai',
            status: 'sent',
            tags: { source: 'bubbles_ai', recipientType: recipient.isCustom ? 'external' : 'internal' },
            metadata: { conversationContext: true }
          });
        } catch (emailErr) {
          const recipientName = recipient.isCustom
            ? recipient.email
            : `${recipient.firstName} ${recipient.lastName}`;
          results.push({ recipient: recipientName, success: false, error: emailErr.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      let response = `✅ Email sent successfully to ${successCount} recipient${successCount !== 1 ? 's' : ''}`;
      if (failCount > 0) {
        response += ` (${failCount} failed)`;
      }
      response += `:\n\n**Subject:** ${pendingAction.subject}\n**Recipients:** ${results.filter(r => r.success).map(r => r.recipient).join(', ')}`;

      return sendSuccess(res, 200, {
        response: { content: response },
        emailResults: results,
        emailsSent: successCount
      });
    }

    if (pendingAction.type === 'send_simple_message') {
      console.log('🔍 BUBBLES: Entering send_simple_message block');
      // Create a project message EXACTLY like attachment messages do
      const messageContent = pendingAction.message || 'Message from Bubbles AI';
      
      // Use the General Project (hardcoded)
      const generalProject = {
        id: 'cmflohx5j00fjj8g4wm8ens5z', // Use existing project ID
        projectNumber: 99999 // General Project number
      };
      
      console.log('🔍 BUBBLES: Using hardcoded project:', generalProject);
      
      // Create project message (like attachment messages)
      const pm = await prisma.projectMessage.create({
        data: {
          content: messageContent,
          subject: 'Message from Bubbles AI Assistant',
          messageType: 'USER_MESSAGE',
          priority: 'MEDIUM',
          authorId: req.user?.id || null, // Make authorId optional to avoid foreign key constraint
          authorName: `${req.user?.firstName || 'Bubbles'} ${req.user?.lastName || 'AI'}`.trim(),
          authorRole: req.user?.role || 'AI_ASSISTANT',
          projectId: generalProject.id,
          projectNumber: generalProject.projectNumber,
          isSystemGenerated: false,
          isWorkflowMessage: false,
          metadata: {}
        }
      });

      // Add recipients (only team members, not custom emails)
      const teamMemberRecipients = allRecipients.filter(r => !r.isCustom);
      console.log('🔍 COMPLETE-ACTION: Team member recipients to add:', teamMemberRecipients);
      if (teamMemberRecipients.length > 0) {
        const recipientData = teamMemberRecipients.map(r => ({ messageId: pm.id, userId: r.id }));
        console.log('🔍 COMPLETE-ACTION: Creating ProjectMessageRecipient records:', recipientData);
        await prisma.projectMessageRecipient.createMany({
          data: recipientData
        });
      }

      const recipientNames = allRecipients.map(r =>
        r.isCustom ? r.email : `${r.firstName} ${r.lastName}`
      ).join(', ');

      const ack = `✅ Message sent to ${recipientNames}:\n\n"${messageContent}"`;

      return sendSuccess(res, 200, {
        response: { content: ack },
        recipients: allRecipients,
        messageContent
      });
    }

    if (pendingAction.type === 'send_project_message') {
      // Send a message to a specific project
      const messageContent = pendingAction.message || 'Message from Bubbles AI';

      // Fetch the project
      const proj = await prisma.project.findUnique({
        where: { id: pendingAction.projectId },
        include: { customer: true }
      });

      if (!proj) {
        return sendSuccess(res, 404, { response: { content: 'Project not found.' } });
      }

      // Create project message
      const pm = await prisma.projectMessage.create({
        data: {
          content: messageContent,
          subject: `Message for Project #${proj.projectNumber}`,
          messageType: 'USER_MESSAGE',
          priority: 'MEDIUM',
          authorId: req.user.id,
          authorName: `${req.user.firstName || 'User'} ${req.user.lastName || ''}`.trim(),
          authorRole: req.user.role || 'USER',
          projectId: proj.id,
          projectNumber: proj.projectNumber,
          isSystemGenerated: false,
          isWorkflowMessage: false
        }
      });

      // Add recipients
      if (recipients.length > 0) {
        await prisma.projectMessageRecipient.createMany({
          data: recipients.map(r => ({ messageId: pm.id, userId: r.id }))
        });
      }

      const recipientNames = allRecipients.map(r =>
        r.isCustom ? r.email : `${r.firstName} ${r.lastName}`
      ).join(', ');

      const ack = `📨 Message sent to ${recipientNames} for project #${proj.projectNumber}:\n\n"${messageContent}"`;
      contextManager.addToHistory(req.user.id, JSON.stringify(pendingAction), ack, proj);
      return sendSuccess(res, 200, {
        response: { content: ack },
        messageId: pm.id,
        recipients: allRecipients,
        projectNumber: proj.projectNumber
      });
    }

    return sendSuccess(res, 400, { response: { content: 'Unknown action type.' } });
  } catch (error) {
    console.error('❌ Complete action error:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Pending action:', JSON.stringify(pendingAction, null, 2));
    return sendSuccess(res, 500, { response: { content: `Failed to complete action: ${error.message}` } });
  }
}));

/**
 * @desc    Chat with Bubbles AI Assistant
 * @route   POST /api/bubbles/chat
 * @access  Private
 * @summary This new chat route uses the powerful tool-calling architecture from bubbles2.js
 */
router.post('/chat', chatValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: formatValidationErrors(errors) });
  }

  // Determine AI availability (do not early-return; we still want to fulfill document/checklist requests without OpenAI)
  const aiAvailable = !!(openAIService && openAIService.isAvailable && openAIService.isAvailable());

  const { message, projectId, context = {} } = req.body;
  const session = contextManager.getUserSession(req.user.id);

  let projectContext = null;
  let currentWorkflowData = null;
  
  if (projectId) {
    projectContext = await prisma.project.findUnique({ 
      where: { id: projectId }, 
      include: { customer: true }
    });
    if (projectContext) {
      session.activeProject = projectContext;
      // Get real workflow data
      try {
        currentWorkflowData = await getCurrentWorkflowData(projectId);
      } catch (_) {
        currentWorkflowData = null;
      }
    }
  } else if (session.activeProject) {
    projectContext = session.activeProject;
    // Get real workflow data for active project
    try {
      currentWorkflowData = await getCurrentWorkflowData(projectContext.id);
    } catch (_) {
      currentWorkflowData = null;
    }
  }

  // Heuristic 1: Customer info requests (name/address/phone/email)
  const lower = String(message || '').toLowerCase();

  // Heuristic -1: Simple message request (with or without project context)
  // Detect patterns like "send a message that says..." or "send message saying..."
  // This should work even if a project is selected
  const simpleMessagePatterns = [
    /send\s+(?:a\s+)?message\s+(?:that\s+)?(?:says?|saying)/i,
    /send\s+(?:a\s+)?message\s+["'](.+)["']/i,
    /message\s+(?:someone|them|him|her)\s+(?:that\s+)?(?:says?|saying)/i,
    /send\s+(?:a\s+)?message\s+for\s+project/i,
    /send\s+(?:a\s+)?message\s+to\s+\w+/i
  ];

  const isSimpleMessageRequest = simpleMessagePatterns.some(pattern => pattern.test(message));

  // Check if this is a simple message request (not a document send)
  const mentionsDocument = /\b[\w\-\s]+\.(pdf|docx|doc)\b/i.test(message || '');

  if (isSimpleMessageRequest && !mentionsDocument) {
    // Try to resolve project from message text (e.g., "for project #10012")
    let targetProject = projectContext; // Start with current context

    // Check if message mentions a different project number
    const projectNumberMatch = message.match(/#?(\d{5})/);
    if (projectNumberMatch) {
      const projectNumber = projectNumberMatch[1];
      try {
        const foundProject = await prisma.project.findFirst({
          where: { projectNumber },
          include: { customer: true }
        });
        if (foundProject) {
          targetProject = foundProject;
          console.log(`[Bubbles] Resolved project #${projectNumber} from message text`);
        }
      } catch (err) {
        console.warn(`[Bubbles] Failed to resolve project #${projectNumber}:`, err);
      }
    }

    // Extract message content
    let messageContent = '';
    
    // First try to extract from "says" or "saying" patterns with proper quote handling
    // Use separate patterns for double quotes and single quotes to handle apostrophes correctly
    const doubleQuoteMatch = message.match(/(?:says?|saying)[:\s]+"([^"]+)"/i);
    if (doubleQuoteMatch) {
      messageContent = doubleQuoteMatch[1].trim();
    } else {
      const singleQuoteMatch = message.match(/(?:says?|saying)[:\s]+'([^']+)'/i);
      if (singleQuoteMatch) {
        messageContent = singleQuoteMatch[1].trim();
      } else {
        // Try without quotes after "says/saying"
        const sayingMatchNoQuotes = message.match(/(?:says?|saying)[:\s]+(.+?)(?:\s+to\s+|\s+for\s+|$)/i);
        if (sayingMatchNoQuotes) {
          messageContent = sayingMatchNoQuotes[1].trim();
        } else {
          // Try to extract quoted content
          const quotedMatch = message.match(/["']([^"']+)["']/);
          if (quotedMatch) {
            messageContent = quotedMatch[1].trim();
          }
        }
      }
    }

    // Get all team members for recipient selection
    const teamMembers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { not: 'CLIENT' }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const msg = targetProject
      ? `Who would you like to send this message to for project #${targetProject.projectNumber}? Please select from the list below.`
      : 'Who would you like to send this message to? Please select from the list below.';

    contextManager.addToHistory(req.user.id, message, msg, targetProject);
    return sendSuccess(res, 200, {
      response: {
        content: msg,
        requiresRecipientSelection: true,
        availableRecipients: teamMembers,
        pendingAction: {
          type: targetProject ? 'send_project_message' : 'send_simple_message',
          message: messageContent || message,
          projectId: targetProject?.id || null
        }
      }
    });
  }

  // Heuristic 0: Explicit document request (e.g., "give me all 11 steps" + filename or checklist)
  const mentionsFileName = /\b[\w\-\s]+\.(pdf|docx|doc)\b/i.test(message || '');
  const mentionsChecklist = lower.includes('checklist') || lower.includes('start the day') || lower.includes('upfront');
  const asksForSteps = lower.includes('steps') || lower.includes('step') || lower.includes('give me') || lower.includes('list') || lower.includes('what is the other point');
  
  console.log('🔍 BUBBLES DEBUG:', {
    message,
    mentionsFileName,
    mentionsChecklist,
    asksForSteps
  });
  
  // Broaden trigger: if they mention a checklist (like "Upfront Start The Day Checklist"), attempt doc retrieval
  if (mentionsFileName || mentionsChecklist) {
    try {
      console.log('🔍 BUBBLES: Attempting to find asset for message:', message);
      const asset = await findAssetByMention(prisma, message);
      console.log('🔍 BUBBLES: Asset lookup result:', asset ? { id: asset.id, title: asset.title } : 'null');
      
      if (!asset) {
        const notFound = 'I couldn\'t find that document in Company Documents. Try opening Documents & Resources and copy the exact file name.';
        contextManager.addToHistory(req.user.id, message, notFound, projectContext || null);
        return sendSuccess(res, 200, { response: { content: notFound } });
      }

      // If the user intends to send/attach the document, create a project message (and optional task/reminder)
      const intendsToSend = lower.includes('send') || lower.includes('attach') || lower.includes('message');
      const intendsTask = lower.includes('task');
      const intendsReminder = lower.includes('reminder') || lower.includes('calendar');

      if (intendsToSend || intendsTask || intendsReminder) {
        // Resolve project from text or session
        let proj = projectContext;
        if (!proj) {
          try {
            const resolved = await resolveProjectFromMessage(message);
            if (resolved?.project) proj = resolved.project;
          } catch (_) {}
        }
        if (!proj) {
          const msg = 'Please specify a project (name or project number) so I can send this document.';
          contextManager.addToHistory(req.user.id, message, msg, projectContext || null);
          return sendSuccess(res, 200, { response: { content: msg } });
        }

        // Check if recipients were provided via context (from UI selection)
        const contextRecipientIds = context?.selectedRecipientIds || [];

        let recipients = [];

        // ONLY use recipients if they were explicitly selected via UI
        // Do NOT auto-detect recipients from message text to prevent premature sending
        if (contextRecipientIds.length > 0) {
          recipients = await prisma.user.findMany({
            where: { id: { in: contextRecipientIds } },
            select: { id: true, firstName: true, lastName: true, email: true }
          });
        }

        // If no recipients were explicitly selected, ALWAYS prompt for selection
        if (recipients.length === 0) {
          // Get all team members for user selection
          const teamMembers = await prisma.user.findMany({
            where: {
              isActive: true,
              role: { not: 'CLIENT' }
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            },
            orderBy: [
              { firstName: 'asc' },
              { lastName: 'asc' }
            ]
          });

          // Extract user content for the message - improved logic
          let userContent = '';
          
          console.log('🔍 BUBBLES: Extracting user content from message (recipient selection):', message);
          
          // First try to extract from specific patterns
          const sayingIdx = lower.indexOf('message saying');
          if (sayingIdx !== -1) {
            userContent = message.slice(sayingIdx + 'message saying'.length).replace(/^[:\s-]+/, '').trim();
            console.log('🔍 BUBBLES: Found "message saying" pattern, extracted:', userContent);
          }
          if (!userContent) {
            const withIdx = lower.indexOf('with a message');
            if (withIdx !== -1) {
              userContent = message.slice(withIdx + 'with a message'.length).replace(/^[:\s-]+/, '').trim();
              console.log('🔍 BUBBLES: Found "with a message" pattern, extracted:', userContent);
            }
          }
          if (!userContent) {
            // Try "that says" pattern
            const thatSaysIdx = lower.indexOf('that says');
            if (thatSaysIdx !== -1) {
              userContent = message.slice(thatSaysIdx + 'that says'.length).replace(/^[:\s-]+/, '').trim();
              console.log('🔍 BUBBLES: Found "that says" pattern, extracted:', userContent);
            }
          }
          
          // If no specific patterns found, try to extract the main message content
          if (!userContent) {
            let cleanMessage = message;
            console.log('🔍 BUBBLES: No specific patterns found, cleaning message:', cleanMessage);
            
            // Remove document references (quoted filenames)
            cleanMessage = cleanMessage.replace(/["'][^"']*\.(pdf|docx?|txt|jpg|png|gif)["']/gi, '');
            console.log('🔍 BUBBLES: After removing document references:', cleanMessage);
            
            // Remove common attachment phrases
            cleanMessage = cleanMessage.replace(/\b(attach|send|share|include)\s+(this\s+)?(document|file|pdf|doc)\b/gi, '');
            cleanMessage = cleanMessage.replace(/\b(with|and)\s+(this\s+)?(document|file|pdf|doc)\b/gi, '');
            console.log('🔍 BUBBLES: After removing attachment phrases:', cleanMessage);
            
            // Clean up extra whitespace
            cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim();
            console.log('🔍 BUBBLES: After cleaning whitespace:', cleanMessage);
            
            // If we have meaningful content left, use it
            if (cleanMessage.length > 3 && !cleanMessage.match(/^(send|attach|share|include)$/i)) {
              userContent = cleanMessage;
              console.log('🔍 BUBBLES: Using cleaned message as userContent:', userContent);
            } else {
              console.log('🔍 BUBBLES: Cleaned message too short or matches exclusion pattern');
            }
          }
          
          console.log('🔍 BUBBLES: Final userContent (recipient selection):', userContent);

          // Determine if user wants email or internal message
          const wantsEmail = lower.includes('email') || lower.includes('e-mail');
          const actionType = wantsEmail ? 'send_document_email' : 'send_document_message';

          const msg = wantsEmail
            ? 'Who would you like to email this document to? Please select from the list below.'
            : 'Who would you like to send this document to? Please select from the list below.';

          contextManager.addToHistory(req.user.id, message, msg, proj);
          return sendSuccess(res, 200, {
            response: {
              content: msg,
              requiresRecipientSelection: true,
              availableRecipients: teamMembers,
              pendingAction: {
                type: actionType,
                assetId: asset.id,
                assetTitle: asset.title,
                message: userContent,
                projectId: proj.id,
                intendsTask,
                intendsReminder
              }
            }
          });
        }

        // At this point, recipients have been explicitly selected via UI
        // Proceed with sending the document message

        // Extract message content - improved logic to capture user's actual message
        let userContent = '';
        
        console.log('🔍 BUBBLES: Extracting user content from message:', message);
        
        // First try to extract from specific patterns
        const sayingIdx = lower.indexOf('message saying');
        if (sayingIdx !== -1) {
          userContent = message.slice(sayingIdx + 'message saying'.length).replace(/^[:\s-]+/, '').trim();
          console.log('🔍 BUBBLES: Found "message saying" pattern, extracted:', userContent);
        }
        if (!userContent) {
          const withIdx = lower.indexOf('with a message');
          if (withIdx !== -1) {
            userContent = message.slice(withIdx + 'with a message'.length).replace(/^[:\s-]+/, '').trim();
            console.log('🔍 BUBBLES: Found "with a message" pattern, extracted:', userContent);
          }
        }
        if (!userContent) {
          // Try "that says" pattern
          const thatSaysIdx = lower.indexOf('that says');
          if (thatSaysIdx !== -1) {
            userContent = message.slice(thatSaysIdx + 'that says'.length).replace(/^[:\s-]+/, '').trim();
            console.log('🔍 BUBBLES: Found "that says" pattern, extracted:', userContent);
          }
        }
        
        // If no specific patterns found, try to extract the main message content
        // by removing document references and common attachment phrases
        if (!userContent) {
          let cleanMessage = message;
          console.log('🔍 BUBBLES: No specific patterns found, cleaning message:', cleanMessage);
          
          // Remove document references (quoted filenames)
          cleanMessage = cleanMessage.replace(/["'][^"']*\.(pdf|docx?|txt|jpg|png|gif)["']/gi, '');
          console.log('🔍 BUBBLES: After removing document references:', cleanMessage);
          
          // Remove common attachment phrases
          cleanMessage = cleanMessage.replace(/\b(attach|send|share|include)\s+(this\s+)?(document|file|pdf|doc)\b/gi, '');
          cleanMessage = cleanMessage.replace(/\b(with|and)\s+(this\s+)?(document|file|pdf|doc)\b/gi, '');
          console.log('🔍 BUBBLES: After removing attachment phrases:', cleanMessage);
          
          // Clean up extra whitespace
          cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim();
          console.log('🔍 BUBBLES: After cleaning whitespace:', cleanMessage);
          
          // If we have meaningful content left, use it
          if (cleanMessage.length > 3 && !cleanMessage.match(/^(send|attach|share|include)$/i)) {
            userContent = cleanMessage;
            console.log('🔍 BUBBLES: Using cleaned message as userContent:', userContent);
          } else {
            console.log('🔍 BUBBLES: Cleaned message too short or matches exclusion pattern');
          }
        }
        
        console.log('🔍 BUBBLES: Final userContent:', userContent);

        // Build attachment metadata
        const fileUrl = asset?.versions?.[0]?.fileUrl || asset?.fileUrl || null;
        const attachment = {
          assetId: asset.id || null,
          title: asset.title || 'Document',
          mimeType: asset.mimeType || 'application/octet-stream',
          fileUrl,
          thumbnailUrl: asset.thumbnailUrl || null
        };

        // Create a project message with attachment metadata
        const pm = await prisma.projectMessage.create({
          data: {
            content: userContent || `Shared document: ${attachment.title}`,
            subject: `Document: ${attachment.title}`,
            messageType: 'USER_MESSAGE',
            priority: 'MEDIUM',
            authorId: req.user?.id || null, // Make authorId optional to avoid foreign key constraint
            authorName: `${req.user?.firstName || 'Bubbles'} ${req.user?.lastName || 'AI'}`.trim(),
            authorRole: req.user?.role || 'AI_ASSISTANT',
            projectId: proj.id,
            projectNumber: proj.projectNumber,
            isSystemGenerated: false,
            isWorkflowMessage: false,
            metadata: { attachments: [attachment] }
          }
        });

        // Add recipients if provided
        if (recipients.length > 0) {
          await prisma.projectMessageRecipient.createMany({
            data: recipients.map(r => ({ messageId: pm.id, userId: r.id }))
          });
        }

        // Optionally create a Task
        let createdTask = null;
        if (intendsTask) {
          let assignedToId = recipients?.[0]?.id || null;
          if (!assignedToId) {
            // Try project manager as default assignee
            try {
              const projFull = await prisma.project.findUnique({ where: { id: proj.id }, select: { projectManagerId: true } });
              assignedToId = projFull?.projectManagerId || req.user.id;
            } catch (_) { assignedToId = req.user.id; }
          }
          const priority = lower.includes('high') ? 'HIGH' : (lower.includes('low') ? 'LOW' : 'MEDIUM');
          const due = parseDueDateFromText(message);
          const taskTitle = (userContent && userContent.length <= 80)
            ? userContent
            : `Review: ${attachment.title}`;
          try {
            createdTask = await prisma.task.create({
              data: {
                title: taskTitle.slice(0, 200),
                description: `Auto-created from Bubbles when sending ${attachment.title}.` + (userContent ? `\n\nNote: ${userContent}` : ''),
                dueDate: due,
                priority,
                status: 'TO_DO',
                category: 'DOCUMENTATION',
                projectId: proj.id,
                assignedToId,
                createdById: req.user.id
              }
            });
          } catch (taskErr) {
            // Non-fatal: continue
          }
        }

        // Optionally create a Reminder (Calendar Event)
        let createdReminder = null;
        if (intendsReminder) {
          try {
            const start = parseReminderDateTimeFromText(message);
            const end = new Date(start.getTime() + 30 * 60 * 1000);
            const event = await prisma.calendarEvent.create({
              data: {
                title: `Follow-up: ${attachment.title}`.slice(0, 120),
                description: `Auto-created from Bubbles when sending ${attachment.title}.` + (userContent ? `\n\nNote: ${userContent}` : ''),
                startTime: start,
                endTime: end,
                isAllDay: false,
                eventType: 'REMINDER',
                status: 'CONFIRMED',
                projectId: proj.id,
                organizerId: req.user.id,
                attendees: recipients?.length ? {
                  create: recipients.map(r => ({ userId: r.id, status: 'REQUIRED', response: 'NO_RESPONSE' }))
                } : undefined
              }
            });
            createdReminder = event;
          } catch (remErr) {
            // Non-fatal
          }
        }

        // Build acknowledgment
        const parts = [];
        parts.push(`Attached "${attachment.title}" to a new project message for project #${proj.projectNumber}` + (recipients.length ? ` and notified ${recipients.map(r => r.firstName + ' ' + r.lastName).join(', ')}` : '') + '.');
        if (createdTask) {
          parts.push(`Created task "${createdTask.title}" (due ${new Date(createdTask.dueDate).toLocaleString()}).`);
        }
        if (createdReminder) {
          parts.push(`Set a reminder for ${new Date(createdReminder.startTime).toLocaleString()}.`);
        }
        const ack = parts.join(' ');
        contextManager.addToHistory(req.user.id, message, ack, proj);
        return sendSuccess(res, 200, { response: { content: ack }, messageId: pm.id, attachments: [attachment], taskId: createdTask?.id, reminderId: createdReminder?.id });
      }

      // Default behavior: open the document and extract steps
      const fileData = await readAssetCurrentFile(asset);
      if (!fileData || !fileData.text) {
        const noDisk = 'The document record exists but the file is missing on disk. Please re-upload it from Documents & Resources.';
        contextManager.addToHistory(req.user.id, message, noDisk, projectContext || null);
        return sendSuccess(res, 200, { response: { content: noDisk } });
      }
      let steps = extractNumberedSteps(fileData.text, 30);
      if (!steps || steps.length === 0) {
        // Fallback: try bullets that start with - or •
        const lines = fileData.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const bullets = lines.filter(l => /^([\-•\*])\s+/.test(l)).slice(0, 20).map((t, i) => ({ n: i + 1, text: t.replace(/^([\-•\*])\s+/, '') }));
        steps = bullets;
      }
      // Prefer first 11 if more
      const top = steps.slice(0, 11);
      const content = top.length
        ? `Here are the steps from "${asset.title}":\n\n` + top.map(s => `${s.n}. ${s.text}`).join('\n')
        : `I opened "${asset.title}" but couldn\'t detect numbered steps. Try asking for a summary and I\'ll extract key points.`;
      contextManager.addToHistory(req.user.id, message, content, projectContext || null);
      return sendSuccess(res, 200, { response: { content } });
    } catch (docErr) {
      const msg = `Document processing failed: ${docErr?.message || docErr}`;
      contextManager.addToHistory(req.user.id, message, msg, projectContext || null);
      return sendSuccess(res, 200, { response: { content: msg } });
    }
  }

  // Heuristic: Email sending detection
  const mentionsEmail = lower.includes('email') || lower.includes('send email') || lower.includes('e-mail');
  const hasEmailIntent = mentionsEmail && (lower.includes('send') || lower.includes('to'));
  
  if (hasEmailIntent && emailService.isAvailable()) {
    try {
      // Resolve project if not already in context
      let proj = projectContext;
      if (!proj) {
        const resolved = await resolveProjectFromMessage(message);
        if (resolved?.project) proj = resolved.project;
      }

      // Do NOT auto-detect recipients from message text to prevent premature sending
      // Recipients should only be provided via the complete-action endpoint after user selection
      let recipients = [];
      let customerRecipient = null;

      // Extract email subject
      let subject = 'Message from Kenstruction';
      const subjectMatch = message.match(/subject[:\s]+["']?([^"'\n]+)["']?/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
      } else if (proj) {
        subject = `Update on ${proj.projectName}`;
      }

      // Extract email body/message
      let emailBody = '';
      const bodyPatterns = [
        /(?:message|body|content|text)[:\s]+["']?([^"'\n]+)["']?/i,
        /(?:saying|with)[:\s]+["']?([^"'\n]+)["']?/i
      ];
      for (const pattern of bodyPatterns) {
        const match = message.match(pattern);
        if (match) {
          emailBody = match[1].trim();
          break;
        }
      }

      // Check for document attachments
      let attachments = [];
      if (mentionsFileName || lower.includes('attach')) {
        try {
          const asset = await findAssetByMention(prisma, message);
          if (asset) {
            attachments.push({ documentId: asset.id });
          }
        } catch (_) {}
      }

      // Validate we have recipients
      const allRecipients = [
        ...(customerRecipient ? [customerRecipient] : []),
        ...recipients.map(r => ({ email: r.email, name: `${r.firstName} ${r.lastName}`, type: 'user' }))
      ];

      if (allRecipients.length === 0) {
        // Get all team members for user selection
        const teamMembers = await prisma.user.findMany({
          where: {
            isActive: true,
            role: { not: 'CLIENT' }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          },
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' }
          ]
        });

        const msg = 'Who would you like to send this email to? Please select from the list below.';
        contextManager.addToHistory(req.user.id, message, msg, projectContext || null);
        return sendSuccess(res, 200, {
          response: {
            content: msg,
            requiresRecipientSelection: true,
            availableRecipients: teamMembers,
            pendingAction: {
              type: 'send_email',
              subject,
              body: emailBody,
              attachments,
              projectId: proj?.id
            }
          }
        });
      }

      if (!emailBody) {
        const msg = 'Please provide the email message content. For example: "Send email to John Smith saying: Please review the attached document."';
        contextManager.addToHistory(req.user.id, message, msg, projectContext || null);
        return sendSuccess(res, 200, { response: { content: msg } });
      }

      // Create HTML email template
      const html = emailService.createEmailTemplate({
        title: subject,
        content: `<p>${emailBody.replace(/\n/g, '<br>')}</p>` + 
                 (proj ? `<p><strong>Project:</strong> ${proj.projectName}<br><strong>Project #:</strong> ${proj.projectNumber}</p>` : ''),
        footer: `This email was sent via Bubbles AI Assistant by ${req.user.firstName} ${req.user.lastName}`
      });

      // Send emails to all recipients
      const results = [];
      for (const recipient of allRecipients) {
        try {
          const result = await emailService.sendEmail({
            to: recipient.email,
            subject,
            html,
            text: emailBody,
            attachments,
            replyTo: req.user.email,
            tags: {
              sentBy: req.user.id,
              projectId: proj?.id,
              recipientType: recipient.type,
              source: 'bubbles_ai'
            }
          });
          results.push({ recipient: recipient.name, success: true, messageId: result.messageId });
        } catch (emailErr) {
          results.push({ recipient: recipient.name, success: false, error: emailErr.message });
        }
      }

      // Log each successful email to database
      for (const result of results.filter(r => r.success)) {
        const recipient = allRecipients.find(r => r.name === result.recipient);
        if (recipient) {
          await emailService.logEmail({
            senderId: req.user.id,
            senderEmail: req.user.email,
            senderName: `${req.user.firstName} ${req.user.lastName}`,
            to: [recipient.email],
            subject,
            text: emailBody,
            html,
            attachments,
            messageId: result.messageId,
            projectId: proj?.id,
            customerId: recipient.type === 'customer' ? recipient.id : null,
            emailType: 'bubbles_ai',
            status: 'sent',
            tags: { source: 'bubbles_ai', aiGenerated: true },
            metadata: { conversationContext: true }
          });
        }
      }

      // Build response
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      let response = `✅ Email sent successfully to ${successCount} recipient${successCount !== 1 ? 's' : ''}`;
      if (failCount > 0) {
        response += ` (${failCount} failed)`;
      }
      response += `:\n\n`;
      response += `**Subject:** ${subject}\n`;
      response += `**Recipients:** ${allRecipients.map(r => r.name).join(', ')}\n`;
      if (attachments.length > 0) {
        response += `**Attachments:** ${attachments.length} file(s)\n`;
      }

      contextManager.addToHistory(req.user.id, message, response, proj || projectContext);
      return sendSuccess(res, 200, { 
        response: { content: response }, 
        emailResults: results,
        emailsSent: successCount
      });

    } catch (emailError) {
      console.error('Bubbles email error:', emailError);
      const errorMsg = `I encountered an error sending the email: ${emailError.message}`;
      contextManager.addToHistory(req.user.id, message, errorMsg, projectContext || null);
      return sendSuccess(res, 200, { response: { content: errorMsg } });
    }
  }

  const wantsCustomerInfo = /customer|owner|client/.test(lower) && /(name|phone|email|address)/.test(lower);
  if (projectContext && wantsCustomerInfo) {
    const proj = await prisma.project.findUnique({ where: { id: projectContext.id }, include: { customer: true } });
    const c = proj?.customer || {};
    const lines = [];
    if (c.primaryName) lines.push(`Customer: ${c.primaryName}`);
    if (c.secondaryName) lines.push(`Secondary: ${c.secondaryName}`);
    const addrParts = [c.addressLine1, c.addressLine2, c.city && c.state ? `${c.city}, ${c.state}` : c.city || c.state, c.postalCode || c.zip];
    const addr = addrParts.filter(Boolean).join(', ');
    if (addr) lines.push(`Address: ${addr}`);
    if (c.primaryPhone || c.phone) lines.push(`Phone: ${c.primaryPhone || c.phone}`);
    if (c.primaryEmail || c.email) lines.push(`Email: ${c.primaryEmail || c.email}`);
    const content = lines.length ? lines.join('\n') : 'No customer contact details are available for this project.';
    contextManager.addToHistory(req.user.id, message, content, proj || projectContext);
    return sendSuccess(res, 200, { response: { content } });
  }

  // Determine whether the message is project-specific or a general question
  const projectKeywords = [
    'project','phase','section','line item','workflow','task','alert','status','current step',
    'customer','quote','estimate','invoice','schedule','deadline','assign','reassign','complete',
    'check off','incomplete','team','recipient','message in project','mark as complete'
  ];
  const isProjectSpecific = projectKeywords.some(k => lower.includes(k));

  // Check if it's a workflow/roofing knowledge question (should use enhanced prompt even without project selected)
  const workflowKnowledgeKeywords = [
    'workflow', 'phase', 'section', 'line item', 'roofing', 'ice and water shield', 'ice dam',
    'colorado roofing', 'building code', 'lead phase', 'prospect phase', 'approved phase',
    'execution phase', 'completion phase', 'second supplement'
  ];
  const isWorkflowKnowledge = workflowKnowledgeKeywords.some(k => lower.includes(k));

  // Heuristic 2: General/company questions → Use OpenAI directly (but not for workflow knowledge)
  if (!projectContext && !isProjectSpecific && !isWorkflowKnowledge) {
    const genericSystemPrompt = `You are \"Bubbles,\" an expert AI assistant for Kenstruction. Answer general questions about any topic helpfully and accurately.`;
    if (!aiAvailable) {
      const contentGeneric = heuristicGeneralAnswer(message);
      contextManager.addToHistory(req.user.id, message, contentGeneric, projectContext || null);
      return sendSuccess(res, 200, { 
        response: { 
          content: contentGeneric,
          source: 'fallback',
          metadata: { usedMock: true },
          aiStatus: (openAIService && openAIService.getStatus ? openAIService.getStatus() : { enabled: false, model: 'mock-responses', status: 'fallback' })
        } 
      });
    }
    const generic = await openAIService.generateResponse(message, {
      systemPrompt: genericSystemPrompt,
    });
    let contentGeneric = generic?.content || 'OK';
    // If service is in fallback/mock, generate a better heuristic answer
    const usedMock = !generic?.source || String(generic.source).includes('mock-responses');
    if (usedMock) {
      contentGeneric = heuristicGeneralAnswer(message);
    }
    contextManager.addToHistory(req.user.id, message, contentGeneric, projectContext || null);
    return sendSuccess(res, 200, { 
      response: { 
        content: contentGeneric,
        source: generic?.source || 'unknown',
        metadata: { ...(generic?.metadata || {}), usedMock },
        aiStatus: (openAIService && openAIService.getStatus ? openAIService.getStatus() : undefined)
      } 
    });
  }

  // Use enhanced system prompt for workflow knowledge questions or project-specific questions
  const systemPrompt = getSystemPrompt(req.user, projectContext, currentWorkflowData);

  // Retrieve document context via semantic search (merge project docs and global company assets)
  let documentSnippets = [];
  try {
    const topProject = await EmbeddingService.semanticSearch({ projectId: projectContext?.id || null, query: message, topK: 8 });
    let topGlobal = [];
    try { topGlobal = await EmbeddingService.semanticSearch({ projectId: null, query: message, topK: 8 }); } catch (_) {}
    const merged = [...(topProject || []), ...(topGlobal || [])]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 12);
    documentSnippets = merged.map(c => `file:${c.fileId} page:${c?.metadata?.page || ''} score:${(c.score||0).toFixed(3)}\n${(c.snippet||'').replace(/\s+/g,' ').slice(0, 600)}`);
  } catch (e) {
    // If embeddings not available, continue without context
    documentSnippets = [];
  }

  if (!aiAvailable) {
    return res.status(503).json({
      success: false,
      message: 'AI service is temporarily unavailable',
      aiStatus: openAIService && openAIService.getStatus ? openAIService.getStatus() : { enabled: false, model: 'mock-responses', status: 'fallback' }
    });
  }
  const aiResponse = await openAIService.generateResponse(message, {
    systemPrompt,
    projectName: projectContext?.projectName,
    progress: projectContext?.progress,
    projectNumber: projectContext?.projectNumber,
    documentSnippets
  });

  let content = aiResponse?.content || 'OK';
  const usedMockProject = !aiResponse?.source || String(aiResponse.source).includes('mock-responses');
  if (usedMockProject && !isProjectSpecific) {
    // If this is actually a general question but we ended up here, still provide heuristic
    content = heuristicGeneralAnswer(message);
  }
  contextManager.addToHistory(req.user.id, message, content, projectContext);
  return sendSuccess(res, 200, { response: { content, source: aiResponse?.source || 'unknown', metadata: aiResponse?.metadata || {}, aiStatus: (openAIService && openAIService.getStatus ? openAIService.getStatus() : undefined) } });
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
    select: { id: true, currentLineItemId: true, currentPhaseId: true, workflowType: true }
  });
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
  // Fallbacks when we don't have a direct current line item
  if (!li) {
    let phaseName = null;
    if (tracker?.currentPhaseId) {
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

    // Final fallback if no tracker at all: try alert-first, then first active
    if (!tracker) {
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
          } }, 'Current step fetched (from active alert, no tracker)');
        }
      } catch (_) {}

      try {
        const phaseAny = await prisma.workflowPhase.findFirst({
          where: { isActive: true, isCurrent: true },
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
          } }, 'Current step fetched (first active, no tracker)');
        }
      } catch (_) {}
    }
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