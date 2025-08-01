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
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Document name must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('category')
    .optional()
    .isIn(['contract', 'permit', 'blueprint', 'photo', 'invoice', 'report', 'specification', 'correspondence', 'other'])
    .withMessage('Invalid document category'),
  body('projectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Project ID must be a positive integer'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
];

// @desc    Get all documents with filtering and pagination
// @route   GET /api/documents
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    category, 
    projectId, 
    uploadedBy,
    search, 
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isPrivate
  } = req.query;

  // Build filter object
  let filter = {};
  
  // Only show public documents or documents uploaded by current user (unless admin/manager)
  if (!['admin', 'manager'].includes(req.user.role)) {
    filter.$or = [
      { isPrivate: false },
      { uploadedBy: req.user._id }
    ];
  }
  
  if (category) filter.category = category;
  if (projectId) filter.projectId = parseInt(projectId);
  if (uploadedBy) filter.uploadedBy = uploadedBy;
  if (isPrivate !== undefined) filter.isPrivate = isPrivate === 'true';
  
  // Add search functionality
  if (search) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { originalName: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { projectName: new RegExp(search, 'i') }
      ]
    });
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Document.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, documents, pageNum, limitNum, total, 'Documents retrieved successfully');
}));

// @desc    Get document by ID
// @route   GET /api/documents/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const document = await Document.findOne({ id: parseInt(req.params.id) });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Check access permissions
  const hasAccess = !document.isPrivate || 
                   document.uploadedBy.toString() === req.user._id.toString() ||
                   ['admin', 'manager'].includes(req.user.role);

  if (!hasAccess) {
    return next(new AppError('Access denied', 403));
  }

  sendSuccess(res, 200, { document }, 'Document retrieved successfully');
}));

// @desc    Upload new document
// @route   POST /api/documents
// @access  Private
router.post('/', upload.single('file'), documentValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
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

  // Get the highest ID and increment
  const lastDocument = await Document.findOne().sort({ id: -1 });
  const newId = lastDocument ? lastDocument.id + 1 : 1;

  // Get project name if projectId provided
  let projectName = '';
  if (req.body.projectId) {
    const project = await Project.findOne({ id: parseInt(req.body.projectId) });
    if (project) {
      projectName = project.name;
    }
  }

  // Create document record
  const documentData = {
    id: newId,
    name: req.body.name || req.file.originalname,
    description: req.body.description || '',
    category: req.body.category || 'other',
    projectId: req.body.projectId ? parseInt(req.body.projectId) : null,
    projectName,
    originalName: req.file.originalname,
    fileName: req.file.filename,
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    isPrivate: req.body.isPrivate === 'true',
    uploadedBy: req.user._id,
    uploadedByName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const document = await Document.create(documentData);

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('document_uploaded', {
    document,
    uploadedBy: req.user._id,
    timestamp: new Date()
  });

  // If project document, emit to project room
  if (document.projectId) {
    io.to(`project_${document.projectId}`).emit('project_document_uploaded', {
      document,
      timestamp: new Date()
    });
  }

  sendSuccess(res, 201, { document }, 'Document uploaded successfully');
}));

// @desc    Update document metadata
// @route   PUT /api/documents/:id
// @access  Private (Only uploader or manager)
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('category').optional().isIn(['contract', 'permit', 'blueprint', 'photo', 'invoice', 'report', 'specification', 'correspondence', 'other']),
  body('tags').optional().isArray(),
  body('isPrivate').optional().isBoolean()
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const documentId = parseInt(req.params.id);
  const document = await Document.findOne({ id: documentId });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Check permissions
  const canEdit = document.uploadedBy.toString() === req.user._id.toString() ||
                 ['admin', 'manager'].includes(req.user.role);

  if (!canEdit) {
    return next(new AppError('Access denied', 403));
  }

  // Update document
  const updatedDocument = await Document.findOneAndUpdate(
    { id: documentId },
    { ...req.body, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('document_updated', {
    document: updatedDocument,
    updatedBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, { document: updatedDocument }, 'Document updated successfully');
}));

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (Only uploader or manager)
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const documentId = parseInt(req.params.id);
  const document = await Document.findOne({ id: documentId });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Check permissions
  const canDelete = document.uploadedBy.toString() === req.user._id.toString() ||
                   ['admin', 'manager'].includes(req.user.role);

  if (!canDelete) {
    return next(new AppError('Access denied', 403));
  }

  // Delete file from filesystem
  try {
    await fs.unlink(document.filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Continue with database deletion even if file deletion fails
  }

  // Delete document record
  await Document.findOneAndDelete({ id: documentId });

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('document_deleted', {
    documentId,
    deletedBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, null, 'Document deleted successfully');
}));

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
router.get('/:id/download', asyncHandler(async (req, res, next) => {
  const document = await Document.findOne({ id: parseInt(req.params.id) });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Check access permissions
  const hasAccess = !document.isPrivate || 
                   document.uploadedBy.toString() === req.user._id.toString() ||
                   ['admin', 'manager'].includes(req.user.role);

  if (!hasAccess) {
    return next(new AppError('Access denied', 403));
  }

  // Check if file exists
  try {
    await fs.access(document.filePath);
  } catch (error) {
    return next(new AppError('File not found on server', 404));
  }

  // Update download count
  await Document.findOneAndUpdate(
    { id: document.id },
    { 
      $inc: { downloadCount: 1 },
      lastDownloadedAt: new Date(),
      lastDownloadedBy: req.user._id
    }
  );

  // Set headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
  res.setHeader('Content-Type', document.mimeType);

  // Send file
  res.sendFile(path.resolve(document.filePath));
}));

// @desc    Get documents by project
// @route   GET /api/documents/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const { category, limit = 50 } = req.query;

  // Build filter object
  let filter = { projectId };
  
  // Only show public documents or documents uploaded by current user (unless admin/manager)
  if (!['admin', 'manager'].includes(req.user.role)) {
    filter.$or = [
      { isPrivate: false },
      { uploadedBy: req.user._id }
    ];
  }
  
  if (category) filter.category = category;

  const documents = await Document.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  sendSuccess(res, 200, { documents, count: documents.length }, 'Project documents retrieved successfully');
}));

// @desc    Get documents by category
// @route   GET /api/documents/category/:category
// @access  Private
router.get('/category/:category', asyncHandler(async (req, res) => {
  const category = req.params.category;
  const { projectId, limit = 50 } = req.query;

  // Build filter object
  let filter = { category };
  
  // Only show public documents or documents uploaded by current user (unless admin/manager)
  if (!['admin', 'manager'].includes(req.user.role)) {
    filter.$or = [
      { isPrivate: false },
      { uploadedBy: req.user._id }
    ];
  }
  
  if (projectId) filter.projectId = parseInt(projectId);

  const documents = await Document.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  sendSuccess(res, 200, { documents, count: documents.length }, 'Category documents retrieved successfully');
}));

// @desc    Get document statistics
// @route   GET /api/documents/stats/overview
// @access  Private (Manager and above)
router.get('/stats/overview', managerAndAbove, asyncHandler(async (req, res) => {
  const stats = await Document.aggregate([
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        averageSize: { $avg: '$fileSize' },
        totalDownloads: { $sum: '$downloadCount' }
      }
    }
  ]);

  const categoryStats = await Document.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' }
      }
    }
  ]);

  const mimeTypeStats = await Document.aggregate([
    {
      $group: {
        _id: '$mimeType',
        count: { $sum: 1 }
      }
    }
  ]);

  const uploaderStats = await Document.aggregate([
    {
      $group: {
        _id: '$uploadedBy',
        count: { $sum: 1 },
        uploaderName: { $first: '$uploadedByName' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ]);

  const overview = stats[0] || {
    totalDocuments: 0,
    totalSize: 0,
    averageSize: 0,
    totalDownloads: 0
  };

  sendSuccess(res, 200, {
    overview,
    byCategory: categoryStats,
    byMimeType: mimeTypeStats,
    topUploaders: uploaderStats
  }, 'Document statistics retrieved successfully');
}));

// @desc    Search documents
// @route   GET /api/documents/search/query
// @access  Private
router.get('/search/query', asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  const searchRegex = new RegExp(q.trim(), 'i');
  
  // Build filter for access control
  let filter = {
    $or: [
      { name: searchRegex },
      { description: searchRegex },
      { originalName: searchRegex },
      { tags: { $in: [searchRegex] } },
      { projectName: searchRegex }
    ]
  };

  // Only show public documents or documents uploaded by current user (unless admin/manager)
  if (!['admin', 'manager'].includes(req.user.role)) {
    filter.$and = [
      filter,
      {
        $or: [
          { isPrivate: false },
          { uploadedBy: req.user._id }
        ]
      }
    ];
  }

  const documents = await Document.find(filter)
    .limit(parseInt(limit))
    .select('id name category projectName uploadedByName createdAt fileSize')
    .lean();

  sendSuccess(res, 200, { documents, count: documents.length }, 'Search results retrieved successfully');
}));

module.exports = router; 