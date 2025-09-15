-- Add CompanyAsset table to existing database
-- This only adds the table, doesn't modify existing data

CREATE TABLE IF NOT EXISTS "CompanyAsset" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000),
    "fileUrl" VARCHAR(2000),
    "mimeType" VARCHAR(100),
    "fileSize" INTEGER,
    "tags" TEXT[],
    "section" "DocumentSection",
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "parentId" TEXT,
    "path" VARCHAR(1000),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "type" "AssetType" NOT NULL DEFAULT 'FILE',
    "folder_name" VARCHAR(255),
    "is_public" BOOLEAN DEFAULT false,
    "thumbnail_url" VARCHAR(2000),
    "checksum" VARCHAR(255),
    "metadata" JSONB,
    "access_level" VARCHAR(50) DEFAULT 'private',
    "originalName" VARCHAR(255),
    "fileName" VARCHAR(255),

    CONSTRAINT "CompanyAsset_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "idx_company_assets_folder_name" ON "CompanyAsset"("folder_name");
CREATE INDEX IF NOT EXISTS "idx_company_assets_parent_id" ON "CompanyAsset"("parentId");
CREATE INDEX IF NOT EXISTS "idx_company_assets_type" ON "CompanyAsset"("type");
CREATE INDEX IF NOT EXISTS "idx_company_assets_uploaded_by" ON "CompanyAsset"("uploadedById");

-- Add foreign key constraints
ALTER TABLE "CompanyAsset" ADD CONSTRAINT "CompanyAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyAsset" ADD CONSTRAINT "CompanyAsset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CompanyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
