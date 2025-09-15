const { PrismaClient } = require('@prisma/client');

async function checkAndFix() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking existing columns...');
    
    // Check what columns exist
    const columns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'CompanyAsset'
    `;
    
    console.log('Existing columns:', columns.map(c => c.column_name));
    
    // Check if we need to rename columns
    const columnNames = columns.map(c => c.column_name);
    
    if (columnNames.includes('folder_name') && !columnNames.includes('folderName')) {
      console.log('Renaming folder_name to folderName...');
      await prisma.$executeRaw`ALTER TABLE "CompanyAsset" RENAME COLUMN "folder_name" TO "folderName"`;
    }
    
    if (columnNames.includes('is_public') && !columnNames.includes('isPublic')) {
      console.log('Renaming is_public to isPublic...');
      await prisma.$executeRaw`ALTER TABLE "CompanyAsset" RENAME COLUMN "is_public" TO "isPublic"`;
    }
    
    if (columnNames.includes('access_level') && !columnNames.includes('accessLevel')) {
      console.log('Renaming access_level to accessLevel...');
      await prisma.$executeRaw`ALTER TABLE "CompanyAsset" RENAME COLUMN "access_level" TO "accessLevel"`;
    }
    
    // Test that it works
    const count = await prisma.companyAsset.count();
    console.log(`✅ SUCCESS: Found ${count} records in CompanyAsset table`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFix();
