const express = require('express');
const { prisma } = require('../config/prisma');
const { 
  asyncHandler, 
  sendSuccess, 
  sendPaginatedResponse,
  AppError 
} = require('../middleware/errorHandler');
const { cacheService } = require('../config/redis');

const router = express.Router();

// Transform message data to activity format for frontend compatibility
const transformMessageToActivity = (message) => {
  return {
    id: message.id,
    _id: message.id,
    subject: `Message in conversation`, // Default subject
    content: message.text,
    author: message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Unknown User',
    timestamp: message.createdAt,
    projectId: null, // Messages aren't directly tied to projects in current schema
    project_id: null,
    type: 'message',
    messageType: message.messageType,
    conversationId: message.conversationId,
    isEdited: message.isEdited,
    isDeleted: message.isDeleted,
    metadata: {
      conversationId: message.conversationId,
      messageType: message.messageType,
      isEdited: message.isEdited,
      replyTo: message.replyToId
    }
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

  // Build filter object - CRITICAL: Only show messages where user is a participant
  const where = {
    isDeleted: false, // Only show non-deleted messages
    conversation: {
      participants: {
        some: {
          userId: req.user.id, // Only messages in conversations where current user is a participant
          leftAt: null // User hasn't left the conversation
        }
      }
    }
  };
  
  if (conversationId) {
    where.conversationId = conversationId;
  }

  // Build sort object
  const orderBy = {};
  orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';

  try {
    console.log('🔍 ACTIVITIES: Fetching messages as activities...');
    
    // Get messages with sender information
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
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
      prisma.message.count({ where })
    ]);

    console.log(`✅ ACTIVITIES: Found ${messages.length} messages`);

    // Transform messages to activity format
    const activities = messages.map(transformMessageToActivity);

    sendPaginatedResponse(res, activities, pageNum, limitNum, total, 'Activities retrieved successfully');
  } catch (error) {
    console.error('❌ ACTIVITIES: Error fetching activities:', error);
    throw new AppError('Failed to fetch activities', 500);
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
    const activity = transformMessageToActivity(newMessage);

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