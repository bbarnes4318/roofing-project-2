#!/usr/bin/env node
/*
  Backfill RAG embeddings for existing Documents and Company Assets.
  - Documents stored on local disk: uses IngestionService.processLocalPath
  - Documents stored in Spaces (fileUrl starting with spaces://): uses IngestionService.processFile
  - Company assets: indexes current version (or fileUrl) as local files via processLocalPath

  Usage:
    node server/scripts/backfill-ingest-docs.js [--all] [--documents] [--assets]

  Notes:
  - Requires OPENAI_API_KEY and database env vars.
  - Will skip records that already have entries in embeddings.file_id.
*/

const path = require('path');
const fs = require('fs').promises;
const { prisma } = require('../config/prisma');
const { ensureVectorSchema } = require('../config/vector');
const IngestionService = require('../services/IngestionService');

function stripLeading(p) {
  return String(p || '').replace(/^\\|^\//, '');
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function alreadyIndexed(fileId) {
  try {
    const rows = await prisma.$queryRaw`SELECT 1 FROM embeddings WHERE file_id = ${String(fileId)} LIMIT 1`;
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.warn('⚠️ embeddings lookup failed, continuing without skip:', e?.message || e);
    return false;
  }
}

async function backfillDocuments() {
  console.log('🗂️  Scanning Document rows...');
  const docs = await prisma.document.findMany({
    where: { isActive: true },
    select: { id: true, fileUrl: true, mimeType: true, projectId: true }
  });
  let done = 0, skipped = 0, errors = 0;
  for (const d of docs) {
    const fileUrl = d.fileUrl || '';
    const isSpaces = fileUrl.startsWith('spaces://');
    try {
      if (isSpaces) {
        const key = fileUrl.replace('spaces://', '');
        const seen = await alreadyIndexed(d.id);
        if (seen) { skipped++; continue; }
        await IngestionService.processFile({ documentId: d.id, projectId: d.projectId || null, key, mimeType: d.mimeType || 'application/octet-stream' });
        done++;
      } else {
        const safe = stripLeading(fileUrl);
        const absolutePath = path.join(__dirname, '..', safe);
        const fileId = d.id; // We cannot set documentId for local path or it will try to update prisma.document; we want that, actually this is a Document row so it is safe
        if (!(await fileExists(absolutePath))) { skipped++; continue; }
        const seen = await alreadyIndexed(fileId);
        if (seen) { skipped++; continue; }
        await IngestionService.processLocalPath({ documentId: fileId, projectId: d.projectId || null, filePath: absolutePath, mimeType: d.mimeType || 'application/octet-stream' });
        done++;
      }
    } catch (e) {
      console.warn('⚠️ Document backfill failed', d.id, e?.message || e);
      errors++;
    }
  }
  console.log(`✅ Documents backfill complete. Indexed: ${done}, skipped: ${skipped}, errors: ${errors}`);
}

async function backfillCompanyAssets() {
  console.log('🏢  Scanning CompanyAsset rows...');
  const assets = await prisma.companyAsset.findMany({
    where: { isActive: true, type: 'FILE' },
    select: { id: true, fileUrl: true, mimeType: true }
  });
  let done = 0, skipped = 0, errors = 0;
  for (const a of assets) {
    const currentUrl = a.fileUrl || '';
    if (!currentUrl) { skipped++; continue; }
    try {
      const safe = stripLeading(currentUrl);
      const absolutePath = path.join(__dirname, '..', safe);
      if (!(await fileExists(absolutePath))) { skipped++; continue; }
      const fileId = absolutePath; // For assets we index by path (consistent with upload route ingestion)
      const seen = await alreadyIndexed(fileId);
      if (seen) { skipped++; continue; }
      await IngestionService.processLocalPath({ documentId: null, projectId: null, filePath: absolutePath, mimeType: a.mimeType || 'application/octet-stream' });
      done++;
    } catch (e) {
      console.warn('⚠️ Asset backfill failed', a.id, e?.message || e);
      errors++;
    }
  }
  console.log(`✅ Company assets backfill complete. Indexed: ${done}, skipped: ${skipped}, errors: ${errors}`);
}

(async () => {
  try {
    console.log('🔧 Ensuring vector schema...');
    await ensureVectorSchema(prisma);

    const args = new Set(process.argv.slice(2));
    const doDocs = args.has('--documents') || args.size === 0 || args.has('--all');
    const doAssets = args.has('--assets') || args.size === 0 || args.has('--all');

    if (doDocs) await backfillDocuments();
    if (doAssets) await backfillCompanyAssets();

    console.log('🎉 Backfill finished.');
  } catch (e) {
    console.error('❌ Backfill crashed:', e);
    process.exitCode = 1;
  } finally {
    try { await prisma.$disconnect(); } catch {}
  }
})();
