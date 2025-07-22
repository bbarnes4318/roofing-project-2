// API Connectivity Test Script
// Run this in the browser console to test API connectivity

console.log('🧪 Starting API Connectivity Test...');

// Import the debugging utilities (if available)
let apiDebugger;
try {
  // Try to import from the utils directory
  apiDebugger = await import('./src/utils/apiDebugger.js');
} catch (error) {
  console.log('⚠️ Could not import apiDebugger, using fallback functions');
  
  // Fallback functions
  apiDebugger = {
    getApiBaseUrl: () => {
      if (window.location.hostname.includes('vercel.app') || 
          window.location.hostname.includes('your-domain.com') ||
          window.location.hostname !== 'localhost') {
        return 'https://your-production-domain.vercel.app/api';
      }
      return 'http://localhost:5000/api';
    },
    checkApiEnvironment: () => {
      const issues = [];
      if (typeof fetch === 'undefined') issues.push('Fetch API not available');
      if (typeof localStorage === 'undefined') issues.push('localStorage not available');
      const token = localStorage.getItem('token');
      if (!token) issues.push('No authentication token found');
      return { isValid: issues.length === 0, issues, hasToken: !!token };
    },
    testApiConnectivity: async () => {
      const apiBaseUrl = apiDebugger.getApiBaseUrl();
      const healthUrl = `${apiBaseUrl}/health`;
      try {
        const response = await fetch(healthUrl);
        return {
          success: response.ok,
          message: response.ok ? 'API is reachable' : `API returned status ${response.status}`,
          status: response.status
        };
      } catch (error) {
        return {
          success: false,
          message: 'API is not reachable',
          error: error.message
        };
      }
    }
  };
}

// Test 1: Environment Check
console.group('🔍 Test 1: Environment Check');
const envCheck = apiDebugger.checkApiEnvironment();
console.log('Environment Check Result:', envCheck);
if (!envCheck.isValid) {
  console.error('❌ Environment issues found:', envCheck.issues);
} else {
  console.log('✅ Environment is properly configured');
}
console.groupEnd();

// Test 2: API Base URL
console.group('🔍 Test 2: API Base URL');
const apiBaseUrl = apiDebugger.getApiBaseUrl();
console.log('API Base URL:', apiBaseUrl);
console.log('Current hostname:', window.location.hostname);
console.groupEnd();

// Test 3: API Connectivity
console.group('🔍 Test 3: API Connectivity');
try {
  const connectivityTest = await apiDebugger.testApiConnectivity();
  console.log('Connectivity Test Result:', connectivityTest);
  if (connectivityTest.success) {
    console.log('✅ API is reachable');
  } else {
    console.error('❌ API connectivity failed:', connectivityTest.message);
  }
} catch (error) {
  console.error('❌ Connectivity test failed:', error);
}
console.groupEnd();

// Test 4: Authentication Token
console.group('🔍 Test 4: Authentication Token');
const token = localStorage.getItem('token');
if (token) {
  console.log('✅ Authentication token found');
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 20) + '...');
} else {
  console.error('❌ No authentication token found');
}
console.groupEnd();

// Test 5: Specific Workflow Endpoint Test
console.group('🔍 Test 5: Workflow Endpoint Test');
if (token) {
  try {
    const testProjectId = 'test-project-id'; // Replace with actual project ID
    const testStepId = 'test-step-id'; // Replace with actual step ID
    const workflowUrl = `${apiBaseUrl}/workflows/project/${testProjectId}/workflow/${testStepId}`;
    
    console.log('Testing workflow endpoint:', workflowUrl);
    
    const response = await fetch(workflowUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ completed: true })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Workflow endpoint is working');
      console.log('Response data:', data);
    } else {
      console.error('❌ Workflow endpoint failed:', response.status, response.statusText);
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
      } catch (parseError) {
        console.error('Could not parse error response');
      }
    }
  } catch (error) {
    console.error('❌ Workflow endpoint test failed:', error);
  }
} else {
  console.log('⚠️ Skipping workflow endpoint test - no token available');
}
console.groupEnd();

// Test 6: Network Information
console.group('🔍 Test 6: Network Information');
console.log('User Agent:', navigator.userAgent);
console.log('Online Status:', navigator.onLine);
console.log('Connection Type:', navigator.connection ? navigator.connection.effectiveType : 'Unknown');
console.log('Protocol:', window.location.protocol);
console.log('Hostname:', window.location.hostname);
console.log('Port:', window.location.port);
console.groupEnd();

console.log('🧪 API Connectivity Test Complete!');
console.log('📋 Summary:');
console.log('- Environment:', envCheck.isValid ? '✅ Valid' : '❌ Invalid');
console.log('- API Base URL:', apiBaseUrl);
console.log('- Authentication:', token ? '✅ Token found' : '❌ No token');
console.log('- Connectivity:', 'Check Test 3 results above');

// Export test functions for manual testing
window.apiTest = {
  runEnvironmentCheck: () => apiDebugger.checkApiEnvironment(),
  runConnectivityTest: () => apiDebugger.testApiConnectivity(),
  getApiBaseUrl: () => apiDebugger.getApiBaseUrl(),
  testWorkflowEndpoint: async (projectId, stepId) => {
    const token = localStorage.getItem('token');
    if (!token) return { error: 'No authentication token' };
    
    const apiBaseUrl = apiDebugger.getApiBaseUrl();
    const url = `${apiBaseUrl}/workflows/project/${projectId}/workflow/${stepId}`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: true })
      });
      
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : null
      };
    } catch (error) {
      return { error: error.message };
    }
  }
};

console.log('💡 Manual testing available via window.apiTest');
console.log('Example: window.apiTest.testWorkflowEndpoint("your-project-id", "your-step-id")'); 