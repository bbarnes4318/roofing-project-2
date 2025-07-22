const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  formatValidationErrors,
  AppError 
} = require('../middleware/errorHandler');
// Authentication middleware removed - all users can manage customers
const Customer = require('../models/Customer');
const Project = require('../models/Project');

const router = express.Router();

// Validation rules
const customerValidation = [
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

  // Build filter object
  let filter = {};
  
  // Add search functionality
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { address: new RegExp(search, 'i') }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  let query = Customer.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Populate projects if requested
  if (withProjects === 'true') {
    query = query.populate('associatedProjects', 'projectName status startDate endDate budget progress');
  }

  const [customers, total] = await Promise.all([
    query.lean(),
    Customer.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, customers, pageNum, limitNum, total, 'Customers retrieved successfully');
}));

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id)
    .populate('associatedProjects', 'projectName status startDate endDate budget progress projectType');

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  sendSuccess(res, 200, { customer }, 'Customer retrieved successfully');
}));

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
router.post('/', customerValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  // Check if customer with email already exists
  const existingCustomer = await Customer.findOne({ email: req.body.email });
  if (existingCustomer) {
    return next(new AppError('Customer with this email already exists', 400));
  }

  // Create customer
  const customerData = {
    ...req.body,
    createdAt: new Date()
  };

  const customer = await Customer.create(customerData);

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('customer_created', {
    customer,
    createdBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 201, { customer }, 'Customer created successfully');
}));

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim().matches(/^[\+]?[1-9][\d]{0,15}$/),
  body('address').optional().trim().isLength({ min: 5, max: 500 })
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  // Check if email is being changed and if it already exists
  if (req.body.email) {
    const existingCustomer = await Customer.findOne({ 
      email: req.body.email,
      _id: { $ne: req.params.id }
    });
    if (existingCustomer) {
      return next(new AppError('Customer with this email already exists', 400));
    }
  }

  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('associatedProjects', 'projectName status');

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('customer_updated', {
    customer,
    updatedBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, { customer }, 'Customer updated successfully');
}));

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  // Check if customer has associated projects
  if (customer.associatedProjects && customer.associatedProjects.length > 0) {
    return next(new AppError('Cannot delete customer with associated projects. Please reassign or delete projects first.', 400));
  }

  await Customer.findByIdAndDelete(req.params.id);

  // Emit real-time update
  const io = req.app.get('io');
  io.emit('customer_deleted', {
    customerId: req.params.id,
    deletedBy: req.user._id,
    timestamp: new Date()
  });

  sendSuccess(res, 200, null, 'Customer deleted successfully');
}));

// @desc    Get customer projects
// @route   GET /api/customers/:id/projects
// @access  Private
router.get('/:id/projects', asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  const projects = await Project.find({ customer: req.params.id })
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email')
    .sort({ createdAt: -1 });

  sendSuccess(res, 200, { projects, count: projects.length }, 'Customer projects retrieved successfully');
}));

// @desc    Add project to customer
// @route   POST /api/customers/:id/projects
// @access  Private
router.post('/:id/projects', [
  body('projectId')
    .isMongoId()
    .withMessage('Valid project ID is required')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { projectId } = req.body;

  const [customer, project] = await Promise.all([
    Customer.findById(req.params.id),
    Project.findById(projectId)
  ]);

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Check if project is already associated
  if (customer.associatedProjects.includes(projectId)) {
    return next(new AppError('Project is already associated with this customer', 400));
  }

  // Add project to customer
  customer.associatedProjects.push(projectId);
  await customer.save();

  // Update project's customer field
  project.customer = req.params.id;
  await project.save();

  sendSuccess(res, 200, { customer }, 'Project added to customer successfully');
}));

// @desc    Remove project from customer
// @route   DELETE /api/customers/:id/projects/:projectId
// @access  Private
router.delete('/:id/projects/:projectId', asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(new AppError('Customer not found', 404));
  }

  // Remove project from customer
  customer.associatedProjects = customer.associatedProjects.filter(
    projectId => projectId.toString() !== req.params.projectId
  );
  await customer.save();

  sendSuccess(res, 200, { customer }, 'Project removed from customer successfully');
}));

// @desc    Search customers
// @route   GET /api/customers/search/query
// @access  Private
router.get('/search/query', asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long'
    });
  }

  const customers = await Customer.searchCustomers(q.trim(), { limit: parseInt(limit) });

  sendSuccess(res, 200, { customers, count: customers.length }, 'Search results retrieved successfully');
}));

// @desc    Get customer statistics
// @route   GET /api/customers/stats/overview
// @access  Private
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = await Customer.aggregate([
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        averageProjects: { $avg: { $size: '$associatedProjects' } }
      }
    }
  ]);

  // Get customers with most projects
  const topCustomers = await Customer.aggregate([
    {
      $addFields: {
        projectCount: { $size: '$associatedProjects' }
      }
    },
    {
      $match: {
        projectCount: { $gt: 0 }
      }
    },
    {
      $sort: { projectCount: -1 }
    },
    {
      $limit: 10
    },
    {
      $project: {
        name: 1,
        email: 1,
        projectCount: 1
      }
    }
  ]);

  // Get recent customers
  const recentCustomers = await Customer.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email createdAt');

  const overview = stats[0] || {
    totalCustomers: 0,
    averageProjects: 0
  };

  sendSuccess(res, 200, {
    overview,
    topCustomers,
    recentCustomers
  }, 'Customer statistics retrieved successfully');
}));

module.exports = router; 