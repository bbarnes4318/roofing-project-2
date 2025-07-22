const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8000', 
    'https://stever-five.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Simple MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://jimbosky35:Balls3560@kenstruction.h0xgjuh.mongodb.net/?retryWrites=true&w=majority&appName=kenstruction', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// SIMPLIFIED SCHEMAS (no crashes)

// User Schema - Match what's in database
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'worker' },
  position: String,
  department: String,
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  lastLogin: Date,
  lastLoginIP: String,
  lastActivity: { type: Date, default: Date.now },
  projectsAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  company: { type: String, default: 'KenStruction' },
  permissions: [String]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate token
userSchema.methods.generateToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, 'KenStruction2024SecretKey', { expiresIn: '30d' });
};

// Project Schema - Simplified
const projectSchema = new mongoose.Schema({
  name: String,
  type: String,
  status: String,
  estimateValue: Number,
  progress: { type: Number, default: 0 },
  startDate: String,
  endDate: String,
  client: {
    name: String,
    phone: String,
    email: String
  },
  location: String,
  priority: String,
  projectManager: String,
  accountManager: String,
  createdAt: { type: Date, default: Date.now }
});

// Task Schema - Simplified  
const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  assignedTo: String,
  projectId: Number,
  alertDate: String,
  priority: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);

// JWT Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, 'KenStruction2024SecretKey');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ============== AUTH ROUTES ==============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({ firstName, lastName, email, password });
    const token = user.generateToken();

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      },
      message: 'Registration successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = user.generateToken();

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      },
      message: 'Login successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        _id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role
      }
    }
  });
});

// ============== PROJECT ROUTES ==============

// Get all projects
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get project by ID
app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create project
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete project
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============== TASK ROUTES ==============

// Get all tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ============== OTHER ROUTES ==============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Real KenStruction API is running' });
});

// Team members (simplified)
app.get('/api/team-members', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Schedules (basic)
app.get('/api/schedules', authenticateToken, (req, res) => {
  res.json([]);
});

app.post('/api/schedules', authenticateToken, (req, res) => {
  res.json(req.body);
});

module.exports = app; 