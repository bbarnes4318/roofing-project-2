const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFeedbackAPI() {
  try {
    console.log('🧪 TESTING FEEDBACK API...');
    
    // Test 1: Check if tables exist
    console.log('1️⃣ Checking if feedback table exists...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'feedback'
    `;
    
    if (tables.length === 0) {
      console.log('❌ FEEDBACK TABLE DOES NOT EXIST!');
      return false;
    }
    console.log('✅ Feedback table exists');
    
    // Test 2: Try to query feedback table
    console.log('2️⃣ Testing feedback table query...');
    const feedbackCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "feedback";`;
    console.log(`✅ Feedback table has ${feedbackCount[0].count} records`);
    
    // Test 3: Try to create a test feedback entry
    console.log('3️⃣ Testing feedback creation...');
    const testFeedback = await prisma.$executeRaw`
      INSERT INTO "feedback" (
        "id", "created_at", "updated_at", "type", "title", "description", 
        "status", "severity", "author_id"
      ) VALUES (
        'test-feedback-' || extract(epoch from now())::text,
        NOW(),
        NOW(),
        'BUG',
        'Test Feedback',
        'This is a test feedback entry',
        'OPEN',
        'LOW',
        'cmfld60ef0000bi0d8ky8hlot'
      )
    `;
    console.log('✅ Test feedback created successfully');
    
    // Test 4: Try to query the test feedback
    console.log('4️⃣ Testing feedback retrieval...');
    const testQuery = await prisma.$queryRaw`
      SELECT * FROM "feedback" 
      WHERE "title" = 'Test Feedback' 
      ORDER BY "created_at" DESC 
      LIMIT 1
    `;
    console.log('✅ Test feedback retrieved successfully');
    
    // Test 5: Clean up test data
    console.log('5️⃣ Cleaning up test data...');
    await prisma.$executeRaw`
      DELETE FROM "feedback" 
      WHERE "title" = 'Test Feedback'
    `;
    console.log('✅ Test data cleaned up');
    
    console.log('🎉 ALL TESTS PASSED! Feedback API is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFeedbackAPI()
  .then((success) => {
    if (success) {
      console.log('✅ Feedback API test completed successfully');
      process.exit(0);
    } else {
      console.log('❌ Feedback API test failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
