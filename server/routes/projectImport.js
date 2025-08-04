const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
    cb(null, `project-import-${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  }
});

/**
 * Parse CSV file and extract project data
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
 * Parse Excel file and extract project data
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
 * Validate required project fields
 */
const validateProjectData = (projectData) => {
  const requiredFields = ['customerName', 'projectAddress'];
  const errors = [];

  if (!Array.isArray(projectData) || projectData.length === 0) {
    return ['No project data found in file'];
  }

  projectData.forEach((project, index) => {
    requiredFields.forEach(field => {
      if (!project[field] || project[field].toString().trim() === '') {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      }
    });
  });

  return errors;
};

/**
 * Create project with workflow assignment
 */
const createProjectWithWorkflow = async (projectData, workflowTemplateId) => {
  try {
    // Get the workflow template
    const workflowTemplate = await prisma.workflowTemplate.findUnique({
      where: { id: workflowTemplateId },
      include: { steps: true }
    });

    if (!workflowTemplate) {
      throw new Error(`Workflow template not found: ${workflowTemplateId}`);
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        projectNumber: projectData.projectNumber || `PROJ-${Date.now()}`,
        customerName: projectData.customerName,
        customerEmail: projectData.customerEmail || '',
        customerPhone: projectData.customerPhone || '',
        projectAddress: projectData.projectAddress,
        city: projectData.city || '',
        state: projectData.state || '',
        zipCode: projectData.zipCode || '',
        projectType: projectData.projectType || 'Roofing',
        projectValue: parseFloat(projectData.projectValue) || 0,
        notes: projectData.notes || '',
        status: 'ACTIVE',
        phase: 'LEAD',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create workflow instance for the project
    const workflow = await prisma.workflow.create({
      data: {
        projectId: project.id,
        templateId: workflowTemplateId,
        name: workflowTemplate.name,
        phase: 'LEAD',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create workflow steps from template
    const workflowSteps = await Promise.all(
      workflowTemplate.steps.map(async (templateStep, index) => {
        return await prisma.workflowStep.create({
          data: {
            workflowId: workflow.id,
            stepName: templateStep.stepName,
            description: templateStep.description || '',
            phase: templateStep.phase,
            orderIndex: templateStep.orderIndex || index,
            isCompleted: false,
            estimatedDuration: templateStep.estimatedDuration || 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      })
    );

    // Set the first step as active
    if (workflowSteps.length > 0) {
      await prisma.workflowStep.update({
        where: { id: workflowSteps[0].id },
        data: { 
          actualStartDate: new Date(),
          updatedAt: new Date()
        }
      });
    }

    return {
      project,
      workflow,
      stepsCreated: workflowSteps.length
    };

  } catch (error) {
    console.error('Error creating project with workflow:', error);
    throw error;
  }
};

/**
 * GET /api/project-import/templates - Get available workflow templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        phases: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: templates,
      message: 'Workflow templates retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Failed to fetch workflow templates'
    });
  }
});

/**
 * POST /api/project-import/upload - Import projects from file
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No file uploaded'
      });
    }

    const { workflowTemplateId } = req.body;
    
    if (!workflowTemplateId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Workflow template ID is required'
      });
    }

    filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    // Parse the file based on extension
    let projectData;
    if (fileExt === '.csv') {
      projectData = await parseCSVFile(filePath);
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      projectData = parseExcelFile(filePath);
    } else {
      throw new Error('Unsupported file format');
    }

    // Validate the data
    const validationErrors = validateProjectData(projectData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        data: { errors: validationErrors },
        message: 'Validation failed'
      });
    }

    // Create projects with workflows
    const results = {
      successful: [],
      failed: [],
      total: projectData.length
    };

    for (let i = 0; i < projectData.length; i++) {
      try {
        const result = await createProjectWithWorkflow(projectData[i], workflowTemplateId);
        results.successful.push({
          row: i + 1,
          projectNumber: result.project.projectNumber,
          customerName: result.project.customerName,
          projectId: result.project.id,
          workflowId: result.workflow.id,
          stepsCreated: result.stepsCreated
        });
      } catch (error) {
        results.failed.push({
          row: i + 1,
          data: projectData[i],
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      data: results,
      message: `Import completed: ${results.successful.length} successful, ${results.failed.length} failed`
    });

  } catch (error) {
    console.error('Error importing projects:', error);
    
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({
      success: false,
      data: null,
      message: `Import failed: ${error.message}`
    });
  }
});

/**
 * GET /api/project-import/sample - Download sample CSV template
 */
router.get('/sample', (req, res) => {
  const sampleData = [
    {
      projectNumber: 'PROJ-2024-001',
      customerName: 'John Smith',
      customerEmail: 'john.smith@email.com',
      customerPhone: '(555) 123-4567',
      projectAddress: '123 Main Street',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      projectType: 'Roofing',
      projectValue: '15000',
      notes: 'Standard roof replacement'
    },
    {
      projectNumber: 'PROJ-2024-002',
      customerName: 'Jane Doe',
      customerEmail: 'jane.doe@email.com',
      customerPhone: '(555) 987-6543',
      projectAddress: '456 Oak Avenue',
      city: 'Somewhere',
      state: 'TX',
      zipCode: '67890',
      projectType: 'Repair',
      projectValue: '5000',
      notes: 'Storm damage repair'
    }
  ];

  const csv = [
    Object.keys(sampleData[0]).join(','),
    ...sampleData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="project-import-sample.csv"');
  res.send(csv);
});

module.exports = router;