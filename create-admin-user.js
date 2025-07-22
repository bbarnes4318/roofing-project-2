const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Fixed MongoDB Connection (removed deprecated options)
mongoose.connect('mongodb+srv://jimbosky35:Balls3560@kenstruction.h0xgjuh.mongodb.net/?retryWrites=true&w=majority&appName=kenstruction')
  .then(() => {
    console.log('Connected to MongoDB for admin user creation');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Simplified User Schema for seeding (without select options that cause issues)
const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  // Profile Information
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: {
      values: ['admin', 'manager', 'project_manager', 'foreman', 'worker', 'client'],
      message: 'Role must be one of: admin, manager, project_manager, foreman, worker, client'
    },
    default: 'worker'
  },
  permissions: [{
    type: String,
    enum: [
      'create_projects',
      'edit_projects',
      'delete_projects',
      'manage_users',
      'view_reports',
      'manage_finances',
      'manage_documents',
      'manage_calendar',
      'use_ai_features'
    ]
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  
  // Security
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  lastLoginIP: String,
  twoFactorSecret: String,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // Professional Information
  skills: [String],
  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    credentialId: String
  }],
  experience: {
    type: Number, // Years of experience
    min: 0
  },
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'US'
    }
  },
  
  // Work Information
  hireDate: Date,
  salary: Number,
  hourlyRate: Number,
  
  // Activity Tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  projectsAssigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  
  // Company Information
  company: {
    type: String,
    default: 'KenStruction'
  },
  
  // API Keys for integrations
  apiKeys: Object
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

// Client Schema
const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  clientSince: { type: String },
  notes: { type: String }
}, { timestamps: true });

// Project Schema (using ObjectId references)
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true, enum: ['lead', 'prospect', 'approved', 'execution', 'supplement', 'completion'] },
  estimateValue: { type: Number, required: true },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  materialsDeliveryStart: { type: String },
  materialsDeliveryEnd: { type: String },
  laborStart: { type: String },
  laborEnd: { type: String },
  client: { type: clientSchema, required: true },
  location: { type: String, required: true },
  teamSize: { type: Number, default: 1 },
  duration: { type: Number, required: true },
  priority: { type: String, required: true, enum: ['Low', 'Medium', 'High'] },
  projectManager: { type: String, required: true },
  accountManager: { type: String, required: true },
  clientSince: { type: String },
  // Reference to User models
  projectManagerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  accountManagerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

async function createAdminUser() {
  try {
    console.log('Checking for existing admin user...');
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@kenstruction.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists with email: admin@kenstruction.com');
      console.log('You can login with:');
      console.log('Email: admin@kenstruction.com');
      console.log('Password: admin123');
      return existingAdmin;
    }

    console.log('Creating new admin user...');
    
    // Create admin user (password will be hashed by the pre-save hook)
    const adminUser = await User.create({
      firstName: 'Ken',
      lastName: 'Admin',
      email: 'admin@kenstruction.com',
      password: 'admin123', // Will be hashed automatically
      role: 'admin',
      position: 'System Administrator',
      department: 'IT',
      isActive: true,
      isVerified: true,
      permissions: [
        'create_projects',
        'edit_projects',
        'delete_projects',
        'manage_users',
        'view_reports',
        'manage_finances',
        'manage_documents',
        'manage_calendar',
        'use_ai_features'
      ],
      lastActivity: new Date()
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@kenstruction.com');
    console.log('🔑 Password: admin123');
    console.log('🏷️ Role: admin');
    console.log('🆔 User ID:', adminUser._id);
    
    // Create a sample project
    console.log('\nCreating sample project...');
    
    const sampleProject = await Project.create({
      name: 'Downtown Office Building',
      type: 'Commercial',
      status: 'execution',
      estimateValue: 850000,
      progress: 45,
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      duration: 167,
      client: {
        name: 'ABC Corporation',
        phone: '555-0123',
        email: 'contact@abc-corp.com',
        address: '123 Business Ave, Downtown',
        clientSince: '2023-01-01'
      },
      location: '123 Main St, Downtown',
      priority: 'High',
      projectManager: 'Ken Admin',
      accountManager: 'Ken Admin',
      teamSize: 8,
      laborStart: '2024-02-01',
      laborEnd: '2024-06-15',
      materialsDeliveryStart: '2024-01-20',
      materialsDeliveryEnd: '2024-06-01',
      // Link to the admin user
      projectManagerUser: adminUser._id,
      accountManagerUser: adminUser._id,
      assignedUsers: [adminUser._id]
    });

    console.log('✅ Sample project created:', sampleProject.name);
    console.log('🆔 Project ID:', sampleProject._id);
    
    // Update admin user with assigned project
    await User.findByIdAndUpdate(adminUser._id, {
      $push: { projectsAssigned: sampleProject._id }
    });
    
    console.log('✅ Admin user linked to sample project');
    
    return adminUser;

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('Full error:', error);
  } finally {
    console.log('\n🔌 Closing MongoDB connection...');
    mongoose.connection.close();
  }
}

createAdminUser().then(() => {
  console.log('\n🎉 Setup complete! You can now test the login.');
}).catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
}); 