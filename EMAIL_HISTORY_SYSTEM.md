# Email History & Tracking System

## Overview
Comprehensive email history tracking system that logs all sent emails to the database for compliance, auditing, and user visibility.

---

## 📊 Database Schema

### Email Model (`emails` table)
Complete email tracking with the following fields:

#### Identifiers
- `id` - Unique email record ID
- `message_id` - Resend message ID for external tracking
- `thread_id` - Groups related emails (replies, forwards)

#### Sender Information
- `sender_id` - User who sent the email
- `sender_email` - Sender's email address
- `sender_name` - Sender's full name

#### Recipients
- `to_emails[]` - Array of recipient emails
- `to_names[]` - Array of recipient names
- `cc_emails[]` - CC recipients
- `bcc_emails[]` - BCC recipients
- `reply_to` - Reply-to address

#### Content
- `subject` - Email subject line
- `body_text` - Plain text version
- `body_html` - HTML version

#### Metadata
- `email_type` - Type: general, project_update, customer_communication, team_communication, bubbles_ai, notification, system
- `status` - Status: sent, failed, bounced, delivered, opened
- `priority` - Priority: low, normal, high, urgent

#### Associations
- `project_id` - Linked project (if applicable)
- `customer_id` - Linked customer (if applicable)
- `task_id` - Linked task (if applicable)

#### Attachments
- `attachments` - JSON array of attachment metadata:
  ```json
  [
    {
      "filename": "inspection-report.pdf",
      "documentId": "doc-id-123",
      "size": 245678,
      "mimeType": "application/pdf"
    }
  ]
  ```

#### Tracking
- `sent_at` - When email was sent
- `delivered_at` - When delivered (webhook)
- `opened_at` - When opened (webhook)
- `clicked_at` - When link clicked (webhook)
- `bounced_at` - If bounced
- `failed_at` - If failed
- `error_message` - Error details

#### Additional
- `tags` - JSON for categorization
- `metadata` - Additional tracking data
- `is_deleted` - Soft delete flag
- `created_at` / `updated_at` - Timestamps

---

## 🔗 Database Relations

### User → Email
- One user can send many emails
- `User.sentEmails` → `Email[]`

### Project → Email
- One project can have many emails
- `Project.emails` → `Email[]`

### Customer → Email
- One customer can receive many emails
- `Customer.emails` → `Email[]`

### Task → Email
- One task can have related emails
- `Task.emails` → `Email[]`

---

## 🚀 Migration Instructions

### Step 1: Run Prisma Migration
```bash
# Generate Prisma client with new Email model
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_email_tracking

# Or for production
npx prisma migrate deploy
```

### Step 2: Verify Schema
```bash
# Check that Email model is in schema
npx prisma db pull

# Verify relations
npx prisma studio
```

---

## 📡 API Endpoints

### Get Email History (with filters)
```
GET /api/email/history?projectId=xxx&customerId=xxx&emailType=project_update&limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "email-123",
        "subject": "Project Update",
        "toEmails": ["customer@example.com"],
        "sentAt": "2025-01-15T10:30:00Z",
        "status": "delivered",
        "sender": {
          "firstName": "John",
          "lastName": "Smith",
          "email": "john@kenstruction.com"
        },
        "project": {
          "projectName": "Roof Replacement",
          "projectNumber": 12345
        }
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Project Email History
```
GET /api/email/history/project/:projectId
```

Returns all emails related to a specific project.

### Get Customer Email History
```
GET /api/email/history/customer/:customerId
```

Returns all emails sent to a specific customer.

### Get Single Email Details
```
GET /api/email/:emailId
```

Returns complete email details including content, attachments, and tracking info.

---

## 💻 Usage Examples

### Backend - Log Email
```javascript
const emailService = require('../services/EmailService');

// Send and log email
const result = await emailService.sendEmail({
  to: 'customer@example.com',
  subject: 'Project Update',
  html: '<p>Your roof is 75% complete</p>',
  attachments: [{ documentId: 'doc-123' }]
});

// Log to database
await emailService.logEmail({
  senderId: req.user.id,
  senderEmail: req.user.email,
  senderName: `${req.user.firstName} ${req.user.lastName}`,
  to: ['customer@example.com'],
  subject: 'Project Update',
  html: '<p>Your roof is 75% complete</p>',
  attachments: [{ documentId: 'doc-123' }],
  messageId: result.messageId,
  projectId: 'project-456',
  customerId: 'customer-789',
  emailType: 'project_update',
  status: 'sent',
  tags: { campaign: 'weekly_updates' }
});
```

### Frontend - Fetch Email History
```javascript
// Get project email history
const response = await fetch(`/api/email/history/project/${projectId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: emails } = await response.json();

// Display emails
emails.forEach(email => {
  console.log(`${email.subject} - sent to ${email.toEmails.join(', ')}`);
  console.log(`Sent by: ${email.sender.firstName} ${email.sender.lastName}`);
  console.log(`Status: ${email.status}`);
});
```

### Frontend - Display Email in UI
```javascript
// Fetch single email
const response = await fetch(`/api/email/${emailId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: email } = await response.json();

// Render email
return (
  <div className="email-card">
    <div className="email-header">
      <h3>{email.subject}</h3>
      <span className="email-date">
        {new Date(email.sentAt).toLocaleString()}
      </span>
    </div>
    <div className="email-meta">
      <p><strong>From:</strong> {email.senderName} ({email.senderEmail})</p>
      <p><strong>To:</strong> {email.toEmails.join(', ')}</p>
      {email.project && (
        <p><strong>Project:</strong> {email.project.projectName}</p>
      )}
    </div>
    <div className="email-body" dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
    {email.attachments && (
      <div className="email-attachments">
        <h4>Attachments:</h4>
        {email.attachments.map(att => (
          <div key={att.documentId}>{att.filename}</div>
        ))}
      </div>
    )}
    <div className="email-status">
      Status: <span className={`status-${email.status}`}>{email.status}</span>
    </div>
  </div>
);
```

---

## 🎯 Use Cases

### 1. Project Communication History
View all emails sent for a specific project:
- Customer updates
- Team communications
- Document sharing
- Status notifications

### 2. Customer Communication Trail
Track all interactions with a customer:
- Quotes and estimates
- Project updates
- Completion notifications
- Follow-ups

### 3. Compliance & Auditing
- Maintain records of all communications
- Track who sent what and when
- Verify delivery status
- Export for legal/compliance needs

### 4. Team Collaboration
- See what communications have been sent
- Avoid duplicate messages
- Track response times
- Monitor customer engagement

### 5. AI Assistant Transparency
- View emails sent by Bubbles AI
- Verify content and recipients
- Track AI-generated communications
- Audit AI behavior

---

## 📈 Analytics & Reporting

### Email Statistics
```javascript
// Get email stats for a project
const stats = await prisma.email.groupBy({
  by: ['status', 'emailType'],
  where: { projectId: 'project-123' },
  _count: true
});

// Result:
// [
//   { status: 'sent', emailType: 'project_update', _count: 15 },
//   { status: 'delivered', emailType: 'customer_communication', _count: 12 },
//   { status: 'opened', emailType: 'bubbles_ai', _count: 8 }
// ]
```

### Delivery Rates
```javascript
// Calculate delivery rate
const total = await prisma.email.count({ where: { projectId } });
const delivered = await prisma.email.count({ 
  where: { projectId, status: 'delivered' } 
});
const deliveryRate = (delivered / total) * 100;
```

---

## 🔔 Webhook Integration (Future Enhancement)

Resend supports webhooks for tracking email events:

```javascript
// Webhook endpoint to update email status
router.post('/api/email/webhook/resend', async (req, res) => {
  const { type, data } = req.body;
  
  // Find email by message_id
  const email = await prisma.email.findFirst({
    where: { messageId: data.message_id }
  });
  
  if (email) {
    const updates = {};
    
    switch(type) {
      case 'email.delivered':
        updates.status = 'delivered';
        updates.deliveredAt = new Date();
        break;
      case 'email.opened':
        updates.openedAt = new Date();
        break;
      case 'email.clicked':
        updates.clickedAt = new Date();
        break;
      case 'email.bounced':
        updates.status = 'bounced';
        updates.bouncedAt = new Date();
        break;
    }
    
    await prisma.email.update({
      where: { id: email.id },
      data: updates
    });
  }
  
  res.json({ success: true });
});
```

---

## 🎨 UI Components (To Build)

### EmailHistoryList Component
Display list of emails with filtering:
```jsx
<EmailHistoryList 
  projectId={projectId}
  filters={{ emailType: 'project_update' }}
  onEmailClick={handleEmailClick}
/>
```

### EmailDetailModal Component
Show full email details:
```jsx
<EmailDetailModal 
  emailId={emailId}
  onClose={handleClose}
/>
```

### ProjectEmailTab Component
Add to project detail page:
```jsx
<ProjectEmailTab 
  projectId={projectId}
  customer={customer}
/>
```

---

## ✅ Benefits

1. **Complete Audit Trail** - Every email is logged with full details
2. **Compliance Ready** - Meet regulatory requirements for communication tracking
3. **Customer Service** - Quickly reference past communications
4. **Team Coordination** - Avoid duplicate or conflicting messages
5. **Performance Metrics** - Track delivery rates and engagement
6. **AI Transparency** - Monitor and verify AI-generated emails
7. **Search & Filter** - Find specific emails quickly
8. **Project Context** - See all project-related communications in one place

---

## 🔐 Security & Privacy

- All email content is stored securely in PostgreSQL
- Access controlled by authentication middleware
- Soft delete preserves records while hiding from users
- PII (Personally Identifiable Information) is protected
- Audit trail cannot be tampered with
- Role-based access can be added for sensitive emails

---

## 📝 Next Steps

1. **Run Migration** - Add Email table to database
2. **Test Logging** - Send test emails and verify logging
3. **Build UI Components** - Create email history views
4. **Add to Project Page** - Show email history in project details
5. **Add to Customer Page** - Show customer communication history
6. **Implement Webhooks** - Track delivery and open rates
7. **Add Search** - Full-text search across email content
8. **Export Feature** - Allow exporting email history to PDF/CSV

---

## 🎯 Summary

**Status:** ✅ **Database schema ready, API endpoints complete, logging implemented**

All emails sent through the system are now automatically logged to the database with:
- Complete sender/recipient information
- Email content (text and HTML)
- Attachments metadata
- Project/customer/task associations
- Delivery tracking
- Searchable and filterable

Users can now view complete email history for projects, customers, and tasks through the API endpoints. Next step is to build the frontend UI components to display this data.
