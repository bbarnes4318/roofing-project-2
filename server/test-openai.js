const openAIService = require('./services/OpenAIService');

console.log('🔍 Testing OpenAI Service...');
console.log('isAvailable():', openAIService.isAvailable());
console.log('getStatus():', openAIService.getStatus());

// Test actual API call
async function testAPICall() {
  try {
    console.log('🔍 Testing API call...');
    const response = await openAIService.generateResponse('Say "ready" if you can respond.', {});
    console.log('✅ API Response:', response);
  } catch (error) {
    console.error('❌ API Error:', error);
  }
}

testAPICall();