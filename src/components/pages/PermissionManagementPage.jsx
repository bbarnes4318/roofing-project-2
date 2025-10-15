import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../../utils/permissions';
import PermissionGate from '../ui/PermissionGate';
import permissionService from '../../services/permissionService';

const PermissionManagementPage = ({ colorMode }) => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [rolePermissions, setRolePermissions] = useState({});
  const [customPermissions, setCustomPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  // Permission categories for organization
  const PERMISSION_CATEGORIES = {
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

  const ROLES = [
    { value: 'ADMIN', label: 'Administrator', color: 'red', level: 100 },
    { value: 'MANAGER', label: 'Manager', color: 'purple', level: 80 },
    { value: 'PROJECT_MANAGER', label: 'Project Manager', color: 'blue', level: 60 },
    { value: 'FOREMAN', label: 'Foreman', color: 'green', level: 40 },
    { value: 'WORKER', label: 'Worker', color: 'orange', level: 20 },
    { value: 'CLIENT', label: 'Client', color: 'gray', level: 10 }
  ];

  // Load role permissions on component mount
  useEffect(() => {
    loadRolePermissions();
  }, [selectedRole]);

  const loadRolePermissions = async () => {
    setIsLoading(true);
    try {
      const response = await permissionService.getRolePermissions(selectedRole);
      if (response.success) {
        setRolePermissions({ [selectedRole]: response.data.permissions });
        setCustomPermissions({ [selectedRole]: [] });
      } else {
        throw new Error(response.message || 'Failed to load role permissions');
      }
    } catch (error) {
      console.error('Failed to load role permissions:', error);
      console.log('Using fallback permissions');
      // Always show permissions with default values
      const defaultPermissions = ROLE_PERMISSIONS[selectedRole] || [];
      setRolePermissions({ [selectedRole]: defaultPermissions });
      setCustomPermissions({ [selectedRole]: [] });
      
      // Set read-only if user lacks admin permissions
      if (error.message.includes('403') || error.message.includes('Insufficient permissions')) {
        setReadOnly(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (permission) => {
    if (readOnly) {
      alert('You need administrator privileges to modify permissions. This is a read-only view.');
      return;
    }
    
    const currentPermissions = rolePermissions[selectedRole] || [];
    const isEnabled = currentPermissions.includes(permission);
    
    const newPermissions = isEnabled
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setRolePermissions({
      ...rolePermissions,
      [selectedRole]: newPermissions
    });
  };

  const toggleAllPermissions = (category) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category];
    const currentPermissions = rolePermissions[selectedRole] || [];
    const categoryEnabled = categoryPermissions.every(p => currentPermissions.includes(p));
    
    const newPermissions = categoryEnabled
      ? currentPermissions.filter(p => !categoryPermissions.includes(p))
      : [...new Set([...currentPermissions, ...categoryPermissions])];
    
    setRolePermissions({
      ...rolePermissions,
      [selectedRole]: newPermissions
    });
  };

  const savePermissions = async () => {
    setIsLoading(true);
    try {
      const response = await permissionService.updateRolePermissions(
        selectedRole, 
        rolePermissions[selectedRole] || []
      );
      
      if (response.success) {
        alert('Permissions saved successfully!');
      } else {
        throw new Error(response.message || 'Failed to save permissions');
      }
    } catch (error) {
      console.error('Failed to save permissions:', error);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        alert('You need to be logged in as an administrator to manage permissions.');
      } else {
        alert(`Failed to save permissions: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    const defaultPermissions = ROLE_PERMISSIONS[selectedRole] || [];
    setRolePermissions({
      ...rolePermissions,
      [selectedRole]: defaultPermissions
    });
  };

  const getFilteredCategories = () => {
    if (filterCategory === 'all') {
      return Object.keys(PERMISSION_CATEGORIES);
    }
    return [filterCategory];
  };

  const getFilteredPermissions = (category) => {
    const permissions = PERMISSION_CATEGORIES[category];
    if (!searchTerm) return permissions;
    
    return permissions.filter(permission => 
      permission.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPermissionDescription(permission).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getPermissionDescription = (permission) => {
    const descriptions = {
      [PERMISSIONS.PROJECTS_CREATE]: 'Create new projects',
      [PERMISSIONS.PROJECTS_READ]: 'View project details',
      [PERMISSIONS.PROJECTS_UPDATE]: 'Edit project information',
      [PERMISSIONS.PROJECTS_DELETE]: 'Remove projects',
      [PERMISSIONS.PROJECTS_ASSIGN]: 'Assign projects to users',
      [PERMISSIONS.PROJECTS_VIEW_ALL]: 'View all projects',
      [PERMISSIONS.PROJECTS_VIEW_ASSIGNED]: 'View only assigned projects',
      [PERMISSIONS.USERS_CREATE]: 'Add new users',
      [PERMISSIONS.USERS_READ]: 'View user information',
      [PERMISSIONS.USERS_UPDATE]: 'Edit user details',
      [PERMISSIONS.USERS_DELETE]: 'Remove users',
      [PERMISSIONS.USERS_MANAGE_ROLES]: 'Assign/change user roles',
      [PERMISSIONS.USERS_VIEW_ALL]: 'View all users',
      [PERMISSIONS.FINANCES_VIEW]: 'View financial data',
      [PERMISSIONS.FINANCES_EDIT]: 'Modify financial records',
      [PERMISSIONS.FINANCES_APPROVE]: 'Approve financial transactions',
      [PERMISSIONS.FINANCES_EXPORT]: 'Export financial reports',
      [PERMISSIONS.FINANCES_DELETE]: 'Remove financial records',
      [PERMISSIONS.DOCUMENTS_UPLOAD]: 'Upload documents',
      [PERMISSIONS.DOCUMENTS_DOWNLOAD]: 'Download documents',
      [PERMISSIONS.DOCUMENTS_DELETE]: 'Delete documents',
      [PERMISSIONS.DOCUMENTS_SHARE]: 'Share documents',
      [PERMISSIONS.DOCUMENTS_VIEW_ALL]: 'View all documents',
      [PERMISSIONS.REPORTS_VIEW]: 'View reports',
      [PERMISSIONS.REPORTS_GENERATE]: 'Generate reports',
      [PERMISSIONS.REPORTS_EXPORT]: 'Export reports',
      [PERMISSIONS.REPORTS_ADVANCED]: 'Access advanced reports',
      [PERMISSIONS.AI_BUBBLES]: 'Use AI bubbles feature',
      [PERMISSIONS.AI_ADVANCED]: 'Access advanced AI features',
      [PERMISSIONS.AI_MANAGE_SETTINGS]: 'Manage AI settings',
      [PERMISSIONS.SETTINGS_VIEW]: 'View settings',
      [PERMISSIONS.SETTINGS_EDIT]: 'Edit settings',
      [PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS]: 'Manage integrations',
      [PERMISSIONS.SETTINGS_SYSTEM_CONFIG]: 'System configuration',
      [PERMISSIONS.CALENDAR_VIEW]: 'View calendar',
      [PERMISSIONS.CALENDAR_EDIT]: 'Edit calendar',
      [PERMISSIONS.CALENDAR_MANAGE]: 'Manage calendar',
      [PERMISSIONS.WORKFLOW_VIEW]: 'View workflows',
      [PERMISSIONS.WORKFLOW_EDIT]: 'Edit workflows',
      [PERMISSIONS.WORKFLOW_MANAGE]: 'Manage workflows',
      [PERMISSIONS.WORKFLOW_APPROVE]: 'Approve workflows',
      [PERMISSIONS.COMMUNICATION_SEND]: 'Send communications',
      [PERMISSIONS.COMMUNICATION_MANAGE]: 'Manage communications',
      [PERMISSIONS.COMMUNICATION_BULK]: 'Bulk communications',
      [PERMISSIONS.DATA_PUBLIC]: 'Access public data',
      [PERMISSIONS.DATA_INTERNAL]: 'Access internal data',
      [PERMISSIONS.DATA_CONFIDENTIAL]: 'Access confidential data',
      [PERMISSIONS.DATA_RESTRICTED]: 'Access restricted data'
    };
    return descriptions[permission] || permission;
  };

  const getRoleColor = (role) => {
    const roleData = ROLES.find(r => r.value === role);
    return roleData?.color || 'gray';
  };

  const getRoleLevel = (role) => {
    const roleData = ROLES.find(r => r.value === role);
    return roleData?.level || 0;
  };

  const currentPermissions = rolePermissions[selectedRole] || [];
  const totalPermissions = Object.values(PERMISSIONS).length;
  const enabledCount = currentPermissions.length;
  const percentage = Math.round((enabledCount / totalPermissions) * 100);

  return (
    <div className={`min-h-screen p-6 ${colorMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className={`border rounded-xl p-6 mb-6 ${
            colorMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            {readOnly && (
              <div className={`mb-4 p-3 rounded-lg ${colorMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className={`text-sm font-medium ${colorMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                    Read-Only Mode: You need administrator privileges to modify permissions
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                  🔐 Granular Permission Management
                </h1>
                <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {readOnly ? 'View role permissions and access controls (Read-Only)' : 'Fine-grained control over all application permissions and role access'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    colorMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </button>
                <button
                  onClick={savePermissions}
                  disabled={isLoading || readOnly}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isLoading || readOnly
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : colorMode
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isLoading ? 'Saving...' : readOnly ? 'Read-Only Mode' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Role Selection */}
            <div className="flex items-center gap-4 mb-4">
              <label className={`font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Role:
              </label>
              <div className="flex gap-2">
                {ROLES.map(role => (
                  <button
                    key={role.value}
                    onClick={() => !readOnly && setSelectedRole(role.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedRole === role.value
                        ? colorMode
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-blue-500 text-white shadow-lg'
                        : colorMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Stats */}
            <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg ${
              colorMode ? 'bg-gray-700/50' : 'bg-gray-100'
            }`}>
              <div className="text-center">
                <div className={`text-2xl font-bold ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {enabledCount}
                </div>
                <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Enabled Permissions
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                  {percentage}%
                </div>
                <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Access Level
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${colorMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {getRoleLevel(selectedRole)}
                </div>
                <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Role Level
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${colorMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  {Object.keys(PERMISSION_CATEGORIES).length}
                </div>
                <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Categories
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className={`border rounded-lg p-4 mb-6 ${
            colorMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    colorMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`px-4 py-2 rounded-lg border ${
                    colorMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Categories</option>
                  {Object.keys(PERMISSION_CATEGORIES).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Permission Categories */}
          <div className="space-y-6">
            {getFilteredCategories().map(category => {
              const categoryPermissions = getFilteredPermissions(category);
              const enabledInCategory = categoryPermissions.filter(p => currentPermissions.includes(p)).length;
              const totalInCategory = categoryPermissions.length;
              const categoryEnabled = enabledInCategory === totalInCategory && totalInCategory > 0;
              const categoryPartial = enabledInCategory > 0 && enabledInCategory < totalInCategory;

              return (
                <div key={category} className={`border rounded-xl ${
                  colorMode 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  {/* Category Header */}
                  <div className={`p-4 border-b ${
                    colorMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                          {category}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          categoryEnabled
                            ? colorMode
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-green-100 text-green-800'
                            : categoryPartial
                              ? colorMode
                                ? 'bg-yellow-900/30 text-yellow-300'
                                : 'bg-yellow-100 text-yellow-800'
                              : colorMode
                                ? 'bg-gray-700 text-gray-400'
                                : 'bg-gray-200 text-gray-600'
                        }`}>
                          {enabledInCategory}/{totalInCategory}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleAllPermissions(category)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            categoryEnabled
                              ? colorMode
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                              : colorMode
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {categoryEnabled ? 'Disable All' : 'Enable All'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Grid */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryPermissions.map(permission => {
                        const isEnabled = currentPermissions.includes(permission);
                        return (
                          <div
                            key={permission}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              isEnabled
                                ? colorMode
                                  ? 'bg-green-900/20 border-green-500/50 text-green-300'
                                  : 'bg-green-50 border-green-300 text-green-800'
                                : colorMode
                                  ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => togglePermission(permission)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isEnabled
                                  ? colorMode
                                    ? 'bg-green-500 border-green-500'
                                    : 'bg-green-500 border-green-500'
                                  : colorMode
                                    ? 'border-gray-500'
                                    : 'border-gray-400'
                              }`}>
                                {isEnabled && (
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {permission.split('.').pop().replace(/_/g, ' ')}
                                </div>
                                <div className={`text-xs ${
                                  isEnabled
                                    ? colorMode ? 'text-green-200' : 'text-green-600'
                                    : colorMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {getPermissionDescription(permission)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className={`border rounded-xl p-6 mt-6 ${
              colorMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Advanced Options
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={resetToDefaults}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    colorMode
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={() => {
                    const allPermissions = Object.values(PERMISSIONS);
                    setRolePermissions({
                      ...rolePermissions,
                      [selectedRole]: allPermissions
                    });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    colorMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Enable All
                </button>
                <button
                  onClick={() => {
                    setRolePermissions({
                      ...rolePermissions,
                      [selectedRole]: []
                    });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    colorMode
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  Disable All
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default PermissionManagementPage;
