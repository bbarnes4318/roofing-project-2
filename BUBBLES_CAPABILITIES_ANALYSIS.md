# Bubbles AI Assistant - Current Capabilities & Missing Features Analysis

## Executive Summary

Bubbles AI Assistant currently has **partial awareness** of the application data and **limited action capabilities**. While it can perform some operations like sending messages/emails with documents, it is **NOT yet "all knowing"** and cannot perform all requested actions independently.

---

## ✅ CURRENT CAPABILITIES

### 1. **Data Access (Limited Scope)**

#### ✅ **Project Context**
- Can access **currently selected/active project** only
- Includes: project details, customer info, project manager
- Includes: workflow state (current phase, section, line item)
- Includes: incomplete workflow items for active project
- **LIMITATION**: Cannot access ALL projects - only the one selected in UI

#### ✅ **Document Access**
- Can search company documents via semantic search (EmbeddingService)
- Can read document content (PDFs, DOCX) and extract numbered steps
- Can access project-specific documents
- Can access global company assets
- Uses embeddings for semantic document retrieval

#### ✅ **Workflow Operations**
- Can mark workflow line items as complete
- Can get incomplete items in a phase (for active project)
- Can find blocking tasks (for active project)
- Can check phase readiness (for active project)
- Can reassign tasks/workflow items

#### ✅ **Knowledge Base**
- Has access to workflow phases knowledge (hardcoded in system prompt)
- Has roofing technical knowledge (ice and water shield, etc.)
- Can answer company questions via `answer_company_question` tool

### 2. **Action Capabilities**

#### ✅ **Send Messages**
- Can send **internal project messages** (ProjectMessage)
- Can send **simple messages** (to team members)
- Can send **project-specific messages**
- Messages can include **document attachments**
- **LIMITATION**: Cannot attach documents to standalone messages (only when sending documents)

#### ✅ **Send Emails**
- Can send **external emails** via Resend service
- Can send to **team members** OR **custom email addresses**
- Can attach **documents** (company assets) to emails
- Emails are logged to database
- **LIMITATION**: Cannot send emails without documents (no standalone email creation)

#### ✅ **Create Tasks (Conditional)**
- Can create tasks **ONLY when sending documents**
- Automatically creates task if user mentions "task" when sending document
- Tasks include: title, description, due date, priority, assignment
- **CRITICAL LIMITATION**: **Cannot create standalone tasks** - only when sending documents

#### ✅ **Create Reminders (Conditional)**
- Can create calendar events/reminders **ONLY when sending documents**
- Automatically creates reminder if user mentions "reminder" or "calendar" when sending document
- Reminders include: title, description, start/end time, attendees
- **CRITICAL LIMITATION**: **Cannot create standalone reminders** - only when sending documents

---

## ❌ MISSING CAPABILITIES

### 1. **Comprehensive Data Access**

#### ❌ **Cannot Access ALL Projects**
- **Current**: Only sees active/selected project
- **Needed**: Should see ALL projects, their status, progress, details
- **Impact**: Cannot answer questions like "How many projects are in Progress phase?" or "What's the status of project #12345?" (if not selected)

#### ❌ **Cannot Access All Tasks**
- **Current**: Limited task access via BubblesContextService (only 20 most recent)
- **Needed**: Should see ALL tasks across ALL projects
- **Impact**: Cannot answer "What tasks are overdue?" or "What's John's workload?"

#### ❌ **Cannot Access All Messages**
- **Current**: No access to message history
- **Needed**: Should see all project messages, conversations, threads
- **Impact**: Cannot answer "When did we last message the customer?" or "What was discussed about project X?"

#### ❌ **Cannot Access All Emails**
- **Current**: Can send emails but cannot read email history
- **Needed**: Should see all sent/received emails, email status, threads
- **Impact**: Cannot answer "Did the customer open the email?" or "What emails were sent last week?"

#### ❌ **Cannot Access All Reminders/Calendar Events**
- **Current**: Limited access via BubblesContextService
- **Needed**: Should see all calendar events, reminders, upcoming deadlines
- **Impact**: Cannot answer "What reminders do I have today?" or "When is the next project deadline?"

#### ❌ **Cannot Access All Customers**
- **Current**: Only sees customer of active project
- **Needed**: Should see all customers, their projects, communication history
- **Impact**: Cannot answer "How many projects does Smith family have?" or "What's their contact info?"

#### ❌ **Cannot Access All Users/Team Members**
- **Current**: Can get team member list for recipient selection
- **Needed**: Should see user profiles, roles, assignments, workload
- **Impact**: Cannot answer "Who's the project manager for project X?" or "What's Sarah's current workload?"

#### ❌ **Cannot Access All Alerts**
- **Current**: Limited access via BubblesContextService
- **Needed**: Should see all workflow alerts, priorities, assignments
- **Impact**: Cannot answer "What alerts are active?" or "What alerts are overdue?"

#### ❌ **Cannot Access Activity Feed**
- **Current**: Limited activity access (only tasks)
- **Needed**: Should see all activity: messages, emails, tasks, reminders, workflow updates
- **Impact**: Cannot provide comprehensive updates on what's happening in the system

### 2. **Missing Action Capabilities**

#### ❌ **Cannot Create Standalone Tasks**
- **Current**: Can only create tasks when sending documents
- **Needed**: Should be able to create tasks independently
- **Example**: "Create a task for John to review the estimate by Friday"
- **Priority**: **HIGH** - Core functionality missing

#### ❌ **Cannot Create Standalone Reminders/Calendar Events**
- **Current**: Can only create reminders when sending documents
- **Needed**: Should be able to create calendar events independently
- **Example**: "Remind me to call the customer tomorrow at 2pm"
- **Priority**: **HIGH** - Core functionality missing

#### ❌ **Cannot Update Project Information**
- **Current**: Read-only access to projects
- **Needed**: Should be able to update project fields
- **Example**: "Update project #12345 progress to 75%"
- **Priority**: **MEDIUM**

#### ❌ **Cannot Update Customer Information**
- **Current**: Read-only access to customers
- **Needed**: Should be able to update customer details
- **Example**: "Update customer phone number to 555-1234"
- **Priority**: **MEDIUM**

#### ❌ **Cannot Attach Documents to Standalone Tasks/Reminders**
- **Current**: Documents only attach when sending messages/emails
- **Needed**: Should attach documents when creating tasks/reminders
- **Example**: "Create a task to review the inspection checklist and attach the checklist document"
- **Priority**: **HIGH**

#### ❌ **Cannot Send Emails Without Documents**
- **Current**: Email sending only triggered when sending documents
- **Needed**: Should send standalone emails
- **Example**: "Send an email to the customer saying work starts Monday"
- **Priority**: **HIGH**

#### ❌ **Cannot Attach Multiple Documents**
- **Current**: Can attach one document at a time
- **Needed**: Should attach multiple documents
- **Example**: "Send the inspection report and warranty documents"
- **Priority**: **MEDIUM**

### 3. **Proactive Capabilities**

#### ❌ **Cannot Provide Proactive Updates**
- **Current**: Only responds to user queries
- **Needed**: Should proactively notify about:
  - Overdue tasks
  - Upcoming deadlines
  - Project milestones
  - Overdue alerts
  - Customer communication gaps
- **Priority**: **MEDIUM**

#### ❌ **Cannot Provide Cross-Project Insights**
- **Current**: Only sees one project at a time
- **Needed**: Should provide insights across all projects:
  - Portfolio status summary
  - Resource allocation
  - Bottleneck identification
  - Team workload distribution
- **Priority**: **MEDIUM**

---

## 🔧 WHAT NEEDS TO BE IMPLEMENTED

### **Phase 1: Comprehensive Data Access (CRITICAL)**

#### 1. **Enhance BubblesContextService**
**File**: `server/services/BubblesContextService.js`

**Currently**: Basic implementation with limited methods
**Needed**: Complete implementation with:

```javascript
// Add these methods:
- getAllProjects(filters) - Get ALL projects with filters
- getAllTasks(filters) - Get ALL tasks (not just 20)
- getAllMessages(filters) - Get ALL project messages
- getAllEmails(filters) - Get ALL emails
- getAllReminders(filters) - Get ALL calendar events
- getAllCustomers(filters) - Get ALL customers
- getAllUsers(filters) - Get ALL users with assignments
- getAllAlerts(filters) - Get ALL workflow alerts
- getActivityFeed(limit, filters) - Comprehensive activity feed
- searchAllData(query) - Search across all data types
- getProjectSummary(projectId) - Complete project summary
- getCustomerSummary(customerId) - Complete customer summary
- getUserWorkload(userId) - User's complete workload
```

#### 2. **Integrate Context Service into System Prompt**
**File**: `server/routes/bubbles.js`

**Currently**: System prompt only includes active project context
**Needed**: 
- Dynamically fetch and include ALL relevant data in system prompt
- Use BubblesContextService to get comprehensive context
- Include recent activity, tasks, messages, emails in prompt
- Make context available for AI to reference

#### 3. **Add Tool-Calling Functions for Data Access**
**File**: `server/routes/bubbles.js` (in `getSystemPrompt`)

**Add tools**:
```javascript
{
  name: 'get_all_projects',
  description: 'Get all projects with optional filters (status, phase, manager)',
  parameters: { filters: { type: 'object' } }
},
{
  name: 'get_all_tasks',
  description: 'Get all tasks with filters (project, assignedTo, status, priority)',
  parameters: { filters: { type: 'object' } }
},
{
  name: 'get_all_messages',
  description: 'Get all project messages with filters',
  parameters: { filters: { type: 'object' } }
},
{
  name: 'get_all_emails',
  description: 'Get all emails with filters (project, customer, status)',
  parameters: { filters: { type: 'object' } }
},
{
  name: 'get_all_reminders',
  description: 'Get all calendar events/reminders with filters',
  parameters: { filters: { type: 'object' } }
},
{
  name: 'get_customer_info',
  description: 'Get comprehensive customer information by ID or name',
  parameters: { customerId: { type: 'string' }, customerName: { type: 'string' } }
},
{
  name: 'get_user_info',
  description: 'Get user information and workload',
  parameters: { userId: { type: 'string' }, userEmail: { type: 'string' } }
},
{
  name: 'search_all_data',
  description: 'Search across all application data types',
  parameters: { query: { type: 'string' } }
}
```

### **Phase 2: Standalone Action Capabilities (CRITICAL)**

#### 1. **Add Task Creation Tool**
**File**: `server/routes/bubbles.js`

**Add tool**:
```javascript
{
  name: 'create_task',
  description: 'Create a new task independently (not tied to document sending)',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Task title' },
      description: { type: 'string', description: 'Task description' },
      dueDate: { type: 'string', description: 'Due date (ISO string or natural language)' },
      priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      projectId: { type: 'string', description: 'Project ID (optional)' },
      assignedToEmail: { type: 'string', description: 'Assignee email' },
      documentIds: { type: 'array', items: { type: 'string' }, description: 'Optional document attachments' }
    },
    required: ['title']
  }
}
```

**Add handler in `/complete-action` route**:
```javascript
if (pendingAction.type === 'create_task') {
  // Create task with optional document attachments
  // Support assigning to user by email
  // Support project association
  // Return task creation confirmation
}
```

#### 2. **Add Reminder/Calendar Event Creation Tool**
**File**: `server/routes/bubbles.js`

**Add tool**:
```javascript
{
  name: 'create_reminder',
  description: 'Create a calendar event/reminder independently',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Event title' },
      description: { type: 'string', description: 'Event description' },
      startTime: { type: 'string', description: 'Start time (ISO string or natural language)' },
      endTime: { type: 'string', description: 'End time (optional)' },
      projectId: { type: 'string', description: 'Project ID (optional)' },
      attendeeEmails: { type: 'array', items: { type: 'string' }, description: 'Attendee emails' },
      documentIds: { type: 'array', items: { type: 'string' }, description: 'Optional document attachments' }
    },
    required: ['title', 'startTime']
  }
}
```

**Add handler in `/complete-action` route**:
```javascript
if (pendingAction.type === 'create_reminder') {
  // Create calendar event with optional document attachments
  // Support multiple attendees
  // Support project association
  // Return reminder creation confirmation
}
```

#### 3. **Add Standalone Email Tool**
**File**: `server/routes/bubbles.js`

**Add tool**:
```javascript
{
  name: 'send_email',
  description: 'Send an email independently (not tied to document sending)',
  parameters: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Email subject' },
      body: { type: 'string', description: 'Email body/content' },
      recipientEmails: { type: 'array', items: { type: 'string' }, description: 'Recipient emails' },
      projectId: { type: 'string', description: 'Project ID (optional)' },
      documentIds: { type: 'array', items: { type: 'string' }, description: 'Optional document attachments' }
    },
    required: ['subject', 'body', 'recipientEmails']
  }
}
```

**Note**: This already exists in `/complete-action` as `send_email` type, but needs to be exposed as a tool that AI can call directly.

#### 4. **Add Document Attachment Support to Tasks/Reminders**
**File**: `server/routes/bubbles.js`

**Modify task creation** to support document attachments:
- Add `documentIds` parameter
- Link documents to tasks via metadata or TaskDocument model
- Include document links in task description

**Modify reminder creation** to support document attachments:
- Add `documentIds` parameter
- Link documents to calendar events via metadata
- Include document links in event description

### **Phase 3: Enhanced Intent Detection**

#### 1. **Improve Natural Language Understanding**
**File**: `server/routes/bubbles.js`

**Add detection patterns**:
- Task creation: "create task", "add task", "assign task", "new task"
- Reminder creation: "remind me", "set reminder", "calendar event", "schedule"
- Email sending: "send email", "email them", "notify via email"
- Data queries: "show me", "list all", "what are", "how many"

#### 2. **Add Multi-Document Support**
**File**: `server/routes/bubbles.js`

**Modify document detection**:
- Detect multiple document mentions in one message
- Support "send both X and Y documents"
- Handle document lists

### **Phase 4: Proactive Features (Future)**

#### 1. **Add Proactive Notification System**
- Monitor for overdue tasks
- Check upcoming deadlines
- Identify communication gaps
- Provide daily/weekly summaries

#### 2. **Add Cross-Project Analytics**
- Portfolio status dashboard
- Resource allocation insights
- Bottleneck identification
- Team workload analysis

---

## 📋 IMPLEMENTATION PRIORITY

### **🔴 CRITICAL (Must Have)**
1. ✅ **Standalone Task Creation** - Users expect to create tasks independently
2. ✅ **Standalone Reminder Creation** - Users expect to create reminders independently  
3. ✅ **Standalone Email Sending** - Users expect to send emails without documents
4. ✅ **Comprehensive Data Access** - AI needs to see ALL data to be "all knowing"
5. ✅ **Document Attachments to Tasks/Reminders** - Users expect to attach docs when creating tasks/reminders

### **🟡 HIGH PRIORITY (Should Have)**
6. ✅ **Access All Projects** - Answer questions about any project
7. ✅ **Access All Tasks** - Answer questions about tasks across projects
8. ✅ **Access All Messages** - Answer questions about communication history
9. ✅ **Access All Emails** - Answer questions about email history
10. ✅ **Multi-Document Support** - Send multiple documents at once

### **🟢 MEDIUM PRIORITY (Nice to Have)**
11. ✅ **Update Project Information** - Modify project details
12. ✅ **Update Customer Information** - Modify customer details
13. ✅ **Proactive Updates** - Notify users about important events
14. ✅ **Cross-Project Insights** - Portfolio-level analytics

---

## 🔍 CURRENT ARCHITECTURE GAPS

### **1. BubblesContextService is Underutilized**
- **Current**: Basic implementation exists but not fully integrated
- **Issue**: System prompt doesn't use context service for comprehensive data
- **Fix**: Integrate context service into chat route to fetch and include data

### **2. Tool-Calling Architecture is Incomplete**
- **Current**: Only workflow-related tools exist
- **Issue**: Missing tools for data access and standalone actions
- **Fix**: Add all missing tools to `getSystemPrompt` function

### **3. Action Completion Route is Limited**
- **Current**: Only handles document-related actions
- **Issue**: Cannot handle standalone task/reminder creation
- **Fix**: Add handlers for all action types

### **4. System Prompt Doesn't Include Comprehensive Context**
- **Current**: Only includes active project context
- **Issue**: AI doesn't know about other projects, tasks, messages, etc.
- **Fix**: Dynamically fetch and include comprehensive context in prompt

---

## 📝 SUMMARY

### **What Bubbles CAN Do Now:**
✅ Access active project context  
✅ Send documents via email/internal messages  
✅ Create tasks/reminders **ONLY when sending documents**  
✅ Mark workflow items complete  
✅ Search documents semantically  
✅ Answer workflow questions  

### **What Bubbles CANNOT Do (But Should):**
❌ Create standalone tasks  
❌ Create standalone reminders  
❌ Send standalone emails (without documents)  
❌ Access ALL projects (only active one)  
❌ Access ALL tasks, messages, emails, reminders  
❌ Provide comprehensive project updates  
❌ Attach documents to standalone tasks/reminders  
❌ Update project/customer information  

### **Estimated Implementation Effort:**
- **Phase 1 (Data Access)**: 2-3 days
- **Phase 2 (Standalone Actions)**: 2-3 days  
- **Phase 3 (Enhanced Detection)**: 1-2 days
- **Phase 4 (Proactive Features)**: 3-5 days

**Total**: ~8-13 days to achieve full "all knowing" capability

---

## 🎯 RECOMMENDED NEXT STEPS

1. **Immediate**: Implement standalone task and reminder creation (Phase 2, Priority 1)
2. **Next**: Enhance BubblesContextService with comprehensive data access (Phase 1)
3. **Then**: Integrate context service into system prompt (Phase 1)
4. **Finally**: Add proactive features and cross-project insights (Phase 4)

This will transform Bubbles from a "helpful assistant" to a truly "all knowing" AI that can see everything and perform all requested actions.

