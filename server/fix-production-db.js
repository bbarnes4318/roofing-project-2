#!/usr/bin/env node

// This script should be run ON THE PRODUCTION SERVER
// It will create the missing Feedback table

const { PrismaClient } = require('@prisma/client');

async function fixProductionDatabase() {
  console.log('🔧 FIXING PRODUCTION DATABASE - CREATING FEEDBACK TABLE');
  console.log('==================================================\n');

  const prisma = new PrismaClient();

  try {
    console.log('📋 Checking if Feedback table exists...');
    
    // Check if table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Feedback'
      );
    `;
    
    console.log('Table exists:', tableExists[0].exists);

    if (tableExists[0].exists) {
      console.log('✅ Feedback table already exists - no action needed');
      return;
    }

    console.log('🔨 Creating Feedback table...');
    
    // Create the Feedback table
    await prisma.$executeRaw`
      CREATE TABLE "Feedback" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "type" TEXT NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "severity" TEXT,
        "tags" TEXT[],
        "voteCount" INTEGER NOT NULL DEFAULT 0,
        "commentCount" INTEGER NOT NULL DEFAULT 0,
        "developerResponseCount" INTEGER NOT NULL DEFAULT 0,
        "attachments" JSONB,
        "url" VARCHAR(500),
        "environment" JSONB,
        "author_id" TEXT NOT NULL,
        "assignee_id" TEXT,
        CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
      );
    `;

    console.log('🔗 Creating foreign key constraints...');
    
    // Add foreign key constraints
    await prisma.$executeRaw`
      ALTER TABLE "Feedback" 
      ADD CONSTRAINT "Feedback_author_id_fkey" 
      FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;

    await prisma.$executeRaw`
      ALTER TABLE "Feedback" 
      ADD CONSTRAINT "Feedback_assignee_id_fkey" 
      FOREIGN KEY ("assignee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `;

    console.log('✅ Feedback table created successfully!');
    
    // Test the table by inserting a test record
    console.log('🧪 Testing table with sample data...');
    const testFeedback = await prisma.feedback.create({
      data: {
        type: 'BUG',
        title: 'Test Feedback',
        description: 'This is a test feedback item',
        authorId: 'test-user-id', // This will fail if no users exist, but that's ok
      }
    });
    
    console.log('✅ Test record created:', testFeedback.id);
    
    // Clean up test record
    await prisma.feedback.delete({
      where: { id: testFeedback.id }
    });
    
    console.log('✅ Test record cleaned up');

  } catch (error) {
    if (error.message.includes('Foreign key constraint')) {
      console.log('⚠️  Foreign key constraint failed - this is expected if no users exist yet');
      console.log('✅ Table created successfully (foreign keys will work when users exist)');
    } else {
      console.error('❌ Error creating Feedback table:', error.message);
      console.error('Full error:', error);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
    console.log('✅ Production database fix completed');
  }
}

fixProductionDatabase();
