const express = require('express');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
const CalendarEvent = require('../models/CalendarEvent');

const router = express.Router();

// @desc    Get all calendar events
// @route   GET /api/calendar-events
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { date, type, projectId } = req.query;
  let filter = {};
  
  if (date) filter.date = date;
  if (type) filter.type = type;
  if (projectId) filter.projectId = parseInt(projectId);
  
  const events = await CalendarEvent.find(filter).sort({ date: 1, time: 1 });
  sendSuccess(res, 200, { events, count: events.length }, 'Calendar events retrieved successfully');
}));

// @desc    Create calendar event
// @route   POST /api/calendar-events
// @access  Private
router.post('/', asyncHandler(async (req, res) => {
  const event = await CalendarEvent.create(req.body);
  sendSuccess(res, 201, { event }, 'Calendar event created successfully');
}));

// @desc    Update calendar event
// @route   PUT /api/calendar-events/:id
// @access  Private
router.put('/:id', asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: new Date() },
    { new: true }
  );
  
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
  const event = await CalendarEvent.findByIdAndDelete(req.params.id);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Calendar event not found'
    });
  }
  
  sendSuccess(res, 200, null, 'Calendar event deleted successfully');
}));

module.exports = router; 