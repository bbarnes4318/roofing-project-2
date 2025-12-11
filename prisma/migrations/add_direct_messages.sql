-- Create enum for direct message types (if not exists)
DO $$ BEGIN
    CREATE TYPE "direct_message_types" AS ENUM ('DIRECT', 'PROJECT', 'GROUP', 'ANNOUNCEMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS "direct_messages" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" VARCHAR(5000) NOT NULL,
    "type" "direct_message_types" NOT NULL DEFAULT 'DIRECT',
    "priority" "priorities" NOT NULL DEFAULT 'MEDIUM',
    "sender_id" TEXT NOT NULL,
    "sender_name" VARCHAR(200) NOT NULL,
    "sender_avatar" VARCHAR(2000),
    "recipient_id" TEXT,
    "recipient_name" VARCHAR(200),
    "project_id" TEXT,
    "project_name" VARCHAR(255),
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readAt" TIMESTAMP(3),
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "direct_messages_sender_id_recipient_id_idx" ON "direct_messages"("sender_id", "recipient_id");
CREATE INDEX IF NOT EXISTS "direct_messages_recipient_id_created_at_idx" ON "direct_messages"("recipient_id", "created_at");
CREATE INDEX IF NOT EXISTS "direct_messages_sender_id_created_at_idx" ON "direct_messages"("sender_id", "created_at");
CREATE INDEX IF NOT EXISTS "direct_messages_project_id_idx" ON "direct_messages"("project_id");
