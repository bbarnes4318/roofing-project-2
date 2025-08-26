'use strict';

// Minimal script to verify OPENAI_API_KEY by calling OpenAI /v1/models
const https = require('https');

let dotenvLoaded = false;
try {
  // Load server/.env if present
  require('dotenv').config();
  dotenvLoaded = true;
} catch (e) {
  // dotenv not installed or no .env file; it's fine if the key is in the env
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    `OPENAI_API_KEY is not set. Ensure it's in server/.env or your environment. dotenvLoaded=${dotenvLoaded}`
  );
  process.exit(1);
}

const options = {
  hostname: 'api.openai.com',
  path: '/v1/models',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 15000
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => {
    body += chunk;
  });
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log(`OK: OpenAI key is valid. HTTP ${res.statusCode}`);
      process.exit(0);
    }
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed?.error?.message || message;
    } catch (e) {
      // leave raw body
    }
    console.error(`FAIL: HTTP ${res.statusCode} - ${message}`);
    process.exit(2);
  });
});

req.on('error', err => {
  console.error(`Network error: ${err.message}`);
  process.exit(3);
});

req.on('timeout', () => {
  req.destroy();
  console.error('Request timed out');
  process.exit(4);
});

req.end();






