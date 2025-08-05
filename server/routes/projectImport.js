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
    console.log(`📝 Processing row: ${rowData.projectNumber}`);

    // Check for duplicate project number
    const existingProject = await prisma.project.findUnique({
      where: { projectNumber: rowData.projectNumber }
    });
    if (existingProject) {
      throw new Error(`Project number ${rowData.projectNumber} already exists`);
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
          projectNumber: rowData.projectNumber.trim(),
          projectName: rowData.projectName.trim(),
          projectType: rowData.projectType || 'OTHER',
          status: rowData.status || 'PENDING',
          priority: rowData.priority || 'MEDIUM',
          budget: parseFloat(rowData.budget) || null,
          estimatedCost: parseFloat(rowData.estimatedCost) || null,
          startDate: rowData.startDate ? new Date(rowData.startDate) : null,
          endDate: rowData.endDate ? new Date(rowData.endDate) : null,
          description: rowData.description?.trim() || null,
          notes: rowData.notes?.trim() || null,
          pmPhone: rowData.pmPhone?.trim() || null,
          pmEmail: rowData.pmEmail?.trim() || null,
          customerId: customer.id,
          currentPhase: 'LEAD',
          currentSection: null,
          currentLineItem: null
        }
      });

      // 3. Create workflow if template provided
      let workflow = null;
      let stepsCreated = 0;
      
      if (workflowTemplateId) {
        const workflowTemplate = await tx.workflowTemplate.findUnique({
          where: { id: workflowTemplateId },
          include: {
            phases: {
              include: {
                sections: {
                  include: {
                    lineItems: true
                  }
                }
              }
            }
          }
        });

        if (workflowTemplate) {
          workflow = await tx.workflow.create({
            data: {
              projectId: project.id,
              templateId: workflowTemplateId,
              name: workflowTemplate.name,
              currentPhase: 'LEAD',
              status: 'ACTIVE'
            }
          });

          // Create workflow phases, sections, and line items
          for (const templatePhase of workflowTemplate.phases) {
            const phase = await tx.workflowPhase.create({
              data: {
                workflowId: workflow.id,
                name: templatePhase.name,
                orderIndex: templatePhase.orderIndex,
                isCompleted: false
              }
            });

            for (const templateSection of templatePhase.sections) {
              const section = await tx.workflowSection.create({
                data: {
                  phaseId: phase.id,
                  name: templateSection.name,
                  orderIndex: templateSection.orderIndex,
                  isCompleted: false
                }
              });

              for (const templateLineItem of templateSection.lineItems) {
                await tx.workflowLineItem.create({
                  data: {
                    sectionId: section.id,
                    name: templateLineItem.name,
                    description: templateLineItem.description,
                    orderIndex: templateLineItem.orderIndex,
                    isCompleted: false,
                    assignedTo: templateLineItem.assignedTo
                  }
                });
                stepsCreated++;
              }
            }
          }

          // Set first line item as active
          const firstPhase = await tx.workflowPhase.findFirst({
            where: { workflowId: workflow.id },
            orderBy: { orderIndex: 'asc' }
          });

          if (firstPhase) {
            const firstSection = await tx.workflowSection.findFirst({
              where: { phaseId: firstPhase.id },
              orderBy: { orderIndex: 'asc' }
            });

            if (firstSection) {
              const firstLineItem = await tx.workflowLineItem.findFirst({
                where: { sectionId: firstSection.id },
                orderBy: { orderIndex: 'asc' }
              });

              if (firstLineItem) {
                await tx.project.update({
                  where: { id: project.id },
                  data: {
                    currentPhase: firstPhase.name,
                    currentSection: firstSection.name,
                    currentLineItem: firstLineItem.name
                  }
                });
              }
            }
          }
        }
      }

      return {
        customer,
        project,
        workflow,
        stepsCreated
      };
    });

    console.log(`✅ Created: ${result.project.projectNumber} for ${result.customer.primaryName}`);
    return result;

  } catch (error) {
    console.error(`❌ Error processing ${rowData.projectNumber}:`, error);
    throw error;
  }
};

/**
 * GET /api/project-import/templates - Get available workflow templates
 */
router.get('/templates', asyncHandler(async (req, res) => {
  const templates = await prisma.workflowTemplate.findMany({
    select: {
      id: true,
      name: true,
      description: true
    },
    orderBy: { name: 'asc' }
  });

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
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  console.log('📁 Processing combined import file:', req.file.filename);

  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  const { workflowTemplateId } = req.body;

  try {
    // Parse file
    let data;
    if (fileExt === '.csv') {
      data = await parseCSVFile(filePath);
    } else if (fileExt === '.xlsx') {
      data = parseExcelFile(filePath);
    } else {
      throw new Error('Unsupported file format');
    }

    console.log(`📊 Parsed ${data.length} records from file`);

    // Validate data
    const validationErrors = validateCombinedData(data);
    if (validationErrors.length > 0) {
      throw new AppError('Validation failed: ' + validationErrors.join('; '), 400);
    }

    // Process records
    const results = {
      total: data.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      try {
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
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
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