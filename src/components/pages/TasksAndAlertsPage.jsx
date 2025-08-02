import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { useWorkflowAlerts } from '../../hooks/useApi';
import { mapStepToWorkflowStructure } from '../../utils/workflowMapping';
import WorkflowProgressService from '../../services/workflowProgress';

const TasksAndAlertsPage = ({ colorMode, onProjectSelect, projects, sourceSection = 'My Alerts' }) => {
    const [currentUser, setCurrentUser] = useState(null);

    // State for alerts
    const [expandedAlerts, setExpandedAlerts] = useState(new Set());
    const [actionLoading, setActionLoading] = useState({});
    const [expandedContacts, setExpandedContacts] = useState(new Set());
    const [expandedPMs, setExpandedPMs] = useState(new Set());
    
    // State for assign modal
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignDropdownOpen, setAssignDropdownOpen] = useState({});
    
    // Fetch workflow alerts using the same hook as DashboardPage
    const { alerts, loading: alertsLoading, error: alertsError, refresh, acknowledgeAlert, dismissAlert, completeStep, assignAlert } = useWorkflowAlerts({
        status: 'active'
    });
    
    // Alert sorting
    const [alertSortConfig, setAlertSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    
    // Alert filtering (same as Current Alerts section)
    const [alertProjectFilter, setAlertProjectFilter] = useState('all');
    const [alertUserGroupFilter, setAlertUserGroupFilter] = useState('all');
    
    // Helper functions (copied exactly from DashboardPage)
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleProjectSelectWithScroll = (project, view = 'Project Profile', phase = null, sourceSection = null) => {
        console.log('🎯 PROJECT_SELECT: handleProjectSelectWithScroll called');
        console.log('🎯 PROJECT_SELECT: project:', project);
        console.log('🎯 PROJECT_SELECT: view:', view);
        console.log('🎯 PROJECT_SELECT: phase:', phase);
        console.log('🎯 PROJECT_SELECT: sourceSection:', sourceSection);
        console.log('🎯 PROJECT_SELECT: onProjectSelect exists:', !!onProjectSelect);
        
        scrollToTop();
        if (onProjectSelect) {
            console.log('🎯 PROJECT_SELECT: Calling onProjectSelect with sourceSection:', sourceSection);
            onProjectSelect(project, view, phase, sourceSection);
        }
    };

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

    const getProjectName = (projectId) => {
        if (!projectId) return 'Unknown Project';
        const project = projects.find(p => p.id === projectId || p._id === projectId);
        return project ? project.name : 'Unknown Project';
    };

    const handleProjectClick = (projectId, alert) => {
        if (onProjectSelect) {
            console.log('🔍 PROJECT_CLICK: Starting project click handler');
            console.log('🔍 PROJECT_CLICK: projectId:', projectId);
            console.log('🔍 PROJECT_CLICK: alert:', alert);
            console.log('🔍 PROJECT_CLICK: projects array length:', projects?.length);
            
            // Find the matching project with more flexible matching
            let matchingProject = null;
            
            if (projectId) {
                const projectName = alert.metadata?.projectName || alert.relatedProject?.projectName;
                console.log('🔍 PROJECT_CLICK: extracted projectName:', projectName);
                
                matchingProject = projects.find(p => 
                    p.id === projectId || 
                    p._id === projectId ||
                    p.projectNumber === projectId ||
                    p.projectName === projectName ||
                    p.name === projectName ||
                    p.projectName === projectName ||
                    p.name?.includes(projectName) ||
                    projectName?.includes(p.name) ||
                    p.id === projectId ||
                    p._id === projectId
                );
            }
            
            console.log('🔍 PROJECT_CLICK: matchingProject found:', !!matchingProject);
            console.log('🔍 PROJECT_CLICK: matchingProject:', matchingProject);
            
            if (matchingProject) {
                console.log('🚀 Navigating to Projects page for project:', matchingProject.name);
                console.log('🚀 Source section: My Alerts');
                // Add scrollToProjectId for Projects page scrolling
                const projectWithScrollId = {
                    ...matchingProject,
                    scrollToProjectId: String(matchingProject.id)
                };
                // Navigate to Projects page with scrolling
                handleProjectSelectWithScroll(projectWithScrollId, 'Projects', null, sourceSection);
            } else {
                console.warn('❌ No project found for alert:', alert);
            }
        }
    };

    // Function to sort and filter alerts (copied from DashboardPage)
    const getSortedAlerts = () => {
        const alertsData = alerts && alerts.length > 0 ? alerts : [];
        
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
        
        // Apply user group filter
        if (alertUserGroupFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(alert => {
                const userRole = alert.user?.role || alert.metadata?.defaultResponsible || 'OFFICE';
                const formattedRole = formatUserRole(userRole);
                return formattedRole === alertUserGroupFilter;
            });
        }

        const sortedAlerts = filteredAlerts.sort((a, b) => {
            const projectA = projects.find(p => p.id === (a.project?._id || a.projectId));
            const projectB = projects.find(p => p.id === (b.project?._id || b.projectId));
            const projectNameA = projectA ? projectA.name : (a.project?.name || 'General');
            const projectNameB = projectB ? projectB.name : (b.project?.name || 'General');
            
            if (alertSortConfig.key === 'projectName') {
                if (alertSortConfig.direction === 'asc') {
                    return projectNameA.localeCompare(projectNameB);
                } else {
                    return projectNameB.localeCompare(projectNameA);
                }
            }
            if (alertSortConfig.key === 'subject') {
                const subjectA = a.stepName || a.subject || '';
                const subjectB = b.stepName || b.subject || '';
                if (alertSortConfig.direction === 'asc') {
                    return subjectA.localeCompare(subjectB);
                } else {
                    return subjectB.localeCompare(subjectA);
                }
            }
            return 0;
        });
        
        return sortedAlerts;
    };

    const getAllAlerts = () => {
        return getSortedAlerts();
    };

    const toggleAlertExpansion = (alertId) => {
        setExpandedAlerts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(alertId)) {
                newSet.delete(alertId);
            } else {
                newSet.add(alertId);
            }
            return newSet;
        });
    };

    // Complete alert handler (same as DashboardPage)
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
            
            // Extract workflow and step IDs from alert metadata
            let workflowId = null;
            let stepId = null;
            
            // Try multiple possible field locations for workflow and step IDs
            if (alert.metadata?.workflowId && alert.metadata?.stepId) {
                workflowId = alert.metadata.workflowId;
                stepId = alert.metadata.stepId;
                console.log('✅ Found workflow/step IDs in metadata');
            } else if (alert.data?.workflowId && alert.data?.stepId) {
                workflowId = alert.data.workflowId;
                stepId = alert.data.stepId;
                console.log('✅ Found workflow/step IDs in data field');
            } else if (alert.workflowId && alert.stepId) {
                workflowId = alert.workflowId;
                stepId = alert.stepId;
                console.log('✅ Found workflow/step IDs directly on alert');
            } else {
                console.error('❌ Could not find workflow or step information in alert:', {
                    hasMetadata: !!alert.metadata,
                    metadataKeys: alert.metadata ? Object.keys(alert.metadata) : [],
                    hasData: !!alert.data,
                    dataKeys: alert.data ? Object.keys(alert.data) : [],
                    alertKeys: Object.keys(alert)
                });
                
                // Fallback: just mark alert as read if we can't complete the workflow step
                console.log('🔄 Marking alert as read since workflow info is missing');
                setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: false }));
                return;
            }

            console.log(`🚀 Attempting to complete workflow step: workflowId=${workflowId}, stepId=${stepId}`);

            // Step 1: Complete the workflow step via API
            const response = await fetch(`/api/workflows/${workflowId}/steps/${stepId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    notes: `Completed via My Alerts page by ${currentUser?.firstName || 'User'} ${currentUser?.lastName || ''}`,
                    alertId: alertId
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Workflow step completed successfully:', result);
                
                // Refresh alerts to show updated state
                await refresh();
                
                // Navigate to Project Workflow page after completion
                setTimeout(() => {
                    if (onProjectSelect) {
                        const project = projects.find(p => p.id === projectId || p._id === projectId);
                        if (project) {
                            const projectWithStepInfo = {
                                ...project,
                                highlightStep: stepName,
                                alertPhase: alert.metadata?.phase,
                                navigationTarget: {
                                    phase: alert.metadata?.phase,
                                    section: alert.metadata?.section,
                                    lineItem: stepName,
                                    stepName: stepName,
                                    alertId: alertId
                                }
                            };
                            onProjectSelect(projectWithStepInfo, 'Project Workflow', null, sourceSection);
                        }
                    }
                }, 500);
            } else {
                const errorResult = await response.json();
                console.error('❌ Failed to complete workflow step:', errorResult);
                alert('Failed to complete workflow step: ' + (errorResult.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('❌ Error completing alert:', error);
            alert('Error completing alert: ' + error.message);
        } finally {
            setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: false }));
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden relative`} style={{ width: '100%', height: '750px', paddingBottom: '300px' }}>
                {/* Header with controls */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h1>
                        </div>
                    </div>
                    
                    {/* Filter Controls - exactly like Current Alerts */}
                    <div className="flex items-center gap-2 mb-2 mt-3">
                        <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
                        <select 
                            value={alertProjectFilter} 
                            onChange={(e) => setAlertProjectFilter(e.target.value)} 
                            className={`text-[9px] font-medium px-1 py-0.5 rounded border transition-colors ${
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
                            className={`text-[9px] font-medium px-1 py-0.5 rounded border transition-colors ${
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

                {/* Divider bar to match Project Messages styling exactly */}
                <div className="mb-3">
                    <div className={`w-full px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-between ${
                        colorMode 
                            ? 'border-gray-600 text-gray-300' 
                            : 'border-gray-300 text-gray-600'
                    }`}>
                        <span></span>
                        <div className="w-4 h-4"></div>
                    </div>
                </div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {getAllAlerts().length === 0 ? (
                    <div className="text-gray-400 text-center py-3 text-sm">
                        {alertsLoading ? 'Loading alerts...' : 'No alerts found.'}
                    </div>
                ) : (
                    getAllAlerts().map(alert => {
                        // Extract data from alert
                        const alertId = alert._id || alert.id;
                        const actionData = alert.actionData || alert.metadata || {};
                        const phase = actionData.phase || 'UNKNOWN';
                        const priority = actionData.priority || 'medium';
                        
                        // Find associated project
                        const projectId = actionData.projectId;
                        const project = projects?.find(p => p.id === projectId || p._id === projectId);
                        
                        // Alert details
                        const alertTitle = actionData.stepName || alert.title || 'Unknown Alert';
                        const isExpanded = expandedAlerts.has(alertId);
                        
                        // Get proper section and line item mapping
                        const workflowMapping = mapStepToWorkflowStructure(alertTitle, phase);
                        const sectionName = workflowMapping.section;
                        const lineItemName = workflowMapping.lineItem;
                        
                        // Use WorkflowProgressService for consistent phase colors
                        const getPhaseCircleColors = (phase) => {
                            // Normalize phase name to match WorkflowProgressService
                            const normalizedPhase = (phase || 'LEAD').toUpperCase()
                                .replace('SUPPLEMENT', 'SECOND_SUPP')
                                .replace('2ND SUPP', 'SECOND_SUPP')
                                .replace('EXECUTE', 'EXECUTION');
                            return WorkflowProgressService.getPhaseColor(normalizedPhase);
                        };
                        return (
                            <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-[20px] shadow-sm border transition-all duration-200 cursor-pointer`}>
                                {/* Alert header - ENTIRE AREA CLICKABLE FOR DROPDOWN */}
                                <div 
                                    className="flex flex-col gap-0 px-2 py-0.5 hover:bg-opacity-80 transition-colors cursor-pointer"
                                    onClick={() => toggleAlertExpansion(alertId)}
                                >
                                    {/* First Row - Project# | Customer ▼ | PM ▼ | UserGroup | Arrow - More spaced out */}
                                    <div className="flex items-center justify-between gap-6">
                                        {/* Phase Circle - Smaller */}
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-7 h-7 ${getPhaseCircleColors(phase).bg} rounded-full flex items-center justify-center ${getPhaseCircleColors(phase).text} font-bold text-xs shadow-sm`}>
                                                {phase.charAt(0).toUpperCase()}
                                            </div>
                                            {priority === 'high' && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                                            )}
                                        </div>
                                        
                                        {/* Left Section: Project# | Customer | PM - Fixed positioning */}
                                        <div className="flex items-center text-[10px] flex-1">
                                            {/* Project Number */}
                                            <span 
                                                className={`font-bold cursor-pointer hover:underline flex-shrink-0 ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                style={{width: '60px'}}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (project && onProjectSelect) {
                                                        const projectWithScrollId = {
                                                            ...project,
                                                            scrollToProjectId: String(project.id)
                                                        };
                                                        onProjectSelect(projectWithScrollId, 'Projects', null, 'Current Alerts');
                                                    }
                                                }}
                                            >
                                                {project?.projectNumber || actionData.projectNumber || '12345'}
                                            </span>
                                            
                                            {/* Customer with dropdown arrow */}
                                            <div className="flex items-center gap-1 flex-shrink-0" style={{width: '100px', marginLeft: '10px'}}>
                                                <button 
                                                    className={`text-[10px] font-semibold cursor-pointer hover:underline truncate max-w-[80px] ${
                                                        colorMode ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                                                    }`}
                                                    title={project?.customer?.name || project?.clientName || actionData.projectName || 'Primary Customer'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newExpanded = new Set(expandedContacts);
                                                        if (newExpanded.has(alertId)) {
                                                            newExpanded.delete(alertId);
                                                        } else {
                                                            newExpanded.add(alertId);
                                                        }
                                                        setExpandedContacts(newExpanded);
                                                    }}
                                                >
                                                    {project?.customer?.name || project?.clientName || actionData.projectName || 'Customer'}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newExpanded = new Set(expandedContacts);
                                                        if (newExpanded.has(alertId)) {
                                                            newExpanded.delete(alertId);
                                                        } else {
                                                            newExpanded.add(alertId);
                                                        }
                                                        setExpandedContacts(newExpanded);
                                                    }}
                                                    className={`transform transition-transform duration-200 ${expandedContacts.has(alertId) ? 'rotate-180' : ''}`}
                                                >
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                            
                                            {/* PM with dropdown arrow */}
                                            <div className="flex items-center gap-1 flex-shrink-0" style={{marginLeft: '10px'}}>
                                                <span className={`text-[10px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>PM:</span>
                                                <button 
                                                    className={`text-[10px] font-semibold cursor-pointer hover:underline truncate max-w-[60px] ${
                                                        colorMode ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                                                    }`}
                                                    title={project?.projectManager?.name || project?.projectManager?.firstName + ' ' + project?.projectManager?.lastName || 'Mike Field'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newExpanded = new Set(expandedPMs);
                                                        if (newExpanded.has(alertId)) {
                                                            newExpanded.delete(alertId);
                                                        } else {
                                                            newExpanded.add(alertId);
                                                        }
                                                        setExpandedPMs(newExpanded);
                                                    }}
                                                >
                                                    {project?.projectManager?.firstName || project?.projectManager?.name || 'Mike'}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newExpanded = new Set(expandedPMs);
                                                        if (newExpanded.has(alertId)) {
                                                            newExpanded.delete(alertId);
                                                        } else {
                                                            newExpanded.add(alertId);
                                                        }
                                                        setExpandedPMs(newExpanded);
                                                    }}
                                                    className={`transform transition-transform duration-200 ${expandedPMs.has(alertId) ? 'rotate-180' : ''}`}
                                                >
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Right Section: User Group and Dropdown Arrow */}
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 text-[8px] font-bold rounded-full ${
                                                actionData.responsibleRole === 'PM' 
                                                    ? 'bg-blue-100 text-blue-800' 
                                                    : actionData.responsibleRole === 'FIELD'
                                                    ? 'bg-green-100 text-green-800'
                                                    : actionData.responsibleRole === 'OFFICE'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {actionData.responsibleRole || 'OFFICE'}
                                            </span>
                                            
                                            <svg 
                                                className={`w-4 h-4 transition-transform duration-200 ${
                                                    isExpanded ? 'rotate-180' : ''
                                                } ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24" 
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                    
                                    {/* Second Row - Section and Line Item */}
                                    <div className="flex items-center text-xs" style={{marginLeft: 'calc(1.75rem + 1.5rem)', marginTop: '-4px'}}>
                                        {/* Section - align S with project number */}
                                        <div className="flex items-center gap-1" style={{minWidth: '80px'}}>
                                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Section:</span>
                                            <span className={`font-semibold ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                {sectionName?.split('-')[0]?.trim() || sectionName}
                                            </span>
                                        </div>
                                        
                                        {/* Line Item - align L with PM */}
                                        <div className="flex items-center gap-1 flex-1" style={{marginLeft: '200px'}}>
                                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Line Item:</span>
                                            <span 
                                                className={`font-semibold cursor-pointer hover:underline max-w-[150px] truncate ${
                                                    colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                                }`}
                                                title={lineItemName}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (project && onProjectSelect) {
                                                        const projectWithStepInfo = {
                                                            ...project,
                                                            highlightStep: alertTitle,
                                                            alertPhase: phase,
                                                            navigationTarget: {
                                                                phase: phase,
                                                                section: sectionName,
                                                                lineItem: lineItemName,
                                                                stepName: alertTitle,
                                                                alertId: alertId
                                                            }
                                                        };
                                                        onProjectSelect(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
                                                    }
                                                }}
                                            >
                                                {lineItemName}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Customer Contact Info Dropdown */}
                                    {expandedContacts.has(alertId) && (
                                        <div className="flex items-start gap-2">
                                            <div className="w-8 flex-shrink-0"></div>
                                            <div className={`flex-1 p-2 rounded border text-[9px] ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className={`font-semibold mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                                    {project?.customer?.name || project?.clientName || actionData.projectName || 'Primary Customer'}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className={`${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                        📞 {project?.customer?.phone || project?.clientPhone || '(555) 123-4567'}
                                                    </div>
                                                    <div className={`${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                        ✉️ {project?.customer?.email || project?.clientEmail || 'customer@email.com'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* PM Contact Info Dropdown */}
                                    {expandedPMs.has(alertId) && (
                                        <div className="flex items-start gap-2">
                                            <div className="w-8 flex-shrink-0"></div>
                                            <div className={`flex-1 p-2 rounded border text-[9px] ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className={`font-semibold mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                                    {project?.projectManager?.firstName + ' ' + project?.projectManager?.lastName || project?.projectManager?.name || 'Mike Field'}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className={`${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                        📞 {project?.projectManager?.phone || '(555) 987-6543'}
                                                    </div>
                                                    <div className={`${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                        ✉️ {project?.projectManager?.email || 'mike.field@company.com'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Expanded Section with Action Buttons */}
                                {isExpanded && (
                                    <div className={`border-t px-3 py-2 ${colorMode ? 'border-gray-600 bg-[#1e293b]' : 'border-gray-200 bg-gray-50'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className={`text-[9px] font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Alert Details:
                                                </p>
                                                <p className={`text-[8px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {alertTitle} - Due: {actionData.dueDate || 'No due date set'}
                                                </p>
                                            </div>
                                            
                                            <div className="flex gap-1 ml-3">
                                                {/* Complete Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCompleteAlert(alertId, alertTitle, phase);
                                                    }}
                                                    disabled={actionLoading[`${alertId}-complete`]}
                                                    className={`flex-1 px-2 py-1 text-[9px] font-semibold rounded border transition-all duration-200 ${
                                                        actionLoading[`${alertId}-complete`]
                                                            ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 hover:from-green-600 hover:to-green-700 hover:border-green-600 shadow-sm hover:shadow-md'
                                                    }`}
                                                >
                                                    {actionLoading[`${alertId}-complete`] ? (
                                                        <span className="flex items-center justify-center">
                                                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Completing...
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center justify-center">
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Complete
                                                        </span>
                                                    )}
                                                </button>
                                                
                                                {/* Assign to User Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedAlert(alert);
                                                        setAssignModalOpen(true);
                                                    }}
                                                    disabled={actionLoading[`${alertId}-assign`]}
                                                    className={`flex-1 px-2 py-1 text-[9px] font-semibold rounded border transition-all duration-200 ${
                                                        actionLoading[`${alertId}-assign`]
                                                            ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 hover:from-blue-600 hover:to-blue-700 hover:border-blue-600 shadow-sm hover:shadow-md'
                                                    }`}
                                                >
                                                    <span className="flex items-center justify-center">
                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        Assign to User
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {/* Assign Modal - same as DashboardPage */}
                {assignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className={`bg-white rounded-lg p-4 max-w-md w-full mx-4 ${colorMode ? 'bg-[#1e293b] text-white' : 'bg-white text-gray-800'}`}>
                            <h3 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                Assign Alert
                            </h3>
                            
                            {selectedAlert && (
                                <div className={`mb-4 p-3 rounded border ${colorMode ? 'bg-[#232b4d] border-[#3b82f6]/30' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className={`text-[8px] font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                        Alert: {selectedAlert.metadata?.stepName || selectedAlert.title || 'Unknown Alert'}
                                    </p>
                                    <p className={`text-[7px] ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        Project: {selectedAlert.metadata?.projectName || getProjectName(selectedAlert.project?._id || selectedAlert.projectId)}
                                    </p>
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <label className={`block text-[8px] font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Assign to:
                                </label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className={`w-full p-2 border rounded text-[8px] ${
                                        colorMode 
                                            ? 'bg-[#1e293b] border-[#3b82f6] text-white' 
                                            : 'border-gray-300 bg-white text-gray-800'
                                    }`}
                                >
                                    <option value="">Select a team member...</option>
                                    {[].map(member => (
                                        <option key={member._id} value={member._id}>
                                            {member.firstName} {member.lastName} ({member.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAssignModalOpen(false)}
                                    className={`flex-1 px-3 py-2 text-[8px] font-medium rounded border transition-colors ${
                                        colorMode 
                                            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        // Handle assign functionality here
                                        setAssignModalOpen(false);
                                    }}
                                    disabled={!selectedUserId || assignLoading}
                                    className={`flex-1 px-3 py-2 text-[8px] font-medium rounded border transition-colors ${
                                        !selectedUserId || assignLoading
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
                                            : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {assignLoading ? 'Assigning...' : 'Assign'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TasksAndAlertsPage;