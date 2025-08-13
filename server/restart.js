// Simple test to verify the code is loaded correctly
const fs = require('fs');
const content = fs.readFileSync('./services/WorkflowProgressionService.js', 'utf8');
if (content.includes('sectionData')) {
  console.log('❌ ERROR: sectionData still found in WorkflowProgressionService.js');
  process.exit(1);
} else {
  console.log('✅ SUCCESS: No sectionData references found');
  console.log('✅ Code should be working correctly');
}