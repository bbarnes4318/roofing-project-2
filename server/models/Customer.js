const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  associatedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
customerSchema.index({ email: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ createdAt: -1 });

// Virtual for project count
customerSchema.virtual('projectCount').get(function() {
  return this.associatedProjects ? this.associatedProjects.length : 0;
});

// Static method to find customers with projects
customerSchema.statics.findWithProjects = function() {
  return this.find().populate('associatedProjects', 'projectName status');
};

// Static method to search customers
customerSchema.statics.searchCustomers = function(query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  const filter = {
    $or: [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ]
  };
  
  return this.find(filter)
    .limit(options.limit || 20)
    .sort(options.sort || { name: 1 });
};

module.exports = mongoose.model('Customer', customerSchema); 