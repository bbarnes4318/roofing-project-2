// IMPORTANT: Run this script when the database is accessible
// This will fix all customer names to the proper format:
// primaryName = "FirstName LastName" (2 words only)
// secondaryName = Any additional person's name

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    
    for (const customer of customers) {
      const current = customer.primaryName || '';
      const words = current.trim().split(/\s+/);
      
      let newPrimary = '';
      let newSecondary = null;
      
      // Fix based on word count
      if (words.length === 0 || current === '') {
        newPrimary = 'Unknown Customer';
        console.log(`❌ Empty name → "${newPrimary}"`);
      } else if (words.length === 1) {
        newPrimary = `${words[0]} Customer`;
        console.log(`⚠️ Single word "${words[0]}" → "${newPrimary}"`);
      } else if (words.length === 2) {
        newPrimary = words.join(' ');
        // Already correct, skip
      } else if (words.length === 3) {
        // Assume First Middle Last -> First Last
        newPrimary = `${words[0]} ${words[2]}`;
        console.log(`📝 3 words: "${current}" → "${newPrimary}"`);
      } else if (words.length === 4) {
        // Two people: FirstA LastA FirstB LastB
        newPrimary = `${words[0]} ${words[1]}`;
        newSecondary = `${words[2]} ${words[3]}`;
        console.log(`👥 Split: "${current}"`);
        console.log(`   → Primary: "${newPrimary}"`);
        console.log(`   → Secondary: "${newSecondary}"`);
      } else {
        // More than 4 words: Take first two as primary, rest as secondary
        newPrimary = `${words[0]} ${words[1]}`;
        newSecondary = words.slice(2).join(' ');
        console.log(`🔄 Complex: "${current}"`);
        console.log(`   → Primary: "${newPrimary}"`);
        console.log(`   → Secondary: "${newSecondary}"`);
      }
      
      // Update if changed
      if (newPrimary !== customer.primaryName || newSecondary !== customer.secondaryName) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            primaryName: newPrimary,
            secondaryName: newSecondary
          }
        });
        console.log(`   ✅ Updated in database\n`);
      }
    }
    
    console.log('\n✅ ALL CUSTOMER NAMES FIXED!');
    
    // Show verification
    console.log('\n📊 Verification - Sample of fixed customers:');
    const sample = await prisma.customer.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });
    
    sample.forEach((c, i) => {
      console.log(`${i+1}. Primary: "${c.primaryName}"`);
      if (c.secondaryName) {
        console.log(`   Secondary: "${c.secondaryName}"`);
      }
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\n⚠️ Make sure the database is accessible!');
    console.log('Check your .env file and database connection.');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixAllCustomerNames();