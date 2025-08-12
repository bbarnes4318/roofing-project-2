const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserRole() {
  try {
    console.log('=== FIXING USER ROLE ===');
    
    // Find your user (OFFICE role)
    const users = await prisma.user.findMany({
      where: { role: 'WORKER' }, // Most likely your role
      select: { id: true, email: true, role: true }
    });
    
    console.log('Users found:', users.length);
    users.forEach(user => {
      console.log(`User: ${user.email} (${user.role}) - ID: ${user.id}`);
    });
    
    // Check existing role assignments
    const roleAssignments = await prisma.roleAssignment.findMany();
    console.log('\nExisting role assignments:');
    roleAssignments.forEach(ra => {
      console.log(`- User ${ra.userId}: ${ra.roleType}`);
    });
    
    // Add role assignment for first user (if none exists)
    if (users.length > 0 && roleAssignments.length < 3) {
      const userId = users[0].id;
      const existingAssignment = roleAssignments.find(ra => ra.userId === userId);
      
      if (!existingAssignment) {
        console.log(`\nAdding OFFICE_STAFF role assignment for user ${userId}...`);
        
        await prisma.roleAssignment.create({
          data: {
            roleType: 'OFFICE_STAFF',
            userId: userId,
            assignedAt: new Date(),
            isActive: true
          }
        });
        
        console.log('✅ Role assignment added!');
      } else {
        console.log(`\nUser ${userId} already has role assignment: ${existingAssignment.roleType}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserRole();
