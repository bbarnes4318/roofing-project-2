const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const IngestionService = require('../services/IngestionService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { getS3, getObjectPresignedUrl } = require('../config/spaces');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

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
  const base = path.basename(originalName, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${base}-${timestamp}-${random}${ext}`;
}

const upload = multer({
  storage: multer.memoryStorage(),
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
      'image/gif',
      'text/plain',
      'text/csv',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: PDF, Word, Excel, JPG, PNG, GIF, Plain Text, CSV'));
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

// Helper: collect all descendant asset IDs (breadth-first) for cascading operations
async function collectDescendantIds(rootIds) {
  const toVisit = Array.from(new Set(rootIds.map(String)));
  const all = new Set(toVisit);
  while (toVisit.length) {
    const chunk = toVisit.splice(0, 50);
    const children = await prisma.companyAsset.findMany({
      where: { isActive: true, parentId: { in: chunk } },
      select: { id: true }
    });
    for (const c of children) {
      const id = String(c.id);
      if (!all.has(id)) {
        all.add(id);
        toVisit.push(id);
      }
    }
  }
  return Array.from(all);
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
        folderName: currentFolder.folderName || currentFolder.title
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
  
  // Check permissions (prefer accessLevel; treat 'public' as open)
  const isPublicAccess = String(asset.accessLevel || '').toLowerCase() === 'public';
  if (!isPublicAccess && req.user.role !== 'ADMIN' && asset.uploadedById !== req.user.id) {
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
      // Upload to Spaces
      const filename = generateUniqueFilename(file.originalname);
      const key = `company-assets/${filename}`;

      const s3 = getS3();
      const bucket = process.env.DO_SPACES_NAME;

      if (!bucket) {
        throw new AppError('Digital Ocean Spaces not configured', 500);
      }

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        ACL: 'private'
      }));

      // Calculate checksum from buffer
      const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Determine metadata
      const metadata = {
        icon: getFileIcon(file.mimetype),
        originalName: file.originalname,
        uploadedAt: new Date().toISOString()
      };

      // Create asset (without nested version to avoid schema mismatch)
      const asset = await prisma.companyAsset.create({
        data: {
          title: file.originalname,
          description: description || null,
          fileUrl: `spaces://${key}`,
          mimeType: file.mimetype,
          fileSize: file.size,
          tags: tags ? JSON.parse(tags) : [],
          section: section || null,
          type: 'FILE',
          parentId: parentId || null,
          sortOrder: 0,
          uploadedById: req.user.id,
          checksum,
          metadata,
          accessLevel,
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
          }
        }
      });

      console.log(`✅ Uploaded to Spaces: ${key}`);

      // Create initial version record
      await prisma.companyAssetVersion.create({
        data: {
          assetId: asset.id,
          versionNumber: 1,
          fileUrl: fileUrl,
          fileSize: file.size,
          checksum,
          changeDescription: 'Initial upload',
          uploadedById: req.user.id,
          isCurrent: true
        }
      });

      // Fire-and-forget local ingestion for RAG
      try {
        const safePath = (fileUrl || '').replace(/^\\|^\//, '');
        const absolutePath = path.join(__dirname, '..', safePath);
        IngestionService.processLocalPath({
          documentId: null,
          projectId: null,
          filePath: absolutePath,
          mimeType: file.mimetype
        }).then(() => {
          console.log('✅ Local ingestion complete for asset', asset.id);
        }).catch(e => {
          console.warn('⚠️ Local ingestion failed for asset', asset.id, e?.message || e);
        });
      } catch (e) {
        console.warn('⚠️ Failed to kick off local ingestion for asset:', e?.message || e);
      }
      
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
    accessLevel = 'private',
    metadata: customMetadata = null
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

  // Merge custom metadata with default metadata
  const defaultMetadata = {
    icon: 'folder',
    color: getFolderColor(name),
    createdBy: `${req.user.firstName} ${req.user.lastName}`,
    createdAt: new Date().toISOString()
  };

  const finalMetadata = customMetadata
    ? { ...defaultMetadata, ...customMetadata }
    : defaultMetadata;

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
      accessLevel,
      path,
      metadata: finalMetadata,
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
    // Upload to Spaces
    const filename = generateUniqueFilename(req.file.originalname);
    const key = `company-assets/${filename}`;

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

    // Calculate checksum from buffer
    const checksum = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const fileUrl = `spaces://${key}`;

    updateData.fileUrl = fileUrl;
    updateData.mimeType = req.file.mimetype;
    updateData.fileSize = req.file.size;
    updateData.checksum = checksum;

    // Create new version
    const currentVersion = asset.versions[0]?.versionNumber || 0;
    await prisma.companyAssetVersion.create({
      data: {
        assetId: id,
        versionNumber: currentVersion + 1,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        checksum,
        changeDescription: (req.body && (req.body.changeDescription || req.body.change_description)) || 'File updated',
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

    console.log(`✅ Uploaded to Spaces: ${key}`);
    
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

// ... (rest of the code remains the same)

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
      // Soft delete (cascade): target assets and all descendants
      {
        const allIds = await collectDescendantIds(assetIds.map(String));
        result = await prisma.companyAsset.updateMany({
          where: { id: { in: allIds } },
          data: { isActive: false }
        });
      }
      break;
    
    case 'purge':
      // Hard delete: remove files from Spaces, delete embeddings, then delete DB rows (cascade removes versions)
      {
        const allIds = await collectDescendantIds(assetIds.map(String));
        const assets = await prisma.companyAsset.findMany({
          where: { id: { in: allIds } },
          select: {
            id: true,
            fileUrl: true,
            versions: { select: { file_url: true } }
          }
        });

        const s3 = getS3();
        const bucket = process.env.DO_SPACES_NAME;
        const spacesKeys = [];

        for (const a of assets) {
          const urls = [];
          if (a.fileUrl) urls.push(a.fileUrl);
          if (Array.isArray(a.versions)) {
            for (const v of a.versions) if (v.file_url) urls.push(v.file_url);
          }
          for (const u of urls) {
            const key = extractSpacesKey(u);
            if (key) {
              spacesKeys.push(key);
              try {
                await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
                console.log(`✅ Deleted from Spaces: ${key}`);
              } catch (error) {
                console.warn('⚠️ Failed to delete from Spaces:', key, error?.message || error);
              }
            }
          }
        }

        // Remove embeddings for these files
        for (const key of spacesKeys) {
          try {
            await prisma.$executeRawUnsafe('DELETE FROM embeddings WHERE file_id LIKE $1', `%${key}%`);
          } catch (e) {
            console.warn('⚠️ Failed to purge embeddings for', key, e?.message || e);
          }
        }

        // Finally, delete asset rows (versions will cascade)
        result = await prisma.companyAsset.deleteMany({ where: { id: { in: allIds } } });
      }
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

  // Try to find in CompanyAsset first
  let asset = await prisma.companyAsset.findUnique({
    where: { id },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1
      }
    }
  });

  // If not found in CompanyAsset, try Document table
  let isFromDocumentTable = false;
  if (!asset) {
    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        fileUrl: true,
        mimeType: true,
        fileSize: true,
        uploadedById: true
      }
    });

    if (document) {
      // Map Document to CompanyAsset structure
      asset = {
        id: document.id,
        title: document.fileName || document.originalName || 'Document',
        fileUrl: document.fileUrl,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        uploadedById: document.uploadedById,
        type: 'FILE',
        accessLevel: 'PRIVATE',
        versions: []
      };
      isFromDocumentTable = true;
      console.log(`[Download] Found document in Document table: ${asset.title}`);
    }
  }

  if (!asset) throw new AppError('Asset not found', 404);
  if (asset.type !== 'FILE') throw new AppError('Cannot download folders', 400);

  // Check access (prefer accessLevel; treat 'public' as open)
  const isPublicAccess = String(asset.accessLevel || '').toLowerCase() === 'public';
  if (!isPublicAccess && req.user.role !== 'ADMIN' && asset.uploadedById !== req.user.id) {
    throw new AppError('Access denied', 403);
  }

  // Use current version if available
  const fileUrl = asset.versions[0]?.fileUrl || asset.fileUrl;
  const key = extractSpacesKey(fileUrl);

  if (!key) {
    throw new AppError('Invalid file URL', 400);
  }

  console.log(`[Download] Attempting to download file from Spaces: ${key}`);

  // Update download count (only for CompanyAsset)
  if (!isFromDocumentTable) {
    await prisma.companyAsset.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date()
      }
    });
  }

  // Stream from Spaces
  const s3 = getS3();
  const bucket = process.env.DO_SPACES_NAME;

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);

    res.setHeader('Content-Disposition', `attachment; filename="${asset.title}"`);
    res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', asset.fileSize);

    response.Body.pipe(res);
  } catch (error) {
    console.error('Error downloading from Spaces:', error);
    throw new AppError('File not found in storage', 404);
  }
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
      { accessLevel: 'public' },
      { accessLevel: 'PUBLIC' }
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
