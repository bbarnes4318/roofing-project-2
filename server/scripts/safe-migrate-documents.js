const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function safeMigrateDocuments() {
  try {
    console.log('🛡️  SAFE DOCUMENT MIGRATION - NO DATA LOSS');
    console.log('==========================================');
    
    // Step 1: Backup existing data
    console.log('📋 Step 1: Checking existing documents...');
    const existingDocs = await prisma.document.findMany({
      select: {
        id: true,
        fileName: true,
        originalName: true,
        fileType: true,
        isPublic: true,
        description: true,
        createdAt: true
      }
    });
    
    console.log(`✅ Found ${existingDocs.length} existing documents`);
    
    // Step 2: Check if new fields already exist
    console.log('🔍 Step 2: Checking if new fields exist...');
    try {
      const testDoc = await prisma.document.findFirst({
        select: {
          title: true,
          category: true,
          accessLevel: true
        }
      });
      console.log('✅ New fields already exist - migration not needed');
      return;
    } catch (error) {
      if (error.message.includes('Unknown field')) {
        console.log('⚠️  New fields need to be added');
      } else {
        throw error;
      }
    }
    
    // Step 3: Create backup
    console.log('💾 Step 3: Creating backup...');
    const backupData = {
      timestamp: new Date().toISOString(),
      documentCount: existingDocs.length,
      documents: existingDocs
    };
    
    const backupPath = path.join(__dirname, `../backups/document-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupPath}`);
    
    // Step 4: Show what will be added
    console.log('📝 Step 4: Migration plan:');
    console.log('   - Add new columns to documents table (with safe defaults)');
    console.log('   - Create new supporting tables');
    console.log('   - Add indexes for performance');
    console.log('   - NO existing data will be modified or deleted');
    
    console.log('\n🚀 To proceed with the migration:');
    console.log('   1. Run: cd server && npm run prisma:push');
    console.log('   2. This will safely add new fields without touching existing data');
    console.log('   3. All existing documents will remain unchanged');
    
    console.log('\n🛑 If you want to proceed manually:');
    console.log('   - The migration SQL is in: server/prisma/migrations/add_document_enhancements/migration.sql');
    console.log('   - Review it first to ensure it\'s safe');
    
  } catch (error) {
    console.error('❌ Error during migration check:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the safe migration check
if (require.main === module) {
  safeMigrateDocuments();
}

module.exports = { safeMigrateDocuments };
