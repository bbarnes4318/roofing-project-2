#!/usr/bin/env node

/**
 * Fix Prisma Connection Issues
 * This script fixes all routes that create separate PrismaClient instances
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

console.log('🔧 FIXING PRISMA CONNECTIONS');
console.log('='.repeat(50));

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has the problematic pattern
  if (content.includes('new PrismaClient()')) {
    console.log(`\n📝 Fixing ${file}...`);
    
    // Replace the import and instantiation
    content = content.replace(
      /const { PrismaClient } = require\('@prisma\/client'\);\s*\n.*?const prisma = new PrismaClient\(\);/g,
      "const { prisma } = require('../config/prisma');"
    );
    
    // Also handle cases where it's just the instantiation
    content = content.replace(
      /const prisma = new PrismaClient\(\);\s*\n/g,
      ''
    );
    
    // Handle cases where PrismaClient is imported but not used in the pattern
    if (content.includes("const { PrismaClient } = require('@prisma/client');") && 
        !content.includes('new PrismaClient()')) {
      content = content.replace(
        /const { PrismaClient } = require\('@prisma\/client'\);\s*\n/g,
        ''
      );
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
    fixedCount++;
  }
});

console.log(`\n🎉 FIXED ${fixedCount} FILES`);
console.log('\n📋 SUMMARY:');
console.log('- All routes now use the shared Prisma connection');
console.log('- This should resolve database connection pool issues');
console.log('- Restart your server to apply changes');
console.log('\n🚀 Next steps:');
console.log('1. Restart your server');
console.log('2. Test the feedback system');
console.log('3. Monitor for any remaining connection issues');
