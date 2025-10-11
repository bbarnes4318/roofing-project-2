import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';

const ProjectRoleDropdowns = ({ project, colorMode, onRoleAssignmentUpdate, isExpanded }) => {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [projectRoles, setProjectRoles] = useState({
        projectManager: null,
        fieldDirector: null,
        officeStaff: null,
        administration: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [updating, setUpdating] = useState(false);

    // Load available users and current project role assignments
    useEffect(() => {
        if (isExpanded) {
            loadUsersAndProjectRoles();
        }
    }, [project.id, isExpanded]);

    const loadUsersAndProjectRoles = async () => {
        try {
            setLoading(true);
            setError('');

            // Load available users
            const usersResponse = await fetch(`${API_BASE_URL}/roles/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || 'demo-sarah-owner-token-fixed-12345'}`
                }
            });

            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                if (usersData.success) {
                    setAvailableUsers(usersData.data);
                }
            }

            // Load current project role assignments
            const rolesResponse = await fetch(`${API_BASE_URL}/roles/project/${project.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || 'demo-sarah-owner-token-fixed-12345'}`
                }
            });

            if (rolesResponse.ok) {
                const rolesData = await rolesResponse.json();
                if (rolesData.success) {
                    setProjectRoles(rolesData.data.roles);
                }
            }

        } catch (error) {
            console.error('Error loading users and project roles:', error);
            setError('Failed to load role data');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (roleType, userId) => {
        try {
            setUpdating(true);
            setError('');

            // Update project roles state immediately for UI responsiveness
            const updatedRoles = {
                ...projectRoles,
                [roleType]: userId ? availableUsers.find(u => u.id === userId) : null
            };
            setProjectRoles(updatedRoles);

            // Prepare role assignments object
            const roleAssignments = {
                projectManager: roleType === 'projectManager' ? userId : projectRoles.projectManager?.id,
                fieldDirector: roleType === 'fieldDirector' ? userId : projectRoles.fieldDirector?.id,
                officeStaff: roleType === 'officeStaff' ? userId : projectRoles.officeStaff?.id,
                administration: roleType === 'administration' ? userId : projectRoles.administration?.id,
                subcontractor: roleType === 'subcontractor' ? userId : projectRoles.subcontractor?.id,
                locationManager: roleType === 'locationManager' ? userId : projectRoles.locationManager?.id
            };

            // Call API to update role assignments
            const response = await fetch(`${API_BASE_URL}/roles/project/${project.id}/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || 'demo-sarah-owner-token-fixed-12345'}`
                },
                body: JSON.stringify({ roleAssignments })
            });

            if (!response.ok) {
                throw new Error('Failed to update role assignment');
            }

            const result = await response.json();
            if (result.success) {
                // Merge server response so non-persisted roles (fieldDirector, officeStaff, administration)
                // remain selected instead of being cleared
                setProjectRoles(prev => ({
                    ...prev,
                    ...(result?.data?.roles || {})
                }));

                if (onRoleAssignmentUpdate) {
                    onRoleAssignmentUpdate(project.id, {
                        ...projectRoles,
                        ...(result?.data?.roles || {})
                    });
                }

                console.log(`✅ Role ${roleType} updated successfully for project ${project.id}`);
            } else {
                throw new Error(result.message || 'Failed to update role assignment');
            }

        } catch (error) {
            console.error('Error updating role assignment:', error);
            setError(error.message || 'Failed to update role assignment');
            // Revert the UI change on error
            loadUsersAndProjectRoles();
        } finally {
            setUpdating(false);
        }
    };

    const getRoleDisplayName = (roleType) => {
        const roleNames = {
            projectManager: 'Project Manager',
            fieldDirector: 'Field Director',
            officeStaff: 'Office Staff',
            administration: 'Administration'
        };
        return roleNames[roleType] || roleType;
    };

    const getRoleIcon = (roleType) => {
        const roleIcons = {
            projectManager: '👨‍💼',
            fieldDirector: '🏗️',
            officeStaff: '📋',
            administration: '⚙️'
        };
        return roleIcons[roleType] || '👤';
    };

    if (!isExpanded) {
        return null;
    }

    if (loading) {
        return (
            <div className={`mt-4 p-4 rounded-lg border ${
                colorMode ? 'bg-slate-700/30 border-slate-600/30' : 'bg-gray-50/90 border-gray-200/50'
            }`}>
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className={`ml-2 text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading role assignments...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`mt-4 p-4 rounded-lg border ${
            colorMode ? 'bg-slate-700/30 border-slate-600/30' : 'bg-gray-50/90 border-gray-200/50'
        }`}>
            <div className="mb-4">
                <h4 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-2`}>
                    Project Role Assignments
                </h4>
                <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Assign users to roles for this project to ensure workflow alerts are sent to the correct people.
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(projectRoles).map((roleType) => (
                    <div key={roleType} className="space-y-2">
                        <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <span className="mr-2">{getRoleIcon(roleType)}</span>
                            {getRoleDisplayName(roleType)}
                        </label>
                        <select
                            value={projectRoles[roleType]?.id || ''}
                            onChange={(e) => handleRoleChange(roleType, e.target.value || null)}
                            disabled={updating}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                colorMode
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                            } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="">Select user for {getRoleDisplayName(roleType)}</option>
                            {availableUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                        
                        {/* Show current assignment */}
                        {projectRoles[roleType] && (
                            <div className={`text-xs ${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                                ✓ Assigned: {projectRoles[roleType].name}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {updating && (
                <div className="mt-4 flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className={`ml-2 text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Updating role assignments...
                    </span>
                </div>
            )}

            <div className={`mt-4 pt-4 border-t text-xs ${colorMode ? 'border-slate-600 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                💡 <strong>Tip:</strong> Role assignments control which users receive workflow alerts for specific tasks in this project.
            </div>
        </div>
    );
};

export default ProjectRoleDropdowns;