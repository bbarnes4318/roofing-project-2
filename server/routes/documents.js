const express = require('express');
const { prisma } = require('../config/prisma');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const {
  asyncHandler,
  sendSuccess,
  sendPaginatedResponse,
  formatValidationErrors,
  AppError
} = require('../middleware/errorHandler');
const {
  authenticateToken,
  managerAndAbove,
  projectManagerAndAbove
} = require('../middleware/auth');
const { getS3, getObjectPresignedUrl } = require('../config/spaces');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

// Use memory storage - files go directly to Spaces
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only documents, images, and archives are allowed.', 400), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Helper functions
function extractSpacesKey(fileUrl) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('spaces://')) return fileUrl.replace('spaces://', '');
  if (fileUrl.startsWith('/uploads/')) return fileUrl.replace('/uploads/', '');
  return fileUrl;
}

function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const safeName = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safeName}-${timestamp}-${random}${ext}`;
}

// Validation rules
const documentValidation = [
  body('fileName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Document name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('fileType')
    .optional()
    .isIn(['BLUEPRINT', 'PERMIT', 'INVOICE', 'PHOTO', 'CONTRACT', 'REPORT', 'SPECIFICATION', 'CORRESPONDENCE', 'OTHER'])
    .withMessage('Invalid document type'),
  body('projectId')
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Helper function to get document type from MIME type
const getDocumentTypeFromMime = (mimeType) => {
  const mimeToType = {
    'application/pdf': 'REPORT',
    'application/msword': 'CONTRACT',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'CONTRACT',
    'application/vnd.ms-excel': 'INVOICE',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'INVOICE',
    'application/vnd.ms-powerpoint': 'REPORT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'REPORT',
    'text/plain': 'CORRESPONDENCE',
    'text/csv': 'REPORT',
    'image/jpeg': 'PHOTO',
    'image/png': 'PHOTO',
    'image/gif': 'PHOTO',
    'image/webp': 'PHOTO',
    'application/zip': 'OTHER',
    'application/x-zip-compressed': 'OTHER'
  };
  
  return mimeToType[mimeType] || 'OTHER';
};

// @desc    Get all documents with filtering and pagination
// @route   GET /api/documents
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    projectId, 
    fileType, 
    uploadedBy, 
    search, 
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  let where = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (fileType) {
    where.fileType = fileType.toUpperCase();
  }

  if (uploadedBy) {
    where.uploadedById = uploadedBy;
  }

  if (search) {
    where.OR = [
      { fileName: { contains: search, mode: 'insensitive' } },
      { originalName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build sort object
  let orderBy = {};
  orderBy[sortBy] = sortOrder.toLowerCase();

  // Get documents with relations
  const documents = await prisma.document.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      downloads: {
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy,
    skip,
    take
  });

  // Get total count
  const total = await prisma.document.count({ where });

  // Calculate pagination info
  const totalPages = Math.ceil(total / take);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      documents,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
  });
}));

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      downloads: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  res.json({
    success: true,
    data: { document }
  });
}));

// @desc    Upload new document
// @route   POST /api/documents
// @access  Private
router.post('/', upload.single('file'), documentValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
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

  // Verify project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Use uploadedById from request body or fall back to authenticated user
  const finalUploaderId = uploadedById || req.user?.id;

  // Verify uploader exists if provided
  if (finalUploaderId) {
    const uploader = await prisma.user.findUnique({
      where: { id: finalUploaderId }
    });

    if (!uploader) {
      return next(new AppError('Uploader not found', 404));
    }
  }

  // Upload to Spaces
  const uniqueFilename = generateUniqueFilename(req.file.originalname);
  const key = `documents/${projectId}/${uniqueFilename}`;

  const s3 = getS3();
  const bucket = process.env.DO_SPACES_NAME;

  if (!bucket) {
    return next(new AppError('Digital Ocean Spaces not configured', 500));
  }

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype || 'application/octet-stream',
    ACL: 'private'
  }));

  // Create document record
  const document = await prisma.document.create({
    data: {
      fileName: fileName || req.file.originalname,
      originalName: req.file.originalname,
      fileUrl: `spaces://${key}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileType: fileType ? fileType.toUpperCase() : getDocumentTypeFromMime(req.file.mimetype),
      description,
      tags: tags ? JSON.parse(tags) : [],
      isPublic: isPublic === 'true',
      projectId,
      uploadedById: finalUploaderId
    },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    }
  });

  console.log(`✅ Uploaded to Spaces: ${key}`);
  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: { document }
  });
}));

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
router.put('/:id', documentValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const documentId = req.params.id;
  const {
    fileName,
    description,
    fileType,
    tags,
    isPublic
  } = req.body;

  // Check if document exists
  const existingDocument = await prisma.document.findUnique({
    where: { id: documentId }
  });

  if (!existingDocument) {
    return next(new AppError('Document not found', 404));
  }

  // Prepare update data
  const updateData = {
    fileName,
    description,
    fileType: fileType ? fileType.toUpperCase() : undefined,
    tags: tags ? JSON.parse(tags) : undefined,
    isPublic: isPublic === 'true'
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  // Update document
  const updatedDocument = await prisma.document.update({
    where: { id: documentId },
    data: updateData,
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      },
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Document updated successfully',
    data: { document: updatedDocument }
  });
}));

// @desc    Delete document from Spaces and database
// @route   DELETE /api/documents/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id }
  });

  if (!document) {
    return next(new AppError('Document not found', 404));
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

// @desc    Download document from Spaces
// @route   GET /api/documents/:id/download
// @access  Private
router.get('/:id/download', authenticateToken, asyncHandler(async (req, res, next) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id }
  });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Record download
  await prisma.documentDownload.create({
    data: {
      documentId: document.id,
      userId: req.user.id
    }
  });

  // Update download count
  await prisma.document.update({
    where: { id: document.id },
    data: {
      downloadCount: { increment: 1 },
      lastDownloadedAt: new Date()
    }
  });

  // Stream from Spaces
  const key = extractSpacesKey(document.fileUrl);
  if (!key) {
    return next(new AppError('Invalid file URL', 400));
  }

  const s3 = getS3();
  const bucket = process.env.DO_SPACES_NAME;

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);

    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', document.fileSize);

    response.Body.pipe(res);
  } catch (error) {
    console.error('Error downloading from Spaces:', error);
    return next(new AppError('File not found in storage', 404));
  }
}));

// @desc    Get documents by project
// @route   GET /api/documents/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const { fileType, uploadedBy } = req.query;

  let where = { projectId };

  if (fileType) {
    where.fileType = fileType.toUpperCase();
  }

  if (uploadedBy) {
    where.uploadedById = uploadedBy;
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { documents }
  });
}));

// @desc    Get document statistics
// @route   GET /api/documents/stats/overview
// @access  Private
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const { projectId } = req.query;

  let where = {};

  if (projectId) {
    where.projectId = projectId;
  }

  const [
    totalDocuments,
    totalSize,
    documentsByType,
    mostDownloaded,
    recentUploads
  ] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.aggregate({
      where,
      _sum: { fileSize: true }
    }),
    prisma.document.groupBy({
      by: ['fileType'],
      where,
      _count: { fileType: true }
    }),
    prisma.document.findMany({
      where,
      orderBy: { downloadCount: 'desc' },
      take: 5,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true
          }
        }
      }
    }),
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      totalDocuments,
      totalSize: totalSize._sum.fileSize || 0,
      documentsByType,
      mostDownloaded,
      recentUploads
    }
  });
}));

module.exports = router; 