/**
 * BubblesContextService - Comprehensive Data Provider for Bubbles AI
 * 
 * This service provides Bubbles AI with complete access to ALL application data,
 * making it truly "all knowing" about projects, tasks, messages, emails, reminders,
 * customers, users, alerts, and more.
 */

const { prisma } = require('../config/prisma');

class BubblesContextService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  // ==================== INSIGHTS & SUMMARY ====================

  async getInsights(userId = null) {
    try {
      const now = new Date();
      const [totalProjects, activeProjects, totalTasks, overdueTasks, upcomingReminders, totalAlerts] = await Promise.all([
        prisma.project.count({ where: { archived: false } }),
        prisma.project.count({ where: { status: 'IN_PROGRESS', archived: false } }),
        prisma.task.count(),
        prisma.task.count({ where: { dueDate: { lt: now }, status: { not: 'COMPLETED' } } }),
        prisma.calendarEvent.count({ where: { startTime: { gte: now }, eventType: 'REMINDER' } }),
        prisma.workflowAlert.count({ where: { status: 'ACTIVE' } })
      ]);

      return {
        summary: {
          totalProjects,
          activeProjects,
          overdueTasks,
          upcomingReminders,
          activeAlerts: totalAlerts
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('getInsights error:', error);
      return {
        summary: { totalProjects: 0, activeProjects: 0, overdueTasks: 0, upcomingReminders: 0, activeAlerts: 0 },
        timestamp: new Date()
      };
    }
  }

  // ==================== PROJECTS ====================

  async getAllProjects(filters = {}) {
    try {
      const where = { archived: false };
      
      if (filters.status) where.status = filters.status;
      if (filters.phase) where.phase = filters.phase;
      if (filters.projectManagerId) where.projectManagerId = filters.projectManagerId;
      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.projectNumber) where.projectNumber = parseInt(filters.projectNumber);
      if (filters.search) {
        where.OR = [
          { projectName: { contains: filters.search, mode: 'insensitive' } },
          { projectNumber: { equals: parseInt(filters.search) || -1 } }
        ];
      }

      const projects = await prisma.project.findMany({
        where,
        include: {
          customer: {
            select: { id: true, primaryName: true, primaryEmail: true, primaryPhone: true }
          },
          projectManager: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          workflowTrackers: {
            where: { isMainWorkflow: true },
            include: {
              currentPhase: { select: { phaseType: true, phaseName: true } },
              currentSection: { select: { displayName: true } },
              currentLineItem: { select: { itemName: true } }
            },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100
      });

      return projects;
    } catch (error) {
      console.error('getAllProjects error:', error);
      return [];
    }
  }

  async getProjectContext(projectId) {
    try {
      const cacheKey = `project_${projectId}`;
      const cached = this._getCache(cacheKey);
      if (cached) return cached;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          customer: true,
          projectManager: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true }
          },
          workflowTrackers: {
            where: { isMainWorkflow: true },
            include: {
              currentPhase: true,
              currentSection: true,
              currentLineItem: true,
              completedItems: true
            },
            take: 1
          },
          teamMembers: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, role: true }
              }
            }
          }
        }
      });

      if (project) {
        this._setCache(cacheKey, project);
      }

      return project;
    } catch (error) {
      console.error('getProjectContext error:', error);
      return null;
    }
  }

  async getProjectSummary(projectId) {
    try {
      const project = await this.getProjectContext(projectId);
      if (!project) return null;

      const [tasks, messages, emails, alerts, reminders] = await Promise.all([
        prisma.task.count({ where: { projectId } }),
        prisma.projectMessage.count({ where: { projectId } }),
        prisma.email.count({ where: { projectId } }),
        prisma.workflowAlert.count({ where: { projectId, status: 'ACTIVE' } }),
        prisma.calendarEvent.count({ where: { projectId, startTime: { gte: new Date() } } })
      ]);

      return {
        project: {
          id: project.id,
          name: project.projectName,
          number: project.projectNumber,
          status: project.status,
          progress: project.progress,
          phase: project.phase,
          customer: project.customer?.primaryName,
          manager: project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : null
        },
        counts: {
          tasks,
          messages,
          emails,
          activeAlerts: alerts,
          upcomingReminders: reminders
        },
        workflow: project.workflowTrackers?.[0] || null
      };
    } catch (error) {
      console.error('getProjectSummary error:', error);
      return null;
    }
  }

  // ==================== TASKS ====================

  async getAllTasks(filters = {}) {
    try {
      const where = {};
      
      if (filters.projectId) where.projectId = filters.projectId;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;
      if (filters.createdById) where.createdById = filters.createdById;
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      if (filters.category) where.category = filters.category;
      if (filters.overdue) {
        where.dueDate = { lt: new Date() };
        where.status = { not: 'DONE' };
      }
      if (filters.upcoming) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        where.dueDate = { gte: new Date(), lte: nextWeek };
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          project: {
            select: { id: true, projectName: true, projectNumber: true }
          },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        },
        orderBy: filters.orderBy || { dueDate: 'asc' },
        take: filters.limit || 100
      });

      return tasks;
    } catch (error) {
      console.error('getAllTasks error:', error);
      return [];
    }
  }

  // ==================== MESSAGES ====================

  async getAllMessages(filters = {}) {
    try {
      const where = {};
      
      if (filters.projectId) where.projectId = filters.projectId;
      if (filters.authorId) where.authorId = filters.authorId;
      if (filters.messageType) where.messageType = filters.messageType;
      if (filters.priority) where.priority = filters.priority;
      if (filters.search) {
        where.OR = [
          { subject: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const messages = await prisma.projectMessage.findMany({
        where,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          },
          project: {
            select: { id: true, projectName: true, projectNumber: true }
          },
          recipients: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100
      });

      return messages;
    } catch (error) {
      console.error('getAllMessages error:', error);
      return [];
    }
  }

  // ==================== EMAILS ====================

  async getAllEmails(filters = {}) {
    try {
      const where = { isDeleted: false };
      
      if (filters.projectId) where.projectId = filters.projectId;
      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.senderId) where.senderId = filters.senderId;
      if (filters.status) where.status = filters.status;
      if (filters.emailType) where.emailType = filters.emailType;
      if (filters.search) {
        where.OR = [
          { subject: { contains: filters.search, mode: 'insensitive' } },
          { bodyText: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const emails = await prisma.email.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100,
        select: {
          id: true,
          createdAt: true,
          subject: true,
          senderName: true,
          senderEmail: true,
          toEmails: true,
          toNames: true,
          status: true,
          emailType: true,
          projectId: true,
          customerId: true,
          sentAt: true,
          deliveredAt: true,
          openedAt: true,
          clickedAt: true,
          bouncedAt: true
        }
      });

      return emails;
    } catch (error) {
      console.error('getAllEmails error:', error);
      return [];
    }
  }

  // ==================== REMINDERS/CALENDAR EVENTS ====================

  async getAllReminders(filters = {}) {
    try {
      const where = {};
      
      if (filters.projectId) where.projectId = filters.projectId;
      if (filters.organizerId) where.organizerId = filters.organizerId;
      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.status) where.status = filters.status;
      if (filters.upcoming) {
        where.startTime = { gte: new Date() };
      }
      if (filters.past) {
        where.startTime = { lt: new Date() };
      }

      const reminders = await prisma.calendarEvent.findMany({
        where,
        include: {
          organizer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          project: {
            select: { id: true, projectName: true, projectNumber: true }
          },
          attendees: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        },
        orderBy: { startTime: filters.upcoming ? 'asc' : 'desc' },
        take: filters.limit || 100
      });

      return reminders;
    } catch (error) {
      console.error('getAllReminders error:', error);
      return [];
    }
  }

  // ==================== ALERTS ====================

  async getAllAlerts(filters = {}) {
    try {
      const where = {};
      
      if (filters.projectId) where.projectId = filters.projectId;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;
      if (filters.createdById) where.createdById = filters.createdById;
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      if (filters.overdue) {
        where.dueDate = { lt: new Date() };
        where.status = 'ACTIVE';
      }

      const alerts = await prisma.workflowAlert.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          project: {
            select: { id: true, projectName: true, projectNumber: true }
          },
          lineItem: {
            select: { itemName: true, itemLetter: true }
          },
          phase: {
            select: { phaseType: true, phaseName: true }
          },
          section: {
            select: { displayName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100
      });

      return alerts;
    } catch (error) {
      console.error('getAllAlerts error:', error);
      return [];
    }
  }

  // ==================== CUSTOMERS ====================

  async getAllCustomers(filters = {}) {
    try {
      const where = { isActive: true };
      
      if (filters.search) {
        where.OR = [
          { primaryName: { contains: filters.search, mode: 'insensitive' } },
          { primaryEmail: { contains: filters.search, mode: 'insensitive' } },
          { primaryPhone: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const customers = await prisma.customer.findMany({
        where,
        include: {
          projects: {
            select: {
              id: true,
              projectName: true,
              projectNumber: true,
              status: true,
              progress: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          familyMembers: {
            select: { id: true, name: true, relation: true }
          }
        },
        orderBy: { primaryName: 'asc' },
        take: filters.limit || 100
      });

      return customers;
    } catch (error) {
      console.error('getAllCustomers error:', error);
      return [];
    }
  }

  async getCustomerContext(customerId) {
    try {
      const cacheKey = `customer_${customerId}`;
      const cached = this._getCache(cacheKey);
      if (cached) return cached;

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          projects: {
            include: {
              projectManager: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          familyMembers: true
        }
      });

      if (customer) {
        this._setCache(cacheKey, customer);
      }

      return customer;
    } catch (error) {
      console.error('getCustomerContext error:', error);
      return null;
    }
  }

  async getCustomerSummary(customerId) {
    try {
      const customer = await this.getCustomerContext(customerId);
      if (!customer) return null;

      const [totalProjects, activeProjects, totalMessages, totalEmails] = await Promise.all([
        prisma.project.count({ where: { customerId } }),
        prisma.project.count({ where: { customerId, status: 'IN_PROGRESS' } }),
        prisma.projectMessage.count({ where: { project: { customerId } } }),
        prisma.email.count({ where: { customerId } })
      ]);

      return {
        customer: {
          id: customer.id,
          name: customer.primaryName,
          email: customer.primaryEmail,
          phone: customer.primaryPhone,
          address: customer.address
        },
        counts: {
          totalProjects,
          activeProjects,
          totalMessages,
          totalEmails
        },
        projects: customer.projects?.slice(0, 10) || [],
        familyMembers: customer.familyMembers || []
      };
    } catch (error) {
      console.error('getCustomerSummary error:', error);
      return null;
    }
  }

  // ==================== USERS ====================

  async getAllUsers(filters = {}) {
    try {
      const where = { isActive: true };
      
      if (filters.role) where.role = filters.role;
      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          position: true,
          department: true,
          avatar: true
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        take: filters.limit || 100
      });

      return users;
    } catch (error) {
      console.error('getAllUsers error:', error);
      return [];
    }
  }

  async getUserContext(userId) {
    try {
      const cacheKey = `user_${userId}`;
      const cached = this._getCache(cacheKey);
      if (cached) return cached;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          position: true,
          department: true,
          avatar: true
        }
      });

      if (user) {
        this._setCache(cacheKey, user);
      }

      return user;
    } catch (error) {
      console.error('getUserContext error:', error);
      return null;
    }
  }

  async getUserWorkload(userId) {
    try {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const [tasks, overdueTasks, upcomingTasks, alerts, reminders, projectsManaged, projectsAsTeamMember] = await Promise.all([
        prisma.task.count({ where: { assignedToId: userId, status: { not: 'DONE' } } }),
        prisma.task.count({ where: { assignedToId: userId, dueDate: { lt: now }, status: { not: 'DONE' } } }),
        prisma.task.count({ where: { assignedToId: userId, dueDate: { gte: now, lte: nextWeek }, status: { not: 'DONE' } } }),
        prisma.workflowAlert.count({ where: { assignedToId: userId, status: 'ACTIVE' } }),
        prisma.calendarEvent.count({ where: { organizerId: userId, startTime: { gte: now } } }),
        prisma.project.count({ where: { projectManagerId: userId, archived: false } }),
        prisma.projectTeamMember.count({ where: { userId } })
      ]);

      return {
        userId,
        tasks: {
          total: tasks,
          overdue: overdueTasks,
          upcoming: upcomingTasks
        },
        alerts: {
          active: alerts
        },
        reminders: {
          upcoming: reminders
        },
        projects: {
          managed: projectsManaged,
          teamMember: projectsAsTeamMember
        }
      };
    } catch (error) {
      console.error('getUserWorkload error:', error);
      return null;
    }
  }

  // ==================== DOCUMENTS ====================

  async getAllDocuments(filters = {}) {
    try {
      const [projectDocuments, companyAssets] = await Promise.all([
        filters.projectId
          ? prisma.document.findMany({
              where: { projectId: filters.projectId, isActive: true },
              orderBy: { createdAt: 'desc' },
              take: filters.limit || 50
            })
          : [],
        prisma.companyAsset.findMany({
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 50
        })
      ]);

      return {
        projectDocuments,
        companyAssets,
        total: projectDocuments.length + companyAssets.length
      };
    } catch (error) {
      console.error('getAllDocuments error:', error);
      return { projectDocuments: [], companyAssets: [], total: 0 };
    }
  }

  // ==================== WORKFLOW ====================

  async getIncompleteWorkflowItems(projectId) {
    try {
      const tracker = await prisma.projectWorkflowTracker.findFirst({
        where: { projectId, isMainWorkflow: true },
        include: {
          currentPhase: {
            include: {
              sections: {
                include: {
                  lineItems: {
                    where: { isActive: true },
                    orderBy: { displayOrder: 'asc' }
                  }
                },
                orderBy: { displayOrder: 'asc' }
              }
            }
          },
          completedItems: {
            select: { lineItemId: true }
          }
        }
      });

      if (!tracker || !tracker.currentPhase) {
        return [];
      }

      const completedIds = new Set(tracker.completedItems.map(item => item.lineItemId));
      const incomplete = [];

      for (const section of tracker.currentPhase.sections) {
        for (const lineItem of section.lineItems) {
          if (!completedIds.has(lineItem.id)) {
            incomplete.push({
              id: lineItem.id,
              itemName: lineItem.itemName,
              itemLetter: lineItem.itemLetter,
              sectionId: section.id,
              sectionName: section.displayName,
              phaseId: tracker.currentPhase.id,
              phaseName: tracker.currentPhase.phaseName,
              responsibleRole: lineItem.responsibleRole
            });
          }
        }
      }

      return incomplete;
    } catch (error) {
      console.error('getIncompleteWorkflowItems error:', error);
      return [];
    }
  }

  // ==================== ACTIVITY FEED ====================

  async getRecentActivity(limit = 50, userId = null) {
    try {
      const activities = [];

      // Get recent tasks
      const tasks = await prisma.task.findMany({
        take: Math.floor(limit / 4),
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { firstName: true, lastName: true } },
          project: { select: { projectName: true, projectNumber: true } }
        }
      });
      activities.push(...tasks.map(t => ({
        id: t.id,
        type: 'task',
        title: t.title,
        description: `Task "${t.title}" assigned to ${t.assignedTo.firstName} ${t.assignedTo.lastName}`,
        project: t.project ? `Project #${t.project.projectNumber}` : null,
        timestamp: t.createdAt,
        metadata: { status: t.status, priority: t.priority }
      })));

      // Get recent messages
      const messages = await prisma.projectMessage.findMany({
        take: Math.floor(limit / 4),
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { projectName: true, projectNumber: true } }
        }
      });
      activities.push(...messages.map(m => ({
        id: m.id,
        type: 'message',
        title: m.subject,
        description: m.content.substring(0, 100),
        project: `Project #${m.projectNumber}`,
        timestamp: m.createdAt,
        metadata: { messageType: m.messageType, priority: m.priority }
      })));

      // Get recent emails
      const emails = await prisma.email.findMany({
        take: Math.floor(limit / 4),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          subject: true,
          senderName: true,
          toNames: true,
          projectId: true
        }
      });
      activities.push(...emails.map(e => ({
        id: e.id,
        type: 'email',
        title: e.subject,
        description: `Email from ${e.senderName} to ${e.toNames.join(', ')}`,
        project: e.projectId ? `Project ${e.projectId}` : null,
        timestamp: e.createdAt,
        metadata: {}
      })));

      // Get recent alerts
      const alerts = await prisma.workflowAlert.findMany({
        take: Math.floor(limit / 4),
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { projectName: true, projectNumber: true } }
        }
      });
      activities.push(...alerts.map(a => ({
        id: a.id,
        type: 'alert',
        title: a.title,
        description: a.message,
        project: `Project #${a.project.projectNumber}`,
        timestamp: a.createdAt,
        metadata: { status: a.status, priority: a.priority }
      })));

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error('getRecentActivity error:', error);
      return [];
    }
  }

  // ==================== SEARCH ====================

  async searchAllData(query) {
    try {
      const searchTerm = query.trim();
      if (!searchTerm) return { projects: [], tasks: [], messages: [], emails: [], customers: [], users: [] };

      const [projects, tasks, messages, emails, customers, users] = await Promise.all([
        prisma.project.findMany({
          where: {
            OR: [
              { projectName: { contains: searchTerm, mode: 'insensitive' } },
              { projectNumber: { equals: parseInt(searchTerm) || -1 } }
            ],
            archived: false
          },
          take: 10,
          select: { id: true, projectName: true, projectNumber: true, status: true }
        }),
        prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          take: 10,
          select: { id: true, title: true, status: true, projectId: true }
        }),
        prisma.projectMessage.findMany({
          where: {
            OR: [
              { subject: { contains: searchTerm, mode: 'insensitive' } },
              { content: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          take: 10,
          select: { id: true, subject: true, projectId: true, createdAt: true }
        }),
        prisma.email.findMany({
          where: {
            OR: [
              { subject: { contains: searchTerm, mode: 'insensitive' } },
              { bodyText: { contains: searchTerm, mode: 'insensitive' } }
            ],
            isDeleted: false
          },
          take: 10,
          select: { id: true, subject: true, senderName: true, createdAt: true }
        }),
        prisma.customer.findMany({
          where: {
            OR: [
              { primaryName: { contains: searchTerm, mode: 'insensitive' } },
              { primaryEmail: { contains: searchTerm, mode: 'insensitive' } }
            ],
            isActive: true
          },
          take: 10,
          select: { id: true, primaryName: true, primaryEmail: true }
        }),
        prisma.user.findMany({
          where: {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ],
            isActive: true
          },
          take: 10,
          select: { id: true, firstName: true, lastName: true, email: true }
        })
      ]);

      return {
        projects,
        tasks,
        messages,
        emails,
        customers,
        users,
        totalResults: projects.length + tasks.length + messages.length + emails.length + customers.length + users.length
      };
    } catch (error) {
      console.error('searchAllData error:', error);
      return { projects: [], tasks: [], messages: [], emails: [], customers: [], users: [], totalResults: 0 };
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  _getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }

  invalidateCache(pattern) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

module.exports = new BubblesContextService();
