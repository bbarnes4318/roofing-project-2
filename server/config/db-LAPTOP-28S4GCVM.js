const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const connectDB = async () => {
  try {
    // Test the connection
    await prisma.$connect();
    
    console.log(`✅ PostgreSQL Connected via Prisma`);
    console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'No DATABASE_URL found'}`);
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await prisma.$disconnect();
        console.log('🛑 PostgreSQL connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    return prisma;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Enhanced error logging
    console.error('🔧 Possible solutions:');
    console.error('   • Check if PostgreSQL is running');
    console.error('   • Verify DATABASE_URL in .env file');
    console.error('   • Check network connectivity');
    console.error('   • Verify database permissions');
    
    // Exit process with failure
    process.exit(1);
  }
};

// Health check function
const checkDBHealth = async () => {
  try {
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'connected',
      provider: 'postgresql',
      url: process.env.DATABASE_URL ? 'configured' : 'missing'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
};

module.exports = { connectDB, checkDBHealth, prisma }; 