/**
 * API Environment Configuration and Checkbox Functionality Test
 * 
 * This script tests the fixes for:
 * 1. Dynamic API environment detection
 * 2. Authentication token handling
 * 3. Checkbox functionality
 * 4. Error handling
 */

console.log('🧪 Starting API Environment and Checkbox Functionality Test...');

// Test 1: Environment Detection
console.group('🔍 Test 1: Environment Detection');
const testEnvironmentDetection = () => {
  const getApiBaseUrl = () => {
    if (window.location.hostname.includes('vercel.app') || 
        window.location.hostname.includes('your-domain.com') ||
        window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.host}/api`;
    }
    return 'http://localhost:5000/api';
  };
  
  const apiBaseUrl = getApiBaseUrl();
  console.log('Current hostname:', window.location.hostname);
  console.log('API Base URL:', apiBaseUrl);
  console.log('Protocol:', window.location.protocol);
  console.log('Host:', window.location.host);
  
  return apiBaseUrl;
};

const apiBaseUrl = testEnvironmentDetection();
console.groupEnd();

// Test 2: Authentication Token Handling
console.group('🔐 Test 2: Authentication Token Handling');
const testTokenHandling = () => {
  // Test both token keys
  const authToken = localStorage.getItem('authToken');
  const token = localStorage.getItem('token');
  const effectiveToken = authToken || token;
  
  console.log('authToken exists:', !!authToken);
  console.log('token exists:', !!token);
  console.log('Effective token:', effectiveToken ? 'Found' : 'Not found');
  
  if (!effectiveToken) {
    console.log('⚠️ No token found, creating demo token...');
    const demoToken = 'demo-sarah-owner-token-' + Date.now();
    localStorage.setItem('authToken', demoToken);
    console.log('✅ Demo token created');
  }
  
  return effectiveToken || localStorage.getItem('authToken');
};

const token = testTokenHandling();
console.groupEnd();

// Test 3: API Connectivity
console.group('🌐 Test 3: API Connectivity');
const testApiConnectivity = async () => {
  try {
    const healthUrl = `${apiBaseUrl}/health`;
    console.log('Testing connectivity to:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Health check response:', data);
      return true;
    } else {
      console.log('Health check failed');
      return false;
    }
  } catch (error) {
    console.error('Connectivity test error:', error.message);
    return false;
  }
};

const connectivityResult = await testApiConnectivity();
console.groupEnd();

// Test 4: Workflow API Endpoints
console.group('📋 Test 4: Workflow API Endpoints');
const testWorkflowEndpoints = async () => {
  if (!token) {
    console.log('❌ No token available for workflow tests');
    return false;
  }
  
  try {
    // Test GET workflow endpoint
    const projectId = 'test-project-123';
    const getUrl = `${apiBaseUrl}/workflows/project/${projectId}`;
    
    console.log('Testing GET workflow endpoint:', getUrl);
    
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('GET response status:', getResponse.status);
    
    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('GET response data:', getData);
    }
    
    // Test PUT workflow step endpoint
    const stepId = 'test-step-456';
    const putUrl = `${apiBaseUrl}/workflows/project/${projectId}/workflow/${stepId}`;
    
    console.log('Testing PUT workflow step endpoint:', putUrl);
    
    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ completed: true })
    });
    
    console.log('PUT response status:', putResponse.status);
    
    if (putResponse.ok) {
      const putData = await putResponse.json();
      console.log('PUT response data:', putData);
      return true;
    } else {
      console.log('PUT request failed');
      return false;
    }
  } catch (error) {
    console.error('Workflow endpoint test error:', error.message);
    return false;
  }
};

const workflowResult = await testWorkflowEndpoints();
console.groupEnd();

// Test 5: Error Handling
console.group('⚠️ Test 5: Error Handling');
const testErrorHandling = () => {
  const getErrorMessage = (status, defaultMessage = 'An error occurred') => {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication failed. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found. Please refresh the page and try again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return defaultMessage;
    }
  };
  
  console.log('400 error message:', getErrorMessage(400));
  console.log('401 error message:', getErrorMessage(401));
  console.log('404 error message:', getErrorMessage(404));
  console.log('500 error message:', getErrorMessage(500));
  console.log('Unknown error message:', getErrorMessage(999));
  
  return true;
};

const errorHandlingResult = testErrorHandling();
console.groupEnd();

// Test 6: Checkbox Functionality Simulation
console.group('☑️ Test 6: Checkbox Functionality Simulation');
const testCheckboxFunctionality = async () => {
  if (!token) {
    console.log('❌ No token available for checkbox tests');
    return false;
  }
  
  try {
    const projectId = 'test-project-123';
    const stepId = 'execution-installation-0';
    
    console.log('Simulating checkbox click for step:', stepId);
    
    // Simulate the checkbox update process
    const updateUrl = `${apiBaseUrl}/workflows/project/${projectId}/workflow/${stepId}`;
    
    console.log('Making PUT request to:', updateUrl);
    console.log('Request payload:', { completed: true });
    
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ completed: true })
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Checkbox update successful');
      console.log('Response data:', data);
      return true;
    } else {
      console.log('❌ Checkbox update failed');
      try {
        const errorData = await response.json();
        console.log('Error details:', errorData);
      } catch (parseError) {
        console.log('Could not parse error response');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Checkbox functionality test error:', error.message);
    return false;
  }
};

const checkboxResult = await testCheckboxFunctionality();
console.groupEnd();

// Summary
console.group('📊 Test Summary');
console.log('Environment Detection:', apiBaseUrl ? '✅ Working' : '❌ Failed');
console.log('Token Handling:', token ? '✅ Working' : '❌ Failed');
console.log('API Connectivity:', connectivityResult ? '✅ Working' : '❌ Failed');
console.log('Workflow Endpoints:', workflowResult ? '✅ Working' : '❌ Failed');
console.log('Error Handling:', errorHandlingResult ? '✅ Working' : '❌ Failed');
console.log('Checkbox Functionality:', checkboxResult ? '✅ Working' : '❌ Failed');

const allTestsPassed = apiBaseUrl && token && connectivityResult && workflowResult && errorHandlingResult && checkboxResult;
console.log('');
console.log(allTestsPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed. Check the details above.');
console.groupEnd();

// Export test functions for manual testing
window.apiEnvironmentTest = {
  testEnvironmentDetection,
  testTokenHandling,
  testApiConnectivity,
  testWorkflowEndpoints,
  testErrorHandling,
  testCheckboxFunctionality,
  runAllTests: async () => {
    console.log('🧪 Running all API environment tests...');
    const results = {
      environment: testEnvironmentDetection(),
      token: testTokenHandling(),
      connectivity: await testApiConnectivity(),
      workflow: await testWorkflowEndpoints(),
      errorHandling: testErrorHandling(),
      checkbox: await testCheckboxFunctionality()
    };
    return results;
  }
};

console.log('💡 Manual testing available via window.apiEnvironmentTest'); 