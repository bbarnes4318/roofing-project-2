const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

const xss = require('xss-clean');
require('dotenv').config();

// Import database connection
const { connectDatabase } = require('./config/prisma');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const activityRoutes = require('./routes/activities');
const messageRoutes = require('./routes/messages');
const documentRoutes = require('./routes/documents');
const calendarRoutes = require('./routes/calendar');
const aiRoutes = require('./routes/ai');
const healthRoutes = require('./routes/health');
const customerRoutes = require('./routes/customers');
const notificationRoutes = require('./routes/notifications');

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
const testRoutes = require('./routes/test');
const workflowUpdateRoutes = require('./routes/workflowUpdates');

// Import services - TEMPORARILY DISABLED FOR POSTGRESQL MIGRATION
// const WorkflowAlertService = require('./services/WorkflowAlertService');
// const AlertSchedulerService = require('./services/AlertSchedulerService');

// Initialize Express app
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

// Connect to PostgreSQL
connectDatabase().catch(console.error);

// Initialize WorkflowAlertService after database connection
setTimeout(() => {
  console.log('🚨 WorkflowAlertService ENABLED - PostgreSQL migration complete');
  
  // Start the Alert Scheduler for workflow alerts
  console.log('⏰ Alert Scheduler ENABLED - PostgreSQL migration complete');
  const alertScheduler = require('./services/AlertSchedulerService');
  alertScheduler.start();
}, 2000);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
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

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8000', // Add port 8000 for React dev server
      'https://kenstruction.vercel.app'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  } : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

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

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/messages', messageRoutes);
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
app.use('/api/test', testRoutes);
app.use('/api/workflow-updates', workflowUpdateRoutes);

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
  
  // Dockerfile copies React build to /app/public
  const buildPath = '/app/public';
  
  console.log('🏗️ Server directory:', __dirname);
  console.log('🏗️ Build path:', buildPath);
  console.log('🏗️ Build exists?', fs.existsSync(buildPath));
  
  // List files in /app to see what's actually there
  if (fs.existsSync('/app')) {
    console.log('📁 Files in /app:', fs.readdirSync('/app').filter(f => !f.startsWith('.')));
  }
  
  // Serve static files from React build
  app.use(express.static(buildPath));
  
  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🏗️ Kenstruction API Server',
    version: '1.0.0',
    status: 'active',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

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
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('🔍 Stack:', err.stack);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
console.log(`🔧 Debug: PORT from env = ${process.env.PORT}, final PORT = ${PORT}`);
server.listen(PORT, () => {
  console.log(`🚀 Kenstruction server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📡 Socket.IO server ready for real-time connections`);
});

module.exports = { app, server, io };