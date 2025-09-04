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
  const { search, tag, section } = req.query;
  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (tag) {
    where.tags = { has: tag };
  }
  if (section) {
    where.section = section;
  }

  const assets = await prisma.companyAsset.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: { assets } });
}));

router.post('/assets/upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const { title, description, tags, section } = req.body;

  const asset = await prisma.companyAsset.create({
    data: {
      title: title || req.file.originalname,
      description: description || null,
      fileUrl: `/uploads/company-assets/${req.file.filename}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      tags: tags ? JSON.parse(tags) : [],
      section: section || null,
      uploadedById: req.user?.id || null
    }
  });
  res.status(201).json({ success: true, data: { asset } });
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
      uploadedById: req.user?.id || undefined
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

module.exports = router;


