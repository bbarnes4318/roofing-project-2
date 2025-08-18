const { prisma } = require('./config/prisma');

async function checkProductionUsers() {
  try {
    console.log('🔍 Checking users in production database...\n');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 Found ${users.length} users in production:\n`);
    
    users.forEach((user, index) => {
      const status = user.isActive ? '✅ Active' : '❌ Inactive';
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${status}`);
      console.log('');
    });
    
    // Look specifically for David Chen
    const davidChen = users.find(user => 
      user.firstName && user.firstName.toLowerCase().includes('david') &&
      user.lastName && user.lastName.toLowerCase().includes('chen')
    );
    
    if (davidChen) {
      console.log('🎯 David Chen found in production:');
      console.log(`   ID: ${davidChen.id}`);
      console.log(`   Name: ${davidChen.firstName} ${davidChen.lastName}`);
      console.log(`   Email: ${davidChen.email}`);
      console.log(`   Role: ${davidChen.role}`);
      console.log(`   Active: ${davidChen.isActive}`);
    } else {
      console.log('❌ David Chen NOT found in production database');
      console.log('   This explains why project manager assignment fails');
      
      // Check if we can create David Chen
      console.log('\n🔧 Creating David Chen user for production...');
      
      try {
        const newDavidChen = await prisma.user.create({
          data: {
            firstName: 'David',
            lastName: 'Chen',
            email: 'david.chen@kenstruction.com',
            password: 'temp-password-123', // Should be hashed in real implementation
            role: 'PROJECT_MANAGER',
            isActive: true,
            phone: '(720) 555-0123',
            position: 'Project Manager'
          }
        });
        
        console.log('✅ Successfully created David Chen user:');
        console.log(`   ID: ${newDavidChen.id}`);
        console.log(`   Name: ${newDavidChen.firstName} ${newDavidChen.lastName}`);
        console.log(`   Email: ${newDavidChen.email}`);
        console.log(`   Role: ${newDavidChen.role}`);
        
      } catch (createError) {
        console.error('❌ Failed to create David Chen user:', createError.message);
        
        if (createError.message.includes('email')) {
          console.log('   -> Email might already exist, trying to find by email...');
          const existingUser = await prisma.user.findFirst({
            where: { email: 'david.chen@kenstruction.com' }
          });
          
          if (existingUser) {
            console.log('✅ Found existing user with David Chen email:');
            console.log(`   ID: ${existingUser.id}`);
            console.log(`   Name: ${existingUser.firstName} ${existingUser.lastName}`);
            console.log(`   Role: ${existingUser.role}`);
          }
        }
      }
    }
    
    // Check how many project managers we have
    const projectManagers = users.filter(user => 
      user.role === 'PROJECT_MANAGER' && user.isActive
    );
    
    console.log(`\n📋 Active Project Managers: ${projectManagers.length}`);
    projectManagers.forEach((pm, index) => {
      console.log(`   ${index + 1}. ${pm.firstName} ${pm.lastName} (${pm.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking production users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionUsers();