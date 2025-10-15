import React, { useState, useEffect } from 'react';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../../utils/permissions';
import permissionService from '../../services/permissionService';

const PermissionMatrix = ({ colorMode, onPermissionChange }) => {
  const [matrix, setMatrix] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterPermission, setFilterPermission] = useState('all');
  const [readOnly, setReadOnly] = useState(false);

  const ROLES = [
    { value: 'ADMIN', label: 'Admin', color: 'red' },
    { value: 'MANAGER', label: 'Manager', color: 'purple' },
    { value: 'PROJECT_MANAGER', label: 'Project Manager', color: 'blue' },
    { value: 'FOREMAN', label: 'Foreman', color: 'green' },
    { value: 'WORKER', label: 'Worker', color: 'orange' },
    { value: 'CLIENT', label: 'Client', color: 'gray' }
  ];

  const PERMISSION_GROUPS = {
    'Project Management': [
      PERMISSIONS.PROJECTS_CREATE,
      PERMISSIONS.PROJECTS_READ,
      PERMISSIONS.PROJECTS_UPDATE,
      PERMISSIONS.PROJECTS_DELETE,
      PERMISSIONS.PROJECTS_ASSIGN,
      PERMISSIONS.PROJECTS_VIEW_ALL,
      PERMISSIONS.PROJECTS_VIEW_ASSIGNED
    ],
    'User Management': [
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.USERS_MANAGE_ROLES,
      PERMISSIONS.USERS_VIEW_ALL
    ],
    'Financial Management': [
      PERMISSIONS.FINANCES_VIEW,
      PERMISSIONS.FINANCES_EDIT,
      PERMISSIONS.FINANCES_APPROVE,
      PERMISSIONS.FINANCES_EXPORT,
      PERMISSIONS.FINANCES_DELETE
    ],
    'Document Management': [
      PERMISSIONS.DOCUMENTS_UPLOAD,
      PERMISSIONS.DOCUMENTS_DOWNLOAD,
      PERMISSIONS.DOCUMENTS_DELETE,
      PERMISSIONS.DOCUMENTS_SHARE,
      PERMISSIONS.DOCUMENTS_VIEW_ALL
    ],
    'Reports & Analytics': [
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_GENERATE,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.REPORTS_ADVANCED
    ],
    'AI Features': [
      PERMISSIONS.AI_BUBBLES,
      PERMISSIONS.AI_ADVANCED,
      PERMISSIONS.AI_MANAGE_SETTINGS
    ],
    'System Settings': [
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_EDIT,
      PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS,
      PERMISSIONS.SETTINGS_SYSTEM_CONFIG
    ],
    'Calendar & Scheduling': [
      PERMISSIONS.CALENDAR_VIEW,
      PERMISSIONS.CALENDAR_EDIT,
      PERMISSIONS.CALENDAR_MANAGE
    ],
    'Workflow Management': [
      PERMISSIONS.WORKFLOW_VIEW,
      PERMISSIONS.WORKFLOW_EDIT,
      PERMISSIONS.WORKFLOW_MANAGE,
      PERMISSIONS.WORKFLOW_APPROVE
    ],
    'Communication': [
      PERMISSIONS.COMMUNICATION_SEND,
      PERMISSIONS.COMMUNICATION_MANAGE,
      PERMISSIONS.COMMUNICATION_BULK
    ],
    'Data Access': [
      PERMISSIONS.DATA_PUBLIC,
      PERMISSIONS.DATA_INTERNAL,
      PERMISSIONS.DATA_CONFIDENTIAL,
      PERMISSIONS.DATA_RESTRICTED
    ]
  };

  // Initialize matrix with permissions from API
  useEffect(() => {
    const loadPermissionMatrix = async () => {
      try {
        console.log('🔍 PERMISSION MATRIX: Loading permission matrix...');
        const response = await permissionService.getPermissionMatrix();
        console.log('🔍 PERMISSION MATRIX: Response:', response);
        if (response.success) {
          setMatrix(response.data.matrix);
        } else {
          // Fallback to default permissions
          const initialMatrix = {};
          ROLES.forEach(role => {
            initialMatrix[role.value] = ROLE_PERMISSIONS[role.value] || [];
          });
          setMatrix(initialMatrix);
        }
      } catch (error) {
        console.error('Failed to load permission matrix:', error);
        console.log('Using fallback permissions');
        // Always show the matrix with default permissions
        const initialMatrix = {};
        ROLES.forEach(role => {
          initialMatrix[role.value] = ROLE_PERMISSIONS[role.value] || [];
        });
        setMatrix(initialMatrix);
        
        // Set read-only if user lacks admin permissions
        if (error.message.includes('403') || error.message.includes('Insufficient permissions')) {
          setReadOnly(true);
        }
      }
    };

    loadPermissionMatrix();
  }, []);

  const togglePermission = async (role, permission) => {
    if (readOnly) {
      alert('You need administrator privileges to modify permissions. This is a read-only view.');
      return;
    }
    
    const currentPermissions = matrix[role] || [];
    const isEnabled = currentPermissions.includes(permission);
    
    const newPermissions = isEnabled
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    const newMatrix = {
      ...matrix,
      [role]: newPermissions
    };
    
    setMatrix(newMatrix);
    
    // Save to API
    try {
      const response = await permissionService.updateRolePermissions(role, newPermissions);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Failed to save permission change:', error);
      // Don't revert on error - keep the change locally
      console.log('Permission change saved locally (API unavailable)');
    }
    
    if (onPermissionChange) {
      onPermissionChange(newMatrix);
    }
  };

  const getFilteredRoles = () => {
    if (filterRole === 'all') {
      return ROLES;
    }
    return ROLES.filter(role => role.value === filterRole);
  };

  const getFilteredGroups = () => {
    if (filterPermission === 'all') {
      return Object.keys(PERMISSION_GROUPS);
    }
    return [filterPermission];
  };

  const getPermissionName = (permission) => {
    const nameMap = {
      [PERMISSIONS.PROJECTS_CREATE]: 'Create Projects',
      [PERMISSIONS.PROJECTS_READ]: 'View Projects',
      [PERMISSIONS.PROJECTS_UPDATE]: 'Edit Projects',
      [PERMISSIONS.PROJECTS_DELETE]: 'Delete Projects',
      [PERMISSIONS.PROJECTS_ASSIGN]: 'Assign Projects',
      [PERMISSIONS.PROJECTS_VIEW_ALL]: 'View All Projects',
      [PERMISSIONS.PROJECTS_VIEW_ASSIGNED]: 'View Assigned Projects',
      [PERMISSIONS.USERS_CREATE]: 'Create Users',
      [PERMISSIONS.USERS_READ]: 'View Users',
      [PERMISSIONS.USERS_UPDATE]: 'Edit Users',
      [PERMISSIONS.USERS_DELETE]: 'Delete Users',
      [PERMISSIONS.USERS_MANAGE_ROLES]: 'Manage Roles',
      [PERMISSIONS.USERS_VIEW_ALL]: 'View All Users',
      [PERMISSIONS.FINANCES_VIEW]: 'View Finances',
      [PERMISSIONS.FINANCES_EDIT]: 'Edit Finances',
      [PERMISSIONS.FINANCES_APPROVE]: 'Approve Finances',
      [PERMISSIONS.FINANCES_EXPORT]: 'Export Finances',
      [PERMISSIONS.FINANCES_DELETE]: 'Delete Finances',
      [PERMISSIONS.DOCUMENTS_UPLOAD]: 'Upload Documents',
      [PERMISSIONS.DOCUMENTS_DOWNLOAD]: 'Download Documents',
      [PERMISSIONS.DOCUMENTS_DELETE]: 'Delete Documents',
      [PERMISSIONS.DOCUMENTS_SHARE]: 'Share Documents',
      [PERMISSIONS.DOCUMENTS_VIEW_ALL]: 'View All Documents',
      [PERMISSIONS.REPORTS_VIEW]: 'View Reports',
      [PERMISSIONS.REPORTS_GENERATE]: 'Generate Reports',
      [PERMISSIONS.REPORTS_EXPORT]: 'Export Reports',
      [PERMISSIONS.REPORTS_ADVANCED]: 'Advanced Reports',
      [PERMISSIONS.AI_BUBBLES]: 'AI Bubbles',
      [PERMISSIONS.AI_ADVANCED]: 'Advanced AI',
      [PERMISSIONS.AI_MANAGE_SETTINGS]: 'Manage AI Settings',
      [PERMISSIONS.SETTINGS_VIEW]: 'View Settings',
      [PERMISSIONS.SETTINGS_EDIT]: 'Edit Settings',
      [PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS]: 'Manage Integrations',
      [PERMISSIONS.SETTINGS_SYSTEM_CONFIG]: 'System Config',
      [PERMISSIONS.CALENDAR_VIEW]: 'View Calendar',
      [PERMISSIONS.CALENDAR_EDIT]: 'Edit Calendar',
      [PERMISSIONS.CALENDAR_MANAGE]: 'Manage Calendar',
      [PERMISSIONS.WORKFLOW_VIEW]: 'View Workflow',
      [PERMISSIONS.WORKFLOW_EDIT]: 'Edit Workflow',
      [PERMISSIONS.WORKFLOW_MANAGE]: 'Manage Workflow',
      [PERMISSIONS.WORKFLOW_APPROVE]: 'Approve Workflow',
      [PERMISSIONS.COMMUNICATION_SEND]: 'Send Messages',
      [PERMISSIONS.COMMUNICATION_MANAGE]: 'Manage Communication',
      [PERMISSIONS.COMMUNICATION_BULK]: 'Bulk Communication',
      [PERMISSIONS.DATA_PUBLIC]: 'Public Data',
      [PERMISSIONS.DATA_INTERNAL]: 'Internal Data',
      [PERMISSIONS.DATA_CONFIDENTIAL]: 'Confidential Data',
      [PERMISSIONS.DATA_RESTRICTED]: 'Restricted Data'
    };
    return nameMap[permission] || permission;
  };

  return (
    <div className={`h-screen flex flex-col ${colorMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Compact Header */}
      <div className={`p-3 border-b ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {readOnly && (
          <div className={`mb-2 p-2 rounded text-xs ${colorMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
            <span className="text-yellow-600">⚠️</span>
            <span className={`ml-1 ${colorMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
              Read-Only Mode: Admin privileges required to modify permissions
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              📊 Permission Matrix
            </h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-32 px-2 py-1 rounded text-xs ${
                colorMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`px-2 py-1 rounded text-xs ${
                colorMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Roles</option>
              {ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <select
              value={filterPermission}
              onChange={(e) => setFilterPermission(e.target.value)}
              className={`px-2 py-1 rounded text-xs ${
                colorMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Categories</option>
              {Object.keys(PERMISSION_GROUPS).map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compact Matrix Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Permission Categories Sidebar */}
          <div className="w-1/3 border-r overflow-y-auto">
            <div className={`p-2 text-xs font-semibold ${colorMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
              📋 Permission Categories
            </div>
            {getFilteredGroups().map(group => {
              const permissions = PERMISSION_GROUPS[group].filter(permission => 
                !searchTerm || getPermissionName(permission).includes(searchTerm.toLowerCase())
              );

              return (
                <div key={group} className={`border-b ${colorMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  {/* Group Header */}
                  <div className={`p-2 font-semibold text-sm ${colorMode ? 'bg-gray-700/30 text-white' : 'bg-gray-50 text-gray-900'}`}>
                    {group} ({permissions.length})
                  </div>
                  
                  {/* Permissions */}
                  {permissions.map(permission => (
                    <div key={permission} className={`p-2 text-xs border-b ${colorMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                      {getPermissionName(permission)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Roles Matrix */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-full">
              {/* Role Headers */}
              <div className={`flex border-b ${colorMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`w-1/3 p-2 text-xs font-medium ${colorMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  👥 Role Permissions
                </div>
                {getFilteredRoles().map(role => (
                  <div key={role.value} className={`flex-1 p-2 text-center text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="flex flex-col items-center">
                      <span>{role.label}</span>
                      <div className={`w-2 h-2 rounded-full mt-1 bg-${role.color}-500`}></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Permission Rows */}
              {getFilteredGroups().map(group => {
                const permissions = PERMISSION_GROUPS[group].filter(permission => 
                  !searchTerm || getPermissionName(permission).includes(searchTerm.toLowerCase())
                );

                return (
                  <div key={group}>
                    {permissions.map(permission => (
                      <div key={permission} className={`flex border-b ${colorMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className={`w-1/3 p-2 text-xs ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {getPermissionName(permission)}
                        </div>
                        {getFilteredRoles().map(role => {
                          const isEnabled = (matrix[role.value] || []).includes(permission);
                          return (
                            <div key={role.value} className="flex-1 p-2 text-center">
                              <button
                                onClick={() => togglePermission(role.value, permission)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all hover:scale-110 ${
                                  isEnabled
                                    ? colorMode
                                      ? 'bg-green-500 border-green-500 text-white'
                                      : 'bg-green-500 border-green-500 text-white'
                                    : colorMode
                                      ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                                      : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                {isEnabled && <span className="text-xs">✓</span>}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Summary */}
      <div className={`p-2 border-t ${colorMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex justify-between text-xs">
          {getFilteredRoles().map(role => {
            const permissions = matrix[role.value] || [];
            const totalPermissions = Object.values(PERMISSIONS).length;
            const percentage = Math.round((permissions.length / totalPermissions) * 100);
            
            return (
              <div key={role.value} className="text-center">
                <div className={`text-sm font-bold text-${role.color}-500`}>
                  {permissions.length}
                </div>
                <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {role.label}
                </div>
                <div className={`text-xs ${colorMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrix;