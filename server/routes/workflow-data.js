const express = require('express');
const { prisma } = require('../config/prisma');
const AlertGenerationService = require('../services/AlertGenerationService');
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

// ─── Custom Workflow Endpoints ────────────────────────────────────────────

/**
 * List all custom workflows (for dropdowns & builder page)
 */
router.get('/custom-workflows', async (req, res) => {
  try {
    const workflows = await prisma.customWorkflow.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        phases: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            sections: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              include: {
                lineItems: {
                  where: { isActive: true },
                  orderBy: { displayOrder: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    const formatted = workflows.map(w => {
      const totalItems = w.phases.reduce((acc, p) =>
        acc + p.sections.reduce((acc2, s) => acc2 + s.lineItems.length, 0), 0
      );
      return {
        id: w.id,
        name: w.name,
        description: w.description,
        createdBy: w.createdBy ? `${w.createdBy.firstName} ${w.createdBy.lastName}` : 'System',
        createdAt: w.createdAt,
        totalPhases: w.phases.length,
        totalItems,
        phases: w.phases.map(p => ({
          id: p.id,
          phaseName: p.phaseName,
          phaseType: p.phaseType,
          sections: p.sections.map(s => ({
            id: s.id,
            sectionName: s.sectionName,
            displayName: s.displayName,
            lineItems: s.lineItems.map(li => ({
              id: li.id,
              itemLetter: li.itemLetter,
              itemName: li.itemName,
              responsibleRole: li.responsibleRole,
              displayOrder: li.displayOrder
            }))
          }))
        }))
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('❌ API: Error loading custom workflows:', error);
    res.status(500).json({ success: false, message: 'Failed to load custom workflows', error: error.message });
  }
});

/**
 * Create a new custom workflow with phases, sections, and line items
 */
router.post('/custom-workflows', async (req, res) => {
  try {
    const { name, description, phases, createdById } = req.body;

    if (!name || !phases || !Array.isArray(phases) || phases.length === 0) {
      return res.status(400).json({ success: false, message: 'Name and at least one phase are required' });
    }

    const workflow = await prisma.customWorkflow.create({
      data: {
        name,
        description: description || null,
        createdById: createdById || null,
        phases: {
          create: phases.map((phase, pi) => ({
            phaseName: phase.phaseName || `Phase ${pi + 1}`,
            phaseType: phase.phaseType || null,
            displayOrder: pi + 1,
            description: phase.description || null,
            workflowType: 'CUSTOM',
            sections: {
              create: (phase.sections || []).map((section, si) => ({
                sectionNumber: String(si + 1),
                sectionName: section.sectionName || `Section ${si + 1}`,
                displayName: section.displayName || section.sectionName || `Section ${si + 1}`,
                displayOrder: si + 1,
                description: section.description || null,
                workflowType: 'CUSTOM',
                lineItems: {
                  create: (section.lineItems || []).map((item, li) => ({
                    itemLetter: item.itemLetter || String.fromCharCode(97 + li),
                    itemName: item.itemName,
                    responsibleRole: item.responsibleRole || 'ADMINISTRATION',
                    displayOrder: li + 1,
                    description: item.description || null,
                    workflowType: 'CUSTOM',
                    estimatedMinutes: item.estimatedMinutes || 60,
                    alertDays: item.alertDays || 1,
                    daysToComplete: item.daysToComplete || 1
                  }))
                }
              }))
            }
          }))
        }
      },
      include: {
        phases: {
          include: {
            sections: {
              include: { lineItems: true }
            }
          }
        }
      }
    });

    console.log(`✅ Created custom workflow "${name}" with ${workflow.phases.length} phases`);
    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    console.error('❌ API: Error creating custom workflow:', error);
    res.status(500).json({ success: false, message: 'Failed to create custom workflow', error: error.message });
  }
});

/**
 * Combine selected line items from multiple workflows into a new custom workflow
 * Body: { name, description, items: [{ lineItemId, displayOrder }], createdById }
 */
router.post('/custom-workflows/combine', async (req, res) => {
  try {
    const { name, description, items, createdById } = req.body;

    if (!name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Name and at least one line item are required' });
    }

    // Fetch all selected line items with their section/phase context
    const lineItemIds = items.map(i => i.lineItemId);
    const sourceItems = await prisma.workflowLineItem.findMany({
      where: { id: { in: lineItemIds } },
      include: {
        section: {
          include: { phase: true }
        }
      }
    });

    if (sourceItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid line items found' });
    }

    // Build a map for ordering
    const orderMap = {};
    items.forEach((item, idx) => { orderMap[item.lineItemId] = item.displayOrder || (idx + 1); });

    // Sort by the requested display order
    sourceItems.sort((a, b) => (orderMap[a.id] || 0) - (orderMap[b.id] || 0));

    // Create a single "Combined" phase with a single section containing all items
    const workflow = await prisma.customWorkflow.create({
      data: {
        name,
        description: description || `Combined workflow from ${sourceItems.length} line items`,
        createdById: createdById || null,
        phases: {
          create: [{
            phaseName: 'Combined Workflow',
            displayOrder: 1,
            workflowType: 'CUSTOM',
            sections: {
              create: [{
                sectionNumber: '1',
                sectionName: name,
                displayName: name,
                displayOrder: 1,
                workflowType: 'CUSTOM',
                lineItems: {
                  create: sourceItems.map((item, idx) => ({
                    itemLetter: String.fromCharCode(97 + (idx % 26)),
                    itemName: item.itemName,
                    responsibleRole: item.responsibleRole,
                    displayOrder: idx + 1,
                    description: item.description || null,
                    workflowType: 'CUSTOM',
                    estimatedMinutes: item.estimatedMinutes || 60,
                    alertDays: item.alertDays || 1,
                    daysToComplete: item.daysToComplete || 1
                  }))
                }
              }]
            }
          }]
        }
      },
      include: {
        phases: {
          include: {
            sections: {
              include: { lineItems: { orderBy: { displayOrder: 'asc' } } }
            }
          }
        }
      }
    });

    console.log(`✅ Created combined workflow "${name}" with ${sourceItems.length} line items`);
    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    console.error('❌ API: Error combining workflows:', error);
    res.status(500).json({ success: false, message: 'Failed to combine workflows', error: error.message });
  }
});

/**
 * Add a workflow tracker to an existing project
 * Creates a projectWorkflowTracker, sets currentLineItemId to first item,
 * and triggers alert generation so the item shows up immediately in the dashboard.
 *
 * Body: { customWorkflowId, tradeName }  — for custom workflows
 *   OR  { workflowType, tradeName }      — for system workflows
 */
router.post('/project/:projectId/add-workflow', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { customWorkflowId, workflowType, tradeName } = req.body;

    // Validate project exists
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, projectNumber: true } });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    let tracker;

    if (customWorkflowId) {
      // ── Custom Workflow ──────────────────────────────────────────────
      const customWorkflow = await prisma.customWorkflow.findUnique({
        where: { id: customWorkflowId },
        select: { id: true, name: true }
      });
      if (!customWorkflow) {
        return res.status(404).json({ success: false, message: 'Custom workflow not found' });
      }

      // Check for duplicate tracker
      const existing = await prisma.projectWorkflowTracker.findFirst({
        where: { projectId, workflowType: 'CUSTOM', customWorkflowId }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'This workflow is already assigned to the project' });
      }

      // Create tracker
      tracker = await prisma.projectWorkflowTracker.create({
        data: {
          projectId,
          workflowType: 'CUSTOM',
          customWorkflowId,
          isMainWorkflow: false,
          tradeName: tradeName || customWorkflow.name,
          totalLineItems: 0,
          phaseStartedAt: new Date(),
          sectionStartedAt: new Date(),
          lineItemStartedAt: new Date()
        }
      });

      // Resolve first phase → section → line item
      const firstPhase = await prisma.workflowPhase.findFirst({
        where: { customWorkflowId, isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          sections: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            include: {
              lineItems: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' },
                take: 1
              }
            },
            take: 1
          }
        }
      });

      if (firstPhase && firstPhase.sections[0] && firstPhase.sections[0].lineItems[0]) {
        const totalItems = await prisma.workflowLineItem.count({
          where: {
            section: { phase: { customWorkflowId } },
            isActive: true
          }
        });

        tracker = await prisma.projectWorkflowTracker.update({
          where: { id: tracker.id },
          data: {
            currentPhaseId: firstPhase.id,
            currentSectionId: firstPhase.sections[0].id,
            currentLineItemId: firstPhase.sections[0].lineItems[0].id,
            totalLineItems: totalItems
          }
        });
      }

      console.log(`✅ Added CUSTOM workflow "${customWorkflow.name}" to project ${project.projectNumber} (tracker ${tracker.id})`);

    } else if (workflowType) {
      // ── System Workflow ──────────────────────────────────────────────
      const existing = await prisma.projectWorkflowTracker.findFirst({
        where: { projectId, workflowType, customWorkflowId: null }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'This workflow type is already assigned to the project' });
      }

      // Use WorkflowProgressionService for system workflows
      const WorkflowProgressionService = require('../services/WorkflowProgressionService');
      const initResult = await WorkflowProgressionService.initializeProjectWorkflow(
        projectId,
        workflowType,
        false, // not main workflow
        'LEAD'
      );
      tracker = initResult?.tracker || initResult;
      console.log(`✅ Added system workflow "${workflowType}" to project ${project.projectNumber}`);

    } else {
      return res.status(400).json({ success: false, message: 'Either customWorkflowId or workflowType is required' });
    }

    // Trigger alert generation immediately
    try {
      const alerts = await AlertGenerationService.generateBatchAlerts([projectId]);
      console.log(`🔔 Generated ${alerts?.length || 0} alert(s) after adding workflow to project ${project.projectNumber}`);
    } catch (alertErr) {
      console.warn('⚠️ Alert generation after add-workflow failed:', alertErr?.message);
    }

    res.status(201).json({
      success: true,
      message: 'Workflow added to project successfully',
      data: {
        trackerId: tracker.id,
        projectId,
        workflowType: tracker.workflowType,
        customWorkflowId: tracker.customWorkflowId || null,
        tradeName: tracker.tradeName,
        currentLineItemId: tracker.currentLineItemId,
        totalLineItems: tracker.totalLineItems
      }
    });

  } catch (error) {
    console.error('❌ API: Error adding workflow to project:', error);
    res.status(500).json({ success: false, message: 'Failed to add workflow to project', error: error.message });
  }
});

module.exports = router;