const { prisma } = require('./config/prisma');

async function fixDavidChenRole() {
  try {
    console.log('🔧 Fixing David Chen role for project manager assignment...\n');
    
    // Find David Chen
    const davidChen = await prisma.user.findFirst({
      where: {
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@kenstruction.com'
      }
    });
    
    if (!davidChen) {
      console.log('❌ David Chen not found in database');
      return;
    }
    
    console.log('🎯 Found David Chen:');
    console.log(`   ID: ${davidChen.id}`);
    console.log(`   Name: ${davidChen.firstName} ${davidChen.lastName}`);
    console.log(`   Email: ${davidChen.email}`);
    console.log(`   Current Role: ${davidChen.role}`);
    console.log(`   Active: ${davidChen.isActive}`);
    
    if (davidChen.role === 'PROJECT_MANAGER') {
      console.log('✅ David Chen already has PROJECT_MANAGER role - no change needed');
      return;
    }
    
    // Update David Chen's role to PROJECT_MANAGER
    console.log('\n🔄 Updating David Chen role to PROJECT_MANAGER...');
    
    const updatedUser = await prisma.user.update({
      where: { id: davidChen.id },
      data: { role: 'PROJECT_MANAGER' }
    });
    
    console.log('✅ Successfully updated David Chen:');
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`   New Role: ${updatedUser.role}`);
    
    // Verify the change
    const verifyUser = await prisma.user.findUnique({
      where: { id: davidChen.id }
    });
    
    console.log('\n🔍 Verification:');
    console.log(`   David Chen role is now: ${verifyUser.role}`);
    console.log('   ✅ David Chen can now be assigned as project manager');
    
  } catch (error) {
    console.error('❌ Error fixing David Chen role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDavidChenRole();