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
  const context = await bubblesContextService.getProjectContext(projectId);
  
  if (!context) {
    throw new AppError('Project not found', 404);
  }

  sendSuccess(res, 200, {
    project: context,
    incompleteItems: await bubblesContextService.getIncompleteWorkflowItems(projectId),
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
  const userId = req.user.id;
  
  const activity = await bubblesContextService.getRecentActivity(parseInt(limit), userId);
  
  sendSuccess(res, 200, {
    activity,
    count: activity.length,
    generatedAt: new Date()
  }, 'Recent activity retrieved');
}));

/**
 * @desc    Get all tasks with full context
 * @route   GET /api/bubbles/context/tasks
 * @access  Private
 */
router.get('/tasks', asyncHandler(async (req, res) => {
  const { projectId, assignedToId, status, priority } = req.query;
  
  const tasks = await bubblesContextService.getAllTasks({
    projectId,
    assignedToId: assignedToId || req.user.id,
    status,
    priority
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
  const { projectId, upcoming } = req.query;
  
  const reminders = await bubblesContextService.getAllReminders({
    projectId,
    organizerId: req.user.id,
    upcoming: upcoming === 'true'
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
  const { projectId, customerId, status } = req.query;
  
  const emails = await bubblesContextService.getAllEmails({
    projectId,
    customerId,
    senderId: req.user.id,
    status
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
  const { projectId, messageType } = req.query;
  
  const messages = await bubblesContextService.getAllMessages({
    projectId,
    authorId: req.user.id,
    messageType
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
  const { projectId, status, priority } = req.query;
  
  const alerts = await bubblesContextService.getAllAlerts({
    projectId,
    assignedToId: req.user.id,
    status: status || 'ACTIVE',
    priority
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
  const { projectId } = req.query;
  
  const documents = await bubblesContextService.getAllDocuments({ projectId });
  
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
  
  const customer = await bubblesContextService.getCustomerContext(customerId);
  
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  
  sendSuccess(res, 200, {
    customer,
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
  
  sendSuccess(res, 200, {
    user: userContext,
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
  
  const results = await bubblesContextService.searchAll(searchQuery);
  
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
  let insights, recentActivity, userContext, projectContext, tasks, alerts, reminders;
  
  try {
    insights = await bubblesContextService.getInsights(userId);
  } catch (err) {
    console.error('❌ getInsights failed:', err.message);
    insights = { summary: { totalProjects: 0, activeProjects: 0, overdueTasks: 0, upcomingReminders: 0, activeAlerts: 0 }, recentActivity: [] };
  }
  
  try {
    recentActivity = await bubblesContextService.getRecentActivity(20, userId);
  } catch (err) {
    console.error('❌ getRecentActivity failed:', err.message);
    recentActivity = [];
  }
  
  try {
    userContext = await bubblesContextService.getUserContext(userId);
  } catch (err) {
    console.error('❌ getUserContext failed:', err.message);
    throw err; // This one is critical
  }
  
  try {
    projectContext = projectId ? await bubblesContextService.getProjectContext(projectId) : null;
  } catch (err) {
    console.error('❌ getProjectContext failed:', err.message);
    projectContext = null;
  }
  
  try {
    tasks = await bubblesContextService.getAllTasks({ assignedToId: userId, status: 'TO_DO' });
  } catch (err) {
    console.error('❌ getAllTasks failed:', err.message);
    tasks = [];
  }
  
  try {
    alerts = await bubblesContextService.getAllAlerts({ assignedToId: userId, status: 'ACTIVE' });
  } catch (err) {
    console.error('❌ getAllAlerts failed:', err.message);
    alerts = [];
  }
  
  try {
    reminders = await bubblesContextService.getAllReminders({ organizerId: userId, upcoming: true });
  } catch (err) {
    console.error('❌ getAllReminders failed:', err.message);
    reminders = [];
  }
  
  sendSuccess(res, 200, {
    snapshot: {
      insights,
      recentActivity,
      user: {
        id: userContext.id,
        name: `${userContext.firstName} ${userContext.lastName}`,
        email: userContext.email,
        role: userContext.role,
        managedProjects: userContext.projectsAsManager?.length || 0,
        teamProjects: userContext.projectsAsTeamMember?.length || 0
      },
      currentProject: projectContext ? {
        id: projectContext.id,
        name: projectContext.projectName,
        number: projectContext.projectNumber,
        status: projectContext.status,
        progress: projectContext.progress,
        customer: projectContext.customer?.primaryName
      } : null,
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
