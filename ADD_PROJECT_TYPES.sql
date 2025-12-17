-- Safe migration to add new ProjectType enum values
-- Run these one at a time in your database client
-- Each line will fail silently if the value already exists, which is fine

-- Add new ProjectType enum values (project_types)
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'WATER_LEAK';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'MOLD';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'DECKS';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'REPAIR_EXTERIOR';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'REPAIR_INTERIOR';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'WINDOWS';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'SIDING';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'FENCE';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'KITCHEN_REMODEL';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'BATHROOM_RENOVATION';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'FLOORING';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'PAINTING';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'ELECTRICAL_WORK';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'PLUMBING';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'HVAC';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'LANDSCAPING';
ALTER TYPE project_types ADD VALUE IF NOT EXISTS 'OTHER';

-- Add new WorkflowType enum values (workflow_types)
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'WATER_LEAK';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'MOLD';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'DECKS';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'REPAIR_EXTERIOR';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'REPAIR_INTERIOR';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'FENCE';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'FLOORING';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'PAINTING';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'ELECTRICAL_WORK';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'PLUMBING';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'HVAC';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'LANDSCAPING';
ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS 'OTHER';

-- Verify the changes
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_types') ORDER BY enumsortorder;
