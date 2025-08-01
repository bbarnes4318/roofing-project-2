const { prisma, connectDatabase } = require('./config/prisma');

async function checkAlerts() {
  try {
    // First connect to database
    await connectDatabase();
    
    // Check incomplete workflow steps (these generate mock alerts)
    const incompleteSteps = await prisma.workflowStep.findMany({
      where: {
        isCompleted: false
      },
      include: {
        workflow: {
          include: {
            project: {
              include: {
                customer: true
              }
            }
          }
        }
      },
      take: 5
    });
    
    console.log(`Incomplete workflow steps (these should generate alerts): ${incompleteSteps.length}`);
    
    if (incompleteSteps.length > 0) {
      console.log('\nIncomplete steps that should generate alerts:');
      incompleteSteps.forEach(step => {
        const projectName = step.workflow?.project?.customer?.primaryName || 'Unknown';
        console.log(`- ${step.stepName} for ${projectName}`);
        console.log(`  Phase: ${step.phase}, Step ID: ${step.stepId}`);
      });
    }
    
    if (false) { // Skip the workflowAlert check since it doesn't exist
      const alerts = await prisma.workflowAlert.findMany({
        take: 5,
        include: {
          project: true,
          assignedTo: true
        }
      });
      
      console.log('\nFirst few alerts:');
      alerts.forEach(alert => {
        console.log(`- Alert ${alert.id}: ${alert.message}`);
        console.log(`  Project: ${alert.project?.projectName || 'Unknown'}`);
        console.log(`  Status: ${alert.status}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error checking alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlerts();