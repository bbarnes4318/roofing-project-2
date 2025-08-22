/*
 * Safe database wipe (data only, no schema drops)
 * - Truncates all public tables except internal migration tables
 * - Requires WIPE_CONFIRM=YES to run
 * - Optionally accepts WIPE_DRY_RUN=1 to preview
 */

const { prisma } = require('../config/prisma');

async function main() {
  const confirm = process.env.WIPE_CONFIRM;
  const dryRun = process.env.WIPE_DRY_RUN === '1' || process.env.WIPE_DRY_RUN === 'true';

  if (confirm !== 'YES') {
    console.error("Refusing to wipe: set WIPE_CONFIRM=YES to proceed (data only, no drops).");
    process.exit(1);
  }

  console.log('Preparing safe data wipe (no schema drops)...');

  // Fetch all public base tables, excluding prisma/internal tables
  const excluded = new Set(['_prisma_migrations']);

  const rows = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
  );

  const tableNames = rows
    .map(r => r.table_name || r.tableName)
    .filter(Boolean)
    .filter(name => !excluded.has(name))
    .sort();

  if (tableNames.length === 0) {
    console.log('No tables found to truncate. Exiting.');
    return;
  }

  const fq = tableNames.map(t => `public."${t}"`);
  const sql = `TRUNCATE TABLE ${fq.join(', ')} CASCADE;`;

  if (dryRun) {
    console.log('DRY RUN - would execute:');
    console.log(sql);
    return;
  }

  console.log('Executing TRUNCATE ...');
  await prisma.$executeRawUnsafe(sql);
  console.log(`Wipe complete. Truncated ${tableNames.length} tables.`);
}

main()
  .catch(err => {
    console.error('Wipe failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    try { await prisma.$disconnect(); } catch (_) {}
  });


