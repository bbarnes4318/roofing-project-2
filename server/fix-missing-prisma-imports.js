#!/usr/bin/env node

/**
 * Fix Missing Prisma Imports
 * This script finds all files that use prisma but don't have the import
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

console.log('🔧 FIXING MISSING PRISMA IMPORTS');
console.log('='.repeat(50));

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file uses prisma but doesn't have the import
  if (content.includes('prisma.') && !content.includes("require('../config/prisma')")) {
    console.log(`\n📝 Fixing ${file}...`);
    
    // Find the first require statement and add prisma import after it
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the first require statement
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('require(')) {
        insertIndex = i + 1;
        break;
      }
    }
    
    // Insert the prisma import
    lines.splice(insertIndex, 0, "const { prisma } = require('../config/prisma');");
    
    content = lines.join('\n');
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
    fixedCount++;
  }
});

console.log(`\n🎉 FIXED ${fixedCount} FILES`);
console.log('\n📋 SUMMARY:');
console.log('- All routes now have proper prisma imports');
console.log('- This should resolve all database connection issues');
console.log('- Restart your server to apply changes');
