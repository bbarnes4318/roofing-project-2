const { prisma } = require('../config/prisma');

async function checkWorkflowExists() {
  console.log('🔍 Checking if workflow data exists...\n');

  try {
    const phaseCount = await prisma.workflowPhase.count();
    const sectionCount = await prisma.workflowSection.count();
    const lineItemCount = await prisma.workflowLineItem.count();

    console.log(`📊 Workflow data counts:`);
    console.log(`  Phases: ${phaseCount}`);
    console.log(`  Sections: ${sectionCount}`);
    console.log(`  Line Items: ${lineItemCount}`);

    if (phaseCount === 0) {
      console.log('\n❌ NO WORKFLOW DATA FOUND!');
      console.log('The workflow data from your Excel file was not uploaded successfully.');
      console.log('You need to upload the workbook again.');
    } else {
      console.log('\n✅ Workflow data exists!');
      
      // Show a few examples
      const phases = await prisma.workflowPhase.findMany({ take: 3 });
      console.log('\n📋 Sample phases:');
      phases.forEach(phase => {
        console.log(`  - ${phase.phaseType}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking workflow data:', error);
  }
}

checkWorkflowExists()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
