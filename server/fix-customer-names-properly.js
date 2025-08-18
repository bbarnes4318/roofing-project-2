const { prisma } = require('./config/prisma');

async function fixCustomerNamesCorrectly() {
  try {
    console.log('🔧 Fixing ALL customer names to proper format...\n');
    console.log('Format: primaryName = "FirstName LastName" (2 words only)');
    console.log('        secondaryName = Additional person if applicable\n');
    
    // Get ALL customers
    const allCustomers = await prisma.customer.findMany({
      include: {
        projects: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${allCustomers.length} total customers to check\n`);
    
    let fixedCount = 0;
    
    for (const customer of allCustomers) {
      const currentPrimary = customer.primaryName || '';
      const currentSecondary = customer.secondaryName || '';
      
      // Parse the primary name
      const primaryWords = currentPrimary.trim().split(/\s+/);
      
      let newPrimaryName = '';
      let newSecondaryName = null;
      
      if (primaryWords.length <= 2) {
        // Already correct format - just clean it up
        newPrimaryName = primaryWords.join(' ');
        newSecondaryName = currentSecondary || null;
        
        if (currentPrimary !== newPrimaryName || currentSecondary !== newSecondaryName) {
          console.log(`✓ Cleaning: "${currentPrimary}" → "${newPrimaryName}"`);
          if (newSecondaryName) {
            console.log(`   Secondary remains: "${newSecondaryName}"`);
          }
        }
      } else if (primaryWords.length === 3) {
        // Could be "First Middle Last" or "First Last SecondPerson"
        // Assume it's one person with middle name
        newPrimaryName = `${primaryWords[0]} ${primaryWords[2]}`; // First + Last
        newSecondaryName = null;
        
        console.log(`🔄 Fixing 3-word name: "${currentPrimary}" → "${newPrimaryName}"`);
      } else if (primaryWords.length === 4) {
        // Likely two people: "FirstA LastA FirstB LastB"
        newPrimaryName = `${primaryWords[0]} ${primaryWords[1]}`;
        newSecondaryName = `${primaryWords[2]} ${primaryWords[3]}`;
        
        console.log(`🔄 Splitting to two people:`);
        console.log(`   Primary: "${currentPrimary}" → "${newPrimaryName}"`);
        console.log(`   Secondary: → "${newSecondaryName}"`);
      } else if (primaryWords.length > 4) {
        // Take first two words as primary, rest as secondary
        newPrimaryName = `${primaryWords[0]} ${primaryWords[1]}`;
        newSecondaryName = primaryWords.slice(2).join(' ');
        
        console.log(`🔄 Complex name split:`);
        console.log(`   Primary: "${currentPrimary}" → "${newPrimaryName}"`);
        console.log(`   Secondary: → "${newSecondaryName}"`);
      }
      
      // Only update if something changed
      if (currentPrimary !== newPrimaryName || currentSecondary !== newSecondaryName) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            primaryName: newPrimaryName,
            secondaryName: newSecondaryName
          }
        });
        
        fixedCount++;
        console.log(`   ✅ Updated customer ID: ${customer.id}`);
        
        if (customer.projects.length > 0) {
          console.log(`   Projects affected: ${customer.projects.map(p => `#${p.projectNumber}`).join(', ')}`);
        }
        console.log('');
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total customers checked: ${allCustomers.length}`);
    console.log(`   Customers fixed: ${fixedCount}`);
    console.log(`   Customers already correct: ${allCustomers.length - fixedCount}`);
    
    // Verify the fix by showing some examples
    console.log('\n🔍 Verification - Showing sample of fixed customers:');
    const verifyCustomers = await prisma.customer.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: {
        primaryName: true,
        secondaryName: true,
        address: true
      }
    });
    
    verifyCustomers.forEach((customer, i) => {
      console.log(`${i + 1}. Primary: "${customer.primaryName}"`);
      if (customer.secondaryName) {
        console.log(`   Secondary: "${customer.secondaryName}"`);
      }
      console.log(`   Address: ${customer.address || 'N/A'}`);
      console.log('');
    });
    
    console.log('✅ All customer names have been properly formatted!');
    
  } catch (error) {
    console.error('❌ Error fixing customer names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustomerNamesCorrectly();