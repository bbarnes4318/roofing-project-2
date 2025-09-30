-- SAFE MIGRATION: Only adds emails table, does NOT touch any existing tables
-- Run this SQL directly in your database console

-- Create emails table
CREATE TABLE IF NOT EXISTS "emails" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_id" TEXT,
    "thread_id" TEXT,
    "sender_id" TEXT NOT NULL,
    "sender_email" TEXT NOT NULL,
    "sender_name" TEXT,
    "to_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "to_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cc_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reply_to" TEXT,
    "subject" TEXT NOT NULL,
    "body_text" TEXT,
    "body_html" TEXT,
    "email_type" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'sent',
    "priority" TEXT DEFAULT 'normal',
    "project_id" TEXT,
    "customer_id" TEXT,
    "task_id" TEXT,
    "attachments" JSONB,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "emails_sender_id_idx" ON "emails"("sender_id");
CREATE INDEX IF NOT EXISTS "emails_project_id_idx" ON "emails"("project_id");
CREATE INDEX IF NOT EXISTS "emails_customer_id_idx" ON "emails"("customer_id");
CREATE INDEX IF NOT EXISTS "emails_created_at_idx" ON "emails"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "emails_status_idx" ON "emails"("status");
CREATE INDEX IF NOT EXISTS "emails_email_type_idx" ON "emails"("email_type");
CREATE INDEX IF NOT EXISTS "emails_message_id_idx" ON "emails"("message_id");
CREATE INDEX IF NOT EXISTS "emails_thread_id_idx" ON "emails"("thread_id");

-- Add foreign keys (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'emails_sender_id_fkey'
    ) THEN
        ALTER TABLE "emails" ADD CONSTRAINT "emails_sender_id_fkey" 
        FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'emails_project_id_fkey'
    ) THEN
        ALTER TABLE "emails" ADD CONSTRAINT "emails_project_id_fkey" 
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'emails_customer_id_fkey'
    ) THEN
        ALTER TABLE "emails" ADD CONSTRAINT "emails_customer_id_fkey" 
        FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'emails_task_id_fkey'
    ) THEN
        ALTER TABLE "emails" ADD CONSTRAINT "emails_task_id_fkey" 
        FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Verify table was created
SELECT 'emails table created successfully' AS status;
