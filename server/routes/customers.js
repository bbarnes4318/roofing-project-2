const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
const { prisma } = require('../config/prisma');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
// Make cacheService optional to prevent crashes
let cacheService;
try {
  const redisModule = require('../config/redis');
  cacheService = redisModule.cacheService;
} catch (error) {
  console.log('Cache service not available, continuing without caching');
  cacheService = null;
}

const router = express.Router();

// **CRITICAL: Data transformation layer for frontend compatibility**
const transformCustomerForFrontend = (customer) => {
  if (!customer) return null;
  
  return {
    // Keep both ID formats for compatibility
    id: customer.id,
    _id: customer.id,
    
    // Primary customer info - map to simple name/email/phone for compatibility
    name: customer.primaryName,
    email: customer.primaryEmail,
    phone: customer.primaryPhone,
    
    // Full customer structure
    primaryName: customer.primaryName,
    primaryEmail: customer.primaryEmail,
    primaryPhone: customer.primaryPhone,
    secondaryName: customer.secondaryName,
    secondaryEmail: customer.secondaryEmail,
    secondaryPhone: customer.secondaryPhone,
    primaryContact: customer.primaryContact,
    
    // Address
    address: customer.address,
    
    // Additional fields
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    
    // Associated projects (if included)
    associatedProjects: customer.projects ? customer.projects.map(project => ({
      id: project.id,
      _id: project.id,
      projectId: project.projectNumber?.toString() || project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget ? parseFloat(project.budget) : 0,
      progress: project.progress || 0,
      projectType: project.projectType
    })) : []
  };
};

// Validation rules for creating customers
const customerValidation = [
  body('primaryName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Primary customer name must be between 2 and 100 characters'),
  body('primaryEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid primary email address'),
  body('primaryPhone')
    .trim()
    .optional({ checkFalsy: true })
    .matches(/^[\+]?[\d\s\-\(\)\.]{6,25}$/)
    .withMessage('Please provide a valid primary phone number'),
  body('secondaryName')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Secondary customer name must be between 2 and 100 characters'),
  body('secondaryEmail')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid secondary email address'),
  body('secondaryPhone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[\+]?[\d\s\-\(\)\.]{6,25}$/)
    .withMessage('Please provide a valid secondary phone number'),
  body('primaryContact')
    .optional()
    .isIn(['PRIMARY', 'SECONDARY'])
    .withMessage('Primary contact must be PRIMARY or SECONDARY'),
  body('address')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters')
];

// Validation rules for updating customers (more lenient)
const customerUpdateValidation = [
  body('primaryName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Primary customer name must be between 2 and 100 characters'),
  body('primaryEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid primary email address'),
  body('primaryPhone')
    .optional()
    .trim()
    .matches(/^[\+]?[\d\s\-\(\)\.]{6,25}$/)
    .withMessage('Please provide a valid primary phone number'),
  body('secondaryName')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Secondary customer name must be between 2 and 100 characters'),
  body('secondaryEmail')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid secondary email address'),
  body('secondaryPhone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[\+]?[\d\s\-\(\)\.]{6,25}$/)
    .withMessage('Please provide a valid secondary phone number'),
  body('primaryContact')
    .optional()
    .isIn(['PRIMARY', 'SECONDARY'])
    .withMessage('Primary contact must be PRIMARY or SECONDARY'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters')
];

// Legacy validation for backward compatibility
const legacyCustomerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .trim()
    .matches(/^[\+]?[\d\s\-\(\)\.]{6,25}$/)
    .withMessage('Please provide a valid phone number'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters')
];

// @desc    Get all customers with filtering and pagination
// @route   GET /api/customers
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { 
    search, 
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    withProjects = false
  } = req.query;

  // Build filter object for Prisma
  let where = {};
  
  // Add search functionality
  if (search) {
    where.OR = [
      { primaryName: { contains: search, mode: 'insensitive' } },
      { primaryEmail: { contains: search, mode: 'insensitive' } },
      { primaryPhone: { contains: search, mode: 'insensitive' } },
      { secondaryName: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const orderBy = {};
  orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';

  console.log('🔍 CUSTOMERS: Starting query with params:', { search, page, limit, sortBy, sortOrder, withProjects });
  console.log('🔍 CUSTOMERS: Where clause:', where);
  
  try {
    // Execute query with pagination using Prisma
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          ...(withProjects === 'true' ? {
            projects: {
              select: {
                id: true,
                projectNumber: true,
                projectName: true,
                status: true,
                startDate: true,
                endDate: true,
                budget: true,
                progress: true,
                projectType: true
              }
            }
          } : {})
        }
      }),
      prisma.customer.count({ where })
    ]);

    console.log(`🔍 CUSTOMERS: Found ${customers.length} customers from database`);
    
    // Transform customers for frontend compatibility
    let transformedCustomers;
    try {
      transformedCustomers = customers.map(transformCustomerForFrontend);
      console.log(`✅ CUSTOMERS: Transformed ${transformedCustomers.length} customers successfully`);
    } catch (transformError) {
      console.error('❌ CUSTOMERS: Error transforming customers:', transformError);
      throw new AppError(`Failed to transform customer data: ${transformError.message}`, 500);
    }

    sendPaginatedResponse(res, transformedCustomers, pageNum, limitNum, total, 'Customers retrieved successfully');
  } catch (error) {
    console.error('Error fetching customers:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    // Return empty array on error to prevent frontend breaking
    sendPaginatedResponse(res, [], pageNum, limitNum, 0, 'Unable to fetch customers at this time');
  }
}));

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        projects: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            status: true,
            startDate: true,
            endDate: true,
            budget: true,
            progress: true,
            projectType: true
          }
        }
      }
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Transform customer for frontend compatibility
    const transformedCustomer = transformCustomerForFrontend(customer);

    sendSuccess(res, transformedCustomer, 'Customer retrieved successfully');
  } catch (error) {
    console.error('Error fetching customer:', error);
    return next(new AppError('Failed to fetch customer', 500));
  }
}));

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
router.post('/', asyncHandler(async (req, res, next) => {
  // Clean null/empty values before validation
  if (req.body.secondaryName === null || req.body.secondaryName === '') {
    delete req.body.secondaryName;
  }
  if (req.body.secondaryEmail === null || req.body.secondaryEmail === '') {
    delete req.body.secondaryEmail;
  }
  if (req.body.secondaryPhone === null || req.body.secondaryPhone === '') {
    delete req.body.secondaryPhone;
  }
  
  // Run validation after cleaning
  await Promise.all(customerValidation.map(validation => validation.run(req)));
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }
  try {
    // Handle both new format (primaryName, primaryEmail, etc.) and legacy format (name, email, phone)
    let customerData = {};
    
    if (req.body.primaryName || req.body.primaryEmail) {
      // New format - validation already done by express-validator
      customerData = {
        primaryName: req.body.primaryName,
        primaryEmail: req.body.primaryEmail,
        primaryPhone: req.body.primaryPhone || '555-555-5555', // Default phone if not provided
        secondaryName: req.body.secondaryName || null,
        secondaryEmail: req.body.secondaryEmail || null,
        secondaryPhone: req.body.secondaryPhone || null,
        primaryContact: req.body.primaryContact || 'PRIMARY',
        address: req.body.address || 'No address provided',
        notes: req.body.notes || null
      };
    } else {
      // Legacy format - map to new schema
      customerData = {
        primaryName: req.body.name,
        primaryEmail: req.body.email,
        primaryPhone: req.body.phone || '555-555-5555',
        secondaryName: null,
        secondaryEmail: null,
        secondaryPhone: null,
        primaryContact: 'PRIMARY',
        address: req.body.address || 'No address provided',
        notes: req.body.notes || null
      };
    }

    // Check if customer with this email already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { primaryEmail: customerData.primaryEmail }
    });

    if (existingCustomer) {
      return next(new AppError('Customer with this email already exists', 400));
    }

    // Create customer with contacts if provided
    const createData = {
      data: customerData
    };

    // Contacts are now stored directly in the Customer model fields (primaryName, secondaryName, etc.)
    // No separate Contact table needed

    const customer = await prisma.customer.create(createData);

    // Transform customer for frontend compatibility
    const transformedCustomer = transformCustomerForFrontend(customer);

    // Invalidate cache for customers (optional)
    if (cacheService) {
      await cacheService.invalidateRelated('customer', customer.id);
    }
    
    sendSuccess(res, 201, transformedCustomer, 'Customer created successfully');
  } catch (error) {
    console.error('Error creating customer:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta,
      stack: error.stack
    });
    if (error.code === 'P2002') {
      return next(new AppError('Customer with this email already exists', 400));
    }
    return next(new AppError(`Failed to create customer: ${error.message}`, 500));
  }
}));

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
router.put('/:id', customerUpdateValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }
  try {
    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: req.params.id }
    });

    if (!existingCustomer) {
      return next(new AppError('Customer not found', 404));
    }

    // Prepare update data
    let updateData = {};
    
    // Handle both new format and legacy format
    if (req.body.primaryName || req.body.primaryEmail) {
      // New format
      if (req.body.primaryName !== undefined) updateData.primaryName = req.body.primaryName;
      if (req.body.primaryEmail !== undefined) updateData.primaryEmail = req.body.primaryEmail;
      if (req.body.primaryPhone !== undefined) updateData.primaryPhone = req.body.primaryPhone;
      if (req.body.secondaryName !== undefined) updateData.secondaryName = req.body.secondaryName;
      if (req.body.secondaryEmail !== undefined) updateData.secondaryEmail = req.body.secondaryEmail;
      if (req.body.secondaryPhone !== undefined) updateData.secondaryPhone = req.body.secondaryPhone;
      if (req.body.primaryContact !== undefined) updateData.primaryContact = req.body.primaryContact;
    } else {
      // Legacy format - map to new schema
      if (req.body.name !== undefined) updateData.primaryName = req.body.name;
      if (req.body.email !== undefined) updateData.primaryEmail = req.body.email;
      if (req.body.phone !== undefined) updateData.primaryPhone = req.body.phone;
    }
    
    if (req.body.address !== undefined) updateData.address = req.body.address;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    // Check for email conflicts if email is being updated
    if (updateData.primaryEmail && updateData.primaryEmail !== existingCustomer.primaryEmail) {
      const emailConflict = await prisma.customer.findUnique({
        where: { primaryEmail: updateData.primaryEmail }
      });
      if (emailConflict) {
        return next(new AppError('Customer with this email already exists', 400));
      }
    }

    // Update customer
    console.log('Updating customer with data:', updateData);
    const updatedCustomer = await prisma.customer.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Transform customer for frontend compatibility
    const transformedCustomer = transformCustomerForFrontend(updatedCustomer);

    // Invalidate cache for customers (optional)
    if (cacheService) {
      await cacheService.invalidateRelated('customer', req.params.id);
    }
    
    sendSuccess(res, transformedCustomer, 'Customer updated successfully');
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.code === 'P2002') {
      return next(new AppError('Customer with this email already exists', 400));
    }
    return next(new AppError('Failed to update customer', 500));
  }
}));

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        projects: true
      }
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Check if customer has associated projects
    if (customer.projects && customer.projects.length > 0) {
      return next(new AppError('Cannot delete customer with associated projects. Delete or reassign projects first.', 400));
    }

    // Delete customer
    await prisma.customer.delete({
      where: { id: req.params.id }
    });

    // Invalidate cache for customers (optional)
    if (cacheService) {
      await cacheService.invalidateRelated('customer', req.params.id);
    }
    
    sendSuccess(res, null, 'Customer deleted successfully');
  } catch (error) {
    console.error('Error deleting customer:', error);
    return next(new AppError('Failed to delete customer', 500));
  }
}));

// @desc    Get customer statistics
// @route   GET /api/customers/stats/overview
// @access  Private
router.get('/stats/overview', asyncHandler(async (req, res) => {
  try {
    const totalCustomers = await prisma.customer.count();
    
    const customersWithSecondary = await prisma.customer.count({
      where: {
        secondaryName: { not: null }
      }
    });
    
    const primaryContactStats = await prisma.customer.groupBy({
      by: ['primaryContact'],
      _count: {
        primaryContact: true
      }
    });
    
    const recentCustomers = await prisma.customer.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const overview = {
      totalCustomers,
      customersWithSecondary,
      customersWithPrimaryOnly: totalCustomers - customersWithSecondary,
      recentCustomers,
      primaryContactDistribution: primaryContactStats
    };

    sendSuccess(res, overview, 'Customer statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching customer statistics:', error);
    throw new AppError('Failed to fetch customer statistics', 500);
  }
}));

// @desc    Search customers
// @route   GET /api/customers/search
// @access  Private
router.get('/search', asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { primaryName: { contains: q.trim(), mode: 'insensitive' } },
          { primaryEmail: { contains: q.trim(), mode: 'insensitive' } },
          { primaryPhone: { contains: q.trim(), mode: 'insensitive' } },
          { secondaryName: { contains: q.trim(), mode: 'insensitive' } },
          { address: { contains: q.trim(), mode: 'insensitive' } }
        ]
      },
      take: parseInt(limit),
      select: {
        id: true,
        primaryName: true,
        primaryEmail: true,
        primaryPhone: true,
        secondaryName: true,
        address: true,
        createdAt: true
      }
    });

    // Transform customers for frontend compatibility
    const transformedCustomers = customers.map(transformCustomerForFrontend);

    sendSuccess(res, { customers: transformedCustomers }, 'Search results retrieved successfully');
  } catch (error) {
    console.error('Error searching customers:', error);
    throw new AppError('Failed to search customers', 500);
  }
}));

// Configure multer for customer CSV uploads
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
    cb(null, `customer-import-${timestamp}${ext}`);
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

// @desc    Import customers from CSV/Excel
// @route   POST /api/customers/import
// @access  Private
router.post('/import', upload.single('file'), asyncHandler(async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    console.log('📁 Processing customer import file:', req.file.filename);
    
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let customers = [];

    // Parse file based on extension
    if (fileExt === '.csv') {
      // Parse CSV
      const results = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
      customers = results;
    } else if (fileExt === '.xlsx') {
      // Parse Excel
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      customers = xlsx.utils.sheet_to_json(worksheet);
    }

    console.log(`📊 Parsed ${customers.length} customer records from file`);

    const results = {
      total: customers.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Process each customer
    for (let i = 0; i < customers.length; i++) {
      const customerData = customers[i];
      
      try {
        // Validate required fields
        if (!customerData.primaryName || !customerData.primaryEmail || !customerData.address) {
          throw new Error('Missing required fields: primaryName, primaryEmail, or address');
        }

        // Prepare customer data for database
        const customer = {
          primaryName: customerData.primaryName.trim(),
          primaryEmail: customerData.primaryEmail.trim().toLowerCase(),
          primaryPhone: customerData.primaryPhone?.trim() || '',
          secondaryName: customerData.secondaryName?.trim() || null,
          secondaryEmail: customerData.secondaryEmail?.trim().toLowerCase() || null,
          secondaryPhone: customerData.secondaryPhone?.trim() || null,
          primaryContact: customerData.primaryContact?.toUpperCase() === 'SECONDARY' ? 'SECONDARY' : 'PRIMARY',
          address: customerData.address.trim(),
          notes: customerData.notes?.trim() || null
        };

        // Check for duplicate email
        const existingCustomer = await prisma.customer.findUnique({
          where: { primaryEmail: customer.primaryEmail }
        });

        if (existingCustomer) {
          throw new Error(`Customer with email ${customer.primaryEmail} already exists`);
        }

        // Create customer
        await prisma.customer.create({
          data: customer
        });

        results.successful++;
        console.log(`✅ Customer ${i + 1}/${customers.length}: ${customer.primaryName} created`);

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          data: customerData,
          error: error.message
        });
        console.log(`❌ Customer ${i + 1}/${customers.length}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log('📋 Customer import completed:', results);

    // Invalidate cache
    if (cacheService) {
      await cacheService.invalidatePattern('customers:*');
    }

    // Return results
    res.json({
      success: true,
      message: `Customer import completed: ${results.successful} successful, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('❌ Customer import error:', error);
    return next(new AppError('Failed to import customers: ' + error.message, 500));
  }
}));

// @desc    Download customer CSV template
// @route   GET /api/customers/template
// @access  Private
router.get('/template', asyncHandler(async (req, res) => {
  try {
    const templatePath = path.join(__dirname, '../../public/templates/customer_upload_template.csv');
    
    if (!fs.existsSync(templatePath)) {
      throw new AppError('Template file not found', 404);
    }

    res.download(templatePath, 'customer_upload_template.csv');
  } catch (error) {
    console.error('Error downloading customer template:', error);
    throw new AppError('Failed to download template', 500);
  }
}));

module.exports = router; 