const { prisma } = require('./config/prisma');

async function getFullWorkflow() {
  try {
    console.log('🔥 LOADING FULL WORKFLOW STRUCTURE FROM DATABASE...');
    
    const phases = await prisma.workflowPhase.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            lineItems: {
              orderBy: { displayOrder: 'asc' },
              where: { isActive: true }
            }
          }
        }
      }
    });
    
    console.log('📊 FULL WORKFLOW STRUCTURE:');
    phases.forEach(phase => {
      console.log(`\n📋 PHASE: ${phase.phaseName} (Type: ${phase.phaseType})`);
      phase.sections.forEach(section => {
        console.log(`  📁 SECTION: ${section.sectionName} (${section.displayName})`);
        section.lineItems.forEach(item => {
          console.log(`    ✅ ITEM: ${item.itemName}`);
        });
      });
    });
    
    // Convert to the format needed for React
    const reactFormat = phases.map(phase => ({
      id: phase.phaseType,
      label: phase.phaseName,
      items: phase.sections.map(section => ({
        id: section.id,
        label: section.displayName || section.sectionName,
        subtasks: section.lineItems.map(item => item.itemName)
      }))
    }));
    
    console.log('\n\n🔥 REACT FORMAT:');
    console.log(JSON.stringify(reactFormat, null, 2));
    
    console.log(`\n📊 TOTALS: ${phases.length} phases, ${phases.reduce((acc, p) => acc + p.sections.length, 0)} sections, ${phases.reduce((acc, p) => acc + p.sections.reduce((acc2, s) => acc2 + s.lineItems.length, 0), 0)} line items`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getFullWorkflow();