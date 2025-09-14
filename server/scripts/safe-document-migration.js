const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function safeDocumentMigration() {
  try {
    console.log('🔍 Checking current database state...');
    
    // First, let's see what we're working with
    const existingDocuments = await prisma.document.findMany({
      take: 5,
      select: {
        id: true,
        fileName: true,
        originalName: true,
        fileType: true,
        isPublic: true,
        description: true
      }
    });
    
    console.log('📋 Found existing documents:', existingDocuments.length);
    console.log('Sample document:', existingDocuments[0]);
    
    // Check if the new fields already exist
    try {
      const testDoc = await prisma.document.findFirst({
        select: {
          title: true,
          category: true,
          accessLevel: true
        }
      });
      console.log('✅ New fields already exist in database');
      return;
    } catch (error) {
      if (error.message.includes('Unknown field')) {
        console.log('⚠️  New fields need to be added to database');
        console.log('🛑 STOPPING - Please run the Prisma migration first:');
        console.log('   cd server && npm run prisma:push');
        console.log('   This will safely add the new fields without affecting existing data');
        return;
      }
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  safeDocumentMigration();
}

module.exports = { safeDocumentMigration };
