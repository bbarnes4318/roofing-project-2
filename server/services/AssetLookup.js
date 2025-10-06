const path = require('path');
const fs = require('fs').promises;

/**
 * Shared document/asset lookup used by assistants (Vapi, Bubbles).
 * 
 * Strategy:
 * 1) DB fuzzy search on CompanyAsset by title/folderName/description with local scoring.
 * 2) Heuristic head-substrings from concatenated names.
 * 3) Token startsWith and AND-contains.
 * 4) Disk-scan fallback under uploads/company-assets, supporting both server/uploads and repo-root/uploads,
 *    including files directly under the company-assets root and in year/month subfolders.
 *
 * Options for testing/injection:
 * - opts.fsReaddir(dir): async function to override fs.readdir
 * - opts.uploadRoots: array of absolute roots to scan instead of defaults
 */
async function findAssetByMention(prisma, message, opts = {}) {
  try {
    const text = String(message || '');
    const filenameMatch = text.match(/([\w\-\.\s]+\.(pdf|docx|doc|xlsx|csv|txt|jpg|jpeg|png))/i);
    const matchedFilename = filenameMatch ? filenameMatch[1] : null;
    const rawKey = matchedFilename || text;
    const extLower = matchedFilename ? path.extname(matchedFilename).toLowerCase().replace('.', '') : null;

    const base = rawKey.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const baseClean = base.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    const tokens = Array.from(new Set(baseClean.split(' ')))
      .map(t => t.replace(/[^a-z0-9]/g, '').trim())
      .filter(t => t && t.length >= 4 && !['document','file','files','pdf','doc','docx'].includes(t));

    const commonInclude = { versions: { where: { is_current: true }, take: 1 } };
    const commonWhere = { isActive: true, type: 'FILE' };

    // 1) Exact-ish contains across fields
    let asset = await prisma.companyAsset.findFirst({
      where: { ...commonWhere, OR: [
        { title: { contains: base, mode: 'insensitive' } },
        { folderName: { contains: base, mode: 'insensitive' } },
        { description: { contains: base, mode: 'insensitive' } },
      ]},
      include: commonInclude
    });
    if (asset) return asset;

    // 2) Heuristic head substrings
    const heads = [];
    for (const n of [12,10,8,7,6,5]) { if (baseClean.length >= n) heads.push(baseClean.slice(0,n)); }
    if (heads.length) {
      asset = await prisma.companyAsset.findFirst({
        where: { ...commonWhere, OR: [
          ...heads.map(h => ({ title: { startsWith: h, mode: 'insensitive' } })),
          ...heads.map(h => ({ folderName: { startsWith: h, mode: 'insensitive' } })),
        ]},
        include: commonInclude
      });
      if (asset) return asset;
      asset = await prisma.companyAsset.findFirst({
        where: { ...commonWhere, OR: [
          ...heads.map(h => ({ title: { contains: h, mode: 'insensitive' } })),
          ...heads.map(h => ({ folderName: { contains: h, mode: 'insensitive' } })),
        ]},
        include: commonInclude
      });
      if (asset) return asset;
    }

    // 3a) Starts with token 0
    if (tokens.length > 0) {
      asset = await prisma.companyAsset.findFirst({ where: { ...commonWhere, title: { startsWith: tokens[0], mode: 'insensitive' } }, include: commonInclude });
      if (asset) return asset;
    }

    // 3b) AND all tokens in title
    if (tokens.length >= 2) {
      asset = await prisma.companyAsset.findFirst({ where: { ...commonWhere, AND: tokens.map(t => ({ title: { contains: t, mode: 'insensitive' } })) }, include: commonInclude });
      if (asset) return asset;
    }

    // 3c) OR across fields + local scoring
    if (tokens.length > 0) {
      const candidates = await prisma.companyAsset.findMany({
        where: { ...commonWhere, OR: [
          ...tokens.map(t => ({ title: { contains: t, mode: 'insensitive' } })),
          ...tokens.map(t => ({ folderName: { contains: t, mode: 'insensitive' } })),
          ...tokens.map(t => ({ description: { contains: t, mode: 'insensitive' } })),
        ]},
        include: commonInclude,
        take: 25
      });
      if (candidates && candidates.length) {
        const baseLen = baseClean.length;
        const score = (a) => {
          const title = String(a.title || '').toLowerCase();
          const titleClean = title.replace(/[^a-z0-9\s]/g, ' ');
          let s = 0;
          if (titleClean.includes(baseClean)) s += 5;
          for (const t of tokens) if (t && titleClean.includes(t)) s += 2;
          if (extLower && typeof a.title === 'string' && a.title.toLowerCase().endsWith('.' + extLower)) s += 1;
          s -= Math.min(5, Math.abs((a.title || '').length - baseLen));
          return s;
        };
        candidates.sort((a,b) => score(b) - score(a));
        return candidates[0] || null;
      }
    }

    // 4) Disk scan fallback
    const readdir = typeof opts.fsReaddir === 'function' ? opts.fsReaddir : (dir) => fs.readdir(dir);

    // default roots
    const defaultRoots = [
      path.join(__dirname, '..', 'uploads', 'company-assets'),
      path.join(__dirname, '..', '..', 'uploads', 'company-assets'),
    ];
    const roots = Array.isArray(opts.uploadRoots) && opts.uploadRoots.length ? opts.uploadRoots : defaultRoots;

    let best = null; // { score, root, year, month, file, direct }
    const scoreFilename = (file) => {
      const name = String(file || '').toLowerCase();
      const nameClean = name.replace(/[^a-z0-9\s]/g, ' ');
      let s = 0;
      if (baseClean && nameClean.includes(baseClean)) s += 5;
      for (const t of tokens) if (t && nameClean.includes(t)) s += 2;
      return s;
    };

    for (const root of roots) {
      let years = await readdir(root).catch(() => []);
      // If no subfolders, still attempt direct files at root (below)
      // Score direct files under root first
      for (const f of (years || [])) {
        // If entry looks like a file (has a dot), score it as a direct root file
        if (String(f).includes('.')) {
          const sc = scoreFilename(f);
          if (sc > (best?.score || -Infinity)) best = { score: sc, root, year: null, month: null, file: f, direct: true };
        }
      }

      // Attempt year/month traversal (treat all entries as potential years)
      years = (years || []).filter((y) => !String(y).includes('.'));
      years.sort((a,b) => (b||'').localeCompare(a||''));
      for (const y of years.slice(0, 3)) {
        const yearDir = path.join(root, y);
        const months = await readdir(yearDir).catch(() => []);
        const monthsOnly = (months || []).filter((m) => !String(m).includes('.'));
        monthsOnly.sort((a,b) => (b||'').localeCompare(a||''));
        for (const m of monthsOnly.slice(0, 6)) {
          const monthDir = path.join(yearDir, m);
          const files = await readdir(monthDir).catch(() => []);
          for (const f of (files || [])) {
            const sc = scoreFilename(f);
            if (sc > (best?.score || -Infinity)) best = { score: sc, root, year: y, month: m, file: f, direct: false };
          }
          if (best?.score >= 5) break;
        }
        if (best?.score >= 5) break;
      }
      if (best?.score >= 5) break;
    }

    if (best) {
      const ext = path.extname(best.file).toLowerCase();
      const mimeMap = {
        '.pdf':'application/pdf','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.csv':'text/csv','.txt':'text/plain',
        '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'
      };
      const fileUrl = best.direct
        ? `/uploads/company-assets/${best.file}`
        : `/uploads/company-assets/${best.year}/${best.month}/${best.file}`;
      return { id: null, title: best.file, mimeType: mimeMap[ext] || 'application/octet-stream', versions: [{ isCurrent: true, fileUrl }], fileUrl };
    }

    return null;
  } catch (e) {
    try { console.warn('[AssetLookup] findAssetByMention failed:', e?.message || e); } catch (_) {}
    return null;
  }
}

module.exports = { findAssetByMention };
