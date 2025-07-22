const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test configuration
const testConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

let authToken = '';
let testUserId = '';
let testProjectId = '';
let testCustomerId = '';
let testTaskId = '';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Helper function to log test results
const logTest = (testName, success, error = null) => {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (error) {
      console.log(`   Error: ${error.message}`);
      testResults.errors.push({ test: testName, error: error.message });
    }
  }
};

// Test Auth Routes
async function testAuthRoutes() {
  console.log('\n🔐 Testing Auth Routes...');
  
  try {
    // Test user registration
    const registerData = {
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      password: 'Test123456!',
      role: 'employee'
    };
    
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    logTest('POST /auth/register', registerResponse.status === 201);
    
    // Test user login
    const loginData = {
      email: registerData.email,
      password: registerData.password
    };
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    logTest('POST /auth/login', loginResponse.status === 200);
    
    if (loginResponse.data.token) {
      authToken = loginResponse.data.token;
      testUserId = loginResponse.data.user.id;
      testConfig.headers.Authorization = `Bearer ${authToken}`;
    }
    
    // Test get current user
    const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, testConfig);
    logTest('GET /auth/me', meResponse.status === 200);
    
  } catch (error) {
    logTest('Auth Routes', false, error);
  }
}

// Test Customer Routes
async function testCustomerRoutes() {
  console.log('\n👥 Testing Customer Routes...');
  
  try {
    // Create test customer
    const customerData = {
      name: 'Test Customer',
      email: `customer${Date.now()}@example.com`,
      phone: '+1234567890',
      address: '123 Test Street, Test City, TC 12345'
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/customers`, customerData, testConfig);
    logTest('POST /customers', createResponse.status === 201);
    
    if (createResponse.data.data.customer) {
      testCustomerId = createResponse.data.data.customer._id;
    }
    
    // Get all customers
    const getAllResponse = await axios.get(`${API_BASE_URL}/customers`, testConfig);
    logTest('GET /customers', getAllResponse.status === 200);
    
    // Get customer by ID
    if (testCustomerId) {
      const getByIdResponse = await axios.get(`${API_BASE_URL}/customers/${testCustomerId}`, testConfig);
      logTest('GET /customers/:id', getByIdResponse.status === 200);
    }
    
    // Search customers
    const searchResponse = await axios.get(`${API_BASE_URL}/customers/search/query?q=Test`, testConfig);
    logTest('GET /customers/search/query', searchResponse.status === 200);
    
  } catch (error) {
    logTest('Customer Routes', false, error);
  }
}

// Test Project Routes
async function testProjectRoutes() {
  console.log('\n🏗️ Testing Project Routes...');
  
  try {
    // Create test project
    const projectData = {
      projectName: 'Test Project',
      projectType: 'residential',
      status: 'active',
      address: '456 Project Ave, Project City, PC 67890',
      customer: testCustomerId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      budget: 50000,
      progress: 0
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/projects`, projectData, testConfig);
    logTest('POST /projects', createResponse.status === 201);
    
    if (createResponse.data.data.project) {
      testProjectId = createResponse.data.data.project._id;
    }
    
    // Get all projects
    const getAllResponse = await axios.get(`${API_BASE_URL}/projects`, testConfig);
    logTest('GET /projects', getAllResponse.status === 200);
    
    // Get project by ID with populated fields
    if (testProjectId) {
      const getByIdResponse = await axios.get(`${API_BASE_URL}/projects/${testProjectId}`, testConfig);
      logTest('GET /projects/:id (with populated fields)', getByIdResponse.status === 200);
    }
    
    // Search projects
    const searchResponse = await axios.get(`${API_BASE_URL}/projects/search/query?q=Test`, testConfig);
    logTest('GET /projects/search/query', searchResponse.status === 200);
    
  } catch (error) {
    logTest('Project Routes', false, error);
  }
}

// Test Task Routes
async function testTaskRoutes() {
  console.log('\n📋 Testing Task Routes...');
  
  try {
    // Create test task
    const taskData = {
      title: 'Test Task',
      description: 'This is a test task',
      project: testProjectId,
      priority: 'Medium',
      status: 'pending',
      assignedTo: testUserId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedHours: 8
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/tasks`, taskData, testConfig);
    logTest('POST /tasks', createResponse.status === 201);
    
    if (createResponse.data.data.task) {
      testTaskId = createResponse.data.data.task._id;
    }
    
    // Get all tasks
    const getAllResponse = await axios.get(`${API_BASE_URL}/tasks`, testConfig);
    logTest('GET /tasks', getAllResponse.status === 200);
    
    // Get tasks by project (test filtering)
    if (testProjectId) {
      const projectTasksResponse = await axios.get(`${API_BASE_URL}/tasks?project=${testProjectId}`, testConfig);
      logTest('GET /tasks?project=:projectId', projectTasksResponse.status === 200);
    }
    
    // Update task status (should auto-update project progress)
    if (testTaskId) {
      const statusUpdateResponse = await axios.patch(`${API_BASE_URL}/tasks/${testTaskId}/status`, {
        status: 'completed'
      }, testConfig);
      logTest('PATCH /tasks/:id/status (auto-update project progress)', statusUpdateResponse.status === 200);
    }
    
    // Search tasks
    const searchResponse = await axios.get(`${API_BASE_URL}/tasks/search/query?q=Test`, testConfig);
    logTest('GET /tasks/search/query', searchResponse.status === 200);
    
  } catch (error) {
    logTest('Task Routes', false, error);
  }
}

// Test Document Routes
async function testDocumentRoutes() {
  console.log('\n📁 Testing Document Routes...');
  
  try {
    // Get documents (should work even with empty results)
    const getAllResponse = await axios.get(`${API_BASE_URL}/documents`, testConfig);
    logTest('GET /documents', getAllResponse.status === 200);
    
    // Get documents by project
    if (testProjectId) {
      const projectDocsResponse = await axios.get(`${API_BASE_URL}/documents/project/${testProjectId}`, testConfig);
      logTest('GET /documents/project/:projectId', projectDocsResponse.status === 200);
    }
    
    // Note: File upload testing would require multipart/form-data, skipping for now
    
  } catch (error) {
    logTest('Document Routes', false, error);
  }
}

// Test Notification Routes
async function testNotificationRoutes() {
  console.log('\n🔔 Testing Notification Routes...');
  
  try {
    // Get all notifications for user
    const getAllResponse = await axios.get(`${API_BASE_URL}/notifications`, testConfig);
    logTest('GET /notifications', getAllResponse.status === 200);
    
    // Get unread count
    const unreadCountResponse = await axios.get(`${API_BASE_URL}/notifications/unread/count`, testConfig);
    logTest('GET /notifications/unread/count', unreadCountResponse.status === 200);
    
    // Mark all as read
    const markAllReadResponse = await axios.post(`${API_BASE_URL}/notifications/read-all`, {}, testConfig);
    logTest('POST /notifications/read-all', markAllReadResponse.status === 200);
    
  } catch (error) {
    logTest('Notification Routes', false, error);
  }
}

// Test AI Routes
async function testAIRoutes() {
  console.log('\n🤖 Testing AI Routes...');
  
  try {
    // Test AI chat
    const chatResponse = await axios.post(`${API_BASE_URL}/ai/chat`, {
      message: 'Hello, what can you help me with?'
    }, testConfig);
    logTest('POST /ai/chat', chatResponse.status === 200);
    
    // Test AI capabilities
    const capabilitiesResponse = await axios.get(`${API_BASE_URL}/ai/capabilities`, testConfig);
    logTest('GET /ai/capabilities', capabilitiesResponse.status === 200);
    
  } catch (error) {
    logTest('AI Routes', false, error);
  }
}

// Test Health Routes
async function testHealthRoutes() {
  console.log('\n🏥 Testing Health Routes...');
  
  try {
    // Test health check (no auth required)
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    logTest('GET /health', healthResponse.status === 200);
    
    // Test detailed health check
    const detailedHealthResponse = await axios.get(`${API_BASE_URL}/health/detailed`, testConfig);
    logTest('GET /health/detailed', detailedHealthResponse.status === 200);
    
  } catch (error) {
    logTest('Health Routes', false, error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Kenstruction API Tests...');
  console.log(`📡 Testing API at: ${API_BASE_URL}`);
  
  try {
    // Test routes in order (auth first to get token)
    await testAuthRoutes();
    await testHealthRoutes();
    await testCustomerRoutes();
    await testProjectRoutes();
    await testTaskRoutes();
    await testDocumentRoutes();
    await testNotificationRoutes();
    await testAIRoutes();
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total: ${testResults.total}`);
    console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n🚨 Errors:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 API Testing Complete!');
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests }; 