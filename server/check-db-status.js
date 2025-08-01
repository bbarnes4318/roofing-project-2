const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  try {
    console.log('Checking database status...\n');
    
    // Check if we can connect
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    
    // Check projects
    const projectCount = await prisma.project.count();
    console.log(`📊 Projects in database: ${projectCount}`);
    
    // Check users
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    // Check if workflowAlert table exists by trying to count
    try {
      const alertCount = await prisma.workflowAlert.count();
      console.log(`🚨 Alerts in database: ${alertCount}`);
      
      if (alertCount === 0) {
        console.log('\n❌ NO ALERTS FOUND - Need to generate alerts');
      } else {
        // Show first few alerts
        const alerts = await prisma.workflowAlert.findMany({
          take: 3,
          include: {
            project: true,
            assignedTo: true
          }
        });
        
        console.log('\nFirst few alerts:');
        alerts.forEach(alert => {
          console.log(`- ${alert.title}`);
          console.log(`  Assigned to: ${alert.assignedTo?.email || 'No one'}`);
          console.log(`  Status: ${alert.status}`);
        });
      }
    } catch (error) {
      console.log('\n❌ WorkflowAlert table might not exist or has issues');
      console.log('Error:', error.message);
    }
    
    // Check workflow steps
    const incompleteSteps = await prisma.workflowStep.count({
      where: { isCompleted: false }
    });
    console.log(`\n📋 Incomplete workflow steps: ${incompleteSteps}`);
    
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    console.error('\nThis might mean:');
    console.error('1. Database is not accessible');
    console.error('2. Schema is out of sync');
    console.error('3. Network issues');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();