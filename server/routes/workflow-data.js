const express = require('express');
const { prisma } = require('../config/prisma');
const router = express.Router();

/**
 * Get full workflow structure from database
 */
router.get('/full-structure', async (req, res) => {
  try {
    console.log('🔥 API: Loading full workflow structure...');
    
    const phases = await prisma.workflowPhase.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            lineItems: {
              orderBy: { displayOrder: 'asc' },
              where: { isActive: true }
            }
          }
        }
      }
    });
    
    // Convert to React format with stable IDs for sections and line items
    const reactFormat = phases.map(phase => ({
      id: phase.phaseType,
      label: phase.phaseName,
      items: phase.sections.map(section => ({
        id: section.id,
        label: section.displayName || section.sectionName,
        // Include both id and label for each line item to support reliable actions
        subtasks: section.lineItems.map(item => ({ id: item.id, label: item.itemName }))
      }))
    }));
    
    console.log(`📊 API: Loaded ${phases.length} phases, ${phases.reduce((acc, p) => acc + p.sections.length, 0)} sections, ${phases.reduce((acc, p) => acc + p.sections.reduce((acc2, s) => acc2 + s.lineItems.length, 0), 0)} line items`);
    
    res.json({
      success: true,
      data: reactFormat
    });
    
  } catch (error) {
    console.error('❌ API: Error loading workflow structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load workflow structure',
      error: error.message
    });
  }
});

/**
 * Get current project position for auto-navigation
 */
router.get('/project-position/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🎯 API: Getting project position for:', projectId);
    
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
      
      const result = {
        projectId: position.project_id,
        currentPhase: position.phase_type,
        currentSection: position.section_id,
        currentLineItem: position.line_item_id,
        currentLineItemName: position.current_line_item,
        sectionDisplayName: position.section_display_name,
        phaseName: position.current_phase
      };
      
      console.log('🎯 API: Found position:', result);
      
      res.json({
        success: true,
        data: result
      });
    } else {
      console.log('❌ API: No tracker found for project:', projectId);
      res.json({
        success: false,
        message: 'No workflow tracker found for this project',
        data: null
      });
    }
    
  } catch (error) {
    console.error('❌ API: Error getting project position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project position',
      error: error.message
    });
  }
});

module.exports = router;