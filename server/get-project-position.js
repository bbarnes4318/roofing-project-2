const { prisma } = require('./config/prisma');

async function getProjectPosition(projectId) {
  try {
    console.log('🎯 GETTING CURRENT PROJECT POSITION...');
    
    if (!projectId) {
      console.log('❌ No project ID provided');
      return;
    }
    
    const tracker = await prisma.$queryRaw`
      SELECT 
        pwt.project_id,
        pwt.current_line_item_id,
        wli.id as line_item_id,
        wli."itemName" as current_line_item,
        ws.id as section_id,
        ws."sectionName" as current_section,
        ws."displayName" as section_display_name,
        wp.id as phase_id,
        wp."phaseName" as current_phase,
        wp."phaseType" as phase_type,
        p."projectName" as project_name,
        p.status as project_status
      FROM project_workflow_trackers pwt
      INNER JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
      INNER JOIN workflow_sections ws ON ws.id = wli.section_id
      INNER JOIN workflow_phases wp ON ws.phase_id = wp.id
      INNER JOIN projects p ON p.id = pwt.project_id
      WHERE pwt.project_id = ${projectId}
    `;
    
    if (tracker.length > 0) {
      const position = tracker[0];
      console.log('🎯 CURRENT PROJECT POSITION:');
      console.log(`  Project: ${position.project_name} (${position.project_status})`);
      console.log(`  Phase: ${position.current_phase} (${position.phase_type})`);
      console.log(`  Section: ${position.section_display_name}`);
      console.log(`  Line Item: ${position.current_line_item}`);
      
      return {
        projectId: position.project_id,
        currentPhase: position.phase_type,
        currentSection: position.section_id,
        currentLineItem: position.line_item_id,
        currentLineItemName: position.current_line_item,
        sectionDisplayName: position.section_display_name,
        phaseName: position.current_phase
      };
    } else {
      console.log('❌ No tracker found for this project');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error getting project position:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

// Test with a real project ID
const testProjectId = 'cme2jhbvf0003a90da4ap1t43'; // Jim Bob project
getProjectPosition(testProjectId);