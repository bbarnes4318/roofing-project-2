#!/usr/bin/env node

// Test database connection and provide immediate feedback
const { getPrismaClient, checkConnectionHealth } = require('../config/database');

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const prisma = getPrismaClient();
    
    // Test basic connection
    console.log('📡 Testing basic connection...');
    const health = await checkConnectionHealth(10000); // 10 second timeout
    
    if (health.status === 'healthy') {
      console.log('✅ Database connection is healthy');
      
      // Test a simple query
      console.log('📊 Testing query execution...');
      const userCount = await prisma.user.count();
      console.log(`✅ Query successful - Found ${userCount} users`);
      
      // Test workflow tracker query (the one that was failing)
      console.log('🔍 Testing workflow tracker query...');
      const trackerCount = await prisma.projectWorkflowTracker.count();
      console.log(`✅ Workflow tracker query successful - Found ${trackerCount} trackers`);
      
      console.log('🎉 All database tests passed!');
      process.exit(0);
    } else {
      console.error('❌ Database connection unhealthy:', health.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    
    if (error.code === 'P2024') {
      console.error('🔌 Connection pool exhausted. This usually means:');
      console.error('   - Too many concurrent connections');
      console.error('   - Database server is overloaded');
      console.error('   - Connection pool limits are too low');
      console.error('');
      console.error('💡 Solutions:');
      console.error('   - Restart the server');
      console.error('   - Check database server status');
      console.error('   - Increase connection pool limits');
    }
    
    process.exit(1);
  }
}

testConnection();
