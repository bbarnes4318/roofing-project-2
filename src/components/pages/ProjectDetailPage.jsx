import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronLeftIcon, LocationMarkerIcon } from '../common/Icons';
import ProjectChecklistPage from './ProjectChecklistPage';
import ProjectMessagesPage from './ProjectMessagesPage';
import ProjectDocumentsPage from './ProjectDocumentsPage';
import TasksAndAlertsPage from './TasksAndAlertsPage';
import ProjectTimeline from '../../dashboard/ProjectTimeline';
import ScrollToTop from '../common/ScrollToTop';
import { formatPhoneNumber } from '../../utils/helpers';
import { useWorkflowAlerts } from '../../hooks/useApi';
import { teamMembers } from '../../data/mockData';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import { mapStepToWorkflowStructure } from '../../utils/workflowMapping';
import WorkflowProgressService from '../../services/workflowProgress';
import { ACTIVITY_FEED_SUBJECTS } from '../../data/constants';

// Helper functions for advanced progress bars (moved to top level)

// Function to determine if project should have multiple trades (3 random projects)
const shouldHaveMultipleTrades = (projectId) => {
    // Use project ID to consistently determine which projects get multiple trades
    return [1, 3, 5].includes(projectId); // Projects with IDs 1, 3, and 5 get multiple trades
};

// Function to get trades for a project
const getProjectTrades = (project) => {
    // Use calculated progress data from backend if available
    if (project.calculatedProgress && project.calculatedProgress.trades && project.calculatedProgress.trades.length > 0) {
        return project.calculatedProgress.trades;
    }
    
    // Fallback to previous logic if no calculated data available
    if (shouldHaveMultipleTrades(project.id)) {
        // Multiple trades for selected projects - different numbers for each
        if (project.id === 1) {
            // Project 1: Add 2 trades
            return [
                { name: 'Roofing', laborProgress: 75, materialsDelivered: true },
                { name: 'Siding', laborProgress: 45, materialsDelivered: true },
                { name: 'Windows', laborProgress: 20, materialsDelivered: false }
            ];
        } else if (project.id === 3) {
            // Project 3: Add 3 trades
            return [
                { name: 'Roofing', laborProgress: 60, materialsDelivered: true },
                { name: 'Siding', laborProgress: 30, materialsDelivered: false },
                { name: 'Windows', laborProgress: 15, materialsDelivered: true },
                { name: 'Decking', laborProgress: 0, materialsDelivered: false }
            ];
        } else if (project.id === 5) {
            // Project 5: Add 2 trades
            return [
                { name: 'Roofing', laborProgress: 85, materialsDelivered: true },
                { name: 'Siding', laborProgress: 55, materialsDelivered: true },
                { name: 'Windows', laborProgress: 25, materialsDelivered: false }
            ];
        }
    } else {
        // Single trade based on project type - consistent delivery status
        const tradeName = project.projectType || project.type || 'General';
        // Use calculated progress if available, otherwise fallback
        const laborProgress = project.calculatedProgress ? project.calculatedProgress.overall : (project.progress || 0);
        const isDelivered = project.materialsDeliveryStart ? true : (project.id % 3 === 0);
        
        return [
            { 
                name: tradeName, 
                laborProgress: laborProgress, 
                materialsDelivered: isDelivered
            }
        ];
    }
};

const getPhaseStyles = (phase) => {
    switch (phase?.toLowerCase()) {
        case 'lead':
        case 'lead phase':
            return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
        case 'prospect':
        case 'prospect phase':
            return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300';
        case 'approved':
        case 'approved phase':
            return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
        case 'execution':
        case 'execution phase':
            return 'bg-gradient-to-r from-sky-100 to-sky-200 text-sky-800 border border-sky-300';
        case 'supplement':
        case '2nd supplement':
        case '2nd supplement phase':
        case '2nd supp':
            return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
        case 'completion':
        case 'completion phase':
            return 'bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border border-teal-300';
        default: return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
    }
};



const ProjectDetailPage = ({ project, onBack, initialView = 'Project Workflow', onSendMessage, tasks, projects, onUpdate, activities, onAddActivity, colorMode, previousPage, projectSourceSection, onProjectSelect }) => {
    console.log('🔍 PROJECT DETAIL PAGE PROPS:');
    
    // Helper functions for Project Messages
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const handleProjectSelectWithScroll = (selectedProject, view = 'Project Profile', phase = null, sourceSection = null) => {
        scrollToTop();
        if (onProjectSelect) {
            onProjectSelect(selectedProject, view, phase, sourceSection);
        }
    };
    
    // Project Messages helper functions - matching dashboard
    const handleQuickReply = (replyData) => {
        console.log('Project detail quick reply data:', replyData);
        
        // Find the project for the reply
        const targetProject = projects?.find(p => p.id === replyData.projectId);
        
        if (targetProject && onAddActivity) {
            // Add the quick reply as a new activity
            onAddActivity(targetProject, replyData.message, replyData.subject);
        }
    };
    
    
    // Current Alerts helper functions - matching dashboard
    const getPaginatedAlerts = () => {
        // Use real alerts from API if available
        const alertsData = workflowAlerts && workflowAlerts.length > 0 ? workflowAlerts : [];
        let filteredAlerts = [...alertsData];
        
        // Apply project filter
        if (alertProjectFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(alert => {
                const projectId = alert.actionData?.projectId || alert.metadata?.projectId;
                return projectId === alertProjectFilter || String(projectId) === String(alertProjectFilter);
            });
        }
        
        // Apply user group filter
        if (alertUserGroupFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(alert => {
                const userRole = alert.user?.role || alert.actionData?.defaultResponsible || 'OFFICE';
                return formatUserRole(userRole) === alertUserGroupFilter;
            });
        }
        
        return filteredAlerts;
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
    
    // Alert action handlers - matching dashboard
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
                    notes: `Completed via project detail alerts by user`,
                    alertId: alertId
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Workflow step completed successfully:', result);
                
                // Show success feedback
                console.log(`✅ SUCCESS: Line item '${stepName}' has been completed for project ${projectName}`);
                
                // ENHANCED: Dispatch global event to notify Project Workflow tab
                const globalEvent = new CustomEvent('workflowStepCompleted', {
                  detail: {
                    projectId: projectId,
                    stepId: stepId,
                    stepName: stepName,
                    projectName: projectName,
                    source: 'Project Detail Alerts Tab',
                    timestamp: new Date().toISOString()
                  }
                });
                window.dispatchEvent(globalEvent);
                console.log('📡 GLOBAL EVENT: Dispatched workflowStepCompleted event from Project Detail Alerts');
                
                // Navigate to Project Workflow tab with highlighting after completion
                setTimeout(() => {
                  if (project && onProjectSelect) {
                    const projectWithStepInfo = {
                      ...project,
                      highlightStep: alert.metadata?.stepName || alert.title,
                      alertPhase: alert.metadata?.phase,
                      completedStep: true,
                      // Add navigation context for proper workflow highlighting
                      navigationTarget: {
                        phase: alert.metadata?.phase,
                        section: alert.metadata?.section,
                        lineItem: stepName,
                        stepName: stepName,
                        alertId: alertId
                      }
                    };
                    setActiveView('Project Workflow');
                  }
                }, 500);
            } else {
                const errorResult = await response.json();
                console.error('❌ Failed to complete workflow step:', errorResult);
                throw new Error(errorResult.message || 'Failed to complete workflow step');
            }
            
        } catch (error) {
            console.error('❌ Failed to complete alert:', error);
            
            // Show error feedback to user
            alert(`Failed to complete workflow step: ${error.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: false }));
        }
    };
    
    const handleAssignAlert = (alert) => {
        // TODO: Implement assign alert functionality
        console.log('Assign alert:', alert);
    };
    
    console.log('🔍 project:', project?.name);
    console.log('🔍 previousPage:', previousPage);
    console.log('🔍 projectSourceSection:', projectSourceSection);
    console.log('🔍 projectSourceSection type:', typeof projectSourceSection);
    console.log('🏗️ PROJECT DETAIL: Received props:');
    console.log('🏗️ PROJECT DETAIL: previousPage:', previousPage);
    console.log('🏗️ PROJECT DETAIL: projectSourceSection:', projectSourceSection);
    const [activeView, setActiveView] = useState(initialView);
    console.log('🔍 PROJECT_DETAIL: activeView state:', activeView);
    console.log('🔍 PROJECT_DETAIL: initialView prop:', initialView);
    const [projectData, setProjectData] = useState(project);
    const [phaseCompletion, setPhaseCompletion] = useState({
        completedPhases: {},
        progress: project?.progress || 0
    });
    const scrollRef = useRef(null);
    const [expandedProgress, setExpandedProgress] = useState({});
    const [selectedUserGroup, setSelectedUserGroup] = useState('all');
    
    // Alerts state for expanded functionality - matching dashboard
    const [expandedAlerts, setExpandedAlerts] = useState(new Set());
    const [expandedContacts, setExpandedContacts] = useState(new Set());
    const [expandedPMs, setExpandedPMs] = useState(new Set());
    
    // Project Messages state variables - matching dashboard
    const [activityProjectFilter, setActivityProjectFilter] = useState('');
    const [activitySubjectFilter, setActivitySubjectFilter] = useState('');
    const [showMessageDropdown, setShowMessageDropdown] = useState(false);
    const [newMessageProject, setNewMessageProject] = useState('');
    const [newMessageSubject, setNewMessageSubject] = useState('');
    const [newMessageText, setNewMessageText] = useState('');
    const [messagesData, setMessagesData] = useState([]);
    const [feed, setFeed] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Current Alerts state variables - matching dashboard
    const [alertProjectFilter, setAlertProjectFilter] = useState('all');
    const [alertUserGroupFilter, setAlertUserGroupFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState({});
    
    // Call useWorkflowAlerts at the top level to comply with React hooks rules
    const { workflowAlerts, isLoading: alertsLoading, error: alertsError } = useWorkflowAlerts({ status: 'active' });

    // Calculate current activities for Project Messages (moved after state declarations)
    const calculateCurrentActivities = () => {
        // Filter activities (use activities prop or messagesData)
        const allActivities = activities || messagesData || [];
        
        let filteredActivities = allActivities.filter(activity => {
            // Project filter
            if (activityProjectFilter && activity.projectId !== parseInt(activityProjectFilter)) {
                return false;
            }
            
            // Subject filter
            if (activitySubjectFilter && activity.subject !== activitySubjectFilter) {
                return false;
            }
            
            return true;
        });
        
        // Sort by timestamp (newest first)
        const sortedActivities = filteredActivities.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt || 0);
            const dateB = new Date(b.timestamp || b.createdAt || 0);
            return dateB - dateA;
        });
        
        // Pagination
        const activitiesPerPage = 10;
        const startIndex = (currentPage - 1) * activitiesPerPage;
        const endIndex = startIndex + activitiesPerPage;
        
        return sortedActivities.slice(startIndex, endIndex);
    };
    
    const currentActivities = calculateCurrentActivities();

    // Toggle progress expansion (updated to match ProjectsPage format)
    const toggleProgressExpansion = (projectId, section, event) => {
        // Prevent default behavior to avoid unwanted scrolling
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const key = `${projectId}-${section}`;
        setExpandedProgress(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Force scroll to top when component mounts or when project changes
    useEffect(() => {
        const scrollToTop = () => {
            // Scroll the main window
            window.scrollTo({ top: 0, behavior: 'auto' });
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            
            // Scroll the internal container
            if (scrollRef.current) {
                scrollRef.current.scrollTop = 0;
            }
            
            // Scroll any other scrollable containers
            const scrollableContainers = document.querySelectorAll('.overflow-y-auto, .flex-1, [class*="overflow"]');
            scrollableContainers.forEach(container => {
                if (container && container !== scrollRef.current) {
                    container.scrollTop = 0;
                }
            });
        };

        // Execute immediately
        scrollToTop();
        
        // Execute after a short delay to ensure DOM is ready
        setTimeout(scrollToTop, 1);
        setTimeout(scrollToTop, 10);
        setTimeout(scrollToTop, 50);
        setTimeout(scrollToTop, 100);
    }, [project?.id, activeView]);

    // Additional scroll to top when activeView changes (tab switching)
    useEffect(() => {
        const scrollToTop = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = 0;
            }
            window.scrollTo({ top: 0, behavior: 'auto' });
        };
        
        scrollToTop();
        setTimeout(scrollToTop, 10);
    }, [activeView]);

    useEffect(() => {
        setProjectData(project);
        setActiveView(initialView);
    }, [project, initialView]);

    // Monitor activeView changes
    useEffect(() => {
        console.log('🔍 PROJECT_DETAIL: activeView changed to:', activeView);
    }, [activeView]);

    useLayoutEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }, [project, initialView, activeView]);

    const handleChecklistUpdate = (newChecklist) => {
        const updatedProject = { ...projectData, checklist: newChecklist };
        setProjectData(updatedProject);
        onUpdate(updatedProject);
    };

    const handlePhaseCompletionChange = ({ completedPhases, progress }) => {
        setPhaseCompletion({ completedPhases, progress });
        // Optionally update project progress in parent state
        setProjectData(prev => ({ ...prev, progress }));
    };

    const handleAddTask = (newTask) => {
        // This would be handled by the TasksAndAlertsPage component
        console.log('New task added:', newTask);
    };

    // Custom back button handler to handle Project Workflow Alerts navigation
    const handleBackButton = () => {
        console.log('🔍 BACK BUTTON: handleBackButton called');
        console.log('🔍 BACK BUTTON: projectSourceSection:', projectSourceSection);
        
        // If we came from Project Workflow Alerts, navigate back to Alerts tab
        if (projectSourceSection === 'Project Workflow Alerts') {
            console.log('🔍 BACK BUTTON: Navigating back to Alerts tab');
            setActiveView('Alerts');
            return;
        }
        
        // Otherwise, use the default onBack behavior
        console.log('🔍 BACK BUTTON: Using default onBack behavior');
        onBack();
    };

    const getBackButtonText = () => {
        console.log('🔍 BACK BUTTON DEBUG:');
        console.log('🔍 previousPage:', previousPage);
        console.log('🔍 projectSourceSection:', projectSourceSection);
        console.log('🔍 projectSourceSection type:', typeof projectSourceSection);
        console.log('🔍 projectSourceSection === "Current Alerts":', projectSourceSection === 'Current Alerts');
        
        // FORCE TEST - if projectSourceSection is Current Alerts, return the correct text
        if (projectSourceSection === 'Current Alerts') {
            console.log('🔍 FORCE TEST: Returning Back to Current Alerts');
            return 'Back to Current Alerts';
        }
        
        // FORCE TEST - if projectSourceSection is Project Cubes, return the correct text
        if (projectSourceSection === 'Project Cubes') {
            console.log('🔍 FORCE TEST: Returning Back to Current Project Access');
            return 'Back to Current Project Access';
        }
        
        // NEW: Handle Project Workflow Alerts specifically
        if (projectSourceSection === 'Project Workflow Alerts') {
            console.log('🔍 FORCE TEST: Returning Back to Alerts');
            return 'Back to Alerts';
        }
        

        
        switch (previousPage) {
            case 'Overview':
                // Check if we came from a specific section on the dashboard
                if (projectSourceSection === 'Project Messages') {
                    console.log('🔍 Returning: Back to Project Messages');
                    return 'Back to Project Messages';
                } else if (projectSourceSection === 'Current Alerts') {
                    console.log('🔍 Returning: Back to Current Alerts');
                    return 'Back to Current Alerts';
                } else if (projectSourceSection === 'Project Cubes') {
                    console.log('🔍 Returning: Back to Current Project Access');
                    return 'Back to Current Project Access';
                } else if (projectSourceSection === 'Project Phases') {
                    console.log('🔍 Returning: Back to Project Phases');
                    return 'Back to Project Phases';
                } else if (projectSourceSection === 'Project Workflow Alerts') {
                    console.log('🔍 Returning: Back to Alerts');
                    return 'Back to Alerts';
                }
                console.log('🔍 Returning: Back to Current Project Access (default)');
                return 'Back to Current Project Access';
            case 'Projects':
                return 'Back to Current Projects';
            case 'Alerts':
                return 'Back to Project Alerts';
            case 'Project Messages':
                return 'Back to Project Messages';
            case 'Project Schedules':
                return 'Back to Project Schedules';
            case 'Company Calendar':
                return 'Back to Company Calendar';
            case 'AI Assistant':
                return 'Back to AI Assistant';
            case 'AI Tools':
                return 'Back to AI Training Tools';
            case 'Training & Knowledge Base':
                return 'Back to AI Knowledge Base';
            case 'Archived Projects':
                return 'Back to Archived Projects';
            default:
                console.log('🔍 Returning: Back to Current Project Access (default case)');
                return 'Back to Current Project Access';
        }
    };

    // Helper functions for alerts - matching dashboard implementation
    const mapStepToWorkflowStructure = (stepName, phase) => {
        // Default mapping - this should match your workflow structure
        return {
            section: phase === 'LEAD' ? 'Initial Contact' : 
                    phase === 'PROSPECT' ? 'Preliminary Assessment' :
                    phase === 'APPROVED' ? 'Contract & Permitting' :
                    phase === 'EXECUTION' ? 'Installation & Progress' :
                    phase === 'COMPLETION' ? 'Final Documentation' : 'Unknown Section',
            lineItem: stepName || 'Unknown Line Item'
        };
    };

    const renderProjectView = () => {
        console.log('🔍 PROJECT_DETAIL: renderProjectView called with activeView:', activeView);
        if (!project || (!project.client && !project.customer)) {
            return <div className="text-red-600 font-bold">Project data is missing or incomplete.</div>;
        }
        switch(activeView) {
            case 'Project Workflow':
                console.log('🏗️ DETAIL: Rendering Project Workflow with project:', projectData);
                console.log('🏗️ DETAIL: Project has highlightStep:', !!projectData?.highlightStep);
                console.log('🏗️ DETAIL: highlightStep value:', projectData?.highlightStep);
                return <ProjectChecklistPage project={projectData} onUpdate={handleChecklistUpdate} onPhaseCompletionChange={handlePhaseCompletionChange} />;
            case 'Project Schedule':
                return (
                    <div className="space-y-6">
                        {/* Schedule Section */}
                        <div className="bg-gradient-to-br from-blue-100/40 to-blue-200/10 p-3 rounded-xl border border-blue-100/40">
                            <h4 className="font-semibold text-gray-700 mb-3 text-xs">Schedule</h4>
                            <div className="space-y-3">
                                {/* Materials Delivery */}
                                <div className="flex items-center justify-between rounded-lg shadow-sm bg-gradient-to-r from-green-100 to-green-50 border border-green-200 px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        {/* Box Icon */}
                                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="2"/></svg>
                                        <span className="text-green-800 font-medium text-sm">Materials Delivery</span>
                                    </div>
                                    <span className="text-green-700 font-extrabold text-base">
                                        {project.materialsDeliveryStart && project.materialsDeliveryEnd 
                                            ? `${project.materialsDeliveryStart} - ${project.materialsDeliveryEnd}`
                                            : project.materialsDeliveryStart 
                                                ? project.materialsDeliveryStart
                                                : 'TBD'
                                        }
                                    </span>
                                </div>
                                {/* Labor */}
                                <div className="flex items-center justify-between rounded-lg shadow-sm bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200 px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        {/* Hardhat Icon */}
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 17v-1a10 10 0 0120 0v1" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 7v4" stroke="currentColor" strokeWidth="2"/><path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="2"/></svg>
                                        <span className="text-yellow-800 font-medium text-sm">Labor</span>
                                    </div>
                                    <span className="text-yellow-700 font-extrabold text-base">
                                        {project.laborStart && project.laborEnd 
                                            ? `${project.laborStart} - ${project.laborEnd}`
                                            : project.laborStart 
                                                ? project.laborStart
                                                : 'TBD'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Messages':
                // Complete Project Messages section (copied exactly from dashboard)
                return (
                    <div className="w-full" data-section="project-messages">
                        <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Messages</h1>
                                    </div>
                                </div>
                                
                                {/* Filter Controls */}
                                <div className="flex items-center gap-2 mb-2 mt-3">
                                    <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
                                    <select 
                                        value={activityProjectFilter} 
                                        onChange={(e) => setActivityProjectFilter(e.target.value)} 
                                        className={`text-[9px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                            colorMode 
                                                ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        <option value="">All Projects</option>
                                        {(projects || []).map(p => (
                                            <option key={p.id} value={p.id}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
                                        ))}
                                    </select>
                                    
                                    <select 
                                        value={activitySubjectFilter} 
                                        onChange={(e) => setActivitySubjectFilter(e.target.value)} 
                                        className={`text-[9px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                            colorMode 
                                                ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        <option value="">All Subjects</option>
                                        {ACTIVITY_FEED_SUBJECTS.map(subject => (
                                            <option key={subject} value={subject}>{subject}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Add Message Dropdown Trigger */}
                                <div className="mb-3">
                                    <button
                                        onClick={() => setShowMessageDropdown(!showMessageDropdown)}
                                        className={`w-full px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-between ${
                                            showMessageDropdown
                                                ? colorMode 
                                                    ? 'border-blue-400 bg-blue-900/20 text-blue-300' 
                                                    : 'border-blue-400 bg-blue-50 text-blue-700'
                                                : colorMode 
                                                    ? 'border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-300' 
                                                    : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700'
                                        }`}
                                    >
                                        <span>+ Add Message</span>
                                        <svg className={`w-4 h-4 transition-transform ${showMessageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {/* Add Message Dropdown Form */}
                                {showMessageDropdown && (
                                    <div className={`p-4 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            if (newMessageProject && newMessageSubject && newMessageText.trim()) {
                                                // Create new message activity
                                                const selectedProject = projects?.find(p => p.id === parseInt(newMessageProject));
                                                const newActivity = {
                                                    id: `msg_${Date.now()}`,
                                                    projectId: parseInt(newMessageProject),
                                                    projectName: selectedProject?.name || 'Unknown Project',
                                                    projectNumber: selectedProject?.projectNumber || Math.floor(Math.random() * 90000) + 10000,
                                                    subject: newMessageSubject,
                                                    description: newMessageText,
                                                    user: 'You',
                                                    timestamp: new Date().toISOString(),
                                                    type: 'message',
                                                    priority: 'medium'
                                                };
                                                
                                                // Add to messages data
                                                setMessagesData(prev => [newActivity, ...prev]);
                                                setFeed(prev => [newActivity, ...prev]);
                                                
                                                // Close dropdown and reset form
                                                setShowMessageDropdown(false);
                                                setNewMessageProject('');
                                                setNewMessageSubject('');
                                                setNewMessageText('');
                                            }
                                        }} className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className={`block text-xs font-medium mb-1 ${
                                                        colorMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                        Project <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={newMessageProject}
                                                        onChange={(e) => setNewMessageProject(e.target.value)}
                                                        required
                                                        className={`w-full p-2 border rounded text-xs ${
                                                            colorMode 
                                                                ? 'bg-[#232b4d] border-gray-600 text-white' 
                                                                : 'bg-white border-gray-300 text-gray-800'
                                                        }`}
                                                    >
                                                        <option value="">Select Project</option>
                                                        {(projects || []).map(projectOption => (
                                                            <option key={projectOption.id} value={projectOption.id}>
                                                                #{String(projectOption.projectNumber || projectOption.id).padStart(5, '0')} - {projectOption.name || projectOption.address}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className={`block text-xs font-medium mb-1 ${
                                                        colorMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                        Subject <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={newMessageSubject}
                                                        onChange={(e) => setNewMessageSubject(e.target.value)}
                                                        required
                                                        className={`w-full p-2 border rounded text-xs ${
                                                            colorMode 
                                                                ? 'bg-[#232b4d] border-gray-600 text-white' 
                                                                : 'bg-white border-gray-300 text-gray-800'
                                                        }`}
                                                    >
                                                        <option value="">Select Subject</option>
                                                        {ACTIVITY_FEED_SUBJECTS.map(subject => (
                                                            <option key={subject} value={subject}>{subject}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className={`block text-xs font-medium mb-1 ${
                                                    colorMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                    Message <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    value={newMessageText}
                                                    onChange={(e) => setNewMessageText(e.target.value)}
                                                    placeholder="Enter your message here..."
                                                    required
                                                    rows={3}
                                                    className={`w-full p-2 border rounded text-xs resize-none ${
                                                        colorMode 
                                                            ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                                                            : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                                                    }`}
                                                />
                                            </div>
                                            
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowMessageDropdown(false);
                                                        setNewMessageProject('');
                                                        setNewMessageSubject('');
                                                        setNewMessageText('');
                                                    }}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                                                        colorMode 
                                                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={!newMessageProject || !newMessageSubject || !newMessageText.trim()}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                                                        newMessageProject && newMessageSubject && newMessageText.trim()
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                >
                                                    Send Message
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-2 mt-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                                {currentActivities.length === 0 ? (
                                    <div className="text-gray-400 text-center py-3 text-[9px]">
                                        No messages found.
                                    </div>
                                ) : (
                                    currentActivities.map(activity => (
                                        <ProjectMessagesCard 
                                            key={activity.id} 
                                            activity={activity} 
                                            onProjectSelect={handleProjectSelectWithScroll}
                                            projects={projects}
                                            colorMode={colorMode}
                                            onQuickReply={handleQuickReply}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'Alerts':
                // Complete Current Alerts section (copied exactly from dashboard)
                return (
                    <div className="w-full" data-section="current-alerts">
                        <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h1>
                                    </div>
                                </div>
                                
                                {/* Filter Controls */}
                                <div className="flex items-center gap-2 mb-2 mt-3">
                                    <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
                                    <select 
                                        value={alertProjectFilter} 
                                        onChange={(e) => setAlertProjectFilter(e.target.value)} 
                                        className={`text-[9px] font-medium px-2 py-1 rounded border transition-colors min-w-[140px] ${
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
                                        className={`text-[9px] font-medium px-2 py-1 rounded border transition-colors min-w-[120px] ${
                                            colorMode 
                                                ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        <option value="all">All User Groups</option>
                                        <option value="PM">Project Manager</option>
                                        <option value="FIELD">Field Director</option>
                                        <option value="OFFICE">Office Staff</option>
                                        <option value="ADMIN">Administration</option>
                                    </select>
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
                            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                                {getPaginatedAlerts().length === 0 ? (
                                    <div className="text-gray-400 text-center py-3 text-sm">
                                        {alertsLoading ? 'Loading alerts...' : 'No alerts found.'}
                                    </div>
                                ) : (
                                    getPaginatedAlerts().map(alert => {
                                        // Extract data from alert
                                        const alertId = alert._id || alert.id;
                                        const actionData = alert.actionData || alert.metadata || {};
                                        const phase = actionData.phase || 'UNKNOWN';
                                        const priority = actionData.priority || 'medium';
                                        
                                        // Find associated project
                                        const projectId = actionData.projectId;
                                        const alertProject = projects?.find(p => p.id === projectId || p._id === projectId);
                                        
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
                                                            <div className={`w-5 h-5 ${getPhaseCircleColors(phase).bg} rounded-full flex items-center justify-center ${getPhaseCircleColors(phase).text} font-bold text-[9px] shadow-sm`}>
                                                                {phase.charAt(0).toUpperCase()}
                                                            </div>
                                                            {priority === 'high' && (
                                                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Left Section: Project# | Customer | PM - Fixed positioning */}
                                                        <div className="flex items-center text-[9px] flex-1">
                                                            {/* Project Number */}
                                                            <span 
                                                                className={`font-bold cursor-pointer hover:underline flex-shrink-0 ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                style={{width: '50px'}}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (alertProject && onProjectSelect) {
                                                                        const projectWithScrollId = {
                                                                            ...alertProject,
                                                                            scrollToProjectId: String(alertProject.id)
                                                                        };
                                                                        handleProjectSelectWithScroll(projectWithScrollId, 'Projects', null, 'Current Alerts');
                                                                    }
                                                                }}
                                                            >
                                                                {alertProject?.projectNumber || actionData.projectNumber || '12345'}
                                                            </span>
                                                            
                                                            {/* Customer with dropdown arrow - Full width, no truncation */}
                                                            <div className="flex items-center gap-1 flex-shrink-0" style={{width: '140px', marginLeft: '8px'}}>
                                                                <button 
                                                                    className={`text-[9px] font-semibold cursor-pointer hover:underline ${
                                                                        colorMode ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                                                                    }`}
                                                                    title={alertProject?.customer?.name || alertProject?.clientName || actionData.projectName || 'Primary Customer'}
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
                                                                    {alertProject?.customer?.name || alertProject?.clientName || actionData.projectName || 'Customer'}
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
                                                            
                                                            {/* PM with dropdown arrow - Moved further right */}
                                                            <div className="flex items-center gap-1 flex-shrink-0" style={{marginLeft: '20px'}}>
                                                                <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>PM:</span>
                                                                <button 
                                                                    className={`text-[9px] font-semibold cursor-pointer hover:underline truncate max-w-[80px] ${
                                                                        colorMode ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                                                                    }`}
                                                                    title={alertProject?.projectManager?.name || alertProject?.projectManager?.firstName + ' ' + alertProject?.projectManager?.lastName || 'Mike Field'}
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
                                                                    {alertProject?.projectManager?.firstName || alertProject?.projectManager?.name || 'Mike'}
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
                                                        
                                                        {/* Right Section: User Group & Arrow */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <div className="w-8 h-3 px-0.5 py-0 border border-gray-300 rounded-full flex items-center justify-center text-black font-medium text-[7px] bg-white">
                                                                {formatUserRole(alert.user?.role || actionData.defaultResponsible || 'OFFICE')}
                                                            </div>
                                                            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Second Row - Section and Line Item */}
                                                <div className="flex items-center text-[9px]" style={{ marginTop: '-2px', marginLeft: '32px' }}>
                                                    {/* Section - align S with project number (50px width) */}
                                                    <div className="flex items-center gap-1" style={{ width: '210px' }}>
                                                        <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ width: '50px' }}>Section:</span>
                                                        <span className={`font-semibold truncate ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                            {sectionName?.split('-')[0]?.trim() || sectionName}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Line Item - align L with PM (align under PM section) */}
                                                    <div className="flex items-center gap-1 flex-1">
                                                        <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Line Item:</span>
                                                        <span 
                                                            className={`font-semibold cursor-pointer hover:underline max-w-[120px] truncate ${
                                                                colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                                            }`}
                                                            title={lineItemName}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (alertProject && onProjectSelect) {
                                                                    const projectWithStepInfo = {
                                                                        ...alertProject,
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
                                                                    handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
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
                                                                {alertProject?.customer?.name || alertProject?.clientName || actionData.projectName || 'Primary Customer'}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <div className={`${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                    📍 {alertProject?.customer?.address || alertProject?.clientAddress || '123 Main Street, City, State 12345'}
                                                                </div>
                                                                <a 
                                                                    href={`tel:${(alertProject?.customer?.phone || alertProject?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                                                                    className={`block font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                >
                                                                    📞 {alertProject?.customer?.phone || alertProject?.clientPhone || '(555) 123-4567'}
                                                                </a>
                                                                <a 
                                                                    href={`mailto:${alertProject?.customer?.email || alertProject?.clientEmail || 'customer@email.com'}`} 
                                                                    className={`block font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                >
                                                                    ✉️ {alertProject?.customer?.email || alertProject?.clientEmail || 'customer@email.com'}
                                                                </a>
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
                                                                {alertProject?.projectManager?.name || alertProject?.projectManager?.firstName + ' ' + alertProject?.projectManager?.lastName || 'Mike Field'}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <a 
                                                                    href={`tel:${(alertProject?.projectManager?.phone || '(555) 234-5678').replace(/[^\d+]/g, '')}`} 
                                                                    className={`block font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                >
                                                                    📞 {alertProject?.projectManager?.phone || '(555) 234-5678'}
                                                                </a>
                                                                <a 
                                                                    href={`mailto:${alertProject?.projectManager?.email || 'mike.field@company.com'}`} 
                                                                    className={`block font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                                                >
                                                                    ✉️ {alertProject?.projectManager?.email || 'mike.field@company.com'}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Expandable dropdown section */}
                                                {isExpanded && (
                                                    <div className={`px-2 py-2 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                        {/* Action Buttons - First Priority */}
                                                        <div className="flex gap-2 mb-2">
                                                            {/* Complete Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCompleteAlert(alert);
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
                                                                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                                                                    handleAssignAlert(alert);
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
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'Project Timeline':
                // Calculate actual dates based on project timeline
                const calculatePhaseDates = (startDate, endDate, phaseIndex, totalPhases) => {
                    if (!startDate || !endDate) return 'TBD';
                    
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const totalDuration = end - start;
                    const phaseDuration = totalDuration / totalPhases;
                    
                    const phaseStart = new Date(start.getTime() + (phaseIndex * phaseDuration));
                    const phaseEnd = new Date(start.getTime() + ((phaseIndex + 1) * phaseDuration));
                    
                    return `${phaseStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${phaseEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                };

                // Format delivery and labor dates
                const formatDateRange = (startDate, endDate) => {
                    if (!startDate) return 'TBD';
                    if (!endDate) return startDate;
                    
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    
                    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                };

                const projectTimeline = [
                    // Delivery and Labor dates at the TOP
                    {
                        phase: 'Materials Delivery',
                        date: formatDateRange(projectData.materialsDeliveryStart, projectData.materialsDeliveryEnd),
                        label: 'Materials Delivery',
                        detail: 'Delivery and inspection of all project materials',
                        tasks: [
                            'Schedule Delivery',
                            'Receive Materials',
                            'Inspect Materials',
                            'Store Materials Securely',
                            'Verify All Items Received'
                        ],
                        responsible: '🚚 Delivery + 👷‍♂️ PM'
                    },
                    {
                        phase: 'Labor Phase',
                        date: formatDateRange(projectData.laborStart, projectData.laborEnd),
                        label: 'Installation & Labor',
                        detail: 'Field installation, progress monitoring, quality assurance',
                        tasks: [
                            'Installation Process (Field Crew)',
                            'Daily Progress Documentation',
                            'Quality Check (Field + Admin)',
                            'Customer Updates',
                            'Subcontractor Coordination'
                        ],
                        responsible: '🛠️ Field Crew + 📝 Admin'
                    },
                    // Project phases after delivery and labor
                    {
                        phase: 'Lead Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 0, 6),
                        label: 'Lead Processing',
                        detail: 'Customer information input, property evaluation, PM assignment',
                        tasks: [
                            'Input Customer Information',
                            'Complete Questions Checklist', 
                            'Input Lead Property Information',
                            'Assign Project Manager',
                            'Schedule Initial Inspection'
                        ],
                        responsible: '🏢 Office'
                    },
                    {
                        phase: 'Prospect Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 1, 6),
                        label: 'Site Inspection & Estimation',
                        detail: 'Site inspection, estimate preparation, insurance processing',
                        tasks: [
                            'Site Inspection (PM)',
                            'Write Estimate (PM)',
                            'Insurance Process (Admin)',
                            'Agreement Preparation (Admin)',
                            'Agreement Signing (Admin)'
                        ],
                        responsible: '👷‍♂️ PM + 📝 Admin'
                    },
                    {
                        phase: 'Approved Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 2, 6),
                        label: 'Project Setup',
                        detail: 'Material ordering, permit processing, production preparation',
                        tasks: [
                            'Administrative Setup',
                            'Pre-Job Actions (Permits)',
                            'Prepare for Production',
                            'Verify Labor Orders',
                            'Verify Material Orders'
                        ],
                        responsible: '📝 Admin + 🏢 Office'
                    },
                    {
                        phase: 'Execution Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 3, 6),
                        label: 'Installation & Quality Check',
                        detail: 'Field installation, progress monitoring, quality assurance',
                        tasks: [
                            'Installation Process (Field Crew)',
                            'Daily Progress Documentation',
                            'Quality Check (Field + Admin)',
                            'Customer Updates',
                            'Subcontractor Coordination'
                        ],
                        responsible: '🛠️ Field Crew + 📝 Admin'
                    },
                    {
                        phase: '2nd Supplement Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 4, 6),
                        label: 'Supplement Processing',
                        detail: 'Insurance supplement creation, follow-up, customer updates',
                        tasks: [
                            'Create Supplement in Xactimate',
                            'Insurance Follow-up',
                            'Review Approved Items',
                            'Customer Updates',
                            'Final Supplement Processing'
                        ],
                        responsible: '📝 Administration'
                    },
                    {
                        phase: 'Completion Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 5, 6),
                        label: 'Project Closeout',
                        detail: 'Final inspection, financial processing, warranty registration',
                        tasks: [
                            'Final Inspection',
                            'Financial Processing',
                            'AR Follow-Up',
                            'Project Closeout',
                            'Warranty Registration'
                        ],
                        responsible: '🏢 Office + 📝 Admin'
                    }
                ];
                
                // Calculate current step based on project progress and actual dates
                const getCurrentStep = (progress, materialsDeliveryStart, laborStart) => {
                    const now = new Date();
                    
                    // Check if materials delivery has started
                    if (materialsDeliveryStart && new Date(materialsDeliveryStart) <= now) {
                        if (progress < 15) return 0; // Materials Delivery
                        if (progress < 30) return 1; // Labor Phase
                        if (progress < 45) return 2; // Lead Phase
                        if (progress < 60) return 3; // Prospect Phase
                        if (progress < 75) return 4; // Approved Phase
                        if (progress < 85) return 5; // Execution Phase
                        if (progress < 95) return 6; // 2nd Supplement Phase
                        return 7; // Completion Phase
                    }
                    
                    // Before materials delivery
                    if (progress < 15) return 0; // Materials Delivery (pending)
                    if (progress < 30) return 1; // Labor Phase (pending)
                    if (progress < 45) return 2; // Lead Phase
                    if (progress < 60) return 3; // Prospect Phase
                    if (progress < 75) return 4; // Approved Phase
                    if (progress < 85) return 5; // Execution Phase
                    if (progress < 95) return 6; // 2nd Supplement Phase
                    return 7; // Completion Phase
                };
                
                const currentStep = getCurrentStep(projectData.progress || 0, projectData.materialsDeliveryStart, projectData.laborStart);
                
                return (
                    <div className="space-y-6">
                        {/* Project Timeline */}
                        <ProjectTimeline timeline={projectTimeline} currentStep={currentStep} />
                    </div>
                );
            case 'Project Documents':
                return <ProjectDocumentsPage project={projectData} onBack={onBack} colorMode={colorMode} />;
            case 'Work Order':
                return <div className="p-8 text-center text-gray-400 text-sm">(Blank for now)</div>;
            default:
                return <ProjectChecklistPage project={projectData} onUpdate={handleChecklistUpdate} onPhaseCompletionChange={handlePhaseCompletionChange} />;
        }
    };

    const navItems = ['Project Workflow', 'Alerts', 'Messages', 'Project Schedule', 'Project Documents', 'Work Order'];

    if (!project) {
        return <div className="text-red-600 font-bold p-8">No project selected or project data is missing.</div>;
    }

    return (
        <div className="h-full flex flex-col">
            <ScrollToTop />
            
            {/* Header with Back Button and Tabs - Normal Position */}
            <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                {/* Back Button Row */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <button 
                        onClick={handleBackButton} 
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors duration-200 border border-blue-200 hover:border-blue-300"
                    >
                        <ChevronLeftIcon className="w-3 h-3" />
                        {getBackButtonText()}
                    </button>
                    
                    {/* Compact Project & Customer Info */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`font-semibold ${colorMode ? 'text-gray-800' : 'text-gray-800'}`}>
                            {project.projectName || project.name || 'Project Name'}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className={`font-semibold ${colorMode ? 'text-gray-800' : 'text-gray-800'}`}>
                            {project.customer?.name || project.client?.name || 'Client Name'}
                        </span>
                        <span className="text-gray-400">•</span>
                        <a 
                            href={`tel:${((project.customer?.phone || project.client?.phone) || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                            className={`hover:underline ${colorMode ? 'text-blue-600 hover:text-blue-500' : 'text-blue-600 hover:text-blue-700'}`}
                        >
                            {formatPhoneNumber(project.customer?.phone || project.client?.phone)}
                        </a>
                        <span className="text-gray-400">•</span>
                        <a 
                            href={`mailto:${(project.customer?.email || project.client?.email) || 'client@email.com'}`} 
                            className={`hover:underline ${colorMode ? 'text-blue-600 hover:text-blue-500' : 'text-blue-600 hover:text-blue-700'}`}
                        >
                            {project.customer?.email || project.client?.email || 'client@email.com'}
                        </a>
                    </div>
                </div>
                
                {/* Tabs Navigation */}
                <div className="px-3 py-1">
                    <nav className="flex space-x-4" aria-label="Tabs">
                        {navItems.map(item => {
                            // Define which tabs are disabled/not ready
                            const disabledTabs = ['Project Schedule', 'Work Order', 'Project Documents'];
                            const isDisabled = disabledTabs.includes(item);
                            
                            return (
                                <button 
                                    key={item} 
                                    disabled={isDisabled}
                                    onClick={() => {
                                        if (!isDisabled) {
                                            console.log('🔍 PROJECT_DETAIL: Tab clicked:', item);
                                            console.log('🔍 PROJECT_DETAIL: Current activeView:', activeView);
                                            setActiveView(item);
                                            console.log('🔍 PROJECT_DETAIL: Setting activeView to:', item);
                                            // Force scroll to top when switching tabs
                                            setTimeout(() => {
                                                if (scrollRef.current) {
                                                    scrollRef.current.scrollTop = 0;
                                                }
                                                window.scrollTo({ top: 0, behavior: 'auto' });
                                            }, 1);
                                        }
                                    }} 
                                    className={`whitespace-nowrap py-1 px-1 border-b-2 font-medium text-xs transition-colors duration-200 ${
                                        isDisabled 
                                            ? 'border-transparent text-gray-400 opacity-70 cursor-not-allowed' 
                                            : activeView === item 
                                                ? 'border-primary-500 text-primary-600' 
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {item === 'Project Workflow' && phaseCompletion.completedPhases && Object.values(phaseCompletion.completedPhases).length === 7 && Object.values(phaseCompletion.completedPhases).every(Boolean) ? (
                                        <span className="line-through">{item}</span>
                                    ) : item}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>
            
            {/* Content Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                {/* Scrollable Content */}
                <div className="p-4">
                    <div className="min-h-[calc(100vh-200px)]">
                        {renderProjectView()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage; 