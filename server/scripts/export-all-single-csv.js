#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

function asPlain(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  const ctor = value && value.constructor && value.constructor.name;
  if (ctor === 'Decimal') return value.toString();
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function prefixKeys(obj, prefix) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[`${prefix}.${k}`] = asPlain(v);
  }
  return out;
}

function toCsvRow(values) {
  return values.map((v) => {
    const s = v == null ? '' : String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(',');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const exportsDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(exportsDir, `all-tables-${timestamp}.csv`);

    const models = [
      { name: 'user', query: (p) => p.user.findMany() },
      { name: 'customer', query: (p) => p.customer.findMany() },
      { name: 'project', query: (p) => p.project.findMany() },
      { name: 'projectWorkflow', query: (p) => p.projectWorkflow.findMany().catch(() => []) },
      { name: 'projectWorkflowTracker', query: (p) => p.projectWorkflowTracker?.findMany ? p.projectWorkflowTracker.findMany() : Promise.resolve([]) },
      { name: 'workflowPhase', query: (p) => p.workflowPhase?.findMany ? p.workflowPhase.findMany() : Promise.resolve([]) },
      { name: 'workflowSection', query: (p) => p.workflowSection?.findMany ? p.workflowSection.findMany() : Promise.resolve([]) },
      { name: 'workflowStep', query: (p) => p.workflowStep?.findMany ? p.workflowStep.findMany() : Promise.resolve([]) },
      { name: 'workflowSubTask', query: (p) => p.workflowSubTask?.findMany ? p.workflowSubTask.findMany() : Promise.resolve([]) },
      { name: 'roleAssignment', query: (p) => p.roleAssignment?.findMany ? p.roleAssignment.findMany() : Promise.resolve([]) },
    ];

    // Gather all rows and headers
    const rows = [];
    const headerSet = new Set(['model']);

    for (const m of models) {
      let records = [];
      try {
        records = await m.query(prisma);
      } catch (_) {
        records = [];
      }
      for (const rec of records) {
        const prefixed = prefixKeys(rec, m.name);
        const row = { model: m.name, ...prefixed };
        rows.push(row);
        Object.keys(row).forEach((k) => headerSet.add(k));
      }
    }

    const headers = Array.from(headerSet);
    // Move 'model' to the front
    headers.sort((a, b) => (a === 'model' ? -1 : b === 'model' ? 1 : a.localeCompare(b)));

    const lines = [];
    lines.push(toCsvRow(headers));
    for (const row of rows) {
      const values = headers.map((h) => row[h] ?? '');
      lines.push(toCsvRow(values));
    }

    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log('Wrote', outPath, 'rows:', rows.length, 'columns:', headers.length);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


