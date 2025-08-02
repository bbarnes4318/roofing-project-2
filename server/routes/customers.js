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

// Validation rules
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
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid primary phone number'),
  body('secondaryName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Secondary customer name must be between 2 and 100 characters'),
  body('secondaryEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid secondary email address'),
  body('secondaryPhone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid secondary phone number'),
  body('primaryContact')
    .optional()
    .isIn(['PRIMARY', 'SECONDARY'])
    .withMessage('Primary contact must be PRIMARY or SECONDARY'),
  body('address')
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
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
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

  try {
    // Execute query with pagination using Prisma
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          contacts: true, // Always include contacts
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

    // Transform customers for frontend compatibility
    const transformedCustomers = customers.map(transformCustomerForFrontend);

    sendPaginatedResponse(res, transformedCustomers, pageNum, limitNum, total, 'Customers retrieved successfully');
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw new AppError('Failed to fetch customers', 500);
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
        contacts: true, // Include contacts
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
  try {
    // Handle both new format (primaryName, primaryEmail, etc.) and legacy format (name, email, phone)
    let customerData = {};
    
    if (req.body.primaryName || req.body.primaryEmail) {
      // New format validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formatValidationErrors(errors)
        });
      }
      
      customerData = {
        primaryName: req.body.primaryName,
        primaryEmail: req.body.primaryEmail,
        primaryPhone: req.body.primaryPhone,
        secondaryName: req.body.secondaryName || null,
        secondaryEmail: req.body.secondaryEmail || null,
        secondaryPhone: req.body.secondaryPhone || null,
        primaryContact: req.body.primaryContact || 'PRIMARY',
        address: req.body.address,
        notes: req.body.notes || null
      };
    } else {
      // Legacy format - map to new schema
      customerData = {
        primaryName: req.body.name,
        primaryEmail: req.body.email,
        primaryPhone: req.body.phone,
        secondaryName: null,
        secondaryEmail: null,
        secondaryPhone: null,
        primaryContact: 'PRIMARY',
        address: req.body.address,
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

    // If contacts array is provided, create them along with the customer
    if (req.body.contacts && Array.isArray(req.body.contacts)) {
      createData.data.contacts = {
        create: req.body.contacts
          .filter(contact => contact.name && contact.name.trim()) // Only create contacts with names
          .map((contact, index) => ({
            name: contact.name.trim(),
            phone: contact.phone || null,
            email: contact.email || null,
            isPrimary: contact.isPrimary || false,
            role: contact.isPrimary ? 'Primary Contact' : `Contact ${index + 1}`,
            isActive: true
          }))
      };
      createData.include = {
        contacts: true
      };
    }

    const customer = await prisma.customer.create(createData);

    // Transform customer for frontend compatibility
    const transformedCustomer = transformCustomerForFrontend(customer);

    sendSuccess(res, transformedCustomer, 'Customer created successfully', 201);
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error.code === 'P2002') {
      return next(new AppError('Customer with this email already exists', 400));
    }
    return next(new AppError('Failed to create customer', 500));
  }
}));

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
router.put('/:id', asyncHandler(async (req, res, next) => {
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
    const updatedCustomer = await prisma.customer.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Transform customer for frontend compatibility
    const transformedCustomer = transformCustomerForFrontend(updatedCustomer);

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

module.exports = router; 