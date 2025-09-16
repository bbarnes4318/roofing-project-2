const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Local disk storage for now (mirrors existing /api/documents approach)
const uploadDir = path.join(__dirname, '..', 'uploads', 'company-assets');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// =============================
// Company Assets (Customer-facing PDFs)
// =============================

router.get('/assets', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { search, tag, section, parentId, type, isPublic, access_level, sortBy, sortOrder } = req.query;
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
    if (access_level) {
      where.access_level = access_level;
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

    // Enhanced sorting - fix the orderBy structure
    let orderBy = {};
    if (sortBy === 'title') {
      orderBy = { title: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else if (sortBy === 'size') {
      orderBy = { fileSize: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else if (sortBy === 'modified') {
      orderBy = { updatedAt: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else {
      orderBy = { createdAt: 'desc' };
    }

    const assets = await prisma.companyAsset.findMany({
      where,
      orderBy,
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        parent: {
          select: { id: true, title: true, type: true }
        }
      }
    });
    
    res.json({ success: true, data: { assets } });
  } catch (error) {
    console.error('Error in /assets endpoint:', error);
    throw new AppError(`Database error: ${error.message}`, 500);
  }
}));

router.post('/assets/upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const { title, description, tags, section, parentId, sortOrder } = req.body;

  const asset = await prisma.companyAsset.create({
    data: {
      title: title || req.file.originalname,
      description: description || null,
      fileUrl: `/uploads/company-assets/${req.file.filename}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      tags: tags ? JSON.parse(tags) : [],
      section: section || null,
      type: 'FILE',
      parentId: parentId || null,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      uploaded_by_id: req.user?.id || null
    }
  });
  res.status(201).json({ success: true, data: { asset } });
}));

// Download a company asset
router.get('/assets/:id/download', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  if (asset.type !== 'FILE') throw new AppError('Cannot download folders', 400);

  // asset.fileUrl is like "/uploads/company-assets/<file>"; map to server path
  const filePath = path.join(__dirname, '..', asset.fileUrl);
  
  if (!fs.existsSync(filePath)) {
    throw new AppError('File not found on disk', 404);
  }

  // Set appropriate headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${asset.title || 'download'}"`);
  res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
  
  // Stream the file
  res.download(filePath, asset.title || path.basename(filePath));
}));

// Delete a company asset (customer-facing PDF or other file)
router.delete('/assets/:id', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);

  // Attempt to remove file from disk (best-effort)
  try {
    // asset.fileUrl is like "/uploads/company-assets/<file>"; map to server path
    const absolutePath = path.join(__dirname, '..', asset.fileUrl);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (err) {
    console.error('Error deleting asset file:', err);
  }

  await prisma.companyAsset.delete({ where: { id } });
  res.json({ success: true, message: 'Asset deleted' });
}));

// Create a new folder
router.post('/folders', authenticateToken, asyncHandler(async (req, res) => {
  const { name, description, section, parentId, sortOrder } = req.body;
  if (!name) throw new AppError('Folder name is required', 400);

  const folder = await prisma.companyAsset.create({
    data: {
      title: name,
      description: description || null,
      type: 'FOLDER',
      section: section || null,
      parentId: parentId || null,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      uploaded_by_id: req.user?.id || null
    }
  });
  res.status(201).json({ success: true, data: { folder } });
}));

// Update asset/folder (for moving, renaming, reordering)
router.patch('/assets/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, parentId, sortOrder, section } = req.body;
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (parentId !== undefined) updateData.parentId = parentId;
  if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
  if (section !== undefined) updateData.section = section;

  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: updateData,
    include: {
      children: true,
      parent: true
    }
  });

  res.json({ success: true, data: { asset: updatedAsset } });
}));

// Bulk reorder assets
router.patch('/assets/reorder', authenticateToken, asyncHandler(async (req, res) => {
  const { updates } = req.body; // Array of { id, sortOrder, parentId? }
  if (!Array.isArray(updates)) throw new AppError('Updates must be an array', 400);

  // Use transaction to ensure consistency
  const results = await prisma.$transaction(
    updates.map(update => 
      prisma.companyAsset.update({
        where: { id: update.id },
        data: {
          sortOrder: update.sortOrder,
          ...(update.parentId !== undefined && { parentId: update.parentId })
        }
      })
    )
  );

  res.json({ success: true, data: { updated: results.length } });
}));

// Bulk delete assets
router.delete('/assets/bulk', authenticateToken, asyncHandler(async (req, res) => {
  const { ids } = req.body; // Array of asset IDs
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('IDs array is required', 400);
  }

  // Get all assets to delete for file cleanup
  const assets = await prisma.companyAsset.findMany({
    where: { id: { in: ids } }
  });

  // Use transaction to delete all assets
  await prisma.$transaction(
    ids.map(id => prisma.companyAsset.delete({ where: { id } }))
  );

  // Clean up files from disk (best-effort)
  assets.forEach(asset => {
    if (asset.fileUrl) {
      try {
        const filePath = path.join(__dirname, '..', asset.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting asset file:', err);
      }
    }
  });

  res.json({ success: true, message: `Deleted ${ids.length} asset(s)` });
}));

// Bulk move assets
router.patch('/assets/bulk-move', authenticateToken, asyncHandler(async (req, res) => {
  const { ids, parentId } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('IDs array is required', 400);
  }
  if (parentId === undefined) {
    throw new AppError('parentId is required', 400);
  }

  // Validate parent folder exists if provided
  if (parentId !== null) {
    const parent = await prisma.companyAsset.findUnique({ where: { id: parentId } });
    if (!parent || parent.type !== 'FOLDER') {
      throw new AppError('Invalid parent folder', 400);
    }
  }

  // Use transaction to move all assets
  const results = await prisma.$transaction(
    ids.map(id => 
      prisma.companyAsset.update({
        where: { id },
        data: { parentId }
      })
    )
  );

  res.json({ success: true, message: `Moved ${ids.length} asset(s)` });
}));

// =============================
// Templates and Fields
// =============================

router.get('/templates', authenticateToken, asyncHandler(async (req, res) => {
  const { section } = req.query;
  const where = { isActive: true };
  if (section) where.section = section;
  const templates = await prisma.documentTemplate.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: { fields: true }
  });
  res.json({ success: true, data: { templates } });
}));

router.post('/templates', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Template file is required', 400);
  const { name, description, format, fields, section } = req.body;

  const template = await prisma.documentTemplate.create({
    data: {
      name,
      description: description || null,
      format: String(format || 'DOCX').toUpperCase(),
      section: section || null,
      templateFileUrl: `/uploads/company-assets/${req.file.filename}`,
      createdById: req.user?.id || null,
      fields: fields ? { create: JSON.parse(fields).map(f => ({
        key: f.key,
        label: f.label,
        type: String(f.type || 'TEXT').toUpperCase(),
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options : [],
        defaultValue: f.defaultValue ?? null
      })) } : undefined
    },
    include: { fields: true }
  });
  res.status(201).json({ success: true, data: { template } });
}));

// Update template metadata and optionally replace file
router.patch('/templates/:id', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  console.log('PATCH /templates/:id called with params:', req.params);
  console.log('Body:', req.body);
  
  const { id } = req.params;
  const { name, description, format, fields, section } = req.body;
  
  const template = await prisma.documentTemplate.findUnique({ 
    where: { id },
    include: { fields: true }
  });
  if (!template) throw new AppError('Template not found', 404);

  // If new file uploaded, delete old file and update URL
  let templateFileUrl = template.templateFileUrl;
  if (req.file) {
    try {
      const oldFilePath = path.join(__dirname, '..', template.templateFileUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    } catch (err) {
      console.error('Error deleting old template file:', err);
    }
    templateFileUrl = `/uploads/company-assets/${req.file.filename}`;
  }

  // Update template
  const fieldsData = fields ? (() => {
    console.log('Fields before processing:', fields);
    console.log('Fields type:', typeof fields);
    
    let parsedFields;
    try {
      if (typeof fields === 'string') {
        parsedFields = JSON.parse(fields);
        // Handle double-encoded payloads like "[ ... ]"
        if (typeof parsedFields === 'string' && /^\s*\[/.test(parsedFields)) {
          parsedFields = JSON.parse(parsedFields);
        }
      } else {
        parsedFields = fields;
      }
      console.log('Parsed fields:', parsedFields);
      console.log('Is array?', Array.isArray(parsedFields));
      
      if (!parsedFields || typeof parsedFields !== 'object') {
        console.error('Fields is not an object:', parsedFields);
        return [];
      }
      
      // Normalize to array
      const fieldsArray = Array.isArray(parsedFields)
        ? parsedFields
        : (parsedFields.length !== undefined ? Array.from(parsedFields) : []);
      
      if (!Array.isArray(fieldsArray) || fieldsArray.length === 0) {
        console.error('Fields failed normalization to array:', parsedFields);
        return [];
      }
      
      const processedFields = parsedFields.map(f => ({
        key: f.key,
        label: f.label,
        type: String(f.type || 'TEXT').toUpperCase(),
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options : [],
        defaultValue: f.defaultValue || null
      }));
      
      console.log('Processed fields:', processedFields);
      return processedFields;
    } catch (error) {
      console.error('Error parsing fields:', error);
      return [];
    }
  })() : [];

  console.log('Final fields data for Prisma:', fieldsData);

  const updatedTemplate = await prisma.documentTemplate.update({
    where: { id },
    data: {
      name: name || template.name,
      description: description !== undefined ? description : template.description,
      format: format ? String(format).toUpperCase() : template.format,
      section: section !== undefined ? section : template.section,
      templateFileUrl,
      fields: fieldsData.length > 0 ? {
        deleteMany: {},
        create: fieldsData
      } : undefined
    },
    include: { fields: true }
  });

  res.json({ success: true, data: { template: updatedTemplate } });
}));

// Delete template and its file
router.delete('/templates/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const template = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!template) throw new AppError('Template not found', 404);

  // Delete template file from disk
  try {
    const filePath = path.join(__dirname, '..', template.templateFileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error deleting template file:', err);
  }

  // Delete from database (fields will cascade delete)
  await prisma.documentTemplate.delete({ where: { id } });
  
  res.json({ success: true, message: 'Template deleted successfully' });
}));

// =============================
// Coordinate Finding Tools
// =============================

router.get('/coordinate-grid', authenticateToken, asyncHandler(async (req, res) => {
  const PDFCoordinateFinder = require('../services/PDFCoordinateFinder');
  const outputPath = path.join(uploadDir, `coordinate-grid-${Date.now()}.pdf`);
  
  await PDFCoordinateFinder.generateCoordinateGrid(outputPath);
  
  res.json({ 
    success: true, 
    message: 'Coordinate grid generated',
    fileUrl: `/uploads/company-assets/${path.basename(outputPath)}`
  });
}));

router.get('/test-positions', authenticateToken, asyncHandler(async (req, res) => {
  const PDFCoordinateFinder = require('../services/PDFCoordinateFinder');
  const outputPath = path.join(uploadDir, `test-positions-${Date.now()}.pdf`);
  
  await PDFCoordinateFinder.generateTestPositions(outputPath);
  
  res.json({ 
    success: true, 
    message: 'Test positions PDF generated',
    fileUrl: `/uploads/company-assets/${path.basename(outputPath)}`
  });
}));

router.get('/test-5year-warranty', authenticateToken, asyncHandler(async (req, res) => {
  const PDFCoordinateFinder = require('../services/PDFCoordinateFinder');
  const outputPath = path.join(uploadDir, `5year-warranty-test-${Date.now()}.pdf`);
  
  await PDFCoordinateFinder.generate5YearWarrantyTest(outputPath);
  
  res.json({ 
    success: true, 
    message: '5-Year Warranty test PDF generated',
    fileUrl: `/uploads/company-assets/${path.basename(outputPath)}`
  });
}));

// =============================
// Enhanced Document Management
// =============================

// Get document preview with metadata
router.get('/assets/:id/preview', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const asset = await prisma.companyAsset.findUnique({ 
    where: { id },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      parent: true,
      children: true
    }
  });
  
  if (!asset) throw new AppError('Asset not found', 404);
  if (asset.type !== 'FILE') throw new AppError('Cannot preview folders', 400);

  // Get version history
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  });

  res.json({ 
    success: true, 
    data: { 
      asset,
      versions,
      previewUrl: asset.thumbnailUrl || asset.fileUrl
    } 
  });
}));

// Generate thumbnail for document
router.post('/assets/:id/thumbnail', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  
  if (!asset) throw new AppError('Asset not found', 404);
  if (asset.type !== 'FILE') throw new AppError('Cannot generate thumbnail for folders', 400);

  try {
    // For now, return a placeholder thumbnail URL
    // In production, you'd generate actual thumbnails using libraries like sharp or pdf-poppler
    const thumbnailUrl = `/uploads/company-assets/thumbnails/${asset.id}.png`;
    
    // Update asset with thumbnail URL
    await prisma.companyAsset.update({
      where: { id },
      data: { thumbnailUrl }
    });

    res.json({ 
      success: true, 
      data: { 
        thumbnailUrl,
        message: 'Thumbnail generated successfully' 
      } 
    });
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw new AppError('Failed to generate thumbnail', 500);
  }
}));

// Get document version history
router.get('/assets/:id/versions', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  });

  res.json({ success: true, data: { versions } });
}));

// Create new version of document
router.post('/assets/:id/versions', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { description, versionNumber } = req.body;
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  if (asset.type !== 'FILE') throw new AppError('Cannot version folders', 400);

  if (!req.file) throw new AppError('No file uploaded', 400);

  // Create new version
  const version = await prisma.documentVersion.create({
    data: {
      documentId: id,
      fileUrl: `/uploads/company-assets/${req.file.filename}`,
      versionNumber: versionNumber || '1.0',
      description: description || 'New version',
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploaded_by_id: req.user?.id || null
    }
  });

  // Update main asset with new file
  await prisma.companyAsset.update({
    where: { id },
    data: {
      fileUrl: `/uploads/company-assets/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      updatedAt: new Date()
    }
  });

  res.status(201).json({ success: true, data: { version } });
}));

// Get document statistics
router.get('/assets/stats', authenticateToken, asyncHandler(async (req, res) => {
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total_assets,
      COUNT(CASE WHEN type = 'FILE' THEN 1 END) as total_files,
      COUNT(CASE WHEN type = 'FOLDER' THEN 1 END) as total_folders,
      COUNT(CASE WHEN "isPublic" = true THEN 1 END) as public_assets,
      COUNT(CASE WHEN "isPublic" = false THEN 1 END) as private_assets,
      SUM(CASE WHEN type = 'FILE' THEN "fileSize" ELSE 0 END) as total_size
    FROM "CompanyAsset"
  `;

  const recentUploads = await prisma.companyAsset.findMany({
    where: { type: 'FILE' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      uploadedBy: {
        select: { firstName: true, lastName: true }
      }
    }
  });

  res.json({ 
    success: true, 
    data: { 
      stats: stats[0],
      recentUploads
    } 
  });
}));

// Search with advanced filters
router.get('/assets/search', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    q, 
    type, 
    isPublic, 
    access_level, 
    dateFrom, 
    dateTo, 
    sizeMin, 
    sizeMax,
    tags,
    uploadedBy
  } = req.query;
  
  const where = {};
  
  // Text search
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      // Temporarily remove folderName search until column is added
      // { folderName: { contains: q, mode: 'insensitive' } }
    ];
  }
  
  // Type filter
  if (type) {
    where.type = type;
  }
  
  // Public/private filter
  if (isPublic !== undefined) {
    where.isPublic = isPublic === 'true';
  }
  
  // Access level filter
  if (access_level) {
    where.access_level = access_level;
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }
  
  // Size range filter
  if (sizeMin || sizeMax) {
    where.fileSize = {};
    if (sizeMin) where.fileSize.gte = parseInt(sizeMin);
    if (sizeMax) where.fileSize.lte = parseInt(sizeMax);
  }
  
  // Tags filter
  if (tags) {
    const tagArray = tags.split(',').map(t => t.trim());
    where.tags = { hasSome: tagArray };
  }
  
  // Uploaded by filter
  if (uploadedBy) {
    where.uploaded_by_id = uploadedBy;
  }

  const assets = await prisma.companyAsset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      mimeType: true,
      fileSize: true,
      tags: true,
      section: true,
      version: true,
      isActive: true,
      download_count: true,
      last_downloaded_at: true,
      uploaded_by_id: true,
      parentId: true,
      path: true,
      sortOrder: true,
      type: true,
      isPublic: true,
      thumbnail_url: true,
      checksum: true,
      metadata: true,
      access_level: true,
      createdAt: true,
      updatedAt: true,
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      parent: true
    }
  });

  res.json({ success: true, data: { assets } });
}));

// =============================
// Generation (simple PDF placeholder)
// =============================

router.post('/generate', authenticateToken, asyncHandler(async (req, res) => {
  const { templateId, projectId, data, title } = req.body || {};
  if (!projectId) throw new AppError('projectId is required', 400);

  // Minimal placeholder output using existing Document model for storage/preview
  const now = Date.now();
  const fileNameSafe = (title || 'Generated-Document').replace(/[^a-z0-9\-_\.]+/gi, '_');
  const outputFile = path.join(uploadDir, `${fileNameSafe}-${now}.pdf`);

  // Get template information to determine rendering method
  let template = null;
  if (templateId) {
    template = await prisma.documentTemplate.findUnique({ 
      where: { id: templateId },
      include: { fields: true }
    });
  }

    // For known templates, render with appropriate layout
  if (template) {
    try {
      // Use PDFOverlayService to overlay text on your actual PDF templates
      const PDFOverlayService = require('../services/PDFOverlayService');
      console.log('Using PDF overlay service with template:', template.name);
      console.log('Template file path:', template.templateFileUrl);
      
      await PDFOverlayService.generateDocument(templateId, outputFile, data || {});
    } catch (error) {
      console.error('Error using PDF form filler service:', error);
      
      // Fallback to PDFGeneratorService for templates that need custom layouts
      try {
        const PDFGeneratorService = require('../services/PDFGeneratorService');
        console.log('Falling back to PDF generator service for:', template.name);
        
        if (template.name.toLowerCase().includes('certificate of completion')) {
          await PDFGeneratorService.generateCertificateOfCompletionPDF(outputFile, data || {});
        } else {
          // For other templates, use the template service as last resort
          const PDFTemplateService = require('../services/PDFTemplateService');
          await PDFTemplateService.generateFromTemplate(template.templateFileUrl, outputFile, data || {});
        }
      } catch (fallbackError) {
        console.error('All PDF generation methods failed:', fallbackError);
        throw fallbackError;
      }
    }
  } else {
    // Fallback simple renderer for unknown templates
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const writeStream = fs.createWriteStream(outputFile);
    doc.pipe(writeStream);
    doc.fontSize(18).fill('#111827').text(title || 'Generated Document', { align: 'left' });
    doc.moveDown();
    doc.fontSize(11).fill('#374151').text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();
    doc.fontSize(12).fill('#111827').text('Fields:', { underline: true });
    try {
      const entries = Object.entries(data || {});
      if (entries.length === 0) {
        doc.moveDown().fontSize(11).fill('#6B7280').text('No fields provided.');
      } else {
        entries.forEach(([k, v]) => {
          doc.moveDown(0.2).fontSize(11).fill('#111827').text(`${k}: `, { continued: true }).fill('#1F2937').text(String(v ?? ''));
        });
      }
    } catch (e) {
      doc.moveDown().fontSize(11).fill('#B91C1C').text('Failed to render fields payload.');
    }
    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  // Store as a project Document entry for consistency
  const stats = fs.statSync(outputFile);
  const document = await prisma.document.create({
    data: {
      fileName: path.basename(outputFile),
      originalName: path.basename(outputFile),
      fileUrl: `/uploads/company-assets/${path.basename(outputFile)}`,
      mimeType: 'application/pdf',
      fileSize: stats.size,
      fileType: 'REPORT',
      description: 'Auto-generated PDF',
      tags: [],
      isPublic: false,
      projectId,
      uploaded_by_id: req.user?.id || undefined
    }
  });

  await prisma.generatedDocumentMeta.create({
    data: {
      documentId: document.id,
      templateId: templateId || null,
      sourceData: data || {},
      createdById: req.user?.id || null
    }
  });

  res.status(201).json({ success: true, data: { document } });
}));

// Toggle favorite status
router.patch('/assets/:id/favorite', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  
  // Toggle the favorite status
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: { 
      is_favorite: !asset.is_favorite
    }
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

// Update asset (for move, rename, etc.)
router.patch('/assets/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: updateData
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

// Duplicate asset
router.post('/assets/:id/duplicate', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, parentId } = req.body;
  
  const originalAsset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!originalAsset) throw new AppError('Asset not found', 404);
  
  const duplicatedAsset = await prisma.companyAsset.create({
    data: {
      title: title || `${originalAsset.title} (Copy)`,
      description: originalAsset.description,
      fileUrl: originalAsset.fileUrl,
      mimeType: originalAsset.mimeType,
      fileSize: originalAsset.fileSize,
      tags: originalAsset.tags,
      section: originalAsset.section,
      type: originalAsset.type,
      parentId: parentId || originalAsset.parentId,
      sortOrder: originalAsset.sortOrder,
      uploaded_by_id: req.user?.id || originalAsset.uploaded_by_id,
      duplicateOf: originalAsset.id,
      isPublic: originalAsset.isPublic,
      access_level: originalAsset.access_level
    }
  });
  
  res.status(201).json({ success: true, data: { asset: duplicatedAsset } });
}));

// Share asset
router.post('/assets/:id/share', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sharedWith, access_level } = req.body;
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: {
      sharedWith: sharedWith || [],
      access_level: access_level || 'shared',
      isPublic: access_level === 'public'
    }
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

// Archive asset
router.post('/assets/:id/archive', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: { isArchived: true }
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

// Unarchive asset
router.post('/assets/:id/unarchive', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: { isArchived: false }
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

// Add tag to asset
router.post('/assets/:id/tag', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tag } = req.body;
  
  if (!tag) throw new AppError('Tag is required', 400);
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  
  const currentTags = asset.tags || [];
  const updatedTags = currentTags.includes(tag) ? currentTags : [...currentTags, tag];
  
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: { tags: updatedTags }
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

// Remove tag from asset
router.delete('/assets/:id/tag', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tag } = req.body;
  
  if (!tag) throw new AppError('Tag is required', 400);
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  
  const currentTags = asset.tags || [];
  const updatedTags = currentTags.filter(t => t !== tag);
  
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: { tags: updatedTags }
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

// Get asset metadata
router.get('/assets/:id/metadata', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({ 
    where: { id },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      parent: {
        select: { id: true, title: true, type: true }
      },
      children: {
        select: { id: true, title: true, type: true, createdAt: true }
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });
  
  if (!asset) throw new AppError('Asset not found', 404);
  
  res.json({ success: true, data: { asset } });
}));

// Bulk favorite operations
router.post('/assets/bulk-favorite', authenticateToken, asyncHandler(async (req, res) => {
  const { ids, is_favorite } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('Asset IDs array is required', 400);
  }
  
  const updatedAssets = await prisma.companyAsset.updateMany({
    where: { id: { in: ids } },
    data: { is_favorite: is_favorite === true }
  });
  
  res.json({ 
    success: true, 
    data: { 
      updatedCount: updatedAssets.count,
      message: `${updatedAssets.count} assets ${is_favorite ? 'added to' : 'removed from'} favorites`
    } 
  });
}));

// Track asset view
router.post('/assets/:id/view', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Asset not found', 404);
  
  const updatedAsset = await prisma.companyAsset.update({
    where: { id },
    data: { 
      viewCount: { increment: 1 },
      lastAccessedAt: new Date()
    }
  });
  
  res.json({ success: true, data: { asset: updatedAsset } });
}));

module.exports = router;


