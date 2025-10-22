const { PrismaClient } = require('@prisma/client');

const { prisma } = require('../config/prisma');

// Ensure prisma is available
if (!prisma) {
  console.error('❌ FollowUpService: Prisma client is not available');
  throw new Error('Database connection not established');
}

// Add a method to check prisma availability
const ensurePrismaConnection = () => {
  if (!prisma) {
    console.error('❌ FollowUpService: Prisma client is not available');
    throw new Error('Database connection not established');
  }
  
  // Check if prisma client has the required methods
  if (typeof prisma.followUpTracking === 'undefined') {
    console.error('❌ FollowUpService: Prisma client not properly initialized - followUpTracking model not available');
    throw new Error('Database models not available');
  }
  
  return prisma;
};

class FollowUpService {
  /**
   * Create a follow-up for a task, reminder, or alert
   * @param {Object} params - Follow-up parameters
   * @param {string} params.originalItemId - ID of the original item
   * @param {string} params.originalItemType - Type of original item (TASK, REMINDER, ALERT, WORKFLOW_ALERT)
   * @param {string} params.projectId - Project ID
   * @param {string} params.assignedToId - User ID to assign follow-up to
   * @param {number} params.followUpDays - Days until follow-up
   * @param {number} [params.followUpHours] - Hours until follow-up
   * @param {number} [params.followUpMinutes] - Minutes until follow-up
   * @param {string} [params.followUpMessage] - Custom follow-up message
   * @param {Object} [params.metadata] - Additional metadata
   * @returns {Promise<Object>} Created follow-up
   */
  static async createFollowUp({
    originalItemId,
    originalItemType,
    projectId,
    assignedToId,
    followUpDays,
    followUpHours = 0,
    followUpMinutes = 0,
    followUpMessage,
    metadata
  }) {
    // Check if user has follow-up settings enabled
    const userSettings = await prisma.followUpSettings.findUnique({
      where: { userId: assignedToId }
    });

    if (!userSettings || !userSettings.isEnabled) {
      throw new Error('Follow-up settings not enabled for user');
    }

    // Check if follow-up already exists for this item
    const existingFollowUp = await prisma.followUpTracking.findFirst({
      where: {
        originalItemId,
        originalItemType,
        status: { in: ['PENDING', 'SENT'] }
      }
    });

    if (existingFollowUp) {
      throw new Error('Follow-up already exists for this item');
    }

    // Calculate scheduled date with granular timing
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + followUpDays);
    scheduledFor.setHours(scheduledFor.getHours() + followUpHours);
    scheduledFor.setMinutes(scheduledFor.getMinutes() + followUpMinutes);

    // Create follow-up tracking
    const followUp = await prisma.followUpTracking.create({
      data: {
        originalItemId,
        originalItemType,
        projectId,
        assignedToId,
        followUpDays,
        scheduledFor,
        followUpMessage: followUpMessage || userSettings.followUpMessage,
        metadata
      },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            projectNumber: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return followUp;
  }

  /**
   * Process pending follow-ups that are due
   * @returns {Promise<Array>} Array of processed follow-ups
   */
  static async processPendingFollowUps() {
    try {
      const now = new Date();
      
      // Ensure prisma is available
      if (!prisma) {
        console.error('❌ FollowUpService: Prisma client is not available');
        return [];
      }
      
      // Get all pending follow-ups that are due
      const db = ensurePrismaConnection();
      const pendingFollowUps = await db.followUpTracking.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now }
      },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            projectNumber: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    const processedFollowUps = [];

    for (const followUp of pendingFollowUps) {
      try {
        // Check if original item still exists and is relevant
        const isItemRelevant = await this.isItemRelevant(followUp.originalItemId, followUp.originalItemType);
        
        if (!isItemRelevant) {
          // Cancel follow-up if original item is no longer relevant
          await db.followUpTracking.update({
            where: { id: followUp.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: now,
              cancelledReason: 'Original item no longer relevant'
            }
          });
          continue;
        }

        // Send follow-up notification
        await this.sendFollowUpNotification(followUp);
        
        // Update follow-up status
        const updatedFollowUp = await db.followUpTracking.update({
          where: { id: followUp.id },
          data: {
            status: 'SENT',
            attempts: followUp.attempts + 1,
            lastAttemptAt: now
          }
        });

        processedFollowUps.push(updatedFollowUp);
      } catch (error) {
        console.error(`Error processing follow-up ${followUp.id}:`, error);
        
        // Mark as failed if max attempts reached
        const userSettings = await db.followUpSettings.findUnique({
          where: { userId: followUp.assignedToId }
        });

        const maxAttempts = userSettings?.maxFollowUpAttempts || 3;
        
        if (followUp.attempts + 1 >= maxAttempts) {
          await db.followUpTracking.update({
            where: { id: followUp.id },
            data: {
              status: 'FAILED',
              attempts: followUp.attempts + 1,
              lastAttemptAt: now
            }
          });
        }
      }
    }

    return processedFollowUps;
    } catch (error) {
      console.error('❌ Error processing follow-ups:', error);
      return [];
    }
  }

  /**
   * Check if the original item is still relevant for follow-up
   * @param {string} itemId - Original item ID
   * @param {string} itemType - Original item type
   * @returns {Promise<boolean>} Whether item is still relevant
   */
  static async isItemRelevant(itemId, itemType) {
    try {
      switch (itemType) {
        case 'TASK':
          const task = await prisma.task.findUnique({
            where: { id: itemId },
            select: { status: true }
          });
          return task && task.status !== 'DONE';
        
        case 'REMINDER':
          // For reminders, we'll assume they're always relevant unless explicitly cancelled
          return true;
        
        case 'ALERT':
        case 'WORKFLOW_ALERT':
          const alert = await prisma.workflowAlert.findUnique({
            where: { id: itemId },
            select: { status: true }
          });
          return alert && alert.status === 'ACTIVE';
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking item relevance for ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Send follow-up notification
   * @param {Object} followUp - Follow-up object
   * @returns {Promise<void>}
   */
  static async sendFollowUpNotification(followUp) {
    // Get the original item details for context
    const originalItem = await this.getOriginalItemDetails(followUp.originalItemId, followUp.originalItemType);
    
    // Build contextual message with original content
    let message = followUp.followUpMessage || 'This is a follow-up reminder. Please take action if needed.';
    
    if (originalItem) {
      message = `FOLLOW-UP REMINDER:\n\n${message}\n\n--- ORIGINAL ITEM ---\n`;
      
      switch (followUp.originalItemType) {
        case 'TASK':
          message += `Task: ${originalItem.title}\n`;
          if (originalItem.description) message += `Description: ${originalItem.description}\n`;
          message += `Priority: ${originalItem.priority}\n`;
          message += `Due Date: ${new Date(originalItem.dueDate).toLocaleDateString()}\n`;
          break;
          
        case 'REMINDER':
          message += `Reminder: ${originalItem.title || 'Calendar Reminder'}\n`;
          if (originalItem.description) message += `Details: ${originalItem.description}\n`;
          if (originalItem.startTime) message += `Time: ${new Date(originalItem.startTime).toLocaleString()}\n`;
          break;
          
        case 'ALERT':
        case 'WORKFLOW_ALERT':
          message += `Alert: ${originalItem.title}\n`;
          message += `Message: ${originalItem.message}\n`;
          message += `Priority: ${originalItem.priority}\n`;
          if (originalItem.stepName) message += `Step: ${originalItem.stepName}\n`;
          break;
      }
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        title: 'Follow-up Reminder',
        message: message,
        type: 'REMINDER',
        recipientId: followUp.assignedToId,
        actionUrl: `/projects/${followUp.projectId}`,
        actionData: {
          followUpId: followUp.id,
          originalItemId: followUp.originalItemId,
          originalItemType: followUp.originalItemType,
          projectId: followUp.projectId
        }
      }
    });

    // TODO: Send email notification if configured
    // TODO: Send SMS notification if configured
    // TODO: Send in-app notification via Socket.IO

    console.log(`Follow-up notification sent for ${followUp.originalItemType} ${followUp.originalItemId}`);
  }

  /**
   * Get original item details for context
   * @param {string} itemId - Original item ID
   * @param {string} itemType - Original item type
   * @returns {Promise<Object|null>} Original item details
   */
  static async getOriginalItemDetails(itemId, itemType) {
    try {
      switch (itemType) {
        case 'TASK':
          return await prisma.task.findUnique({
            where: { id: itemId },
            select: {
              title: true,
              description: true,
              priority: true,
              dueDate: true,
              status: true
            }
          });
        
        case 'REMINDER':
          return await prisma.calendarEvent.findUnique({
            where: { id: itemId },
            select: {
              title: true,
              description: true,
              startTime: true,
              endTime: true,
              eventType: true
            }
          });
        
        case 'ALERT':
        case 'WORKFLOW_ALERT':
          return await prisma.workflowAlert.findUnique({
            where: { id: itemId },
            select: {
              title: true,
              message: true,
              priority: true,
              stepName: true,
              status: true
            }
          });
        
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error getting original item details for ${itemType} ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Cancel follow-up for a specific item
   * @param {string} originalItemId - Original item ID
   * @param {string} originalItemType - Original item type
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled follow-up
   */
  static async cancelFollowUp(originalItemId, originalItemType, reason = 'Item completed or cancelled') {
    const followUp = await prisma.followUpTracking.findFirst({
      where: {
        originalItemId,
        originalItemType,
        status: { in: ['PENDING', 'SENT'] }
      }
    });

    if (!followUp) {
      throw new Error('No active follow-up found for this item');
    }

    const cancelledFollowUp = await prisma.followUpTracking.update({
      where: { id: followUp.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledReason: reason
      }
    });

    return cancelledFollowUp;
  }

  /**
   * Get follow-up statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Follow-up statistics
   */
  static async getFollowUpStats(userId) {
    const [
      total,
      pending,
      completed,
      cancelled,
      overdue
    ] = await Promise.all([
      prisma.followUpTracking.count({
        where: { assignedToId: userId }
      }),
      prisma.followUpTracking.count({
        where: { 
          assignedToId: userId,
          status: 'PENDING'
        }
      }),
      prisma.followUpTracking.count({
        where: { 
          assignedToId: userId,
          status: 'COMPLETED'
        }
      }),
      prisma.followUpTracking.count({
        where: { 
          assignedToId: userId,
          status: 'CANCELLED'
        }
      }),
      prisma.followUpTracking.count({
        where: { 
          assignedToId: userId,
          status: 'PENDING',
          scheduledFor: { lt: new Date() }
        }
      })
    ]);

    return {
      total,
      pending,
      completed,
      cancelled,
      overdue
    };
  }
}

module.exports = FollowUpService;
