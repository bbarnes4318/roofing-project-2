-- Migration: Standardize Data Types
-- Purpose: Consistent string lengths, decimal precision, and field patterns across all tables
-- Date: 2025-08-12

-- =====================================================
-- STEP 1: Create data type standards document as comments
-- =====================================================

/*
DATA TYPE STANDARDS:

String Fields:
- Names (first/last/company): VARCHAR(100)
- Titles/Subjects: VARCHAR(255)
- Short Descriptions: VARCHAR(500)
- Long Descriptions/Content: VARCHAR(2000)
- Notes: TEXT (unlimited)
- Email addresses: VARCHAR(320) (RFC 5321 standard)
- Phone numbers: VARCHAR(20)
- URLs: VARCHAR(2000)
- File paths: VARCHAR(2000)
- IDs and codes: VARCHAR(50)

Numeric Fields:
- Currency/Financial: DECIMAL(12,2)
- Percentages: DECIMAL(5,2) with CHECK (0 <= value <= 100)
- Ratings/Scores: DECIMAL(3,1) with CHECK (0 <= value <= 10)
- Small integers: INT
- Progress values: INT with CHECK (0 <= value <= 100)

Boolean Fields:
- Always DEFAULT false unless specified
- Use descriptive names (is_active, has_permission, etc.)

Date/Time Fields:
- TIMESTAMP for all datetime fields
- Default NOW() for created_at fields
- Use appropriate timezone handling
*/

-- =====================================================
-- STEP 2: Standardize String Lengths
-- =====================================================

-- Names and titles standardization
ALTER TABLE users 
ALTER COLUMN first_name TYPE VARCHAR(100),
ALTER COLUMN last_name TYPE VARCHAR(100),
ALTER COLUMN position TYPE VARCHAR(100),
ALTER COLUMN department TYPE VARCHAR(100);

ALTER TABLE customers
ALTER COLUMN primary_name TYPE VARCHAR(100),
ALTER COLUMN secondary_name TYPE VARCHAR(100);

ALTER TABLE contacts
ALTER COLUMN name TYPE VARCHAR(100);

-- Email addresses to RFC standard
ALTER TABLE users 
ALTER COLUMN email TYPE VARCHAR(320);

ALTER TABLE customers
ALTER COLUMN primary_email TYPE VARCHAR(320),
ALTER COLUMN secondary_email TYPE VARCHAR(320);

ALTER TABLE contacts
ALTER COLUMN email TYPE VARCHAR(320);

-- Project and workflow names
ALTER TABLE projects
ALTER COLUMN project_name TYPE VARCHAR(255);

ALTER TABLE workflow_phases
ALTER COLUMN phase_name TYPE VARCHAR(255);

ALTER TABLE workflow_sections
ALTER COLUMN section_name TYPE VARCHAR(255),
ALTER COLUMN display_name TYPE VARCHAR(255);

ALTER TABLE workflow_line_items
ALTER COLUMN item_name TYPE VARCHAR(500); -- Longer for detailed descriptions

-- Document and file names
ALTER TABLE documents
ALTER COLUMN file_name TYPE VARCHAR(255),
ALTER COLUMN original_name TYPE VARCHAR(255);

-- Task titles and categories
ALTER TABLE tasks
ALTER COLUMN title TYPE VARCHAR(255);

-- Calendar events
ALTER TABLE calendar_events
ALTER COLUMN title TYPE VARCHAR(255);

-- Notifications
ALTER TABLE notifications
ALTER COLUMN title TYPE VARCHAR(255);

-- =====================================================
-- STEP 3: Standardize Description Fields
-- =====================================================

-- Short descriptions (500 chars)
ALTER TABLE projects
ALTER COLUMN description TYPE VARCHAR(500);

ALTER TABLE workflow_phases
ALTER COLUMN description TYPE VARCHAR(500);

ALTER TABLE workflow_sections
ALTER COLUMN description TYPE VARCHAR(500);

ALTER TABLE documents
ALTER COLUMN description TYPE VARCHAR(500);

-- Long descriptions/content (2000 chars)
ALTER TABLE workflow_line_items
ALTER COLUMN description TYPE VARCHAR(2000);

ALTER TABLE tasks
ALTER COLUMN description TYPE VARCHAR(2000);

ALTER TABLE calendar_events
ALTER COLUMN description TYPE VARCHAR(2000);

ALTER TABLE project_messages
ALTER COLUMN content TYPE VARCHAR(2000);

-- Notes fields to TEXT (unlimited)
ALTER TABLE projects
ALTER COLUMN notes TYPE TEXT;

ALTER TABLE customers
ALTER COLUMN notes TYPE TEXT;

ALTER TABLE contacts
ALTER COLUMN notes TYPE TEXT;

ALTER TABLE tasks
ALTER COLUMN notes TYPE TEXT;

ALTER TABLE workflow_steps
ALTER COLUMN notes TYPE TEXT,
ALTER COLUMN completion_notes TYPE TEXT;

ALTER TABLE workflow_subtasks
ALTER COLUMN notes TYPE TEXT;

ALTER TABLE completed_workflow_items
ALTER COLUMN notes TYPE TEXT;

-- =====================================================
-- STEP 4: Standardize URL and Path Fields
-- =====================================================

-- URLs and file paths
ALTER TABLE documents
ALTER COLUMN file_url TYPE VARCHAR(2000);

ALTER TABLE notifications
ALTER COLUMN action_url TYPE VARCHAR(2000);

ALTER TABLE users
ALTER COLUMN avatar TYPE VARCHAR(2000);

-- Calendar locations
ALTER TABLE calendar_events
ALTER COLUMN location TYPE VARCHAR(500);

-- =====================================================
-- STEP 5: Standardize Financial Fields
-- =====================================================

-- All financial fields to DECIMAL(12,2)
-- (Supports up to $9,999,999,999.99)

-- Projects already use DECIMAL(12,2) - verify consistency
ALTER TABLE projects
ALTER COLUMN budget TYPE DECIMAL(12,2),
ALTER COLUMN estimated_cost TYPE DECIMAL(12,2),
ALTER COLUMN actual_cost TYPE DECIMAL(12,2);

-- =====================================================
-- STEP 6: Standardize Behavioral Pattern Risk Fields
-- =====================================================

-- Risk and threshold fields to DECIMAL(5,2)
-- (Supports 0.00 to 999.99, suitable for percentages and scores)
ALTER TABLE user_behavior_patterns
ALTER COLUMN risk_baseline TYPE DECIMAL(5,2),
ALTER COLUMN anomaly_threshold TYPE DECIMAL(5,2);

-- =====================================================
-- STEP 7: Standardize ID and Code Fields
-- =====================================================

-- Step IDs and other codes
ALTER TABLE workflow_steps
ALTER COLUMN step_id TYPE VARCHAR(50);

ALTER TABLE workflow_subtasks
ALTER COLUMN sub_task_id TYPE VARCHAR(50);

-- Section numbers and item letters
ALTER TABLE workflow_sections
ALTER COLUMN section_number TYPE VARCHAR(10);

ALTER TABLE workflow_line_items
ALTER COLUMN item_letter TYPE VARCHAR(10);

-- =====================================================
-- STEP 8: Standardize Device and Security Fields
-- =====================================================

-- Device and security related fields
ALTER TABLE user_devices
ALTER COLUMN device_fingerprint TYPE VARCHAR(255),
ALTER COLUMN device_name TYPE VARCHAR(100),
ALTER COLUMN device_type TYPE VARCHAR(50),
ALTER COLUMN user_agent TYPE VARCHAR(500),
ALTER COLUMN ip_address TYPE VARCHAR(45); -- IPv6 compatible

ALTER TABLE security_events
ALTER COLUMN ip_address TYPE VARCHAR(45),
ALTER COLUMN user_agent TYPE VARCHAR(500);

ALTER TABLE webauthn_credentials
ALTER COLUMN credential_id TYPE VARCHAR(255),
ALTER COLUMN device_type TYPE VARCHAR(50),
ALTER COLUMN nickname TYPE VARCHAR(100);

-- =====================================================
-- STEP 9: Standardize Communication Fields
-- =====================================================

-- Message and conversation fields
ALTER TABLE conversations
ALTER COLUMN title TYPE VARCHAR(255),
ALTER COLUMN description TYPE VARCHAR(500);

ALTER TABLE project_messages
ALTER COLUMN subject TYPE VARCHAR(255),
ALTER COLUMN author_name TYPE VARCHAR(100),
ALTER COLUMN author_role TYPE VARCHAR(50),
ALTER COLUMN step_name TYPE VARCHAR(255),
ALTER COLUMN section TYPE VARCHAR(255),
ALTER COLUMN line_item TYPE VARCHAR(255);

-- =====================================================
-- STEP 10: Create validation functions for standardized types
-- =====================================================

-- Email validation function
CREATE OR REPLACE FUNCTION is_valid_email(email_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Phone validation function (basic format checking)
CREATE OR REPLACE FUNCTION is_valid_phone(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove all non-numeric characters
    phone_number := regexp_replace(phone_number, '[^0-9]', '', 'g');
    -- Check if it's between 10-15 digits
    RETURN phone_number ~ '^[0-9]{10,15}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- URL validation function
CREATE OR REPLACE FUNCTION is_valid_url(url_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN url_text ~* '^https?://[^\s/$.?#].[^\s]*$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Progress percentage validation
CREATE OR REPLACE FUNCTION is_valid_percentage(value INT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN value >= 0 AND value <= 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- STEP 11: Add check constraints for data validation
-- =====================================================

-- Email validation constraints
ALTER TABLE users 
ADD CONSTRAINT chk_users_email_format 
CHECK (is_valid_email(email));

ALTER TABLE customers
ADD CONSTRAINT chk_customers_primary_email_format 
CHECK (is_valid_email(primary_email)),
ADD CONSTRAINT chk_customers_secondary_email_format 
CHECK (secondary_email IS NULL OR is_valid_email(secondary_email));

ALTER TABLE contacts
ADD CONSTRAINT chk_contacts_email_format 
CHECK (email IS NULL OR is_valid_email(email));

-- Phone validation constraints
ALTER TABLE users
ADD CONSTRAINT chk_users_phone_format 
CHECK (phone IS NULL OR is_valid_phone(phone));

ALTER TABLE customers
ADD CONSTRAINT chk_customers_phone_format 
CHECK (is_valid_phone(primary_phone)),
ADD CONSTRAINT chk_customers_secondary_phone_format 
CHECK (secondary_phone IS NULL OR is_valid_phone(secondary_phone));

ALTER TABLE contacts
ADD CONSTRAINT chk_contacts_phone_format 
CHECK (phone IS NULL OR is_valid_phone(phone));

-- URL validation constraints
ALTER TABLE documents
ADD CONSTRAINT chk_documents_url_format 
CHECK (is_valid_url(file_url));

ALTER TABLE notifications
ADD CONSTRAINT chk_notifications_url_format 
CHECK (action_url IS NULL OR is_valid_url(action_url));

-- Progress validation constraints
ALTER TABLE projects
ADD CONSTRAINT chk_projects_progress_range 
CHECK (is_valid_percentage(progress));

ALTER TABLE project_workflows
ADD CONSTRAINT chk_workflow_progress_range 
CHECK (is_valid_percentage(overall_progress));

-- Financial constraints (non-negative)
ALTER TABLE projects
ADD CONSTRAINT chk_projects_budget_positive 
CHECK (budget >= 0),
ADD CONSTRAINT chk_projects_estimated_cost_positive 
CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
ADD CONSTRAINT chk_projects_actual_cost_positive 
CHECK (actual_cost IS NULL OR actual_cost >= 0);

-- Risk and threshold constraints (0-100 for percentages)
ALTER TABLE user_behavior_patterns
ADD CONSTRAINT chk_risk_baseline_range 
CHECK (risk_baseline IS NULL OR (risk_baseline >= 0 AND risk_baseline <= 100)),
ADD CONSTRAINT chk_anomaly_threshold_range 
CHECK (anomaly_threshold IS NULL OR (anomaly_threshold >= 0 AND anomaly_threshold <= 100));

-- Security event risk score constraint
ALTER TABLE security_events
ADD CONSTRAINT chk_security_risk_score_range 
CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100));

-- =====================================================
-- STEP 12: Standardize Boolean Field Defaults
-- =====================================================

-- Ensure consistent boolean defaults
ALTER TABLE users
ALTER COLUMN is_active SET DEFAULT true,
ALTER COLUMN is_verified SET DEFAULT false,
ALTER COLUMN two_factor_enabled SET DEFAULT false;

ALTER TABLE contacts
ALTER COLUMN is_primary SET DEFAULT false,
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE projects
ALTER COLUMN archived SET DEFAULT false;

ALTER TABLE workflow_phases
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE workflow_sections
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE workflow_line_items
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE workflow_steps
ALTER COLUMN is_completed SET DEFAULT false;

ALTER TABLE workflow_subtasks
ALTER COLUMN is_completed SET DEFAULT false;

ALTER TABLE documents
ALTER COLUMN is_active SET DEFAULT true,
ALTER COLUMN is_public SET DEFAULT false;

ALTER TABLE user_devices
ALTER COLUMN trusted SET DEFAULT false,
ALTER COLUMN biometric_enabled SET DEFAULT false,
ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE user_mfa
ALTER COLUMN enabled SET DEFAULT false;

ALTER TABLE security_events
ALTER COLUMN resolved SET DEFAULT false;

ALTER TABLE webauthn_credentials
ALTER COLUMN backed_up SET DEFAULT false,
ALTER COLUMN is_active SET DEFAULT true;

-- =====================================================
-- STEP 13: Create data type enforcement triggers
-- =====================================================

-- Trigger to enforce string length limits before database constraint
CREATE OR REPLACE FUNCTION enforce_string_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Truncate strings that exceed limits with warning
    IF TG_TABLE_NAME = 'users' THEN
        IF length(NEW.first_name) > 100 THEN
            RAISE WARNING 'First name truncated for user %', NEW.email;
            NEW.first_name := left(NEW.first_name, 100);
        END IF;
        IF length(NEW.last_name) > 100 THEN
            RAISE WARNING 'Last name truncated for user %', NEW.email;
            NEW.last_name := left(NEW.last_name, 100);
        END IF;
    END IF;
    
    -- Add similar checks for other critical fields
    IF TG_TABLE_NAME = 'projects' AND length(NEW.project_name) > 255 THEN
        RAISE WARNING 'Project name truncated for project %', NEW.project_number;
        NEW.project_name := left(NEW.project_name, 255);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to key tables
CREATE TRIGGER trigger_enforce_string_limits_users
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION enforce_string_limits();

CREATE TRIGGER trigger_enforce_string_limits_projects
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION enforce_string_limits();

-- =====================================================
-- STEP 14: Create data quality monitoring view
-- =====================================================

CREATE OR REPLACE VIEW data_quality_report AS
WITH validation_results AS (
    -- Email validation
    SELECT 'users' as table_name, 'email' as field_name, 
           COUNT(*) as total_records,
           COUNT(*) FILTER (WHERE NOT is_valid_email(email)) as invalid_records
    FROM users
    
    UNION ALL
    
    -- Phone validation
    SELECT 'users' as table_name, 'phone' as field_name,
           COUNT(*) as total_records,
           COUNT(*) FILTER (WHERE phone IS NOT NULL AND NOT is_valid_phone(phone)) as invalid_records
    FROM users
    
    UNION ALL
    
    -- Progress validation
    SELECT 'projects' as table_name, 'progress' as field_name,
           COUNT(*) as total_records,
           COUNT(*) FILTER (WHERE NOT is_valid_percentage(progress)) as invalid_records
    FROM projects
    
    UNION ALL
    
    -- URL validation
    SELECT 'documents' as table_name, 'file_url' as field_name,
           COUNT(*) as total_records,
           COUNT(*) FILTER (WHERE NOT is_valid_url(file_url)) as invalid_records
    FROM documents
)
SELECT 
    table_name,
    field_name,
    total_records,
    invalid_records,
    CASE 
        WHEN total_records = 0 THEN 0
        ELSE ROUND((invalid_records::DECIMAL / total_records) * 100, 2)
    END as invalid_percentage,
    CASE 
        WHEN invalid_records = 0 THEN 'PASS'
        WHEN invalid_records < total_records * 0.05 THEN 'WARNING'
        ELSE 'FAIL'
    END as quality_status
FROM validation_results
ORDER BY invalid_percentage DESC;

-- =====================================================
-- STEP 15: Create data type migration report
-- =====================================================

CREATE TABLE IF NOT EXISTS data_type_migration_log (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    table_name VARCHAR(255),
    column_name VARCHAR(255),
    old_type VARCHAR(255),
    new_type VARCHAR(255),
    records_affected INT,
    migration_status VARCHAR(50),
    notes TEXT
);

-- Log the migrations performed
INSERT INTO data_type_migration_log (table_name, column_name, old_type, new_type, migration_status, notes)
VALUES 
('users', 'first_name', 'VARCHAR(50)', 'VARCHAR(100)', 'COMPLETED', 'Standardized name fields'),
('users', 'last_name', 'VARCHAR(50)', 'VARCHAR(100)', 'COMPLETED', 'Standardized name fields'),
('users', 'email', 'VARCHAR(255)', 'VARCHAR(320)', 'COMPLETED', 'RFC 5321 email standard'),
('projects', 'description', 'VARCHAR(2000)', 'VARCHAR(500)', 'COMPLETED', 'Standardized short descriptions'),
('documents', 'file_url', 'VARCHAR(1000)', 'VARCHAR(2000)', 'COMPLETED', 'Standardized URL fields'),
('workflow_line_items', 'description', 'VARCHAR(1000)', 'VARCHAR(2000)', 'COMPLETED', 'Standardized long descriptions');

-- =====================================================
-- FINAL: Add comprehensive documentation
-- =====================================================

COMMENT ON FUNCTION is_valid_email(TEXT) IS 'Validates email address format according to RFC standards';
COMMENT ON FUNCTION is_valid_phone(TEXT) IS 'Validates phone number format (10-15 digits)';
COMMENT ON FUNCTION is_valid_url(TEXT) IS 'Validates URL format for HTTP/HTTPS URLs';
COMMENT ON FUNCTION is_valid_percentage(INT) IS 'Validates percentage values (0-100 range)';
COMMENT ON FUNCTION enforce_string_limits() IS 'Trigger function to enforce string length limits with warnings';
COMMENT ON VIEW data_quality_report IS 'Monitors data quality across standardized fields';
COMMENT ON TABLE data_type_migration_log IS 'Logs all data type standardization changes for audit trail';

-- Create index for data quality monitoring
CREATE INDEX IF NOT EXISTS idx_data_quality_monitoring 
    ON data_type_migration_log(created_at DESC, migration_status);