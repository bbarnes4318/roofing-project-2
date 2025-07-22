const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Project = require('./models/Project');
require('dotenv').config();

async function testAPIResponse() {
  try {
    console.log('🔍 Testing API Response Structure...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Use the EXACT same query structure as the alerts API
    const filter = { type: { $in: ['workflow_step_warning', 'workflow_step_overdue', 'workflow_step_urgent'] } };
    const sort = { createdAt: -1 };
    
    const alerts = await Notification.find(filter)
      .sort(sort)
      .limit(1)
      .populate('user', 'firstName lastName email')
      .populate('relatedProject', 'projectName name')
      .lean();
    
    if (alerts.length === 0) {
      console.log('❌ No alerts found');
      return;
    }
    
    const alert = alerts[0];
    
    console.log('\n📊 **API Query Results:**');
    console.log('   Alert ID:', alert._id);
    console.log('   Type:', alert.type);
    console.log('   Priority:', alert.priority);
    
    console.log('\n📋 **Metadata Field:**');
    console.log('   Has metadata field:', 'metadata' in alert);
    console.log('   Metadata value:', alert.metadata);
    console.log('   Metadata type:', typeof alert.metadata);
    
    if (alert.metadata) {
      console.log('   metadata.projectName:', alert.metadata.projectName);
      console.log('   metadata.stepName:', alert.metadata.stepName);  
      console.log('   metadata.phase:', alert.metadata.phase);
    }
    
    console.log('\n🔗 **RelatedProject Field:**');
    console.log('   Has relatedProject:', 'relatedProject' in alert);
    console.log('   RelatedProject value:', alert.relatedProject);
    
    if (alert.relatedProject) {
      console.log('   relatedProject.projectName:', alert.relatedProject.projectName);
      console.log('   relatedProject.name:', alert.relatedProject.name);
    }
    
    console.log('\n🎯 **Frontend Logic Test:**');
    const projectName = alert.metadata?.projectName || alert.relatedProject?.projectName || 'Unknown Project';
    const stepName = alert.metadata?.stepName || 'Unknown Step';
    const phase = alert.metadata?.phase || 'Unknown';
    
    console.log('   Final display:', `${projectName} ${phase} step "${stepName}"`);
    
    console.log('\n🔍 **Full Alert Object Keys:**');
    console.log('   All keys:', Object.keys(alert));
    
  } catch (error) {
    console.error('❌ Error testing API response:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testAPIResponse(); 