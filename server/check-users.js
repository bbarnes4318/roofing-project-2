const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true }
    });
    console.log('=== PRODUCTION DATABASE USERS ===');
    console.log(`Found ${users.length} users:`);
    users.forEach((u, i) => console.log(`${i+1}. ${u.firstName} ${u.lastName} (${u.email}) - ${u.role}`));
    
    const roleAssignments = await prisma.roleAssignment.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });
    
    console.log('\n=== ROLE ASSIGNMENTS ===');
    console.log(`Found ${roleAssignments.length} role assignments:`);
    roleAssignments.forEach((ra, i) => {
      console.log(`${i+1}. ${ra.roleType} -> ${ra.user.firstName} ${ra.user.lastName}`);
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();