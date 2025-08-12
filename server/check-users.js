const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('=== CHECKING ALL USERS ===');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });
    
    console.log('All users:');
    users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role} - ID: ${user.id}`);
    });
    
    // Get all role assignments
    const roleAssignments = await prisma.roleAssignment.findMany({
      include: { user: { select: { email: true, firstName: true, lastName: true } } }
    });
    
    console.log('\nRole assignments:');
    roleAssignments.forEach(ra => {
      console.log(`- ${ra.user.firstName} ${ra.user.lastName} (${ra.user.email}): ${ra.roleType}`);
    });
    
    // Check active alerts
    const activeAlerts = await prisma.workflowAlert.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, title: true, assignedToId: true }
    });
    
    console.log(`\nActive alerts: ${activeAlerts.length}`);
    activeAlerts.forEach(alert => {
      console.log(`- ${alert.title} (assigned to: ${alert.assignedToId})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();