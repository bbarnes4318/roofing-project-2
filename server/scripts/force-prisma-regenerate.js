const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Forcing Prisma client regeneration on server...');

try {
  // Remove the existing Prisma client
  const prismaClientPath = path.join(__dirname, '..', 'node_modules', '@prisma', 'client');
  if (fs.existsSync(prismaClientPath)) {
    console.log('🗑️  Removing existing Prisma client...');
    fs.rmSync(prismaClientPath, { recursive: true, force: true });
  }
  
  // Regenerate Prisma client
  console.log('🔄 Regenerating Prisma client...');
  execSync('npx prisma generate', { 
    cwd: path.join(__dirname, '..'), 
    stdio: 'inherit' 
  });
  
  console.log('✅ Prisma client regenerated successfully!');
  
} catch (error) {
  console.error('❌ Error regenerating Prisma client:', error.message);
  process.exit(1);
}
