const axios = require('axios');

async function testRegistration() {
  try {
    console.log('🧪 Testing registration endpoint...');
    
    // Test with different password patterns to see what fails
    const testCases = [
      {
        name: 'Simple password',
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'password'
        }
      },
      {
        name: 'Password with uppercase',
        data: {
          firstName: 'Test',
          lastName: 'User', 
          email: 'test2@example.com',
          password: 'Password'
        }
      },
      {
        name: 'Password with number',
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test3@example.com', 
          password: 'Password123'
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      try {
        const response = await axios.post('http://localhost:5000/api/auth/register', testCase.data);
        console.log('   ✅ Success:', response.status);
      } catch (error) {
        console.log('   ❌ Failed:', error.response?.status);
        console.log('   Error:', error.response?.data?.message);
        if (error.response?.data?.errors) {
          console.log('   Validation errors:');
          error.response.data.errors.forEach(err => {
            console.log(`     - ${err.field}: ${err.message}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testRegistration(); 