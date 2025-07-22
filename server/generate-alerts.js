const mongoose = require('mongoose');
const AlertSchedulerService = require('./services/AlertSchedulerService');

async function generateAlerts() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://prospect_finder:Toobs3560@cluster0.s4mm3b5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected! Generating alerts...');
    
    // Trigger manual alert check
    await AlertSchedulerService.triggerManualCheck();
    
    console.log('🎉 Alert generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating alerts:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the alert generation
generateAlerts(); 