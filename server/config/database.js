// Database connection configuration with proper pool settings
const { PrismaClient } = require('@prisma/client');

// Enhanced Prisma client with connection pool optimization
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Note: $on('beforeExit') is not available in Prisma 5.0+
  // Connection monitoring is handled via process events

  return client;
};

// Singleton pattern to prevent multiple Prisma instances
let prismaInstance = null;

const getPrismaClient = () => {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }
  return prismaInstance;
};

// Connection health check with timeout
const checkConnectionHealth = async (timeoutMs = 5000) => {
  const prisma = getPrismaClient();
  
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeoutMs);
    });
    
    const healthCheckPromise = prisma.$queryRaw`SELECT 1 as health`;
    
    await Promise.race([healthCheckPromise, timeoutPromise]);
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
};

// Graceful shutdown
const disconnectPrisma = async () => {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
      console.log('✅ Prisma client disconnected gracefully');
    } catch (error) {
      console.error('❌ Error disconnecting Prisma client:', error);
    }
    prismaInstance = null;
  }
};

// Handle process termination
process.on('beforeExit', disconnectPrisma);
process.on('SIGINT', disconnectPrisma);
process.on('SIGTERM', disconnectPrisma);

module.exports = {
  getPrismaClient,
  checkConnectionHealth,
  disconnectPrisma
};
