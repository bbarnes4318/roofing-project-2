#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

function flatten(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(out, flatten(value, p));
    } else {
      out[p] = value instanceof Date ? value.toISOString() : value;
    }
  }
  return out;
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { primaryName: true, primaryEmail: true, primaryPhone: true, address: true } },
        projectManager: { select: { firstName: true, lastName: true, email: true, phone: true } },
        workflow: { select: { status: true, overallProgress: true } }
      }
    });

    // Prepare rows
    const rows = projects.map(p => flatten({
      id: p.id,
      projectNumber: p.projectNumber,
      projectName: p.projectName,
      projectType: p.projectType,
      status: p.status,
      phase: p.phase,
      priority: p.priority,
      budget: p.budget?.toString?.() ?? p.budget,
      estimatedCost: p.estimatedCost?.toString?.() ?? p.estimatedCost,
      actualCost: p.actualCost?.toString?.() ?? p.actualCost,
      startDate: p.startDate,
      endDate: p.endDate,
      archived: p.archived,
      customer: p.customer,
      projectManager: p.projectManager,
      workflow: p.workflow
    }));

    // Collect headers
    const headers = Array.from(rows.reduce((set, r) => {
      Object.keys(r).forEach(k => set.add(k));
      return set;
    }, new Set()));

    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = r[h] ?? '';
        const s = typeof v === 'string' ? v : (v === null || v === undefined ? '' : String(v));
        // Escape double quotes and wrap if needed
        const escaped = s.replace(/"/g, '""');
        return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(','))
    ].join('\n');

    const outDir = path.resolve(process.cwd(), 'exports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(outDir, `projects-${ts}.csv`);
    fs.writeFileSync(outPath, csv, 'utf8');
    console.log(`✅ Exported ${projects.length} projects to ${outPath}`);
  } catch (e) {
    console.error('❌ Export failed:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();


