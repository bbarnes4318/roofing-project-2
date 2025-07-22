// API Debugging Utilities
// This file provides utilities for debugging API calls and environment configuration

/**
 * Get the current API base URL based on environment
 */
export const getApiBaseUrl = () => {
  // Check if we're in production (Vercel)
  if (window.location.hostname.includes('vercel.app') || 
      window.location.hostname.includes('your-domain.com') ||
      window.location.hostname !== 'localhost') {
    // Use the current domain for production
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  // Local development
  return 'http://localhost:5000/api';
};

/**
 * Enhanced environment detection with fallback
 */
export const getApiBaseUrlWithFallback = () => {
  const primaryUrl = getApiBaseUrl();
  
  // If we're in development and the primary URL is localhost, try to detect if server is running
  if (primaryUrl.includes('localhost')) {
    // For now, just return the primary URL
    // In the future, we could add a health check here
    return primaryUrl;
  }
  
  return primaryUrl;
};

/**
 * Log detailed API request information for debugging
 */
export const logApiRequest = (url, method, headers, body) => {
  console.group('🌐 API Request Debug');
  console.log('URL:', url);
  console.log('Method:', method);
  console.log('Headers:', headers);
  console.log('Body:', body);
  console.log('Environment:', {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    port: window.location.port,
    userAgent: navigator.userAgent
  });
  console.groupEnd();
};

/**
 * Log detailed API response information for debugging
 */
export const logApiResponse = (response, data) => {
  console.group('🌐 API Response Debug');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  console.log('Data:', data);
  console.groupEnd();
};

/**
 * Check if the API environment is properly configured
 */
export const checkApiEnvironment = () => {
  const issues = [];
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    issues.push('Not in browser environment');
  }
  
  // Check if fetch is available
  if (typeof fetch === 'undefined') {
    issues.push('Fetch API not available');
  }
  
  // Check if localStorage is available
  if (typeof localStorage === 'undefined') {
    issues.push('localStorage not available');
  }
  
  // Check authentication token - try both 'token' and 'authToken' keys
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') {
    issues.push('No authentication token found');
  } else {
    // Check if token is valid (not expired, proper format, etc.)
    try {
      // Basic token validation - check if it's a valid JWT format
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        // For demo tokens, just check if they're not empty
        if (token.length < 10) {
          issues.push('Invalid token format');
        }
      } else {
        // Try to decode the payload to check expiration
        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
          issues.push('Token has expired');
        }
      }
    } catch (error) {
      // For demo tokens, don't fail validation
      if (!token.includes('demo-')) {
        issues.push('Token validation failed');
      }
    }
  }
  
  // Check API base URL
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    issues.push('API base URL not configured');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    apiBaseUrl,
    hasToken: !!token
  };
};

/**
 * Test API connectivity with retry mechanism
 */
export const testApiConnectivity = async (retries = 3) => {
  const apiBaseUrl = getApiBaseUrl();
  const healthUrl = `${apiBaseUrl}/health`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🌐 Testing API connectivity (attempt ${attempt}/${retries})`);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // Add timeout for fetch
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

/**
 * Create a standardized error message based on response status
 */
export const getErrorMessage = (status, defaultMessage = 'An error occurred') => {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication failed. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'Resource not found. Please refresh the page and try again.';
    case 409:
      return 'Conflict detected. The resource may have been modified by another user.';
    case 422:
      return 'Validation failed. Please check your input and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Bad gateway. Please try again later.';
    case 503:
      return 'Service unavailable. Please try again later.';
    case 504:
      return 'Gateway timeout. Please try again later.';
    default:
      return defaultMessage;
  }
};

/**
 * Enhanced fetch wrapper with debugging and retry
 */
export const debugFetch = async (url, options = {}, retries = 2) => {
  const apiBaseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Log request for debugging
      logApiRequest(fullUrl, options.method || 'GET', options.headers, options.body);
      
      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => null);
      
      // Log response for debugging
      logApiResponse(response, data);
      
      return { response, data };
    } catch (error) {
      console.error(`🌐 API Request Failed (attempt ${attempt}/${retries}):`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

/**
 * Validate API response and provide detailed error information
 */
export const validateApiResponse = (response, data) => {
  const issues = [];
  
  if (!response.ok) {
    issues.push(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (data && data.success === false) {
    issues.push(`API Error: ${data.message || 'Unknown error'}`);
  }
  
  if (data && data.errors) {
    issues.push(`Validation Errors: ${JSON.stringify(data.errors)}`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    status: response.status,
    data
  };
};

/**
 * Get a valid authentication token with proper error handling
 */
export const getValidToken = () => {
  // Try both token keys for compatibility
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  
  if (!token || token === 'null' || token === 'undefined') {
    console.error('❌ AUTH: No token found in localStorage');
    return null;
  }
  
  // For demo tokens, just return them
  if (token.includes('demo-')) {
    console.log('✅ AUTH: Demo token found');
    return token;
  }
  
  // For JWT tokens, do basic validation
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ AUTH: Invalid token format');
      return null;
    }
    
    // Try to decode the payload
    const payload = JSON.parse(atob(tokenParts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < currentTime) {
      console.error('❌ AUTH: Token has expired');
      return null;
    }
    
    console.log('✅ AUTH: Valid JWT token found');
    return token;
  } catch (error) {
    console.error('❌ AUTH: Token validation failed:', error);
    return null;
  }
};

/**
 * Redirect to login page with reason
 */
export const redirectToLogin = (reason = 'Authentication required') => {
  console.log(`🔀 AUTH: Redirecting to login: ${reason}`);
  // Since login is disabled, just reload the page
  window.location.reload();
};

/**
 * Enhanced API request function with proper authentication, error handling, and retry
 */
export const makeApiRequest = async (url, options = {}, retries = 2) => {
  const apiBaseUrl = getApiBaseUrlWithFallback();
  const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
  
  // Get authentication token
  const token = getValidToken();
  if (!token) {
    // Create a demo token if none exists
    const demoToken = 'demo-sarah-owner-token-' + Date.now();
    localStorage.setItem('authToken', demoToken);
    console.log('✅ AUTH: Created demo token for API request');
  }
  
  const effectiveToken = token || localStorage.getItem('authToken');
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${effectiveToken}`,
    ...options.headers
  };
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Log request for debugging
      logApiRequest(fullUrl, options.method || 'GET', headers, options.body);
      
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
      
      // Log response for debugging
      logApiResponse(response, data);
      
      // Validate response
      const validation = validateApiResponse(response, data);
      if (!validation.isValid) {
        console.error('❌ API: Response validation failed:', validation.issues);
      }
      
      if (!response.ok) {
        const errorMessage = getErrorMessage(response.status, 'API request failed');
        throw new Error(errorMessage);
      }
      
      console.log('✅ API: Request successful');
      return { response, data };
    } catch (error) {
      console.error(`❌ API: Request failed (attempt ${attempt}/${retries}):`, error);
      
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

/**
 * Network error detection and handling
 */
export const isNetworkError = (error) => {
  return error.name === 'TypeError' && 
         (error.message.includes('fetch') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('ERR_CONNECTION_REFUSED'));
};

/**
 * Get user-friendly error message based on error type
 */
export const getUserFriendlyErrorMessage = (error) => {
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