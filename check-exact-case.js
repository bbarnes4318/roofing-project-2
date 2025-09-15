const { PrismaClient } = require('@prisma/client');

async function checkExactCase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking exact column case...');
    
    const columns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'company_assets' 
      AND column_name ILIKE '%folder%'
    `;
    
    console.log('Folder-related columns:', columns);
    
    // Check all columns with exact case
    const allColumns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'company_assets'
      ORDER BY column_name
    `;
    
    console.log('All columns (exact case):', allColumns.map(c => `"${c.column_name}"`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkExactCase();
