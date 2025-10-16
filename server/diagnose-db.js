#!/usr/bin/env node

/**
 * Database Connection Diagnostic Script
 * Run this on your Digital Ocean server to diagnose database issues
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function diagnoseDatabase() {
  console.log('🔍 DATABASE DIAGNOSTIC TOOL');
  console.log('='.repeat(50));
  
  // Check environment variables
  console.log('\n📋 ENVIRONMENT CHECK:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  
  if (process.env.DATABASE_URL) {
    // Mask the password in the URL for security
    const maskedUrl = process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
    console.log('DATABASE_URL:', maskedUrl);
  } else {
    console.log('❌ DATABASE_URL not found in environment variables');
    return;
  }
  
  // Test database connection
  console.log('\n🔌 CONNECTION TEST:');
  const prisma = new PrismaClient({
    log: ['error', 'warn', 'info'],
    errorFormat: 'pretty'
  });
  
  try {
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    console.log('\n📊 DATABASE QUERIES:');
    const userCount = await prisma.user.count();
    console.log(`✅ User count: ${userCount}`);
    
    const projectCount = await prisma.project.count();
    console.log(`✅ Project count: ${projectCount}`);
    
    const feedbackCount = await prisma.feedback.count();
    console.log(`✅ Feedback count: ${feedbackCount}`);
    
    // Test calendar events
    const calendarCount = await prisma.calendarEvent.count();
    console.log(`✅ Calendar events count: ${calendarCount}`);
    
    console.log('\n🎉 ALL TESTS PASSED - Database is working correctly');
    
  } catch (error) {
    console.error('\n❌ DATABASE CONNECTION FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n🔧 TROUBLESHOOTING STEPS:');
      console.error('1. Check if the database server is running');
      console.error('2. Verify the DATABASE_URL is correct');
      console.error('3. Check network connectivity');
      console.error('4. Verify database credentials');
      console.error('5. Check if the database exists');
    } else if (error.code === 'P2002') {
      console.error('\n⚠️  Unique constraint violation detected');
    } else if (error.code === 'P2025') {
      console.error('\n⚠️  Record not found');
    } else {
      console.error('\n⚠️  Unknown database error');
    }
    
    console.error('\nFull error details:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the diagnostic
diagnoseDatabase()
  .then(() => {
    console.log('\n✅ Diagnostic completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  });
