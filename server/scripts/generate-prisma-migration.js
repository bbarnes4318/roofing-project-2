const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Generate a Prisma migration for the Company Documents enhancement
 * This is an alternative to running raw SQL
 */
async function generatePrismaMigration() {
  console.log('🔧 Generating Prisma migration for Company Documents enhancement...\n');
  
  try {
    // Step 1: Create a migration
    console.log('📝 Creating new migration...');
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const migrationName = `enhance_company_documents`;
    
    execSync(`npx prisma migrate dev --name ${migrationName} --create-only`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('\n✅ Migration created successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review the generated migration file in prisma/migrations/');
    console.log('   2. Run: npx prisma migrate dev');
    console.log('   3. Run: node scripts/seed-company-documents.js');
    
  } catch (error) {
    console.error('❌ Error generating migration:', error);
    
    // If error is because of pending migrations
    if (error.message.includes('pending migrations')) {
      console.log('\n⚠️  You have pending migrations. Please run them first:');
      console.log('   npx prisma migrate dev');
    }
  }
}

// Run the generator
generatePrismaMigration();
