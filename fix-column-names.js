const { PrismaClient } = require('@prisma/client');

async function fixColumnNames() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Fixing column names...');
    
    // Rename columns to match Prisma schema
    await prisma.$executeRaw`ALTER TABLE "CompanyAsset" RENAME COLUMN "folder_name" TO "folderName"`;
    console.log('✅ Renamed folder_name to folderName');
    
    await prisma.$executeRaw`ALTER TABLE "CompanyAsset" RENAME COLUMN "is_public" TO "isPublic"`;
    console.log('✅ Renamed is_public to isPublic');
    
    await prisma.$executeRaw`ALTER TABLE "CompanyAsset" RENAME COLUMN "access_level" TO "accessLevel"`;
    console.log('✅ Renamed access_level to accessLevel');
    
    // Test that it works
    const count = await prisma.companyAsset.count();
    console.log(`✅ SUCCESS: Found ${count} records in CompanyAsset table`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixColumnNames();
