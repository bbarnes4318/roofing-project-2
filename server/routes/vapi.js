const express = require('express');
const OpenAI = require('openai');
const crypto = require('crypto');
const EmbeddingService = require('../services/EmbeddingService');
const { findAssetByMention } = require('../services/AssetLookup');
const { prisma } = require('../config/prisma');

const router = express.Router();
 

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

function buildRagMessages({ chunks, userQuery }) {
  const system = {
    role: 'system',
    content: 'You are the company\'s AI assistant. Speak naturally and conversationally. You can answer general questions without citing documents. When the user asks about project documents or policies, consult the provided DOCUMENT CONTEXT blocks as needed, and cite sources like [file:<fileId> page:<n>]. Keep responses concise (10-20 seconds when spoken).'
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

// ===== Helpers ported from bubbles for voice message creation =====
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
    if (/(due\s*)?today\b/.test(lower)) { const d = new Date(); d.setHours(17,0,0,0); return d; }
    if (/(due\s*)?tomorrow\b/.test(lower)) { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(17,0,0,0); return d; }
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
        const diff = (i - now.getDay() + 7) % 7 || 7;
        base.setDate(now.getDate() + diff);
        break;
      }
    }
    if (timeMatch) {
      let h = parseInt(timeMatch[1],10);
      const min = timeMatch[2] ? parseInt(timeMatch[2],10) : 0;
      const ampm = timeMatch[3] || '';
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      base.setHours(h, min, 0, 0);
      if (base <= now) base.setDate(base.getDate()+1);
      return base;
    }
    const d = nextBusinessDaysFromNow(1); d.setHours(9,0,0,0); return d;
  } catch (_) {}
  const d = nextBusinessDaysFromNow(1); d.setHours(9,0,0,0); return d;
}

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
    // Accept multiple possible field names coming from Vapi UI schema builder
    let projectId = raw.projectId ?? raw.projectid ?? raw.project_id ?? raw.project ?? req.query.projectId ?? req.query.projectid ?? null;
    let query = raw.query ?? raw.input ?? raw.text ?? raw.message ?? raw.turn?.input ?? raw.turn?.text ?? req.query.query ?? req.query.q ?? '';
    let contextFileIds = raw.contextFileIds ?? raw.context_file_ids ?? raw.fileIds ?? raw.file_ids ?? [];

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

    // Optional: allow returning Vapi actions if requested
    const returnActions = (req.header('X-Return-Actions') === '1') || (raw.returnActions === true);

    // Voice doc attach intent: handle before RAG/LLM
    const lower = String(query).toLowerCase();
    const wantsSend = /(send|share|attach|email|message)\b/.test(lower);
    const docyIntent = /(\.(pdf|docx|doc|xlsx|csv|txt|jpg|jpeg|png)\b|document|file|permit|estimate|warranty|checklist|manual|policy|form|guide|photo|image)/.test(lower);

    if (wantsSend && docyIntent) {
      // Resolve project by provided id or by number in text
      let proj = null;
      if (projectId) {
        proj = await prisma.project.findUnique({ where: { id: String(projectId) }, select: { id: true, projectNumber: true, projectName: true, projectManagerId: true } });
      }
      if (!proj) {
        const pnum = extractProjectNumberFromText(query);
        if (pnum) {
          proj = await prisma.project.findFirst({ where: { projectNumber: pnum }, select: { id: true, projectNumber: true, projectName: true, projectManagerId: true } });
        }
      }

      if (!proj) {
        const msg = 'I need a project to send that to. Please say the project number, for example “Send to project #12345…”.';
        if (returnActions) return res.json([{ type: 'say', text: msg }]);
        return res.json({ success: false, message: msg });
      }

      // Find asset from mention
      const asset = await findAssetByMention(prisma, query);
      if (!asset) {
        const msg = 'I couldn\'t find that document in Documents & Resources. Try mentioning more of the file name.';
        if (returnActions) return res.json([{ type: 'say', text: msg }]);
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
          recipients = await prisma.user.findMany({ where: { OR: ors }, select: { id: true, firstName: true, lastName: true, email: true } });
        }
      }
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

      // Optional short content after phrases like "message saying"
      let userContent = '';
      const sayingIdx = lower.indexOf('message saying');
      if (sayingIdx !== -1) {
        userContent = query.slice(sayingIdx + 'message saying'.length).replace(/^[:\s-]+/, '').trim();
      }
      if (!userContent) {
        const withIdx = lower.indexOf('with a message');
        if (withIdx !== -1) userContent = query.slice(withIdx + 'with a message'.length).replace(/^[:\s-]+/, '').trim();
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

      if (recipients.length > 0) {
        await prisma.projectMessageRecipient.createMany({ data: recipients.map(r => ({ messageId: pm.id, userId: r.id })) });
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

      if (returnActions) return res.json([{ type: 'say', text: ack }]);
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
        return res.json([
          { type: 'say', text: 'I can’t access the knowledge service right now, but I’m still here to help with general questions.' }
        ]);
      }
      return res.json({ success: true, data: { answer: 'OpenAI not configured on server.' } });
    }

    const messages = buildRagMessages({ chunks, userQuery: query });
    const chat = await openaiClient.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages,
      temperature: 0.4, // a bit warmer for natural voice
      max_tokens: 300,
    });
    const text = chat?.choices?.[0]?.message?.content || '';
    const used = chunks.length > 0;

    if (returnActions) {
      // Return Vapi actions directly for tools that expect actions output
      return res.json([
        { type: 'say', text }
      ]);
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
