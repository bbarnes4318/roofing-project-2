#!/usr/bin/env node

/**
 * Migration script to add trash system to company_assets table
 * Run this script to update the database schema for 90-day deletion
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Starting trash system migration...');
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'add-trash-system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    
    // Execute the SQL migration
    await prisma.$executeRawUnsafe(sqlContent);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added trash system fields:');
    console.log('   - is_deleted (boolean flag)');
    console.log('   - deleted_at (timestamp)');
    console.log('   - deleted_by_id (user reference)');
    console.log('   - trash_expiry_date (90-day expiry)');
    console.log('   - Performance indexes');
    console.log('   - Foreign key constraints');
    
    console.log('\n🔧 Next steps:');
    console.log('1. Update your backend API to use soft deletes');
    console.log('2. Create a scheduled job to clean expired trash items');
    console.log('3. Update frontend to handle trash functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration();
