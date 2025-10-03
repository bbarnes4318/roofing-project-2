const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { getS3, getObjectPresignedUrl } = require('../config/spaces');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

// ============================================================================
// DIGITAL OCEAN SPACES CONFIGURATION
// ============================================================================
// This version stores files in Digital Ocean Spaces (persistent storage)
// instead of local filesystem (ephemeral in App Platform)

// Use memory storage for multer - files will be uploaded to Spaces
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Helper function to extract Spaces key from fileUrl
function extractSpacesKey(fileUrl) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('spaces://')) return fileUrl.replace('spaces://', '');
  // Legacy local uploads path (for migration)
  if (fileUrl.startsWith('/uploads/')) return fileUrl.replace('/uploads/', '');
  return fileUrl;
}

// Helper function to generate unique filename
function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const safeName = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safeName}-${timestamp}-${random}${ext}`;
}

// =============================
// Company Assets (Customer-facing PDFs)
// =============================

router.get('/assets', authenticateToken, asyncHandler(async (req, res) => {
  const { search, tag, section, parentId, type, isPublic, accessLevel, sortBy, sortOrder } = req.query;
  const where = {};
  
  // Enhanced search across multiple fields
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { hasSome: search.split(' ').filter(s => s.length > 0) } }
    ];
  }
  
  // Filter by type (FOLDER, FILE)
  if (type) {
    where.type = type;
  }
  
  // Filter by public/private
  if (isPublic !== undefined) {
    where.isPublic = isPublic === 'true';
  }
  
  // Filter by access level
  if (accessLevel) {
    where.accessLevel = accessLevel;
  }
  
  if (tag) {
    where.tags = { has: tag };
  }
  if (section) {
    where.section = section;
  }
  if (parentId !== undefined) {
    where.parentId = parentId === 'null' ? null : parentId;
  }

  // Enhanced sorting
  const orderBy = [];
  if (sortBy === 'title') {
    orderBy.push({ title: sortOrder === 'desc' ? 'desc' : 'asc' });
  } else if (sortBy === 'size') {
    orderBy.push({ fileSize: sortOrder === 'desc' ? 'desc' : 'asc' });
  } else if (sortBy === 'modified') {
    orderBy.push({ updatedAt: sortOrder === 'desc' ? 'desc' : 'asc' });
  } else {
    orderBy.push({ createdAt: 'desc' });
  }

  const assets = await prisma.companyAsset.findMany({
    where,
    orderBy
  });
  
  res.json({ success: true, data: { assets } });
}));

// Upload company asset to Spaces
router.post('/assets/upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  
  const { title, description, tags, section, parentId, sortOrder } = req.body;
  
  // Generate unique filename
  const filename = generateUniqueFilename(req.file.originalname);
  const key = `company-assets/${filename}`;
  
  // Upload to Digital Ocean Spaces
  const s3 = getS3();
  const bucket = process.env.DO_SPACES_NAME;
  
  if (!bucket) {
    throw new AppError('Digital Ocean Spaces not configured', 500);
  }
  
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype || 'application/octet-stream',
    ACL: 'private' // Files are private, accessed via signed URLs
  }));
  
  // Create database record with spaces:// URL
  const asset = await prisma.companyAsset.create({
    data: {
      title: title || req.file.originalname,
      description: description || null,
      fileUrl: `spaces://${key}`, // Store as spaces:// URL
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      tags: tags ? JSON.parse(tags) : [],
      section: section || null,
      type: 'FILE',
      parentId: parentId || null,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      uploadedById: req.user?.id || null
    }
  });
  
  console.log(`✅ Uploaded company asset to Spaces: ${key}`);
  res.status(201).json({ success: true, data: { asset } });
}));

// Download a company asset from Spaces
router.get('/assets/:id/download', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  
  if (!asset) throw new AppError('Asset not found', 404);
  if (asset.type !== 'FILE') throw new AppError('Cannot download folders', 400);
  
  const key = extractSpacesKey(asset.fileUrl);
  if (!key) throw new AppError('Invalid file URL', 400);
  
  // Stream file from Spaces
  const s3 = getS3();
  const bucket = process.env.DO_SPACES_NAME;
  
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${asset.title || 'download'}"`);
    res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', asset.fileSize);
    
    // Stream the file to the client
    response.Body.pipe(res);
  } catch (error) {
    console.error('Error downloading from Spaces:', error);
    throw new AppError('File not found in storage', 404);
  }
}));

// Get presigned URL for direct access (optional - for frontend to download directly)
router.get('/assets/:id/url', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const expiresIn = parseInt(req.query.expiresIn) || 3600; // Default 1 hour
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  
  if (!asset) throw new AppError('Asset not found', 404);
  if (asset.type !== 'FILE') throw new AppError('Cannot get URL for folders', 400);
  
  const key = extractSpacesKey(asset.fileUrl);
  if (!key) throw new AppError('Invalid file URL', 400);
  
  // Generate presigned URL
  const signedUrl = await getObjectPresignedUrl(key, expiresIn);
  
  res.json({
    success: true,
    data: {
      url: signedUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    }
  });
}));

// Delete a company asset from Spaces
router.delete('/assets/:id', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  
  if (!asset) throw new AppError('Asset not found', 404);
  
  // Delete from Spaces if it's a file
  if (asset.type === 'FILE') {
    const key = extractSpacesKey(asset.fileUrl);
    if (key) {
      try {
        const s3 = getS3();
        const bucket = process.env.DO_SPACES_NAME;
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        console.log(`✅ Deleted from Spaces: ${key}`);
      } catch (error) {
        console.error('Error deleting from Spaces:', error);
        // Continue with database deletion even if Spaces deletion fails
      }
    }
  }
  
  // Delete from database
  await prisma.companyAsset.delete({ where: { id } });
  
  res.json({ success: true, message: 'Asset deleted successfully' });
}));

// Update asset metadata (not the file itself)
router.patch('/assets/:id', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { title, description, tags, section, sortOrder, isPublic, accessLevel } = req.body;
  
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (tags !== undefined) updateData.tags = tags;
  if (section !== undefined) updateData.section = section;
  if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
  if (isPublic !== undefined) updateData.isPublic = isPublic;
  if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
  
  const asset = await prisma.companyAsset.update({
    where: { id },
    data: updateData
  });
  
  res.json({ success: true, data: { asset } });
}));

// Create folder
router.post('/folders', authenticateToken, asyncHandler(async (req, res) => {
  const { title, description, parentId, section } = req.body;
  
  if (!title) throw new AppError('Folder title is required', 400);
  
  const folder = await prisma.companyAsset.create({
    data: {
      title,
      description: description || null,
      type: 'FOLDER',
      parentId: parentId || null,
      section: section || null,
      uploadedById: req.user?.id || null
    }
  });
  
  res.status(201).json({ success: true, data: { folder } });
}));

// Bulk operations
router.delete('/assets/bulk', authenticateToken, asyncHandler(async (req, res) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError('Asset IDs are required', 400);
  }
  
  // Get all assets to delete
  const assets = await prisma.companyAsset.findMany({
    where: { id: { in: ids } }
  });
  
  // Delete files from Spaces
  const s3 = getS3();
  const bucket = process.env.DO_SPACES_NAME;
  
  for (const asset of assets) {
    if (asset.type === 'FILE') {
      const key = extractSpacesKey(asset.fileUrl);
      if (key) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        } catch (error) {
          console.error(`Error deleting ${key} from Spaces:`, error);
        }
      }
    }
  }
  
  // Delete from database
  await prisma.companyAsset.deleteMany({
    where: { id: { in: ids } }
  });
  
  res.json({ success: true, message: `Deleted ${ids.length} assets` });
}));

module.exports = router;

