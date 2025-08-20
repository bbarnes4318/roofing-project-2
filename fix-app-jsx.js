const fs = require('fs');

// Read the file
const content = fs.readFileSync('/workspace/src/App.jsx', 'utf8');

// Split into lines
const lines = content.split('\n');

// Remove lines 339-344 (0-indexed: 338-343)
// Line 339: setTimeout(forceScroll, 500);
// Line 340: empty
// Lines 341-344: Final smooth scroll setTimeout
lines.splice(338, 6); // Remove 6 lines starting from index 338

// Write back
fs.writeFileSync('/workspace/src/App.jsx', lines.join('\n'));
console.log('Fixed App.jsx - removed excessive setTimeout calls');