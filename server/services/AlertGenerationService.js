const { prisma } = require('../config/prisma');

class AlertGenerationService {
  /**
   * Batch generate alerts for multiple projects (OPTIMIZED)
   * @param {string[]} projectIds - Array of project IDs
   * @returns {Promise<Object[]>} Array of created alerts
   */
  static async generateBatchAlerts(projectIds) {
    try {
      // Single optimized query to get all active line items with project data
      const activeItems = await prisma.$queryRaw`
        SELECT 
          pwt.project_id,
          pwt.id as tracker_id,
          wli.id as line_item_id,
          wli.item_name,
          wli.responsible_role,
          wli.alert_days,
          ws.display_name as section_name,
          wp.phase_type,
          p.project_number,
          p.project_name,
          p.project_manager_id,
          c.primary_name as customer_name,
          c.address as customer_address
        FROM project_workflow_trackers pwt
        INNER JOIN workflow_line_items wli ON wli.id = pwt.current_line_item_id
        INNER JOIN workflow_sections ws ON ws.id = wli.section_id
        INNER JOIN workflow_phases wp ON wp.id = ws.phase_id
        INNER JOIN projects p ON p.id = pwt.project_id
        LEFT JOIN customers c ON c.id = p.customer_id
        WHERE pwt.project_id = ANY(${projectIds}::text[])
          AND wli.is_active = true
          AND p.status = 'IN_PROGRESS'
      `;

      if (!activeItems || activeItems.length === 0) {
        console.log('No active line items found for batch alert generation');
        return [];
      }

      // Get all responsible users in batch
      const roles = [...new Set(activeItems.map(item => item.responsible_role))];
      const roleAssignments = await prisma.roleAssignment.findMany({
        where: {
          // Map ResponsibleRole -> RoleType enum values
          roleType: { in: roles.map(r => ({
            OFFICE: 'OFFICE_STAFF',
            ADMINISTRATION: 'ADMINISTRATION',
            PROJECT_MANAGER: 'PROJECT_MANAGER',
            FIELD_DIRECTOR: 'FIELD_DIRECTOR',
            ROOF_SUPERVISOR: 'FIELD_DIRECTOR'
          }[r] || 'OFFICE_STAFF')) },
          isActive: true
        },
        select: {
          roleType: true,
          userId: true
        }
      });

      const roleMap = new Map();
      roleAssignments.forEach(ra => {
        roleMap.set(ra.roleType, ra.userId);
      });

      // Check for existing active alerts to avoid duplicates
      const existingAlerts = await prisma.workflowAlert.findMany({
        where: {
          projectId: { in: projectIds },
          status: 'ACTIVE'
        },
        select: {
          projectId: true,
          stepId: true
        }
      });

      const existingSet = new Set(
        existingAlerts.map(a => `${a.projectId}-${a.stepId}`)
      );

      // Prepare batch alert data
      const alertData = [];
      const now = new Date();

      for (const item of activeItems) {
        // Skip if alert already exists
        const key = `${item.project_id}-${item.line_item_id}`;
        if (existingSet.has(key)) {
          continue;
        }

        const mappedRoleType = ({
          OFFICE: 'OFFICE_STAFF',
          ADMINISTRATION: 'ADMINISTRATION',
          PROJECT_MANAGER: 'PROJECT_MANAGER',
          FIELD_DIRECTOR: 'FIELD_DIRECTOR',
          ROOF_SUPERVISOR: 'FIELD_DIRECTOR'
        })[item.responsible_role] || 'OFFICE_STAFF';
        const assignedUserId = roleMap.get(mappedRoleType) || item.project_manager_id;
        
        alertData.push({
          type: 'Work Flow Line Item',
          priority: 'MEDIUM',
          status: 'ACTIVE',
          title: `${item.item_name} - ${item.customer_name}`,
          message: `${item.item_name} is now ready to be completed for project at ${item.project_name}`,
          stepName: item.item_name,
          responsibleRole: item.responsible_role,
          dueDate: new Date(now.getTime() + (item.alert_days || 1) * 24 * 60 * 60 * 1000),
          projectId: item.project_id,
          workflowId: item.tracker_id,
          stepId: item.line_item_id,
          assignedToId: assignedUserId,
          metadata: {
            phase: item.phase_type,
            section: item.section_name,
            projectNumber: item.project_number,
            customerName: item.customer_name,
            address: item.customer_address
          }
        });
      }

      if (alertData.length === 0) {
        console.log('No new alerts to create');
        return [];
      }

      // Batch create all alerts
      const result = await prisma.workflowAlert.createMany({
        data: alertData,
        skipDuplicates: true
      });

      console.log(`✅ Batch created ${result.count} alerts for ${projectIds.length} projects`);
      
      // Return the created alerts for socket emission
      const createdAlerts = await prisma.workflowAlert.findMany({
        where: {
          projectId: { in: projectIds },
          createdAt: { gte: now }
        }
      });

      return createdAlerts;
      
    } catch (error) {
      console.error('Error in batch alert generation:', error);
      throw error;
    }
  }

  /**
   * Generate alert for current active line item only (OPTIMIZED)
   * @param {string} projectId - Project ID
   * @param {string} workflowId - Workflow ID  
   * @param {string} lineItemId - Current active line item ID
   */
  static async generateActiveLineItemAlert(projectId, workflowId, lineItemId) {
    try {
      // Single optimized query for required data
      const [lineItemData, projectData] = await Promise.all([
        prisma.workflowLineItem.findUnique({
          where: { id: lineItemId },
          select: {
            id: true,
            itemName: true,
            responsibleRole: true,
            alertDays: true,
            section: {
              select: {
                displayName: true,
                phase: {
                  select: { phaseType: true }
                }
              }
            }
          }
        }),
        prisma.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            projectManagerId: true,
            customer: {
              select: {
                primaryName: true,
                address: true
              }
            }
          }
        })
      ]);

      if (!lineItemData || !projectData) {
        console.error('Line item or project not found');
        return null;
      }

      // Get responsible user based on role
      const assignedUser = await this.getResponsibleUser(lineItemData.responsibleRole, projectData.projectManagerId);

      // Create alert for active line item
      const alert = await prisma.workflowAlert.create({
        data: {
          type: 'Work Flow Line Item',
          priority: 'MEDIUM',
          status: 'ACTIVE',
          title: `${lineItemData.itemName} - ${projectData.customer.primaryName}`,
          message: `${lineItemData.itemName} is now ready to be completed for project at ${projectData.projectName}`,
          stepName: lineItemData.itemName,
          responsibleRole: lineItemData.responsibleRole,
          dueDate: new Date(Date.now() + (lineItemData.alertDays || 1) * 24 * 60 * 60 * 1000),
          projectId: projectId,
          workflowId: workflowId,
          stepId: lineItemId,
          assignedToId: assignedUser?.id || projectData.projectManagerId,
          metadata: {
            phase: lineItemData.section.phase.phaseType,
            section: lineItemData.section.displayName,
            projectNumber: projectData.projectNumber,
            customerName: projectData.customer.primaryName,
            address: projectData.customer.address
          }
        }
      });

      console.log(`✅ Created alert for line item: ${lineItemData.itemName}`);
      return alert;
      
    } catch (error) {
      console.error('Error generating line item alert:', error);
      throw error;
    }
  }

  /**
   * Get responsible user based on role (OPTIMIZED with caching)
   */
  static async getResponsibleUser(role, defaultUserId) {
    try {
      const roleMapping = {
        'OFFICE': 'OFFICE_STAFF',
        'ADMINISTRATION': 'ADMINISTRATION', 
        'PROJECT_MANAGER': 'PRODUCT_MANAGER',
        'FIELD_DIRECTOR': 'FIELD_DIRECTOR',
        'ROOF_SUPERVISOR': 'FIELD_DIRECTOR'
      };
      
      const roleType = roleMapping[role] || 'OFFICE_STAFF';
      
      const assignment = await prisma.roleAssignment.findFirst({
        where: {
          roleType: roleType,
          isActive: true
        },
        select: { userId: true }
      });

      return assignment ? { id: assignment.userId } : { id: defaultUserId };
    } catch (error) {
      console.error('Error getting responsible user:', error);
      return { id: defaultUserId };
    }
  }

  /**
   * Clear existing alerts for a project/workflow (OPTIMIZED with soft delete)
   * @param {string} projectId - Project ID
   * @param {string} workflowId - Workflow ID
   */
  static async clearProjectAlerts(projectId, workflowId) {
    try {
      // Use update instead of delete for better performance
      const result = await prisma.workflowAlert.updateMany({
        where: {
          projectId: projectId,
          workflowId: workflowId,
          status: 'ACTIVE'
        },
        data: {
          status: 'DISMISSED',
          acknowledgedAt: new Date()
        }
      });
      
      console.log(`🧹 Cleared ${result.count} active alerts for project`);
      return result;
      
    } catch (error) {
      console.error('Error clearing alerts:', error);
      throw error;
    }
  }

  /**
   * Mark an alert as completed when its step is completed
   * @param {string} stepId - Step ID
   */
  static async completeStepAlerts(stepId) {
    try {
      const result = await prisma.workflowAlert.updateMany({
        where: {
          stepId: stepId,
          status: 'ACTIVE'
        },
        data: {
          status: 'COMPLETED',
          acknowledgedAt: new Date()
        }
      });
      
      console.log(`✅ Marked ${result.count} alerts as completed for step`);
      return result;
      
    } catch (error) {
      console.error('Error completing step alerts:', error);
      throw error;
    }
  }

  /**
   * Get all active alerts for a user (OPTIMIZED with caching support)
   * @param {string} userId - User ID
   * @param {number} limit - Number of alerts to return
   * @param {boolean} useCache - Whether to check cache first
   */
  static async getUserAlerts(userId, limit = 50, useCache = true) {
    try {
      // Check cache if enabled
      const cacheKey = `alerts:user:${userId}`;
      
      if (useCache && global.alertCache) {
        const cached = global.alertCache.get(cacheKey);
        if (cached) {
          console.log(`📦 Returning cached alerts for user ${userId}`);
          return cached;
        }
      }

      const alerts = await prisma.workflowAlert.findMany({
        where: {
          assignedToId: userId,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          title: true,
          message: true,
          priority: true,
          dueDate: true,
          stepName: true,
          isRead: true,
          createdAt: true,
          metadata: true,
          project: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              customer: {
                select: {
                  primaryName: true
                }
              }
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ],
        take: limit
      });
      
      // Cache the results for 60 seconds
      if (global.alertCache) {
        global.alertCache.set(cacheKey, alerts, 60);
      }
      
      return alerts;
      
    } catch (error) {
      console.error('Error fetching user alerts:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a user's alerts
   * @param {string} userId - User ID
   */
  static invalidateUserCache(userId) {
    if (global.alertCache) {
      const cacheKey = `alerts:user:${userId}`;
      global.alertCache.del(cacheKey);
      console.log(`🗑️ Invalidated alert cache for user ${userId}`);
    }
  }

  /**
   * Get all active alerts for a project
   * @param {string} projectId - Project ID
   */
  static async getProjectAlerts(projectId) {
    try {
      const alerts = await prisma.workflowAlert.findMany({
        where: {
          projectId: projectId,
          status: 'ACTIVE'
        },
        include: {
          assignedTo: true,
          step: true
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });
      
      return alerts;
      
    } catch (error) {
      console.error('Error fetching project alerts:', error);
      throw error;
    }
  }
}

module.exports = AlertGenerationService;