-- CreateEnum
CREATE TYPE "workflow_roles" AS ENUM ('OFFICE', 'ADMIN', 'PROJECT_MANAGER', 'FIELD_CREW', 'ROOF_SUPERVISOR', 'FIELD_DIRECTOR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "workflow_assignment" "workflow_roles" NOT NULL DEFAULT 'OFFICE';
