const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting trash system migration...');
  
  try {
    // Add columns one by one
    console.log('📄 Adding is_deleted column...');
    await prisma.$executeRawUnsafe('ALTER TABLE company_assets ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE');
    
    console.log('📄 Adding deleted_at column...');
    await prisma.$executeRawUnsafe('ALTER TABLE company_assets ADD COLUMN deleted_at TIMESTAMP NULL');
    
    console.log('📄 Adding deleted_by_id column...');
    await prisma.$executeRawUnsafe('ALTER TABLE company_assets ADD COLUMN deleted_by_id VARCHAR(255) NULL');
    
    console.log('📄 Adding trash_expiry_date column...');
    await prisma.$executeRawUnsafe('ALTER TABLE company_assets ADD COLUMN trash_expiry_date TIMESTAMP NULL');
    
    console.log('📄 Adding foreign key constraint...');
    await prisma.$executeRawUnsafe('ALTER TABLE company_assets ADD CONSTRAINT fk_company_assets_deleted_by FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE SET NULL');
    
    console.log('📄 Creating indexes...');
    await prisma.$executeRawUnsafe('CREATE INDEX idx_company_assets_trash ON company_assets (is_deleted, trash_expiry_date)');
    await prisma.$executeRawUnsafe('CREATE INDEX idx_company_assets_deleted_at ON company_assets (deleted_at)');
    
    console.log('📄 Updating existing records...');
    await prisma.$executeRawUnsafe('UPDATE company_assets SET is_deleted = FALSE, deleted_at = NULL, deleted_by_id = NULL, trash_expiry_date = NULL WHERE is_deleted IS NULL OR deleted_at IS NULL OR deleted_by_id IS NULL OR trash_expiry_date IS NULL');
    
    console.log('✅ Trash system migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during trash system migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
