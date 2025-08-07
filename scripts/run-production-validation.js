/**
 * Production Button Validation Execution Script
 * Runs the comprehensive validation and generates reports
 */

const { ProductionButtonValidator } = require('./production-button-validator.js');
const fs = require('fs');
const path = require('path');

async function runProductionValidation() {
  console.log('🚀 Starting Production Button Validation...');
  console.log('=' + '='.repeat(60));
  
  const validator = new ProductionButtonValidator({
    baseURL: 'https://goldfish-app-4yuma.ondigitalocean.app',
    timeout: 30000,
    retries: 2,
    debug: true
  });
  
  try {
    // Execute the complete validation process
    const report = await validator.execute();
    
    // Generate reports in different formats
    await generateReports(report);
    
    // Display summary
    displaySummary(report);
    
    return report;
    
  } catch (error) {
    console.error('❌ Validation execution failed:', error);
    process.exit(1);
  }
}

async function generateReports(report) {
  const reportDir = path.join(__dirname, '..', 'reports');
  
  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Generate Markdown Report
  const markdownReport = generateMarkdownReport(report);
  const markdownPath = path.join(reportDir, `production-validation-report-${timestamp}.md`);
  fs.writeFileSync(markdownPath, markdownReport);
  
  // Generate JSON Report for programmatic processing
  const jsonPath = path.join(reportDir, `production-validation-results-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  
  // Generate CSV of failures for spreadsheet analysis
  let csvPath = null;
  if (report.failures.length > 0) {
    const csvReport = generateCSVReport(report.failures);
    csvPath = path.join(reportDir, `production-validation-failures-${timestamp}.csv`);
    fs.writeFileSync(csvPath, csvReport);
  }
  
  console.log('📄 Reports generated:');
  console.log(`   📋 Markdown: ${markdownPath}`);
  console.log(`   📊 JSON: ${jsonPath}`);
  if (csvPath) {
    console.log(`   📈 CSV: ${csvPath}`);
  }
}

function generateMarkdownReport(report) {
  return `# Production Button Validation Report

## Executive Summary

**Validation Date**: ${report.executionInfo.timestamp}  
**Environment**: ${report.executionInfo.environment} (${report.executionInfo.url})  
**Duration**: ${report.executionInfo.duration}  
**Browser**: ${report.executionInfo.browser}

### Results Overview
- **Total Elements Tested**: ${report.summary.totalElements}
- **Success Rate**: ${report.summary.successRate}
- **Passed**: ${report.summary.passed}
- **Failed**: ${report.summary.failed}
- **Errors**: ${report.summary.errors}

## Category Breakdown

| Category | Total | Tested | Passed | Failed | Success Rate |
|----------|-------|--------|--------|--------|--------------|
${Object.entries(report.categoryResults).map(([category, results]) => 
  `| ${category.charAt(0).toUpperCase() + category.slice(1)} | ${results.total} | ${results.tested} | ${results.passed} | ${results.failed} | ${((results.passed / results.tested) * 100).toFixed(1)}% |`
).join('\n')}

## Performance Metrics

- **Average Response Time**: ${report.performance.averageResponseTime}ms
- **Slowest Operation**: ${report.performance.maxResponseTime}ms
- **Fastest Operation**: ${report.performance.minResponseTime}ms
- **Slow Operations (>2s)**: ${report.performance.slowOperations}
- **Infinite Loops Detected**: ${report.performance.infiniteLoopsDetected}

${report.performance.slowOperationDetails.length > 0 ? `
### Slow Operations Details
${report.performance.slowOperationDetails.map(op => 
  `- **${op.element}**: ${op.time}ms`
).join('\n')}
` : ''}

${report.failures.length > 0 ? `
## ❌ Failed Elements

${report.failures.map(failure => `
### ${failure.severity}: ${failure.element}
- **Page**: ${failure.page} (\`${failure.path}\`)
- **Category**: ${failure.category}
- **Expected**: ${failure.expected}
- **Actual**: ${failure.actual}
- **Reproduction**: ${failure.reproduction}
`).join('\n')}
` : '## ✅ All Elements Passed Validation'}

${report.recommendations.length > 0 ? `
## 📋 Recommendations

${report.recommendations.map(rec => `
### ${rec.priority}: ${rec.title}
${rec.description}
`).join('\n')}
` : ''}

## Summary

${report.summary.successRate === '100.0%' ? 
  '🎉 **All interactive elements are functioning correctly!** The production application has passed comprehensive validation with no issues detected.' :
  `⚠️ **${report.summary.failed + report.summary.errors} elements require attention.** Priority should be given to ${report.failures.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length} high/critical issues.`}

${report.performance.infiniteLoopsDetected > 0 ? 
  '\n🚨 **CRITICAL**: Infinite loops were detected during validation. This indicates a regression in recent fixes and requires immediate attention.' : 
  '✅ No infinite loops detected - recent fixes are stable.'}

---
*Report generated by Production Button Validator v1.0*
`;
}

function generateCSVReport(failures) {
  const headers = ['Severity', 'Element', 'Page', 'Path', 'Category', 'Expected', 'Actual', 'Reproduction'];
  const rows = failures.map(failure => [
    failure.severity,
    failure.element,
    failure.page,
    failure.path,
    failure.category,
    failure.expected,
    failure.actual,
    failure.reproduction
  ]);
  
  return [headers, ...rows].map(row => 
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

function displaySummary(report) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCTION VALIDATION SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\n🎯 Overall Results:`);
  console.log(`   Total Elements: ${report.summary.totalElements}`);
  console.log(`   Success Rate: ${report.summary.successRate}`);
  console.log(`   Passed: ${report.summary.passed}`);
  console.log(`   Failed: ${report.summary.failed}`);
  console.log(`   Errors: ${report.summary.errors}`);
  
  console.log(`\n⚡ Performance:`);
  console.log(`   Average Response: ${report.performance.averageResponseTime}ms`);
  console.log(`   Slow Operations: ${report.performance.slowOperations}`);
  console.log(`   Infinite Loops: ${report.performance.infiniteLoopsDetected}`);
  
  if (report.failures.length > 0) {
    console.log(`\n❌ Critical Issues:`);
    const critical = report.failures.filter(f => f.severity === 'CRITICAL');
    const high = report.failures.filter(f => f.severity === 'HIGH');
    
    if (critical.length > 0) {
      console.log(`   🚨 CRITICAL: ${critical.length} issues`);
      critical.forEach(issue => {
        console.log(`      - ${issue.element} on ${issue.page}`);
      });
    }
    
    if (high.length > 0) {
      console.log(`   ⚠️ HIGH: ${high.length} issues`);
      high.forEach(issue => {
        console.log(`      - ${issue.element} on ${issue.page}`);
      });
    }
  } else {
    console.log(`\n✅ All elements passed validation!`);
  }
  
  if (report.recommendations.length > 0) {
    console.log(`\n📋 Top Recommendations:`);
    report.recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`   ${i + 1}. [${rec.priority}] ${rec.title}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (report.performance.infiniteLoopsDetected > 0) {
    console.log('🚨 URGENT: Infinite loops detected! Recent fixes may have regressed.');
  } else if (report.failures.filter(f => f.severity === 'CRITICAL').length > 0) {
    console.log('⚠️ ATTENTION: Critical elements are failing. Immediate action required.');
  } else if (parseFloat(report.summary.successRate) >= 95) {
    console.log('🎉 EXCELLENT: Production application is in excellent condition!');
  } else {
    console.log('👍 GOOD: Production application is mostly functional with minor issues.');
  }
  
  console.log('='.repeat(80));
}

// Run if called directly
if (require.main === module) {
  runProductionValidation().catch(console.error);
}

module.exports = { runProductionValidation };