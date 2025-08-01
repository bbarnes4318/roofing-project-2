const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client with logging and error handling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
});

// Database connection function
const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database successfully');
    
    // Test the connection with a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Database ready - Found ${userCount} users`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    throw error;
  }
};

// Graceful shutdown function
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Disconnected from PostgreSQL database');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
};

// Handle application termination
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  console.log('\n🔄 Gracefully shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Gracefully shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

// Health check function
const checkDBHealth = async () => {
  try {
    // Test the connection with a simple query
    const userCount = await prisma.user.count();
    
    return {
      status: 'connected',
      host: 'PostgreSQL via Prisma',
      name: 'kenstruction_db',
      collections: userCount,
      message: 'PostgreSQL database is healthy'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      message: 'PostgreSQL database connection failed'
    };
  }
};

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDBHealth
}; 