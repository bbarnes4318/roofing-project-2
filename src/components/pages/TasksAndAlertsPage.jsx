import React, { useState, useMemo, useEffect } from 'react';
import { useProjects, useProjectStats, useTasks, useRecentActivities, useWorkflowAlerts } from '../../hooks/useQueryApi';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import api, { authService, messagesService } from '../../services/api';
import WorkflowProgressService from '../../services/workflowProgress';
import { ACTIVITY_FEED_SUBJECTS, ALERT_SUBJECTS } from '../../data/constants';
import { mapStepToWorkflowStructure } from '../../utils/workflowMapping';
import { useWorkflowStates } from '../../hooks/useWorkflowState';
import toast from 'react-hot-toast';

const TasksAndAlertsPage = ({ colorMode, onProjectSelect, projects, sourceSection = 'My Alerts' }) => {
    // React Query client for cache invalidation
    const queryClient = useQueryClient();
    
    // Current user state
    const [currentUser, setCurrentUser] = useState(null);

    // Alert-related state
    const [expandedAlerts, setExpandedAlerts] = useState(new Set());
    const [expandedContacts, setExpandedContacts] = useState(new Set());
    const [expandedPMs, setExpandedPMs] = useState(new Set());
    const [actionLoading, setActionLoading] = useState({});

    // Filter state
    const [alertProjectFilter, setAlertProjectFilter] = useState('all');
    const [alertUserGroupFilter, setAlertUserGroupFilter] = useState('all');

    // Assignment modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedAlertForAssign, setSelectedAlertForAssign] = useState(null);
    const [assignToUser, setAssignToUser] = useState('');

    // Fetch real alerts from API
    const { alerts: workflowAlerts, loading: alertsLoading, error: alertsError, refresh: refetchWorkflowAlerts } = useWorkflowAlerts({ status: 'active' });

    // Fetch current user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await authService.getCurrentUser();
                setCurrentUser(user);
            } catch (error) {
                console.error('Failed to fetch current user:', error);
            }
        };
        fetchUser();
    }, []);

    // Helper function to format user roles for display
    const formatUserRole = (role) => {
        if (!role) return 'OFFICE';
        
        switch (role.toUpperCase()) {
            case 'PROJECT_MANAGER':
                return 'PM';
            case 'FIELD_DIRECTOR':
                return 'FIELD';
            case 'ADMINISTRATION':
                return 'ADMIN';
            case 'OFFICE':
                return 'OFFICE';
            default:
                return role.toUpperCase();
        }
    };

    // Scroll and project selection helpers
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleProjectSelectWithScroll = (project, view = 'Project Profile', phase = null, sourceSection = null, targetLineItemId = null, targetSectionId = null) => {
        console.log('🎯 PROJECT_SELECT: handleProjectSelectWithScroll called');
        console.log('🎯 PROJECT_SELECT: project:', project);
        console.log('🎯 PROJECT_SELECT: view:', view);
        console.log('🎯 PROJECT_SELECT: phase:', phase);
        console.log('🎯 PROJECT_SELECT: sourceSection:', sourceSection);
        console.log('🎯 PROJECT_SELECT: targetLineItemId:', targetLineItemId);
        console.log('🎯 PROJECT_SELECT: targetSectionId:', targetSectionId);
        console.log('🎯 PROJECT_SELECT: onProjectSelect exists:', !!onProjectSelect);
        
        scrollToTop();
        if (onProjectSelect) {
            console.log('🎯 PROJECT_SELECT: Calling onProjectSelect with all parameters');
            onProjectSelect(project, view, phase, sourceSection, targetLineItemId, targetSectionId);
        }
    };

    // Function to sort and filter alerts
    const getSortedAlerts = () => {
        // Use real alerts from API if available, otherwise fallback to mock data
        const alertsData = workflowAlerts && workflowAlerts.length > 0 ? workflowAlerts : [];
        let filteredAlerts = [...alertsData];
        
        // Apply project filter
        if (alertProjectFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(alert => {
                if (alertProjectFilter === 'general') {
                    return !alert.projectId && !alert.project;
                }
                // Handle both workflow alerts (project field) and task alerts (projectId field)
                const alertProjectId = alert.project?._id || alert.projectId;
                return alertProjectId === alertProjectFilter || alertProjectId === parseInt(alertProjectFilter);
            });
        }
        
        // Normalize responsible role from alert data
        const resolveAlertRole = (alert) => {
            const role = alert.metadata?.responsibleRole
                || alert.actionData?.responsibleRole
                || alert.metadata?.defaultResponsible
                || alert.actionData?.defaultResponsible
                || alert.user?.role
                || 'OFFICE';
            return formatUserRole(String(role));
        };

        // Apply user group filter (by responsible role)
        if (alertUserGroupFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(alert => resolveAlertRole(alert) === alertUserGroupFilter);
        }
        
        // Apply sorting
        const sortedAlerts = filteredAlerts.sort((a, b) => {
            const projectA = projects.find(p => p.id === (a.project?._id || a.projectId));
            const projectB = projects.find(p => p.id === (b.project?._id || b.projectId));
            const projectNameA = projectA ? projectA.name : (a.project?.name || 'General');
            const projectNameB = projectB ? projectB.name : (b.project?.name || 'General');
            
            // Sort by project name, then by priority (high first), then by creation date
            if (projectNameA !== projectNameB) {
                return projectNameA.localeCompare(projectNameB);
            }
            
            const priorityA = a.actionData?.priority || a.metadata?.priority || 'medium';
            const priorityB = b.actionData?.priority || b.metadata?.priority || 'medium';
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            
            if (priorityOrder[priorityA] !== priorityOrder[priorityB]) {
                return priorityOrder[priorityB] - priorityOrder[priorityA];
            }
            
            const dateA = new Date(a.createdAt || a.created || 0);
            const dateB = new Date(b.createdAt || b.created || 0);
            return dateB - dateA;
        });
        
        return sortedAlerts;
    };

    // Get all alerts (no pagination for natural flow)
    const getPaginatedAlerts = () => {
        const sortedAlerts = getSortedAlerts();
        // Return all alerts instead of paginating
        return sortedAlerts;
    };

    const toggleAlertExpansion = (alertId) => {
        const newExpanded = new Set(expandedAlerts);
        if (newExpanded.has(alertId)) {
            newExpanded.delete(alertId);
        } else {
            newExpanded.add(alertId);
        }
        setExpandedAlerts(newExpanded);
    };

    const handleAssignAlert = (alert) => {
        setSelectedAlertForAssign(alert);
        setShowAssignModal(true);
    };

    const handleAssignConfirm = async () => {
        if (!selectedAlertForAssign || !assignToUser) return;
        
        const alertId = selectedAlertForAssign._id || selectedAlertForAssign.id;
        setActionLoading(prev => ({ ...prev, [`${alertId}-assign`]: true }));
        
        try {
            console.log('🔄 Assigning alert to user:', assignToUser);
            
            // Make API call to assign alert
            const response = await fetch(`/api/alerts/${alertId}/assign`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                },
                body: JSON.stringify({
                    assignedTo: assignToUser
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Alert assigned successfully:', result);
                
                // Show success toast with user assignment confirmation
                toast.success(
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Alert assigned successfully</span>
                    </div>,
                    {
                        duration: 3000,
                        style: {
                            background: '#3B82F6',
                            color: '#ffffff',
                            fontWeight: '600',
                        },
                    }
                );
                
                // Close modal and reset state
                setShowAssignModal(false);
                setSelectedAlertForAssign(null);
                setAssignToUser('');
            } else {
                const errorResult = await response.json();
                console.error('❌ Failed to assign alert:', errorResult);
                toast.error('Failed to assign alert. Please try again.', {
                    duration: 4000,
                    style: {
                        background: '#EF4444',
                        color: '#ffffff',
                        fontWeight: '600',
                    },
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to assign alert:', error);
            toast.error('Network error. Please check your connection and try again.', {
                duration: 4000,
                style: {
                    background: '#EF4444',
                    color: '#ffffff',
                    fontWeight: '600',
                },
            });
        } finally {
            setActionLoading(prev => ({ ...prev, [`${alertId}-assign`]: false }));
        }
    };

    // Complete handleCompleteAlert function
    const handleCompleteAlert = async (alert) => {
        const alertId = alert._id || alert.id;
        setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: true }));
        
        try {
            console.log('🔄 Completing alert:', alert);
            console.log('🔍 Alert metadata:', alert.metadata);
            
            const projectId = alert.relatedProject?._id || alert.projectId || alert.project?._id;
            const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alert.stepName || alert.title;
            const projectName = alert.metadata?.projectName || alert.relatedProject?.projectName;
            
            console.log('🎯 COMPLETION: Target info:', { projectId, stepName, projectName });
            
            // Extract line item ID from alert metadata for the new comprehensive endpoint
            let lineItemId = null;
            
            // Try multiple possible field locations for lineItemId
            if (alert.lineItemId) {
                lineItemId = alert.lineItemId;
                console.log('✅ Found lineItemId in alert');
            } else if (alert.metadata?.lineItemId) {
                lineItemId = alert.metadata.lineItemId;
                console.log('✅ Found lineItemId in metadata');
            } else if (alert.stepId) {
                // Use stepId as lineItemId if that's what the alert contains
                lineItemId = alert.stepId;
                console.log('✅ Using stepId as lineItemId');
            } else if (alert.id) {
                // Last resort - try using alert ID (might work for some alert types)
                lineItemId = alert.id;
                console.log('⚠️ Using alert ID as lineItemId (fallback)');
            } else {
                console.error('❌ Could not find line item information in alert:', {
                    hasMetadata: !!alert.metadata,
                    metadataKeys: alert.metadata ? Object.keys(alert.metadata) : [],
                    hasStepId: !!alert.stepId,
                    alertKeys: Object.keys(alert)
                });
                
                // Fallback: just mark alert as read if we can't complete the workflow step
                console.log('🔄 Marking alert as read since line item info is missing');
                setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: false }));
                return;
            }

            console.log(`🚀 Attempting to complete line item: projectId=${projectId}, lineItemId=${lineItemId}`);

            // Step 1: Complete the line item via the comprehensive workflow completion API
            const response = await api.post('/workflows/complete-item', {
                projectId: projectId,
                lineItemId: lineItemId,
                notes: `Completed via dashboard alert by ${currentUser?.firstName || 'User'} ${currentUser?.lastName || ''}`,
                alertId: alertId
            });

            if (response.status >= 200 && response.status < 300) {
                const result = response.data;
                console.log('✅ Line item completed successfully:', result);
                
                // Show success feedback with toast notification
                console.log(`✅ SUCCESS: Line item '${stepName}' has been completed for project ${projectName}`);
                
                // Show success toast with clear confirmation
                toast.success(
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>✅ Task completed successfully!</span>
                    </div>,
                    {
                        duration: 4000,
                        style: {
                            background: '#10B981',
                            color: '#ffffff',
                            fontWeight: '600',
                        },
                    }
                );
                
                // Show next step notification if available
                const nextItem = result?.data?.next;
                if (nextItem) {
                    setTimeout(() => {
                        toast.success(
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span>📋 Next task: {nextItem.lineItemName}</span>
                            </div>,
                            { 
                                duration: 6000,
                                style: {
                                    background: '#0F172A',
                                    color: '#ffffff',
                                    fontWeight: '600',
                                },
                            }
                        );
                    }, 1500);
                }
                
                // Show workflow progress if available
                const progress = result?.data?.progress;
                if (progress) {
                    setTimeout(() => {
                        toast.success(`📊 Workflow progress: ${Math.round(progress.completionPercentage)}%`, { 
                            duration: 4000,
                            style: {
                                background: '#7C3AED',
                                color: '#ffffff',
                                fontWeight: '600',
                            },
                        });
                    }, 3000);
                }
                
                // ENHANCED: Dispatch global event to notify Project Workflow tab
                const globalEvent = new CustomEvent('workflowStepCompleted', {
                    detail: {
                        projectId: projectId,
                        lineItemId: lineItemId,
                        stepName: stepName,
                        projectName: projectName,
                        source: 'My Alerts Page',
                        timestamp: new Date().toISOString()
                    }
                });
                window.dispatchEvent(globalEvent);
                console.log('📡 GLOBAL EVENT: Dispatched workflowStepCompleted event for Project Workflow tab');
                
                // The comprehensive endpoint handles all workflow progression, alert dismissal, and alert generation
                // Invalidate and refresh queries to show updated state
                queryClient.invalidateQueries(['workflowAlerts']);
                
                // CRITICAL: Invalidate projects data to update progress bars and currentWorkflowItem
                queryClient.invalidateQueries(['projects']);
                
                if (typeof refetchWorkflowAlerts === 'function') {
                    refetchWorkflowAlerts();
                }
            } else {
                // Centralized axios error will throw; this is a safety net
                throw new Error('Failed to complete workflow step');
            }
            
        } catch (error) {
            console.error('❌ Failed to complete alert:', error);
            
            // Show error toast to user
            toast.error(`Failed to complete workflow step: ${error.message}`, {
                duration: 4000,
                style: {
                    background: '#EF4444',
                    color: '#ffffff',
                    fontWeight: '600',
                },
            });
        } finally {
            setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: false }));
            
            // Invalidate cache to provide immediate feedback
            queryClient.invalidateQueries(['workflowAlerts']);
            
            // CRITICAL: Also invalidate projects data even on error to ensure UI consistency
            queryClient.invalidateQueries(['projects']);
            
            setTimeout(() => {
                if (typeof refetchWorkflowAlerts === 'function') {
                    refetchWorkflowAlerts();
                }
            }, 500);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto" data-section="my-alerts">
            {/* My Alerts - Current Alerts Section */}
            <div className="w-full" data-section="current-alerts">
                <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] rounded-t-[8px] px-4 py-3 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden relative`}>
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Workflow Line Items</h1>
                            </div>
                        </div>
                        
                        {/* Filter Controls */}
                        <div className="flex items-center gap-2 mb-2 mt-3">
                            <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
                            <select 
                                value={alertProjectFilter} 
                                onChange={(e) => setAlertProjectFilter(e.target.value)} 
                                className={`text-[10px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                    colorMode 
                                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                            >
                                <option value="all">All Projects</option>
                                <option value="general">General</option>
                                {(projects || []).map(p => (
                                    <option key={p.id} value={p.id}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
                                ))}
                            </select>
                            
                            <select 
                                value={alertUserGroupFilter} 
                                onChange={(e) => setAlertUserGroupFilter(e.target.value)} 
                                className={`text-[10px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                    colorMode 
                                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                            >
                                <option value="all">All User Groups</option>
                                <option value="PM">PM</option>
                                <option value="FIELD">FIELD</option>
                                <option value="OFFICE">OFFICE</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Workflow Line Items Content */}
                    <div className="h-[650px] overflow-y-auto space-y-2 mt-3">
                        <div className="text-center py-8">
                            <div className={`text-6xl mb-4 ${colorMode ? 'text-gray-600' : 'text-gray-300'}`}>🏗️</div>
                            <p className={`text-sm font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Project Workflow Line Items
                            </p>
                            <p className={`text-xs mt-1 ${colorMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                Track progress through workflow phases and line items
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`bg-white rounded-[20px] p-6 w-96 max-w-md ${colorMode ? 'bg-[#1e293b] border border-[#3b82f6]/30' : 'bg-white'}`}>
                        <h3 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                            Assign Alert to User
                        </h3>
                        
                        {/* Alert Information */}
                        {selectedAlertForAssign && (
                            <div className={`mb-4 p-3 rounded border ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    Alert: {selectedAlertForAssign.title || 'Unknown Alert'}
                                </p>
                                <p className={`text-xs mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Project: {selectedAlertForAssign.metadata?.projectName || selectedAlertForAssign.relatedProject?.projectName || 'Unknown Project'}
                                </p>
                            </div>
                        )}
                        
                        {/* User Selection Dropdown */}
                        <div className="mb-6">
                            <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Assign to User:
                            </label>
                            <select
                                value={assignToUser}
                                onChange={(e) => setAssignToUser(e.target.value)}
                                className={`w-full p-3 border rounded-lg text-sm transition-colors ${
                                    colorMode 
                                        ? 'bg-[#1e293b] border-gray-600 text-white focus:border-brand-500 focus:ring-1 focus:ring-blue-500' 
                                        : 'bg-white border-gray-300 text-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-blue-500'
                                }`}
                            >
                                <option value="">Select a user...</option>
                                {availableUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName || ''} {user.lastName ? '' : `(${user.email})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedAlertForAssign(null);
                                    setAssignToUser('');
                                }}
                                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                    colorMode 
                                        ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignConfirm}
                                disabled={!assignToUser || actionLoading[`${selectedAlertForAssign?.id || selectedAlertForAssign?._id}-assign`]}
                                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                    assignToUser && !actionLoading[`${selectedAlertForAssign?.id || selectedAlertForAssign?._id}-assign`]
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-400 text-white cursor-not-allowed'
                                }`}
                            >
                                {actionLoading[`${selectedAlertForAssign?.id || selectedAlertForAssign?._id}-assign`] ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Assigning...
                                    </span>
                                ) : (
                                    'Assign'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksAndAlertsPage;