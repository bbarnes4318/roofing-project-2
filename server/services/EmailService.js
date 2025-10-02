const { Resend } = require('resend');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../config/prisma');

class EmailService {
  constructor() {
    this.resend = null;
    this.initialized = false;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    this.fromName = process.env.RESEND_FROM_NAME || 'Kenstruction';
    
    this.initialize();
  }

  initialize() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY not found. Email functionality will be disabled.');
      return;
    }

    try {
      this.resend = new Resend(apiKey);
      this.initialized = true;
      console.log('✅ Resend Email Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Resend:', error.message);
    }
  }

  isAvailable() {
    return this.initialized && this.resend !== null;
  }

  /**
   * Send an email with optional attachments
   * @param {Object} options - Email options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content (optional)
   * @param {Array} options.attachments - Attachments array (optional)
   * @param {string} options.attachments[].filename - Attachment filename
   * @param {string} options.attachments[].content - Base64 encoded content or Buffer
   * @param {string} options.attachments[].path - File path (alternative to content)
   * @param {string} options.replyTo - Reply-to email (optional)
   * @param {Object} options.tags - Email tags for tracking (optional)
   * @returns {Promise<Object>} Result with success status and data
   */
  async sendEmail({ to, subject, text, html, attachments = [], replyTo, tags = {} }) {
    if (!this.isAvailable()) {
      throw new Error('Email service is not available. Please configure RESEND_API_KEY.');
    }

    try {
      // Ensure 'to' is an array
      const recipients = Array.isArray(to) ? to : [to];

      // Validate recipients
      if (!recipients.length || recipients.some(email => !this.isValidEmail(email))) {
        throw new Error('Invalid recipient email address(es)');
      }

      // Process attachments
      const processedAttachments = await this.processAttachments(attachments);

      // Build email payload
      const emailPayload = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: recipients,
        subject,
        text: text || this.stripHtml(html),
        ...(html && { html }),
        ...(processedAttachments.length > 0 && { attachments: processedAttachments }),
        ...(replyTo && { reply_to: replyTo }),
        ...(Object.keys(tags).length > 0 && { tags })
      };

      // Send email via Resend
      const result = await this.resend.emails.send(emailPayload);

      console.log(`📧 Email sent successfully to ${recipients.join(', ')} (ID: ${result.data?.id})`);

      return {
        success: true,
        messageId: result.data?.id,
        to: recipients,
        subject,
        sentAt: new Date()
      };

    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Log email to database for history tracking
   * @param {Object} emailData - Email data to log
   * @returns {Promise<Object>} Created email record
   */
  async logEmail({ 
    senderId, 
    senderEmail, 
    senderName,
    to, 
    subject, 
    text, 
    html, 
    attachments = [],
    messageId,
    projectId,
    customerId,
    taskId,
    emailType = 'general',
    status = 'sent',
    tags = {},
    metadata = {},
    replyTo
  }) {
    try {
      // Prepare recipient arrays
      const toEmails = Array.isArray(to) ? to : [to];
      const toNames = toEmails.map(() => ''); // Names can be populated if available

      // Prepare attachments JSON
      const attachmentsJson = attachments.length > 0 ? attachments.map(att => ({
        filename: att.filename || 'attachment',
        documentId: att.documentId || null,
        size: att.size || null,
        mimeType: att.mimeType || null
      })) : null;

      // Create email record
      const emailRecord = await prisma.email.create({
        data: {
          senderId,
          senderEmail,
          senderName,
          toEmails,
          toNames,
          ccEmails: [],
          bccEmails: [],
          replyTo,
          subject,
          bodyText: text,
          bodyHtml: html,
          emailType,
          status,
          projectId,
          customerId,
          taskId,
          attachments: attachmentsJson,
          messageId,
          sentAt: new Date(),
          tags,
          metadata
        }
      });

      console.log(`📝 Email logged to database (ID: ${emailRecord.id})`);
      return emailRecord;

    } catch (error) {
      console.error('⚠️ Failed to log email to database:', error.message);
      // Don't throw - logging failure shouldn't break email sending
      return null;
    }
  }

  /**
   * Send email to a customer by customer ID
   * @param {string} customerId - Customer ID
   * @param {Object} emailData - Email content
   * @returns {Promise<Object>} Result
   */
  async sendEmailToCustomer(customerId, { subject, text, html, attachments = [], replyTo }) {
    try {
      // Fetch customer from database
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { email: true, name: true }
      });

      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      if (!customer.email) {
        throw new Error(`Customer ${customer.name} has no email address`);
      }

      // Send email
      return await this.sendEmail({
        to: customer.email,
        subject,
        text,
        html,
        attachments,
        replyTo,
        tags: { customerId, type: 'customer_communication' }
      });

    } catch (error) {
      console.error('❌ Failed to send email to customer:', error.message);
      throw error;
    }
  }

  /**
   * Send email to a user by user ID
   * @param {string} userId - User ID
   * @param {Object} emailData - Email content
   * @returns {Promise<Object>} Result
   */
  async sendEmailToUser(userId, { subject, text, html, attachments = [], replyTo }) {
    try {
      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (!user.email) {
        throw new Error(`User ${user.name} has no email address`);
      }

      // Send email
      return await this.sendEmail({
        to: user.email,
        subject,
        text,
        html,
        attachments,
        replyTo,
        tags: { userId, type: 'user_communication' }
      });

    } catch (error) {
      console.error('❌ Failed to send email to user:', error.message);
      throw error;
    }
  }

  /**
   * Process attachments from various formats
   * @param {Array} attachments - Raw attachments
   * @returns {Promise<Array>} Processed attachments
   */
  async processAttachments(attachments) {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    const processed = [];

    for (const attachment of attachments) {
      try {
        if (attachment.path) {
          // Read file from filesystem
          const filePath = path.resolve(attachment.path);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            processed.push({
              filename: attachment.filename || path.basename(filePath),
              content: content.toString('base64')
            });
          } else {
            console.warn(`⚠️ Attachment file not found: ${filePath}`);
          }
        } else if (attachment.content) {
          // Use provided content (Buffer or base64 string)
          const content = Buffer.isBuffer(attachment.content)
            ? attachment.content.toString('base64')
            : attachment.content;
          
          processed.push({
            filename: attachment.filename || 'attachment',
            content
          });
        } else if (attachment.documentId) {
          // Fetch document from database
          const doc = await this.getDocumentAttachment(attachment.documentId);
          if (doc) {
            processed.push(doc);
          }
        }
      } catch (error) {
        console.error(`⚠️ Failed to process attachment: ${error.message}`);
      }
    }

    return processed;
  }

  /**
   * Get document attachment from database
   * @param {string} documentId - Document or CompanyAsset ID
   * @returns {Promise<Object|null>} Attachment object
   */
  async getDocumentAttachment(documentId) {
    try {
      // Try to find in Documents first
      let document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { 
          filename: true, 
          filePath: true,
          mimeType: true
        }
      });

      // If not found, try CompanyAsset (uses title and fileUrl instead of filename and filePath)
      if (!document) {
        const companyAsset = await prisma.companyAsset.findUnique({
          where: { id: documentId },
          select: {
            title: true,
            fileUrl: true,
            mimeType: true
          }
        });

        if (companyAsset) {
          // Map CompanyAsset fields to document format
          document = {
            filename: companyAsset.title,
            filePath: companyAsset.fileUrl,
            mimeType: companyAsset.mimeType
          };
        }
      }

      if (!document || !document.filePath) {
        console.warn(`⚠️ Document not found or has no file path for ID: ${documentId}`);
        return null;
      }

      // Resolve the file path
      const filePath = this.resolveDocumentPath(document.filePath);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Document file not found: ${filePath}`);
        return null;
      }

      // Read and encode file
      const content = fs.readFileSync(filePath);

      return {
        filename: document.filename,
        content: content.toString('base64')
      };

    } catch (error) {
      console.error(`⚠️ Failed to get document attachment: ${error.message}`);
      return null;
    }
  }

  /**
   * Resolve document path from various possible locations
   */
  resolveDocumentPath(filePath) {
    // Remove leading slashes and backslashes for consistent path handling
    const cleanPath = String(filePath || '').replace(/^[\/\\]+/, '');

    // Try multiple possible paths
    const candidates = [
      filePath,
      path.join(__dirname, '..', cleanPath),
      path.join(__dirname, '../..', cleanPath),
      path.join(process.cwd(), cleanPath),
      path.join(__dirname, '..', 'uploads', path.basename(filePath)),
      path.join(__dirname, '../..', 'uploads', path.basename(filePath)),
      // Try with uploads prefix removed if it exists
      cleanPath.startsWith('uploads/') ? path.join(__dirname, '..', cleanPath) : null,
      cleanPath.startsWith('uploads/') ? path.join(__dirname, '../..', cleanPath) : null,
      cleanPath.startsWith('uploads/') ? path.join(process.cwd(), cleanPath) : null
    ].filter(Boolean); // Remove null entries

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        console.log(`✅ Found file at: ${candidate}`);
        return candidate;
      }
    }

    console.warn(`⚠️ File not found in any candidate path for: ${filePath}`);
    return filePath; // Return original if nothing found
  }

  /**
   * Validate email address
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Strip HTML tags for plain text fallback
   */
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Create a professional HTML email template
   */
  createEmailTemplate({ title, content, footer = '' }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0089D1 0%, #7ED242 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
          a { color: #0089D1; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">${title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            ${footer || 'This email was sent from Kenstruction.'}
            <br>
            <a href="#">View in browser</a> | <a href="#">Unsubscribe</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
module.exports = new EmailService();
