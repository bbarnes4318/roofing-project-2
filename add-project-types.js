// Script to add new project type enum values to the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const projectTypeValues = [
  'WATER_LEAK', 'MOLD', 'DECKS', 'REPAIR_EXTERIOR', 'REPAIR_INTERIOR',
  'WINDOWS', 'SIDING', 'FENCE', 'KITCHEN_REMODEL', 'BATHROOM_RENOVATION',
  'FLOORING', 'PAINTING', 'ELECTRICAL_WORK', 'PLUMBING', 'HVAC', 
  'LANDSCAPING', 'OTHER'
];

const workflowTypeValues = [
  'WATER_LEAK', 'MOLD', 'DECKS', 'REPAIR_EXTERIOR', 'REPAIR_INTERIOR',
  'FENCE', 'FLOORING', 'PAINTING', 'ELECTRICAL_WORK', 'PLUMBING', 
  'HVAC', 'LANDSCAPING', 'OTHER'
];

async function addEnumValues() {
  console.log('🚀 Starting enum value migration...\n');

  // Add project_types enum values
  console.log('📋 Adding ProjectType enum values...');
  for (const value of projectTypeValues) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE project_types ADD VALUE IF NOT EXISTS '${value}'`);
      console.log(`  ✅ Added: ${value}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⏭️  Already exists: ${value}`);
      } else {
        console.error(`  ❌ Error adding ${value}:`, error.message);
      }
    }
  }

  // Add workflow_types enum values
  console.log('\n📋 Adding WorkflowType enum values...');
  for (const value of workflowTypeValues) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE workflow_types ADD VALUE IF NOT EXISTS '${value}'`);
      console.log(`  ✅ Added: ${value}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⏭️  Already exists: ${value}`);
      } else {
        console.error(`  ❌ Error adding ${value}:`, error.message);
      }
    }
  }

  // Verify project_types
  console.log('\n📊 Current project_types values:');
  const projectTypes = await prisma.$queryRaw`
    SELECT enumlabel FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_types') 
    ORDER BY enumsortorder
  `;
  projectTypes.forEach(row => console.log(`  - ${row.enumlabel}`));

  console.log('\n✅ Enum migration complete!');
}

addEnumValues()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
