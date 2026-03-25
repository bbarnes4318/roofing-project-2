# Bug Fix: Premature Message Sending Before Recipient Selection

## Issue Summary
When instructing the Bubbles AI Assistant to send a message or document, the system was sending messages to the project's primary customer contact **before** the user had a chance to select recipients from the UI, despite the API correctly returning `requiresRecipientSelection: true`.

## Root Cause Analysis

### Problem 1: Auto-Detection of Recipients from Message Text (Document Sending)
**Location:** `server/routes/bubbles.js` lines 1409-1470 (before fix)

The document sending flow had aggressive auto-detection logic that would:
1. Extract recipient names from the message text using `extractRecipientNames()`
2. Search for users matching those names in the database
3. Auto-populate recipients if keywords like "owner" or "project manager" were detected
4. If "owner" was mentioned, automatically assign the project manager as the recipient

**Example scenario:**
- User says: "send cardpayments.pdf to the owner"
- System detects "owner" keyword
- Automatically fetches project manager and adds as recipient
- Skips recipient selection UI (line 1472 check fails because `recipients.length > 0`)
- Proceeds directly to send the message (lines 1533-1656)

### Problem 2: Auto-Detection of Customer Recipients (Email Sending)
**Location:** `server/routes/bubbles.js` lines 1654-1700 (before fix)

The email sending flow had similar auto-detection logic:
1. If message included "customer", "client", or "owner", it would fetch the project's primary customer
2. Auto-populate `customerRecipient` with the customer's email
3. Skip recipient selection UI if any recipients were found
4. Send email immediately

## Solution Implemented

### Fix 1: Remove Auto-Detection in Document Sending Flow
**Modified:** `server/routes/bubbles.js` lines 1409-1423

**Changes:**
- Removed `extractRecipientNames()` call and name-based recipient lookup
- Removed fallback logic for "Sarah Owner", "owner", and "project manager" keywords
- **Only** populate recipients when explicitly provided via `context.selectedRecipientIds`
- Always prompt for recipient selection when no explicit selection exists

**Before:**
```javascript
// Extract and resolve recipients (prefer explicit internal users, not customers)
const recipientNames = extractRecipientNames(message);
let recipients = [];

// First, check if recipients were selected via UI
if (contextRecipientIds.length > 0) {
  recipients = await prisma.user.findMany({...});
}
// Otherwise, try to extract from message text
else if (recipientNames.length > 0) {
  // Auto-detect recipients from message text
}
// Fallback: if "owner" or "project manager" mentioned
if (recipients.length === 0 && contextRecipientIds.length === 0) {
  // Auto-assign project manager
}
```

**After:**
```javascript
let recipients = [];

// ONLY use recipients if they were explicitly selected via UI
// Do NOT auto-detect recipients from message text to prevent premature sending
if (contextRecipientIds.length > 0) {
  recipients = await prisma.user.findMany({
    where: { id: { in: contextRecipientIds } },
    select: { id: true, firstName: true, lastName: true, email: true }
  });
}

// If no recipients were explicitly selected, ALWAYS prompt for selection
```

### Fix 2: Remove Auto-Detection in Email Sending Flow
**Modified:** `server/routes/bubbles.js` lines 1654-1657

**Changes:**
- Removed customer auto-detection based on "customer", "client", "owner" keywords
- Removed team member recipient extraction from message text
- Recipients now only come from explicit UI selection via `complete-action` endpoint

**Before:**
```javascript
// Extract recipient information
const recipientNames = extractRecipientNames(message);
let recipients = [];
let customerRecipient = null;

// Check if sending to customer
if (lower.includes('customer') || lower.includes('client') || lower.includes('owner')) {
  // Auto-fetch project's primary customer
}

// Resolve team member recipients
if (recipientNames.length > 0) {
  // Auto-detect recipients from message text
}
```

**After:**
```javascript
// Do NOT auto-detect recipients from message text to prevent premature sending
// Recipients should only be provided via the complete-action endpoint after user selection
let recipients = [];
let customerRecipient = null;
```

## Flow After Fix

### Correct Flow for Document/Email Sending:

1. **User Request:** "send cardpayments.pdf"
2. **Backend (`POST /api/bubbles/chat`):**
   - Detects document sending intent
   - `recipients.length === 0` (no auto-detection)
   - Returns `requiresRecipientSelection: true` with `availableRecipients` list
   - Returns `pendingAction` object with action details
3. **Frontend (`AIAssistantPage.jsx`):**
   - Detects `requiresRecipientSelection: true`
   - Displays recipient selection UI with checkboxes
   - Stores `pendingAction` in state
   - Waits for user to select recipients
4. **User Action:** Selects recipients from UI and clicks "Send"
5. **Frontend:** Calls `bubblesService.completeAction(pendingAction, selectedRecipientIds)`
6. **Backend (`POST /api/bubbles/complete-action`):**
   - Receives `pendingAction` and `selectedRecipientIds`
   - Fetches selected recipients from database
   - Creates project message or sends email
   - Returns confirmation

## Testing Recommendations

### Test Case 1: Document Sending Without Recipient Selection
**Steps:**
1. Open Bubbles AI Assistant page
2. Select a project
3. Type: "send cardpayments.pdf"
4. **Expected:** Recipient selection UI appears
5. **Expected:** No message is sent yet
6. Select one or more recipients
7. Click "Send to X recipient(s)"
8. **Expected:** Message is sent to selected recipients only

### Test Case 2: Keywords That Previously Triggered Auto-Detection
**Steps:**
1. Type: "send document to the owner"
2. **Expected:** Recipient selection UI appears (not auto-sent to project manager)
3. Type: "send document to the customer"
4. **Expected:** Recipient selection UI appears (not auto-sent to customer)
5. Type: "send document to Sarah Owner"
6. **Expected:** Recipient selection UI appears (not auto-sent to user named Sarah Owner)

### Test Case 3: Email Sending
**Steps:**
1. Type: "send email with subject 'Test' saying 'Hello'"
2. **Expected:** Recipient selection UI appears
3. Select recipients
4. Click "Send"
5. **Expected:** Email sent to selected recipients only

### Test Case 4: Verify Selected Recipients Receive Message
**Steps:**
1. Send document with recipient selection
2. Check database: `ProjectMessageRecipient` table should have entries for selected recipients
3. Check UI: Selected recipients should see the message in their project messages

## Files Modified
- `server/routes/bubbles.js` (2 sections modified)

## Related Files (No Changes Needed)
- `src/components/pages/AIAssistantPage.jsx` - Already has correct recipient selection UI
- `src/services/api.js` - Already has `bubblesService.completeAction()` method
- `server/routes/bubbles.js` - `POST /api/bubbles/complete-action` endpoint already handles completion correctly

## Impact Assessment
- **Breaking Changes:** None
- **Behavior Changes:** 
  - Users will now ALWAYS see recipient selection UI when sending documents/emails
  - No more auto-detection of recipients from message text
  - More explicit control over who receives messages
- **Performance:** No impact
- **Security:** Improved - prevents accidental sending to unintended recipients

## Notes
- The `extractRecipientNames()` function is still used elsewhere in the codebase and was not removed
- Dead code remains in the email sending flow (lines 1737-1800) but is harmless as it will never execute
- The `complete-action` endpoint already correctly handles both `send_document_message` and `send_email` action types

