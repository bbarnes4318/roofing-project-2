const express = require('express');
const { PrismaClient } = require('@prisma/client');
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

    // Transform to expected format
    const formattedRoles = {
      productManager: null,
      fieldDirector: null,
      officeStaff: null,
      administration: null
    };

    roleAssignments.forEach(assignment => {
      // Convert backend role type to frontend camelCase format
      let roleKey;
      switch (assignment.roleType) {
        case 'PRODUCT_MANAGER':
          roleKey = 'productManager';
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
        default:
          roleKey = assignment.roleType.toLowerCase().replace('_', '');
      }
      
      if (formattedRoles.hasOwnProperty(roleKey)) {
        formattedRoles[roleKey] = {
          userId: assignment.userId,
          user: assignment.user
        };
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

    // Validate role type
    const validRoles = ['PRODUCT_MANAGER', 'FIELD_DIRECTOR', 'OFFICE_STAFF', 'ADMINISTRATION'];
    const normalizedRoleType = roleType.toUpperCase().replace(/([a-z])([A-Z])/g, '$1_$2');
    
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

    // Remove existing assignment for this role
    await prisma.roleAssignment.deleteMany({
      where: { roleType: normalizedRoleType }
    });

    // Create new assignment
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
      message: `Successfully assigned ${user.firstName} ${user.lastName} to ${roleType}`
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

    // Normalize role type
    const normalizedRoleType = roleType.toUpperCase().replace(/([a-z])([A-Z])/g, '$1_$2');
    
    // Remove assignment
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
      where: {
        isActive: true
      },
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
        case 'PRODUCT_MANAGER':
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

module.exports = router;