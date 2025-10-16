const express = require('express');
const { prisma } = require('../config/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
// Permission constants
const PERMISSIONS = {
  // Project Management
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_READ: 'projects.read',
  PROJECTS_UPDATE: 'projects.update',
  PROJECTS_DELETE: 'projects.delete',
  PROJECTS_ASSIGN: 'projects.assign',
  PROJECTS_VIEW_ALL: 'projects.view_all',
  PROJECTS_VIEW_ASSIGNED: 'projects.view_assigned',
  
  // User Management
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE_ROLES: 'users.manage_roles',
  USERS_VIEW_ALL: 'users.view_all',
  
  // Financial Management
  FINANCES_VIEW: 'finances.view',
  FINANCES_EDIT: 'finances.edit',
  FINANCES_APPROVE: 'finances.approve',
  FINANCES_EXPORT: 'finances.export',
  FINANCES_DELETE: 'finances.delete',
  
  // Document Management
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_DOWNLOAD: 'documents.download',
  DOCUMENTS_DELETE: 'documents.delete',
  DOCUMENTS_SHARE: 'documents.share',
  DOCUMENTS_VIEW_ALL: 'documents.view_all',
  
  // Reports & Analytics
  REPORTS_VIEW: 'reports.view',
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_ADVANCED: 'reports.advanced',
  
  // AI Features
  AI_BUBBLES: 'ai.bubbles',
  AI_ADVANCED: 'ai.advanced',
  AI_MANAGE_SETTINGS: 'ai.manage_settings',
  
  // System Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_MANAGE_INTEGRATIONS: 'settings.manage_integrations',
  SETTINGS_SYSTEM_CONFIG: 'settings.system_config',
  
  // Calendar & Scheduling
  CALENDAR_VIEW: 'calendar.view',
  CALENDAR_EDIT: 'calendar.edit',
  CALENDAR_MANAGE: 'calendar.manage',
  
  // Workflow Management
  WORKFLOW_VIEW: 'workflow.view',
  WORKFLOW_EDIT: 'workflow.edit',
  WORKFLOW_MANAGE: 'workflow.manage',
  WORKFLOW_APPROVE: 'workflow.approve',
  
  // Communication
  COMMUNICATION_SEND: 'communication.send',
  COMMUNICATION_MANAGE: 'communication.manage',
  COMMUNICATION_BULK: 'communication.bulk',
  
  // Data Access
  DATA_PUBLIC: 'data.public',
  DATA_INTERNAL: 'data.internal',
  DATA_CONFIDENTIAL: 'data.confidential',
  DATA_RESTRICTED: 'data.restricted'
};

// Default role permissions
const ROLE_PERMISSIONS = {
  ADMIN: Object.values(PERMISSIONS),
  MANAGER: [
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_ASSIGN,
    PERMISSIONS.PROJECTS_VIEW_ALL,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_VIEW_ALL,
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.FINANCES_EDIT,
    PERMISSIONS.FINANCES_EXPORT,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.DOCUMENTS_SHARE,
    PERMISSIONS.DOCUMENTS_VIEW_ALL,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.AI_BUBBLES,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,
    PERMISSIONS.CALENDAR_MANAGE,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_EDIT,
    PERMISSIONS.WORKFLOW_MANAGE,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.COMMUNICATION_MANAGE,
    PERMISSIONS.DATA_PUBLIC,
    PERMISSIONS.DATA_INTERNAL,
    PERMISSIONS.DATA_CONFIDENTIAL
  ],
  PROJECT_MANAGER: [
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_ASSIGN,
    PERMISSIONS.PROJECTS_VIEW_ALL,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_VIEW_ALL,
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.DOCUMENTS_SHARE,
    PERMISSIONS.DOCUMENTS_VIEW_ALL,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.AI_BUBBLES,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_EDIT,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.DATA_PUBLIC,
    PERMISSIONS.DATA_INTERNAL
  ],
  FOREMAN: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_VIEW_ASSIGNED,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.DOCUMENTS_VIEW_ALL,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.DATA_PUBLIC,
    PERMISSIONS.DATA_INTERNAL
  ],
  WORKER: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_VIEW_ASSIGNED,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.DATA_PUBLIC
  ],
  CLIENT: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_VIEW_ASSIGNED,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.DATA_PUBLIC
  ]
};

/**
 * GET /api/permissions - Get all available permissions
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        permissions: PERMISSIONS,
        rolePermissions: ROLE_PERMISSIONS
      }
    });
  } catch (error) {
    console.error('❌ PERMISSIONS API: Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions'
    });
  }
});

/**
 * GET /api/permissions/role/:role - Get permissions for a specific role
 */
router.get('/role/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    const rolePermissions = ROLE_PERMISSIONS[role.toUpperCase()] || [];
    
    res.json({
      success: true,
      data: {
        role: role.toUpperCase(),
        permissions: rolePermissions
      }
    });
  } catch (error) {
    console.error('❌ PERMISSIONS API: Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role permissions'
    });
  }
});

/**
 * PUT /api/permissions/role/:role - Update permissions for a specific role
 */
router.put('/role/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;
    
    // Check if user has permission to manage roles
    const userRole = req.user.role;
    const userRolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    console.log('🔍 PERMISSIONS API: User role:', userRole);
    console.log('🔍 PERMISSIONS API: User permissions:', userRolePermissions);
    console.log('🔍 PERMISSIONS API: Required permission:', PERMISSIONS.USERS_MANAGE_ROLES);
    
    if (!userRolePermissions.includes(PERMISSIONS.USERS_MANAGE_ROLES)) {
      console.log('❌ PERMISSIONS API: User lacks USERS_MANAGE_ROLES permission');
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to manage role permissions',
        userRole: userRole,
        requiredPermission: PERMISSIONS.USERS_MANAGE_ROLES
      });
    }
    
    // Validate permissions
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permissions: ${invalidPermissions.join(', ')}`
      });
    }
    
    // In a real implementation, you would save this to the database
    // For now, we'll just return success
    console.log(`🔐 PERMISSIONS API: Updated permissions for role ${role}:`, permissions);
    
    res.json({
      success: true,
      data: {
        role: role.toUpperCase(),
        permissions: permissions
      },
      message: `Successfully updated permissions for ${role}`
    });
    
  } catch (error) {
    console.error('❌ PERMISSIONS API: Error updating role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role permissions'
    });
  }
});

/**
 * GET /api/permissions/user/:userId - Get effective permissions for a user
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user with their role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        permissions: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    
    // Combine role permissions with user-specific permissions
    const effectivePermissions = [...new Set([...rolePermissions, ...(user.permissions || [])])];
    
    res.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
        rolePermissions: rolePermissions,
        userPermissions: user.permissions || [],
        effectivePermissions: effectivePermissions
      }
    });
    
  } catch (error) {
    console.error('❌ PERMISSIONS API: Error fetching user permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user permissions'
    });
  }
});

/**
 * POST /api/permissions/check - Check if user has specific permissions
 */
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions must be an array'
      });
    }
    
    // Get user's effective permissions
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        role: true,
        permissions: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const effectivePermissions = [...new Set([...rolePermissions, ...(user.permissions || [])])];
    
    // Check which permissions the user has
    const hasPermissions = permissions.map(permission => ({
      permission,
      hasAccess: effectivePermissions.includes(permission)
    }));
    
    res.json({
      success: true,
      data: {
        hasPermissions,
        effectivePermissions
      }
    });
    
  } catch (error) {
    console.error('❌ PERMISSIONS API: Error checking permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check permissions'
    });
  }
});

/**
 * GET /api/permissions/me - Get current user's permissions and role info
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 PERMISSIONS API: User info request:', {
      userId: req.user.id,
      role: req.user.role,
      email: req.user.email
    });
    
    const userRole = req.user.role;
    const userRolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: userRole,
          permissions: userRolePermissions
        },
        canManageRoles: userRolePermissions.includes(PERMISSIONS.USERS_MANAGE_ROLES)
      }
    });
  } catch (error) {
    console.error('❌ PERMISSIONS API: Error fetching user info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user info'
    });
  }
});

/**
 * GET /api/permissions/matrix - Get permission matrix for all roles
 */
router.get('/matrix', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 PERMISSIONS API: User requesting matrix:', {
      userId: req.user.id,
      role: req.user.role,
      email: req.user.email
    });
    
    // Allow all authenticated users to view the permission matrix
    // Only restrict modification permissions, not viewing
    const matrix = {};
    Object.keys(ROLE_PERMISSIONS).forEach(role => {
      matrix[role] = ROLE_PERMISSIONS[role];
    });
    
    console.log('✅ PERMISSIONS API: Returning permission matrix');
    res.json({
      success: true,
      data: {
        matrix,
        allPermissions: Object.values(PERMISSIONS)
      }
    });
    
  } catch (error) {
    console.error('❌ PERMISSIONS API: Error fetching permission matrix:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permission matrix'
    });
  }
});

module.exports = router;
