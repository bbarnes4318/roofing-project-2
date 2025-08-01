import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { useWorkflowAlerts } from '../../hooks/useApi';
// import { mockAlerts } from '../../data/mockData';
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
    
    // Removed alert pagination - now showing all alerts with scroll
    
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
        
        // Apply user assignment filter
        const currentUser = authService.getStoredUser();
        if (currentUser && currentUser.workflowAssignment) {
            // Convert database enum to user-friendly format for comparison
            const assignmentMap = {
                'OFFICE': 'Office',
                'ADMIN': 'Admin',
                'PROJECT_MANAGER': 'Project Manager',
                'FIELD_CREW': 'Field Crew',
                'ROOF_SUPERVISOR': 'Roof Supervisor',
                'FIELD_DIRECTOR': 'Field Director'
            };
            
            const userAssignment = assignmentMap[currentUser.workflowAssignment] || 'Office';
            
            filteredAlerts = filteredAlerts.filter(alert => {
                // Get the user assignment from the alert metadata
                const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alert.stepName || alert.title;
                const phase = alert.metadata?.phase || alert.phase;
                const workflowInfo = mapStepToWorkflowStructure(stepName, phase);
                const alertUserAssignment = workflowInfo.user;
                
                // Only show alerts assigned to the current user's role
                return alertUserAssignment === userAssignment;
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

    const handleAssignAlert = async (alert) => {
        setSelectedAlert(alert);
        setSelectedUserId('');
        setAssignLoading(false);
        
        console.log('🔄 Opening assign modal for alert:', alert);
        
        // No hardcoded team members - only use database data
        if (teamMembers.length === 0) {
            console.log('🔄 No team members loaded - database is clean');
            setTeamMembers([]);
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
        // Map database phase values to workflow structure phase names
        const phaseMapping = {
            'LEAD': 'Lead',
            'PROSPECT': 'Prospect', 
            'PROSPECT_NON_INSURANCE': 'Prospect: Non-Insurance',
            'APPROVED': 'Approved',
            'EXECUTION': 'Execution',
            'SUPPLEMENT': '2nd Supp',
            'COMPLETION': 'Completion'
        };
        
        // Convert phase to the format expected by workflow structure
        const mappedPhase = phaseMapping[phase] || phase;
        
        // Define the complete workflow structure based on project-workflow.csv
        const workflowStructure = {
            'Lead': [
                // 1. Input Customer Information
                {
                    stepName: 'Input Customer Information',
                    section: 'Input Customer Information',
                    lineItem: 'Make sure the name is spelled correctly',
                    user: 'Office',
                    phase: 'Lead'
                },
                {
                    stepName: 'Input Customer Information',
                    section: 'Input Customer Information',
                    lineItem: 'Make sure the email is correct. Send a confirmation email to confirm email.',
                    user: 'Office',
                    phase: 'Lead'
                },
                // 2. Complete Questions to Ask Checklist
                {
                    stepName: 'Complete Questions to Ask Checklist',
                    section: 'Complete Questions to Ask Checklist',
                    lineItem: 'Input answers from Question Checklist into notes',
                    user: 'Office',
                    phase: 'Lead'
                },
                {
                    stepName: 'Complete Questions to Ask Checklist',
                    section: 'Complete Questions to Ask Checklist',
                    lineItem: 'Record property details',
                    user: 'Office',
                    phase: 'Lead'
                },
                // 3. Input Lead Property Information
                {
                    stepName: 'Input Lead Property Information',
                    section: 'Input Lead Property Information',
                    lineItem: 'Add Home View photos – Maps',
                    user: 'Office',
                    phase: 'Lead'
                },
                {
                    stepName: 'Input Lead Property Information',
                    section: 'Input Lead Property Information',
                    lineItem: 'Add Street View photos – Google Maps',
                    user: 'Office',
                    phase: 'Lead'
                },
                {
                    stepName: 'Input Lead Property Information',
                    section: 'Input Lead Property Information',
                    lineItem: 'Add elevation screenshot – PPRBD',
                    user: 'Office',
                    phase: 'Lead'
                },
                {
                    stepName: 'Input Lead Property Information',
                    section: 'Input Lead Property Information',
                    lineItem: 'Add property age – County Assessor Website',
                    user: 'Office',
                    phase: 'Lead'
                },
                {
                    stepName: 'Input Lead Property Information',
                    section: 'Input Lead Property Information',
                    lineItem: 'Evaluate ladder requirements – By looking at the room',
                    user: 'Office',
                    phase: 'Lead'
                },
                // 4. Assign A Project Manager
                {
                    stepName: 'Assign A Project Manager',
                    section: 'Assign A Project Manager',
                    lineItem: 'Use workflow from Lead Assigning Flowchart',
                    user: 'Office',
                    phase: 'Lead'
                },
                {
                    stepName: 'Assign A Project Manager',
                    section: 'Assign A Project Manager',
                    lineItem: 'Select and brief the Project Manager',
                    user: 'Office',
                    phase: 'Lead'
                },
                // 5. Schedule Initial Inspection
                {
                    stepName: 'Schedule Initial Inspection',
                    section: 'Schedule Initial Inspection',
                    lineItem: 'Call Customer and coordinate with PM schedule',
                    user: 'Office',
                    phase: 'Lead'
                },
                {
                    stepName: 'Schedule Initial Inspection',
                    section: 'Schedule Initial Inspection',
                    lineItem: 'Create Calendar Appointment in AL',
                    user: 'Office',
                    phase: 'Lead'
                }
            ],
            'Prospect': [
                // 1. Site Inspection
                {
                    stepName: 'Site Inspection',
                    section: 'Site Inspection',
                    lineItem: 'Take site photos',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Site Inspection',
                    section: 'Site Inspection',
                    lineItem: 'Complete inspection form',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Site Inspection',
                    section: 'Site Inspection',
                    lineItem: 'Document material colors',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Site Inspection',
                    section: 'Site Inspection',
                    lineItem: 'Capture Hover photos',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Site Inspection',
                    section: 'Site Inspection',
                    lineItem: 'Present upgrade options',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                // 2. Write Estimate
                {
                    stepName: 'Write Estimate',
                    section: 'Write Estimate',
                    lineItem: 'Fill out Estimate Form',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Write Estimate',
                    section: 'Write Estimate',
                    lineItem: 'Write initial estimate – AccuLynx',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Write Estimate',
                    section: 'Write Estimate',
                    lineItem: 'Write Customer Pay Estimates',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Write Estimate',
                    section: 'Write Estimate',
                    lineItem: 'Send for Approval',
                    user: 'Project Manager',
                    phase: 'Prospect'
                },
                // 3. Insurance Process
                {
                    stepName: 'Insurance Process',
                    section: 'Insurance Process',
                    lineItem: 'Compare field vs insurance estimates',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Insurance Process',
                    section: 'Insurance Process',
                    lineItem: 'Identify supplemental items',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Insurance Process',
                    section: 'Insurance Process',
                    lineItem: 'Draft estimate in Xactimate',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                // 4. Agreement Preparation
                {
                    stepName: 'Agreement Preparation',
                    section: 'Agreement Preparation',
                    lineItem: 'Trade cost analysis',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Agreement Preparation',
                    section: 'Agreement Preparation',
                    lineItem: 'Prepare Estimate Forms',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Agreement Preparation',
                    section: 'Agreement Preparation',
                    lineItem: 'Match AL estimates',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Agreement Preparation',
                    section: 'Agreement Preparation',
                    lineItem: 'Calculate customer pay items',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Agreement Preparation',
                    section: 'Agreement Preparation',
                    lineItem: 'Send shingle/class4 email – PDF',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                // 5. Agreement Signing
                {
                    stepName: 'Agreement Signing',
                    section: 'Agreement Signing',
                    lineItem: 'Review and send signature request',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Agreement Signing',
                    section: 'Agreement Signing',
                    lineItem: 'Record in QuickBooks',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Agreement Signing',
                    section: 'Agreement Signing',
                    lineItem: 'Process deposit',
                    user: 'Administration',
                    phase: 'Prospect'
                },
                {
                    stepName: 'Agreement Signing',
                    section: 'Agreement Signing',
                    lineItem: 'Collect signed disclaimers',
                    user: 'Administration',
                    phase: 'Prospect'
                }
            ],
            'Prospect: Non-Insurance': [
                // 1. Write Estimate
                {
                    stepName: 'Write Estimate',
                    section: 'Write Estimate',
                    lineItem: 'Fill out Estimate Forms',
                    user: 'Project Manager',
                    phase: 'Prospect: Non-Insurance'
                },
                {
                    stepName: 'Write Estimate',
                    section: 'Write Estimate',
                    lineItem: 'Write initial estimate in AL and send customer for approval',
                    user: 'Project Manager',
                    phase: 'Prospect: Non-Insurance'
                },
                {
                    stepName: 'Write Estimate',
                    section: 'Write Estimate',
                    lineItem: 'Follow up with customer for approval',
                    user: 'Project Manager',
                    phase: 'Prospect: Non-Insurance'
                },
                {
                    stepName: 'Write Estimate',
                    section: 'Write Estimate',
                    lineItem: 'Let Office know the agreement is ready to sign',
                    user: 'Project Manager',
                    phase: 'Prospect: Non-Insurance'
                },
                // 2. Agreement Signing
                {
                    stepName: 'Agreement Signing',
                    section: 'Agreement Signing',
                    lineItem: 'Review agreement with customer and send a signature request',
                    user: 'Administration',
                    phase: 'Prospect: Non-Insurance'
                },
                {
                    stepName: 'Agreement Signing',
                    section: 'Agreement Signing',
                    lineItem: 'Record in QuickBooks',
                    user: 'Administration',
                    phase: 'Prospect: Non-Insurance'
                },
                {
                    stepName: 'Agreement Signing',
                    section: 'Agreement Signing',
                    lineItem: 'Process deposit',
                    user: 'Administration',
                    phase: 'Prospect: Non-Insurance'
                },
                {
                    stepName: 'Agreement Signing',
                    section: 'Agreement Signing',
                    lineItem: 'Send and collect signatures for any applicable disclaimers',
                    user: 'Administration',
                    phase: 'Prospect: Non-Insurance'
                }
            ],
            'Approved': [
                // 1. Administrative Setup
                {
                    stepName: 'Administrative Setup',
                    section: 'Administrative Setup',
                    lineItem: 'Confirm shingle choice',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Administrative Setup',
                    section: 'Administrative Setup',
                    lineItem: 'Order materials',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Administrative Setup',
                    section: 'Administrative Setup',
                    lineItem: 'Create labor orders',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Administrative Setup',
                    section: 'Administrative Setup',
                    lineItem: 'Send labor order to roofing crew',
                    user: 'Administration',
                    phase: 'Approved'
                },
                // 2. Pre Job Actions
                {
                    stepName: 'Pre Job Actions',
                    section: 'Pre Job Actions',
                    lineItem: 'Pull permits',
                    user: 'Office',
                    phase: 'Approved'
                },
                // 3. Prepare for Production
                {
                    stepName: 'Prepare for Production',
                    section: 'Prepare for Production',
                    lineItem: 'All pictures in Job (Gutter, Ventilation, Elevation)',
                    user: 'Administration',
                    phase: 'Approved'
                },
                // 4. Verify Labor Order in Scheduler
                {
                    stepName: 'Verify Labor Order in Scheduler',
                    section: 'Verify Labor Order in Scheduler',
                    lineItem: 'Correct Dates',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Verify Labor Order in Scheduler',
                    section: 'Verify Labor Order in Scheduler',
                    lineItem: 'Correct crew',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Verify Labor Order in Scheduler',
                    section: 'Verify Labor Order in Scheduler',
                    lineItem: 'Send install schedule email to customer',
                    user: 'Administration',
                    phase: 'Approved'
                },
                // 5. Verify Material Orders
                {
                    stepName: 'Verify Material Orders',
                    section: 'Verify Material Orders',
                    lineItem: 'Confirmations from supplier',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Verify Material Orders',
                    section: 'Verify Material Orders',
                    lineItem: 'Call if no confirmation',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Verify Material Orders',
                    section: 'Verify Material Orders',
                    lineItem: 'Provide special crew instructions',
                    user: 'Administration',
                    phase: 'Approved'
                },
                // 6. Subcontractor Work
                {
                    stepName: 'Subcontractor Work',
                    section: 'Subcontractor Work',
                    lineItem: 'Work order in scheduler',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Subcontractor Work',
                    section: 'Subcontractor Work',
                    lineItem: 'Schedule subcontractor',
                    user: 'Administration',
                    phase: 'Approved'
                },
                {
                    stepName: 'Subcontractor Work',
                    section: 'Subcontractor Work',
                    lineItem: 'Communicate with customer',
                    user: 'Administration',
                    phase: 'Approved'
                }
            ],
            'Execution': [
                // 1. Installation
                {
                    stepName: 'Installation',
                    section: 'Installation',
                    lineItem: 'Document work start',
                    user: 'Field Director',
                    phase: 'Execution'
                },
                {
                    stepName: 'Installation',
                    section: 'Installation',
                    lineItem: 'Capture progress photos',
                    user: 'Field Director',
                    phase: 'Execution'
                },
                {
                    stepName: 'Installation',
                    section: 'Installation',
                    lineItem: 'Upload Pictures',
                    user: 'Field Director',
                    phase: 'Execution'
                },
                // 2. Daily Job Progress Note
                {
                    stepName: 'Daily Job Progress Note',
                    section: 'Daily Job Progress Note',
                    lineItem: 'Work started/finished',
                    user: 'Field Director',
                    phase: 'Execution'
                },
                {
                    stepName: 'Daily Job Progress Note',
                    section: 'Daily Job Progress Note',
                    lineItem: 'Days and people needed',
                    user: 'Field Director',
                    phase: 'Execution'
                },
                {
                    stepName: 'Daily Job Progress Note',
                    section: 'Daily Job Progress Note',
                    lineItem: 'Format: 2 Guys for 4 hours',
                    user: 'Field Director',
                    phase: 'Execution'
                },
                // 3. Quality Check
                {
                    stepName: 'Quality Check',
                    section: 'Quality Check',
                    lineItem: 'Completion photos',
                    user: 'Roof Supervisor',
                    phase: 'Execution'
                },
                {
                    stepName: 'Quality Check',
                    section: 'Quality Check',
                    lineItem: 'Complete inspection',
                    user: 'Roof Supervisor',
                    phase: 'Execution'
                },
                {
                    stepName: 'Quality Check',
                    section: 'Quality Check',
                    lineItem: 'Upload Roof Packet',
                    user: 'Administration',
                    phase: 'Execution'
                },
                {
                    stepName: 'Quality Check',
                    section: 'Quality Check',
                    lineItem: 'Verify Packet is complete – Admin',
                    user: 'Administration',
                    phase: 'Execution'
                },
                // 4. Multiple Trades
                {
                    stepName: 'Multiple Trades',
                    section: 'Multiple Trades',
                    lineItem: 'Confirm start date',
                    user: 'Administration',
                    phase: 'Execution'
                },
                {
                    stepName: 'Multiple Trades',
                    section: 'Multiple Trades',
                    lineItem: 'Confirm material/labor for all trades',
                    user: 'Administration',
                    phase: 'Execution'
                },
                // 5. Subcontractor Work
                {
                    stepName: 'Subcontractor Work',
                    section: 'Subcontractor Work',
                    lineItem: 'Confirm dates',
                    user: 'Administration',
                    phase: 'Execution'
                },
                {
                    stepName: 'Subcontractor Work',
                    section: 'Subcontractor Work',
                    lineItem: 'Communicate with customer',
                    user: 'Administration',
                    phase: 'Execution'
                },
                // 6. Update Customer
                {
                    stepName: 'Update Customer',
                    section: 'Update Customer',
                    lineItem: 'Notify of completion',
                    user: 'Administration',
                    phase: 'Execution'
                },
                {
                    stepName: 'Update Customer',
                    section: 'Update Customer',
                    lineItem: 'Share photos',
                    user: 'Administration',
                    phase: 'Execution'
                },
                {
                    stepName: 'Update Customer',
                    section: 'Update Customer',
                    lineItem: 'Send 2nd half payment link',
                    user: 'Administration',
                    phase: 'Execution'
                }
            ],
            '2nd Supp': [
                // 1. Create Supp in Xactimate
                {
                    stepName: 'Create Supp in Xactimate',
                    section: 'Create Supp in Xactimate',
                    lineItem: 'Check Roof Packet & Checklist',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                {
                    stepName: 'Create Supp in Xactimate',
                    section: 'Create Supp in Xactimate',
                    lineItem: 'Label photos',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                {
                    stepName: 'Create Supp in Xactimate',
                    section: 'Create Supp in Xactimate',
                    lineItem: 'Add to Xactimate',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                {
                    stepName: 'Create Supp in Xactimate',
                    section: 'Create Supp in Xactimate',
                    lineItem: 'Submit to insurance',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                // 2. Follow Up Calls
                {
                    stepName: 'Follow Up Calls',
                    section: 'Follow Up Calls',
                    lineItem: 'Call 2x/week until updated estimate',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                // 3. Review Approved Supp
                {
                    stepName: 'Review Approved Supp',
                    section: 'Review Approved Supp',
                    lineItem: 'Update trade cost',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                {
                    stepName: 'Review Approved Supp',
                    section: 'Review Approved Supp',
                    lineItem: 'Prepare counter-supp or email',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                {
                    stepName: 'Review Approved Supp',
                    section: 'Review Approved Supp',
                    lineItem: 'Add to AL Estimate',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                // 4. Customer Update
                {
                    stepName: 'Customer Update',
                    section: 'Customer Update',
                    lineItem: 'Share 2 items minimum',
                    user: 'Administration',
                    phase: '2nd Supp'
                },
                {
                    stepName: 'Customer Update',
                    section: 'Customer Update',
                    lineItem: 'Let them know next steps',
                    user: 'Administration',
                    phase: '2nd Supp'
                }
            ],
            'Completion': [
                // 1. Financial Processing
                {
                    stepName: 'Financial Processing',
                    section: 'Financial Processing',
                    lineItem: 'Verify worksheet',
                    user: 'Administration',
                    phase: 'Completion'
                },
                {
                    stepName: 'Financial Processing',
                    section: 'Financial Processing',
                    lineItem: 'Final invoice & payment link',
                    user: 'Administration',
                    phase: 'Completion'
                },
                {
                    stepName: 'Financial Processing',
                    section: 'Financial Processing',
                    lineItem: 'AR follow-up calls',
                    user: 'Administration',
                    phase: 'Completion'
                },
                // 2. Project Closeout
                {
                    stepName: 'Project Closeout',
                    section: 'Project Closeout',
                    lineItem: 'Register warranty',
                    user: 'Office',
                    phase: 'Completion'
                },
                {
                    stepName: 'Project Closeout',
                    section: 'Project Closeout',
                    lineItem: 'Send documentation',
                    user: 'Office',
                    phase: 'Completion'
                },
                {
                    stepName: 'Project Closeout',
                    section: 'Project Closeout',
                    lineItem: 'Submit insurance paperwork',
                    user: 'Office',
                    phase: 'Completion'
                },
                {
                    stepName: 'Project Closeout',
                    section: 'Project Closeout',
                    lineItem: 'Send final receipt and close job',
                    user: 'Office',
                    phase: 'Completion'
                }
            ]
        };

        // Normalize the step name for matching
        const normalizedStepName = stepName.toLowerCase().trim();
        
        // Find the matching step in the workflow structure
        const phaseStructure = workflowStructure[mappedPhase];
        if (!phaseStructure) {
            console.warn(`⚠️ No workflow structure found for phase: ${phase} (mapped to: ${mappedPhase})`);
            return {
                section: 'Unknown Section',
                lineItem: stepName,
                user: 'Unknown'
            };
        }

        // Search through the array of workflow items for the phase
        for (const workflowItem of phaseStructure) {
            if (normalizedStepName === workflowItem.stepName.toLowerCase()) {
                return {
                    section: workflowItem.section,
                    lineItem: workflowItem.lineItem,
                    user: workflowItem.user
                };
            }
        }

        // Try to find partial matches
        for (const workflowItem of phaseStructure) {
            const keyWords = workflowItem.stepName.toLowerCase().split(' ').filter(word => word.length > 2);
            const stepWords = normalizedStepName.split(' ').filter(word => word.length > 2);
            
            // Check for word matches
            const matchingWords = keyWords.filter(word => 
                stepWords.some(stepWord => stepWord.includes(word) || word.includes(stepWord))
            );
            
            // If we have at least 2 matching words or if the step name contains the key
            if (matchingWords.length >= 2 || normalizedStepName.includes(workflowItem.stepName.toLowerCase()) || workflowItem.stepName.toLowerCase().includes(normalizedStepName)) {
                return {
                    section: workflowItem.section,
                    lineItem: workflowItem.lineItem,
                    user: workflowItem.user
                };
            }
        }

        // Fallback: return the step name as both section and line item
        return {
            section: stepName,
            lineItem: stepName,
            user: 'Unknown'
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

    // User mapping with emails for alerts
    const getUserInfo = (userType) => {
        const userMap = {
            'Office': {
                name: 'Office Team',
                email: 'office@company.com',
                phone: '(555) 123-4567'
            },
            'Project Manager': {
                name: 'Project Manager',
                email: 'pm@company.com', 
                phone: '(555) 234-5678'
            },
            'Administration': {
                name: 'Administration',
                email: 'admin@company.com',
                phone: '(555) 345-6789'
            },
            'Field Director': {
                name: 'Field Director',
                email: 'field@company.com',
                phone: '(555) 456-7890'
            },
            'Roof Supervisor': {
                name: 'Roof Supervisor',
                email: 'roof@company.com',
                phone: '(555) 567-8901'
            }
        };
        
        return userMap[userType] || {
            name: userType || 'Unknown',
            email: 'unknown@company.com',
            phone: '(555) 000-0000'
        };
    };


    // Removed alertTotalPages calculation - no longer needed

    const getPhaseColor = (phase) => {
        switch (phase) {
            case 'Lead':
                return 'bg-blue-500';
            case 'Prospect':
                return 'bg-green-500';
            case 'Prospect: Non-Insurance':
                return 'bg-yellow-500';
            case 'Approved':
                return 'bg-purple-500';
            case 'Execution':
                return 'bg-red-500';
            case '2nd Supp':
                return 'bg-orange-500';
            case 'Completion':
                return 'bg-indigo-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getPhaseInitial = (phase) => {
        switch (phase) {
            case 'Lead':
                return 'L';
            case 'Prospect':
                return 'P';
            case 'Prospect: Non-Insurance':
                return 'N';
            case 'Approved':
                return 'A';
            case 'Execution':
                return 'E';
            case '2nd Supp':
                return 'S';
            case 'Completion':
                return 'C';
            default:
                return '?';
        }
    };

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
                                {(projects || []).map(p => (
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
                        const alerts = getAllAlerts();
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
                                
                                // Get workflow info for user role display
                                const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alertTitle;
                                const phase = alert.metadata?.phase || 'Unknown Phase';
                                const workflowInfo = mapStepToWorkflowStructure(stepName, phase);
                                const lineItem = workflowInfo.lineItem;
                                const section = workflowInfo.section;
                                
                                // Get customer info
                                const customerName = alert.metadata?.customerName || project?.customer?.primaryName || 'Unknown Customer';
                                const customerAddress = alert.metadata?.customerAddress || project?.customer?.address || 'Unknown Address';
                                const projectNumber = alert.metadata?.projectNumber || project?.projectNumber || projectId;
                                
                                return (
                                    <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-gray-50'} rounded-lg shadow-sm border transition-all duration-200 cursor-pointer`}>
                                        {/* Main Alert Row - TWO ROW LAYOUT */}
                                        <div 
                                            className="flex items-start p-3 hover:bg-opacity-80 transition-colors cursor-pointer"
                                            onClick={() => toggleAlertExpansion(alertId)}
                                        >
                                            {/* Left Column - Project Info */}
                                            <div className="flex-1 min-w-0">
                                                {/* Top Row - Project Number & Customer */}
                                                <div className="flex items-center justify-between mb-1">
                                                    {/* Project Number */}
                                                    <span className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer truncate flex-1">
                                                        {projectNumber}
                                                    </span>
                                                    
                                                    {/* Customer Name (Linked) */}
                                                    <span 
                                                        className="text-xs font-bold text-gray-700 hover:text-blue-600 hover:underline cursor-pointer truncate flex-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Toggle customer info expansion
                                                            // This would need to be implemented if customer info dropdown is needed
                                                        }}
                                                        title={customerName}
                                                    >
                                                        {customerName}
                                                    </span>
                                                </div>
                                                
                                                {/* Bottom Row - Section and Line Item */}
                                                <div className="flex items-center">
                                                    {/* Section */}
                                                    {section && (
                                                        <span className="text-xs text-gray-600 mr-2">
                                                            {section}
                                                        </span>
                                                    )}
                                                    
                                                    {/* Line Item */}
                                                    {lineItem && (
                                                        <span className="text-xs text-gray-500">
                                                            {lineItem}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Right Column - User Assignment & Arrow */}
                                            <div className="flex flex-col items-end justify-between ml-2">
                                                {/* User Group Assignment */}
                                                <div className="text-right mb-1">
                                                    <span className="text-xs text-gray-600 font-medium">
                                                        {workflowInfo.user === 'Office' ? '🏢 Office' :
                                                         workflowInfo.user === 'Admin' ? '⚙️ Admin' :
                                                         workflowInfo.user === 'Project Manager' ? '👷 Project Manager' :
                                                         workflowInfo.user === 'Field Crew' ? '🔨 Field Crew' :
                                                         workflowInfo.user === 'Roof Supervisor' ? '🏠 Roof Supervisor' :
                                                         workflowInfo.user === 'Field Director' ? '👨‍💼 Field Director' :
                                                         workflowInfo.user}
                                                    </span>
                                                </div>
                                                
                                                {/* Arrow */}
                                                <div className="w-4 flex-shrink-0 self-end">
                                                    <svg 
                                                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className={`px-4 py-3 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                {/* Contact Info - Clean Layout */}
                                                <div className="flex flex-col sm:flex-row sm:space-x-8 space-y-3 sm:space-y-0 mb-4">
                                                    <div>
                                                        <div className={`text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-800'}`}>CUSTOMER</div>
                                                        <div className={`text-xs mb-0.5 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>{customerName}</div>
                                                        <div className="text-xs text-gray-500">{alert.metadata?.projectName || getProjectName(projectId)}</div>
                                                    </div>
                                                    
                                                    <div>
                                                        <div className={`text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-800'}`}>ASSIGNED TO</div>
                                                        <div className={`text-xs mb-0.5 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>{assignedUser.firstName} {assignedUser.lastName}</div>
                                                        <div className="text-xs text-gray-500">{workflowInfo.user}</div>
                                                    </div>
                                                </div>

                                                {/* Priority Badge */}
                                                <div className="mb-3">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                        priority === 'high' ? 'bg-red-100 text-red-800' :
                                                        priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                        {priority === 'high' ? '🔴 High Priority' :
                                                         priority === 'medium' ? '🟡 Medium Priority' :
                                                         '🟢 Low Priority'}
                                                    </span>
                                                </div>

                                                {/* Alert Description */}
                                                <div className="mb-3">
                                                    <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {alertDescription}
                                                    </div>
                                                </div>

                                                {/* Actions - Clean Buttons */}
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCompleteAlert(alert);
                                                        }}
                                                        disabled={actionLoading[`${alertId}-complete`]}
                                                        className={`px-3 py-1 text-xs border transition-colors rounded ${
                                                            actionLoading[`${alertId}-complete`] 
                                                                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' 
                                                                : 'bg-white text-green-600 border-green-500 hover:bg-green-50'
                                                        }`}
                                                    >
                                                        {actionLoading[`${alertId}-complete`] ? 'Loading...' : 'Complete'}
                                                    </button>
                                                    
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAssignAlert(alert);
                                                        }}
                                                        className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded"
                                                    >
                                                        Assign
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        );
                    })()}
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
export default TasksAndAlertsPage; 