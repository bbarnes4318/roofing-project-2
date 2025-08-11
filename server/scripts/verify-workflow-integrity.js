const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyWorkflowIntegrity() {
  console.log('🔍 Verifying Workflow Data Integrity...\n');

  try {
    // 1. Check if currentLineItemId belongs to currentSectionId
    console.log('1️⃣ Checking currentLineItemId belongs to currentSectionId...');
    
    const allTrackers = await prisma.projectWorkflowTracker.findMany({
      where: {
        currentLineItemId: { not: null },
        currentSectionId: { not: null }
      },
      include: {
        project: true,
        currentLineItem: {
          include: {
            section: true
          }
        }
      }
    });

    const lineItemSectionMismatches = allTrackers.filter(tracker => 
      tracker.currentLineItem?.sectionId !== tracker.currentSectionId
    );

    if (lineItemSectionMismatches.length > 0) {
      console.log('❌ VIOLATION: Line items not belonging to their current section:');
      const violationData = lineItemSectionMismatches.map(tracker => ({
        tracker_id: tracker.id,
        project_id: tracker.projectId,
        project_name: tracker.project.projectName,
        current_line_item_id: tracker.currentLineItemId,
        current_section_id: tracker.currentSectionId,
        line_item_section_id: tracker.currentLineItem?.sectionId,
        item_name: tracker.currentLineItem?.itemName
      }));
      console.table(violationData);
    } else {
      console.log('✅ All line items belong to their current sections');
    }

    // 2. Check if workflow_sections.phaseId = currentPhaseId
    console.log('\n2️⃣ Checking workflow_sections.phaseId = currentPhaseId...');
    
    const trackersWithSections = await prisma.projectWorkflowTracker.findMany({
      where: {
        currentSectionId: { not: null },
        currentPhaseId: { not: null }
      },
      include: {
        project: true,
        currentSection: true
      }
    });

    const sectionPhaseMismatches = trackersWithSections.filter(tracker => 
      tracker.currentSection?.phaseId !== tracker.currentPhaseId
    );

    if (sectionPhaseMismatches.length > 0) {
      console.log('❌ VIOLATION: Sections not belonging to their current phase:');
      const violationData = sectionPhaseMismatches.map(tracker => ({
        tracker_id: tracker.id,
        project_id: tracker.projectId,
        project_name: tracker.project.projectName,
        current_section_id: tracker.currentSectionId,
        current_phase_id: tracker.currentPhaseId,
        section_phase_id: tracker.currentSection?.phaseId,
        section_name: tracker.currentSection?.sectionName
      }));
      console.table(violationData);
    } else {
      console.log('✅ All sections belong to their current phases');
    }

    // 3. Check for active projects with NULL IDs
    console.log('\n3️⃣ Checking for active projects with missing workflow IDs...');
    
    const activeProjectsWithNulls = await prisma.projectWorkflowTracker.findMany({
      where: {
        project: {
          archived: false,
          status: { in: ['IN_PROGRESS', 'PENDING'] }
        },
        OR: [
          { currentPhaseId: null },
          { currentSectionId: null },
          { currentLineItemId: null }
        ]
      },
      include: {
        project: true
      }
    });

    if (activeProjectsWithNulls.length > 0) {
      console.log('❌ VIOLATION: Active projects missing required workflow IDs:');
      const violationData = activeProjectsWithNulls.map(tracker => ({
        tracker_id: tracker.id,
        project_id: tracker.projectId,
        project_name: tracker.project.projectName,
        project_status: tracker.project.status,
        archived: tracker.project.archived,
        missing_phase: tracker.currentPhaseId === null,
        missing_section: tracker.currentSectionId === null,
        missing_line_item: tracker.currentLineItemId === null,
        created_at: tracker.createdAt,
        updated_at: tracker.updatedAt
      }));
      console.table(violationData);
    } else {
      console.log('✅ All active projects have required workflow IDs');
    }

    // 4. Summary report
    console.log('\n📊 Summary Report:');
    const totalTrackers = await prisma.projectWorkflowTracker.count();
    const trackersWithPhase = await prisma.projectWorkflowTracker.count({
      where: { currentPhaseId: { not: null } }
    });
    const trackersWithSection = await prisma.projectWorkflowTracker.count({
      where: { currentSectionId: { not: null } }
    });
    const trackersWithLineItem = await prisma.projectWorkflowTracker.count({
      where: { currentLineItemId: { not: null } }
    });
    const activeProjects = await prisma.projectWorkflowTracker.count({
      where: {
        project: {
          archived: false,
          status: { in: ['IN_PROGRESS', 'PENDING'] }
        }
      }
    });

    console.table([{
      total_trackers: totalTrackers,
      trackers_with_phase: trackersWithPhase,
      trackers_with_section: trackersWithSection,
      trackers_with_line_item: trackersWithLineItem,
      active_projects: activeProjects
    }]);

    // 5. Count violations
    console.log('\n🚨 Violation Summary:');
    const violations = [
      { violation_type: 'Line Item Section Mismatch', violation_count: lineItemSectionMismatches.length },
      { violation_type: 'Section Phase Mismatch', violation_count: sectionPhaseMismatches.length },
      { violation_type: 'Active Projects Missing IDs', violation_count: activeProjectsWithNulls.length }
    ];

    console.table(violations);

    const totalViolations = violations.reduce((sum, row) => sum + row.violation_count, 0);
    
    if (totalViolations === 0) {
      console.log('\n🎉 All integrity constraints are satisfied!');
    } else {
      console.log(`\n⚠️  Found ${totalViolations} total violations that need to be fixed.`);
    }

  } catch (error) {
    console.error('Error verifying workflow integrity:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  verifyWorkflowIntegrity();
}

module.exports = { verifyWorkflowIntegrity };