# Database Schema Report - Roofing Project Management Application

**Generated:** August 9, 2025  
**Database:** PostgreSQL  
**ORM:** Prisma  
**Schema Version:** Current Production Schema

## Executive Summary

This roofing project management application uses a comprehensive PostgreSQL database with 37 interconnected models designed to handle the complete project lifecycle. The schema follows a three-tier workflow hierarchy (Phases → Sections → Line Items) that drives automated project progression, alert generation, and task management.

## Database Overview

- **Database Provider:** PostgreSQL on DigitalOcean
- **ORM:** Prisma Client
- **Total Models:** 37 primary models
- **Total Enums:** 24 enumerated types
- **Authentication:** JWT-based with enhanced security features
- **Real-time Features:** Socket.io integration for live updates

## Core Architecture: Workflow Hierarchy

The application's central feature is a three-tier workflow system:

1. **WorkflowPhase** → Top-level project stages (LEAD, APPROVED, EXECUTION, etc.)
2. **WorkflowSection** → Groups of related tasks within phases
3. **WorkflowLineItem** → Individual actionable tasks that trigger automation

### Workflow Automation Flow
- Line item completion updates PostgreSQL
- System progresses to next active item automatically
- Alerts generate for newly active items
- UI updates with visual indicators
- All related fields update application-wide

## Database Tables

### Table: users

| Column Name                  | Data Type         | Notes                               |
|------------------------------|-------------------|-------------------------------------|
| id                           | String            | Primary Key (CUID)                  |
| createdAt                    | DateTime          | Auto-managed                        |
| updatedAt                    | DateTime          | Auto-managed                        |
| firstName                    | String            | VarChar(50)                         |
| lastName                     | String            | VarChar(50)                         |
| email                        | String            | Unique, VarChar(255)                |
| password                     | String            | VarChar(255)                        |
| avatar                       | String?           | Optional, VarChar(500)              |
| phone                        | String?           | Optional, VarChar(20)               |
| position                     | String?           | Optional, VarChar(100)              |
| department                   | String?           | Optional, VarChar(100)              |
| bio                          | String?           | Optional, VarChar(500)              |
| role                         | UserRole          | Default: WORKER                     |
| permissions                  | Permission[]      | Array of permissions                |
| isActive                     | Boolean           | Default: true                       |
| isVerified                   | Boolean           | Default: false                      |
| emailVerificationToken       | String?           | Optional                            |
| emailVerificationExpires     | DateTime?         | Optional                            |
| passwordResetToken           | String?           | Optional                            |
| passwordResetExpires         | DateTime?         | Optional                            |
| passwordChangedAt            | DateTime?         | Optional                            |
| loginAttempts                | Int               | Default: 0                          |
| lockUntil                    | DateTime?         | Optional                            |
| lastLogin                    | DateTime?         | Optional                            |
| lastLoginIP                  | String?           | Optional, VarChar(45)               |
| twoFactorSecret              | String?           | Optional                            |
| twoFactorEnabled             | Boolean           | Default: false                      |
| theme                        | Theme             | Default: LIGHT                      |
| notificationPreferences      | Json?             | Optional JSON object                |
| language                     | String            | Default: "en", VarChar(5)           |
| timezone                     | String            | Default: "UTC", VarChar(50)         |
| skills                       | String[]          | Array of strings                    |
| certifications               | Json?             | Optional JSON object                |
| experience                   | Int?              | Optional                            |
| emergencyContact             | Json?             | Optional JSON object                |
| address                      | Json?             | Optional JSON object                |

### Table: customers

| Column Name    | Data Type   | Notes                     |
|----------------|-------------|---------------------------|
| id             | String      | Primary Key (CUID)        |
| createdAt      | DateTime    | Auto-managed              |
| updatedAt      | DateTime    | Auto-managed              |
| primaryName    | String      | VarChar(100)              |
| primaryEmail   | String      | Unique, VarChar(255)      |
| primaryPhone   | String      | VarChar(20)               |
| secondaryName  | String?     | Optional, VarChar(100)    |
| secondaryEmail | String?     | Optional, VarChar(255)    |
| secondaryPhone | String?     | Optional, VarChar(20)     |
| primaryContact | ContactType | Default: PRIMARY          |
| address        | String      | VarChar(500)              |
| notes          | String?     | Optional, VarChar(2000)   |

### Table: contacts

| Column Name | Data Type | Notes                   |
|-------------|-----------|-------------------------|
| id          | String    | Primary Key (CUID)      |
| createdAt   | DateTime  | Auto-managed            |
| updatedAt   | DateTime  | Auto-managed            |
| name        | String    | VarChar(100)            |
| phone       | String?   | Optional, VarChar(20)   |
| email       | String?   | Optional, VarChar(255)  |
| role        | String?   | Optional, VarChar(50)   |
| isPrimary   | Boolean   | Default: false          |
| isActive    | Boolean   | Default: true           |
| notes       | String?   | Optional, VarChar(500)  |
| customerId  | String    | Foreign key to Customer |

### Table: projects

| Column Name      | Data Type     | Notes                          |
|------------------|---------------|--------------------------------|
| id               | String        | Primary Key (CUID)             |
| createdAt        | DateTime      | Auto-managed                   |
| updatedAt        | DateTime      | Auto-managed                   |
| projectNumber    | Int           | Unique                         |
| projectName      | String        | VarChar(200)                   |
| projectType      | ProjectType   | See Enum Values                |
| status           | ProjectStatus | Default: PENDING               |
| archived         | Boolean       | Default: false                 |
| archivedAt       | DateTime?     | Optional                       |
| progress         | Int           | Default: 0                     |
| description      | String?       | Optional, VarChar(2000)        |
| priority         | Priority      | Default: MEDIUM                |
| budget           | Decimal       | Decimal(12, 2)                 |
| estimatedCost    | Decimal?      | Optional, Decimal(12, 2)       |
| actualCost       | Decimal?      | Optional, Decimal(12, 2)       |
| startDate        | DateTime      | Required                       |
| endDate          | DateTime      | Required                       |
| notes            | String?       | Optional, VarChar(1000)        |
| pmPhone          | String?       | Optional, VarChar(20)          |
| pmEmail          | String?       | Optional, VarChar(255)         |
| customerId       | String        | Foreign key to Customer        |
| projectManagerId | String?       | Optional, Foreign key to User  |
| createdById      | String?       | Optional, Foreign key to User  |
| phase            | ProjectPhase? | Optional                       |

### Table: project_team_members

| Column Name | Data Type | Notes                     |
|-------------|-----------|---------------------------|
| id          | String    | Primary Key (CUID)        |
| createdAt   | DateTime  | Auto-managed              |
| projectId   | String    | Foreign key to Project    |
| userId      | String    | Foreign key to User       |
| role        | String?   | Optional, VarChar(100)    |

### Table: project_workflows

| Column Name             | Data Type      | Notes                         |
|-------------------------|----------------|-------------------------------|
| id                      | String         | Primary Key (CUID)            |
| createdAt               | DateTime       | Auto-managed                  |
| updatedAt               | DateTime       | Auto-managed                  |
| projectId               | String         | Unique, Foreign key to Project|
| workflowType            | WorkflowType   | Default: ROOFING              |
| status                  | WorkflowStatus | Default: NOT_STARTED          |
| currentStepIndex        | Int            | Default: 0                    |
| overallProgress         | Int            | Default: 0                    |
| workflowStartDate       | DateTime?      | Optional                      |
| workflowEndDate         | DateTime?      | Optional                      |
| estimatedCompletionDate | DateTime?      | Optional                      |
| actualCompletionDate    | DateTime?      | Optional                      |
| enableAlerts            | Boolean        | Default: true                 |
| alertMethods            | AlertMethod[]  | Array of alert methods        |
| escalationEnabled       | Boolean        | Default: true                 |
| escalationDelayDays     | Int            | Default: 2                    |
| teamAssignments         | Json?          | Optional JSON object          |
| createdById             | String?        | Optional, Foreign key to User |
| lastModifiedById        | String?        | Optional, Foreign key to User |

### Table: workflow_steps

| Column Name        | Data Type       | Notes                              |
|--------------------|-----------------|-------------------------------------|
| id                 | String          | Primary Key (CUID)                  |
| createdAt          | DateTime        | Auto-managed                        |
| updatedAt          | DateTime        | Auto-managed                        |
| stepId             | String          | VarChar(50)                         |
| stepName           | String          | VarChar(200)                        |
| description        | String          | VarChar(1000)                       |
| phase              | ProjectPhase    | See Enum Values                     |
| defaultResponsible | ResponsibleRole | See Enum Values                     |
| assignedToId       | String?         | Optional, Foreign key to User       |
| estimatedDuration  | Int             | Required                            |
| stepOrder          | Int             | Required                            |
| scheduledStartDate | DateTime?       | Optional                            |
| scheduledEndDate   | DateTime?       | Optional                            |
| actualStartDate    | DateTime?       | Optional                            |
| actualEndDate      | DateTime?       | Optional                            |
| isCompleted        | Boolean         | Default: false                      |
| completedAt        | DateTime?       | Optional                            |
| completedById      | String?         | Optional, Foreign key to User       |
| alertPriority      | AlertPriority   | Default: MEDIUM                     |
| alertDays          | Int             | Default: 1                          |
| overdueIntervals   | Int[]           | Default: [1, 3, 7, 14]              |
| notes              | String?         | Optional, VarChar(2000)             |
| completionNotes    | String?         | Optional, VarChar(2000)             |
| dependencies       | String[]        | Array of strings                    |
| workflowId         | String          | Foreign key to ProjectWorkflow      |

### Table: workflow_subtasks

| Column Name   | Data Type | Notes                        |
|---------------|-----------|------------------------------|
| id            | String    | Primary Key (CUID)           |
| createdAt     | DateTime  | Auto-managed                 |
| updatedAt     | DateTime  | Auto-managed                 |
| subTaskId     | String    | VarChar(50)                  |
| subTaskName   | String    | VarChar(500)                 |
| description   | String?   | Optional, VarChar(1000)      |
| isCompleted   | Boolean   | Default: false               |
| completedAt   | DateTime? | Optional                     |
| completedById | String?   | Optional, Foreign key to User|
| notes         | String?   | Optional, VarChar(1000)      |
| stepId        | String    | Foreign key to WorkflowStep  |

### Table: workflow_step_attachments

| Column Name | Data Type | Notes                        |
|-------------|-----------|------------------------------|
| id          | String    | Primary Key (CUID)           |
| createdAt   | DateTime  | Auto-managed                 |
| stepId      | String    | Foreign key to WorkflowStep  |
| documentId  | String    | Foreign key to Document      |

### Table: workflow_alerts

| Column Name     | Data Type       | Notes                            |
|-----------------|-----------------|----------------------------------|
| id              | String          | Primary Key (CUID)               |
| createdAt       | DateTime        | Auto-managed                     |
| updatedAt       | DateTime        | Auto-managed                     |
| type            | String          | Default: "Work Flow Line Item"   |
| priority        | AlertPriority   | Default: MEDIUM                  |
| status          | AlertStatus     | Default: ACTIVE                  |
| title           | String          | VarChar(255)                     |
| message         | String          | Text                             |
| stepName        | String          | VarChar(255)                     |
| isRead          | Boolean         | Default: false                   |
| readAt          | DateTime?       | Optional                         |
| acknowledged    | Boolean         | Default: false                   |
| acknowledgedAt  | DateTime?       | Optional                         |
| dueDate         | DateTime?       | Optional                         |
| projectId       | String          | Foreign key to Project           |
| workflowId      | String          | Foreign key to ProjectWorkflow   |
| stepId          | String          | Foreign key to WorkflowStep      |
| assignedToId    | String?         | Optional, Foreign key to User    |
| createdById     | String?         | Optional, Foreign key to User    |
| metadata        | Json?           | Optional JSON object             |
| responsibleRole | ResponsibleRole | Default: OFFICE                  |

### Table: tasks

| Column Name    | Data Type    | Notes                        |
|----------------|--------------|------------------------------|
| id             | String       | Primary Key (CUID)           |
| createdAt      | DateTime     | Auto-managed                 |
| updatedAt      | DateTime     | Auto-managed                 |
| title          | String       | VarChar(200)                 |
| description    | String?      | Optional, VarChar(2000)      |
| dueDate        | DateTime     | Required                     |
| status         | TaskStatus   | Default: TO_DO               |
| priority       | Priority     | Default: MEDIUM              |
| estimatedHours | Int?         | Optional                     |
| actualHours    | Int?         | Optional                     |
| category       | TaskCategory | Default: OTHER               |
| tags           | String[]     | Array of strings             |
| notes          | String?      | Optional, VarChar(1000)      |
| completedAt    | DateTime?    | Optional                     |
| projectId      | String       | Foreign key to Project       |
| assignedToId   | String       | Foreign key to User          |
| createdById    | String?      | Optional, Foreign key to User|

### Table: task_dependencies

| Column Name     | Data Type | Notes                |
|-----------------|-----------|----------------------|
| id              | String    | Primary Key (CUID)   |
| createdAt       | DateTime  | Auto-managed         |
| parentTaskId    | String    | Foreign key to Task  |
| dependentTaskId | String    | Foreign key to Task  |

### Table: documents

| Column Name      | Data Type    | Notes                        |
|------------------|--------------|------------------------------|
| id               | String       | Primary Key (CUID)           |
| createdAt        | DateTime     | Auto-managed                 |
| updatedAt        | DateTime     | Auto-managed                 |
| fileName         | String       | VarChar(255)                 |
| originalName     | String       | VarChar(255)                 |
| fileUrl          | String       | VarChar(1000)                |
| mimeType         | String       | VarChar(100)                 |
| fileSize         | Int          | Required                     |
| fileType         | DocumentType | See Enum Values              |
| description      | String?      | Optional, VarChar(1000)      |
| tags             | String[]     | Array of strings             |
| version          | Int          | Default: 1                   |
| isActive         | Boolean      | Default: true                |
| downloadCount    | Int          | Default: 0                   |
| lastDownloadedAt | DateTime?    | Optional                     |
| checksum         | String?      | Optional, VarChar(255)       |
| isPublic         | Boolean      | Default: false               |
| projectId        | String       | Foreign key to Project       |
| uploadedById     | String       | Foreign key to User          |

### Table: document_downloads

| Column Name | Data Type | Notes                    |
|-------------|-----------|--------------------------|
| id          | String    | Primary Key (CUID)       |
| createdAt   | DateTime  | Auto-managed             |
| documentId  | String    | Foreign key to Document  |
| userId      | String    | Foreign key to User      |

### Table: project_messages

| Column Name       | Data Type          | Notes                            |
|-------------------|--------------------|----------------------------------|
| id                | String             | Primary Key (CUID)               |
| createdAt         | DateTime           | Auto-managed                     |
| updatedAt         | DateTime           | Auto-managed                     |
| content           | String             | Text                             |
| subject           | String             | VarChar(255)                     |
| messageType       | ProjectMessageType | Default: WORKFLOW_UPDATE         |
| priority          | MessagePriority    | Default: MEDIUM                  |
| authorId          | String?            | Optional, Foreign key to User    |
| authorName        | String             | VarChar(100)                     |
| authorRole        | String?            | Optional, VarChar(50)            |
| projectId         | String             | Foreign key to Project           |
| projectNumber     | Int                | Required                         |
| workflowId        | String?            | Optional, Foreign key            |
| stepId            | String?            | Optional, Foreign key            |
| stepName          | String?            | Optional, VarChar(255)           |
| phase             | ProjectPhase?      | Optional                         |
| section           | String?            | Optional, VarChar(255)           |
| lineItem          | String?            | Optional, VarChar(255)           |
| isSystemGenerated | Boolean            | Default: false                   |
| isWorkflowMessage | Boolean            | Default: false                   |
| parentMessageId   | String?            | Optional, Foreign key to self    |
| readBy            | String[]           | Default: []                      |
| readCount         | Int                | Default: 0                       |
| metadata          | Json?              | Optional JSON object             |

### Table: conversations

| Column Name | Data Type | Notes                   |
|-------------|-----------|-------------------------|
| id          | String    | Primary Key (CUID)      |
| createdAt   | DateTime  | Auto-managed            |
| updatedAt   | DateTime  | Auto-managed            |
| title       | String?   | Optional, VarChar(200)  |
| description | String?   | Optional, VarChar(500)  |
| isGroup     | Boolean   | Default: false          |
| isActive    | Boolean   | Default: true           |

### Table: conversation_participants

| Column Name    | Data Type        | Notes                        |
|----------------|------------------|------------------------------|
| id             | String           | Primary Key (CUID)           |
| createdAt      | DateTime         | Auto-managed                 |
| conversationId | String           | Foreign key to Conversation  |
| userId         | String           | Foreign key to User          |
| joinedAt       | DateTime         | Default: now()               |
| leftAt         | DateTime?        | Optional                     |
| role           | ConversationRole | Default: MEMBER              |

### Table: messages

| Column Name    | Data Type   | Notes                        |
|----------------|-------------|------------------------------|
| id             | String      | Primary Key (CUID)           |
| createdAt      | DateTime    | Auto-managed                 |
| updatedAt      | DateTime    | Auto-managed                 |
| text           | String      | Text                         |
| messageType    | MessageType | Default: TEXT                |
| isEdited       | Boolean     | Default: false               |
| editedAt       | DateTime?   | Optional                     |
| isDeleted      | Boolean     | Default: false               |
| deletedAt      | DateTime?   | Optional                     |
| conversationId | String      | Foreign key to Conversation  |
| senderId       | String      | Foreign key to User          |
| replyToId      | String?     | Optional, Foreign key to self|
| attachments    | Json?       | Optional JSON object         |
| reactions      | Json?       | Optional JSON object         |
| systemData     | Json?       | Optional JSON object         |

### Table: message_reads

| Column Name | Data Type | Notes                   |
|-------------|-----------|-------------------------|
| id          | String    | Primary Key (CUID)      |
| createdAt   | DateTime  | Auto-managed            |
| messageId   | String    | Foreign key to Message  |
| userId      | String    | Foreign key to User     |
| readAt      | DateTime  | Default: now()          |

### Table: calendar_events

| Column Name    | Data Type     | Notes                          |
|----------------|---------------|--------------------------------|
| id             | String        | Primary Key (CUID)             |
| createdAt      | DateTime      | Auto-managed                   |
| updatedAt      | DateTime      | Auto-managed                   |
| title          | String        | VarChar(200)                   |
| description    | String?       | Optional, VarChar(2000)        |
| startTime      | DateTime      | Required                       |
| endTime        | DateTime      | Required                       |
| location       | String?       | Optional, VarChar(500)         |
| isAllDay       | Boolean       | Default: false                 |
| eventType      | EventType     | Default: MEETING               |
| status         | EventStatus   | Default: CONFIRMED             |
| isRecurring    | Boolean       | Default: false                 |
| recurrenceRule | String?       | Optional, VarChar(500)         |
| parentEventId  | String?       | Optional, Foreign key to self  |
| organizerId    | String        | Foreign key to User            |
| projectId      | String?       | Optional, Foreign key to Project|

### Table: calendar_event_attendees

| Column Name | Data Type        | Notes                        |
|-------------|------------------|------------------------------|
| id          | String           | Primary Key (CUID)           |
| createdAt   | DateTime         | Auto-managed                 |
| updatedAt   | DateTime         | Auto-managed                 |
| eventId     | String           | Foreign key to CalendarEvent |
| userId      | String           | Foreign key to User          |
| status      | AttendeeStatus   | Default: REQUIRED            |
| response    | AttendeeResponse | Default: NO_RESPONSE         |

### Table: notifications

| Column Name | Data Type        | Notes                        |
|-------------|------------------|------------------------------|
| id          | String           | Primary Key (CUID)           |
| createdAt   | DateTime         | Auto-managed                 |
| updatedAt   | DateTime         | Auto-managed                 |
| title       | String           | VarChar(200)                 |
| message     | String           | VarChar(1000)                |
| type        | NotificationType | See Enum Values              |
| isRead      | Boolean          | Default: false               |
| readAt      | DateTime?        | Optional                     |
| actionUrl   | String?          | Optional, VarChar(500)       |
| actionData  | Json?            | Optional JSON object         |
| recipientId | String           | Foreign key to User          |

### Table: project_phase_overrides

| Column Name         | Data Type      | Notes                            |
|---------------------|----------------|----------------------------------|
| id                  | String         | Primary Key (CUID)               |
| createdAt           | DateTime       | Auto-managed                     |
| updatedAt           | DateTime       | Auto-managed                     |
| projectId           | String         | Foreign key to Project           |
| workflowId          | String         | Foreign key to ProjectWorkflow   |
| fromPhase           | ProjectPhase   | See Enum Values                  |
| toPhase             | ProjectPhase   | See Enum Values                  |
| overriddenById      | String         | Foreign key to User              |
| reason              | String?        | Optional, VarChar(500)           |
| suppressAlertsFor   | ProjectPhase[] | Array of ProjectPhase            |
| autoLogMessage      | String         | Text                             |
| isActive            | Boolean        | Default: true                    |
| conversationMessage | String?        | Optional                         |

### Table: suppressed_workflow_alerts

| Column Name        | Data Type              | Notes                                    |
|--------------------|------------------------|------------------------------------------|
| id                 | String                 | Primary Key (CUID)                       |
| createdAt          | DateTime               | Auto-managed                             |
| originalAlertId    | String                 | Unique                                   |
| overrideId         | String                 | Foreign key to ProjectPhaseOverride      |
| suppressedPhase    | ProjectPhase           | See Enum Values                          |
| suppressedStepId   | String                 | Required                                 |
| suppressedStepName | String                 | VarChar(255)                             |
| originalTitle      | String                 | VarChar(255)                             |
| originalMessage    | String                 | Text                                     |
| originalPriority   | AlertPriority          | See Enum Values                          |
| suppressionReason  | String                 | VarChar(500)                             |

### Table: role_assignments

| Column Name  | Data Type | Notes                        |
|--------------|-----------|------------------------------|
| id           | String    | Primary Key (CUID)           |
| createdAt    | DateTime  | Auto-managed                 |
| updatedAt    | DateTime  | Auto-managed                 |
| roleType     | RoleType  | Unique, See Enum Values      |
| userId       | String    | Foreign key to User          |
| assignedAt   | DateTime  | Required                     |
| assignedById | String?   | Optional, Foreign key to User|
| isActive     | Boolean   | Default: true                |

### Table: workflow_phases

| Column Name  | Data Type    | Notes                   |
|--------------|--------------|-------------------------|
| id           | String       | Primary Key (CUID)      |
| createdAt    | DateTime     | Auto-managed            |
| updatedAt    | DateTime     | Auto-managed            |
| phaseName    | String       | VarChar(100)            |
| phaseType    | ProjectPhase | Unique, See Enum Values |
| displayOrder | Int          | Required                |
| description  | String?      | Optional, VarChar(500)  |
| isActive     | Boolean      | Default: true           |

### Table: workflow_sections

| Column Name   | Data Type | Notes                        |
|---------------|-----------|------------------------------|
| id            | String    | Primary Key (CUID)           |
| createdAt     | DateTime  | Auto-managed                 |
| updatedAt     | DateTime  | Auto-managed                 |
| sectionNumber | String    | VarChar(10), e.g., "1", "2"  |
| sectionName   | String    | VarChar(200)                 |
| displayName   | String    | VarChar(255), with emojis    |
| displayOrder  | Int       | Required                     |
| description   | String?   | Optional, VarChar(500)       |
| isActive      | Boolean   | Default: true                |
| phaseId       | String    | Foreign key to WorkflowPhase |

### Table: workflow_line_items

| Column Name      | Data Type       | Notes                         |
|------------------|-----------------|-------------------------------|
| id               | String          | Primary Key (CUID)            |
| createdAt        | DateTime        | Auto-managed                  |
| updatedAt        | DateTime        | Auto-managed                  |
| itemLetter       | String          | VarChar(10), e.g., "a", "b"   |
| itemName         | String          | VarChar(500)                  |
| responsibleRole  | ResponsibleRole | See Enum Values               |
| displayOrder     | Int             | Required                      |
| description      | String?         | Optional, VarChar(1000)       |
| isActive         | Boolean         | Default: true                 |
| estimatedMinutes | Int             | Default: 30                   |
| alertDays        | Int             | Default: 1                    |
| sectionId        | String          | Foreign key to WorkflowSection|

### Table: project_workflow_trackers

| Column Name         | Data Type | Notes                            |
|---------------------|-----------|----------------------------------|
| id                  | String    | Primary Key (CUID)               |
| createdAt           | DateTime  | Auto-managed                     |
| updatedAt           | DateTime  | Auto-managed                     |
| projectId           | String    | Unique, Foreign key to Project   |
| currentPhaseId      | String?   | Optional, Foreign key to Phase   |
| currentSectionId    | String?   | Optional, Foreign key to Section |
| currentLineItemId   | String?   | Optional, Foreign key to LineItem|
| lastCompletedItemId | String?   | Optional                         |
| phaseStartedAt      | DateTime? | Optional                         |
| sectionStartedAt    | DateTime? | Optional                         |
| lineItemStartedAt   | DateTime? | Optional                         |

### Table: completed_workflow_items

| Column Name   | Data Type | Notes                              |
|---------------|-----------|-------------------------------------|
| id            | String    | Primary Key (CUID)                  |
| createdAt     | DateTime  | Auto-managed                        |
| trackerId     | String    | Foreign key to ProjectWorkflowTracker|
| phaseId       | String    | Foreign key to WorkflowPhase        |
| sectionId     | String    | Foreign key to WorkflowSection      |
| lineItemId    | String    | Foreign key to WorkflowLineItem     |
| completedAt   | DateTime  | Default: now()                      |
| completedById | String?   | Optional, Foreign key to User       |
| notes         | String?   | Optional, VarChar(1000)             |

### Table: user_devices

| Column Name       | Data Type | Notes                       |
|-------------------|-----------|------------------------------|
| id                | String    | Primary Key (CUID)           |
| createdAt         | DateTime  | Auto-managed                 |
| updatedAt         | DateTime  | Auto-managed                 |
| userId            | String    | Foreign key to User          |
| deviceFingerprint | String    | Unique, VarChar(255)         |
| deviceName        | String?   | Optional, VarChar(100)       |
| deviceType        | String?   | Optional, VarChar(50)        |
| userAgent         | String?   | Optional, VarChar(500)       |
| ipAddress         | String?   | Optional, VarChar(45)        |
| location          | Json?     | Optional JSON object         |
| trusted           | Boolean   | Default: false               |
| biometricEnabled  | Boolean   | Default: false               |
| lastUsed          | DateTime? | Optional                     |
| isActive          | Boolean   | Default: true                |

### Table: user_mfa

| Column Name | Data Type | Notes                    |
|-------------|-----------|--------------------------|
| id          | String    | Primary Key (CUID)       |
| createdAt   | DateTime  | Auto-managed             |
| updatedAt   | DateTime  | Auto-managed             |
| userId      | String    | Foreign key to User      |
| method      | MFAMethod | See Enum Values          |
| secret      | String?   | Optional, VarChar(255)   |
| backupCodes | String[]  | Array of strings         |
| phoneNumber | String?   | Optional, VarChar(20)    |
| enabled     | Boolean   | Default: false           |
| lastUsed    | DateTime? | Optional                 |

### Table: security_events

| Column Name | Data Type         | Notes                        |
|-------------|-------------------|------------------------------|
| id          | String            | Primary Key (CUID)           |
| createdAt   | DateTime          | Auto-managed                 |
| userId      | String?           | Optional, Foreign key to User|
| eventType   | SecurityEventType | See Enum Values              |
| riskScore   | Int?              | Optional, 0-100 range        |
| details     | Json?             | Optional JSON object         |
| ipAddress   | String?           | Optional, VarChar(45)        |
| userAgent   | String?           | Optional, VarChar(500)       |
| deviceId    | String?           | Optional                     |
| resolved    | Boolean           | Default: false               |
| resolvedAt  | DateTime?         | Optional                     |
| resolvedBy  | String?           | Optional, Foreign key to User|
| response    | Json?             | Optional JSON object         |

### Table: user_behavior_patterns

| Column Name      | Data Type | Notes                      |
|------------------|-----------|----------------------------|
| id               | String    | Primary Key (CUID)         |
| createdAt        | DateTime  | Auto-managed               |
| updatedAt        | DateTime  | Auto-managed               |
| userId           | String    | Unique, Foreign key to User|
| keystrokePatterns| Json?     | Optional JSON object       |
| mousePatterns    | Json?     | Optional JSON object       |
| touchPatterns    | Json?     | Optional JSON object       |
| usagePatterns    | Json?     | Optional JSON object       |
| voicePattern     | Json?     | Optional JSON object       |
| riskBaseline     | Decimal?  | Optional, Decimal(5,2)     |
| anomalyThreshold | Decimal?  | Optional, Decimal(5,2)     |
| lastAnalysis     | DateTime? | Optional                   |

### Table: webauthn_credentials

| Column Name           | Data Type | Notes                        |
|-----------------------|-----------|------------------------------|
| id                    | String    | Primary Key (CUID)           |
| createdAt             | DateTime  | Auto-managed                 |
| updatedAt             | DateTime  | Auto-managed                 |
| userId                | String    | Foreign key to User          |
| credentialID          | String    | Unique, VarChar(255)         |
| credentialPublicKey   | Bytes     | Required                     |
| counter               | Int       | Default: 0                   |
| deviceType            | String    | VarChar(50)                  |
| backedUp              | Boolean   | Default: false               |
| transports            | String[]  | Array of strings             |
| nickname              | String?   | Optional, VarChar(100)       |
| lastUsed              | DateTime? | Optional                     |
| isActive              | Boolean   | Default: true                |

---

## Enum Values

### Enum: UserRole
- ADMIN
- MANAGER
- PROJECT_MANAGER
- FOREMAN
- WORKER
- CLIENT

### Enum: Permission
- CREATE_PROJECTS
- EDIT_PROJECTS
- DELETE_PROJECTS
- MANAGE_USERS
- VIEW_REPORTS
- MANAGE_FINANCES
- MANAGE_DOCUMENTS
- MANAGE_CALENDAR
- USE_AI_FEATURES

### Enum: Theme
- LIGHT
- DARK
- AUTO

### Enum: ContactType
- PRIMARY
- SECONDARY

### Enum: ProjectType
- ROOF_REPLACEMENT
- KITCHEN_REMODEL
- BATHROOM_RENOVATION
- SIDING_INSTALLATION
- WINDOW_REPLACEMENT
- FLOORING
- PAINTING
- ELECTRICAL_WORK
- PLUMBING
- HVAC
- DECK_CONSTRUCTION
- LANDSCAPING
- OTHER

### Enum: ProjectStatus
- PENDING
- IN_PROGRESS
- COMPLETED
- ON_HOLD

### Enum: Priority
- LOW
- MEDIUM
- HIGH

### Enum: ProjectPhase
- LEAD
- PROSPECT
- APPROVED
- EXECUTION
- SECOND_SUPPLEMENT
- COMPLETION

### Enum: WorkflowType
- ROOFING
- KITCHEN_REMODEL
- BATHROOM_RENOVATION
- SIDING
- WINDOWS
- GENERAL

### Enum: WorkflowStatus
- NOT_STARTED
- IN_PROGRESS
- COMPLETED
- ON_HOLD
- CANCELLED

### Enum: ResponsibleRole
- OFFICE
- ADMINISTRATION
- PROJECT_MANAGER
- FIELD_DIRECTOR
- ROOF_SUPERVISOR

### Enum: AlertPriority
- LOW
- MEDIUM
- HIGH

### Enum: AlertMethod
- IN_APP
- EMAIL
- SMS

### Enum: AlertStatus
- ACTIVE
- ACKNOWLEDGED
- DISMISSED
- COMPLETED

### Enum: TaskStatus
- TO_DO
- IN_PROGRESS
- DONE

### Enum: TaskCategory
- PLANNING
- DESIGN
- CONSTRUCTION
- INSPECTION
- DOCUMENTATION
- COMMUNICATION
- OTHER

### Enum: DocumentType
- BLUEPRINT
- PERMIT
- INVOICE
- PHOTO
- CONTRACT
- REPORT
- SPECIFICATION
- CORRESPONDENCE
- OTHER

### Enum: ProjectMessageType
- WORKFLOW_UPDATE
- PHASE_COMPLETION
- STEP_COMPLETION
- USER_MESSAGE
- SYSTEM_NOTIFICATION
- ALERT_DISCUSSION
- PROJECT_MILESTONE

### Enum: MessagePriority
- LOW
- MEDIUM
- HIGH
- URGENT

### Enum: ConversationRole
- ADMIN
- MODERATOR
- MEMBER

### Enum: MessageType
- TEXT
- IMAGE
- FILE
- SYSTEM
- NOTIFICATION

### Enum: EventType
- MEETING
- INSPECTION
- INSTALLATION
- DEADLINE
- REMINDER
- OTHER

### Enum: EventStatus
- CONFIRMED
- TENTATIVE
- CANCELLED

### Enum: AttendeeStatus
- REQUIRED
- OPTIONAL
- ORGANIZER

### Enum: AttendeeResponse
- ACCEPTED
- DECLINED
- TENTATIVE
- NO_RESPONSE

### Enum: NotificationType
- TASK_ASSIGNED
- TASK_COMPLETED
- PROJECT_UPDATE
- WORKFLOW_ALERT
- SYSTEM_MESSAGE
- REMINDER

### Enum: RoleType
- PROJECT_MANAGER
- FIELD_DIRECTOR
- OFFICE_STAFF
- ADMINISTRATION

### Enum: MFAMethod
- TOTP
- SMS
- WEBAUTHN
- BACKUP
- EMAIL

### Enum: SecurityEventType
- LOGIN_SUCCESS
- LOGIN_FAILURE
- LOGIN_BLOCKED
- MFA_SUCCESS
- MFA_FAILURE
- DEVICE_NEW
- DEVICE_SUSPICIOUS
- LOCATION_NEW
- LOCATION_SUSPICIOUS
- BEHAVIOR_ANOMALY
- ACCOUNT_LOCKED
- ACCOUNT_UNLOCKED
- PASSWORD_CHANGED
- MFA_ENABLED
- MFA_DISABLED
- DEVICE_TRUSTED
- DEVICE_REMOVED
- SECURITY_QUESTION_FAILED
- BRUTE_FORCE_DETECTED
- CREDENTIAL_CREATED
- CREDENTIAL_DELETED

## Key Relationships Summary

### Primary Foreign Key Relationships
- **Users** relate to most entities as creators, assignees, or participants
- **Projects** are central entities connected to customers, workflows, tasks, documents, messages
- **Customers** own multiple projects and have multiple contacts
- **Workflows** belong to projects and contain steps with alerts
- **WorkflowPhases/Sections/LineItems** define the workflow template structure
- **ProjectWorkflowTracker** tracks current position in the workflow hierarchy
- **Alerts** are generated from workflow steps and assigned to users

### Cascade Deletion Rules
- Customer deletion removes associated projects
- Project deletion removes workflows, tasks, documents, messages
- User deletion sets foreign key references to NULL where appropriate
- Workflow deletion removes steps, alerts, and tracking data

---

*This schema report represents the complete PostgreSQL database structure for the roofing project management application as of August 9, 2025.*