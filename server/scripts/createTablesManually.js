const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function createTables() {
  console.log('🔧 Creating workflow tables manually...');
  
  try {
    // Create tables with raw SQL to minimize connection usage
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "WorkflowPhase" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        "isCompleted" BOOLEAN NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WorkflowPhase_pkey" PRIMARY KEY ("id")
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "WorkflowSection" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "phaseId" INTEGER NOT NULL,
        "order" INTEGER NOT NULL,
        "isCompleted" BOOLEAN NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WorkflowSection_pkey" PRIMARY KEY ("id")
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "WorkflowLineItem" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "sectionId" INTEGER NOT NULL,
        "order" INTEGER NOT NULL,
        "responsible" TEXT NOT NULL,
        "isCompleted" BOOLEAN NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP(3),
        "completedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WorkflowLineItem_pkey" PRIMARY KEY ("id")
      );
    `;

    // Add foreign key constraints
    await prisma.$executeRaw`
      ALTER TABLE "WorkflowSection" 
      ADD CONSTRAINT IF NOT EXISTS "WorkflowSection_phaseId_fkey" 
      FOREIGN KEY ("phaseId") REFERENCES "WorkflowPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `;

    await prisma.$executeRaw`
      ALTER TABLE "WorkflowLineItem" 
      ADD CONSTRAINT IF NOT EXISTS "WorkflowLineItem_sectionId_fkey" 
      FOREIGN KEY ("sectionId") REFERENCES "WorkflowSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `;

    // Create unique indexes
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowPhase_name_key" ON "WorkflowPhase"("name");
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowSection_name_key" ON "WorkflowSection"("name");
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowLineItem_name_key" ON "WorkflowLineItem"("name");
    `;

    console.log('✅ Tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();