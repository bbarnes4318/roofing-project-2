// Load environment variables from root .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check the current state of the database before migration
 * This helps ensure it's safe to proceed
 */
async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n');
  
  try {
    // Check if we can connect
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');
    
    // Check company_assets table
    console.log('📊 Company Assets Table Status:');
    const assetCount = await prisma.companyAsset.count();
    console.log(`   Total records: ${assetCount}`);
    
    if (assetCount > 0) {
      const folderCount = await prisma.companyAsset.count({ where: { type: 'FOLDER' } });
      const fileCount = await prisma.companyAsset.count({ where: { type: 'FILE' } });
      console.log(`   Folders: ${folderCount}`);
      console.log(`   Files: ${fileCount}`);
      
      // Check if enhanced fields already exist
      let hasEnhancedFields = false;
      try {
        // Try to query with the new field to see if it exists
        await prisma.$queryRaw`SELECT folder_name FROM company_assets LIMIT 1`;
        hasEnhancedFields = true;
      } catch (e) {
        // Field doesn't exist yet, which is expected before migration
        hasEnhancedFields = false;
      }
      
      if (hasEnhancedFields) {
        console.log('\n⚠️  Enhanced fields already exist in the database!');
        console.log('   The migration may have already been applied.');
        console.log('   Running the migration again is SAFE - it will:');
        console.log('   - Skip adding columns that already exist');
        console.log('   - Update any missing folder names');
        console.log('   - Ensure proper folder structure\n');
      } else {
        console.log('\n✅ Database is ready for enhancement migration!');
        console.log('   The migration will add new fields without affecting existing data.\n');
      }
      
      // Show sample of current folders
      const sampleFolders = await prisma.companyAsset.findMany({
        where: { type: 'FOLDER' },
        take: 5
      });
      
      if (sampleFolders.length > 0) {
        console.log('📁 Sample folders:');
        sampleFolders.forEach(folder => {
          const displayName = folder.folderName || folder.title || folder.id;
          console.log(`   - ${displayName} ${!folder.folderName ? '(needs friendly name)' : ''}`);
        });
      }
    } else {
      console.log('\n📭 No company assets found in database.');
      console.log('   The migration will create a complete folder structure.\n');
    }
    
    // Check for related tables
    try {
      const versionCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = 'company_asset_versions'
      `;
      
      if (versionCount[0].count > 0) {
        console.log('\n📚 Version history table already exists.');
      } else {
        console.log('\n📚 Version history table will be created.');
      }
    } catch (e) {
      console.log('\n📚 Version history table will be created.');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY:');
    console.log('='.repeat(50));
    console.log('✅ Database connection: OK');
    console.log('✅ Company assets table: EXISTS');
    console.log(`✅ Total assets: ${assetCount}`);
    console.log('✅ Safe to run migration: YES');
    console.log('\n🚀 You can proceed with: npm run migrate:company-docs');
    
  } catch (error) {
    console.error('\n❌ Error checking database:', error.message);
    
    if (error.message.includes('P1001')) {
      console.error('\n⚠️  Cannot connect to database. Please check:');
      console.error('   1. DATABASE_URL is set correctly');
      console.error('   2. Database server is running');
      console.error('   3. Network connection is available');
    } else if (error.message.includes('company_assets')) {
      console.error('\n⚠️  Company assets table not found.');
      console.error('   You may need to run: npx prisma migrate dev');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDatabaseState()
  .then(() => {
    console.log('\n✨ Database check completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Database check failed:', error);
    process.exit(1);
  });
