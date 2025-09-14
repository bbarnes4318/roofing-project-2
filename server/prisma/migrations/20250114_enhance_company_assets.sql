-- Enhanced Company Assets Migration
-- This migration adds fields for the redesigned Company Documents section
-- WITHOUT breaking existing functionality

-- Step 1: Add new fields to company_assets table (only the ones that don't exist)
ALTER TABLE "company_assets" 
ADD COLUMN IF NOT EXISTS "folder_name" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "thumbnail_url" VARCHAR(2000),
ADD COLUMN IF NOT EXISTS "checksum" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "access_level" VARCHAR(50) DEFAULT 'private';

-- Step 2: Create index for better folder querying
CREATE INDEX IF NOT EXISTS "idx_company_assets_folder_name" ON "company_assets" ("folder_name");
CREATE INDEX IF NOT EXISTS "idx_company_assets_is_public" ON "company_assets" ("is_public");
CREATE INDEX IF NOT EXISTS "idx_company_assets_parent_type" ON "company_assets" ("parent_id", "type");

-- Step 3: Create version history table
CREATE TABLE IF NOT EXISTS "company_asset_versions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asset_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "file_url" VARCHAR(2000) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "checksum" VARCHAR(255),
  "change_description" VARCHAR(1000),
  "uploaded_by_id" TEXT,
  "is_current" BOOLEAN DEFAULT false,
  
  CONSTRAINT "fk_asset_versions_asset" FOREIGN KEY ("asset_id") 
    REFERENCES "company_assets"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_asset_versions_user" FOREIGN KEY ("uploaded_by_id") 
    REFERENCES "users"("id") ON DELETE SET NULL
);

-- Step 4: Create indexes for version history
CREATE INDEX IF NOT EXISTS "idx_asset_versions_asset_id" ON "company_asset_versions" ("asset_id");
CREATE INDEX IF NOT EXISTS "idx_asset_versions_current" ON "company_asset_versions" ("asset_id", "is_current");

-- Step 5: Update existing folders with meaningful names (safe defaults)
UPDATE "company_assets" 
SET "folder_name" = CASE 
  WHEN "title" ILIKE '%contract%' THEN 'Contracts & Agreements'
  WHEN "title" ILIKE '%warrant%' OR "title" ILIKE '%certif%' THEN 'Warranties & Certifications'
  WHEN "title" ILIKE '%inspect%' THEN 'Inspection Reports'
  WHEN "title" ILIKE '%permit%' OR "title" ILIKE '%complian%' THEN 'Permits & Compliance'
  WHEN "title" ILIKE '%safety%' THEN 'Safety Documentation'
  WHEN "title" ILIKE '%train%' OR "title" ILIKE '%sop%' THEN 'SOPs & Training'
  WHEN "title" ILIKE '%sale%' OR "title" ILIKE '%material%' THEN 'Sales Materials'
  WHEN "title" ILIKE '%office%' THEN 'Office Documents'
  ELSE "title"
END
WHERE "type" = 'FOLDER' AND "folder_name" IS NULL;

-- Step 6: Set default metadata for existing assets
UPDATE "company_assets"
SET "metadata" = jsonb_build_object(
  'displayOrder', COALESCE("sortOrder", 0),
  'icon', CASE 
    WHEN "type" = 'FOLDER' THEN 'folder'
    WHEN "mimeType" LIKE '%pdf%' THEN 'file-pdf'
    WHEN "mimeType" LIKE '%word%' OR "mimeType" LIKE '%document%' THEN 'file-word'
    WHEN "mimeType" LIKE '%excel%' OR "mimeType" LIKE '%spreadsheet%' THEN 'file-excel'
    WHEN "mimeType" LIKE '%image%' THEN 'file-image'
    ELSE 'file'
  END,
  'color', CASE
    WHEN "title" ILIKE '%contract%' THEN 'blue'
    WHEN "title" ILIKE '%warrant%' THEN 'yellow'
    WHEN "title" ILIKE '%inspect%' THEN 'green'
    WHEN "title" ILIKE '%permit%' THEN 'purple'
    WHEN "title" ILIKE '%safety%' THEN 'red'
    ELSE 'gray'
  END
)
WHERE "metadata" IS NULL;

-- Step 7: Add some commonly used tags if they don't exist
UPDATE "company_assets"
SET "tags" = CASE
  WHEN array_length("tags", 1) IS NULL OR array_length("tags", 1) = 0 THEN
    CASE
      WHEN "title" ILIKE '%5-year%' OR "title" ILIKE '%5 year%' THEN ARRAY['warranty', '5-year']::text[]
      WHEN "title" ILIKE '%2-year%' OR "title" ILIKE '%2 year%' THEN ARRAY['warranty', '2-year']::text[]
      WHEN "title" ILIKE '%colorado%' THEN ARRAY['colorado', 'regional']::text[]
      WHEN "title" ILIKE '%roofing%' THEN ARRAY['roofing']::text[]
      WHEN "title" ILIKE '%gutter%' THEN ARRAY['gutters']::text[]
      ELSE ARRAY[]::text[]
    END
  ELSE "tags"
END
WHERE "type" = 'FILE';

-- Step 8: Create a view for easier document querying with full paths
CREATE OR REPLACE VIEW "company_assets_with_path" AS
WITH RECURSIVE asset_path AS (
  -- Base case: root level items
  SELECT 
    id,
    title,
    folder_name,
    type,
    parent_id,
    CAST(CASE 
      WHEN type = 'FOLDER' AND folder_name IS NOT NULL THEN folder_name
      ELSE title
    END AS TEXT) AS full_path,
    0 AS depth
  FROM company_assets
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Recursive case: build path
  SELECT 
    ca.id,
    ca.title,
    ca.folder_name,
    ca.type,
    ca.parent_id,
    CAST(ap.full_path || ' > ' || 
    CASE 
      WHEN ca.type = 'FOLDER' AND ca.folder_name IS NOT NULL THEN ca.folder_name
      ELSE ca.title
    END AS TEXT) AS full_path,
    ap.depth + 1 AS depth
  FROM company_assets ca
  INNER JOIN asset_path ap ON ca.parent_id = ap.id
)
SELECT * FROM asset_path;

-- Step 9: Add comment for documentation
COMMENT ON COLUMN "company_assets"."folder_name" IS 'Human-readable folder name displayed in UI';
COMMENT ON COLUMN "company_assets"."is_public" IS 'Whether the asset is publicly accessible';
COMMENT ON COLUMN "company_assets"."thumbnail_url" IS 'URL to thumbnail preview image';
COMMENT ON COLUMN "company_assets"."checksum" IS 'File checksum for integrity verification';
COMMENT ON COLUMN "company_assets"."metadata" IS 'Flexible JSON metadata (icon, color, custom fields)';
COMMENT ON COLUMN "company_assets"."access_level" IS 'Access control level: public, private, restricted';
COMMENT ON TABLE "company_asset_versions" IS 'Version history for company assets';
