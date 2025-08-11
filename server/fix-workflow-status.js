const { prisma } = require('./config/prisma');

async function fixWorkflowStatus() {
  try {
    console.log('🔧 FIXING WORKFLOW STATUS...\n');

    // 1. Check current status distribution
    const statusCounts = await prisma.projectWorkflow.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('📊 CURRENT WORKFLOW STATUS DISTRIBUTION:');
    statusCounts.forEach(item => {
      console.log(`- ${item.status}: ${item._count.status}`);
    });

    // 2. Find projects that should be IN_PROGRESS
    const projectsInProgress = await prisma.project.findMany({
      where: {
        status: 'IN_PROGRESS'
      },
      select: {
        id: true,
        projectName: true,
        status: true
      }
    });

    console.log(`\n🏗️ Projects with status IN_PROGRESS: ${projectsInProgress.length}`);

    // 3. Update ProjectWorkflow status for IN_PROGRESS projects
    let updatedCount = 0;
    for (const project of projectsInProgress) {
      const result = await prisma.projectWorkflow.updateMany({
        where: {
          projectId: project.id,
          status: 'NOT_STARTED'
        },
        data: {
          status: 'IN_PROGRESS'
        }
      });

      if (result.count > 0) {
        updatedCount += result.count;
        console.log(`✅ Updated workflow for project: ${project.projectName}`);
      }
    }

    console.log(`\n🔄 Total workflows updated: ${updatedCount}`);

    // 4. Check final status distribution
    const finalStatusCounts = await prisma.projectWorkflow.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('\n📊 FINAL WORKFLOW STATUS DISTRIBUTION:');
    finalStatusCounts.forEach(item => {
      console.log(`- ${item.status}: ${item._count.status}`);
    });

    // 5. Check if any workflows still need initialization
    const workflowsWithoutTracker = await prisma.projectWorkflow.findMany({
      where: {
        status: 'IN_PROGRESS'
      },
      include: {
        project: {
          select: {
            id: true,
            projectName: true
          }
        }
      }
    });

    console.log(`\n🔍 Checking ${workflowsWithoutTracker.length} IN_PROGRESS workflows for trackers...`);

    for (const workflow of workflowsWithoutTracker) {
      const tracker = await prisma.projectWorkflowTracker.findUnique({
        where: { projectId: workflow.projectId }
      });

      if (!tracker) {
        console.log(`⚠️ Project ${workflow.project.projectName} has no tracker - needs initialization`);
      }
    }

  } catch (error) {
    console.error('❌ Error fixing workflow status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixWorkflowStatus();
