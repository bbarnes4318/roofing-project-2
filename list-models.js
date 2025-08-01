const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function listModels() {
  try {
    console.log('📋 Available models in production database:');
    
    // List all available Prisma model properties
    const models = Object.keys(prisma).filter(key => 
      typeof prisma[key] === 'object' && 
      prisma[key] && 
      typeof prisma[key].findMany === 'function'
    );
    
    console.log('Available models:', models);
    
    // Test a few common ones
    for (const model of models.slice(0, 10)) {
      try {
        const count = await prisma[model].count();
        console.log(`- ${model}: ${count} records`);
      } catch (error) {
        console.log(`- ${model}: Error counting (${error.message})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listModels();