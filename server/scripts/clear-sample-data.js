const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearSampleData() {
  console.log('🧹 Clearing existing sample data...');
  
  try {
    // Delete in correct order to avoid foreign key constraints
    console.log('Deleting project workflow trackers...');
    await prisma.projectWorkflowTracker.deleteMany();
    
    console.log('Deleting project workflows...');
    await prisma.projectWorkflow.deleteMany();
    
    console.log('Deleting projects...');
    await prisma.project.deleteMany();
    
    console.log('Deleting sample customers...');
    await prisma.customer.deleteMany({
      where: {
        OR: [
          { primaryEmail: { contains: '_' } }, // Sample data emails
          { primaryEmail: { contains: 'demo.customer' } },
          { primaryName: { in: ['Demo Customer'] } }
        ]
      }
    });
    
    console.log('✅ Sample data cleared successfully');
    
    // Show remaining counts
    const customerCount = await prisma.customer.count();
    const projectCount = await prisma.project.count();
    
    console.log(`📊 Remaining data:`);
    console.log(`   Customers: ${customerCount}`);
    console.log(`   Projects: ${projectCount}`);
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearSampleData()
  .then(() => {
    console.log('✅ Clear complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Clear failed:', error);
    process.exit(1);
  });