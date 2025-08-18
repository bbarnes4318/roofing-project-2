const { prisma } = require('./config/prisma');

async function checkWorkflowTypes() {
  try {
    console.log('🔍 Checking available workflow types...\n');
    
    const workflowTypes = await prisma.workflowPhase.findMany({
      where: { isActive: true },
      select: { workflowType: true },
      distinct: ['workflowType']
    });
    
    console.log('Available workflow types:', workflowTypes.map(w => w.workflowType));
    
    // Check if we have the three required types
    const requiredTypes = ['ROOFING', 'GUTTERS', 'INTERIOR_PAINT'];
    const availableTypes = workflowTypes.map(w => w.workflowType);
    
    console.log('\nRequired types check:');
    requiredTypes.forEach(type => {
      const exists = availableTypes.includes(type);
      console.log(`  ${type}: ${exists ? '✅' : '❌'}`);
    });
    
    // Get count of phases and line items for each workflow type
    console.log('\nWorkflow structure details:');
    for (const type of requiredTypes) {
      if (availableTypes.includes(type)) {
        const phaseCount = await prisma.workflowPhase.count({
          where: { isActive: true, workflowType: type }
        });
        const lineItemCount = await prisma.workflowLineItem.count({
          where: { isActive: true, workflowType: type }
        });
        console.log(`  ${type}: ${phaseCount} phases, ${lineItemCount} line items`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkflowTypes();