const jwt = require('jsonwebtoken');
const { prisma } = require('../config/prisma');

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  console.log('Auth Debug - Function called');
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth Debug - authHeader:', authHeader);
    console.log('Auth Debug - token:', token);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Check if it's a demo token first
    if (token.startsWith('demo-sarah-owner-token-')) {
      console.log('Auth Debug - Processing demo token');
      // Find Sarah Owner in the database or create a mock user
      let sarahOwner = await prisma.user.findFirst({ 
        where: { firstName: 'Sarah', lastName: 'Owner' } 
      });
      
      if (!sarahOwner) {
        console.log('Auth Debug - Creating mock user');
        // Create mock user object for demo purposes
        sarahOwner = {
          id: 'demo-sarah-owner-id',
          firstName: 'Sarah',
          lastName: 'Owner',
          email: 'sarah@example.com',
          role: 'admin',
          isActive: true,
          company: 'Kenstruction',
          position: 'Owner',
          department: 'Management',
          isVerified: true
        };
      }
      
      console.log('Auth Debug - Setting req.user:', sarahOwner);
      req.user = sarahOwner;
      return next();
    }

    // Verify JWT token
    console.log('Auth Debug - About to verify JWT token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth Debug - JWT decoded:', decoded);
    
    // Get user from database
    console.log('Auth Debug - About to query database for user');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        theme: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });
    console.log('Auth Debug - Database user result:', user);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user not found.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = authorize('admin');

// Manager and above middleware
const managerAndAbove = authorize('admin', 'manager');

// Project manager and above middleware
const projectManagerAndAbove = authorize('admin', 'manager', 'project_manager');

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          theme: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Generate JWT token
const generateToken = (userId, role = 'user') => {
  return jwt.sign(
    { 
      id: userId,
      role: role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '30d',
      issuer: 'kenstruction-api',
      audience: 'kenstruction-client'
    }
  );
};

// Verify token without middleware (for Socket.IO, etc.)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Check if user owns resource or has admin privileges
const checkOwnership = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated.'
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.body[resourceUserField] || req.params[resourceUserField];
    
    if (resourceUserId && resourceUserId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    } else {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }

    userRequests.push(now);
    next();
  };
};

module.exports = {
  authenticateToken,
  authorize,
  adminOnly,
  managerAndAbove,
  projectManagerAndAbove,
  optionalAuth,
  generateToken,
  verifyToken,
  checkOwnership,
  userRateLimit
}; 