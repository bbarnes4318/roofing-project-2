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
    primaryEmailType: customer.primaryEmailType,
    primaryPhone: customer.primaryPhone,
    primaryPhoneType: customer.primaryPhoneType,
    secondaryName: customer.secondaryName,
    secondaryEmail: customer.secondaryEmail,
    secondaryEmailType: customer.secondaryEmailType,
    secondaryPhone: customer.secondaryPhone,
    secondaryPhoneType: customer.secondaryPhoneType,
    primaryContact: customer.primaryContact,
    primaryPhoneContact: customer.primaryPhoneContact,
    
    // Address
    address: customer.address,
    
    // Additional fields
    notes: customer.notes,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
    
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

// Validation rules for creating customers - only address is required
const customerValidation = [
  body('primaryName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Primary customer name must be between 2 and 100 characters'),
  body('primaryEmail')
    .optional({ checkFalsy: true })
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
    .notEmpty()
    .withMessage('Project address is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
  body('primaryEmailType')
    .optional()
    .isIn(['PERSONAL', 'WORK'])
    .withMessage('Primary email type must be PERSONAL or WORK'),
  body('primaryPhoneType')
    .optional()
    .isIn(['MOBILE', 'HOME', 'WORK'])
    .withMessage('Primary phone type must be MOBILE, HOME, or WORK'),
  body('secondaryEmailType')
    .optional()
    .isIn(['PERSONAL', 'WORK'])
    .withMessage('Secondary email type must be PERSONAL or WORK'),
  body('secondaryPhoneType')
    .optional()
    .isIn(['MOBILE', 'HOME', 'WORK'])
    .withMessage('Secondary phone type must be MOBILE, HOME, or WORK'),
  body('primaryPhoneContact')
    .optional()
    .isIn(['PRIMARY', 'SECONDARY'])
    .withMessage('Primary phone contact must be PRIMARY or SECONDARY')
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
    .withMessage('Address must be between 5 and 500 characters'),
  body('primaryEmailType')
    .optional()
    .isIn(['PERSONAL', 'WORK'])
    .withMessage('Primary email type must be PERSONAL or WORK'),
  body('primaryPhoneType')
    .optional()
    .isIn(['MOBILE', 'HOME', 'WORK'])
    .withMessage('Primary phone type must be MOBILE, HOME, or WORK'),
  body('secondaryEmailType')
    .optional()
    .isIn(['PERSONAL', 'WORK'])
    .withMessage('Secondary email type must be PERSONAL or WORK'),
  body('secondaryPhoneType')
    .optional()
    .isIn(['MOBILE', 'HOME', 'WORK'])
    .withMessage('Secondary phone type must be MOBILE, HOME, or WORK'),
  body('primaryPhoneContact')
    .optional()
    .isIn(['PRIMARY', 'SECONDARY'])
    .withMessage('Primary phone contact must be PRIMARY or SECONDARY')
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
    sortBy = 'created_at',
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

    sendSuccess(res, 200, transformedCustomer, 'Customer retrieved successfully');
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
    console.log('🔍 CUSTOMER CREATE: Request body:', JSON.stringify(req.body, null, 2));
    let customerData = {};
    
    // Address is the only required field - name/email/phone are optional
    const address = req.body.address;
    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project address is required'
      });
    }
    
    // Generate placeholders for optional fields when not provided
    const generatePlaceholderEmail = () => `noemail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@placeholder.local`;
    
    if (req.body.primaryName || req.body.primaryEmail || req.body.address) {
      // New format - validation already done by express-validator
      customerData = {
        primaryName: req.body.primaryName || 'Unknown',
        primaryEmail: req.body.primaryEmail || generatePlaceholderEmail(),
        primaryPhone: req.body.primaryPhone || '',
        secondaryName: req.body.secondaryName || null,
        secondaryEmail: req.body.secondaryEmail || null,
        secondaryPhone: req.body.secondaryPhone || null,
        primaryContact: req.body.primaryContact || 'PRIMARY',
        address: address.trim()
        // notes field removed - not being sent from frontend
      };
      
      // Conditionally add email/phone type fields only if they exist in the schema
      // These fields may not exist in the database yet, so we only include them if provided
      // Only add secondary type fields if the corresponding secondary field exists
      if (req.body.primaryEmailType) {
        customerData.primaryEmailType = req.body.primaryEmailType;
      }
      if (req.body.primaryPhoneType) {
        customerData.primaryPhoneType = req.body.primaryPhoneType;
      }
      if (req.body.secondaryEmail && req.body.secondaryEmailType) {
        customerData.secondaryEmailType = req.body.secondaryEmailType;
      }
      if (req.body.secondaryPhone && req.body.secondaryPhoneType) {
        customerData.secondaryPhoneType = req.body.secondaryPhoneType;
      }
      if (req.body.primaryPhoneContact) {
        customerData.primaryPhoneContact = req.body.primaryPhoneContact;
      }
    } else {
      // Legacy format - map to new schema
      customerData = {
        primaryName: req.body.name || 'Unknown',
        primaryEmail: req.body.email || generatePlaceholderEmail(),
        primaryPhone: req.body.phone || '',
        secondaryName: null,
        secondaryEmail: null,
        secondaryPhone: null,
        primaryContact: 'PRIMARY',
        address: address.trim()
        // notes field removed - not being sent from frontend
      };
      // Don't include type fields for legacy format - they may not exist in DB
    }

    // Only check for existing customer if a real email was provided (not placeholder)
    let existingCustomer = null;
    if (req.body.primaryEmail && req.body.primaryEmail.trim() && !req.body.primaryEmail.includes('@placeholder.local')) {
      console.log('🔍 CUSTOMER CREATE: Checking for existing customer with email:', customerData.primaryEmail);
      existingCustomer = await prisma.customer.findUnique({
        where: { primaryEmail: customerData.primaryEmail }
      });

      console.log('🔍 CUSTOMER CREATE: Existing customer found:', existingCustomer ? 'YES' : 'NO');
      if (existingCustomer) {
        console.log('🔍 CUSTOMER CREATE: Returning existing customer:', existingCustomer.id, existingCustomer.primaryName);
        // Return existing customer instead of throwing error
        const transformedCustomer = transformCustomerForFrontend(existingCustomer);
        return sendSuccess(res, 200, transformedCustomer, 'Customer already exists');
      }
    } else {
      console.log('🔍 CUSTOMER CREATE: No email provided, skipping duplicate check');
    }

    // Create customer with contacts if provided
    console.log('🔍 CUSTOMER CREATE: Creating customer with data:', customerData);

    // Contacts are now stored directly in the Customer model fields (primaryName, secondaryName, etc.)
    // No separate Contact table needed

    let customer;
    try {
      // Try creating with all fields first
      customer = await prisma.customer.create({
        data: customerData
      });
    } catch (prismaError) {
      // If Prisma doesn't recognize type fields, retry without them
      if (prismaError.message && prismaError.message.includes('Unknown argument')) {
        console.log('⚠️ Prisma error - retrying without type fields:', prismaError.message);
        // Remove type fields that might not exist in database
        const { primaryEmailType, primaryPhoneType, secondaryEmailType, secondaryPhoneType, primaryPhoneContact, ...baseCustomerData } = customerData;
        customer = await prisma.customer.create({
          data: baseCustomerData
        });
      } else {
        // Re-throw if it's a different error
        throw prismaError;
      }
    }

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
      if (req.body.primaryEmailType !== undefined) updateData.primaryEmailType = req.body.primaryEmailType;
      if (req.body.primaryPhoneType !== undefined) updateData.primaryPhoneType = req.body.primaryPhoneType;
      if (req.body.secondaryName !== undefined) updateData.secondaryName = req.body.secondaryName;
      if (req.body.secondaryEmail !== undefined) updateData.secondaryEmail = req.body.secondaryEmail;
      if (req.body.secondaryEmailType !== undefined) updateData.secondaryEmailType = req.body.secondaryEmailType;
      if (req.body.secondaryPhone !== undefined) updateData.secondaryPhone = req.body.secondaryPhone;
      if (req.body.secondaryPhoneType !== undefined) updateData.secondaryPhoneType = req.body.secondaryPhoneType;
      if (req.body.primaryContact !== undefined) updateData.primaryContact = req.body.primaryContact;
      if (req.body.primaryPhoneContact !== undefined) updateData.primaryPhoneContact = req.body.primaryPhoneContact;
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
    
    sendSuccess(res, 200, transformedCustomer, 'Customer updated successfully');
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
    
    sendSuccess(res, 200, null, 'Customer deleted successfully');
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
        created_at: {
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
        created_at: true
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

// ==================== Family Members Routes ====================

// @desc    Get all family members for a customer
// @route   GET /api/customers/:customerId/family-members
// @access  Private
router.get('/:customerId/family-members', asyncHandler(async (req, res, next) => {
  try {
    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.customerId }
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Get family members
    const familyMembers = await prisma.familyMember.findMany({
      where: { customerId: req.params.customerId },
      orderBy: { createdAt: 'asc' }
    });

    sendSuccess(res, 200, familyMembers, 'Family members retrieved successfully');
  } catch (error) {
    console.error('Error fetching family members:', error);
    return next(new AppError('Failed to fetch family members', 500));
  }
}));

// @desc    Create a new family member
// @route   POST /api/customers/:customerId/family-members
// @access  Private
router.post('/:customerId/family-members', asyncHandler(async (req, res, next) => {
  try {
    const { name, relation } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return next(new AppError('Family member name is required', 400));
    }
    if (!relation || !relation.trim()) {
      return next(new AppError('Family member relation is required', 400));
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.customerId }
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Create family member
    const familyMember = await prisma.familyMember.create({
      data: {
        name: name.trim(),
        relation: relation.trim(),
        customerId: req.params.customerId
      }
    });

    sendSuccess(res, 201, familyMember, 'Family member created successfully');
  } catch (error) {
    console.error('Error creating family member:', error);
    return next(new AppError('Failed to create family member', 500));
  }
}));

// @desc    Update a family member
// @route   PUT /api/customers/:customerId/family-members/:id
// @access  Private
router.put('/:customerId/family-members/:id', asyncHandler(async (req, res, next) => {
  try {
    const { name, relation } = req.body;

    // Verify family member exists and belongs to customer
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        id: req.params.id,
        customerId: req.params.customerId
      }
    });

    if (!familyMember) {
      return next(new AppError('Family member not found', 404));
    }

    // Build update data
    const updateData = {};
    if (name !== undefined && name !== null) {
      updateData.name = name.trim();
    }
    if (relation !== undefined && relation !== null) {
      updateData.relation = relation.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return next(new AppError('No fields provided to update', 400));
    }

    // Update family member
    const updatedFamilyMember = await prisma.familyMember.update({
      where: { id: req.params.id },
      data: updateData
    });

    sendSuccess(res, 200, updatedFamilyMember, 'Family member updated successfully');
  } catch (error) {
    console.error('Error updating family member:', error);
    return next(new AppError('Failed to update family member', 500));
  }
}));

// @desc    Delete a family member
// @route   DELETE /api/customers/:customerId/family-members/:id
// @access  Private
router.delete('/:customerId/family-members/:id', asyncHandler(async (req, res, next) => {
  try {
    // Verify family member exists and belongs to customer
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        id: req.params.id,
        customerId: req.params.customerId
      }
    });

    if (!familyMember) {
      return next(new AppError('Family member not found', 404));
    }

    // Delete family member
    await prisma.familyMember.delete({
      where: { id: req.params.id }
    });

    sendSuccess(res, 200, null, 'Family member deleted successfully');
  } catch (error) {
    console.error('Error deleting family member:', error);
    return next(new AppError('Failed to delete family member', 500));
  }
}));

module.exports = router; 