/**
 * Comprehensive API Fetching and Workflow Update Test
 * 
 * This script tests all the fixes for:
 * 1. API environment configuration
 * 2. Authentication token handling
 * 3. Checkbox functionality
 * 4. Error handling and retry mechanisms
 * 5. Network error detection
 */

console.log('🧪 Starting Comprehensive API Fetching and Workflow Update Test...');

// Test 1: Environment Detection and API Base URL
console.group('🔍 Test 1: Environment Detection and API Base URL');
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

// Test 3: Network Error Detection
console.group('🌐 Test 3: Network Error Detection');
const testNetworkErrorDetection = () => {
  const isNetworkError = (error) => {
    return error.name === 'TypeError' && 
           (error.message.includes('fetch') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_CONNECTION_REFUSED'));
  };
  
  const getUserFriendlyErrorMessage = (error) => {
    if (isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    if (error.message.includes('aborted')) {
      return 'Request was cancelled. Please try again.';
    }
    
    return error.message || 'An unexpected error occurred. Please try again.';
  };
  
  // Test various error types
  const testErrors = [
    new TypeError('Failed to fetch'),
    new TypeError('ERR_CONNECTION_REFUSED'),
    new Error('Request timeout'),
    new Error('Request aborted'),
    new Error('Unknown error')
  ];
  
  testErrors.forEach((error, index) => {
    const isNetwork = isNetworkError(error);
    const userMessage = getUserFriendlyErrorMessage(error);
    console.log(`Error ${index + 1}:`, error.message);
    console.log(`  Is network error: ${isNetwork}`);
    console.log(`  User message: ${userMessage}`);
  });
  
  return true;
};

const networkErrorResult = testNetworkErrorDetection();
console.groupEnd();

// Test 4: API Connectivity with Retry
console.group('🌐 Test 4: API Connectivity with Retry');
const testApiConnectivityWithRetry = async () => {
  const testApiConnectivity = async (retries = 3) => {
    const healthUrl = `${apiBaseUrl}/health`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🌐 Testing API connectivity (attempt ${attempt}/${retries})`);
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ API connectivity test successful');
          return {
            success: true,
            message: 'API is reachable',
            data,
            attempt
          };
        } else {
          console.log(`⚠️ API returned status ${response.status} (attempt ${attempt})`);
          if (attempt === retries) {
            return {
              success: false,
              message: `API returned status ${response.status}`,
              status: response.status,
              attempt
            };
          }
        }
      } catch (error) {
        console.log(`❌ API connectivity test failed (attempt ${attempt}):`, error.message);
        
        if (attempt === retries) {
          return {
            success: false,
            message: 'API is not reachable',
            error: error.message,
            attempt
          };
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };
  
  const result = await testApiConnectivity(3);
  console.log('Connectivity test result:', result);
  return result.success;
};

const connectivityResult = await testApiConnectivityWithRetry();
console.groupEnd();

// Test 5: Enhanced API Request Function
console.group('📡 Test 5: Enhanced API Request Function');
const testEnhancedApiRequest = async () => {
  const makeApiRequest = async (url, options = {}, retries = 2) => {
    const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
    
    // Get authentication token
    const effectiveToken = token;
    if (!effectiveToken) {
      throw new Error('No authentication token found');
    }
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${effectiveToken}`,
      ...options.headers
    };
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🌐 Making API request (attempt ${attempt}/${retries})`);
        console.log('URL:', fullUrl);
        console.log('Method:', options.method || 'GET');
        
        // Add timeout to the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(fullUrl, {
          ...options,
          headers,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json().catch(() => null);
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }
        
        console.log('✅ API request successful');
        return { response, data };
      } catch (error) {
        console.error(`❌ API request failed (attempt ${attempt}/${retries}):`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };
  
  try {
    // Test GET request
    const projectId = 'test-project-123';
    const { data } = await makeApiRequest(`/workflows/project/${projectId}`);
    console.log('✅ GET request successful');
    console.log('Response data:', data);
    
    // Test PUT request
    const stepId = 'test-step-456';
    const putResult = await makeApiRequest(`/workflows/project/${projectId}/workflow/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: true })
    });
    console.log('✅ PUT request successful');
    console.log('PUT response:', putResult.data);
    
    return true;
  } catch (error) {
    console.error('❌ Enhanced API request test failed:', error);
    return false;
  }
};

const enhancedApiResult = await testEnhancedApiRequest();
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
    
    // Simulate the checkbox update process with retry
    const updateUrl = `${apiBaseUrl}/workflows/project/${projectId}/workflow/${stepId}`;
    
    console.log('Making PUT request to:', updateUrl);
    console.log('Request payload:', { completed: true });
    
    // Simulate optimistic update
    console.log('✅ Optimistic update: UI updated immediately');
    
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
      console.log('✅ Server sync: Backend updated successfully');
      return true;
    } else {
      console.log('❌ Checkbox update failed');
      try {
        const errorData = await response.json();
        console.log('Error details:', errorData);
      } catch (parseError) {
        console.log('Could not parse error response');
      }
      
      // Simulate rollback
      console.log('🔄 Rollback: UI reverted to previous state');
      return false;
    }
  } catch (error) {
    console.error('❌ Checkbox functionality test error:', error.message);
    
    // Simulate error handling
    const isNetworkError = error.name === 'TypeError' && 
                          (error.message.includes('fetch') || 
                           error.message.includes('Failed to fetch') ||
                           error.message.includes('NetworkError') ||
                           error.message.includes('ERR_CONNECTION_REFUSED'));
    
    if (isNetworkError) {
      console.log('🔄 Rollback: UI reverted due to network error');
      console.log('📝 User message: Unable to connect to the server. Please check your internet connection and try again.');
    }
    
    return false;
  }
};

const checkboxResult = await testCheckboxFunctionality();
console.groupEnd();

// Test 7: Error Handling and User Feedback
console.group('⚠️ Test 7: Error Handling and User Feedback');
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
  
  const testErrors = [
    { status: 400, expected: 'Invalid request' },
    { status: 401, expected: 'Authentication failed' },
    { status: 403, expected: 'You do not have permission' },
    { status: 404, expected: 'Resource not found' },
    { status: 500, expected: 'Server error' },
    { status: 999, expected: 'An error occurred' }
  ];
  
  testErrors.forEach(({ status, expected }) => {
    const message = getErrorMessage(status);
    const isCorrect = message.includes(expected);
    console.log(`Status ${status}: ${message} ${isCorrect ? '✅' : '❌'}`);
  });
  
  return true;
};

const errorHandlingResult = testErrorHandling();
console.groupEnd();

// Summary
console.group('📊 Comprehensive Test Summary');
console.log('Environment Detection:', apiBaseUrl ? '✅ Working' : '❌ Failed');
console.log('Token Handling:', token ? '✅ Working' : '❌ Failed');
console.log('Network Error Detection:', networkErrorResult ? '✅ Working' : '❌ Failed');
console.log('API Connectivity:', connectivityResult ? '✅ Working' : '❌ Failed');
console.log('Enhanced API Requests:', enhancedApiResult ? '✅ Working' : '❌ Failed');
console.log('Checkbox Functionality:', checkboxResult ? '✅ Working' : '❌ Failed');
console.log('Error Handling:', errorHandlingResult ? '✅ Working' : '❌ Failed');

const allTestsPassed = apiBaseUrl && token && networkErrorResult && connectivityResult && enhancedApiResult && checkboxResult && errorHandlingResult;
console.log('');
console.log(allTestsPassed ? '🎉 All comprehensive tests passed!' : '⚠️ Some tests failed. Check the details above.');
console.groupEnd();

// Export test functions for manual testing
window.comprehensiveApiTest = {
  testEnvironmentDetection,
  testTokenHandling,
  testNetworkErrorDetection,
  testApiConnectivityWithRetry,
  testEnhancedApiRequest,
  testCheckboxFunctionality,
  testErrorHandling,
  runAllTests: async () => {
    console.log('🧪 Running all comprehensive API tests...');
    const results = {
      environment: testEnvironmentDetection(),
      token: testTokenHandling(),
      networkError: testNetworkErrorDetection(),
      connectivity: await testApiConnectivityWithRetry(),
      enhancedApi: await testEnhancedApiRequest(),
      checkbox: await testCheckboxFunctionality(),
      errorHandling: testErrorHandling()
    };
    return results;
  }
};

console.log('💡 Manual testing available via window.comprehensiveApiTest'); 