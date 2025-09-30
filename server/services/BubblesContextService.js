/**
 * BubblesContextService - Simple, Working Data Provider for Bubbles AI
 */

const { prisma } = require('../config/prisma');

class BubblesContextService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000;
  }

  async getInsights(userId = null) {
    try {
      const [totalProjects, activeProjects, totalTasks, totalAlerts] = await Promise.all([
        prisma.project.count(),
        prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.task.count(),
        prisma.workflowAlert.count({ where: { status: 'ACTIVE' } })
      ]);

      return {
        summary: {
          totalProjects,
          activeProjects,
          overdueTasks: 0,
          upcomingReminders: 0,
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

  async getRecentActivity(limit = 50, userId = null) {
    try {
      const tasks = await prisma.task.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, createdAt: true, status: true }
      });
      return tasks.map(t => ({ ...t, activityType: 'task', timestamp: t.createdAt }));
    } catch (error) {
      console.error('getRecentActivity error:', error);
      return [];
    }
  }

  async getProjectContext(projectId) {
    try {
      return await prisma.project.findUnique({
        where: { id: projectId },
        include: { customer: true, projectManager: true }
      });
    } catch (error) {
      console.error('getProjectContext error:', error);
      return null;
    }
  }

  async getUserContext(userId) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      });
    } catch (error) {
      console.error('getUserContext error:', error);
      return null;
    }
  }

  async getAllTasks(filters = {}) {
    try {
      return await prisma.task.findMany({
        where: filters,
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('getAllTasks error:', error);
      return [];
    }
  }

  async getAllAlerts(filters = {}) {
    try {
      return await prisma.workflowAlert.findMany({
        where: filters,
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('getAllAlerts error:', error);
      return [];
    }
  }

  async getAllReminders(filters = {}) {
    try {
      return await prisma.calendarEvent.findMany({
        where: filters,
        take: 20,
        orderBy: { startTime: 'asc' }
      });
    } catch (error) {
      console.error('getAllReminders error:', error);
      return [];
    }
  }

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
}

module.exports = new BubblesContextService();
