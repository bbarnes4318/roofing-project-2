const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('🔄 Regenerating Prisma client on server...');
  
  // Run prisma generate
  execSync('npx prisma generate', { 
    cwd: path.join(__dirname, '..'), 
    stdio: 'inherit' 
  });
  
  console.log('✅ Prisma client regenerated successfully on server');
  
} catch (error) {
  console.error('❌ Error regenerating Prisma client:', error.message);
  process.exit(1);
}
