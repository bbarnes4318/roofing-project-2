const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
// Authentication middleware removed - all users can manage users
const { authenticateToken, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin/Manager only)
router.get('/', authenticateToken, authorize('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      position: true,
      department: true,
      bio: true,
      isActive: true,
      isVerified: true,
      theme: true,
      language: true,
      timezone: true,
      skills: true,
      experience: true,
      createdAt: true,
      lastLogin: true
    },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' }
    ]
  });

  res.json({
    success: true,
    data: users,
    message: 'Users retrieved successfully'
  });
}));

// @desc    Get team members (users who can be assigned to tasks/alerts)
// @route   GET /api/users/team-members
// @access  Private
router.get('/team-members', authenticateToken, asyncHandler(async (req, res) => {
  // Get all active users except clients
  const teamMembers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { not: 'CLIENT' }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      position: true,
      avatar: true
    },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' }
    ]
  });

  res.json({
    success: true,
    data: { teamMembers },
    message: 'Team members retrieved successfully'
  });
}));

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      position: true,
      department: true,
      bio: true,
      isActive: true,
      isVerified: true,
      theme: true,
      language: true,
      timezone: true,
      skills: true,
      experience: true,
      createdAt: true,
      lastLogin: true,
      projectsAsManager: {
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          status: true
        }
      }
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user },
    message: 'User retrieved successfully'
  });
}));

module.exports = router; 