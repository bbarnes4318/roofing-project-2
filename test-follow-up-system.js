// Test script for the follow-up system
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFollowUpSystem() {
  console.log('🧪 Testing Follow-up System...');
  
  try {
    // Test 1: Create a test user with follow-up settings
    console.log('\n1. Creating test user with follow-up settings...');
    const testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test-followup@example.com',
        password: 'hashedpassword',
        role: 'WORKER'
      }
    });
    console.log('✅ Test user created:', testUser.id);

    // Create follow-up settings for the user
    const followUpSettings = await prisma.followUpSettings.create({
      data: {
        userId: testUser.id,
        isEnabled: true,
        taskFollowUpDays: 3,
        reminderFollowUpDays: 2,
        alertFollowUpDays: 1,
        maxFollowUpAttempts: 2,
        followUpMessage: 'This is a test follow-up message.'
      }
    });
    console.log('✅ Follow-up settings created:', followUpSettings.id);

    // Test 2: Create a test project
    console.log('\n2. Creating test project...');
    const testCustomer = await prisma.customer.create({
      data: {
        primaryName: 'Test Customer',
        primaryEmail: 'customer@example.com',
        primaryPhone: '555-0123',
        address: '123 Test St'
      }
    });

    const testProject = await prisma.project.create({
      data: {
        projectNumber: 99999,
        projectName: 'Test Follow-up Project',
        projectType: 'ROOFING',
        status: 'PENDING',
        budget: 10000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        customerId: testCustomer.id,
        createdById: testUser.id
      }
    });
    console.log('✅ Test project created:', testProject.id);

    // Test 3: Create a test task (this should trigger follow-up creation)
    console.log('\n3. Creating test task...');
    const testTask = await prisma.task.create({
      data: {
        title: 'Test Follow-up Task',
        description: 'This is a test task for follow-up system',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        status: 'TO_DO',
        category: 'OTHER',
        projectId: testProject.id,
        assignedToId: testUser.id,
        createdById: testUser.id
      }
    });
    console.log('✅ Test task created:', testTask.id);

    // Test 4: Check if follow-up was created
    console.log('\n4. Checking for created follow-ups...');
    const followUps = await prisma.followUpTracking.findMany({
      where: {
        assignedToId: testUser.id
      },
      include: {
        project: {
          select: {
            projectName: true,
            projectNumber: true
          }
        }
      }
    });
    console.log('📋 Found follow-ups:', followUps.length);
    followUps.forEach((followUp, index) => {
      console.log(`  ${index + 1}. ${followUp.originalItemType} - ${followUp.status} - Scheduled: ${followUp.scheduledFor}`);
    });

    // Test 5: Test follow-up processing
    console.log('\n5. Testing follow-up processing...');
    const FollowUpService = require('./server/services/followUpService');
    const processedFollowUps = await FollowUpService.processPendingFollowUps();
    console.log('✅ Processed follow-ups:', processedFollowUps.length);

    // Test 6: Clean up test data
    console.log('\n6. Cleaning up test data...');
    await prisma.followUpTracking.deleteMany({
      where: { assignedToId: testUser.id }
    });
    await prisma.followUpSettings.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.task.deleteMany({
      where: { projectId: testProject.id }
    });
    await prisma.project.deleteMany({
      where: { id: testProject.id }
    });
    await prisma.customer.deleteMany({
      where: { id: testCustomer.id }
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id }
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Follow-up system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFollowUpSystem();
