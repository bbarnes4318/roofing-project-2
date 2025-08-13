/**
 * COMPLETE ProjectWorkflowTracker Migration Script
 * This script will create/update ProjectWorkflowTracker records for all projects
 * based on their current workflow.steps completion status
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Phase progression order
const PHASE_ORDER = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SECOND_SUPPLEMENT', 'COMPLETION'];

async function migrateProjectWorkflowTrackers() {
  console.log('🚀 Starting ProjectWorkflowTracker migration...');
  
  try {
    // Get all projects with workflow steps
    const projects = await prisma.project.findMany({
      include: {
        workflow: {
          include: {
            steps: true
          }
        },
        workflowTracker: true // Check if tracker already exists
      }
    });

    console.log(`📊 Found ${projects.length} projects to process`);

    let processed = 0;
    let created = 0;
    let updated = 0;

    for (const project of projects) {
      if (!project.workflow || !project.workflow.steps || project.workflow.steps.length === 0) {
        console.log(`⏭️ Skipping project ${project.projectNumber} - no workflow steps`);
        continue;
      }

      console.log(`\n🔍 Processing project ${project.projectNumber}...`);
      
      // Calculate current workflow position based on completed steps
      const workflowPosition = calculateWorkflowPosition(project.workflow.steps, project.id);
      
      if (!workflowPosition) {
        console.log(`❌ Could not calculate workflow position for project ${project.projectNumber}`);
        continue;
      }

      // Create or update ProjectWorkflowTracker
      const trackerData = {
        currentPhaseId: workflowPosition.currentPhaseId,
        currentSectionId: workflowPosition.currentSectionId, 
        currentLineItemId: workflowPosition.currentLineItemId,
        lastCompletedItemId: workflowPosition.lastCompletedItemId,
        updatedAt: new Date()
      };

      if (project.workflowTracker) {
        // Update existing tracker
        await prisma.projectWorkflowTracker.update({
          where: { id: project.workflowTracker.id },
          data: trackerData
        });
        updated++;
        console.log(`✅ Updated tracker for project ${project.projectNumber}`);
      } else {
        // Create new tracker
        await prisma.projectWorkflowTracker.create({
          data: {
            ...trackerData,
            projectId: project.id,
            createdAt: new Date()
          }
        });
        created++;
        console.log(`✅ Created tracker for project ${project.projectNumber}`);
      }

      processed++;

      // Log progress every 10 projects
      if (processed % 10 === 0) {
        console.log(`📈 Progress: ${processed}/${projects.length} projects processed`);
      }
    }

    console.log(`\n🎉 ProjectWorkflowTracker migration completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Projects processed: ${processed}`);
    console.log(`   - Trackers created: ${created}`);
    console.log(`   - Trackers updated: ${updated}`);
    console.log(`   - Total projects: ${projects.length}`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Calculate the current workflow position based on completed steps
 */
function calculateWorkflowPosition(steps, projectId) {
  if (!steps || steps.length === 0) return null;

  console.log(`   📋 Analyzing ${steps.length} workflow steps...`);

  // Group steps by phase
  const stepsByPhase = {};
  PHASE_ORDER.forEach(phase => {
    stepsByPhase[phase] = steps.filter(step => 
      step.phase?.toUpperCase() === phase
    ).sort((a, b) => a.stepOrder - b.stepOrder);
  });

  // Find completed and incomplete steps
  let allCompleted = true;
  let lastCompletedStep = null;
  let currentIncompleteStep = null;
  let currentPhase = null;
  let totalSteps = steps.length;
  let completedSteps = 0;

  // Count completed steps
  steps.forEach(step => {
    if (step.isCompleted) {
      completedSteps++;
      if (!lastCompletedStep || step.completedAt > lastCompletedStep.completedAt) {
        lastCompletedStep = step;
      }
    }
  });

  // Find first incomplete step in phase order
  for (const phase of PHASE_ORDER) {
    const phaseSteps = stepsByPhase[phase] || [];
    const incompleteSteps = phaseSteps.filter(step => !step.isCompleted);
    
    if (incompleteSteps.length > 0) {
      currentIncompleteStep = incompleteSteps[0]; // First incomplete step in this phase
      currentPhase = phase;
      allCompleted = false;
      break;
    }
  }

  // If all steps completed, mark as complete
  if (allCompleted || completedSteps === totalSteps) {
    currentPhase = 'COMPLETION';
    console.log(`   ✅ All steps complete - phase: COMPLETION`);
  } else {
    console.log(`   🎯 Current phase: ${currentPhase} (${completedSteps}/${totalSteps} steps complete)`);
  }

  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  return {
    currentPhaseId: getMockPhaseId(currentPhase),
    currentSectionId: null, // Don't link to sections for now
    currentLineItemId: null, // Don't link to line items for now
    lastCompletedItemId: null, // Don't link to completed items for now
    progressPercentage: progressPercentage,
    isComplete: allCompleted
  };
}

/**
 * Get real WorkflowPhase IDs from the database
 */
function getMockPhaseId(phase) {
  const phaseIds = {
    'LEAD': 'cmdz32fob0000umpc9m2kyph2',
    'PROSPECT': 'cmdz32gyl0011umpcfry7utim', 
    'APPROVED': 'cmdz32ing0033umpc4ixpym7z',
    'EXECUTION': 'cmdz32jzp004aumpcxxcspp8d',
    'SECOND_SUPPLEMENT': 'cme1pk1r90000umz4tmheyw7g',
    'COMPLETION': 'cmdz32qpc006eumpc31hcjco7'
  };
  return phaseIds[phase] || null;
}

/**
 * Generate consistent mock IDs for sections
 */
function getMockSectionId(sectionName) {
  if (!sectionName) return null;
  
  // Create a simple hash-based ID from section name
  const hash = sectionName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `section_${hash}_${sectionName.length}`;
}

// Run the migration
if (require.main === module) {
  migrateProjectWorkflowTrackers();
}

module.exports = { migrateProjectWorkflowTrackers, calculateWorkflowPosition };