#!/usr/bin/env node

/**
 * Migration script to add phone and email type fields to customers table
 * Run this script to update the database schema
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Starting customer phone/email type migration...');
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'add-customer-phone-email-types.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    
    // Execute the SQL migration
    await prisma.$executeRawUnsafe(sqlContent);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added fields:');
    console.log('   - primary_email_type (PERSONAL/WORK)');
    console.log('   - primary_phone_type (MOBILE/HOME/WORK)');
    console.log('   - secondary_email_type (PERSONAL/WORK)');
    console.log('   - secondary_phone_type (MOBILE/HOME/WORK)');
    console.log('   - primary_phone_contact (PRIMARY/SECONDARY)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration();
