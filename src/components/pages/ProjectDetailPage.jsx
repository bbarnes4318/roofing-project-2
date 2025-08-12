import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronLeftIcon, LocationMarkerIcon } from '../common/Icons';
import ProjectChecklistPage from './ProjectChecklistPage';
import ProjectMessagesPage from './ProjectMessagesPage';
import ProjectDocumentsPage from './ProjectDocumentsPage';
import TasksAndAlertsPage from './TasksAndAlertsPage';
import ProjectProfileTab from './ProjectProfileTab';
import ProjectTimeline from '../../dashboard/ProjectTimeline';
import ScrollToTop from '../common/ScrollToTop';
import { formatPhoneNumber } from '../../utils/helpers';
import { useWorkflowAlerts } from '../../hooks/useQueryApi';
import { teamMembers } from '../../data/mockData';
import { usersService } from '../../services/api';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import { mapStepToWorkflowStructure } from '../../utils/workflowMapping';
import WorkflowProgressService from '../../services/workflowProgress';
import workflowService from '../../services/workflowService';
import { ACTIVITY_FEED_SUBJECTS } from '../../data/constants';
import { ResponsiveBackButton, HeaderBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';

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



const ProjectDetailPage = ({ project, onBack, initialView = 'Project Workflow', onSendMessage, tasks, projects, onUpdate, activities, onAddActivity, colorMode, previousPage, projectSourceSection, onProjectSelect, targetLineItemId, targetSectionId }) => {
    const { pushNavigation } = useNavigationHistory();
    
    // Track page navigation for back button functionality
    useEffect(() => {
        if (project) {
            pushNavigation(`Project: ${project.projectName || project.name || 'Project Detail'}`, {
                project,
                initialView,
                previousPage,
                projectSourceSection
            });
        }
    }, [pushNavigation, project?.id, initialView]);

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
        
        // CRITICAL: Always filter by current project when in project detail view
        filteredAlerts = filteredAlerts.filter(alert => {
            const projectId = alert.actionData?.projectId || alert.metadata?.projectId || alert.projectId || alert.relatedProject?._id || alert.relatedProject?.id;
            return projectId === project.id || String(projectId) === String(project.id) || projectId === project._id || String(projectId) === String(project._id);
        });
        
        // USER-SPECIFIC FILTERING: Only show alerts for the current user
        filteredAlerts = filteredAlerts.filter(alert => {
            // Check if alert is assigned to current user
            const assignedToId = alert.assignedTo || alert.assignedToId || alert.metadata?.assignedTo;
            const targetUserId = alert.targetedTo || alert.targetUserId || alert.metadata?.targetedTo;
            const resolveAlertRole = () => {
                const role = alert.metadata?.responsibleRole
                    || alert.actionData?.responsibleRole
                    || alert.metadata?.defaultResponsible
                    || alert.actionData?.defaultResponsible
                    || alert.user?.role
                    || 'OFFICE';
                return formatUserRole(String(role));
            };

            // If alert has specific user assignment, only show to that user
            if (assignedToId) {
                return assignedToId === currentUser.id || String(assignedToId) === String(currentUser.id);
            }
            
            // If alert is targeted to specific user, only show to that user
            if (targetUserId) {
                return targetUserId === currentUser.id || String(targetUserId) === String(currentUser.id);
            }
            
            // If alert is for a specific role, check if current user has that role
            const normalizedUserRole = formatUserRole(currentUser.role);
            const normalizedAlertRole = resolveAlertRole();
            return normalizedUserRole === normalizedAlertRole;
        });
        
        // Apply additional project filter (if user has applied a specific filter)
        if (alertProjectFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(alert => {
                const projectId = alert.actionData?.projectId || alert.metadata?.projectId || alert.projectId;
                return projectId === alertProjectFilter || String(projectId) === String(alertProjectFilter);
            });
        }
        
        // Apply user group filter
        if (alertUserGroupFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(alert => {
                const role = alert.metadata?.responsibleRole
                    || alert.actionData?.responsibleRole
                    || alert.metadata?.defaultResponsible
                    || alert.actionData?.defaultResponsible
                    || alert.user?.role
                    || 'OFFICE';
                return formatUserRole(String(role)) === alertUserGroupFilter;
            });
        }
        
        // Sort alerts by priority and timestamp (matching dashboard)
        filteredAlerts.sort((a, b) => {
            // Priority sort first (high priority first)
            const priorityA = a.priority || a.metadata?.priority || 'medium';
            const priorityB = b.priority || b.metadata?.priority || 'medium';
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const priorityDiff = priorityOrder[priorityA] - priorityOrder[priorityB];
            if (priorityDiff !== 0) return priorityDiff;
            
            // Then sort by timestamp (newest first)
            const dateA = new Date(a.createdAt || a.timestamp || 0);
            const dateB = new Date(b.createdAt || b.timestamp || 0);
            return dateB - dateA;
        });
        
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
            if (alert.metadata?.workflowId && (alert.metadata?.stepId || alert.metadata?.lineItemId)) {
                workflowId = alert.metadata.workflowId;
                stepId = alert.metadata.stepId || alert.metadata.lineItemId;
                console.log('✅ Found workflow/step IDs in metadata');
            } else if (alert.data?.workflowId && (alert.data?.stepId || alert.data?.lineItemId)) {
                workflowId = alert.data.workflowId;
                stepId = alert.data.stepId || alert.data.lineItemId;
                console.log('✅ Found workflow/step IDs in data field');
            } else if (alert.workflowId && (alert.stepId || alert.lineItemId)) {
                workflowId = alert.workflowId;
                stepId = alert.stepId || alert.lineItemId;
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

            console.log(`🚀 Attempting to complete workflow item using NEW DATABASE SYSTEM: stepId=${stepId}`);

            // CRITICAL: Use NEW database-driven workflow completion
            const response = await workflowService.completeLineItem(
                    projectId,
                    stepId,
                    'Completed via project detail alerts by user',
                    alertId
                );
                
                console.log('✅ NEW SYSTEM: Line item completed successfully:', response);
                
                // Process the successful completion
                const result = response;
                
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

    const handleAssignConfirm = (user, alert, projectName) => {
        // TODO: Implement assign alert confirmation functionality
        console.log('Assign alert confirmed:', { user, alert, projectName });
        setShowAssignModal(false);
        setSelectedAlertForAssign(null);
        setAssignToUser('');
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
    
    // Assignment modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedAlertForAssign, setSelectedAlertForAssign] = useState(null);
    const [assignToUser, setAssignToUser] = useState('');
    
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
    const [newMessageTo, setNewMessageTo] = useState('');
    const [newMessageSendAsTask, setNewMessageSendAsTask] = useState('');
    const [messagesData, setMessagesData] = useState([]);
    const [feed, setFeed] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [users, setUsers] = useState([]);
    
    // Current Alerts state variables - matching dashboard
    const [alertProjectFilter, setAlertProjectFilter] = useState('all');
    const [alertUserGroupFilter, setAlertUserGroupFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState({});
    
    // Call useWorkflowAlerts at the top level to comply with React hooks rules
    const { workflowAlerts, isLoading: alertsLoading, error: alertsError } = useWorkflowAlerts({ status: 'active' });
    
    // Load users for dropdown
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await usersService.getTeamMembers();
                if (response.success) {
                    setUsers(response.data);
                } else {
                    // Fallback to mock users if API fails
                    setUsers([
                        { id: 1, name: 'Mike Field', role: 'Project Manager', email: 'mike.field@company.com' },
                        { id: 2, name: 'Sarah Johnson', role: 'Office Manager', email: 'sarah.johnson@company.com' },
                        { id: 3, name: 'John Smith', role: 'Field Director', email: 'john.smith@company.com' },
                        { id: 4, name: 'Emily Davis', role: 'Administration', email: 'emily.davis@company.com' },
                        { id: 5, name: 'Robert Wilson', role: 'Roof Supervisor', email: 'robert.wilson@company.com' },
                        { id: 6, name: 'Lisa Anderson', role: 'Customer Service', email: 'lisa.anderson@company.com' },
                        { id: 7, name: 'David Martinez', role: 'Estimator', email: 'david.martinez@company.com' },
                        { id: 8, name: 'Jennifer Brown', role: 'Accounting', email: 'jennifer.brown@company.com' }
                    ]);
                }
            } catch (error) {
                console.error('Error loading users:', error);
                // Use fallback mock users
                setUsers([
                    { id: 1, name: 'Mike Field', role: 'Project Manager', email: 'mike.field@company.com' },
                    { id: 2, name: 'Sarah Johnson', role: 'Office Manager', email: 'sarah.johnson@company.com' },
                    { id: 3, name: 'John Smith', role: 'Field Director', email: 'john.smith@company.com' },
                    { id: 4, name: 'Emily Davis', role: 'Administration', email: 'emily.davis@company.com' },
                    { id: 5, name: 'Robert Wilson', role: 'Roof Supervisor', email: 'robert.wilson@company.com' },
                    { id: 6, name: 'Lisa Anderson', role: 'Customer Service', email: 'lisa.anderson@company.com' },
                    { id: 7, name: 'David Martinez', role: 'Estimator', email: 'david.martinez@company.com' },
                    { id: 8, name: 'Jennifer Brown', role: 'Accounting', email: 'jennifer.brown@company.com' }
                ]);
            }
        };
        loadUsers();
    }, []);

    // Get current user (from auth or mock)
    const getCurrentUser = () => {
        // Try to get from localStorage or use mock user
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                // Default mock user
                return { id: 2, name: 'Sarah Johnson', role: 'Office Manager', email: 'sarah.johnson@company.com' };
            }
        }
        return { id: 2, name: 'Sarah Johnson', role: 'Office Manager', email: 'sarah.johnson@company.com' };
    };
    
    const currentUser = getCurrentUser();
    
    // Calculate current activities for Project Messages (moved after state declarations)
    const calculateCurrentActivities = () => {
        // Filter activities (use activities prop or messagesData)
        const allActivities = activities || messagesData || [];
        
        let filteredActivities = allActivities.filter(activity => {
            // CRITICAL: Always filter by current project when in project detail view
            if (activity.projectId !== project.id && activity.projectId !== parseInt(project.id)) {
                return false;
            }
            
            // Filter by targeted user - only show messages targeted to current user or sent by current user
            if (activity.targetedTo && activity.targetedTo !== currentUser.id && activity.userId !== currentUser.id) {
                return false;
            }
            
            // Additional project filter (if user has applied a specific filter)
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
        // First check projectSourceSection for specific dashboard sections
        if (projectSourceSection) {
            switch (projectSourceSection) {
                case 'Current Alerts':
                    return 'Back to Current Alerts';
                case 'Project Messages':
                    return 'Back to Project Messages';
                case 'Project Cubes':
                    return 'Back to Project Access';
                case 'Project Phases':
                    return 'Back to Projects by Phase';
                case 'Project Workflow Alerts':
                    return 'Back to Alerts';
                default:
                    // Continue to check previousPage
                    break;
            }
        }
        
        // Fallback to previousPage if no specific source section
        switch (previousPage) {
            case 'Overview':
                return 'Back to Dashboard';
            case 'Projects':
                return 'Back to My Projects';
            case 'Project Messages':
                return 'Back to Messages';
            case 'Company Calendar':
                return 'Back to Calendar';
            case 'AI Assistant':
                return 'Back to AI Assistant';
            default:
                return 'Back';
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
                return <ProjectChecklistPage project={projectData} onUpdate={handleChecklistUpdate} onPhaseCompletionChange={handlePhaseCompletionChange} targetLineItemId={targetLineItemId} targetSectionId={targetSectionId} />;
            case 'Profile':
                return <ProjectProfileTab project={projectData} colorMode={colorMode} />;
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
                                            if (newMessageProject && newMessageSubject && newMessageText.trim() && newMessageTo) {
                                                // Create new message activity
                                                const selectedProject = projects?.find(p => p.id === parseInt(newMessageProject));
                                                const targetedUser = users.find(u => u.id === parseInt(newMessageTo));
                                                const taskAssignee = newMessageSendAsTask ? users.find(u => u.id === parseInt(newMessageSendAsTask)) : null;
                                                
                                                const newActivity = {
                                                    id: `msg_${Date.now()}`,
                                                    projectId: parseInt(newMessageProject),
                                                    projectName: selectedProject?.name || 'Unknown Project',
                                                    projectNumber: selectedProject?.projectNumber || Math.floor(Math.random() * 90000) + 10000,
                                                    subject: newMessageSubject,
                                                    description: newMessageText,
                                                    user: currentUser.name,
                                                    userId: currentUser.id,
                                                    targetedTo: parseInt(newMessageTo),
                                                    targetedToName: targetedUser?.name || 'Unknown User',
                                                    isTask: !!newMessageSendAsTask,
                                                    taskAssigneeId: taskAssignee?.id || null,
                                                    taskAssigneeName: taskAssignee?.name || null,
                                                    timestamp: new Date().toISOString(),
                                                    type: newMessageSendAsTask ? 'task' : 'message',
                                                    priority: newMessageSendAsTask ? 'high' : 'medium'
                                                };
                                                
                                                // Add to messages data
                                                setMessagesData(prev => [newActivity, ...prev]);
                                                setFeed(prev => [newActivity, ...prev]);
                                                
                                                // Close dropdown and reset form
                                                setShowMessageDropdown(false);
                                                setNewMessageProject('');
                                                setNewMessageSubject('');
                                                setNewMessageText('');
                                                setNewMessageTo('');
                                                setNewMessageSendAsTask('');
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
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className={`block text-xs font-medium mb-1 ${
                                                        colorMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                        To <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={newMessageTo}
                                                        onChange={(e) => setNewMessageTo(e.target.value)}
                                                        required
                                                        className={`w-full p-2 border rounded text-xs ${
                                                            colorMode 
                                                                ? 'bg-[#232b4d] border-gray-600 text-white' 
                                                                : 'bg-white border-gray-300 text-gray-800'
                                                        }`}
                                                    >
                                                        <option value="">Select User</option>
                                                        {users.map(user => (
                                                            <option key={user.id} value={user.id}>
                                                                {user.name} - {user.role}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className={`block text-xs font-medium mb-1 ${
                                                        colorMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                        Send as Task (Optional)
                                                    </label>
                                                    <select
                                                        value={newMessageSendAsTask}
                                                        onChange={(e) => setNewMessageSendAsTask(e.target.value)}
                                                        className={`w-full p-2 border rounded text-xs ${
                                                            colorMode 
                                                                ? 'bg-[#232b4d] border-gray-600 text-white' 
                                                                : 'bg-white border-gray-300 text-gray-800'
                                                        }`}
                                                    >
                                                        <option value="">No - Send as Message</option>
                                                        {users.map(user => (
                                                            <option key={user.id} value={user.id}>
                                                                Assign to: {user.name} - {user.role}
                                                            </option>
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
                                                        setNewMessageTo('');
                                                        setNewMessageSendAsTask('');
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
                                                    disabled={!newMessageProject || !newMessageSubject || !newMessageText.trim() || !newMessageTo}
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
                                    currentActivities.map(activity => {
                                        // Enhanced activity with To and Task info for display
                                        const enhancedActivity = {
                                            ...activity,
                                            displayTo: activity.targetedToName || 'All Users',
                                            displayTask: activity.isTask ? `Task assigned to: ${activity.taskAssigneeName || 'Unassigned'}` : null
                                        };
                                        return (
                                            <ProjectMessagesCard 
                                                key={activity.id} 
                                                activity={enhancedActivity} 
                                                onProjectSelect={handleProjectSelectWithScroll}
                                                projects={projects}
                                                colorMode={colorMode}
                                                onQuickReply={handleQuickReply}
                                            />
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'Alerts':
                // Complete Current Alerts section (matching dashboard format)
                return (
                    <div className="w-full" data-section="current-alerts">
                        <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h1>
                                        <p className={`text-[9px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Showing alerts for: {currentUser.name} ({currentUser.role})
                                        </p>
                                        {expandedAlerts.size > 0 && (
                                            <p className={`text-[9px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {expandedAlerts.size} of {getPaginatedAlerts().length} alert{getPaginatedAlerts().length !== 1 ? 's' : ''} expanded
                                            </p>
                                        )}
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
                                        {alertsLoading ? 'Loading alerts...' : `No alerts found for ${currentUser.name}.`}
                                    </div>
                                ) : (
                                    getPaginatedAlerts().map(alert => {
                                        // Extract data from alert
                                        const alertId = alert._id || alert.id;
                                        const actionData = alert.actionData || alert.metadata || {};
                                        const phase = actionData.phase || 'UNKNOWN';
                                        const priority = actionData.priority || 'medium';
                                        
                                        // Find associated project
                                        const projectId = actionData.projectId || alert.projectId || alert.relatedProject?.id;
                                        const alertProject = projects?.find(p => p.id === projectId || p._id === projectId) || project;
                                        
                                        // Alert details
                                        const alertTitle = actionData.stepName || alert.title || 'Unknown Alert';
                                        const isExpanded = expandedAlerts.has(alertId);
                                        
                                        // Check if this alert is assigned to current user
                                        const isAssignedToMe = alert.assignedTo === currentUser.id || 
                                                              alert.assignedToId === currentUser.id ||
                                                              alert.targetedTo === currentUser.id;
                                        
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
                                            <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-[20px] shadow-sm border transition-all duration-200 cursor-pointer ${isAssignedToMe ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}>
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
                                                            {isAssignedToMe && (
                                                                <span className="text-[8px] font-semibold text-blue-500">Assigned to you</span>
                                                            )}
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
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (alertProject && onProjectSelect) {
                                                                    console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Starting alert line item navigation');
                                                                    console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Project:', alertProject.name);
                                                                    console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Phase:', phase);
                                                                    console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Section:', sectionName);
                                                                    console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Line Item:', lineItemName);
                                                                    
                                                                    try {
                                                                        // Get project position data to generate proper targetLineItemId (matching workflow button logic)
                                                                        const positionResponse = await fetch(`/api/workflow-data/project-position/${alertProject.id}`, {
                                                                            headers: {
                                                                                'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                                                                            }
                                                                        });
                                                                        
                                                                        if (positionResponse.ok) {
                                                                            const positionResult = await positionResponse.json();
                                                                            console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Position data:', positionResult);
                                                                            
                                                                            if (positionResult.success && positionResult.data) {
                                                                                const position = positionResult.data;
                                                                                
                                                                                 // Generate the correct line item ID or fallback composite that ProjectChecklistPage expects
                                                                                 // Prefer DB line item id when available; otherwise use ${phase.id}-${item.id}-${subIdx}
                                                                                 // Get the workflow structure to find the subtask index reliably
                                                                                const getSubtaskIndex = async () => {
                                                                                    try {
                                                                                        const workflowResponse = await fetch('/api/workflow-data/full-structure', {
                                                                                            headers: {
                                                                                                'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                                                                                            }
                                                                                        });
                                                                                        
                                                                                        if (workflowResponse.ok) {
                                                                                            const workflowResult = await workflowResponse.json();
                                                                                            if (workflowResult.success && workflowResult.data) {
                                                                                                // Find the current phase
                                                                                                 const currentPhaseData = workflowResult.data.find(phaseData => phaseData.id === position.currentPhase);
                                                                                                if (currentPhaseData) {
                                                                                                     // Find the current section by id
                                                                                                     const currentSectionData = currentPhaseData.items.find(item => item.id === position.currentSection);
                                                                                                    if (currentSectionData) {
                                                                                                         // Find the subtask index by matching the DB id or label
                                                                                                         const subtaskIndex = currentSectionData.subtasks.findIndex(subtask => {
                                                                                                           if (typeof subtask === 'object') {
                                                                                                             return subtask.id === position.currentLineItem || subtask.label === position.currentLineItemName;
                                                                                                           }
                                                                                                           return subtask === position.currentLineItemName;
                                                                                                         });
                                                                                                        console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Found subtask index:', subtaskIndex, 'for line item:', lineItemName);
                                                                                                        return subtaskIndex >= 0 ? subtaskIndex : 0;
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    } catch (error) {
                                                                                        console.warn('🎯 PROJECT_DETAIL ALERTS CLICK: Could not determine subtask index:', error);
                                                                                    }
                                                                                    return 0; // Default fallback
                                                                                };
                                                                                
                                                                                const subtaskIndex = await getSubtaskIndex();
                                                                                 
                                                                                 // Prefer DB step id for targeting when available
                                                                                 const targetLineItemId = actionData.stepId || actionData.lineItemId || `${position.currentPhase}-${position.currentSection}-${subtaskIndex}`;
                                                                                 const targetSectionId = actionData.sectionId || position.currentSection || null;
                                                                                
                                                                                console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Generated targetLineItemId:', targetLineItemId);
                                                                                console.log('🎯 PROJECT_DETAIL ALERTS CLICK: Generated targetSectionId:', targetSectionId);
                                                                                
                                                                                const projectWithNavigation = {
                                                                                    ...alertProject,
                                                                                    highlightStep: lineItemName,
                                                                                    highlightLineItem: lineItemName,
                                                                                    targetPhase: phase,
                                                                                    targetSection: sectionName,
                                                                                    targetLineItem: lineItemName,
                                                                                    scrollToCurrentLineItem: true,
                                                                                    alertPhase: phase,
                                                                                    // Enhanced navigation target with unique identifiers
                                                                                    navigationTarget: {
                                                                                        phase: phase,
                                                                                        section: sectionName,
                                                                                        lineItem: lineItemName,
                                                                                        stepName: lineItemName,
                                                                                        alertId: alertId,
                                                                                         stepId: actionData.stepId || actionData.lineItemId || alert.stepId,
                                                                                         workflowId: actionData.workflowId || alert.workflowId,
                                                                                        highlightMode: 'line-item',
                                                                                        scrollBehavior: 'smooth',
                                                                                         targetElementId: `lineitem-${actionData.stepId || actionData.lineItemId || lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                                                                        highlightColor: '#0066CC',
                                                                                        highlightDuration: 3000
                                                                                    }
                                                                                };
                                                                                
                                                                                // Use the enhanced navigation system with precise targeting (matching workflow button)
                                                                                handleProjectSelectWithScroll(
                                                                                    projectWithNavigation, 
                                                                                    'Project Workflow', 
                                                                                    null, 
                                                                                    'Current Alerts',
                                                                                    targetLineItemId,
                                                                                    targetSectionId
                                                                                );
                                                                            } else {
                                                                                console.warn('🎯 PROJECT_DETAIL ALERTS CLICK: No position data found, using fallback navigation');
                                                                                // Fallback to enhanced static navigation
                                                                                const projectWithStepInfo = {
                                                                                    ...alertProject,
                                                                                    highlightStep: lineItemName,
                                                                                    highlightLineItem: lineItemName,
                                                                                    targetPhase: phase,
                                                                                    targetSection: sectionName,
                                                                                    targetLineItem: lineItemName,
                                                                                    scrollToCurrentLineItem: true,
                                                                                    alertPhase: phase,
                                                                                    navigationTarget: {
                                                                                        phase: phase,
                                                                                        section: sectionName,
                                                                                        lineItem: lineItemName,
                                                                                        stepName: lineItemName,
                                                                                        alertId: alertId,
                                                                                        stepId: actionData.stepId,
                                                                                        workflowId: actionData.workflowId,
                                                                                        highlightMode: 'line-item',
                                                                                        scrollBehavior: 'smooth',
                                                                                        targetElementId: `line-item-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                                                                        highlightColor: '#0066CC',
                                                                                        highlightDuration: 3000
                                                                                    }
                                                                                };
                                                                                handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
                                                                            }
                                                                        } else {
                                                                            console.error('🎯 PROJECT_DETAIL ALERTS CLICK: Failed to get project position, using fallback navigation');
                                                                            // Fallback to basic navigation
                                                                            const projectWithStepInfo = {
                                                                                ...alertProject,
                                                                                highlightStep: lineItemName,
                                                                                highlightLineItem: lineItemName,
                                                                                targetPhase: phase,
                                                                                targetSection: sectionName,
                                                                                targetLineItem: lineItemName,
                                                                                scrollToCurrentLineItem: true,
                                                                                alertPhase: phase,
                                                                                navigationTarget: {
                                                                                    phase: phase,
                                                                                    section: sectionName,
                                                                                    lineItem: lineItemName,
                                                                                    stepName: lineItemName,
                                                                                    alertId: alertId,
                                                                                    stepId: actionData.stepId,
                                                                                    workflowId: actionData.workflowId,
                                                                                    highlightMode: 'line-item',
                                                                                    scrollBehavior: 'smooth',
                                                                                    targetElementId: `line-item-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                                                                    highlightColor: '#0066CC',
                                                                                    highlightDuration: 3000
                                                                                }
                                                                            };
                                                                            handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('🎯 PROJECT_DETAIL ALERTS CLICK: Error getting project position:', error);
                                                                        // Fallback to basic navigation
                                                                        const projectWithStepInfo = {
                                                                            ...alertProject,
                                                                            highlightStep: lineItemName,
                                                                            highlightLineItem: lineItemName,
                                                                            targetPhase: phase,
                                                                            targetSection: sectionName,
                                                                            targetLineItem: lineItemName,
                                                                            scrollToCurrentLineItem: true,
                                                                            alertPhase: phase,
                                                                            navigationTarget: {
                                                                                phase: phase,
                                                                                section: sectionName,
                                                                                lineItem: lineItemName,
                                                                                stepName: lineItemName,
                                                                                alertId: alertId,
                                                                                stepId: actionData.stepId,
                                                                                workflowId: actionData.workflowId,
                                                                                highlightMode: 'line-item',
                                                                                scrollBehavior: 'smooth',
                                                                                targetElementId: `line-item-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                                                                highlightColor: '#0066CC',
                                                                                highlightDuration: 3000
                                                                            }
                                                                        };
                                                                        handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
                                                                    }
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
                        
                        {/* Assignment Modal */}
                        {showAssignModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className={`${colorMode ? 'bg-[#1e293b]' : 'bg-white'} rounded-lg p-6 max-w-md w-full mx-4`}>
                                    <h3 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                        Assign Alert to User
                                    </h3>
                                    
                                    {selectedAlertForAssign && (
                                        <div className={`mb-4 p-3 rounded border ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                            <p className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                Alert: {selectedAlertForAssign.metadata?.stepName || selectedAlertForAssign.title || 'Unknown Alert'}
                                            </p>
                                            <p className={`text-xs mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Project: {selectedAlertForAssign.metadata?.projectName || 'Unknown Project'}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <div className="mb-4">
                                        <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Select User <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={assignToUser}
                                            onChange={(e) => setAssignToUser(e.target.value)}
                                            className={`w-full p-2 border rounded text-sm ${
                                                colorMode 
                                                    ? 'bg-[#232b4d] border-gray-600 text-white' 
                                                    : 'bg-white border-gray-300 text-gray-800'
                                            }`}
                                            required
                                        >
                                            <option value="">Select a user...</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} - {user.role}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                setShowAssignModal(false);
                                                setSelectedAlertForAssign(null);
                                                setAssignToUser('');
                                            }}
                                            className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                                                colorMode 
                                                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAssignConfirm}
                                            disabled={!assignToUser || actionLoading[`${selectedAlertForAssign?._id || selectedAlertForAssign?.id}-assign`]}
                                            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                                                assignToUser && !actionLoading[`${selectedAlertForAssign?._id || selectedAlertForAssign?.id}-assign`]
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            {actionLoading[`${selectedAlertForAssign?._id || selectedAlertForAssign?.id}-assign`] ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Assigning...
                                                </span>
                                            ) : (
                                                'Assign Alert'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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
                return <ProjectProfileTab project={projectData} colorMode={colorMode} />;
        }
    };

    const navItems = ['Profile', 'Project Workflow', 'Alerts', 'Messages', 'Project Schedule', 'Project Documents', 'Work Order'];

    if (!project) {
        return <div className="text-red-600 font-bold p-8">No project selected or project data is missing.</div>;
    }

    return (
        <div className="h-full flex flex-col bg-white">
            <ScrollToTop />
            
            {/* Header with Back Button and Tabs - Modern Design */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                {/* Enhanced Back Button Row with Position Preservation */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <HeaderBackButton 
                        onClick={onBack || handleBackButton}
                        colorMode={colorMode}
                        variant="primary"
                        size="small"
                        preservePosition={true}
                        customLabel={getBackButtonText()}
                    />
                    
                    {/* Compact Project Number & Customer Info */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`font-bold text-sm px-2 py-1 rounded-md ${colorMode ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'}`}>
                            #{project.projectNumber || project.id || '12345'}
                        </span>
                        <span className="text-gray-400">•</span>
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
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                    <nav className="flex space-x-6" aria-label="Tabs">
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
                                    className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm transition-colors duration-200 rounded-t-lg ${
                                        isDisabled 
                                            ? 'border-transparent text-gray-400 opacity-70 cursor-not-allowed' 
                                            : activeView === item 
                                                ? 'border-blue-500 text-blue-600 bg-white shadow-sm' 
                                                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-100'
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
                {/* Scrollable Content with proper spacing */}
                <div className="p-6 bg-white">
                    <div className="min-h-[calc(100vh-200px)] bg-white">
                        {renderProjectView()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage; 