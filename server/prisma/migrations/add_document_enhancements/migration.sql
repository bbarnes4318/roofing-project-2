-- Add new fields to existing Document table
-- This migration is SAFE and only ADDS new columns without modifying existing data

-- Add new columns to documents table
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "title" VARCHAR(200);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "category" "document_categories" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "access_level" "access_levels" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "region" VARCHAR(100);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "state" VARCHAR(50);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "language" VARCHAR(10) DEFAULT 'en';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "thumbnail_url" VARCHAR(1000);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "preview_url" VARCHAR(1000);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "is_template" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "expiry_date" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "requires_signature" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "signature_required_by" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "search_vector" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "keywords" TEXT[];
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "related_documents" TEXT[];

-- Create new enums
CREATE TYPE "document_categories" AS ENUM ('CONTRACTS', 'WARRANTIES', 'PERMITS', 'INSPECTIONS', 'ESTIMATES', 'INVOICES', 'PHOTOS', 'REPORTS', 'FORMS', 'CHECKLISTS', 'MANUALS', 'TRAINING', 'COMPLIANCE', 'LEGAL', 'MARKETING', 'OTHER');
CREATE TYPE "access_levels" AS ENUM ('PUBLIC', 'AUTHENTICATED', 'PRIVATE', 'INTERNAL', 'ADMIN');
CREATE TYPE "access_types" AS ENUM ('VIEW', 'DOWNLOAD', 'EDIT', 'DELETE', 'MANAGE');

-- Create new tables for enhanced document management
CREATE TABLE IF NOT EXISTS "document_versions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version_number" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(1000) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "checksum" VARCHAR(255),
    "change_log" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "document_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_access" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_type" "access_types" NOT NULL DEFAULT 'VIEW',
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role_id" TEXT,
    CONSTRAINT "document_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_comments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "document_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_comment_id" TEXT,
    CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_favorites" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "document_favorites_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_access" ADD CONSTRAINT "document_access_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_access" ADD CONSTRAINT "document_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "document_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_favorites" ADD CONSTRAINT "document_favorites_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_favorites" ADD CONSTRAINT "document_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraints
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_version_number_key" UNIQUE ("document_id", "version_number");
ALTER TABLE "document_favorites" ADD CONSTRAINT "document_favorites_document_id_user_id_key" UNIQUE ("document_id", "user_id");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "documents_category_idx" ON "documents"("category");
CREATE INDEX IF NOT EXISTS "documents_access_level_idx" ON "documents"("access_level");
CREATE INDEX IF NOT EXISTS "documents_is_public_idx" ON "documents"("is_public");
CREATE INDEX IF NOT EXISTS "documents_is_template_idx" ON "documents"("is_template");
CREATE INDEX IF NOT EXISTS "documents_is_archived_idx" ON "documents"("is_archived");
CREATE INDEX IF NOT EXISTS "documents_created_at_idx" ON "documents"("created_at");
CREATE INDEX IF NOT EXISTS "documents_download_count_idx" ON "documents"("download_count");

-- Add search vector index if PostgreSQL supports it
-- CREATE INDEX IF NOT EXISTS "documents_search_vector_idx" ON "documents" USING gin("search_vector");
