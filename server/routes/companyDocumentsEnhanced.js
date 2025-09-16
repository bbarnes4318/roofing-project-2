const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Enhanced storage configuration with better organization
const uploadDir = path.join(__dirname, '..', 'uploads', 'company-assets');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Organize by year/month
    const date = new Date();
    const subDir = path.join(uploadDir, date.getFullYear().toString(), (date.getMonth() + 1).toString().padStart(2, '0'));
    await fs.mkdir(subDir, { recursive: true });
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Enhanced file type validation
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: PDF, Word, Excel, JPG, PNG, GIF'));
    }
  }
});

// Helper function to calculate file checksum
async function calculateChecksum(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Helper function to get file icon based on mime type
function getFileIcon(mime_type) {
  if (!mime_type) return 'file';
  if (mime_type.includes('pdf')) return 'file-pdf';
  if (mime_type.includes('word') || mime_type.includes('document')) return 'file-word';
  if (mime_type.includes('excel') || mime_type.includes('spreadsheet')) return 'file-excel';
  if (mime_type.includes('image')) return 'file-image';
  return 'file';
}

// Helper function to get folder color based on name
function getFolderColor(folderName) {
  const name = folderName.toLowerCase();
  if (name.includes('contract')) return 'blue';
  if (name.includes('warrant') || name.includes('certif')) return 'yellow';
  if (name.includes('inspect')) return 'green';
  if (name.includes('permit') || name.includes('complian')) return 'purple';
  if (name.includes('safety')) return 'red';
  return 'gray';
}

// =============================
// Enhanced Asset Endpoints
// =============================

// Get assets with enhanced filtering and metadata
router.get('/assets', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    search, 
    tag, 
    section, 
    parentId, 
    type,
    isPublic,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
    page = 1,
    limit = 50,
    view = 'grid' // grid or list
  } = req.query;
  
  // Build where clause
  const where = { isActive: true };
  
  // Enhanced search across multiple fields
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { folderName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } }
    ];
  }
  
  if (tag) where.tags = { has: tag };
  if (section) where.section = section;
  if (type) where.type = type;
  if (isPublic !== undefined) where.isPublic = isPublic === 'true';
  
  // Handle parent folder navigation
  if (parentId !== undefined) {
    where.parentId = parentId === 'null' ? null : parentId;
  }
  
  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = parseInt(limit);
  
  // Validate sortBy field - only allow valid CompanyAsset fields
  const validSortFields = ['title', 'createdAt', 'updatedAt', 'fileSize', 'downloadCount', 'sortOrder'];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'sortOrder';
  const safeSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
  
  // Get total count for pagination
  const totalCount = await prisma.companyAsset.count({ where });
  
  // Get assets with relations
  const assets = await prisma.companyAsset.findMany({
    where,
    orderBy: [
      { type: 'asc' }, // Folders first
      { [safeSortBy]: safeSortOrder },
      { createdAt: 'desc' }
    ],
    skip,
    take,
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      parent: true,
      children: {
        where: { isActive: true },
        select: { id: true, type: true }
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1
      }
    }
  });
  
  // Get breadcrumb path if viewing a folder
  let breadcrumbs = [];
  if (parentId && parentId !== 'null') {
    let currentFolder = await prisma.companyAsset.findUnique({
      where: { id: parentId }
    });
    
    while (currentFolder) {
      breadcrumbs.unshift({
        id: currentFolder.id,
        title: currentFolder.title,
        folder_name: currentFolder.folderName || currentFolder.title
      });
      
      if (currentFolder.parentId) {
        currentFolder = await prisma.companyAsset.findUnique({
          where: { id: currentFolder.parentId }
        });
      } else {
        currentFolder = null;
      }
    }
  }
  
  res.json({
    success: true,
    data: {
      assets,
      breadcrumbs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      view
    }
  });
}));

// Get single asset with full details
router.get('/assets/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({
    where: { id },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      parent: true,
      children: {
        where: { isActive: true },
        orderBy: [
          { type: 'asc' },
          { sortOrder: 'asc' }
        ]
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });
  
  if (!asset) throw new AppError('Asset not found', 404);
  
  // Check permissions
  if (!asset.isPublic && req.user.role !== 'ADMIN' && asset.uploadedById !== req.user.id) {
    throw new AppError('Access denied', 403);
  }
  
  res.json({ success: true, data: { asset } });
}));

// Enhanced upload with metadata and versioning
router.post('/assets/upload', 
  authenticateToken, 
  upload.array('files', 10), // Support multiple file upload
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }
    
    const { 
      parentId, 
      tags, 
      section, 
      isPublic = false,
      description,
      accessLevel = 'private'
    } = req.body;
    
    const uploadedAssets = [];
    
    for (const file of req.files) {
      // Calculate checksum
      const checksum = await calculateChecksum(file.path);
      
      // Build file URL
      const date = new Date();
      const fileUrl = `/uploads/company-assets/${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${file.filename}`;
      
      // Determine metadata
      const metadata = {
        icon: getFileIcon(file.mimetype),
        originalName: file.originalname,
        uploadedAt: new Date().toISOString()
      };
      
      // Create asset
      const asset = await prisma.companyAsset.create({
        data: {
          title: file.originalname,
          description: description || null,
          fileUrl,
          mime_type: file.mimetype,
          fileSize: file.size,
          tags: tags ? JSON.parse(tags) : [],
          section: section || null,
          type: 'FILE',
          parentId: parentId || null,
          sortOrder: 0,
          uploadedById: req.user.id,
          isPublic: isPublic === 'true',
          checksum,
          metadata,
          accessLevel,
          isActive: true,
          // Create initial version
          versions: {
            create: {
              versionNumber: 1,
              fileUrl: fileUrl,
              fileSize: file.size,
              checksum,
              change_description: 'Initial upload',
              uploadedById: req.user.id,
              isCurrent: true
            }
          }
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          versions: true
        }
      });
      
      // Update download count on parent folder
      if (parentId) {
        await prisma.companyAsset.update({
          where: { id: parentId },
          data: { updatedAt: new Date() }
        });
      }
      
      uploadedAssets.push(asset);
    }
    
    res.status(201).json({ 
      success: true, 
      data: { 
        assets: uploadedAssets,
        message: `Successfully uploaded ${uploadedAssets.length} file(s)`
      } 
    });
}));

// Create new folder with enhanced metadata
router.post('/folders', authenticateToken, [
  body('name').notEmpty().withMessage('Folder name is required'),
  body('name').matches(/^[^<>:"/\\|?*]+$/).withMessage('Invalid folder name')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }
  
  const { 
    name, 
    description, 
    section, 
    parentId, 
    isPublic = false,
    accessLevel = 'private'
  } = req.body;
  
  // Check for duplicate folder name in same parent
  const existing = await prisma.companyAsset.findFirst({
    where: {
      title: name,
      parentId: parentId || null,
      type: 'FOLDER',
      isActive: true
    }
  });
  
  if (existing) {
    throw new AppError('A folder with this name already exists in this location', 400);
  }
  
  // Build folder path
  let path = name;
  if (parentId) {
    const parent = await prisma.companyAsset.findUnique({
      where: { id: parentId }
    });
    if (parent && parent.path) {
      path = `${parent.path}/${name}`;
    }
  }
  
  const folder = await prisma.companyAsset.create({
    data: {
      title: name,
      folderName: name,
      description: description || null,
      type: 'FOLDER',
      section: section || null,
      parentId: parentId || null,
      sortOrder: 0,
      uploadedById: req.user.id,
      isPublic: isPublic === true,
      accessLevel,
      path,
      metadata: {
        icon: 'folder',
        color: getFolderColor(name),
        createdBy: `${req.user.firstName} ${req.user.lastName}`,
        createdAt: new Date().toISOString()
      },
      isActive: true
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      parent: true
    }
  });
  
  res.status(201).json({ success: true, data: { folder } });
}));

// Update asset/folder with enhanced features
router.patch('/assets/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    folderName,
    description, 
    parentId, 
    sortOrder, 
    section,
    tags,
    isPublic,
    accessLevel,
    metadata
  } = req.body;
  
  const asset = await prisma.companyAsset.findUnique({ 
    where: { id },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
  });
  
  if (!asset) throw new AppError('Asset not found', 404);
  
  // Check permissions
  if (req.user.role !== 'ADMIN' && asset.uploadedById !== req.user.id) {
    throw new AppError('Permission denied', 403);
  }
  
  const updateData = {};
  
  // Handle file replacement
  if (req.file) {
    // Calculate new checksum
    const checksum = await calculateChecksum(req.file.path);
    const date = new Date();
    const fileUrl = `/uploads/company-assets/${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${req.file.filename}`;
    
    updateData.fileUrl = fileUrl;
    updateData.mime_type = req.file.mimetype;
    updateData.fileSize = req.file.size;
    updateData.checksum = checksum;
    
    // Create new version
    const currentVersion = asset.versions[0]?.versionNumber || 0;
    await prisma.companyAssetVersion.create({
      data: {
        assetId: id,
        versionNumber: currentVersion + 1,
        fileUrl,
        fileSize: req.file.size,
        checksum,
        change_description: req.body.change_description || 'File updated',
        uploadedById: req.user.id,
        isCurrent: true
      }
    });
    
    // Mark previous versions as not current
    await prisma.companyAssetVersion.updateMany({
      where: {
        assetId: id,
        versionNumber: { lt: currentVersion + 1 }
      },
      data: { isCurrent: false }
    });
    
    // Update version number
    updateData.version = currentVersion + 1;
  }
  
  // Update other fields
  if (title !== undefined) updateData.title = title;
  if (folderName !== undefined && asset.type === 'FOLDER') updateData.folderName = folderName;
  if (description !== undefined) updateData.description = description;
  if (parentId !== undefined) updateData.parentId = parentId;
  if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
  if (section !== undefined) updateData.section = section;
  if (tags !== undefined) updateData.tags = tags;
  if (isPublic !== undefined) updateData.isPublic = isPublic;
  if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
  
  // Merge metadata
  if (metadata) {
    updateData.metadata = {
      ...(asset.metadata || {}),
      ...metadata,
      lastModified: new Date().toISOString(),
      lastModifiedBy: `${req.user.firstName} ${req.user.lastName}`
    };
  }
  
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: updateData,
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      parent: true,
      children: {
        where: { isActive: true }
      },
      versions: {
        orderBy: { versionNumber: 'desc' }
      }
    }
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

// =============================
// Version History
// =============================

// Get version history for an asset
router.get('/assets/:id/versions', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({
    where: { id },
    select: { id: true, title: true, uploadedById: true }
  });
  
  if (!asset) throw new AppError('Asset not found', 404);
  
  const versions = await prisma.companyAssetVersion.findMany({
    where: { assetId: id },
    orderBy: { versionNumber: 'desc' },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      }
    }
  });
  
  res.json({ success: true, data: { versions } });
}));

// Download specific version
router.get('/assets/:id/versions/:versionId/download', authenticateToken, asyncHandler(async (req, res) => {
  const { id, versionId } = req.params;
  
  const version = await prisma.companyAssetVersion.findUnique({
    where: { id: versionId },
    include: { asset: true }
  });
  
  if (!version || version.assetId !== id) {
    throw new AppError('Version not found', 404);
  }
  
  const filePath = path.join(__dirname, '..', version.fileUrl);
  
  if (!await fs.access(filePath).then(() => true).catch(() => false)) {
    throw new AppError('File not found on disk', 404);
  }
  
  res.setHeader('Content-Disposition', `attachment; filename="${version.asset.title}"`);
  res.setHeader('Content-Type', version.asset.mime_type || 'application/octet-stream');
  
  res.download(filePath);
}));

// Restore specific version
router.post('/assets/:id/versions/:versionId/restore', authenticateToken, asyncHandler(async (req, res) => {
  const { id, versionId } = req.params;
  
  const version = await prisma.companyAssetVersion.findUnique({
    where: { id: versionId },
    include: { asset: true }
  });
  
  if (!version || version.assetId !== id) {
    throw new AppError('Version not found', 404);
  }
  
  // Create new version that's a copy of the old one
  const newVersion = await prisma.companyAssetVersion.create({
    data: {
      assetId: id,
      versionNumber: version.asset.version + 1,
      fileUrl: version.fileUrl,
      fileSize: version.fileSize,
      checksum: version.checksum,
      change_description: `Restored from version ${version.versionNumber}`,
      uploadedById: req.user.id,
      isCurrent: true
    }
  });
  
  // Update asset with restored version data
  await prisma.companyAsset.update({
    where: { id },
    data: {
      fileUrl: version.fileUrl,
      fileSize: version.fileSize,
      checksum: version.checksum,
      version: newVersion.versionNumber
    }
  });
  
  // Mark all other versions as not current
  await prisma.companyAssetVersion.updateMany({
    where: {
      assetId: id,
      id: { not: newVersion.id }
    },
    data: { isCurrent: false }
  });
  
  res.json({ 
    success: true, 
    message: `Restored version ${version.versionNumber}`,
    data: { version: newVersion }
  });
}));

// =============================
// Enhanced Search
// =============================

// Advanced search with filters
router.post('/search', authenticateToken, asyncHandler(async (req, res) => {
  const {
    query,
    filters = {},
    sort = { field: 'relevance', order: 'desc' },
    page = 1,
    limit = 20
  } = req.body;
  
  // Build complex where clause
  const where = { isActive: true };
  
  // Text search across multiple fields
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { folderName: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { tags: { has: query } }
    ];
  }
  
  // Apply filters
  if (filters.type) where.type = filters.type;
  if (filters.section) where.section = filters.section;
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasEvery: filters.tags };
  }
  if (filters.uploadedBy) where.uploadedById = filters.uploadedBy;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }
  if (filters.sizeMin || filters.sizeMax) {
    where.fileSize = {};
    if (filters.sizeMin) where.fileSize.gte = parseInt(filters.sizeMin);
    if (filters.sizeMax) where.fileSize.lte = parseInt(filters.sizeMax);
  }
  if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
  
  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = parseInt(limit);
  
  // Get results
  const [results, totalCount] = await Promise.all([
    prisma.companyAsset.findMany({
      where,
      orderBy: sort.field === 'relevance' 
        ? [{ updatedAt: 'desc' }]
        : [{ [sort.field]: sort.order }],
      skip,
      take,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        parent: true
      }
    }),
    prisma.companyAsset.count({ where })
  ]);
  
  // Get aggregations for filters
  const aggregations = await prisma.companyAsset.groupBy({
    by: ['type', 'section'],
    where: { isActive: true },
    _count: true
  });
  
  res.json({
    success: true,
    data: {
      results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      aggregations
    }
  });
}));

// =============================
// Bulk Operations
// =============================

// Enhanced bulk operations
router.post('/bulk-operation', authenticateToken, asyncHandler(async (req, res) => {
  const { operation, assetIds, data } = req.body;
  
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw new AppError('Asset IDs required', 400);
  }
  
  let result;
  
  switch (operation) {
    case 'move':
      if (data.parentId === undefined) {
        throw new AppError('Parent ID required for move operation', 400);
      }
      
      // Validate target is a folder
      if (data.parentId !== null) {
        const parent = await prisma.companyAsset.findUnique({
          where: { id: data.parentId }
        });
        if (!parent || parent.type !== 'FOLDER') {
          throw new AppError('Invalid target folder', 400);
        }
      }
      
      result = await prisma.companyAsset.updateMany({
        where: { id: { in: assetIds } },
        data: { parentId: data.parentId }
      });
      break;
      
    case 'delete':
      // Soft delete
      result = await prisma.companyAsset.updateMany({
        where: { id: { in: assetIds } },
        data: { isActive: false }
      });
      break;
      
    case 'updateTags':
      if (!Array.isArray(data.tags)) {
        throw new AppError('Tags must be an array', 400);
      }
      
      result = await prisma.companyAsset.updateMany({
        where: { id: { in: assetIds } },
        data: { tags: data.tags }
      });
      break;
      
    case 'updateAccess':
      result = await prisma.companyAsset.updateMany({
        where: { id: { in: assetIds } },
        data: {
          isPublic: data.isPublic,
          accessLevel: data.accessLevel
        }
      });
      break;
      
    default:
      throw new AppError('Invalid operation', 400);
  }
  
  res.json({
    success: true,
    message: `${operation} completed for ${result.count} items`,
    data: { affected: result.count }
  });
}));

// =============================
// Download with tracking
// =============================

router.get('/assets/:id/download', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({ 
    where: { id },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1
      }
    }
  });
  
  if (!asset) throw new AppError('Asset not found', 404);
  if (asset.type !== 'FILE') throw new AppError('Cannot download folders', 400);
  
  // Check access
  if (!asset.isPublic && req.user.role !== 'ADMIN' && asset.uploadedById !== req.user.id) {
    throw new AppError('Access denied', 403);
  }
  
  // Use current version if available
  const fileUrl = asset.versions[0]?.fileUrl || asset.fileUrl;
  const filePath = path.join(__dirname, '..', fileUrl);
  
  if (!await fs.access(filePath).then(() => true).catch(() => false)) {
    throw new AppError('File not found on disk', 404);
  }
  
  // Update download count
  await prisma.companyAsset.update({
    where: { id },
    data: {
      downloadCount: { increment: 1 },
      lastDownloadedAt: new Date()
    }
  });
  
  // Set headers
  res.setHeader('Content-Disposition', `attachment; filename="${asset.title}"`);
  res.setHeader('Content-Type', asset.mime_type || 'application/octet-stream');
  res.setHeader('Content-Length', asset.fileSize);
  
  // Send file
  res.download(filePath, asset.title);
}));

// =============================
// Favorites
// =============================

// Toggle favorite status
router.post('/assets/:id/favorite', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({
    where: { id },
    select: { metadata: true }
  });
  
  if (!asset) throw new AppError('Asset not found', 404);
  
  // Toggle favorite in metadata
  const metadata = asset.metadata || {};
  const favorites = metadata.favorites || [];
  const userIndex = favorites.indexOf(req.user.id);
  
  if (userIndex > -1) {
    favorites.splice(userIndex, 1);
  } else {
    favorites.push(req.user.id);
  }
  
  metadata.favorites = favorites;
  
  await prisma.companyAsset.update({
    where: { id },
    data: { metadata }
  });
  
  res.json({
    success: true,
    data: { 
      is_favorite: userIndex === -1,
      favoriteCount: favorites.length
    }
  });
}));

// Get user's favorites
router.get('/favorites', authenticateToken, asyncHandler(async (req, res) => {
  const assets = await prisma.companyAsset.findMany({
    where: {
      isActive: true,
      metadata: {
        path: ['favorites'],
        array_contains: req.user.id
      }
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      parent: true
    }
  });
  
  res.json({ success: true, data: { assets } });
}));

// =============================
// Recent items
// =============================

router.get('/recent', authenticateToken, asyncHandler(async (req, res) => {
  const { limit = 10, type } = req.query;
  
  const where = {
    isActive: true,
    OR: [
      { uploadedById: req.user.id },
      { isPublic: true }
    ]
  };
  
  if (type) where.type = type;
  
  const assets = await prisma.companyAsset.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: parseInt(limit),
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      parent: true
    }
  });
  
  res.json({ success: true, data: { assets } });
}));

module.exports = router;
