const mongoose = require('mongoose');
const ProjectWorkflow = require('./models/ProjectWorkflow');
const Project = require('./models/Project');
require('dotenv').config();

const fixRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('🔧 FIXING WORKFLOW STEP ROLES...');
    
    const workflows = await ProjectWorkflow.find({}).populate('project');
    console.log(`📊 Found ${workflows.length} workflows to fix`);
    
    let totalFixed = 0;
    
    for (const workflow of workflows) {
      if (!workflow.project) continue;
      
      let workflowUpdated = false;
      
      for (const step of workflow.steps) {
        // Fix the role mapping - change to roles that actually exist in our database
        if (step.defaultResponsible === 'office') {
          step.defaultResponsible = 'admin';
          workflowUpdated = true;
          totalFixed++;
        }
        if (step.defaultResponsible === 'administration') {
          step.defaultResponsible = 'admin';
          workflowUpdated = true;
          totalFixed++;
        }
        if (step.defaultResponsible === 'field_director') {
          step.defaultResponsible = 'project_manager';
          workflowUpdated = true;
          totalFixed++;
        }
        if (step.defaultResponsible === 'roof_supervisor') {
          step.defaultResponsible = 'manager';
          workflowUpdated = true;
          totalFixed++;
        }
      }
      
      if (workflowUpdated) {
        await workflow.save();
        console.log(`✅ Fixed roles for workflow: ${workflow.project.projectName}`);
      }
    }
    
    console.log(`✅ FIXED ${totalFixed} step roles total`);
    console.log('🚨 Now alerts should generate with proper recipients!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

fixRoles(); 