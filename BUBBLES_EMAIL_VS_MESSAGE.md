# Bubbles: Email vs Internal Message Feature

## Overview
Bubbles AI Assistant now supports **TWO distinct communication methods**:
1. **Internal Project Messages** - Messages within the application (visible to team members in the project)
2. **External Emails** - Real emails sent via Resend to any email address (team members OR external contacts)

This update fixes the issue where Bubbles was always creating internal messages instead of sending actual emails when users requested email functionality.

---

## 🎯 Problem Solved

### Before:
- User: "Send an email with the inspection checklist"
- Bubbles: *Creates internal project message* ❌
- Result: No actual email sent, just an internal notification

### After:
- User: "Send an email with the inspection checklist"
- Bubbles: *Prompts for recipients and sends actual email via Resend* ✅
- Result: Real email delivered to inbox with document attached

---

## 🔑 Key Changes

### 1. **Two Action Types for Document Sending**

**`send_document_message`** - Internal project message
- Triggered when user says: "send this document", "share the checklist"
- Creates a ProjectMessage in the database
- Notifies team members within the app
- Does NOT send external emails

**`send_document_email`** - External email
- Triggered when user says: "email this document", "send email with the checklist"
- Sends actual email via Resend
- Can go to team members OR external email addresses
- Logged in Email table

### 2. **Custom Email Address Support**

Users can now send emails to **any email address**, not just team members:
- Select from team member list (checkboxes)
- OR add custom email addresses (e.g., `contractor@example.com`, `client@gmail.com`)
- Mix and match: Select 2 team members + add 1 external email = 3 recipients

### 3. **Smart Intent Detection**

Bubbles now detects user intent based on keywords:

| User Says | Bubbles Action | Result |
|-----------|----------------|--------|
| "Send the inspection checklist" | `send_document_message` | Internal message |
| "Email the inspection checklist" | `send_document_email` | External email |
| "Send email about the project" | `send_email` | External email |
| "Share the document with Mike" | `send_document_message` | Internal message |

---

## 📋 How It Works

### Workflow: Sending a Document via Email

1. **User Request**
   ```
   User: "Email the safety checklist to the contractor"
   ```

2. **Bubbles Detects Intent**
   - Keyword "email" detected → Email action
   - Document "safety checklist" found in assets
   - Recipient "contractor" not found in team members

3. **Recipient Selection UI Appears**
   ```
   Bubbles: "Who would you like to email this document to? Please select from the list below."
   
   Select Recipients:
   ☐ Sarah Owner (OWNER)
   ☐ Mike Rodriguez (PROJECT_MANAGER)
   ☐ John Smith (FIELD_DIRECTOR)
   
   Or add custom email address:
   [email@example.com] [Add]
   
   [Send to 0 recipients] [Cancel]
   ```

4. **User Selects Recipients**
   - Checks Mike Rodriguez
   - Adds custom email: `contractor@buildco.com`
   - Clicks "Send to 2 recipients"

5. **Email Sent**
   ```
   Bubbles: "📧 Email sent successfully to 2 recipients:
   
   Subject: Document: Safety Checklist
   Recipients: Mike Rodriguez, contractor@buildco.com
   Attachment: Safety Checklist.pdf"
   ```

6. **Email Delivered**
   - Mike receives email at his registered email address
   - contractor@buildco.com receives the same email
   - Both emails include the PDF attachment
   - Email logged in database for tracking

---

## 🛠️ Technical Implementation

### Backend Changes (server/routes/bubbles.js)

#### 1. Intent Detection
```javascript
// Determine if user wants email or internal message
const wantsEmail = lower.includes('email') || lower.includes('e-mail');
const actionType = wantsEmail ? 'send_document_email' : 'send_document_message';
```

#### 2. Custom Email Support
```javascript
const { pendingAction, selectedRecipientIds = [], customEmails = [] } = req.body;

// Fetch team members
const recipients = await prisma.user.findMany({
  where: { id: { in: selectedRecipientIds } }
});

// Add custom email recipients
const customRecipients = customEmails.map(email => ({
  email,
  firstName: email.split('@')[0],
  lastName: '',
  isCustom: true
}));

const allRecipients = [...recipients, ...customRecipients];
```

#### 3. Email Sending with Attachments
```javascript
if (pendingAction.type === 'send_document_email') {
  const emailAttachment = { documentId: asset.id };
  
  for (const recipient of allRecipients) {
    await emailService.sendEmail({
      to: recipient.email,
      subject: `Document: ${asset.title}`,
      html: emailTemplate,
      attachments: [emailAttachment],
      tags: { source: 'bubbles_ai', recipientType: recipient.isCustom ? 'external' : 'internal' }
    });
  }
}
```

### Frontend Changes

#### 1. Custom Email State (AIAssistantPage.jsx & BubblesChat.jsx)
```javascript
const [customEmailInput, setCustomEmailInput] = useState('');
const [customEmails, setCustomEmails] = useState([]);

const addCustomEmail = () => {
  const email = customEmailInput.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setCustomEmails(prev => [...prev, email]);
    setCustomEmailInput('');
  }
};
```

#### 2. Updated API Call
```javascript
const response = await bubblesService.completeAction(
  pendingAction, 
  pendingActionRecipients,  // Team member IDs
  customEmails              // External email addresses
);
```

#### 3. Enhanced Recipient Selection UI
```jsx
{/* Team Members */}
<div className="max-h-48 overflow-y-auto space-y-1 mb-3">
  {message.availableRecipients.map(user => (
    <label>
      <input type="checkbox" checked={pendingActionRecipients.includes(user.id)} />
      {user.firstName} {user.lastName} ({user.role})
    </label>
  ))}
</div>

{/* Custom Email Input (only for email actions) */}
{(pendingAction?.type === 'send_document_email' || pendingAction?.type === 'send_email') && (
  <div>
    <input 
      type="email" 
      value={customEmailInput}
      placeholder="email@example.com"
    />
    <button onClick={addCustomEmail}>Add</button>
    
    {/* Display added custom emails */}
    {customEmails.map(email => (
      <span>{email} <button onClick={() => removeCustomEmail(email)}>×</button></span>
    ))}
  </div>
)}
```

---

## 📊 Comparison: Internal Message vs Email

| Feature | Internal Message | External Email |
|---------|------------------|----------------|
| **Trigger Words** | "send", "share", "attach" | "email", "e-mail" |
| **Action Type** | `send_document_message` | `send_document_email` |
| **Recipients** | Team members only | Team members + any email |
| **Delivery** | In-app notification | Actual email to inbox |
| **Attachments** | Link to document | PDF/file attached |
| **Database** | ProjectMessage table | Email table |
| **External Access** | No | Yes |
| **Custom Emails** | Not supported | Fully supported |

---

## 🎬 Usage Examples

### Example 1: Internal Message
```
User: "Send the inspection checklist to Mike"
Bubbles: [Creates internal project message]
Result: Mike sees notification in app
```

### Example 2: Email to Team Member
```
User: "Email the inspection checklist to Mike"
Bubbles: [Shows recipient selector]
User: [Selects Mike Rodriguez]
Bubbles: [Sends email via Resend]
Result: Mike receives email in his inbox with PDF attached
```

### Example 3: Email to External Contact
```
User: "Email the contract to the client"
Bubbles: [Shows recipient selector]
User: [Adds custom email: client@example.com]
Bubbles: [Sends email via Resend]
Result: client@example.com receives email with contract PDF
```

### Example 4: Email to Multiple Recipients (Mixed)
```
User: "Email the project update"
Bubbles: [Shows recipient selector]
User: [Selects Sarah Owner + Mike Rodriguez, adds vendor@supply.com]
Bubbles: [Sends 3 emails]
Result: All 3 recipients receive email
```

---

## 🔐 Security & Validation

### Email Validation
- Custom emails validated with regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Invalid emails rejected before sending
- Resend API validates email format again

### Access Control
- Only authenticated users can send emails
- User ID logged with every email
- Email activity tracked in database

### Rate Limiting
- Resend enforces rate limits (100 emails/day on free tier)
- Backend logs all email attempts
- Failed sends reported to user

---

## 📝 Files Modified

### Backend:
1. **server/routes/bubbles.js**
   - Added `send_document_email` action type
   - Added custom email support in `/complete-action` endpoint
   - Updated email sending logic to handle external addresses
   - Added email logging for all sent emails

### Frontend:
2. **src/services/api.js**
   - Updated `completeAction()` to accept `customEmails` parameter

3. **src/components/pages/AIAssistantPage.jsx**
   - Added custom email state management
   - Added `addCustomEmail()` and `removeCustomEmail()` handlers
   - Updated recipient selection UI with custom email input
   - Updated action completion to include custom emails

4. **src/components/common/BubblesChat.jsx**
   - Same changes as AIAssistantPage for consistency

---

## ✅ Testing Checklist

- [ ] Send internal message with document
- [ ] Send email with document to team member
- [ ] Send email with document to external email
- [ ] Send email to multiple team members
- [ ] Send email to mix of team members + external emails
- [ ] Add invalid email address (should be rejected)
- [ ] Cancel recipient selection
- [ ] Send email without document (text only)
- [ ] Test via voice command
- [ ] Verify email logging in database
- [ ] Check email delivery in inbox
- [ ] Verify PDF attachment in email

---

## 🚀 Next Steps

1. **Test the feature** with real email addresses
2. **Configure Resend** with your domain for production
3. **Monitor email logs** in the database
4. **Gather user feedback** on the UX
5. **Consider adding**:
   - CC/BCC support
   - Email templates selection
   - Scheduled email sending
   - Email tracking (opens, clicks)

