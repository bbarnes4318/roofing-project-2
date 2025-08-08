const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

function toPlain(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toString === 'function' && value.constructor && value.constructor.name === 'Decimal') return value.toString();
  return value;
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Avoid descending into Prisma Decimal
      if (value.constructor && value.constructor.name === 'Decimal') {
        out[p] = value.toString();
      } else {
        Object.assign(out, flatten(value, p));
      }
    } else {
      out[p] = toPlain(value);
    }
  }
  return out;
}

function toCSV(rows) {
  const headers = Array.from(rows.reduce((set, r) => {
    Object.keys(r).forEach(k => set.add(k));
    return set;
  }, new Set()));
  const lines = [headers.join(',')];
  for (const r of rows) {
    const line = headers.map(h => {
      const v = r[h] ?? '';
      const s = typeof v === 'string' ? v : (v === null || v === undefined ? '' : String(v));
      const escaped = s.replace(/"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(',');
    lines.push(line);
  }
  return { headers, csv: lines.join('\n') };
}

(async () => {
  const prisma = new PrismaClient();
  const outDir = path.resolve(process.cwd(), 'exports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');

  const jobs = [
    ['users', () => prisma.user.findMany()],
    ['customers', () => prisma.customer.findMany()],
    ['projects', () => prisma.project.findMany()],
    ['project_workflows', () => prisma.projectWorkflow.findMany()],
    ['project_workflow_trackers', () => prisma.projectWorkflowTracker.findMany().catch(() => [])],
    ['workflow_phases', () => prisma.workflowPhase.findMany().catch(() => [])],
    ['workflow_sections', () => prisma.workflowSection.findMany().catch(() => [])],
    ['workflow_steps', () => prisma.workflowStep.findMany().catch(() => [])],
    ['workflow_subtasks', () => prisma.workflowSubTask.findMany().catch(() => [])],
    ['role_assignments', () => prisma.roleAssignment.findMany()],
  ];

  try {
    for (const [name, fn] of jobs) {
      const data = await fn();
      const rows = (data || []).map(d => flatten(d));
      const { csv } = toCSV(rows);
      const outPath = path.join(outDir, `${name}-${ts}.csv`);
      fs.writeFileSync(outPath, csv, 'utf8');
      console.log(`✅ Exported ${rows.length} ${name} → ${outPath}`);
    }
  } catch (e) {
    console.error('❌ Export failed:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();

