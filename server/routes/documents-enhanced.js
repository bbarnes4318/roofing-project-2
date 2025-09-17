const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { body, validationResult, query } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    file_size: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, images, and text files are allowed.'), false);
    }
  }
});

// Validation middleware
const validateDocument = [
  body('title').optional().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('category').optional().isIn(['CONTRACTS', 'WARRANTIES', 'PERMITS', 'INSPECTIONS', 'ESTIMATES', 'INVOICES', 'PHOTOS', 'REPORTS', 'FORMS', 'CHECKLISTS', 'MANUALS', 'TRAINING', 'COMPLIANCE', 'LEGAL', 'MARKETING', 'OTHER']),
  body('access_level').optional().isIn(['PUBLIC', 'AUTHENTICATED', 'PRIVATE', 'INTERNAL', 'ADMIN']),
  body('fileType').optional().isIn(['BLUEPRINT', 'PERMIT', 'INVOICE', 'PHOTO', 'CONTRACT', 'REPORT', 'SPECIFICATION', 'CORRESPONDENCE', 'WARRANTY', 'CHECKLIST', 'FORM', 'MANUAL', 'GUIDE', 'TEMPLATE', 'CERTIFICATE', 'OTHER']),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('is_public').optional().isBoolean(),
  body('isTemplate').optional().isBoolean(),
  body('requiresSignature').optional().isBoolean(),
  body('expiryDate').optional().isISO8601().withMessage('Expiry date must be a valid ISO 8601 date'),
  body('signatureRequiredBy').optional().isISO8601().withMessage('Signature required by must be a valid ISO 8601 date')
];

// GET /api/documents - Get documents with filtering, search, and pagination
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    category,
    fileType,
    access_level,
    is_public,
    isTemplate,
    projectId,
    tags,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    region,
    state
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build where clause using existing fields only
  const where = {
    isActive: true
  };

  // Apply filters using existing fields only
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { originalName: { contains: search, mode: 'insensitive' } },
      { tags: { hasSome: [search] } }
    ];
  }

  if (fileType) where.fileType = fileType;
  if (is_public !== undefined) where.isPublic = is_public === 'true';
  if (projectId) where.projectId = projectId;
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    where.tags = { hasSome: tagArray };
  }

  // Apply access control based on user role using existing isPublic field
  const user = req.user;
  if (user.role === 'CUSTOMER') {
    where.isPublic = true;
  }
  // For other roles, show all documents

  // Validate sortBy field - only allow valid Document fields
  const validSortFields = ['createdAt', 'updatedAt', 'fileName', 'originalName', 'fileSize', 'downloadCount', 'lastDownloadedAt'];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const safeSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

  // Get documents with pagination
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take,
      orderBy: { [safeSortBy]: safeSortOrder },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        project: {
          select: { id: true, projectName: true, projectNumber: true }
        },
        downloads: {
          select: { id: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            downloads: true
          }
        }
      }
    }),
    prisma.document.count({ where })
  ]);

  // Format response using existing fields
  const formattedDocuments = documents.map(doc => ({
    ...doc,
    is_favorite: false, // Will be false for now
    download_count: doc._count.downloads,
    commentCount: 0, // Will be 0 for now
    favoriteCount: 0, // Will be 0 for now
    file_sizeFormatted: formatFileSize(doc.fileSize),
    uploadedBy: doc.uploadedBy ? {
      id: doc.uploadedBy.id,
      name: `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`,
      email: doc.uploadedBy.email
    } : null,
    project: doc.project ? {
      id: doc.project.id,
      name: doc.project.name,
      projectNumber: doc.project.projectNumber
    } : null,
    recentDownloads: doc.downloads.map(d => ({
      id: d.id,
      downloadedAt: d.createdAt,
      downloadedBy: `${d.user.firstName} ${d.user.lastName}`
    }))
  }));

  res.json({
    success: true,
    data: {
      documents: formattedDocuments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// GET /api/documents/:id - Get single document with details
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
      },
      project: {
        select: { 
          id: true, 
          projectName: true, 
          projectNumber: true,
          customer: { select: { primaryName: true, secondaryName: true } }
        }
      },
      _count: {
        select: {
          downloads: true
        }
      }
    }
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check access permissions
  if (!hasDocumentAccess(document, user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Format response
  const formattedDocument = {
    ...document,
    file_sizeFormatted: formatFileSize(document.fileSize),
    uploadedBy: document.uploadedBy ? {
      id: document.uploadedBy.id,
      name: `${document.uploadedBy.firstName} ${document.uploadedBy.lastName}`,
      email: document.uploadedBy.email,
      avatar: document.uploadedBy.avatar
    } : null,
    project: document.project ? {
      id: document.project.id,
      name: document.project.name,
      projectNumber: document.project.projectNumber,
      customer: document.project.customer ? {
        name: `${document.project.customer.firstName} ${document.project.customer.lastName}`,
        company: document.project.customer.company
      } : null
    } : null,
    versions: [], // TODO: documentVersions relationship doesn't exist
    stats: {
      download_count: document._count.downloads
    }
  };

  res.json({
    success: true,
    data: formattedDocument
  });
}));

// POST /api/documents - Upload new document
router.post('/', authenticateToken, upload.single('file'), validateDocument, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const {
    description,
    fileType = 'OTHER',
    tags = [],
    isPublic = false,
    projectId
  } = req.body;

  // Generate file URL
  const fileUrl = `/uploads/documents/${req.file.filename}`;
  
  // Generate thumbnail for images
  let thumbnailUrl = null;
  if (req.file.mimetype.startsWith('image/')) {
    thumbnailUrl = fileUrl; // For now, use the same URL
  }

  // Create document using existing fields only
  const document = await prisma.document.create({
    data: {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileType,
      description,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()),
      isPublic: isPublic === 'true' || isPublic === true,
      projectId: projectId || null,
      uploadedById: req.user.id
    },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      ...(projectId && {
        project: {
          select: { id: true, projectName: true, projectNumber: true }
        }
      })
    }
  });

  res.status(201).json({
    success: true,
    data: document,
    message: 'Document uploaded successfully'
  });
}));

// PUT /api/documents/:id - Update document
router.put('/:id', authenticateToken, validateDocument, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const document = await prisma.document.findUnique({
    where: { id },
    include: { uploadedBy: true }
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check permissions
  if (document.uploaded_by_id !== user.id && !['ADMIN', 'MANAGER'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const updateData = { ...req.body };
  
  // Convert string arrays to actual arrays
  if (updateData.tags && typeof updateData.tags === 'string') {
    updateData.tags = updateData.tags.split(',').map(t => t.trim());
  }
  if (updateData.keywords && typeof updateData.keywords === 'string') {
    updateData.keywords = updateData.keywords.split(',').map(k => k.trim());
  }

  // Convert date strings to Date objects
  if (updateData.expiryDate) {
    updateData.expiryDate = new Date(updateData.expiryDate);
  }
  if (updateData.signatureRequiredBy) {
    updateData.signatureRequiredBy = new Date(updateData.signatureRequiredBy);
  }

  const updatedDocument = await prisma.document.update({
    where: { id },
    data: updateData,
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      project: {
        select: { id: true, projectName: true, projectNumber: true }
      }
    }
  });

  res.json({
    success: true,
    data: updatedDocument,
    message: 'Document updated successfully'
  });
}));

// DELETE /api/documents/:id - Delete document (soft delete)
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const document = await prisma.document.findUnique({
    where: { id },
    include: { uploadedBy: true }
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check permissions
  if (document.uploaded_by_id !== user.id && !['ADMIN', 'MANAGER'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Soft delete by archiving
  await prisma.document.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
}));

// POST /api/documents/:id/download - Track document download
router.post('/:id/download', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const document = await prisma.document.findUnique({
    where: { id }
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check access permissions
  if (!hasDocumentAccess(document, user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Record download
  await prisma.documentDownload.create({
    data: {
      documentId: id,
      userId: user.id
    }
  });

  // Update download count
  await prisma.document.update({
    where: { id },
    data: {
      downloadCount: { increment: 1 },
      lastDownloadedAt: new Date()
    }
  });

  res.json({
    success: true,
    data: { downloadUrl: document.fileUrl },
    message: 'Download recorded'
  });
}));

// POST /api/documents/:id/favorite - Toggle document favorite
router.post('/:id/favorite', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const existingFavorite = await prisma.documentFavorite.findUnique({
    where: {
      documentId_userId: {
        documentId: id,
        userId: user.id
      }
    }
  });

  if (existingFavorite) {
    await prisma.documentFavorite.delete({
      where: { id: existingFavorite.id }
    });
    res.json({
      success: true,
      data: { is_favorite: false },
      message: 'Document removed from favorites'
    });
  } else {
    await prisma.documentFavorite.create({
      data: {
        documentId: id,
        userId: user.id
      }
    });
    res.json({
      success: true,
      data: { is_favorite: true },
      message: 'Document added to favorites'
    });
  }
}));

// GET /api/documents/categories - Get document categories with counts
router.get('/categories', authenticateToken, asyncHandler(async (req, res) => {
  const categories = await prisma.document.groupBy({
    by: ['fileType'],
    where: {
      isActive: true
    },
    _count: {
      id: true
    },
    orderBy: {
      fileType: 'asc'
    }
  });

  const formattedCategories = categories.map(cat => ({
    category: cat.fileType,
    count: cat._count.id
  }));

  res.json({
    success: true,
    data: formattedCategories
  });
}));

// Helper functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getUserProjectIds(userId) {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { projectManagerId: userId },
        { teamMembers: { some: { userId } } },
        { createdById: userId }
      ]
    },
    select: { id: true }
  });
  return projects.map(p => p.id);
}

function hasDocumentAccess(document, user) {
  // Public documents
  if (document.access_level === 'PUBLIC') return true;
  
  // Authenticated users
  if (document.access_level === 'AUTHENTICATED' && user) return true;
  
  // Private documents - check if user has access to the project
  if (document.access_level === 'PRIVATE' && document.projectId) {
    // This would need to be enhanced with actual project access check
    return true; // Simplified for now
  }
  
  // Internal documents
  if (document.access_level === 'INTERNAL' && ['ADMIN', 'MANAGER', 'WORKER'].includes(user.role)) return true;
  
  // Admin documents
  if (document.access_level === 'ADMIN' && user.role === 'ADMIN') return true;
  
  return false;
}

module.exports = router;
