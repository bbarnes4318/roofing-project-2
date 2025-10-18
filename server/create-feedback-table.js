require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

async function createFeedbackTable() {
  console.log('🔧 CREATING FEEDBACK TABLE IN PRODUCTION');
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
      console.log('✅ Feedback table already exists');
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
    
    // Verify the table was created
    const verifyTable = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Feedback' 
      ORDER BY ordinal_position;
    `;
    
    console.log('\n📊 Table structure:');
    verifyTable.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error creating Feedback table:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

createFeedbackTable();
