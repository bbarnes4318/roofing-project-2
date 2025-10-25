#!/usr/bin/env node

/**
 * Scheduled job to permanently delete expired trash items
 * This should be run daily via cron job or scheduler
 */

const { PrismaClient } = require('@prisma/client');
const { getS3 } = require('../config/spaces');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

async function cleanupExpiredTrash() {
  console.log('🗑️ Starting trash cleanup job...');
  
  try {
    // Find all assets that are deleted and past their expiry date
    const expiredAssets = await prisma.companyAsset.findMany({
      where: {
        isDeleted: true,
        trashExpiryDate: {
          lte: new Date() // Less than or equal to current time
        }
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        versions: {
          select: { file_url: true }
        }
      }
    });

    console.log(`📊 Found ${expiredAssets.length} expired trash items`);

    if (expiredAssets.length === 0) {
      console.log('✅ No expired items to clean up');
      return;
    }

    const s3 = getS3();
    const bucket = process.env.DO_SPACES_NAME;
    let deletedCount = 0;
    let errorCount = 0;

    // Process each expired asset
    for (const asset of expiredAssets) {
      try {
        console.log(`🗑️ Permanently deleting: ${asset.title} (${asset.id})`);
        
        // Delete files from DigitalOcean Spaces
        const urls = [];
        if (asset.fileUrl) urls.push(asset.fileUrl);
        if (Array.isArray(asset.versions)) {
          for (const version of asset.versions) {
            if (version.file_url) urls.push(version.file_url);
          }
        }

        // Delete each file from Spaces
        for (const url of urls) {
          try {
            const key = extractSpacesKey(url);
            if (key) {
              await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
              console.log(`  ✅ Deleted from Spaces: ${key}`);
            }
          } catch (error) {
            console.warn(`  ⚠️ Failed to delete from Spaces: ${url}`, error?.message || error);
          }
        }

        // Remove embeddings
        try {
          await prisma.$executeRawUnsafe('DELETE FROM embeddings WHERE file_id LIKE $1', `%${asset.id}%`);
        } catch (error) {
          console.warn(`  ⚠️ Failed to delete embeddings for ${asset.id}:`, error?.message || error);
        }

        // Delete the asset record (versions will cascade)
        await prisma.companyAsset.delete({
          where: { id: asset.id }
        });

        deletedCount++;
        console.log(`  ✅ Successfully deleted ${asset.title}`);

      } catch (error) {
        errorCount++;
        console.error(`  ❌ Failed to delete ${asset.title}:`, error?.message || error);
      }
    }

    console.log(`🎉 Trash cleanup completed:`);
    console.log(`  ✅ Successfully deleted: ${deletedCount} items`);
    console.log(`  ❌ Errors: ${errorCount} items`);

  } catch (error) {
    console.error('❌ Trash cleanup job failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to extract Spaces key from URL
function extractSpacesKey(fileUrl) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('spaces://')) return fileUrl.replace('spaces://', '');
  if (fileUrl.startsWith('/uploads/')) return fileUrl.replace('/uploads/', '');
  return fileUrl;
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupExpiredTrash()
    .then(() => {
      console.log('✅ Trash cleanup job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Trash cleanup job failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredTrash };
