-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "message_id" TEXT,
    "thread_id" TEXT,
    "sender_id" TEXT NOT NULL,
    "sender_email" TEXT NOT NULL,
    "sender_name" TEXT,
    "to_emails" TEXT[],
    "to_names" TEXT[],
    "cc_emails" TEXT[],
    "bcc_emails" TEXT[],
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

-- CreateIndex
CREATE INDEX "emails_sender_id_idx" ON "emails"("sender_id");

-- CreateIndex
CREATE INDEX "emails_project_id_idx" ON "emails"("project_id");

-- CreateIndex
CREATE INDEX "emails_customer_id_idx" ON "emails"("customer_id");

-- CreateIndex
CREATE INDEX "emails_created_at_idx" ON "emails"("created_at" DESC);

-- CreateIndex
CREATE INDEX "emails_status_idx" ON "emails"("status");

-- CreateIndex
CREATE INDEX "emails_email_type_idx" ON "emails"("email_type");

-- CreateIndex
CREATE INDEX "emails_message_id_idx" ON "emails"("message_id");

-- CreateIndex
CREATE INDEX "emails_thread_id_idx" ON "emails"("thread_id");

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
