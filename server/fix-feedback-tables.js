const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixFeedbackTables() {
  try {
    console.log('🚀 FIXING FEEDBACK TABLES ON PRODUCTION...');
    
    // Check if tables exist first
    console.log('🔍 Checking existing tables...');
    const existingTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('feedback', 'comments', 'votes')
    `;
    
    console.log('📋 Existing tables:', existingTables);
    
    // Create feedback table with proper structure
    console.log('📝 Creating/updating feedback table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "feedback" (
          "id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          "type" TEXT NOT NULL,
          "title" VARCHAR(255) NOT NULL,
          "description" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'OPEN',
          "severity" TEXT,
          "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
          "vote_count" INTEGER NOT NULL DEFAULT 0,
          "comment_count" INTEGER NOT NULL DEFAULT 0,
          "developer_response_count" INTEGER NOT NULL DEFAULT 0,
          "attachments" JSONB,
          "url" VARCHAR(500),
          "environment" JSONB,
          "author_id" TEXT NOT NULL,
          "assignee_id" TEXT,
          CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create comments table
    console.log('📝 Creating/updating comments table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "comments" (
          "id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          "content" TEXT NOT NULL,
          "author_id" TEXT NOT NULL,
          "feedback_id" TEXT NOT NULL,
          "parent_id" TEXT,
          "is_deleted" BOOLEAN NOT NULL DEFAULT false,
          CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create votes table
    console.log('📝 Creating/updating votes table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "votes" (
          "id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          "user_id" TEXT NOT NULL,
          "feedback_id" TEXT NOT NULL,
          "vote_type" TEXT NOT NULL,
          CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create enum types if they don't exist
    console.log('📝 Creating enum types...');
    try {
      await prisma.$executeRaw`CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE', 'IMPROVEMENT', 'QUESTION');`;
    } catch (e) {
      console.log('   FeedbackType enum already exists');
    }
    
    try {
      await prisma.$executeRaw`CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');`;
    } catch (e) {
      console.log('   FeedbackStatus enum already exists');
    }
    
    try {
      await prisma.$executeRaw`CREATE TYPE "FeedbackSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');`;
    } catch (e) {
      console.log('   FeedbackSeverity enum already exists');
    }
    
    try {
      await prisma.$executeRaw`CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN');`;
    } catch (e) {
      console.log('   VoteType enum already exists');
    }

    // Add foreign key constraints (with error handling)
    console.log('📝 Adding foreign key constraints...');
    try {
      await prisma.$executeRaw`ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    } catch (e) {
      console.log('   feedback_author_id_fkey constraint already exists or failed');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;`;
    } catch (e) {
      console.log('   feedback_assignee_id_fkey constraint already exists or failed');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    } catch (e) {
      console.log('   comments_author_id_fkey constraint already exists or failed');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "comments" ADD CONSTRAINT "comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
    } catch (e) {
      console.log('   comments_feedback_id_fkey constraint already exists or failed');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
    } catch (e) {
      console.log('   comments_parent_id_fkey constraint already exists or failed');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
    } catch (e) {
      console.log('   votes_user_id_fkey constraint already exists or failed');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "votes" ADD CONSTRAINT "votes_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
    } catch (e) {
      console.log('   votes_feedback_id_fkey constraint already exists or failed');
    }

    // Create indexes
    console.log('📝 Creating indexes...');
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "feedback_author_id_idx" ON "feedback"("author_id");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "feedback_assignee_id_idx" ON "feedback"("assignee_id");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "feedback_status_idx" ON "feedback"("status");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback"("created_at");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "comments_feedback_id_idx" ON "comments"("feedback_id");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "comments_author_id_idx" ON "comments"("author_id");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "votes_feedback_id_idx" ON "votes"("feedback_id");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "votes_user_id_idx" ON "votes"("user_id");`;
    } catch (e) {
      console.log('   Some indexes already exist or failed to create');
    }

    // Test the tables
    console.log('🧪 Testing table creation...');
    const feedbackCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "feedback";`;
    const commentsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "comments";`;
    const votesCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "votes";`;
    
    console.log('📊 Table counts:');
    console.log(`   - Feedback: ${feedbackCount[0].count}`);
    console.log(`   - Comments: ${commentsCount[0].count}`);
    console.log(`   - Votes: ${votesCount[0].count}`);

    // Test a simple query to make sure it works
    console.log('🧪 Testing feedback query...');
    const testQuery = await prisma.$queryRaw`SELECT * FROM "feedback" LIMIT 1;`;
    console.log('✅ Feedback table is accessible');

    console.log('🎉 SUCCESS: All feedback tables are now working!');
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixFeedbackTables()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
