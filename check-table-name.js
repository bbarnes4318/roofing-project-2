const { PrismaClient } = require('@prisma/client');

async function checkTableName() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking table names...');
    
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name LIKE '%company%'
    `;
    
    console.log('Company tables:', tables);
    
    // Check the actual table name
    const columns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'CompanyAsset'
    `;
    
    console.log('CompanyAsset columns:', columns.map(c => c.column_name));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableName();
