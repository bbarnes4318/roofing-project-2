/**
 * Script to check and fix user count in production database
 * This addresses the issue where production shows only 2 users while local shows 12+
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkAndFixUsers() {
  console.log('🔍 Checking user count in database...');
  console.log('📊 Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  
  try {
    // First, check how many users exist
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      }
    });
    
    console.log(`\n📊 Current user count: ${existingUsers.length}`);
    
    if (existingUsers.length > 0) {
      console.log('\n👥 Existing users:');
      existingUsers.forEach(user => {
        console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role} - Active: ${user.isActive}`);
      });
    }
    
    // If we have less than 10 users, we likely need to add the standard users
    if (existingUsers.length < 10) {
      console.log('\n⚠️ Low user count detected! This is likely causing the production issue.');
      console.log('💡 The production server may be missing essential users.');
      
      // Define the essential users that should exist
      const essentialUsers = [
        {
          firstName: 'Sarah',
          lastName: 'Owner',
          email: 'sarah.owner@kenstruction.com',
          role: 'ADMIN',
          isActive: true
        },
        {
          firstName: 'Mike',
          lastName: 'Rodriguez',
          email: 'mike.rodriguez@kenstruction.com',
          role: 'PROJECT_MANAGER',
          isActive: true
        },
        {
          firstName: 'Jennifer',
          lastName: 'Williams',
          email: 'jennifer.williams@kenstruction.com',
          role: 'FOREMAN',
          isActive: true
        },
        {
          firstName: 'David',
          lastName: 'Chen',
          email: 'david.chen@kenstruction.com',
          role: 'MANAGER',
          isActive: true
        },
        {
          firstName: 'Lisa',
          lastName: 'Johnson',
          email: 'lisa.johnson@kenstruction.com',
          role: 'ADMIN',
          isActive: true
        },
        {
          firstName: 'Tom',
          lastName: 'Anderson',
          email: 'tom.anderson@kenstruction.com',
          role: 'FOREMAN',
          isActive: true
        },
        {
          firstName: 'Emily',
          lastName: 'Brown',
          email: 'emily.brown@kenstruction.com',
          role: 'WORKER',
          isActive: true
        },
        {
          firstName: 'Robert',
          lastName: 'Taylor',
          email: 'robert.taylor@kenstruction.com',
          role: 'PROJECT_MANAGER',
          isActive: true
        },
        {
          firstName: 'Nancy',
          lastName: 'Davis',
          email: 'nancy.davis@kenstruction.com',
          role: 'WORKER',
          isActive: true
        },
        {
          firstName: 'James',
          lastName: 'Wilson',
          email: 'james.wilson@kenstruction.com',
          role: 'FOREMAN',
          isActive: true
        },
        {
          firstName: 'Patricia',
          lastName: 'Martinez',
          email: 'patricia.martinez@kenstruction.com',
          role: 'MANAGER',
          isActive: true
        },
        {
          firstName: 'Kevin',
          lastName: 'Garcia',
          email: 'kevin.garcia@kenstruction.com',
          role: 'WORKER',
          isActive: true
        }
      ];
      
      console.log('\n🔧 Would you like to add the missing essential users? (This is safe and won\'t delete existing data)');
      console.log('📝 To fix the production issue, run this script with the --fix flag:');
      console.log('   node scripts/check-users.js --fix');
      
      if (process.argv.includes('--fix')) {
        console.log('\n✅ Fix flag detected. Adding missing users...');
        
        for (const userData of essentialUsers) {
          // Check if user already exists
          const existing = await prisma.user.findFirst({
            where: {
              OR: [
                { email: userData.email },
                { 
                  AND: [
                    { firstName: userData.firstName },
                    { lastName: userData.lastName }
                  ]
                }
              ]
            }
          });
          
          if (!existing) {
            const newUser = await prisma.user.create({
              data: {
                ...userData,
                password: '$2a$12$defaultHashedPassword', // They'll need to reset password
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            console.log(`  ✅ Created user: ${newUser.firstName} ${newUser.lastName}`);
          } else {
            console.log(`  ⏭️ User already exists: ${userData.firstName} ${userData.lastName}`);
          }
        }
        
        // Check final count
        const finalCount = await prisma.user.count();
        console.log(`\n🎉 Success! Total user count is now: ${finalCount}`);
      }
    } else {
      console.log('\n✅ User count looks good! You have sufficient users in the database.');
    }
    
    // Check for any inactive users that might be hidden
    const inactiveCount = await prisma.user.count({
      where: { isActive: false }
    });
    
    if (inactiveCount > 0) {
      console.log(`\n⚠️ Note: There are ${inactiveCount} inactive users that may not be visible in the UI.`);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking users:', error);
    console.error('\n💡 Troubleshooting tips:');
    console.error('  1. Check your DATABASE_URL environment variable');
    console.error('  2. Ensure you have network access to the database');
    console.error('  3. Verify database credentials are correct');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkAndFixUsers();