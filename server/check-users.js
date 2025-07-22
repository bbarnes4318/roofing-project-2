const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const users = await User.find({}).select('firstName lastName email role');
    console.log('📊 Current users in database:');
    users.forEach(u => {
      console.log(`   ${u.email} - ${u.firstName} ${u.lastName} (${u.role})`);
    });
    
    console.log('\n🔑 Available login credentials:');
    users.forEach(u => {
      console.log(`   Email: ${u.email}`);
      console.log(`   Password: password123`);
      console.log(`   ---`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkUsers(); 