-- Add phone and email type fields to customers table
-- This migration adds the new fields for phone/email type categorization
-- NOTE: Column names use camelCase to match existing database convention

ALTER TABLE "customers" 
ADD COLUMN IF NOT EXISTS "primaryEmailType" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "primaryPhoneType" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "secondaryEmailType" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "secondaryPhoneType" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "primaryPhoneContact" VARCHAR(20);

-- Set default values for existing records
UPDATE "customers" 
SET 
  "primaryEmailType" = COALESCE("primaryEmailType", 'PERSONAL'),
  "primaryPhoneType" = COALESCE("primaryPhoneType", 'MOBILE'),
  "secondaryEmailType" = COALESCE("secondaryEmailType", 'PERSONAL'),
  "secondaryPhoneType" = COALESCE("secondaryPhoneType", 'MOBILE'),
  "primaryPhoneContact" = COALESCE("primaryPhoneContact", 'PRIMARY')
WHERE 
  "primaryEmailType" IS NULL 
  OR "primaryPhoneType" IS NULL 
  OR "secondaryEmailType" IS NULL 
  OR "secondaryPhoneType" IS NULL 
  OR "primaryPhoneContact" IS NULL;

