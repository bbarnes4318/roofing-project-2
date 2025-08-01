-- CreateEnum
CREATE TYPE "user_roles" AS ENUM ('ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'FOREMAN', 'WORKER', 'CLIENT');

-- CreateEnum
CREATE TYPE "permissions" AS ENUM ('CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS', 'MANAGE_USERS', 'VIEW_REPORTS', 'MANAGE_FINANCES', 'MANAGE_DOCUMENTS', 'MANAGE_CALENDAR', 'USE_AI_FEATURES');

-- CreateEnum
CREATE TYPE "themes" AS ENUM ('LIGHT', 'DARK', 'AUTO');

-- CreateEnum
CREATE TYPE "contact_types" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "project_types" AS ENUM ('ROOF_REPLACEMENT', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION', 'SIDING_INSTALLATION', 'WINDOW_REPLACEMENT', 'FLOORING', 'PAINTING', 'ELECTRICAL_WORK', 'PLUMBING', 'HVAC', 'DECK_CONSTRUCTION', 'LANDSCAPING', 'OTHER');

-- CreateEnum
CREATE TYPE "project_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "priorities" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "project_phases" AS ENUM ('LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SUPPLEMENT', 'COMPLETION');

-- CreateEnum
CREATE TYPE "workflow_types" AS ENUM ('ROOFING', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION', 'SIDING', 'WINDOWS', 'GENERAL');

-- CreateEnum
CREATE TYPE "workflow_statuses" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "responsible_roles" AS ENUM ('OFFICE', 'ADMINISTRATION', 'PROJECT_MANAGER', 'FIELD_DIRECTOR', 'ROOF_SUPERVISOR');

-- CreateEnum
CREATE TYPE "alert_priorities" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "alert_methods" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "task_statuses" AS ENUM ('TO_DO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "task_categories" AS ENUM ('PLANNING', 'DESIGN', 'CONSTRUCTION', 'INSPECTION', 'DOCUMENTATION', 'COMMUNICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "document_types" AS ENUM ('BLUEPRINT', 'PERMIT', 'INVOICE', 'PHOTO', 'CONTRACT', 'REPORT', 'SPECIFICATION', 'CORRESPONDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "conversation_roles" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "message_types" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "event_types" AS ENUM ('MEETING', 'INSPECTION', 'INSTALLATION', 'DEADLINE', 'REMINDER', 'OTHER');

-- CreateEnum
CREATE TYPE "event_statuses" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "attendee_statuses" AS ENUM ('REQUIRED', 'OPTIONAL', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "attendee_responses" AS ENUM ('ACCEPTED', 'DECLINED', 'TENTATIVE', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "notification_types" AS ENUM ('TASK_ASSIGNED', 'TASK_COMPLETED', 'PROJECT_UPDATE', 'WORKFLOW_ALERT', 'SYSTEM_MESSAGE', 'REMINDER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatar" VARCHAR(500),
    "phone" VARCHAR(20),
    "position" VARCHAR(100),
    "department" VARCHAR(100),
    "bio" VARCHAR(500),
    "role" "user_roles" NOT NULL DEFAULT 'WORKER',
    "permissions" "permissions"[],
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
    "theme" "themes" NOT NULL DEFAULT 'LIGHT',
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
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "primaryName" VARCHAR(100) NOT NULL,
    "primaryEmail" VARCHAR(255) NOT NULL,
    "primaryPhone" VARCHAR(20) NOT NULL,
    "secondaryName" VARCHAR(100),
    "secondaryEmail" VARCHAR(255),
    "secondaryPhone" VARCHAR(20),
    "primaryContact" "contact_types" NOT NULL DEFAULT 'PRIMARY',
    "address" VARCHAR(500) NOT NULL,
    "notes" VARCHAR(2000),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectNumber" INTEGER NOT NULL,
    "projectName" VARCHAR(200) NOT NULL,
    "projectType" "project_types" NOT NULL,
    "status" "project_statuses" NOT NULL DEFAULT 'PENDING',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(2000),
    "priority" "priorities" NOT NULL DEFAULT 'MEDIUM',
    "budget" DECIMAL(12,2) NOT NULL,
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" VARCHAR(1000),
    "pmPhone" VARCHAR(20),
    "pmEmail" VARCHAR(255),
    "customer_id" TEXT NOT NULL,
    "project_manager_id" TEXT,
    "created_by_id" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_team_members" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" VARCHAR(100),

    CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_workflows" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,
    "workflowType" "workflow_types" NOT NULL DEFAULT 'ROOFING',
    "status" "workflow_statuses" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "overallProgress" INTEGER NOT NULL DEFAULT 0,
    "workflowStartDate" TIMESTAMP(3),
    "workflowEndDate" TIMESTAMP(3),
    "estimatedCompletionDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "enableAlerts" BOOLEAN NOT NULL DEFAULT true,
    "alertMethods" "alert_methods"[],
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "escalationDelayDays" INTEGER NOT NULL DEFAULT 2,
    "teamAssignments" JSONB,
    "created_by_id" TEXT,
    "last_modified_by_id" TEXT,

    CONSTRAINT "project_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stepId" VARCHAR(50) NOT NULL,
    "stepName" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "phase" "project_phases" NOT NULL,
    "defaultResponsible" "responsible_roles" NOT NULL,
    "assigned_to_id" TEXT,
    "estimatedDuration" INTEGER NOT NULL,
    "scheduledStartDate" TIMESTAMP(3),
    "scheduledEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "alertPriority" "alert_priorities" NOT NULL DEFAULT 'MEDIUM',
    "alertDays" INTEGER NOT NULL DEFAULT 1,
    "overdueIntervals" INTEGER[] DEFAULT ARRAY[1, 3, 7, 14]::INTEGER[],
    "notes" VARCHAR(2000),
    "completionNotes" VARCHAR(2000),
    "dependencies" TEXT[],
    "workflow_id" TEXT NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_subtasks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subTaskId" VARCHAR(50) NOT NULL,
    "subTaskName" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "notes" VARCHAR(1000),
    "step_id" TEXT NOT NULL,

    CONSTRAINT "workflow_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_attachments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,

    CONSTRAINT "workflow_step_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "task_statuses" NOT NULL DEFAULT 'TO_DO',
    "priority" "priorities" NOT NULL DEFAULT 'MEDIUM',
    "estimatedHours" INTEGER,
    "actualHours" INTEGER,
    "category" "task_categories" NOT NULL DEFAULT 'OTHER',
    "tags" TEXT[],
    "notes" VARCHAR(1000),
    "completedAt" TIMESTAMP(3),
    "project_id" TEXT NOT NULL,
    "assigned_to_id" TEXT NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_task_id" TEXT NOT NULL,
    "dependent_task_id" TEXT NOT NULL,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "fileUrl" VARCHAR(1000) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" "document_types" NOT NULL,
    "description" VARCHAR(1000),
    "tags" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "checksum" VARCHAR(255),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "project_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_downloads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "document_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200),
    "description" VARCHAR(500),
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "role" "conversation_roles" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,
    "messageType" "message_types" NOT NULL DEFAULT 'TEXT',
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
CREATE TABLE "message_reads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(500),
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "eventType" "event_types" NOT NULL DEFAULT 'MEETING',
    "status" "event_statuses" NOT NULL DEFAULT 'CONFIRMED',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" VARCHAR(500),
    "parent_event_id" TEXT,
    "organizer_id" TEXT NOT NULL,
    "project_id" TEXT,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_attendees" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "attendee_statuses" NOT NULL DEFAULT 'REQUIRED',
    "response" "attendee_responses" NOT NULL DEFAULT 'NO_RESPONSE',

    CONSTRAINT "calendar_event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "type" "notification_types" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" VARCHAR(500),
    "actionData" JSONB,
    "recipient_id" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_primaryEmail_key" ON "customers"("primaryEmail");

-- CreateIndex
CREATE UNIQUE INDEX "projects_projectNumber_key" ON "projects"("projectNumber");

-- CreateIndex
CREATE UNIQUE INDEX "project_team_members_project_id_user_id_key" ON "project_team_members"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_workflows_project_id_key" ON "project_workflows"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_step_attachments_step_id_document_id_key" ON "workflow_step_attachments"("step_id", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_parent_task_id_dependent_task_id_key" ON "task_dependencies"("parent_task_id", "dependent_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" ON "conversation_participants"("conversation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reads_message_id_user_id_key" ON "message_reads"("message_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_attendees_event_id_user_id_key" ON "calendar_event_attendees"("event_id", "user_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_id_fkey" FOREIGN KEY ("project_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_workflows" ADD CONSTRAINT "project_workflows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_workflows" ADD CONSTRAINT "project_workflows_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_workflows" ADD CONSTRAINT "project_workflows_last_modified_by_id_fkey" FOREIGN KEY ("last_modified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "project_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_subtasks" ADD CONSTRAINT "workflow_subtasks_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_attachments" ADD CONSTRAINT "workflow_step_attachments_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_attachments" ADD CONSTRAINT "workflow_step_attachments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_dependent_task_id_fkey" FOREIGN KEY ("dependent_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_downloads" ADD CONSTRAINT "document_downloads_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_downloads" ADD CONSTRAINT "document_downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
