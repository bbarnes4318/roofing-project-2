// Simple Authentication Test Script
// Run this in the browser console to test authentication and API connectivity

console.log('🧪 Starting Simple Authentication Test...');

// Test 1: Check if we can get a valid token
console.group('🔍 Test 1: Token Validation');
const token = localStorage.getItem('token');
console.log('Raw token from localStorage:', token);

if (token && token !== 'null' && token !== 'undefined') {
  console.log('✅ Token exists in localStorage');
  
  // Basic JWT validation
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      console.log('✅ Token has valid JWT format');
      
      // Try to decode the payload
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('Token payload:', payload);
      
      // Check expiration
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp) {
        if (payload.exp > currentTime) {
          console.log('✅ Token is not expired');
        } else {
          console.log('❌ Token has expired');
        }
      } else {
        console.log('⚠️ Token has no expiration claim');
      }
    } else {
      console.log('❌ Token does not have valid JWT format');
    }
  } catch (error) {
    console.log('❌ Error validating token:', error);
  }
} else {
  console.log('❌ No token found in localStorage');
}
console.groupEnd();

// Test 2: Check API base URL
console.group('🔍 Test 2: API Base URL');
const apiBaseUrl = (() => {
  if (window.location.hostname.includes('vercel.app') || 
      window.location.hostname.includes('your-domain.com') ||
      window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  return 'http://localhost:5000/api';
})();

console.log('Current hostname:', window.location.hostname);
console.log('API Base URL:', apiBaseUrl);
console.groupEnd();

// Test 3: Test API connectivity
console.group('🔍 Test 3: API Connectivity');
async function testApiConnectivity() {
  try {
    const healthUrl = `${apiBaseUrl}/health`;
    console.log('Testing health endpoint:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Health endpoint response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health endpoint is working:', data);
    } else {
      console.log('❌ Health endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
  }
}

testApiConnectivity();
console.groupEnd();

// Test 4: Test authenticated endpoint
console.group('🔍 Test 4: Authenticated Endpoint');
async function testAuthenticatedEndpoint() {
  if (!token || token === 'null' || token === 'undefined') {
    console.log('❌ No token available for authenticated test');
    return;
  }
  
  try {
    // Test with a sample project ID (you may need to replace this)
    const testProjectId = 'test-project-id';
    const testUrl = `${apiBaseUrl}/workflows/project/${testProjectId}`;
    console.log('Testing authenticated endpoint:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Authenticated endpoint response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authenticated endpoint is working:', data);
    } else if (response.status === 401) {
      console.log('❌ Authentication failed - token may be invalid');
    } else if (response.status === 404) {
      console.log('⚠️ Project not found (expected for test project ID)');
    } else {
      console.log('❌ Authenticated endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Authenticated endpoint error:', error.message);
  }
}

testAuthenticatedEndpoint();
console.groupEnd();

// Test 5: Check environment
console.group('🔍 Test 5: Environment Check');
console.log('User Agent:', navigator.userAgent);
console.log('Online Status:', navigator.onLine);
console.log('Protocol:', window.location.protocol);
console.log('Hostname:', window.location.hostname);
console.log('Port:', window.location.port);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.groupEnd();

console.log('🧪 Simple Authentication Test Complete!');

// Export test functions for manual testing
window.simpleAuthTest = {
  testToken: () => {
    const token = localStorage.getItem('token');
    console.log('Current token:', token);
    return token;
  },
  testApiUrl: () => {
    const apiBaseUrl = (() => {
      if (window.location.hostname.includes('vercel.app') || 
          window.location.hostname.includes('your-domain.com') ||
          window.location.hostname !== 'localhost') {
        return `${window.location.protocol}//${window.location.host}/api`;
      }
      return 'http://localhost:5000/api';
    })();
    console.log('API Base URL:', apiBaseUrl);
    return apiBaseUrl;
  },
  testConnectivity: async () => {
    const apiBaseUrl = window.simpleAuthTest.testApiUrl();
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      console.log('Connectivity test result:', response.status);
      return response.ok;
    } catch (error) {
      console.log('Connectivity test error:', error.message);
      return false;
    }
  }
};

console.log('💡 Manual testing available via window.simpleAuthTest');
console.log('Example: window.simpleAuthTest.testConnectivity()'); 