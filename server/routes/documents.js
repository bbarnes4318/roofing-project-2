const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { 
  managerAndAbove, 
  projectManagerAndAbove 
} = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
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
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

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

  // Verify uploader exists
  const uploader = await prisma.user.findUnique({
    where: { id: uploadedById }
  });

  if (!uploader) {
    return next(new AppError('Uploader not found', 404));
  }

  // Create document record
  const document = await prisma.document.create({
    data: {
      fileName: fileName || req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileType: fileType ? fileType.toUpperCase() : getDocumentTypeFromMime(req.file.mimetype),
      description,
      tags: tags ? JSON.parse(tags) : [],
      isPublic: isPublic === 'true',
      projectId,
      uploadedById
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

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id }
  });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Delete file from filesystem
  try {
    const filePath = path.join(__dirname, '..', document.fileUrl);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Continue with database deletion even if file deletion fails
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

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
router.get('/:id/download', asyncHandler(async (req, res, next) => {
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

  // Send file
  const filePath = path.join(__dirname, '..', document.fileUrl);
  res.download(filePath, document.originalName);
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