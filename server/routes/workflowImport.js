const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler, 
  sendSuccess, 
  AppError 
} = require('../middleware/errorHandler');
const { workflowStructure } = require('../utils/workflowMapping');

const router = express.Router();

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file format. Only ${allowedExtensions.join(', ')} files are allowed.`));
    }
  }
});

// Required headers for workflow import
const REQUIRED_HEADERS = ['phase', 'section', 'line_item'];
const OPTIONAL_HEADERS = ['description', 'responsible_role', 'estimated_duration', 'alert_priority', 'dependencies'];

/**
 * Validate headers in the uploaded file
 */
const validateHeaders = (headers) => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const missingHeaders = [];
  
  REQUIRED_HEADERS.forEach(required => {
    if (!normalizedHeaders.includes(required)) {
      // Check for variations
      const variations = [
        required,
        required.replace('_', ' '),
        required.replace('_', ''),
        required.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      ];
      
      const found = variations.some(variation => 
        normalizedHeaders.some(h => h === variation.toLowerCase().replace(/\s+/g, '_'))
      );
      
      if (!found) {
        missingHeaders.push(required.replace('_', ' ').toUpperCase());
      }
    }
  });
  
  if (missingHeaders.length > 0) {
    throw new AppError(
      `Missing required headers: ${missingHeaders.join(', ')}. ` +
      `Please ensure your file contains columns for: Phase, Section, and Line Item.`,
      400
    );
  }
  
  return normalizedHeaders;
};

/**
 * Parse Excel file
 */
const parseExcelFile = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false 
    });
    
    if (data.length < 2) {
      throw new AppError('File is empty or contains only headers', 400);
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return { headers, rows };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to parse Excel file: ${error.message}`, 400);
  }
};

/**
 * Parse CSV file
 */
const parseCsvFile = (filePath) => {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });
    
    if (records.length < 2) {
      throw new AppError('File is empty or contains only headers', 400);
    }
    
    const headers = records[0];
    const rows = records.slice(1);
    
    return { headers, rows };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to parse CSV file: ${error.message}`, 400);
  }
};

/**
 * Map row data to workflow structure
 */
const mapRowToWorkflowData = (row, headers) => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const data = {};
  
  // Map each header to its value
  normalizedHeaders.forEach((header, index) => {
    data[header] = row[index];
  });
  
  // Extract required fields
  const phase = data.phase || data.project_phase || '';
  const section = data.section || data.workflow_section || '';
  const lineItem = data.line_item || data.lineitem || data.task || '';
  
  // Validate required fields are not empty
  if (!phase || !section || !lineItem) {
    return {
      isValid: false,
      error: `Missing data: Phase="${phase}", Section="${section}", Line Item="${lineItem}"`
    };
  }
  
  // Normalize phase to match enum values
  const normalizedPhase = normalizePhase(phase);
  
  return {
    isValid: true,
    data: {
      phase: normalizedPhase,
      section: section.trim(),
      lineItem: lineItem.trim(),
      description: data.description || '',
      responsibleRole: normalizeResponsibleRole(data.responsible_role || data.responsible || 'OFFICE'),
      estimatedDuration: parseInt(data.estimated_duration || data.duration || '1') || 1,
      alertPriority: normalizeAlertPriority(data.alert_priority || data.priority || 'MEDIUM'),
      dependencies: data.dependencies ? data.dependencies.split(',').map(d => d.trim()) : []
    }
  };
};

/**
 * Normalize phase name to match database enum
 */
const normalizePhase = (phase) => {
  const phaseStr = phase.toString().toUpperCase().trim();
  
  const phaseMap = {
    'LEAD': 'LEAD',
    'PROSPECT': 'PROSPECT',
    'APPROVED': 'APPROVED',
    'EXECUTION': 'EXECUTION',
    'SUPPLEMENT': 'SUPPLEMENT',
    '2ND_SUPP': 'SUPPLEMENT',
    'SECOND_SUPPLEMENT': 'SUPPLEMENT',
    '2ND SUPPLEMENT': 'SUPPLEMENT',
    'COMPLETION': 'COMPLETION',
    'COMPLETE': 'COMPLETION'
  };
  
  return phaseMap[phaseStr] || 'LEAD';
};

/**
 * Normalize responsible role to match database enum
 */
const normalizeResponsibleRole = (role) => {
  const roleStr = role.toString().toUpperCase().trim();
  
  const roleMap = {
    'OFFICE': 'OFFICE',
    'ADMIN': 'ADMINISTRATION',
    'ADMINISTRATION': 'ADMINISTRATION',
    'PM': 'PROJECT_MANAGER',
    'PROJECT_MANAGER': 'PROJECT_MANAGER',
    'PROJECT MANAGER': 'PROJECT_MANAGER',
    'FIELD': 'FIELD_DIRECTOR',
    'FIELD_DIRECTOR': 'FIELD_DIRECTOR',
    'FIELD DIRECTOR': 'FIELD_DIRECTOR',
    'ROOF': 'ROOF_SUPERVISOR',
    'ROOF_SUPERVISOR': 'ROOF_SUPERVISOR',
    'ROOF SUPERVISOR': 'ROOF_SUPERVISOR'
  };
  
  return roleMap[roleStr] || 'OFFICE';
};

/**
 * Normalize alert priority to match database enum
 */
const normalizeAlertPriority = (priority) => {
  const priorityStr = priority.toString().toUpperCase().trim();
  
  const priorityMap = {
    'LOW': 'LOW',
    'MEDIUM': 'MEDIUM',
    'MED': 'MEDIUM',
    'HIGH': 'HIGH'
  };
  
  return priorityMap[priorityStr] || 'MEDIUM';
};

// @desc    Upload and parse workflow file
// @route   POST /api/workflow-import/upload
// @access  Private
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }
  
  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  
  try {
    let parsedData;
    
    // Parse file based on extension
    if (fileExt === '.csv') {
      parsedData = parseCsvFile(filePath);
    } else {
      parsedData = parseExcelFile(filePath);
    }
    
    const { headers, rows } = parsedData;
    
    // Validate headers
    validateHeaders(headers);
    
    // Process rows and validate data
    const processedRows = [];
    const errors = [];
    
    rows.forEach((row, index) => {
      const result = mapRowToWorkflowData(row, headers);
      
      if (result.isValid) {
        processedRows.push({
          rowNumber: index + 2, // +2 for header row and 0-index
          ...result.data
        });
      } else {
        errors.push({
          rowNumber: index + 2,
          error: result.error
        });
      }
    });
    
    // Store parsed data in session/cache for preview
    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For now, we'll store in memory (in production, use Redis or database)
    global.workflowImports = global.workflowImports || {};
    global.workflowImports[importId] = {
      fileName: req.file.originalname,
      headers,
      processedRows,
      errors,
      createdAt: new Date(),
      userId: req.user?.id || 'demo-user'
    };
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    // Return preview data
    sendSuccess(res, {
      importId,
      fileName: req.file.originalname,
      totalRows: rows.length,
      validRows: processedRows.length,
      errorRows: errors.length,
      headers,
      preview: processedRows.slice(0, 10), // First 10 rows for preview
      errors: errors.slice(0, 10), // First 10 errors
      summary: {
        phases: [...new Set(processedRows.map(r => r.phase))],
        sections: [...new Set(processedRows.map(r => r.section))].length,
        lineItems: processedRows.length
      }
    }, 'File uploaded and parsed successfully');
    
  } catch (error) {
    // Clean up uploaded file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
}));

// @desc    Get import preview data
// @route   GET /api/workflow-import/preview/:importId
// @access  Private
router.get('/preview/:importId', asyncHandler(async (req, res) => {
  const { importId } = req.params;
  
  if (!global.workflowImports || !global.workflowImports[importId]) {
    throw new AppError('Import session not found or expired', 404);
  }
  
  const importData = global.workflowImports[importId];
  
  sendSuccess(res, {
    importId,
    fileName: importData.fileName,
    headers: importData.headers,
    rows: importData.processedRows,
    errors: importData.errors,
    summary: {
      totalRows: importData.processedRows.length + importData.errors.length,
      validRows: importData.processedRows.length,
      errorRows: importData.errors.length,
      phases: [...new Set(importData.processedRows.map(r => r.phase))],
      sections: [...new Set(importData.processedRows.map(r => r.section))].length,
      lineItems: importData.processedRows.length
    }
  }, 'Import preview retrieved successfully');
}));

// @desc    Confirm and execute workflow import
// @route   POST /api/workflow-import/confirm/:importId
// @access  Private
router.post('/confirm/:importId', asyncHandler(async (req, res) => {
  const { importId } = req.params;
  const { projectId, startingPhase, clearExisting = false } = req.body;
  
  if (!global.workflowImports || !global.workflowImports[importId]) {
    throw new AppError('Import session not found or expired', 404);
  }
  
  if (!projectId) {
    throw new AppError('Project ID is required', 400);
  }
  
  const importData = global.workflowImports[importId];
  
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workflow: true }
    });
    
    if (!project) {
      throw new AppError('Project not found', 404);
    }
    
    // Create or get workflow
    let workflow;
    if (project.workflow) {
      workflow = project.workflow;
      
      // Clear existing steps if requested
      if (clearExisting) {
        await prisma.workflowStep.deleteMany({
          where: { workflowId: workflow.id }
        });
      }
    } else {
      workflow = await prisma.projectWorkflow.create({
        data: {
          projectId: project.id,
          status: 'NOT_STARTED',
          overallProgress: 0,
          currentStepIndex: 0,
          enableAlerts: true,
          alertMethods: ['IN_APP', 'EMAIL'],
          escalationEnabled: true,
          escalationDelayDays: 2
        }
      });
    }
    
    // Group rows by phase and section
    const groupedData = {};
    importData.processedRows.forEach(row => {
      if (!groupedData[row.phase]) {
        groupedData[row.phase] = {};
      }
      if (!groupedData[row.phase][row.section]) {
        groupedData[row.phase][row.section] = [];
      }
      groupedData[row.phase][row.section].push(row);
    });
    
    // Create workflow steps
    const createdSteps = [];
    let stepIndex = 0;
    
    for (const [phase, sections] of Object.entries(groupedData)) {
      // Skip phases before starting phase if specified
      if (startingPhase && phase !== startingPhase && 
          Object.keys(groupedData).indexOf(phase) < Object.keys(groupedData).indexOf(startingPhase)) {
        continue;
      }
      
      for (const [section, lineItems] of Object.entries(sections)) {
        stepIndex++;
        
        // Create main workflow step for this section
        const step = await prisma.workflowStep.create({
          data: {
            workflowId: workflow.id,
            stepId: `${phase.toLowerCase()}_${stepIndex}`,
            stepName: section,
            description: `${section} - ${phase} Phase`,
            phase: phase,
            defaultResponsible: lineItems[0].responsibleRole,
            estimatedDuration: Math.max(...lineItems.map(l => l.estimatedDuration)),
            alertPriority: lineItems[0].alertPriority,
            alertDays: 1,
            overdueIntervals: [1, 3, 7, 14],
            isCompleted: false
          }
        });
        
        // Create subtasks for line items
        const subTasks = [];
        for (let i = 0; i < lineItems.length; i++) {
          const lineItem = lineItems[i];
          const subTask = await prisma.workflowSubTask.create({
            data: {
              stepId: step.id,
              subTaskId: `${step.stepId}_subtask_${i + 1}`,
              subTaskName: lineItem.lineItem,
              description: lineItem.description || null,
              isCompleted: false
            }
          });
          subTasks.push(subTask);
        }
        
        createdSteps.push({
          ...step,
          subTasks
        });
      }
    }
    
    // Update workflow status
    await prisma.projectWorkflow.update({
      where: { id: workflow.id },
      data: {
        status: 'IN_PROGRESS',
        workflowStartDate: new Date()
      }
    });
    
    // CRITICAL: Trigger alert generation for the newly created workflow
    console.log(`🚨 WORKFLOW IMPORT: Triggering alert generation for project ${project.id}`);
    try {
      const WorkflowAlertService = require('../services/WorkflowAlertService');
      const alerts = await WorkflowAlertService.checkAlertsForProject(project.id);
      console.log(`✅ WORKFLOW IMPORT: Generated ${alerts.length} alerts for imported workflow`);
    } catch (alertError) {
      console.error('❌ WORKFLOW IMPORT: Error generating alerts:', alertError);
      // Don't fail the import if alert generation fails
    }
    
    // Clean up import data
    delete global.workflowImports[importId];
    
    sendSuccess(res, {
      projectId: project.id,
      workflowId: workflow.id,
      imported: {
        steps: createdSteps.length,
        subTasks: createdSteps.reduce((sum, step) => sum + step.subTasks.length, 0),
        phases: [...new Set(createdSteps.map(s => s.phase))],
        sections: createdSteps.map(s => s.stepName)
      },
      message: 'Workflow imported successfully'
    }, 'Workflow imported successfully', 201);
    
  } catch (error) {
    console.error('Error importing workflow:', error);
    throw new AppError(`Failed to import workflow: ${error.message}`, 500);
  }
}));

// @desc    Download workflow template
// @route   GET /api/workflow-import/template
// @access  Private
router.get('/template', (req, res) => {
  const { format = 'xlsx' } = req.query;
  
  // Create sample data
  const templateData = [
    ['Phase', 'Section', 'Line Item', 'Description', 'Responsible Role', 'Estimated Duration', 'Alert Priority'],
    ['LEAD', 'Input Customer Information', 'Make sure the name is spelled correctly', 'Verify customer name accuracy', 'OFFICE', '1', 'MEDIUM'],
    ['LEAD', 'Input Customer Information', 'Make sure the email is correct', 'Verify and confirm email address', 'OFFICE', '1', 'HIGH'],
    ['LEAD', 'Complete Questions Checklist', 'Input answers from Question Checklist', 'Record all questionnaire responses', 'OFFICE', '2', 'MEDIUM'],
    ['PROSPECT', 'Site Inspection', 'Take site photos', 'Capture comprehensive site imagery', 'PROJECT_MANAGER', '1', 'HIGH'],
    ['PROSPECT', 'Site Inspection', 'Complete inspection form', 'Fill out detailed inspection report', 'PROJECT_MANAGER', '2', 'HIGH'],
    ['APPROVED', 'Administrative Setup', 'Confirm shingle choice', 'Verify customer shingle selection', 'ADMINISTRATION', '1', 'MEDIUM'],
    ['EXECUTION', 'Installation', 'Document work start', 'Record project commencement', 'FIELD_DIRECTOR', '1', 'HIGH'],
    ['COMPLETION', 'Project Closeout', 'Final inspection completed', 'Conduct final quality check', 'ADMINISTRATION', '2', 'HIGH']
  ];
  
  if (format === 'csv') {
    // Generate CSV
    const csvContent = templateData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="workflow_template.csv"');
    res.send(csvContent);
  } else {
    // Generate Excel
    const ws = xlsx.utils.aoa_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Workflow Template');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="workflow_template.xlsx"');
    res.send(buffer);
  }
});

// @desc    Cancel import session
// @route   DELETE /api/workflow-import/cancel/:importId
// @access  Private
router.delete('/cancel/:importId', asyncHandler(async (req, res) => {
  const { importId } = req.params;
  
  if (global.workflowImports && global.workflowImports[importId]) {
    delete global.workflowImports[importId];
  }
  
  sendSuccess(res, null, 'Import session cancelled');
}));

module.exports = router;