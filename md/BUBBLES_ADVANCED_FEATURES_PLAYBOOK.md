# Bubbles Advanced Features Playbook

## 📚 Complete Guide to Phase 3 & Phase 4 Features

**Version:** 2.0  
**Last Updated:** January 2025  
**Features Covered:** Enhanced Detection, Multi-Document Support, Proactive Notifications, Analytics & Insights

---

## 🎯 Table of Contents

1. [Phase 3: Enhanced Detection](#phase-3-enhanced-detection)
   - [Improved Natural Language Understanding](#improved-natural-language-understanding)
   - [Multi-Document Support](#multi-document-support)
2. [Phase 4: Proactive Features](#phase-4-proactive-features)
   - [Proactive Notifications](#proactive-notifications)
   - [Analytics & Insights](#analytics--insights)

---

## 🔍 Phase 3: Enhanced Detection

### Improved Natural Language Understanding

Bubbles now understands your intent more accurately with enhanced pattern recognition. You can speak more naturally and Bubbles will detect what you want to do.

#### ✅ Task Creation

**What it detects:**
- "Create a task..."
- "Add a task..."
- "Make a task..."
- "Assign a task..."
- "Remind [someone] to..."
- "Need to..."
- "Due [date]..."

**Examples that work:**
```
✅ "Create a task for John to review the estimate by Friday"
✅ "Add a task - inspect roof deck before shingles"
✅ "Make a task for Sarah to order materials next week"
✅ "I need John to follow up with the customer tomorrow"
✅ "Task: Order shingles, due Friday"
```

**Tips:**
- Mention the assignee by name or email
- Specify due dates naturally ("Friday", "next Monday", "in 3 days")
- Bubbles will default to the selected project if you don't specify one

---

#### ⏰ Reminder Creation

**What it detects:**
- "Create a reminder..."
- "Set a reminder..."
- "Remind me..."
- "Schedule..."
- "Calendar event..."
- "Meeting..."
- "Appointment..."

**Examples that work:**
```
✅ "Remind me to call the customer tomorrow at 2pm"
✅ "Set a reminder for Monday at 9am to check materials delivery"
✅ "Create a calendar event for the walkthrough on Friday at 3pm"
✅ "Schedule a meeting with the homeowner next Tuesday afternoon"
✅ "Remind the crew to upload photos tomorrow morning"
```

**Tips:**
- Include specific times ("2pm", "tomorrow morning", "next Monday at 9")
- Bubbles will create a 30-minute event if you don't specify end time
- Add attendees by name: "with John and Sarah"

---

#### 📧 Email Sending

**What it detects:**
- "Send an email..."
- "Email [person]..."
- "E-mail..."
- "Notify via email..."

**Examples that work:**
```
✅ "Send an email to the customer saying work starts Monday"
✅ "Email John about the schedule change"
✅ "Notify the homeowner via email that the permit is approved"
✅ "E-mail accounting with the invoice attached"
```

**Tips:**
- Mention recipients by name or email address
- Include the message content in your request
- Specify project context if needed: "for project #12345"

---

#### 💬 Message Sending

**What it detects:**
- "Send a message..."
- "Message [person]..."
- "Tell [person]..."
- "Update [person]..."

**Examples that work:**
```
✅ "Send a message to the team saying we're starting early tomorrow"
✅ "Message John about the material delay"
✅ "Tell the homeowner the inspection passed"
✅ "Update Sarah that the crew finished early"
```

**Tips:**
- Internal messages stay within the project
- External customer updates will use email
- Include project number for context

---

#### 📎 Document Attachment Detection

**What it detects:**
- Any mention of document, file, PDF, form, report, checklist, etc.
- Quoted document names
- Capitalized phrases (like "Upfront Start The Day Checklist")

**Examples that work:**
```
✅ "Attach the inspection report"
✅ "Send the estimate and contract"
✅ "Include the warranty document"
```

**Tips:**
- Mention document names naturally - Bubbles handles underscores and dashes
- Use the document browser or ask "What documents are available?" first

---

### Multi-Document Support

Bubbles can now detect and handle **multiple documents** in a single request!

#### 🎯 How to Send Multiple Documents

**Key phrases that trigger multi-document detection:**
- "both X and Y"
- "X, Y, and Z"
- "X and Y documents"
- "include X and the Y document"
- "send X along with Y"

**Examples that work:**
```
✅ "Send both the inspection report and warranty document to the homeowner"
✅ "Attach the estimate, contract, and permit to the message"
✅ "Share the checklist and photos with the team"
✅ "Send the invoice and receipt together to accounting"
✅ "Include the measurement notes and the photo set"
```

#### 📋 Multiple Document Patterns

**Pattern 1: Conjunctions**
```
"Send the [document1] and [document2]"
"Attach [doc1], [doc2], and [doc3]"
"Include [doc1] plus [doc2]"
```

**Pattern 2: Lists**
```
"Send these documents: [doc1], [doc2], [doc3]"
"Attach [doc1], [doc2], and [doc3] to project #12345"
```

**Pattern 3: Quoted Names**
```
"Send 'Inspection Report.pdf' and 'Warranty.pdf'"
"Attach "Roof Packet.pdf" along with "Photos.zip""
```

**Tips:**
- Bubbles will find each document separately and attach them all
- All documents will be included in one message/email
- Subject line will show "Documents: [name1], [name2] and X more"
- You can attach documents to tasks and reminders too!

#### 🔍 What Happens Behind the Scenes

1. **Detection**: Bubbles splits your message by conjunctions (and, comma, &, plus)
2. **Matching**: Each segment is matched against available documents
3. **Deduplication**: Duplicate matches are removed
4. **Attachment**: All unique documents are attached to the message/task/email

**Example flow:**
```
You say: "Send the inspection report and warranty document to project #12345"

Bubbles does:
1. Finds "inspection report" → matches Inspection_Report_v2.pdf
2. Finds "warranty document" → matches Warranty_Document.pdf
3. Creates message with BOTH attachments
4. Confirms: "Files attached: Inspection_Report_v2.pdf, Warranty_Document.pdf"
```

---

## 🚨 Phase 4: Proactive Features

### Proactive Notifications

Bubbles automatically monitors your projects and proactively alerts you to things that need attention!

#### ⚠️ Overdue Tasks

**What Bubbles tracks:**
- Tasks past their due date
- Tasks assigned to you or your team
- Project context for each task

**How to ask:**
```
✅ "What tasks are overdue?"
✅ "Show me overdue tasks"
✅ "What needs immediate attention?"
✅ "Are there any tasks past due?"
```

**What you'll get:**
- List of all overdue tasks
- Task title, due date, assigned user
- Associated project information
- Priority indicators

**Example response:**
```
"⚠️ You have 3 overdue tasks:
- Review estimate (Due: 01/15/2025, Project: Smith Roofing)
- Order materials (Due: 01/18/2025, Project: Jones Home)
- Schedule inspection (Due: 01/20/2025, Project: Brown Renovation)"
```

---

#### 📅 Upcoming Deadlines

**What Bubbles tracks:**
- Tasks due in the next 7 days
- Tasks assigned to you or your team
- Project context

**How to ask:**
```
✅ "What deadlines are coming up?"
✅ "Show me upcoming deadlines"
✅ "What's due in the next week?"
✅ "What tasks are due soon?"
```

**What you'll get:**
- Tasks due in the next 7 days
- Due dates sorted chronologically
- Project and assignee information

---

#### 📞 Communication Gaps

**What Bubbles tracks:**
- Projects without recent messages (default: 7+ days)
- Last contact date for each project
- Active projects only

**How to ask:**
```
✅ "Which projects haven't heard from us?"
✅ "Show me communication gaps"
✅ "What projects need follow-up?"
✅ "Which customers haven't been contacted recently?"
```

**What you'll get:**
- List of projects needing contact
- Days since last message
- Project number and customer name

**Example response:**
```
"📞 2 projects need follow-up:
- Project #12345: Smith Roofing (8 days since last message)
- Project #12346: Jones Home (12 days since last message)"
```

---

#### 🔔 Overdue Alerts

**What B bubbling tracks:**
- Active workflow alerts that haven't been resolved
- Priority-level alerts
- Phase and project context

**How to ask:**
```
✅ "What alerts are overdue?"
✅ "Show me active alerts"
✅ "What workflow items need attention?"
```

**What you'll get:**
- List of overdue workflow alerts
- Alert title and priority
- Associated project and phase

---

#### 📊 Proactive Summary

**Get everything at once:**

```
✅ "What needs my attention?"
✅ "Give me a proactive summary"
✅ "What should I focus on today?"
✅ "Show me what needs attention"
```

**What you'll get:**
```
⚠️ PROACTIVE ALERTS:
- ⚠️ Overdue Tasks: 3
- 📅 Upcoming Deadlines (Next 7 Days): 5
- 📞 Communication Gaps: 2 projects without recent contact
- 🔔 Overdue Alerts: 1
```

---

### Analytics & Insights

Bubbles can analyze your entire portfolio and provide insights across all projects!

#### 📈 Portfolio Analytics

**Get comprehensive overview:**

```
✅ "What's the portfolio status?"
✅ "Show me portfolio analytics"
✅ "Give me an overview of all projects"
✅ "What's our portfolio health?"
```

**What you'll get:**
- Total projects and average progress
- Projects by status (Pending, In Progress, Completed)
- Projects by phase (Lead, Prospect, Approved, etc.)
- Total budget vs. actual cost
- Project list with details

**Example response:**
```
"📊 PORTFOLIO STATUS:
- Total Projects: 24
- Average Progress: 58%
- Budget: $1,245,000 | Cost: $721,000
- Status: 5 Pending, 15 In Progress, 4 Completed
- Phases: 3 Lead, 7 Prospect, 8 Approved, 6 Execution"
```

---

#### 👥 Resource Allocation

**See how projects are distributed:**

```
✅ "How are resources allocated?"
✅ "Show me resource allocation"
✅ "Which project managers have the most projects?"
✅ "How many projects does each manager have?"
```

**What you'll get:**
- Projects per manager
- Active vs. total projects per manager
- Project lists for each manager
- Sorted by project count (most loaded first)

**Example response:**
```
"👥 RESOURCE ALLOCATION:
- John Smith: 8 projects (5 active)
  • Project #12345, #12346, #12347...
- Sarah Jones: 7 projects (4 active)
  • Project #12350, #12351...
- Mike Brown: 6 projects (5 active)
  • Project #12355..."
```

---

#### 🚧 Bottleneck Identification

**Find where projects are stuck:**

```
✅ "Where are the bottlenecks?"
✅ "What phases are blocking projects?"
✅ "Show me bottlenecks"
✅ "Which phases need attention?"
```

**What you'll get:**
- Projects stuck in each phase
- Current line items blocking progress
- Responsible roles for each bottleneck
- Bottlenecks by role

**Example response:**
```
"🚧 BOTTLENECKS:
- Approved Phase: 5 projects stuck
  • Waiting on: "Material Order" (FOREMAN)
  • Projects: #12345, #12346, #12347...
- Execution Phase: 3 projects stuck
  • Waiting on: "Final Inspection" (PROJECT_MANAGER)
  • Projects: #12350, #12351..."
```

---

#### 📊 Team Workload

**Analyze team capacity:**

```
✅ "What's the team workload?"
✅ "Show me team workload"
✅ "Who's overloaded?"
✅ "How many tasks does each person have?"
```

**What you'll get:**
- Tasks per team member (active and overdue)
- Alerts per team member
- Reminders per team member
- Managed projects per team member
- Workload score (sum of all items)

**Example response:**
```
"📊 TEAM WORKLOAD:
- John Smith: 12 tasks (3 overdue), 2 alerts, 5 reminders, 8 projects | Score: 27
- Sarah Jones: 8 tasks (1 overdue), 1 alert, 3 reminders, 7 projects | Score: 19
- Mike Brown: 15 tasks (5 overdue), 4 alerts, 7 reminders, 6 projects | Score: 32 ⚠️"
```

---

## 🎯 Quick Reference Card

### Phase 3: Enhanced Detection

| Intent | Example Phrases |
|--------|----------------|
| **Create Task** | "Create a task...", "Add a task...", "Assign..." |
| **Create Reminder** | "Remind me...", "Set a reminder...", "Schedule..." |
| **Send Email** | "Send an email...", "Email them...", "Notify via email" |
| **Send Message** | "Send a message...", "Message...", "Tell..." |
| **Attach Documents** | "Attach...", "Send...", "Include..." |

**Multi-Document:** Use "and", commas, or "both X and Y"

---

### Phase 4: Proactive Features

| Feature | Ask For It |
|---------|-----------|
| **Overdue Tasks** | "What tasks are overdue?" |
| **Upcoming Deadlines** | "What deadlines are coming up?" |
| **Communication Gaps** | "Which projects need follow-up?" |
| **Overdue Alerts** | "What alerts are overdue?" |
| **Proactive Summary** | "What needs my attention?" |

---

### Phase 4: Analytics

| Feature | Ask For It |
|---------|-----------|
| **Portfolio Status** | "What's the portfolio status?" |
| **Resource Allocation** | "How are resources allocated?" |
| **Bottlenecks** | "Where are the bottlenecks?" |
| **Team Workload** | "What's the team workload?" |

---

## 💡 Best Practices

### For Task Creation:
1. ✅ Be specific about assignee: "Create a task for [name]..."
2. ✅ Include due date: "...by Friday" or "...in 3 days"
3. ✅ Mention project if needed: "...for project #12345"
4. ✅ Attach documents: "...and attach the estimate"

### For Multi-Document:
1. ✅ List documents clearly: "Send X and Y"
2. ✅ Use document browser first if unsure of names
3. ✅ Ask Bubbles to list available documents: "What documents are on project #12345?"

### For Proactive Features:
1. ✅ Check proactive summary each morning: "What needs my attention?"
2. ✅ Review communication gaps weekly: "Which projects need follow-up?"
3. ✅ Monitor bottlenecks regularly: "Where are we stuck?"

### For Analytics:
1. ✅ Review portfolio status weekly: "What's our portfolio health?"
2. ✅ Check resource allocation monthly: "How are resources distributed?"
3. ✅ Address bottlenecks immediately: "Show me bottlenecks"

---

## 🚀 Advanced Examples

### Example 1: Multi-Document Task Creation
```
You: "Create a task for John to review the inspection report and warranty document for project #12345, due Friday, high priority"

Bubbles:
1. Detects: create_task intent ✅
2. Finds: Inspection_Report.pdf AND Warranty.pdf ✅
3. Creates: Task "Review inspection report and warranty document"
4. Assigns: John
5. Sets: Due Friday, Priority High
6. Attaches: Both documents ✅
7. Confirms: "Created task with 2 document attachments"
```

### Example 2: Proactive Morning Check
```
You: "What needs my attention?"

Bubbles:
1. Checks overdue tasks → Finds 3
2. Checks upcoming deadlines → Finds 5
3. Checks communication gaps → Finds 2 projects
4. Checks overdue alerts → Finds 1
5. Responds: Complete proactive summary with all items
```

### Example 3: Portfolio Analysis
```
You: "Show me bottlenecks and team workload"

Bubbles:
1. Calls get_bottlenecks → Identifies stuck phases
2. Calls get_team_workload → Analyzes team capacity
3. Combines results → Shows correlation between bottlenecks and workload
4. Responds: "Found bottlenecks in Approved phase affecting 5 projects. Team workload shows John has 12 tasks..."
```

---

## ❓ Troubleshooting

### Multi-Document Not Working?

**Problem:** Bubbles only finds one document when you mention multiple.

**Solutions:**
- ✅ Use clear conjunctions: "X and Y" or "X, Y, and Z"
- ✅ Use the document browser to see exact names first
- ✅ Ask Bubbles to list documents: "What documents are available?"
- ✅ Mention documents separately: "Send X" then "Also send Y"

### Proactive Summary Empty?

**Problem:** Proactive summary shows no items.

**Reasons:**
- ✅ No overdue tasks (good news!)
- ✅ All deadlines are >7 days away
- ✅ All projects have recent communication
- ✅ No active alerts

**Note:** This is actually good - it means everything is on track!

### Analytics Not Showing?

**Problem:** Portfolio analytics seem incomplete.

**Solutions:**
- ✅ Make sure projects exist (analytics work on real data)
- ✅ Check project status filters
- ✅ Verify user has access to view projects
- ✅ Ask for specific project: "Show analytics for project #12345"

---

## 📞 Need Help?

- **Document issues?** Ask Bubbles: "What documents are available on [project]?"
- **Want examples?** Say: "Show me examples of [feature]"
- **Not working?** Describe what you tried and what happened
- **Human support:** Email support@kenstruction.com

---

## 🎓 Learning Path

### Day 1: Learn Multi-Document Support
- Try sending 2 documents together
- Test different phrasing ("and", commas)
- Practice with document browser

### Day 2: Master Proactive Features
- Check "What needs my attention?" each morning
- Review communication gaps weekly
- Set up routine checks

### Day 3: Explore Analytics
- Review portfolio status
- Check resource allocation
- Identify and address bottlenecks
- Monitor team workload

### Week 2: Combine Features
- Create tasks with multiple documents
- Use proactive alerts to prioritize
- Use analytics to improve allocation

---

**Remember:** Speak naturally. Bubbles understands your intent better than ever before. The more you use these features, the more powerful Bubbles becomes!

