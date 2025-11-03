/**
 * Bubbles Context Routes - Comprehensive Data Access Endpoints
 * 
 * These routes provide Bubbles AI with complete access to all application data.
 * Import and mount these in server.js: app.use('/api/bubbles/context', require('./routes/bubbles-context'));
 */

const express = require('express');
const {
  asyncHandler,
  sendSuccess,
  AppError
} = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const bubblesContextService = require('../services/BubblesContextService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @desc    Get comprehensive project context with ALL data
 * @route   GET /api/bubbles/context/project/:projectId
 * @access  Private
 */
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  const summary = await bubblesContextService.getProjectSummary(projectId);
  
  if (!summary) {
    throw new AppError('Project not found', 404);
  }
  
  sendSuccess(res, 200, {
    ...summary,
    generatedAt: new Date()
  }, 'Comprehensive project context retrieved');
}));

/**
 * @desc    Get recent activity across entire application
 * @route   GET /api/bubbles/context/activity
 * @access  Private
 */
router.get('/activity', asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;
  const userId = req.query.userId || req.user.id;
  
  const activity = await bubblesContextService.getRecentActivity(parseInt(limit), userId);
  
  sendSuccess(res, 200, {
    activity,
    count: activity.length,
    generatedAt: new Date()
  }, 'Recent activity retrieved');
}));

/**
 * @desc    Get all projects with filters
 * @route   GET /api/bubbles/context/projects
 * @access  Private
 */
router.get('/projects', asyncHandler(async (req, res) => {
  const { status, phase, projectManagerId, customerId, projectNumber, search, limit } = req.query;
  
  const projects = await bubblesContextService.getAllProjects({
    status,
    phase,
    projectManagerId,
    customerId,
    projectNumber,
    search,
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    projects,
    count: projects.length,
    generatedAt: new Date()
  }, 'Projects retrieved');
}));

/**
 * @desc    Get all customers with filters
 * @route   GET /api/bubbles/context/customers
 * @access  Private
 */
router.get('/customers', asyncHandler(async (req, res) => {
  const { search, limit } = req.query;
  
  const customers = await bubblesContextService.getAllCustomers({
    search,
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    customers,
    count: customers.length,
    generatedAt: new Date()
  }, 'Customers retrieved');
}));

/**
 * @desc    Get all users with filters
 * @route   GET /api/bubbles/context/users
 * @access  Private
 */
router.get('/users', asyncHandler(async (req, res) => {
  const { role, search, limit } = req.query;
  
  const users = await bubblesContextService.getAllUsers({
    role,
    search,
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    users,
    count: users.length,
    generatedAt: new Date()
  }, 'Users retrieved');
}));

/**
 * @desc    Get all tasks with full context
 * @route   GET /api/bubbles/context/tasks
 * @access  Private
 */
router.get('/tasks', asyncHandler(async (req, res) => {
  const { projectId, assignedToId, status, priority, category, overdue, upcoming, limit } = req.query;
  
  const tasks = await bubblesContextService.getAllTasks({
    projectId,
    assignedToId: assignedToId || req.user.id,
    status,
    priority,
    category,
    overdue: overdue === 'true',
    upcoming: upcoming === 'true',
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    tasks,
    count: tasks.length,
    generatedAt: new Date()
  }, 'Tasks retrieved with context');
}));

/**
 * @desc    Get all reminders/calendar events
 * @route   GET /api/bubbles/context/reminders
 * @access  Private
 */
router.get('/reminders', asyncHandler(async (req, res) => {
  const { projectId, upcoming, past, eventType, status, limit } = req.query;
  
  const reminders = await bubblesContextService.getAllReminders({
    projectId,
    organizerId: req.query.organizerId || req.user.id,
    upcoming: upcoming === 'true',
    past: past === 'true',
    eventType,
    status,
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    reminders,
    count: reminders.length,
    generatedAt: new Date()
  }, 'Reminders retrieved');
}));

/**
 * @desc    Get all emails with tracking data
 * @route   GET /api/bubbles/context/emails
 * @access  Private
 */
router.get('/emails', asyncHandler(async (req, res) => {
  const { projectId, customerId, status, emailType, limit } = req.query;
  
  const emails = await bubblesContextService.getAllEmails({
    projectId,
    customerId,
    senderId: req.query.senderId || req.user.id,
    status,
    emailType,
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    emails,
    count: emails.length,
    generatedAt: new Date()
  }, 'Emails retrieved');
}));

/**
 * @desc    Get all messages with context
 * @route   GET /api/bubbles/context/messages
 * @access  Private
 */
router.get('/messages', asyncHandler(async (req, res) => {
  const { projectId, messageType, priority, search, limit } = req.query;
  
  const messages = await bubblesContextService.getAllMessages({
    projectId,
    authorId: req.query.authorId || req.user.id,
    messageType,
    priority,
    search,
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    messages,
    count: messages.length,
    generatedAt: new Date()
  }, 'Messages retrieved');
}));

/**
 * @desc    Get all workflow alerts
 * @route   GET /api/bubbles/context/alerts
 * @access  Private
 */
router.get('/alerts', asyncHandler(async (req, res) => {
  const { projectId, status, priority, overdue, assignedToId, limit } = req.query;
  
  const alerts = await bubblesContextService.getAllAlerts({
    projectId,
    assignedToId: assignedToId || req.user.id,
    status: status || 'ACTIVE',
    priority,
    overdue: overdue === 'true',
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    alerts,
    count: alerts.length,
    generatedAt: new Date()
  }, 'Alerts retrieved');
}));

/**
 * @desc    Get all documents (project docs + company assets)
 * @route   GET /api/bubbles/context/documents
 * @access  Private
 */
router.get('/documents', asyncHandler(async (req, res) => {
  const { projectId, limit } = req.query;
  
  const documents = await bubblesContextService.getAllDocuments({ 
    projectId,
    limit: limit ? parseInt(limit) : undefined
  });
  
  sendSuccess(res, 200, {
    ...documents,
    totalDocuments: documents.projectDocuments.length + documents.companyAssets.length,
    generatedAt: new Date()
  }, 'Documents retrieved');
}));

/**
 * @desc    Get comprehensive customer context
 * @route   GET /api/bubbles/context/customer/:customerId
 * @access  Private
 */
router.get('/customer/:customerId', asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  
  const summary = await bubblesContextService.getCustomerSummary(customerId);
  
  if (!summary) {
    throw new AppError('Customer not found', 404);
  }
  
  sendSuccess(res, 200, {
    ...summary,
    generatedAt: new Date()
  }, 'Customer context retrieved');
}));

/**
 * @desc    Get user context and assignments
 * @route   GET /api/bubbles/context/user/:userId?
 * @access  Private
 */
router.get('/user/:userId?', asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user.id;
  
  const userContext = await bubblesContextService.getUserContext(userId);
  
  if (!userContext) {
    throw new AppError('User not found', 404);
  }
  
  const workload = await bubblesContextService.getUserWorkload(userId);
  
  sendSuccess(res, 200, {
    user: userContext,
    workload,
    generatedAt: new Date()
  }, 'User context retrieved');
}));

/**
 * @desc    Search across all application data
 * @route   GET /api/bubbles/context/search
 * @access  Private
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, query } = req.query;
  const searchQuery = q || query;
  
  if (!searchQuery || searchQuery.trim().length === 0) {
    throw new AppError('Search query is required', 400);
  }
  
  const results = await bubblesContextService.searchAllData(searchQuery);
  
  sendSuccess(res, 200, {
    query: searchQuery,
    results,
    generatedAt: new Date()
  }, 'Search completed');
}));

/**
 * @desc    Get application insights and patterns
 * @route   GET /api/bubbles/context/insights
 * @access  Private
 */
router.get('/insights', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const insights = await bubblesContextService.getInsights(userId);
  
  sendSuccess(res, 200, insights, 'Application insights retrieved');
}));

/**
 * @desc    Get comprehensive application state for Bubbles AI
 *          This endpoint gives Bubbles a complete snapshot of everything
 * @route   GET /api/bubbles/context/snapshot
 * @access  Private
 */
router.get('/snapshot', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.query;
  
  // Gather comprehensive snapshot with individual error handling
  let insights, recentActivity, userContext, userWorkload, projectSummary, tasks, alerts, reminders;
  
  try {
    insights = await bubblesContextService.getInsights(userId);
  } catch (err) {
    console.error('❌ getInsights failed:', err.message);
    insights = { summary: { totalProjects: 0, activeProjects: 0, overdueTasks: 0, upcomingReminders: 0, activeAlerts: 0 } };
  }
  
  try {
    recentActivity = await bubblesContextService.getRecentActivity(20, userId);
  } catch (err) {
    console.error('❌ getRecentActivity failed:', err.message);
    recentActivity = [];
  }
  
  try {
    userContext = await bubblesContextService.getUserContext(userId);
    userWorkload = await bubblesContextService.getUserWorkload(userId);
  } catch (err) {
    console.error('❌ getUserContext/getUserWorkload failed:', err.message);
    throw err; // This one is critical
  }
  
  try {
    projectSummary = projectId ? await bubblesContextService.getProjectSummary(projectId) : null;
  } catch (err) {
    console.error('❌ getProjectSummary failed:', err.message);
    projectSummary = null;
  }
  
  try {
    tasks = await bubblesContextService.getAllTasks({ assignedToId: userId, status: 'TO_DO', limit: 10 });
  } catch (err) {
    console.error('❌ getAllTasks failed:', err.message);
    tasks = [];
  }
  
  try {
    alerts = await bubblesContextService.getAllAlerts({ assignedToId: userId, status: 'ACTIVE', limit: 10 });
  } catch (err) {
    console.error('❌ getAllAlerts failed:', err.message);
    alerts = [];
  }
  
  try {
    reminders = await bubblesContextService.getAllReminders({ organizerId: userId, upcoming: true, limit: 10 });
  } catch (err) {
    console.error('❌ getAllReminders failed:', err.message);
    reminders = [];
  }
  
  sendSuccess(res, 200, {
    snapshot: {
      insights,
      recentActivity,
      user: {
        ...userContext,
        workload: userWorkload
      },
      currentProject: projectSummary,
      pendingWork: {
        tasks: tasks.slice(0, 10),
        alerts: alerts.slice(0, 10),
        reminders: reminders.slice(0, 10)
      }
    },
    generatedAt: new Date(),
    message: 'Bubbles AI has complete application awareness'
  }, 'Application snapshot retrieved');
}));

module.exports = router;
