-- Add displayName column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "displayName" VARCHAR(255);

