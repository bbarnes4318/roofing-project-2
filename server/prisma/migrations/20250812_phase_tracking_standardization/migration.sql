-- Migration: Standardize Phase Tracking
-- Purpose: Make ProjectWorkflowTracker the single source of truth for phase tracking
-- Date: 2025-08-12

-- =====================================================
-- STEP 1: Backup current phase data before migration
-- =====================================================

CREATE TABLE IF NOT EXISTS phase_migration_backup (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    project_id VARCHAR(255),
    project_phase project_phases,
    tracker_phase_id VARCHAR(255),
    workflow_step_phases JSONB
);

-- Backup current phase data
INSERT INTO phase_migration_backup (project_id, project_phase, tracker_phase_id, workflow_step_phases)
SELECT 
    p.id,
    p.phase,
    pwt.current_phase_id,
    jsonb_agg(
        jsonb_build_object(
            'step_id', ws.id,
            'step_phase', ws.phase
        )
    ) AS workflow_step_phases
FROM projects p
LEFT JOIN project_workflow_trackers pwt ON p.id = pwt.project_id
LEFT JOIN project_workflows pw ON p.id = pw.project_id
LEFT JOIN workflow_steps ws ON pw.id = ws.workflow_id
GROUP BY p.id, p.phase, pwt.current_phase_id;

-- =====================================================
-- STEP 2: Ensure all projects have workflow trackers
-- =====================================================

-- Create missing workflow trackers
INSERT INTO project_workflow_trackers (
    id,
    created_at,
    updated_at,
    project_id,
    current_phase_id,
    current_section_id,
    current_line_item_id,
    phase_started_at
)
SELECT 
    gen_random_uuid()::text,
    NOW(),
    NOW(),
    p.id,
    wp.id,
    NULL,
    NULL,
    p.created_at
FROM projects p
LEFT JOIN project_workflow_trackers pwt ON p.id = pwt.project_id
LEFT JOIN workflow_phases wp ON wp.phase_type = COALESCE(p.phase, 'LEAD')
WHERE pwt.id IS NULL;

-- =====================================================
-- STEP 3: Sync tracker phase with project phase where needed
-- =====================================================

UPDATE project_workflow_trackers pwt
SET 
    current_phase_id = wp.id,
    updated_at = NOW()
FROM projects p
JOIN workflow_phases wp ON wp.phase_type = p.phase
WHERE pwt.project_id = p.id
AND pwt.current_phase_id IS NULL
AND p.phase IS NOT NULL;

-- =====================================================
-- STEP 4: Create function to get current phase
-- =====================================================

CREATE OR REPLACE FUNCTION get_project_phase(p_project_id VARCHAR(255))
RETURNS project_phases AS $$
DECLARE
    v_phase project_phases;
BEGIN
    SELECT wp.phase_type INTO v_phase
    FROM project_workflow_trackers pwt
    JOIN workflow_phases wp ON pwt.current_phase_id = wp.id
    WHERE pwt.project_id = p_project_id;
    
    RETURN COALESCE(v_phase, 'LEAD');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- STEP 5: Create computed column view for projects
-- =====================================================

CREATE OR REPLACE VIEW projects_with_phase AS
SELECT 
    p.*,
    wp.phase_type AS current_phase,
    wp.phase_name AS current_phase_name,
    pwt.current_phase_id,
    pwt.current_section_id,
    pwt.current_line_item_id,
    pwt.phase_started_at,
    pwt.section_started_at,
    pwt.line_item_started_at
FROM projects p
LEFT JOIN project_workflow_trackers pwt ON p.id = pwt.project_id
LEFT JOIN workflow_phases wp ON pwt.current_phase_id = wp.id;

-- =====================================================
-- STEP 6: Create triggers to prevent direct phase updates
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_direct_phase_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.phase IS DISTINCT FROM NEW.phase THEN
        RAISE WARNING 'Direct phase update attempted on project %. Phase should be updated through workflow tracker.', NEW.id;
        -- For now, we'll sync it with the tracker instead of blocking
        UPDATE project_workflow_trackers
        SET 
            current_phase_id = (
                SELECT id FROM workflow_phases WHERE phase_type = NEW.phase LIMIT 1
            ),
            updated_at = NOW()
        WHERE project_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_phase_update
    BEFORE UPDATE OF phase ON projects
    FOR EACH ROW
    EXECUTE FUNCTION prevent_direct_phase_update();

-- =====================================================
-- STEP 7: Create phase transition tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS phase_transitions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMP DEFAULT NOW(),
    project_id VARCHAR(255) NOT NULL,
    from_phase project_phases,
    to_phase project_phases NOT NULL,
    from_phase_id VARCHAR(255),
    to_phase_id VARCHAR(255) NOT NULL,
    transition_reason VARCHAR(500),
    transitioned_by VARCHAR(255),
    is_override BOOLEAN DEFAULT false,
    override_id VARCHAR(255),
    duration_minutes INT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (from_phase_id) REFERENCES workflow_phases(id) ON DELETE SET NULL,
    FOREIGN KEY (to_phase_id) REFERENCES workflow_phases(id) ON DELETE CASCADE,
    FOREIGN KEY (transitioned_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (override_id) REFERENCES project_phase_overrides(id) ON DELETE SET NULL
);

CREATE INDEX idx_phase_transitions_project ON phase_transitions(project_id, created_at DESC);
CREATE INDEX idx_phase_transitions_phases ON phase_transitions(from_phase, to_phase);

-- =====================================================
-- STEP 8: Create function to track phase transitions
-- =====================================================

CREATE OR REPLACE FUNCTION track_phase_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_old_phase project_phases;
    v_new_phase project_phases;
    v_duration INT;
BEGIN
    IF OLD.current_phase_id IS DISTINCT FROM NEW.current_phase_id THEN
        -- Get phase types
        SELECT phase_type INTO v_old_phase
        FROM workflow_phases
        WHERE id = OLD.current_phase_id;
        
        SELECT phase_type INTO v_new_phase
        FROM workflow_phases
        WHERE id = NEW.current_phase_id;
        
        -- Calculate duration in old phase
        IF OLD.phase_started_at IS NOT NULL THEN
            v_duration := EXTRACT(EPOCH FROM (NOW() - OLD.phase_started_at)) / 60;
        END IF;
        
        -- Record transition
        INSERT INTO phase_transitions (
            project_id,
            from_phase,
            to_phase,
            from_phase_id,
            to_phase_id,
            duration_minutes,
            created_at
        ) VALUES (
            NEW.project_id,
            v_old_phase,
            v_new_phase,
            OLD.current_phase_id,
            NEW.current_phase_id,
            v_duration,
            NOW()
        );
        
        -- Update phase started time
        NEW.phase_started_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_phase_transition
    BEFORE UPDATE OF current_phase_id ON project_workflow_trackers
    FOR EACH ROW
    EXECUTE FUNCTION track_phase_transition();

-- =====================================================
-- STEP 9: Update workflow steps phase synchronization
-- =====================================================

CREATE OR REPLACE FUNCTION sync_workflow_step_phases()
RETURNS TRIGGER AS $$
DECLARE
    v_phase project_phases;
BEGIN
    -- Get the phase from the tracker
    SELECT wp.phase_type INTO v_phase
    FROM workflow_phases wp
    WHERE wp.id = NEW.current_phase_id;
    
    -- Update all incomplete workflow steps to match the current phase
    UPDATE workflow_steps ws
    SET 
        phase = v_phase,
        updated_at = NOW()
    FROM project_workflows pw
    WHERE pw.project_id = NEW.project_id
    AND ws.workflow_id = pw.id
    AND ws.is_completed = false
    AND ws.phase != v_phase;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_step_phases
    AFTER UPDATE OF current_phase_id ON project_workflow_trackers
    FOR EACH ROW
    EXECUTE FUNCTION sync_workflow_step_phases();

-- =====================================================
-- STEP 10: Create phase validation rules
-- =====================================================

CREATE OR REPLACE FUNCTION validate_phase_progression()
RETURNS TRIGGER AS $$
DECLARE
    v_old_order INT;
    v_new_order INT;
    v_has_override BOOLEAN;
BEGIN
    -- Get phase orders
    SELECT display_order INTO v_old_order
    FROM workflow_phases
    WHERE id = OLD.current_phase_id;
    
    SELECT display_order INTO v_new_order
    FROM workflow_phases
    WHERE id = NEW.current_phase_id;
    
    -- Check for active override
    SELECT EXISTS(
        SELECT 1 
        FROM project_phase_overrides 
        WHERE project_id = NEW.project_id 
        AND is_active = true
    ) INTO v_has_override;
    
    -- Validate progression (allow backward movement only with override)
    IF v_new_order < v_old_order AND NOT v_has_override THEN
        RAISE WARNING 'Backward phase progression requires override. Project: %', NEW.project_id;
        -- Log this as a potential issue
        INSERT INTO workflow_audit_log (
            entity_type,
            entity_id,
            action,
            old_values,
            new_values,
            project_id,
            notes
        ) VALUES (
            'phase_tracker',
            NEW.id,
            'backward_progression_attempted',
            jsonb_build_object('phase_id', OLD.current_phase_id, 'order', v_old_order),
            jsonb_build_object('phase_id', NEW.current_phase_id, 'order', v_new_order),
            NEW.project_id,
            'Backward phase progression attempted without override'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_phase_progression
    BEFORE UPDATE OF current_phase_id ON project_workflow_trackers
    FOR EACH ROW
    EXECUTE FUNCTION validate_phase_progression();

-- =====================================================
-- STEP 11: Create helper functions for phase operations
-- =====================================================

-- Function to advance to next phase
CREATE OR REPLACE FUNCTION advance_to_next_phase(
    p_project_id VARCHAR(255),
    p_user_id VARCHAR(255) DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    new_phase_id VARCHAR(255),
    new_phase_name VARCHAR(255),
    message TEXT
) AS $$
DECLARE
    v_current_phase_id VARCHAR(255);
    v_next_phase RECORD;
BEGIN
    -- Get current phase
    SELECT current_phase_id INTO v_current_phase_id
    FROM project_workflow_trackers
    WHERE project_id = p_project_id;
    
    -- Get next phase
    SELECT 
        wp.id,
        wp.phase_name,
        wp.phase_type
    INTO v_next_phase
    FROM workflow_phases wp
    WHERE wp.display_order > (
        SELECT display_order 
        FROM workflow_phases 
        WHERE id = v_current_phase_id
    )
    AND wp.is_active = true
    ORDER BY wp.display_order
    LIMIT 1;
    
    IF v_next_phase.id IS NOT NULL THEN
        -- Update tracker
        UPDATE project_workflow_trackers
        SET 
            current_phase_id = v_next_phase.id,
            current_section_id = NULL,
            current_line_item_id = NULL,
            updated_at = NOW()
        WHERE project_id = p_project_id;
        
        -- Log the transition
        INSERT INTO workflow_audit_log (
            entity_type,
            entity_id,
            action,
            project_id,
            user_id,
            new_values
        ) VALUES (
            'phase',
            v_next_phase.id,
            'phase_advanced',
            p_project_id,
            p_user_id,
            jsonb_build_object(
                'phase_id', v_next_phase.id,
                'phase_name', v_next_phase.phase_name
            )
        );
        
        RETURN QUERY SELECT 
            true,
            v_next_phase.id,
            v_next_phase.phase_name,
            'Successfully advanced to ' || v_next_phase.phase_name;
    ELSE
        RETURN QUERY SELECT 
            false,
            NULL::VARCHAR(255),
            NULL::VARCHAR(255),
            'No next phase available. Project may be complete.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get phase statistics
CREATE OR REPLACE FUNCTION get_phase_statistics(p_project_id VARCHAR(255))
RETURNS TABLE (
    phase_id VARCHAR(255),
    phase_name VARCHAR(255),
    phase_type project_phases,
    time_in_phase_minutes INT,
    completed_items INT,
    total_items INT,
    completion_percentage INT
) AS $$
BEGIN
    RETURN QUERY
    WITH phase_stats AS (
        SELECT 
            wp.id,
            wp.phase_name,
            wp.phase_type,
            pt.duration_minutes,
            COUNT(DISTINCT cwi.id) AS completed_items,
            COUNT(DISTINCT wli.id) AS total_items
        FROM workflow_phases wp
        LEFT JOIN phase_transitions pt ON pt.to_phase_id = wp.id 
            AND pt.project_id = p_project_id
        LEFT JOIN workflow_sections ws ON ws.phase_id = wp.id
        LEFT JOIN workflow_line_items wli ON wli.section_id = ws.id
        LEFT JOIN project_workflow_trackers pwt ON pwt.project_id = p_project_id
        LEFT JOIN completed_workflow_items cwi ON cwi.tracker_id = pwt.id 
            AND cwi.phase_id = wp.id
        WHERE wp.is_active = true
        GROUP BY wp.id, wp.phase_name, wp.phase_type, pt.duration_minutes
    )
    SELECT 
        id,
        phase_name,
        phase_type,
        COALESCE(duration_minutes, 0)::INT,
        completed_items::INT,
        total_items::INT,
        CASE 
            WHEN total_items > 0 
            THEN (completed_items * 100 / total_items)::INT
            ELSE 0 
        END AS completion_percentage
    FROM phase_stats
    ORDER BY (SELECT display_order FROM workflow_phases WHERE id = phase_stats.id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 12: Deprecate Project.phase field
-- =====================================================

-- Add deprecation notice
COMMENT ON COLUMN projects.phase IS 'DEPRECATED: Use project_workflow_trackers.current_phase_id instead. This field will be removed in future migration.';

-- Create deprecation warning trigger
CREATE OR REPLACE FUNCTION warn_deprecated_phase_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        RAISE WARNING 'Direct access to projects.phase is deprecated. Use project_workflow_trackers for phase tracking.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warn_phase_usage
    BEFORE INSERT OR UPDATE OF phase ON projects
    FOR EACH ROW
    EXECUTE FUNCTION warn_deprecated_phase_usage();

-- =====================================================
-- FINAL: Add indexes and documentation
-- =====================================================

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_tracker_phase_lookup 
    ON project_workflow_trackers(project_id, current_phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_transitions_lookup 
    ON phase_transitions(project_id, to_phase);

-- Add documentation
COMMENT ON TABLE project_workflow_trackers IS 'Single source of truth for project workflow position and phase tracking';
COMMENT ON TABLE phase_transitions IS 'Historical record of all phase transitions for analytics and auditing';
COMMENT ON FUNCTION get_project_phase(VARCHAR) IS 'Get current phase for a project from the workflow tracker';
COMMENT ON FUNCTION advance_to_next_phase(VARCHAR, VARCHAR) IS 'Safely advance project to next workflow phase';
COMMENT ON FUNCTION get_phase_statistics(VARCHAR) IS 'Get comprehensive phase statistics for a project';
COMMENT ON VIEW projects_with_phase IS 'Projects with computed current phase from workflow tracker';