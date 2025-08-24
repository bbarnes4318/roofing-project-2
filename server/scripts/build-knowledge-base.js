#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const sources = [
  path.join(root, 'project-phases.txt'),
  path.join(root, 'tables-and-fields.md'),
  path.join(root, 'workflow.csv')
];

(async () => {
  try {
    for (const s of sources) {
      const exists = fs.existsSync(s);
      const size = exists ? fs.statSync(s).size : 0;
      console.log(`${exists ? 'FOUND' : 'MISSING'}: ${s} (${size} bytes)`);
    }
    console.log('Knowledge base sources checked. For RAG, integrate an indexer later.');
    process.exit(0);
  } catch (e) {
    console.error('KB build error:', e);
    process.exit(1);
  }
})();