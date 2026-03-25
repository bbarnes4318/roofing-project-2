# Bubbles Recipient Selection Feature

## Overview
This feature adds **dynamic recipient selection UI** to the Bubbles AI Assistant (chat and voice) when users request to send messages or documents without specifying recipients. Instead of defaulting to the project's primary customer contact, Bubbles now prompts the user to select from a list of team members.

## Problem Solved
**Before**: When users asked Bubbles to "send this document" or "send an email" without specifying recipients, the system would either:
- Send to the project's primary customer contact by default
- Return an error asking for recipient names

**After**: Bubbles now displays an interactive recipient selection UI directly in the chat interface, showing all available team members with checkboxes for easy selection.

## How It Works

### 1. Backend Detection (server/routes/bubbles.js)

When Bubbles detects a send intent but no recipients are specified:

```javascript
// If no recipients found, return special response
if (recipients.length === 0) {
  const teamMembers = await prisma.user.findMany({
    where: { isActive: true, role: { not: 'CLIENT' } },
    select: { id: true, firstName: true, lastName: true, email: true, role: true }
  });

  return sendSuccess(res, 200, { 
    response: { 
      content: 'Who would you like to send this to? Please select from the list below.',
      requiresRecipientSelection: true,
      availableRecipients: teamMembers,
      pendingAction: {
        type: 'send_document', // or 'send_email'
        assetId: asset.id,
        message: userContent,
        projectId: proj.id
      }
    } 
  });
}
```

### 2. Frontend Display (AIAssistantPage.jsx & BubblesChat.jsx)

The frontend detects the `requiresRecipientSelection` flag and renders a recipient picker:

```jsx
{message.requiresRecipientSelection && message.availableRecipients && (
  <div className="mt-4 p-3 bg-white border border-blue-300 rounded-lg">
    <h4 className="text-sm font-semibold text-blue-900 mb-2">Select Recipients:</h4>
    <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
      {message.availableRecipients.map(user => (
        <label key={user.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pendingActionRecipients.includes(user.id)}
            onChange={() => togglePendingActionRecipient(user.id)}
          />
          <span>{user.firstName} {user.lastName}</span>
          <span className="text-xs text-gray-500">({user.role})</span>
        </label>
      ))}
    </div>
    <button onClick={handleCompletePendingAction}>
      Send to {pendingActionRecipients.length} recipient(s)
    </button>
    <button onClick={handleCancelPendingAction}>Cancel</button>
  </div>
)}
```

### 3. Action Completion (server/routes/bubbles.js)

New endpoint `/api/bubbles/complete-action` handles the final send:

```javascript
router.post('/complete-action', async (req, res) => {
  const { pendingAction, selectedRecipientIds } = req.body;
  
  // Fetch selected recipients
  const recipients = await prisma.user.findMany({
    where: { id: { in: selectedRecipientIds } }
  });
  
  // Complete the action (send document, send email, etc.)
  if (pendingAction.type === 'send_document') {
    // Create project message with attachment
    // Add recipients
    // Return confirmation
  }
});
```

## User Experience Flow

### Example: Sending a Document

1. **User**: "Send the inspection checklist"
2. **Bubbles**: "Who would you like to send this document to? Please select from the list below."
   - ☐ Sarah Owner (OWNER)
   - ☐ Mike Rodriguez (PROJECT_MANAGER)
   - ☐ John Smith (FIELD_DIRECTOR)
   - ☐ Jane Doe (OFFICE_MANAGER)
   - [Send to 0 recipients] [Cancel]

3. **User**: *Selects Mike Rodriguez and John Smith*
4. **User**: *Clicks "Send to 2 recipients"*
5. **Bubbles**: "Attached 'Inspection Checklist.pdf' to a new project message for project #12345 and notified Mike Rodriguez, John Smith."

### Example: Sending an Email

1. **User**: "Send an email about the project update"
2. **Bubbles**: "Who would you like to send this email to? Please select from the list below."
   - ☐ Sarah Owner (OWNER)
   - ☐ Mike Rodriguez (PROJECT_MANAGER)
   - [Send to 0 recipients] [Cancel]

3. **User**: *Selects Sarah Owner*
4. **User**: *Clicks "Send to 1 recipient"*
5. **Bubbles**: "✅ Email sent successfully to 1 recipient: **Subject:** Update on Project Name **Recipients:** Sarah Owner"

## What Information Bubbles Needs

### For Chat Messages:
- **User ID** (primary identifier)
- **First Name** and **Last Name** (for display and confirmation)
- **Email** (for email sending)
- **Role** (for context display)

### For Voice Messages:
- Same as chat messages
- Voice summaries use the same recipient selection mechanism

## Files Modified

### Backend:
1. **server/routes/bubbles.js**
   - Added recipient selection logic for document sending
   - Added recipient selection logic for email sending
   - Added `/api/bubbles/complete-action` endpoint
   - Modified chat endpoint to accept `context.selectedRecipientIds`

### Frontend:
2. **src/services/api.js**
   - Added `bubblesService.completeAction()` method

3. **src/components/pages/AIAssistantPage.jsx**
   - Added `pendingAction` and `pendingActionRecipients` state
   - Added `togglePendingActionRecipient()` handler
   - Added `handleCompletePendingAction()` handler
   - Added `handleCancelPendingAction()` handler
   - Modified `handleSubmit()` to detect recipient selection requests
   - Added recipient selection UI in message rendering

4. **src/components/common/BubblesChat.jsx**
   - Same changes as AIAssistantPage.jsx for consistency

## API Response Structure

### When Recipients Are Needed:
```json
{
  "success": true,
  "data": {
    "response": {
      "content": "Who would you like to send this to? Please select from the list below.",
      "requiresRecipientSelection": true,
      "availableRecipients": [
        {
          "id": "user-123",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "role": "PROJECT_MANAGER"
        }
      ],
      "pendingAction": {
        "type": "send_document",
        "assetId": "asset-456",
        "assetTitle": "Inspection Checklist.pdf",
        "message": "Please review this",
        "projectId": "proj-789",
        "intendsTask": false,
        "intendsReminder": false
      }
    }
  }
}
```

### Complete Action Request:
```json
{
  "pendingAction": {
    "type": "send_document",
    "assetId": "asset-456",
    "projectId": "proj-789"
  },
  "selectedRecipientIds": ["user-123", "user-456"]
}
```

## Benefits

1. ✅ **No more accidental sends to customers** - Users explicitly select recipients
2. ✅ **Better UX** - Visual list of all team members with roles
3. ✅ **Works for both chat and voice** - Consistent experience
4. ✅ **Flexible** - Supports multiple recipients
5. ✅ **Cancellable** - Users can cancel the action if they change their mind
6. ✅ **Confirmation** - Clear feedback on who received the message

## Testing

### Test Scenarios:

1. **Document Sending Without Recipients**
   - Say: "Send the inspection checklist"
   - Verify: Recipient picker appears
   - Select 2 users
   - Verify: Document sent to both users

2. **Email Sending Without Recipients**
   - Say: "Send an email about the project"
   - Verify: Recipient picker appears
   - Select 1 user
   - Verify: Email sent successfully

3. **Voice Command**
   - Use voice: "Send the safety checklist"
   - Verify: Recipient picker appears in chat
   - Select users and complete action

4. **Cancel Action**
   - Trigger recipient picker
   - Click "Cancel"
   - Verify: Action cancelled, chat continues normally

5. **Natural Language Recipients (Still Works)**
   - Say: "Send the checklist to Mike Rodriguez"
   - Verify: Sends directly without picker (name recognized)

## Future Enhancements

- Add "Select All" / "Deselect All" buttons
- Remember frequently selected recipients
- Group recipients by role
- Add customer contacts to the list (with clear distinction)
- Support for external email addresses

