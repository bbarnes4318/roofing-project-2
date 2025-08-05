const { prisma } = require('./config/prisma');

async function checkSteps() {
  try {
    const steps = await prisma.workflowStep.findMany({
      where: { 
        OR: [
          { stepName: { contains: 'Project' } },
          { stepName: { contains: 'Closeout' } }
        ]
      },
      select: { stepName: true, phase: true, stepId: true },
      take: 10
    });
    
    console.log('📋 Project Closeout related steps:');
    steps.forEach(step => {
      console.log(`  Phase: ${step.phase}, Step: ${step.stepName}, ID: ${step.stepId || 'no ID'}`);
    });
    
    // Also check recent alerts
    const alerts = await prisma.workflowAlert.findMany({
      where: { stepName: { contains: 'Project' } },
      select: { stepName: true, metadata: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n🚨 Recent Project alerts:');
    alerts.forEach(alert => {
      console.log(`  Alert Step: ${alert.stepName}`);
      console.log(`  Metadata: ${JSON.stringify(alert.metadata, null, 2)}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSteps();