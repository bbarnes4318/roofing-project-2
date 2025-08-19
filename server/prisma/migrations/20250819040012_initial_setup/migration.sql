-- CreateEnum
CREATE TYPE "public"."workflow_states" AS ENUM ('PENDING', 'ACTIVE', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."user_roles" AS ENUM ('ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT');

-- CreateEnum
CREATE TYPE "public"."permissions" AS ENUM ('CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS', 'MANAGE_USERS', 'VIEW_REPORTS', 'MANAGE_FINANCES', 'MANAGE_DOCUMENTS', 'MANAGE_CALENDAR', 'USE_AI_FEATURES');

-- CreateEnum
CREATE TYPE "public"."themes" AS ENUM ('LIGHT', 'DARK', 'AUTO');

-- CreateEnum
CREATE TYPE "public"."contact_types" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "public"."project_types" AS ENUM ('ROOFING', 'GUTTERS', 'INTERIOR_PAINT');

-- CreateEnum
CREATE TYPE "public"."project_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "public"."priorities" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."project_phases" AS ENUM ('LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION');

-- CreateEnum
CREATE TYPE "public"."workflow_types" AS ENUM ('ROOFING', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION', 'SIDING', 'WINDOWS', 'GENERAL', 'GUTTERS', 'INTERIOR_PAINT');

-- CreateEnum
CREATE TYPE "public"."workflow_statuses" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."responsible_roles" AS ENUM ('OFFICE', 'ADMINISTRATION', 'PROJECT_MANAGER', 'FIELD_DIRECTOR', 'ROOF_SUPERVISOR', 'OFFICE_STAFF');

-- CreateEnum
CREATE TYPE "public"."alert_priorities" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."alert_methods" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "public"."alert_status" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'DISMISSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."task_statuses" AS ENUM ('TO_DO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "public"."task_categories" AS ENUM ('PLANNING', 'DESIGN', 'CONSTRUCTION', 'INSPECTION', 'DOCUMENTATION', 'COMMUNICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."document_types" AS ENUM ('BLUEPRINT', 'PERMIT', 'INVOICE', 'PHOTO', 'CONTRACT', 'REPORT', 'SPECIFICATION', 'CORRESPONDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."project_message_types" AS ENUM ('WORKFLOW_UPDATE', 'PHASE_COMPLETION', 'STEP_COMPLETION', 'USER_MESSAGE', 'SYSTEM_NOTIFICATION', 'ALERT_DISCUSSION', 'PROJECT_MILESTONE');

-- CreateEnum
CREATE TYPE "public"."message_priorities" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."conversation_roles" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."message_types" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "public"."event_types" AS ENUM ('MEETING', 'INSPECTION', 'INSTALLATION', 'DEADLINE', 'REMINDER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."event_statuses" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."attendee_statuses" AS ENUM ('REQUIRED', 'OPTIONAL', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "public"."attendee_responses" AS ENUM ('ACCEPTED', 'DECLINED', 'TENTATIVE', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "public"."notification_types" AS ENUM ('TASK_ASSIGNED', 'TASK_COMPLETED', 'PROJECT_UPDATE', 'WORKFLOW_ALERT', 'SYSTEM_MESSAGE', 'REMINDER');

-- CreateEnum
CREATE TYPE "public"."role_types" AS ENUM ('PROJECT_MANAGER', 'FIELD_DIRECTOR', 'OFFICE_STAFF', 'ADMINISTRATION');

-- CreateEnum
CREATE TYPE "public"."MFAMethod" AS ENUM ('TOTP', 'SMS', 'WEBAUTHN', 'BACKUP', 'EMAIL');

-- CreateEnum
CREATE TYPE "public"."SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGIN_BLOCKED', 'MFA_SUCCESS', 'MFA_FAILURE', 'DEVICE_NEW', 'DEVICE_SUSPICIOUS', 'LOCATION_NEW', 'LOCATION_SUSPICIOUS', 'BEHAVIOR_ANOMALY', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'PASSWORD_CHANGED', 'MFA_ENABLED', 'MFA_DISABLED', 'DEVICE_TRUSTED', 'DEVICE_REMOVED', 'SECURITY_QUESTION_FAILED', 'BRUTE_FORCE_DETECTED', 'CREDENTIAL_CREATED', 'CREDENTIAL_DELETED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatar" VARCHAR(2000),
    "phone" VARCHAR(20),
    "position" VARCHAR(100),
    "department" VARCHAR(100),
    "bio" VARCHAR(500),
    "role" "public"."user_roles" NOT NULL DEFAULT 'WORKER',
    "permissions" "public"."permissions"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "lastLoginIP" VARCHAR(45),
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "theme" "public"."themes" NOT NULL DEFAULT 'LIGHT',
    "notificationPreferences" JSONB,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "skills" TEXT[],
    "certifications" JSONB,
    "experience" INTEGER,
    "emergencyContact" JSONB,
    "address" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "primaryName" VARCHAR(100) NOT NULL,
    "primaryEmail" VARCHAR(320) NOT NULL,
    "primaryPhone" VARCHAR(20) NOT NULL,
    "secondaryName" VARCHAR(100),
    "secondaryEmail" VARCHAR(320),
    "secondaryPhone" VARCHAR(20),
    "primaryContact" "public"."contact_types" NOT NULL DEFAULT 'PRIMARY',
    "address" VARCHAR(500) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "primaryRole" VARCHAR(50),
    "secondaryRole" VARCHAR(50),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectNumber" INTEGER NOT NULL,
    "projectName" VARCHAR(255) NOT NULL,
    "projectType" "public"."project_types" NOT NULL,
    "status" "public"."project_statuses" NOT NULL DEFAULT 'PENDING',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "priority" "public"."priorities" NOT NULL DEFAULT 'MEDIUM',
    "budget" DECIMAL(12,2) NOT NULL,
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "pmPhone" VARCHAR(20),
    "pmEmail" VARCHAR(320),
    "customer_id" TEXT NOT NULL,
    "project_manager_id" TEXT,
    "created_by_id" TEXT,
    "phase" "public"."project_phases",
    "searchVector" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_team_members" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" VARCHAR(100),

    CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_phase_overrides" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,
    "from_phase" "public"."project_phases" NOT NULL,
    "to_phase" "public"."project_phases" NOT NULL,
    "suppressAlertsFor" "public"."project_phases"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "project_phase_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_alerts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" VARCHAR(100) NOT NULL DEFAULT 'Work Flow Line Item',
    "priority" "public"."alert_priorities" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."alert_status" NOT NULL DEFAULT 'ACTIVE',
    "title" VARCHAR(255) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "stepName" VARCHAR(255) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "project_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "created_by_id" TEXT,
    "metadata" JSONB,
    "responsibleRole" "public"."responsible_roles" NOT NULL DEFAULT 'OFFICE',
    "line_item_id" TEXT,
    "phase_id" TEXT,
    "section_id" TEXT,

    CONSTRAINT "workflow_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(2000),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."task_statuses" NOT NULL DEFAULT 'TO_DO',
    "priority" "public"."priorities" NOT NULL DEFAULT 'MEDIUM',
    "estimatedHours" INTEGER,
    "actualHours" INTEGER,
    "category" "public"."task_categories" NOT NULL DEFAULT 'OTHER',
    "tags" TEXT[],
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "project_id" TEXT NOT NULL,
    "assigned_to_id" TEXT NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_dependencies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_task_id" TEXT NOT NULL,
    "dependent_task_id" TEXT NOT NULL,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "fileUrl" VARCHAR(2000) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" "public"."document_types" NOT NULL,
    "description" VARCHAR(500),
    "tags" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "checksum" VARCHAR(255),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "project_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "searchVector" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_downloads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "document_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "messageType" "public"."project_message_types" NOT NULL DEFAULT 'WORKFLOW_UPDATE',
    "priority" "public"."message_priorities" NOT NULL DEFAULT 'MEDIUM',
    "author_id" TEXT,
    "authorName" VARCHAR(100) NOT NULL,
    "authorRole" VARCHAR(50),
    "project_id" TEXT NOT NULL,
    "projectNumber" INTEGER NOT NULL,
    "workflow_id" TEXT,
    "step_id" TEXT,
    "stepName" VARCHAR(255),
    "phase" "public"."project_phases",
    "section" VARCHAR(255),
    "lineItem" VARCHAR(255),
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isWorkflowMessage" BOOLEAN NOT NULL DEFAULT false,
    "parent_message_id" TEXT,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "searchVector" TEXT,

    CONSTRAINT "project_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(255),
    "description" VARCHAR(500),
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversation_participants" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "role" "public"."conversation_roles" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "text" VARCHAR(2000) NOT NULL,
    "messageType" "public"."message_types" NOT NULL DEFAULT 'TEXT',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "reply_to_id" TEXT,
    "attachments" JSONB,
    "reactions" JSONB,
    "systemData" JSONB,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_reads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(2000),
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(500),
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "eventType" "public"."event_types" NOT NULL DEFAULT 'MEETING',
    "status" "public"."event_statuses" NOT NULL DEFAULT 'CONFIRMED',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" VARCHAR(500),
    "parent_event_id" TEXT,
    "organizer_id" TEXT NOT NULL,
    "project_id" TEXT,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_event_attendees" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "public"."attendee_statuses" NOT NULL DEFAULT 'REQUIRED',
    "response" "public"."attendee_responses" NOT NULL DEFAULT 'NO_RESPONSE',

    CONSTRAINT "calendar_event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "type" "public"."notification_types" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" VARCHAR(2000),
    "actionData" JSONB,
    "recipient_id" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_assignments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role_type" "public"."role_types" NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL,
    "assigned_by_id" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_phases" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phaseName" VARCHAR(255) NOT NULL,
    "phaseType" "public"."project_phases" NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "workflowType" "public"."workflow_types" NOT NULL DEFAULT 'ROOFING',

    CONSTRAINT "workflow_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_sections" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectionNumber" VARCHAR(10) NOT NULL,
    "sectionName" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phase_id" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "workflowType" "public"."workflow_types" NOT NULL DEFAULT 'ROOFING',

    CONSTRAINT "workflow_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workflow_line_items" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemLetter" VARCHAR(10) NOT NULL,
    "itemName" VARCHAR(500) NOT NULL,
    "responsibleRole" "public"."responsible_roles" NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "description" VARCHAR(2000),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "alertDays" INTEGER NOT NULL DEFAULT 1,
    "section_id" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "searchVector" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "days_to_complete" INTEGER NOT NULL DEFAULT 1,
    "workflowType" "public"."workflow_types" NOT NULL DEFAULT 'ROOFING',

    CONSTRAINT "workflow_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_workflow_trackers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,
    "current_phase_id" TEXT,
    "current_section_id" TEXT,
    "current_line_item_id" TEXT,
    "last_completed_item_id" TEXT,
    "phaseStartedAt" TIMESTAMP(3),
    "sectionStartedAt" TIMESTAMP(3),
    "lineItemStartedAt" TIMESTAMP(3),
    "is_main_workflow" BOOLEAN NOT NULL DEFAULT true,
    "trade_name" VARCHAR(100),
    "workflowType" "public"."workflow_types" NOT NULL DEFAULT 'ROOFING',
    "totalLineItems" INTEGER DEFAULT 0,

    CONSTRAINT "project_workflow_trackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."completed_workflow_items" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tracker_id" TEXT NOT NULL,
    "phase_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "line_item_id" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_by_id" TEXT,
    "notes" TEXT,

    CONSTRAINT "completed_workflow_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_devices" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_fingerprint" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(100),
    "device_type" VARCHAR(50),
    "user_agent" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "location" JSONB,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "biometric_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_used" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_mfa" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" "public"."MFAMethod" NOT NULL,
    "secret" VARCHAR(255),
    "backup_codes" TEXT[],
    "phone_number" VARCHAR(20),
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_used" TIMESTAMP(3),

    CONSTRAINT "user_mfa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."security_events" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "event_type" "public"."SecurityEventType" NOT NULL,
    "risk_score" INTEGER,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "device_id" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "response" JSONB,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_behavior_patterns" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "keystroke_patterns" JSONB,
    "mouse_patterns" JSONB,
    "touch_patterns" JSONB,
    "usage_patterns" JSONB,
    "voice_pattern" JSONB,
    "risk_baseline" DECIMAL(5,2),
    "anomaly_threshold" DECIMAL(5,2),
    "last_analysis" TIMESTAMP(3),

    CONSTRAINT "user_behavior_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webauthn_credentials" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" VARCHAR(255) NOT NULL,
    "credential_public_key" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "device_type" VARCHAR(50) NOT NULL,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT[],
    "nickname" VARCHAR(100),
    "last_used" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_primaryEmail_key" ON "public"."customers"("primaryEmail");

-- CreateIndex
CREATE UNIQUE INDEX "projects_projectNumber_key" ON "public"."projects"("projectNumber");

-- CreateIndex
CREATE UNIQUE INDEX "project_team_members_project_id_user_id_key" ON "public"."project_team_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "project_phase_overrides_project_id_idx" ON "public"."project_phase_overrides"("project_id");

-- CreateIndex
CREATE INDEX "workflow_alerts_project_id_status_idx" ON "public"."workflow_alerts"("project_id", "status");

-- CreateIndex
CREATE INDEX "workflow_alerts_assigned_to_id_status_idx" ON "public"."workflow_alerts"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "workflow_alerts_line_item_id_status_idx" ON "public"."workflow_alerts"("line_item_id", "status");

-- CreateIndex
CREATE INDEX "workflow_alerts_createdAt_project_id_idx" ON "public"."workflow_alerts"("createdAt" DESC, "project_id");

-- CreateIndex
CREATE INDEX "workflow_alerts_phase_id_section_id_idx" ON "public"."workflow_alerts"("phase_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_active_alert_new" ON "public"."workflow_alerts"("project_id", "line_item_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_parent_task_id_dependent_task_id_key" ON "public"."task_dependencies"("parent_task_id", "dependent_task_id");

-- CreateIndex
CREATE INDEX "project_messages_project_id_createdAt_idx" ON "public"."project_messages"("project_id", "createdAt");

-- CreateIndex
CREATE INDEX "project_messages_workflow_id_step_id_idx" ON "public"."project_messages"("workflow_id", "step_id");

-- CreateIndex
CREATE INDEX "project_messages_phase_idx" ON "public"."project_messages"("phase");

-- CreateIndex
CREATE INDEX "project_messages_isSystemGenerated_idx" ON "public"."project_messages"("isSystemGenerated");

-- CreateIndex
CREATE INDEX "project_messages_author_id_idx" ON "public"."project_messages"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" ON "public"."conversation_participants"("conversation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reads_message_id_user_id_key" ON "public"."message_reads"("message_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_attendees_event_id_user_id_key" ON "public"."calendar_event_attendees"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_role_type_key" ON "public"."role_assignments"("role_type");

-- CreateIndex
CREATE INDEX "role_assignments_user_id_idx" ON "public"."role_assignments"("user_id");

-- CreateIndex
CREATE INDEX "role_assignments_role_type_idx" ON "public"."role_assignments"("role_type");

-- CreateIndex
CREATE INDEX "role_assignments_assigned_at_idx" ON "public"."role_assignments"("assigned_at");

-- CreateIndex
CREATE INDEX "role_assignments_role_type_isActive_idx" ON "public"."role_assignments"("role_type", "isActive");

-- CreateIndex
CREATE INDEX "workflow_phases_workflowType_idx" ON "public"."workflow_phases"("workflowType");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_phases_phaseType_workflowType_key" ON "public"."workflow_phases"("phaseType", "workflowType");

-- CreateIndex
CREATE INDEX "workflow_sections_phase_id_idx" ON "public"."workflow_sections"("phase_id");

-- CreateIndex
CREATE INDEX "workflow_sections_workflowType_idx" ON "public"."workflow_sections"("workflowType");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_sections_phase_id_sectionNumber_key" ON "public"."workflow_sections"("phase_id", "sectionNumber");

-- CreateIndex
CREATE INDEX "workflow_line_items_section_id_idx" ON "public"."workflow_line_items"("section_id");

-- CreateIndex
CREATE INDEX "workflow_line_items_section_id_displayOrder_idx" ON "public"."workflow_line_items"("section_id", "displayOrder");

-- CreateIndex
CREATE INDEX "workflow_line_items_isActive_displayOrder_idx" ON "public"."workflow_line_items"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "workflow_line_items_workflowType_idx" ON "public"."workflow_line_items"("workflowType");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_line_items_section_id_itemLetter_key" ON "public"."workflow_line_items"("section_id", "itemLetter");

-- CreateIndex
CREATE INDEX "project_workflow_trackers_current_line_item_id_idx" ON "public"."project_workflow_trackers"("current_line_item_id");

-- CreateIndex
CREATE INDEX "project_workflow_trackers_project_id_current_phase_id_idx" ON "public"."project_workflow_trackers"("project_id", "current_phase_id");

-- CreateIndex
CREATE INDEX "project_workflow_trackers_project_id_is_main_workflow_idx" ON "public"."project_workflow_trackers"("project_id", "is_main_workflow");

-- CreateIndex
CREATE UNIQUE INDEX "project_workflow_trackers_project_id_workflowType_key" ON "public"."project_workflow_trackers"("project_id", "workflowType");

-- CreateIndex
CREATE INDEX "completed_workflow_items_tracker_id_idx" ON "public"."completed_workflow_items"("tracker_id");

-- CreateIndex
CREATE INDEX "completed_workflow_items_completedAt_idx" ON "public"."completed_workflow_items"("completedAt");

-- CreateIndex
CREATE INDEX "completed_workflow_items_tracker_id_line_item_id_idx" ON "public"."completed_workflow_items"("tracker_id", "line_item_id");

-- CreateIndex
CREATE INDEX "completed_workflow_items_tracker_id_completedAt_idx" ON "public"."completed_workflow_items"("tracker_id", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_device_fingerprint_key" ON "public"."user_devices"("device_fingerprint");

-- CreateIndex
CREATE INDEX "user_devices_user_id_idx" ON "public"."user_devices"("user_id");

-- CreateIndex
CREATE INDEX "user_devices_device_fingerprint_idx" ON "public"."user_devices"("device_fingerprint");

-- CreateIndex
CREATE INDEX "user_devices_last_used_idx" ON "public"."user_devices"("last_used");

-- CreateIndex
CREATE INDEX "user_devices_trusted_is_active_idx" ON "public"."user_devices"("trusted", "is_active");

-- CreateIndex
CREATE INDEX "user_mfa_user_id_idx" ON "public"."user_mfa"("user_id");

-- CreateIndex
CREATE INDEX "user_mfa_method_enabled_idx" ON "public"."user_mfa"("method", "enabled");

-- CreateIndex
CREATE INDEX "security_events_user_id_idx" ON "public"."security_events"("user_id");

-- CreateIndex
CREATE INDEX "security_events_event_type_idx" ON "public"."security_events"("event_type");

-- CreateIndex
CREATE INDEX "security_events_createdAt_idx" ON "public"."security_events"("createdAt");

-- CreateIndex
CREATE INDEX "security_events_risk_score_idx" ON "public"."security_events"("risk_score");

-- CreateIndex
CREATE INDEX "security_events_resolved_idx" ON "public"."security_events"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "user_behavior_patterns_user_id_key" ON "public"."user_behavior_patterns"("user_id");

-- CreateIndex
CREATE INDEX "user_behavior_patterns_user_id_idx" ON "public"."user_behavior_patterns"("user_id");

-- CreateIndex
CREATE INDEX "user_behavior_patterns_last_analysis_idx" ON "public"."user_behavior_patterns"("last_analysis");

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "public"."webauthn_credentials"("credential_id");

-- CreateIndex
CREATE INDEX "webauthn_credentials_user_id_idx" ON "public"."webauthn_credentials"("user_id");

-- CreateIndex
CREATE INDEX "webauthn_credentials_credential_id_idx" ON "public"."webauthn_credentials"("credential_id");

-- CreateIndex
CREATE INDEX "webauthn_credentials_last_used_idx" ON "public"."webauthn_credentials"("last_used");

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_project_manager_id_fkey" FOREIGN KEY ("project_manager_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_team_members" ADD CONSTRAINT "project_team_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_team_members" ADD CONSTRAINT "project_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_phase_overrides" ADD CONSTRAINT "project_phase_overrides_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_alerts" ADD CONSTRAINT "workflow_alerts_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_alerts" ADD CONSTRAINT "workflow_alerts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_alerts" ADD CONSTRAINT "workflow_alerts_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "public"."workflow_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_alerts" ADD CONSTRAINT "workflow_alerts_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."workflow_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_alerts" ADD CONSTRAINT "workflow_alerts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_alerts" ADD CONSTRAINT "workflow_alerts_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."workflow_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_dependent_task_id_fkey" FOREIGN KEY ("dependent_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_downloads" ADD CONSTRAINT "document_downloads_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_downloads" ADD CONSTRAINT "document_downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_messages" ADD CONSTRAINT "project_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_messages" ADD CONSTRAINT "project_messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."project_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_messages" ADD CONSTRAINT "project_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_reads" ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_reads" ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_assignments" ADD CONSTRAINT "role_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_assignments" ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_sections" ADD CONSTRAINT "workflow_sections_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."workflow_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workflow_line_items" ADD CONSTRAINT "workflow_line_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."workflow_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_workflow_trackers" ADD CONSTRAINT "project_workflow_trackers_current_line_item_id_fkey" FOREIGN KEY ("current_line_item_id") REFERENCES "public"."workflow_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_workflow_trackers" ADD CONSTRAINT "project_workflow_trackers_current_phase_id_fkey" FOREIGN KEY ("current_phase_id") REFERENCES "public"."workflow_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_workflow_trackers" ADD CONSTRAINT "project_workflow_trackers_current_section_id_fkey" FOREIGN KEY ("current_section_id") REFERENCES "public"."workflow_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_workflow_trackers" ADD CONSTRAINT "project_workflow_trackers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."completed_workflow_items" ADD CONSTRAINT "completed_workflow_items_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."completed_workflow_items" ADD CONSTRAINT "completed_workflow_items_tracker_id_fkey" FOREIGN KEY ("tracker_id") REFERENCES "public"."project_workflow_trackers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_mfa" ADD CONSTRAINT "user_mfa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."security_events" ADD CONSTRAINT "security_events_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_behavior_patterns" ADD CONSTRAINT "user_behavior_patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
