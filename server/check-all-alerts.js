const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Project = require('./models/Project');
require('dotenv').config();

async function checkAllAlerts() {
  try {
    console.log('🔍 Checking All Alerts...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get ALL alerts to see what we have
    const allAlerts = await Notification.find({}).lean();
    console.log(`📊 Total alerts in database: ${allAlerts.length}`);
    
    // Group by type and metadata status
    const withMetadata = allAlerts.filter(a => a.metadata && Object.keys(a.metadata).length > 0);
    const withoutMetadata = allAlerts.filter(a => !a.metadata || Object.keys(a.metadata).length === 0);
    const withRelatedProject = allAlerts.filter(a => a.relatedProject);
    const withoutRelatedProject = allAlerts.filter(a => !a.relatedProject);
    
    console.log(`📋 Alerts WITH metadata: ${withMetadata.length}`);
    console.log(`❌ Alerts WITHOUT metadata: ${withoutMetadata.length}`);
    console.log(`🔗 Alerts WITH relatedProject: ${withRelatedProject.length}`);
    console.log(`❌ Alerts WITHOUT relatedProject: ${withoutRelatedProject.length}`);
    
    // Show the types
    const alertTypes = {};
    allAlerts.forEach(alert => {
      if (!alertTypes[alert.type]) alertTypes[alert.type] = 0;
      alertTypes[alert.type]++;
    });
    
    console.log('\n📊 Alert types breakdown:');
    Object.entries(alertTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    // Check what the API filter would match
    const apiFilter = { type: { $in: ['workflow_step_warning', 'workflow_step_overdue', 'workflow_step_urgent'] } };
    const apiMatches = allAlerts.filter(alert => 
      ['workflow_step_warning', 'workflow_step_overdue', 'workflow_step_urgent'].includes(alert.type)
    );
    
    console.log(`\n🎯 Alerts matching API filter: ${apiMatches.length}`);
    
    if (apiMatches.length > 0) {
      console.log('\n📋 First API match details:');
      const first = apiMatches[0];
      console.log('   ID:', first._id);
      console.log('   Type:', first.type);
      console.log('   Created:', first.createdAt);
      console.log('   Has metadata:', !!first.metadata);
      console.log('   Has relatedProject:', !!first.relatedProject);
      console.log('   Message:', first.message?.substring(0, 100) + '...');
    }
    
    // Check if newer alerts are missing metadata
    const sortedAlerts = allAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log('\n⏰ Most recent alerts:');
    sortedAlerts.slice(0, 3).forEach((alert, i) => {
      console.log(`   ${i+1}. ${alert.type} (${alert.createdAt}) - metadata: ${!!alert.metadata}, project: ${!!alert.relatedProject}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking alerts:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkAllAlerts(); 