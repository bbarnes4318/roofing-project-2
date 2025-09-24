-- Idempotent patch to add Lead Sources support without resetting DB or migration history
-- Safe to run multiple times.

-- 1) Create lead_sources table if it does not exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'lead_sources' AND table_schema = 'public'
  ) THEN
    CREATE TABLE public.lead_sources (
      id TEXT PRIMARY KEY,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      name VARCHAR(100) UNIQUE NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true
    );
  END IF;
END $$;

-- 2) Add lead_source_id column to projects if it does not exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'lead_source_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN lead_source_id TEXT;
  END IF;
END $$;

-- 3) Add FK from projects.lead_source_id -> lead_sources(id) if it does not exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'projects'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'lead_source_id'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_lead_source_id_fkey
      FOREIGN KEY (lead_source_id)
      REFERENCES public.lead_sources(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Optional: index for faster lookups on lead_sources.name
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'lead_sources_name_idx' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX lead_sources_name_idx ON public.lead_sources(name);
  END IF;
END $$;
