const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create test JWT token
const createTestToken = (userId = 'test-user-123', role = 'employee') => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

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
      console.log(`   Error: ${error.message || error}`);
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
};

// Test Socket.IO connection and authentication
async function testSocketConnection() {
  console.log('\n🔌 Testing Socket.IO Connection...');
  
  return new Promise((resolve, reject) => {
    const token = createTestToken();
    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      logTest('Socket.IO Connection', false, 'Connection timeout');
      reject(new Error('Connection timeout'));
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      logTest('Socket.IO Connection', true);
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Socket.IO Connection', false, error);
      reject(error);
    });
  });
}

// Test joining and leaving project rooms
async function testProjectRooms() {
  console.log('\n🏠 Testing Project Rooms...');
  
  return new Promise((resolve, reject) => {
    const token = createTestToken();
    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      logTest('Project Room Join/Leave', false, 'Test timeout');
      reject(new Error('Test timeout'));
    }, 10000);

    let joinReceived = false;
    let leaveReceived = false;

    socket.on('connect', () => {
      // Test joining project room
      socket.emit('join_project', 'test-project-123');
      
      // Wait a bit then test leaving
      setTimeout(() => {
        socket.emit('leave_project', 'test-project-123');
      }, 1000);
      
      // Complete test after giving time for events
      setTimeout(() => {
        clearTimeout(timeout);
        logTest('Project Room Join/Leave', true);
        socket.disconnect();
        resolve();
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Project Room Join/Leave', false, error);
      reject(error);
    });
  });
}

// Test sendMessage functionality
async function testSendMessage() {
  console.log('\n💬 Testing Send Message...');
  
  return new Promise((resolve, reject) => {
    const token1 = createTestToken('user1');
    const token2 = createTestToken('user2');
    
    const socket1 = io(SERVER_URL, {
      auth: { token: token1 },
      transports: ['websocket', 'polling']
    });
    
    const socket2 = io(SERVER_URL, {
      auth: { token: token2 },
      transports: ['websocket', 'polling']
    });

    const timeout = setTimeout(() => {
      socket1.disconnect();
      socket2.disconnect();
      logTest('Send Message', false, 'Test timeout');
      reject(new Error('Test timeout'));
    }, 15000);

    let connectCount = 0;
    let messageReceived = false;

    const checkComplete = () => {
      if (connectCount === 2 && messageReceived) {
        clearTimeout(timeout);
        logTest('Send Message', true);
        socket1.disconnect();
        socket2.disconnect();
        resolve();
      }
    };

    socket1.on('connect', () => {
      connectCount++;
      socket1.emit('join_project', 'test-project-123');
      
      // Send message after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('sendMessage', {
            projectId: 'test-project-123',
            message: 'Hello from socket1!',
            type: 'test_message'
          });
        }, 500);
      }
    });

    socket2.on('connect', () => {
      connectCount++;
      socket2.emit('join_project', 'test-project-123');
      
      // Send message after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('sendMessage', {
            projectId: 'test-project-123',
            message: 'Hello from socket1!',
            type: 'test_message'
          });
        }, 500);
      }
    });

    socket2.on('newMessage', (data) => {
      if (data.text === 'Hello from socket1!') {
        messageReceived = true;
        checkComplete();
      }
    });

    socket1.on('messageSent', (response) => {
      if (response.success) {
        console.log('   📤 Message sent confirmation received');
      }
    });

    socket1.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Send Message', false, error);
      reject(error);
    });

    socket2.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Send Message', false, error);
      reject(error);
    });
  });
}

// Test notification functionality
async function testNotifications() {
  console.log('\n🔔 Testing Notifications...');
  
  return new Promise((resolve, reject) => {
    const token1 = createTestToken('user1');
    const token2 = createTestToken('user2');
    
    const socket1 = io(SERVER_URL, {
      auth: { token: token1 },
      transports: ['websocket', 'polling']
    });
    
    const socket2 = io(SERVER_URL, {
      auth: { token: token2 },
      transports: ['websocket', 'polling']
    });

    const timeout = setTimeout(() => {
      socket1.disconnect();
      socket2.disconnect();
      logTest('Notifications', false, 'Test timeout');
      reject(new Error('Test timeout'));
    }, 15000);

    let connectCount = 0;
    let notificationReceived = false;

    const checkComplete = () => {
      if (connectCount === 2 && notificationReceived) {
        clearTimeout(timeout);
        logTest('Notifications', true);
        socket1.disconnect();
        socket2.disconnect();
        resolve();
      }
    };

    socket1.on('connect', () => {
      connectCount++;
      
      // Send notification after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('notification', {
            targetUserId: 'user2',
            message: 'Test notification from user1',
            type: 'test_notification',
            priority: 'high'
          });
        }, 500);
      }
    });

    socket2.on('connect', () => {
      connectCount++;
      
      // Send notification after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('notification', {
            targetUserId: 'user2',
            message: 'Test notification from user1',
            type: 'test_notification',
            priority: 'high'
          });
        }, 500);
      }
    });

    socket2.on('newNotification', (data) => {
      if (data.message === 'Test notification from user1') {
        notificationReceived = true;
        checkComplete();
      }
    });

    socket1.on('notificationSent', (response) => {
      if (response.success) {
        console.log('   📤 Notification sent confirmation received');
      }
    });

    socket1.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Notifications', false, error);
      reject(error);
    });

    socket2.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Notifications', false, error);
      reject(error);
    });
  });
}

// Test project update functionality
async function testProjectUpdate() {
  console.log('\n🏗️ Testing Project Updates...');
  
  return new Promise((resolve, reject) => {
    const token1 = createTestToken('user1');
    const token2 = createTestToken('user2');
    
    const socket1 = io(SERVER_URL, {
      auth: { token: token1 },
      transports: ['websocket', 'polling']
    });
    
    const socket2 = io(SERVER_URL, {
      auth: { token: token2 },
      transports: ['websocket', 'polling']
    });

    const timeout = setTimeout(() => {
      socket1.disconnect();
      socket2.disconnect();
      logTest('Project Updates', false, 'Test timeout');
      reject(new Error('Test timeout'));
    }, 15000);

    let connectCount = 0;
    let updateReceived = false;
    let progressReceived = false;

    const checkComplete = () => {
      if (connectCount === 2 && updateReceived && progressReceived) {
        clearTimeout(timeout);
        logTest('Project Updates', true);
        socket1.disconnect();
        socket2.disconnect();
        resolve();
      }
    };

    socket1.on('connect', () => {
      connectCount++;
      socket1.emit('join_project', 'test-project-123');
      
      // Send project update after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('projectUpdate', {
            projectId: 'test-project-123',
            updateType: 'progress',
            progress: 75,
            updateData: {
              message: 'Project progress updated to 75%'
            }
          });
        }, 500);
      }
    });

    socket2.on('connect', () => {
      connectCount++;
      socket2.emit('join_project', 'test-project-123');
      
      // Send project update after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('projectUpdate', {
            projectId: 'test-project-123',
            updateType: 'progress',
            progress: 75,
            updateData: {
              message: 'Project progress updated to 75%'
            }
          });
        }, 500);
      }
    });

    socket2.on('projectUpdated', (data) => {
      if (data.updateType === 'progress' && data.progress === 75) {
        updateReceived = true;
        checkComplete();
      }
    });

    socket2.on('progressUpdated', (data) => {
      if (data.progress === 75) {
        progressReceived = true;
        checkComplete();
      }
    });

    socket1.on('projectUpdateSent', (response) => {
      if (response.success) {
        console.log('   📤 Project update sent confirmation received');
      }
    });

    socket1.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Project Updates', false, error);
      reject(error);
    });

    socket2.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Project Updates', false, error);
      reject(error);
    });
  });
}

// Test typing indicators
async function testTypingIndicators() {
  console.log('\n⌨️ Testing Typing Indicators...');
  
  return new Promise((resolve, reject) => {
    const token1 = createTestToken('user1');
    const token2 = createTestToken('user2');
    
    const socket1 = io(SERVER_URL, {
      auth: { token: token1 },
      transports: ['websocket', 'polling']
    });
    
    const socket2 = io(SERVER_URL, {
      auth: { token: token2 },
      transports: ['websocket', 'polling']
    });

    const timeout = setTimeout(() => {
      socket1.disconnect();
      socket2.disconnect();
      logTest('Typing Indicators', false, 'Test timeout');
      reject(new Error('Test timeout'));
    }, 15000);

    let connectCount = 0;
    let typingStartReceived = false;
    let typingStopReceived = false;

    const checkComplete = () => {
      if (connectCount === 2 && typingStartReceived && typingStopReceived) {
        clearTimeout(timeout);
        logTest('Typing Indicators', true);
        socket1.disconnect();
        socket2.disconnect();
        resolve();
      }
    };

    socket1.on('connect', () => {
      connectCount++;
      socket1.emit('join_project', 'test-project-123');
      
      // Send typing indicators after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('typing_start', { projectId: 'test-project-123' });
          
          setTimeout(() => {
            socket1.emit('typing_stop', { projectId: 'test-project-123' });
          }, 1000);
        }, 500);
      }
    });

    socket2.on('connect', () => {
      connectCount++;
      socket2.emit('join_project', 'test-project-123');
      
      // Send typing indicators after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('typing_start', { projectId: 'test-project-123' });
          
          setTimeout(() => {
            socket1.emit('typing_stop', { projectId: 'test-project-123' });
          }, 1000);
        }, 500);
      }
    });

    socket2.on('userTyping', (data) => {
      if (data.userId === 'user1') {
        if (data.isTyping) {
          typingStartReceived = true;
        } else {
          typingStopReceived = true;
        }
        checkComplete();
      }
    });

    socket1.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Typing Indicators', false, error);
      reject(error);
    });

    socket2.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('Typing Indicators', false, error);
      reject(error);
    });
  });
}

// Test user status updates
async function testUserStatusUpdates() {
  console.log('\n👤 Testing User Status Updates...');
  
  return new Promise((resolve, reject) => {
    const token1 = createTestToken('user1');
    const token2 = createTestToken('user2');
    
    const socket1 = io(SERVER_URL, {
      auth: { token: token1 },
      transports: ['websocket', 'polling']
    });
    
    const socket2 = io(SERVER_URL, {
      auth: { token: token2 },
      transports: ['websocket', 'polling']
    });

    const timeout = setTimeout(() => {
      socket1.disconnect();
      socket2.disconnect();
      logTest('User Status Updates', false, 'Test timeout');
      reject(new Error('Test timeout'));
    }, 15000);

    let connectCount = 0;
    let statusReceived = false;

    const checkComplete = () => {
      if (connectCount === 2 && statusReceived) {
        clearTimeout(timeout);
        logTest('User Status Updates', true);
        socket1.disconnect();
        socket2.disconnect();
        resolve();
      }
    };

    socket1.on('connect', () => {
      connectCount++;
      socket1.emit('join_project', 'test-project-123');
      
      // Send status update after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('user_status_update', {
            status: 'busy',
            projectId: 'test-project-123'
          });
        }, 500);
      }
    });

    socket2.on('connect', () => {
      connectCount++;
      socket2.emit('join_project', 'test-project-123');
      
      // Send status update after both connected
      if (connectCount === 2) {
        setTimeout(() => {
          socket1.emit('user_status_update', {
            status: 'busy',
            projectId: 'test-project-123'
          });
        }, 500);
      }
    });

    socket2.on('userStatusChanged', (data) => {
      if (data.userId === 'user1' && data.status === 'busy') {
        statusReceived = true;
        checkComplete();
      }
    });

    socket1.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('User Status Updates', false, error);
      reject(error);
    });

    socket2.on('connect_error', (error) => {
      clearTimeout(timeout);
      logTest('User Status Updates', false, error);
      reject(error);
    });
  });
}

// Main test runner
async function runSocketTests() {
  console.log('🧪 Starting Socket.IO Real-time Feature Tests...');
  console.log(`📡 Testing Socket.IO at: ${SERVER_URL}`);
  
  try {
    // Run all tests
    await testSocketConnection();
    await testProjectRooms();
    await testSendMessage();
    await testNotifications();
    await testProjectUpdate();
    await testTypingIndicators();
    await testUserStatusUpdates();
    
    // Print summary
    console.log('\n📊 Socket.IO Test Summary:');
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
    
    console.log('\n🎉 Socket.IO Testing Complete!');
    
  } catch (error) {
    console.error('❌ Socket.IO test runner failed:', error.message);
  }
  
  // Exit process
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runSocketTests();
}

module.exports = { runSocketTests }; 