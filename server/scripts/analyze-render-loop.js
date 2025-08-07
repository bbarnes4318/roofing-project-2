/**
 * Advanced Render Loop Analysis Script
 * Analyzes the codebase to identify potential infinite render causes
 */

const fs = require('fs');
const path = require('path');

class RenderLoopAnalyzer {
  constructor() {
    this.suspiciousPatterns = [];
    this.componentUsage = new Map();
    this.hookDependencies = new Map();
  }

  // Analyze a single file for problematic patterns
  analyzeFile(filePath, content) {
    const relativePath = path.relative(process.cwd(), filePath);
    const issues = [];

    // Pattern 1: useEffect with missing dependencies
    const useEffectMatches = content.matchAll(/useEffect\s*\(\s*\(\s*\)\s*=>\s*{([^}]+)}/g);
    for (const match of useEffectMatches) {
      const effectBody = match[1];
      if (effectBody.includes('fetch') || effectBody.includes('api.') || effectBody.includes('axios')) {
        // Check if dependencies array is present
        const fullMatch = content.substring(match.index);
        const dependencyMatch = fullMatch.match(/}\s*,\s*\[(.*?)\]/);
        if (!dependencyMatch || dependencyMatch[1].trim() === '') {
          issues.push({
            type: 'MISSING_DEPENDENCIES',
            file: relativePath,
            line: this.getLineNumber(content, match.index),
            message: 'useEffect with API call has empty dependency array',
            code: match[0].substring(0, 100) + '...'
          });
        }
      }
    }

    // Pattern 2: useState in useEffect (potential infinite loop)
    const stateInEffectMatches = content.matchAll(/useEffect\([^}]+set\w+\([^)]+\)[^}]+}/g);
    for (const match of stateInEffectMatches) {
      issues.push({
        type: 'STATE_UPDATE_IN_EFFECT',
        file: relativePath,
        line: this.getLineNumber(content, match.index),
        message: 'useState setter called in useEffect - potential infinite loop',
        code: match[0].substring(0, 100) + '...'
      });
    }

    // Pattern 3: Object/Array literals in dependency arrays
    const objInDepsMatches = content.matchAll(/\[(.*?{.*?}.*?)\]/g);
    for (const match of objInDepsMatches) {
      if (match[0].includes('useEffect') || match[0].includes('useMemo') || match[0].includes('useCallback')) {
        issues.push({
          type: 'OBJECT_IN_DEPENDENCIES',
          file: relativePath,
          line: this.getLineNumber(content, match.index),
          message: 'Object literal in dependency array - will cause re-renders',
          code: match[0]
        });
      }
    }

    // Pattern 4: Function recreation in component body
    const functionCreationMatches = content.matchAll(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g);
    for (const match of functionCreationMatches) {
      // Check if this function is used in a dependency array
      const functionName = match[1];
      const usedInDeps = content.includes(`[${functionName}]`) || content.includes(`[...${functionName}]`);
      if (usedInDeps) {
        issues.push({
          type: 'FUNCTION_RECREATION',
          file: relativePath,
          line: this.getLineNumber(content, match.index),
          message: `Function '${functionName}' recreated on every render and used in dependencies`,
          code: match[0]
        });
      }
    }

    // Pattern 5: Inline objects/arrays as props
    const inlineObjectMatches = content.matchAll(/<\w+[^>]*\s+(\w+)=\{\{[^}]+\}\}/g);
    for (const match of inlineObjectMatches) {
      issues.push({
        type: 'INLINE_OBJECT_PROP',
        file: relativePath,
        line: this.getLineNumber(content, match.index),
        message: 'Inline object as prop - will cause child re-renders',
        code: match[0]
      });
    }

    return issues;
  }

  // Get line number from character index
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  // Analyze the entire src directory
  async analyzeSrcDirectory() {
    const srcPath = path.join(process.cwd(), 'src');
    await this.walkDirectory(srcPath);
    
    // Sort issues by severity
    this.suspiciousPatterns.sort((a, b) => {
      const severityOrder = {
        'STATE_UPDATE_IN_EFFECT': 5,
        'MISSING_DEPENDENCIES': 4,
        'FUNCTION_RECREATION': 3,
        'OBJECT_IN_DEPENDENCIES': 2,
        'INLINE_OBJECT_PROP': 1
      };
      return (severityOrder[b.type] || 0) - (severityOrder[a.type] || 0);
    });
  }

  // Recursively walk directory
  async walkDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.walkDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const issues = this.analyzeFile(fullPath, content);
          this.suspiciousPatterns.push(...issues);
        } catch (error) {
          console.error(`Error reading file ${fullPath}:`, error.message);
        }
      }
    }
  }

  // Analyze specific React Query usage
  analyzeReactQuery() {
    const queryIssues = [];
    
    // Look for useQuery patterns that might cause loops
    this.suspiciousPatterns.forEach(pattern => {
      if (pattern.code.includes('useQuery') || pattern.code.includes('useProjects') || pattern.code.includes('useWorkflowAlerts')) {
        queryIssues.push({
          ...pattern,
          type: 'REACT_QUERY_ISSUE',
          severity: 'HIGH'
        });
      }
    });
    
    return queryIssues;
  }

  // Generate detailed report
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 CRITICAL RENDER LOOP ANALYSIS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Analysis Summary:`);
    console.log(`   Total Issues Found: ${this.suspiciousPatterns.length}`);
    
    const issuesByType = this.suspiciousPatterns.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(issuesByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    console.log('\n🚨 CRITICAL ISSUES (Most Likely to Cause Infinite Loops):');
    console.log('=' + '='.repeat(78));
    
    // Show top 10 most critical issues
    const criticalIssues = this.suspiciousPatterns
      .filter(issue => ['STATE_UPDATE_IN_EFFECT', 'MISSING_DEPENDENCIES', 'FUNCTION_RECREATION'].includes(issue.type))
      .slice(0, 10);
    
    criticalIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.type} (${issue.file}:${issue.line})`);
      console.log(`   💥 ${issue.message}`);
      console.log(`   📝 Code: ${issue.code.replace(/\s+/g, ' ').trim()}`);
    });
    
    // Analyze React Query specific issues
    const queryIssues = this.analyzeReactQuery();
    if (queryIssues.length > 0) {
      console.log('\n🔄 REACT QUERY / DATA FETCHING ISSUES:');
      console.log('=' + '='.repeat(78));
      
      queryIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.file}:${issue.line}`);
        console.log(`   💥 ${issue.message}`);
      });
    }
    
    console.log('\n📋 RECOMMENDED ACTIONS:');
    console.log('=' + '='.repeat(78));
    console.log('1. Fix STATE_UPDATE_IN_EFFECT issues immediately - these are guaranteed loop causes');
    console.log('2. Add proper dependencies to useEffect hooks with API calls');
    console.log('3. Wrap functions in useCallback if used in dependency arrays');
    console.log('4. Memoize objects and arrays used in dependency arrays');
    console.log('5. Use React.memo for components receiving inline object props');
    
    return {
      totalIssues: this.suspiciousPatterns.length,
      criticalIssues: criticalIssues.length,
      queryIssues: queryIssues.length,
      allIssues: this.suspiciousPatterns
    };
  }

  // Analyze specific files that are likely culprits
  analyzeTopSuspects() {
    const suspects = [
      'src/components/pages/DashboardPage.jsx',
      'src/hooks/useApi.js',
      'src/hooks/useQueryApi.js',
      'src/App.jsx'
    ];
    
    console.log('\n🎯 ANALYZING TOP SUSPECTS:');
    console.log('=' + '='.repeat(78));
    
    suspects.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        console.log(`\n📁 ${filePath}:`);
        const content = fs.readFileSync(fullPath, 'utf8');
        const issues = this.analyzeFile(fullPath, content);
        
        if (issues.length === 0) {
          console.log('   ✅ No obvious issues detected');
        } else {
          issues.forEach(issue => {
            console.log(`   ⚠️  Line ${issue.line}: ${issue.message}`);
          });
        }
      } else {
        console.log(`\n📁 ${filePath}: File not found`);
      }
    });
  }
}

// Run the analysis
async function main() {
  console.log('🔍 Starting Critical Render Loop Analysis...');
  console.log('This will scan all React components for patterns that cause infinite renders.\n');
  
  const analyzer = new RenderLoopAnalyzer();
  
  try {
    await analyzer.analyzeSrcDirectory();
    analyzer.analyzeTopSuspects();
    const report = analyzer.generateReport();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis Complete!');
    console.log(`Found ${report.criticalIssues} critical issues that need immediate attention.`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { RenderLoopAnalyzer };