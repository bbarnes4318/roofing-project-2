const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 Clearing existing sample data...');
  
  // Delete in correct order to avoid foreign key constraints
  await prisma.projectWorkflowTracker.deleteMany();
  await prisma.projectWorkflow.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany({
    where: {
      primaryEmail: {
        contains: '_' // Only delete the sample data customers
      }
    }
  });
  
  console.log('✅ Database cleared');
}

async function main() {
  try {
    await clearDatabase();
    
    // Now run the sample data generation
    console.log('🌱 Running sample data generation...');
    const generateScript = require('./generate-sample-data');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Clear and regenerate complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });