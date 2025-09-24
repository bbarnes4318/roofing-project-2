const express = require('express');
const OpenAI = require('openai');
const crypto = require('crypto');
const EmbeddingService = require('../services/EmbeddingService');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

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
