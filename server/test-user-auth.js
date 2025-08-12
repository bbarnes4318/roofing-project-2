const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUserAuth() {
  try {
    console.log('=== TESTING USER AUTH ===');
    
    // Check what users exist
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    });
    
    console.log('All users:');
    users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role} - ID: ${user.id}`);
    });
    
    // Check if David Chen exists
    const davidChen = users.find(u => u.email === 'david.chen@kenstruction.com');
    if (davidChen) {
      console.log(`\n✅ David Chen found: ${davidChen.id}`);
      
      // Check alerts assigned to David Chen
      const davidAlerts = await prisma.workflowAlert.findMany({
        where: { 
          assignedToId: davidChen.id,
          status: 'ACTIVE'
        },
        select: { id: true, title: true, status: true }
      });
      
      console.log(`\nDavid Chen's ACTIVE alerts: ${davidAlerts.length}`);
      davidAlerts.slice(0, 3).forEach(alert => {
        console.log(`- ${alert.title} (${alert.status})`);
      });
      
    } else {
      console.log('\n❌ David Chen not found!');
    }
    
    // Check if Sarah Owner exists
    const sarahOwner = users.find(u => u.email === 'sarah.owner@kenstruction.com');
    if (sarahOwner) {
      console.log(`\n✅ Sarah Owner found: ${sarahOwner.id}`);
      
      // Check alerts assigned to Sarah Owner
      const sarahAlerts = await prisma.workflowAlert.findMany({
        where: { 
          assignedToId: sarahOwner.id,
          status: 'ACTIVE'
        },
        select: { id: true, title: true, status: true }
      });
      
      console.log(`\nSarah Owner's ACTIVE alerts: ${sarahAlerts.length}`);
      sarahAlerts.slice(0, 3).forEach(alert => {
        console.log(`- ${alert.title} (${alert.status})`);
      });
      
    } else {
      console.log('\n❌ Sarah Owner not found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserAuth();
