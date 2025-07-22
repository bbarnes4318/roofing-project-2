const express = require('express');
const { checkDBHealth } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Basic health check
// @route   GET /api/health
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const dbHealth = await checkDBHealth();
  
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: dbHealth,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    cpu: process.cpuUsage()
  };

  // Determine overall health status
  if (dbHealth.status !== 'connected') {
    healthCheck.status = 'DEGRADED';
    res.status(503);
  }

  res.json({
    success: true,
    data: healthCheck
  });
}));

// @desc    Detailed health check
// @route   GET /api/health/detailed
// @access  Public
router.get('/detailed', asyncHandler(async (req, res) => {
  const dbHealth = await checkDBHealth();
  
  const detailedHealth = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: 'UP',
        uptime: process.uptime(),
        version: '1.0.0'
      },
      database: {
        status: dbHealth.status === 'connected' ? 'UP' : 'DOWN',
        ...dbHealth
      }
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000
    }
  };

  // Determine overall health status
  const allServicesUp = Object.values(detailedHealth.services)
    .every(service => service.status === 'UP');
  
  if (!allServicesUp) {
    detailedHealth.status = 'DEGRADED';
    res.status(503);
  }

  res.json({
    success: true,
    data: detailedHealth
  });
}));

// @desc    Database health check
// @route   GET /api/health/database
// @access  Public
router.get('/database', asyncHandler(async (req, res) => {
  const dbHealth = await checkDBHealth();
  
  const response = {
    success: dbHealth.status === 'connected',
    data: {
      database: dbHealth,
      timestamp: new Date().toISOString()
    }
  };

  if (dbHealth.status !== 'connected') {
    res.status(503);
  }

  res.json(response);
}));

module.exports = router; 