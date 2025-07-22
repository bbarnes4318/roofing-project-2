const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { 
  asyncHandler, 
  AppError, 
  sendSuccess, 
  formatValidationErrors 
} = require('../middleware/errorHandler');
const { 
  authenticateToken, 
  generateToken, 
  userRateLimit 
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'project_manager', 'foreman', 'worker', 'client'])
    .withMessage('Invalid role specified')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', registerValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { firstName, lastName, email, password, role, phone, position } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User already exists with this email', 400));
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: role || 'worker',
    phone,
    position,
    emailVerificationToken: crypto.randomBytes(32).toString('hex'),
    emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  // Generate token
  const token = user.generateAuthToken();

  // Remove password from response
  user.password = undefined;

  // TODO: Send verification email
  // await sendVerificationEmail(user.email, user.emailVerificationToken);

  sendSuccess(res, 201, {
    user,
    token,
    message: 'Registration successful. Please check your email to verify your account.'
  }, 'User registered successfully');
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if account is locked
  if (user.isLocked) {
    return next(new AppError('Account is temporarily locked due to too many failed login attempts', 423));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new AppError('Account is deactivated', 401));
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    // Increment login attempts
    await user.incLoginAttempts();
    return next(new AppError('Invalid email or password', 401));
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = new Date();
  user.lastLoginIP = req.ip;
  user.lastActivity = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate token
  const token = user.generateAuthToken();

  // Remove password from response
  user.password = undefined;

  sendSuccess(res, 200, {
    user,
    token
  }, 'Login successful');
}));

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('projectsAssigned', 'name status')
    .select('-password');

  sendSuccess(res, 200, { user }, 'User profile retrieved successfully');
}));

// @desc    Update current user profile
// @route   PUT /api/auth/me
// @access  Private
router.put('/me', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/),
  body('position').optional().trim().isLength({ max: 100 }),
  body('bio').optional().isLength({ max: 500 })
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

  const allowedFields = [
    'firstName', 'lastName', 'phone', 'position', 'bio', 
    'avatar', 'preferences', 'skills', 'emergencyContact', 'address'
  ];
  
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  sendSuccess(res, 200, { user }, 'Profile updated successfully');
}));

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
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

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordCorrect) {
    return next(new AppError('Current password is incorrect', 400));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  sendSuccess(res, 200, null, 'Password changed successfully');
}));

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with that email address', 404));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false });

  // TODO: Send reset email
  // await sendPasswordResetEmail(user.email, resetToken);

  sendSuccess(res, 200, null, 'Password reset instructions sent to email');
}));

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', resetPasswordValidation, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { token, password } = req.body;

  // Hash token and find user
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400));
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Generate new token
  const authToken = user.generateAuthToken();

  sendSuccess(res, 200, { token: authToken }, 'Password reset successful');
}));

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Verification token is required', 400));
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Invalid or expired verification token', 400));
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, 200, null, 'Email verified successfully');
}));

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // Update last activity
  await User.findByIdAndUpdate(req.user._id, {
    lastActivity: new Date()
  });

  sendSuccess(res, 200, null, 'Logout successful');
}));

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
router.post('/refresh', authenticateToken, userRateLimit(10), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  
  if (!user || !user.isActive) {
    return next(new AppError('User not found or inactive', 401));
  }

  const token = user.generateAuthToken();

  sendSuccess(res, 200, { token, user }, 'Token refreshed successfully');
}));

module.exports = router; 