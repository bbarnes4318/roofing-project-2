/*
  Ensure workflow readiness for existing projects:
  - Upsert per-project workflow record
  - Initialize project workflow tracker to first active line item
  - Ensure there is an active alert for the current line item
*/

const { prisma } = require('../config/prisma');
const WorkflowInitializationService = require('../services/workflowInitializationService');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');
const AlertGenerationService = require('../services/AlertGenerationService');

async function ensureProject(project) {
  // 1) Ensure project workflow exists
  const workflow = await WorkflowInitializationService.ensureWorkflowExists(project.id);

  // 2) Ensure tracker exists and points to a valid first line item
  let tracker = await prisma.projectWorkflowTracker.findUnique({ where: { projectId: project.id } });
  if (!tracker) {
    tracker = await WorkflowProgressionService.initializeProjectWorkflow(project.id);
  }

  // 3) Ensure there is an active alert for the current line item
  if (tracker?.currentLineItemId && workflow?.id) {
    await AlertGenerationService.generateActiveLineItemAlert(project.id, workflow.id, tracker.currentLineItemId);
  }

  return { workflowId: workflow?.id, trackerId: tracker?.id, currentLineItemId: tracker?.currentLineItemId };
}

async function main() {
  try {
    console.log('🔧 Ensuring workflow readiness for existing projects...');

    const projects = await prisma.project.findMany({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      select: { id: true, projectNumber: true, status: true }
    });

    console.log(`🔎 Found ${projects.length} projects to process`);

    let processed = 0;
    for (const project of projects) {
      try {
        const result = await ensureProject(project);
        processed += 1;
        console.log(`✅ Project ${project.projectNumber} ready`, result);
      } catch (err) {
        console.error(`❌ Failed for project ${project.projectNumber}:`, err.message);
      }
    }

    console.log(`🎉 Completed. Processed ${processed}/${projects.length} projects.`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ensuring workflow readiness:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();


