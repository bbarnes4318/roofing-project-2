/**
 * Delete All Projects Script
 *
 * This script safely removes all projects and related data from the database
 * while preserving:
 * - Users
 * - Activity Feed
 * - Feedback Hub data
 *
 * Usage: node server/scripts/delete-all-projects.js
 */

const { prisma } = require("../config/prisma");

async function deleteAllProjects() {
  console.log("🗑️  Starting project deletion...\n");

  try {
    // Get all project IDs first
    const projects = await prisma.project.findMany({
      select: { id: true, projectNumber: true, projectName: true },
    });
    const projectIds = projects.map((p) => p.id);

    console.log(`📊 Found ${projects.length} projects to delete:`);
    projects.forEach((p) =>
      console.log(`   - #${p.projectNumber}: ${p.projectName}`)
    );
    console.log("");

    if (projectIds.length === 0) {
      console.log("✅ No projects to delete. Database is already clean.");
      return;
    }

    // Delete related data in order (respecting foreign key constraints)
    console.log("🔄 Deleting related data...");

    // 1. Workflow Alerts
    const alertsDeleted = await prisma.workflowAlert.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${alertsDeleted.count} workflow alerts`);

    // 2. Completed Workflow Items
    const trackers = await prisma.projectWorkflowTracker.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    });
    const trackerIds = trackers.map((t) => t.id);

    if (trackerIds.length > 0) {
      const completedItemsDeleted =
        await prisma.completedWorkflowItem.deleteMany({
          where: { trackerId: { in: trackerIds } },
        });
      console.log(
        `   ✓ Deleted ${completedItemsDeleted.count} completed workflow items`
      );
    }

    // 3. Project Workflow Trackers
    const trackersDeleted = await prisma.projectWorkflowTracker.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${trackersDeleted.count} workflow trackers`);

    // 4. Project Team Members
    const teamMembersDeleted = await prisma.projectTeamMember.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(
      `   ✓ Deleted ${teamMembersDeleted.count} project team members`
    );

    // 5. Documents
    const docsDeleted = await prisma.document.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${docsDeleted.count} documents`);

    // 6. Calendar Events
    const eventsDeleted = await prisma.calendarEvent.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${eventsDeleted.count} calendar events`);

    // 7. Project Messages
    const messagesDeleted = await prisma.projectMessage.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${messagesDeleted.count} project messages`);

    // 8. Tasks
    const tasksDeleted = await prisma.task.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${tasksDeleted.count} tasks`);

    // 9. Voice Transcripts
    const transcriptsDeleted = await prisma.voiceTranscript.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${transcriptsDeleted.count} voice transcripts`);

    // 10. Follow-up Tracking
    const followUpDeleted = await prisma.followUpTracking.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(
      `   ✓ Deleted ${followUpDeleted.count} follow-up tracking records`
    );

    // 11. Pets
    const petsDeleted = await prisma.pet.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${petsDeleted.count} pet records`);

    // 12. Project Phase Overrides
    const overridesDeleted = await prisma.projectPhaseOverride.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${overridesDeleted.count} phase overrides`);

    // 13. Finally, delete the projects themselves
    console.log("\n🗑️  Deleting projects...");
    const projectsDeleted = await prisma.project.deleteMany({
      where: { id: { in: projectIds } },
    });
    console.log(`   ✓ Deleted ${projectsDeleted.count} projects`);

    // 14. Delete all customers (they are project-dependent)
    console.log("\n🗑️  Deleting customers...");
    const customersDeleted = await prisma.customer.deleteMany({});
    console.log(`   ✓ Deleted ${customersDeleted.count} customers`);

    // Verify what was preserved
    console.log("\n📋 Verifying preserved data:");
    const userCount = await prisma.user.count();
    const feedbackCount = await prisma.feedback.count();
    const activityCount = await prisma.activity.count().catch(() => 0);

    console.log(`   ✓ Users preserved: ${userCount}`);
    console.log(`   ✓ Feedback items preserved: ${feedbackCount}`);
    console.log(`   ✓ Activity records preserved: ${activityCount}`);

    console.log("\n✅ Project deletion completed successfully!");
    console.log("   All projects and related data have been removed.");
    console.log(
      "   Users, feedback hub, and activity feed data remain intact."
    );
  } catch (error) {
    console.error("\n❌ Error during project deletion:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteAllProjects()
  .then(() => {
    console.log("\n🎉 Script completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
