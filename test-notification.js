const mongoose = require('mongoose');
const Notification = require('./server/models/Notification');
const User = require('./server/models/User');

// Connect to MongoDB using the same connection string as the server
mongoose.connect('mongodb+srv://jimbosky35:Balls3560@kenstruction.h0xgjuh.mongodb.net/?retryWrites=true&w=majority&appName=kenstruction', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
});

async function testNotification() {
  try {
    console.log('🔍 Testing notification creation...');
    
    // Get a user to test with
    const user = await User.findOne({ email: 'admin.test@example.com' });
    console.log('👤 Found user:', user ? `${user.firstName} ${user.lastName}` : 'No user found');
    
    if (!user) {
      console.log('❌ No user found to create notification for');
      return;
    }
    
    // Try to create a simple notification
    console.log('📝 Creating test notification...');
    const notification = await Notification.create({
      user: user._id,
      message: 'Test notification message',
      type: 'workflow_step_warning',
      priority: 'medium'
    });
    
    console.log('✅ Notification created successfully:', notification._id);
    
    // Query it back
    const found = await Notification.findById(notification._id);
    console.log('📋 Found notification:', found ? 'Yes' : 'No');
    
    // Clean up
    await Notification.findByIdAndDelete(notification._id);
    console.log('🧹 Cleaned up test notification');
    
  } catch (error) {
    console.error('❌ Error creating notification:', error.message);
    if (error.errors) {
      console.error('   Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`     ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    mongoose.disconnect();
  }
}

testNotification(); 