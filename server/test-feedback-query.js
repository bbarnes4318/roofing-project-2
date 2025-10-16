#!/usr/bin/env node

/**
 * Test Feedback Query
 * This script tests the exact feedback query that's failing
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function testFeedbackQuery() {
  console.log('🔍 TESTING FEEDBACK QUERY');
  console.log('='.repeat(50));

  const { prisma } = require('./config/prisma');

  try {
    console.log('🔌 CONNECTION TEST:');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    console.log('📊 TESTING FEEDBACK QUERY:');
    
    // Test the exact query from the feedback route
    const where = {};
    const orderBy = { createdAt: 'desc' };
    const skip = 0;
    const take = 20;

    console.log('Testing basic feedback query...');
    const feedback = await prisma.feedback.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true
          }
        },
        _count: {
          select: {
            votes: true,
            comments: true
          }
        }
      }
    });

    console.log(`✅ Feedback query successful - Found ${feedback.length} feedback items`);

    // Test the count query
    console.log('Testing feedback count query...');
    const total = await prisma.feedback.count({ where });
    console.log(`✅ Feedback count query successful - Total: ${total}`);

    console.log('\n🎉 ALL FEEDBACK QUERIES PASSED\n');

  } catch (error) {
    console.error('❌ FEEDBACK QUERY FAILED:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
    console.error('Full error details:', error);
  } finally {
    console.log('🔌 Database connection closed\n');
    await prisma.$disconnect();
    console.log('✅ Test completed');
  }
}

testFeedbackQuery();
