// FIX ALL CUSTOMER NAMES TO PROPER FORMAT
// primaryName = "FirstName LastName" (2 words ONLY)
// secondaryName = Any additional person

const { prisma } = require('./config/prisma');

async function fixAllCustomerNames() {
  console.log('🔧 FIXING ALL CUSTOMER NAMES TO PROPER FORMAT...\n');
  console.log('RULE: primaryName = FirstName LastName (2 words ONLY)');
  console.log('RULE: secondaryName = Additional person if needed\n');
  
  try {
    // Get ALL customers
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${customers.length} customers to process\n`);
    
    let fixedCount = 0;
    
    for (const customer of customers) {
      const current = customer.primaryName || '';
      const words = current.trim().split(/\s+/);
      
      let newPrimary = '';
      let newSecondary = customer.secondaryName; // Keep existing secondary by default
      
      // Fix based on word count
      if (words.length === 0 || current === '') {
        newPrimary = 'Unknown Customer';
        console.log(`❌ Empty name → "${newPrimary}"`);
      } else if (words.length === 1) {
        newPrimary = `${words[0]} Customer`;
        console.log(`⚠️ Single word "${words[0]}" → "${newPrimary}"`);
      } else if (words.length === 2) {
        newPrimary = words.join(' ');
        // Already correct, skip logging
      } else if (words.length === 3) {
        // Could be "First Middle Last" or "First Last Person"
        // Assume it's one person with middle name -> First Last
        newPrimary = `${words[0]} ${words[2]}`;
        console.log(`📝 3 words: "${current}" → "${newPrimary}"`);
      } else if (words.length === 4) {
        // Two people: FirstA LastA FirstB LastB
        newPrimary = `${words[0]} ${words[1]}`;
        newSecondary = `${words[2]} ${words[3]}`;
        console.log(`👥 Split 4 words: "${current}"`);
        console.log(`   → Primary: "${newPrimary}"`);
        console.log(`   → Secondary: "${newSecondary}"`);
      } else if (words.length === 5) {
        // Likely "First1 Last1 and First2 Last2" or "First1 Middle Last1 First2 Last2"
        // Take first two as primary, last two as secondary
        newPrimary = `${words[0]} ${words[1]}`;
        newSecondary = `${words[3]} ${words[4]}`;
        console.log(`🔄 5 words: "${current}"`);
        console.log(`   → Primary: "${newPrimary}"`);
        console.log(`   → Secondary: "${newSecondary}"`);
      } else if (words.length === 6) {
        // "First1 Middle1 Last1 First2 Middle2 Last2" 
        // Take first and third as primary, fourth and sixth as secondary
        newPrimary = `${words[0]} ${words[2]}`;
        newSecondary = `${words[3]} ${words[5]}`;
        console.log(`🔄 6 words: "${current}"`);
        console.log(`   → Primary: "${newPrimary}"`);
        console.log(`   → Secondary: "${newSecondary}"`);
      } else {
        // More than 6 words: Take first two as primary, try to extract a second name
        newPrimary = `${words[0]} ${words[1]}`;
        // Look for pattern after first two words
        if (words.length >= 4) {
          newSecondary = `${words[words.length-2]} ${words[words.length-1]}`; // Last two words
        } else {
          newSecondary = words.slice(2).join(' ');
        }
        console.log(`🔄 Many words: "${current}"`);
        console.log(`   → Primary: "${newPrimary}"`);
        console.log(`   → Secondary: "${newSecondary}"`);
      }
      
      // Update if changed
      if (newPrimary !== customer.primaryName || newSecondary !== customer.secondaryName) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            primaryName: newPrimary,
            secondaryName: newSecondary === '' ? null : newSecondary
          }
        });
        console.log(`   ✅ Updated in database\n`);
        fixedCount++;
      }
    }
    
    console.log(`\n✅ FIXED ${fixedCount} CUSTOMERS!`);
    console.log(`✅ ${customers.length - fixedCount} were already correct`);
    
    // Show verification
    console.log('\n📊 Verification - Sample of all customers:');
    const sample = await prisma.customer.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        projects: {
          select: {
            projectNumber: true
          }
        }
      }
    });
    
    sample.forEach((c, i) => {
      console.log(`${i+1}. Primary: "${c.primaryName}"`);
      if (c.secondaryName) {
        console.log(`   Secondary: "${c.secondaryName}"`);
      }
      if (c.projects.length > 0) {
        console.log(`   Projects: ${c.projects.map(p => '#' + p.projectNumber).join(', ')}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixAllCustomerNames();