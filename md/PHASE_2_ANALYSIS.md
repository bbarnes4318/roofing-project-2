# Phase 2 Status Analysis: Standalone Actions

## What You Already Have ✅

### 1. Messages with Documents ✅
- **Tool**: `send_document_message` 
- **Status**: Fully functional
- **Location**: `POST /api/bubbles/complete-action`
- **How it works**: User selects document → selects recipients → sends internal message with document attached

### 2. Emails with Documents ✅
- **Tool**: `send_document_email`
- **Status**: Fully functional  
- **Location**: `POST /api/bubbles/complete-action`
- **How it works**: User selects document → selects recipients → sends email with document attached

### 3. Standalone Email ✅ (Partial)
- **Action**: `send_email`
- **Status**: Exists but NOT callable by AI as a tool
- **Location**: `POST /api/bubbles/complete-action` (line 1733)
- **Problem**: This is handled via the frontend `complete-action` flow, NOT exposed as an AI-callable tool

---

## What's Missing ❌

### 1. `create_task` Tool ❌
**Current State:**
- Tasks are ONLY created as a **side effect** when sending documents
- Uses heuristic detection (regex: `/\b(task|todo|to-do)\b/`) in document flow
- Code location: `bubbles.js` lines 2416-2449 (in document sending flow)
- **NOT available as a standalone tool**

**What's Needed:**
- New tool: `create_task` with parameters:
  - `title` (required)
  - `description` (optional)
  - `dueDate` (optional, can parse natural language)
  - `priority` (optional: LOW, MEDIUM, HIGH)
  - `projectId` (optional, uses selected project if available)
  - `assignedToId` or `assignedToEmail` (optional)
  - `documentIds` (optional array - supports document attachments)

### 2. `create_reminder` Tool ❌
**Current State:**
- Reminders are ONLY created as a **side effect** when sending documents
- Uses heuristic detection (regex: `/\b(remind|reminder|calendar|event)\b/`) in document flow
- Code location: `bubbles.js` lines 2451-2477 (in document sending flow)
- **NOT available as a standalone tool**

**What's Needed:**
- New tool: `create_reminder` with parameters:
  - `title` (required)
  - `description` (optional)
  - `startTime` (optional, can parse natural language like "tomorrow at 4pm")
  - `endTime` (optional, defaults to startTime + 30min)
  - `eventType` (optional: REMINDER, MEETING, DEADLINE)
  - `projectId` (optional, uses selected project if available)
  - `attendeeIds` or `attendeeEmails` (optional array)
  - `documentIds` (optional array - supports document attachments)

### 3. `send_email` as Callable Tool ❌
**Current State:**
- `send_email` exists but is only accessible through `complete-action` endpoint
- Requires frontend interaction (recipient selection)
- **NOT exposed as an AI-callable tool**

**What's Needed:**
- New tool: `send_email` with parameters:
  - `subject` (required)
  - `body` (required)
  - `recipientEmails` (required array)
  - `projectId` (optional)
  - `documentIds` (optional array - supports document attachments)
  - `cc` (optional array)
  - `bcc` (optional array)

---

## Summary

### ✅ Completed:
- Messages with documents attached
- Emails with documents attached

### ❌ Not Completed:
- `create_task` as standalone tool
- `create_reminder` as standalone tool
- `send_email` as callable tool
- **Document attachments for standalone tasks/reminders** (not implemented)

---

## Recommendation

**Phase 2 is NOT complete.** You need to:

1. **Add 3 new tools** to `bubbles.js`:
   - `create_task` - standalone task creation with optional document attachments
   - `create_reminder` - standalone reminder creation with optional document attachments  
   - `send_email` - standalone email sending with optional document attachments

2. **Update `executeToolCall`** to handle these 3 new tools

3. **Add tool definitions** to `getSystemPrompt` (workflowTools array)

4. **Support document attachments** in tasks and reminders (currently only supported in messages/emails)

---

## Next Steps

Should I implement Phase 2 now? This will involve:

1. Creating the 3 new tools with full parameter validation
2. Adding document attachment support to tasks/reminders
3. Updating VAPI route to include these tools
4. Testing all action flows

