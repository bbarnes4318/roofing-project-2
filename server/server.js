console.log('🚀 Starting Kenstruction server...');
console.log(`📅 Startup time: ${new Date().toISOString()}`);

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

const xss = require('xss-clean');
// Load environment variables with robust fallbacks
try {
  const fs = require('fs');
  const path = require('path');
  const dotenv = require('dotenv');
  // Always try to load local .env files if present to support dev and containerized environments
  const tried = [];
  const tryConfig = (p) => {
    if (p && fs.existsSync(p)) {
      dotenv.config({ path: p });
      tried.push(p);
    }
  };
  // Default resolution (nearest .env)
  dotenv.config();
  // Explicit server/.env and repo root .env
  tryConfig(path.resolve(__dirname, '.env'));
  tryConfig(path.resolve(__dirname, '..', '.env'));
  if (tried.length > 0) {
    console.log(`🧪 Loaded environment from: ${tried.join(', ')}`);
  } else {
    console.log('🔒 Using platform environment variables');
  }
} catch (e) {
  // Safe fallback: do nothing if load fails
}

console.log('✅ Required modules loaded successfully');

// Import database connection
const { connectDatabase, prisma } = require('./config/prisma');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const activityRoutes = require('./routes/activities'); // Re-added - now uses Message model
const messageRoutes = require('./routes/messages');
const projectMessageRoutes = require('./routes/projectMessages');
const documentRoutes = require('./routes/documents');
const calendarRoutes = require('./routes/calendar');
const aiRoutes = require('./routes/ai');
let bubblesRoutes;
try {
  bubblesRoutes = require('./routes/bubbles');
  console.log('✅ SERVER: Bubbles routes loaded successfully');
} catch (error) {
  console.error('⚠️ SERVER: Failed to load Bubbles routes:', error?.message || error);
}
const healthRoutes = require('./routes/health');
const debugRoutes = require('./routes/debug');
const customerRoutes = require('./routes/customers');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const workflowDataRoutes = require('./routes/workflow-data');
const excelDataRoutes = require('./routes/excelDataManager');
const completeExcelDataRoutes = require('./routes/completeExcelDataManager');

let workflowRoutes;
try {
  console.log('🔧 SERVER: Loading workflow routes...');
  workflowRoutes = require('./routes/workflow');
  console.log('✅ SERVER: Workflow routes loaded successfully');
} catch (error) {
  console.error('❌ SERVER: Failed to load workflow routes:', error);
  console.error('❌ SERVER: Error details:', error.message);
  console.error('❌ SERVER: Stack:', error.stack);
}

const alertRoutes = require('./routes/alerts').router;
// const workflowUpdateRoutes = require('./routes/workflowUpdates'); // REMOVED - legacy route deleted
const phaseOverrideRoutes = require('./routes/phaseOverride');
const roleRoutes = require('./routes/roles');
const onboardingRoutes = require('./routes/onboarding');

// Try to load workflow import routes (requires xlsx, csv-parse, multer)
let workflowImportRoutes;
try {
  console.log('🔧 SERVER: Loading workflow import routes...');
  workflowImportRoutes = require('./routes/workflowImport');
  console.log('✅ SERVER: Workflow import routes loaded successfully');
} catch (error) {
  console.error('⚠️ SERVER: Workflow import routes not available:', error.message);
  console.log('⚠️ SERVER: Workflow import functionality will be disabled');
}

// Try to load project import routes (requires xlsx, csv-parser, multer)
let projectImportRoutes;
try {
  console.log('🔧 SERVER: Loading project import routes...');
  projectImportRoutes = require('./routes/projectImport');
  console.log('✅ SERVER: Project import routes loaded successfully');
} catch (error) {
  console.error('⚠️ SERVER: Project import routes not available:', error.message);
  console.log('⚠️ SERVER: Project import functionality will be disabled');
}

// Import services
const AlertCacheService = require('./services/AlertCacheService');

// Initialize Express app
global.__DB_CONNECTED__ = false;
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io globally available for services
global.io = io;
app.set('io', io);

// Connect to PostgreSQL with better error handling
connectDatabase()
  .then(() => {
    global.__DB_CONNECTED__ = true;
    console.log('✅ Database connection established, initializing services...');
    
    // Initialize services after database connection
    setTimeout(() => {
      try {
        // Initialize Alert Cache Service
        console.log('📦 Initializing Alert Cache Service...');
        global.alertCache = AlertCacheService;
        
        // Warm up cache with frequently accessed data
        AlertCacheService.warmUpCache(prisma).then(() => {
          console.log('✅ Alert cache warmed up');
        });
        
        console.log('🚨 WorkflowAlertService ENABLED - PostgreSQL migration complete');
        
        // Start the Alert Scheduler for workflow alerts
        console.log('⏰ Alert Scheduler ENABLED - PostgreSQL migration complete');
        try {
          const alertScheduler = require('./services/AlertSchedulerService');
          alertScheduler.start();
        } catch (schedErr) {
          console.warn('⚠️ Alert Scheduler not started:', schedErr?.message || schedErr);
        }
      } catch (error) {
        console.error('❌ Failed to initialize alert services:', error.message);
        // Don't exit - continue without alert services if needed
      }
    }, 2000);
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Error details:', error);
    global.__DB_CONNECTED__ = false;
    // Continue startup without database for debugging
    console.log('⚠️  Continuing startup without database connection...');
  });

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://sc.lfeeder.com",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"]
    }
  } : undefined,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
});

// app.use('/api/auth', authLimiter);
// app.use(limiter); // Temporarily disabled for debugging

// CORS configuration (temporarily permissive to stop CORS issues)
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));



// Data sanitization against XSS
app.use(xss());

// Socket.IO authentication middleware (accept demo tokens for dev)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    // Demo token bypass (matches HTTP middleware behavior)
    if (token.startsWith('demo-david-chen-token-')) {
      socket.userId = 'cmei0o5k50000um0867bwnhzu';
      socket.userRole = 'MANAGER';
      return next();
    }
    if (token.startsWith('demo-sarah-owner-token-')) {
      socket.userId = 'demo-sarah-owner-id';
      socket.userRole = 'ADMIN';
      return next();
    }
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log(`🔌 User ${socket.userId} connected`);
  
  // Join user to their personal room
  socket.join(`user_${socket.userId}`);
  
  // Auto-join user to their project rooms based on their projects - TEMPORARILY DISABLED
  try {
    // DISABLED DURING POSTGRESQL MIGRATION
    console.log(`👥 Socket.io project auto-join DISABLED during PostgreSQL migration`);
    
    // const User = require('./models/User');
    // const Project = require('./models/Project');
    
    // const user = await User.findById(socket.userId);
    // if (user) {
    //   // Find all projects where user is a team member or project manager
    //   const userProjects = await Project.find({
    //     $or: [
    //       { teamMembers: socket.userId },
    //       { projectManager: socket.userId }
    //     ]
    //   }).select('_id projectName');
    //   
    //   // Join all project rooms
    //   userProjects.forEach(project => {
    //     socket.join(`project_${project._id}`);
    //     console.log(`👥 User ${socket.userId} auto-joined project ${project.projectName}`);
    //   });
    //   
    //   // Store user projects in socket for easy access
    //   socket.userProjects = userProjects.map(p => p._id.toString());
    // }
  } catch (error) {
    console.error('Error auto-joining user to projects:', error);
  }
  
  // 📨 SENDMESSAGE: Handle real-time messaging
  socket.on('sendMessage', async (data) => {
    try {
      const { conversationId, message, projectId, recipientId } = data;
      
      // Validate message data
      if (!message || !message.trim()) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }
      
      // Create message object
      const messageData = {
        conversationId,
        sender: socket.userId,
        text: message.trim(),
        timestamp: new Date(),
        projectId,
        recipientId
      };
      
      // Broadcast to conversation participants
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('newMessage', messageData);
      }
      
      // Broadcast to project room if it's a project message
      if (projectId) {
        socket.to(`project_${projectId}`).emit('newMessage', messageData);
      }
      
      // Send to specific recipient if it's a direct message
      if (recipientId) {
        socket.to(`user_${recipientId}`).emit('newMessage', messageData);
      }
      
      // Confirm message sent
      socket.emit('messageSent', { 
        success: true, 
        messageId: messageData.timestamp.getTime(),
        timestamp: messageData.timestamp 
      });
      
      console.log(`💬 Message sent by user ${socket.userId} to ${conversationId || projectId || recipientId}`);
      
    } catch (error) {
      console.error('Error handling sendMessage:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // 🔔 NOTIFICATION: Handle real-time notifications
  socket.on('notification', async (data) => {
    try {
      const { type, message, targetUserId, projectId, priority = 'medium', link, data: notificationData } = data;
      
      // Validate notification data
      if (!message || !targetUserId) {
        socket.emit('error', { message: 'Notification message and target user are required' });
        return;
      }
      
      // Create notification object
      const notification = {
        id: Date.now(),
        type: type || 'other',
        message,
        priority,
        link,
        data: notificationData,
        fromUserId: socket.userId,
        timestamp: new Date(),
        isRead: false
      };
      
      // Send notification to target user
      socket.to(`user_${targetUserId}`).emit('newNotification', notification);
      
      // Also broadcast to project room if it's project-related
      if (projectId) {
        socket.to(`project_${projectId}`).emit('projectNotification', {
          ...notification,
          projectId
        });
      }
      
      // Confirm notification sent
      socket.emit('notificationSent', { 
        success: true, 
        notificationId: notification.id,
        targetUserId 
      });
      
      console.log(`🔔 Notification sent by user ${socket.userId} to user ${targetUserId}`);
      
    } catch (error) {
      console.error('Error handling notification:', error);
      socket.emit('error', { message: 'Failed to send notification' });
    }
  });
  
  // 🏗️ PROJECTUPDATE: Handle project updates and progress changes
  socket.on('projectUpdate', async (data) => {
    try {
      const { projectId, updateType, updateData, progress, status } = data;
      
      // Validate project update data
      if (!projectId || !updateType) {
        socket.emit('error', { message: 'Project ID and update type are required' });
        return;
      }
      
      // Create project update object
      const projectUpdate = {
        projectId,
        updateType, // 'progress', 'status', 'task_added', 'task_completed', 'team_member_added', etc.
        updateData,
        progress,
        status,
        updatedBy: socket.userId,
        timestamp: new Date()
      };
      
      // Broadcast to all users in the project room
      socket.to(`project_${projectId}`).emit('projectUpdated', projectUpdate);
      
      // Special handling for progress updates
      if (updateType === 'progress' && progress !== undefined) {
        socket.to(`project_${projectId}`).emit('progressUpdated', {
          projectId,
          progress,
          updatedBy: socket.userId,
          timestamp: new Date()
        });
      }
      
      // Special handling for status updates
      if (updateType === 'status' && status) {
        socket.to(`project_${projectId}`).emit('statusUpdated', {
          projectId,
          status,
          updatedBy: socket.userId,
          timestamp: new Date()
        });
      }
      
      // Confirm update sent
      socket.emit('projectUpdateSent', { 
        success: true, 
        projectId,
        updateType 
      });
      
      console.log(`🏗️ Project update (${updateType}) sent by user ${socket.userId} for project ${projectId}`);
      
    } catch (error) {
      console.error('Error handling projectUpdate:', error);
      socket.emit('error', { message: 'Failed to send project update' });
    }
  });
  
  // 🏠 Join/Leave Project Rooms
  socket.on('join_project', (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`👥 User ${socket.userId} joined project ${projectId}`);
    
    // Notify other project members
    socket.to(`project_${projectId}`).emit('userJoinedProject', {
      userId: socket.userId,
      projectId,
      timestamp: new Date()
    });
  });
  
  socket.on('leave_project', (projectId) => {
    socket.leave(`project_${projectId}`);
    console.log(`👋 User ${socket.userId} left project ${projectId}`);
    
    // Notify other project members
    socket.to(`project_${projectId}`).emit('userLeftProject', {
      userId: socket.userId,
      projectId,
      timestamp: new Date()
    });
  });
  
  // 💬 Join/Leave Conversation Rooms
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`💬 User ${socket.userId} joined conversation ${conversationId}`);
  });
  
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`💬 User ${socket.userId} left conversation ${conversationId}`);
  });
  
  // 📝 Task Updates
  socket.on('task_update', (data) => {
    const { projectId, taskId, updateType, updateData } = data;
    
    // Broadcast to project room
    socket.to(`project_${projectId}`).emit('taskUpdated', {
      taskId,
      updateType,
      updateData,
      updatedBy: socket.userId,
      timestamp: new Date()
    });
    
    console.log(`📝 Task update (${updateType}) sent by user ${socket.userId} for task ${taskId}`);
  });
  
  // 📊 Activity Updates
  socket.on('activity_update', (data) => {
    const { projectId, activityType, activityData } = data;
    
    // Broadcast to project room
    socket.to(`project_${projectId}`).emit('newActivity', {
      activityType,
      activityData,
      userId: socket.userId,
      timestamp: new Date()
    });
    
    console.log(`📊 Activity update (${activityType}) sent by user ${socket.userId} for project ${projectId}`);
  });
  
  // 📄 Document Updates
  socket.on('document_update', (data) => {
    const { projectId, documentId, updateType, documentData } = data;
    
    // Broadcast to project room
    socket.to(`project_${projectId}`).emit('documentUpdated', {
      documentId,
      updateType,
      documentData,
      updatedBy: socket.userId,
      timestamp: new Date()
    });
    
    console.log(`📄 Document update (${updateType}) sent by user ${socket.userId} for project ${projectId}`);
  });
  
  // 👤 User Status Updates
  socket.on('user_status_update', (data) => {
    const { status, projectId } = data; // status: 'online', 'offline', 'busy', 'away'
    
    // Broadcast to all user's project rooms
    if (socket.userProjects) {
      socket.userProjects.forEach(projId => {
        socket.to(`project_${projId}`).emit('userStatusChanged', {
          userId: socket.userId,
          status,
          timestamp: new Date()
        });
      });
    }
    
    // Also broadcast to specific project if provided
    if (projectId) {
      socket.to(`project_${projectId}`).emit('userStatusChanged', {
        userId: socket.userId,
        status,
        timestamp: new Date()
      });
    }
    
    console.log(`👤 User ${socket.userId} status updated to ${status}`);
  });
  
  // 🔄 Typing Indicators
  socket.on('typing_start', (data) => {
    const { conversationId, projectId } = data;
    
    if (conversationId) {
      socket.to(`conversation_${conversationId}`).emit('userTyping', {
        userId: socket.userId,
        isTyping: true,
        timestamp: new Date()
      });
    }
    
    if (projectId) {
      socket.to(`project_${projectId}`).emit('userTyping', {
        userId: socket.userId,
        isTyping: true,
        timestamp: new Date()
      });
    }
  });
  
  socket.on('typing_stop', (data) => {
    const { conversationId, projectId } = data;
    
    if (conversationId) {
      socket.to(`conversation_${conversationId}`).emit('userTyping', {
        userId: socket.userId,
        isTyping: false,
        timestamp: new Date()
      });
    }
    
    if (projectId) {
      socket.to(`project_${projectId}`).emit('userTyping', {
        userId: socket.userId,
        isTyping: false,
        timestamp: new Date()
      });
    }
  });
  
  // 🔌 Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User ${socket.userId} disconnected`);
    
    // Notify all project rooms that user went offline
    if (socket.userProjects) {
      socket.userProjects.forEach(projectId => {
        socket.to(`project_${projectId}`).emit('userStatusChanged', {
          userId: socket.userId,
          status: 'offline',
          timestamp: new Date()
        });
      });
    }
  });
  
  // 🚨 Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
    socket.emit('error', { message: 'Socket connection error' });
  });
});

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes); // Re-added - now uses Message model
app.use('/api/messages', messageRoutes);
app.use('/api/project-messages', projectMessageRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/calendar-events', calendarRoutes);
app.use('/api/notifications', notificationRoutes);
if (workflowRoutes) {
  app.use('/api/workflows', workflowRoutes);
  console.log('✅ SERVER: Workflow routes registered at /api/workflows');
} else {
  console.error('❌ SERVER: Workflow routes not registered due to loading error');
}
app.use('/api/alerts', alertRoutes);
app.use('/api/ai', aiRoutes);
if (bubblesRoutes) {
  app.use('/api/bubbles', bubblesRoutes);
} else {
  console.warn('⚠️ SERVER: Bubbles routes not mounted');
}
// app.use('/api/workflow-updates', workflowUpdateRoutes); // REMOVED - legacy route deleted
app.use('/api/phase-override', phaseOverrideRoutes);
if (workflowImportRoutes) {
  app.use('/api/workflow-import', workflowImportRoutes);
  console.log('✅ SERVER: Workflow import routes registered at /api/workflow-import');
} else {
  console.log('⚠️ SERVER: Workflow import routes not registered due to missing dependencies');
}
if (projectImportRoutes) {
  app.use('/api/project-import', projectImportRoutes);
  console.log('✅ SERVER: Project import routes registered at /api/project-import');
} else {
  console.log('⚠️ SERVER: Project import routes not registered due to missing dependencies');
}
app.use('/api/search', searchRoutes);
app.use('/api/workflow-data', workflowDataRoutes);
app.use('/api/excel-data', excelDataRoutes);
app.use('/api/complete-excel-data', completeExcelDataRoutes);
app.use('/api/roles', roleRoutes);

// Legacy route fallbacks for frontend requests missing /api prefix
// Redirect to proper /api endpoints
app.get('/projects*', (req, res) => {
  res.redirect(301, `/api${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
});

app.get('/customers*', (req, res) => {
  res.redirect(301, `/api${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
});

app.get('/alerts*', (req, res) => {
  res.redirect(301, `/api${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
});

app.get('/activities*', (req, res) => {
  res.redirect(301, `/api${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
});

app.get('/auth/me', (req, res) => {
  res.redirect(301, `/api${req.path}`);
});

app.get('/users/team-members', (req, res) => {
  res.redirect(301, `/api${req.path}`);
});

app.get('/bubbles/status', (req, res) => {
  res.redirect(301, `/api${req.path}`);
});

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
  
  // Determine React build location (support multiple layouts)
  const candidatePaths = [
    path.join(__dirname, 'public'),           // server/public (if copied during build)
    path.join(__dirname, '..', 'build'),      // root/build (CRA default)
    path.join(process.cwd(), 'build')         // cwd/build fallback
  ];
  const buildPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
  
  console.log('🏗️ Server directory:', __dirname);
  console.log('🏗️ Build path candidates:', candidatePaths);
  console.log('🏗️ Selected build path:', buildPath);
  console.log('🏗️ Build exists?', fs.existsSync(buildPath));
  
  // List files in /app to see what's actually there
  if (fs.existsSync('/app')) {
    console.log('📁 Files in /app:', fs.readdirSync('/app').filter(f => !f.startsWith('.')));
  }
  
  // Serve static files from React build with cache control to reduce revalidation
  app.use(express.static(buildPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        // Long cache for fingerprinted assets
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('index.html')) {
        // No-cache for HTML entry
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  
  // Serve React app for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ 
        error: 'React build not found',
        searchedPath: indexPath,
        currentDir: __dirname
      });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'API is running in development mode' });
  });
}

// Demo endpoint for adding alerts (no authentication required for demo purposes)
app.post('/api/demo/add-alerts', async (req, res) => {
  try {
    const { alerts } = req.body;
    
    if (!alerts || !Array.isArray(alerts)) {
      return res.status(400).json({
        success: false,
        message: 'Alerts array is required'
      });
    }
    
    // DISABLED DURING POSTGRESQL MIGRATION
    console.log('Demo alerts endpoint DISABLED during PostgreSQL migration');
    return res.status(503).json({
      success: false,
      message: 'Demo alerts temporarily disabled during PostgreSQL migration'
    });
    
  } catch (error) {
    console.error('Demo alerts creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create demo alerts',
      error: error.message
    });
  }
});

// Root endpoint (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.json({
      message: '🏗️ Kenstruction API Server',
      version: '1.0.0',
      status: 'active',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });
}

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Kenstruction API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      projects: '/api/projects',
      customers: '/api/customers',
      tasks: '/api/tasks',
      activities: '/api/activities',
      messages: '/api/messages',
      documents: '/api/documents',
      calendar: '/api/calendar-events',
      notifications: '/api/notifications',
      ai: '/api/ai',
      health: '/api/health'
    }
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Global error handlers
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error('🔍 Stack:', err.stack);
  // Log but don't exit in production - let the container restart if needed
  if (process.env.NODE_ENV !== 'production') {
    server.close(() => {
      process.exit(1);
    });
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('🔍 Stack:', err.stack);
  // Log but don't exit in production - let the container restart if needed
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Start overdue alert scheduler
const OverdueAlertService = require('./services/OverdueAlertService');
OverdueAlertService.startOverdueAlertScheduler(30); // Check every 30 minutes

// Start server with comprehensive logging
const PORT = process.env.PORT || 8080;
console.log(`🔧 Debug: PORT from env = ${process.env.PORT}, final PORT = ${PORT}`);
console.log(`🔧 Debug: NODE_ENV = ${process.env.NODE_ENV}`);
console.log(`🔧 Debug: DATABASE_URL present = ${!!process.env.DATABASE_URL}`);
console.log(`🔧 Debug: JWT_SECRET present = ${!!process.env.JWT_SECRET}`);

server.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
  
  console.log(`🚀 Kenstruction server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://0.0.0.0:${PORT}/api`);
  console.log(`📡 Socket.IO server ready for real-time connections`);
  console.log(`✅ Server startup completed successfully`);
});

// Add server error handling
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
});

module.exports = { app, server, io };