const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { prisma } = require('../config/prisma');

// Initialize Supabase client for server-side token validation
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Only create Supabase client if config provided; otherwise skip gracefully
const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Authenticate JWT token (supports both old JWT and Supabase tokens)
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Demo token bypass for development
    if (token.startsWith('demo-david-chen-token-')) {
      req.user = {
        id: 'demo-david-chen-id',
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@demo.com',
        role: 'MANAGER',
        permissions: [],
        isActive: true,
        theme: 'light'
      };
      return next();
    }
    
    if (token.startsWith('demo-sarah-owner-token-')) {
      req.user = {
        id: 'demo-sarah-owner-id',
        firstName: 'Sarah',
        lastName: 'Owner',
        email: 'sarah.owner@demo.com',
        role: 'ADMIN',
        permissions: [],
        isActive: true,
        theme: 'light'
      };
      return next();
    }

    // Demo token bypass for development/testing
    if (token.startsWith('demo-token-') || token.startsWith('temp-token-') || token.startsWith('demo-david-chen-token-')) {
      // Extract a consistent user ID from the token itself to avoid creating new IDs each request
      const tokenParts = token.split('-');
      const tokenId = tokenParts[tokenParts.length - 1]; // Use the last part as stable identifier
      req.user = {
        id: `demo-user-${tokenId}`,
        firstName: 'Demo',
        lastName: 'User',
        email: `demo-${tokenId}@roofingapp.com`,
        role: 'ADMIN',
        permissions: [],
        isActive: true,
        theme: 'LIGHT'
      };
      return next();
    }

    let user = null;
    let isSupabaseToken = false;

    // First, try to validate as Supabase token (if configured)
    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      // Wrap Supabase call with timeout to handle network issues
      const supabasePromise = supabase.auth.getUser(token);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout')), 5000)
      );
      
      const { data: supabaseUser, error } = await Promise.race([supabasePromise, timeoutPromise]);
      
      if (supabaseUser?.user && !error) {
        isSupabaseToken = true;
        // Find or create user in our database based on Supabase user
        const email = supabaseUser.user.email;
        const firstName = supabaseUser.user.user_metadata?.firstName || supabaseUser.user.email?.split('@')[0] || 'User';
        const lastName = supabaseUser.user.user_metadata?.lastName || '';
        
        // Try to find existing user by email
        user = await prisma.user.findUnique({
          where: { email: email },
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

        // If user doesn't exist, create them
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: email,
              firstName: firstName,
              lastName: lastName,
              password: 'SUPABASE_MANAGED', // Placeholder since Supabase handles authentication
              role: supabaseUser.user.user_metadata?.role || 'WORKER',
              isActive: true,
              theme: 'LIGHT',
              lastLogin: new Date()
            },
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
        } else {
          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });
        }
      }
    } catch (supabaseError) {
      // If Supabase token validation fails (network error, timeout, invalid token, etc.)
      // Fall through to try old JWT validation - DO NOT throw or return 500
      console.log('Supabase validation failed, falling back to JWT:', supabaseError.message || 'Unknown error');
    }

    // If not a Supabase token, try old JWT validation
    if (!isSupabaseToken) {
      const secret = process.env.JWT_SECRET || 'dev-insecure-jwt-secret-change-me';
      const decoded = jwt.verify(token, secret);
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token structure.'
        });
      }

      // Get user from database using old method
      user = await prisma.user.findUnique({
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
    }
    
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

// Role-based authorization middleware (case-insensitive)
const authorize = (...roles) => {
  const allowedRolesLower = roles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated.'
      });
    }

    const userRoleLower = String(req.user.role || '').toLowerCase();
    if (!allowedRolesLower.includes(userRoleLower)) {
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
      const secret = process.env.JWT_SECRET || 'dev-insecure-jwt-secret-change-me';
      const decoded = jwt.verify(token, secret);
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
  // Provide a safe dev fallback to avoid startup crashes during local testing
  const secret = process.env.JWT_SECRET || 'dev-insecure-jwt-secret-change-me';
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ Using DEV JWT secret fallback. Set JWT_SECRET in environment for production.');
  }
  return jwt.sign(
    { 
      id: userId,
      role: role,
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
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
    const secret = process.env.JWT_SECRET || 'dev-insecure-jwt-secret-change-me';
    return jwt.verify(token, secret);
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