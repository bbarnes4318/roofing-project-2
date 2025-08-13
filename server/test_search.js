const fs = require('fs');
const content = fs.readFileSync('./services/WorkflowProgressionService.js', 'utf8');
const lines = content.split('\n');
console.log('Line 327:', lines[326]);
console.log('Lines around 327:');
for (let i = 324; i <= 330; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}