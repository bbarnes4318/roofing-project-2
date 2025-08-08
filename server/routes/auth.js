const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
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

const prisma = new PrismaClient();
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
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return next(new AppError('User already exists with this email', 400));
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, 12),
      role: role ? role.toUpperCase() : 'WORKER',
      phone,
      position,
      emailVerificationToken: crypto.randomBytes(32).toString('hex'),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    }
  });

  // Generate token
  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      token
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginValidation, userRateLimit, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > new Date()) {
    return next(new AppError('Account is temporarily locked. Please try again later.', 423));
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    // Increment login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: user.loginAttempts + 1,
        lockUntil: user.loginAttempts >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : null // Lock for 15 minutes after 5 failed attempts
      }
    });

    return next(new AppError('Invalid credentials', 401));
  }

  // Reset login attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date(),
      lastLoginIP: req.ip
    }
  });

  // Generate token
  const token = generateToken(user.id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar
      },
      token
    }
  });
}));

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      position: true,
      department: true,
      bio: true,
      isVerified: true,
      theme: true,
      notificationPreferences: true,
      language: true,
      timezone: true,
      skills: true,
      certifications: true,
      experience: true,
      emergencyContact: true,
      address: true,
      createdAt: true,
      lastLogin: true
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, position, department, bio, theme, language, timezone } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      firstName,
      lastName,
      phone,
      position,
      department,
      bio,
      theme,
      language,
      timezone
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      position: true,
      department: true,
      bio: true,
      theme: true,
      language: true,
      timezone: true
    }
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
}));

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', authenticateToken, asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    return next(new AppError('Current password is incorrect', 400));
  }

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      password: await bcrypt.hash(newPassword, 12),
      passwordChangedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return next(new AppError('No user found with that email address', 404));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpiry
    }
  });

  // TODO: Send email with reset token
  // For now, just return the token (in production, send via email)
  res.json({
    success: true,
    message: 'Password reset token sent to email',
    data: { resetToken } // Remove this in production
  });
}));

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', resetPasswordValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { token, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() }
    }
  });

  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400));
  }

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 12),
      passwordResetToken: null,
      passwordResetExpires: null,
      passwordChangedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
}));

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get('/verify-email/:token', asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gt: new Date() }
    }
  });

  if (!user) {
    return next(new AppError('Invalid or expired verification token', 400));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    }
  });

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  // In a JWT-based system, logout is typically handled client-side
  // by removing the token. The server doesn't need to do anything.
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Enhanced Security Routes

const BiometricAuthService = require('../services/BiometricAuthService');
const MFAService = require('../services/MFAService');
const DeviceAuthService = require('../services/DeviceAuthService');
const BehaviorAnalysisService = require('../services/BehaviorAnalysisService');

// =================================================================
// WEBAUTHN / BIOMETRIC AUTHENTICATION
// =================================================================

// @desc    Generate WebAuthn registration options
// @route   POST /api/auth/webauthn/register/begin
// @access  Private
router.post('/webauthn/register/begin', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, firstName, lastName, email } = req.user;
  const userName = `${firstName} ${lastName}`;

  const result = await BiometricAuthService.generateRegistrationOptions(
    userId,
    userName,
    email
  );

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Verify WebAuthn registration response
// @route   POST /api/auth/webauthn/register/finish
// @access  Private
router.post('/webauthn/register/finish', authenticateToken, asyncHandler(async (req, res) => {
  const { response, nickname } = req.body;
  const { userId } = req.user;

  const result = await BiometricAuthService.verifyRegistrationResponse(
    userId,
    response,
    nickname
  );

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Generate WebAuthn authentication options
// @route   POST /api/auth/webauthn/authenticate/begin
// @access  Public
router.post('/webauthn/authenticate/begin', asyncHandler(async (req, res) => {
  const { userId } = req.body; // Optional for usernameless flow

  const result = await BiometricAuthService.generateAuthenticationOptions(userId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Verify WebAuthn authentication response
// @route   POST /api/auth/webauthn/authenticate/finish
// @access  Public
router.post('/webauthn/authenticate/finish', asyncHandler(async (req, res) => {
  const { response, challengeKey } = req.body;

  const result = await BiometricAuthService.verifyAuthenticationResponse(
    response,
    challengeKey
  );

  if (result.success) {
    // Generate JWT token for successful biometric authentication
    const token = generateToken(result.user.id, result.user.role);
    
    res.json({
      success: true,
      message: 'Biometric authentication successful',
      data: {
        user: result.user,
        token
      }
    });
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Get user's biometric credentials
// @route   GET /api/auth/webauthn/credentials
// @access  Private
router.get('/webauthn/credentials', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const result = await BiometricAuthService.getUserCredentials(userId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Delete biometric credential
// @route   DELETE /api/auth/webauthn/credentials/:credentialId
// @access  Private
router.delete('/webauthn/credentials/:credentialId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { credentialId } = req.params;

  const result = await BiometricAuthService.deleteCredential(userId, credentialId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// =================================================================
// MULTI-FACTOR AUTHENTICATION (MFA)
// =================================================================

// @desc    Generate TOTP secret for MFA setup
// @route   POST /api/auth/mfa/totp/setup
// @access  Private
router.post('/mfa/totp/setup', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, email } = req.user;

  const result = await MFAService.generateTOTPSecret(userId, email);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Verify TOTP setup
// @route   POST /api/auth/mfa/totp/verify-setup
// @access  Private
router.post('/mfa/totp/verify-setup', authenticateToken, asyncHandler(async (req, res) => {
  const { token } = req.body;
  const { userId } = req.user;

  const result = await MFAService.verifyTOTPSetup(userId, token);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Verify TOTP during login
// @route   POST /api/auth/mfa/totp/verify
// @access  Public (used during login flow)
router.post('/mfa/totp/verify', asyncHandler(async (req, res) => {
  const { userId, token } = req.body;

  const result = await MFAService.verifyTOTP(userId, token);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Verify backup code
// @route   POST /api/auth/mfa/backup/verify
// @access  Public (used during login flow)
router.post('/mfa/backup/verify', asyncHandler(async (req, res) => {
  const { userId, code } = req.body;

  const result = await MFAService.verifyBackupCode(userId, code);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Get user's MFA methods
// @route   GET /api/auth/mfa/methods
// @access  Private
router.get('/mfa/methods', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const result = await MFAService.getUserMFAMethods(userId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Disable MFA method
// @route   POST /api/auth/mfa/disable
// @access  Private
router.post('/mfa/disable', authenticateToken, asyncHandler(async (req, res) => {
  const { method } = req.body;
  const { userId } = req.user;

  const result = await MFAService.disableMFAMethod(userId, method);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Generate new backup codes
// @route   POST /api/auth/mfa/backup/generate
// @access  Private
router.post('/mfa/backup/generate', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const backupCodes = await MFAService.generateBackupCodes(userId);

  res.json({
    success: true,
    message: 'Backup codes generated successfully',
    data: { backupCodes }
  });
}));

// =================================================================
// DEVICE MANAGEMENT
// =================================================================

// @desc    Register device
// @route   POST /api/auth/device/register
// @access  Private
router.post('/device/register', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { clientFingerprint } = req.body;

  const result = await DeviceAuthService.registerDevice(userId, req, clientFingerprint);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Get user's devices
// @route   GET /api/auth/devices
// @access  Private
router.get('/devices', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const result = await DeviceAuthService.getUserDevices(userId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Trust device
// @route   POST /api/auth/device/:deviceId/trust
// @access  Private
router.post('/device/:deviceId/trust', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { deviceId } = req.params;

  const result = await DeviceAuthService.trustDevice(userId, deviceId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Remove device
// @route   DELETE /api/auth/device/:deviceId
// @access  Private
router.delete('/device/:deviceId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { deviceId } = req.params;

  const result = await DeviceAuthService.removeDevice(userId, deviceId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// =================================================================
// BEHAVIORAL BIOMETRICS
// =================================================================

// @desc    Analyze keystroke dynamics
// @route   POST /api/auth/behavior/keystroke
// @access  Private
router.post('/behavior/keystroke', authenticateToken, asyncHandler(async (req, res) => {
  const { keystrokeData } = req.body;
  const { userId } = req.user;

  const result = await BehaviorAnalysisService.analyzeKeystrokeDynamics(keystrokeData, userId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Analyze mouse patterns
// @route   POST /api/auth/behavior/mouse
// @access  Private
router.post('/behavior/mouse', authenticateToken, asyncHandler(async (req, res) => {
  const { mouseData } = req.body;
  const { userId } = req.user;

  const result = await BehaviorAnalysisService.analyzeMousePatterns(mouseData, userId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Analyze touch patterns
// @route   POST /api/auth/behavior/touch
// @access  Private
router.post('/behavior/touch', authenticateToken, asyncHandler(async (req, res) => {
  const { touchData } = req.body;
  const { userId } = req.user;

  const result = await BehaviorAnalysisService.analyzeTouchPatterns(touchData, userId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// @desc    Get user behavior analysis
// @route   GET /api/auth/behavior/analysis
// @access  Private
router.get('/behavior/analysis', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const result = await BehaviorAnalysisService.getUserBehaviorAnalysis(userId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

// =================================================================
// SECURITY EVENTS
// =================================================================

// @desc    Get user's security events
// @route   GET /api/auth/security/events
// @access  Private
router.get('/security/events', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { limit = 50, offset = 0 } = req.query;

  const events = await prisma.securityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
    skip: parseInt(offset),
    select: {
      id: true,
      eventType: true,
      riskScore: true,
      createdAt: true,
      resolved: true,
      details: true,
    },
  });

  res.json({
    success: true,
    data: { events }
  });
}));

module.exports = router; 