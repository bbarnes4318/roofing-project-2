const mongoose = require('mongoose');
const Project = require('./models/Project');
const ProjectWorkflow = require('./models/ProjectWorkflow');

async function fixAlertReferences() {
  try {
    console.log('🔧 Connecting to database...');
    
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    
    console.log('✅ Connected! Analyzing alert references...');
    
    // Get all projects
    const projects = await mongoose.connection.db.collection('projects').find({}).toArray();
    console.log(`📋 Found ${projects.length} projects in database`);
    
    console.log('📋 Available Project IDs:');
    projects.forEach(p => {
      console.log(`   - ${p._id} (${p.projectName || p.name})`);
    });
    
    // Get all workflows
    const workflows = await mongoose.connection.db.collection('projectworkflows').find({}).toArray();
    console.log(`\n🔧 Found ${workflows.length} workflows in database`);
    
    let totalAlerts = 0;
    let brokenReferences = 0;
    let fixedReferences = 0;
    
    for (const workflow of workflows) {
      console.log(`\n🔍 Workflow for project: ${workflow.project}`);
      
      // Check if the workflow's project reference is valid
      const projectExists = projects.find(p => p._id.toString() === workflow.project?.toString());
      
      if (!projectExists) {
        console.log(`❌ BROKEN: Workflow references non-existent project ${workflow.project}`);
        brokenReferences++;
        continue;
      }
      
      console.log(`✅ Valid project reference: ${projectExists.projectName || projectExists.name}`);
      
      if (workflow.alerts && workflow.alerts.length > 0) {
        totalAlerts += workflow.alerts.length;
        console.log(`   📊 ${workflow.alerts.length} alerts found`);
        
        // Check each alert's metadata
        for (let i = 0; i < workflow.alerts.length; i++) {
          const alert = workflow.alerts[i];
          console.log(`   Alert ${i+1}: ${alert.title}`);
          
          // Fix alert metadata to include correct project info
          if (!alert.metadata) {
            alert.metadata = {};
          }
          
          // Ensure alert has correct project information
          alert.metadata.projectName = projectExists.projectName || projectExists.name;
          alert.metadata.projectId = projectExists._id;
          
          // Set relatedProject reference
          alert.relatedProject = {
            _id: projectExists._id,
            projectName: projectExists.projectName || projectExists.name,
            projectType: projectExists.projectType || projectExists.type,
            status: projectExists.status
          };
          
          fixedReferences++;
        }
        
        // Update the workflow with fixed alerts
        try {
          await mongoose.connection.db.collection('projectworkflows').updateOne(
            { _id: workflow._id },
            { $set: { alerts: workflow.alerts } }
          );
          console.log(`   ✅ Updated workflow alerts with correct references`);
        } catch (updateError) {
          console.log(`   ❌ Error updating workflow: ${updateError.message}`);
        }
      } else {
        console.log('   📊 No alerts in this workflow');
      }
    }
    
    console.log('\n🎉 Alert Reference Fix Summary:');
    console.log(`   📊 Total Projects: ${projects.length}`);
    console.log(`   📊 Total Workflows: ${workflows.length}`);
    console.log(`   📊 Total Alerts: ${totalAlerts}`);
    console.log(`   ❌ Broken References: ${brokenReferences}`);
    console.log(`   ✅ Fixed References: ${fixedReferences}`);
    
  } catch (error) {
    console.error('❌ Error fixing alert references:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixAlertReferences(); 