const axios = require('axios');

// Test small bulk update
const testUpdates = [
  {
    id: "cmecewh6f00085mbiz57u1qmy", 
    itemName: "Validate & Confirm Email"
  },
  {
    id: "cmecewh7k000a5mbiclw6j9u1",
    itemName: "Validate Property Address"
  }
];

async function testBulkUpdate() {
  try {
    console.log('Testing bulk update with 2 items...');
    console.log('Updates:', JSON.stringify(testUpdates, null, 2));
    
    const response = await axios.put('http://127.0.0.1:5000/api/workflows/line-items/bulk', {
      updates: testUpdates
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testBulkUpdate();