/**
 * Proactive Notifications Service
 * Phase 4: Monitor and notify about overdue items, deadlines, communication gaps
 */

const { prisma } = require('../config/prisma');

class ProactiveNotificationsService {
  constructor() {
    this.notificationCache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  /**
   * Get all overdue tasks for a user or all users
   */
  async getOverdueTasks(userId = null) {
    try {
      const now = new Date();
      const where = {
        dueDate: { lt: now },
        status: { not: 'COMPLETED' }
      };
      
      if (userId) {
        where.assignedToId = userId;
      }
      
      const overdueTasks = await prisma.task.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              projectName: true,
              projectNumber: true,
              customer: {
                select: {
                  id: true,
                  primaryName: true,
                  primaryEmail: true
                }
              }
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
        },
        orderBy: { dueDate: 'asc' }
      });
      
      return overdueTasks;
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      return [];
    }
  }

  /**
   * Get upcoming deadlines (next 7 days)
   */
  async getUpcomingDeadlines(userId = null, daysAhead = 7) {
    try {
      const now = new Date();
      const future = new Date();
      future.setDate(now.getDate() + daysAhead);
      
      const where = {
        dueDate: {
          gte: now,
          lte: future
        },
        status: { not: 'COMPLETED' }
      };
      
      if (userId) {
        where.assignedToId = userId;
      }
      
      const upcomingTasks = await prisma.task.findMany({
        where,
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
        },
        orderBy: { dueDate: 'asc' }
      });
      
      return upcomingTasks;
    } catch (error) {
      console.error('Error fetching upcoming deadlines:', error);
      return [];
    }
  }

  /**
   * Get upcoming reminders/calendar events
   */
  async getUpcomingReminders(userId = null, daysAhead = 7) {
    try {
      const now = new Date();
      const future = new Date();
      future.setDate(now.getDate() + daysAhead);
      
      const where = {
        startTime: {
          gte: now,
          lte: future
        },
        status: 'CONFIRMED'
      };
      
      const reminders = await prisma.calendarEvent.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              projectName: true,
              projectNumber: true
            }
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          attendees: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { startTime: 'asc' }
      });
      
      // Filter by user if specified
      if (userId) {
        return reminders.filter(r => 
          r.organizerId === userId || 
          r.attendees.some(a => a.userId === userId)
        );
      }
      
      return reminders;
    } catch (error) {
      console.error('Error fetching upcoming reminders:', error);
      return [];
    }
  }

  /**
   * Identify communication gaps (projects without recent messages/emails)
   */
  async getCommunicationGaps(daysWithoutContact = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysWithoutContact);
      
      // Get all active projects
      const projects = await prisma.project.findMany({
        where: {
          archived: false,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        include: {
          customer: {
            select: {
              id: true,
              primaryName: true,
              primaryEmail: true
            }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
          }
        }
      });
      
      const gaps = [];
      
      for (const project of projects) {
        const lastMessage = project.messages[0];
        const daysSinceContact = lastMessage 
          ? Math.floor((new Date() - new Date(lastMessage.createdAt)) / (1000 * 60 * 60 * 24))
          : Infinity;
        
        if (!lastMessage || daysSinceContact >= daysWithoutContact) {
          gaps.push({
            project: {
              id: project.id,
              projectName: project.projectName,
              projectNumber: project.projectNumber,
              status: project.status,
              progress: project.progress
            },
            customer: project.customer,
            daysSinceContact: lastMessage ? daysSinceContact : null,
            lastContactDate: lastMessage?.createdAt || null
          });
        }
      }
      
      return gaps.sort((a, b) => {
        const aDays = a.daysSinceContact || Infinity;
        const bDays = b.daysSinceContact || Infinity;
        return bDays - aDays; // Most urgent first
      });
    } catch (error) {
      console.error('Error fetching communication gaps:', error);
      return [];
    }
  }

  /**
   * Get overdue workflow alerts
   */
  async getOverdueAlerts(userId = null) {
    try {
      const now = new Date();
      const where = {
        status: 'ACTIVE',
        createdAt: { lt: now }
      };
      
      if (userId) {
        where.assignedToId = userId;
      }
      
      const alerts = await prisma.workflowAlert.findMany({
        where,
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
          },
          lineItem: {
            select: {
              id: true,
              itemName: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });
      
      return alerts;
    } catch (error) {
      console.error('Error fetching overdue alerts:', error);
      return [];
    }
  }

  /**
   * Get comprehensive proactive summary for a user
   */
  async getProactiveSummary(userId = null) {
    try {
      const [
        overdueTasks,
        upcomingDeadlines,
        upcomingReminders,
        communicationGaps,
        overdueAlerts
      ] = await Promise.all([
        this.getOverdueTasks(userId),
        this.getUpcomingDeadlines(userId),
        this.getUpcomingReminders(userId),
        userId ? [] : this.getCommunicationGaps(), // Only check gaps for all projects (not user-specific)
        this.getOverdueAlerts(userId)
      ]);
      
      return {
        overdueTasks: {
          count: overdueTasks.length,
          items: overdueTasks.slice(0, 10) // Limit to top 10
        },
        upcomingDeadlines: {
          count: upcomingDeadlines.length,
          items: upcomingDeadlines.slice(0, 10)
        },
        upcomingReminders: {
          count: upcomingReminders.length,
          items: upcomingReminders.slice(0, 10)
        },
        communicationGaps: {
          count: communicationGaps.length,
          items: communicationGaps.slice(0, 10)
        },
        overdueAlerts: {
          count: overdueAlerts.length,
          items: overdueAlerts.slice(0, 10)
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating proactive summary:', error);
      return {
        overdueTasks: { count: 0, items: [] },
        upcomingDeadlines: { count: 0, items: [] },
        upcomingReminders: { count: 0, items: [] },
        communicationGaps: { count: 0, items: [] },
        overdueAlerts: { count: 0, items: [] },
        generatedAt: new Date()
      };
    }
  }
}

module.exports = new ProactiveNotificationsService();

