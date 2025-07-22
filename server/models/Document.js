const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: [255, 'File name cannot exceed 255 characters']
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required'],
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: {
      values: ['Blueprint', 'Permit', 'Invoice', 'Photo', 'Contract', 'Report', 'Specification', 'Correspondence', 'Other'],
      message: 'File type must be one of: Blueprint, Permit, Invoice, Photo, Contract, Report, Specification, Correspondence, Other'
    }
  },
  
  // Additional useful fields
  originalName: {
    type: String,
    required: [true, 'Original file name is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  tags: [String],
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'Download count cannot be negative']
  },
  lastDownloadedAt: Date,
  lastDownloadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  checksum: String, // For file integrity verification
  
  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Metadata for different file types
  metadata: {
    // For images
    dimensions: {
      width: Number,
      height: Number
    },
    // For blueprints/CAD files
    scale: String,
    drawingNumber: String,
    revision: String,
    // For invoices/contracts
    amount: Number,
    dueDate: Date,
    vendor: String,
    // For permits
    permitNumber: String,
    issuingAuthority: String,
    expirationDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
documentSchema.index({ project: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ fileType: 1 });
documentSchema.index({ isActive: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ tags: 1 });

// Compound indexes
documentSchema.index({ project: 1, fileType: 1 });
documentSchema.index({ project: 1, isActive: 1 });

// Virtual for file size in human readable format
documentSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for file extension
documentSchema.virtual('fileExtension').get(function() {
  return this.fileName.split('.').pop().toLowerCase();
});

// Virtual for is image
documentSchema.virtual('isImage').get(function() {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  return imageTypes.includes(this.fileExtension);
});

// Virtual for is document
documentSchema.virtual('isDocument').get(function() {
  const docTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  return docTypes.includes(this.fileExtension);
});

// Virtual for age in days
documentSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const timeDiff = now.getTime() - created.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Pre-save middleware to increment version for updates
documentSchema.pre('save', function(next) {
  if (this.isModified('fileUrl') && !this.isNew) {
    this.version += 1;
  }
  next();
});

// Static method to find documents by project
documentSchema.statics.findByProject = function(projectId, options = {}) {
  const query = this.find({ project: projectId, isActive: true })
    .populate('uploadedBy', 'firstName lastName email')
    .populate('project', 'projectName');
    
  if (options.fileType) {
    query.where('fileType', options.fileType);
  }
  
  return query.sort(options.sort || { createdAt: -1 });
};

// Static method to find documents by type
documentSchema.statics.findByType = function(fileType, options = {}) {
  const query = this.find({ fileType, isActive: true })
    .populate('uploadedBy', 'firstName lastName email')
    .populate('project', 'projectName');
    
  if (options.projectId) {
    query.where('project', options.projectId);
  }
  
  return query.sort(options.sort || { createdAt: -1 });
};

// Static method to find recent documents
documentSchema.statics.findRecent = function(days = 7, limit = 20) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  return this.find({
    createdAt: { $gte: dateThreshold },
    isActive: true
  })
    .populate('uploadedBy', 'firstName lastName email')
    .populate('project', 'projectName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search documents
documentSchema.statics.searchDocuments = function(query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  const filter = {
    $or: [
      { fileName: searchRegex },
      { originalName: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ],
    isActive: true
  };
  
  if (options.projectId) {
    filter.project = options.projectId;
  }
  
  if (options.fileType) {
    filter.fileType = options.fileType;
  }
  
  return this.find(filter)
    .populate('uploadedBy', 'firstName lastName email')
    .populate('project', 'projectName')
    .limit(options.limit || 20)
    .sort(options.sort || { createdAt: -1 });
};

// Instance method to check if user can access document
documentSchema.methods.canUserAccess = function(userId) {
  // Public documents can be accessed by anyone
  if (this.isPublic) {
    return true;
  }
  
  // Uploader can always access
  if (this.uploadedBy.equals(userId)) {
    return true;
  }
  
  // Check if user is in allowed users list
  return this.allowedUsers.some(allowedUserId => allowedUserId.equals(userId));
};

// Instance method to add allowed user
documentSchema.methods.addAllowedUser = function(userId) {
  if (!this.allowedUsers.some(allowedUserId => allowedUserId.equals(userId))) {
    this.allowedUsers.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove allowed user
documentSchema.methods.removeAllowedUser = function(userId) {
  this.allowedUsers = this.allowedUsers.filter(allowedUserId => !allowedUserId.equals(userId));
  return this.save();
};

// Instance method to increment download count
documentSchema.methods.recordDownload = function(userId) {
  this.downloadCount += 1;
  this.lastDownloadedAt = new Date();
  this.lastDownloadedBy = userId;
  return this.save();
};

// Instance method to soft delete
documentSchema.methods.softDelete = function() {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('Document', documentSchema); 