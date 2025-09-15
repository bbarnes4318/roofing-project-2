const { prisma } = require('../config/prisma');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('👥 Creating Kenstruction users...');

    const users = [
      { firstName: 'Ken', lastName: 'Thompson', role: 'ADMIN', email: 'ken.thompson@kenstruction.com', password: 'password123' },
      { firstName: 'Sarah', lastName: 'Jenkins', role: 'ADMIN', email: 'sarah.jenkins@kenstruction.com', password: 'password123' },
      { firstName: 'Michael', lastName: 'Chen', role: 'PROJECT_MANAGER', email: 'michael.chen@kenstruction.com', password: 'password123' },
      { firstName: 'Jessica', lastName: 'Lee', role: 'PROJECT_MANAGER', email: 'jessica.lee@kenstruction.com', password: 'password123' },
      { firstName: 'David', lastName: 'Rodriguez', role: 'FOREMAN', email: 'david.rodriguez@kenstruction.com', password: 'password123' },
      { firstName: 'Maria', lastName: 'Garcia', role: 'FOREMAN', email: 'maria.garcia@kenstruction.com', password: 'password123' },
      { firstName: 'Andrew', lastName: 'Miller', role: 'WORKER', email: 'andrew.miller@kenstruction.com', password: 'password123' },
      { firstName: 'Emily', lastName: 'Davis', role: 'WORKER', email: 'emily.davis@kenstruction.com', password: 'password123' }
    ];

    for (const userData of users) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.firstName} ${userData.lastName} (${userData.email})`);
        continue;
      }

      // Create the user
      const user = await prisma.user.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          is_active: true,
          isVerified: false
        }
      });

      console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    }

    console.log('🎉 Successfully created Kenstruction users!');
    
  } catch (error) {
    console.error('❌ User creation error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
