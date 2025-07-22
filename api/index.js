const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8000', 
    'https://stever-five.vercel.app',
    'https://stever-hxc0hcdtv-bbarnes4318s-projects.vercel.app',
    'https://stever-kpgdzdkdy-bbarnes4318s-projects.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// ============== IN-MEMORY DATABASE SOLUTION ==============
// This actually fucking works instead of timing out

let DATABASE = {
  users: [],
  projects: [],
  tasks: [],
  clients: [],
  activities: [],
  notifications: [],
  messages: []
};

// Initialize with admin user
DATABASE.users.push({
  _id: 'admin-user-id',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@kenstruction.com',
  password: 'admin123', // Will be hashed when user logs in with comparePassword
  role: 'admin',
  isActive: true,
  isVerified: true,
  company: 'KenStruction',
  permissions: ['all'],
  projectsAssigned: [],
  lastActivity: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
});

  // Add demo alerts for testing assign functionality
  DATABASE.alerts = [
    {
      _id: 'alert_001',
      user: 'admin-user-id',
      type: 'Work Flow Line Item',
      priority: 'high',
      message: 'Site inspection required for Downtown Office Complex',
      relatedProject: 'project-1',
      metadata: {
        stepName: 'Site Inspection',
        projectName: 'Downtown Office Complex',
        phase: 'Prospect',
        daysOverdue: 2,
        daysUntilDue: 0
      },
      status: 'active',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date()
    },
    {
      _id: 'alert_002',
      user: 'admin-user-id',
      type: 'Work Flow Line Item',
      priority: 'medium',
      message: 'Write estimate for Residential Complex Phase 2',
      relatedProject: 'project-2',
      metadata: {
        stepName: 'Write Estimate',
        projectName: 'Residential Complex Phase 2',
        phase: 'Prospect',
        daysOverdue: 0,
        daysUntilDue: 3
      },
      status: 'active',
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      updatedAt: new Date()
    },
    {
      _id: 'alert_003',
      user: 'admin-user-id',
      type: 'Work Flow Line Item',
      priority: 'high',
      message: 'Foundation inspection overdue for Downtown Office Complex',
      relatedProject: 'project-1',
      metadata: {
        stepName: 'Foundation Inspection',
        projectName: 'Downtown Office Complex',
        phase: 'Execution',
        daysOverdue: 5,
        daysUntilDue: 0
      },
      status: 'active',
      createdAt: new Date(Date.now() - 259200000), // 3 days ago
      updatedAt: new Date()
    },
    {
      _id: 'alert_004',
      user: 'admin-user-id',
      type: 'Work Flow Line Item',
      priority: 'high',
      message: 'Roof inspection - 123 Main St',
      description: 'Complete safety inspection before work begins',
      assignedTo: 'user-2',
      projectId: 'project-1',
      alertDate: '2024-06-04',
      status: 'pending',
      metadata: {
        stepName: 'Roof inspection',
        projectName: '123 Main St',
        phase: 'Execution',
        daysOverdue: 0,
        daysUntilDue: 2
      },
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date()
    },
    {
      _id: 'alert_005',
      user: 'admin-user-id',
      type: 'Work Flow Line Item',
      priority: 'high',
      message: 'Submit insurance documentation',
      description: 'Upload all required forms to customer portal',
      assignedTo: 'user-3',
      projectId: 'project-1',
      alertDate: '2024-06-02',
      status: 'overdue',
      metadata: {
        stepName: 'Submit insurance documentation',
        projectName: 'Customer Portal',
        phase: 'Approved',
        daysOverdue: 3,
        daysUntilDue: 0
      },
      createdAt: new Date(Date.now() - 172800000),
      updatedAt: new Date()
    },
    {
      _id: 'alert_006',
      user: 'admin-user-id',
      type: 'Work Flow Line Item',
      priority: 'medium',
      message: 'Material delivery coordination',
      description: 'Coordinate with supplier for delivery schedule',
      assignedTo: 'user-3',
      projectId: 'project-2',
      alertDate: '2024-06-10',
      status: 'in-progress',
      metadata: {
        stepName: 'Material delivery coordination',
        projectName: 'Supplier Coordination',
        phase: 'Execution',
        daysOverdue: 0,
        daysUntilDue: 5
      },
      createdAt: new Date(Date.now() - 259200000),
      updatedAt: new Date()
    },
    {
      _id: 'alert_007',
      user: 'admin-user-id',
      type: 'Work Flow Line Item',
      priority: 'high',
      message: 'Safety meeting required',
      description: 'Daily safety briefing needed before crew starts work',
      assignedTo: 'user-2',
      projectId: 'project-1',
      alertDate: '2024-06-05',
      status: 'pending',
      metadata: {
        stepName: 'Safety meeting required',
        projectName: 'Crew Safety',
        phase: 'Execution',
        daysOverdue: 0,
        daysUntilDue: 1
      },
      createdAt: new Date(Date.now() - 345600000),
      updatedAt: new Date()
    },
    {
      _id: 'alert_008',
      user: 'admin-user-id',
      type: 'Work Flow Line Item',
      priority: 'medium',
      message: 'Permit approval check',
    description: 'Verify building permit status for Rodriguez project',
    assignedTo: 'admin-user-id',
    projectId: 'project-2',
    alertDate: '2024-06-03',
    status: 'pending',
    metadata: {
      stepName: 'Permit approval check',
      projectName: 'Rodriguez project',
      phase: 'Approved',
      daysOverdue: 0,
      daysUntilDue: 3
    },
    createdAt: new Date(Date.now() - 432000000),
    updatedAt: new Date()
  },
  // Add alert_001 that's being tested
  {
    _id: 'alert_001',
    user: 'admin-user-id',
    type: 'Work Flow Line Item',
    priority: 'high',
    message: 'Site inspection required for Downtown Office Complex',
    relatedProject: 'project-1',
    metadata: {
      stepName: 'Site Inspection',
      projectName: 'Downtown Office Complex',
      phase: 'Prospect',
      daysOverdue: 2,
      daysUntilDue: 0
    },
    status: 'active',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date()
  }
];

// Add additional team members
DATABASE.users.push({
  _id: 'user-2',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@kenstruction.com',
  password: 'password123',
  role: 'project_manager',
  isActive: true,
  isVerified: true,
  company: 'KenStruction',
  permissions: ['projects', 'tasks'],
  projectsAssigned: ['project-1'],
  lastActivity: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
});

DATABASE.users.push({
  _id: 'user-3',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah@kenstruction.com',
  password: 'password123',
  role: 'field_director',
  isActive: true,
  isVerified: true,
  company: 'KenStruction',
  permissions: ['tasks', 'activities'],
  projectsAssigned: ['project-2'],
  lastActivity: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
});

DATABASE.users.push({
  _id: 'user-4',
  firstName: 'Mike',
  lastName: 'Brown',
  email: 'mike@kenstruction.com',
  password: 'password123',
  role: 'worker',
  isActive: true,
  isVerified: true,
  company: 'KenStruction',
  permissions: ['tasks'],
  projectsAssigned: ['project-1', 'project-2'],
  lastActivity: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
});

// Add some sample projects and data
DATABASE.projects.push({
  _id: 'project-1',
  name: 'Downtown Office Complex',
  description: 'Modern office building construction',
  client: 'ABC Corporation',
  clientId: 'client-1',
  status: 'in-progress',
  phase: 'Foundation',
  startDate: '2024-01-15',
  endDate: '2024-12-15',
  budget: 2500000,
  spent: 450000,
  progress: 35,
  teamMembers: ['admin-user-id'],
  location: '123 Main St, Downtown',
  priority: 'high',
  createdAt: new Date(),
  updatedAt: new Date()
});

DATABASE.projects.push({
  _id: 'project-2',
  name: 'Residential Complex Phase 2',
  description: 'Luxury apartment complex',
  client: 'HomeBuilders Inc',
  clientId: 'client-2',
  status: 'in-progress',
  phase: 'Framing',
  startDate: '2024-02-01',
  endDate: '2025-01-30',
  budget: 3200000,
  spent: 820000,
  progress: 28,
  teamMembers: ['admin-user-id'],
  location: '456 Oak Avenue',
  priority: 'medium',
  createdAt: new Date(),
  updatedAt: new Date()
});

DATABASE.tasks.push({
  _id: 'task-1',
  title: 'Foundation Inspection',
  description: 'Schedule and complete foundation inspection',
  project: 'project-1',
  assignedTo: 'admin-user-id',
  status: 'in-progress',
  priority: 'high',
  dueDate: '2024-01-25',
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
});

DATABASE.tasks.push({
  _id: 'task-2',
  title: 'Material Delivery Coordination',
  description: 'Coordinate steel beam delivery',
  project: 'project-2',
  assignedTo: 'admin-user-id',
  status: 'pending',
  priority: 'medium',
  dueDate: '2024-01-28',
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
});

DATABASE.activities.push({
  _id: 'activity-1',
  type: 'project_update',
  description: 'Foundation work completed ahead of schedule',
  project: 'project-1',
  user: 'admin-user-id',
  timestamp: new Date(Date.now() - 86400000) // 1 day ago
});

DATABASE.activities.push({
  _id: 'activity-2',
  type: 'task_completed',
  description: 'Safety inspection passed',
  project: 'project-2',
  user: 'admin-user-id',
  timestamp: new Date(Date.now() - 172800000) // 2 days ago
});

// Add some sample customers
DATABASE.clients = [];

DATABASE.clients.push({
  _id: 'client-1',
  name: 'ABC Corporation',
  email: 'contact@abccorp.com',
  phone: '(555) 123-4567',
  company: 'ABC Corporation',
  address: '123 Business Park Dr, Downtown City, NY 10001',
  notes: 'Large commercial client - prefers detailed project updates',
  status: 'active',
  createdBy: 'admin-user-id',
  createdAt: new Date(Date.now() - 604800000), // 1 week ago
  updatedAt: new Date(Date.now() - 604800000)
});

DATABASE.clients.push({
  _id: 'client-2', 
  name: 'HomeBuilders Inc',
  email: 'info@homebuilders.com',
  phone: '(555) 987-6543',
  company: 'HomeBuilders Inc',
  address: '456 Oak Avenue, Residential District, NY 10002',
  notes: 'Residential developer - focuses on luxury apartments',
  status: 'active',
  createdBy: 'admin-user-id',
  createdAt: new Date(Date.now() - 1209600000), // 2 weeks ago
  updatedAt: new Date(Date.now() - 1209600000)
});

DATABASE.clients.push({
  _id: 'client-3',
  name: 'Metro Construction Partners',
  email: 'projects@metroconstruction.com',
  phone: '(555) 555-0123',
  company: 'Metro Construction Partners',
  address: '789 Industrial Blvd, Commercial Zone, NY 10003',
  notes: 'Infrastructure and commercial projects specialist',
  status: 'active',
  createdBy: 'admin-user-id',
  createdAt: new Date(Date.now() - 259200000), // 3 days ago
  updatedAt: new Date(Date.now() - 259200000)
});

// ============== UTILITY FUNCTIONS ==============

function generateId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
}

async function comparePassword(candidatePassword, hashedPassword) {
  return await bcrypt.compare(candidatePassword, hashedPassword);
}

function generateAuthToken(user) {
  const JWT_SECRET = process.env.JWT_SECRET || 'KenStruction2024!SecureJWTSecret#AdminLogin$MongoDB%Vercel&Production!DefaultFallback';
  return jwt.sign(
    { 
      id: user._id,
      role: user.role,
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '30d',
      issuer: 'kenstruction-api',
      audience: 'kenstruction-client'
    }
  );
}

// ============== MIDDLEWARE ==============

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    // Check if it's a demo token first (FOR VERCEL DEPLOYMENT)
    if (token.startsWith('demo-sarah-owner-token-')) {
      // Create Sarah Owner demo user for Vercel
      const sarahOwner = {
        _id: 'sarah-owner-demo-id',
        firstName: 'Sarah',
        lastName: 'Owner',
        email: 'sarah@example.com',
        role: 'admin',
        isActive: true,
        company: 'Kenstruction',
        position: 'Owner',
        department: 'Management',
        isVerified: true
      };
      
      req.user = sarahOwner;
      return next();
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'KenStruction2024!SecureJWTSecret#AdminLogin$MongoDB%Vercel&Production!DefaultFallback';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = DATABASE.users.find(u => u._id === decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account deactivated' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// ============== AUTH ROUTES ==============

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = DATABASE.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Compare password
    let isPasswordValid = false;
    if (user.password === 'admin123' && password === 'admin123') {
      // Special case for initial admin user
      isPasswordValid = true;
      // Hash the password for future use
      user.password = await hashPassword('admin123');
    } else {
      isPasswordValid = await comparePassword(password, user.password);
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.lastActivity = new Date();

    // Generate token
    const token = generateAuthToken(user);

    // Return success with user data
    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      company: user.company,
      position: user.position,
      department: user.department,
      permissions: user.permissions,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      lastActivity: user.lastActivity
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed due to server error'
    });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role = 'worker' } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = DATABASE.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = {
      _id: generateId(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      avatar: '',
      company: 'KenStruction',
      position: '',
      department: '',
      permissions: role === 'admin' ? ['all'] : [],
      isActive: true,
      isVerified: false,
      loginAttempts: 0,
      projectsAssigned: [],
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.users.push(newUser);

    // Generate token
    const token = generateAuthToken(newUser);

    // Return success
    const userResponse = {
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
      company: newUser.company,
      position: newUser.position,
      department: newUser.department,
      permissions: newUser.permissions,
      isVerified: newUser.isVerified,
      lastActivity: newUser.lastActivity
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed due to server error'
    });
  }
});

// Get current user (for auth verification)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const userResponse = {
      _id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
      company: req.user.company,
      position: req.user.position,
      department: req.user.department,
      permissions: req.user.permissions,
      isVerified: req.user.isVerified,
      lastLogin: req.user.lastLogin,
      lastActivity: req.user.lastActivity
    };

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const userResponse = {
      _id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
      company: req.user.company,
      position: req.user.position,
      department: req.user.department,
      permissions: req.user.permissions,
      isVerified: req.user.isVerified,
      lastLogin: req.user.lastLogin,
      lastActivity: req.user.lastActivity
    };

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// ============== PROJECT ROUTES ==============

// Get all projects
app.get('/api/projects', authenticateToken, (req, res) => {
  try {
    const projects = DATABASE.projects.map(project => ({
      ...project,
      teamMembers: project.teamMembers.map(memberId => {
        const user = DATABASE.users.find(u => u._id === memberId);
        return user ? {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        } : null;
      }).filter(Boolean)
    }));

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

// Get single project
app.get('/api/projects/:id', authenticateToken, (req, res) => {
  try {
    const project = DATABASE.projects.find(p => p._id === req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get project tasks
    const tasks = DATABASE.tasks.filter(t => t.project === project._id);
    
    // Get project activities
    const activities = DATABASE.activities.filter(a => a.project === project._id);

    // Populate team members
    const teamMembers = project.teamMembers.map(memberId => {
      const user = DATABASE.users.find(u => u._id === memberId);
      return user ? {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      } : null;
    }).filter(Boolean);

    res.json({
      success: true,
      project: {
        ...project,
        teamMembers,
        tasks,
        activities
      }
    });
  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project'
    });
  }
});

// Create project
app.post('/api/projects', authenticateToken, (req, res) => {
  try {
    const {
      name,
      description,
      client,
      startDate,
      endDate,
      budget,
      location,
      priority = 'medium'
    } = req.body;

    if (!name || !description || !client) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and client are required'
      });
    }

    const newProject = {
      _id: generateId(),
      name: name.trim(),
      description: description.trim(),
      client: client.trim(),
      status: 'planning',
      phase: 'Planning',
      startDate,
      endDate,
      budget: budget || 0,
      spent: 0,
      progress: 0,
      teamMembers: [req.user._id],
      location: location || '',
      priority,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.projects.push(newProject);

    // Add activity
    DATABASE.activities.push({
      _id: generateId(),
      type: 'project_created',
      description: `Project "${name}" created`,
      project: newProject._id,
      user: req.user._id,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: newProject
    });
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project'
    });
  }
});

// ============== TASK ROUTES ==============

// Get all tasks
app.get('/api/tasks', authenticateToken, (req, res) => {
  try {
    const tasks = DATABASE.tasks.map(task => {
      const project = DATABASE.projects.find(p => p._id === task.project);
      const assignedUser = DATABASE.users.find(u => u._id === task.assignedTo);
      
      return {
        ...task,
        project: project ? {
          _id: project._id,
          name: project.name,
          client: project.client
        } : null,
        assignedTo: assignedUser ? {
          _id: assignedUser._id,
          firstName: assignedUser.firstName,
          lastName: assignedUser.lastName,
          email: assignedUser.email
        } : null
      };
    });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

// Create task
app.post('/api/tasks', authenticateToken, (req, res) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      priority = 'medium',
      dueDate
    } = req.body;

    if (!title || !description || !project) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and project are required'
      });
    }

    const projectExists = DATABASE.projects.find(p => p._id === project);
    if (!projectExists) {
      return res.status(400).json({
        success: false,
        message: 'Project not found'
      });
    }

    const newTask = {
      _id: generateId(),
      title: title.trim(),
      description: description.trim(),
      project,
      assignedTo: assignedTo || req.user._id,
      status: 'pending',
      priority,
      dueDate,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.tasks.push(newTask);

    // Add activity
    DATABASE.activities.push({
      _id: generateId(),
      type: 'task_created',
      description: `Task "${title}" created`,
      project,
      user: req.user._id,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
});

// ============== ACTIVITY ROUTES ==============

// Get activities
app.get('/api/activities', authenticateToken, (req, res) => {
  try {
    const activities = DATABASE.activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50) // Latest 50 activities
      .map(activity => {
        const project = DATABASE.projects.find(p => p._id === activity.project);
        const user = DATABASE.users.find(u => u._id === activity.user);
        
        return {
          ...activity,
          project: project ? {
            _id: project._id,
            name: project.name,
            client: project.client
          } : null,
          user: user ? {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName
          } : null
        };
      });

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Activities fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities'
    });
  }
});

// ============== USERS ROUTES ==============

// Get all users
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = DATABASE.users.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      company: user.company,
      isActive: user.isActive
    }));

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// ============== ALERTS ROUTES ==============

// Get all alerts
app.get('/api/alerts', authenticateToken, (req, res) => {
  try {
    const alerts = DATABASE.alerts || [];
    
    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    console.error('Alerts fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts'
    });
  }
});

// Create alert
app.post('/api/alerts', authenticateToken, (req, res) => {
  try {
    const {
      title,
      description,
      priority = 'medium',
      assignedTo,
      projectId,
      projectName,
      dueDate,
      sourceType,
      sourceId
    } = req.body;

    if (!title || !description || !assignedTo || assignedTo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and at least one assigned user are required'
      });
    }

    // Initialize alerts array if it doesn't exist
    if (!DATABASE.alerts) {
      DATABASE.alerts = [];
    }

    const newAlert = {
      _id: generateId(),
      title: title.trim(),
      description: description.trim(),
      priority,
      assignedTo: Array.isArray(assignedTo) ? assignedTo : [assignedTo],
      projectId,
      projectName,
      dueDate: dueDate || null,
      sourceType: sourceType || 'manual',
      sourceId: sourceId || null,
      status: 'active',
      createdBy: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.alerts.push(newAlert);

    // Add activity for alert creation
    DATABASE.activities.push({
      _id: generateId(),
      type: 'alert_created',
      description: `Alert "${title}" created and assigned to ${assignedTo.length} team member(s)`,
      project: projectId,
      user: req.user._id,
      timestamp: new Date()
    });

    // Get assigned user names for response
    const assignedUsers = DATABASE.users.filter(u => assignedTo.includes(u._id));
    
    res.status(201).json({
      success: true,
      message: `Alert created successfully and assigned to ${assignedUsers.map(u => u.firstName + ' ' + u.lastName).join(', ')}`,
      alert: {
        ...newAlert,
        assignedUsers: assignedUsers.map(u => ({
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email
        }))
      }
    });
  } catch (error) {
    console.error('Alert creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert'
    });
  }
});

// Update alert status
app.patch('/api/alerts/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const alertId = req.params.id;

    if (!DATABASE.alerts) {
      DATABASE.alerts = [];
    }

    const alert = DATABASE.alerts.find(a => a._id === alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = status;
    alert.updatedAt = new Date();

    if (status === 'completed') {
      alert.completedAt = new Date();
      alert.completedBy = req.user._id;
    }

    res.json({
      success: true,
      message: `Alert ${status} successfully`,
      alert
    });
  } catch (error) {
    console.error('Alert update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert'
    });
  }
});

// Assign alert to another team member
app.patch('/api/alerts/:id/assign', authenticateToken, (req, res) => {
  try {
    const { assignedTo } = req.body;
    const alertId = req.params.id;
    
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Assigned to user ID is required'
      });
    }
    
    // Initialize alerts array if it doesn't exist
    if (!DATABASE.alerts) {
      DATABASE.alerts = [];
    }
    
    // Find the current alert
    const currentAlert = DATABASE.alerts.find(a => a._id === alertId);
    if (!currentAlert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    // Verify the target user exists
    const targetUser = DATABASE.users.find(u => u._id === assignedTo);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }
    
    // Create a new alert for the assigned user
    const newAlert = {
      _id: generateId(),
      user: assignedTo,
      type: currentAlert.type || 'Work Flow Line Item',
      priority: currentAlert.priority || 'medium',
      message: currentAlert.message,
      relatedProject: currentAlert.relatedProject,
      metadata: {
        ...currentAlert.metadata,
        reassignedFrom: req.user._id,
        reassignedFromName: `${req.user.firstName} ${req.user.lastName}`,
        reassignedAt: new Date()
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Remove the alert from current user
    const alertIndex = DATABASE.alerts.findIndex(a => a._id === alertId);
    if (alertIndex !== -1) {
      DATABASE.alerts.splice(alertIndex, 1);
    }
    
    // Add the new alert
    DATABASE.alerts.push(newAlert);
    
    // Add activity for alert assignment
    DATABASE.activities.push({
      _id: generateId(),
      type: 'alert_assigned',
      description: `Alert "${currentAlert.title || currentAlert.message}" reassigned from ${req.user.firstName} ${req.user.lastName} to ${targetUser.firstName} ${targetUser.lastName}`,
      user: req.user._id,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Alert assigned successfully',
      alert: newAlert,
      assignedTo: `${targetUser.firstName} ${targetUser.lastName}`
    });
  } catch (error) {
    console.error('Alert assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign alert'
    });
  }
});

// Add demo alerts (for testing/demo purposes)
app.post('/api/demo/add-alerts', (req, res) => {
  try {
    const { alerts } = req.body;
    
    // Initialize alerts array if it doesn't exist
    if (!DATABASE.alerts) {
      DATABASE.alerts = [];
    }
    
    if (!alerts || !Array.isArray(alerts)) {
      return res.status(400).json({
        success: false,
        message: 'Alerts array is required'
      });
    }
    
    // Clear existing demo alerts and add new ones
    DATABASE.alerts = DATABASE.alerts.filter(alert => !alert.id || !alert.id.startsWith('demo_alert_'));
    
    // Add demo alerts to in-memory database
    alerts.forEach(alert => {
      DATABASE.alerts.push({
        _id: alert.id || generateId(),
        ...alert,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    console.log(`✅ Added ${alerts.length} demo alerts to database`);
    
    res.json({
      success: true,
      message: `Successfully added ${alerts.length} demo alerts`,
      alertsCount: DATABASE.alerts.length
    });
  } catch (error) {
    console.error('Demo alerts creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add demo alerts'
    });
  }
});

// ============== CUSTOMERS/CLIENTS ROUTES ==============

// Get all customers
app.get('/api/customers', authenticateToken, (req, res) => {
  try {
    const customers = DATABASE.clients || [];
    
    res.json({
      success: true,
      customers
    });
  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers'
    });
  }
});

// Create customer
app.post('/api/customers', authenticateToken, (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      address,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    // Initialize customers array if it doesn't exist
    if (!DATABASE.clients) {
      DATABASE.clients = [];
    }

    const newCustomer = {
      _id: generateId(),
      name: name.trim(),
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      company: company?.trim() || '',
      address: address?.trim() || '',
      notes: notes?.trim() || '',
      status: 'active',
      createdBy: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.clients.push(newCustomer);

    // Add activity for customer creation
    DATABASE.activities.push({
      _id: generateId(),
      type: 'customer_created',
      description: `Customer "${name}" created`,
      user: req.user._id,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: newCustomer
    });
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  }
});

// Update customer
app.put('/api/customers/:id', authenticateToken, (req, res) => {
  try {
    const customerId = req.params.id;
    const {
      name,
      email,
      phone,
      company,
      address,
      notes,
      status
    } = req.body;

    if (!DATABASE.clients) {
      DATABASE.clients = [];
    }

    const customer = DATABASE.clients.find(c => c._id === customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update customer fields
    if (name) customer.name = name.trim();
    if (email !== undefined) customer.email = email.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (company !== undefined) customer.company = company.trim();
    if (address !== undefined) customer.address = address.trim();
    if (notes !== undefined) customer.notes = notes.trim();
    if (status) customer.status = status;
    customer.updatedAt = new Date();

    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    console.error('Customer update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer'
    });
  }
});

// Delete customer
app.delete('/api/customers/:id', authenticateToken, (req, res) => {
  try {
    const customerId = req.params.id;

    if (!DATABASE.clients) {
      DATABASE.clients = [];
    }

    const customerIndex = DATABASE.clients.findIndex(c => c._id === customerId);
    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = DATABASE.clients[customerIndex];
    DATABASE.clients.splice(customerIndex, 1);

    // Add activity for customer deletion
    DATABASE.activities.push({
      _id: generateId(),
      type: 'customer_deleted',
      description: `Customer "${customer.name}" deleted`,
      user: req.user._id,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Customer deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer'
    });
  }
});

// ============== WORKFLOW ROUTES ==============

// Complete workflow step (called by Complete buttons)
app.post('/api/workflows/:workflowId/steps/:stepId/complete', authenticateToken, (req, res) => {
  try {
    const { workflowId, stepId } = req.params;
    const { notes, alertId } = req.body;
    
    console.log(`🚀 VERCEL: Completing workflow step: ${workflowId}/${stepId}`);
    
    // Initialize workflows if needed
    if (!DATABASE.workflows) {
      DATABASE.workflows = [];
    }
    
    // Find or create workflow
    let workflow = DATABASE.workflows.find(w => w._id === workflowId);
    if (!workflow) {
      workflow = {
        _id: workflowId,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      DATABASE.workflows.push(workflow);
    }
    
    // Find or create step
    let step = workflow.steps.find(s => s.id === stepId || s.stepId === stepId || s._id === stepId);
    if (!step) {
      step = {
        id: stepId,
        stepId: stepId,
        _id: stepId,
        completed: false,
        createdAt: new Date()
      };
      workflow.steps.push(step);
    }
    
    // Mark step as completed
    step.completed = true;
    step.isCompleted = true;
    step.completedAt = new Date();
    step.completedBy = req.user._id;
    step.notes = notes;
    workflow.updatedAt = new Date();
    
    // If there's an alertId, mark the alert as completed too
    if (alertId && DATABASE.alerts) {
      const alert = DATABASE.alerts.find(a => a._id === alertId);
      if (alert) {
        alert.status = 'completed';
        alert.completedAt = new Date();
        alert.completedBy = req.user._id;
        console.log('✅ VERCEL: Also marked alert as completed');
      }
    }
    
    // Add activity log
    if (!DATABASE.activities) {
      DATABASE.activities = [];
    }
    
    DATABASE.activities.push({
      _id: generateId(),
      type: 'workflow_step_completed',
      description: `Workflow step completed: ${stepId}${notes ? ` - ${notes}` : ''}`,
      user: req.user._id,
      workflowId,
      stepId,
      timestamp: new Date()
    });
    
    console.log('✅ VERCEL: Workflow step completed successfully');
    
    res.json({
      success: true,
      message: 'Workflow step completed successfully',
      step: step
    });
  } catch (error) {
    console.error('VERCEL: Workflow completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete workflow step'
    });
  }
});

// Get workflow data for project
app.get('/api/workflows/project/:projectId', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    
    console.log(`🔍 VERCEL: Getting workflow data for project: ${projectId}`);
    
    // Initialize workflows if needed
    if (!DATABASE.workflows) {
      DATABASE.workflows = [];
    }
    
    // Find workflow for this project
    let workflow = DATABASE.workflows.find(w => w.projectId === projectId || w._id === projectId);
    
    if (!workflow) {
      // Create a basic workflow structure
      workflow = {
        _id: projectId,
        projectId: projectId,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      DATABASE.workflows.push(workflow);
    }
    
    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('VERCEL: Workflow fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow data'
    });
  }
});

// Update specific workflow step
app.put('/api/workflows/project/:projectId/workflow/:stepId', authenticateToken, (req, res) => {
  try {
    const { projectId, stepId } = req.params;
    const { completed } = req.body;
    
    console.log(`🔄 VERCEL: Updating workflow step: ${projectId}/${stepId} completed=${completed}`);
    
    // Initialize workflows if needed
    if (!DATABASE.workflows) {
      DATABASE.workflows = [];
    }
    
    // Find or create workflow
    let workflow = DATABASE.workflows.find(w => w.projectId === projectId || w._id === projectId);
    if (!workflow) {
      workflow = {
        _id: projectId,
        projectId: projectId,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      DATABASE.workflows.push(workflow);
    }
    
    // Find or create step
    let step = workflow.steps.find(s => s.id === stepId || s.stepId === stepId || s._id === stepId);
    if (!step) {
      step = {
        id: stepId,
        stepId: stepId,
        _id: stepId,
        completed: false,
        createdAt: new Date()
      };
      workflow.steps.push(step);
    }
    
    // Update step
    step.completed = completed;
    step.isCompleted = completed;
    if (completed) {
      step.completedAt = new Date();
      step.completedBy = req.user._id;
    }
    workflow.updatedAt = new Date();
    
    console.log('✅ VERCEL: Workflow step updated successfully');
    
    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('VERCEL: Workflow update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workflow step'
    });
  }
});

// ============== WORKFLOW ROUTES ==============

// Complete workflow step (called by Complete buttons)
app.post('/api/workflows/:workflowId/steps/:stepId/complete', authenticateToken, (req, res) => {
  try {
    const { workflowId, stepId } = req.params;
    const { notes, alertId } = req.body;
    
    console.log(`🚀 VERCEL: Completing workflow step: ${workflowId}/${stepId}`);
    
    // Initialize workflows if needed
    if (!DATABASE.workflows) {
      DATABASE.workflows = [];
    }
    
    // Find or create workflow
    let workflow = DATABASE.workflows.find(w => w._id === workflowId);
    if (!workflow) {
      workflow = {
        _id: workflowId,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      DATABASE.workflows.push(workflow);
    }
    
    // Find or create step
    let step = workflow.steps.find(s => s.id === stepId || s.stepId === stepId || s._id === stepId);
    if (!step) {
      step = {
        id: stepId,
        stepId: stepId,
        _id: stepId,
        completed: false,
        createdAt: new Date()
      };
      workflow.steps.push(step);
    }
    
    // Mark step as completed
    step.completed = true;
    step.isCompleted = true;
    step.completedAt = new Date();
    step.completedBy = req.user._id;
    step.notes = notes;
    workflow.updatedAt = new Date();
    
    // If there's an alertId, mark the alert as completed too
    if (alertId && DATABASE.alerts) {
      const alert = DATABASE.alerts.find(a => a._id === alertId);
      if (alert) {
        alert.status = 'completed';
        alert.completedAt = new Date();
        alert.completedBy = req.user._id;
        console.log('✅ VERCEL: Also marked alert as completed');
      }
    }
    
    // Add activity log
    if (!DATABASE.activities) {
      DATABASE.activities = [];
    }
    
    DATABASE.activities.push({
      _id: generateId(),
      type: 'workflow_step_completed',
      description: `Workflow step completed: ${stepId}${notes ? ` - ${notes}` : ''}`,
      user: req.user._id,
      workflowId,
      stepId,
      timestamp: new Date()
    });
    
    console.log('✅ VERCEL: Workflow step completed successfully');
    
    res.json({
      success: true,
      message: 'Workflow step completed successfully',
      step: step
    });
  } catch (error) {
    console.error('VERCEL: Workflow completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete workflow step'
    });
  }
});

// Get workflow data for project
app.get('/api/workflows/project/:projectId', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    
    console.log(`🔍 VERCEL: Getting workflow data for project: ${projectId}`);
    
    // Initialize workflows if needed
    if (!DATABASE.workflows) {
      DATABASE.workflows = [];
    }
    
    // Find workflow for this project
    let workflow = DATABASE.workflows.find(w => w.projectId === projectId || w._id === projectId);
    
    if (!workflow) {
      // Create a basic workflow structure
      workflow = {
        _id: projectId,
        projectId: projectId,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      DATABASE.workflows.push(workflow);
    }
    
    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('VERCEL: Workflow fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow data'
    });
  }
});

// Update specific workflow step
app.put('/api/workflows/project/:projectId/workflow/:stepId', authenticateToken, (req, res) => {
  try {
    const { projectId, stepId } = req.params;
    const { completed } = req.body;
    
    console.log(`🔄 VERCEL: Updating workflow step: ${projectId}/${stepId} completed=${completed}`);
    
    // Initialize workflows if needed
    if (!DATABASE.workflows) {
      DATABASE.workflows = [];
    }
    
    // Find or create workflow
    let workflow = DATABASE.workflows.find(w => w.projectId === projectId || w._id === projectId);
    if (!workflow) {
      workflow = {
        _id: projectId,
        projectId: projectId,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      DATABASE.workflows.push(workflow);
    }
    
    // Find or create step
    let step = workflow.steps.find(s => s.id === stepId || s.stepId === stepId || s._id === stepId);
    if (!step) {
      step = {
        id: stepId,
        stepId: stepId,
        _id: stepId,
        completed: false,
        createdAt: new Date()
      };
      workflow.steps.push(step);
    }
    
    // Update step
    step.completed = completed;
    step.isCompleted = completed;
    if (completed) {
      step.completedAt = new Date();
      step.completedBy = req.user._id;
    }
    workflow.updatedAt = new Date();
    
    console.log('✅ VERCEL: Workflow step updated successfully');
    
    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('VERCEL: Workflow update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workflow step'
    });
  }
});

// ============== DASHBOARD ROUTES ==============

// Get dashboard data
app.get('/api/dashboard', authenticateToken, (req, res) => {
  try {
    const totalProjects = DATABASE.projects.length;
    const activeProjects = DATABASE.projects.filter(p => p.status === 'in-progress').length;
    const totalTasks = DATABASE.tasks.length;
    const pendingTasks = DATABASE.tasks.filter(t => t.status === 'pending').length;
    const completedTasks = DATABASE.tasks.filter(t => t.status === 'completed').length;
    
    // Recent activities
    const recentActivities = DATABASE.activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // Upcoming tasks
    const upcomingTasks = DATABASE.tasks
      .filter(t => t.status !== 'completed' && t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    res.json({
      success: true,
      dashboard: {
        stats: {
          totalProjects,
          activeProjects,
          totalTasks,
          pendingTasks,
          completedTasks
        },
        recentActivities,
        upcomingTasks
      }
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// ============== HEALTH CHECK ==============

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'KenStruction API is running',
    timestamp: new Date().toISOString(),
    database: 'In-Memory Storage',
    status: 'healthy'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'KenStruction API - Working Database Solution',
    endpoints: [
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me',
      'GET /api/auth/profile',
      'GET /api/projects',
      'POST /api/projects',
      'GET /api/projects/:id',
      'GET /api/tasks',
      'POST /api/tasks',
      'GET /api/activities',
      'GET /api/customers',
      'POST /api/customers',
      'PUT /api/customers/:id',
      'DELETE /api/customers/:id',
      'GET /api/users',
      'GET /api/alerts',
      'POST /api/alerts',
      'PATCH /api/alerts/:id/status',
      'POST /api/workflows/:workflowId/steps/:stepId/complete',
      'GET /api/workflows/project/:projectId',
      'PUT /api/workflows/project/:projectId/workflow/:stepId',
      'GET /api/dashboard',
      'GET /api/health'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path
  });
});

module.exports = app; 