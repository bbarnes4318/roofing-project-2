const { prisma } = require('../config/prisma');

async function checkWorkflowPhases() {
  try {
    console.log('🔥 CHECKING DATABASE PHASES...');
    const phases = await prisma.workflowPhase.findMany({
      orderBy: { displayOrder: 'asc' }
    });
    console.log(`Found ${phases.length} phases:`);
    phases.forEach((phase, idx) => {
      console.log(`${idx + 1}. ${phase.phaseType} - ${phase.phaseName} (order: ${phase.displayOrder})`);
    });
    
    console.log('\n🔥 CHECKING SECTIONS...');
    const sections = await prisma.workflowSection.findMany({
      orderBy: [{ phaseId: 'asc' }, { displayOrder: 'asc' }],
      include: { phase: true }
    });
    console.log(`Found ${sections.length} sections:`);
    sections.forEach((section, idx) => {
      console.log(`${idx + 1}. ${section.phase.phaseType} -> ${section.sectionName}`);
    });
    
    console.log('\n🔥 CHECKING LINE ITEMS...');
    const lineItems = await prisma.workflowLineItem.findMany({
      where: { isActive: true },
      include: { 
        section: { 
          include: { phase: true } 
        } 
      }
    });
    console.log(`Found ${lineItems.length} active line items`);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkWorkflowPhases();