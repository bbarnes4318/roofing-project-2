const { Client } = require('pg');

async function createTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🚀 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    console.log('📝 Creating feedback table...');
    await client.query(`
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
    `);
    console.log('✅ Feedback table created');

    console.log('📝 Creating comments table...');
    await client.query(`
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
    `);
    console.log('✅ Comments table created');

    console.log('📝 Creating votes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "votes" (
          "id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          "user_id" TEXT NOT NULL,
          "feedback_id" TEXT NOT NULL,
          "vote_type" TEXT NOT NULL,
          CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Votes table created');

    // Test the tables
    console.log('🧪 Testing tables...');
    const feedbackResult = await client.query('SELECT COUNT(*) as count FROM "feedback"');
    const commentsResult = await client.query('SELECT COUNT(*) as count FROM "comments"');
    const votesResult = await client.query('SELECT COUNT(*) as count FROM "votes"');
    
    console.log('📊 Table counts:');
    console.log(`   - Feedback: ${feedbackResult.rows[0].count}`);
    console.log(`   - Comments: ${commentsResult.rows[0].count}`);
    console.log(`   - Votes: ${votesResult.rows[0].count}`);

    console.log('🎉 SUCCESS: All feedback tables created successfully!');
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the function
createTables()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
