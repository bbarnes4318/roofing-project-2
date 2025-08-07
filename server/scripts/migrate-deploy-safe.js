#!/usr/bin/env node
const { spawnSync } = require('child_process');

console.log('🔧 Running prisma migrate deploy (safe)…');
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  shell: true,
  stdio: 'pipe',
  env: process.env,
});

const stdout = (result.stdout || Buffer.from('')).toString();
const stderr = (result.stderr || Buffer.from('')).toString();
process.stdout.write(stdout);
process.stderr.write(stderr);

// Ignore baseline error on existing prod DBs
const isBaselineError = stderr.includes('P3005') || /database schema is not empty/i.test(stderr);

if (result.status !== 0 && !isBaselineError) {
  console.error('❌ prisma migrate deploy failed');
  process.exit(result.status || 1);
}

if (isBaselineError) {
  console.log('⚠️  P3005 baseline detected. Skipping migrations and continuing.');
}

console.log('✅ Safe migrate-deploy complete');

