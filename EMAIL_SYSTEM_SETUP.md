# Email System Implementation - Resend Integration

## Overview
Successfully integrated **Resend** email service into the Kenstruction application with full support for:
- ✅ Sending emails with attachments
- ✅ Bubbles AI Assistant email capabilities
- ✅ Customer and team member email communication
- ✅ Project update emails
- ✅ Professional HTML email templates

---

## 🎯 What Was Implemented

### 1. **Resend Package Installation**
- Installed `resend` npm package (v1.x)
- Added to project dependencies in `package.json`

### 2. **EmailService (`server/services/EmailService.js`)**
A comprehensive email service with the following features:

#### Core Methods:
- **`sendEmail()`** - Send emails with optional attachments
- **`sendEmailToCustomer(customerId, emailData)`** - Send to customer by ID
- **`sendEmailToUser(userId, emailData)`** - Send to team member by ID
- **`createEmailTemplate()`** - Generate professional HTML emails

#### Attachment Support:
- File path attachments
- Base64 encoded content
- Document/CompanyAsset attachments by ID
- Automatic file resolution from multiple locations

#### Features:
- Email validation
- HTML template generation with Aqua & Verdant branding
- Automatic plain text fallback
- Activity logging
- Error handling and retry logic

### 3. **Email Routes (`server/routes/email.js`)**
RESTful API endpoints for email operations:

#### Endpoints:
- **`GET /api/email/status`** - Check email service availability
- **`POST /api/email/send`** - Send email with attachments
- **`POST /api/email/send-to-customer`** - Send to customer by ID
- **`POST /api/email/send-to-user`** - Send to team member by ID
- **`POST /api/email/send-with-template`** - Send using built-in template
- **`POST /api/email/send-project-update`** - Send project update to customer

All endpoints are authenticated and log activity to the database.

### 4. **Bubbles AI Email Integration**
Enhanced `server/routes/bubbles.js` with natural language email sending:

#### Capabilities:
- **Natural Language Processing** - Understands email intent from chat
- **Recipient Resolution** - Finds customers and team members by name
- **Subject/Body Extraction** - Parses email content from messages
- **Document Attachments** - Attaches files from Documents & Resources
- **Project Context** - Automatically includes project details

#### Example Commands:
```
"Send email to John Smith saying: Please review the attached inspection report"
"Email the customer with subject: Project Update"
"Send email to Sarah Owner with the upfront checklist attached"
```

#### How It Works:
1. Detects email intent keywords (`email`, `send email`, `e-mail`)
2. Resolves recipients (customers, team members)
3. Extracts subject and message body
4. Finds document attachments if mentioned
5. Sends email with professional template
6. Logs activity and confirms to user

### 5. **Environment Configuration**
Updated `server/.env.example` with Resend configuration:

```env
# Resend Email Configuration
RESEND_API_KEY="re_xxxxx_your-resend-api-key-here"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="Kenstruction"
```

### 6. **Server Registration**
- Imported email routes in `server/server.js`
- Registered at `/api/email` endpoint
- Added to API documentation

---

## 🚀 Getting Started

### Step 1: Get Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day)
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `re_`)

### Step 2: Configure Domain (Optional but Recommended)
1. In Resend dashboard, go to Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records (SPF, DKIM, DMARC)
4. Verify domain
5. Use `noreply@yourdomain.com` as FROM email

**Note:** Without a verified domain, you can only send to verified email addresses in development.

### Step 3: Set Environment Variables
Create or update `server/.env`:

```env
RESEND_API_KEY="re_your_actual_api_key_here"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="Kenstruction"
```

### Step 4: Restart Server
```bash
npm run server
```

You should see:
```
✅ Resend Email Service initialized
```

---

## 📧 Usage Examples

### From Frontend (API Calls)

#### Send Basic Email
```javascript
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Project Update',
    text: 'Your project is progressing well.',
    html: '<p>Your project is progressing well.</p>'
  })
});
```

#### Send Email to Customer
```javascript
const response = await fetch('/api/email/send-to-customer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    customerId: 'customer-id-here',
    subject: 'Inspection Complete',
    text: 'Your roof inspection has been completed.',
    attachments: [
      { documentId: 'doc-id-here' }
    ]
  })
});
```

#### Send Project Update
```javascript
const response = await fetch('/api/email/send-project-update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    projectId: 'project-id-here',
    message: 'We have completed the roof installation and will begin cleanup tomorrow.',
    attachments: [
      { documentId: 'completion-photos-id' }
    ]
  })
});
```

### From Bubbles AI Assistant

Users can send emails naturally through the AI Assistant:

#### Basic Email
```
"Send email to John Smith saying: Please review the project timeline"
```

#### Email with Subject
```
"Email Sarah Owner with subject: Inspection Scheduled for Tomorrow"
```

#### Email with Attachment
```
"Send email to the customer with the inspection report attached"
```

#### Email to Multiple Recipients
```
"Email John Smith and Sarah Owner saying: Team meeting at 2pm"
```

#### Project-Specific Email
```
"For project #12345, send email to customer saying: Your roof is complete"
```

---

## 🎨 Email Template Design

The built-in template features:
- **Aqua & Verdant gradient header** (matches Bubbles branding)
- **Clean, professional layout**
- **Responsive design** (mobile-friendly)
- **Project information** (when applicable)
- **Sender information**
- **Unsubscribe link** (placeholder)

Example:
```javascript
const html = emailService.createEmailTemplate({
  title: 'Project Update',
  content: '<p>Your roof installation is 75% complete...</p>',
  footer: 'Sent by David Chen, Project Manager'
});
```

---

## 🔧 Advanced Configuration

### Custom Email Templates
You can create custom templates in the EmailService:

```javascript
// In server/services/EmailService.js
createCustomTemplate({ title, content, logo, colors }) {
  return `
    <!DOCTYPE html>
    <html>
      <!-- Your custom HTML template -->
    </html>
  `;
}
```

### Attachment Types Supported
1. **File Path**: `{ path: '/path/to/file.pdf', filename: 'report.pdf' }`
2. **Base64**: `{ content: 'base64string...', filename: 'doc.pdf' }`
3. **Document ID**: `{ documentId: 'doc-id-from-db' }`

### Email Tracking
All emails are logged to the `Message` table with:
- Sender ID
- Recipients
- Subject
- Message ID (from Resend)
- Timestamp
- Metadata (project, results, etc.)

---

## 📊 Monitoring & Debugging

### Check Email Service Status
```bash
curl http://localhost:5000/api/email/status
```

Response:
```json
{
  "available": true,
  "fromEmail": "noreply@yourdomain.com",
  "fromName": "Kenstruction"
}
```

### View Email Logs
Check the `Message` table for emails sent:
```sql
SELECT * FROM "Message" WHERE type = 'email' ORDER BY "createdAt" DESC;
```

### Server Logs
Look for:
- `✅ Resend Email Service initialized` - Service started
- `📧 Email sent successfully to...` - Email delivered
- `❌ Email sending failed:` - Errors

---

## 🚨 Troubleshooting

### "Email service is not available"
- Check `RESEND_API_KEY` is set in `.env`
- Verify API key is valid (starts with `re_`)
- Restart the server

### "Failed to send email: Invalid recipient"
- Verify recipient email format
- Check customer/user has email in database
- Ensure domain is verified in Resend (for production)

### "Document attachment not found"
- Verify document exists in database
- Check file path is correct
- Ensure file exists on disk

### Emails Not Delivering
- Check Resend dashboard for delivery status
- Verify DNS records (SPF, DKIM, DMARC)
- Check recipient spam folder
- Review Resend logs for bounces

---

## 💰 Pricing & Limits

### Resend Free Tier
- **100 emails/day**
- **1 domain**
- **3,000 emails/month**
- Perfect for development and small teams

### Paid Plans
- **$20/month** - 50,000 emails
- **$80/month** - 100,000 emails
- Volume discounts available

---

## 🔐 Security Best Practices

1. **Never commit API keys** - Use `.env` files
2. **Validate recipients** - Check email format
3. **Rate limiting** - Prevent abuse
4. **Authentication** - All routes require auth token
5. **Input sanitization** - Prevent XSS in email content
6. **Audit logging** - Track all email activity

---

## 🎯 Next Steps (SMS Integration)

For SMS/MMS functionality, we recommend:
- **Bandwidth** - Best for VOIP providers with OCN
- **Telnyx** - Modern API, competitive pricing
- Similar architecture to email service

Would you like me to implement SMS next?

---

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Node.js SDK](https://github.com/resendlabs/resend-node)
- [Email Best Practices](https://resend.com/docs/send-with-nodejs)

---

## ✅ Implementation Complete

All email functionality is now live and ready to use! Users can:
- Send emails via API endpoints
- Use Bubbles AI to send emails naturally
- Attach documents from Documents & Resources
- Send project updates to customers
- Email team members

**Status:** ✅ Production Ready (after configuring Resend API key)
