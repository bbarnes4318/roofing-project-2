// Load environment variables before initializing Prisma
const path = require('path');
const fs = require('fs');

// Load .env files in order of priority
const envPaths = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env')
];

// Load each env file if it exists
envPaths.forEach(envPath => {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`📋 Loaded env from: ${envPath}`);
  }
});

// Database URL is already set correctly in server.js

const { getPrismaClient, checkConnectionHealth, disconnectPrisma } = require('./database');

// Use the optimized Prisma client
const prisma = getPrismaClient();

// Database connection function with retry logic
const connectDatabase = async (maxRetries = 5, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      console.log('✅ Connected to PostgreSQL database successfully');
      
      // Test the connection with a simple query
      const userCount = await prisma.user.count();
      console.log(`📊 Database ready - Found ${userCount} users`);
      
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('❌ All database connection attempts failed');
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying database connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Graceful shutdown function
const disconnectDatabase = async () => {
  await disconnectPrisma();
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

// Health check function with timeout
const checkDBHealth = async () => {
  try {
    const health = await checkConnectionHealth(5000);
    
    if (health.status === 'healthy') {
      const userCount = await prisma.user.count();
      return {
        status: 'connected',
        host: 'PostgreSQL via Prisma',
        name: 'kenstruction_db',
        collections: userCount,
        message: 'PostgreSQL database is healthy'
      };
    } else {
      return {
        status: 'error',
        error: health.error,
        message: 'PostgreSQL database connection failed'
      };
    }
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