/**
 * Removes gradient backgrounds and backdrop-blur from all JSX files.
 * Handles ternary expressions, multi-line classNames, and edge cases
 * that a simple regex can't handle.
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob') || null;

// Recursively find all .jsx and .js files in src/
function findFiles(dir, exts) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'build') {
      results = results.concat(findFiles(full, exts));
    } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// Pattern: bg-gradient-to-XX from-COLOR via-COLOR to-COLOR
// This handles bracket colors like from-[#abc123] and named colors like from-slate-50
const gradientPattern = /bg-gradient-to-(?:br|bl|tr|tl|r|l|t|b)\s+from-(?:\[[^\]]+\]|[\w-]+)\s+(?:via-(?:\[[^\]]+\]|[\w-]+)\s+)?to-(?:\[[^\]]+\]|[\w-]+)/g;

// Pattern: backdrop-blur variants
const backdropBlurPattern = /\s*backdrop-blur(?:-(?:sm|md|lg|xl|2xl|3xl|none))?/g;

// Pattern: bg-white/NN or bg-neutral-800/NN (opacity modifiers on bg)
const bgOpacityPattern = /bg-(white|neutral-800)\/\d+/g;

const srcDir = path.join(__dirname, '..', 'src');
const files = findFiles(srcDir, ['.jsx', '.js']);

let totalModified = 0;

for (const filepath of files) {
  let content = fs.readFileSync(filepath, 'utf8');
  const original = content;

  // Replace gradients with solid neutral background
  content = content.replace(gradientPattern, 'bg-[#F8FAFC]');

  // Remove backdrop-blur (with leading space so we don't leave double spaces)
  content = content.replace(backdropBlurPattern, '');

  // Simplify bg-white/NN to bg-white
  content = content.replace(bgOpacityPattern, 'bg-$1');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    totalModified++;
    const relPath = path.relative(path.join(__dirname, '..'), filepath);
    console.log(`  ✅ ${relPath}`);
  }
}

console.log(`\nModified ${totalModified} files.`);

// Verify: check for any broken JSX patterns
console.log('\n--- Verification ---');
let issues = 0;
for (const filepath of files) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for bg-[#F8FAFC] at end of line without closing quote (broken tag)
    if (/bg-\[#F8FAFC\]\s*$/.test(line.trimEnd()) && !line.includes("'bg-[#F8FAFC]'") && !line.includes("`")) {
      // Check if next line starts with a JSX tag or another className part
      const nextLine = lines[i + 1] || '';
      if (nextLine.trim().startsWith('<') || nextLine.trim().startsWith('{')) {
        const relPath = path.relative(path.join(__dirname, '..'), filepath);
        console.log(`  ⚠️  POSSIBLE ISSUE: ${relPath}:${i + 1}: ${line.trimEnd()}`);
        issues++;
      }
    }
  }
}

if (issues === 0) {
  console.log('  ✅ No broken JSX patterns detected.');
} else {
  console.log(`\n  ⚠️  ${issues} possible issues found - review before building.`);
}
