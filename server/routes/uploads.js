const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { createPresignedPutUrl, getS3 } = require('../config/spaces');
const { PrismaClient } = require('@prisma/client');
const IngestionService = require('../services/IngestionService');
const multer = require('multer');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// In-memory pending uploads registry (replace with Redis/BullMQ if needed)
const pending = new Map();

// POST /api/upload/initiate
router.post('/upload/initiate', authenticateToken, async (req, res) => {
  try {
    const { jobId, projectId, fileName, fileType, size, uploaderId, metadata = {} } = req.body || {};
    if (!fileName || !fileType) {
      return res.status(400).json({ success: false, message: 'fileName and fileType are required' });
    }
    const uploadId = uuidv4();
    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `files/${projectId || 'general'}/${Date.now()}_${safeName}`;
    const { uploadUrl, expiresAt } = await createPresignedPutUrl(key, fileType, 900);

    pending.set(uploadId, { key, projectId, jobId, uploaderId: uploaderId || req.user.id, fileType, size, metadata });

    return res.json({ success: true, data: { uploadId, uploadUrl, expiresAt, key } });
  } catch (err) {
    console.error('upload/initiate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initiate upload' });
  }
});

// POST /api/upload/complete
router.post('/upload/complete', authenticateToken, async (req, res) => {
  try {
    const { uploadId, jobId, key: keyFromBody, fileUrl, checksum, metadata = {} } = req.body || {};
    let entry = pending.get(uploadId);
    if (!entry) {
      // Fallback: accept explicit key to allow stateless completion (e.g., after server restart)
      if (!keyFromBody) {
        return res.status(400).json({ success: false, message: 'Invalid uploadId and no key provided' });
      }
      entry = {
        key: keyFromBody,
        projectId: metadata.projectId || null,
        jobId: jobId || null,
        uploaderId: req.user?.id,
        fileType: metadata.mimeType || 'application/octet-stream',
        size: metadata.size || 0,
        metadata
      };
    }
    // Create Document row immediately
    const key = entry.key;
    const fileName = key.split('/').pop();
    const projectId = entry.projectId || metadata.projectId || null;
    const mimeType = entry.fileType || metadata.mimeType || 'application/octet-stream';
    const fileSize = Number(entry.size || 0);
    const uploadedById = entry.uploaderId || req.user.id;

    const doc = await prisma.document.create({
      data: {
        fileName,
        originalName: fileName,
        fileUrl: `spaces://${key}`,
        mimeType,
        fileSize,
        fileType: 'OTHER',
        description: metadata.description || null,
        tags: Array.isArray(metadata.tags) ? metadata.tags : [],
        isPublic: Boolean(metadata.isPublic) || false,
        projectId,
        uploadedById,
        checksum: checksum || null,
      }
    });

    // Fire-and-forget ingestion (no queue in this minimal implementation)
    IngestionService.processFile({ documentId: doc.id, projectId, key, mimeType })
      .then(() => console.log('✅ Ingestion complete for', doc.id))
      .catch((e) => console.warn('⚠️ Ingestion failed for', doc.id, e?.message || e));

    const record = {
      id: doc.id,
      key,
      projectId,
      fileType: 'OTHER',
      size: fileSize,
      checksum: checksum || null,
      metadata: { ...entry.metadata, ...metadata },
      status: 'processing'
    };

    pending.delete(uploadId);
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('upload/complete error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete upload' });
  }
});

module.exports = router;

// Proxy upload route: browser -> server -> Spaces (avoids Spaces CORS requirements)
router.post('/upload/proxy', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'file is required' });
    const { projectId = null } = req.body || {};
    let metadata = {};
    try { if (req.body?.metadata) metadata = JSON.parse(req.body.metadata); } catch (_) {}

    const safeName = String(file.originalname || file.filename || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `files/${projectId || 'general'}/${Date.now()}_${safeName}`;

    const s3 = getS3();
    const Bucket = process.env.DO_SPACES_NAME;
    await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: file.buffer, ContentType: file.mimetype || 'application/octet-stream', ACL: 'private' }));

    // Persist document
    const fileName = key.split('/').pop();
    const mimeType = file.mimetype || 'application/octet-stream';
    const fileSize = Number(file.size || 0);
    const uploadedById = req.user?.id;

    const doc = await prisma.document.create({
      data: {
        fileName,
        originalName: fileName,
        fileUrl: `spaces://${key}`,
        mimeType,
        fileSize,
        fileType: 'OTHER',
        description: metadata.description || null,
        tags: Array.isArray(metadata.tags) ? metadata.tags : [],
        isPublic: Boolean(metadata.isPublic) || false,
        projectId,
        uploadedById,
        checksum: null,
      }
    });

    IngestionService.processFile({ documentId: doc.id, projectId, key, mimeType })
      .then(() => console.log('✅ Ingestion complete for', doc.id))
      .catch((e) => console.warn('⚠️ Ingestion failed for', doc.id, e?.message || e));

    return res.json({ success: true, data: { id: doc.id, key, projectId, fileType: 'OTHER', size: fileSize, metadata, status: 'processing' } });
  } catch (err) {
    console.error('upload/proxy error:', err);
    return res.status(500).json({ success: false, message: 'Failed to proxy upload' });
  }
});
