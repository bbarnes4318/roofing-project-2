const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/excel-data');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `project-data-${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Parse Excel file and extract project data
 */
const parseExcelFile = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Parsed ${data.length} rows from Excel file`);
    return data;
  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Validate project data from Excel
 */
const validateProjectData = (data) => {
  const errors = [];
  const requiredFields = [
    'projectNumber',
    'projectName', 
    'projectType',
    'budget',
    'startDate',
    'endDate',
    'primaryName',
    'primaryEmail',
    'primaryPhone',
    'address'
  ];

  data.forEach((row, index) => {
    const rowNum = index + 1;
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push(`Row ${rowNum}: Missing required field '${field}'`);
      }
    });

    // Validate project number is unique integer
    if (row.projectNumber) {
      const projectNum = parseInt(row.projectNumber);
      if (isNaN(projectNum)) {
        errors.push(`Row ${rowNum}: Project number must be a valid integer`);
      }
    }

    // Validate email format
    if (row.primaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.primaryEmail)) {
      errors.push(`Row ${rowNum}: Invalid email format for primaryEmail`);
    }

    // Validate budget is numeric
    if (row.budget && isNaN(parseFloat(row.budget))) {
      errors.push(`Row ${rowNum}: Budget must be a valid number`);
    }

    // Validate dates
    if (row.startDate && isNaN(Date.parse(row.startDate))) {
      errors.push(`Row ${rowNum}: Invalid startDate format (use YYYY-MM-DD)`);
    }
    if (row.endDate && isNaN(Date.parse(row.endDate))) {
      errors.push(`Row ${rowNum}: Invalid endDate format (use YYYY-MM-DD)`);
    }

    // Validate project type
    const validTypes = [
      'ROOF_REPLACEMENT', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION',
      'SIDING_INSTALLATION', 'WINDOW_REPLACEMENT', 'FLOORING', 
      'PAINTING', 'ELECTRICAL_WORK', 'PLUMBING', 'HVAC', 
      'DECK_CONSTRUCTION', 'LANDSCAPING', 'OTHER'
    ];
    if (row.projectType && !validTypes.includes(row.projectType.toUpperCase())) {
      errors.push(`Row ${rowNum}: Invalid project type. Must be one of: ${validTypes.join(', ')}`);
    }
  });

  return errors;
};

/**
 * Create project and customer directly in DigitalOcean PostgreSQL
 */
const createProjectFromExcel = async (rowData) => {
  try {
    console.log(`📝 Creating project: ${rowData.projectNumber}`);

    // Parse project number
    const projectNumber = parseInt(rowData.projectNumber);
    
    // Check for duplicate project number in DigitalOcean DB
    const existingProject = await prisma.project.findUnique({
      where: { projectNumber: projectNumber }
    });
    if (existingProject) {
      throw new Error(`Project number ${projectNumber} already exists in database`);
    }

    // Check for existing customer by email
    let customer = await prisma.customer.findUnique({
      where: { primaryEmail: rowData.primaryEmail.toLowerCase() }
    });

    // Create customer if doesn't exist
    if (!customer) {
      console.log(`👤 Creating new customer: ${rowData.primaryEmail}`);
      customer = await prisma.customer.create({
        data: {
          primaryName: rowData.primaryName.trim(),
          primaryEmail: rowData.primaryEmail.toLowerCase().trim(),
          primaryPhone: rowData.primaryPhone.trim(),
          secondaryName: rowData.secondaryName?.trim() || null,
          secondaryEmail: rowData.secondaryEmail?.toLowerCase().trim() || null,
          secondaryPhone: rowData.secondaryPhone?.trim() || null,
          primaryContact: rowData.primaryContact?.toUpperCase() || 'PRIMARY',
          address: rowData.address.trim(),
          notes: rowData.customerNotes?.trim() || null
        }
      });
      console.log(`✅ Customer created with ID: ${customer.id}`);
    } else {
      console.log(`👤 Using existing customer: ${customer.id}`);
    }

    // Create project in DigitalOcean PostgreSQL
    const project = await prisma.project.create({
      data: {
        projectNumber: projectNumber,
        projectName: rowData.projectName.trim(),
        projectType: rowData.projectType.toUpperCase(),
        status: rowData.status?.toUpperCase() || 'PENDING',
        priority: rowData.priority?.toUpperCase() || 'MEDIUM',
        budget: parseFloat(rowData.budget),
        estimatedCost: rowData.estimatedCost ? parseFloat(rowData.estimatedCost) : null,
        actualCost: rowData.actualCost ? parseFloat(rowData.actualCost) : null,
        startDate: new Date(rowData.startDate),
        endDate: new Date(rowData.endDate),
        description: rowData.description?.trim() || null,
        notes: rowData.notes?.trim() || null,
        pmPhone: rowData.pmPhone?.trim() || null,
        pmEmail: rowData.pmEmail?.toLowerCase().trim() || null,
        progress: parseInt(rowData.progress) || 0,
        phase: rowData.phase?.toUpperCase() || 'LEAD',
        customerId: customer.id
      },
      include: {
        customer: true
      }
    });

    console.log(`✅ Project ${projectNumber} created successfully in DigitalOcean DB`);
    return { project, customer };

  } catch (error) {
    console.error(`❌ Error creating project ${rowData.projectNumber}:`, error);
    throw error;
  }
};

/**
 * POST /api/excel-data/upload - Upload Excel file and sync with DigitalOcean DB
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  console.log('🚀 EXCEL DATA MANAGER: Starting upload to DigitalOcean PostgreSQL');

  if (!req.file) {
    throw new AppError('No Excel file uploaded', 400);
  }

  const filePath = req.file.path;
  
  try {
    // Parse Excel file
    console.log('📊 Parsing Excel file...');
    const data = parseExcelFile(filePath);
    
    // Validate data
    console.log('✅ Validating data...');
    const validationErrors = validateProjectData(data);
    if (validationErrors.length > 0) {
      throw new AppError('Validation failed: ' + validationErrors.join('; '), 400);
    }
    
    // Process each row and create in DigitalOcean database
    console.log('💾 Syncing data to DigitalOcean PostgreSQL...');
    const results = {
      total: data.length,
      successful: 0,
      failed: 0,
      errors: [],
      projects: []
    };

    for (let i = 0; i < data.length; i++) {
      try {
        console.log(`🔄 Processing row ${i + 1}/${data.length}`);
        const result = await createProjectFromExcel(data[i]);
        results.successful++;
        results.projects.push(result.project);
        console.log(`✅ Row ${i + 1}: Project ${result.project.projectNumber} synced to DigitalOcean`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          data: data[i],
          error: error.message
        });
        console.log(`❌ Row ${i + 1}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log('📋 Excel sync completed to DigitalOcean PostgreSQL:', results);

    res.json({
      success: true,
      message: `Excel data synced to DigitalOcean: ${results.successful} successful, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    console.error('💥 EXCEL SYNC ERROR:', error);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw new AppError(`Excel sync to DigitalOcean failed: ${error.message}`, 500);
  }
}));

/**
 * GET /api/excel-data/template - Download Excel template
 */
router.get('/template', asyncHandler(async (req, res) => {
  console.log('📥 Generating Excel template for DigitalOcean integration');

  // Create template data with all required fields
  const templateData = [
    {
      projectNumber: 2025001,
      projectName: "1234 Main Street Roof Replacement", 
      projectType: "ROOF_REPLACEMENT",
      status: "PENDING",
      priority: "MEDIUM",
      budget: 25000.00,
      estimatedCost: 23500.00,
      actualCost: "",
      startDate: "2025-01-15",
      endDate: "2025-02-15", 
      description: "Complete roof replacement with architectural shingles",
      notes: "Customer prefers morning start times",
      pmPhone: "303-555-1001",
      pmEmail: "pm@company.com",
      progress: 0,
      phase: "LEAD",
      primaryName: "John Smith",
      primaryEmail: "john.smith@email.com", 
      primaryPhone: "303-555-0001",
      secondaryName: "Jane Smith",
      secondaryEmail: "jane.smith@email.com",
      secondaryPhone: "303-555-0002",
      primaryContact: "PRIMARY",
      address: "1234 Main Street, Denver, CO 80202",
      customerNotes: "Preferred contact is primary customer"
    }
  ];

  // Create Excel workbook
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(templateData);
  
  // Set column widths for better readability
  ws['!cols'] = [
    { width: 15 }, // projectNumber
    { width: 30 }, // projectName 
    { width: 20 }, // projectType
    { width: 12 }, // status
    { width: 10 }, // priority
    { width: 12 }, // budget
    { width: 15 }, // estimatedCost
    { width: 12 }, // actualCost
    { width: 12 }, // startDate
    { width: 12 }, // endDate
    { width: 40 }, // description
    { width: 30 }, // notes
    { width: 15 }, // pmPhone
    { width: 20 }, // pmEmail
    { width: 10 }, // progress
    { width: 12 }, // phase
    { width: 20 }, // primaryName
    { width: 25 }, // primaryEmail
    { width: 15 }, // primaryPhone
    { width: 20 }, // secondaryName
    { width: 25 }, // secondaryEmail
    { width: 15 }, // secondaryPhone
    { width: 15 }, // primaryContact
    { width: 40 }, // address
    { width: 30 }  // customerNotes
  ];

  xlsx.utils.book_append_sheet(wb, ws, 'Project Data');
  
  // Generate Excel file buffer
  const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  // Set response headers for download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=project-data-template.xlsx');
  res.setHeader('Content-Length', excelBuffer.length);
  
  res.send(excelBuffer);
}));

/**
 * GET /api/excel-data/export - Export current database data to Excel
 */
router.get('/export', asyncHandler(async (req, res) => {
  console.log('📤 Exporting DigitalOcean database to Excel');

  try {
    // Fetch all projects with customer data from DigitalOcean
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        projectManager: true
      },
      orderBy: {
        projectNumber: 'asc'
      }
    });

    // Transform data for Excel export
    const excelData = projects.map(project => ({
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      projectType: project.projectType,
      status: project.status,
      priority: project.priority,
      budget: project.budget,
      estimatedCost: project.estimatedCost,
      actualCost: project.actualCost,
      startDate: project.startDate.toISOString().split('T')[0],
      endDate: project.endDate.toISOString().split('T')[0],
      description: project.description,
      notes: project.notes,
      pmPhone: project.pmPhone,
      pmEmail: project.pmEmail,
      progress: project.progress,
      phase: project.phase,
      primaryName: project.customer.primaryName,
      primaryEmail: project.customer.primaryEmail,
      primaryPhone: project.customer.primaryPhone,
      secondaryName: project.customer.secondaryName,
      secondaryEmail: project.customer.secondaryEmail,
      secondaryPhone: project.customer.secondaryPhone,
      primaryContact: project.customer.primaryContact,
      address: project.customer.address,
      customerNotes: project.customer.notes,
      projectManagerName: project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : '',
      createdAt: project.createdAt.toISOString().split('T')[0],
      updatedAt: project.updatedAt.toISOString().split('T')[0]
    }));

    // Create Excel workbook
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(excelData);
    
    // Set column widths
    ws['!cols'] = Array(Object.keys(excelData[0] || {}).length).fill({ width: 15 });
    
    xlsx.utils.book_append_sheet(wb, ws, 'Projects Export');
    
    // Generate Excel file buffer
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=projects-export-${timestamp}.xlsx`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);

  } catch (error) {
    console.error('❌ Export error:', error);
    throw new AppError(`Export failed: ${error.message}`, 500);
  }
}));

module.exports = router;

