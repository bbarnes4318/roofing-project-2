const { PrismaClient } = require('@prisma/client');

async function addCompanyAssetTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding CompanyAsset table...');
    
    // Read the SQL file
    const fs = require('fs');
    const sql = fs.readFileSync('./add-company-asset-table.sql', 'utf8');
    
    // Execute the SQL
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ CompanyAsset table added successfully!');
    
    // Test that it works
    const count = await prisma.companyAsset.count();
    console.log(`✅ Table is working - found ${count} records`);
    
  } catch (error) {
    console.error('❌ Error adding table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addCompanyAssetTable();
