#!/usr/bin/env node

/**
 * Test Production Database Connection
 * This script tests the exact same database connection that production uses
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function testProductionConnection() {
  console.log('🔍 TESTING PRODUCTION DATABASE CONNECTION');
  console.log('='.repeat(50));

  console.log('📋 ENVIRONMENT CHECK:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`DATABASE_URL present: ${!!process.env.DATABASE_URL}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@') : 'N/A'}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please configure it in your .env file or environment variables.');
    return;
  }

  // Test the exact same connection that production uses
  const { prisma } = require('./config/prisma');

  try {
    console.log('🔌 CONNECTION TEST:');
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    console.log('📊 DATABASE QUERIES:');
    const userCount = await prisma.user.count();
    console.log(`✅ User count: ${userCount}`);

    const projectCount = await prisma.project.count();
    console.log(`✅ Project count: ${projectCount}`);

    const feedbackCount = await prisma.feedback.count();
    console.log(`✅ Feedback count: ${feedbackCount}`);

    const calendarEventCount = await prisma.calendarEvent.count();
    console.log(`✅ Calendar events count: ${calendarEventCount}\n`);

    console.log('🎉 ALL TESTS PASSED - Database is working correctly\n');

  } catch (error) {
    console.error('❌ DATABASE CONNECTION FAILED:');
    console.error('Error message:', error.message);
    if (error.code === 'P1001') {
      console.error('Reason: Prisma cannot connect to the database server. This might be due to:');
      console.error('  - The database server is not running.');
      console.error('  - The database server is not reachable from the application server (firewall, network issues).');
      console.error('  - Incorrect DATABASE_URL (host, port, user, password, database name).');
    } else if (error.code) {
      console.error(`Prisma Error Code: ${error.code}`);
    }
    console.error('Full error details:', error);
  } finally {
    console.log('🔌 Database connection closed\n');
    await prisma.$disconnect();
    console.log('✅ Test completed');
  }
}

testProductionConnection();
