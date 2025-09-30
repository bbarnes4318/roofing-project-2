const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../services/EmailService');
const { prisma } = require('../config/prisma');

/**
 * @route   GET /api/email/status
 * @desc    Check if email service is available
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    available: emailService.isAvailable(),
    fromEmail: emailService.fromEmail,
    fromName: emailService.fromName
  });
});

/**
 * @route   POST /api/email/send
 * @desc    Send email with optional attachments
 * @access  Private
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, text, html, attachments, replyTo, tags } = req.body;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, and text or html are required'
      });
    }

    // Send email
    const result = await emailService.sendEmail({
      to,
      subject,
      text,
      html,
      attachments,
      replyTo,
      tags: {
        ...tags,
        sentBy: req.user.id,
        sentByName: req.user.name
      }
    });

    // Log the email to database
    await emailService.logEmail({
      senderId: req.user.id,
      senderEmail: req.user.email,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      to,
      subject,
      text,
      html,
      attachments,
      messageId: result.messageId,
      emailType: 'general',
      status: 'sent',
      tags: { ...tags, sentBy: req.user.id },
      replyTo
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/email/send-to-customer
 * @desc    Send email to a customer by ID
 * @access  Private
 */
router.post('/send-to-customer', authenticateToken, async (req, res) => {
  try {
    const { customerId, subject, text, html, attachments, replyTo } = req.body;

    if (!customerId || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId, subject, and text or html'
      });
    }

    const result = await emailService.sendEmailToCustomer(customerId, {
      subject,
      text,
      html,
      attachments,
      replyTo
    });

    // Log activity
    await emailService.logEmail({
      senderId: req.user.id,
      senderEmail: req.user.email,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      to: result.to,
      subject,
      text,
      html,
      attachments,
      messageId: result.messageId,
      customerId,
      emailType: 'customer_communication',
      status: 'sent',
      replyTo
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Customer email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/email/send-to-user
 * @desc    Send email to a user by ID
 * @access  Private
 */
router.post('/send-to-user', authenticateToken, async (req, res) => {
  try {
    const { userId, subject, text, html, attachments, replyTo } = req.body;

    if (!userId || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, subject, and text or html'
      });
    }

    const result = await emailService.sendEmailToUser(userId, {
      subject,
      text,
      html,
      attachments,
      replyTo
    });

    // Log activity
    await emailService.logEmail({
      senderId: req.user.id,
      senderEmail: req.user.email,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      to: result.to,
      subject,
      text,
      html,
      attachments,
      messageId: result.messageId,
      emailType: 'team_communication',
      status: 'sent',
      tags: { recipientUserId: userId },
      replyTo
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('User email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/email/send-with-template
 * @desc    Send email using built-in template
 * @access  Private
 */
router.post('/send-with-template', authenticateToken, async (req, res) => {
  try {
    const { to, subject, title, content, footer, attachments, replyTo } = req.body;

    if (!to || !subject || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, title, and content'
      });
    }

    // Create HTML using template
    const html = emailService.createEmailTemplate({
      title,
      content,
      footer
    });

    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      attachments,
      replyTo,
      tags: {
        sentBy: req.user.id,
        template: 'professional'
      }
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Template email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/email/send-project-update
 * @desc    Send project update email to customer
 * @access  Private
 */
router.post('/send-project-update', authenticateToken, async (req, res) => {
  try {
    const { projectId, message, attachments } = req.body;

    if (!projectId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId and message'
      });
    }

    // Fetch project and customer details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: {
          select: { email: true, name: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (!project.customer?.email) {
      return res.status(400).json({
        success: false,
        error: 'Customer has no email address'
      });
    }

    // Create email template
    const html = emailService.createEmailTemplate({
      title: `Update on ${project.projectName}`,
      content: `
        <p>Hello ${project.customer.name},</p>
        <p>${message}</p>
        <p><strong>Project:</strong> ${project.projectName}</p>
        <p><strong>Address:</strong> ${project.address || 'N/A'}</p>
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p>Best regards,<br>${req.user.name}</p>
      `,
      footer: 'This is an automated update from your project team at Kenstruction.'
    });

    const result = await emailService.sendEmail({
      to: project.customer.email,
      subject: `Update on ${project.projectName}`,
      html,
      attachments,
      replyTo: req.user.email,
      tags: {
        projectId,
        customerId: project.customerId,
        type: 'project_update'
      }
    });

    // Log project update email
    await emailService.logEmail({
      senderId: req.user.id,
      senderEmail: req.user.email,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      to: [project.customer.email],
      subject: `Update on ${project.projectName}`,
      html,
      attachments,
      messageId: result.messageId,
      projectId,
      customerId: project.customerId,
      emailType: 'project_update',
      status: 'sent',
      tags: { type: 'project_update' },
      replyTo: req.user.email
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Project update email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/email/history
 * @desc    Get email history with filters
 * @access  Private
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { projectId, customerId, emailType, limit = 50, offset = 0 } = req.query;

    const where = {
      isDeleted: false
    };

    if (projectId) where.projectId = projectId;
    if (customerId) where.customerId = customerId;
    if (emailType) where.emailType = emailType;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          project: {
            select: {
              id: true,
              projectName: true,
              projectNumber: true
            }
          },
          customer: {
            select: {
              id: true,
              primaryName: true,
              primaryEmail: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.email.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        emails,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Email history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/email/history/project/:projectId
 * @desc    Get email history for a specific project
 * @access  Private
 */
router.get('/history/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const emails = await prisma.email.findMany({
      where: {
        projectId,
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: emails
    });

  } catch (error) {
    console.error('Project email history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/email/history/customer/:customerId
 * @desc    Get email history for a specific customer
 * @access  Private
 */
router.get('/history/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;

    const emails = await prisma.email.findMany({
      where: {
        customerId,
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            projectName: true,
            projectNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: emails
    });

  } catch (error) {
    console.error('Customer email history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/email/:emailId
 * @desc    Get single email details
 * @access  Private
 */
router.get('/:emailId', authenticateToken, async (req, res) => {
  try {
    const { emailId } = req.params;

    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            projectName: true,
            projectNumber: true
          }
        },
        customer: {
          select: {
            id: true,
            primaryName: true,
            primaryEmail: true
          }
        },
        task: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    res.json({
      success: true,
      data: email
    });

  } catch (error) {
    console.error('Email details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
