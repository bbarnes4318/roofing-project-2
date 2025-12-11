const express = require('express');
const { prisma } = require('../config/prisma');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
const { authenticateToken, adminOnly } = require('../middleware/auth');
const emailService = require('../services/EmailService');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin/Manager only)
router.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      secondaryPhone: true,
      preferredPhone: true,
      position: true,
      department: true,
      bio: true,
      isActive: true,
      isVerified: true,
      theme: true,
      language: true,
      timezone: true,
      skills: true,
      experience: true,
      createdAt: true,
      last_login: true
    },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' }
    ]
  });

  res.json({
    success: true,
    data: users,
    message: 'Users retrieved successfully'
  });
}));

// @desc    Get team members (users who can be assigned to tasks/alerts)
// @route   GET /api/users/team-members
// @access  Private
router.get('/team-members', asyncHandler(async (req, res) => {
  // Get all active users except clients
  const teamMembers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { not: 'CLIENT' }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      position: true,
      avatar: true,
      isActive: true,
      isVerified: true,
      calendarColor: true
    },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' }
    ]
  });

  // Debug logging to help diagnose missing users in client
  try {
    console.log(`GET /api/users/team-members - requested by userId=${req.user ? req.user.id : 'unknown'} - found ${Array.isArray(teamMembers) ? teamMembers.length : 0} teamMembers`);
    if (Array.isArray(teamMembers) && teamMembers.length > 0) {
      console.log('Sample teamMembers:', teamMembers.slice(0, 5).map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role })));
    }
  } catch (e) {
    // ignore logging errors
  }

  res.json({
    success: true,
    data: { teamMembers },
    message: 'Team members retrieved successfully'
  });
}));

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      secondaryPhone: true,
      preferredPhone: true,
      position: true,
      department: true,
      bio: true,
      isActive: true,
      isVerified: true,
      theme: true,
      language: true,
      timezone: true,
      skills: true,
      experience: true,
      createdAt: true,
      last_login: true,
      projectsAsManager: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      }
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
    data: { user },
    message: 'User retrieved successfully'
  });
}));

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin/Manager only)
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { firstName, lastName, email, phone, secondaryPhone, preferredPhone, role, isActive } = req.body;

  console.log('🔍 UPDATE-USER: Request received:', {
    userId,
    updateFields: { firstName, lastName, email, phone, role, isActive }
  });

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true }
  });

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Build update data object - only include fields that are provided
  const updateData = {};

  if (firstName !== undefined && firstName !== null) {
    updateData.firstName = firstName.trim().substring(0, 100);
  }
  if (lastName !== undefined && lastName !== null) {
    updateData.lastName = lastName.trim().substring(0, 100);
  }
  if (email !== undefined && email !== null) {
    const normalizedEmail = email.trim().toLowerCase();
    // Check if email is being changed and if new email already exists
    if (normalizedEmail !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another user'
        });
      }
    }
    updateData.email = normalizedEmail;
  }
  if (phone !== undefined && phone !== null) {
    // Clean phone number (remove formatting)
    const cleanPhone = phone.trim().replace(/\D/g, '');
    updateData.phone = cleanPhone || null;
  }
  if (secondaryPhone !== undefined && secondaryPhone !== null) {
    const cleanSecondaryPhone = secondaryPhone.trim().replace(/\D/g, '');
    updateData.secondaryPhone = cleanSecondaryPhone || null;
  }
  if (preferredPhone !== undefined && preferredPhone !== null) {
    const cleanPreferredPhone = preferredPhone.trim().replace(/\D/g, '');
    updateData.preferredPhone = cleanPreferredPhone || null;
  }
  if (role !== undefined && role !== null) {
    // Normalize role to uppercase
    const normalizedRole = role.toUpperCase();
    const validRoles = ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT', 'SUBCONTRACTOR'];
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    updateData.role = normalizedRole;
  }
  if (isActive !== undefined && isActive !== null) {
    updateData.isActive = isActive === true || isActive === 'true';
  }

  // Don't update if no fields were provided
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields provided to update'
    });
  }

  console.log('🔍 UPDATE-USER: Update data:', updateData);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        isVerified: true,
        createdAt: true
      }
    });

    console.log('✅ UPDATE-USER: User updated successfully:', {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role
    });

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('❌ UPDATE-USER: Error updating user:', error);
    console.error('❌ UPDATE-USER: Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta
    });

    // Check for Prisma unique constraint violation (duplicate email)
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Email already in use by another user',
        error: 'Duplicate email address'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message || 'Unknown error occurred'
    });
  }
}));

// @desc    Add new team member
// @route   POST /api/users/add-team-member
// @access  Private (Admin/Manager only)
router.post('/add-team-member', authenticateToken, asyncHandler(async (req, res) => {
  console.log('🔍 ADD-TEAM-MEMBER: Route hit - Request received');
  console.log('🔍 ADD-TEAM-MEMBER: Authenticated user:', req.user ? {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  } : 'NO USER');
  
  const { 
    firstName, 
    lastName, 
    email, 
    phone, 
    secondaryPhone, 
    preferredPhone, 
    role
  } = req.body;

  console.log('🔍 ADD-TEAM-MEMBER: Request body:', {
    firstName,
    lastName,
    email,
    phone,
    secondaryPhone,
    preferredPhone,
    role
  });

  // Validate required fields
  if (!firstName || !firstName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'First name is required'
    });
  }
  if (!lastName || !lastName.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Last name is required'
    });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Role is required'
    });
  }

  // Normalize role to uppercase to match enum
  const normalizedRole = role.toUpperCase();
  const validRoles = ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT', 'SUBCONTRACTOR'];
  if (!validRoles.includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() }
  });

  if (existingUser) {
    console.log('❌ ADD-TEAM-MEMBER: User already exists:', existingUser.id);
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const emailVerificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    console.log('🔍 ADD-TEAM-MEMBER: Creating user with data:', {
      firstName,
      lastName,
      email,
      phone,
      secondaryPhone,
      preferredPhone,
      role
    });

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();
    
    // Clean phone numbers (remove formatting like parentheses, dashes, spaces)
    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;
    const cleanSecondaryPhone = secondaryPhone ? secondaryPhone.replace(/\D/g, '') : null;
    const cleanPreferredPhone = preferredPhone ? preferredPhone.replace(/\D/g, '') : cleanPhone;
    
    console.log('🔍 ADD-TEAM-MEMBER: Cleaned phone numbers:', {
      originalPhone: phone,
      cleanedPhone: cleanPhone,
      originalSecondary: secondaryPhone,
      cleanedSecondary: cleanSecondaryPhone,
      originalPreferred: preferredPhone,
      cleanedPreferred: cleanPreferredPhone
    });
    
    // Create new user in database
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phone: cleanPhone || null,
          secondaryPhone: cleanSecondaryPhone || null,
          preferredPhone: cleanPreferredPhone || null,
          role: normalizedRole,
          password: 'GOOGLE_OAUTH_MANAGED', // Users authenticate via Google OAuth, no password needed
          isActive: true,
          isVerified: false,
          emailVerificationToken,
          emailVerificationExpires,
          theme: 'LIGHT',
          language: 'en',
          timezone: 'UTC'
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
          isVerified: false,
          createdAt: true
        }
      });
      
      console.log('✅ ADD-TEAM-MEMBER: User created successfully:', {
        id: newUser.id,
        name: `${newUser.firstName} ${newUser.lastName}`,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        isVerified: newUser.isVerified
      });
    } catch (createError) {
      console.error('❌ ADD-TEAM-MEMBER: Prisma user creation error:', createError);
      console.error('❌ ADD-TEAM-MEMBER: Error code:', createError.code);
      console.error('❌ ADD-TEAM-MEMBER: Error meta:', createError.meta);
      throw createError; // Re-throw to be caught by outer catch
    }

    // Send invitation email
    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-profile?token=${emailVerificationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Bubbles AI</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .button:hover { background: #5a6fd8; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Bubbles AI!</h1>
            <p>You've been invited to join our team</p>
          </div>
          <div class="content">
            <h2>Hello ${newUser.firstName}!</h2>
            <p>You've been added to our Bubbles AI team as a <strong>${newUser.role}</strong>. We're excited to have you on board!</p>
            
            <p>To get started, please complete your profile setup by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${setupLink}" class="button">Complete Profile Setup</a>
            </div>
            
            <p><strong>How to get started:</strong></p>
            <ul>
              <li>Click the button below to access your account</li>
              <li>Sign in with your Google account (${normalizedEmail})</li>
              <li>Complete your profile information</li>
              <li>Review your contact preferences</li>
            </ul>
            
            <p><strong>Login Instructions:</strong></p>
            <p>To access your account, simply visit our app and click "Continue with Google". Make sure to use the email address: <strong>${normalizedEmail}</strong></p>
            
            <p><strong>Your contact information:</strong></p>
            <ul>
              <li>Primary Phone: ${newUser.phone || 'Not provided'}</li>
              ${newUser.secondaryPhone ? `<li>Secondary Phone: ${newUser.secondaryPhone}</li>` : ''}
              <li>Preferred Contact: ${newUser.preferredPhone || newUser.phone || 'Not specified'}</li>
            </ul>
            
            <p>This link will expire in 7 days. If you have any questions, please contact your team administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Bubbles AI. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Welcome to Bubbles AI!

Hello ${newUser.firstName}!

You've been added to our Bubbles AI team as a ${newUser.role}. We're excited to have you on board!

To get started, please complete your profile setup by visiting this link:
${setupLink}

How to get started:
- Click the link above to access your account
- Sign in with your Google account (${normalizedEmail})
- Complete your profile information
- Review your contact preferences

Login Instructions:
To access your account, simply visit our app and click "Continue with Google". Make sure to use the email address: ${normalizedEmail}

Your contact information:
- Primary Phone: ${newUser.phone || 'Not provided'}
${newUser.secondaryPhone ? `- Secondary Phone: ${newUser.secondaryPhone}` : ''}
- Preferred Contact: ${newUser.preferredPhone || newUser.phone || 'Not specified'}

This link will expire in 7 days. If you have any questions, please contact your team administrator.

This is an automated message from Bubbles AI. Please do not reply to this email.
    `;

    // Check if email service is available
    console.log('🔍 ADD-TEAM-MEMBER: Email service available:', emailService.isAvailable());
    console.log('🔍 ADD-TEAM-MEMBER: RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);
    
    // Send the invitation email - now with built-in retry logic
    let emailSent = false;
    let emailError = null;
    
    if (!emailService.isAvailable()) {
      emailError = 'Email service not configured - missing RESEND_API_KEY';
      console.error('❌ ADD-TEAM-MEMBER: Email service not available:', emailError);
    } else {
      try {
        console.log('🔍 ADD-TEAM-MEMBER: Attempting to send email to:', normalizedEmail);
        await emailService.sendEmail({
          to: normalizedEmail,
          subject: 'Welcome to Bubbles AI - Complete Your Profile Setup',
          html: emailHtml,
          text: emailText,
          tags: {
            type: 'team_member_invitation',
            sentBy: 'system',
            newUserId: newUser.id
          }
        });
        emailSent = true;
        console.log(`✅ ADD-TEAM-MEMBER: Team member invitation email sent successfully to: ${normalizedEmail}`);
      } catch (emailErr) {
        emailError = emailErr.message;
        console.error(`❌ ADD-TEAM-MEMBER: Failed to send team member invitation email:`, emailErr);
        console.error(`❌ ADD-TEAM-MEMBER: Email error stack:`, emailErr.stack);
      }
    }

    // Verify user was actually created by querying it back
    const verifyUser = await prisma.user.findUnique({
      where: { id: newUser.id }
    });
    
    if (!verifyUser) {
      console.error('❌ ADD-TEAM-MEMBER: User creation verification failed - user not found in database');
      throw new Error('User was not created successfully. Please try again.');
    }
    
    console.log('✅ ADD-TEAM-MEMBER: User creation verified:', {
      id: verifyUser.id,
      email: verifyUser.email,
      name: `${verifyUser.firstName} ${verifyUser.lastName}`
    });
    
    // Return success with accurate email status
    const responseMessage = emailSent 
      ? 'Team member added successfully. Invitation email sent.'
      : `Team member added successfully, but invitation email failed to send. Please contact ${normalizedEmail} directly with this setup link: ${setupLink}`;
    
    const responseData = {
      success: true,
      data: { 
        user: {
          id: verifyUser.id,
          firstName: verifyUser.firstName,
          lastName: verifyUser.lastName,
          email: verifyUser.email,
          role: verifyUser.role,
          isActive: verifyUser.isActive,
          isVerified: verifyUser.isVerified,
          createdAt: verifyUser.createdAt
        },
        emailSent,
        emailError: emailError || null,
        setupLink: setupLink // Always provide setupLink as fallback
      },
      message: responseMessage
    };
    
    console.log('✅ ADD-TEAM-MEMBER: Sending success response:', {
      success: responseData.success,
      userId: responseData.data.user.id,
      email: responseData.data.user.email,
      emailSent: responseData.data.emailSent
    });
    
    res.json(responseData);

  } catch (error) {
    console.error('❌ ADD-TEAM-MEMBER: Error adding team member:', error);
    console.error('❌ ADD-TEAM-MEMBER: Error stack:', error.stack);
    console.error('❌ ADD-TEAM-MEMBER: Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    
    // Check for Prisma unique constraint violation (duplicate email)
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        error: 'Duplicate email address'
      });
    }
    
    // Check for Prisma validation errors
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data provided. Please check all fields.',
        error: error.meta?.field_name || 'Validation error'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to add team member',
      error: error.message || 'Unknown error occurred'
    });
  }
}));

// @desc    Resend invitation email to team member
// @route   POST /api/users/resend-invitation
// @access  Private (Admin/Manager only)
router.post('/resend-invitation', asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phone: true,
        secondaryPhone: true,
        preferredPhone: true,
        isVerified: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User has already completed their profile setup'
      });
    }

    // Generate new email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update user with new token
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken,
        emailVerificationExpires
      }
    });

    // Create setup link
    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-profile?token=${emailVerificationToken}`;
    
    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Bubbles AI</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .button:hover { background: #5a6fd8; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Bubbles AI!</h1>
            <p>You've been invited to join our team</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>You've been added to our Bubbles AI team as a ${user.role}. We're excited to have you on board!</p>
            <p>To get started, please complete your profile setup by clicking the button below:</p>
            <a href="${setupLink}" class="button">Complete Your Profile Setup</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${setupLink}</p>
            <p>This link will expire in 7 days. If you have any questions, please contact your team administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Bubbles AI. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Welcome to Bubbles AI!

Hello ${user.firstName}!

You've been added to our Bubbles AI team as a ${user.role}. We're excited to have you on board!

To get started, please complete your profile setup by visiting this link:
${setupLink}

This link will expire in 7 days. If you have any questions, please contact your team administrator.

This is an automated message from Bubbles AI. Please do not reply to this email.
    `;

    // Send the invitation email with retry
    let emailSent = false;
    let emailError = null;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await emailService.sendEmail({
          to: user.email,
          subject: 'Welcome to Bubbles AI - Complete Your Profile Setup',
          html: emailHtml,
          text: emailText,
          tags: {
            type: 'team_member_invitation_resent',
            sentBy: 'system',
            userId: user.id
          }
        });
        emailSent = true;
        console.log(`✅ Resent invitation email successfully to: ${user.email} (attempt ${attempt})`);
        break;
      } catch (emailErr) {
        emailError = emailErr.message;
        console.error(`❌ Failed to resend invitation email (attempt ${attempt}/${maxRetries}):`, emailErr.message);
        
        if (attempt < maxRetries) {
          console.log(`🔄 Retrying email send in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    const responseMessage = emailSent 
      ? 'Invitation email resent successfully.'
      : `Failed to resend invitation email. Please contact ${user.email} directly with this setup link: ${setupLink}`;

    res.json({
      success: true,
      data: { 
        user,
        emailSent,
        emailError: emailError || null,
        setupLink: emailSent ? null : setupLink
      },
      message: responseMessage
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend invitation',
      error: error.message
    });
  }
}));

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, adminOnly, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const currentUser = req.user;

  // Prevent users from deleting themselves
  if (currentUser.id === userId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent deleting other admins (optional safety check)
  // You can remove this if you want admins to be able to delete other admins
  if (user.role === 'ADMIN' && currentUser.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can delete other administrators'
    });
  }

  // Delete the user
  await prisma.user.delete({
    where: { id: userId }
  });

  console.log(`✅ User deleted: ${user.email} (${user.firstName} ${user.lastName}) by ${currentUser.email}`);

  res.json({
    success: true,
    message: `User ${user.firstName} ${user.lastName} has been deleted successfully`
  });
}));

// @desc    Update user's calendar color
// @route   PUT /api/users/:id/calendar-color
// @access  Private (self or admin)
router.put('/:id/calendar-color', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { calendarColor } = req.body;

  // Users can only update their own color, unless they are admin
  if (req.user.id !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own calendar color'
    });
  }

  // Validate hex color format
  if (calendarColor && !/^#[0-9A-Fa-f]{6}$/.test(calendarColor)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid color format. Must be a hex color code (e.g., #3B82F6)'
    });
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update the user's calendar color
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { calendarColor: calendarColor || null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      calendarColor: true
    }
  });

  console.log(`✅ Calendar color updated for user ${updatedUser.firstName} ${updatedUser.lastName}: ${calendarColor}`);

  res.json({
    success: true,
    data: { user: updatedUser },
    message: 'Calendar color updated successfully'
  });
}));

module.exports = router; 