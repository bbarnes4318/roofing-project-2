-- Add Email tracking table for comprehensive email history
-- This migration adds a dedicated Email model for tracking all sent emails

CREATE TABLE "emails" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Email identifiers
  "message_id" TEXT, -- Resend message ID for tracking
  "thread_id" TEXT, -- For grouping related emails
  
  -- Sender information
  "sender_id" TEXT NOT NULL,
  "sender_email" TEXT NOT NULL,
  "sender_name" TEXT,
  
  -- Recipient information (supports multiple recipients)
  "to_emails" TEXT[] NOT NULL, -- Array of recipient emails
  "to_names" TEXT[], -- Array of recipient names
  "cc_emails" TEXT[],
  "bcc_emails" TEXT[],
  "reply_to" TEXT,
  
  -- Email content
  "subject" TEXT NOT NULL,
  "body_text" TEXT, -- Plain text version
  "body_html" TEXT, -- HTML version
  
  -- Metadata
  "email_type" TEXT NOT NULL DEFAULT 'general', -- general, project_update, notification, system
  "status" TEXT NOT NULL DEFAULT 'sent', -- sent, failed, bounced, delivered, opened
  "priority" TEXT DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Associations
  "project_id" TEXT, -- Link to project
  "customer_id" TEXT, -- Link to customer
  "task_id" TEXT, -- Link to task
  
  -- Attachments (stored as JSON array)
  "attachments" JSONB,
  
  -- Tracking
  "sent_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "opened_at" TIMESTAMP(3),
  "clicked_at" TIMESTAMP(3),
  "bounced_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "error_message" TEXT,
  
  -- Additional metadata
  "tags" JSONB, -- For categorization and filtering
  "metadata" JSONB, -- Additional data (source, campaign, etc.)
  
  -- Soft delete
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  
  CONSTRAINT "fk_emails_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_emails_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_emails_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_emails_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX "idx_emails_sender_id" ON "emails"("sender_id");
CREATE INDEX "idx_emails_project_id" ON "emails"("project_id");
CREATE INDEX "idx_emails_customer_id" ON "emails"("customer_id");
CREATE INDEX "idx_emails_created_at" ON "emails"("created_at" DESC);
CREATE INDEX "idx_emails_status" ON "emails"("status");
CREATE INDEX "idx_emails_email_type" ON "emails"("email_type");
CREATE INDEX "idx_emails_message_id" ON "emails"("message_id");
CREATE INDEX "idx_emails_thread_id" ON "emails"("thread_id");

-- Full-text search on subject and body
CREATE INDEX "idx_emails_subject_search" ON "emails" USING gin(to_tsvector('english', "subject"));
CREATE INDEX "idx_emails_body_search" ON "emails" USING gin(to_tsvector('english', COALESCE("body_text", '')));

-- Comment for documentation
COMMENT ON TABLE "emails" IS 'Comprehensive email tracking for all sent emails with delivery status and associations';
COMMENT ON COLUMN "emails"."message_id" IS 'External email service message ID (e.g., Resend message ID)';
COMMENT ON COLUMN "emails"."thread_id" IS 'Groups related emails together (e.g., replies, forwards)';
COMMENT ON COLUMN "emails"."attachments" IS 'JSON array of attachment metadata: [{filename, size, mimeType, documentId}]';
COMMENT ON COLUMN "emails"."tags" IS 'JSON object for categorization: {source: "bubbles_ai", campaign: "project_updates"}';
COMMENT ON COLUMN "emails"."metadata" IS 'Additional tracking data: {ip, userAgent, location, etc.}';
