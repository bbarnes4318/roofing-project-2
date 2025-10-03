/**
 * Migration Script: Local Filesystem → Digital Ocean Spaces
 * 
 * This script migrates all uploaded files from the ephemeral local filesystem
 * to Digital Ocean Spaces for persistent storage.
 * 
 * Usage:
 *   node server/scripts/migrate-to-spaces.js
 * 
 * What it does:
 * 1. Finds all documents with local file URLs (/uploads/...)
 * 2. Uploads each file to Digital Ocean Spaces
 * 3. Updates database records to use spaces:// URLs
 * 4. Logs progress and errors
 * 
 * Prerequisites:
 * - DO_SPACES_NAME, DO_SPACES_KEY, DO_SPACES_SECRET must be set
 * - Files must exist in local uploads directory
 * - Database must be accessible
 */

const { PrismaClient } = require('@prisma/client');
const { getS3 } = require('../config/spaces');
const { PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const s3 = getS3();
const bucket = process.env.DO_SPACES_NAME;

// Statistics
const stats = {
  documentsTotal: 0,
  documentsSuccess: 0,
  documentsFailed: 0,
  documentsSkipped: 0,
  assetsTotal: 0,
  assetsSuccess: 0,
  assetsFailed: 0,
  assetsSkipped: 0
};

async function checkSpacesConfig() {
  console.log('\n🔍 Checking Digital Ocean Spaces configuration...\n');
  
  if (!process.env.DO_SPACES_NAME) {
    console.error('❌ DO_SPACES_NAME not set');
    return false;
  }
  if (!process.env.DO_SPACES_KEY) {
    console.error('❌ DO_SPACES_KEY not set');
    return false;
  }
  if (!process.env.DO_SPACES_SECRET) {
    console.error('❌ DO_SPACES_SECRET not set');
    return false;
  }
  
  console.log('✅ Bucket:', process.env.DO_SPACES_NAME);
  console.log('✅ Region:', process.env.DO_SPACES_REGION || 'default');
  console.log('✅ Credentials configured\n');
  
  return true;
}

async function fileExistsInSpaces(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    return false;
  }
}

async function uploadFileToSpaces(localPath, key, mimeType) {
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found: ${localPath}`);
  }
  
  // Check if already exists in Spaces
  if (await fileExistsInSpaces(key)) {
    console.log(`   ⏭️  Already in Spaces: ${key}`);
    return 'skipped';
  }
  
  const fileBuffer = fs.readFileSync(localPath);
  
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType || 'application/octet-stream',
    ACL: 'private'
  }));
  
  return 'uploaded';
}

async function migrateDocuments() {
  console.log('📄 Migrating Documents...\n');
  
  // Find all documents with local file URLs
  const documents = await prisma.document.findMany({
    where: {
      fileUrl: {
        startsWith: '/uploads/'
      }
    }
  });
  
  stats.documentsTotal = documents.length;
  console.log(`Found ${documents.length} documents to migrate\n`);
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log(`[${i + 1}/${documents.length}] ${doc.fileName || doc.originalName}`);
    
    try {
      const localPath = path.join(__dirname, '..', doc.fileUrl);
      const key = doc.fileUrl.replace('/uploads/', '');
      
      const result = await uploadFileToSpaces(localPath, key, doc.mimeType);
      
      if (result === 'skipped') {
        stats.documentsSkipped++;
      } else {
        stats.documentsSuccess++;
        console.log(`   ✅ Uploaded to Spaces: ${key}`);
      }
      
      // Update database
      await prisma.document.update({
        where: { id: doc.id },
        data: { fileUrl: `spaces://${key}` }
      });
      console.log(`   ✅ Updated database record\n`);
      
    } catch (error) {
      stats.documentsFailed++;
      console.error(`   ❌ Failed: ${error.message}\n`);
    }
  }
}

async function migrateCompanyAssets() {
  console.log('\n📁 Migrating Company Assets...\n');
  
  // Find all company assets with local file URLs
  const assets = await prisma.companyAsset.findMany({
    where: {
      AND: [
        { type: 'FILE' },
        {
          fileUrl: {
            startsWith: '/uploads/'
          }
        }
      ]
    }
  });
  
  stats.assetsTotal = assets.length;
  console.log(`Found ${assets.length} company assets to migrate\n`);
  
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    console.log(`[${i + 1}/${assets.length}] ${asset.title}`);
    
    try {
      const localPath = path.join(__dirname, '..', asset.fileUrl);
      const key = asset.fileUrl.replace('/uploads/', '');
      
      const result = await uploadFileToSpaces(localPath, key, asset.mimeType);
      
      if (result === 'skipped') {
        stats.assetsSkipped++;
      } else {
        stats.assetsSuccess++;
        console.log(`   ✅ Uploaded to Spaces: ${key}`);
      }
      
      // Update database
      await prisma.companyAsset.update({
        where: { id: asset.id },
        data: { fileUrl: `spaces://${key}` }
      });
      console.log(`   ✅ Updated database record\n`);
      
    } catch (error) {
      stats.assetsFailed++;
      console.error(`   ❌ Failed: ${error.message}\n`);
    }
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  console.log('Documents:');
  console.log(`  Total:    ${stats.documentsTotal}`);
  console.log(`  Success:  ${stats.documentsSuccess} ✅`);
  console.log(`  Skipped:  ${stats.documentsSkipped} ⏭️`);
  console.log(`  Failed:   ${stats.documentsFailed} ❌\n`);
  
  console.log('Company Assets:');
  console.log(`  Total:    ${stats.assetsTotal}`);
  console.log(`  Success:  ${stats.assetsSuccess} ✅`);
  console.log(`  Skipped:  ${stats.assetsSkipped} ⏭️`);
  console.log(`  Failed:   ${stats.assetsFailed} ❌\n`);
  
  const totalSuccess = stats.documentsSuccess + stats.assetsSuccess;
  const totalFailed = stats.documentsFailed + stats.assetsFailed;
  const totalSkipped = stats.documentsSkipped + stats.assetsSkipped;
  const totalProcessed = stats.documentsTotal + stats.assetsTotal;
  
  console.log('Overall:');
  console.log(`  Total:    ${totalProcessed}`);
  console.log(`  Success:  ${totalSuccess} ✅`);
  console.log(`  Skipped:  ${totalSkipped} ⏭️`);
  console.log(`  Failed:   ${totalFailed} ❌\n`);
  
  if (totalFailed > 0) {
    console.log('⚠️  Some files failed to migrate. Check the logs above for details.');
  } else if (totalSuccess > 0) {
    console.log('🎉 Migration completed successfully!');
  } else if (totalSkipped === totalProcessed) {
    console.log('ℹ️  All files were already in Spaces.');
  } else {
    console.log('ℹ️  No files found to migrate.');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 DIGITAL OCEAN SPACES MIGRATION');
  console.log('='.repeat(60) + '\n');
  
  // Check configuration
  const configOk = await checkSpacesConfig();
  if (!configOk) {
    console.error('\n❌ Configuration check failed. Please set required environment variables.\n');
    process.exit(1);
  }
  
  // Confirm before proceeding
  console.log('⚠️  This script will:');
  console.log('   1. Upload files from local filesystem to Digital Ocean Spaces');
  console.log('   2. Update database records to use spaces:// URLs');
  console.log('   3. NOT delete local files (you can do that manually after verification)\n');
  
  // In production, you might want to add a confirmation prompt here
  // For now, we'll proceed automatically
  
  try {
    // Migrate documents
    await migrateDocuments();
    
    // Migrate company assets
    await migrateCompanyAssets();
    
    // Print summary
    await printSummary();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

