const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: [true, 'Conversation ID is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [5000, 'Message text cannot exceed 5000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Additional useful fields
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'notification'],
    default: 'text'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  
  // Reply/Thread functionality
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // Reactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // System message data
  systemData: {
    action: String, // 'user_joined', 'user_left', 'project_updated', etc.
    data: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ timestamp: -1 });
messageSchema.index({ isDeleted: 1 });

// Virtual for is read by all participants
messageSchema.virtual('isReadByAll').get(function() {
  // This would need to be populated with conversation participants
  // Implementation depends on how you track conversation participants
  return false; // Placeholder
});

// Virtual for read count
messageSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// Virtual for formatted timestamp
messageSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.timestamp) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return this.timestamp.toLocaleDateString();
});

// Pre-save middleware to set edited timestamp
messageSchema.pre('save', function(next) {
  if (this.isModified('text') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Static method to find messages by conversation
messageSchema.statics.findByConversation = function(conversationId, options = {}) {
  const query = this.find({ 
    conversationId, 
    isDeleted: false 
  })
    .populate('sender', 'firstName lastName avatar')
    .populate('replyTo', 'text sender timestamp')
    .populate('readBy.user', 'firstName lastName');
    
  if (options.limit) {
    query.limit(parseInt(options.limit));
  }
  
  if (options.before) {
    query.where('timestamp').lt(options.before);
  }
  
  if (options.after) {
    query.where('timestamp').gt(options.after);
  }
  
  return query.sort({ timestamp: options.ascending ? 1 : -1 });
};

// Static method to find unread messages for user
messageSchema.statics.findUnreadForUser = function(userId, conversationId = null) {
  const query = {
    'readBy.user': { $ne: userId },
    sender: { $ne: userId }, // Don't include own messages
    isDeleted: false
  };
  
  if (conversationId) {
    query.conversationId = conversationId;
  }
  
  return this.find(query)
    .populate('sender', 'firstName lastName avatar')
    .populate('conversationId', 'participants')
    .sort({ timestamp: -1 });
};

// Static method to search messages
messageSchema.statics.searchMessages = function(searchTerm, conversationId = null, options = {}) {
  const searchRegex = new RegExp(searchTerm, 'i');
  const query = {
    text: searchRegex,
    isDeleted: false
  };
  
  if (conversationId) {
    query.conversationId = conversationId;
  }
  
  return this.find(query)
    .populate('sender', 'firstName lastName avatar')
    .populate('conversationId', 'participants')
    .limit(options.limit || 50)
    .sort({ timestamp: -1 });
};

// Instance method to mark as read by user
messageSchema.methods.markAsReadBy = function(userId) {
  const existingRead = this.readBy.find(read => read.user.equals(userId));
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => !reaction.user.equals(userId));
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

// Instance method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => !reaction.user.equals(userId));
  return this.save();
};

// Instance method to soft delete
messageSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Instance method to check if user can edit
messageSchema.methods.canUserEdit = function(userId) {
  // Only sender can edit within 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.sender.equals(userId) && this.timestamp > fifteenMinutesAgo;
};

// Instance method to check if user can delete
messageSchema.methods.canUserDelete = function(userId, userRole) {
  // Sender can always delete, admins/managers can delete any message
  return this.sender.equals(userId) || ['admin', 'manager'].includes(userRole);
};

module.exports = mongoose.model('Message', messageSchema); 