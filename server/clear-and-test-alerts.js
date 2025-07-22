const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const AlertSchedulerService = require('./services/AlertSchedulerService');
const WorkflowAlertService = require('./services/WorkflowAlertService');
require('dotenv').config();

async function clearAndTestAlerts() {
  try {
    console.log('🧹 Clearing all alerts and testing fresh creation...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear all existing alerts
    const deleteResult = await Notification.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing alerts`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger AlertSchedulerService
    console.log('\n🔧 Triggering AlertSchedulerService...');
    await AlertSchedulerService.triggerManualCheck();
    
    // Wait a moment for creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check what was created
    const newAlerts = await Notification.find({}).lean();
    console.log(`📊 New alerts created: ${newAlerts.length}`);
    
    if (newAlerts.length > 0) {
      const firstAlert = newAlerts[0];
      console.log('\n📋 First new alert:');
      console.log('   ID:', firstAlert._id);
      console.log('   Type:', firstAlert.type);
      console.log('   Priority:', firstAlert.priority);
      console.log('   Has metadata:', !!firstAlert.metadata);
      console.log('   Has relatedProject:', !!firstAlert.relatedProject);
      console.log('   Message:', firstAlert.message?.substring(0, 100) + '...');
      
      if (firstAlert.metadata) {
        console.log('   metadata.projectName:', firstAlert.metadata.projectName);
        console.log('   metadata.stepName:', firstAlert.metadata.stepName);
        console.log('   metadata.phase:', firstAlert.metadata.phase);
      } else {
        console.log('   ❌ No metadata found!');
      }
      
      console.log('\n🔍 All fields:', Object.keys(firstAlert));
    }
    
    // Test WorkflowAlertService
    console.log('\n🔧 Testing WorkflowAlertService...');
    await WorkflowAlertService.checkAndSendAlerts();
    
    // Check again
    await new Promise(resolve => setTimeout(resolve, 2000));
    const finalAlerts = await Notification.find({}).lean();
    console.log(`📊 Total alerts after both services: ${finalAlerts.length}`);
    
  } catch (error) {
    console.error('❌ Error in clear and test:', error.message);
    console.error('Full error:', error);
  } finally {
    mongoose.connection.close();
  }
}

clearAndTestAlerts(); 