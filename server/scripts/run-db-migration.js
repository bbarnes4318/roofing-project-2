const { PrismaClient } = require('@prisma/client');

async function runDatabaseMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Starting database migration...');
    console.log('📋 Adding missing columns to company_assets table...');
    
    // Add the missing folder_name column and other columns
    await prisma.$executeRaw`
      ALTER TABLE "company_assets" 
      ADD COLUMN IF NOT EXISTS "folder_name" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "thumbnail_url" VARCHAR(2000),
      ADD COLUMN IF NOT EXISTS "checksum" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "metadata" JSONB,
      ADD COLUMN IF NOT EXISTS "access_level" VARCHAR(50) DEFAULT 'private';
    `;
    
    console.log('✅ Added missing columns');
    
    // Create indexes
    console.log('📋 Creating indexes...');
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_company_assets_folder_name" ON "company_assets" ("folder_name");
      CREATE INDEX IF NOT EXISTS "idx_company_assets_is_public" ON "company_assets" ("is_public");
      CREATE INDEX IF NOT EXISTS "idx_company_assets_parent_type" ON "company_assets" ("parent_id", "type");
    `;
    
    console.log('✅ Created indexes');
    
    // Create company_asset_versions table if it doesn't exist
    console.log('📋 Creating company_asset_versions table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "company_asset_versions" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "asset_id" TEXT NOT NULL,
        "version_number" INTEGER NOT NULL,
        "file_url" VARCHAR(2000) NOT NULL,
        "file_size" INTEGER NOT NULL,
        "checksum" VARCHAR(255),
        "change_description" VARCHAR(1000),
        "uploaded_by_id" TEXT,
        "is_current" BOOLEAN DEFAULT false,
        
        CONSTRAINT "fk_asset_versions_asset" FOREIGN KEY ("asset_id") 
          REFERENCES "company_assets"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_asset_versions_user" FOREIGN KEY ("uploaded_by_id") 
          REFERENCES "users"("id") ON DELETE SET NULL
      );
    `;
    
    console.log('✅ Created company_asset_versions table');
    
    // Create indexes for version history
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_asset_versions_asset_id" ON "company_asset_versions" ("asset_id");
      CREATE INDEX IF NOT EXISTS "idx_asset_versions_current" ON "company_asset_versions" ("asset_id", "is_current");
    `;
    
    console.log('✅ Created version history indexes');
    
    // Update existing folders with meaningful names
    console.log('📋 Updating existing folder names...');
    await prisma.$executeRaw`
      UPDATE "company_assets" 
      SET "folder_name" = CASE 
        WHEN "title" ILIKE '%contract%' THEN 'Contracts & Agreements'
        WHEN "title" ILIKE '%warrant%' OR "title" ILIKE '%certif%' THEN 'Warranties & Certifications'
        WHEN "title" ILIKE '%inspect%' THEN 'Inspection Reports'
        WHEN "title" ILIKE '%permit%' OR "title" ILIKE '%complian%' THEN 'Permits & Compliance'
        WHEN "title" ILIKE '%safety%' THEN 'Safety Documentation'
        WHEN "title" ILIKE '%train%' OR "title" ILIKE '%sop%' THEN 'SOPs & Training'
        WHEN "title" ILIKE '%sale%' OR "title" ILIKE '%material%' THEN 'Sales Materials'
        WHEN "title" ILIKE '%office%' THEN 'Office Documents'
        ELSE "title"
      END
      WHERE "type" = 'FOLDER' AND "folder_name" IS NULL;
    `;
    
    console.log('✅ Updated folder names');
    
    console.log('🎉 Database migration completed successfully!');
    console.log('📝 The company_assets table now has all required columns');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runDatabaseMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runDatabaseMigration };
