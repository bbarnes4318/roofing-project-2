/**
 * Cross-Project Analytics Service
 * Phase 4: Portfolio-level insights, resource allocation, bottlenecks, workload analysis
 */

const { prisma } = require('../config/prisma');

class CrossProjectAnalyticsService {
  constructor() {
    this.analyticsCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes cache
  }

  /**
   * Get portfolio status summary
   */
  async getPortfolioStatus() {
    try {
      const [totalProjects, projectsByStatus, projectsByPhase] = await Promise.all([
        prisma.project.count({ where: { archived: false } }),
        prisma.project.groupBy({
          by: ['status'],
          where: { archived: false },
          _count: true
        }),
        prisma.project.groupBy({
          by: ['phase'],
          where: { archived: false, phase: { not: null } },
          _count: true
        })
      ]);

      const projects = await prisma.project.findMany({
        where: { archived: false },
        select: {
          id: true,
          projectName: true,
          projectNumber: true,
          status: true,
          phase: true,
          progress: true,
          startDate: true,
          endDate: true,
          budget: true,
          actualCost: true,
          projectManagerId: true,
          customerId: true
        }
      });

      // Calculate average progress
      const avgProgress = projects.length > 0
        ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
        : 0;

      // Calculate total budget and cost
      const totalBudget = projects.reduce((sum, p) => sum + parseFloat(p.budget || 0), 0);
      const totalCost = projects.reduce((sum, p) => sum + parseFloat(p.actualCost || 0), 0);

      // Count projects by status
      const statusBreakdown = {};
      for (const group of projectsByStatus) {
        statusBreakdown[group.status] = group._count;
      }

      // Count projects by phase
      const phaseBreakdown = {};
      for (const group of projectsByPhase) {
        phaseBreakdown[group.phase] = group._count;
      }

      return {
        totalProjects,
        avgProgress,
        totalBudget,
        totalCost,
        statusBreakdown,
        phaseBreakdown,
        projects: projects.slice(0, 50), // Limit to 50 for performance
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching portfolio status:', error);
      return {
        totalProjects: 0,
        avgProgress: 0,
        totalBudget: 0,
        totalCost: 0,
        statusBreakdown: {},
        phaseBreakdown: {},
        projects: [],
        generatedAt: new Date()
      };
    }
  }

  /**
   * Analyze resource allocation across projects
   */
  async getResourceAllocation() {
    try {
      const projects = await prisma.project.findMany({
        where: { archived: false },
        select: {
          id: true,
          projectName: true,
          projectNumber: true,
          projectManagerId: true,
          status: true,
          phase: true
        },
        include: {
          projectManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Group projects by manager
      const managerAllocation = {};
      for (const project of projects) {
        const managerId = project.projectManagerId || 'unassigned';
        const managerName = project.projectManager 
          ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
          : 'Unassigned';
        
        if (!managerAllocation[managerId]) {
          managerAllocation[managerId] = {
            managerId,
            managerName,
            managerEmail: project.projectManager?.email || null,
            projectCount: 0,
            activeProjectCount: 0,
            projects: []
          };
        }
        
        managerAllocation[managerId].projectCount++;
        if (project.status === 'IN_PROGRESS') {
          managerAllocation[managerId].activeProjectCount++;
        }
        managerAllocation[managerId].projects.push({
          id: project.id,
          projectName: project.projectName,
          projectNumber: project.projectNumber,
          status: project.status,
          phase: project.phase
        });
      }

      // Convert to array and sort by project count
      const allocation = Object.values(managerAllocation).sort((a, b) => b.projectCount - a.projectCount);

      return {
        allocation,
        totalManagers: allocation.length,
        totalProjects: projects.length,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error analyzing resource allocation:', error);
      return {
        allocation: [],
        totalManagers: 0,
        totalProjects: 0,
        generatedAt: new Date()
      };
    }
  }

  /**
   * Identify bottlenecks across projects
   */
  async identifyBottlenecks() {
    try {
      const projects = await prisma.project.findMany({
        where: { archived: false, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        select: {
          id: true,
          projectName: true,
          projectNumber: true,
          status: true,
          phase: true,
          progress: true
        }
      });

      // Get workflow trackers for all active projects
      const trackers = await prisma.projectWorkflowTracker.findMany({
        where: {
          projectId: { in: projects.map(p => p.id) },
          isMainWorkflow: true
        },
        include: {
          currentLineItem: {
            select: {
              id: true,
              itemName: true,
              responsibleRole: true,
              section: {
                select: {
                  sectionName: true,
                  phase: {
                    select: {
                      phaseType: true,
                      phaseName: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Count projects stuck in each phase
      const phaseBottlenecks = {};
      for (const tracker of trackers) {
        if (!tracker.currentLineItem) continue;
        
        const phaseType = tracker.currentLineItem.section?.phase?.phaseType || 'UNKNOWN';
        if (!phaseBottlenecks[phaseType]) {
          phaseBottlenecks[phaseType] = {
            phaseType,
            phaseName: tracker.currentLineItem.section?.phase?.phaseName || phaseType,
            projectCount: 0,
            projects: []
          };
        }
        
        phaseBottlenecks[phaseType].projectCount++;
        const project = projects.find(p => p.id === tracker.projectId);
        if (project) {
          phaseBottlenecks[phaseType].projects.push({
            id: project.id,
            projectName: project.projectName,
            projectNumber: project.projectNumber,
            currentLineItem: tracker.currentLineItem.itemName,
            responsibleRole: tracker.currentLineItem.responsibleRole
          });
        }
      }

      // Order by project count (most bottlenecked first)
      const bottlenecks = Object.values(phaseBottlenecks)
        .sort((a, b) => b.projectCount - a.projectCount);

      // Count projects by responsible role
      const roleBottlenecks = {};
      for (const tracker of trackers) {
        if (!tracker.currentLineItem?.responsibleRole) continue;
        
        const role = tracker.currentLineItem.responsibleRole;
        if (!roleBottlenecks[role]) {
          roleBottlenecks[role] = {
            role,
            projectCount: 0,
            projects: []
          };
        }
        
        roleBottlenecks[role].projectCount++;
        const project = projects.find(p => p.id === tracker.projectId);
        if (project) {
          roleBottlenecks[role].projects.push({
            id: project.id,
            projectName: project.projectName,
            projectNumber: project.projectNumber
          });
        }
      }

      return {
        phaseBottlenecks: bottlenecks,
        roleBottlenecks: Object.values(roleBottlenecks).sort((a, b) => b.projectCount - a.projectCount),
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error identifying bottlenecks:', error);
      return {
        phaseBottlenecks: [],
        roleBottlenecks: [],
        generatedAt: new Date()
      };
    }
  }

  /**
   * Analyze team workload distribution
   */
  async getTeamWorkload() {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      });

      const workload = await Promise.all(users.map(async (user) => {
        const [tasks, alerts, reminders, managedProjects] = await Promise.all([
          prisma.task.count({
            where: {
              assignedToId: user.id,
              status: { not: 'COMPLETED' }
            }
          }),
          prisma.workflowAlert.count({
            where: {
              assignedToId: user.id,
              status: 'ACTIVE'
            }
          }),
          prisma.calendarEvent.count({
            where: {
              organizerId: user.id,
              startTime: { gte: new Date() }
            }
          }),
          prisma.project.count({
            where: {
              projectManagerId: user.id,
              archived: false,
              status: { in: ['PENDING', 'IN_PROGRESS'] }
            }
          })
        ]);

        // Count overdue tasks
        const overdueTasks = await prisma.task.count({
          where: {
            assignedToId: user.id,
            dueDate: { lt: new Date() },
            status: { not: 'COMPLETED' }
          }
        });

        return {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          role: user.role,
          taskCount: tasks,
          overdueTaskCount: overdueTasks,
          alertCount: alerts,
          reminderCount: reminders,
          managedProjectCount: managedProjects,
          workloadScore: tasks + alerts + reminders + managedProjects
        };
      }));

      return workload.sort((a, b) => b.workloadScore - a.workloadScore);
    } catch (error) {
      console.error('Error analyzing team workload:', error);
      return [];
    }
  }

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary() {
    try {
      const [portfolioStatus, resourceAllocation, bottlenecks, teamWorkload] = await Promise.all([
        this.getPortfolioStatus(),
        this.getResourceAllocation(),
        this.identifyBottlenecks(),
        this.getTeamWorkload()
      ]);

      return {
        portfolio: portfolioStatus,
        resourceAllocation,
        bottlenecks,
        teamWorkload,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating analytics summary:', error);
      return {
        portfolio: { totalProjects: 0 },
        resourceAllocation: { allocation: [] },
        bottlenecks: { phaseBottlenecks: [], roleBottlenecks: [] },
        teamWorkload: [],
        generatedAt: new Date()
      };
    }
  }
}

module.exports = new CrossProjectAnalyticsService();

