#!/usr/bin/env node
/**
 * Execute a PRP (Project Requirements Plan) by orchestrating available diagnostic/validation tools.
 * Usage: node scripts/execute-prp.js <path-to-prp-md>
 */

const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function main() {
  const inputArg = process.argv.slice(2)[0];
  if (!inputArg) {
    fail('Missing input file. Usage: node scripts/execute-prp.js <path-to-prp-md>');
  }

  // Resolve PRP file, with fallback mapping from PRPs/<name>.md to PROJECT_REQUIREMENTS_PLAN_<name>.md
  let prpPath = path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(prpPath)) {
    const base = path.basename(inputArg).replace(/\.md$/i, '');
    const mapped = path.resolve(process.cwd(), `PROJECT_REQUIREMENTS_PLAN_${base}.md`);
    if (fs.existsSync(mapped)) {
      prpPath = mapped;
    } else {
      fail(`PRP file not found: ${prpPath}`);
    }
  }

  console.log(`🧭 Executing PRP: ${prpPath}`);

  // Load PRP content
  const prpContent = fs.readFileSync(prpPath, 'utf8');

  // Prepare report aggregation
  const reportsDir = path.resolve(process.cwd(), 'reports');
  ensureDir(reportsDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const executionReportPath = path.join(reportsDir, `prp-execution-${timestamp}.md`);

  const artifacts = {
    harAnalysisReportPath: null,
    currentStatusReportPath: null,
    productionValidation: {
      markdownPath: null,
      jsonPath: null,
      csvPath: null
    }
  };

  // Step 1: HAR Analysis if Phase 1 stabilization is present and HAR file exists
  try {
    const harPath = path.resolve(process.cwd(), 'shit.app.har');
    const mentionsStabilize = /PHASE 1: STABILIZE|STOP THE LOOP/i.test(prpContent);
    if (mentionsStabilize && fs.existsSync(harPath)) {
      console.log('🔬 Running HAR analysis (Phase 1: Stabilize)...');
      const { HARAnalyzer } = require('./har-analysis-tool.js');
      const analyzer = new HARAnalyzer(harPath);
      const report = await analyzer.analyzeHARFile();
      artifacts.harAnalysisReportPath = analyzer.saveAnalysisReport(report);
    } else {
      console.log('ℹ️ Skipping HAR analysis (no Phase 1 marker or HAR file missing)');
    }
  } catch (err) {
    console.error('⚠️ HAR analysis failed:', err.message);
  }

  // Step 2: Current status check
  let currentStatus = null;
  try {
    console.log('📡 Checking current production status...');
    const { CurrentStatusChecker } = require('./current-status-checker.js');
    const checker = new CurrentStatusChecker();
    const report = await checker.checkCurrentStatus();
    // Save JSON report similar to direct-run path
    const statusJsonPath = path.join(reportsDir, `current-status-${timestamp}.json`);
    fs.writeFileSync(statusJsonPath, JSON.stringify(report, null, 2));
    artifacts.currentStatusReportPath = statusJsonPath;
    // Display to console as well
    checker.displayResults(report);
    currentStatus = report;
  } catch (err) {
    console.error('⚠️ Current status check failed:', err.message);
  }

  // Step 3: Production validation
  let validationReport = null;
  try {
    console.log('🧪 Running production validation...');
    const { runProductionValidation } = require('./run-production-validation.js');
    validationReport = await runProductionValidation();
    // The runner itself writes markdown/json/csv. Nothing extra here.
  } catch (err) {
    console.error('⚠️ Production validation failed:', err.message);
  }

  // Compose execution report
  const summaryLines = [];
  summaryLines.push(`# PRP Execution Report`);
  summaryLines.push(`\n**Executed PRP**: ${path.relative(process.cwd(), prpPath)}`);
  summaryLines.push(`\n**Timestamp**: ${new Date().toISOString()}`);
  summaryLines.push(`\n---`);

  if (artifacts.harAnalysisReportPath) {
    summaryLines.push(`\n## HAR Analysis`);
    summaryLines.push(`- Report: ${path.relative(process.cwd(), artifacts.harAnalysisReportPath)}`);
  } else {
    summaryLines.push(`\n## HAR Analysis`);
    summaryLines.push(`- Skipped or failed`);
  }

  summaryLines.push(`\n## Current Status`);
  if (currentStatus) {
    summaryLines.push(`- Overall: ${currentStatus.overallStatus}`);
    summaryLines.push(`- Assessment: ${currentStatus.assessment}`);
    summaryLines.push(`- Report JSON: ${path.relative(process.cwd(), artifacts.currentStatusReportPath)}`);
  } else {
    summaryLines.push(`- Failed to obtain current status`);
  }

  summaryLines.push(`\n## Production Validation`);
  if (validationReport && validationReport.summary) {
    summaryLines.push(`- Total Elements: ${validationReport.summary.totalElements}`);
    summaryLines.push(`- Passed: ${validationReport.summary.passed}`);
    summaryLines.push(`- Failed: ${validationReport.summary.failed}`);
    summaryLines.push(`- Errors: ${validationReport.summary.errors}`);
    summaryLines.push(`- Infinite Loops Detected: ${validationReport.performance?.infiniteLoopsDetected ?? 'n/a'}`);
  } else {
    summaryLines.push(`- Validation failed or produced no report`);
  }

  summaryLines.push(`\n---`);
  summaryLines.push(`\nEnd of report.`);

  fs.writeFileSync(executionReportPath, summaryLines.join('\n'));
  console.log(`\n📄 PRP execution summary written to: ${executionReportPath}`);
}

main();


