const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAlerts() {
  try {
    console.log('=== ALERT DEBUG ===');
    
    // Check alerts
    const alerts = await prisma.workflowAlert.findMany({ take: 3 });
    console.log('Alerts found:', alerts.length);
    if (alerts.length > 0) {
      console.log('Sample alert:', {
        id: alerts[0].id,
        assignedToId: alerts[0].assignedToId,
        status: alerts[0].status,
        title: alerts[0].title
      });
    }
    
    // Check role assignments
    const roleAssignments = await prisma.roleAssignment.findMany();
    console.log('Role assignments found:', roleAssignments.length);
    if (roleAssignments.length > 0) {
      console.log('Sample role assignment:', {
        userId: roleAssignments[0].userId,
        roleType: roleAssignments[0].roleType,
        isActive: roleAssignments[0].isActive
      });
    }
    
    // Check users
    const users = await prisma.user.findMany({ take: 2 });
    console.log('Users found:', users.length);
    if (users.length > 0) {
      console.log('First user:', {
        id: users[0].id,
        email: users[0].email,
        role: users[0].role
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAlerts();
