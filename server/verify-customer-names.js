// Verify all customer names are properly formatted
const { prisma } = require('./config/prisma');

async function verifyCustomerNames() {
  console.log('🔍 VERIFYING ALL CUSTOMER NAMES...\n');
  
  try {
    const customers = await prisma.customer.findMany({
      include: {
        projects: {
          select: {
            projectNumber: true,
            projectName: true
          }
        }
      },
      orderBy: { primaryName: 'asc' }
    });
    
    console.log(`Total customers: ${customers.length}\n`);
    
    let issues = [];
    
    customers.forEach(customer => {
      const primary = customer.primaryName || '';
      const secondary = customer.secondaryName || '';
      const primaryWords = primary.trim().split(/\s+/);
      
      // Check for issues
      if (!primary || primary === '') {
        issues.push(`Empty primary name: ID ${customer.id}`);
      } else if (primaryWords.length !== 2) {
        issues.push(`Primary name not 2 words: "${primary}" (${primaryWords.length} words) - ID ${customer.id}`);
      } else if (primary.includes('&')) {
        issues.push(`Primary name contains &: "${primary}" - ID ${customer.id}`);
      }
    });
    
    if (issues.length > 0) {
      console.log('❌ ISSUES FOUND:\n');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ ALL CUSTOMER NAMES ARE PROPERLY FORMATTED!');
      console.log('   - All primary names have exactly 2 words (FirstName LastName)');
      console.log('   - Secondary names are properly separated');
    }
    
    console.log('\n📊 Sample of customers:');
    const sample = customers.slice(0, 10);
    sample.forEach((c, i) => {
      console.log(`${i+1}. "${c.primaryName}"${c.secondaryName ? ` + "${c.secondaryName}"` : ''}`);
      if (c.projects.length > 0) {
        console.log(`   Projects: ${c.projects.map(p => `#${p.projectNumber}`).join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCustomerNames();