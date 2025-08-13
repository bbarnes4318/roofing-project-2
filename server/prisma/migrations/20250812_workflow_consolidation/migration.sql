-- Migration: Consolidate Workflow Systems
-- Purpose: Resolve dual structure conflict between template and instance workflow systems
-- Date: 2025-08-12

-- =====================================================
-- STEP 1: Add linking fields to connect template and instance systems
-- =====================================================

-- Add template reference fields to WorkflowStep
ALTER TABLE workflow_steps
ADD COLUMN IF NOT EXISTS template_phase_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS template_section_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS template_line_item_id VARCHAR(255);

-- Add foreign key constraints for template references
ALTER TABLE workflow_steps
ADD CONSTRAINT fk_workflow_step_template_phase
    FOREIGN KEY (template_phase_id) REFERENCES workflow_phases(id)
    ON DELETE SET NULL,
ADD CONSTRAINT fk_workflow_step_template_section
    FOREIGN KEY (template_section_id) REFERENCES workflow_sections(id)
    ON DELETE SET NULL,
ADD CONSTRAINT fk_workflow_step_template_line_item
    FOREIGN KEY (template_line_item_id) REFERENCES workflow_line_items(id)
    ON DELETE SET NULL;

-- Create indexes for template references
CREATE INDEX IF NOT EXISTS idx_workflow_steps_template_phase 
    ON workflow_steps(template_phase_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_template_section 
    ON workflow_steps(template_section_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_template_line_item 
    ON workflow_steps(template_line_item_id);

-- =====================================================
-- STEP 2: Create unified workflow state tracking
-- =====================================================

-- Add instance reference to tracker
ALTER TABLE project_workflow_trackers
ADD COLUMN IF NOT EXISTS current_step_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS workflow_instance_id VARCHAR(255);

-- Add foreign key constraints
ALTER TABLE project_workflow_trackers
ADD CONSTRAINT fk_tracker_current_step
    FOREIGN KEY (current_step_id) REFERENCES workflow_steps(id)
    ON DELETE SET NULL,
ADD CONSTRAINT fk_tracker_workflow_instance
    FOREIGN KEY (workflow_instance_id) REFERENCES project_workflows(id)
    ON DELETE CASCADE;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_tracker_current_step 
    ON project_workflow_trackers(current_step_id);
CREATE INDEX IF NOT EXISTS idx_tracker_workflow_instance 
    ON project_workflow_trackers(workflow_instance_id);

-- =====================================================
-- STEP 3: Create workflow state consistency function
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_workflow_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- When a workflow step is completed
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        -- Update the project workflow tracker
        UPDATE project_workflow_trackers
        SET 
            current_step_id = NEW.id,
            last_completed_item_id = NEW.template_line_item_id,
            updated_at = NOW()
        WHERE workflow_instance_id = NEW.workflow_id;
        
        -- Record completion in history
        INSERT INTO completed_workflow_items (
            id,
            tracker_id,
            phase_id,
            section_id,
            line_item_id,
            completed_at,
            completed_by_id,
            notes,
            created_at
        )
        SELECT 
            gen_random_uuid(),
            pwt.id,
            NEW.template_phase_id,
            NEW.template_section_id,
            NEW.template_line_item_id,
            NOW(),
            NEW.completed_by_id,
            NEW.completion_notes,
            NOW()
        FROM project_workflow_trackers pwt
        WHERE pwt.workflow_instance_id = NEW.workflow_id;
        
        -- Update project workflow progress
        UPDATE project_workflows
        SET 
            overall_progress = (
                SELECT ROUND(
                    (COUNT(CASE WHEN is_completed = true THEN 1 END)::DECIMAL / 
                     NULLIF(COUNT(*), 0)) * 100
                )::INT
                FROM workflow_steps
                WHERE workflow_id = NEW.workflow_id
            ),
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workflow consistency
DROP TRIGGER IF EXISTS trigger_workflow_consistency ON workflow_steps;
CREATE TRIGGER trigger_workflow_consistency
    AFTER UPDATE OF is_completed ON workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION ensure_workflow_consistency();

-- =====================================================
-- STEP 4: Create phase synchronization function
-- =====================================================

CREATE OR REPLACE FUNCTION sync_project_phase()
RETURNS TRIGGER AS $$
DECLARE
    v_phase_type project_phases;
BEGIN
    -- Get the phase type from the workflow phase
    SELECT phase_type INTO v_phase_type
    FROM workflow_phases
    WHERE id = NEW.current_phase_id;
    
    -- Update the project phase (if it exists)
    UPDATE projects
    SET 
        phase = v_phase_type,
        updated_at = NOW()
    WHERE id = NEW.project_id;
    
    -- Update the workflow step phase
    UPDATE workflow_steps ws
    SET 
        phase = v_phase_type,
        updated_at = NOW()
    FROM project_workflows pw
    WHERE pw.project_id = NEW.project_id
    AND ws.workflow_id = pw.id
    AND ws.id = NEW.current_step_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for phase synchronization
DROP TRIGGER IF EXISTS trigger_sync_phase ON project_workflow_trackers;
CREATE TRIGGER trigger_sync_phase
    AFTER UPDATE OF current_phase_id ON project_workflow_trackers
    FOR EACH ROW
    EXECUTE FUNCTION sync_project_phase();

-- =====================================================
-- STEP 5: Add state machine constraints
-- =====================================================

-- Create workflow state enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_state') THEN
        CREATE TYPE workflow_state AS ENUM (
            'PENDING',
            'ACTIVE',
            'IN_PROGRESS',
            'BLOCKED',
            'COMPLETED',
            'SKIPPED'
        );
    END IF;
END $$;

-- Add state field to workflow steps
ALTER TABLE workflow_steps
ADD COLUMN IF NOT EXISTS state workflow_state DEFAULT 'PENDING';

-- Create state transition validation function
CREATE OR REPLACE FUNCTION validate_workflow_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Define valid state transitions
    IF OLD.state = 'COMPLETED' AND NEW.state != 'COMPLETED' THEN
        RAISE EXCEPTION 'Cannot transition from COMPLETED state to %', NEW.state;
    END IF;
    
    IF OLD.state = 'SKIPPED' AND NEW.state NOT IN ('ACTIVE', 'COMPLETED') THEN
        RAISE EXCEPTION 'Invalid transition from SKIPPED to %', NEW.state;
    END IF;
    
    IF NEW.state = 'IN_PROGRESS' AND NEW.assigned_to_id IS NULL THEN
        RAISE EXCEPTION 'Cannot set state to IN_PROGRESS without assignment';
    END IF;
    
    -- Update completion status based on state
    IF NEW.state = 'COMPLETED' THEN
        NEW.is_completed := true;
        NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for state validation
DROP TRIGGER IF EXISTS trigger_validate_state ON workflow_steps;
CREATE TRIGGER trigger_validate_state
    BEFORE UPDATE OF state ON workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION validate_workflow_state_transition();

-- =====================================================
-- STEP 6: Create workflow progression function
-- =====================================================

CREATE OR REPLACE FUNCTION progress_to_next_workflow_step(
    p_project_id VARCHAR(255),
    p_completed_step_id VARCHAR(255)
) RETURNS TABLE (
    next_step_id VARCHAR(255),
    next_phase_name VARCHAR(255),
    next_section_name VARCHAR(255),
    next_line_item_name VARCHAR(255)
) AS $$
DECLARE
    v_workflow_id VARCHAR(255);
    v_next_step RECORD;
BEGIN
    -- Get the workflow ID for the project
    SELECT id INTO v_workflow_id
    FROM project_workflows
    WHERE project_id = p_project_id;
    
    -- Mark current step as completed
    UPDATE workflow_steps
    SET 
        state = 'COMPLETED',
        is_completed = true,
        completed_at = NOW()
    WHERE id = p_completed_step_id;
    
    -- Find the next incomplete step
    SELECT 
        ws.id,
        wp.phase_name,
        wsc.section_name,
        wli.item_name
    INTO v_next_step
    FROM workflow_steps ws
    LEFT JOIN workflow_phases wp ON ws.template_phase_id = wp.id
    LEFT JOIN workflow_sections wsc ON ws.template_section_id = wsc.id
    LEFT JOIN workflow_line_items wli ON ws.template_line_item_id = wli.id
    WHERE ws.workflow_id = v_workflow_id
    AND ws.is_completed = false
    AND ws.state != 'SKIPPED'
    ORDER BY ws.step_order
    LIMIT 1;
    
    -- Update the next step to active
    IF v_next_step.id IS NOT NULL THEN
        UPDATE workflow_steps
        SET state = 'ACTIVE'
        WHERE id = v_next_step.id;
        
        -- Update tracker
        UPDATE project_workflow_trackers
        SET 
            current_step_id = v_next_step.id,
            updated_at = NOW()
        WHERE project_id = p_project_id;
    END IF;
    
    RETURN QUERY SELECT 
        v_next_step.id,
        v_next_step.phase_name,
        v_next_step.section_name,
        v_next_step.item_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: Create data migration to populate template references
-- =====================================================

-- This will link existing workflow steps to their template counterparts
DO $$
DECLARE
    rec RECORD;
    v_phase_id VARCHAR(255);
    v_section_id VARCHAR(255);
    v_line_item_id VARCHAR(255);
BEGIN
    FOR rec IN 
        SELECT 
            ws.id,
            ws.step_id,
            ws.step_name,
            ws.phase,
            ws.workflow_id
        FROM workflow_steps ws
        WHERE ws.template_phase_id IS NULL
    LOOP
        -- Try to match with template based on phase
        SELECT id INTO v_phase_id
        FROM workflow_phases
        WHERE phase_type = rec.phase
        LIMIT 1;
        
        -- Try to match section by name pattern
        SELECT id INTO v_section_id
        FROM workflow_sections
        WHERE phase_id = v_phase_id
        AND rec.step_name ILIKE '%' || section_name || '%'
        LIMIT 1;
        
        -- Try to match line item
        SELECT id INTO v_line_item_id
        FROM workflow_line_items
        WHERE section_id = v_section_id
        AND rec.step_name ILIKE '%' || item_name || '%'
        LIMIT 1;
        
        -- Update the workflow step with template references
        UPDATE workflow_steps
        SET 
            template_phase_id = v_phase_id,
            template_section_id = v_section_id,
            template_line_item_id = v_line_item_id
        WHERE id = rec.id;
    END LOOP;
END $$;

-- =====================================================
-- STEP 8: Add workflow version tracking
-- =====================================================

ALTER TABLE workflow_phases
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

ALTER TABLE workflow_sections
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

ALTER TABLE workflow_line_items
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

-- =====================================================
-- STEP 9: Create workflow audit table
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_audit_log (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMP DEFAULT NOW(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(255),
    project_id VARCHAR(255),
    workflow_id VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id) REFERENCES project_workflows(id) ON DELETE CASCADE
);

CREATE INDEX idx_workflow_audit_entity ON workflow_audit_log(entity_type, entity_id);
CREATE INDEX idx_workflow_audit_project ON workflow_audit_log(project_id);
CREATE INDEX idx_workflow_audit_created ON workflow_audit_log(created_at DESC);

-- =====================================================
-- STEP 10: Create comprehensive view for workflow status
-- =====================================================

CREATE OR REPLACE VIEW workflow_status_view AS
SELECT 
    p.id AS project_id,
    p.project_number,
    p.project_name,
    pw.id AS workflow_id,
    pw.workflow_type,
    pw.status AS workflow_status,
    pw.overall_progress,
    pwt.id AS tracker_id,
    wp.phase_name AS current_phase,
    wp.phase_type AS current_phase_type,
    wsc.section_name AS current_section,
    wli.item_name AS current_line_item,
    ws.id AS current_step_id,
    ws.step_name AS current_step_name,
    ws.state AS current_step_state,
    ws.assigned_to_id,
    u.first_name || ' ' || u.last_name AS assigned_to_name,
    ws.scheduled_start_date,
    ws.scheduled_end_date,
    (
        SELECT COUNT(*) 
        FROM workflow_steps 
        WHERE workflow_id = pw.id AND is_completed = true
    ) AS completed_steps,
    (
        SELECT COUNT(*) 
        FROM workflow_steps 
        WHERE workflow_id = pw.id
    ) AS total_steps
FROM projects p
LEFT JOIN project_workflows pw ON p.id = pw.project_id
LEFT JOIN project_workflow_trackers pwt ON p.id = pwt.project_id
LEFT JOIN workflow_phases wp ON pwt.current_phase_id = wp.id
LEFT JOIN workflow_sections wsc ON pwt.current_section_id = wsc.id
LEFT JOIN workflow_line_items wli ON pwt.current_line_item_id = wli.id
LEFT JOIN workflow_steps ws ON pwt.current_step_id = ws.id
LEFT JOIN users u ON ws.assigned_to_id = u.id;

-- Create index on the view's base tables for performance
CREATE INDEX IF NOT EXISTS idx_workflow_status_lookup 
    ON project_workflows(project_id, id);

-- =====================================================
-- FINAL: Add comments for documentation
-- =====================================================

COMMENT ON TABLE workflow_steps IS 'Instance of workflow tasks for specific projects. Links to template system via template_*_id fields';
COMMENT ON TABLE project_workflow_trackers IS 'Single source of truth for current workflow position. Tracks both template and instance positions';
COMMENT ON COLUMN workflow_steps.template_phase_id IS 'Reference to workflow template phase';
COMMENT ON COLUMN workflow_steps.template_section_id IS 'Reference to workflow template section';
COMMENT ON COLUMN workflow_steps.template_line_item_id IS 'Reference to workflow template line item';
COMMENT ON COLUMN workflow_steps.state IS 'Current state in workflow state machine';
COMMENT ON FUNCTION ensure_workflow_consistency() IS 'Maintains consistency between template and instance workflow systems';
COMMENT ON FUNCTION sync_project_phase() IS 'Synchronizes phase across all related tables when tracker updates';
COMMENT ON FUNCTION progress_to_next_workflow_step(VARCHAR, VARCHAR) IS 'Progresses workflow to next step and returns next step details';