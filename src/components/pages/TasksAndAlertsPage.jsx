import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { useWorkflowAlerts } from '../../hooks/useApi';
import { mockAlerts } from '../../data/mockData';
import { ACTIVITY_FEED_SUBJECTS } from '../../data/constants';

const TasksAndAlertsPage = ({ colorMode, onProjectSelect, projects, sourceSection = 'Current Alerts' }) => {
    const [currentUser, setCurrentUser] = useState(null);

    // State for alerts
    const [expandedAlerts, setExpandedAlerts] = useState(new Set());
    const [actionLoading, setActionLoading] = useState({});
    
    // State for assign modal
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);
    
    // Fetch workflow alerts using the same hook as DashboardPage
    const { alerts, loading: alertsLoading, error: alertsError, refresh, acknowledgeAlert, dismissAlert, completeStep, assignAlert } = useWorkflowAlerts({
        status: 'active'
    });
    
    // Alert pagination
    const [alertCurrentPage, setAlertCurrentPage] = useState(1);
    const alertsPerPage = 5;
    
    // Alert sorting
    const [alertSortConfig, setAlertSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    
    // Alert filtering (same as Current Alerts section)
    const [alertProjectFilter, setAlertProjectFilter] = useState('all');
    const [alertSubjectFilter, setAlertSubjectFilter] = useState('all');
    
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
        let alertsData = alerts && alerts.length > 0 ? alerts : mockAlerts;
        
        console.log('🔄 ALERTS DEBUG:');
        console.log('🔄 alerts from API:', alerts);
        console.log('🔄 alerts length:', alerts ? alerts.length : 0);
        console.log('🔄 mockAlerts length:', mockAlerts ? mockAlerts.length : 0);
        console.log('🔄 final alertsData length:', alertsData ? alertsData.length : 0);
        console.log('🔄 alertsData sample:', alertsData ? alertsData[0] : 'none');
        
        // If no alerts from API or mock data, use demo alerts for testing assign functionality
        if (!alertsData || alertsData.length === 0) {
            console.log('🔄 No alerts found, using demo alerts for testing');
            alertsData = [
                {
                    _id: 'alert_001',
                    user: 'admin-user-id',
                    type: 'Work Flow Line Item',
                    priority: 'high',
                    message: 'Site inspection required for Downtown Office Complex',
                    relatedProject: 'project-1',
                    metadata: {
                        stepName: 'Site Inspection',
                        projectName: 'Downtown Office Complex',
                        phase: 'Prospect',
                        daysOverdue: 2,
                        daysUntilDue: 0
                    },
                    status: 'active',
                    createdAt: new Date(Date.now() - 86400000),
                    updatedAt: new Date()
                },
                {
                    _id: 'alert_002',
                    user: 'admin-user-id',
                    type: 'Work Flow Line Item',
                    priority: 'medium',
                    message: 'Write estimate for Residential Complex Phase 2',
                    relatedProject: 'project-2',
                    metadata: {
                        stepName: 'Write Estimate',
                        projectName: 'Residential Complex Phase 2',
                        phase: 'Prospect',
                        daysOverdue: 0,
                        daysUntilDue: 3
                    },
                    status: 'active',
                    createdAt: new Date(Date.now() - 172800000),
                    updatedAt: new Date()
                },
                {
                    _id: 'alert_003',
                    user: 'admin-user-id',
                    type: 'Work Flow Line Item',
                    priority: 'high',
                    message: 'Foundation inspection overdue for Downtown Office Complex',
                    relatedProject: 'project-1',
                    metadata: {
                        stepName: 'Foundation Inspection',
                        projectName: 'Downtown Office Complex',
                        phase: 'Execution',
                        daysOverdue: 5,
                        daysUntilDue: 0
                    },
                    status: 'active',
                    createdAt: new Date(Date.now() - 259200000),
                    updatedAt: new Date()
                },
                {
                    _id: 'alert_004',
                    user: 'admin-user-id',
                    type: 'Work Flow Line Item',
                    priority: 'high',
                    message: 'Roof inspection - 123 Main St',
                    description: 'Complete safety inspection before work begins',
                    assignedTo: 'user-2',
                    projectId: 'project-1',
                    alertDate: '2024-06-04',
                    status: 'pending',
                    metadata: {
                        stepName: 'Roof inspection',
                        projectName: '123 Main St',
                        phase: 'Execution',
                        daysOverdue: 0,
                        daysUntilDue: 2
                    },
                    createdAt: new Date(Date.now() - 86400000),
                    updatedAt: new Date()
                },
                {
                    _id: 'alert_005',
                    user: 'admin-user-id',
                    type: 'Work Flow Line Item',
                    priority: 'high',
                    message: 'Submit insurance documentation',
                    description: 'Upload all required forms to customer portal',
                    assignedTo: 'user-3',
                    projectId: 'project-1',
                    alertDate: '2024-06-02',
                    status: 'overdue',
                    metadata: {
                        stepName: 'Submit insurance documentation',
                        projectName: 'Customer Portal',
                        phase: 'Approved',
                        daysOverdue: 3,
                        daysUntilDue: 0
                    },
                    createdAt: new Date(Date.now() - 172800000),
                    updatedAt: new Date()
                },
                {
                    _id: 'alert_006',
                    user: 'admin-user-id',
                    type: 'Work Flow Line Item',
                    priority: 'medium',
                    message: 'Material delivery coordination',
                    description: 'Coordinate with supplier for delivery schedule',
                    assignedTo: 'user-3',
                    projectId: 'project-2',
                    alertDate: '2024-06-10',
                    status: 'in-progress',
                    metadata: {
                        stepName: 'Material delivery coordination',
                        projectName: 'Supplier Coordination',
                        phase: 'Execution',
                        daysOverdue: 0,
                        daysUntilDue: 5
                    },
                    createdAt: new Date(Date.now() - 259200000),
                    updatedAt: new Date()
                },
                {
                    _id: 'alert_007',
                    user: 'admin-user-id',
                    type: 'Work Flow Line Item',
                    priority: 'high',
                    message: 'Safety meeting required',
                    description: 'Daily safety briefing needed before crew starts work',
                    assignedTo: 'user-2',
                    projectId: 'project-1',
                    alertDate: '2024-06-05',
                    status: 'pending',
                    metadata: {
                        stepName: 'Safety meeting required',
                        projectName: 'Crew Safety',
                        phase: 'Execution',
                        daysOverdue: 0,
                        daysUntilDue: 1
                    },
                    createdAt: new Date(Date.now() - 345600000),
                    updatedAt: new Date()
                },
                {
                    _id: 'alert_008',
                    user: 'admin-user-id',
                    type: 'Work Flow Line Item',
                    priority: 'medium',
                    message: 'Permit approval check',
                    description: 'Verify all permits are approved before starting work',
                    assignedTo: 'user-2',
                    projectId: 'project-2',
                    alertDate: '2024-06-08',
                    status: 'pending',
                    metadata: {
                        stepName: 'Permit approval check',
                        projectName: 'Permit Verification',
                        phase: 'Planning',
                        daysOverdue: 0,
                        daysUntilDue: 4
                    },
                    createdAt: new Date(Date.now() - 432000000),
                    updatedAt: new Date()
                }
            ];
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
        
        // Apply subject filter
        if (alertSubjectFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(alert => {
                const alertSubject = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alert.stepName || alert.title || '';
                return alertSubject === alertSubjectFilter;
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

    const getPaginatedAlerts = () => {
        const sortedAlerts = getSortedAlerts();
        const startIndex = (alertCurrentPage - 1) * alertsPerPage;
        const endIndex = startIndex + alertsPerPage;
        return sortedAlerts.slice(startIndex, endIndex);
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

    const handleAssignAlert = async (alert) => {
        setSelectedAlert(alert);
        setSelectedUserId('');
        setAssignLoading(false);
        
        console.log('🔄 Opening assign modal for alert:', alert);
        
        // Use hardcoded team members instead of API call
        if (teamMembers.length === 0) {
            console.log('🔄 Setting hardcoded team members...');
            setTeamMembers([
                { _id: 'admin-user-id', firstName: 'Admin', lastName: 'User', role: 'admin' },
                { _id: 'user-2', firstName: 'John', lastName: 'Smith', role: 'project_manager' },
                { _id: 'user-3', firstName: 'Sarah', lastName: 'Johnson', role: 'field_director' },
                { _id: 'user-4', firstName: 'Mike', lastName: 'Brown', role: 'worker' }
            ]);
        } else {
            console.log('🔄 Team members already loaded:', teamMembers.length);
        }
        
        setAssignModalOpen(true);
    };

    const handleAssignSubmit = async () => {
        if (!selectedUserId || !selectedAlert) return;
        
        setAssignLoading(true);
        
        try {
            const alertId = selectedAlert._id || selectedAlert.id;
            const token = localStorage.getItem('token');
            
            console.log('🔄 Assigning alert:', alertId);
            console.log('🔄 Token exists:', !!token);
            console.log('🔄 Token length:', token ? token.length : 0);
            console.log('🔄 Selected user ID:', selectedUserId);
            
            // For Vercel deployment, use demo token if no JWT token
            let authHeader = `Bearer ${token}`;
            if (!token || token === 'null' || token === 'undefined') {
                console.log('🔄 No valid token found, using demo token for Vercel');
                authHeader = 'Bearer demo-sarah-owner-token-vercel-deployment';
            }
            
            const response = await fetch(`/api/alerts/${alertId}/assign`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    assignedTo: selectedUserId
                })
            });
            
            console.log('🔄 Assign response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Alert assigned successfully:', result);
                
                // Close modal and refresh alerts
                setAssignModalOpen(false);
                setSelectedAlert(null);
                setSelectedUserId('');
                
                // Refresh the alerts list
                if (refresh) {
                    refresh();
                }
            } else {
                const errorData = await response.json();
                console.error('❌ Failed to assign alert:', errorData);
                alert('Failed to assign alert. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error assigning alert:', error);
            alert('Error assigning alert. Please try again.');
        } finally {
            setAssignLoading(false);
        }
    };

    const mapStepToWorkflowStructure = (stepName, phase) => {
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
        const phaseStructure = workflowStructure[phase];
        if (!phaseStructure) {
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

    // Pagination functions
    const goToAlertPage = (page) => {
        setAlertCurrentPage(page);
    };

    const nextAlertPage = () => {
        if (alertCurrentPage < Math.ceil(getSortedAlerts().length / alertsPerPage)) {
            setAlertCurrentPage(alertCurrentPage + 1);
        }
    };

    const prevAlertPage = () => {
        if (alertCurrentPage > 1) {
            setAlertCurrentPage(alertCurrentPage - 1);
        }
    };

    // Get current user on component mount
    useEffect(() => {
        const user = authService.getStoredUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);



    const alertTotalPages = Math.ceil(getSortedAlerts().length / alertsPerPage);

    return (
        <div className="h-full flex flex-col">
            <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden relative`} style={{ width: '100%', height: '750px', paddingBottom: '300px' }}>
                {/* Header with controls */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
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
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            
                            <select 
                                value={alertSubjectFilter} 
                                onChange={(e) => setAlertSubjectFilter(e.target.value)} 
                                className={`text-[7px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                    colorMode 
                                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                            >
                                <option value="all">All Subjects</option>
                                {ACTIVITY_FEED_SUBJECTS.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
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
                <div className="space-y-2 mt-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {(() => {
                        const alerts = getPaginatedAlerts();
                        console.log('🔍 ALERTS_DEBUG: Number of alerts:', alerts.length);
                        console.log('🔍 ALERTS_DEBUG: Alerts:', alerts);
                        console.log('🔍 ALERTS_DEBUG: Alert IDs:', alerts.map(a => a._id || a.id));
                        return alerts.length === 0 ? (
                            <div className="text-gray-400 text-center py-3 text-[9px]">
                                {alertsLoading ? 'Loading alerts...' : 'No alerts found.'}
                        </div>
                    ) : (
                            alerts.map(alert => {
                            // Handle both workflow alerts and task alerts
                            const alertId = alert._id || alert.id;
                            const projectId = alert.project?._id || alert.projectId;
                            const project = projects.find(p => p.id === projectId);
                            const isExpanded = expandedAlerts.has(alertId);
                            
                            console.log('🔍 RENDERING ALERT:', alertId, alert);
                            
                            // Get alert details based on type - use the proper alert data
                            const alertTitle = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alert.stepName || alert.title || 'Unknown Alert';
                            const alertDescription = alert.message || alert.description || 'No description available';
                            const alertDate = alert.createdAt ? new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            const assignedUser = alert.user || { firstName: 'Unknown', lastName: 'User' };
                            const priority = alert.priority || 'medium';
                            
                            return (
                                <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-lg shadow-sm border transition-all duration-200 cursor-pointer`}>
                                    
                                    {/* Alert header - ENTIRE AREA CLICKABLE FOR DROPDOWN */}
                                    <div 
                                        className="flex items-center gap-2 p-2 hover:bg-opacity-80 transition-colors cursor-pointer"
                                        onClick={() => toggleAlertExpansion(alertId)}
                                    >
                                        {/* User avatar and priority indicator */}
                                        <div className="relative">
                                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[8px] shadow-sm">
                                                {assignedUser ? (assignedUser.firstName?.charAt(0) || assignedUser.name?.charAt(0)) : '?'}
                                            </div>
                                            {/* Priority indicator dot */}
                                            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                                priority === 'high' ? 'bg-red-500' :
                                                priority === 'medium' ? 'bg-yellow-500' :
                                                'bg-gray-400'
                                            }`}></div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            {/* Line 1: User Name Date Project Name */}
                                            <div className="mb-0.5">
                                                <span className={`text-[7px] font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                                    {assignedUser ? (assignedUser.firstName && assignedUser.lastName ? `${assignedUser.firstName} ${assignedUser.lastName}` : assignedUser.name) : 'Unknown User'} {alertDate} 
                                                    <span 
                                                        className={`cursor-pointer hover:underline underline-offset-1 transition-all duration-200 ml-1 font-medium hover:bg-blue-50 hover:px-1 hover:rounded ${
                                                            colorMode ? 'text-[#60a5fa] hover:text-[#7dd3fc]' : 'text-[#2563eb] hover:text-[#1d4ed8]'
                                                        }`}
                                                        onClick={(e) => {
                                                            console.log('🔍 CLICK: Project name clicked!');
                                                            console.log('🔍 CLICK: projectId:', projectId);
                                                            console.log('🔍 CLICK: alert:', alert);
                                                            console.log('🔍 CLICK: onProjectSelect exists:', !!onProjectSelect);
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            handleProjectClick(projectId, alert);
                                                        }}
                                                    >
                                                        {alert.metadata?.projectName || getProjectName(projectId)}
                                                    </span>
                                                </span>
                                            </div>
                                            
                                            {/* Line 2: Phase: [phase] Section: [section] Line Item: [line item] */}
                                            <div className={`text-[7px] ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                <span className="font-semibold">Phase:</span> {alert.metadata?.phase || 'Unknown Phase'} 
                                                <span className="ml-2 font-semibold">Section:</span> 
                                                {(() => {
                                                    const stepName = alert.metadata?.stepName || alertTitle;
                                                    const phase = alert.metadata?.phase || 'Unknown Phase';
                                                    const { section } = mapStepToWorkflowStructure(stepName, phase);
                                                    return section;
                                                })()}
                                                <span className="ml-2 font-semibold">Line Item:</span> 
                                                <span 
                                                    className={`cursor-pointer hover:underline underline-offset-1 transition-all duration-200 font-medium ml-1 ${
                                                        colorMode ? 'text-[#60a5fa] hover:text-[#7dd3fc]' : 'text-[#2563eb] hover:text-[#1d4ed8]'
                                                    }`}
                                                    onClick={(e) => {
                                                        console.log('🔍 CLICK: Line item clicked!');
                                                        console.log('🔍 CLICK: projectId:', projectId);
                                                        console.log('🔍 CLICK: alert:', alert);
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        
                                                        if (!onProjectSelect) return;
                                                        
                                                        const projectName = alert.metadata?.projectName || getProjectName(projectId);
                                                        const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alertTitle;
                                                        const phase = alert.metadata?.phase || 'Unknown Phase';
                                                        const { section, lineItem } = mapStepToWorkflowStructure(stepName, phase);
                                                        
                                                        if (!projectName) return;
                                                        
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
                                                            
                                                            if (matchingProject) {
                                                                // Enhanced navigation info with precise targeting
                                                                const projectWithStepInfo = {
                                                                    ...matchingProject,
                                                                    highlightStep: lineItem,
                                                                    alertPhase: phase,
                                                                    alertSection: section,
                                                                    // Add precise navigation coordinates
                                                                    navigationTarget: {
                                                                        phase: phase,
                                                                        section: section,
                                                                        lineItem: lineItem,
                                                                        stepName: stepName,
                                                                        alertId: alert._id || alert.id
                                                                    }
                                                                };
                                                                handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, sourceSection);
                                                            } else {
                                                                // Create temporary project object if not found
                                                                const tempProject = {
                                                                    id: projectId || Date.now(),
                                                                    _id: projectId,
                                                                    name: projectName,
                                                                    projectName: projectName,
                                                                    status: 'active',
                                                                    phase: phase,
                                                                    highlightStep: lineItem,
                                                                    alertPhase: phase,
                                                                    alertSection: section,
                                                                    navigationTarget: {
                                                                        phase: phase,
                                                                        section: section,
                                                                        lineItem: lineItem,
                                                                        stepName: stepName,
                                                                        alertId: alert._id || alert.id
                                                                    }
                                                                };
                                                                handleProjectSelectWithScroll(tempProject, 'Project Workflow', null, sourceSection);
                                                            }
                                                        } catch (error) {
                                                            console.error('❌ Error navigating to workflow step:', error);
                                                        }
                                                    }}
                                                >
                                                    {(() => {
                                                        const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alertTitle;
                                                        const phase = alert.metadata?.phase || 'Unknown Phase';
                                                        const { lineItem } = mapStepToWorkflowStructure(stepName, phase);
                                                        return lineItem;
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Expand/collapse arrow */}
                                        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Expanded content */}
                                    {isExpanded && (
                                        <div className={`px-2 pb-2 border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                            {/* Notes section with meaningful alert information */}
                                            <div className={`pt-2 pb-2 mb-2 rounded-lg border transition-colors ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-300'}`}>
                                                <div className="px-2">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                                            Notes
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <div className={`text-[7px] ${colorMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                                                            {(() => {
                                                                const stepName = alert.metadata?.stepName || alertTitle;
                                                                const phase = alert.metadata?.phase || 'Unknown Phase';
                                                                const projectName = alert.metadata?.projectName || getProjectName(projectId);
                                                                const daysOverdue = alert.metadata?.daysOverdue || 0;
                                                                const daysUntilDue = alert.metadata?.daysUntilDue || 0;
                                                                if (daysOverdue > 0) {
                                                                    return `${stepName} for ${projectName} is ${daysOverdue} days overdue. This task was due ${daysOverdue} days ago and requires immediate attention.`;
                                                                } else if (daysUntilDue <= 1) {
                                                                    return `${stepName} for ${projectName} is due ${daysUntilDue === 0 ? 'today' : 'tomorrow'}. Please complete this task to keep the project on track.`;
                                                                } else {
                                                                    return `${stepName} for ${projectName} is coming up in ${daysUntilDue} days. Phase: ${phase}`;
                                                                }
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Customer Information section */}
                                            <div className={`pt-2 pb-2 rounded-lg border transition-colors ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-300'}`}>
                                                <div className="px-2">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                                            Customer Information
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        {(() => {
                                                            // Find customer info from project or use default
                                                            const customerName = project?.client?.name || project?.clientName || 'Amanda Foster';
                                                            const customerPhone = project?.client?.phone || project?.clientPhone || '(555) 777-8888';
                                                            const customerEmail = project?.client?.email || project?.clientEmail || 'amanda.foster@email.com';
                                                            
                                                            return (
                                                                <>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Name:</span>
                                                                        <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{customerName}</span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone:</span>
                                                                        <a 
                                                                            href={`tel:${customerPhone.replace(/[^\d+]/g, '')}`} 
                                                                            className={`text-[7px] font-semibold hover:underline cursor-pointer transition-all duration-200 ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}
                                                                        >
                                                                            {customerPhone}
                                                                        </a>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Email:</span>
                                                                        <a 
                                                                            href={`mailto:${customerEmail}`} 
                                                                            className={`text-[7px] font-semibold hover:underline cursor-pointer transition-all duration-200 truncate ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}
                                                                        >
                                                                            {customerEmail}
                                                                        </a>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Action buttons - Professional styling matching Project Access buttons */}
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <button
                                                    onClick={() => handleCompleteAlert(alert)}
                                                    disabled={actionLoading[`${alertId}-complete`]}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold ${
                                                        actionLoading[`${alertId}-complete`] 
                                            ? 'bg-gray-400/60 border-gray-300 text-gray-600 cursor-not-allowed' 
                                            : colorMode 
                                                ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-green-700/80 hover:border-green-500 hover:shadow-lg' 
                                                : 'bg-white border-gray-200 text-gray-800 hover:bg-green-50 hover:border-green-400 hover:shadow-lg'
                                    }`}
                                >
                                    <span className="mb-1">✅</span>
                                                    {actionLoading[`${alertId}-complete`] ? 'Loading...' : 'Complete'}
                                </button>
                                                <button
                                                    onClick={() => handleAssignAlert(alert)}
                                                    className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold ${
                                                        colorMode 
                                                            ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-purple-700/80 hover:border-purple-500 hover:shadow-lg' 
                                                            : 'bg-white border-gray-200 text-gray-800 hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg'
                                                    }`}
                                                >
                                                    <span className="mb-1">👤</span>
                                                    Assign
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )})()}
                </div>

                {/* Alert Pagination Controls */}
                {alertTotalPages > 1 && (
                    <div className={`mt-2 pt-1 border-t ${colorMode ? 'border-[#3b82f6]/40' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                            <div className={`text-[9px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Page {alertCurrentPage} of {alertTotalPages} ({getSortedAlerts().length} total alerts)
                            </div>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={prevAlertPage}
                                    disabled={alertCurrentPage === 1}
                                    className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                                        alertCurrentPage === 1
                                            ? `${colorMode ? 'text-gray-500' : 'text-gray-400'} cursor-not-allowed`
                                            : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                                    }`}
                                >
                                    ← Prev
                                </button>
                                
                                {/* Page Numbers */}
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, alertTotalPages) }, (_, i) => {
                                        let pageNum;
                                        if (alertTotalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (alertCurrentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (alertCurrentPage >= alertTotalPages - 2) {
                                            pageNum = alertTotalPages - 4 + i;
                                        } else {
                                            pageNum = alertCurrentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => goToAlertPage(pageNum)}
                                                className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                                                    alertCurrentPage === pageNum
                                                        ? 'bg-blue-600 text-white'
                                                        : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <button
                                    onClick={nextAlertPage}
                                    disabled={alertCurrentPage === alertTotalPages}
                                    className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                                        alertCurrentPage === alertTotalPages
                                            ? `${colorMode ? 'text-gray-500' : 'text-gray-400'} cursor-not-allowed`
                                            : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                                    }`}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
                                {teamMembers.map(member => (
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
                                onClick={handleAssignSubmit}
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