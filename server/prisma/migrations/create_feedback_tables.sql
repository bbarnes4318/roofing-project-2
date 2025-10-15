-- Create feedback system tables
-- This migration creates the missing feedback and follow-up tables

-- Create feedback table
CREATE TABLE IF NOT EXISTS "feedback" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "FeedbackSeverity",
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
    "body" TEXT NOT NULL,
    "is_developer" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "author_id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "parent_id" TEXT,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Create votes table
CREATE TABLE IF NOT EXISTS "votes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "action" "VoteAction" NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- Create badges table
CREATE TABLE IF NOT EXISTS "badges" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS "user_badges" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS "user_profiles" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_date" TIMESTAMP(3),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- Create follow_up_settings table
CREATE TABLE IF NOT EXISTS "follow_up_settings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "task_follow_up_days" INTEGER NOT NULL DEFAULT 7,
    "task_follow_up_hours" INTEGER NOT NULL DEFAULT 0,
    "task_follow_up_minutes" INTEGER NOT NULL DEFAULT 0,
    "reminder_follow_up_days" INTEGER NOT NULL DEFAULT 3,
    "reminder_follow_up_hours" INTEGER NOT NULL DEFAULT 0,
    "reminder_follow_up_minutes" INTEGER NOT NULL DEFAULT 0,
    "alert_follow_up_days" INTEGER NOT NULL DEFAULT 5,
    "alert_follow_up_hours" INTEGER NOT NULL DEFAULT 0,
    "alert_follow_up_minutes" INTEGER NOT NULL DEFAULT 0,
    "max_follow_up_attempts" INTEGER NOT NULL DEFAULT 3,
    "follow_up_message" VARCHAR(1000),

    CONSTRAINT "follow_up_settings_pkey" PRIMARY KEY ("id")
);

-- Create follow_up_tracking table
CREATE TABLE IF NOT EXISTS "follow_up_tracking" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "original_item_id" TEXT NOT NULL,
    "original_item_type" "FollowUpItemType" NOT NULL,
    "project_id" TEXT NOT NULL,
    "assigned_to_id" TEXT NOT NULL,
    "follow_up_days" INTEGER NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_reason" VARCHAR(500),
    "follow_up_message" VARCHAR(1000),
    "metadata" JSONB,

    CONSTRAINT "follow_up_tracking_pkey" PRIMARY KEY ("id")
);

-- Create enums
DO $$ BEGIN
    CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'IMPROVEMENT', 'IDEA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'PLANNED', 'IN_PROGRESS', 'DONE', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VoteAction" AS ENUM ('UPVOTE', 'DOWNVOTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BadgeCategory" AS ENUM ('ACHIEVEMENT', 'CONTRIBUTION', 'COLLABORATION', 'EXPERTISE', 'SPECIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FollowUpItemType" AS ENUM ('TASK', 'REMINDER', 'ALERT', 'WORKFLOW_ALERT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'CANCELLED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follow_up_settings" ADD CONSTRAINT "follow_up_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follow_up_tracking" ADD CONSTRAINT "follow_up_tracking_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_tracking" ADD CONSTRAINT "follow_up_tracking_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraints
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_feedback_id_key" UNIQUE ("user_id", "feedback_id");
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");
ALTER TABLE "follow_up_settings" ADD CONSTRAINT "follow_up_settings_user_id_key" UNIQUE ("user_id");
ALTER TABLE "badges" ADD CONSTRAINT "badges_code_key" UNIQUE ("code");

-- Create indexes
CREATE INDEX IF NOT EXISTS "feedback_type_idx" ON "feedback"("type");
CREATE INDEX IF NOT EXISTS "feedback_status_idx" ON "feedback"("status");
CREATE INDEX IF NOT EXISTS "feedback_severity_idx" ON "feedback"("severity");
CREATE INDEX IF NOT EXISTS "feedback_author_id_idx" ON "feedback"("author_id");
CREATE INDEX IF NOT EXISTS "feedback_assignee_id_idx" ON "feedback"("assignee_id");
CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback"("created_at");
CREATE INDEX IF NOT EXISTS "feedback_vote_count_idx" ON "feedback"("vote_count");

CREATE INDEX IF NOT EXISTS "comments_feedback_id_idx" ON "comments"("feedback_id");
CREATE INDEX IF NOT EXISTS "comments_author_id_idx" ON "comments"("author_id");
CREATE INDEX IF NOT EXISTS "comments_parent_id_idx" ON "comments"("parent_id");
CREATE INDEX IF NOT EXISTS "comments_created_at_idx" ON "comments"("created_at");

CREATE INDEX IF NOT EXISTS "votes_feedback_id_idx" ON "votes"("feedback_id");
CREATE INDEX IF NOT EXISTS "votes_user_id_idx" ON "votes"("user_id");

CREATE INDEX IF NOT EXISTS "badges_code_idx" ON "badges"("code");
CREATE INDEX IF NOT EXISTS "badges_category_idx" ON "badges"("category");

CREATE INDEX IF NOT EXISTS "user_badges_user_id_idx" ON "user_badges"("user_id");
CREATE INDEX IF NOT EXISTS "user_badges_badge_id_idx" ON "user_badges"("badge_id");

CREATE INDEX IF NOT EXISTS "user_profiles_user_id_idx" ON "user_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "user_profiles_points_idx" ON "user_profiles"("points");
CREATE INDEX IF NOT EXISTS "user_profiles_level_idx" ON "user_profiles"("level");

CREATE INDEX IF NOT EXISTS "follow_up_tracking_scheduled_for_idx" ON "follow_up_tracking"("scheduled_for");
CREATE INDEX IF NOT EXISTS "follow_up_tracking_status_idx" ON "follow_up_tracking"("status");
CREATE INDEX IF NOT EXISTS "follow_up_tracking_assigned_to_id_idx" ON "follow_up_tracking"("assigned_to_id");
CREATE INDEX IF NOT EXISTS "follow_up_tracking_original_item_id_original_item_type_idx" ON "follow_up_tracking"("original_item_id", "original_item_type");
