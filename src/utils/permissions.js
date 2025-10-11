// Enhanced Role-Based Permission System
// Comprehensive permission matrix for granular access control

// Define all available permissions
export const PERMISSIONS = {
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
  
  // Data Access Levels
  DATA_PUBLIC: 'data.public',
  DATA_INTERNAL: 'data.internal',
  DATA_CONFIDENTIAL: 'data.confidential',
  DATA_RESTRICTED: 'data.restricted'
};

// Role-based permission matrix
export const ROLE_PERMISSIONS = {
  ADMIN: [
    // Full access to everything
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_DELETE,
    PERMISSIONS.PROJECTS_ASSIGN,
    PERMISSIONS.PROJECTS_VIEW_ALL,
    
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_MANAGE_ROLES,
    PERMISSIONS.USERS_VIEW_ALL,
    
    PERMISSIONS.FINANCES_VIEW,
    PERMISSIONS.FINANCES_EDIT,
    PERMISSIONS.FINANCES_APPROVE,
    PERMISSIONS.FINANCES_EXPORT,
    PERMISSIONS.FINANCES_DELETE,
    
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.DOCUMENTS_DELETE,
    PERMISSIONS.DOCUMENTS_SHARE,
    PERMISSIONS.DOCUMENTS_VIEW_ALL,
    
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_ADVANCED,
    
    PERMISSIONS.AI_BUBBLES,
    PERMISSIONS.AI_ADVANCED,
    PERMISSIONS.AI_MANAGE_SETTINGS,
    
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS,
    PERMISSIONS.SETTINGS_SYSTEM_CONFIG,
    
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,
    PERMISSIONS.CALENDAR_MANAGE,
    
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_EDIT,
    PERMISSIONS.WORKFLOW_MANAGE,
    PERMISSIONS.WORKFLOW_APPROVE,
    
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.COMMUNICATION_MANAGE,
    PERMISSIONS.COMMUNICATION_BULK,
    
    PERMISSIONS.DATA_PUBLIC,
    PERMISSIONS.DATA_INTERNAL,
    PERMISSIONS.DATA_CONFIDENTIAL,
    PERMISSIONS.DATA_RESTRICTED
  ],
  
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
    PERMISSIONS.AI_ADVANCED,
    
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,
    PERMISSIONS.CALENDAR_MANAGE,
    
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_EDIT,
    PERMISSIONS.WORKFLOW_MANAGE,
    
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.COMMUNICATION_MANAGE,
    PERMISSIONS.COMMUNICATION_BULK,
    
    PERMISSIONS.DATA_PUBLIC,
    PERMISSIONS.DATA_INTERNAL,
    PERMISSIONS.DATA_CONFIDENTIAL
  ],
  
  PROJECT_MANAGER: [
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_VIEW_ASSIGNED,
    
    PERMISSIONS.USERS_READ,
    
    PERMISSIONS.FINANCES_VIEW,
    
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    PERMISSIONS.DOCUMENTS_SHARE,
    
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    
    PERMISSIONS.AI_BUBBLES,
    
    PERMISSIONS.SETTINGS_VIEW,
    
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
    
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    
    PERMISSIONS.REPORTS_VIEW,
    
    PERMISSIONS.AI_BUBBLES,
    
    PERMISSIONS.CALENDAR_VIEW,
    
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_EDIT,
    
    PERMISSIONS.COMMUNICATION_SEND,
    
    PERMISSIONS.DATA_PUBLIC,
    PERMISSIONS.DATA_INTERNAL
  ],
  
  WORKER: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_VIEW_ASSIGNED,
    
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    
    PERMISSIONS.CALENDAR_VIEW,
    
    PERMISSIONS.WORKFLOW_VIEW,
    
    PERMISSIONS.DATA_PUBLIC
  ],
  
  CLIENT: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_VIEW_ASSIGNED,
    
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    
    PERMISSIONS.REPORTS_VIEW,
    
    PERMISSIONS.CALENDAR_VIEW,
    
    PERMISSIONS.DATA_PUBLIC
  ],
  
  SUBCONTRACTOR: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_VIEW_ASSIGNED,
    
    PERMISSIONS.DOCUMENTS_DOWNLOAD,
    
    PERMISSIONS.CALENDAR_VIEW,
    
    PERMISSIONS.WORKFLOW_VIEW,
    
    PERMISSIONS.DATA_PUBLIC
  ]
};

// Permission checking functions
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[userRole.toUpperCase()] || [];
  return rolePermissions.includes(permission);
};

export const hasAnyPermission = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) return false;
  
  return permissions.some(permission => hasPermission(userRole, permission));
};

export const hasAllPermissions = (userRole, permissions) => {
  if (!userRole || !permissions || !Array.isArray(permissions)) return false;
  
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Get all permissions for a role
export const getRolePermissions = (userRole) => {
  if (!userRole) return [];
  return ROLE_PERMISSIONS[userRole.toUpperCase()] || [];
};

// Check if user can access specific data level
export const canAccessDataLevel = (userRole, dataLevel) => {
  const dataLevelPermissions = {
    'public': [PERMISSIONS.DATA_PUBLIC],
    'internal': [PERMISSIONS.DATA_PUBLIC, PERMISSIONS.DATA_INTERNAL],
    'confidential': [PERMISSIONS.DATA_PUBLIC, PERMISSIONS.DATA_INTERNAL, PERMISSIONS.DATA_CONFIDENTIAL],
    'restricted': [PERMISSIONS.DATA_PUBLIC, PERMISSIONS.DATA_INTERNAL, PERMISSIONS.DATA_CONFIDENTIAL, PERMISSIONS.DATA_RESTRICTED]
  };
  
  const requiredPermissions = dataLevelPermissions[dataLevel] || [];
  return hasAnyPermission(userRole, requiredPermissions);
};

// Get filtered data based on user permissions
export const filterDataByPermissions = (userRole, data, dataLevel) => {
  if (canAccessDataLevel(userRole, dataLevel)) {
    return data;
  }
  return [];
};

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY = {
  ADMIN: 100,
  MANAGER: 80,
  PROJECT_MANAGER: 60,
  FOREMAN: 40,
  WORKER: 20,
  CLIENT: 10,
  SUBCONTRACTOR: 10
};

// Check if user role is higher than another role
export const isRoleHigher = (userRole, targetRole) => {
  const userLevel = ROLE_HIERARCHY[userRole?.toUpperCase()] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole?.toUpperCase()] || 0;
  return userLevel > targetLevel;
};

// Get role display name
export const getRoleDisplayName = (role) => {
  const roleNames = {
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    PROJECT_MANAGER: 'Project Manager',
    FOREMAN: 'Foreman',
    WORKER: 'Worker',
    CLIENT: 'Client',
    SUBCONTRACTOR: 'Subcontractor'
  };
  return roleNames[role?.toUpperCase()] || role;
};

// Get role color for UI
export const getRoleColor = (role) => {
  const roleColors = {
    ADMIN: 'red',
    MANAGER: 'purple',
    PROJECT_MANAGER: 'blue',
    FOREMAN: 'orange',
    WORKER: 'green',
    CLIENT: 'gray',
    SUBCONTRACTOR: 'yellow'
  };
  return roleColors[role?.toUpperCase()] || 'gray';
};

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessDataLevel,
  filterDataByPermissions,
  ROLE_HIERARCHY,
  isRoleHigher,
  getRoleDisplayName,
  getRoleColor
};
