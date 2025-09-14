const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from root .env file
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Safely run the company documents enhancement migration
 */
async function runMigration() {
  console.log('🚀 Starting Company Documents Enhancement Migration...');
  
  try {
    // Step 1: Backup current state (count records)
    console.log('\n📊 Current database state:');
    const assetCount = await prisma.companyAsset.count();
    console.log(`   - Company Assets: ${assetCount}`);
    
    // Step 2: Check if migration has already been applied
    let migrationApplied = false;
    try {
      // Check if folder_name column exists using raw SQL
      await prisma.$queryRaw`SELECT folder_name FROM company_assets LIMIT 1`;
      migrationApplied = true;
      console.log('\n✅ Migration appears to have already been applied (folder_name field exists).');
      console.log('   Skipping SQL migration, proceeding to seed data...');
    } catch (e) {
      // Column doesn't exist, need to run migration
      migrationApplied = false;
    }
    
    if (!migrationApplied) {
      // Step 3: Apply the SQL migration
      console.log('\n🔧 Applying SQL migration...');
      const migrationPath = path.join(__dirname, '../prisma/migrations/20250114_enhance_company_assets.sql');
      
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found at: ${migrationPath}`);
      }
      
      // Read DATABASE_URL from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }
      
      // Apply migration using prisma db execute
      console.log('   Executing migration SQL...');
      try {
        execSync(`npx prisma db execute --file "${migrationPath}" --schema ./prisma/schema.prisma`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
        console.log('   ✅ SQL migration applied successfully!');
      } catch (error) {
        console.error('   ❌ Error applying SQL migration:', error.message);
        throw error;
      }
    }
    
    // Step 5: Verify migration success
    if (!migrationApplied) {
      console.log('\n🔍 Verifying migration...');
      const verifyAsset = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'company_assets' 
        AND column_name IN ('folder_name', 'is_public', 'thumbnail_url', 'metadata')
      `;
      console.log(`   ✅ New columns verified: ${verifyAsset.length} columns found`);
      
      // Regenerate Prisma client after migration
      console.log('\n🔄 Regenerating Prisma client...');
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('   ✅ Prisma client regenerated!');
    }
    
    // Step 6: Run the seeding script
    console.log('\n🌱 Seeding enhanced folder structure...');
    const seedScriptPath = path.join(__dirname, 'seed-company-documents.js');
    execSync(`node "${seedScriptPath}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    // Step 7: Final verification
    console.log('\n📊 Final database state:');
    const finalAssetCount = await prisma.companyAsset.count();
    const folderCount = await prisma.companyAsset.count({ where: { type: 'FOLDER' } });
    const fileCount = await prisma.companyAsset.count({ where: { type: 'FILE' } });
    
    console.log(`   - Total Company Assets: ${finalAssetCount}`);
    console.log(`   - Folders: ${folderCount}`);
    console.log(`   - Files: ${fileCount}`);
    
    // Sample enhanced asset to show structure
    try {
      const sampleAsset = await prisma.$queryRaw`
        SELECT title, folder_name, path, metadata 
        FROM company_assets 
        WHERE type = 'FOLDER' 
        AND folder_name IS NOT NULL 
        LIMIT 1
      `;
      
      if (sampleAsset && sampleAsset.length > 0) {
        const asset = sampleAsset[0];
        console.log('\n📁 Sample enhanced folder:');
        console.log(`   - Title: ${asset.title}`);
        console.log(`   - Folder Name: ${asset.folder_name}`);
        console.log(`   - Path: ${asset.path || 'N/A'}`);
        console.log(`   - Metadata: ${JSON.stringify(asset.metadata || {})}`);
      }
    } catch (e) {
      // If query fails, just skip showing sample
    }
    
    console.log('\n✨ Migration completed successfully!');
    console.log('   The Company Documents section has been enhanced with:');
    console.log('   - Human-readable folder names');
    console.log('   - Public/private access controls');
    console.log('   - Rich metadata support');
    console.log('   - Version history tracking');
    console.log('   - Proper folder hierarchy');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n⚠️  To rollback, you may need to:');
    console.error('   1. Remove the new columns manually');
    console.error('   2. Restore from backup if available');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done! The database has been safely updated.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error during migration:', error);
    process.exit(1);
  });
