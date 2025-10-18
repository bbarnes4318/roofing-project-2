-- Direct SQL to create feedback tables
-- Run this directly in your PostgreSQL database

-- Create feedback table
CREATE TABLE IF NOT EXISTS "feedback" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vote_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "developer_response_count" INTEGER NOT NULL DEFAULT 0,
    "attachments" JSONB,
    "url" VARCHAR(500),
    "environment" JSONB,
    "author_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- Create comments table
CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Create votes table
CREATE TABLE IF NOT EXISTS "votes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "vote_type" TEXT NOT NULL,
    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- Create enum types
DO $$ BEGIN
    CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE', 'IMPROVEMENT', 'QUESTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints (with error handling)
DO $$ BEGIN
    ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "votes" ADD CONSTRAINT "votes_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "feedback_author_id_idx" ON "feedback"("author_id");
CREATE INDEX IF NOT EXISTS "feedback_assignee_id_idx" ON "feedback"("assignee_id");
CREATE INDEX IF NOT EXISTS "feedback_status_idx" ON "feedback"("status");
CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback"("created_at");
CREATE INDEX IF NOT EXISTS "comments_feedback_id_idx" ON "comments"("feedback_id");
CREATE INDEX IF NOT EXISTS "comments_author_id_idx" ON "comments"("author_id");
CREATE INDEX IF NOT EXISTS "votes_feedback_id_idx" ON "votes"("feedback_id");
CREATE INDEX IF NOT EXISTS "votes_user_id_idx" ON "votes"("user_id");

-- Test the tables
SELECT 'Tables created successfully!' as result;
SELECT COUNT(*) as feedback_count FROM "feedback";
SELECT COUNT(*) as comments_count FROM "comments";
SELECT COUNT(*) as votes_count FROM "votes";
