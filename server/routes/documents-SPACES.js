const express = require('express');
const { prisma } = require('../config/prisma');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
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

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/json'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only documents, spreadsheets, presentations, images, and text files are allowed.'), false);
  }
};

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

// Validation middleware
const documentValidation = [
  body('projectId').optional().isString(),
  body('fileName').optional().isString(),
  body('description').optional().isString(),
  body('fileType').optional().isIn(['CONTRACT', 'INVOICE', 'PERMIT', 'PHOTO', 'REPORT', 'OTHER']),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean()
];

// @desc    Get all documents (optionally filtered by project)
// @route   GET /api/documents
// @access  Private
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { projectId, fileType, isPublic, search } = req.query;
  
  const where = {};
  
  if (projectId) {
    where.projectId = projectId;
  }
  
  if (fileType) {
    where.fileType = fileType;
  }
  
  if (isPublic !== undefined) {
    where.isPublic = isPublic === 'true';
  }
  
  if (search) {
    where.OR = [
      { fileName: { contains: search, mode: 'insensitive' } },
      { originalName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  const documents = await prisma.document.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          projectName: true
        }
      },
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  res.json({
    success: true,
    data: { documents }
  });
}));

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: {
      project: true,
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
  
  if (!document) {
    throw new AppError('Document not found', 404);
  }
  
  res.json({
    success: true,
    data: { document }
  });
}));

// @desc    Upload new document to Spaces
// @route   POST /api/documents
// @access  Private
router.post('/', authenticateToken, upload.single('file'), documentValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }
  
  const {
    fileName,
    description,
    fileType,
    projectId,
    tags,
    isPublic,
    uploadedById
  } = req.body;
  
  // Verify project exists if projectId provided
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      throw new AppError('Project not found', 404);
    }
  }
  
  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(req.file.originalname);
  const key = `documents/${projectId || 'general'}/${uniqueFilename}`;
  
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
    ACL: 'private'
  }));
  
  // Create database record
  const document = await prisma.document.create({
    data: {
      fileName: fileName || req.file.originalname,
      originalName: req.file.originalname,
      fileUrl: `spaces://${key}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileType: fileType || 'OTHER',
      description: description || null,
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      isPublic: isPublic === 'true' || isPublic === true,
      projectId: projectId || null,
      uploadedById: uploadedById || req.user?.id || null
    },
    include: {
      project: true,
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
  
  console.log(`✅ Uploaded document to Spaces: ${key}`);
  
  res.status(201).json({
    success: true,
    data: { document }
  });
}));

// @desc    Download document from Spaces
// @route   GET /api/documents/:id/download
// @access  Private
router.get('/:id/download', authenticateToken, asyncHandler(async (req, res) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id }
  });
  
  if (!document) {
    throw new AppError('Document not found', 404);
  }
  
  const key = extractSpacesKey(document.fileUrl);
  if (!key) {
    throw new AppError('Invalid file URL', 400);
  }
  
  // Stream file from Spaces
  const s3 = getS3();
  const bucket = process.env.DO_SPACES_NAME;
  
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName || document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', document.fileSize);
    
    // Stream the file to the client
    response.Body.pipe(res);
  } catch (error) {
    console.error('Error downloading from Spaces:', error);
    throw new AppError('File not found in storage', 404);
  }
}));

// @desc    Get presigned URL for direct access
// @route   GET /api/documents/:id/url
// @access  Private
router.get('/:id/url', authenticateToken, asyncHandler(async (req, res) => {
  const expiresIn = parseInt(req.query.expiresIn) || 3600; // Default 1 hour
  
  const document = await prisma.document.findUnique({
    where: { id: req.params.id }
  });
  
  if (!document) {
    throw new AppError('Document not found', 404);
  }
  
  const key = extractSpacesKey(document.fileUrl);
  if (!key) {
    throw new AppError('Invalid file URL', 400);
  }
  
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

// @desc    Update document metadata
// @route   PATCH /api/documents/:id
// @access  Private
router.patch('/:id', authenticateToken, documentValidation, asyncHandler(async (req, res) => {
  const { fileName, description, fileType, tags, isPublic } = req.body;
  
  const updateData = {};
  if (fileName !== undefined) updateData.fileName = fileName;
  if (description !== undefined) updateData.description = description;
  if (fileType !== undefined) updateData.fileType = fileType;
  if (tags !== undefined) updateData.tags = tags;
  if (isPublic !== undefined) updateData.isPublic = isPublic;
  
  const document = await prisma.document.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      project: true,
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
  
  res.json({
    success: true,
    data: { document }
  });
}));

// @desc    Delete document from Spaces and database
// @route   DELETE /api/documents/:id
// @access  Private
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id }
  });
  
  if (!document) {
    throw new AppError('Document not found', 404);
  }
  
  // Delete from Spaces
  const key = extractSpacesKey(document.fileUrl);
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
  
  // Delete from database
  await prisma.document.delete({
    where: { id: req.params.id }
  });
  
  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
}));

module.exports = router;

