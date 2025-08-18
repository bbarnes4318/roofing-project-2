const { prisma } = require('./config/prisma');

async function fixCustomerNames() {
  try {
    console.log('🔧 Fixing customers with incorrect primary/secondary names...\n');
    
    // Find all customers and then filter for ones with both names
    const allCustomers = await prisma.customer.findMany({
      include: {
        projects: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true
          }
        }
      }
    });
    
    const problematicCustomers = allCustomers.filter(customer => 
      customer.primaryName && 
      customer.secondaryName && 
      customer.secondaryName.trim() !== ''
    );
    
    console.log(`📊 Found ${problematicCustomers.length} customers with both primary and secondary names:\n`);
    
    if (problematicCustomers.length === 0) {
      console.log('✅ No customers found with both primary and secondary names');
      return;
    }
    
    // Display all problematic customers
    problematicCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.primaryName} ${customer.secondaryName}`);
      console.log(`   ID: ${customer.id}`);
      console.log(`   Primary: "${customer.primaryName}"`);
      console.log(`   Secondary: "${customer.secondaryName}"`);
      console.log(`   Email: ${customer.primaryEmail}`);
      console.log(`   Projects: ${customer.projects.length}`);
      if (customer.projects.length > 0) {
        customer.projects.forEach(project => {
          console.log(`     - ${project.projectName} (#${project.projectNumber})`);
        });
      }
      console.log('');
    });
    
    // Fix each customer by combining names into primaryName and clearing secondaryName
    console.log('🔄 Fixing customer names...\n');
    
    for (const customer of problematicCustomers) {
      const combinedName = `${customer.primaryName} ${customer.secondaryName}`.trim();
      
      console.log(`Updating: "${customer.primaryName}" + "${customer.secondaryName}" → "${combinedName}"`);
      
      const updatedCustomer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          primaryName: combinedName,
          secondaryName: null // Clear secondary name
        }
      });
      
      console.log(`✅ Updated customer: ${updatedCustomer.primaryName}`);
    }
    
    console.log('\n🎉 All customer names have been fixed!');
    
    // Verify the fix
    console.log('\n🔍 Verification - Checking for remaining issues...');
    const allCustomersAfter = await prisma.customer.findMany();
    const remainingIssues = allCustomersAfter.filter(customer => 
      customer.primaryName && 
      customer.secondaryName && 
      customer.secondaryName.trim() !== ''
    );
    
    console.log(`📊 Customers with both names after fix: ${remainingIssues.length}`);
    
    if (remainingIssues.length === 0) {
      console.log('✅ All customers now have single primary names only');
    } else {
      console.log('⚠️ Some customers still have dual names:');
      remainingIssues.forEach(customer => {
        console.log(`   - ${customer.primaryName} | ${customer.secondaryName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing customer names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustomerNames();