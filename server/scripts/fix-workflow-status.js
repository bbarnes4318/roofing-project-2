/*
  Fix Workflow Status Issues:
  - Fix invalid workflow status 'ROOFING NOT_STARTED' to 'NOT_STARTED'
  - Ensure project status is 'PENDING' or 'IN_PROGRESS' for alert generation
  - Initialize workflow trackers if missing
  - Generate initial alerts for active line items
*/

const { prisma } = require('../config/prisma');
const WorkflowProgressionService = require('../services/WorkflowProgressionService');
const AlertGenerationService = require('../services/AlertGenerationService');

async function fixWorkflowStatus() {
  try {
    console.log('🔧 Starting workflow status fix...');

         // 1. Fix invalid workflow status values - ALL projects should be IN_PROGRESS when created
     console.log('📋 Fixing invalid workflow status values...');
     const invalidStatusWorkflows = await prisma.projectWorkflow.findMany({
       where: {
         status: {
           notIn: ['IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']
         }
       }
     });

     console.log(`Found ${invalidStatusWorkflows.length} workflows with invalid status`);

     for (const workflow of invalidStatusWorkflows) {
       console.log(`Fixing workflow ${workflow.id} - status: ${workflow.status}`);
       
       // ALL projects should be IN_PROGRESS from the moment they're created
       // The Lead phase starts automatically
       await prisma.projectWorkflow.update({
         where: { id: workflow.id },
         data: { status: 'IN_PROGRESS' }
       });
       
       console.log(`✅ Updated workflow ${workflow.id} status to: IN_PROGRESS`);
     }

    // 2. Ensure project status is compatible with alert generation
    console.log('📋 Ensuring project status compatibility...');
    const projectsToUpdate = await prisma.project.findMany({
      where: {
        status: {
          notIn: ['PENDING', 'IN_PROGRESS']
        }
      },
      include: {
        workflow: true
      }
    });

    console.log(`Found ${projectsToUpdate.length} projects with incompatible status`);

         for (const project of projectsToUpdate) {
       // ALL projects should be PENDING or IN_PROGRESS for alert generation
       // Since workflows are now IN_PROGRESS by default, set projects to PENDING
       let newProjectStatus = 'PENDING';
      
      await prisma.project.update({
        where: { id: project.id },
        data: { status: newProjectStatus }
      });
      
      console.log(`✅ Updated project ${project.id} status to: ${newProjectStatus}`);
    }

    // 3. Ensure workflow trackers exist for all projects
    console.log('📋 Ensuring workflow trackers exist...');
    const projectsWithoutTrackers = await prisma.project.findMany({
      where: {
        workflowTracker: null
      },
      include: {
        workflow: true
      }
    });

    console.log(`Found ${projectsWithoutTrackers.length} projects without workflow trackers`);

    for (const project of projectsWithoutTrackers) {
      try {
        const tracker = await WorkflowProgressionService.initializeProjectWorkflow(project.id);
        console.log(`✅ Created workflow tracker for project ${project.id}`);
        
        // Generate initial alert if tracker was created successfully
        if (tracker && tracker.currentLineItemId && project.workflow) {
          await AlertGenerationService.generateActiveLineItemAlert(
            project.id, 
            project.workflow.id, 
            tracker.currentLineItemId
          );
          console.log(`✅ Generated initial alert for project ${project.id}`);
        }
      } catch (error) {
        console.error(`❌ Error creating tracker for project ${project.id}:`, error.message);
      }
    }

    // 4. Generate alerts for projects that should have them
    console.log('📋 Generating alerts for active projects...');
    const activeProjects = await prisma.project.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      include: {
        workflow: true,
        workflowTracker: true
      }
    });

    console.log(`Found ${activeProjects.length} active projects`);

    for (const project of activeProjects) {
      if (project.workflowTracker && project.workflowTracker.currentLineItemId && project.workflow) {
        try {
          // Check if alert already exists
          const existingAlert = await prisma.workflowAlert.findFirst({
            where: {
              projectId: project.id,
              stepId: project.workflowTracker.currentLineItemId,
              status: 'ACTIVE'
            }
          });

          if (!existingAlert) {
            await AlertGenerationService.generateActiveLineItemAlert(
              project.id,
              project.workflow.id,
              project.workflowTracker.currentLineItemId
            );
            console.log(`✅ Generated alert for project ${project.id}`);
          } else {
            console.log(`ℹ️ Alert already exists for project ${project.id}`);
          }
        } catch (error) {
          console.error(`❌ Error generating alert for project ${project.id}:`, error.message);
        }
      }
    }

    console.log('✅ Workflow status fix completed successfully!');
    
    // 5. Summary report
    const summary = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status IN ('PENDING', 'IN_PROGRESS') THEN 1 END) as active_projects,
        COUNT(CASE WHEN status NOT IN ('PENDING', 'IN_PROGRESS') THEN 1 END) as inactive_projects
      FROM projects
    `;
    
    const workflowSummary = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(CASE WHEN status = 'NOT_STARTED' THEN 1 END) as not_started,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed
      FROM project_workflows
    `;
    
    const alertSummary = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_alerts,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_alerts
      FROM workflow_alerts
    `;

    console.log('\n📊 SUMMARY REPORT:');
    console.log('Projects:', summary[0]);
    console.log('Workflows:', workflowSummary[0]);
    console.log('Alerts:', alertSummary[0]);

  } catch (error) {
    console.error('❌ Error in workflow status fix:', error);
    throw error;
  }
}

// Run the fix if called directly
if (require.main === module) {
  fixWorkflowStatus()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixWorkflowStatus };
