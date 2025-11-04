const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addCustomerPhoneEmailTypes() {
  try {
    console.log('🔄 Starting migration: Add customer phone/email type fields...');
    
    console.log('📋 Adding columns to customers table...');
    
    // Add columns one by one with IF NOT EXISTS (PostgreSQL requires separate statements)
    const columns = [
      { name: 'primaryEmailType', type: 'VARCHAR(20)' },
      { name: 'primaryPhoneType', type: 'VARCHAR(20)' },
      { name: 'secondaryEmailType', type: 'VARCHAR(20)' },
      { name: 'secondaryPhoneType', type: 'VARCHAR(20)' },
      { name: 'primaryPhoneContact', type: 'VARCHAR(20)' }
    ];
    
    for (const column of columns) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type};`
        );
        console.log(`   ✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`   ⚠️  Column ${column.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('📋 Setting default values for existing records...');
    
    // Set default values for existing records
    await prisma.$executeRaw`
      UPDATE "customers" 
      SET 
        "primaryEmailType" = COALESCE("primaryEmailType", 'PERSONAL'),
        "primaryPhoneType" = COALESCE("primaryPhoneType", 'MOBILE'),
        "secondaryEmailType" = COALESCE("secondaryEmailType", 'PERSONAL'),
        "secondaryPhoneType" = COALESCE("secondaryPhoneType", 'MOBILE'),
        "primaryPhoneContact" = COALESCE("primaryPhoneContact", 'PRIMARY')
      WHERE 
        "primaryEmailType" IS NULL 
        OR "primaryPhoneType" IS NULL 
        OR "secondaryEmailType" IS NULL 
        OR "secondaryPhoneType" IS NULL 
        OR "primaryPhoneContact" IS NULL;
    `;
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added columns:');
    console.log('   - primaryEmailType');
    console.log('   - primaryPhoneType');
    console.log('   - secondaryEmailType');
    console.log('   - secondaryPhoneType');
    console.log('   - primaryPhoneContact');
    
    // Verify the columns were added
    console.log('\n🔍 Verifying migration...');
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      AND column_name IN ('primaryEmailType', 'primaryPhoneType', 'secondaryEmailType', 'secondaryPhoneType', 'primaryPhoneContact')
      ORDER BY column_name;
    `;
    
    console.log('✅ Verified columns:', result.map(r => r.column_name).join(', '));
    
    console.log('\n✨ Migration complete! You can now use these fields in your application.');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    
    // If columns already exist, that's okay
    if (error.message && error.message.includes('already exists')) {
      console.log('⚠️  Columns already exist, skipping migration.');
      return;
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addCustomerPhoneEmailTypes()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

