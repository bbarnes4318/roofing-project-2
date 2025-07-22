const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const ProjectWorkflow = require('./models/ProjectWorkflow');
const Notification = require('./models/Notification');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugAlerts() {
  try {
    console.log('🔍 Debugging alerts...');
    
    // Find all alerts
    const allAlerts = await Notification.find({}).populate('relatedProject');
    console.log(`📋 Total alerts in database: ${allAlerts.length}`);
    
    if (allAlerts.length > 0) {
      console.log('\n📄 Sample alert structure:');
      console.log(JSON.stringify(allAlerts[0], null, 2));
    }
    
    // Find workflow alerts specifically
    const workflowAlerts = await Notification.find({
      type: { $in: ['workflow_step_warning', 'workflow_step_overdue', 'workflow_step_urgent'] }
    }).populate('relatedProject');
    
    console.log(`\n🔧 Workflow alerts: ${workflowAlerts.length}`);
    
    for (const alert of workflowAlerts) {
      console.log(`\n🔍 Alert ID: ${alert._id}`);
      console.log(`   Type: ${alert.type}`);
      console.log(`   Message: ${alert.message.substring(0, 100)}...`);
      console.log(`   Has metadata: ${!!alert.metadata}`);
      console.log(`   Metadata keys: ${alert.metadata ? Object.keys(alert.metadata) : 'none'}`);
      console.log(`   Has data: ${!!alert.data}`);
      console.log(`   Data keys: ${alert.data ? Object.keys(alert.data) : 'none'}`);
      console.log(`   Related project: ${alert.relatedProject ? alert.relatedProject.projectName : 'none'}`);
    }
    
  } catch (error) {
    console.error('❌ Error debugging alerts:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the debug
debugAlerts(); 