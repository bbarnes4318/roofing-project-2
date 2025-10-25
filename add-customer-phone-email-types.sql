-- Add phone and email type fields to customers table
-- This migration adds the new fields for phone/email type categorization

ALTER TABLE customers 
ADD COLUMN primary_email_type VARCHAR(20) DEFAULT 'PERSONAL',
ADD COLUMN primary_phone_type VARCHAR(20) DEFAULT 'MOBILE',
ADD COLUMN secondary_email_type VARCHAR(20) DEFAULT 'PERSONAL',
ADD COLUMN secondary_phone_type VARCHAR(20) DEFAULT 'MOBILE',
ADD COLUMN primary_phone_contact VARCHAR(20) DEFAULT 'PRIMARY';

-- Add comments to document the field purposes
COMMENT ON COLUMN customers.primary_email_type IS 'Type of primary email: PERSONAL or WORK';
COMMENT ON COLUMN customers.primary_phone_type IS 'Type of primary phone: MOBILE, HOME, or WORK';
COMMENT ON COLUMN customers.secondary_email_type IS 'Type of secondary email: PERSONAL or WORK';
COMMENT ON COLUMN customers.secondary_phone_type IS 'Type of secondary phone: MOBILE, HOME, or WORK';
COMMENT ON COLUMN customers.primary_phone_contact IS 'Which phone is primary: PRIMARY or SECONDARY';

-- Update existing records to have default values
UPDATE customers 
SET 
  primary_email_type = 'PERSONAL',
  primary_phone_type = 'MOBILE',
  secondary_email_type = 'PERSONAL',
  secondary_phone_type = 'MOBILE',
  primary_phone_contact = 'PRIMARY'
WHERE 
  primary_email_type IS NULL 
  OR primary_phone_type IS NULL 
  OR secondary_email_type IS NULL 
  OR secondary_phone_type IS NULL 
  OR primary_phone_contact IS NULL;
