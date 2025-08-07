/**
 * HAR File Analysis Tool for Catastrophic Render Loop Investigation
 * Deep analysis of network patterns and initiator call stacks
 */

const fs = require('fs');
const path = require('path');

class HARAnalyzer {
  constructor(harFilePath) {
    this.harFilePath = harFilePath;
    this.harData = null;
    this.analysisResults = {
      overview: {},
      loopingRequests: [],
      initiatorChains: [],
      suspiciousComponents: [],
      timeline: []
    };
  }

  async analyzeHARFile() {
    console.log('🔍 Starting HAR file analysis for catastrophic render loop...');
    
    // Load and parse HAR file
    this.loadHARData();
    
    // Perform comprehensive analysis
    this.analyzeOverview();
    this.analyzeLoopingRequests();
    this.analyzeInitiatorChains();
    this.identifySuspiciousComponents();
    this.generateTimeline();
    
    // Generate detailed report
    const report = this.generateAnalysisReport();
    
    console.log('✅ HAR analysis complete');
    return report;
  }

  loadHARData() {
    try {
      const harContent = fs.readFileSync(this.harFilePath, 'utf8');
      this.harData = JSON.parse(harContent);
      console.log(`📂 Loaded HAR file: ${this.harData.log.entries.length} entries`);
    } catch (error) {
      throw new Error(`Failed to load HAR file: ${error.message}`);
    }
  }

  analyzeOverview() {
    const entries = this.harData.log.entries;
    const pages = this.harData.log.pages;
    
    // Calculate time span
    const startTime = new Date(entries[0]?.startedDateTime || pages[0]?.startedDateTime);
    const endTime = new Date(entries[entries.length - 1]?.startedDateTime);
    const duration = (endTime - startTime) / 1000; // seconds
    
    // Analyze request patterns
    const urlCounts = {};
    entries.forEach(entry => {
      const url = entry.request.url;
      urlCounts[url] = (urlCounts[url] || 0) + 1;
    });
    
    // Find API requests
    const apiRequests = entries.filter(entry => 
      entry.request.url.includes('/api/')
    );
    
    // Analyze page loads
    const pageLoadCount = pages.length;
    const pageLoadsPerSecond = pageLoadCount / duration;
    
    this.analysisResults.overview = {
      totalEntries: entries.length,
      totalPages: pageLoadCount,
      duration: Math.round(duration),
      apiRequests: apiRequests.length,
      pageLoadsPerSecond: Math.round(pageLoadsPerSecond * 100) / 100,
      topRequestedURLs: Object.entries(urlCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([url, count]) => ({ url: this.truncateURL(url), count })),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    };

    console.log(`📊 Overview: ${entries.length} entries, ${pageLoadCount} pages over ${Math.round(duration)}s`);
  }

  analyzeLoopingRequests() {
    const entries = this.harData.log.entries;
    
    // Focus on API requests that could be looping
    const apiRequests = entries.filter(entry => {
      const url = entry.request.url;
      return url.includes('/api/projects') || 
             url.includes('/api/alerts') || 
             url.includes('/api/customers') ||
             url.includes('/api/workflow');
    });

    // Group by URL and analyze patterns
    const urlGroups = {};
    apiRequests.forEach(entry => {
      const baseURL = this.extractBaseAPIURL(entry.request.url);
      if (!urlGroups[baseURL]) {
        urlGroups[baseURL] = [];
      }
      urlGroups[baseURL].push({
        timestamp: new Date(entry.startedDateTime),
        url: entry.request.url,
        method: entry.request.method,
        status: entry.response?.status,
        initiator: entry._initiator
      });
    });

    // Identify loops (multiple requests to same endpoint in short timeframe)
    Object.entries(urlGroups).forEach(([baseURL, requests]) => {
      if (requests.length > 5) { // More than 5 requests indicates potential loop
        // Calculate request frequency
        const timeSpan = requests.length > 1 
          ? (requests[requests.length - 1].timestamp - requests[0].timestamp) / 1000
          : 1;
        const requestsPerSecond = requests.length / timeSpan;

        this.analysisResults.loopingRequests.push({
          url: baseURL,
          requestCount: requests.length,
          timeSpan: Math.round(timeSpan),
          requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
          severity: requestsPerSecond > 2 ? 'CRITICAL' : requestsPerSecond > 0.5 ? 'HIGH' : 'MEDIUM',
          requests: requests
        });
      }
    });

    // Sort by severity
    this.analysisResults.loopingRequests.sort((a, b) => {
      const severityOrder = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });

    console.log(`🔄 Found ${this.analysisResults.loopingRequests.length} potential infinite loops`);
  }

  analyzeInitiatorChains() {
    const loopingRequests = this.analysisResults.loopingRequests;
    
    loopingRequests.forEach(loopData => {
      const initiatorAnalysis = {
        url: loopData.url,
        initiators: [],
        callStacks: [],
        suspiciousFiles: new Set()
      };

      loopData.requests.forEach((request, index) => {
        if (request.initiator && index < 10) { // Analyze first 10 requests
          const initiator = {
            type: request.initiator.type,
            stack: request.initiator.stack || [],
            url: request.initiator.url,
            lineNumber: request.initiator.lineNumber
          };

          initiatorAnalysis.initiators.push(initiator);

          // Extract call stack information
          if (initiator.stack && initiator.stack.length > 0) {
            const callStack = initiator.stack.map(frame => ({
              functionName: frame.functionName || 'anonymous',
              fileName: this.extractFileName(frame.url || ''),
              lineNumber: frame.lineNumber || 0,
              columnNumber: frame.columnNumber || 0
            }));

            initiatorAnalysis.callStacks.push(callStack);

            // Identify suspicious React component files
            callStack.forEach(frame => {
              if (frame.fileName.includes('.jsx') || frame.fileName.includes('.tsx')) {
                initiatorAnalysis.suspiciousFiles.add(frame.fileName);
              }
            });
          }
        }
      });

      initiatorAnalysis.suspiciousFiles = Array.from(initiatorAnalysis.suspiciousFiles);
      this.analysisResults.initiatorChains.push(initiatorAnalysis);
    });

    console.log(`🕵️ Analyzed initiator chains for ${this.analysisResults.initiatorChains.length} loops`);
  }

  identifySuspiciousComponents() {
    const componentMap = new Map();

    // Aggregate suspicious components from all loops
    this.analysisResults.initiatorChains.forEach(chain => {
      chain.suspiciousFiles.forEach(fileName => {
        if (!componentMap.has(fileName)) {
          componentMap.set(fileName, {
            fileName: fileName,
            loopInvolvement: 0,
            requestCounts: 0,
            severityScore: 0
          });
        }

        const component = componentMap.get(fileName);
        component.loopInvolvement += 1;
        
        // Find matching loop data for request counts
        const matchingLoop = this.analysisResults.loopingRequests.find(loop =>
          chain.url === loop.url
        );
        
        if (matchingLoop) {
          component.requestCounts += matchingLoop.requestCount;
          component.severityScore += matchingLoop.severity === 'CRITICAL' ? 5 :
                                   matchingLoop.severity === 'HIGH' ? 3 : 1;
        }
      });
    });

    // Convert to sorted array
    this.analysisResults.suspiciousComponents = Array.from(componentMap.entries())
      .map(([fileName, data]) => ({
        ...data,
        suspicionLevel: data.severityScore > 10 ? 'CRITICAL' : 
                       data.severityScore > 5 ? 'HIGH' : 'MEDIUM'
      }))
      .sort((a, b) => b.severityScore - a.severityScore);

    console.log(`🎯 Identified ${this.analysisResults.suspiciousComponents.length} suspicious components`);
  }

  generateTimeline() {
    const entries = this.harData.log.entries;
    const pages = this.harData.log.pages;

    // Create timeline of significant events
    const events = [];

    // Add page loads
    pages.forEach((page, index) => {
      events.push({
        timestamp: new Date(page.startedDateTime),
        type: 'PAGE_LOAD',
        event: `Page Load #${index + 1}`,
        details: {
          url: page.title,
          loadTime: page.pageTimings?.onLoad || 'timeout'
        }
      });
    });

    // Add significant API request bursts
    const apiRequests = entries.filter(entry => entry.request.url.includes('/api/'));
    
    // Group API requests by 1-second intervals
    const timeGroups = {};
    apiRequests.forEach(entry => {
      const timestamp = new Date(entry.startedDateTime);
      const timeKey = Math.floor(timestamp.getTime() / 1000); // Round to seconds
      
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = [];
      }
      timeGroups[timeKey].push(entry);
    });

    // Identify request bursts (>5 requests in 1 second)
    Object.entries(timeGroups).forEach(([timeKey, requests]) => {
      if (requests.length > 5) {
        events.push({
          timestamp: new Date(parseInt(timeKey) * 1000),
          type: 'REQUEST_BURST',
          event: `API Request Burst (${requests.length} requests)`,
          details: {
            requestCount: requests.length,
            urls: [...new Set(requests.map(r => this.extractBaseAPIURL(r.request.url)))]
          }
        });
      }
    });

    // Sort events by timestamp
    this.analysisResults.timeline = events.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`📅 Generated timeline with ${events.length} significant events`);
  }

  generateAnalysisReport() {
    const report = {
      summary: {
        criticalFindings: this.analysisResults.loopingRequests.filter(r => r.severity === 'CRITICAL').length,
        totalLoops: this.analysisResults.loopingRequests.length,
        topSuspiciousComponent: this.analysisResults.suspiciousComponents[0]?.fileName || 'Unknown',
        analysisTimestamp: new Date().toISOString(),
        ...this.analysisResults.overview
      },
      
      infiniteLoops: this.analysisResults.loopingRequests.map(loop => ({
        ...loop,
        diagnosis: this.generateLoopDiagnosis(loop),
        recommendations: this.generateLoopRecommendations(loop)
      })),
      
      suspiciousComponents: this.analysisResults.suspiciousComponents.map(component => ({
        ...component,
        recommendations: this.generateComponentRecommendations(component)
      })),
      
      timeline: this.analysisResults.timeline.map(event => ({
        time: event.timestamp.toISOString(),
        type: event.type,
        description: event.event,
        details: event.details
      })),
      
      actionPlan: this.generateActionPlan()
    };

    return report;
  }

  generateLoopDiagnosis(loop) {
    if (loop.requestsPerSecond > 5) {
      return 'CATASTROPHIC: Extremely high request frequency indicates severe infinite loop';
    } else if (loop.requestsPerSecond > 2) {
      return 'CRITICAL: High request frequency suggests active infinite loop';
    } else if (loop.requestsPerSecond > 0.5) {
      return 'MODERATE: Elevated request frequency may indicate loop or polling issue';
    } else {
      return 'LOW: Request frequency within acceptable range but worth monitoring';
    }
  }

  generateLoopRecommendations(loop) {
    const recommendations = [];
    
    if (loop.url.includes('/api/projects')) {
      recommendations.push('Check DashboardPage.jsx for useEffect dependencies on projects data');
      recommendations.push('Verify project selectors are properly memoized');
      recommendations.push('Review project-related state management for circular dependencies');
    }
    
    if (loop.url.includes('/api/alerts')) {
      recommendations.push('Investigate alert fetching hooks for dependency issues');
      recommendations.push('Check alert state updates for triggering re-renders');
      recommendations.push('Verify alert polling is not creating feedback loops');
    }
    
    recommendations.push('Use React DevTools Profiler to identify re-rendering components');
    recommendations.push('Implement component isolation testing to confirm source');
    
    return recommendations;
  }

  generateComponentRecommendations(component) {
    const recommendations = [];
    
    if (component.fileName.includes('Dashboard')) {
      recommendations.push('Priority 1: Review all useEffect hooks for proper dependency arrays');
      recommendations.push('Check dashboard state management for circular updates');
      recommendations.push('Verify data fetching logic is not triggered by its own results');
    }
    
    if (component.fileName.includes('App.jsx')) {
      recommendations.push('Review root-level state management and context providers');
      recommendations.push('Check for prop drilling causing excessive re-renders');
    }
    
    recommendations.push('Add React.memo() to prevent unnecessary re-renders');
    recommendations.push('Use useMemo() and useCallback() for expensive computations');
    
    return recommendations;
  }

  generateActionPlan() {
    const criticalLoops = this.analysisResults.loopingRequests.filter(l => l.severity === 'CRITICAL');
    const topSuspect = this.analysisResults.suspiciousComponents[0];
    
    return {
      immediateActions: [
        criticalLoops.length > 0 ? 
          `EMERGENCY: Fix ${criticalLoops.length} critical infinite loops immediately` : 
          'Monitor for any emerging loop patterns',
        topSuspect ? 
          `Focus investigation on ${topSuspect.fileName} (highest suspicion score: ${topSuspect.severityScore})` :
          'No clearly suspicious components identified',
        'Deploy component isolation testing to confirm root cause',
        'Implement structural fixes based on root cause analysis'
      ],
      
      nextSteps: [
        'Set up continuous monitoring for request pattern anomalies',
        'Implement automated regression tests for infinite loop detection',
        'Review code review guidelines for state management best practices',
        'Document findings for future reference and prevention'
      ]
    };
  }

  // Utility methods
  truncateURL(url) {
    if (url.length > 60) {
      return url.substring(0, 57) + '...';
    }
    return url;
  }

  extractBaseAPIURL(url) {
    // Extract the base API path without query parameters
    const match = url.match(/^(https?:\/\/[^\/]+\/api\/[^?]+)/);
    return match ? match[1] : url;
  }

  extractFileName(url) {
    if (!url) return 'unknown';
    const parts = url.split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  // Save analysis results
  saveAnalysisReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, '..', 'reports', `har-analysis-${timestamp}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 Analysis report saved: ${reportPath}`);
    
    return reportPath;
  }
}

// Export for use
module.exports = { HARAnalyzer };

// Run if called directly
if (require.main === module) {
  const harFilePath = process.argv[2] || path.join(__dirname, '..', 'shit.app.har');
  
  const analyzer = new HARAnalyzer(harFilePath);
  analyzer.analyzeHARFile()
    .then(report => {
      console.log('\n🎯 ANALYSIS COMPLETE');
      console.log('='.repeat(50));
      console.log(`Critical Loops: ${report.summary.criticalFindings}`);
      console.log(`Total Loops: ${report.summary.totalLoops}`);
      console.log(`Top Suspect: ${report.summary.topSuspiciousComponent}`);
      console.log(`Duration: ${report.summary.duration}s`);
      console.log(`Page Loads: ${report.summary.totalPages}`);
      
      // Save detailed report
      analyzer.saveAnalysisReport(report);
      
      // Display immediate actions
      console.log('\n🚨 IMMEDIATE ACTIONS REQUIRED:');
      report.actionPlan.immediateActions.forEach((action, i) => {
        console.log(`${i + 1}. ${action}`);
      });
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    });
}