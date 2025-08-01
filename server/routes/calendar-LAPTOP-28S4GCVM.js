const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');

const prisma = new PrismaClient();
const router = express.Router();

// @desc    Get all calendar events
// @route   GET /api/calendar-events
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { date, type, projectId } = req.query;
  let where = {};
  
  if (date) where.date = date;
  if (type) where.type = type;
  if (projectId) where.projectId = parseInt(projectId);
  
  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: [
      { date: 'asc' },
      { time: 'asc' }
    ]
  });
  sendSuccess(res, 200, { events, count: events.length }, 'Calendar events retrieved successfully');
}));

// @desc    Create calendar event
// @route   POST /api/calendar-events
// @access  Private
router.post('/', asyncHandler(async (req, res) => {
  const event = await prisma.calendarEvent.create({
    data: req.body
  });
  sendSuccess(res, 201, { event }, 'Calendar event created successfully');
}));

// @desc    Update calendar event
// @route   PUT /api/calendar-events/:id
// @access  Private
router.put('/:id', asyncHandler(async (req, res) => {
  const event = await prisma.calendarEvent.update({
    where: { id: parseInt(req.params.id) },
    data: { ...req.body, updatedAt: new Date() }
  });
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Calendar event not found'
    });
  }
  
  sendSuccess(res, 200, { event }, 'Calendar event updated successfully');
}));

// @desc    Delete calendar event
// @route   DELETE /api/calendar-events/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res) => {
  const event = await prisma.calendarEvent.delete({
    where: { id: parseInt(req.params.id) }
  });
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Calendar event not found'
    });
  }
  
  sendSuccess(res, 200, null, 'Calendar event deleted successfully');
}));

module.exports = router; 