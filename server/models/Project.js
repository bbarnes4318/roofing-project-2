const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  projectType: {
    type: String,
    required: [true, 'Project type is required'],
    enum: {
      values: ['Roof Replacement', 'Kitchen Remodel', 'Bathroom Renovation', 'Siding Installation', 'Window Replacement', 'Flooring', 'Painting', 'Electrical Work', 'Plumbing', 'HVAC', 'Deck Construction', 'Landscaping', 'Other'],
      message: 'Please select a valid project type'
    }
  },
  status: {
    type: String,
    required: [true, 'Project status is required'],
    enum: {
      values: ['Pending', 'In Progress', 'Completed', 'On Hold'],
      message: 'Status must be one of: Pending, In Progress, Completed, On Hold'
    },
    default: 'Pending'
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  address: {
    type: String,
    required: [true, 'Project address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [0, 'Budget cannot be negative']
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot exceed 100']
  },
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  
  // Additional useful fields
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative']
  },
  actualCost: {
    type: Number,
    min: [0, 'Actual cost cannot be negative']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
projectSchema.index({ status: 1 });
projectSchema.index({ customer: 1 });
projectSchema.index({ projectManager: 1 });
projectSchema.index({ startDate: 1 });
projectSchema.index({ endDate: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ archived: 1 });

// Virtual for project duration in days
projectSchema.virtual('durationDays').get(function() {
  if (this.startDate && this.endDate) {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  return 0;
});

// Virtual for days remaining
projectSchema.virtual('daysRemaining').get(function() {
  if (this.endDate) {
    const timeDiff = this.endDate.getTime() - new Date().getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  return 0;
});

// Virtual for budget utilization percentage
projectSchema.virtual('budgetUtilization').get(function() {
  if (this.budget && this.actualCost) {
    return Math.round((this.actualCost / this.budget) * 100);
  }
  return 0;
});

// Virtual for project health status
projectSchema.virtual('healthStatus').get(function() {
  const daysRemaining = this.daysRemaining;
  const progress = this.progress;
  
  if (progress >= 90) return 'Excellent';
  if (progress >= 70 && daysRemaining > 0) return 'Good';
  if (progress >= 50 && daysRemaining > 0) return 'Fair';
  if (daysRemaining < 0) return 'Overdue';
  return 'At Risk';
});

// Pre-save middleware to validate dates and capture isNew state
projectSchema.pre('save', function(next) {
  // Capture isNew state before save
  this.wasNew = this.isNew;
  
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Post-save middleware to create default workflow for new projects
projectSchema.post('save', async function(doc) {
  // Only create workflow for newly created projects (not updates)
  if (this.wasNew) {
    try {
      const ProjectWorkflow = require('./ProjectWorkflow');
      
      // Check if workflow already exists for this project
      const existingWorkflow = await ProjectWorkflow.findOne({ project: doc._id });
      
      if (!existingWorkflow) {
        // Create the default detailed workflow with all 27 steps
        const workflow = await ProjectWorkflow.createDetailedWorkflow(doc._id, doc.projectType, null);
        
        // Automatically schedule workflow step dates based on project timeline
        if (doc.startDate && doc.endDate) {
          await workflow.scheduleStepDates(doc.startDate, doc.endDate);
          console.log(`✅ Default workflow created and scheduled for project: ${doc.projectName} (${workflow.steps.length} steps)`);
        } else {
          console.log(`✅ Default workflow created for project: ${doc.projectName} (${workflow.steps.length} steps) - No dates scheduled`);
        }
      }
    } catch (error) {
      console.error(`❌ Error creating default workflow for project ${doc.projectName}:`, error.message);
      // Don't throw error to avoid breaking project creation
    }
  }
});

// Static method to find projects by status
projectSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('customer', 'name email phone')
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');
};

// Static method to find overdue projects
projectSchema.statics.findOverdue = function() {
  return this.find({
    endDate: { $lt: new Date() },
    status: { $ne: 'Completed' }
  })
    .populate('customer', 'name email phone')
    .populate('projectManager', 'firstName lastName email');
};

// Static method to find projects by customer
projectSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customer: customerId })
    .populate('teamMembers', 'firstName lastName email role')
    .populate('projectManager', 'firstName lastName email');
};

// Instance method to add team member
projectSchema.methods.addTeamMember = function(userId) {
  if (!this.teamMembers.includes(userId)) {
    this.teamMembers.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove team member
projectSchema.methods.removeTeamMember = function(userId) {
  this.teamMembers = this.teamMembers.filter(id => !id.equals(userId));
  return this.save();
};

// Instance method to update progress
projectSchema.methods.updateProgress = function(newProgress) {
  this.progress = Math.max(0, Math.min(100, newProgress));
  if (this.progress === 100 && this.status !== 'Completed') {
    this.status = 'Completed';
  }
  return this.save();
};

module.exports = mongoose.model('Project', projectSchema); 