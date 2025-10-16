import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import PermissionService from '../../services/permissionService';

const RoofingPermissionsPage = ({ colorMode }) => {
  const [selectedRole, setSelectedRole] = useState('PROJECT_MANAGER');
  const [rolePermissions, setRolePermissions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [permissionService] = useState(() => new PermissionService());

  // Real database roles from your schema
  const ROLES = [
    {
      value: 'PROJECT_MANAGER',
      label: 'Project Manager',
      icon: '👷‍♂️',
      description: 'Coordinate project workflows, manage timelines, and oversee project delivery',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    {
      value: 'FIELD_DIRECTOR',
      label: 'Field Director',
      icon: '🔨',
      description: 'Oversee field operations, crew management, and on-site project execution',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      value: 'OFFICE_STAFF',
      label: 'Office Staff',
      icon: '👷',
      description: 'Handle customer communications, scheduling, and administrative tasks',
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      value: 'ADMINISTRATION',
      label: 'Administration',
      icon: '👑',
      description: 'Manage company settings, users, and overall system configuration',
      color: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    {
      value: 'SUBCONTRACTOR',
      label: 'Subcontractor',
      icon: '🔧',
      description: 'External contractor access for project work',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    {
      value: 'LOCATION_MANAGER',
      label: 'Location Manager',
      icon: '🏢',
      description: 'Manage site-specific operations, coordinate with local teams, and oversee location-based project activities',
      color: 'bg-teal-100 text-teal-800 border-teal-200'
    }
  ];

  // Real database permissions from your schema
  const PERMISSIONS = [
    {
      key: 'CREATE_PROJECTS',
      name: 'Create Projects',
      description: 'Start new roofing projects',
      category: 'Project Management',
      icon: '🏗️'
    },
    {
      key: 'EDIT_PROJECTS',
      name: 'Edit Projects',
      description: 'Update project details and specifications',
      category: 'Project Management',
      icon: '✏️'
    },
    {
      key: 'DELETE_PROJECTS',
      name: 'Delete Projects',
      description: 'Remove projects from system',
      category: 'Project Management',
      icon: '🗑️'
    },
    {
      key: 'MANAGE_USERS',
      name: 'Manage Users',
      description: 'Add, edit, or remove system users',
      category: 'User Management',
      icon: '👥'
    },
    {
      key: 'VIEW_REPORTS',
      name: 'View Reports',
      description: 'Access project and financial reports',
      category: 'Analytics',
      icon: '📊'
    },
    {
      key: 'MANAGE_FINANCES',
      name: 'Manage Finances',
      description: 'Handle project costs, estimates, and billing',
      category: 'Financial',
      icon: '💰'
    },
    {
      key: 'MANAGE_DOCUMENTS',
      name: 'Manage Documents',
      description: 'Upload, download, and organize project documents',
      category: 'Documentation',
      icon: '📄'
    },
    {
      key: 'MANAGE_CALENDAR',
      name: 'Manage Calendar',
      description: 'Schedule work, manage appointments',
      category: 'Scheduling',
      icon: '📅'
    },
    {
      key: 'USE_AI_FEATURES',
      name: 'Use AI Features',
      description: 'Access Bubbles AI and advanced features',
      category: 'AI & Automation',
      icon: '🤖'
    }
  ];

  // Default permissions for each role (based on your backend)
  const DEFAULT_ROLE_PERMISSIONS = {
    'PROJECT_MANAGER': [
      'CREATE_PROJECTS', 'EDIT_PROJECTS', 'VIEW_REPORTS', 'MANAGE_DOCUMENTS',
      'MANAGE_CALENDAR', 'USE_AI_FEATURES'
    ],
    'FIELD_DIRECTOR': [
      'EDIT_PROJECTS', 'VIEW_REPORTS', 'MANAGE_DOCUMENTS', 'MANAGE_CALENDAR'
    ],
    'OFFICE_STAFF': [
      'VIEW_REPORTS', 'MANAGE_DOCUMENTS', 'MANAGE_CALENDAR'
    ],
    'ADMINISTRATION': PERMISSIONS.map(p => p.key),
    'SUBCONTRACTOR': [
      'VIEW_REPORTS', 'MANAGE_DOCUMENTS'
    ],
    'LOCATION_MANAGER': [
      'EDIT_PROJECTS', 'VIEW_REPORTS', 'MANAGE_DOCUMENTS', 'MANAGE_CALENDAR'
    ]
  };

  // Load permissions from database on component mount
  useEffect(() => {
    const loadPermissions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const initialPermissions = {};
        
        // Load permissions for each role from the database
        for (const role of ROLES) {
          try {
            const response = await permissionService.getRolePermissions(role.value);
            if (response.success && response.data) {
              initialPermissions[role.value] = response.data.permissions || [];
            } else {
              // Fallback to defaults if no permissions found in database
              initialPermissions[role.value] = DEFAULT_ROLE_PERMISSIONS[role.value] || [];
            }
          } catch (roleError) {
            console.warn(`Failed to load permissions for ${role.value}, using defaults:`, roleError);
            initialPermissions[role.value] = DEFAULT_ROLE_PERMISSIONS[role.value] || [];
          }
        }
        
        setRolePermissions(initialPermissions);
        setSuccessMessage('Permissions loaded successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
        
      } catch (error) {
        console.error('Error loading permissions:', error);
        setError('Failed to load permissions. Using default settings.');
        
        // Fallback to defaults on error
        const fallbackPermissions = {};
        ROLES.forEach(role => {
          fallbackPermissions[role.value] = DEFAULT_ROLE_PERMISSIONS[role.value] || [];
        });
        setRolePermissions(fallbackPermissions);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, [permissionService]);

  const currentPermissions = rolePermissions[selectedRole] || [];
  const selectedRoleData = ROLES.find(r => r.value === selectedRole);

  const togglePermission = (permissionKey) => {
    setRolePermissions(prev => {
      const current = prev[selectedRole] || [];
      const updated = current.includes(permissionKey)
        ? current.filter(p => p !== permissionKey)
        : [...current, permissionKey];
      
      return {
        ...prev,
        [selectedRole]: updated
      };
    });
  };

  const saveRolePermissions = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log('💾 Saving role permissions to database:', rolePermissions);
      
      // Save permissions for each role to the database
      const savePromises = Object.entries(rolePermissions).map(async ([role, permissions]) => {
        try {
          const response = await permissionService.updateRolePermissions(role, permissions);
          if (!response.success) {
            throw new Error(response.message || `Failed to save permissions for ${role}`);
          }
          console.log(`✅ Saved permissions for ${role}:`, permissions);
          return { role, success: true };
        } catch (roleError) {
          console.error(`❌ Failed to save permissions for ${role}:`, roleError);
          return { role, success: false, error: roleError.message };
        }
      });
      
      const results = await Promise.all(savePromises);
      const failedRoles = results.filter(result => !result.success);
      
      if (failedRoles.length === 0) {
        setSuccessMessage('All role permissions saved successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else if (failedRoles.length < results.length) {
        setError(`Some permissions saved successfully. Failed roles: ${failedRoles.map(r => r.role).join(', ')}`);
      } else {
        throw new Error('Failed to save any role permissions');
      }
      
    } catch (error) {
      console.error('❌ Error saving permissions:', error);
      setError(`Failed to save permissions: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const applyRoleDefaults = () => {
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS[selectedRole] || [];
    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: roleDefaults
    }));
  };

  return (
    <div className={`h-screen flex flex-col ${colorMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Success/Error Messages */}
      {successMessage && (
        <div className={`p-3 border-b ${colorMode ? 'bg-green-900/20 border-green-500/40' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅</span>
            <p className={`text-sm ${colorMode ? 'text-green-300' : 'text-green-700'}`}>
              {successMessage}
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className={`p-3 border-b ${colorMode ? 'bg-red-900/20 border-red-500/40' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-red-600">❌</span>
            <p className={`text-sm ${colorMode ? 'text-red-300' : 'text-red-700'}`}>
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Compact Header */}
      <div className={`p-3 border-b ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              🔐 Role Permissions
            </h1>
            <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Manage what each role can access in your roofing business
            </p>
            {isLoading && (
              <p className={`text-xs ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}>
                Loading permissions from database...
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyRoleDefaults}
              className={`px-3 py-1.5 rounded text-sm ${
                colorMode
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              🔄 Reset
            </button>
            <button
              onClick={saveRolePermissions}
              disabled={isSaving || isLoading}
              className={`px-3 py-1.5 rounded text-sm ${
                isSaving || isLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : colorMode
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isSaving ? (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                '💾 Save'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Role Selection */}
        <div className={`w-48 border-r ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-2 border-b ${colorMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              Roles
            </h3>
          </div>
          <div className="p-2 space-y-1">
            {ROLES.map(role => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`w-full p-2 rounded text-left transition-all ${
                  selectedRole === role.value
                    ? colorMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : colorMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{role.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{role.label}</div>
                    <div className="text-xs opacity-75">
                      {rolePermissions[role.value]?.length || 0} permissions
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="flex-1 flex flex-col">
          {/* Selected Role Info */}
          <div className={`p-2 border-b ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedRoleData?.icon}</span>
                <div>
                  <h2 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedRoleData?.label}
                  </h2>
                  <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {currentPermissions.length}/{PERMISSIONS.length} permissions enabled
                  </p>
                </div>
              </div>
              <div className={`text-right ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <div className="text-lg font-bold">
                  {Math.round((currentPermissions.length / PERMISSIONS.length) * 100)}%
                </div>
                <div className="text-xs">Access</div>
              </div>
            </div>
          </div>

          {/* Permissions Grid - 3 columns for compact layout */}
          <div className="flex-1 p-2 overflow-hidden">
            <div className="h-full grid grid-cols-3 gap-2">
              {PERMISSIONS.map(permission => {
                const isEnabled = currentPermissions.includes(permission.key);
                return (
                  <div
                    key={permission.key}
                    className={`border rounded p-2 cursor-pointer transition-all ${
                      isEnabled
                        ? colorMode
                          ? 'bg-green-900/20 border-green-600 text-green-300'
                          : 'bg-green-50 border-green-200 text-green-800'
                        : colorMode
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => togglePermission(permission.key)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border ${
                        isEnabled
                          ? colorMode
                            ? 'bg-green-500 border-green-500'
                            : 'bg-green-500 border-green-500'
                          : colorMode
                            ? 'border-gray-500'
                            : 'border-gray-400'
                      }`}>
                        {isEnabled && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{permission.icon}</span>
                          <div className="font-medium text-sm truncate">{permission.name}</div>
                        </div>
                        <div className="text-xs opacity-75 truncate">{permission.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoofingPermissionsPage;
