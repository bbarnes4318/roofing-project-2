const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler, 
  AppError, 
  formatValidationErrors 
} = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

console.log('🚀 ONBOARDING: Loading onboarding routes module');

// Validation middleware
const updateRoleValidation = [
  body('role')
    .isIn(['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT'])
    .withMessage('Invalid role specified'),
  body('onboardingRole')
    .optional()
    .isString()
    .withMessage('Onboarding role must be a string'),
  body('hasCompletedOnboarding')
    .optional()
    .isBoolean()
    .withMessage('hasCompletedOnboarding must be a boolean')
];

const completeOnboardingValidation = [
  body('onboardingData')
    .isObject()
    .withMessage('Onboarding data must be an object'),
  body('onboardingData.role')
    .isString()
    .withMessage('Role is required in onboarding data'),
  body('onboardingData.completedAt')
    .isISO8601()
    .withMessage('completedAt must be a valid ISO date')
];

// @desc    Update user role during onboarding
// @route   PUT /api/onboarding/role
// @access  Private
router.put('/role', authenticateToken, updateRoleValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { role, onboardingRole, hasCompletedOnboarding } = req.body;
  const userId = req.user.id;

  console.log(`👤 ONBOARDING: Updating role for user ${userId} to ${role} (onboarding role: ${onboardingRole})`);

  try {
    // Update user role and onboarding status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role,
        // Store onboarding-specific data in a JSON field or separate table if needed
        ...(onboardingRole && {
          // We can store this in bio or create a dedicated field
          position: onboardingRole === 'OWNER' ? 'Owner' : 
                   onboardingRole === 'FIELD_DIRECTOR' ? 'Field Director' :
                   onboardingRole === 'OFFICE_STAFF' ? 'Office Staff' :
                   onboardingRole === 'PROJECT_MANAGER' ? 'Project Manager' :
                   onboardingRole === 'ADMIN' ? 'Administrator' : null
        }),
        // Mark onboarding completion if specified
        ...(typeof hasCompletedOnboarding === 'boolean' && {
          // We'll use a field in the user model to track this
          // For now, we can use the bio field to store onboarding status
          bio: hasCompletedOnboarding ? `onboarding_completed:${new Date().toISOString()}` : null
        }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        position: true,
        bio: true,
        avatar: true,
        isVerified: true
      }
    });

    console.log(`✅ ONBOARDING: Successfully updated user role`);

    res.json({
      success: true,
      data: { 
        user: {
          ...updatedUser,
          hasCompletedOnboarding: updatedUser.bio?.startsWith('onboarding_completed:') || false,
          onboardingRole: onboardingRole
        }
      },
      message: 'User role updated successfully'
    });

  } catch (error) {
    console.error('❌ ONBOARDING: Error updating user role:', error);
    throw new AppError('Failed to update user role', 500);
  }
}));

// @desc    Complete user onboarding
// @route   POST /api/onboarding/complete
// @access  Private
router.post('/complete', authenticateToken, completeOnboardingValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors)
    });
  }

  const { onboardingData } = req.body;
  const userId = req.user.id;

  console.log(`🎯 ONBOARDING: Completing onboarding for user ${userId}`);

  try {
    // Store onboarding completion data
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        // Store onboarding completion in bio field (in production, create dedicated fields)
        bio: `onboarding_completed:${onboardingData.completedAt}|data:${JSON.stringify(onboardingData)}`,
        updatedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        position: true,
        bio: true,
        avatar: true,
        isVerified: true
      }
    });

    // If this is an Owner role with workflow setup, we could initialize workflow data here
    if (onboardingData.role === 'OWNER' && onboardingData.workflowSetup) {
      console.log(`🔧 ONBOARDING: Setting up workflow for Owner user`);
      
      // In a full implementation, we would:
      // 1. Create custom workflow templates based on their choice
      // 2. Initialize workflow phases/sections/line items
      // 3. Set up default alert configurations
      // 4. Configure user preferences
      
      // For now, we'll just log the workflow setup data
      console.log('Workflow setup data:', onboardingData.workflowSetup);
    }

    console.log(`✅ ONBOARDING: Successfully completed onboarding for user ${userId}`);

    res.json({
      success: true,
      data: { 
        user: {
          ...updatedUser,
          hasCompletedOnboarding: true,
          onboardingData: onboardingData
        }
      },
      message: 'Onboarding completed successfully'
    });

  } catch (error) {
    console.error('❌ ONBOARDING: Error completing onboarding:', error);
    throw new AppError('Failed to complete onboarding', 500);
  }
}));

// @desc    Get user onboarding status
// @route   GET /api/onboarding/status
// @access  Private
router.get('/status', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        position: true,
        bio: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Parse onboarding status from bio field
    const hasCompletedOnboarding = user.bio?.startsWith('onboarding_completed:') || false;
    let onboardingData = null;

    if (hasCompletedOnboarding && user.bio) {
      try {
        const bioData = user.bio.split('|data:');
        if (bioData.length > 1) {
          onboardingData = JSON.parse(bioData[1]);
        }
      } catch (parseError) {
        console.warn('Failed to parse onboarding data from bio field');
      }
    }

    // Determine if user needs onboarding
    const needsOnboarding = !hasCompletedOnboarding && (
      user.role === 'WORKER' || // Default role that needs role selection
      !user.role ||             // No role set
      new Date() - new Date(user.createdAt) < 24 * 60 * 60 * 1000 // Created within 24 hours
    );

    res.json({
      success: true,
      data: {
        needsOnboarding,
        hasCompletedOnboarding,
        onboardingData,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          position: user.position
        }
      },
      message: 'Onboarding status retrieved successfully'
    });

  } catch (error) {
    console.error('❌ ONBOARDING: Error getting onboarding status:', error);
    throw new AppError('Failed to get onboarding status', 500);
  }
}));

// @desc    Reset user onboarding (for testing/admin purposes)
// @route   POST /api/onboarding/reset
// @access  Private
router.post('/reset', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  console.log(`🔄 ONBOARDING: Resetting onboarding for user ${userId}`);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'WORKER', // Reset to default role
        position: null,
        bio: null, // Clear onboarding data
        updatedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        position: true,
        bio: true
      }
    });

    console.log(`✅ ONBOARDING: Successfully reset onboarding for user ${userId}`);

    res.json({
      success: true,
      data: { 
        user: {
          ...updatedUser,
          hasCompletedOnboarding: false,
          needsOnboarding: true
        }
      },
      message: 'Onboarding reset successfully'
    });

  } catch (error) {
    console.error('❌ ONBOARDING: Error resetting onboarding:', error);
    throw new AppError('Failed to reset onboarding', 500);
  }
}));

// @desc    Get available roles for onboarding
// @route   GET /api/onboarding/roles
// @access  Public (or Private if you prefer)
router.get('/roles', asyncHandler(async (req, res) => {
  const roles = [
    {
      id: 'ADMIN',
      name: 'Administration',
      description: 'Manage company settings, users, and overall system configuration',
      dbRole: 'ADMIN'
    },
    {
      id: 'FIELD_DIRECTOR',
      name: 'Field Director',
      description: 'Oversee field operations, crew management, and on-site project execution',
      dbRole: 'FOREMAN'
    },
    {
      id: 'OFFICE_STAFF',
      name: 'Office Staff',
      description: 'Handle customer communications, scheduling, and administrative tasks',
      dbRole: 'WORKER'
    },
    {
      id: 'OWNER',
      name: 'Owner',
      description: 'Full system access with advanced workflow customization and business controls',
      dbRole: 'ADMIN'
    },
    {
      id: 'PROJECT_MANAGER',
      name: 'Project Manager',
      description: 'Coordinate project workflows, manage timelines, and oversee project delivery',
      dbRole: 'PROJECT_MANAGER'
    }
  ];

  res.json({
    success: true,
    data: { roles },
    message: 'Available roles retrieved successfully'
  });
}));

module.exports = router;