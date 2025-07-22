const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Create a standard admin user with common credentials
    const existingAdmin = await User.findOne({ email: 'admin@kenstruction.com' });
    
    if (!existingAdmin) {
      const adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@kenstruction.com',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      
      console.log('✅ Created admin user:');
      console.log('   Email: admin@kenstruction.com');
      console.log('   Password: admin123');
    } else {
      console.log('✅ Admin user already exists:');
      console.log('   Email: admin@kenstruction.com');
      console.log('   Password: admin123');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createAdminUser(); 