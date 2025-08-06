# Complete Workflow System Documentation
## From Project Creation to Completion: Every File, Process, and Database Operation

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Project Creation Flow](#project-creation-flow)
4. [Workflow Initialization](#workflow-initialization)
5. [Line Item Checking Process](#line-item-checking-process)
6. [Alert Generation System](#alert-generation-system)
7. [Phase Progression Logic](#phase-progression-logic)
8. [Complete File Map](#complete-file-map)

---

## 1. System Overview

The workflow system is a three-tier hierarchy:
- **Phases** (6 total): LEAD → PROSPECT → APPROVED → EXECUTION → SUPPLEMENT → COMPLETION
- **Sections** (Multiple per phase): Groups of related tasks
- **Line Items** (91 total): Individual checkable tasks that trigger automation

### Core Principle
When a line item is checked → Database updates → Next item activates → Alert generates → UI updates everywhere

---

## 2. Database Schema

### Primary Tables (from `server/prisma/schema.prisma`)

```prisma
model Project {
  id                String              @id
  projectNumber     String              @unique
  currentPhase      Phase              
  currentSection    String?            
  currentLineItem   String?            
  workflows         ProjectWorkflow[]   // Links to workflow instances
  tracker           ProjectWorkflowTracker?
}

model ProjectWorkflow {
  id              String           @id
  projectId       String
  project         Project          @relation
  status          WorkflowStatus   // ACTIVE, COMPLETED, PAUSED
  currentPhaseId  String?
  currentSectionId String?
  currentLineItemId String?
  phases          WorkflowPhase[]
}

model WorkflowPhase {
  id              String            @id
  workflowId      String
  workflow        ProjectWorkflow   @relation
  name            String            // LEAD, APPROVED, etc.
  orderIndex      Int
  status          PhaseStatus       // NOT_STARTED, IN_PROGRESS, COMPLETED
  sections        WorkflowSection[]
}

model WorkflowSection {
  id              String            @id
  phaseId         String
  phase           WorkflowPhase     @relation
  name            String            // "Initial Inspection", etc.
  orderIndex      Int
  isCompleted     Boolean          @default(false)
  lineItems       WorkflowLineItem[]
}

model WorkflowLineItem {
  id              String            @id
  sectionId       String
  section         WorkflowSection   @relation
  text            String            // The actual task text
  orderIndex      Int
  isCompleted     Boolean          @default(false)
  isActive        Boolean          @default(false)
  completedAt     DateTime?
  completedBy     String?
  alerts          WorkflowAlert[]   // Alerts for this line item
}

model WorkflowAlert {
  id              String            @id
  lineItemId      String
  lineItem        WorkflowLineItem  @relation
  projectId       String
  alertType       String            // EMAIL, SMS, IN_APP
  status          AlertStatus       // PENDING, SENT, FAILED
  scheduledFor    DateTime
  sentAt          DateTime?
  assignedTo      User?            // User who should receive alert
}

model ProjectWorkflowTracker {
  id                    String    @id
  projectId             String    @unique
  project               Project   @relation
  currentPhase          String    // Current phase name
  currentSection        String?   // Current section name
  currentLineItem       String?   // Current line item text
  currentLineItemId     String?   // Current line item ID
  completedLineItems    Int       @default(0)
  totalLineItems        Int       @default(91)
  lastUpdated           DateTime  @updatedAt
}

model CompletedWorkflowItem {
  id              String            @id
  projectId       String
  lineItemId      String
  lineItemText    String
  sectionName     String
  phaseName       String
  completedAt     DateTime
  completedBy     User             @relation
}
```

---

## 3. Project Creation Flow

### Step 1: User Creates Project (`src/components/pages/ProjectsPage.jsx`)

```javascript
// Line 324-420: handleCreateProject function
const handleCreateProject = async (projectData) => {
  // 1. Prepare project data with customer
  const newProject = {
    projectNumber: generateProjectNumber(),
    projectName: projectData.projectName,
    customer: {
      primaryName: projectData.primaryName,
      primaryEmail: projectData.primaryEmail,
      primaryPhone: projectData.primaryPhone,
      address: projectData.address
    },
    projectManager: projectData.projectManager,
    startDate: new Date(),
    currentPhase: 'LEAD',  // Always starts at LEAD
    status: 'ACTIVE'
  };

  // 2. Call API to create project
  const response = await api.post('/projects', newProject);
  // This triggers the backend project creation...
};
```

### Step 2: Backend Project Creation (`server/routes/projects.js`)

```javascript
// Line 89-245: POST /api/projects endpoint
router.post('/', authenticateToken, async (req, res) => {
  // 1. Create or find customer
  const customer = await prisma.customer.upsert({
    where: { primaryEmail: customerData.primaryEmail },
    update: { ...customerData },
    create: { ...customerData }
  });

  // 2. Create the project
  const project = await prisma.project.create({
    data: {
      projectNumber: req.body.projectNumber,
      projectName: req.body.projectName,
      customerId: customer.id,
      currentPhase: 'LEAD',
      currentSection: null,
      currentLineItem: null,
      status: 'ACTIVE'
    }
  });

  // 3. Initialize workflow (CRITICAL STEP)
  await initializeProjectWorkflow(project.id);
  
  // 4. Generate first alert
  await generateInitialAlert(project.id);
});
```

---

## 4. Workflow Initialization

### Core Service: `server/services/workflowInitializationService.js`

```javascript
async function initializeProjectWorkflow(projectId) {
  console.log(`🚀 Initializing workflow for project ${projectId}`);
  
  // 1. Create ProjectWorkflow instance
  const workflow = await prisma.projectWorkflow.create({
    data: {
      projectId: projectId,
      status: 'ACTIVE',
      createdById: userId
    }
  });

  // 2. Create all 7 phases with their sections and line items
  const workflowStructure = getCompleteWorkflowStructure(); // Returns 91-item structure
  
  for (const phaseData of workflowStructure) {
    // Create phase (LEAD, APPROVED, etc.)
    const phase = await prisma.workflowPhase.create({
      data: {
        workflowId: workflow.id,
        name: phaseData.name,
        orderIndex: phaseData.orderIndex,
        status: phaseData.orderIndex === 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
      }
    });

    // Create sections for this phase
    for (const sectionData of phaseData.sections) {
      const section = await prisma.workflowSection.create({
        data: {
          phaseId: phase.id,
          name: sectionData.name,
          orderIndex: sectionData.orderIndex,
          isCompleted: false
        }
      });

      // Create line items for this section
      for (const itemData of sectionData.lineItems) {
        await prisma.workflowLineItem.create({
          data: {
            sectionId: section.id,
            text: itemData.text,
            orderIndex: itemData.orderIndex,
            isCompleted: false,
            isActive: phaseData.orderIndex === 0 && 
                     sectionData.orderIndex === 0 && 
                     itemData.orderIndex === 0  // Only first item is active
          }
        });
      }
    }
  }

  // 3. Create workflow tracker
  const firstLineItem = await getFirstLineItem(workflow.id);
  await prisma.projectWorkflowTracker.create({
    data: {
      projectId: projectId,
      currentPhase: 'LEAD',
      currentSection: firstLineItem.section.name,
      currentLineItem: firstLineItem.text,
      currentLineItemId: firstLineItem.id,
      completedLineItems: 0,
      totalLineItems: 91
    }
  });

  // 4. Set first line item as active and generate alert
  await activateLineItem(firstLineItem.id, projectId);
}
```

### Workflow Structure Data: `server/data/workflowStructure.js`

```javascript
const COMPLETE_WORKFLOW = {
  phases: [
    {
      name: 'LEAD',
      orderIndex: 0,
      sections: [
        {
          name: 'Initial Contact',
          orderIndex: 0,
          lineItems: [
            { text: 'Call customer to discuss project scope', orderIndex: 0 },
            { text: 'Schedule initial inspection', orderIndex: 1 },
            { text: 'Send confirmation email', orderIndex: 2 }
          ]
        },
        {
          name: 'Initial Inspection',
          orderIndex: 1,
          lineItems: [
            { text: 'Perform roof inspection', orderIndex: 0 },
            { text: 'Take measurements and photos', orderIndex: 1 },
            { text: 'Document damage areas', orderIndex: 2 },
            { text: 'Check for code compliance issues', orderIndex: 3 }
          ]
        }
        // ... more sections
      ]
    },
    {
      name: 'APPROVED',
      orderIndex: 1,
      sections: [
        {
          name: 'Contract & Permitting',
          orderIndex: 0,
          lineItems: [
            { text: 'Prepare and send contract', orderIndex: 0 },
            { text: 'Receive signed contract', orderIndex: 1 },
            { text: 'Apply for building permits', orderIndex: 2 }
            // ... more items
          ]
        }
        // ... more sections
      ]
    }
    // ... all 7 phases with total 91 line items
  ]
};
```

---

## 5. Line Item Checking Process

### Frontend: User Checks Item (`src/components/pages/ProjectChecklistPage.jsx`)

```javascript
// Line 245-320: handleLineItemCheck function
const handleLineItemCheck = async (lineItemId, isChecked) => {
  console.log(`📝 Checking line item ${lineItemId}: ${isChecked}`);
  
  // 1. Optimistically update UI
  setLineItems(prev => prev.map(item => 
    item.id === lineItemId 
      ? { ...item, isCompleted: isChecked, isLoading: true }
      : item
  ));

  try {
    // 2. Call API to update line item
    const response = await api.post('/workflow/check-line-item', {
      projectId: projectId,
      lineItemId: lineItemId,
      isCompleted: isChecked
    });

    // 3. Handle response with new workflow state
    if (response.data.success) {
      const updates = response.data.data;
      
      // Update all UI elements with new state
      setCurrentPhase(updates.currentPhase);
      setCurrentSection(updates.currentSection);
      setCurrentLineItem(updates.currentLineItem);
      setLineItems(updates.allLineItems);
      
      // Show notification
      if (updates.phaseCompleted) {
        showNotification(`Phase ${updates.completedPhase} completed!`);
      }
    }
  } catch (error) {
    // Revert on error
    setLineItems(prev => prev.map(item => 
      item.id === lineItemId 
        ? { ...item, isCompleted: !isChecked, isLoading: false }
        : item
    ));
  }
};
```

### Backend: Process Line Item Check (`server/routes/workflow.js`)

```javascript
// Line 478-625: POST /api/workflow/check-line-item
router.post('/check-line-item', authenticateToken, async (req, res) => {
  const { projectId, lineItemId, isCompleted } = req.body;
  
  // 1. Update line item in database
  const lineItem = await prisma.workflowLineItem.update({
    where: { id: lineItemId },
    data: {
      isCompleted: isCompleted,
      completedAt: isCompleted ? new Date() : null,
      completedBy: isCompleted ? req.user.id : null,
      isActive: !isCompleted  // Deactivate if completed
    },
    include: {
      section: {
        include: {
          phase: true,
          lineItems: true
        }
      }
    }
  });

  // 2. Record completion if checked
  if (isCompleted) {
    await prisma.completedWorkflowItem.create({
      data: {
        projectId: projectId,
        lineItemId: lineItemId,
        lineItemText: lineItem.text,
        sectionName: lineItem.section.name,
        phaseName: lineItem.section.phase.name,
        completedAt: new Date(),
        completedById: req.user.id
      }
    });
  }

  // 3. Progress workflow to next item
  const progression = await progressWorkflow(projectId, lineItem);
  
  // 4. Return updated state
  res.json({
    success: true,
    data: progression
  });
});
```

### Workflow Progression Service (`server/services/WorkflowProgressionService.js`)

```javascript
class WorkflowProgressionService {
  async progressWorkflow(projectId, completedLineItem) {
    console.log(`🔄 Progressing workflow for project ${projectId}`);
    
    // 1. Check if section is complete
    const sectionComplete = await this.checkSectionCompletion(completedLineItem.sectionId);
    
    // 2. Check if phase is complete
    const phaseComplete = sectionComplete ? 
      await this.checkPhaseCompletion(completedLineItem.section.phaseId) : false;
    
    // 3. Find next active item
    const nextItem = await this.findNextLineItem(projectId, completedLineItem);
    
    if (nextItem) {
      // 4. Activate next item
      await this.activateLineItem(nextItem.id);
      
      // 5. Update project tracker
      await this.updateProjectTracker(projectId, nextItem);
      
      // 6. Generate alert for new active item
      await this.generateAlert(projectId, nextItem);
      
      // 7. Send real-time update via Socket.io
      this.emitWorkflowUpdate(projectId, {
        currentPhase: nextItem.section.phase.name,
        currentSection: nextItem.section.name,
        currentLineItem: nextItem.text,
        completedCount: await this.getCompletedCount(projectId),
        totalCount: 91
      });
    } else {
      // Workflow complete!
      await this.completeWorkflow(projectId);
    }
    
    return {
      currentPhase: nextItem?.section.phase.name || 'COMPLETED',
      currentSection: nextItem?.section.name || null,
      currentLineItem: nextItem?.text || null,
      sectionCompleted: sectionComplete,
      phaseCompleted: phaseComplete,
      workflowCompleted: !nextItem
    };
  }

  async findNextLineItem(projectId, currentItem) {
    // Logic to find next item in sequence:
    // 1. Next item in same section
    // 2. First item in next section (same phase)
    // 3. First item in next phase
    
    const workflow = await prisma.projectWorkflow.findFirst({
      where: { projectId },
      include: {
        phases: {
          orderBy: { orderIndex: 'asc' },
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                lineItems: {
                  orderBy: { orderIndex: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    // Find next uncompleted item
    for (const phase of workflow.phases) {
      for (const section of phase.sections) {
        for (const item of section.lineItems) {
          if (!item.isCompleted) {
            return item;
          }
        }
      }
    }
    
    return null; // All items complete
  }

  async activateLineItem(lineItemId) {
    await prisma.workflowLineItem.update({
      where: { id: lineItemId },
      data: { isActive: true }
    });
  }

  async updateProjectTracker(projectId, activeItem) {
    const completedCount = await prisma.completedWorkflowItem.count({
      where: { projectId }
    });

    await prisma.projectWorkflowTracker.update({
      where: { projectId },
      data: {
        currentPhase: activeItem.section.phase.name,
        currentSection: activeItem.section.name,
        currentLineItem: activeItem.text,
        currentLineItemId: activeItem.id,
        completedLineItems: completedCount,
        lastUpdated: new Date()
      }
    });

    // Also update main project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        currentPhase: activeItem.section.phase.name,
        currentSection: activeItem.section.name,
        currentLineItem: activeItem.text
      }
    });
  }
}
```

---

## 6. Alert Generation System

### Alert Generation Service (`server/services/AlertGenerationService.js`)

```javascript
class AlertGenerationService {
  async generateAlert(projectId, lineItem) {
    console.log(`🔔 Generating alert for line item: ${lineItem.text}`);
    
    // 1. Determine who should receive alert
    const assignedUser = await this.determineAssignee(lineItem);
    
    // 2. Create alert record
    const alert = await prisma.workflowAlert.create({
      data: {
        lineItemId: lineItem.id,
        projectId: projectId,
        alertType: 'EMAIL',
        status: 'PENDING',
        scheduledFor: new Date(),
        assignedToId: assignedUser.id,
        title: `Action Required: ${lineItem.text}`,
        message: this.generateAlertMessage(lineItem),
        priority: this.determinePriority(lineItem)
      }
    });

    // 3. Send immediate notification
    await this.sendImmediateAlert(alert, assignedUser);
    
    // 4. Schedule follow-up if needed
    if (this.requiresFollowUp(lineItem)) {
      await this.scheduleFollowUpAlert(alert, lineItem);
    }
    
    return alert;
  }

  async determineAssignee(lineItem) {
    // Complex logic to determine who gets the alert based on:
    // 1. Line item phase/section
    // 2. Role assignments
    // 3. Project team members
    
    const phase = lineItem.section.phase.name;
    const section = lineItem.section.name;
    
    // Phase-based assignment rules
    const assignmentRules = {
      'LEAD': {
        'Initial Contact': 'OFFICE_STAFF',
        'Initial Inspection': 'FIELD_DIRECTOR'
      },
      'APPROVED': {
        'Contract & Permitting': 'OFFICE_STAFF',
        'Material Ordering': 'PRODUCT_MANAGER'
      },
      'SCHEDULED': {
        'Pre-Construction': 'FIELD_DIRECTOR',
        'Crew Assignment': 'FIELD_DIRECTOR'
      },
      'EXECUTION': {
        'Daily Progress': 'FIELD_DIRECTOR',
        'Quality Control': 'PRODUCT_MANAGER'
      },
      'COMPLETION': {
        'Final Inspection': 'FIELD_DIRECTOR',
        'Customer Walkthrough': 'PRODUCT_MANAGER'
      },
      'INVOICING': {
        'Invoice Preparation': 'ADMINISTRATION',
        'Payment Collection': 'ADMINISTRATION'
      },
      'COMPLETED': {
        'Project Closure': 'PRODUCT_MANAGER'
      }
    };

    const roleType = assignmentRules[phase]?.[section] || 'PRODUCT_MANAGER';
    
    // Get user assigned to this role
    const roleAssignment = await prisma.roleAssignment.findFirst({
      where: { roleType },
      include: { user: true }
    });
    
    return roleAssignment?.user || await this.getDefaultUser();
  }

  generateAlertMessage(lineItem) {
    return `
      Project Update: Action Required
      
      Phase: ${lineItem.section.phase.name}
      Section: ${lineItem.section.name}
      Task: ${lineItem.text}
      
      This task has been activated and requires your attention.
      Please complete this task to progress the project workflow.
      
      Click here to view the project checklist.
    `;
  }

  async sendImmediateAlert(alert, user) {
    // Send via multiple channels
    
    // 1. In-app notification
    await prisma.notification.create({
      data: {
        recipientId: user.id,
        type: 'WORKFLOW_ALERT',
        title: alert.title,
        message: alert.message,
        data: {
          projectId: alert.projectId,
          lineItemId: alert.lineItemId
        }
      }
    });

    // 2. Email notification (if enabled)
    if (user.notificationPreferences?.email) {
      await this.sendEmail(user.email, alert);
    }

    // 3. SMS notification (if urgent)
    if (alert.priority === 'HIGH' && user.phone) {
      await this.sendSMS(user.phone, alert);
    }

    // 4. Real-time socket notification
    io.to(user.id).emit('new_alert', {
      alertId: alert.id,
      title: alert.title,
      message: alert.message
    });

    // Mark alert as sent
    await prisma.workflowAlert.update({
      where: { id: alert.id },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    });
  }
}
```

### Alert Scheduler Service (`server/services/AlertSchedulerService.js`)

```javascript
class AlertSchedulerService {
  constructor() {
    // Run every 5 minutes to check for scheduled alerts
    cron.schedule('*/5 * * * *', () => {
      this.processScheduledAlerts();
    });
  }

  async processScheduledAlerts() {
    // Find all pending alerts scheduled for now or past
    const pendingAlerts = await prisma.workflowAlert.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: new Date()
        }
      },
      include: {
        lineItem: {
          include: {
            section: {
              include: {
                phase: true
              }
            }
          }
        },
        assignedTo: true
      }
    });

    for (const alert of pendingAlerts) {
      await this.sendAlert(alert);
    }
  }

  async scheduleFollowUpAlert(originalAlert, lineItem, delayHours = 24) {
    const followUpTime = new Date();
    followUpTime.setHours(followUpTime.getHours() + delayHours);

    await prisma.workflowAlert.create({
      data: {
        lineItemId: lineItem.id,
        projectId: originalAlert.projectId,
        alertType: 'EMAIL',
        status: 'PENDING',
        scheduledFor: followUpTime,
        assignedToId: originalAlert.assignedToId,
        title: `Reminder: ${lineItem.text}`,
        message: `This is a follow-up reminder for the task: ${lineItem.text}`,
        priority: 'MEDIUM',
        parentAlertId: originalAlert.id
      }
    });
  }
}
```

---

## 7. Phase Progression Logic

### Phase Transitions and Business Rules

```javascript
// server/services/WorkflowCompletionHandler.js

class WorkflowCompletionHandler {
  async handlePhaseCompletion(projectId, completedPhase) {
    console.log(`✅ Phase ${completedPhase.name} completed for project ${projectId}`);
    
    // Phase-specific completion actions
    switch (completedPhase.name) {
      case 'LEAD':
        await this.handleLeadCompletion(projectId);
        break;
      case 'APPROVED':
        await this.handleApprovedCompletion(projectId);
        break;
      case 'SCHEDULED':
        await this.handleScheduledCompletion(projectId);
        break;
      case 'EXECUTION':
        await this.handleExecutionCompletion(projectId);
        break;
      case 'COMPLETION':
        await this.handleCompletionPhaseCompletion(projectId);
        break;
      case 'INVOICING':
        await this.handleInvoicingCompletion(projectId);
        break;
      case 'COMPLETED':
        await this.handleProjectCompletion(projectId);
        break;
    }
    
    // Activate next phase (if exists)
    const nextPhase = await this.getNextPhase(completedPhase);
    if (nextPhase) {
      await this.activatePhase(nextPhase);
    }
  }

  async handleLeadCompletion(projectId) {
    // When LEAD phase completes:
    // 1. Update project status to 'APPROVED'
    // 2. Send notification to customer
    // 3. Generate contract documents
    // 4. Alert office staff to prepare permits
    
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'APPROVED',
        approvedAt: new Date()
      }
    });

    // Generate mass alerts for APPROVED phase team
    await this.generatePhaseStartAlerts(projectId, 'APPROVED');
  }

  async handleExecutionCompletion(projectId) {
    // When EXECUTION phase completes:
    // 1. Schedule final inspection
    // 2. Prepare completion documents
    // 3. Alert quality control team
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { customer: true }
    });

    // Create calendar event for final inspection
    await prisma.calendarEvent.create({
      data: {
        title: `Final Inspection - ${project.projectNumber}`,
        projectId: projectId,
        startTime: this.getNextBusinessDay(),
        type: 'INSPECTION',
        organizerId: project.projectManagerId
      }
    });
  }

  async generatePhaseStartAlerts(projectId, phaseName) {
    // Get all line items for the new phase
    const phaseLineItems = await prisma.workflowLineItem.findMany({
      where: {
        section: {
          phase: {
            workflow: { projectId },
            name: phaseName
          }
        }
      },
      include: {
        section: {
          include: {
            phase: true
          }
        }
      },
      orderBy: [
        { section: { orderIndex: 'asc' } },
        { orderIndex: 'asc' }
      ]
    });

    // Generate initial alert for first item
    if (phaseLineItems.length > 0) {
      const firstItem = phaseLineItems[0];
      await new AlertGenerationService().generateAlert(projectId, firstItem);
    }

    // Schedule future alerts for critical items
    const criticalItems = phaseLineItems.filter(item => 
      this.isCriticalLineItem(item.text)
    );
    
    for (const item of criticalItems) {
      await this.scheduleFutureAlert(projectId, item);
    }
  }

  isCriticalLineItem(itemText) {
    const criticalKeywords = [
      'permit', 'inspection', 'payment', 'signature',
      'approval', 'safety', 'compliance', 'deadline'
    ];
    
    return criticalKeywords.some(keyword => 
      itemText.toLowerCase().includes(keyword)
    );
  }
}
```

---

## 8. Complete File Map

### Frontend Files

#### Project Management
- `src/components/pages/ProjectsPage.jsx` - Project creation and listing
- `src/components/pages/ProjectDetailPage.jsx` - Project overview and navigation
- `src/components/pages/ProjectChecklistPage.jsx` - Line item checking interface

#### Workflow UI Components
- `src/components/ui/UnifiedProgressTracker.jsx` - Visual workflow progress
- `src/services/workflowService.js` - Frontend workflow API calls
- `src/hooks/useWorkflowState.js` - React hook for workflow state
- `src/hooks/useWorkflowUpdate.js` - React hook for real-time updates

#### API Communication
- `src/services/api.js` - Axios client for API calls
- `src/services/socket.js` - Socket.io client for real-time updates

### Backend Files

#### API Routes
- `server/routes/projects.js` - Project CRUD endpoints
- `server/routes/workflow.js` - Workflow progression endpoints
- `server/routes/alerts.js` - Alert management endpoints
- `server/routes/workflowUpdates.js` - Real-time update endpoints

#### Core Services
- `server/services/workflowInitializationService.js` - Creates 91-item workflow
- `server/services/WorkflowProgressionService.js` - Handles item completion
- `server/services/AlertGenerationService.js` - Creates alerts
- `server/services/AlertSchedulerService.js` - Schedules/sends alerts
- `server/services/WorkflowCompletionHandler.js` - Phase completion logic
- `server/services/ProjectProgressService.js` - Tracks overall progress

#### Database
- `server/prisma/schema.prisma` - Complete database schema
- `server/prisma/migrations/` - Database migration files

#### Real-time Communication
- `server/server.js` - Socket.io server setup (lines 165-210)

---

## Alert Generation Timeline

### Phase: LEAD (Items 1-12)
1. **Initial Contact Section**
   - Item 1: "Call customer" → Alert to Office Staff
   - Item 2: "Schedule inspection" → Alert to Field Director
   - Item 3: "Send confirmation" → Alert to Office Staff

2. **Initial Inspection Section**
   - Items 4-7: All alerts to Field Director
   - Item 8: "Prepare estimate" → Alert to Product Manager

### Phase: APPROVED (Items 13-28)
1. **Contract & Permitting Section**
   - Items 13-15: Alerts to Office Staff
   - Item 16: "Permit approval" → Alert to Administration

2. **Material Ordering Section**
   - Items 17-20: All alerts to Product Manager

### Phase: SCHEDULED (Items 29-40)
- Items 29-34: Alerts to Field Director (crew scheduling)
- Items 35-40: Alerts to Office Staff (customer communication)

### Phase: EXECUTION (Items 41-65)
- Daily progress items: Alerts to Field Director
- Quality checks: Alerts to Product Manager
- Safety items: Alerts to Field Director

### Phase: COMPLETION (Items 66-78)
- Inspection items: Alerts to Field Director
- Documentation: Alerts to Office Staff
- Customer sign-off: Alerts to Product Manager

### Phase: INVOICING (Items 79-87)
- All items: Alerts to Administration

### Phase: COMPLETED (Items 88-91)
- Final items: Alerts to Product Manager

---

## Real-Time Updates

### Socket.io Events Flow

```javascript
// Server emits (server/services/WorkflowProgressionService.js)
io.to(projectId).emit('workflow:updated', {
  projectId,
  currentPhase,
  currentSection,
  currentLineItem,
  completedCount,
  totalCount
});

// Client receives (src/hooks/useWorkflowUpdate.js)
socket.on('workflow:updated', (data) => {
  // Update all UI components
  updateWorkflowState(data);
  showNotification(`Workflow updated: ${data.currentLineItem}`);
});
```

---

## Summary

The complete workflow system involves:
1. **91 line items** across 7 phases
2. **Automatic progression** when items are checked
3. **Role-based alerts** for each item
4. **Real-time updates** via Socket.io
5. **Database tracking** at every step
6. **Phase-specific business logic**
7. **Scheduled and immediate alerts**

Every single line item check triggers:
1. Database update
2. Workflow progression calculation
3. Alert generation
4. UI update across all connected clients
5. Progress tracking update
6. Completion recording

The system ensures that from project creation to completion, every task is tracked, every responsible party is notified, and the workflow automatically progresses through all 91 items.