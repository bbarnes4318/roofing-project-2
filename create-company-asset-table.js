const { PrismaClient } = require('@prisma/client');

async function createTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Creating CompanyAsset table...');
    
    // Create the table with correct column names
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "CompanyAsset" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" VARCHAR(1000),
        "fileUrl" VARCHAR(2000),
        "mimeType" VARCHAR(100),
        "fileSize" INTEGER,
        "tags" TEXT[],
        "section" "DocumentSection",
        "version" INTEGER NOT NULL DEFAULT 1,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "downloadCount" INTEGER NOT NULL DEFAULT 0,
        "lastDownloadedAt" TIMESTAMP(3),
        "uploadedById" TEXT,
        "parentId" TEXT,
        "path" VARCHAR(1000),
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "type" "AssetType" NOT NULL DEFAULT 'FILE',
        "folderName" VARCHAR(255),
        "isPublic" BOOLEAN DEFAULT false,
        "thumbnail_url" VARCHAR(2000),
        "checksum" VARCHAR(255),
        "metadata" JSONB,
        "accessLevel" VARCHAR(50) DEFAULT 'private',
        "originalName" VARCHAR(255),
        "fileName" VARCHAR(255),
        CONSTRAINT "CompanyAsset_pkey" PRIMARY KEY ("id")
      )
    `;
    
    console.log('✅ CompanyAsset table created successfully!');
    
    // Test that it works
    const count = await prisma.companyAsset.count();
    console.log(`✅ SUCCESS: Found ${count} records in CompanyAsset table`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTable();
