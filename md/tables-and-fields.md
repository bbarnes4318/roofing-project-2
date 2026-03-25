# Database Tables and Fields

## Core User Management

### **users**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `firstName` (String, 100 chars)
- `lastName` (String, 100 chars)
- `email` (String, unique, 320 chars)
- `password` (String, 255 chars)
- `avatar` (String?, 2000 chars)
- `phone` (String?, 20 chars)
- `position` (String?, 100 chars)
- `department` (String?, 100 chars)
- `bio` (String?, 500 chars)
- `role` (UserRole enum, default: WORKER)
- `permissions` (Permission[] array)
- `isActive` (Boolean, default: true)
- `isVerified` (Boolean, default: false)
- `emailVerificationToken` (String?)
- `emailVerificationExpires` (DateTime?)
- `passwordResetToken` (String?)
- `passwordResetExpires` (DateTime?)
- `passwordChangedAt` (DateTime?)
- `loginAttempts` (Int, default: 0)
- `lockUntil` (DateTime?)
- `lastLogin` (DateTime?)
- `lastLoginIP` (String?, 45 chars)
- `twoFactorSecret` (String?)
- `twoFactorEnabled` (Boolean, default: false)
- `theme` (Theme enum, default: LIGHT)
- `notificationPreferences` (Json?)
- `language` (String, default: "en", 5 chars)
- `timezone` (String, default: "UTC", 50 chars)
- `skills` (String[] array)
- `certifications` (Json?)
- `experience` (Int?)
- `emergencyContact` (Json?)
- `address` (Json?)

### **customers**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `primaryName` (String, 100 chars)
- `primaryEmail` (String, unique, 320 chars)
- `primaryPhone` (String, 20 chars)
- `secondaryName` (String?, 100 chars)
- `secondaryEmail` (String?, 320 chars)
- `secondaryPhone` (String?, 20 chars)
- `primaryContact` (ContactType enum, default: PRIMARY)
- `address` (String, 500 chars)
- `notes` (String?)
- `isActive` (Boolean, default: true)
- `primaryRole` (String?, 50 chars)
- `secondaryRole` (String?, 50 chars)

## Project Management

### **projects**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `projectNumber` (Int, unique)
- `projectName` (String, 255 chars)
- `projectType` (ProjectType enum)
- `status` (ProjectStatus enum, default: PENDING)
- `archived` (Boolean, default: false)
- `archivedAt` (DateTime?)
- `progress` (Int, default: 0)
- `description` (String?, 500 chars)
- `priority` (Priority enum, default: MEDIUM)
- `budget` (Decimal, 12,2)
- `estimatedCost` (Decimal?, 12,2)
- `actualCost` (Decimal?, 12,2)
- `startDate` (DateTime)
- `endDate` (DateTime)
- `notes` (String?)
- `pmPhone` (String?, 20 chars)
- `pmEmail` (String?, 320 chars)
- `customerId` (String, Foreign Key)
- `projectManagerId` (String?, Foreign Key)
- `createdById` (String?, Foreign Key)
- `phase` (ProjectPhase? enum)
- `searchVector` (String?)

### **project_team_members**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `projectId` (String, Foreign Key)
- `userId` (String, Foreign Key)
- `role` (String?, 100 chars)

### **project_phase_overrides**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `projectId` (String, Foreign Key)
- `fromPhase` (ProjectPhase enum)
- `toPhase` (ProjectPhase enum)
- `suppressAlertsFor` (ProjectPhase[] array)
- `isActive` (Boolean, default: true)

## Workflow System

### **workflow_phases**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `phaseName` (String, 255 chars)
- `phaseType` (ProjectPhase enum)
- `displayOrder` (Int)
- `description` (String?, 500 chars)
- `isActive` (Boolean, default: true)
- `isCurrent` (Boolean, default: true)
- `version` (Int, default: 1)
- `workflowType` (WorkflowType enum, default: ROOFING)

### **workflow_sections**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `sectionNumber` (String, 10 chars)
- `sectionName` (String, 255 chars)
- `displayName` (String, 255 chars)
- `displayOrder` (Int)
- `description` (String?, 500 chars)
- `isActive` (Boolean, default: true)
- `phaseId` (String, Foreign Key)
- `isCurrent` (Boolean, default: true)
- `version` (Int, default: 1)
- `workflowType` (WorkflowType enum, default: ROOFING)

### **workflow_line_items**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `itemLetter` (String, 10 chars)
- `itemName` (String, 500 chars)
- `responsibleRole` (ResponsibleRole enum)
- `displayOrder` (Int)
- `description` (String?, 2000 chars)
- `isActive` (Boolean, default: true)
- `estimatedMinutes` (Int, default: 30)
- `alertDays` (Int, default: 1)
- `sectionId` (String, Foreign Key)
- `isCurrent` (Boolean, default: true)
- `searchVector` (String?)
- `version` (Int, default: 1)
- `daysToComplete` (Int, default: 1)
- `workflowType` (WorkflowType enum, default: ROOFING)

### **project_workflow_trackers**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `projectId` (String, Foreign Key)
- `currentPhaseId` (String?, Foreign Key)
- `currentSectionId` (String?, Foreign Key)
- `currentLineItemId` (String?, Foreign Key)
- `lastCompletedItemId` (String?, Foreign Key)
- `phaseStartedAt` (DateTime?)
- `sectionStartedAt` (DateTime?)
- `lineItemStartedAt` (DateTime?)
- `isMainWorkflow` (Boolean, default: true)
- `tradeName` (String?, 100 chars)
- `workflowType` (WorkflowType enum, default: ROOFING)
- `totalLineItems` (Int?, default: 0)

### **completed_workflow_items**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `trackerId` (String, Foreign Key)
- `phaseId` (String)
- `sectionId` (String)
- `lineItemId` (String)
- `completedAt` (DateTime, default: now)
- `completedById` (String?, Foreign Key)
- `notes` (String?)

## Alert System

### **workflow_alerts**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `type` (String, default: "Work Flow Line Item", 100 chars)
- `priority` (AlertPriority enum, default: MEDIUM)
- `status` (AlertStatus enum, default: ACTIVE)
- `title` (String, 255 chars)
- `message` (String, 2000 chars)
- `stepName` (String, 255 chars)
- `isRead` (Boolean, default: false)
- `readAt` (DateTime?)
- `acknowledged` (Boolean, default: false)
- `acknowledgedAt` (DateTime?)
- `dueDate` (DateTime?)
- `projectId` (String, Foreign Key)
- `assignedToId` (String?, Foreign Key)
- `createdById` (String?, Foreign Key)
- `metadata` (Json?)
- `responsibleRole` (ResponsibleRole enum, default: OFFICE)
- `lineItemId` (String?, Foreign Key)
- `phaseId` (String?, Foreign Key)
- `sectionId` (String?, Foreign Key)

## Task Management

### **tasks**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `title` (String, 255 chars)
- `description` (String?, 2000 chars)
- `dueDate` (DateTime)
- `status` (TaskStatus enum, default: TO_DO)
- `priority` (Priority enum, default: MEDIUM)
- `estimatedHours` (Int?)
- `actualHours` (Int?)
- `category` (TaskCategory enum, default: OTHER)
- `tags` (String[] array)
- `notes` (String?)
- `completedAt` (DateTime?)
- `projectId` (String, Foreign Key)
- `assignedToId` (String, Foreign Key)
- `createdById` (String?, Foreign Key)

### **task_dependencies**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `parentTaskId` (String, Foreign Key)
- `dependentTaskId` (String, Foreign Key)

## Document Management

### **documents**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `fileName` (String, 255 chars)
- `originalName` (String, 255 chars)
- `fileUrl` (String, 2000 chars)
- `mimeType` (String, 100 chars)
- `fileSize` (Int)
- `fileType` (DocumentType enum)
- `description` (String?, 500 chars)
- `tags` (String[] array)
- `version` (Int, default: 1)
- `isActive` (Boolean, default: true)
- `downloadCount` (Int, default: 0)
- `lastDownloadedAt` (DateTime?)
- `checksum` (String?, 255 chars)
- `isPublic` (Boolean, default: false)
- `projectId` (String, Foreign Key)
- `uploadedById` (String, Foreign Key)
- `searchVector` (String?)

### **document_downloads**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `documentId` (String, Foreign Key)
- `userId` (String, Foreign Key)

## Communication System

### **project_messages**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `content` (String, 2000 chars)
- `subject` (String, 255 chars)
- `messageType` (ProjectMessageType enum, default: WORKFLOW_UPDATE)
- `priority` (MessagePriority enum, default: MEDIUM)
- `authorId` (String?, Foreign Key)
- `authorName` (String, 100 chars)
- `authorRole` (String?, 50 chars)
- `projectId` (String, Foreign Key)
- `projectNumber` (Int)
- `workflowId` (String?)
- `stepId` (String?)
- `stepName` (String?, 255 chars)
- `phase` (ProjectPhase? enum)
- `section` (String?, 255 chars)
- `lineItem` (String?, 255 chars)
- `isSystemGenerated` (Boolean, default: false)
- `isWorkflowMessage` (Boolean, default: false)
- `parentMessageId` (String?, Foreign Key)
- `readBy` (String[] array, default: [])
- `readCount` (Int, default: 0)
- `metadata` (Json?)
- `searchVector` (String?)

### **conversations**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `title` (String?, 255 chars)
- `description` (String?, 500 chars)
- `isGroup` (Boolean, default: false)
- `isActive` (Boolean, default: true)

### **conversation_participants**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `conversationId` (String, Foreign Key)
- `userId` (String, Foreign Key)
- `joinedAt` (DateTime, default: now)
- `leftAt` (DateTime?)
- `role` (ConversationRole enum, default: MEMBER)

### **messages**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `text` (String, 2000 chars)
- `messageType` (MessageType enum, default: TEXT)
- `isEdited` (Boolean, default: false)
- `editedAt` (DateTime?)
- `isDeleted` (Boolean, default: false)
- `deletedAt` (DateTime?)
- `conversationId` (String, Foreign Key)
- `senderId` (String, Foreign Key)
- `replyToId` (String?, Foreign Key)
- `attachments` (Json?)
- `reactions` (Json?)
- `systemData` (Json?)

### **message_reads**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `messageId` (String, Foreign Key)
- `userId` (String, Foreign Key)
- `readAt` (DateTime, default: now)

## Calendar System

### **calendar_events**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `title` (String, 255 chars)
- `description` (String?, 2000 chars)
- `startTime` (DateTime)
- `endTime` (DateTime)
- `location` (String?, 500 chars)
- `isAllDay` (Boolean, default: false)
- `eventType` (EventType enum, default: MEETING)
- `status` (EventStatus enum, default: CONFIRMED)
- `isRecurring` (Boolean, default: false)
- `recurrenceRule` (String?, 500 chars)
- `parentEventId` (String?, Foreign Key)
- `organizerId` (String, Foreign Key)
- `projectId` (String?, Foreign Key)

### **calendar_event_attendees**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `eventId` (String, Foreign Key)
- `userId` (String, Foreign Key)
- `status` (AttendeeStatus enum, default: REQUIRED)
- `response` (AttendeeResponse enum, default: NO_RESPONSE)

## Notifications

### **notifications**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `title` (String, 255 chars)
- `message` (String, 2000 chars)
- `type` (NotificationType enum)
- `isRead` (Boolean, default: false)
- `readAt` (DateTime?)
- `actionUrl` (String?, 2000 chars)
- `actionData` (Json?)
- `recipientId` (String, Foreign Key)

## Role Management

### **role_assignments**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `roleType` (RoleType enum, unique)
- `userId` (String, Foreign Key)
- `assignedAt` (DateTime)
- `assignedById` (String?, Foreign Key)
- `isActive` (Boolean, default: true)

## Security & Authentication

### **user_devices**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `userId` (String, Foreign Key)
- `deviceFingerprint` (String, unique, 255 chars)
- `deviceName` (String?, 100 chars)
- `deviceType` (String?, 50 chars)
- `userAgent` (String?, 500 chars)
- `ipAddress` (String?, 45 chars)
- `location` (Json?)
- `trusted` (Boolean, default: false)
- `biometricEnabled` (Boolean, default: false)
- `lastUsed` (DateTime?)
- `isActive` (Boolean, default: true)

### **user_mfa**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `userId` (String, Foreign Key)
- `method` (MFAMethod enum)
- `secret` (String?, 255 chars)
- `backupCodes` (String[] array)
- `phoneNumber` (String?, 20 chars)
- `enabled` (Boolean, default: false)
- `lastUsed` (DateTime?)

### **security_events**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `userId` (String?, Foreign Key)
- `eventType` (SecurityEventType enum)
- `riskScore` (Int?)
- `details` (Json?)
- `ipAddress` (String?, 45 chars)
- `userAgent` (String?, 500 chars)
- `deviceId` (String?)
- `resolved` (Boolean, default: false)
- `resolvedAt` (DateTime?)
- `resolvedBy` (String?, Foreign Key)
- `response` (Json?)

### **user_behavior_patterns**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `userId` (String, unique, Foreign Key)
- `keystrokePatterns` (Json?)
- `mousePatterns` (Json?)
- `touchPatterns` (Json?)
- `usagePatterns` (Json?)
- `voicePattern` (Json?)
- `riskBaseline` (Decimal?, 5,2)
- `anomalyThreshold` (Decimal?, 5,2)
- `lastAnalysis` (DateTime?)

### **webauthn_credentials**
- `id` (String, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `userId` (String, Foreign Key)
- `credentialID` (String, unique, 255 chars)
- `credentialPublicKey` (Bytes)
- `counter` (Int, default: 0)
- `deviceType` (String, 50 chars)
- `backedUp` (Boolean, default: false)
- `transports` (String[] array)
- `nickname` (String?, 100 chars)
- `lastUsed` (DateTime?)
- `isActive` (Boolean, default: true)

---

## Enum Values

### **UserRole**
- ADMIN, MANAGER, PROJECT_MANAGER, FOREMAN, WORKER, CLIENT

### **ProjectType**
- ROOFING, GUTTERS, INTERIOR_PAINT

### **ProjectStatus**
- PENDING, IN_PROGRESS, COMPLETED, ON_HOLD

### **ProjectPhase**
- LEAD, PROSPECT, APPROVED, EXECUTION, SECOND_SUPPLEMENT, COMPLETION

### **WorkflowType**
- ROOFING, KITCHEN_REMODEL, BATHROOM_RENOVATION, SIDING, WINDOWS, GENERAL, GUTTERS, INTERIOR_PAINT

### **ResponsibleRole**
- OFFICE, ADMINISTRATION, PROJECT_MANAGER, FIELD_DIRECTOR, ROOF_SUPERVISOR, OFFICE_STAFF

### **AlertPriority**
- LOW, MEDIUM, HIGH

### **AlertStatus**
- ACTIVE, ACKNOWLEDGED, DISMISSED, COMPLETED

### **TaskStatus**
- TO_DO, IN_PROGRESS, DONE

### **Priority**
- LOW, MEDIUM, HIGH

And many more enums for contact types, document types, event types, message types, etc.