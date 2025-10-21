const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { prisma } = require('../config/prisma');

const router = express.Router();

// **ROLE MANAGEMENT API ENDPOINTS**

/**
 * GET /api/roles - Get all role assignments
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 ROLES API: Fetching role assignments');
    
    // Get role assignments from database
    const roleAssignments = await prisma.roleAssignment.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`✅ ROLES API: Found ${roleAssignments.length} role assignments`);

    // Transform to expected format - support multiple users per role
    const formattedRoles = {
      projectManager: [],
      fieldDirector: [],
      officeStaff: [],
      administration: [],
      subcontractor: []
    };

    roleAssignments.forEach(assignment => {
      // Convert backend role type to frontend camelCase format
      let roleKey;
      switch (assignment.roleType) {
        case 'PROJECT_MANAGER':
        case 'PRODUCT_MANAGER': // Legacy support
          roleKey = 'projectManager';
          break;
        case 'FIELD_DIRECTOR':
          roleKey = 'fieldDirector';
          break;
        case 'OFFICE_STAFF':
          roleKey = 'officeStaff';
          break;
        case 'ADMINISTRATION':
          roleKey = 'administration';
          break;
        case 'SUBCONTRACTOR':
          roleKey = 'subcontractor';
          break;
        default:
          roleKey = assignment.roleType.toLowerCase().replace('_', '');
      }

      if (formattedRoles.hasOwnProperty(roleKey)) {
        // Add user to the array for this role
        formattedRoles[roleKey].push(assignment.user);
      }
    });

    res.json({
      success: true,
      data: formattedRoles,
      message: 'Role assignments retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ ROLES API: Error fetching role assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role assignments',
      error: error.message
    });
  }
});

/**
 * POST /api/roles/assign - Assign user to role
 */
router.post('/assign', authenticateToken, async (req, res) => {
  try {
    const { roleType, userId } = req.body;
    
    console.log(`🔄 ROLES API: Assigning user ${userId} to role ${roleType}`);

    if (!roleType || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Role type and user ID are required'
      });
    }

    // Validate role type (must match Prisma enum RoleType)
    const validRoles = ['PROJECT_MANAGER', 'FIELD_DIRECTOR', 'OFFICE_STAFF', 'ADMINISTRATION', 'SUBCONTRACTOR'];
    // Normalize role type to handle various input formats
    let normalizedRoleType;
    const upperRoleType = roleType.toUpperCase();

    // Map different input formats to standard role types
    switch (upperRoleType) {
      case 'PROJECT_MANAGER':
      case 'PROJECTMANAGER':
      case 'PRODUCT_MANAGER':
      case 'PRODUCTMANAGER':
        normalizedRoleType = 'PROJECT_MANAGER';
        break;
      case 'FIELD_DIRECTOR':
      case 'FIELDDIRECTOR':
        normalizedRoleType = 'FIELD_DIRECTOR';
        break;
      case 'OFFICE_STAFF':
      case 'OFFICESTAFF':
        normalizedRoleType = 'OFFICE_STAFF';
        break;
      case 'ADMINISTRATION':
        normalizedRoleType = 'ADMINISTRATION';
        break;
      case 'SUBCONTRACTOR':
        normalizedRoleType = 'SUBCONTRACTOR';
        break;
      default:
        // Try camelCase conversion for cases like "projectManager"
        const converted = upperRoleType.replace(/([a-z])([A-Z])/g, '$1_$2');
        if (converted === 'PRODUCT_MANAGER' || converted === 'PROJECT_MANAGER') {
          normalizedRoleType = 'PROJECT_MANAGER';
        } else {
          normalizedRoleType = converted;
        }
    }
    console.log(`🔄 ROLES API: Original roleType: ${roleType}, Normalized: ${normalizedRoleType}, Valid roles: ${JSON.stringify(validRoles)}`);
    
    if (!validRoles.includes(normalizedRoleType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role type'
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if this user already has this role assignment
    const existingAssignment = await prisma.roleAssignment.findFirst({
      where: {
        roleType: normalizedRoleType,
        userId: userId
      }
    });

    if (existingAssignment) {
      console.log(`ℹ️ ROLES API: User ${userId} already assigned to ${normalizedRoleType}`);
      return res.json({
        success: true,
        data: existingAssignment,
        message: `User already assigned to ${normalizedRoleType}`
      });
    }

    // Create new assignment (don't delete existing ones - support multiple users per role)
    const assignment = await prisma.roleAssignment.create({
      data: {
        roleType: normalizedRoleType,
        userId: userId,
        assignedAt: new Date(),
        assignedById: req.user?.id || userId // Use current user or fallback
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`✅ ROLES API: Successfully assigned ${user.firstName} ${user.lastName} to ${normalizedRoleType}`);

    res.json({
      success: true,
      data: assignment,
      message: `Successfully assigned ${user.firstName} ${user.lastName} to ${normalizedRoleType}`
    });
    
  } catch (error) {
    console.error('❌ ROLES API: Error assigning role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign role',
      error: error.message
    });
  }
});

/**
 * DELETE /api/roles/unassign - Remove user from role
 */
router.delete('/unassign', authenticateToken, async (req, res) => {
  try {
    const { roleType } = req.body;
    
    console.log(`🗑️ ROLES API: Removing assignment for role ${roleType}`);

    if (!roleType) {
      return res.status(400).json({
        success: false,
        message: 'Role type is required'
      });
    }

    // Normalize role type using same logic as assign endpoint
    let normalizedRoleType;
    const upperRoleType = roleType.toUpperCase();

    switch (upperRoleType) {
      case 'PROJECT_MANAGER':
      case 'PROJECTMANAGER':
      case 'PRODUCT_MANAGER':
      case 'PRODUCTMANAGER':
        normalizedRoleType = 'PROJECT_MANAGER';
        break;
      case 'FIELD_DIRECTOR':
      case 'FIELDDIRECTOR':
        normalizedRoleType = 'FIELD_DIRECTOR';
        break;
      case 'OFFICE_STAFF':
      case 'OFFICESTAFF':
        normalizedRoleType = 'OFFICE_STAFF';
        break;
      case 'ADMINISTRATION':
        normalizedRoleType = 'ADMINISTRATION';
        break;
      case 'SUBCONTRACTOR':
        normalizedRoleType = 'SUBCONTRACTOR';
        break;
      default:
        normalizedRoleType = upperRoleType.replace(/([a-z])([A-Z])/g, '$1_$2');
    }

    // Remove ALL assignments for this role type
    const deleted = await prisma.roleAssignment.deleteMany({
      where: { roleType: normalizedRoleType }
    });

    console.log(`✅ ROLES API: Removed ${deleted.count} assignments for ${normalizedRoleType}`);

    res.json({
      success: true,
      data: { deletedCount: deleted.count },
      message: `Successfully removed assignment for ${roleType}`
    });
    
  } catch (error) {
    console.error('❌ ROLES API: Error removing role assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove role assignment',
      error: error.message
    });
  }
});

/**
 * POST /api/roles/sync - Synchronize all role assignments (bulk update)
 * Body: { roleAssignments: { projectManager: [userId1, userId2], fieldDirector: [...], ... } }
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { roleAssignments } = req.body;

    console.log('🔄 ROLES API: Synchronizing role assignments:', roleAssignments);

    if (!roleAssignments || typeof roleAssignments !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Role assignments object is required'
      });
    }

    // Map of frontend role keys to backend enum values
    const roleTypeMap = {
      projectManager: 'PROJECT_MANAGER',
      fieldDirector: 'FIELD_DIRECTOR',
      officeStaff: 'OFFICE_STAFF',
      administration: 'ADMINISTRATION',
      subcontractor: 'SUBCONTRACTOR',
      locationManager: 'LOCATION_MANAGER'
    };

    // Process each role type
    for (const [roleKey, userIds] of Object.entries(roleAssignments)) {
      const normalizedRoleType = roleTypeMap[roleKey];

      if (!normalizedRoleType) {
        console.warn(`⚠️ Unknown role type: ${roleKey}`);
        continue;
      }

      // Get current assignments for this role
      const currentAssignments = await prisma.roleAssignment.findMany({
        where: { roleType: normalizedRoleType },
        select: { userId: true, id: true }
      });

      const currentUserIds = new Set(currentAssignments.map(a => a.userId));
      const newUserIds = new Set(Array.isArray(userIds) ? userIds : []);

      // Find users to add and remove
      const toAdd = [...newUserIds].filter(id => !currentUserIds.has(id));
      const toRemove = [...currentUserIds].filter(id => !newUserIds.has(id));

      // Remove users no longer in this role
      if (toRemove.length > 0) {
        await prisma.roleAssignment.deleteMany({
          where: {
            roleType: normalizedRoleType,
            userId: { in: toRemove }
          }
        });
        console.log(`🗑️ Removed ${toRemove.length} users from ${normalizedRoleType}`);
      }

      // Add new users to this role
      for (const userId of toAdd) {
        // Verify user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.warn(`⚠️ User ${userId} not found, skipping`);
          continue;
        }

        // Check if this user already has this role assignment
        const existingAssignment = await prisma.roleAssignment.findFirst({
          where: {
            roleType: normalizedRoleType,
            userId: userId
          }
        });

        if (existingAssignment) {
          console.log(`ℹ️ User ${userId} already has role ${normalizedRoleType}, skipping`);
          continue;
        }

        try {
          await prisma.roleAssignment.create({
            data: {
              roleType: normalizedRoleType,
              userId: userId,
              assignedAt: new Date(),
              assignedById: req.user?.id || userId
            }
          });
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`ℹ️ User ${userId} already has role ${normalizedRoleType}, skipping duplicate`);
            continue;
          }
          console.error(`❌ Error creating role assignment for user ${userId}:`, error);
          throw error;
        }
      }

      if (toAdd.length > 0) {
        console.log(`✅ Added ${toAdd.length} users to ${normalizedRoleType}`);
      }
    }

    console.log('✅ ROLES API: Role synchronization complete');

    res.json({
      success: true,
      message: 'Role assignments synchronized successfully'
    });

  } catch (error) {
    console.error('❌ ROLES API: Error synchronizing roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to synchronize role assignments',
      error: error.message
    });
  }
});

/**
 * GET /api/roles/users - Get all available users for role assignment
 */
router.get('/users', authenticateToken, async (req, res) => {
  try {
    console.log('👥 ROLES API: Fetching available users');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      },
      // Remove isActive filter to see all users
      // where: {
      //   isActive: true
      // },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    console.log(`✅ ROLES API: Found ${users.length} active users`);

    // Transform to expected format with proper role display names
    const roleDisplayNames = {
      'ADMIN': 'Administrator',
      'MANAGER': 'Manager', 
      'PROJECT_MANAGER': 'Project Manager',
      'FOREMAN': 'Field Supervisor',
      'WORKER': 'Office Staff',
      'CLIENT': 'Client'
    };
    
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: roleDisplayNames[user.role] || user.role || 'User'
    }));

    res.json({
      success: true,
      data: formattedUsers,
      message: 'Users retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ ROLES API: Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

/**
 * GET /api/roles/defaults - Get default role assignments for new projects
 */
router.get('/defaults', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 ROLES API: Fetching default role assignments for projects');
    
    const roleAssignments = await prisma.roleAssignment.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create defaults object for project creation  
    const roleDisplayNames = {
      'ADMIN': 'Administrator',
      'MANAGER': 'Manager', 
      'PROJECT_MANAGER': 'Project Manager',
      'FOREMAN': 'Field Supervisor',
      'WORKER': 'Office Staff',
      'CLIENT': 'Client'
    };
    
    const defaults = {
      projectManager: null,
      fieldDirector: null,
      officeStaff: null,
      administration: null
    };

    roleAssignments.forEach(assignment => {
      const user = assignment.user;
      
      switch (assignment.roleType) {
        case 'PROJECT_MANAGER':
        case 'PRODUCT_MANAGER': // Legacy support
          defaults.projectManager = {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            role: roleDisplayNames[user.role] || user.role
          };
          break;
        case 'FIELD_DIRECTOR':
          defaults.fieldDirector = {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            role: roleDisplayNames[user.role] || user.role
          };
          break;
        case 'OFFICE_STAFF':
          defaults.officeStaff = {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            role: roleDisplayNames[user.role] || user.role
          };
          break;
        case 'ADMINISTRATION':
          defaults.administration = {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            role: roleDisplayNames[user.role] || user.role
          };
          break;
      }
    });

    console.log('✅ ROLES API: Default role assignments prepared for project creation');

    res.json({
      success: true,
      data: defaults,
      message: 'Default role assignments retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ ROLES API: Error fetching default roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default role assignments',
      error: error.message
    });
  }
});

/**
 * GET /api/roles/project/:projectId - Get role assignments for a specific project
 */
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log(`🎯 ROLES API: Fetching project-specific role assignments for project ${projectId}`);

    // Get project with assigned users
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        projectName: true,
        projectManagerId: true,
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // For now, use the project manager field
    // TODO: Extend to support multiple role assignments per project
    const projectRoles = {
      projectManager: project.projectManager ? {
        id: project.projectManager.id,
        name: `${project.projectManager.firstName} ${project.projectManager.lastName}`.trim(),
        email: project.projectManager.email,
        role: project.projectManager.role
      } : null,
      fieldDirector: null,
      officeStaff: null,
      administration: null
    };

    res.json({
      success: true,
      data: {
        projectId: project.id,
        projectName: project.projectName,
        roles: projectRoles
      },
      message: 'Project role assignments retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ ROLES API: Error fetching project roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project role assignments',
      error: error.message
    });
  }
});

/**
 * POST /api/roles/project/:projectId/assign - Assign users to roles for a specific project
 */
router.post('/project/:projectId/assign', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { roleAssignments } = req.body; // { projectManager: 'userId', fieldDirector: 'userId', ... }
    
    console.log(`🔄 ROLES API: Assigning project roles for project ${projectId}:`, roleAssignments);

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Validate all users exist
    const userIds = Object.values(roleAssignments).filter(Boolean);
    if (userIds.length > 0) {
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true }
      });

      const existingUserIds = new Set(existingUsers.map(u => u.id));
      const invalidUserIds = userIds.filter(id => !existingUserIds.has(id));
      
      if (invalidUserIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid user IDs: ${invalidUserIds.join(', ')}`
        });
      }
    }

    // Update project manager (primary assignment for now)
    if (roleAssignments.projectManager) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          projectManagerId: roleAssignments.projectManager
        }
      });
    }

    // For other roles, we'll need to create a ProjectRoleAssignment table later
    // For now, log the assignments
    Object.entries(roleAssignments).forEach(([role, userId]) => {
      if (userId && role !== 'projectManager') {
        console.log(`🔄 TODO: Assign ${role} = ${userId} for project ${projectId}`);
      }
    });

    // Get updated project data
    const updatedProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        projectName: true,
        projectManagerId: true,
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Echo back all submitted role assignments, enriching any that we persist
    const updatedRoles = {
      projectManager: updatedProject.projectManager ? {
        id: updatedProject.projectManager.id,
        name: `${updatedProject.projectManager.firstName} ${updatedProject.projectManager.lastName}`.trim(),
        email: updatedProject.projectManager.email,
        role: updatedProject.projectManager.role
      } : (roleAssignments.projectManager ? { id: roleAssignments.projectManager } : null),
      fieldDirector: roleAssignments.fieldDirector ? { id: roleAssignments.fieldDirector } : null,
      officeStaff: roleAssignments.officeStaff ? { id: roleAssignments.officeStaff } : null,
      administration: roleAssignments.administration ? { id: roleAssignments.administration } : null
    };

    console.log(`✅ ROLES API: Successfully updated project roles for ${projectId}`);

    res.json({
      success: true,
      data: {
        projectId: updatedProject.id,
        projectName: updatedProject.projectName,
        roles: updatedRoles,
        assigned: roleAssignments
      },
      message: 'Project role assignments updated successfully'
    });
    
  } catch (error) {
    console.error('❌ ROLES API: Error assigning project roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign project roles',
      error: error.message
    });
  }
});

module.exports = router;