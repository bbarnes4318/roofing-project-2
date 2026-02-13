const express = require('express');
const { prisma } = require('../config/prisma');
const router = express.Router();

/**
 * Get workflow phases for dropdowns (e.g., Add Project form)
 * Returns just the phases without the full structure
 */
router.get('/phases', async (req, res) => {
  try {
    console.log('🔥 API: Loading workflow phases for dropdown...');
    
    const phases = await prisma.workflowPhase.findMany({
      where: { 
        isActive: true,
        workflowType: 'ROOFING'
      },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        phaseType: true,
        phaseName: true,
        displayOrder: true,
        description: true
      }
    });
    
    // Convert to format expected by the frontend
    const formattedPhases = phases.map(phase => ({
      id: phase.phaseType,
      name: phase.phaseName,
      displayName: phase.phaseName,
      displayOrder: phase.displayOrder,
      description: phase.description
    }));
    
    console.log(`📊 API: Loaded ${phases.length} workflow phases for dropdown`);
    
    res.json({
      success: true,
      data: formattedPhases
    });
    
  } catch (error) {
    console.error('❌ API: Error loading workflow phases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load workflow phases',
      error: error.message
    });
  }
});

/**
 * Get full workflow structure from database (legacy - single workflow)
 * @deprecated Use /project-workflows/:projectId for projects with multiple workflows
 */
router.get('/full-structure', async (req, res) => {
  try {
    console.log('🔥 API: Loading full workflow structure (ROOFING only)...');
    
    const phases = await prisma.workflowPhase.findMany({
      where: { workflowType: 'ROOFING' },
      orderBy: { displayOrder: 'asc' },
      include: {
        sections: {
          where: { workflowType: 'ROOFING' },
          orderBy: { displayOrder: 'asc' },
          include: {
            lineItems: {
              where: { isActive: true, workflowType: 'ROOFING' },
              orderBy: { displayOrder: 'asc' }
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
    
    console.log(`📊 API: Loaded ${phases.length} ROOFING phases, ${phases.reduce((acc, p) => acc + p.sections.length, 0)} sections, ${phases.reduce((acc, p) => acc + p.sections.reduce((acc2, s) => acc2 + s.lineItems.length, 0), 0)} line items`);
    
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
 * Get all workflows for a specific project (supports system + custom workflows)
 */
router.get('/project-workflows/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🚀 API: Loading all workflows for project:', projectId);
    
    // Build a recursive include for N-level deep children (practical limit: 10 levels)
    const buildChildrenInclude = (depth) => {
      if (depth <= 0) return {};
      return {
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: buildChildrenInclude(depth - 1)
        }
      };
    };

    const lineItemInclude = {
      where: { isActive: true, parentId: null }, // Only top-level items; children loaded recursively
      orderBy: { displayOrder: 'asc' },
      include: buildChildrenInclude(10)
    };

    // Get all workflow trackers for this project
    const trackers = await prisma.projectWorkflowTracker.findMany({
      where: { projectId },
      include: {
        currentPhase: true,
        currentSection: true,
        currentLineItem: true,
        completedItems: {
          include: {
            completedBy: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: [
        { isMainWorkflow: 'desc' }, // Main workflow first
        { workflowType: 'asc' }
      ]
    });

    if (trackers.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const workflows = [];

    // Helper to recursively format line items with children
    const formatSubtasks = (items, completedItemIds) => {
      if (!items) return [];
      return items.map(item => ({
        id: item.id,
        label: item.itemName,
        isCompleted: completedItemIds.has(item.id),
        parentId: item.parentId || null,
        children: formatSubtasks(item.children, completedItemIds)
      }));
    };

    // Helper to count all items recursively (for progress)
    const countItemsRecursive = (items) => {
      if (!items) return 0;
      return items.reduce((acc, item) => acc + 1 + countItemsRecursive(item.children), 0);
    };

    for (const tracker of trackers) {
      let phases;

      if (tracker.workflowType === 'CUSTOM' && tracker.customWorkflowId) {
        // Custom workflow: load phases linked to custom workflow definition
        phases = await prisma.workflowPhase.findMany({
          where: { customWorkflowId: tracker.customWorkflowId, isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            sections: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              include: { lineItems: lineItemInclude }
            }
          }
        });
      } else {
        // System workflow: load phases by workflowType (existing behavior)
        phases = await prisma.workflowPhase.findMany({
          where: { workflowType: tracker.workflowType, customWorkflowId: null },
          orderBy: { displayOrder: 'asc' },
          include: {
            sections: {
              where: { workflowType: tracker.workflowType },
              orderBy: { displayOrder: 'asc' },
              include: { lineItems: lineItemInclude }
            }
          }
        });
      }

      const completedItemIds = new Set(tracker.completedItems.map(item => item.lineItemId));

      // Convert to React format
      const reactFormat = phases.map(phase => ({
        id: phase.phaseType || phase.id, // Custom phases use id, system phases use phaseType
        label: phase.phaseName,
        phaseId: phase.id,
        isCustom: tracker.workflowType === 'CUSTOM',
        items: phase.sections.map(section => ({
          id: section.id,
          label: section.displayName || section.sectionName,
          subtasks: formatSubtasks(section.lineItems, completedItemIds)
        }))
      }));

      const totalCount = phases.reduce((acc, p) => acc + p.sections.reduce(
        (acc2, s) => acc2 + countItemsRecursive(s.lineItems), 0
      ), 0);

      workflows.push({
        workflowType: tracker.workflowType,
        customWorkflowId: tracker.customWorkflowId || null,
        tradeName: tracker.tradeName || getWorkflowDisplayName(tracker.workflowType),
        isMainWorkflow: tracker.isMainWorkflow,
        trackerId: tracker.id,
        currentPhase: tracker.currentPhase?.phaseType || tracker.currentPhase?.id,
        currentSection: tracker.currentSection?.id,
        currentLineItem: tracker.currentLineItem?.id,
        phases: reactFormat,
        completedCount: tracker.completedItems.length,
        totalCount
      });
    }

    console.log(`📊 API: Loaded ${workflows.length} workflows for project ${projectId}`);
    workflows.forEach(w => console.log(`  - ${w.workflowType}${w.customWorkflowId ? ` (custom: ${w.tradeName})` : ''}: ${w.completedCount}/${w.totalCount} completed`));
    
    res.json({
      success: true,
      data: workflows
    });
    
  } catch (error) {
    console.error('❌ API: Error loading project workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load project workflows',
      error: error.message
    });
  }
});

function getWorkflowDisplayName(workflowType) {
  const displayNames = {
    'ROOFING': 'Roofing',
    'GUTTERS': 'Gutters',
    'INTERIOR_PAINT': 'Interior Paint',
    'KITCHEN_REMODEL': 'Kitchen Remodel',
    'BATHROOM_RENOVATION': 'Bathroom Renovation',
    'SIDING': 'Siding',
    'WINDOWS': 'Windows',
    'GENERAL': 'General'
  };
  return displayNames[workflowType] || workflowType;
}

/**
 * Get current project position for auto-navigation
 */
router.get('/project-position/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('🎯 API: Getting project position for:', projectId);
    
    // Try direct join on current_line_item_id first
    let tracker = await prisma.$queryRaw`
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
    
    // If no row (no tracker or null current_line_item_id), DO NOT mutate state on read.
    if (!tracker || tracker.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No active workflow position found for this project'
      });
    }

    if (tracker && tracker.length > 0) {
      const position = tracker[0];
      
      // Return both canonical IDs and compatibility aliases used on the frontend
      const result = {
        projectId: position.project_id,
        // Frontend expects phase.id for structure matching; provide both
        currentPhase: position.phase_id, // canonical ID
        phaseType: position.phase_type,  // compatibility alias
        currentSection: position.section_id,
        currentSectionId: position.section_id,
        currentLineItem: position.line_item_id,
        currentLineItemId: position.line_item_id,
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