const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { 
  COMPLETE_FIELD_MAPPING, 
  DataProcessor,
  getAllTables,
  getTableInfo,
  getUploadableTables
} = require('../utils/completeFieldMapping');

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/complete-excel-data');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `complete-data-${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * Parse Excel/CSV file with sheet detection
 */
const parseDataFile = (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let workbook;

    if (ext === '.csv') {
      // Handle CSV files
      const csvData = fs.readFileSync(filePath, 'utf8');
      workbook = xlsx.read(csvData, { type: 'string' });
    } else {
      // Handle Excel files
      workbook = xlsx.readFile(filePath);
    }

    const result = {};
    
    // Process each sheet
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      if (data.length > 0) {
        result[sheetName] = data;
        console.log(`📊 Parsed ${data.length} rows from sheet: ${sheetName}`);
      }
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error parsing file:', error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
};

/**
 * Auto-detect table from sheet name or data structure
 */
const detectTableFromSheet = (sheetName, data) => {
  // First try exact match with sheet name
  const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, '_');
  if (COMPLETE_FIELD_MAPPING[normalizedSheetName]) {
    return normalizedSheetName;
  }

  // Try partial matches
  const tables = getAllTables();
  for (const table of tables) {
    if (table.includes(normalizedSheetName) || normalizedSheetName.includes(table)) {
      return table;
    }
  }

  // Try to detect based on column headers
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    
    for (const table of tables) {
      const tableInfo = getTableInfo(table);
      const tableFields = Object.keys(tableInfo.fields);
      
      // Count matching fields
      const matches = headers.filter(header => tableFields.includes(header)).length;
      const matchPercentage = matches / Math.max(headers.length, tableFields.length);
      
      // If more than 30% of fields match, consider it a match
      if (matchPercentage > 0.3) {
        console.log(`🔍 Auto-detected table '${table}' with ${Math.round(matchPercentage * 100)}% field match`);
        return table;
      }
    }
  }

  return null;
};

/**
 * Create records in database using Prisma
 */
const createRecordsInDatabase = async (tableName, transformedData) => {
  try {
    console.log(`💾 Creating ${transformedData.length} records in table: ${tableName}`);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    // Get the Prisma model name using mapping
    const modelName = TABLE_TO_MODEL_MAPPING[tableName];
    
    if (!modelName) {
      throw new Error(`No model mapping found for table '${tableName}'`);
    }
    
    // Check if model exists in Prisma
    if (!prisma[modelName]) {
      throw new Error(`Prisma model '${modelName}' not found for table '${tableName}'`);
    }

    // Process each record
    for (let i = 0; i < transformedData.length; i++) {
      try {
        const record = transformedData[i];
        
        // Remove null/undefined values for cleaner inserts
        const cleanRecord = {};
        Object.entries(record).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            cleanRecord[key] = value;
          }
        });

        // Create record
        await prisma[modelName].create({
          data: cleanRecord
        });

        results.successful++;
        console.log(`✅ Row ${i + 1}: Created record successfully`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          data: transformedData[i],
          error: error.message
        });
        console.log(`❌ Row ${i + 1}: ${error.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error(`❌ Error creating records in ${tableName}:`, error);
    throw error;
  }
};

/**
 * GET /api/complete-excel-data/tables - Get all available tables and their field info
 */
router.get('/tables', asyncHandler(async (req, res) => {
  console.log('📋 Retrieving complete table information');

  const tables = getAllTables().map(tableName => {
    const tableInfo = getTableInfo(tableName);
    const uploadableFields = DataProcessor.getUploadableFields(tableName);
    
    return {
      name: tableName,
      displayName: tableInfo.displayName,
      totalFields: Object.keys(tableInfo.fields).length,
      uploadableFields: uploadableFields.length,
      relationships: tableInfo.relationships.length,
      fields: uploadableFields,
      sampleData: DataProcessor.generateSampleData(tableName)
    };
  });

  res.json({
    success: true,
    message: `Retrieved ${tables.length} tables with complete field information`,
    data: {
      tables,
      totalTables: tables.length,
      totalFields: tables.reduce((sum, t) => sum + t.totalFields, 0),
      totalUploadableFields: tables.reduce((sum, t) => sum + t.uploadableFields, 0)
    }
  });
}));

/**
 * GET /api/complete-excel-data/template/:tableName - Download template for specific table
 */
router.get('/template/:tableName', asyncHandler(async (req, res) => {
  const { tableName } = req.params;
  
  if (!COMPLETE_FIELD_MAPPING[tableName]) {
    throw new AppError(`Table '${tableName}' not found`, 404);
  }

  console.log(`📥 Generating template for table: ${tableName}`);

  const uploadableFields = DataProcessor.getUploadableFields(tableName);
  const sampleData = DataProcessor.generateSampleData(tableName);

  // Create template data with headers and sample row
  const templateData = [sampleData];

  // Create Excel workbook
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(templateData);
  
  // Set column widths for better readability
  ws['!cols'] = uploadableFields.map(field => ({ width: 20 }));
  
  // Add field information as comments
  uploadableFields.forEach((field, index) => {
    const cellRef = xlsx.utils.encode_cell({ r: 0, c: index });
    if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
    ws[cellRef].c = [{
      a: 'System',
      t: `${field.type} - ${field.constraint}${field.enumValues ? '\nValid values: ' + field.enumValues.join(', ') : ''}`
    }];
  });

  xlsx.utils.book_append_sheet(wb, ws, tableName);
  
  // Generate Excel file buffer
  const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  // Set response headers for download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${tableName}-upload-template.xlsx`);
  res.setHeader('Content-Length', excelBuffer.length);
  
  res.send(excelBuffer);
}));

/**
 * GET /api/complete-excel-data/template/all - Download templates for all tables
 */
router.get('/template/all', asyncHandler(async (req, res) => {
  console.log('📥 Generating complete database template with all tables');

  const wb = xlsx.utils.book_new();
  const tables = getUploadableTables();

  tables.forEach(tableName => {
    const uploadableFields = DataProcessor.getUploadableFields(tableName);
    const sampleData = DataProcessor.generateSampleData(tableName);
    
    const templateData = [sampleData];
    const ws = xlsx.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = uploadableFields.map(() => ({ width: 15 }));
    
    // Add sheet with table name
    const sheetName = tableName.length > 31 ? tableName.substring(0, 31) : tableName;
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Generate Excel file buffer
  const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=complete-database-template.xlsx');
  res.setHeader('Content-Length', excelBuffer.length);
  
  res.send(excelBuffer);
}));

/**
 * POST /api/complete-excel-data/upload - Upload and process data for any table
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  console.log('🚀 COMPLETE EXCEL DATA MANAGER: Starting comprehensive upload');

  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const filePath = req.file.path;
  const { tableName, autoDetect = 'true' } = req.body;
  
  try {
    // Parse file (supports multiple sheets)
    console.log('📊 Parsing data file...');
    const sheetsData = parseDataFile(filePath);
    
    if (Object.keys(sheetsData).length === 0) {
      throw new AppError('No data found in file', 400);
    }

    const processResults = {};
    const overallResults = {
      totalSheets: 0,
      totalRecords: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      errors: []
    };

    // Process each sheet
    for (const [sheetName, sheetData] of Object.entries(sheetsData)) {
      if (sheetData.length === 0) continue;

      console.log(`\n🔄 Processing sheet: ${sheetName} (${sheetData.length} rows)`);
      
      // Determine target table
      let targetTable = tableName;
      if (!targetTable && autoDetect === 'true') {
        targetTable = detectTableFromSheet(sheetName, sheetData);
      }

      if (!targetTable || !COMPLETE_FIELD_MAPPING[targetTable]) {
        const error = `Could not determine target table for sheet '${sheetName}'. Available tables: ${getAllTables().join(', ')}`;
        overallResults.errors.push({ sheet: sheetName, error });
        continue;
      }

      console.log(`🎯 Target table: ${targetTable}`);

      // Validate data
      console.log('✅ Validating data...');
      const validationErrors = DataProcessor.validateData(targetTable, sheetData);
      if (validationErrors.length > 0) {
        const error = `Validation failed for sheet '${sheetName}': ${validationErrors.slice(0, 5).join('; ')}${validationErrors.length > 5 ? ` (and ${validationErrors.length - 5} more)` : ''}`;
        overallResults.errors.push({ sheet: sheetName, error });
        continue;
      }

      // Transform data
      console.log('🔄 Transforming data...');
      const transformedData = [];
      const transformErrors = [];

      for (let i = 0; i < sheetData.length; i++) {
        const { transformed, errors } = DataProcessor.transformData(targetTable, sheetData[i]);
        if (errors.length > 0) {
          transformErrors.push(`Row ${i + 1}: ${errors.join(', ')}`);
        } else {
          transformedData.push(transformed);
        }
      }

      if (transformErrors.length > 0) {
        const error = `Transform errors for sheet '${sheetName}': ${transformErrors.slice(0, 5).join('; ')}${transformErrors.length > 5 ? ` (and ${transformErrors.length - 5} more)` : ''}`;
        overallResults.errors.push({ sheet: sheetName, error });
        continue;
      }

      // Insert into database
      console.log('💾 Inserting into database...');
      const insertResults = await createRecordsInDatabase(targetTable, transformedData);

      // Store results
      processResults[sheetName] = {
        targetTable,
        totalRecords: sheetData.length,
        successful: insertResults.successful,
        failed: insertResults.failed,
        errors: insertResults.errors
      };

      overallResults.totalSheets++;
      overallResults.totalRecords += sheetData.length;
      overallResults.totalSuccessful += insertResults.successful;
      overallResults.totalFailed += insertResults.failed;
      
      console.log(`✅ Sheet '${sheetName}': ${insertResults.successful} successful, ${insertResults.failed} failed`);
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log('\n📋 Complete upload summary:', overallResults);

    res.json({
      success: true,
      message: `Complete upload finished: ${overallResults.totalSuccessful}/${overallResults.totalRecords} records processed across ${overallResults.totalSheets} sheets`,
      data: {
        overall: overallResults,
        sheetResults: processResults
      }
    });

  } catch (error) {
    console.error('💥 COMPLETE UPLOAD ERROR:', error);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw new AppError(`Complete upload failed: ${error.message}`, 500);
  }
}));

/**
 * GET /api/complete-excel-data/export/:tableName - Export specific table to Excel
 */
router.get('/export/:tableName', asyncHandler(async (req, res) => {
  const { tableName } = req.params;
  
  if (!COMPLETE_FIELD_MAPPING[tableName]) {
    throw new AppError(`Table '${tableName}' not found`, 404);
  }

  console.log(`📤 Exporting table: ${tableName}`);

  try {
    // Get Prisma model name using mapping
    const modelName = TABLE_TO_MODEL_MAPPING[tableName];
    
    if (!modelName) {
      throw new AppError(`No model mapping found for table '${tableName}'`, 404);
    }
    
    if (!prisma[modelName]) {
      throw new AppError(`Prisma model '${modelName}' not found`, 404);
    }

    // Fetch all records
    const records = await prisma[modelName].findMany({
      orderBy: { createdAt: 'asc' }
    });

    if (records.length === 0) {
      throw new AppError(`No data found in table '${tableName}'`, 404);
    }

    // Create Excel workbook
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(records);
    
    // Set column widths
    const headers = Object.keys(records[0]);
    ws['!cols'] = headers.map(() => ({ width: 15 }));
    
    xlsx.utils.book_append_sheet(wb, ws, tableName);
    
    // Generate Excel file buffer
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${tableName}-export-${timestamp}.xlsx`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);

  } catch (error) {
    console.error(`❌ Export error for ${tableName}:`, error);
    throw new AppError(`Export failed: ${error.message}`, 500);
  }
}));

/**
 * Table name to Prisma model name mapping
 */
const TABLE_TO_MODEL_MAPPING = {
  'users': 'User',
  'customers': 'Customer',
  'contacts': 'Contact',
  'projects': 'Project',
  'project_team_members': 'ProjectTeamMember',
  'project_workflows': 'ProjectWorkflow',
  'workflow_steps': 'WorkflowStep',
  'workflow_subtasks': 'WorkflowSubTask',
  'workflow_step_attachments': 'WorkflowStepAttachment',
  'workflow_alerts': 'WorkflowAlert',
  'tasks': 'Task',
  'task_dependencies': 'TaskDependency',
  'documents': 'Document',
  'document_downloads': 'DocumentDownload',
  'project_messages': 'ProjectMessage',
  'conversations': 'Conversation',
  'conversation_participants': 'ConversationParticipant',
  'messages': 'Message',
  'message_reads': 'MessageRead',
  'calendar_events': 'CalendarEvent',
  'calendar_event_attendees': 'CalendarEventAttendee',
  'notifications': 'Notification',
  'project_phase_overrides': 'ProjectPhaseOverride',
  'suppressed_workflow_alerts': 'SuppressedWorkflowAlert',
  'role_assignments': 'RoleAssignment',
  'workflow_phases': 'WorkflowPhase',
  'workflow_sections': 'WorkflowSection',
  'workflow_line_items': 'WorkflowLineItem',
  'project_workflow_trackers': 'ProjectWorkflowTracker',
  'completed_workflow_items': 'CompletedWorkflowItem',
  'user_devices': 'UserDevice',
  'user_mfa': 'UserMFA',
  'security_events': 'SecurityEvent',
  'user_behavior_patterns': 'UserBehaviorPattern',
  'webauthn_credentials': 'WebAuthnCredential'
};

/**
 * GET /api/complete-excel-data/export/all - Export entire database to Excel
 */
router.get('/export/all', asyncHandler(async (req, res) => {
  console.log('📤 Exporting complete database to Excel');

  try {
    const wb = xlsx.utils.book_new();
    let totalRecords = 0;
    let exportedTables = 0;
    let failedTables = [];

    const tables = getAllTables();
    console.log(`📋 Found ${tables.length} tables to process:`, tables);

    for (const tableName of tables) {
      try {
        // Get Prisma model name using mapping
        const modelName = TABLE_TO_MODEL_MAPPING[tableName];
        console.log(`🔍 Processing ${tableName} -> ${modelName}`);
        
        if (!modelName) {
          console.log(`⚠️ Skipping ${tableName}: No model mapping found`);
          failedTables.push(`${tableName} (no model mapping)`);
          continue;
        }
        
        if (!prisma[modelName]) {
          console.log(`⚠️ Skipping ${tableName}: Prisma model '${modelName}' not found`);
          failedTables.push(`${tableName} (model '${modelName}' not found)`);
          continue;
        }

        // Fetch records
        const records = await prisma[modelName].findMany({
          orderBy: { createdAt: 'asc' }
        });

        if (records.length === 0) {
          console.log(`ℹ️ Skipping ${tableName}: No data found`);
          continue;
        }

        // Create worksheet
        const ws = xlsx.utils.json_to_sheet(records);
        
        // Set column widths
        const headers = Object.keys(records[0]);
        ws['!cols'] = headers.map(() => ({ width: 12 }));
        
        // Add sheet (truncate name if too long)
        const sheetName = tableName.length > 31 ? tableName.substring(0, 31) : tableName;
        xlsx.utils.book_append_sheet(wb, ws, sheetName);
        
        totalRecords += records.length;
        exportedTables++;
        
        console.log(`✅ Exported ${tableName}: ${records.length} records`);
      } catch (error) {
        console.error(`❌ Failed to export ${tableName}:`, error);
        failedTables.push(`${tableName} (${error.message})`);
      }
    }

    if (exportedTables === 0) {
      console.error('❌ No tables could be exported. Failed tables:', failedTables);
      throw new AppError(`No tables could be exported. Failed tables: ${failedTables.join(', ')}`, 404);
    }

    // Generate Excel file buffer
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=complete-database-export-${timestamp}.xlsx`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    console.log(`✅ Complete export: ${exportedTables} tables, ${totalRecords} total records`);
    if (failedTables.length > 0) {
      console.log(`⚠️ Failed tables: ${failedTables.join(', ')}`);
    }
    
    res.send(excelBuffer);

  } catch (error) {
    console.error('❌ Complete export error:', error);
    throw new AppError(`Complete export failed: ${error.message}`, 500);
  }
}));

/**
 * GET /api/complete-excel-data/field-info/:tableName/:fieldName - Get detailed field information
 */
router.get('/field-info/:tableName/:fieldName', asyncHandler(async (req, res) => {
  const { tableName, fieldName } = req.params;
  
  const tableInfo = getTableInfo(tableName);
  if (!tableInfo) {
    throw new AppError(`Table '${tableName}' not found`, 404);
  }

  const fieldConfig = tableInfo.fields[fieldName];
  if (!fieldConfig) {
    throw new AppError(`Field '${fieldName}' not found in table '${tableName}'`, 404);
  }

  res.json({
    success: true,
    data: {
      table: tableName,
      field: fieldName,
      config: fieldConfig,
      sampleValue: DataProcessor.generateSampleData(tableName)[fieldName]
    }
  });
}));

module.exports = router;