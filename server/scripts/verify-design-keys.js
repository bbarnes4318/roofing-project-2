const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDesignKeys() {
  console.log('🔍 Verifying Design Key Mappings...\n');

  try {
    // Test with a sample project ID (we'll use the first available)
    const firstTracker = await prisma.projectWorkflowTracker.findFirst({
      where: {
        currentLineItemId: { not: null },
        currentSectionId: { not: null },
        currentPhaseId: { not: null }
      }
    });

    if (!firstTracker) {
      console.log('❌ No complete workflow trackers found for testing');
      return;
    }

    const PROJECT_ID = firstTracker.projectId;
    console.log(`Using project ${PROJECT_ID} for testing...\n`);

    // 1. Verify targetLineItemId design key mapping
    console.log('1️⃣ Verifying targetLineItemId = project_workflow_trackers.currentLineItemId → workflow_line_items.id');
    
    const lineItemMapping = await prisma.projectWorkflowTracker.findFirst({
      where: { projectId: PROJECT_ID },
      include: {
        currentLineItem: true
      }
    });

    if (lineItemMapping && lineItemMapping.currentLineItemId && lineItemMapping.currentLineItem) {
      console.log('✅ targetLineItemId mapping works:');
      console.log(`   currentLineItemId: ${lineItemMapping.currentLineItemId}`);
      console.log(`   → workflow_line_items.id: ${lineItemMapping.currentLineItem.id}`);
      console.log(`   → itemName: "${lineItemMapping.currentLineItem.itemName}"`);
    } else {
      console.log('❌ targetLineItemId mapping failed');
    }

    // 2. Verify targetSectionId design key mapping  
    console.log('\n2️⃣ Verifying targetSectionId = project_workflow_trackers.currentSectionId → workflow_sections.id');
    
    const sectionMapping = await prisma.projectWorkflowTracker.findFirst({
      where: { projectId: PROJECT_ID },
      include: {
        currentSection: true
      }
    });

    if (sectionMapping && sectionMapping.currentSectionId && sectionMapping.currentSection) {
      console.log('✅ targetSectionId mapping works:');
      console.log(`   currentSectionId: ${sectionMapping.currentSectionId}`);
      console.log(`   → workflow_sections.id: ${sectionMapping.currentSection.id}`);
      console.log(`   → sectionName: "${sectionMapping.currentSection.sectionName}"`);
    } else {
      console.log('❌ targetSectionId mapping failed');
    }

    // 3. Verify phase expand key mapping
    console.log('\n3️⃣ Verifying phase expand key = workflow_phases.phaseType where workflow_phases.id = workflow_sections.phaseId');
    
    const phaseMapping = await prisma.projectWorkflowTracker.findFirst({
      where: { projectId: PROJECT_ID },
      include: {
        currentPhase: true,
        currentSection: {
          include: {
            phase: true
          }
        }
      }
    });

    if (phaseMapping && phaseMapping.currentSection?.phase) {
      console.log('✅ phase expand key mapping works:');
      console.log(`   currentPhaseId: ${phaseMapping.currentPhaseId}`);
      console.log(`   → workflow_phases.id: ${phaseMapping.currentSection.phase.id}`);
      console.log(`   → workflow_phases.phaseType: "${phaseMapping.currentSection.phase.phaseType}"`);
      console.log(`   → phaseName: "${phaseMapping.currentSection.phase.phaseName}"`);
    } else {
      console.log('❌ phase expand key mapping failed');
    }

    // 4. Test your schema integrity query for tracker validation
    console.log('\n4️⃣ Testing schema integrity query for tracker validation...');
    
    const trackerValidation = await prisma.$queryRaw`
      SELECT 1 as valid
      FROM project_workflow_trackers t 
      JOIN workflow_line_items li ON li.id = t.current_line_item_id 
      JOIN workflow_sections s ON s.id = t.current_section_id AND s.id = li.section_id 
      JOIN workflow_phases p ON p.id = t.current_phase_id AND p.id = s.phase_id 
      WHERE t.project_id = ${PROJECT_ID}
    `;

    if (trackerValidation.length > 0) {
      console.log('✅ Tracker validation query works - all relationships are valid');
    } else {
      console.log('❌ Tracker validation query returned no results - check relationships');
    }

    // 5. Test alerts metadata verification
    console.log('\n5️⃣ Testing alerts metadata for DB IDs...');
    
    const alertsWithMetadata = await prisma.$queryRaw`
      SELECT 
        id, 
        project_id as "projectId", 
        step_id as "stepId", 
        metadata->>'sectionId' AS "sectionId", 
        metadata->>'phaseId' AS "phaseId",
        metadata->>'lineItemId' AS "lineItemId"
      FROM workflow_alerts 
      WHERE project_id = ${PROJECT_ID} 
        AND status = 'ACTIVE'
    `;

    if (alertsWithMetadata.length > 0) {
      console.log('✅ Active alerts found with metadata:');
      console.table(alertsWithMetadata);
    } else {
      console.log('ℹ️  No active alerts found for this project');
      
      // Check if there are any alerts at all for this project
      const anyAlerts = await prisma.workflowAlert.findMany({
        where: { projectId: PROJECT_ID },
        select: {
          id: true,
          status: true,
          metadata: true
        }
      });
      
      if (anyAlerts.length > 0) {
        console.log('📊 Found alerts with different statuses:');
        console.table(anyAlerts);
      } else {
        console.log('📊 No alerts exist for this project yet');
      }
    }

    // 6. Verify full structure for workflow page matching
    console.log('\n6️⃣ Testing full structure API format for workflow page matching...');
    
    const fullStructure = await prisma.workflowPhase.findMany({
      include: {
        sections: {
          include: {
            lineItems: {
              select: {
                id: true,
                itemName: true
              }
            }
          }
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    if (fullStructure.length > 0) {
      console.log('✅ Full structure API format ready:');
      console.log('Sample structure format:');
      const samplePhase = fullStructure[0];
      const sampleSection = samplePhase.sections[0];
      const sampleLineItem = sampleSection?.lineItems[0];
      
      if (sampleLineItem) {
        console.log(`Phase: ${samplePhase.phaseName} (${samplePhase.phaseType})`);
        console.log(`  └─ Section: ${sampleSection.sectionName}`);
        console.log(`     └─ LineItem: { id: "${sampleLineItem.id}", label: "${sampleLineItem.itemName}" }`);
      }
    } else {
      console.log('❌ No workflow structure found');
    }

    console.log('\n🎉 Design key verification complete!');

  } catch (error) {
    console.error('Error verifying design keys:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  verifyDesignKeys();
}

module.exports = { verifyDesignKeys };