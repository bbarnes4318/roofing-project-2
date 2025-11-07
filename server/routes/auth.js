const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getS3 } = require('../config/spaces');
const { generateUniqueFilename } = require('../utils/fileUtils');
const { prisma } = require('../config/prisma');
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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
// Dev fallback store when DB is not connected
let DevUserStore;
try {
  DevUserStore = require('../services/DevUserStore');
} catch (_) {
  DevUserStore = null;
}
const router = express.Router();

// Validation rules
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

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  // For demo tokens, return the user data directly from req.user
  if (req.user.id.startsWith('demo-') || req.user.id.startsWith('temp-')) {
    return res.json({
      success: true,
      user: req.user
    });
  }

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
    user: user
  });
}));

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, position, department, bio, theme, language, timezone, /* displayName */ _, email } = req.body;

  // Validate field lengths to prevent database errors
  const validationErrors = [];
  
  if (firstName && firstName.length > 100) {
    validationErrors.push('First name must be 100 characters or less');
  }
  if (lastName && lastName.length > 100) {
    validationErrors.push('Last name must be 100 characters or less');
  }
  if (phone && phone.length > 20) {
    validationErrors.push('Phone number must be 20 characters or less');
  }
  if (position && position.length > 100) {
    validationErrors.push('Position must be 100 characters or less');
  }
  if (department && department.length > 100) {
    validationErrors.push('Department must be 100 characters or less');
  }
  if (bio && bio.length > 500) {
    validationErrors.push('Bio must be 500 characters or less');
  }
  // Note: User model does not have displayName; ignore if provided
  if (email && email.length > 255) {
    validationErrors.push('Email must be 255 characters or less');
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }

  // Build update data object - only include fields that are provided
  // This prevents overwriting existing data with empty strings
  const updateData = {};
  
  if (firstName !== undefined && firstName !== null) {
    updateData.firstName = firstName.trim().substring(0, 100);
  }
  if (lastName !== undefined && lastName !== null) {
    updateData.lastName = lastName.trim().substring(0, 100);
  }
  if (email !== undefined && email !== null) {
    updateData.email = email.trim();
  }
  if (phone !== undefined && phone !== null) {
    updateData.phone = phone.trim();
  }
  if (language !== undefined && language !== null) {
    updateData.language = language;
  }
  if (timezone !== undefined && timezone !== null) {
    updateData.timezone = timezone;
  }
  
  // Only include optional fields if they're provided
  if (position !== undefined && position !== null) {
    updateData.position = position.trim();
  }
  if (department !== undefined && department !== null) {
    updateData.department = department.trim();
  }
  if (bio !== undefined && bio !== null) {
    updateData.bio = bio.trim();
  }
  if (theme !== undefined && theme !== null) {
    updateData.theme = theme;
  }
  
  // Don't update if no fields were provided
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields provided to update'
    });
  }

  console.log('🔍 PROFILE UPDATE: Starting update for user:', req.user.id);
  console.log('🔍 PROFILE UPDATE: Update data:', updateData);
  
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
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
    
    console.log('🔍 PROFILE UPDATE: Update completed successfully');
    console.log('🔍 PROFILE UPDATE: Updated user:', updatedUser);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('🔍 PROFILE UPDATE: Database error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error during profile update',
      error: error.message
    });
  }
}));

// @desc    Upload profile picture
// @route   POST /api/auth/upload-avatar
// @access  Private
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  // Validate file type
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a valid image file'
    });
  }

  // Validate file size (max 5MB)
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      message: 'Image size must be less than 5MB'
    });
  }

  try {
    // Upload to Spaces
    const filename = generateUniqueFilename(req.file.originalname);
    const key = `avatars/${req.user.id}/${filename}`;

    const s3 = getS3();
    const bucket = process.env.DO_SPACES_NAME;

    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'Digital Ocean Spaces not configured'
      });
    }

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'application/octet-stream',
      ACL: 'public-read' // Make avatar publicly accessible
    }));

    const avatarUrl = `spaces://${key}`;

    // Update user's avatar in database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
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
      message: 'Profile picture updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture'
    });
  }
}));

// @desc    Remove profile picture
// @route   DELETE /api/auth/remove-avatar
// @access  Private
router.delete('/remove-avatar', authenticateToken, asyncHandler(async (req, res) => {
  try {
    // Update user's avatar to null in database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: null },
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
      message: 'Profile picture removed successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Avatar removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove profile picture'
    });
  }
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

// @desc    Supabase token exchange - convert Supabase user to traditional JWT
// @route   POST /api/auth/supabase-token-exchange
// @access  Public
router.post('/supabase-token-exchange', asyncHandler(async (req, res) => {
  try {
    console.log('🔄 Supabase token exchange request received');
    const { email, firstName, lastName, role } = req.body;
    
    console.log('📧 Token exchange data:', { 
      email: email ? 'provided' : 'missing', 
      firstName: firstName || 'not provided', 
      lastName: lastName || 'not provided', 
      role: role || 'not provided' 
    });

    if (!email) {
      console.log('❌ Token exchange failed: Email is required');
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log('🔍 Looking up user in database...');
    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        theme: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log('👤 User not found, creating new user...');
      // If user doesn't exist, create them
      user = await prisma.user.create({
        data: {
          email: email,
          firstName: firstName || email.split('@')[0],
          lastName: lastName || '',
          password: 'SUPABASE_MANAGED', // Placeholder since Supabase handles authentication
          role: role || 'WORKER',
          isActive: true,
          theme: 'LIGHT',
          lastLogin: new Date()
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          theme: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });
      console.log('✅ New user created:', user.id);
    } else {
      console.log('👤 Existing user found, updating last login...');
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
      console.log('✅ User last login updated');
    }

    if (!user.isActive) {
      console.log('❌ Token exchange failed: Account is deactivated');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    console.log('🔑 Generating JWT token...');
    // Generate traditional JWT token
    const token = generateToken(user.id, user.role);
    console.log('✅ Token generated successfully');

    console.log('🎉 Token exchange completed successfully');
    res.json({
      success: true,
      token: token,
      user: user
    });
  } catch (error) {
    console.error('❌ Token exchange error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Token exchange failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

// @desc    Verify setup token for profile completion
// @route   POST /api/auth/verify-setup-token
// @access  Public
router.post('/verify-setup-token', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Setup token is required'
    });
  }

  try {
    // Find user by email verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        },
        isVerified: false
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phone: true,
        secondaryPhone: true,
        preferredPhone: true,
        isActive: true,
        isVerified: true
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired setup token'
      });
    }

    res.json({
      success: true,
      data: { user },
      message: 'Setup token is valid'
    });

  } catch (error) {
    console.error('Error verifying setup token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify setup token',
      error: error.message
    });
  }
}));

// @desc    Complete profile setup
// @route   POST /api/auth/complete-profile-setup
// @access  Public
router.post('/complete-profile-setup', asyncHandler(async (req, res) => {
  const { 
    token, 
    password, 
    phone, 
    secondaryPhone, 
    preferredPhone, 
    position, 
    department, 
    bio 
  } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Setup token and password are required'
    });
  }

  try {
    // Find user by email verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        },
        isVerified: false
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired setup token'
      });
    }

    // Hash the password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user with completed profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        phone: phone || null,
        secondaryPhone: secondaryPhone || null,
        preferredPhone: preferredPhone || phone || null,
        position: position || null,
        department: department || null,
        bio: bio || null,
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordChangedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phone: true,
        secondaryPhone: true,
        preferredPhone: true,
        position: true,
        department: true,
        bio: true,
        isActive: true,
        isVerified: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'Profile setup completed successfully'
    });

  } catch (error) {
    console.error('Error completing profile setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete profile setup',
      error: error.message
    });
  }
}));

module.exports = router; 