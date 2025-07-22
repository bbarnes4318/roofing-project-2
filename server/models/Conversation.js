const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // Additional useful fields
  conversationType: {
    type: String,
    enum: ['direct', 'group', 'project'],
    default: 'direct'
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Conversation title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Conversation description cannot exceed 500 characters']
  },
  
  // Group/Project conversation specific fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Conversation settings
  settings: {
    allowNewMembers: {
      type: Boolean,
      default: true
    },
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    messageRetentionDays: {
      type: Number,
      default: 0 // 0 means no retention limit
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    }
  },
  
  // Activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  },
  
  // Participant-specific data
  participantData: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    notificationSettings: {
      muted: {
        type: Boolean,
        default: false
      },
      mutedUntil: Date
    },
    customName: String, // Custom name for this conversation for this user
    isActive: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ project: 1 });
conversationSchema.index({ conversationType: 1 });
conversationSchema.index({ 'settings.isArchived': 1 });

// Compound indexes
conversationSchema.index({ participants: 1, lastActivity: -1 });
conversationSchema.index({ participants: 1, 'settings.isArchived': 1 });

// Virtual for active participants count
conversationSchema.virtual('activeParticipantCount').get(function() {
  return this.participantData ? this.participantData.filter(p => p.isActive).length : 0;
});

// Virtual for unread message count (would need to be calculated per user)
conversationSchema.virtual('unreadCount').get(function() {
  // This would be calculated based on user's lastReadAt vs messages
  return 0; // Placeholder
});

// Virtual for conversation display name
conversationSchema.virtual('displayName').get(function() {
  if (this.title) {
    return this.title;
  }
  
  if (this.conversationType === 'direct' && this.participants.length === 2) {
    // For direct conversations, display name would be the other participant's name
    // This would need to be populated based on current user context
    return 'Direct Conversation';
  }
  
  if (this.conversationType === 'project' && this.project) {
    return `${this.project.projectName} Discussion`;
  }
  
  return 'Group Conversation';
});

// Virtual for is direct conversation
conversationSchema.virtual('isDirect').get(function() {
  return this.conversationType === 'direct';
});

// Virtual for is group conversation
conversationSchema.virtual('isGroup').get(function() {
  return this.conversationType === 'group';
});

// Pre-save middleware to set conversation type based on participants
conversationSchema.pre('save', function(next) {
  if (this.isNew && !this.conversationType) {
    if (this.project) {
      this.conversationType = 'project';
    } else if (this.participants.length === 2) {
      this.conversationType = 'direct';
    } else {
      this.conversationType = 'group';
    }
  }
  next();
});

// Pre-save middleware to update participant data
conversationSchema.pre('save', function(next) {
  if (this.isModified('participants')) {
    // Add new participants to participantData
    this.participants.forEach(participantId => {
      const existingData = this.participantData.find(pd => pd.user.equals(participantId));
      if (!existingData) {
        this.participantData.push({
          user: participantId,
          joinedAt: new Date(),
          lastReadAt: new Date(),
          isActive: true
        });
      }
    });
    
    // Mark removed participants as inactive
    this.participantData.forEach(pd => {
      if (!this.participants.some(p => p.equals(pd.user)) && pd.isActive) {
        pd.isActive = false;
        pd.leftAt = new Date();
      }
    });
  }
  next();
});

// Static method to find conversations for user
conversationSchema.statics.findForUser = function(userId, options = {}) {
  const query = {
    participants: userId,
    'settings.isArchived': options.includeArchived || false
  };
  
  if (options.conversationType) {
    query.conversationType = options.conversationType;
  }
  
  return this.find(query)
    .populate('participants', 'firstName lastName avatar lastActivity')
    .populate('lastMessage', 'text timestamp sender')
    .populate('project', 'projectName')
    .sort({ lastActivity: -1 })
    .limit(options.limit || 50);
};

// Static method to find or create direct conversation
conversationSchema.statics.findOrCreateDirect = async function(user1Id, user2Id) {
  // Look for existing direct conversation between these users
  let conversation = await this.findOne({
    conversationType: 'direct',
    participants: { $all: [user1Id, user2Id], $size: 2 }
  });
  
  if (!conversation) {
    // Create new direct conversation
    conversation = await this.create({
      participants: [user1Id, user2Id],
      conversationType: 'direct',
      createdBy: user1Id
    });
  }
  
  return conversation;
};

// Static method to find project conversations
conversationSchema.statics.findByProject = function(projectId, options = {}) {
  const query = { project: projectId };
  
  if (options.userId) {
    query.participants = options.userId;
  }
  
  return this.find(query)
    .populate('participants', 'firstName lastName avatar')
    .populate('lastMessage', 'text timestamp sender')
    .sort({ lastActivity: -1 });
};

// Static method to search conversations
conversationSchema.statics.searchConversations = function(userId, searchTerm, options = {}) {
  const searchRegex = new RegExp(searchTerm, 'i');
  const query = {
    participants: userId,
    $or: [
      { title: searchRegex },
      { description: searchRegex }
    ]
  };
  
  return this.find(query)
    .populate('participants', 'firstName lastName avatar')
    .populate('lastMessage', 'text timestamp')
    .limit(options.limit || 20)
    .sort({ lastActivity: -1 });
};

// Instance method to add participant
conversationSchema.methods.addParticipant = function(userId, addedBy = null) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    
    // Add to participant data
    this.participantData.push({
      user: userId,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      isActive: true
    });
    
    this.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove participant
conversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(id => !id.equals(userId));
  
  // Mark as inactive in participant data
  const participantData = this.participantData.find(pd => pd.user.equals(userId));
  if (participantData) {
    participantData.isActive = false;
    participantData.leftAt = new Date();
  }
  
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to update last message
conversationSchema.methods.updateLastMessage = function(messageId) {
  this.lastMessage = messageId;
  this.lastActivity = new Date();
  this.messageCount += 1;
  return this.save();
};

// Instance method to mark as read by user
conversationSchema.methods.markAsReadBy = function(userId) {
  const participantData = this.participantData.find(pd => pd.user.equals(userId));
  if (participantData) {
    participantData.lastReadAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to check if user is participant
conversationSchema.methods.isParticipant = function(userId) {
  return this.participants.some(id => id.equals(userId));
};

// Instance method to check if user is admin
conversationSchema.methods.isAdmin = function(userId) {
  return this.admins.some(id => id.equals(userId)) || 
         (this.createdBy && this.createdBy.equals(userId));
};

// Instance method to add admin
conversationSchema.methods.addAdmin = function(userId) {
  if (!this.admins.includes(userId) && this.isParticipant(userId)) {
    this.admins.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove admin
conversationSchema.methods.removeAdmin = function(userId) {
  this.admins = this.admins.filter(id => !id.equals(userId));
  return this.save();
};

// Instance method to archive conversation
conversationSchema.methods.archive = function() {
  this.settings.isArchived = true;
  return this.save();
};

// Instance method to unarchive conversation
conversationSchema.methods.unarchive = function() {
  this.settings.isArchived = false;
  return this.save();
};

// Instance method to mute for user
conversationSchema.methods.muteForUser = function(userId, mutedUntil = null) {
  const participantData = this.participantData.find(pd => pd.user.equals(userId));
  if (participantData) {
    participantData.notificationSettings.muted = true;
    participantData.notificationSettings.mutedUntil = mutedUntil;
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to unmute for user
conversationSchema.methods.unmuteForUser = function(userId) {
  const participantData = this.participantData.find(pd => pd.user.equals(userId));
  if (participantData) {
    participantData.notificationSettings.muted = false;
    participantData.notificationSettings.mutedUntil = null;
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Conversation', conversationSchema); 