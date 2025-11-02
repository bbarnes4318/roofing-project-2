-- Migration: Add Family Members Table
-- Created: 2025-01-XX
-- Description: Adds family_members table to store family member information for customers

-- Create family_members table
CREATE TABLE IF NOT EXISTS "family_members" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "customer_id" TEXT NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- Create index on customer_id for faster lookups
CREATE INDEX IF NOT EXISTS "family_members_customer_id_idx" ON "family_members"("customer_id");

-- Add foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'family_members_customer_id_fkey'
    ) THEN
        ALTER TABLE "family_members" 
        ADD CONSTRAINT "family_members_customer_id_fkey" 
        FOREIGN KEY ("customer_id") 
        REFERENCES "customers"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Add comment to table
COMMENT ON TABLE "family_members" IS 'Stores family member information for customers, including name and relation (e.g., Spouse, Child, etc.)';

