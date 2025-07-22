const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8000', 
    'https://stever-five.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Mock user data
const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'admin@kenstruction.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LRCRRfPNHpq6j.j/q', // hashed 'admin123'
  firstName: 'Ken',
  lastName: 'Admin',
  role: 'admin'
};

// Mock projects data
const mockProjects = [
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Downtown Office Building',
    type: 'Commercial',
    status: 'execution',
    estimateValue: 850000,
    progress: 45,
    startDate: '2024-01-15',
    endDate: '2024-06-30',
    client: {
      name: 'ABC Corporation',
      phone: '555-0123',
      email: 'contact@abc-corp.com'
    },
    location: '123 Main St, Downtown',
    priority: 'High',
    projectManager: 'Ken Admin',
    accountManager: 'Ken Admin'
  }
];

// ============== AUTH ROUTES ==============

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    // Check mock user
    if (email !== mockUser.email) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // For testing, accept 'admin123' as password
    if (password !== 'admin123') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: mockUser._id, role: mockUser.role }, 
      'KenStruction2024SecretKey', 
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        user: {
          _id: mockUser._id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role
        },
        token
      },
      message: 'Login successful (mock data)'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Get current user
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, 'KenStruction2024SecretKey');

    res.json({
      success: true,
      data: {
        user: {
          _id: mockUser._id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role
        }
      },
      message: 'User retrieved (mock data)'
    });

  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Projects
app.get('/api/projects', async (req, res) => {
  try {
    res.json({
      success: true,
      data: mockProjects,
      message: 'Projects retrieved (mock data)'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'KenStruction Test API is running (no MongoDB)',
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app; 