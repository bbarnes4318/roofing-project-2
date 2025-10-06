const express = require('express');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  AppError 
} = require('../middleware/errorHandler');
const { cacheService } = require('../config/redis');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

const transformMessageToActivity = (message, currentUserId) => {
  const authorName = message.author ? `${message.author.firstName} ${message.author.lastName}` : message.authorName || 'Unknown User';
  const projectName = message.project ? message.project.projectName : 'Unknown Project';
  const isOwnMessage = message.authorId === currentUserId;
  
  return {
    id: message.id,
    _id: message.id,
    subject: message.subject || 'Project Message',
    description: message.content,
    content: message.content,
    user: authorName,
    author: authorName,
    timestamp: message.createdAt,
    projectId: message.projectId,
    projectName: projectName,
    projectNumber: message.projectNumber,
    project_id: message.projectId,
    type: 'project_message',
    messageType: message.messageType,
    priority: message.priority?.toLowerCase() || 'medium',
    phase: message.phase,
    section: message.section,
    lineItem: message.lineItem,
    isOwnMessage: isOwnMessage,
    recipients: ['all'], // Project messages are visible to all project team members
    metadata: {
      projectName: projectName,
      messageType: message.messageType,
      priority: message.priority,
      phase: message.phase,
      isSystemGenerated: message.isSystemGenerated,
      authorId: message.authorId,
      isOwnMessage: isOwnMessage,
      attachments: (message.metadata && message.metadata.attachments) ? message.metadata.attachments : []
    }
  };
};

const transformTaskToActivity = (task) => {
  const assignedName = task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : null;
  const creatorName = task.createdBy ? `${task.createdBy.firstName} ${task.createdBy.lastName}` : 'System';
  const projectName = task.project ? task.project.projectName : 'Unknown Project';
  return {
    id: task.id,
    _id: task.id,
    type: 'task',
    subject: task.title || 'Task',
    description: task.description || '',
    user: assignedName || creatorName,
    author: creatorName,
    timestamp: task.createdAt || task.dueDate || new Date().toISOString(),
    projectId: task.projectId,
    projectName,
    priority: (task.priority || 'MEDIUM').toLowerCase(),
    status: task.status,
    dueDate: task.dueDate,
    metadata: { taskId: task.id }
  };
};

const transformEventToActivity = (event) => {
  const organizerName = event.organizer ? `${event.organizer.firstName} ${event.organizer.lastName}` : 'Unknown User';
  const projectName = event.project ? event.project.projectName : 'Unknown Project';
  return {
    id: event.id,
    _id: event.id,
    type: 'reminder',
    subject: event.title || 'Reminder',
    description: event.description || '',
    user: organizerName,
    author: organizerName,
    timestamp: event.startTime || event.createdAt || new Date().toISOString(),
    projectId: event.projectId,
    projectName,
    priority: 'medium',
    when: event.startTime,
    metadata: { eventId: event.id, eventType: event.eventType }
  };
};

// @desc    Get all activities (messages from conversations)
// @route   GET /api/activities
// @access  Private  
router.get('/', cacheService.middleware('activities', 60), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    projectId,
    conversationId
  } = req.query;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build filter object - Show ALL project messages (will be filtered on frontend)
  console.log('🔍 ACTIVITIES: User from request:', req.user);
  
  if (!req.user || !req.user.id) {
    console.error('❌ ACTIVITIES: No user found in request');
    throw new AppError('Authentication required', 401);
  }
  
  // Build where clause to show ALL messages to all users
  // IMPORTANT: Exclude reply messages (parentMessageId !== null) to prevent duplicate containers
  const where = {
    parentMessageId: null // Only fetch top-level messages, not replies
  };
  
  if (projectId) {
    // If specific project requested, filter to that project only
    where.AND = [{ projectId }];
  }

  // Build sort object for messages (others will be normalized post-merge)
  const orderBy = {};
  orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';

  try {
    console.log('🔍 ACTIVITIES: Fetching messages, tasks, reminders as activities...');

    // Build where clauses for tasks and reminders - Show ALL to all users
    const taskWhere = {};
    if (projectId) taskWhere.projectId = projectId;

    const eventWhere = {
      eventType: 'REMINDER'
    };
    if (projectId) eventWhere.projectId = projectId;

    const fetchSize = limitNum * 3; // over-fetch to ensure we can page after merge

    const [messages, tasks, events, messageCount, taskCount, eventCount] = await Promise.all([
      prisma.projectMessage.findMany({
        where,
        orderBy,
        skip: 0,
        take: fetchSize,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          project: { select: { id: true, projectName: true, projectNumber: true } },
          recipients: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
          }
        }
      }),
      prisma.task.findMany({
        where: taskWhere,
        orderBy: { createdAt: sortOrder === 'desc' ? 'desc' : 'asc' },
        take: fetchSize,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, projectName: true, projectNumber: true } }
        }
      }),
      prisma.calendarEvent.findMany({
        where: eventWhere,
        orderBy: { startTime: sortOrder === 'desc' ? 'desc' : 'asc' },
        take: fetchSize,
        include: {
          organizer: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, projectName: true, projectNumber: true } }
        }
      }),
      prisma.projectMessage.count({ where }), // Already excludes replies via parentMessageId: null
      prisma.task.count({ where: taskWhere }),
      prisma.calendarEvent.count({ where: eventWhere })
    ]);

    const total = (messageCount || 0) + (taskCount || 0) + (eventCount || 0);

    const messageActivities = messages.map(m => transformMessageToActivity(m, req.user.id));
    const taskActivities = tasks.map(t => transformTaskToActivity(t));
    const eventActivities = events.map(e => transformEventToActivity(e));

    const merged = [...messageActivities, ...taskActivities, ...eventActivities]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const start = skip;
    const end = skip + limitNum;
    const pageItems = merged.slice(start, end);

    sendPaginatedResponse(res, pageItems, pageNum, limitNum, total, 'Activities retrieved successfully');
  } catch (error) {
    console.error('❌ ACTIVITIES: Error fetching activities:', error);
    throw new AppError('Failed to fetch activities', 500);
  }
}));

// @desc    Get recent activities for dashboard
// @route   GET /api/activities/recent
// @access  Private
router.get('/recent', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit), 50); // Cap at 50

  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required', 401);
  }

  try {
    console.log(`🔍 ACTIVITIES: Fetching ${limitNum} recent activities for user ${req.user.id}...`);
    
    // Build where clause to show ALL messages to all users
    // IMPORTANT: Exclude reply messages to prevent duplicate containers
    const where = {
      parentMessageId: null // Only fetch top-level messages, not replies
    };

    // Fetch recent messages, tasks, and reminders
    const fetchSize = limitNum * 3;
    const [messages, tasks, events] = await Promise.all([
      prisma.projectMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: fetchSize,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          project: { select: { id: true, projectName: true, projectNumber: true } },
          recipients: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
          }
        }
      }),
      prisma.task.findMany({
        where: {
          OR: [
            { createdById: req.user.id },
            { assignedToId: req.user.id },
            { project: { OR: [ { projectManagerId: req.user.id }, { teamMembers: { some: { userId: req.user.id } } } ] } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: fetchSize,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, projectName: true, projectNumber: true } }
        }
      }),
      prisma.calendarEvent.findMany({
        where: {
          eventType: 'REMINDER',
          OR: [
            { organizerId: req.user.id },
            { attendees: { some: { userId: req.user.id } } },
            { project: { OR: [ { projectManagerId: req.user.id }, { teamMembers: { some: { userId: req.user.id } } } ] } }
          ]
        },
        orderBy: { startTime: 'desc' },
        take: fetchSize,
        include: {
          organizer: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, projectName: true, projectNumber: true } }
        }
      })
    ]);

    const activities = [
      ...messages.map(m => transformMessageToActivity(m, req.user.id)),
      ...tasks.map(t => transformTaskToActivity(t)),
      ...events.map(e => transformEventToActivity(e))
    ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limitNum);

    sendSuccess(res, 200, activities, 'Recent activities retrieved successfully');
  } catch (error) {
    console.error('❌ ACTIVITIES: Error fetching recent activities:', error);
    throw new AppError('Failed to fetch recent activities', 500);
  }
}));

// @desc    Create new activity (message)
// @route   POST /api/activities
// @access  Private
router.post('/', asyncHandler(async (req, res) => {
  const { subject, content, projectId, conversationId } = req.body;
  
  if (!content || content.trim().length === 0) {
    throw new AppError('Message content is required', 400);
  }

  try {
    console.log('📝 ACTIVITIES: Creating new message activity...');
    
    let targetConversationId = conversationId;
    
    // If no conversation specified, create or find a general conversation
    if (!targetConversationId) {
      // Look for an existing general conversation or create one
      let conversation = await prisma.conversation.findFirst({
        where: {
          title: 'General Project Messages',
          isGroup: true
        }
      });
      
      if (!conversation) {
        // Create a general conversation
        conversation = await prisma.conversation.create({
          data: {
            title: 'General Project Messages',
            description: 'General project communication',
            isGroup: true,
            isActive: true
          }
        });
        
        console.log('📝 ACTIVITIES: Created general conversation:', conversation.id);
      }
      
      targetConversationId = conversation.id;
    }

    // Create the message
    const newMessage = await prisma.message.create({
      data: {
        text: content.trim(),
        messageType: 'TEXT',
        conversationId: targetConversationId,
        senderId: req.user?.id || 'demo-sarah-owner-id', // Use demo user if no auth
        systemData: projectId ? { projectId } : null
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        conversation: {
          select: {
            id: true,
            title: true,
            isGroup: true
          }
        }
      }
    });

    console.log('✅ ACTIVITIES: Created message activity:', newMessage.id);

    // Transform to activity format
    const activity = transformMessageToActivity(newMessage, req.user?.id);

    // Emit real-time notification via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${targetConversationId}`).emit('newActivity', activity);
      console.log('📡 ACTIVITIES: Emitted real-time activity update');
    }

    sendSuccess(res, activity, 'Activity created successfully', 201);
  } catch (error) {
    console.error('❌ ACTIVITIES: Error creating activity:', error);
    throw new AppError('Failed to create activity', 500);
  }
}));

// @desc    Get activities by project
// @route   GET /api/activities/project/:projectId
// @access  Private
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const orderBy = {};
  orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';

  try {
    console.log(`🔍 ACTIVITIES: Fetching activities for project ${projectId}...`);
    
    // Get messages that reference this project in systemData
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          isDeleted: false,
          OR: [
            { systemData: { path: ['projectId'], equals: projectId } },
            { systemData: { path: ['projectId'], equals: parseInt(projectId) } }
          ]
        },
        orderBy,
        skip,
        take: limitNum,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          conversation: {
            select: {
              id: true,
              title: true,
              isGroup: true
            }
          }
        }
      }),
      prisma.message.count({
        where: {
          isDeleted: false,
          OR: [
            { systemData: { path: ['projectId'], equals: projectId } },
            { systemData: { path: ['projectId'], equals: parseInt(projectId) } }
          ]
        }
      })
    ]);

    console.log(`✅ ACTIVITIES: Found ${messages.length} project activities`);

    // Transform messages to activity format
    const activities = messages.map(message => ({
      ...transformMessageToActivity(message),
      projectId: projectId,
      project_id: projectId
    }));

    sendPaginatedResponse(res, activities, pageNum, limitNum, total, 'Project activities retrieved successfully');
  } catch (error) {
    console.error('❌ ACTIVITIES: Error fetching project activities:', error);
    throw new AppError('Failed to fetch project activities', 500);
  }
}));

// @desc    Delete activity (mark message as deleted)
// @route   DELETE /api/activities/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Mark message as deleted instead of actually deleting
    const message = await prisma.message.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    console.log('🗑️ ACTIVITIES: Marked message as deleted:', id);

    sendSuccess(res, { id }, 'Activity deleted successfully');
  } catch (error) {
    console.error('❌ ACTIVITIES: Error deleting activity:', error);
    throw new AppError('Failed to delete activity', 500);
  }
}));

module.exports = router;