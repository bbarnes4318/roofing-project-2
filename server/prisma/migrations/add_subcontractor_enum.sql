-- Add SUBCONTRACTOR to UserRole enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid  
                   WHERE t.typname = 'user_roles' 
                   AND e.enumlabel = 'SUBCONTRACTOR') THEN
        ALTER TYPE "user_roles" ADD VALUE 'SUBCONTRACTOR';
    END IF;
END $$;

-- Add SUBCONTRACTOR to RoleType enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid  
                   WHERE t.typname = 'role_types' 
                   AND e.enumlabel = 'SUBCONTRACTOR') THEN
        ALTER TYPE "role_types" ADD VALUE 'SUBCONTRACTOR';
    END IF;
END $$;

