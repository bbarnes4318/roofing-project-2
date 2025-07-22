const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Notification message cannot exceed 500 characters']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: {
    type: String,
    trim: true,
    maxlength: [1000, 'Link cannot exceed 1000 characters']
  },
  
  // Additional useful fields
  type: {
    type: String,
    enum: [
      'task_assigned',
      'task_completed',
      'task_overdue',
      'project_updated',
      'project_completed',
      'message_received',
      'document_uploaded',
      'calendar_event',
      'deadline_approaching',
      'deadline_urgent',
      'deadline_overdue',
      'workflow_step_completed',
      'workflow_step_overdue',
      'workflow_step_warning',
      'workflow_step_urgent',
      'system_announcement',
      'user_mention',
      'approval_required',
      'payment_due',
      'inspection_scheduled',
      'material_delivered',
      'other'
    ],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Related entities
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalendarEvent'
  },
  
  // Notification metadata
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Workflow-specific metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Delivery tracking
  sentAt: {
    type: Date,
    default: Date.now
  },
  readAt: Date,
  deliveryMethod: {
    type: String,
    enum: ['in_app', 'email', 'sms', 'push'],
    default: 'in_app'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  
  // Grouping and batching
  groupKey: String, // For grouping similar notifications
  batchId: String, // For batch sending
  
  // Auto-expiration
  expiresAt: Date,
  
  // Action buttons/links
  actions: [{
    label: String,
    action: String, // 'link', 'api_call', 'dismiss'
    url: String,
    method: String, // 'GET', 'POST', etc.
    data: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ sentAt: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ groupKey: 1 });

// Compound indexes
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ user: 1, priority: 1, isRead: 1 });

// Virtual for age in minutes
notificationSchema.virtual('ageInMinutes').get(function() {
  const now = new Date();
  const created = this.createdAt;
  return Math.floor((now - created) / (1000 * 60));
});

// Virtual for formatted time
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return this.createdAt.toLocaleDateString();
});

// Virtual for is urgent
notificationSchema.virtual('isUrgent').get(function() {
  return this.priority === 'urgent' || this.priority === 'high';
});

// Virtual for is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Pre-save middleware to set readAt timestamp
notificationSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  if (this.isModified('isRead') && !this.isRead) {
    this.readAt = undefined;
  }
  
  next();
});

// Pre-save middleware to handle expiration
notificationSchema.pre('save', function(next) {
  // Auto-expire certain types of notifications
  if (this.isNew && !this.expiresAt) {
    const expirationHours = {
      'system_announcement': 24 * 7, // 1 week
      'calendar_event': 24, // 1 day
      'task_assigned': 24 * 3, // 3 days
      'message_received': 24 * 2, // 2 days
      'deadline_approaching': 1, // 1 hour
      'other': 24 * 7 // 1 week default
    };
    
    const hours = expirationHours[this.type] || expirationHours['other'];
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  
  next();
});

// Static method to find notifications for user
notificationSchema.statics.findForUser = function(userId, options = {}) {
  const query = { 
    user: userId,
    expiresAt: { $gt: new Date() } // Only non-expired notifications
  };
  
  if (options.isRead !== undefined) {
    query.isRead = options.isRead;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  return this.find(query)
    .populate('relatedProject', 'projectName')
    .populate('relatedTask', 'title')
    .populate('relatedUser', 'firstName lastName avatar')
    .populate('relatedDocument', 'fileName')
    .populate('relatedEvent', 'title start')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    user: userId,
    isRead: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to find notifications by type
notificationSchema.statics.findByType = function(type, options = {}) {
  const query = { type };
  
  if (options.userId) {
    query.user = options.userId;
  }
  
  if (options.isRead !== undefined) {
    query.isRead = options.isRead;
  }
  
  return this.find(query)
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  // Check for duplicate notifications (prevent spam)
  if (notificationData.groupKey) {
    const recentDuplicate = await this.findOne({
      user: notificationData.user,
      groupKey: notificationData.groupKey,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Within last 5 minutes
    });
    
    if (recentDuplicate) {
      return recentDuplicate; // Don't create duplicate
    }
  }
  
  const notification = await this.create(notificationData);
  
  // Emit real-time notification
  const io = require('../server').io; // Assuming io is available
  if (io) {
    io.to(`user_${notification.user}`).emit('new_notification', notification);
  }
  
  return notification;
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsReadForUser = function(userId, type = null) {
  const query = { 
    user: userId, 
    isRead: false 
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.updateMany(query, { 
    isRead: true, 
    readAt: new Date() 
  });
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Static method to get notification statistics
notificationSchema.statics.getStatistics = async function(userId = null, days = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  const matchStage = {
    createdAt: { $gte: dateThreshold }
  };
  
  if (userId) {
    matchStage.user = mongoose.Types.ObjectId(userId);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
        byType: {
          $push: {
            type: '$type',
            priority: '$priority'
          }
        }
      }
    }
  ]);
  
  const typeStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } }
      }
    }
  ]);
  
  return {
    overview: stats[0] || { total: 0, unread: 0 },
    byType: typeStats
  };
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Instance method to mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = undefined;
  return this.save();
};

// Instance method to check if can be deleted
notificationSchema.methods.canBeDeleted = function() {
  // Allow deletion if read or expired
  return this.isRead || this.isExpired;
};

// Instance method to extend expiration
notificationSchema.methods.extendExpiration = function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.save();
};

// Instance method to add action
notificationSchema.methods.addAction = function(label, action, url = null, data = null) {
  this.actions.push({
    label,
    action,
    url,
    data
  });
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema); 