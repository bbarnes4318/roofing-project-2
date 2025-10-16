const express = require('express');
const { prisma } = require('../config/prisma');
const { authenticateToken } = require('../middleware/auth');
const EmbeddingService = require('../services/EmbeddingService');
const { getObjectPresignedUrl, getS3 } = require('../config/spaces');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

function extractSpacesKey(fileUrl) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('spaces://')) return fileUrl.replace('spaces://', '');
  // Legacy local uploads path
  if (fileUrl.startsWith('/uploads/')) return fileUrl.replace(/^\/+/, '');
  // Raw key
  return fileUrl;
}

// GET /api/files
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { projectId, type, tags, semantic_query, limit = 50 } = req.query;

    if (semantic_query && String(semantic_query).trim().length > 0) {
      const top = await EmbeddingService.semanticSearch({ projectId, query: semantic_query, topK: Number(limit) || 8 });
      // hydrate minimal doc info
      const fileIds = [...new Set(top.map((t) => t.fileId).filter(Boolean))];
      const docs = await prisma.document.findMany({ where: { id: { in: fileIds } } });
      const docsById = Object.fromEntries(docs.map((d) => [d.id, d]));
      const ranked = top.map((r) => ({
        fileId: r.fileId,
        score: r.score,
        snippet: r.snippet,
        metadata: r.metadata,
        document: docsById[r.fileId] || null,
      }));
      return res.json({ success: true, data: { results: ranked } });
    }

    const where = {};
    if (projectId) where.projectId = projectId;
    if (type) where.fileType = type;
    if (tags) where.tags = { hasSome: Array.isArray(tags) ? tags : [tags] };
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit) });
    res.json({ success: true, data: { files: docs } });
  } catch (err) {
    console.error('GET /files error:', err);
    res.status(500).json({ success: false, message: 'Failed to list files' });
  }
});

// GET /api/files/:fileId
router.get('/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const doc = await prisma.document.findUnique({ where: { id: fileId } });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const key = extractSpacesKey(doc.fileUrl);
    let signedUrl = null;
    try { signedUrl = await getObjectPresignedUrl(key, 900); } catch (_) { signedUrl = null; }

    const streamUrl = `/api/files/${encodeURIComponent(fileId)}/stream`;
    res.json({ success: true, data: { ...doc, signedUrl, streamUrl, derivatives: [] } });
  } catch (err) {
    console.error('GET /files/:id error:', err);
    res.status(500).json({ success: false, message: 'Failed to get file' });
  }
});

// POST /api/files/:fileId/annotate
router.post('/files/:fileId/annotate', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { annotations = [] } = req.body || {};

    // Persist to a raw annotations table (created via ensureVectorSchema)
    await prisma.$executeRawUnsafe(
      `INSERT INTO document_annotations (document_id, user_id, annotations) VALUES ($1, $2, $3::jsonb)`,
      fileId,
      req.user.id,
      JSON.stringify(annotations)
    );

    res.json({ success: true, data: { fileId, versionCreated: true } });
  } catch (err) {
    console.error('POST /files/:id/annotate error:', err);
    res.status(500).json({ success: false, message: 'Failed to annotate file' });
  }
});

module.exports = router;

// Stream file contents through server to avoid client-side CORS limitations
router.get('/files/:fileId/stream', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const doc = await prisma.document.findUnique({ where: { id: fileId } });
    if (!doc) return res.status(404).end();

    const key = extractSpacesKey(doc.fileUrl);
    if (!key) return res.status(400).end();

    const s3 = getS3();
    const Bucket = process.env.DO_SPACES_NAME;

    const range = req.headers['range'];
    const cmdInput = { Bucket, Key: key };
    if (range) cmdInput.Range = range;
    const resp = await s3.send(new GetObjectCommand(cmdInput));

    // Pass through headers where helpful
    if (resp.ContentType) res.setHeader('Content-Type', resp.ContentType);
    if (resp.ContentLength) res.setHeader('Content-Length', resp.ContentLength);
    if (resp.ETag) res.setHeader('ETag', resp.ETag);
    res.setHeader('Accept-Ranges', 'bytes');
    if (resp.ContentRange) {
      res.setHeader('Content-Range', resp.ContentRange);
      res.status(206);
    }

    resp.Body.on('error', (e) => {
      console.error('Stream error:', e);
      try { res.destroy(e); } catch (_) {}
    });
    resp.Body.pipe(res);
  } catch (err) {
    console.error('GET /files/:id/stream error:', err);
    if (!res.headersSent) res.status(500).end();
  }
});
