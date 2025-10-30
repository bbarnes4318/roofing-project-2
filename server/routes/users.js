const express = require('express');
const { prisma } = require('../config/prisma');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
// Authentication middleware removed - all users can manage users
// const { authenticateToken, authorize } = require('../middleware/auth');
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
      isVerified: true
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

const { createSupabaseUser, deleteSupabaseUser } = require('../services/supabaseService');

// @desc    Add new team member
// @route   POST /api/users/add-team-member
// @access  Private (Admin/Manager only)
router.post('/add-team-member', asyncHandler(async (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    phone, 
    secondaryPhone, 
    preferredPhone, 
    role,
    password 
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !role) {
    return res.status(400).json({
      success: false,
      message: 'First name, last name, email, and role are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Check if user already exists in local DB
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Generate a temporary password if not provided
  const temporaryPassword = password || crypto.randomBytes(16).toString('hex');

  let supabaseUser;
  try {
    // Step 1: Create user in Supabase
    supabaseUser = await createSupabaseUser(email, temporaryPassword, {
      firstName,
      lastName,
      role,
    });

    // Step 2: Create user in local Prisma database
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newUser = await prisma.user.create({
      data: {
        id: supabaseUser.id, // Use the ID from Supabase
        firstName,
        lastName,
        email,
        phone: phone || null,
        secondaryPhone: secondaryPhone || null,
        preferredPhone: preferredPhone || phone || null,
        role,
        password: await bcrypt.hash(temporaryPassword, 12),
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

    // Step 3: Send invitation email
    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-profile?token=${emailVerificationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Kenstruction</title>
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
            <h1>Welcome to Kenstruction!</h1>
            <p>You've been invited to join our team</p>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>You've been added to our Kenstruction team as a <strong>${role}</strong>. We're excited to have you on board!</p>
            
            <p>To get started, please complete your profile setup by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${setupLink}" class="button">Complete Profile Setup</a>
            </div>
            
            <p><strong>What you'll need to do:</strong></p>
            <ul>
              <li>Set up your password</li>
              <li>Complete your profile information</li>
              <li>Review your contact preferences</li>
            </ul>
            
            <p><strong>Your contact information:</strong></p>
            <ul>
              <li>Primary Phone: ${phone || 'Not provided'}</li>
              ${secondaryPhone ? `<li>Secondary Phone: ${secondaryPhone}</li>` : ''}
              <li>Preferred Contact: ${preferredPhone || phone || 'Not specified'}</li>
            </ul>
            
            <p>This link will expire in 7 days. If you have any questions, please contact your team administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Kenstruction. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Welcome to Kenstruction!
Hello ${firstName}!
You've been added to our Kenstruction team as a ${role}. We're excited to have you on board!
To get started, please complete your profile setup by visiting this link:
${setupLink}
This link will expire in 7 days. If you have any questions, please contact your team administrator.
    `;
    
    let emailSent = false;
    let emailError = null;

    try {
      await emailService.sendEmail({
        to: email,
        subject: 'Welcome to Kenstruction - Complete Your Profile Setup',
        html: emailHtml,
        text: emailText,
      });
      emailSent = true;
    } catch (err) {
      emailError = err.message;
    }

    res.json({
      success: true,
      data: { 
        user: newUser,
        emailSent,
        emailError,
        setupLink: emailSent ? null : setupLink,
      },
      message: 'Team member added successfully.'
    });

  } catch (error) {
    // If any step fails, roll back the Supabase user creation
    if (supabaseUser) {
      await deleteSupabaseUser(supabaseUser.id);
    }
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team member',
      error: error.message
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
        <title>Welcome to Kenstruction</title>
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
            <h1>Welcome to Kenstruction!</h1>
            <p>You've been invited to join our team</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>You've been added to our Kenstruction team as a ${user.role}. We're excited to have you on board!</p>
            <p>To get started, please complete your profile setup by clicking the button below:</p>
            <a href="${setupLink}" class="button">Complete Your Profile Setup</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${setupLink}</p>
            <p>This link will expire in 7 days. If you have any questions, please contact your team administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Kenstruction. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Welcome to Kenstruction!

Hello ${user.firstName}!

You've been added to our Kenstruction team as a ${user.role}. We're excited to have you on board!

To get started, please complete your profile setup by visiting this link:
${setupLink}

This link will expire in 7 days. If you have any questions, please contact your team administrator.

This is an automated message from Kenstruction. Please do not reply to this email.
    `;

    // Send the invitation email with retry
    let emailSent = false;
    let emailError = null;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await emailService.sendEmail({
          to: user.email,
          subject: 'Welcome to Kenstruction - Complete Your Profile Setup',
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

module.exports = router; 