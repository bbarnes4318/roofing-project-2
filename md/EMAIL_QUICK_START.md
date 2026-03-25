# Email System - Quick Start Guide

## 🚀 Setup (5 minutes)

### 1. Get Resend API Key
1. Visit [resend.com/signup](https://resend.com/signup)
2. Create free account
3. Go to API Keys → Create API Key
4. Copy the key (starts with `re_`)

### 2. Configure Environment
Add to `server/.env`:
```env
RESEND_API_KEY="re_your_key_here"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="Kenstruction"
```

### 3. Restart Server
```bash
npm run server
```

Look for: `✅ Resend Email Service initialized`

---

## 💬 Using Bubbles AI to Send Emails

### Basic Examples

**Simple email:**
```
Send email to John Smith saying: Please review the project timeline
```

**With subject:**
```
Email customer with subject: Inspection Complete
```

**With attachment:**
```
Send email to Sarah Owner with the inspection report attached
```

**Project update:**
```
For project #12345, email customer saying: Your roof is 75% complete
```

**Multiple recipients:**
```
Email John Smith and Sarah Owner saying: Team meeting at 2pm tomorrow
```

### Tips for Bubbles
- Use "send email" or "email" to trigger email mode
- Mention recipient names clearly
- Use "saying:" or "with message:" for content
- Mention document names for attachments
- Include project number or select project first

---

## 🔧 API Endpoints

### Send Email
```javascript
POST /api/email/send
{
  "to": "customer@example.com",
  "subject": "Project Update",
  "text": "Your project is progressing well",
  "attachments": [{ "documentId": "doc-id" }]
}
```

### Send to Customer
```javascript
POST /api/email/send-to-customer
{
  "customerId": "customer-id",
  "subject": "Inspection Complete",
  "text": "Your inspection is done"
}
```

### Send Project Update
```javascript
POST /api/email/send-project-update
{
  "projectId": "project-id",
  "message": "Work completed today",
  "attachments": [{ "documentId": "photos-id" }]
}
```

---

## 📎 Attachments

Three ways to attach files:

**1. By Document ID:**
```javascript
attachments: [{ documentId: "doc-id-from-database" }]
```

**2. By File Path:**
```javascript
attachments: [{ 
  path: "/path/to/file.pdf",
  filename: "report.pdf"
}]
```

**3. By Base64 Content:**
```javascript
attachments: [{ 
  content: "base64string...",
  filename: "document.pdf"
}]
```

---

## ✅ Verification

### Check Service Status
```bash
curl http://localhost:5000/api/email/status
```

### Test Email
Use Bubbles AI:
```
Send email to your-email@example.com saying: Test email from Kenstruction
```

---

## 🚨 Common Issues

**"Email service not available"**
→ Check `RESEND_API_KEY` in `.env`

**"Invalid recipient"**
→ Verify email address format

**"Document not found"**
→ Check document exists in Documents & Resources

**Emails not delivering**
→ Check Resend dashboard for status
→ Verify domain DNS records (production)

---

## 📊 Free Tier Limits
- 100 emails/day
- 3,000 emails/month
- Perfect for testing and small teams

---

## 🎯 Next: SMS Integration
Ready to add SMS/MMS? We recommend:
- **Bandwidth** (best for VOIP providers)
- **Telnyx** (modern API)

Let me know when you're ready!
