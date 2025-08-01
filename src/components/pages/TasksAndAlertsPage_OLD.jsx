import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { useWorkflowAlerts } from '../../hooks/useApi';
// import { mockAlerts } from '../../data/mockData';
import { mapStepToWorkflowStructure } from '../../utils/workflowMapping';
import WorkflowProgressService from '../../services/workflowProgress';

const TasksAndAlertsPage = ({ colorMode, onProjectSelect, projects, sourceSection = 'Current Alerts' }) => {
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
    
    // Removed alert pagination - now showing all alerts with scroll
    
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
        
        // Scroll to top first
        scrollToTop();
        
        // Then navigate with enhanced project info
        if (onProjectSelect) {
            console.log('🎯 PROJECT_SELECT: Calling onProjectSelect');
            onProjectSelect(project, view, phase, sourceSection);
        } else {
            console.error('❌ PROJECT_SELECT: onProjectSelect is not available');
        }
    };

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

    const getProjectName = (projectId) => {
        if (!projectId) return 'Unknown Project';
        const project = projects.find(p => p.id === projectId || p._id === projectId);
        return project ? project.name : 'Unknown Project';
    };

    const handleProjectClick = (projectId, alert) => {
        console.log('🔍 PROJECT_CLICK: handleProjectClick called');
        console.log('🔍 PROJECT_CLICK: projectId:', projectId);
        console.log('🔍 PROJECT_CLICK: alert:', alert);
        console.log('🔍 PROJECT_CLICK: onProjectSelect exists:', !!onProjectSelect);
        console.log('🔍 PROJECT_CLICK: sourceSection:', sourceSection);
        
        if (!onProjectSelect) {
            console.error('❌ PROJECT_CLICK: onProjectSelect is not available');
            return;
        }
        
        const projectName = alert.metadata?.projectName || getProjectName(projectId);
        console.log('🔍 PROJECT_CLICK: projectName:', projectName);
        
        if (!projectName) {
            console.error('❌ PROJECT_CLICK: No project name found');
            return;
        }
        
        try {
            let matchingProject = null;
            if (projects && projects.length > 0) {
                matchingProject = projects.find(p => 
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
                // Add scrollToProjectId for Projects page scrolling
                const projectWithScrollId = {
                    ...matchingProject,
                    scrollToProjectId: String(matchingProject.id)
                };
                console.log('🔍 PROJECT_CLICK: Navigating with projectWithScrollId:', projectWithScrollId);
                handleProjectSelectWithScroll(projectWithScrollId, 'Projects', null, sourceSection);
            } else {
                // Create temporary project object if not found
                const tempProject = {
                    id: projectId || Date.now(),
                    _id: projectId,
                    name: projectName,
                    projectName: projectName,
                    status: 'active',
                    scrollToProjectId: String(projectId || Date.now())
                };
                console.log('🔍 PROJECT_CLICK: Navigating with tempProject:', tempProject);
                handleProjectSelectWithScroll(tempProject, 'Projects', null, sourceSection);
            }
        } catch (error) {
            console.error('❌ PROJECT_CLICK: Error navigating to project:', error);
        }
    };

    const getSortedAlerts = () => {
        // Use real alerts from API if available, otherwise fallback to mock data
        let alertsData = alerts && alerts.length > 0 ? alerts : [];
        
        console.log('🔄 ALERTS DEBUG:');
        console.log('🔄 alerts from API:', alerts);
        console.log('🔄 alerts length:', alerts ? alerts.length : 0);
        console.log('🔄 mockAlerts length: 0 (removed)');
        console.log('🔄 final alertsData length:', alertsData ? alertsData.length : 0);
        console.log('🔄 alertsData sample:', alertsData ? alertsData[0] : 'none');
        
        // If no alerts from API or mock data, use demo alerts for testing assign functionality
        if (!alertsData || alertsData.length === 0) {
            console.log('🔄 No alerts found - database is clean');
            alertsData = [];
        }
        
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
        
        // Apply sorting
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
                    notes: `Completed via dashboard alert by ${currentUser?.firstName || 'User'} ${currentUser?.lastName || ''}`,
                    alertId: alertId
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Workflow step completed successfully:', result);
                
                // Step 2: Also update the project checklist to ensure synchronization
                if (projectId && stepName) {
                    try {
                        console.log('🔄 CHECKLIST: Updating project checklist for consistency...');
                        
                        // Get current workflow data to find the right checklist item
                        const workflowResponse = await fetch(`/api/workflows/project/${projectId}`, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });
                        
                        if (workflowResponse.ok) {
                            const workflowData = await workflowResponse.json();
                            console.log('✅ CHECKLIST: Retrieved workflow data for checklist mapping');
                            
                            // Find the completed step in the workflow data
                            const completedStep = workflowData.data?.steps?.find(step => 
                                step.id === stepId || 
                                step.stepId === stepId || 
                                step._id === stepId ||
                                step.stepName === stepName ||
                                (step.stepName && stepName && step.stepName.toLowerCase().includes(stepName.toLowerCase()))
                            );
                            
                            if (completedStep) {
                                console.log('✅ CHECKLIST: Found matching workflow step for checklist update:', completedStep.stepName);
                                
                                // Update the specific workflow step to be marked as completed
                                const updateResponse = await fetch(`/api/workflows/project/${projectId}/workflow/${stepId}`, {
                                    method: 'PUT',
                                    headers: { 
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ completed: true })
                                });
                                
                                if (updateResponse.ok) {
                                    console.log('✅ CHECKLIST: Successfully updated project checklist');
                                } else {
                                    console.log('⚠️ CHECKLIST: Checklist update not needed (step already completed via workflow API)');
                                }
                            } else {
                                console.log('⚠️ CHECKLIST: No matching checklist item found, workflow completion should be sufficient');
                            }
                        }
                    } catch (checklistError) {
                        console.log('⚠️ CHECKLIST: Checklist update failed, but workflow completion succeeded:', checklistError.message);
                        // Don't fail the whole operation if checklist update fails
                    }
                }
                
                // Step 3: Emit socket event for real-time updates across the application
                if (window.io && window.io.connected) {
                    window.io.emit('workflow_step_completed', {
                        workflowId,
                        stepId,
                        projectId,
                        stepName,
                        completedBy: currentUser?.firstName || 'User',
                        timestamp: new Date().toISOString()
                    });
                    console.log('📡 SOCKET: Emitted workflow step completion event');
                }
                
                // Step 4: Navigate to Project Workflow to show the completion (with delay for processing)
                setTimeout(() => {
                    const project = projects.find(p => p.id === projectId);
                    if (project && onProjectSelect) {
                        const projectWithStepInfo = {
                            ...project,
                            highlightStep: alert.metadata?.stepName || alert.title,
                            alertPhase: alert.metadata?.phase,
                            completedStep: true
                        };
                        onProjectSelect(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
                    }
                }, 500);
            } else {
                const errorResult = await response.json();
                console.error('❌ Failed to complete workflow step:', errorResult);
                throw new Error(errorResult.message || 'Failed to complete workflow step');
            }
            
        } catch (error) {
            console.error('❌ Failed to complete alert:', error);
        } finally {
            setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: false }));
        }
    };

    const handleAssignAlert = (alert) => {
        setSelectedAlert(alert);
        setAssignModalOpen(true);
    };

    const handleAssignConfirm = async () => {
        if (!selectedUserId) return;
        
        setAssignLoading(true);
        try {
            // API call to assign alert to user
            await fetch('/api/alerts/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    alertId: selectedAlert.id,
                    userId: selectedUserId,
                }),
            });
            
            setAssignModalOpen(false);
            setSelectedAlert(null);
            setSelectedUserId('');
            // Refresh alerts
            window.location.reload();
        } catch (error) {
            console.error('Error assigning alert:', error);
        } finally {
            setAssignLoading(false);
        }
    };

    const toggleAssignDropdown = (alertId) => {
        setAssignDropdownOpen(prev => ({
            ...prev,
            [alertId]: !prev[alertId]
        }));
    };

    const handleAssignToUser = async (alert, userId) => {
        setActionLoading(prev => ({ ...prev, [`${alert.id}-assign`]: true }));
        try {
            await fetch('/api/alerts/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    alertId: alert.id,
                    userId: userId,
                }),
            });
            // Refresh alerts
            window.location.reload();
        } catch (error) {
            console.error('Error assigning alert:', error);
        } finally {
            setActionLoading(prev => ({ ...prev, [`${alert.id}-assign`]: false }));
            setAssignDropdownOpen(prev => ({ ...prev, [alert.id]: false }));
        }
    };

    const mapStepToWorkflowStructure = (stepName, phase) => {
        // Map database phase values to workflow structure phase names
        const phaseMapping = {
            'LEAD': 'Lead',
            'PROSPECT': 'Prospect', 
            'APPROVED': 'Approved',
            'EXECUTION': 'Execution',
            'SUPPLEMENT': '2nd Supplement',
            'COMPLETION': 'Completion'
        };
        
        // Convert phase to the format expected by workflow structure
        const mappedPhase = phaseMapping[phase] || phase;
        
        // Define the correct workflow structure based on project-phases.txt
        const workflowStructure = {
            'Lead': {
                'Input Customer Information': {
                    section: 'Input Customer Information – Office 👩🏼‍💻',
                    lineItems: ['Make sure the name is spelled correctly', 'Make sure the email is correct. Send a confirmation email to confirm email.']
                },
                'Complete Questions to Ask Checklist': {
                    section: 'Complete Questions to Ask Checklist – Office 👩🏼‍💻',
                    lineItems: ['Input answers from Question Checklist into notes', 'Record property details']
                },
                'Input Lead Property Information': {
                    section: 'Input Lead Property Information – Office 👩🏼‍💻',
                    lineItems: ['Add Home View photos – Maps', 'Add Street View photos – Google Maps', 'Add elevation screenshot – PPRBD', 'Add property age – County Assessor Website', 'Evaluate ladder requirements – By looking at the room']
                },
                'Assign A Project Manager': {
                    section: 'Assign A Project Manager – Office 👩🏼‍💻',
                    lineItems: ['Use workflow from Lead Assigning Flowchart', 'Select and brief the Project Manager']
                },
                'Schedule Initial Inspection': {
                    section: 'Schedule Initial Inspection – Office 👩🏼‍💻',
                    lineItems: ['Call Customer and coordinate with PM schedule', 'Create Calendar Appointment in AL']
                }
            },
            'Prospect': {
                'Site Inspection': {
                    section: 'Site Inspection – Project Manager 👷🏼',
                    lineItems: ['Take site photos', 'Complete inspection form', 'Document material colors', 'Capture Hover photos', 'Present upgrade options']
                },
                'Write Estimate': {
                    section: 'Write Estimate – Project Manager 👷🏼',
                    lineItems: ['Fill out Estimate Form', 'Write initial estimate – AccuLynx', 'Write Customer Pay Estimates', 'Send for Approval']
                },
                'Insurance Process': {
                    section: 'Insurance Process – Administration 📝',
                    lineItems: ['Compare field vs insurance estimates', 'Identify supplemental items', 'Draft estimate in Xactimate']
                },
                'Agreement Preparation': {
                    section: 'Agreement Preparation – Administration 📝',
                    lineItems: ['Trade cost analysis', 'Prepare Estimate Forms', 'Match AL estimates', 'Calculate customer pay items', 'Send shingle/class4 email – PDF']
                },
                'Agreement Signing': {
                    section: 'Agreement Signing – Administration 📝',
                    lineItems: ['Review and send signature request', 'Record in QuickBooks', 'Process deposit', 'Collect signed disclaimers']
                }
            },
            'Approved': {
                'Administrative Setup': {
                    section: 'Administrative Setup – Administration 📝',
                    lineItems: ['Confirm shingle choice', 'Order materials', 'Create labor orders', 'Send labor order to roofing crew']
                },
                'Pre-Job Actions': {
                    section: 'Pre-Job Actions – Office 👩🏼‍💻',
                    lineItems: ['Pull permits']
                },
                'Prepare for Production': {
                    section: 'Prepare for Production – Administration 📝',
                    lineItems: ['All pictures in Job (Gutter, Ventilation, Elevation)', 'Verify Labor Order in Scheduler', 'Verify Material Orders', 'Subcontractor Work']
                }
            },
            'Execution': {
                'Installation': {
                    section: 'Installation – Field Director 🛠️',
                    lineItems: ['Document work start', 'Capture progress photos', 'Daily Job Progress Note', 'Upload Pictures']
                },
                'Quality Check': {
                    section: 'Quality Check – Field + Admin',
                    lineItems: ['Completion photos – Roof Supervisor 🛠️', 'Complete inspection – Roof Supervisor 🛠️', 'Upload Roof Packet', 'Verify Packet is complete – Admin 📝']
                },
                'Multiple Trades': {
                    section: 'Multiple Trades – Administration 📝',
                    lineItems: ['Confirm start date', 'Confirm material/labor for all trades']
                },
                'Subcontractor Work': {
                    section: 'Subcontractor Work – Administration 📝',
                    lineItems: ['Confirm dates', 'Communicate with customer']
                },
                'Update Customer': {
                    section: 'Update Customer – Administration 📝',
                    lineItems: ['Notify of completion', 'Share photos', 'Send 2nd half payment link']
                }
            },
            '2nd Supplement': {
                'Create Supp in Xactimate': {
                    section: 'Create Supp in Xactimate – Administration 📝',
                    lineItems: ['Check Roof Packet & Checklist', 'Label photos', 'Add to Xactimate', 'Submit to insurance']
                },
                'Follow-Up Calls': {
                    section: 'Follow-Up Calls – Administration 📝',
                    lineItems: ['Call 2x/week until updated estimate']
                },
                'Review Approved Supp': {
                    section: 'Review Approved Supp – Administration 📝',
                    lineItems: ['Update trade cost', 'Prepare counter-supp or email', 'Add to AL Estimate']
                },
                'Customer Update': {
                    section: 'Customer Update – Administration',
                    lineItems: ['Share 2 items minimum', 'Let them know next steps']
                }
            },
            'Completion': {
                'Financial Processing': {
                    section: 'Financial Processing – Administration 📝',
                    lineItems: ['Verify worksheet', 'Final invoice & payment link', 'AR follow-up calls']
                },
                'Project Closeout': {
                    section: 'Project Closeout – Office 👩🏼‍💻',
                    lineItems: ['Register warranty', 'Send documentation', 'Submit insurance paperwork', 'Send final receipt and close job']
                }
            }
        };

        // Normalize the step name for matching
        const normalizedStepName = stepName.toLowerCase().trim();
        
        // Find the matching step in the workflow structure
        const phaseStructure = workflowStructure[mappedPhase];
        if (!phaseStructure) {
            console.warn(`⚠️ No workflow structure found for phase: ${phase} (mapped to: ${mappedPhase})`);
            return {
                section: 'Unknown Section',
                lineItem: stepName
            };
        }

        // Try to find an exact match first
        for (const [key, value] of Object.entries(phaseStructure)) {
            if (normalizedStepName === key.toLowerCase()) {
                return {
                    section: value.section,
                    lineItem: value.lineItems[0] || stepName
                };
            }
        }

        // Try to find partial matches with better logic
        for (const [key, value] of Object.entries(phaseStructure)) {
            const keyWords = key.toLowerCase().split(' ').filter(word => word.length > 2);
            const stepWords = normalizedStepName.split(' ').filter(word => word.length > 2);
            
            // Check for word matches
            const matchingWords = keyWords.filter(word => 
                stepWords.some(stepWord => stepWord.includes(word) || word.includes(stepWord))
            );
            
            // If we have at least 2 matching words or if the step name contains the key
            if (matchingWords.length >= 2 || normalizedStepName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedStepName)) {
                return {
                    section: value.section,
                    lineItem: value.lineItems[0] || stepName
                };
            }
        }

        // Fallback: return the step name as both section and line item
        return {
            section: stepName,
            lineItem: stepName
        };
    };

    // Alert sorting function (same as Current Alerts section)
    const handleAlertSort = (key) => {
        setAlertSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Removed pagination functions - now showing all alerts with scroll

    // Get current user on component mount
    useEffect(() => {
        const user = authService.getStoredUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);



    // Removed alertTotalPages calculation - no longer needed

    return (
        <div className="h-full flex flex-col">
            <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden relative`} style={{ width: '100%', height: '750px', paddingBottom: '300px' }}>
                {/* Header with controls */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                {sourceSection === 'My Alerts' ? 'My Alerts' : 'Project Workflow Alerts'}
                            </h1>
                        </div>
                    </div>
                    
                    {/* Filter Controls - Only show for My Alerts */}
                    {sourceSection === 'My Alerts' && (
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[7px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
                            <select 
                                value={alertProjectFilter} 
                                onChange={(e) => setAlertProjectFilter(e.target.value)} 
                                className={`text-[7px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                    colorMode 
                                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                            >
                                <option value="all">All Projects</option>
                                <option value="general">General</option>
                                {(projects || []).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            
                            <select 
                                value={alertUserGroupFilter} 
                                onChange={(e) => setAlertUserGroupFilter(e.target.value)} 
                                className={`text-[7px] font-medium px-1 py-0.5 rounded border transition-colors ${
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
                    )}
                    
                    {/* Controls row - Only show for Current Alerts */}
                    {sourceSection !== 'My Alerts' && (
                        <div className="flex items-center justify-between gap-2">
                            {/* Sort dropdown */}
                            <div className="flex items-center gap-2">
                                <select
                                    value={alertSortConfig.key}
                                    onChange={(e) => setAlertSortConfig({ key: e.target.value, direction: 'desc' })}
                                    className={`w-32 max-w-[140px] truncate text-[8px] font-medium px-1.5 py-1 rounded border transition-colors ${
                                        colorMode 
                                            ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                    }`}
                                >
                                    <option value="createdAt">Date</option>
                                    <option value="priority">Priority</option>
                                    <option value="projectName">Project</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Alerts list */}
                <div className="space-y-2 mt-3">
                    {(() => {
                        const alerts = getAllAlerts();
                        console.log('🔍 ALERTS_DEBUG: Number of alerts:', alerts.length);
                        console.log('🔍 ALERTS_DEBUG: Alerts:', alerts);
                        console.log('🔍 ALERTS_DEBUG: Alert IDs:', alerts.map(a => a._id || a.id));
                        return alerts.length === 0 ? (
                            <div className="text-gray-400 text-center py-3 text-xs">
                                {alertsLoading ? 'Loading alerts...' : 'No alerts found.'}
                            </div>
                        ) : (
                            alerts.map(alert => {
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
                                    return WorkflowProgressService.getPhaseColor(phase);
                                };
                                
                                return (
                                    <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-[20px] shadow-sm border transition-all duration-200 cursor-pointer`}>
                                        {/* Alert header - ENTIRE AREA CLICKABLE FOR DROPDOWN */}
                                        <div 
                                            className="flex items-start gap-2 p-2 hover:bg-opacity-80 transition-colors cursor-pointer"
                                            onClick={() => toggleAlertExpansion(alertId)}
                                        >
                                            {/* Large Phase Circle with Priority Indicator */}
                                            <div className="relative flex-shrink-0 mt-1">
                                                {/* Main phase circle - spans both rows */}
                                                <div className={`w-8 h-8 ${getPhaseCircleColors(phase).bg} rounded-full flex items-center justify-center ${getPhaseCircleColors(phase).text} font-bold text-sm shadow-sm`}>
                                                    {phase.charAt(0).toUpperCase()}
                                                </div>
                                                {/* High priority red circle indicator - only show for high alerts */}
                                                {priority === 'high' && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                {/* 2x2 Grid Layout */}
                                                <div className="grid grid-cols-4 gap-2 items-center h-8 grid-rows-2">
                                                    {/* Top Row: ProjectID | Customer | PM: | User Group */}
                                                    <div className="text-xs font-bold cursor-pointer hover:underline whitespace-nowrap truncate">
                                                        <span 
                                                            className={`${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleProjectClick(projectId, alert);
                                                            }}
                                                        >
                                                            {project?.projectNumber || actionData.projectNumber || '12345'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="text-xs font-semibold cursor-pointer hover:underline whitespace-nowrap truncate flex items-center">
                                                        <button 
                                                            className={`transition-colors hover:underline ${
                                                                colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
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
                                                            className={`ml-1 transform transition-transform duration-200 ${expandedContacts.has(alertId) ? 'rotate-180' : ''}`}
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    
                                                    <div className={`text-xs ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        <span className="font-semibold">PM:</span>
                                                        <button 
                                                            className={`ml-1 cursor-pointer hover:underline font-medium ${
                                                                colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                                            }`}
                                                            title={project?.projectManager?.name || 'Mike Field'}
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
                                                            {project?.projectManager?.name || 'Mike Field'}
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between">
                                                        <div className="w-12 h-5 px-1 py-0.5 border border-gray-300 rounded-full flex items-center justify-center text-black font-medium text-[10px] bg-white">
                                                            {formatUserRole(alert.user?.role || actionData.defaultResponsible || 'OFFICE')}
                                                        </div>
                                                        {/* Dropdown arrow */}
                                                        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ml-2`}>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Bottom Row: Section: xxx Line Item: xxx | | | down arrow */}
                                                    <div className={`text-xs ${colorMode ? 'text-gray-200' : 'text-gray-700'} col-span-3 whitespace-nowrap overflow-hidden flex items-center`}>
                                                        <span className="font-semibold">Section:</span>
                                                        <span className="ml-1 inline-block max-w-[60px] truncate" title={sectionName}>{sectionName}</span>
                                                        <span className="ml-2 font-semibold">Line Item:</span>
                                                        <span 
                                                            className={`ml-1 cursor-pointer hover:underline font-medium inline-block max-w-[80px] truncate ${
                                                                colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                                            }`}
                                                            title={lineItemName}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleProjectClick(projectId, alert);
                                                            }}
                                                        >
                                                            {lineItemName}
                                                        </span>
                                                    </div>
                                                    
                                                    <div></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Contact Info Dropdown */}
                                        {expandedContacts.has(alertId) && (
                                            <div className={`px-2 py-1 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className={`p-2 rounded ${colorMode ? 'bg-[#1e293b]' : 'bg-white'} border ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                    <div className={`text-[10px] font-semibold mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                                        {project?.customer?.name || project?.clientName || actionData.projectName || 'Primary Customer'}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className={`text-[9px] ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            📍 {project?.customer?.address || project?.clientAddress || '123 Main Street, City, State 12345'}
                                                        </div>
                                                        <a 
                                                            href={`tel:${(project?.customer?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                                                            className={`block text-[9px] font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                        >
                                                            📞 {project?.customer?.phone || project?.clientPhone || '(555) 123-4567'}
                                                        </a>
                                                        <a 
                                                            href={`mailto:${project?.customer?.email || project?.clientEmail || 'customer@email.com'}`} 
                                                            className={`block text-[9px] font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                        >
                                                            ✉️ {project?.customer?.email || project?.clientEmail || 'customer@email.com'}
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* PM Info Dropdown */}
                                        {expandedPMs.has(alertId) && (
                                            <div className={`px-2 py-1 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className={`p-2 rounded ${colorMode ? 'bg-[#1e293b]' : 'bg-white'} border ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                    <div className={`text-[10px] font-semibold mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                                        {project?.projectManager?.name || 'Mike Field'} - Project Manager
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <a 
                                                            href={`tel:${(project?.projectManager?.phone || '(555) 234-5678').replace(/[^\d+]/g, '')}`} 
                                                            className={`block text-[9px] font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                        >
                                                            📞 {project?.projectManager?.phone || '(555) 234-5678'}
                                                        </a>
                                                        <a 
                                                            href={`mailto:${project?.projectManager?.email || 'mike.field@company.com'}`} 
                                                            className={`block text-[9px] font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                        >
                                                            ✉️ {project?.projectManager?.email || 'mike.field@company.com'}
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Expandable dropdown section */}
                                        {isExpanded && (
                                            <div className={`px-3 py-3 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                {/* Action Buttons - First Priority */}
                                                <div className="flex gap-3 mb-4">
                                                    {/* Complete Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCompleteAlert(alert);
                                                        }}
                                                        disabled={actionLoading[`${alertId}-complete`]}
                                                        className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${
                                                            actionLoading[`${alertId}-complete`] 
                                                                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' 
                                                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 hover:from-green-600 hover:to-green-700 hover:border-green-600 shadow-sm hover:shadow-md'
                                                        }`}
                                                    >
                                                        {actionLoading[`${alertId}-complete`] ? (
                                                            <span className="flex items-center justify-center">
                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Completing...
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center justify-center">
                                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                                            handleAssignAlert(alert);
                                                        }}
                                                        disabled={actionLoading[`${alertId}-assign`]}
                                                        className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${
                                                            actionLoading[`${alertId}-assign`]
                                                                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                                                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 hover:from-blue-600 hover:to-blue-700 hover:border-blue-600 shadow-sm hover:shadow-md'
                                                        }`}
                                                    >
                                                        <span className="flex items-center justify-center">
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            Assign to User
                                                        </span>
                                                    </button>
                                                </div>

                                                {/* Alert Notes Section - Second Priority */}
                                                <div className={`mb-4 p-3 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-300'}`}>
                                                    <div className={`text-sm leading-relaxed ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {alert.message || alert.description || 'This workflow step requires attention and completion to proceed with the project timeline.'}
                                                    </div>
                                                </div>

                                                {/* Contact Information - Third Priority */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Primary Customer */}
                                                    <div className={`p-3 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-300'}`}>
                                                        <div className={`text-sm font-bold mb-3 pb-2 border-b ${colorMode ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-200'}`}>
                                                            Primary Customer
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className={`text-sm font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                {project?.client?.name || project?.clientName || actionData.projectName || 'Primary Customer'}
                                                            </div>
                                                            <div className={`text-xs leading-relaxed ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {project?.client?.address || project?.clientAddress || '123 Main Street, City, State 12345'}
                                                            </div>
                                                            <div className="flex flex-col space-y-1">
                                                                <a 
                                                                    href={`tel:${(project?.client?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                                                                    className={`text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                >
                                                                    📞 {project?.client?.phone || project?.clientPhone || '(555) 123-4567'}
                                                                </a>
                                                                <a 
                                                                    href={`mailto:${project?.client?.email || project?.clientEmail || 'customer@email.com'}`} 
                                                                    className={`text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                >
                                                                    ✉️ {project?.client?.email || project?.clientEmail || 'customer@email.com'}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Project Manager */}
                                                    <div className={`p-3 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-300'}`}>
                                                        <div className={`text-sm font-bold mb-3 pb-2 border-b ${colorMode ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-200'}`}>
                                                            Project Manager
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className={`text-sm font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                {typeof project?.projectManager === 'object' && project?.projectManager !== null
                                                                    ? (project.projectManager.name || `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim() || 'No PM assigned')
                                                                    : project?.projectManager || 'No PM assigned'}
                                                            </div>
                                                            <div className="flex flex-col space-y-1">
                                                                <a 
                                                                    href={`tel:${(project?.projectManager?.phone || project?.pmPhone || '').replace(/[^\d+]/g, '')}`} 
                                                                    className={`text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                >
                                                                    📞 {project?.projectManager?.phone || project?.pmPhone || 'No phone'}
                                                                </a>
                                                                <a 
                                                                    href={`mailto:${project?.projectManager?.email || project?.pmEmail || ''}`} 
                                                                    className={`text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                >
                                                                    ✉️ {project?.projectManager?.email || project?.pmEmail || 'No email'}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            );
                        })
                    )})()}
                </div>

                {/* Removed pagination controls - now showing all alerts with scroll */}
            </div>

            {/* Assign Modal */}
            {assignModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`${colorMode ? 'bg-[#1e293b] text-white' : 'bg-white text-gray-800'} rounded-lg p-4 w-80 max-w-[90vw] shadow-xl`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                Assign Alert
                            </h3>
                            <button
                                onClick={() => setAssignModalOpen(false)}
                                className={`text-gray-400 hover:text-gray-600 ${colorMode ? 'hover:text-gray-300' : ''}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
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
                                onClick={handleAssignConfirm}
                                disabled={!selectedUserId || assignLoading}
                                className={`flex-1 px-3 py-2 text-[8px] font-medium rounded border transition-colors ${
                                    !selectedUserId || assignLoading
                                        ? 'bg-gray-400 border-gray-300 text-gray-600 cursor-not-allowed'
                                        : colorMode 
                                            ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700' 
                                            : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'
                                }`}
                            >
                                {assignLoading ? 'Assigning...' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksAndAlertsPage; 