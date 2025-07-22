const express = require('express');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
// Authentication middleware removed - all users can manage users
const User = require('../models/User');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin/Manager only)
router.get('/', authenticateToken, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select('-password -__v')
    .sort({ firstName: 1, lastName: 1 });

  sendSuccess(res, 200, users, 'Users retrieved successfully');
}));

// @desc    Get team members (users who can be assigned to tasks/alerts)
// @route   GET /api/users/team-members
// @access  Private
router.get('/team-members', authenticateToken, asyncHandler(async (req, res) => {
  // Get all active users except clients
  const teamMembers = await User.find({
    isActive: true,
    role: { $ne: 'client' }
  })
    .select('firstName lastName email role position')
    .sort({ firstName: 1, lastName: 1 });

  sendSuccess(res, 200, { teamMembers }, 'Team members retrieved successfully');
}));

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('projectsAssigned', 'name status');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  sendSuccess(res, 200, { user }, 'User retrieved successfully');
}));

module.exports = router; 