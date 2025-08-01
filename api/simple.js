// Ultra-simple API for debugging
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Simple test with no database
app.get('/api/simple-test', (req, res) => {
  res.json({
    status: 'working',
    timestamp: new Date().toISOString(),
    message: 'API is responding'
  });
});

// Test with mock data
app.get('/api/simple-projects', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        projectNumber: 20001,
        projectName: 'Test Project 1',
        customer: { primaryName: 'John Smith' },
        status: 'IN_PROGRESS',
        progress: 50
      },
      {
        id: '2', 
        projectNumber: 20002,
        projectName: 'Test Project 2',
        customer: { primaryName: 'Jane Doe' },
        status: 'IN_PROGRESS',
        progress: 75
      }
    ]
  });
});

module.exports = app;