/**
 * Complete field mapping for all 37 database tables
 * This provides validation, transformation, and upload support for every single field
 */

// Define complete field mapping for all database tables
const DATABASE_SCHEMA = {
  // Core User Management
  users: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'firstName', type: 'String', constraint: 'VarChar(50), Required' },
      { name: 'lastName', type: 'String', constraint: 'VarChar(50), Required' },
      { name: 'email', type: 'String', constraint: 'Unique, VarChar(255)' },
      { name: 'password', type: 'String', constraint: 'VarChar(255), Encrypted' },
      { name: 'avatar', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'phone', type: 'String?', constraint: 'Optional, VarChar(20)' },
      { name: 'position', type: 'String?', constraint: 'Optional, VarChar(100)' },
      { name: 'department', type: 'String?', constraint: 'Optional, VarChar(100)' },
      { name: 'bio', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'role', type: 'UserRole', constraint: 'Enum, Default: WORKER', enumValues: ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT'] },
      { name: 'permissions', type: 'Permission[]', constraint: 'Array of Permission enums', enumValues: ['CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS', 'MANAGE_USERS', 'VIEW_REPORTS', 'MANAGE_FINANCES', 'MANAGE_DOCUMENTS', 'MANAGE_CALENDAR', 'USE_AI_FEATURES'] },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' },
      { name: 'isVerified', type: 'Boolean', constraint: 'Default: false' },
      { name: 'emailVerificationToken', type: 'String?', constraint: 'Optional' },
      { name: 'emailVerificationExpires', type: 'DateTime?', constraint: 'Optional' },
      { name: 'passwordResetToken', type: 'String?', constraint: 'Optional' },
      { name: 'passwordResetExpires', type: 'DateTime?', constraint: 'Optional' },
      { name: 'passwordChangedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'loginAttempts', type: 'Int', constraint: 'Default: 0' },
      { name: 'lockUntil', type: 'DateTime?', constraint: 'Optional' },
      { name: 'lastLogin', type: 'DateTime?', constraint: 'Optional' },
      { name: 'lastLoginIP', type: 'String?', constraint: 'Optional, VarChar(45)' },
      { name: 'twoFactorSecret', type: 'String?', constraint: 'Optional, Encrypted' },
      { name: 'twoFactorEnabled', type: 'Boolean', constraint: 'Default: false' },
      { name: 'theme', type: 'Theme', constraint: 'Enum, Default: LIGHT', enumValues: ['LIGHT', 'DARK', 'AUTO'] },
      { name: 'notificationPreferences', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'language', type: 'String', constraint: 'Default: "en", VarChar(5)' },
      { name: 'timezone', type: 'String', constraint: 'Default: "UTC", VarChar(50)' },
      { name: 'skills', type: 'String[]', constraint: 'Array of strings' },
      { name: 'certifications', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'experience', type: 'Int?', constraint: 'Optional, years' },
      { name: 'emergencyContact', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'address', type: 'Json?', constraint: 'Optional JSON object' }
    ]
  },

  // Customer Management
  customers: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'primaryName', type: 'String', constraint: 'VarChar(100), Required' },
      { name: 'primaryEmail', type: 'String', constraint: 'Unique, VarChar(255)' },
      { name: 'primaryPhone', type: 'String', constraint: 'VarChar(20), Required' },
      { name: 'secondaryName', type: 'String?', constraint: 'Optional, VarChar(100)' },
      { name: 'secondaryEmail', type: 'String?', constraint: 'Optional, VarChar(255)' },
      { name: 'secondaryPhone', type: 'String?', constraint: 'Optional, VarChar(20)' },
      { name: 'primaryContact', type: 'ContactType', constraint: 'Enum, Default: PRIMARY', enumValues: ['PRIMARY', 'SECONDARY'] },
      { name: 'address', type: 'String', constraint: 'VarChar(500), Required' },
      { name: 'notes', type: 'String?', constraint: 'Optional, VarChar(2000)' }
    ]
  },

  contacts: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'name', type: 'String', constraint: 'VarChar(100), Required' },
      { name: 'phone', type: 'String?', constraint: 'Optional, VarChar(20)' },
      { name: 'email', type: 'String?', constraint: 'Optional, VarChar(255)' },
      { name: 'role', type: 'String?', constraint: 'Optional, VarChar(50)' },
      { name: 'isPrimary', type: 'Boolean', constraint: 'Default: false' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' },
      { name: 'notes', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'customerId', type: 'String', constraint: 'Foreign key to customers' }
    ]
  },

  // Project Core System
  projects: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'projectNumber', type: 'Int', constraint: 'Unique, Auto-incrementing' },
      { name: 'projectName', type: 'String', constraint: 'VarChar(200), Required' },
      { name: 'projectType', type: 'ProjectType', constraint: 'Enum, Required', enumValues: ['ROOF_REPLACEMENT', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION', 'SIDING_INSTALLATION', 'WINDOW_REPLACEMENT', 'FLOORING', 'PAINTING', 'ELECTRICAL_WORK', 'PLUMBING', 'HVAC', 'DECK_CONSTRUCTION', 'LANDSCAPING', 'OTHER'] },
      { name: 'status', type: 'ProjectStatus', constraint: 'Enum, Default: PENDING', enumValues: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'] },
      { name: 'archived', type: 'Boolean', constraint: 'Default: false' },
      { name: 'archivedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'progress', type: 'Int', constraint: 'Default: 0, Range: 0-100' },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(2000)' },
      { name: 'priority', type: 'Priority', constraint: 'Enum, Default: MEDIUM', enumValues: ['LOW', 'MEDIUM', 'HIGH'] },
      { name: 'budget', type: 'Decimal', constraint: 'Decimal(12, 2), Required' },
      { name: 'estimatedCost', type: 'Decimal?', constraint: 'Optional, Decimal(12, 2)' },
      { name: 'actualCost', type: 'Decimal?', constraint: 'Optional, Decimal(12, 2)' },
      { name: 'startDate', type: 'DateTime', constraint: 'Required' },
      { name: 'endDate', type: 'DateTime', constraint: 'Required' },
      { name: 'notes', type: 'String?', constraint: 'Optional, VarChar(1000)' },
      { name: 'pmPhone', type: 'String?', constraint: 'Optional, VarChar(20)' },
      { name: 'pmEmail', type: 'String?', constraint: 'Optional, VarChar(255)' },
      { name: 'customerId', type: 'String', constraint: 'Foreign key to customers' },
      { name: 'projectManagerId', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'createdById', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'phase', type: 'ProjectPhase?', constraint: 'Optional, Current project phase', enumValues: ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'] }
    ]
  },

  project_team_members: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'projectId', type: 'String', constraint: 'Foreign key to projects' },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'role', type: 'String?', constraint: 'Optional, VarChar(100)' }
    ]
  },

  // Workflow System
  project_workflows: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'projectId', type: 'String', constraint: 'Unique, Foreign key to projects' },
      { name: 'workflowType', type: 'WorkflowType', constraint: 'Enum, Default: ROOFING', enumValues: ['ROOFING', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION', 'SIDING', 'WINDOWS', 'GENERAL'] },
      { name: 'status', type: 'WorkflowStatus', constraint: 'Enum, Default: NOT_STARTED', enumValues: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] },
      { name: 'currentStepIndex', type: 'Int', constraint: 'Default: 0' },
      { name: 'overallProgress', type: 'Int', constraint: 'Default: 0, Range: 0-100' },
      { name: 'workflowStartDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'workflowEndDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'estimatedCompletionDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'actualCompletionDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'enableAlerts', type: 'Boolean', constraint: 'Default: true' },
      { name: 'alertMethods', type: 'AlertMethod[]', constraint: 'Array of AlertMethod enums', enumValues: ['IN_APP', 'EMAIL', 'SMS'] },
      { name: 'escalationEnabled', type: 'Boolean', constraint: 'Default: true' },
      { name: 'escalationDelayDays', type: 'Int', constraint: 'Default: 2' },
      { name: 'teamAssignments', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'createdById', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'lastModifiedById', type: 'String?', constraint: 'Optional, Foreign key to users' }
    ]
  },

  workflow_steps: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'stepId', type: 'String', constraint: 'VarChar(50), Business identifier' },
      { name: 'stepName', type: 'String', constraint: 'VarChar(200), Required' },
      { name: 'description', type: 'String', constraint: 'VarChar(1000), Required' },
      { name: 'phase', type: 'ProjectPhase', constraint: 'Enum, Required', enumValues: ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'] },
      { name: 'defaultResponsible', type: 'ResponsibleRole', constraint: 'Enum, Required', enumValues: ['OFFICE', 'ADMINISTRATION', 'PROJECT_MANAGER', 'FIELD_DIRECTOR', 'ROOF_SUPERVISOR'] },
      { name: 'assignedToId', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'estimatedDuration', type: 'Int', constraint: 'Required, minutes' },
      { name: 'stepOrder', type: 'Int', constraint: 'Required, for sequencing' },
      { name: 'scheduledStartDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'scheduledEndDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'actualStartDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'actualEndDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'isCompleted', type: 'Boolean', constraint: 'Default: false' },
      { name: 'completedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'completedById', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'alertPriority', type: 'AlertPriority', constraint: 'Enum, Default: MEDIUM', enumValues: ['LOW', 'MEDIUM', 'HIGH'] },
      { name: 'alertDays', type: 'Int', constraint: 'Default: 1, Days before alert' },
      { name: 'overdueIntervals', type: 'Int[]', constraint: 'Default: [1, 3, 7, 14], Days' },
      { name: 'notes', type: 'String?', constraint: 'Optional, VarChar(2000)' },
      { name: 'completionNotes', type: 'String?', constraint: 'Optional, VarChar(2000)' },
      { name: 'dependencies', type: 'String[]', constraint: 'Array of step IDs' },
      { name: 'workflowId', type: 'String', constraint: 'Foreign key to project_workflows' }
    ]
  },

  workflow_subtasks: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'subTaskId', type: 'String', constraint: 'VarChar(50), Business identifier' },
      { name: 'subTaskName', type: 'String', constraint: 'VarChar(500), Required' },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(1000)' },
      { name: 'isCompleted', type: 'Boolean', constraint: 'Default: false' },
      { name: 'completedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'completedById', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'notes', type: 'String?', constraint: 'Optional, VarChar(1000)' },
      { name: 'stepId', type: 'String', constraint: 'Foreign key to workflow_steps' }
    ]
  },

  // New Workflow Template System
  workflow_phases: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'phaseName', type: 'String', constraint: 'VarChar(100), Required' },
      { name: 'phaseType', type: 'ProjectPhase', constraint: 'Enum, Unique', enumValues: ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'] },
      { name: 'displayOrder', type: 'Int', constraint: 'Required, for UI ordering' },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' }
    ]
  },

  workflow_sections: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'sectionNumber', type: 'String', constraint: 'VarChar(10), Business ID (e.g., "1")' },
      { name: 'sectionName', type: 'String', constraint: 'VarChar(200), Required' },
      { name: 'displayName', type: 'String', constraint: 'VarChar(255), With emojis and roles' },
      { name: 'displayOrder', type: 'Int', constraint: 'Required, for UI ordering' },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' },
      { name: 'phaseId', type: 'String', constraint: 'Foreign key to workflow_phases' }
    ]
  },

  workflow_line_items: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'itemLetter', type: 'String', constraint: 'VarChar(10), Business ID (e.g., "a")' },
      { name: 'itemName', type: 'String', constraint: 'VarChar(500), Required' },
      { name: 'responsibleRole', type: 'ResponsibleRole', constraint: 'Enum, Required', enumValues: ['OFFICE', 'ADMINISTRATION', 'PROJECT_MANAGER', 'FIELD_DIRECTOR', 'ROOF_SUPERVISOR'] },
      { name: 'displayOrder', type: 'Int', constraint: 'Required, for UI ordering' },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(1000)' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' },
      { name: 'estimatedMinutes', type: 'Int', constraint: 'Default: 30, Estimated completion time' },
      { name: 'alertDays', type: 'Int', constraint: 'Default: 1, Days before alert' },
      { name: 'sectionId', type: 'String', constraint: 'Foreign key to workflow_sections' }
    ]
  },

  // Workflow Tracking System
  project_workflow_trackers: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'projectId', type: 'String', constraint: 'Unique, Foreign key to projects' },
      { name: 'currentPhaseId', type: 'String?', constraint: 'Optional, Foreign key to phases' },
      { name: 'currentSectionId', type: 'String?', constraint: 'Optional, Foreign key to sections' },
      { name: 'currentLineItemId', type: 'String?', constraint: 'Optional, Foreign key to line_items' },
      { name: 'lastCompletedItemId', type: 'String?', constraint: 'Optional, last completed line item' },
      { name: 'phaseStartedAt', type: 'DateTime?', constraint: 'Optional, when current phase started' },
      { name: 'sectionStartedAt', type: 'DateTime?', constraint: 'Optional, when current section started' },
      { name: 'lineItemStartedAt', type: 'DateTime?', constraint: 'Optional, when current item started' }
    ]
  },

  completed_workflow_items: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'trackerId', type: 'String', constraint: 'Foreign key to project_workflow_trackers' },
      { name: 'phaseId', type: 'String', constraint: 'Foreign key to workflow_phases' },
      { name: 'sectionId', type: 'String', constraint: 'Foreign key to workflow_sections' },
      { name: 'lineItemId', type: 'String', constraint: 'Foreign key to workflow_line_items' },
      { name: 'completedAt', type: 'DateTime', constraint: 'Default: now(), Completion timestamp' },
      { name: 'completedById', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'notes', type: 'String?', constraint: 'Optional, VarChar(1000), Completion notes' }
    ]
  },

  // Alert System
  workflow_alerts: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'type', type: 'String', constraint: 'Default: "Work Flow Line Item"' },
      { name: 'priority', type: 'AlertPriority', constraint: 'Enum, Default: MEDIUM', enumValues: ['LOW', 'MEDIUM', 'HIGH'] },
      { name: 'status', type: 'AlertStatus', constraint: 'Enum, Default: ACTIVE', enumValues: ['ACTIVE', 'ACKNOWLEDGED', 'DISMISSED', 'COMPLETED'] },
      { name: 'title', type: 'String', constraint: 'VarChar(255), Required' },
      { name: 'message', type: 'String', constraint: 'Text, Required' },
      { name: 'stepName', type: 'String', constraint: 'VarChar(255), Required' },
      { name: 'isRead', type: 'Boolean', constraint: 'Default: false' },
      { name: 'readAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'acknowledged', type: 'Boolean', constraint: 'Default: false' },
      { name: 'acknowledgedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'dueDate', type: 'DateTime?', constraint: 'Optional' },
      { name: 'projectId', type: 'String', constraint: 'Foreign key to projects' },
      { name: 'workflowId', type: 'String', constraint: 'Foreign key to project_workflows' },
      { name: 'stepId', type: 'String', constraint: 'Foreign key to workflow_steps' },
      { name: 'assignedToId', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'createdById', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'metadata', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'responsibleRole', type: 'ResponsibleRole', constraint: 'Enum, Default: OFFICE', enumValues: ['OFFICE', 'ADMINISTRATION', 'PROJECT_MANAGER', 'FIELD_DIRECTOR', 'ROOF_SUPERVISOR'] }
    ]
  },

  // Task Management
  tasks: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'title', type: 'String', constraint: 'VarChar(200), Required' },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(2000)' },
      { name: 'dueDate', type: 'DateTime', constraint: 'Required' },
      { name: 'status', type: 'TaskStatus', constraint: 'Enum, Default: TO_DO', enumValues: ['TO_DO', 'IN_PROGRESS', 'DONE'] },
      { name: 'priority', type: 'Priority', constraint: 'Enum, Default: MEDIUM', enumValues: ['LOW', 'MEDIUM', 'HIGH'] },
      { name: 'estimatedHours', type: 'Int?', constraint: 'Optional' },
      { name: 'actualHours', type: 'Int?', constraint: 'Optional' },
      { name: 'category', type: 'TaskCategory', constraint: 'Enum, Default: OTHER', enumValues: ['PLANNING', 'DESIGN', 'CONSTRUCTION', 'INSPECTION', 'DOCUMENTATION', 'COMMUNICATION', 'OTHER'] },
      { name: 'tags', type: 'String[]', constraint: 'Array of strings' },
      { name: 'notes', type: 'String?', constraint: 'Optional, VarChar(1000)' },
      { name: 'completedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'projectId', type: 'String', constraint: 'Foreign key to projects' },
      { name: 'assignedToId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'createdById', type: 'String?', constraint: 'Optional, Foreign key to users' }
    ]
  },

  task_dependencies: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'parentTaskId', type: 'String', constraint: 'Foreign key to tasks' },
      { name: 'dependentTaskId', type: 'String', constraint: 'Foreign key to tasks' }
    ]
  },

  // Document Management
  documents: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'fileName', type: 'String', constraint: 'VarChar(255), Required' },
      { name: 'originalName', type: 'String', constraint: 'VarChar(255), Required' },
      { name: 'fileUrl', type: 'String', constraint: 'VarChar(1000), Required' },
      { name: 'mimeType', type: 'String', constraint: 'VarChar(100), Required' },
      { name: 'fileSize', type: 'Int', constraint: 'Required, bytes' },
      { name: 'fileType', type: 'DocumentType', constraint: 'Enum, Required', enumValues: ['BLUEPRINT', 'PERMIT', 'INVOICE', 'PHOTO', 'CONTRACT', 'REPORT', 'SPECIFICATION', 'CORRESPONDENCE', 'OTHER'] },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(1000)' },
      { name: 'tags', type: 'String[]', constraint: 'Array of strings' },
      { name: 'version', type: 'Int', constraint: 'Default: 1' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' },
      { name: 'downloadCount', type: 'Int', constraint: 'Default: 0' },
      { name: 'lastDownloadedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'checksum', type: 'String?', constraint: 'Optional, VarChar(255)' },
      { name: 'isPublic', type: 'Boolean', constraint: 'Default: false' },
      { name: 'projectId', type: 'String', constraint: 'Foreign key to projects' },
      { name: 'uploadedById', type: 'String', constraint: 'Foreign key to users' }
    ]
  },

  document_downloads: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'documentId', type: 'String', constraint: 'Foreign key to documents' },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' }
    ]
  },

  workflow_step_attachments: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'stepId', type: 'String', constraint: 'Foreign key to workflow_steps' },
      { name: 'documentId', type: 'String', constraint: 'Foreign key to documents' }
    ]
  },

  // Communication System
  project_messages: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'content', type: 'String', constraint: 'Text, Required' },
      { name: 'subject', type: 'String', constraint: 'VarChar(255), Required' },
      { name: 'messageType', type: 'ProjectMessageType', constraint: 'Enum, Default: WORKFLOW_UPDATE', enumValues: ['WORKFLOW_UPDATE', 'PHASE_COMPLETION', 'STEP_COMPLETION', 'USER_MESSAGE', 'SYSTEM_NOTIFICATION', 'ALERT_DISCUSSION', 'PROJECT_MILESTONE'] },
      { name: 'priority', type: 'MessagePriority', constraint: 'Enum, Default: MEDIUM', enumValues: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
      { name: 'authorId', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'authorName', type: 'String', constraint: 'VarChar(100), Required' },
      { name: 'authorRole', type: 'String?', constraint: 'Optional, VarChar(50)' },
      { name: 'projectId', type: 'String', constraint: 'Foreign key to projects' },
      { name: 'projectNumber', type: 'Int', constraint: 'Required' },
      { name: 'workflowId', type: 'String?', constraint: 'Optional, Foreign key' },
      { name: 'stepId', type: 'String?', constraint: 'Optional, Foreign key' },
      { name: 'stepName', type: 'String?', constraint: 'Optional, VarChar(255)' },
      { name: 'phase', type: 'ProjectPhase?', constraint: 'Optional', enumValues: ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'] },
      { name: 'section', type: 'String?', constraint: 'Optional, VarChar(255)' },
      { name: 'lineItem', type: 'String?', constraint: 'Optional, VarChar(255)' },
      { name: 'isSystemGenerated', type: 'Boolean', constraint: 'Default: false' },
      { name: 'isWorkflowMessage', type: 'Boolean', constraint: 'Default: false' },
      { name: 'parentMessageId', type: 'String?', constraint: 'Optional, Foreign key to self' },
      { name: 'readBy', type: 'String[]', constraint: 'Default: [], Array of user IDs' },
      { name: 'readCount', type: 'Int', constraint: 'Default: 0' },
      { name: 'metadata', type: 'Json?', constraint: 'Optional JSON object' }
    ]
  },

  conversations: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'title', type: 'String?', constraint: 'Optional, VarChar(200)' },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'isGroup', type: 'Boolean', constraint: 'Default: false' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' }
    ]
  },

  conversation_participants: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'conversationId', type: 'String', constraint: 'Foreign key to conversations' },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'joinedAt', type: 'DateTime', constraint: 'Default: now()' },
      { name: 'leftAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'role', type: 'ConversationRole', constraint: 'Enum, Default: MEMBER', enumValues: ['ADMIN', 'MODERATOR', 'MEMBER'] }
    ]
  },

  messages: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'text', type: 'String', constraint: 'Text, Required' },
      { name: 'messageType', type: 'MessageType', constraint: 'Enum, Default: TEXT', enumValues: ['TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'NOTIFICATION'] },
      { name: 'isEdited', type: 'Boolean', constraint: 'Default: false' },
      { name: 'editedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'isDeleted', type: 'Boolean', constraint: 'Default: false' },
      { name: 'deletedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'conversationId', type: 'String', constraint: 'Foreign key to conversations' },
      { name: 'senderId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'replyToId', type: 'String?', constraint: 'Optional, Foreign key to self' },
      { name: 'attachments', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'reactions', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'systemData', type: 'Json?', constraint: 'Optional JSON object' }
    ]
  },

  message_reads: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'messageId', type: 'String', constraint: 'Foreign key to messages' },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'readAt', type: 'DateTime', constraint: 'Default: now()' }
    ]
  },

  // Calendar System
  calendar_events: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'title', type: 'String', constraint: 'VarChar(200), Required' },
      { name: 'description', type: 'String?', constraint: 'Optional, VarChar(2000)' },
      { name: 'startTime', type: 'DateTime', constraint: 'Required' },
      { name: 'endTime', type: 'DateTime', constraint: 'Required' },
      { name: 'location', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'isAllDay', type: 'Boolean', constraint: 'Default: false' },
      { name: 'eventType', type: 'EventType', constraint: 'Enum, Default: MEETING', enumValues: ['MEETING', 'INSPECTION', 'INSTALLATION', 'DEADLINE', 'REMINDER', 'OTHER'] },
      { name: 'status', type: 'EventStatus', constraint: 'Enum, Default: CONFIRMED', enumValues: ['CONFIRMED', 'TENTATIVE', 'CANCELLED'] },
      { name: 'isRecurring', type: 'Boolean', constraint: 'Default: false' },
      { name: 'recurrenceRule', type: 'String?', constraint: 'Optional, VarChar(500), RRULE format' },
      { name: 'parentEventId', type: 'String?', constraint: 'Optional, Foreign key to self' },
      { name: 'organizerId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'projectId', type: 'String?', constraint: 'Optional, Foreign key to projects' }
    ]
  },

  calendar_event_attendees: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'eventId', type: 'String', constraint: 'Foreign key to calendar_events' },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'status', type: 'AttendeeStatus', constraint: 'Enum, Default: REQUIRED', enumValues: ['REQUIRED', 'OPTIONAL', 'ORGANIZER'] },
      { name: 'response', type: 'AttendeeResponse', constraint: 'Enum, Default: NO_RESPONSE', enumValues: ['ACCEPTED', 'DECLINED', 'TENTATIVE', 'NO_RESPONSE'] }
    ]
  },

  // Notification System
  notifications: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'title', type: 'String', constraint: 'VarChar(200), Required' },
      { name: 'message', type: 'String', constraint: 'VarChar(1000), Required' },
      { name: 'type', type: 'NotificationType', constraint: 'Enum, Required', enumValues: ['TASK_ASSIGNED', 'TASK_COMPLETED', 'PROJECT_UPDATE', 'WORKFLOW_ALERT', 'SYSTEM_MESSAGE', 'REMINDER'] },
      { name: 'isRead', type: 'Boolean', constraint: 'Default: false' },
      { name: 'readAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'actionUrl', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'actionData', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'recipientId', type: 'String', constraint: 'Foreign key to users' }
    ]
  },

  // Override System
  project_phase_overrides: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'projectId', type: 'String', constraint: 'Foreign key to projects' },
      { name: 'workflowId', type: 'String', constraint: 'Foreign key to project_workflows' },
      { name: 'fromPhase', type: 'ProjectPhase', constraint: 'Enum, Required', enumValues: ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'] },
      { name: 'toPhase', type: 'ProjectPhase', constraint: 'Enum, Required', enumValues: ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'] },
      { name: 'overriddenById', type: 'String', constraint: 'Foreign key to users' },
      { name: 'reason', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'suppressAlertsFor', type: 'ProjectPhase[]', constraint: 'Array of ProjectPhase enums' },
      { name: 'autoLogMessage', type: 'String', constraint: 'Text, Required' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' },
      { name: 'conversationMessage', type: 'String?', constraint: 'Optional' }
    ]
  },

  suppressed_workflow_alerts: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'originalAlertId', type: 'String', constraint: 'Unique' },
      { name: 'overrideId', type: 'String', constraint: 'Foreign key to project_phase_overrides' },
      { name: 'suppressedPhase', type: 'ProjectPhase', constraint: 'Enum, Required', enumValues: ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'] },
      { name: 'suppressedStepId', type: 'String', constraint: 'Required' },
      { name: 'suppressedStepName', type: 'String', constraint: 'VarChar(255), Required' },
      { name: 'originalTitle', type: 'String', constraint: 'VarChar(255), Required' },
      { name: 'originalMessage', type: 'String', constraint: 'Text, Required' },
      { name: 'originalPriority', type: 'AlertPriority', constraint: 'Enum, Required', enumValues: ['LOW', 'MEDIUM', 'HIGH'] },
      { name: 'suppressionReason', type: 'String', constraint: 'VarChar(500), Required' }
    ]
  },

  // Role Management
  role_assignments: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'roleType', type: 'RoleType', constraint: 'Enum, Unique', enumValues: ['PROJECT_MANAGER', 'FIELD_DIRECTOR', 'OFFICE_STAFF', 'ADMINISTRATION'] },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'assignedAt', type: 'DateTime', constraint: 'Required' },
      { name: 'assignedById', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' }
    ]
  },

  // Enhanced Security Models
  user_devices: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'deviceFingerprint', type: 'String', constraint: 'Unique, VarChar(255)' },
      { name: 'deviceName', type: 'String?', constraint: 'Optional, VarChar(100)' },
      { name: 'deviceType', type: 'String?', constraint: 'Optional, VarChar(50)' },
      { name: 'userAgent', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'ipAddress', type: 'String?', constraint: 'Optional, VarChar(45)' },
      { name: 'location', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'trusted', type: 'Boolean', constraint: 'Default: false' },
      { name: 'biometricEnabled', type: 'Boolean', constraint: 'Default: false' },
      { name: 'lastUsed', type: 'DateTime?', constraint: 'Optional' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' }
    ]
  },

  user_mfa: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'method', type: 'MFAMethod', constraint: 'Enum, Required', enumValues: ['TOTP', 'SMS', 'WEBAUTHN', 'BACKUP', 'EMAIL'] },
      { name: 'secret', type: 'String?', constraint: 'Optional, VarChar(255)' },
      { name: 'backupCodes', type: 'String[]', constraint: 'Array of encrypted codes' },
      { name: 'phoneNumber', type: 'String?', constraint: 'Optional, VarChar(20)' },
      { name: 'enabled', type: 'Boolean', constraint: 'Default: false' },
      { name: 'lastUsed', type: 'DateTime?', constraint: 'Optional' }
    ]
  },

  security_events: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'userId', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'eventType', type: 'SecurityEventType', constraint: 'Enum, Required', enumValues: ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGIN_BLOCKED', 'MFA_SUCCESS', 'MFA_FAILURE', 'DEVICE_NEW', 'DEVICE_SUSPICIOUS', 'LOCATION_NEW', 'LOCATION_SUSPICIOUS', 'BEHAVIOR_ANOMALY', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'PASSWORD_CHANGED', 'MFA_ENABLED', 'MFA_DISABLED', 'DEVICE_TRUSTED', 'DEVICE_REMOVED', 'SECURITY_QUESTION_FAILED', 'BRUTE_FORCE_DETECTED', 'CREDENTIAL_CREATED', 'CREDENTIAL_DELETED'] },
      { name: 'riskScore', type: 'Int?', constraint: 'Optional, 0-100 range' },
      { name: 'details', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'ipAddress', type: 'String?', constraint: 'Optional, VarChar(45)' },
      { name: 'userAgent', type: 'String?', constraint: 'Optional, VarChar(500)' },
      { name: 'deviceId', type: 'String?', constraint: 'Optional' },
      { name: 'resolved', type: 'Boolean', constraint: 'Default: false' },
      { name: 'resolvedAt', type: 'DateTime?', constraint: 'Optional' },
      { name: 'resolvedBy', type: 'String?', constraint: 'Optional, Foreign key to users' },
      { name: 'response', type: 'Json?', constraint: 'Optional JSON object' }
    ]
  },

  user_behavior_patterns: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'userId', type: 'String', constraint: 'Unique, Foreign key to users' },
      { name: 'keystrokePatterns', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'mousePatterns', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'touchPatterns', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'usagePatterns', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'voicePattern', type: 'Json?', constraint: 'Optional JSON object' },
      { name: 'riskBaseline', type: 'Decimal?', constraint: 'Optional, Decimal(5,2)' },
      { name: 'anomalyThreshold', type: 'Decimal?', constraint: 'Optional, Decimal(5,2)' },
      { name: 'lastAnalysis', type: 'DateTime?', constraint: 'Optional' }
    ]
  },

  webauthn_credentials: {
    fields: [
      { name: 'id', type: 'String', constraint: 'Primary Key (CUID)' },
      { name: 'createdAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'updatedAt', type: 'DateTime', constraint: 'Auto-managed' },
      { name: 'userId', type: 'String', constraint: 'Foreign key to users' },
      { name: 'credentialID', type: 'String', constraint: 'Unique, VarChar(255)' },
      { name: 'credentialPublicKey', type: 'Bytes', constraint: 'Required' },
      { name: 'counter', type: 'Int', constraint: 'Default: 0' },
      { name: 'deviceType', type: 'String', constraint: 'VarChar(50), Required' },
      { name: 'backedUp', type: 'Boolean', constraint: 'Default: false' },
      { name: 'transports', type: 'String[]', constraint: 'Array of transport methods' },
      { name: 'nickname', type: 'String?', constraint: 'Optional, VarChar(100)' },
      { name: 'lastUsed', type: 'DateTime?', constraint: 'Optional' },
      { name: 'isActive', type: 'Boolean', constraint: 'Default: true' }
    ]
  }
};

/**
 * Field transformation functions
 */
const FieldTransformers = {
  // String transformations
  trimString: (value) => value ? value.toString().trim() : null,
  lowerCaseEmail: (value) => value ? value.toString().toLowerCase().trim() : null,
  upperCaseEnum: (value) => value ? value.toString().toUpperCase().trim() : null,
  
  // Number transformations
  parseInt: (value) => value ? parseInt(value) : null,
  parseFloat: (value) => value ? parseFloat(value) : null,
  parseDecimal: (value) => value ? parseFloat(value) : null,
  
  // Boolean transformations
  parseBoolean: (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const str = value.toLowerCase().trim();
      return str === 'true' || str === '1' || str === 'yes' || str === 'on';
    }
    return Boolean(value);
  },
  
  // Date transformations
  parseDateTime: (value) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  },
  
  // Array transformations
  parseStringArray: (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.toString().split(',').map(s => s.trim()).filter(s => s);
  },
  
  parseEnumArray: (value, enumValues) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.toString().split(',').map(s => s.trim().toUpperCase()).filter(s => enumValues.includes(s));
  },
  
  // JSON transformations
  parseJson: (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
};

/**
 * Field validators
 */
const FieldValidators = {
  required: (value, fieldName) => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  email: (value, fieldName) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${fieldName} must be a valid email address`;
    }
    return null;
  },
  
  phone: (value, fieldName) => {
    if (value && !/^\+?[\d\s\-\(\)]{10,}$/.test(value)) {
      return `${fieldName} must be a valid phone number`;
    }
    return null;
  },
  
  url: (value, fieldName) => {
    if (value) {
      try {
        new URL(value);
      } catch {
        return `${fieldName} must be a valid URL`;
      }
    }
    return null;
  },
  
  enum: (value, fieldName, enumValues) => {
    if (value && !enumValues.includes(value)) {
      return `${fieldName} must be one of: ${enumValues.join(', ')}`;
    }
    return null;
  },
  
  maxLength: (value, fieldName, maxLength) => {
    if (value && value.length > maxLength) {
      return `${fieldName} must be ${maxLength} characters or less`;
    }
    return null;
  },
  
  range: (value, fieldName, min, max) => {
    if (value !== null && value !== undefined) {
      const num = parseFloat(value);
      if (isNaN(num) || num < min || num > max) {
        return `${fieldName} must be between ${min} and ${max}`;
      }
    }
    return null;
  }
};

/**
 * Complete field mapping configuration for all tables
 */
const COMPLETE_FIELD_MAPPING = {};

// Generate field mapping for each table from the schema
Object.entries(DATABASE_SCHEMA).forEach(([tableName, tableInfo]) => {
  COMPLETE_FIELD_MAPPING[tableName] = {
    tableName,
    fields: {},
    relationships: [],
    uploadable: true,
    displayName: tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  };

  // Process each field
  tableInfo.fields.forEach(field => {
    const fieldConfig = {
      name: field.name,
      type: field.type,
      constraint: field.constraint,
      enumValues: field.enumValues || null,
      required: field.constraint.includes('Required') || field.constraint.includes('Primary Key'),
      unique: field.constraint.includes('Unique'),
      autoManaged: field.constraint.includes('Auto-managed'),
      primaryKey: field.constraint.includes('Primary Key'),
      foreignKey: field.constraint.includes('Foreign key'),
      
      // Determine transformer based on type
      transformer: null,
      validators: []
    };

    // Set transformer based on field type
    if (field.type.includes('String') && field.name === 'email') {
      fieldConfig.transformer = FieldTransformers.lowerCaseEmail;
      fieldConfig.validators.push((value) => FieldValidators.email(value, field.name));
    } else if (field.type.includes('String') && (field.name === 'primaryEmail' || field.name === 'secondaryEmail' || field.name === 'pmEmail')) {
      fieldConfig.transformer = FieldTransformers.lowerCaseEmail;
      fieldConfig.validators.push((value) => FieldValidators.email(value, field.name));
    } else if (field.type.includes('String') && field.name.includes('phone')) {
      fieldConfig.transformer = FieldTransformers.trimString;
      fieldConfig.validators.push((value) => FieldValidators.phone(value, field.name));
    } else if (field.type.includes('String') && field.enumValues) {
      fieldConfig.transformer = FieldTransformers.upperCaseEnum;
      fieldConfig.validators.push((value) => FieldValidators.enum(value, field.name, field.enumValues));
    } else if (field.type.includes('String')) {
      fieldConfig.transformer = FieldTransformers.trimString;
      // Extract max length from constraint
      const match = field.constraint.match(/VarChar\((\d+)\)/);
      if (match) {
        const maxLength = parseInt(match[1]);
        fieldConfig.validators.push((value) => FieldValidators.maxLength(value, field.name, maxLength));
      }
    } else if (field.type === 'Int') {
      fieldConfig.transformer = FieldTransformers.parseInt;
      if (field.name === 'progress') {
        fieldConfig.validators.push((value) => FieldValidators.range(value, field.name, 0, 100));
      }
    } else if (field.type === 'Decimal') {
      fieldConfig.transformer = FieldTransformers.parseDecimal;
    } else if (field.type === 'Boolean') {
      fieldConfig.transformer = FieldTransformers.parseBoolean;
    } else if (field.type.includes('DateTime')) {
      fieldConfig.transformer = FieldTransformers.parseDateTime;
    } else if (field.type.includes('[]') && field.enumValues) {
      fieldConfig.transformer = (value) => FieldTransformers.parseEnumArray(value, field.enumValues);
    } else if (field.type.includes('[]')) {
      fieldConfig.transformer = FieldTransformers.parseStringArray;
    } else if (field.type.includes('Json')) {
      fieldConfig.transformer = FieldTransformers.parseJson;
    }

    // Add required validator
    if (fieldConfig.required && !fieldConfig.autoManaged && !fieldConfig.primaryKey) {
      fieldConfig.validators.unshift((value) => FieldValidators.required(value, field.name));
    }

    // Track relationships
    if (fieldConfig.foreignKey) {
      COMPLETE_FIELD_MAPPING[tableName].relationships.push({
        field: field.name,
        referencedTable: field.constraint.match(/Foreign key to (\w+)/)?.[1] || 'unknown',
        required: fieldConfig.required
      });
    }

    // Determine if field is uploadable
    fieldConfig.uploadable = !fieldConfig.autoManaged && !fieldConfig.primaryKey && !fieldConfig.name.includes('password') && !fieldConfig.name.includes('secret');

    // Exception: allow explicit IDs for master template tables (not required, but accepted)
    if (field.name === 'id' && ['workflow_phases', 'workflow_sections', 'workflow_line_items'].includes(tableName)) {
      fieldConfig.uploadable = true;
      fieldConfig.required = false; // don't force providing ids
      fieldConfig.transformer = FieldTransformers.trimString;
      fieldConfig.validators = [];
    }

    COMPLETE_FIELD_MAPPING[tableName].fields[field.name] = fieldConfig;
  });
});

/**
 * Data transformation and validation functions
 */
const DataProcessor = {
  /**
   * Transform raw data according to field mapping
   */
  transformData: (tableName, rowData) => {
    const mapping = COMPLETE_FIELD_MAPPING[tableName];
    if (!mapping) {
      throw new Error(`No mapping found for table: ${tableName}`);
    }

    const transformed = {};
    const errors = [];

    Object.entries(mapping.fields).forEach(([fieldName, fieldConfig]) => {
      const rawValue = rowData[fieldName];

      // Skip non-uploadable fields
      if (!fieldConfig.uploadable) {
        console.log(`⏭️ Skipping non-uploadable field: ${fieldName}`);
        return;
      }

      try {
        // Apply transformer if present
        let transformedValue = rawValue;
        if (fieldConfig.transformer) {
          transformedValue = fieldConfig.transformer(rawValue);
        }

        // Apply validators
        fieldConfig.validators.forEach(validator => {
          const error = validator(transformedValue);
          if (error) {
            errors.push(error);
          }
        });

        // Set transformed value
        if (transformedValue !== undefined) {
          transformed[fieldName] = transformedValue;
        }
      } catch (error) {
        errors.push(`Error processing ${fieldName}: ${error.message}`);
      }
    });

    return { transformed, errors };
  },

  /**
   * Validate data for a specific table
   */
  validateData: (tableName, data) => {
    const errors = [];
    
    data.forEach((row, index) => {
      const { errors: rowErrors } = DataProcessor.transformData(tableName, row);
      rowErrors.forEach(error => {
        errors.push(`Row ${index + 1}: ${error}`);
      });
    });

    return errors;
  },

  /**
   * Get uploadable fields for a table
   */
  getUploadableFields: (tableName) => {
    const mapping = COMPLETE_FIELD_MAPPING[tableName];
    if (!mapping) return [];

    return Object.entries(mapping.fields)
      .filter(([_, fieldConfig]) => fieldConfig.uploadable)
      .map(([fieldName, fieldConfig]) => ({
        name: fieldName,
        type: fieldConfig.type,
        required: fieldConfig.required,
        enumValues: fieldConfig.enumValues,
        constraint: fieldConfig.constraint
      }));
  },

  /**
   * Generate sample data for a table
   */
  generateSampleData: (tableName) => {
    const uploadableFields = DataProcessor.getUploadableFields(tableName);
    const sampleData = {};

    uploadableFields.forEach(field => {
      if (field.enumValues && field.enumValues.length > 0) {
        sampleData[field.name] = field.enumValues[0];
      } else if (field.type === 'Boolean') {
        sampleData[field.name] = true;
      } else if (field.type === 'Int') {
        sampleData[field.name] = field.name === 'progress' ? 0 : 1;
      } else if (field.type === 'Decimal') {
        sampleData[field.name] = 100.00;
      } else if (field.type.includes('DateTime')) {
        sampleData[field.name] = '2025-01-01T00:00:00Z';
      } else if (field.type.includes('[]')) {
        sampleData[field.name] = 'item1,item2';
      } else if (field.type.includes('Json')) {
        sampleData[field.name] = '{"key": "value"}';
      } else {
        sampleData[field.name] = `Sample ${field.name}`;
      }
    });

    return sampleData;
  }
};

/**
 * Export functions for use in other modules
 */
module.exports = {
  COMPLETE_FIELD_MAPPING,
  FieldTransformers,
  FieldValidators,
  DataProcessor,
  
  // Utility functions
  getAllTables: () => Object.keys(COMPLETE_FIELD_MAPPING),
  getTableInfo: (tableName) => COMPLETE_FIELD_MAPPING[tableName],
  getUploadableTables: () => Object.keys(COMPLETE_FIELD_MAPPING).filter(table => 
    COMPLETE_FIELD_MAPPING[table].uploadable
  ),
  
  // Helper functions
  isTableValid: (tableName) => tableName in COMPLETE_FIELD_MAPPING,
  getFieldConfig: (tableName, fieldName) => COMPLETE_FIELD_MAPPING[tableName]?.fields[fieldName],
  getTableFields: (tableName) => Object.keys(COMPLETE_FIELD_MAPPING[tableName]?.fields || {}),
  getRequiredFields: (tableName) => Object.entries(COMPLETE_FIELD_MAPPING[tableName]?.fields || {})
    .filter(([_, config]) => config.required && config.uploadable)
    .map(([name, _]) => name)
};