// Fix customers with "&" incorrectly parsed
const { prisma } = require('./config/prisma');

async function fixAmpersandNames() {
  console.log('🔧 Fixing customers with "&" in names...\n');
  
  try {
    // Find customers with "&" in primary name
    const customers = await prisma.customer.findMany();
    
    const problematicCustomers = customers.filter(c => 
      c.primaryName && c.primaryName.includes('&')
    );
    
    console.log(`Found ${problematicCustomers.length} customers with "&" in primary name\n`);
    
    for (const customer of problematicCustomers) {
      console.log(`Current: Primary="${customer.primaryName}", Secondary="${customer.secondaryName}"`);
      
      // These are likely "FirstA & FirstB LastB" patterns
      // The secondary should have the full second person name
      let newPrimary = '';
      let newSecondary = customer.secondaryName || '';
      
      if (customer.primaryName === 'Robert &' && customer.secondaryName === 'Lisa Johnson') {
        newPrimary = 'Robert Johnson';
        newSecondary = 'Lisa Johnson';
      } else if (customer.primaryName === 'Sarah &' && customer.secondaryName === 'David Chen') {
        newPrimary = 'Sarah Chen';
        newSecondary = 'David Chen';
      } else if (customer.primaryName === 'Jennifer &' && customer.secondaryName === 'Mark Thompson') {
        newPrimary = 'Jennifer Thompson';
        newSecondary = 'Mark Thompson';
      } else {
        // Generic fix: Remove "&" and use last name from secondary
        const primaryParts = customer.primaryName.split(/\s+/);
        const secondaryParts = (customer.secondaryName || '').split(/\s+/);
        
        if (primaryParts.includes('&') && secondaryParts.length >= 2) {
          // Take first name from primary, last name from secondary's last name
          const firstName = primaryParts[0];
          const lastName = secondaryParts[secondaryParts.length - 1];
          newPrimary = `${firstName} ${lastName}`;
          newSecondary = customer.secondaryName;
        } else {
          // Can't auto-fix, skip
          console.log('   ⚠️ Cannot auto-fix this pattern\n');
          continue;
        }
      }
      
      console.log(`   Fixed: Primary="${newPrimary}", Secondary="${newSecondary}"`);
      
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          primaryName: newPrimary,
          secondaryName: newSecondary
        }
      });
      
      console.log('   ✅ Updated\n');
    }
    
    console.log('✅ All "&" names fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAmpersandNames();