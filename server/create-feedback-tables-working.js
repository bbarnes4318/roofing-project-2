#!/usr/bin/env node

// This script creates the feedback tables using raw SQL that actually works
const { PrismaClient } = require('@prisma/client');

async function createFeedbackTables() {
  console.log('🔧 CREATING FEEDBACK TABLES - WORKING VERSION');
  console.log('==================================================\n');

  const prisma = new PrismaClient();

  try {
    console.log('📋 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Create the feedback table
    console.log('🔨 Creating feedback table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "feedback" (
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
        CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create the comments table
    console.log('🔨 Creating comments table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "comments" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "body" TEXT NOT NULL,
        "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
        "isPinned" BOOLEAN NOT NULL DEFAULT false,
        "author_id" TEXT NOT NULL,
        "feedback_id" TEXT NOT NULL,
        "parent_id" TEXT,
        CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create the votes table
    console.log('🔨 Creating votes table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "votes" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "user_id" TEXT NOT NULL,
        "feedback_id" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
      );
    `;

    // Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "feedback" 
        ADD CONSTRAINT "feedback_author_id_fkey" 
        FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('⚠️  Author foreign key constraint already exists or failed');
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "feedback" 
        ADD CONSTRAINT "feedback_assignee_id_fkey" 
        FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('⚠️  Assignee foreign key constraint already exists or failed');
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "comments" 
        ADD CONSTRAINT "comments_author_id_fkey" 
        FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('⚠️  Comments author foreign key constraint already exists or failed');
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "comments" 
        ADD CONSTRAINT "comments_feedback_id_fkey" 
        FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('⚠️  Comments feedback foreign key constraint already exists or failed');
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "votes" 
        ADD CONSTRAINT "votes_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('⚠️  Votes user foreign key constraint already exists or failed');
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "votes" 
        ADD CONSTRAINT "votes_feedback_id_fkey" 
        FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('⚠️  Votes feedback foreign key constraint already exists or failed');
    }

    // Test the tables
    console.log('🧪 Testing tables...');
    const feedbackCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "feedback"`;
    const commentsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "comments"`;
    const votesCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "votes"`;

    console.log('✅ Feedback table created - records:', feedbackCount[0].count);
    console.log('✅ Comments table created - records:', commentsCount[0].count);
    console.log('✅ Votes table created - records:', votesCount[0].count);

    console.log('\n🎉 FEEDBACK TABLES CREATED SUCCESSFULLY!');
    console.log('The feedback system should now work properly.');

  } catch (error) {
    console.error('❌ Error creating feedback tables:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

createFeedbackTables();
