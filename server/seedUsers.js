const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://jimbosky35:Balls3560@kenstruction.h0xgjuh.mongodb.net/?retryWrites=true&w=majority&appName=kenstruction');
    
    console.log('🔌 Connected to MongoDB');
    
    // Clear existing users
    await User.deleteMany({});
    console.log('🧹 Cleared existing users');
    
    // Create users with proper roles for workflow alerts
    const users = [
      {
        firstName: 'Sarah',
        lastName: 'Owner',
        email: 'sarah@example.com',
        password: 'password123',
        role: 'admin',
        isActive: true
      },
      {
        firstName: 'Mike',
        lastName: 'Field',
        email: 'mike@example.com',
        password: 'password123',
        role: 'project_manager',
        isActive: true
      },
      {
        firstName: 'John',
        lastName: 'Supervisor',
        email: 'john@example.com',
        password: 'password123',
        role: 'manager',
        isActive: true
      },
      {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily@example.com',
        password: 'password123',
        role: 'project_manager',
        isActive: true
      },
      {
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        email: 'carlos@example.com',
        password: 'password123',
        role: 'worker',
        isActive: true
      }
    ];
    
    const result = await User.insertMany(users);
    console.log(`✅ Successfully seeded ${result.length} users`);
    
    // List all users for verification
    const allUsers = await User.find({}, 'firstName lastName role email').lean();
    console.log('👥 All users in database:');
    allUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.role}) ${user.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedUsers(); 