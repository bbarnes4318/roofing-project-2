const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const ProjectWorkflow = require('./models/ProjectWorkflow');
const Project = require('./models/Project');

// Connect to MongoDB
mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixAlertMetadata() {
  try {
    console.log('🔧 Starting to fix alert metadata...');
    
    // Find all workflow alerts without metadata
    const workflowAlerts = await Notification.find({
      type: { $in: ['workflow_step_warning', 'workflow_step_overdue', 'workflow_step_urgent'] },
      $or: [
        { metadata: { $exists: false } },
        { metadata: null },
        { metadata: {} }
      ]
    }).populate('relatedProject');
    
    console.log(`📋 Found ${workflowAlerts.length} workflow alerts without metadata`);
    
    for (const alert of workflowAlerts) {
      try {
        // Parse the alert message to extract step information
        const message = alert.message;
        console.log(`🔍 Processing alert: ${message.substring(0, 100)}...`);
        
        // Find the workflow for this project
        let workflow = null;
        if (alert.relatedProject) {
          workflow = await ProjectWorkflow.findOne({ project: alert.relatedProject._id });
        }
        
        if (!workflow) {
          console.log(`⚠️ No workflow found for alert ${alert._id}`);
          continue;
        }
        
        // Extract step name from message
        let stepName = null;
        
        // Try to extract step name from different message formats
        const stepNameMatch = message.match(/step "([^"]+)"/);
        if (stepNameMatch) {
          stepName = stepNameMatch[1];
        }
        
        if (!stepName) {
          console.log(`⚠️ Could not extract step name from message: ${message}`);
          continue;
        }
        
        // Find the step in the workflow
        const step = workflow.steps.find(s => s.stepName === stepName);
        if (!step) {
          console.log(`⚠️ Could not find step "${stepName}" in workflow`);
          continue;
        }
        
        // Extract project name from message
        let projectName = null;
        const projectNameMatch = message.match(/for (?:project )?[""]([^"""]+)[""]/) || 
                                message.match(/for ([^"]+) is due/) ||
                                message.match(/for (.+) is \d+/);
        if (projectNameMatch) {
          projectName = projectNameMatch[1];
        }
        
        // Calculate days until due or overdue
        let daysUntilDue = 0;
        let daysOverdue = 0;
        
        const dueDaysMatch = message.match(/due in (\d+) days?/);
        const overdueDaysMatch = message.match(/(\d+) days? overdue/);
        
        if (dueDaysMatch) {
          daysUntilDue = parseInt(dueDaysMatch[1]);
        } else if (overdueDaysMatch) {
          daysOverdue = parseInt(overdueDaysMatch[1]);
        }
        
        // Update the alert with metadata
        const metadata = {
          workflowId: workflow._id,
          stepId: step.stepId,
          stepName: step.stepName,
          phase: step.phase,
          daysUntilDue,
          daysOverdue,
          projectName: projectName || (alert.relatedProject ? alert.relatedProject.projectName : 'Unknown')
        };
        
        await Notification.findByIdAndUpdate(alert._id, {
          metadata: metadata
        });
        
        console.log(`✅ Updated alert ${alert._id} with metadata:`, metadata);
        
      } catch (stepError) {
        console.error(`❌ Error processing alert ${alert._id}:`, stepError);
      }
    }
    
    console.log('🎉 Finished fixing alert metadata');
    
  } catch (error) {
    console.error('❌ Error fixing alert metadata:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixAlertMetadata(); 