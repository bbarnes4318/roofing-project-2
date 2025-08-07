#!/usr/bin/env node
/**
 * Generate a PROJECT REQUIREMENTS PLAN (PRP) Markdown file from an INITIAL blueprint.
 * Usage: node scripts/generate-prp.js <path-to-initial-md>
 */

const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function readFileSafely(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    fail(`Unable to read file: ${filePath}. ${err.message}`);
  }
}

function toTitleCaseFromSlug(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function extractSection(content, startHeadingRegex, endHeadingRegex) {
  const startMatch = content.match(startHeadingRegex);
  if (!startMatch) return '';
  const startIndex = startMatch.index + startMatch[0].length;
  const endMatch = endHeadingRegex ? content.slice(startIndex).match(endHeadingRegex) : null;
  const endIndex = endMatch ? startIndex + endMatch.index : content.length;
  return content.slice(startIndex, endIndex).trim();
}

function buildPrp(initialPath, initialContent) {
  const baseName = path.basename(initialPath);
  const slug = baseName.replace(/\.INITIAL\.md$/i, '').replace(/\.md$/i, '');
  const humanName = toTitleCaseFromSlug(slug);

  const today = new Date();
  const createdStr = today.toISOString().slice(0, 10);

  // Extract known sections when present
  const problemContext = extractSection(
    initialContent,
    /^##\s*PROBLEM CONTEXT:\s*$/im,
    /^##\s*|^###\s*---\s*PHASE|^##\s*TASK/m
  );

  const phases = extractSection(
    initialContent,
    /^##\s*TASK[\s-]*THREE-PHASE REPAIR BLUEPRINT:\s*$/im,
    /^##\s*FINAL SUCCESS CRITERION:\s*$/im
  ) || extractSection(
    initialContent,
    /^###\s*---\s*PHASE[\s\S]*$/im,
    null
  );

  const acceptance = extractSection(
    initialContent,
    /^##\s*FINAL SUCCESS CRITERION:\s*$/im,
    null
  );

  const summaryOneLiner = `Stabilize the application, restore core data flows, and repair dependent features for "${humanName}".`;

  const prp = `# PROJECT REQUIREMENTS PLAN (PRP)\n## ${humanName}\n\n---\n\n## 1. EXECUTIVE SUMMARY\n\n**Project Name**: ${humanName}\n\n**Purpose**: ${summaryOneLiner}\n\n**Scope**:\n- Application stabilization (halt render/network loops)\n- Core data pipeline restoration (projects, assignments)\n- Dependent features repair (user assignment, roles)\n\n---\n\n## 2. PROBLEM STATEMENT\n\n${problemContext || 'Problem context is provided in the attached initial blueprint.'}\n\n---\n\n## 3. SOLUTION PLAN\n\n${phases || 'Detailed multi-phase repair plan is provided in the attached initial blueprint.'}\n\n---\n\n## 4. ACCEPTANCE CRITERIA\n\n${acceptance || '- The application is stable, core data loads correctly, and user-facing features function without errors.'}\n\n---\n\n## 5. NON-FUNCTIONAL REQUIREMENTS\n\n- Performance: Page load stable and responsive (<2s typical)\n- Reliability: No infinite loops or runaway requests after fix\n- Observability: Logs and metrics available to confirm stability\n\n---\n\n## 6. RISKS AND MITIGATIONS\n\n- Risk: Regression during stabilization\n  - Mitigation: Stage fixes, verify after each phase\n- Risk: Data integrity issues\n  - Mitigation: Validate API/store/render paths end-to-end\n- Risk: Hidden coupling causes re-loop\n  - Mitigation: Memoization, decoupled effects, equality guards\n\n---\n\n## 7. DELIVERABLES\n\n- Stable application with loops eliminated\n- Restored project data flows across API, state, and UI\n- Functional user assignment and roles screens\n- Validation notes and before/after evidence (HAR/logs)\n\n---\n\n## 8. EXECUTION NOTES\n\n- Prioritize halting loops before functional repairs\n- Instrument network and state transitions for visibility\n- Validate each phase explicitly before proceeding\n\n---\n\n## 9. TIMELINE\n\n- Phase 1 (Stabilize): 1-2 hours\n- Phase 2 (Restore Core Data): 1-2 hours\n- Phase 3 (Repair Dependents): 1 hour\n\n---\n\n## 10. ATTACHED INITIAL BLUEPRINT\n\n> Source: ${baseName}\n\n\n${initialContent}\n\n---\n\n*Document Generated: ${createdStr}*\n`;

  return { prp, slug };
}

function main() {
  const inputArg = process.argv.slice(2)[0];
  if (!inputArg) {
    fail('Missing input file. Usage: node scripts/generate-prp.js <path-to-initial-md>');
  }

  const initialPath = path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(initialPath)) {
    fail(`Input file not found: ${initialPath}`);
  }

  const initialContent = readFileSafely(initialPath);
  const { prp, slug } = buildPrp(initialPath, initialContent);

  const outputFile = path.resolve(process.cwd(), `PROJECT_REQUIREMENTS_PLAN_${slug}.md`);
  fs.writeFileSync(outputFile, prp, 'utf8');
  console.log(`✅ Generated PRP: ${outputFile}`);
}

main();


