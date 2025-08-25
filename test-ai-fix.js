const axios = require('axios');

// Test the AI assistant with the fixes
async function testAI() {
  try {
    console.log('🧪 Testing AI Assistant...');
    
    // First, let's test a general question
    const response1 = await axios.post('http://localhost:5000/api/bubbles/chat', {
      message: 'what is the next line item'
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response 1:', response1.data);
    
    // Test with project context
    const response2 = await axios.post('http://localhost:5000/api/bubbles/chat', {
      message: 'what is the next line item',
      projectId: 'some-project-id'
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response 2:', response2.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAI();
