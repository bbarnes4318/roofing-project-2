const { prisma } = require('./config/prisma');

async function getDummyStep() {
  try {
    console.log('🔍 FINDING A DUMMY WORKFLOW STEP...');
    
    // Get any workflow step to use as dummy
    const dummyStep = await prisma.workflowStep.findFirst({
      select: {
        id: true,
        stepName: true
      }
    });
    
    if (dummyStep) {
      console.log(`✅ Found dummy step: "${dummyStep.stepName}" (ID: ${dummyStep.id})`);
    } else {
      console.log(`❌ No workflow steps found!`);
    }
    
  } catch (error) {
    console.error('❌ Error finding dummy step:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getDummyStep();