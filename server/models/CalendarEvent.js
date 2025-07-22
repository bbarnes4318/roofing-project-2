const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Event title cannot exceed 200 characters']
  },
  start: {
    type: Date,
    required: [true, 'Start date is required']
  },
  end: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.start;
      },
      message: 'End date must be after start date'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Additional useful fields
  location: {
    type: String,
    trim: true,
    maxlength: [500, 'Location cannot exceed 500 characters']
  },
  eventType: {
    type: String,
    enum: ['Meeting', 'Inspection', 'Delivery', 'Milestone', 'Deadline', 'Training', 'Other'],
    default: 'Other'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'],
    default: 'Scheduled'
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    endDate: Date,
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    dayOfMonth: Number, // 1-31
    weekOfMonth: Number // 1-4
  },
  parentEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalendarEvent'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  
  // Notification settings
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'push', 'sms'],
      required: true
    },
    minutesBefore: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // Meeting specific fields
  meetingDetails: {
    agenda: String,
    meetingUrl: String,
    dialInNumber: String,
    meetingId: String,
    password: String
  },
  
  // Inspection specific fields
  inspectionDetails: {
    inspector: String,
    inspectionType: String,
    checklist: [String],
    requirements: String
  },
  
  // Delivery specific fields
  deliveryDetails: {
    vendor: String,
    items: [String],
    deliveryAddress: String,
    contactPerson: String,
    contactPhone: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
calendarEventSchema.index({ start: 1 });
calendarEventSchema.index({ end: 1 });
calendarEventSchema.index({ project: 1 });
calendarEventSchema.index({ attendees: 1 });
calendarEventSchema.index({ createdBy: 1 });
calendarEventSchema.index({ eventType: 1 });
calendarEventSchema.index({ status: 1 });

// Compound indexes
calendarEventSchema.index({ start: 1, end: 1 });
calendarEventSchema.index({ project: 1, start: 1 });

// Virtual for event duration in minutes
calendarEventSchema.virtual('durationMinutes').get(function() {
  if (this.start && this.end) {
    return Math.round((this.end.getTime() - this.start.getTime()) / (1000 * 60));
  }
  return 0;
});

// Virtual for event duration formatted
calendarEventSchema.virtual('durationFormatted').get(function() {
  const minutes = this.durationMinutes;
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
});

// Virtual for is upcoming
calendarEventSchema.virtual('isUpcoming').get(function() {
  return this.start > new Date() && this.status === 'Scheduled';
});

// Virtual for is past
calendarEventSchema.virtual('isPast').get(function() {
  return this.end < new Date();
});

// Virtual for is current
calendarEventSchema.virtual('isCurrent').get(function() {
  const now = new Date();
  return this.start <= now && this.end >= now && this.status === 'In Progress';
});

// Virtual for days until event
calendarEventSchema.virtual('daysUntilEvent').get(function() {
  if (this.start > new Date()) {
    const timeDiff = this.start.getTime() - new Date().getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  return 0;
});

// Pre-save middleware to validate dates
calendarEventSchema.pre('save', function(next) {
  if (this.start && this.end && this.start >= this.end) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Pre-save middleware to handle all-day events
calendarEventSchema.pre('save', function(next) {
  if (this.isAllDay) {
    // Set start to beginning of day and end to end of day
    this.start.setHours(0, 0, 0, 0);
    this.end.setHours(23, 59, 59, 999);
  }
  next();
});

// Static method to find events in date range
calendarEventSchema.statics.findInDateRange = function(startDate, endDate, options = {}) {
  const query = this.find({
    $or: [
      { start: { $gte: startDate, $lte: endDate } },
      { end: { $gte: startDate, $lte: endDate } },
      { start: { $lte: startDate }, end: { $gte: endDate } }
    ]
  })
    .populate('attendees', 'firstName lastName email')
    .populate('project', 'projectName')
    .populate('createdBy', 'firstName lastName email');
    
  if (options.projectId) {
    query.where('project', options.projectId);
  }
  
  if (options.attendeeId) {
    query.where('attendees', options.attendeeId);
  }
  
  if (options.eventType) {
    query.where('eventType', options.eventType);
  }
  
  return query.sort({ start: 1 });
};

// Static method to find upcoming events
calendarEventSchema.statics.findUpcoming = function(days = 7, limit = 20) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    start: { $gte: now, $lte: futureDate },
    status: 'Scheduled'
  })
    .populate('attendees', 'firstName lastName email')
    .populate('project', 'projectName')
    .sort({ start: 1 })
    .limit(limit);
};

// Static method to find events by project
calendarEventSchema.statics.findByProject = function(projectId, options = {}) {
  const query = this.find({ project: projectId })
    .populate('attendees', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email');
    
  if (options.status) {
    query.where('status', options.status);
  }
  
  if (options.eventType) {
    query.where('eventType', options.eventType);
  }
  
  return query.sort(options.sort || { start: 1 });
};

// Static method to find events by attendee
calendarEventSchema.statics.findByAttendee = function(userId, options = {}) {
  const query = this.find({ attendees: userId })
    .populate('project', 'projectName')
    .populate('createdBy', 'firstName lastName email');
    
  if (options.status) {
    query.where('status', options.status);
  }
  
  return query.sort(options.sort || { start: 1 });
};

// Static method to find conflicting events
calendarEventSchema.statics.findConflicts = function(start, end, attendeeIds, excludeEventId = null) {
  const query = {
    $or: [
      { start: { $gte: start, $lt: end } },
      { end: { $gt: start, $lte: end } },
      { start: { $lte: start }, end: { $gte: end } }
    ],
    attendees: { $in: attendeeIds },
    status: { $in: ['Scheduled', 'In Progress'] }
  };
  
  if (excludeEventId) {
    query._id = { $ne: excludeEventId };
  }
  
  return this.find(query)
    .populate('attendees', 'firstName lastName email')
    .populate('project', 'projectName');
};

// Instance method to add attendee
calendarEventSchema.methods.addAttendee = function(userId) {
  if (!this.attendees.includes(userId)) {
    this.attendees.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove attendee
calendarEventSchema.methods.removeAttendee = function(userId) {
  this.attendees = this.attendees.filter(attendeeId => !attendeeId.equals(userId));
  return this.save();
};

// Instance method to check if user is attendee
calendarEventSchema.methods.isAttendee = function(userId) {
  return this.attendees.some(attendeeId => attendeeId.equals(userId));
};

// Instance method to update status
calendarEventSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  return this.save();
};

// Instance method to add reminder
calendarEventSchema.methods.addReminder = function(type, minutesBefore) {
  const existingReminder = this.reminders.find(r => r.type === type && r.minutesBefore === minutesBefore);
  if (!existingReminder) {
    this.reminders.push({ type, minutesBefore });
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to create recurring events
calendarEventSchema.methods.createRecurringEvents = function(count = 10) {
  if (!this.isRecurring || !this.recurrencePattern.frequency) {
    return Promise.resolve([]);
  }
  
  const events = [];
  const pattern = this.recurrencePattern;
  let currentStart = new Date(this.start);
  let currentEnd = new Date(this.end);
  
  for (let i = 0; i < count; i++) {
    // Calculate next occurrence based on frequency
    switch (pattern.frequency) {
      case 'daily':
        currentStart.setDate(currentStart.getDate() + pattern.interval);
        currentEnd.setDate(currentEnd.getDate() + pattern.interval);
        break;
      case 'weekly':
        currentStart.setDate(currentStart.getDate() + (7 * pattern.interval));
        currentEnd.setDate(currentEnd.getDate() + (7 * pattern.interval));
        break;
      case 'monthly':
        currentStart.setMonth(currentStart.getMonth() + pattern.interval);
        currentEnd.setMonth(currentEnd.getMonth() + pattern.interval);
        break;
      case 'yearly':
        currentStart.setFullYear(currentStart.getFullYear() + pattern.interval);
        currentEnd.setFullYear(currentEnd.getFullYear() + pattern.interval);
        break;
    }
    
    // Check if we've reached the end date
    if (pattern.endDate && currentStart > pattern.endDate) {
      break;
    }
    
    // Create new event
    const eventData = {
      ...this.toObject(),
      _id: undefined,
      start: new Date(currentStart),
      end: new Date(currentEnd),
      parentEvent: this._id,
      createdAt: undefined,
      updatedAt: undefined
    };
    
    events.push(eventData);
  }
  
  return this.constructor.insertMany(events);
};

module.exports = mongoose.model('CalendarEvent', calendarEventSchema); 