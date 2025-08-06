const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `combined-import-${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Parse CSV file and extract data
 */
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

/**
 * Parse Excel file and extract data
 */
const parseExcelFile = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Validate required fields for combined import
 */
const validateCombinedData = (data) => {
  const requiredFields = ['projectNumber', 'projectName', 'primaryName', 'primaryEmail', 'address'];
  const optionalWorkflowFields = ['startingPhase', 'startingSection', 'startingLineItem'];
  const errors = [];

  if (!Array.isArray(data) || data.length === 0) {
    return ['No data found in file'];
  }

  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      }
    });

    // Validate enums
    if (row.projectType && !['ROOF_REPLACEMENT', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION', 'ADDITION', 'GENERAL_CONTRACTOR', 'OTHER'].includes(row.projectType)) {
      errors.push(`Row ${index + 1}: Invalid projectType '${row.projectType}'`);
    }
    if (row.status && !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'].includes(row.status)) {
      errors.push(`Row ${index + 1}: Invalid status '${row.status}'`);
    }
    if (row.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(row.priority)) {
      errors.push(`Row ${index + 1}: Invalid priority '${row.priority}'`);
    }
    if (row.primaryContact && !['PRIMARY', 'SECONDARY', 'SINGLE'].includes(row.primaryContact)) {
      errors.push(`Row ${index + 1}: Invalid primaryContact '${row.primaryContact}'`);
    }

    // Validate date formats
    if (row.startDate && isNaN(Date.parse(row.startDate))) {
      errors.push(`Row ${index + 1}: Invalid startDate format '${row.startDate}' (use YYYY-MM-DD)`);
    }
    if (row.endDate && isNaN(Date.parse(row.endDate))) {
      errors.push(`Row ${index + 1}: Invalid endDate format '${row.endDate}' (use YYYY-MM-DD)`);
    }
  });

  return errors;
};

/**
 * Create customer and project with workflow
 */
const createCombinedRecord = async (rowData, workflowTemplateId) => {
  try {
    console.log(`📝 PROJECT IMPORT: Processing row: ${rowData.projectNumber}`);
    console.log(`📝 PROJECT IMPORT: WorkflowProgressionService available:`, !!WorkflowProgressionService);
    console.log(`📝 PROJECT IMPORT: WorkflowProgressionService.initializeProjectWorkflow available:`, !!WorkflowProgressionService.initializeProjectWorkflow);

    // Parse and validate project number
    const projectNumber = parseInt(rowData.projectNumber);
    if (isNaN(projectNumber)) {
      throw new Error(`Invalid project number: ${rowData.projectNumber}. Must be a number.`);
    }

    // Check for duplicate project number
    const existingProject = await prisma.project.findUnique({
      where: { projectNumber: projectNumber }
    });
    if (existingProject) {
      throw new Error(`Project number ${projectNumber} already exists`);
    }

    // Check for duplicate customer email
    const existingCustomer = await prisma.customer.findUnique({
      where: { primaryEmail: rowData.primaryEmail.toLowerCase() }
    });
    if (existingCustomer) {
      throw new Error(`Customer with email ${rowData.primaryEmail} already exists`);
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create customer
      const customer = await tx.customer.create({
        data: {
          primaryName: rowData.primaryName.trim(),
          primaryEmail: rowData.primaryEmail.trim().toLowerCase(),
          primaryPhone: rowData.primaryPhone?.trim() || '',
          secondaryName: rowData.secondaryName?.trim() || null,
          secondaryEmail: rowData.secondaryEmail?.trim().toLowerCase() || null,
          secondaryPhone: rowData.secondaryPhone?.trim() || null,
          primaryContact: rowData.primaryContact || 'PRIMARY',
          address: rowData.address.trim(),
          notes: rowData.customerNotes?.trim() || null
        }
      });

      // 2. Create project linked to customer
      const project = await tx.project.create({
        data: {
          projectNumber: projectNumber,
          projectName: rowData.projectName.trim(),
          projectType: rowData.projectType || 'OTHER',
          status: rowData.status || 'PENDING',
          priority: rowData.priority || 'MEDIUM',
          budget: rowData.budget ? parseFloat(rowData.budget) : 0,
          estimatedCost: rowData.estimatedCost ? parseFloat(rowData.estimatedCost) : null,
          startDate: rowData.startDate ? new Date(rowData.startDate) : new Date(),
          endDate: rowData.endDate ? new Date(rowData.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now if not provided
          description: rowData.description?.trim() || null,
          notes: rowData.notes?.trim() || null,
          pmPhone: rowData.pmPhone?.trim() || null,
          pmEmail: rowData.pmEmail?.trim() || null,
          customerId: customer.id
        }
      });

      // 3. For now, just return the basic project and customer
      // Workflow initialization will be handled separately after the transaction
      return {
        customer,
        project
      };
    });

    // 4. Initialize workflow tracker AFTER the transaction completes
    try {
      const workflowTracker = await WorkflowProgressionService.initializeProjectWorkflow(result.project.id);
      
      // 5. Create initial workflow alert for the first line item if tracker was created successfully
      if (workflowTracker && workflowTracker.currentLineItemId) {
        const currentLineItem = await prisma.workflowLineItem.findUnique({
          where: { id: workflowTracker.currentLineItemId },
          include: {
            section: {
              include: {
                phase: true
              }
            }
          }
        });
        
        if (currentLineItem) {
          // Create initial alert for the first workflow item
          await prisma.workflowAlert.create({
            data: {
              type: 'Work Flow Line Item',
              priority: 'MEDIUM',
              status: 'ACTIVE',
              title: `${currentLineItem.itemName} - ${result.customer.primaryName}`,
              message: `${currentLineItem.itemName} is ready to begin for project ${result.project.projectName}`,
              projectId: result.project.id,
              workflowId: 1, // Legacy field
              stepId: 1, // Legacy field
              responsibleRole: currentLineItem.responsibleRole || 'OFFICE',
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
              metadata: {
                projectId: result.project.id,
                projectNumber: result.project.projectNumber,
                projectName: result.project.projectName,
                customerName: result.customer.primaryName,
                phase: currentLineItem.section.phase.phaseType,
                section: currentLineItem.section.displayName,
                lineItem: currentLineItem.itemName,
                responsibleRole: currentLineItem.responsibleRole || 'OFFICE'
              }
            }
          });
        }
      }
    } catch (workflowError) {
      // Log the error but don't fail the entire import - the project was created successfully
      console.error(`⚠️ Warning: Failed to initialize workflow for project ${result.project.projectNumber}:`, workflowError.message);
    }

    console.log(`✅ Created: ${result.project.projectNumber} for ${result.customer.primaryName}`);
    return result;

  } catch (error) {
    console.error(`❌ Error processing ${rowData.projectNumber}:`, error.message);
    console.error(`❌ Full error details:`, error);
    throw error;
  }
};

/**
 * GET /api/project-import/templates - Get available workflow templates
 */
router.get('/templates', asyncHandler(async (req, res) => {
  // Since WorkflowTemplate model doesn't exist, return hardcoded templates
  const templates = [
    { id: 'standard', name: 'Standard Roofing Workflow', description: 'Default 7-phase roofing workflow' },
    { id: 'express', name: 'Express Workflow', description: 'Simplified workflow for small projects' },
    { id: 'insurance', name: 'Insurance Claims Workflow', description: 'Workflow optimized for insurance claims' }
  ];

  res.json({
    success: true,
    data: templates,
    message: 'Workflow templates retrieved successfully'
  });
}));

/**
 * POST /api/project-import/upload - Import combined project/customer data
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  console.log('🚀 PROJECT IMPORT: Starting upload process');
  console.log('🚀 REQUEST BODY:', req.body);
  console.log('🚀 REQUEST FILE:', req.file ? { filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype } : 'NO FILE');
  
  if (!req.file) {
    console.log('❌ PROJECT IMPORT: No file uploaded');
    throw new AppError('No file uploaded', 400);
  }

  console.log('📁 Processing combined import file:', req.file.filename);

  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  const { workflowTemplateId } = req.body;

  try {
    console.log('🔍 PROJECT IMPORT: File details - Path:', filePath, 'Extension:', fileExt);
    
    // Parse file
    let data;
    if (fileExt === '.csv') {
      console.log('📄 PROJECT IMPORT: Parsing CSV file');
      data = await parseCSVFile(filePath);
    } else if (fileExt === '.xlsx') {
      console.log('📊 PROJECT IMPORT: Parsing Excel file');
      data = parseExcelFile(filePath);
    } else {
      console.log('❌ PROJECT IMPORT: Unsupported file format:', fileExt);
      throw new Error('Unsupported file format');
    }

    console.log(`📊 Parsed ${data.length} records from file`);
    console.log(`📊 First record sample:`, data[0]);

    // Validate data
    console.log('✅ PROJECT IMPORT: Starting data validation');
    const validationErrors = validateCombinedData(data);
    if (validationErrors.length > 0) {
      console.log('❌ PROJECT IMPORT: Validation failed:', validationErrors);
      throw new AppError('Validation failed: ' + validationErrors.join('; '), 400);
    }
    console.log('✅ PROJECT IMPORT: Data validation passed');

    // Process records
    console.log('🔄 PROJECT IMPORT: Starting record processing');
    const results = {
      total: data.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      try {
        console.log(`🔄 PROJECT IMPORT: Processing row ${i + 1}/${data.length}`);
        console.log(`🔄 PROJECT IMPORT: Row data:`, data[i]);
        const result = await createCombinedRecord(data[i], workflowTemplateId);
        results.successful++;
        console.log(`✅ Row ${i + 1}/${data.length}: ${result.project.projectNumber} created`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          data: data[i],
          error: error.message
        });
        console.log(`❌ Row ${i + 1}/${data.length}: ${error.message}`);
        console.log(`❌ Row ${i + 1} full error:`, error);
      }
    }

    // Clean up file
    fs.unlinkSync(filePath);

    console.log('📋 Combined import completed:', results);

    res.json({
      success: true,
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    console.log('💥 PROJECT IMPORT: Major error occurred');
    console.log('💥 Error message:', error.message);
    console.log('💥 Error stack:', error.stack);
    console.log('💥 Error details:', error);
    
    if (fs.existsSync(filePath)) {
      console.log('🧹 PROJECT IMPORT: Cleaning up file');
      fs.unlinkSync(filePath);
    }
    
    // Re-throw with more details
    throw new AppError(`Import failed: ${error.message}`, 500);
  }
}));

/**
 * GET /api/project-import/template - Download combined CSV template
 */
router.get('/template', asyncHandler(async (req, res) => {
  const templatePath = path.join(__dirname, '../../public/templates/project_customer_combined_template.csv');
  
  if (!fs.existsSync(templatePath)) {
    throw new AppError('Template file not found', 404);
  }

  res.download(templatePath, 'project_customer_combined_template.csv');
}));

module.exports = router;