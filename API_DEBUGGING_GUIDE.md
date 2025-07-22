# API Debugging Guide

This guide provides comprehensive instructions for debugging API issues in the project workflow system.

## Quick Start

### 1. Run the API Connectivity Test
Open your browser console and run:
```javascript
// Copy and paste the contents of test-api-connectivity.js
```

### 2. Check Environment Configuration
```javascript
// Test environment setup
window.apiTest.runEnvironmentCheck()
```

### 3. Test API Connectivity
```javascript
// Test basic connectivity
window.apiTest.runConnectivityTest()
```

## Common Issues and Solutions

### Issue 1: 404 Not Found Error

**Symptoms:**
- API calls return 404 status
- Workflow steps cannot be updated
- Console shows "Workflow or step not found"

**Debugging Steps:**
1. Check if the project ID is correct
2. Verify the API endpoint URL
3. Ensure the workflow exists for the project

**Solutions:**
```javascript
// Test with a specific project ID
window.apiTest.testWorkflowEndpoint("your-actual-project-id", "test-step-id")
```

### Issue 2: Authentication Errors

**Symptoms:**
- 401 Unauthorized errors
- "Authentication failed" messages
- Token-related errors

**Debugging Steps:**
1. Check if user is logged in
2. Verify token exists in localStorage
3. Test token validity

**Solutions:**
```javascript
// Check authentication status
console.log('Token exists:', !!localStorage.getItem('token'))
console.log('Token preview:', localStorage.getItem('token')?.substring(0, 20))
```

### Issue 3: Network/Connection Issues

**Symptoms:**
- "Failed to fetch" errors
- Network timeout errors
- CORS errors

**Debugging Steps:**
1. Check internet connection
2. Verify API server is running
3. Test with different environments

**Solutions:**
```javascript
// Test API connectivity
window.apiTest.runConnectivityTest()

// Check network status
console.log('Online:', navigator.onLine)
console.log('Protocol:', window.location.protocol)
```

### Issue 4: Environment Configuration Issues

**Symptoms:**
- Wrong API base URL
- Development vs production confusion
- Missing environment variables

**Debugging Steps:**
1. Check current environment
2. Verify API base URL
3. Test environment detection

**Solutions:**
```javascript
// Check current environment
console.log('Hostname:', window.location.hostname)
console.log('API Base URL:', window.apiTest.getApiBaseUrl())
```

## Detailed Debugging Process

### Step 1: Environment Analysis
```javascript
// Run comprehensive environment check
const envCheck = window.apiTest.runEnvironmentCheck()
console.log('Environment Issues:', envCheck.issues)
```

### Step 2: API Connectivity Test
```javascript
// Test basic API connectivity
const connectivityTest = await window.apiTest.runConnectivityTest()
console.log('Connectivity Result:', connectivityTest)
```

### Step 3: Authentication Verification
```javascript
// Check authentication status
const token = localStorage.getItem('token')
if (token) {
  console.log('✅ Token found, length:', token.length)
} else {
  console.log('❌ No token found')
}
```

### Step 4: Specific Endpoint Testing
```javascript
// Test workflow endpoint with actual project ID
const result = await window.apiTest.testWorkflowEndpoint("your-project-id", "your-step-id")
console.log('Endpoint Test Result:', result)
```

## Production vs Development Debugging

### Development Environment
- API Base URL: `http://localhost:5000/api`
- Backend server should be running on port 5000
- Check if server is started with `npm start` in server directory

### Production Environment
- API Base URL: `https://your-production-domain.vercel.app/api`
- Verify Vercel deployment is active
- Check environment variables in Vercel dashboard

## Using the Debugging Tools

### 1. API Debugger Utilities
The `src/utils/apiDebugger.js` file provides utilities for:
- Environment checking
- API request/response logging
- Error message standardization
- Response validation

### 2. Enhanced Error Handling
The updated `ProjectChecklistPage.jsx` includes:
- Comprehensive error messages
- Automatic rollback on failures
- User-friendly error display
- Success feedback

### 3. Automatic Completion Detection
The system now automatically:
- Detects when sections are completed
- Detects when phases are completed
- Shows success messages
- Updates visual indicators

## Troubleshooting Checklist

### Before Testing
- [ ] Backend server is running (port 5000)
- [ ] User is logged in
- [ ] Authentication token exists
- [ ] Project is selected
- [ ] Internet connection is stable

### During Testing
- [ ] Check browser console for errors
- [ ] Monitor network tab in DevTools
- [ ] Verify API requests are being made
- [ ] Check response status codes
- [ ] Validate response data format

### After Testing
- [ ] Verify UI updates correctly
- [ ] Check database for changes
- [ ] Test both completion and uncompletion
- [ ] Verify automatic section/phase completion
- [ ] Test error scenarios

## Error Message Reference

### Common Error Messages and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Authentication failed" | Invalid or missing token | Log in again |
| "Workflow not found" | Invalid project ID or missing workflow | Refresh page, check project |
| "Network error" | Connection issues | Check internet, restart server |
| "Server error" | Backend issues | Check server logs, restart |
| "Invalid request" | Malformed data | Check input parameters |

### HTTP Status Code Reference

| Status Code | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Continue normal operation |
| 400 | Bad Request | Check input parameters |
| 401 | Unauthorized | Re-authenticate user |
| 403 | Forbidden | Check user permissions |
| 404 | Not Found | Verify resource exists |
| 500 | Server Error | Check server logs |

## Advanced Debugging

### 1. Network Tab Analysis
1. Open browser DevTools
2. Go to Network tab
3. Perform the action that's failing
4. Look for failed requests
5. Check request/response details

### 2. Console Logging
The system provides detailed console logging:
- `🔄 CHECKBOX:` - Checkbox interactions
- `🌐 CHECKBOX:` - API calls
- `✅ CHECKBOX:` - Successful operations
- `❌ CHECKBOX:` - Failed operations
- `🎯 COMPLETION:` - Automatic completion detection

### 3. Database Verification
Check if changes are persisted:
```javascript
// After completing a step, verify in database
// This requires backend access or API call to check workflow state
```

## Getting Help

If you're still experiencing issues:

1. **Collect Debug Information:**
   ```javascript
   // Run comprehensive test
   console.log('=== DEBUG INFO ===')
   console.log('Environment:', window.apiTest.runEnvironmentCheck())
   console.log('Connectivity:', await window.apiTest.runConnectivityTest())
   console.log('Token:', !!localStorage.getItem('token'))
   console.log('Current URL:', window.location.href)
   ```

2. **Check Server Logs:**
   - Look for errors in backend console
   - Check for database connection issues
   - Verify API routes are properly configured

3. **Test with Different Data:**
   - Try with a different project
   - Test with different step IDs
   - Verify workflow structure

4. **Environment-Specific Testing:**
   - Test in both development and production
   - Check environment variables
   - Verify API base URLs

## Prevention Tips

1. **Always validate inputs** before making API calls
2. **Use optimistic updates** for better UX
3. **Provide clear error messages** to users
4. **Log detailed information** for debugging
5. **Test in multiple environments** before deployment
6. **Monitor API performance** and error rates
7. **Implement proper error boundaries** in React components

This debugging guide should help you identify and resolve most API-related issues in the project workflow system. 