const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Task description cannot exceed 2000 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Task must be assigned to a user']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    validate: {
      validator: function(value) {
        return value >= new Date();
      },
      message: 'Due date cannot be in the past'
    }
  },
  status: {
    type: String,
    required: [true, 'Task status is required'],
    enum: {
      values: ['To Do', 'In Progress', 'Done'],
      message: 'Status must be one of: To Do, In Progress, Done'
    },
    default: 'To Do'
  },
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  
  // Additional useful fields
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative']
  },
  category: {
    type: String,
    enum: ['Planning', 'Design', 'Construction', 'Inspection', 'Documentation', 'Communication', 'Other'],
    default: 'Other'
  },
  tags: [String],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  completedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
taskSchema.index({ project: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ createdAt: -1 });

// Compound indexes
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });

// Virtual for days until due
taskSchema.virtual('daysUntilDue').get(function() {
  if (this.dueDate) {
    const timeDiff = this.dueDate.getTime() - new Date().getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  return 0;
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && this.status !== 'Done';
});

// Virtual for completion percentage (if has estimated hours)
taskSchema.virtual('completionPercentage').get(function() {
  if (this.estimatedHours && this.actualHours) {
    return Math.min(100, Math.round((this.actualHours / this.estimatedHours) * 100));
  }
  return this.status === 'Done' ? 100 : 0;
});

// Pre-save middleware to set completion date
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'Done' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  if (this.isModified('status') && this.status !== 'Done') {
    this.completedAt = undefined;
  }
  
  next();
});

// Pre-save middleware to prevent circular dependencies
taskSchema.pre('save', async function(next) {
  if (this.isModified('dependencies') && this.dependencies.length > 0) {
    // Check for circular dependencies
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = async (taskId) => {
      if (recursionStack.has(taskId.toString())) {
        return true; // Cycle detected
      }
      
      if (visited.has(taskId.toString())) {
        return false;
      }
      
      visited.add(taskId.toString());
      recursionStack.add(taskId.toString());
      
      const task = await this.constructor.findById(taskId);
      if (task && task.dependencies) {
        for (const depId of task.dependencies) {
          if (await hasCycle(depId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(taskId.toString());
      return false;
    };
    
    for (const depId of this.dependencies) {
      if (await hasCycle(depId)) {
        return next(new Error('Circular dependency detected'));
      }
    }
  }
  
  next();
});

// Static method to find tasks by project
taskSchema.statics.findByProject = function(projectId, options = {}) {
  const query = this.find({ project: projectId })
    .populate('assignedTo', 'firstName lastName email')
    .populate('dependencies', 'title status');
    
  if (options.status) {
    query.where('status', options.status);
  }
  
  return query.sort(options.sort || { dueDate: 1 });
};

// Static method to find overdue tasks
taskSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $ne: 'Done' }
  })
    .populate('assignedTo', 'firstName lastName email')
    .populate('project', 'projectName');
};

// Static method to find tasks by user
taskSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ assignedTo: userId })
    .populate('project', 'projectName status');
    
  if (options.status) {
    query.where('status', options.status);
  }
  
  return query.sort(options.sort || { dueDate: 1 });
};

// Static method to find tasks ready to start (no pending dependencies)
taskSchema.statics.findReadyToStart = function(projectId) {
  return this.aggregate([
    { $match: { project: mongoose.Types.ObjectId(projectId), status: 'To Do' } },
    {
      $lookup: {
        from: 'tasks',
        localField: 'dependencies',
        foreignField: '_id',
        as: 'dependencyTasks'
      }
    },
    {
      $match: {
        $or: [
          { dependencies: { $size: 0 } }, // No dependencies
          { 'dependencyTasks.status': { $not: { $in: ['To Do', 'In Progress'] } } } // All dependencies completed
        ]
      }
    }
  ]);
};

// Instance method to check if task can be started
taskSchema.methods.canBeStarted = async function() {
  if (this.dependencies.length === 0) {
    return true;
  }
  
  const dependentTasks = await this.constructor.find({
    _id: { $in: this.dependencies }
  });
  
  return dependentTasks.every(task => task.status === 'Done');
};

// Instance method to add dependency
taskSchema.methods.addDependency = function(taskId) {
  if (!this.dependencies.includes(taskId)) {
    this.dependencies.push(taskId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove dependency
taskSchema.methods.removeDependency = function(taskId) {
  this.dependencies = this.dependencies.filter(id => !id.equals(taskId));
  return this.save();
};

// Instance method to update status with validation
taskSchema.methods.updateStatus = async function(newStatus) {
  if (newStatus === 'In Progress' || newStatus === 'Done') {
    const canStart = await this.canBeStarted();
    if (!canStart) {
      throw new Error('Cannot start task: dependencies not completed');
    }
  }
  
  this.status = newStatus;
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema); 