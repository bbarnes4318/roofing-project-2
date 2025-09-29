const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const skipDirs = new Set(['node_modules', '.git', 'build', 'dist']);
const skipFiles = [path.join('src', 'index.css')];
const skipPatterns = [/\.bak/, /\.backup/, /\.mod$/];
const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.md']);

let modified = [];

function shouldSkip(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  if (skipFiles.some(s => rel === s)) return true;
  if (skipPatterns.some(r => r.test(rel))) return true;
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (skipDirs.has(e.name)) continue;
      walk(path.join(dir, e.name));
    } else if (e.isFile()) {
      const filePath = path.join(dir, e.name);
      if (shouldSkip(filePath)) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (!exts.has(ext)) continue;
      try {
        let s = fs.readFileSync(filePath, 'utf8');
        const orig = s;
        // Replace exact tokens only
        s = s.replace(/\bbg-blue-600\b/g, 'bg-[var(--color-primary-blueprint-blue)]');
        s = s.replace(/\bbg-green-600\b/g, 'bg-[var(--color-success-green)]');
        if (s !== orig) {
          fs.writeFileSync(filePath, s, 'utf8');
          modified.push(path.relative(root, filePath));
        }
      } catch (err) {
        console.error('skip', filePath, err.message);
      }
    }
  }
}

walk(root);
console.log('Modified files:', modified.length);
modified.forEach(f => console.log(' -', f));

// Exit code 0
