const { prisma } = require('./config/prisma');

async function checkLineItems() {
  try {
    console.log('🔍 CHECKING WORKFLOW LINE ITEMS...');
    
    // Get all line items to see what's available
    const lineItems = await prisma.workflowLineItem.findMany({
      select: {
        id: true,
        itemName: true,
        isActive: true,
        displayOrder: true,
        section: {
          select: {
            sectionName: true,
            displayOrder: true,
            phase: {
              select: {
                phaseName: true,
                displayOrder: true
              }
            }
          }
        }
      },
      orderBy: [
        { section: { phase: { displayOrder: 'asc' } } },
        { section: { displayOrder: 'asc' } },
        { displayOrder: 'asc' }
      ]
    });
    
    console.log(`📊 Found ${lineItems.length} workflow line items:`);
    let currentPhase = '';
    let currentSection = '';
    
    lineItems.slice(0, 20).forEach(item => { // Show first 20
      const phase = item.section?.phase?.phaseName || 'Unknown Phase';
      const section = item.section?.sectionName || 'Unknown Section';
      
      if (phase !== currentPhase) {
        console.log(`\n📋 ${phase}:`);
        currentPhase = phase;
      }
      if (section !== currentSection) {
        console.log(`  📁 ${section}:`);
        currentSection = section;
      }
      
      const status = item.isActive ? '✅' : '❌';
      console.log(`    ${status} "${item.itemName}"`);
    });
    
    if (lineItems.length > 20) {
      console.log(`\n... and ${lineItems.length - 20} more line items`);
    }
    
    // Find the first active line item (should be the starting point)
    const firstActiveItem = lineItems.find(item => item.isActive);
    
    if (firstActiveItem) {
      console.log(`\n🎯 First active line item should be: "${firstActiveItem.itemName}" (ID: ${firstActiveItem.id})`);
    } else {
      console.log(`\n❌ No active line items found!`);
    }
    
  } catch (error) {
    console.error('❌ Error checking line items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLineItems();