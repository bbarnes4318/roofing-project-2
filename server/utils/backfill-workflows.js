const mongoose = require('mongoose');
const Project = require('../models/Project');
const ProjectWorkflow = require('../models/ProjectWorkflow');
require('dotenv').config();

async function backfillWorkflows() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all projects
    const projects = await Project.find({});
    console.log(`📋 Found ${projects.length} projects`);

    let workflowsCreated = 0;
    let workflowsSkipped = 0;

    for (const project of projects) {
      try {
        // Check if workflow already exists for this project
        const existingWorkflow = await ProjectWorkflow.findOne({ project: project._id });
        
        if (!existingWorkflow) {
          // Create the default detailed workflow with all 27 steps
          await ProjectWorkflow.createDetailedWorkflow(project._id);
          console.log(`✅ Created workflow for project: ${project.projectName}`);
          workflowsCreated++;
        } else {
          console.log(`⏭️  Skipped project: ${project.projectName} (workflow already exists)`);
          workflowsSkipped++;
        }
      } catch (error) {
        console.error(`❌ Error creating workflow for project ${project.projectName}:`, error.message);
      }
    }

    console.log('\n📊 Backfill Summary:');
    console.log(`✅ Workflows created: ${workflowsCreated}`);
    console.log(`⏭️  Workflows skipped: ${workflowsSkipped}`);
    console.log(`📋 Total projects: ${projects.length}`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill if this script is executed directly
if (require.main === module) {
  backfillWorkflows();
}

module.exports = backfillWorkflows; 