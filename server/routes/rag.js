const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const EmbeddingService = require('../services/EmbeddingService');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

const prisma = new PrismaClient();
const router = express.Router();

const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o';
const openaiClient = (() => {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  return apiKey ? new OpenAI({ apiKey }) : null;
})();

// POST /api/search/semantic
router.post('/search/semantic', authenticateToken, async (req, res) => {
  try {
    const { projectId, query, topK = 8, filters = {} } = req.body || {};
    if (!query || String(query).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }
    const results = await EmbeddingService.semanticSearch({ projectId, query, topK: Number(topK) || 8 });
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('POST /search/semantic error:', err);
    return res.status(500).json({ success: false, message: 'Semantic search failed' });
  }
});

function buildRagMessages({ chunks, userQuery }) {
  const system = {
    role: 'system',
    content: 'You are the company\'s AI assistant. You can hold normal conversational dialogue and also answer job/document-specific queries using the supplied DOCUMENT CONTEXT blocks. When giving factual assertions based on docs, always include provenance in the format [file:<fileId> page:<n> photo:<i>]. Be concise (150–250 words) unless the user asks for more. Always include up to 3 suggested actions.'
  };
  const contextBlocks = chunks.map((c) => {
    const meta = c.metadata || {};
    return {
      role: 'user',
      content: `--- DOCUMENT START ---\nfileId: ${c.fileId}\npage: ${meta.page || ''}\nchunkId: ${c.chunkId || ''}\nmetadata: ${JSON.stringify({ projectId: meta.projectId || null, fileName: meta.fileName || null, fileType: meta.mimeType || meta.fileType || null, tags: meta.tags || [], uploaderId: meta.uploaderId || null, date: meta.date || null })}\nsnippet: ${c.snippet || ''}\n--- DOCUMENT END ---`
    };
  });
  const instruction = {
    role: 'user',
    content: `Answer the user's question: ${userQuery}. If the question is general chat, answer conversationally without citing docs. If it concerns documents, cite sources for any factual claims. Return structured JSON: {answer, actions, sources}.`
  };
  return [system, ...contextBlocks, instruction];
}

// POST /api/assistant/query
router.post('/assistant/query', authenticateToken, async (req, res) => {
  try {
    const { projectId, query, userId, contextFileIds = [], mode = 'chat' } = req.body || {};
    if (!query || String(query).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }
    // Step a: choose chunks
    let chunks = [];
    if (Array.isArray(contextFileIds) && contextFileIds.length > 0) {
      const top = await EmbeddingService.semanticSearch({ projectId, query, topK: 24 });
      const allow = new Set(contextFileIds.map(String));
      chunks = top.filter((t) => allow.has(String(t.fileId))).slice(0, 12);
    } else {
      chunks = await EmbeddingService.semanticSearch({ projectId, query, topK: 12 });
    }

    // Build messages per template
    if (!openaiClient) {
      return res.json({ success: true, data: { answer: 'OpenAI not configured. Please set OPENAI_API_KEY.', actions: [], sources: chunks.map((c) => ({ fileId: c.fileId, chunkId: c.chunkId, page: c?.metadata?.page || null, score: c.score })) } });
    }

    const messages = buildRagMessages({ chunks, userQuery: query });

    const chat = await openaiClient.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 600,
    });
    const text = chat?.choices?.[0]?.message?.content || '{}';

    // Try to parse structured JSON
    let parsed = null;
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch (_) {
      parsed = { answer: text, actions: [], sources: [] };
    }

    const response = {
      answer: parsed.answer || text,
      actions: parsed.actions || [],
      sources: (parsed.sources && Array.isArray(parsed.sources) && parsed.sources.length > 0)
        ? parsed.sources
        : chunks.slice(0, 8).map((c) => ({ fileId: c.fileId, chunkId: c.chunkId, page: c?.metadata?.page || null, score: c.score })),
    };

    // Persist transcript minimal
    try {
      await prisma.message.create({
        data: {
          text: `Q: ${query}\nA: ${response.answer}`,
          messageType: 'TEXT',
          isEdited: false,
          isDeleted: false,
          conversation: { connect: { id: req.user.id } },
          sender: { connect: { id: req.user.id } },
        }
      });
    } catch (_) {}

    return res.json({ success: true, data: response });
  } catch (err) {
    console.error('POST /assistant/query error:', err);
    return res.status(500).json({ success: false, message: 'Assistant query failed' });
  }
});

module.exports = router;
