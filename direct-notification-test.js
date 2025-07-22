// Direct notification test - bypass all the complex logic
const mongoose = require('mongoose');

// Use the server's exact connection
async function testDirectNotification() {
  try {
    // Connect using the server's exact configuration
    await mongoose.connect('mongodb+srv://jimbosky35:Balls3560@kenstruction.h0xgjuh.mongodb.net/?retryWrites=true&w=majority&appName=kenstruction', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Import the actual models
    const Notification = require('./server/models/Notification');
    const User = require('./server/models/User');
    
    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin.test@example.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`👤 Found admin user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser._id})`);
    
    // Create a simple notification directly
    console.log('📝 Creating direct notification...');
    const notification = await Notification.create({
      user: adminUser._id,
      message: 'Direct test notification - if you see this, basic notification creation works!'
    });
    
    console.log(`✅ Notification created successfully!`);
    console.log(`   ID: ${notification._id}`);
    console.log(`   Message: ${notification.message}`);
    console.log(`   User: ${notification.user}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Priority: ${notification.priority}`);
    
    // Try to find it back
    const found = await Notification.findById(notification._id);
    console.log(`🔍 Found notification: ${found ? 'YES' : 'NO'}`);
    
    // Check how many notifications exist for this user
    const userNotifications = await Notification.find({ user: adminUser._id });
    console.log(`📊 Total notifications for this user: ${userNotifications.length}`);
    
    // Clean up
    await Notification.findByIdAndDelete(notification._id);
    console.log('🧹 Cleaned up test notification');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testDirectNotification(); 