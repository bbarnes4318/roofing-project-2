-- Add trash system fields to company_assets table
-- This migration adds soft delete functionality with 90-day retention

-- Add new columns for trash system
ALTER TABLE company_assets 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN deleted_by_id VARCHAR(255) NULL,
ADD COLUMN trash_expiry_date TIMESTAMP NULL;

-- Add foreign key constraint for deleted_by_id
ALTER TABLE company_assets 
ADD CONSTRAINT fk_company_assets_deleted_by 
FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_company_assets_trash ON company_assets (is_deleted, trash_expiry_date);
CREATE INDEX idx_company_assets_deleted_at ON company_assets (deleted_at);

-- Add comments to document the field purposes
COMMENT ON COLUMN company_assets.is_deleted IS 'Flag indicating if the asset is in trash';
COMMENT ON COLUMN company_assets.deleted_at IS 'Timestamp when the asset was moved to trash';
COMMENT ON COLUMN company_assets.deleted_by_id IS 'User who deleted the asset';
COMMENT ON COLUMN company_assets.trash_expiry_date IS 'Date when the asset will be permanently deleted (90 days after deletion)';

-- Update existing records to have default values
UPDATE company_assets 
SET 
  is_deleted = FALSE,
  deleted_at = NULL,
  deleted_by_id = NULL,
  trash_expiry_date = NULL
WHERE 
  is_deleted IS NULL 
  OR deleted_at IS NULL 
  OR deleted_by_id IS NULL 
  OR trash_expiry_date IS NULL;
