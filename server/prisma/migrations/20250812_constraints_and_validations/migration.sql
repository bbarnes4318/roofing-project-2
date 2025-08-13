-- Migration: Add Missing Constraints and Validations
-- Purpose: Implement business logic constraints, data integrity checks, and validation rules
-- Date: 2025-08-12

-- =====================================================
-- STEP 1: Circular Dependency Prevention
-- =====================================================

-- Function to check for circular task dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency(
    p_parent_task_id VARCHAR(255),
    p_dependent_task_id VARCHAR(255)
) RETURNS BOOLEAN AS $$
DECLARE
    v_visited VARCHAR(255)[];
    v_current VARCHAR(255);
    v_queue VARCHAR(255)[];
BEGIN
    -- Initialize queue with the dependent task
    v_queue := ARRAY[p_dependent_task_id];
    v_visited := ARRAY[]::VARCHAR(255)[];
    
    WHILE array_length(v_queue, 1) > 0 LOOP
        -- Dequeue first element
        v_current := v_queue[1];
        v_queue := v_queue[2:];
        
        -- Check if we've reached the parent (circular dependency)
        IF v_current = p_parent_task_id THEN
            RETURN true; -- Circular dependency found
        END IF;
        
        -- Skip if already visited
        IF v_current = ANY(v_visited) THEN
            CONTINUE;
        END IF;
        
        -- Mark as visited
        v_visited := v_visited || v_current;
        
        -- Add all dependencies of current task to queue
        v_queue := v_queue || ARRAY(
            SELECT dependent_task_id 
            FROM task_dependencies 
            WHERE parent_task_id = v_current
        );
    END LOOP;
    
    RETURN false; -- No circular dependency
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependencies()
RETURNS TRIGGER AS $$
BEGIN
    IF check_circular_dependency(NEW.parent_task_id, NEW.dependent_task_id) THEN
        RAISE EXCEPTION 'Circular dependency detected between tasks % and %', 
            NEW.parent_task_id, NEW.dependent_task_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_circular_dependencies
    BEFORE INSERT OR UPDATE ON task_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION prevent_circular_dependencies();

-- =====================================================
-- STEP 2: Workflow Step Index Validation
-- =====================================================

-- Function to validate current step index matches actual step count
CREATE OR REPLACE FUNCTION validate_workflow_step_index()
RETURNS TRIGGER AS $$
DECLARE
    v_step_count INT;
    v_completed_count INT;
BEGIN
    -- Count total steps for this workflow
    SELECT COUNT(*) INTO v_step_count
    FROM workflow_steps
    WHERE workflow_id = NEW.id;
    
    -- Count completed steps
    SELECT COUNT(*) INTO v_completed_count
    FROM workflow_steps
    WHERE workflow_id = NEW.id AND is_completed = true;
    
    -- Validate current step index
    IF NEW.current_step_index < 0 OR NEW.current_step_index > v_step_count THEN
        RAISE EXCEPTION 'Invalid current_step_index %. Must be between 0 and %', 
            NEW.current_step_index, v_step_count;
    END IF;
    
    -- Update overall progress based on completed steps
    IF v_step_count > 0 THEN
        NEW.overall_progress := ROUND((v_completed_count::DECIMAL / v_step_count) * 100)::INT;
    ELSE
        NEW.overall_progress := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_workflow_step_index
    BEFORE UPDATE OF current_step_index ON project_workflows
    FOR EACH ROW
    EXECUTE FUNCTION validate_workflow_step_index();

-- =====================================================
-- STEP 3: JSON Schema Validation
-- =====================================================

-- Function to validate notification preferences JSON schema
CREATE OR REPLACE FUNCTION validate_notification_preferences(prefs JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if JSON has required structure
    IF prefs IS NULL THEN
        RETURN true; -- NULL is allowed
    END IF;
    
    -- Validate basic structure
    IF NOT (prefs ? 'email' AND prefs ? 'sms' AND prefs ? 'push') THEN
        RETURN false;
    END IF;
    
    -- Validate boolean values
    IF NOT (
        jsonb_typeof(prefs->'email') = 'boolean' AND
        jsonb_typeof(prefs->'sms') = 'boolean' AND
        jsonb_typeof(prefs->'push') = 'boolean'
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate user emergency contact JSON
CREATE OR REPLACE FUNCTION validate_emergency_contact(contact JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    IF contact IS NULL THEN
        RETURN true;
    END IF;
    
    -- Required fields: name, phone
    IF NOT (contact ? 'name' AND contact ? 'phone') THEN
        RETURN false;
    END IF;
    
    -- Validate name is string and phone is valid
    IF jsonb_typeof(contact->'name') != 'string' THEN
        RETURN false;
    END IF;
    
    IF jsonb_typeof(contact->'phone') != 'string' OR 
       NOT is_valid_phone(contact->>'phone') THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate user address JSON
CREATE OR REPLACE FUNCTION validate_address(addr JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    IF addr IS NULL THEN
        RETURN true;
    END IF;
    
    -- Required fields: street, city, state, zip
    IF NOT (addr ? 'street' AND addr ? 'city' AND addr ? 'state' AND addr ? 'zip') THEN
        RETURN false;
    END IF;
    
    -- All required fields must be strings
    IF NOT (
        jsonb_typeof(addr->'street') = 'string' AND
        jsonb_typeof(addr->'city') = 'string' AND
        jsonb_typeof(addr->'state') = 'string' AND
        jsonb_typeof(addr->'zip') = 'string'
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate user behavior patterns JSON
CREATE OR REPLACE FUNCTION validate_behavior_patterns(patterns JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    IF patterns IS NULL THEN
        RETURN true;
    END IF;
    
    -- Should be an object
    IF jsonb_typeof(patterns) != 'object' THEN
        RETURN false;
    END IF;
    
    -- Validate numeric fields if present
    IF patterns ? 'typing_speed' AND jsonb_typeof(patterns->'typing_speed') != 'number' THEN
        RETURN false;
    END IF;
    
    IF patterns ? 'accuracy' AND (
        jsonb_typeof(patterns->'accuracy') != 'number' OR
        (patterns->'accuracy')::DECIMAL NOT BETWEEN 0 AND 100
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add JSON validation constraints
ALTER TABLE users
ADD CONSTRAINT chk_users_notification_preferences_valid
CHECK (validate_notification_preferences(notification_preferences)),
ADD CONSTRAINT chk_users_emergency_contact_valid
CHECK (validate_emergency_contact(emergency_contact)),
ADD CONSTRAINT chk_users_address_valid
CHECK (validate_address(address));

ALTER TABLE user_behavior_patterns
ADD CONSTRAINT chk_keystroke_patterns_valid
CHECK (validate_behavior_patterns(keystroke_patterns)),
ADD CONSTRAINT chk_mouse_patterns_valid
CHECK (validate_behavior_patterns(mouse_patterns)),
ADD CONSTRAINT chk_touch_patterns_valid
CHECK (validate_behavior_patterns(touch_patterns));

-- =====================================================
-- STEP 4: Workflow Dependencies Validation
-- =====================================================

-- Function to validate workflow step dependencies array
CREATE OR REPLACE FUNCTION validate_step_dependencies()
RETURNS TRIGGER AS $$
DECLARE
    dep_id VARCHAR(255);
BEGIN
    -- Validate each dependency ID exists as a workflow step
    IF NEW.dependencies IS NOT NULL THEN
        FOREACH dep_id IN ARRAY NEW.dependencies LOOP
            IF NOT EXISTS (
                SELECT 1 FROM workflow_steps 
                WHERE id = dep_id AND workflow_id = NEW.workflow_id
            ) THEN
                RAISE EXCEPTION 'Invalid dependency step ID: %. Step must exist in the same workflow.', dep_id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_step_dependencies
    BEFORE INSERT OR UPDATE OF dependencies ON workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION validate_step_dependencies();

-- =====================================================
-- STEP 5: Date and Time Constraints
-- =====================================================

-- Function to validate date ranges
CREATE OR REPLACE FUNCTION validate_date_ranges()
RETURNS TRIGGER AS $$
BEGIN
    -- Projects: start_date <= end_date
    IF TG_TABLE_NAME = 'projects' THEN
        IF NEW.start_date > NEW.end_date THEN
            RAISE EXCEPTION 'Project start date cannot be after end date';
        END IF;
    END IF;
    
    -- Calendar events: start_time <= end_time
    IF TG_TABLE_NAME = 'calendar_events' THEN
        IF NEW.start_time >= NEW.end_time THEN
            RAISE EXCEPTION 'Event start time must be before end time';
        END IF;
        
        -- All-day events should have times set to midnight
        IF NEW.is_all_day THEN
            NEW.start_time := date_trunc('day', NEW.start_time);
            NEW.end_time := date_trunc('day', NEW.end_time) + INTERVAL '1 day' - INTERVAL '1 second';
        END IF;
    END IF;
    
    -- Workflow steps: scheduled dates validation
    IF TG_TABLE_NAME = 'workflow_steps' THEN
        IF NEW.scheduled_start_date IS NOT NULL AND NEW.scheduled_end_date IS NOT NULL THEN
            IF NEW.scheduled_start_date > NEW.scheduled_end_date THEN
                RAISE EXCEPTION 'Workflow step scheduled start date cannot be after end date';
            END IF;
        END IF;
        
        IF NEW.actual_start_date IS NOT NULL AND NEW.actual_end_date IS NOT NULL THEN
            IF NEW.actual_start_date > NEW.actual_end_date THEN
                RAISE EXCEPTION 'Workflow step actual start date cannot be after end date';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply date validation triggers
CREATE TRIGGER trigger_validate_project_dates
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION validate_date_ranges();

CREATE TRIGGER trigger_validate_event_dates
    BEFORE INSERT OR UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION validate_date_ranges();

CREATE TRIGGER trigger_validate_step_dates
    BEFORE INSERT OR UPDATE ON workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION validate_date_ranges();

-- =====================================================
-- STEP 6: Business Logic Constraints
-- =====================================================

-- Ensure project numbers are unique and positive
ALTER TABLE projects
ADD CONSTRAINT chk_projects_number_positive
CHECK (project_number > 0);

-- Ensure workflow step orders are positive
ALTER TABLE workflow_steps
ADD CONSTRAINT chk_workflow_steps_order_positive
CHECK (step_order > 0);

-- Ensure estimated duration is positive
ALTER TABLE workflow_steps
ADD CONSTRAINT chk_workflow_steps_duration_positive
CHECK (estimated_duration > 0);

-- Ensure alert days are positive
ALTER TABLE workflow_steps
ADD CONSTRAINT chk_workflow_steps_alert_days_positive
CHECK (alert_days > 0);

ALTER TABLE workflow_line_items
ADD CONSTRAINT chk_workflow_line_items_alert_days_positive
CHECK (alert_days > 0);

-- Ensure task hours are non-negative
ALTER TABLE tasks
ADD CONSTRAINT chk_tasks_estimated_hours_non_negative
CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
ADD CONSTRAINT chk_tasks_actual_hours_non_negative
CHECK (actual_hours IS NULL OR actual_hours >= 0);

-- Ensure document file size is positive
ALTER TABLE documents
ADD CONSTRAINT chk_documents_file_size_positive
CHECK (file_size > 0);

-- Ensure document version is positive
ALTER TABLE documents
ADD CONSTRAINT chk_documents_version_positive
CHECK (version > 0);

-- =====================================================
-- STEP 7: User Security Constraints
-- =====================================================

-- Ensure login attempts are non-negative
ALTER TABLE users
ADD CONSTRAINT chk_users_login_attempts_non_negative
CHECK (login_attempts >= 0);

-- Ensure two-factor secret is present when enabled
CREATE OR REPLACE FUNCTION validate_two_factor_setup()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.two_factor_enabled = true AND (NEW.two_factor_secret IS NULL OR NEW.two_factor_secret = '') THEN
        RAISE EXCEPTION 'Two-factor secret is required when two-factor authentication is enabled';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_two_factor
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_two_factor_setup();

-- Ensure MFA method has corresponding data
CREATE OR REPLACE FUNCTION validate_mfa_method()
RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.method
        WHEN 'TOTP' THEN
            IF NEW.secret IS NULL THEN
                RAISE EXCEPTION 'TOTP method requires secret';
            END IF;
        WHEN 'SMS' THEN
            IF NEW.phone_number IS NULL THEN
                RAISE EXCEPTION 'SMS method requires phone number';
            END IF;
        WHEN 'EMAIL' THEN
            -- Email is already in user table, no additional validation needed
            NULL;
        ELSE
            -- Allow other methods without specific validation
            NULL;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_mfa_method
    BEFORE INSERT OR UPDATE ON user_mfa
    FOR EACH ROW
    EXECUTE FUNCTION validate_mfa_method();

-- =====================================================
-- STEP 8: Workflow State Machine Constraints
-- =====================================================

-- Enhanced workflow state validation
CREATE OR REPLACE FUNCTION enforce_workflow_state_machine()
RETURNS TRIGGER AS $$
DECLARE
    v_valid_transitions TEXT[][];
BEGIN
    -- Define valid state transitions as 2D array
    v_valid_transitions := ARRAY[
        ARRAY['PENDING', 'ACTIVE'],
        ARRAY['PENDING', 'SKIPPED'],
        ARRAY['ACTIVE', 'IN_PROGRESS'],
        ARRAY['ACTIVE', 'SKIPPED'],
        ARRAY['IN_PROGRESS', 'COMPLETED'],
        ARRAY['IN_PROGRESS', 'BLOCKED'],
        ARRAY['BLOCKED', 'ACTIVE'],
        ARRAY['BLOCKED', 'IN_PROGRESS'],
        ARRAY['SKIPPED', 'ACTIVE'],
        ARRAY['COMPLETED', 'ACTIVE'] -- Allow reopening completed tasks if needed
    ];
    
    -- Check if transition is valid
    IF OLD.state IS DISTINCT FROM NEW.state THEN
        IF NOT (ARRAY[OLD.state::TEXT, NEW.state::TEXT] = ANY(v_valid_transitions)) THEN
            RAISE EXCEPTION 'Invalid state transition from % to % for workflow step %', 
                OLD.state, NEW.state, NEW.id;
        END IF;
        
        -- Log state transition
        INSERT INTO workflow_audit_log (
            entity_type,
            entity_id,
            action,
            old_values,
            new_values,
            project_id,
            workflow_id,
            notes
        ) VALUES (
            'workflow_step',
            NEW.id,
            'state_transition',
            jsonb_build_object('state', OLD.state, 'timestamp', OLD.updated_at),
            jsonb_build_object('state', NEW.state, 'timestamp', NOW()),
            (SELECT project_id FROM project_workflows WHERE id = NEW.workflow_id),
            NEW.workflow_id,
            format('State changed from %s to %s', OLD.state, NEW.state)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the existing state validation trigger
DROP TRIGGER IF EXISTS trigger_validate_state ON workflow_steps;
CREATE TRIGGER trigger_enforce_state_machine
    BEFORE UPDATE OF state ON workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION enforce_workflow_state_machine();

-- =====================================================
-- STEP 9: Data Consistency Enforcement
-- =====================================================

-- Ensure completed workflow items match tracker state
CREATE OR REPLACE FUNCTION validate_completed_items()
RETURNS TRIGGER AS $$
DECLARE
    v_tracker_exists BOOLEAN;
    v_line_item_exists BOOLEAN;
BEGIN
    -- Check if tracker exists
    SELECT EXISTS(
        SELECT 1 FROM project_workflow_trackers WHERE id = NEW.tracker_id
    ) INTO v_tracker_exists;
    
    IF NOT v_tracker_exists THEN
        RAISE EXCEPTION 'Invalid tracker_id: %', NEW.tracker_id;
    END IF;
    
    -- Check if line item exists
    SELECT EXISTS(
        SELECT 1 FROM workflow_line_items WHERE id = NEW.line_item_id
    ) INTO v_line_item_exists;
    
    IF NOT v_line_item_exists THEN
        RAISE EXCEPTION 'Invalid line_item_id: %', NEW.line_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_completed_items
    BEFORE INSERT ON completed_workflow_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_completed_items();

-- =====================================================
-- STEP 10: Alert System Constraints
-- =====================================================

-- Ensure alert assignments are valid
CREATE OR REPLACE FUNCTION validate_alert_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If assigned to a user, ensure they exist and are active
    IF NEW.assigned_to_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = NEW.assigned_to_id AND is_active = true
        ) THEN
            RAISE EXCEPTION 'Cannot assign alert to inactive or non-existent user: %', 
                NEW.assigned_to_id;
        END IF;
    END IF;
    
    -- Ensure due date is in the future for new alerts
    IF TG_OP = 'INSERT' AND NEW.due_date IS NOT NULL AND NEW.due_date <= NOW() THEN
        RAISE EXCEPTION 'Alert due date must be in the future';
    END IF;
    
    -- Ensure high priority alerts have assignment
    IF NEW.priority = 'HIGH' AND NEW.assigned_to_id IS NULL THEN
        RAISE WARNING 'High priority alert % is not assigned to anyone', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_alert_assignment
    BEFORE INSERT OR UPDATE ON workflow_alerts
    FOR EACH ROW
    EXECUTE FUNCTION validate_alert_assignment();

-- =====================================================
-- STEP 11: Performance and Resource Constraints
-- =====================================================

-- Limit number of active alerts per project
CREATE OR REPLACE FUNCTION enforce_alert_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_active_count INT;
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        SELECT COUNT(*) INTO v_active_count
        FROM workflow_alerts
        WHERE project_id = NEW.project_id 
        AND status = 'ACTIVE'
        AND id != COALESCE(NEW.id, '');
        
        IF v_active_count >= 50 THEN -- Configurable limit
            RAISE EXCEPTION 'Too many active alerts for project %. Limit: 50', NEW.project_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_alert_limits
    BEFORE INSERT OR UPDATE ON workflow_alerts
    FOR EACH ROW
    EXECUTE FUNCTION enforce_alert_limits();

-- Limit number of team members per project
CREATE OR REPLACE FUNCTION enforce_team_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_member_count INT;
BEGIN
    SELECT COUNT(*) INTO v_member_count
    FROM project_team_members
    WHERE project_id = NEW.project_id;
    
    IF v_member_count >= 20 THEN -- Configurable limit
        RAISE EXCEPTION 'Too many team members for project %. Limit: 20', NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_team_limits
    BEFORE INSERT ON project_team_members
    FOR EACH ROW
    EXECUTE FUNCTION enforce_team_limits();

-- =====================================================
-- STEP 12: Archive and Cleanup Constraints
-- =====================================================

-- Prevent modification of archived projects
CREATE OR REPLACE FUNCTION prevent_archived_modifications()
RETURNS TRIGGER AS $$
DECLARE
    v_is_archived BOOLEAN;
BEGIN
    -- Check if project is archived
    SELECT archived INTO v_is_archived
    FROM projects
    WHERE id = NEW.project_id;
    
    IF v_is_archived THEN
        RAISE EXCEPTION 'Cannot modify % for archived project %', 
            TG_TABLE_NAME, NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER trigger_prevent_archived_tasks
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION prevent_archived_modifications();

CREATE TRIGGER trigger_prevent_archived_alerts
    BEFORE INSERT OR UPDATE ON workflow_alerts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_archived_modifications();

CREATE TRIGGER trigger_prevent_archived_messages
    BEFORE INSERT OR UPDATE ON project_messages
    FOR EACH ROW
    EXECUTE FUNCTION prevent_archived_modifications();

-- =====================================================
-- STEP 13: Create constraint violation monitoring
-- =====================================================

CREATE TABLE IF NOT EXISTS constraint_violations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    table_name VARCHAR(255),
    constraint_name VARCHAR(255),
    violation_type VARCHAR(100),
    entity_id VARCHAR(255),
    error_message TEXT,
    user_id VARCHAR(255),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolution_notes TEXT
);

CREATE INDEX idx_constraint_violations_unresolved 
    ON constraint_violations(resolved, created_at DESC);

-- Function to log constraint violations
CREATE OR REPLACE FUNCTION log_constraint_violation(
    p_table_name VARCHAR(255),
    p_constraint_name VARCHAR(255),
    p_violation_type VARCHAR(100),
    p_entity_id VARCHAR(255),
    p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO constraint_violations (
        table_name,
        constraint_name,
        violation_type,
        entity_id,
        error_message
    ) VALUES (
        p_table_name,
        p_constraint_name,
        p_violation_type,
        p_entity_id,
        p_error_message
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FINAL: Add comprehensive documentation and indexes
-- =====================================================

-- Performance indexes for constraint checking
CREATE INDEX IF NOT EXISTS idx_task_dependencies_circular_check 
    ON task_dependencies(parent_task_id, dependent_task_id);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_dependencies 
    ON workflow_steps USING gin(dependencies);

CREATE INDEX IF NOT EXISTS idx_users_active_lookup 
    ON users(id, is_active);

CREATE INDEX IF NOT EXISTS idx_projects_archived_lookup 
    ON projects(id, archived);

-- Documentation
COMMENT ON FUNCTION check_circular_dependency(VARCHAR, VARCHAR) IS 'Detects circular dependencies in task relationships using breadth-first search';
COMMENT ON FUNCTION validate_workflow_step_index() IS 'Ensures workflow current_step_index is valid and updates progress accordingly';
COMMENT ON FUNCTION validate_notification_preferences(JSONB) IS 'Validates user notification preferences JSON schema';
COMMENT ON FUNCTION validate_emergency_contact(JSONB) IS 'Validates user emergency contact information JSON schema';
COMMENT ON FUNCTION validate_address(JSONB) IS 'Validates user address JSON schema';
COMMENT ON FUNCTION enforce_workflow_state_machine() IS 'Enforces valid state transitions in workflow steps';
COMMENT ON FUNCTION prevent_archived_modifications() IS 'Prevents modifications to entities belonging to archived projects';
COMMENT ON TABLE constraint_violations IS 'Logs all constraint violations for monitoring and resolution';

-- Create summary view of all constraints
CREATE OR REPLACE VIEW constraint_summary AS
SELECT 
    schemaname,
    tablename,
    constraintname,
    constrainttype,
    CASE constrainttype
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'x' THEN 'EXCLUSION'
        ELSE constrainttype::text
    END as constraint_description
FROM (
    SELECT 
        n.nspname as schemaname,
        t.relname as tablename,
        c.conname as constraintname,
        c.contype as constrainttype
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
) constraints
ORDER BY tablename, constrainttype, constraintname;