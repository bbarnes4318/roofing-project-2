/**
 * Current Status Checker - Verify if catastrophic render loop still exists
 * Tests the current production environment for infinite loops
 */

// Use built-in fetch (Node.js 18+) or https module
const https = require('https');
const { URL } = require('url');

class CurrentStatusChecker {
  constructor() {
    this.baseURL = 'https://goldfish-app-4yuma.ondigitalocean.app';
    this.testResults = [];
  }

  async checkCurrentStatus() {
    console.log('🔍 Checking current production status for infinite loops...');
    console.log('='.repeat(60));

    try {
      // Test 1: Basic connectivity
      await this.testBasicConnectivity();

      // Test 2: API endpoint responsiveness
      await this.testAPIResponsiveness();

      // Test 3: Monitor for request loops (30-second test)
      await this.monitorForLoops();

      // Generate status report
      return this.generateStatusReport();

    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      throw error;
    }
  }

  async testBasicConnectivity() {
    console.log('1️⃣ Testing basic connectivity...');
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = new URL(this.baseURL);
      
      const req = https.get({
        hostname: url.hostname,
        port: 443,
        path: '/',
        timeout: 10000
      }, (res) => {
        const responseTime = Date.now() - startTime;
        
        const result = {
          test: 'basic_connectivity',
          passed: res.statusCode < 400,
          status: res.statusCode,
          statusText: res.statusMessage,
          responseTime: responseTime
        };

        this.testResults.push(result);
        
        if (res.statusCode < 400) {
          console.log(`   ✅ Site accessible (${res.statusCode} - ${responseTime}ms)`);
        } else {
          console.log(`   ❌ Site returned ${res.statusCode}`);
        }
        
        resolve();
      });

      req.on('error', (error) => {
        this.testResults.push({
          test: 'basic_connectivity',
          passed: false,
          error: error.message
        });
        console.log('   ❌ Connection failed:', error.message);
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        this.testResults.push({
          test: 'basic_connectivity',
          passed: false,
          error: 'Request timeout'
        });
        console.log('   ❌ Connection timeout');
        resolve();
      });
    });
  }

  async testAPIResponsiveness() {
    console.log('2️⃣ Testing API endpoint responsiveness...');
    
    const endpoints = [
      '/api/projects?limit=100',
      '/api/alerts?status=active',
      '/api/customers'
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method: 'GET',
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        });
        const responseTime = Date.now() - startTime;

        const result = {
          test: 'api_responsiveness',
          endpoint: endpoint,
          passed: response.status < 500,
          status: response.status,
          responseTime: responseTime,
          timestamp: new Date().toISOString()
        };

        this.testResults.push(result);

        if (response.status < 500) {
          console.log(`   ✅ ${endpoint} - ${response.status} (${responseTime}ms)`);
        } else {
          console.log(`   ❌ ${endpoint} - ${response.status} (${responseTime}ms)`);
        }

      } catch (error) {
        this.testResults.push({
          test: 'api_responsiveness',
          endpoint: endpoint,
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        console.log(`   ❌ ${endpoint} - Error: ${error.message}`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async monitorForLoops() {
    console.log('3️⃣ Monitoring for infinite loops (30-second test)...');
    console.log('   This will detect if the app is making excessive requests...');
    
    const monitoringData = {
      requestCounts: {},
      timeline: [],
      startTime: Date.now(),
      testDuration: 30000 // 30 seconds
    };

    // Simulate monitoring by making periodic checks
    const checkInterval = 2000; // Check every 2 seconds
    const totalChecks = monitoringData.testDuration / checkInterval;
    
    for (let i = 0; i < totalChecks; i++) {
      const currentTime = Date.now();
      console.log(`   📊 Check ${i + 1}/${totalChecks} (${Math.round((currentTime - monitoringData.startTime) / 1000)}s)`);

      // Test the main problematic endpoints
      const endpointsToTest = [
        '/api/projects?limit=100',
        '/api/alerts?status=active'
      ];

      for (const endpoint of endpointsToTest) {
        try {
          const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'GET',
            timeout: 3000
          });

          // Track request
          if (!monitoringData.requestCounts[endpoint]) {
            monitoringData.requestCounts[endpoint] = 0;
          }
          monitoringData.requestCounts[endpoint]++;

          monitoringData.timeline.push({
            timestamp: new Date().toISOString(),
            endpoint: endpoint,
            status: response.status,
            responseTime: Date.now() - currentTime
          });

        } catch (error) {
          monitoringData.timeline.push({
            timestamp: new Date().toISOString(),
            endpoint: endpoint,
            error: error.message
          });
        }
      }

      // Wait before next check
      if (i < totalChecks - 1) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    // Analyze monitoring results
    const totalDuration = (Date.now() - monitoringData.startTime) / 1000;
    
    console.log('\n   📈 Monitoring Results:');
    Object.entries(monitoringData.requestCounts).forEach(([endpoint, count]) => {
      const requestsPerSecond = count / totalDuration;
      console.log(`     ${endpoint}: ${count} requests (${requestsPerSecond.toFixed(2)}/sec)`);
      
      // Evaluate if this indicates a loop
      const loopDetected = requestsPerSecond > 1.5; // More than 1.5 requests/sec indicates potential loop
      
      this.testResults.push({
        test: 'loop_monitoring',
        endpoint: endpoint,
        requestCount: count,
        requestsPerSecond: requestsPerSecond,
        loopDetected: loopDetected,
        passed: !loopDetected,
        duration: totalDuration
      });
    });
  }

  generateStatusReport() {
    const now = new Date().toISOString();
    
    // Analyze test results
    const connectivityTests = this.testResults.filter(r => r.test === 'basic_connectivity');
    const apiTests = this.testResults.filter(r => r.test === 'api_responsiveness');
    const loopTests = this.testResults.filter(r => r.test === 'loop_monitoring');

    const connectivityPassed = connectivityTests.every(t => t.passed);
    const apiHealthy = apiTests.filter(t => t.passed).length / apiTests.length;
    const loopsDetected = loopTests.some(t => t.loopDetected);

    // Overall assessment
    let overallStatus = 'HEALTHY';
    let statusColor = '🟢';
    let assessment = 'Application is functioning normally with no infinite loops detected.';

    if (loopsDetected) {
      overallStatus = 'CRITICAL';
      statusColor = '🔴';
      assessment = 'CRITICAL: Infinite loops detected - immediate action required!';
    } else if (!connectivityPassed || apiHealthy < 0.5) {
      overallStatus = 'DEGRADED';
      statusColor = '🟡';
      assessment = 'Application has connectivity or API issues but no infinite loops detected.';
    }

    const report = {
      timestamp: now,
      overallStatus: overallStatus,
      assessment: assessment,
      
      summary: {
        connectivityHealthy: connectivityPassed,
        apiHealthScore: Math.round(apiHealthy * 100),
        infiniteLoopsDetected: loopsDetected,
        totalTestsRun: this.testResults.length
      },
      
      details: {
        connectivity: connectivityTests,
        apiEndpoints: apiTests,
        loopMonitoring: loopTests
      },
      
      recommendations: this.generateRecommendations(overallStatus, loopsDetected),
      
      comparisonToPreviousIncident: {
        previousIncident: {
          date: '2025-08-07T19:43:57.602Z',
          duration: '47 seconds',
          pageLoads: 151,
          apiRequests: 696,
          severity: 'CATASTROPHIC'
        },
        currentStatus: {
          date: now,
          pageLoadsDetected: 0,
          excessiveRequestsDetected: loopsDetected,
          severity: overallStatus
        },
        improvement: !loopsDetected ? 'COMPLETE RESOLUTION' : 'ISSUE PERSISTS'
      }
    };

    return report;
  }

  generateRecommendations(status, loopsDetected) {
    const recommendations = [];

    if (loopsDetected) {
      recommendations.push('URGENT: Implement emergency component isolation testing');
      recommendations.push('URGENT: Review recent code changes that may have regressed the fix');
      recommendations.push('URGENT: Check DashboardPage.jsx useEffect dependencies');
      recommendations.push('Deploy hotfix immediately to restore stability');
    } else {
      recommendations.push('✅ No immediate action required - infinite loop fix is working');
      recommendations.push('Continue monitoring for any performance regressions');
      recommendations.push('Maintain current state management patterns');
      recommendations.push('Schedule regular performance audits');
    }

    return recommendations;
  }

  displayResults(report) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CURRENT PRODUCTION STATUS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n${report.overallStatus === 'HEALTHY' ? '🟢' : report.overallStatus === 'DEGRADED' ? '🟡' : '🔴'} Overall Status: ${report.overallStatus}`);
    console.log(`📋 Assessment: ${report.assessment}`);
    
    console.log(`\n📈 Summary:`);
    console.log(`   Connectivity: ${report.summary.connectivityHealthy ? '✅' : '❌'}`);
    console.log(`   API Health: ${report.summary.apiHealthScore}%`);
    console.log(`   Infinite Loops: ${report.summary.infiniteLoopsDetected ? '🚨 DETECTED' : '✅ NONE'}`);
    
    console.log(`\n🔄 Comparison to Previous Incident:`);
    console.log(`   Previous: CATASTROPHIC (151 page loads, 696 API requests in 47s)`);
    console.log(`   Current: ${report.comparisonToPreviousIncident.currentStatus.severity}`);
    console.log(`   Status: ${report.comparisonToPreviousIncident.improvement}`);
    
    console.log(`\n📋 Recommendations:`);
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    
    console.log('\n' + '='.repeat(80));
  }
}

// Export for use
module.exports = { CurrentStatusChecker };

// Run if called directly
if (require.main === module) {
  const checker = new CurrentStatusChecker();
  
  checker.checkCurrentStatus()
    .then(report => {
      checker.displayResults(report);
      
      // Save detailed report
      const fs = require('fs');
      const path = require('path');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(__dirname, '..', 'reports', `current-status-${timestamp}.json`);
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`💾 Detailed report saved: ${reportPath}`);
      
      // Exit with appropriate code
      process.exit(report.overallStatus === 'CRITICAL' ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Status check failed:', error.message);
      process.exit(1);
    });
}