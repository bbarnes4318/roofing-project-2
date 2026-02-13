-- Add CUSTOM to workflow_types enum
ALTER TYPE "workflow_types" ADD VALUE IF NOT EXISTS 'CUSTOM';

-- Create custom_workflows table
CREATE TABLE IF NOT EXISTS "custom_workflows" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "created_by_id" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "custom_workflows_pkey" PRIMARY KEY ("id")
);

-- Add custom_workflow_id to workflow_phases  
ALTER TABLE "workflow_phases" ADD COLUMN IF NOT EXISTS "custom_workflow_id" TEXT;

-- Make phaseType nullable for custom phases
ALTER TABLE "workflow_phases" ALTER COLUMN "phaseType" DROP NOT NULL;

-- Add parent_id to workflow_line_items for sub-items
ALTER TABLE "workflow_line_items" ADD COLUMN IF NOT EXISTS "parent_id" TEXT;

-- Add custom_workflow_id to project_workflow_trackers
ALTER TABLE "project_workflow_trackers" ADD COLUMN IF NOT EXISTS "custom_workflow_id" TEXT;

-- Drop old unique constraint and add new one with customWorkflowId
ALTER TABLE "project_workflow_trackers" DROP CONSTRAINT IF EXISTS "project_workflow_trackers_project_id_workflowType_key";
CREATE UNIQUE INDEX IF NOT EXISTS "project_workflow_trackers_project_id_workflowType_custom_workflow_id_key" 
  ON "project_workflow_trackers"("project_id", "workflowType", "custom_workflow_id");

-- Add foreign keys
ALTER TABLE "custom_workflows" ADD CONSTRAINT "custom_workflows_created_by_id_fkey" 
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_phases" ADD CONSTRAINT "workflow_phases_custom_workflow_id_fkey" 
  FOREIGN KEY ("custom_workflow_id") REFERENCES "custom_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_line_items" ADD CONSTRAINT "workflow_line_items_parent_id_fkey" 
  FOREIGN KEY ("parent_id") REFERENCES "workflow_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_workflow_trackers" ADD CONSTRAINT "project_workflow_trackers_custom_workflow_id_fkey" 
  FOREIGN KEY ("custom_workflow_id") REFERENCES "custom_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "custom_workflows_created_by_id_idx" ON "custom_workflows"("created_by_id");
CREATE INDEX IF NOT EXISTS "workflow_phases_custom_workflow_id_idx" ON "workflow_phases"("custom_workflow_id");
CREATE INDEX IF NOT EXISTS "workflow_line_items_parent_id_idx" ON "workflow_line_items"("parent_id");
CREATE INDEX IF NOT EXISTS "project_workflow_trackers_custom_workflow_id_idx" ON "project_workflow_trackers"("custom_workflow_id");
