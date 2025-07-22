const mongoose = require('mongoose');
const ProjectWorkflow = require('./models/ProjectWorkflow');
const Project = require('./models/Project');
const User = require('./models/User');

async function debugWorkflows() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected! Debugging workflows...');
    
    // Check workflows
    const workflows = await ProjectWorkflow.find({})
      .populate('project', 'name projectName')
      .populate('steps.assignedTo', 'firstName lastName')
      .populate('teamAssignments.office teamAssignments.administration', 'firstName lastName role');
    
    console.log(`📋 Found ${workflows.length} workflows`);
    
    for (const workflow of workflows) {
      console.log(`\n🔍 Workflow ID: ${workflow._id}`);
      console.log(`   Project: ${workflow.project ? (workflow.project.name || workflow.project.projectName) : 'MISSING PROJECT'}`);
      console.log(`   Project ID: ${workflow.project ? workflow.project._id : 'NONE'}`);
      console.log(`   Status: ${workflow.status}`);
      console.log(`   Steps: ${workflow.steps.length}`);
      
      // Check team assignments
      console.log(`   Office team: ${workflow.teamAssignments?.office?.length || 0} users`);
      if (workflow.teamAssignments?.office?.length > 0) {
        workflow.teamAssignments.office.forEach(user => {
          console.log(`     - ${user.firstName} ${user.lastName} (${user.role})`);
        });
      }
      
      // Check first step
      if (workflow.steps.length > 0) {
        const step = workflow.steps[0];
        console.log(`   First step: ${step.stepName}`);
        console.log(`     defaultResponsible: ${step.defaultResponsible}`);
        console.log(`     assignedTo: ${step.assignedTo || 'None'}`);
        console.log(`     isCompleted: ${step.isCompleted}`);
        console.log(`     scheduledEndDate: ${step.scheduledEndDate}`);
      }
    }
    
    // Check users
    const users = await User.find({});
    console.log(`\n👥 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role})`);
    });
    
    // Check projects
    const projects = await Project.find({});
    console.log(`\n🏗️ Found ${projects.length} projects:`);
    projects.forEach(project => {
      console.log(`   - ${project.name || project.projectName} (ID: ${project._id})`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging workflows:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the debug
debugWorkflows(); 