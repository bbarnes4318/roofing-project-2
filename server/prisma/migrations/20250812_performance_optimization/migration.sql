-- Migration: Performance Optimization
-- Purpose: Add comprehensive indexes, optimize queries, and implement caching strategies
-- Date: 2025-08-12

-- =====================================================
-- STEP 1: Core Performance Indexes
-- =====================================================

-- Project-related composite indexes
CREATE INDEX IF NOT EXISTS idx_projects_customer_status_archived 
    ON projects(customer_id, status, archived);

CREATE INDEX IF NOT EXISTS idx_projects_manager_status 
    ON projects(project_manager_id, status) WHERE project_manager_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_date_range 
    ON projects(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_projects_budget_range 
    ON projects(budget) WHERE budget > 0;

-- Workflow-related composite indexes
CREATE INDEX IF NOT EXISTS idx_workflow_alerts_project_workflow_step_status 
    ON workflow_alerts(project_id, workflow_id, step_id, status);

CREATE INDEX IF NOT EXISTS idx_workflow_alerts_assigned_status_priority 
    ON workflow_alerts(assigned_to_id, status, priority) WHERE assigned_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_alerts_due_date_status 
    ON workflow_alerts(due_date, status) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_completed_order 
    ON workflow_steps(workflow_id, is_completed, step_order);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_assigned_completed 
    ON workflow_steps(assigned_to_id, is_completed) WHERE assigned_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_steps_phase_state 
    ON workflow_steps(phase, state);

-- Task-related composite indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_assigned_status_due 
    ON tasks(project_id, assigned_to_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_priority 
    ON tasks(assigned_to_id, status, priority) WHERE assigned_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status 
    ON tasks(due_date, status);

CREATE INDEX IF NOT EXISTS idx_tasks_project_category_status 
    ON tasks(project_id, category, status);

-- Message-related indexes
CREATE INDEX IF NOT EXISTS idx_project_messages_project_workflow_created 
    ON project_messages(project_id, workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_messages_phase_section_created 
    ON project_messages(phase, section, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_messages_author_type_created 
    ON project_messages(author_id, message_type, created_at DESC) WHERE author_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
    ON messages(conversation_id, created_at DESC);

-- Security and audit indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_type_created 
    ON security_events(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_risk_resolved 
    ON security_events(risk_score DESC, resolved) WHERE risk_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_audit_project_created 
    ON workflow_audit_log(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_audit_entity_action 
    ON workflow_audit_log(entity_type, entity_id, action);

-- User and device indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_trusted_active 
    ON user_devices(user_id, trusted, is_active);

CREATE INDEX IF NOT EXISTS idx_user_mfa_user_method_enabled 
    ON user_mfa(user_id, method, enabled);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_created 
    ON notifications(recipient_id, is_read, created_at DESC);

-- =====================================================
-- STEP 2: JSON Field Optimization with GIN Indexes
-- =====================================================

-- GIN indexes for JSON fields that are frequently queried
CREATE INDEX IF NOT EXISTS idx_users_notification_prefs_gin 
    ON users USING gin(notification_preferences);

CREATE INDEX IF NOT EXISTS idx_users_skills_gin 
    ON users USING gin(skills);

CREATE INDEX IF NOT EXISTS idx_project_workflows_alert_methods_gin 
    ON project_workflows USING gin(alert_methods);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_dependencies_gin 
    ON workflow_steps USING gin(dependencies);

CREATE INDEX IF NOT EXISTS idx_workflow_alerts_metadata_gin 
    ON workflow_alerts USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_security_events_details_gin 
    ON security_events USING gin(details);

CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_keystroke_gin 
    ON user_behavior_patterns USING gin(keystroke_patterns);

-- =====================================================
-- STEP 3: Full-Text Search Indexes
-- =====================================================

-- Add tsvector columns for full-text search
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE workflow_line_items 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE project_messages 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Functions to update search vectors
CREATE OR REPLACE FUNCTION update_projects_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.project_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_line_items_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.item_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_documents_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.file_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.original_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_messages_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for search vector updates
CREATE TRIGGER trigger_projects_search_vector_update
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_projects_search_vector();

CREATE TRIGGER trigger_line_items_search_vector_update
    BEFORE INSERT OR UPDATE ON workflow_line_items
    FOR EACH ROW EXECUTE FUNCTION update_line_items_search_vector();

CREATE TRIGGER trigger_documents_search_vector_update
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_documents_search_vector();

CREATE TRIGGER trigger_messages_search_vector_update
    BEFORE INSERT OR UPDATE ON project_messages
    FOR EACH ROW EXECUTE FUNCTION update_messages_search_vector();

-- Create GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_projects_search 
    ON projects USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_line_items_search 
    ON workflow_line_items USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_documents_search 
    ON documents USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_messages_search 
    ON project_messages USING gin(search_vector);

-- Update existing search vectors
UPDATE projects SET search_vector = 
    setweight(to_tsvector('english', COALESCE(project_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(notes, '')), 'C');

UPDATE workflow_line_items SET search_vector = 
    setweight(to_tsvector('english', COALESCE(item_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B');

UPDATE documents SET search_vector = 
    setweight(to_tsvector('english', COALESCE(file_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(original_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(tags, ' ')), 'C');

UPDATE project_messages SET search_vector = 
    setweight(to_tsvector('english', COALESCE(subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'B');

-- =====================================================
-- STEP 4: Materialized Views for Complex Queries
-- =====================================================

-- Project dashboard summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS project_dashboard_summary AS
SELECT 
    p.id as project_id,
    p.project_number,
    p.project_name,
    p.status,
    p.priority,
    p.progress,
    c.primary_name as customer_name,
    c.primary_email as customer_email,
    u.first_name || ' ' || u.last_name as project_manager_name,
    wp.phase_name as current_phase,
    pw.overall_progress as workflow_progress,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'DONE') as completed_tasks,
    COUNT(DISTINCT wa.id) FILTER (WHERE wa.status = 'ACTIVE') as active_alerts,
    COUNT(DISTINCT wa.id) FILTER (WHERE wa.priority = 'HIGH') as high_priority_alerts,
    p.start_date,
    p.end_date,
    p.budget,
    p.actual_cost,
    p.updated_at
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN users u ON p.project_manager_id = u.id
LEFT JOIN project_workflow_trackers pwt ON p.id = pwt.project_id
LEFT JOIN workflow_phases wp ON pwt.current_phase_id = wp.id
LEFT JOIN project_workflows pw ON p.id = pw.project_id
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN workflow_alerts wa ON p.id = wa.project_id
WHERE p.archived = false
GROUP BY 
    p.id, p.project_number, p.project_name, p.status, p.priority, p.progress,
    c.primary_name, c.primary_email, u.first_name, u.last_name,
    wp.phase_name, pw.overall_progress, p.start_date, p.end_date,
    p.budget, p.actual_cost, p.updated_at;

CREATE UNIQUE INDEX idx_project_dashboard_summary_id 
    ON project_dashboard_summary(project_id);

-- User workload summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_workload_summary AS
SELECT 
    u.id as user_id,
    u.first_name || ' ' || u.last_name as user_name,
    u.role,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'TO_DO') as pending_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'IN_PROGRESS') as in_progress_tasks,
    COUNT(DISTINCT wa.id) as assigned_alerts,
    COUNT(DISTINCT wa.id) FILTER (WHERE wa.priority = 'HIGH') as high_priority_alerts,
    COUNT(DISTINCT p.id) as assigned_projects,
    AVG(t.actual_hours) FILTER (WHERE t.actual_hours IS NOT NULL) as avg_task_hours,
    u.updated_at
FROM users u
LEFT JOIN tasks t ON u.id = t.assigned_to_id
LEFT JOIN workflow_alerts wa ON u.id = wa.assigned_to_id
LEFT JOIN project_team_members ptm ON u.id = ptm.user_id
LEFT JOIN projects p ON ptm.project_id = p.id AND p.archived = false
WHERE u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.role, u.updated_at;

CREATE UNIQUE INDEX idx_user_workload_summary_id 
    ON user_workload_summary(user_id);

-- Workflow performance metrics view
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_performance_metrics AS
SELECT 
    wp.phase_type,
    wp.phase_name,
    ws.section_name,
    wli.item_name,
    wli.responsible_role,
    COUNT(DISTINCT cwi.id) as completion_count,
    AVG(EXTRACT(EPOCH FROM (cwi.completed_at - cwi.created_at)) / 3600) as avg_completion_hours,
    MIN(EXTRACT(EPOCH FROM (cwi.completed_at - cwi.created_at)) / 3600) as min_completion_hours,
    MAX(EXTRACT(EPOCH FROM (cwi.completed_at - cwi.created_at)) / 3600) as max_completion_hours,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (cwi.completed_at - cwi.created_at)) / 3600) as median_completion_hours,
    COUNT(DISTINCT cwi.tracker_id) as projects_completed
FROM workflow_phases wp
JOIN workflow_sections ws ON wp.id = ws.phase_id
JOIN workflow_line_items wli ON ws.id = wli.section_id
LEFT JOIN completed_workflow_items cwi ON wli.id = cwi.line_item_id
WHERE wp.is_active = true
GROUP BY wp.phase_type, wp.phase_name, ws.section_name, wli.item_name, wli.responsible_role;

CREATE INDEX idx_workflow_performance_phase_section 
    ON workflow_performance_metrics(phase_type, section_name);

-- =====================================================
-- STEP 5: Query Optimization Functions
-- =====================================================

-- Optimized function to get project status with minimal queries
CREATE OR REPLACE FUNCTION get_project_status_optimized(p_project_id VARCHAR(255))
RETURNS TABLE (
    project_id VARCHAR(255),
    project_name VARCHAR(255),
    current_phase VARCHAR(255),
    progress INT,
    active_alerts INT,
    next_due_task DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.project_name,
        wp.phase_name,
        p.progress,
        (SELECT COUNT(*)::INT FROM workflow_alerts WHERE project_id = p.id AND status = 'ACTIVE'),
        (SELECT MIN(due_date)::DATE FROM tasks WHERE project_id = p.id AND status != 'DONE')
    FROM projects p
    LEFT JOIN project_workflow_trackers pwt ON p.id = pwt.project_id
    LEFT JOIN workflow_phases wp ON pwt.current_phase_id = wp.id
    WHERE p.id = p_project_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Batch function to get multiple project statuses
CREATE OR REPLACE FUNCTION get_multiple_project_statuses(p_project_ids VARCHAR(255)[])
RETURNS TABLE (
    project_id VARCHAR(255),
    project_name VARCHAR(255),
    current_phase VARCHAR(255),
    progress INT,
    active_alerts INT,
    total_tasks INT,
    completed_tasks INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.project_name,
        wp.phase_name,
        p.progress,
        COALESCE(alert_counts.active_alerts, 0)::INT,
        COALESCE(task_counts.total_tasks, 0)::INT,
        COALESCE(task_counts.completed_tasks, 0)::INT
    FROM projects p
    LEFT JOIN project_workflow_trackers pwt ON p.id = pwt.project_id
    LEFT JOIN workflow_phases wp ON pwt.current_phase_id = wp.id
    LEFT JOIN (
        SELECT 
            project_id,
            COUNT(*) as active_alerts
        FROM workflow_alerts 
        WHERE status = 'ACTIVE' AND project_id = ANY(p_project_ids)
        GROUP BY project_id
    ) alert_counts ON p.id = alert_counts.project_id
    LEFT JOIN (
        SELECT 
            project_id,
            COUNT(*) as total_tasks,
            COUNT(*) FILTER (WHERE status = 'DONE') as completed_tasks
        FROM tasks 
        WHERE project_id = ANY(p_project_ids)
        GROUP BY project_id
    ) task_counts ON p.id = task_counts.project_id
    WHERE p.id = ANY(p_project_ids);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 6: Partitioning for Large Tables
-- =====================================================

-- Create partitioned table for workflow audit log
CREATE TABLE workflow_audit_log_partitioned (
    LIKE workflow_audit_log INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for the current year and next year
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..23 LOOP  -- 24 months (current year + next year)
        start_date := date_trunc('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'workflow_audit_log_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF workflow_audit_log_partitioned 
                       FOR VALUES FROM (%L) TO (%L)',
                       partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Create function to automatically create partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, partition_date DATE)
RETURNS VOID AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    start_date := date_trunc('month', partition_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name || '_partitioned', start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: Connection Pooling and Query Caching Setup
-- =====================================================

-- Create connection statistics view
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    state,
    COUNT(*) as connection_count,
    AVG(EXTRACT(EPOCH FROM (now() - state_change))) as avg_duration_seconds
FROM pg_stat_activity 
WHERE pid <> pg_backend_pid()
GROUP BY state;

-- Create slow query monitoring
CREATE TABLE IF NOT EXISTS slow_query_log (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    query_hash VARCHAR(255),
    query TEXT,
    duration_ms INT,
    rows_affected INT,
    user_id VARCHAR(255),
    database_name VARCHAR(255)
);

CREATE INDEX idx_slow_query_log_duration 
    ON slow_query_log(duration_ms DESC, created_at DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
    p_query TEXT,
    p_duration_ms INT,
    p_rows_affected INT DEFAULT NULL,
    p_user_id VARCHAR(255) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF p_duration_ms > 1000 THEN  -- Log queries slower than 1 second
        INSERT INTO slow_query_log (
            query_hash,
            query,
            duration_ms,
            rows_affected,
            user_id,
            database_name
        ) VALUES (
            md5(p_query),
            p_query,
            p_duration_ms,
            p_rows_affected,
            p_user_id,
            current_database()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 8: Database Maintenance Functions
-- =====================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE (view_name TEXT, refresh_time INTERVAL) AS $$
DECLARE
    view_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    FOR view_record IN 
        SELECT schemaname, matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    LOOP
        start_time := clock_timestamp();
        EXECUTE 'REFRESH MATERIALIZED VIEW ' || quote_ident(view_record.matviewname);
        end_time := clock_timestamp();
        
        RETURN QUERY SELECT 
            view_record.matviewname::TEXT,
            (end_time - start_time)::INTERVAL;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS TABLE (table_name TEXT, analyze_time INTERVAL) AS $$
DECLARE
    table_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        start_time := clock_timestamp();
        EXECUTE 'ANALYZE ' || quote_ident(table_record.tablename);
        end_time := clock_timestamp();
        
        RETURN QUERY SELECT 
            table_record.tablename::TEXT,
            (end_time - start_time)::INTERVAL;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 9: Performance Monitoring Views
-- =====================================================

-- Index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW'
        WHEN idx_scan < 1000 THEN 'MEDIUM'
        ELSE 'HIGH'
    END as usage_level
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table size statistics
CREATE OR REPLACE VIEW table_size_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as total_size,
    pg_size_pretty(pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as table_size,
    pg_size_pretty(pg_indexes_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as indexes_size,
    (pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)))::BIGINT as total_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY total_bytes DESC;

-- Query performance view
CREATE OR REPLACE VIEW query_performance_stats AS
SELECT 
    substring(query from 1 for 50) as query_snippet,
    calls,
    total_time,
    total_time/calls as avg_time,
    rows,
    rows/calls as avg_rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) as hit_percent
FROM pg_stat_statements
WHERE calls > 10
ORDER BY total_time DESC
LIMIT 20;

-- =====================================================
-- STEP 10: Automated Maintenance Scheduling
-- =====================================================

-- Create maintenance log table
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    maintenance_type VARCHAR(100),
    target_name VARCHAR(255),
    duration_ms INT,
    status VARCHAR(50),
    error_message TEXT,
    details JSONB
);

-- Function to run daily maintenance
CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS TABLE (
    maintenance_type TEXT,
    target_name TEXT,
    status TEXT,
    duration_ms INT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration_ms INT;
BEGIN
    -- Refresh materialized views
    start_time := clock_timestamp();
    PERFORM refresh_all_materialized_views();
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    INSERT INTO maintenance_log (maintenance_type, target_name, duration_ms, status)
    VALUES ('refresh_views', 'all_materialized_views', duration_ms, 'SUCCESS');
    
    RETURN QUERY SELECT 'refresh_views'::TEXT, 'all_materialized_views'::TEXT, 'SUCCESS'::TEXT, duration_ms;
    
    -- Update statistics
    start_time := clock_timestamp();
    PERFORM update_table_statistics();
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    INSERT INTO maintenance_log (maintenance_type, target_name, duration_ms, status)
    VALUES ('analyze_tables', 'all_tables', duration_ms, 'SUCCESS');
    
    RETURN QUERY SELECT 'analyze_tables'::TEXT, 'all_tables'::TEXT, 'SUCCESS'::TEXT, duration_ms;
    
    -- Clean up old audit logs (keep 90 days)
    start_time := clock_timestamp();
    DELETE FROM workflow_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    INSERT INTO maintenance_log (maintenance_type, target_name, duration_ms, status)
    VALUES ('cleanup_audit', 'workflow_audit_log', duration_ms, 'SUCCESS');
    
    RETURN QUERY SELECT 'cleanup_audit'::TEXT, 'workflow_audit_log'::TEXT, 'SUCCESS'::TEXT, duration_ms;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FINAL: Documentation and Performance Monitoring Setup
-- =====================================================

-- Create performance baseline
INSERT INTO maintenance_log (maintenance_type, target_name, status, details)
VALUES (
    'performance_baseline',
    'database_optimization',
    'COMPLETED',
    jsonb_build_object(
        'migration_date', NOW(),
        'indexes_created', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'),
        'materialized_views', (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public'),
        'total_tables', (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')
    )
);

-- Add comprehensive documentation
COMMENT ON MATERIALIZED VIEW project_dashboard_summary IS 'Optimized summary of project data for dashboard displays';
COMMENT ON MATERIALIZED VIEW user_workload_summary IS 'User workload metrics for resource management';
COMMENT ON MATERIALIZED VIEW workflow_performance_metrics IS 'Performance analytics for workflow optimization';
COMMENT ON FUNCTION get_project_status_optimized(VARCHAR) IS 'Fast single-query project status retrieval';
COMMENT ON FUNCTION get_multiple_project_statuses(VARCHAR[]) IS 'Batch project status retrieval for list views';
COMMENT ON FUNCTION refresh_all_materialized_views() IS 'Maintenance function to refresh all materialized views';
COMMENT ON FUNCTION run_daily_maintenance() IS 'Automated daily maintenance routine';

-- Create initial refresh of materialized views
SELECT refresh_all_materialized_views();

-- Update statistics for all tables
SELECT update_table_statistics();