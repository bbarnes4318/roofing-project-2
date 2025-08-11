-- SQL queries to verify workflow data integrity constraints
-- Run these queries against your PostgreSQL database

-- 1. Check if currentLineItemId belongs to currentSectionId
-- This should return 0 rows if all data is consistent
SELECT 
    pwt.id as tracker_id,
    pwt.project_id,
    p.project_name,
    pwt.current_line_item_id,
    pwt.current_section_id,
    wli.section_id as line_item_section_id,
    wli.item_name
FROM project_workflow_trackers pwt
JOIN projects p ON p.id = pwt.project_id
JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
WHERE pwt.current_line_item_id IS NOT NULL 
  AND pwt.current_section_id IS NOT NULL
  AND wli.section_id != pwt.current_section_id;

-- 2. Check if workflow_sections.phaseId = currentPhaseId  
-- This should return 0 rows if all data is consistent
SELECT 
    pwt.id as tracker_id,
    pwt.project_id,
    p.project_name,
    pwt.current_section_id,
    pwt.current_phase_id,
    ws.phase_id as section_phase_id,
    ws.section_name
FROM project_workflow_trackers pwt
JOIN projects p ON p.id = pwt.project_id
JOIN workflow_sections ws ON ws.id = pwt.current_section_id
WHERE pwt.current_section_id IS NOT NULL 
  AND pwt.current_phase_id IS NOT NULL
  AND ws.phase_id != pwt.current_phase_id;

-- 3. Check for active projects with NULL IDs
-- This should show projects that are missing required workflow tracking data
SELECT 
    pwt.id as tracker_id,
    pwt.project_id,
    p.project_name,
    p.status as project_status,
    p.archived,
    pwt.current_phase_id IS NULL as missing_phase,
    pwt.current_section_id IS NULL as missing_section,
    pwt.current_line_item_id IS NULL as missing_line_item,
    pwt.created_at,
    pwt.updated_at
FROM project_workflow_trackers pwt
JOIN projects p ON p.id = pwt.project_id
WHERE p.archived = false 
  AND p.status IN ('IN_PROGRESS', 'PENDING')
  AND (pwt.current_phase_id IS NULL 
       OR pwt.current_section_id IS NULL 
       OR pwt.current_line_item_id IS NULL);

-- 4. Summary report of all workflow trackers with their current state
SELECT 
    pwt.project_id,
    p.project_name,
    p.status as project_status,
    p.archived,
    wp.phase_name as current_phase,
    ws.section_name as current_section,
    wli.item_name as current_line_item,
    pwt.current_phase_id IS NOT NULL as has_phase,
    pwt.current_section_id IS NOT NULL as has_section,
    pwt.current_line_item_id IS NOT NULL as has_line_item,
    pwt.updated_at as last_updated
FROM project_workflow_trackers pwt
JOIN projects p ON p.id = pwt.project_id
LEFT JOIN workflow_phases wp ON wp.id = pwt.current_phase_id
LEFT JOIN workflow_sections ws ON ws.id = pwt.current_section_id
LEFT JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
ORDER BY p.project_name;

-- 5. Count of integrity violations by type
SELECT 
    'Line Item Section Mismatch' as violation_type,
    COUNT(*) as violation_count
FROM project_workflow_trackers pwt
JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
WHERE pwt.current_line_item_id IS NOT NULL 
  AND pwt.current_section_id IS NOT NULL
  AND wli.section_id != pwt.current_section_id

UNION ALL

SELECT 
    'Section Phase Mismatch' as violation_type,
    COUNT(*) as violation_count
FROM project_workflow_trackers pwt
JOIN workflow_sections ws ON ws.id = pwt.current_section_id
WHERE pwt.current_section_id IS NOT NULL 
  AND pwt.current_phase_id IS NOT NULL
  AND ws.phase_id != pwt.current_phase_id

UNION ALL

SELECT 
    'Active Projects Missing IDs' as violation_type,
    COUNT(*) as violation_count
FROM project_workflow_trackers pwt
JOIN projects p ON p.id = pwt.project_id
WHERE p.archived = false 
  AND p.status IN ('IN_PROGRESS', 'PENDING')
  AND (pwt.current_phase_id IS NULL 
       OR pwt.current_section_id IS NULL 
       OR pwt.current_line_item_id IS NULL);