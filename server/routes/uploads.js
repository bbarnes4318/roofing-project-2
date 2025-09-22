const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { createPresignedPutUrl } = require('../config/spaces');
const { PrismaClient } = require('@prisma/client');
const IngestionService = require('../services/IngestionService');

const router = express.Router();
const prisma = new PrismaClient();

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

    return res.json({ success: true, data: { uploadId, uploadUrl, expiresAt } });
  } catch (err) {
    console.error('upload/initiate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initiate upload' });
  }
});

// POST /api/upload/complete
router.post('/upload/complete', authenticateToken, async (req, res) => {
  try {
    const { uploadId, jobId, fileUrl, checksum, metadata = {} } = req.body || {};
    const entry = pending.get(uploadId);
    if (!entry) {
      return res.status(400).json({ success: false, message: 'Invalid uploadId' });
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
