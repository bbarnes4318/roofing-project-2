import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronLeftIcon, LocationMarkerIcon } from '../common/Icons';
import { TrashIcon } from '../common/Icons';
import ProjectChecklistPage from './ProjectChecklistPage';
import ProjectMessagesPage from './ProjectMessagesPage';
import ProjectDocumentsPage from './ProjectDocumentsPage';
import TasksAndAlertsPage from './TasksAndAlertsPage';
import ProjectProfileTab from './ProjectProfileTab';
import ProjectTimeline from '../../dashboard/ProjectTimeline';
import ScrollToTop from '../common/ScrollToTop';
import { formatPhoneNumber } from '../../utils/helpers';
import { useWorkflowAlerts, useWorkflowAlertsByProject } from '../../hooks/useQueryApi';
import { useDeleteProject } from '../../hooks/useQueryApi';

import { usersService, projectMessagesService } from '../../services/api';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import { mapStepToWorkflowStructure } from '../../utils/workflowMapping';
import WorkflowProgressService from '../../services/workflowProgress';
import workflowService from '../../services/workflowService';
import { ACTIVITY_FEED_SUBJECTS } from '../../data/constants';
import { ResponsiveBackButton, HeaderBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';
import { useSubjects } from '../../contexts/SubjectsContext';
import toast from 'react-hot-toast';

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
    
    // Calculate trades using WorkflowProgressService
    const progressData = WorkflowProgressService.calculateProjectProgress(project);
    const currentWorkflow = project.currentWorkflowItem;
    
    // First calculate progress with skipped items included
    const progressWithSkipped = WorkflowProgressService.calculateProgressWithSkippedItems(
        currentWorkflow?.completedItems || [],
        currentWorkflow?.phase || 'LEAD',
        currentWorkflow?.section,
        currentWorkflow?.lineItem,
        currentWorkflow?.totalLineItems || WorkflowProgressService.estimateTotalLineItems(),
        currentWorkflow?.workflowStructure || null
    );
    
    // Use the adjusted completed items which includes skipped items
    const completedItems = progressWithSkipped.adjustedCompletedItems || 
                           progressData.completedLineItems || 
                           (currentWorkflow?.completedItems || []);
    
    return WorkflowProgressService.calculateTradeBreakdown(
        project,
        Array.isArray(completedItems) ? completedItems : [],
        progressData.totalLineItems || currentWorkflow?.totalLineItems || 25,
        currentWorkflow?.workflowStructure || null
    );
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



const ProjectDetailPage = ({ project, onBack, initialView = 'Project Workflow', onSendMessage, tasks, projects, onUpdate, activities, onAddActivity, colorMode, previousPage, projectSourceSection, onProjectSelect, targetLineItemId, targetSectionId, selectionNonce }) => {
    const deleteProject = useDeleteProject();

    const handleDeleteProject = async () => {
        if (!project?.id) return;
        const confirmed = window.confirm('Delete this project? This action cannot be undone.');
        if (!confirmed) return;
        try {
            await deleteProject.mutateAsync(project.id);
            toast.success('Project deleted');
            if (typeof onBack === 'function') {
                onBack();
            }
        } catch (e) {
            toast.error(e?.message || 'Failed to delete project');
        }
    };
    const { pushNavigation } = useNavigationHistory();
    const { subjects } = useSubjects();
    
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


    
    // Helper functions for Project Messages
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const handleProjectSelectWithScroll = (selectedProject, view = 'Project Profile', phase = null, sourceSection = null, targetLineItemId = null, targetSectionId = null) => {
        console.log('🔍 PROJECT_DETAIL: handleProjectSelectWithScroll called with:');
        console.log('🔍 PROJECT_DETAIL: project:', selectedProject?.name);
        console.log('🔍 PROJECT_DETAIL: view:', view);
        console.log('🔍 PROJECT_DETAIL: phase:', phase);
        console.log('🔍 PROJECT_DETAIL: sourceSection:', sourceSection);
        console.log('🔍 PROJECT_DETAIL: targetLineItemId:', targetLineItemId);
        console.log('🔍 PROJECT_DETAIL: targetSectionId:', targetSectionId);
        
        scrollToTop();
        if (onProjectSelect) {
            console.log('🔍 PROJECT_DETAIL: Calling onProjectSelect with all parameters');
            onProjectSelect(selectedProject, view, phase, sourceSection, targetLineItemId, targetSectionId);
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
        
        // Show all alerts for this project on the Project Profile page (no user-specific filtering here)
        
        // Note: Project filter is always locked to current project in project detail view
        
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
            
            // Extract line item ID from alert metadata
            let lineItemId = null;
            
            // Try multiple possible field locations for lineItemId
            if (alert.metadata?.lineItemId) {
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

            console.log(`🚀 Attempting to complete workflow item using NEW DATABASE SYSTEM: lineItemId=${lineItemId}`);

            // CRITICAL: Use NEW database-driven workflow completion
            const response = await workflowService.completeLineItem(
                    projectId,
                    lineItemId,
                    'Completed via project detail alerts by user',
                    alertId
                );
                
                console.log('✅ NEW SYSTEM: Line item completed successfully:', response);
                
                // Process the successful completion
                const result = response;
                
                // Show success feedback with toast notification
                console.log(`✅ SUCCESS: Line item '${stepName}' has been completed for project ${projectName}`);
                
                // Show success toast with clear confirmation
                toast.success(
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Task marked as completed and saved successfully</span>
                  </div>,
                  {
                    duration: 3000,
                    style: {
                      background: '#10B981',
                      color: '#ffffff',
                      fontWeight: '600',
                    },
                  }
                );
                
                // ENHANCED: Dispatch global event to notify Project Workflow tab
                const globalEvent = new CustomEvent('workflowStepCompleted', {
                  detail: {
                    projectId: projectId,
                    lineItemId: lineItemId,
                    stepName: stepName,
                    projectName: projectName,
                    source: 'Project Detail Alerts Tab',
                    timestamp: new Date().toISOString()
                  }
                });
                window.dispatchEvent(globalEvent);
                console.log('📡 GLOBAL EVENT: Dispatched workflowStepCompleted event from Project Detail Alerts');
                
                // Stay on the same page: do not switch view after completion
            
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
        }
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
            
            // Find the selected user details
            const selectedUser = users.find(user => user.id === parseInt(assignToUser));
            console.log('👤 Selected user:', selectedUser);
            
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
                        <span>Assigned to {selectedUser?.name}</span>
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
    
    console.log('🔍 project:', project?.name);
    console.log('🔍 previousPage:', previousPage);
    console.log('🔍 projectSourceSection:', projectSourceSection);
    console.log('🔍 projectSourceSection type:', typeof projectSourceSection);
    console.log('🏗️ PROJECT DETAIL: Received props:');
    console.log('🏗️ PROJECT DETAIL: previousPage:', previousPage);
    console.log('🏗️ PROJECT DETAIL: projectSourceSection:', projectSourceSection);
    const [activeView, setActiveView] = useState(initialView);
    // Local workflow deep-link target to support tab clicks
    const [workflowTarget, setWorkflowTarget] = useState({ lineItemId: targetLineItemId, sectionId: targetSectionId });
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
    const [activitySearchFilter, setActivitySearchFilter] = useState('');
    const [activityPriorityFilter, setActivityPriorityFilter] = useState('');
    const [activitySortBy, setActivitySortBy] = useState('timestamp');
    const [activitySortOrder, setActivitySortOrder] = useState('desc');
    const [showMessageDropdown, setShowMessageDropdown] = useState(false);
    const [newMessageProject, setNewMessageProject] = useState('');
    const [newMessageSubject, setNewMessageSubject] = useState('');
    const [newMessageText, setNewMessageText] = useState('');
    const [newMessageRecipients, setNewMessageRecipients] = useState([]);
    const [attachTask, setAttachTask] = useState(false);
    const [taskAssignee, setTaskAssignee] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [messagesData, setMessagesData] = useState([]);
    const [projectMessages, setProjectMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [feed, setFeed] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [users, setUsers] = useState([]);
    
    // Current Alerts state variables - matching dashboard
    const [alertProjectFilter, setAlertProjectFilter] = useState('all');
    const [alertUserGroupFilter, setAlertUserGroupFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState({});
    
    // Call useWorkflowAlerts at the top level to comply with React hooks rules
    const { workflowAlerts, isLoading: alertsLoading, error: alertsError } = useWorkflowAlerts({ status: 'active' });
    const { data: alertsByProject = [] } = useWorkflowAlertsByProject(project?.id);
    
    // Load users for dropdown
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await usersService.getTeamMembers();
                if (response.success) {
                    // Ensure users is always an array
                    const usersData = Array.isArray(response.data) ? response.data : (response.data?.users || []);
                    setUsers(usersData);
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

    // Fetch available users for Add Message form - EXACT SAME AS DASHBOARD
    useEffect(() => {
        const fetchUsers = async () => {
            setUsersLoading(true);
            try {
                const result = await usersService.getTeamMembers();
                console.log('🔍 API Response for users:', result);
                
                if (result?.success && result.data?.teamMembers) {
                    const teamMembers = result.data.teamMembers;
                    setAvailableUsers(Array.isArray(teamMembers) ? teamMembers : []);
                    console.log('✅ Loaded users for assignment:', teamMembers.length);
                } else {
                    // Don't use fallback users with invalid IDs - just log the issue
                    console.log('⚠️ API returned no team members');
                    setAvailableUsers([]);
                }
            } catch (error) {
                console.error('❌ Failed to fetch users:', error);
                // Don't use fallback users with invalid IDs - just set empty array
                setAvailableUsers([]);
            } finally {
                setUsersLoading(false);
            }
        };
        
        fetchUsers();
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
        // Filter activities (use real project messages when in Messages tab, otherwise fallback to activities prop or mock data)
        const allActivities = activeView === 'Messages' ? projectMessages : (activities || messagesData || []);
        
        let filteredActivities = allActivities.filter(activity => {
            // For project messages from API, they're already filtered by project
            if (activeView === 'Messages') {
                // CRITICAL: Project Messages view should show ALL messages for this specific project
                // No user-based filtering - everyone can see all project messages
                return true; // Project messages API already filters by projectId
            }
            
            // For other views (non-Messages), apply user-specific filtering
            // CRITICAL: For other activities, always filter by current project when in project detail view
            // Convert both to strings for comparison to handle type mismatches
            const activityProjectId = String(activity.projectId);
            const currentProjectId = String(project.id || project._id);
            
            if (activityProjectId !== currentProjectId) {
                return false;
            }
            
            // Filter by targeted user - only show messages targeted to current user or sent by current user
            // This only applies to NON-Messages views
            if (activity.targetedTo && activity.targetedTo !== currentUser.id && activity.userId !== currentUser.id) {
                return false;
            }
            
            // Subject filter (only filter by subject, not by project since we're locked to current project)
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

    // Fetch project messages when Messages tab is active
    useEffect(() => {
        const fetchProjectMessages = async () => {
            if (activeView === 'Messages' && project?.id) {
                setMessagesLoading(true);
                try {
                    console.log(`🔍 MESSAGES: Fetching project messages for project ${project.id}`);
                    const response = await projectMessagesService.getByProject(project.id, {
                        page: 1,
                        limit: 50,
                        includeReplies: true
                    });
                    const messages = Array.isArray(response?.data)
                      ? response.data
                      : Array.isArray(response?.data?.data)
                        ? response.data.data
                        : Array.isArray(response)
                          ? response
                          : [];
                    console.log(`✅ MESSAGES: Fetched ${messages.length} messages for project`);
                    setProjectMessages(messages);
                } catch (error) {
                    console.error('❌ MESSAGES: Error fetching project messages:', error);
                    setProjectMessages([]);
                } finally {
                    setMessagesLoading(false);
                }
            }
        };

        fetchProjectMessages();
    }, [activeView, project?.id]);

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

    // Custom back button handler to handle navigation back to dashboard sections
    const handleBackButton = () => {
        console.log('🔍 BACK BUTTON: handleBackButton called');
        console.log('🔍 BACK BUTTON: projectSourceSection:', projectSourceSection);
        
        // Check for returnTo URL in project's dashboard state first
        const returnTo = project?.dashboardState?.returnTo;
        console.log('🔍 BACK BUTTON: returnTo URL:', returnTo);
        
        if (returnTo) {
            console.log('🔍 BACK BUTTON: Using returnTo URL navigation');
            window.location.assign(returnTo);
            return;
        }
        
        // If we came from dashboard sections, navigate back to Dashboard and restore that section
        if (projectSourceSection === 'Project Messages' || projectSourceSection === 'My Project Messages') {
            // Navigate back to Dashboard with My Project Messages context and scroll
            onProjectSelect && onProjectSelect(null, 'Overview');
            setTimeout(() => {
                const messagesSection = document.querySelector('[data-section="project-messages"]');
                if (messagesSection) messagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
            return;
        }
        if (projectSourceSection === 'Current Alerts') {
            // Use the provided onBack handler to ensure proper scroll to Current Alerts
            if (onBack) {
                onBack();
            } else {
                // Fallback: navigate to Overview and attempt to scroll
                onProjectSelect && onProjectSelect(null, 'Overview');
                setTimeout(() => {
                    const alertsSection = document.querySelector('[data-section="current-alerts"]');
                    if (alertsSection) alertsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
            }
            return;
        }
        if (projectSourceSection === 'Project Phases') {
            // Navigate back to Dashboard and rely on preserved dashboardState for restoration
            onProjectSelect && onProjectSelect(null, 'Overview');
            setTimeout(() => {
                const projectPhasesSection = document.querySelector('[data-section="project-phases"]');
                if (projectPhasesSection) projectPhasesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
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

    // Filter and sort project messages - matching dashboard implementation
    const getFilteredAndSortedMessages = () => {
        let filteredMessages = [...(projectMessages || [])];

        // Apply subject filter
        if (activitySubjectFilter) {
            filteredMessages = filteredMessages.filter(msg => msg.subject === activitySubjectFilter);
        }

        // Apply priority filter
        if (activityPriorityFilter) {
            filteredMessages = filteredMessages.filter(msg => msg.priority === activityPriorityFilter);
        }

        // Apply search filter
        if (activitySearchFilter.trim()) {
            const searchTerm = activitySearchFilter.toLowerCase();
            filteredMessages = filteredMessages.filter(msg => 
                (msg.subject || '').toLowerCase().includes(searchTerm) ||
                (msg.content || '').toLowerCase().includes(searchTerm) ||
                (msg.user || '').toLowerCase().includes(searchTerm) ||
                (msg.targetedToName || '').toLowerCase().includes(searchTerm)
            );
        }

        // Sort messages
        filteredMessages.sort((a, b) => {
            let aValue, bValue;
            
            switch (activitySortBy) {
                case 'subject':
                    aValue = a.subject || '';
                    bValue = b.subject || '';
                    break;
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    aValue = priorityOrder[a.priority] || 0;
                    bValue = priorityOrder[b.priority] || 0;
                    break;
                case 'user':
                    aValue = a.user || '';
                    bValue = b.user || '';
                    break;
                case 'timestamp':
                default:
                    aValue = new Date(a.createdAt || a.timestamp);
                    bValue = new Date(b.createdAt || b.timestamp);
                    break;
            }

            if (typeof aValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                return activitySortOrder === 'asc' ? comparison : -comparison;
            } else {
                const comparison = aValue - bValue;
                return activitySortOrder === 'asc' ? comparison : -comparison;
            }
        });

        return filteredMessages;
    };

    // Get filtered and sorted activities for display
    const filteredMessages = getFilteredAndSortedMessages();

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
                return <ProjectChecklistPage project={projectData} onUpdate={handleChecklistUpdate} onPhaseCompletionChange={handlePhaseCompletionChange} targetLineItemId={workflowTarget?.lineItemId || targetLineItemId} targetSectionId={workflowTarget?.sectionId || targetSectionId} selectionNonce={selectionNonce} />;
            case 'Project Profile':
                return <ProjectProfileTab project={projectData} colorMode={colorMode} onProjectSelect={onProjectSelect} />;
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
                // Complete Project Messages section - MATCHING DASHBOARD LAYOUT WITH WORKING ADD MESSAGE FORM
                return (
                    <div className="w-full" data-section="project-messages">
                        <div className={`mb-6 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 ${colorMode ? 'bg-[#232b4d]/90 backdrop-blur-sm border-[#3b82f6]/40' : ''}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className={`text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1 ${colorMode ? 'from-white to-gray-300' : ''}`}>
                                        Project Messages
                                    </h2>
                                    <p className={`text-sm text-gray-600 font-medium ${colorMode ? 'text-gray-400' : ''}`}>
                                        Showing messages for: #{String(project.projectNumber || project.id).padStart(5, '0')} - {project.name || project.projectName}
                                    </p>
                                </div>

                                {/* Filter Controls - Matching Dashboard Layout */}
                                <div className="flex items-center gap-4">
                                    {/* Search Filter */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search messages..."
                                            value={activitySearchFilter || ''}
                                            onChange={(e) => setActivitySearchFilter(e.target.value)}
                                            className={`pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64 ${
                                                colorMode ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-400' : ''
                                            }`}
                                        />
                                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>

                                    {/* Subject Filter */}
                                    <select
                                        value={activitySubjectFilter || ''}
                                        onChange={(e) => setActivitySubjectFilter(e.target.value)}
                                        className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm max-w-[200px] ${
                                            colorMode ? 'bg-[#1e293b] border-gray-600 text-white' : ''
                                        }`}
                                    >
                                        <option value="">All Subjects</option>
                                        {ACTIVITY_FEED_SUBJECTS.map(subject => (
                                            <option key={subject} value={subject}>{subject}</option>
                                        ))}
                                    </select>

                                    {/* Priority Filter */}
                                    <select
                                        value={activityPriorityFilter || ''}
                                        onChange={(e) => setActivityPriorityFilter(e.target.value)}
                                        className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm max-w-[150px] ${
                                            colorMode ? 'bg-[#1e293b] border-gray-600 text-white' : ''
                                        }`}
                                    >
                                        <option value="">All Priorities</option>
                                        <option value="high">High Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="low">Low Priority</option>
                                    </select>

                                    {/* Sort Controls */}
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={activitySortBy || 'timestamp'}
                                            onChange={(e) => setActivitySortBy(e.target.value)}
                                            className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm max-w-[120px] ${
                                                colorMode ? 'bg-[#1e293b] border-gray-600 text-white' : ''
                                            }`}
                                        >
                                            <option value="timestamp">Date</option>
                                            <option value="subject">Subject</option>
                                            <option value="priority">Priority</option>
                                            <option value="user">User</option>
                                        </select>
                                        <button
                                            onClick={() => setActivitySortOrder(activitySortOrder === 'asc' ? 'desc' : 'asc')}
                                            className={`px-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                colorMode ? 'bg-[#1e293b] border-gray-600 text-white hover:bg-[#374151]' : ''
                                            }`}
                                            title={`Sort ${activitySortOrder === 'asc' ? 'descending' : 'ascending'}`}
                                        >
                                            <svg className={`w-4 h-4 transform ${activitySortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Clear Filters */}
                                    {(activitySubjectFilter || activityPriorityFilter || activitySearchFilter) && (
                                        <button
                                            onClick={() => {
                                                setActivitySubjectFilter('');
                                                setActivityPriorityFilter('');
                                                setActivitySearchFilter('');
                                            }}
                                            className={`px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ${
                                                colorMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : ''
                                            }`}
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Add Message Section - Matching Dashboard Layout */}
                            <div className="mb-6">
                                {/* Add Message Dropdown Trigger */}
                                <div className="mb-3">
                                    <button
                                        onClick={() => setShowMessageDropdown(!showMessageDropdown)}
                                        className={`w-full px-4 py-3 text-sm font-medium border-2 border-dashed transition-all duration-300 flex items-center justify-between rounded-lg ${
                                            showMessageDropdown
                                                ? colorMode 
                                                    ? 'border-blue-400 bg-blue-900/20 text-blue-300' 
                                                    : 'border-blue-400 bg-blue-50 text-blue-700'
                                                : colorMode 
                                                    ? 'border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-300 hover:bg-gray-700/50' 
                                                    : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Add Message
                                        </span>
                                        <svg className={`w-5 h-5 transition-transform ${showMessageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {/* Add Message Dropdown Form - Complete Implementation */}
                                {showMessageDropdown && (
                                    <div className={`p-6 border-2 border-dashed rounded-lg ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            if (newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0) {
                                                try {
                                                    console.log(`🔍 MESSAGES: Creating new message for project ${project.id}`);
                                                    
                                                    // Use the real API to create project message
                                                    const newMessage = await projectMessagesService.create(project.id, {
                                                        subject: newMessageSubject,
                                                        content: newMessageText,
                                                                                                        priority: attachTask ? 'HIGH' : 'MEDIUM',
                                                targetedTo: newMessageRecipients,
                                                isTask: !!attachTask,
                                                taskAssignee: attachTask ? taskAssignee : null
                                                    });
                                                    
                                                    console.log('✅ MESSAGES: Created new message:', newMessage);
                                                    
                                                    // Refresh the messages list
                                                    const response = await projectMessagesService.getByProject(project.id, {
                                                        page: 1,
                                                        limit: 50,
                                                        includeReplies: true
                                                    });
                                                    setProjectMessages(response.data || []);
                                                    
                                                    // Close dropdown and reset form
                                                    setShowMessageDropdown(false);
                                                    setNewMessageSubject('');
                                                    setNewMessageText('');
                                                    setNewMessageRecipients([]);
                                                    setAttachTask(false);
                                                    setTaskAssignee('');
                                                    
                                                    toast.success('Message created successfully');
                                                } catch (error) {
                                                    console.error('❌ MESSAGES: Error creating message:', error);
                                                    toast.error('Failed to create message');
                                                }
                                            }
                                        }} className="space-y-4">
                                            {/* Project info display */}
                                            <div className={`p-3 rounded-lg text-sm ${
                                                colorMode ? 'bg-blue-900/20 text-blue-300 border border-blue-700/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                            }`}>
                                                <span className="font-medium">Creating message for: </span>
                                                #{String(project.projectNumber || project.id).padStart(5, '0')} - {project.name || project.projectName}
                                            </div>
                                            
                                            {/* First Row: Subject and To fields */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={`block text-sm font-medium mb-2 ${
                                                        colorMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                        Subject <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={newMessageSubject}
                                                        onChange={(e) => setNewMessageSubject(e.target.value)}
                                                        required
                                                        className={`w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                                                
                                                <div>
                                                    <label className={`block text-sm font-medium mb-2 ${
                                                        colorMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                        To <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={newMessageRecipients || ''}
                                                        onChange={(e) => {
                                                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                                            setNewMessageRecipients(selectedOptions);
                                                        }}
                                                        multiple
                                                        required
                                                        className={`w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                            colorMode 
                                                                ? 'bg-[#232b4d] border-gray-600 text-white' 
                                                                : 'bg-white border-gray-300 text-gray-800'
                                                        }`}
                                                        style={{ minHeight: '40px' }}
                                                    >
                                                        <option value="all" style={{ fontWeight: 'bold' }}>All Users</option>
                                                        {availableUsers.map(user => (
                                                            <option key={user.id} value={user.id}>
                                                                {user.firstName} {user.lastName} ({user.role || 'User'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className={`text-xs mt-1 ${
                                                        colorMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>
                                                        Hold Ctrl/Cmd to select multiple recipients
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Second Row: Send as Task */}
                                            <div>
                                                <label className={`flex items-center text-sm font-medium mb-2 ${
                                                    colorMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={attachTask || false}
                                                        onChange={(e) => setAttachTask(e.target.checked)}
                                                        className="mr-2"
                                                    />
                                                    Send as a Task
                                                </label>
                                                {attachTask && (
                                                    <select
                                                        value={taskAssignee || ''}
                                                        onChange={(e) => setTaskAssignee(e.target.value)}
                                                        disabled={usersLoading}
                                                        className={`w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                            colorMode 
                                                                ? 'bg-[#232b4d] border-gray-600 text-white' 
                                                                : 'bg-white border-gray-300 text-gray-800'
                                                        } ${usersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <option value="">
                                                            {usersLoading ? 'Loading users...' : 'Assign Task To...'}
                                                        </option>
                                                        {!usersLoading && availableUsers.length > 0 ? (
                                                            availableUsers.map(user => (
                                                                <option key={user.id} value={user.id}>
                                                                    {user.firstName} {user.lastName} - {user.role || 'User'}
                                                                </option>
                                                            ))
                                                        ) : !usersLoading ? (
                                                            // Fallback options if API fails
                                                            <>
                                                                <option value="sarah-owner">Sarah Owner - Owner</option>
                                                                <option value="mike-rodriguez">Mike Rodriguez - Project Manager</option>
                                                                <option value="john-smith">John Smith - Field Director</option>
                                                                <option value="jane-doe">Jane Doe - Administration</option>
                                                                <option value="bob-wilson">Bob Wilson - Roof Supervisor</option>
                                                                <option value="alice-johnson">Alice Johnson - Customer Service</option>
                                                            </>
                                                        ) : null}
                                                    </select>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <label className={`block text-sm font-medium mb-2 ${
                                                    colorMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                    Message <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    value={newMessageText}
                                                    onChange={(e) => setNewMessageText(e.target.value)}
                                                    placeholder="Enter your message here..."
                                                    required
                                                    rows={4}
                                                    className={`w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                        colorMode 
                                                            ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                                                            : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                                                    }`}
                                                />
                                            </div>
                                            
                                            <div className="flex justify-end gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowMessageDropdown(false);
                                                        setNewMessageSubject('');
                                                        setNewMessageText('');
                                                        setNewMessageRecipients([]);
                                                        setAttachTask(false);
                                                        setTaskAssignee('');
                                                    }}
                                                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                                                        colorMode 
                                                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={!newMessageSubject || !newMessageText.trim() || newMessageRecipients.length === 0}
                                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                        newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0
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

                            {/* Messages List - Matching Dashboard Layout */}
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {messagesLoading ? (
                                    <div className="text-center py-12">
                                        <div className="text-gray-400 text-5xl mb-4">📬</div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Loading project messages...
                                        </h3>
                                    </div>
                                ) : filteredMessages.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-gray-400 text-5xl mb-4">📬</div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            {activitySearchFilter || activitySubjectFilter || activityPriorityFilter 
                                                ? 'No messages match your filters'
                                                : 'No messages found for this project'
                                            }
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            {activitySearchFilter || activitySubjectFilter || activityPriorityFilter 
                                                ? 'Try adjusting your filter settings.'
                                                : 'Project messages will appear here when available.'
                                            }
                                        </p>
                                        {(activitySearchFilter || activitySubjectFilter || activityPriorityFilter) && (
                                            <button
                                                onClick={() => {
                                                    setActivitySubjectFilter('');
                                                    setActivityPriorityFilter('');
                                                    setActivitySearchFilter('');
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filteredMessages.map(activity => {
                                        // Enhanced activity with To and Task info for display
                                        const enhancedActivity = {
                                            ...activity,
                                            displayTo: activity.targetedToName || 'All Users',
                                            displayTask: activity.isTask ? `Task assigned to: ${activity.taskAssigneeName || 'Unassigned'}` : null
                                        };
                                        return (
                                            <div
                                                key={activity.id}
                                                className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:border-gray-300 ${
                                                    colorMode ? 'border-gray-600 hover:border-gray-500' : ''
                                                }`}
                                            >
                                                <ProjectMessagesCard 
                                                    activity={enhancedActivity} 
                                                    onProjectSelect={handleProjectSelectWithScroll}
                                                    projects={projects}
                                                    colorMode={colorMode}
                                                    onQuickReply={handleQuickReply}
                                                    isExpanded={false}
                                                    onToggleExpansion={() => {}}
                                                />
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Messages Summary - Matching Dashboard Layout */}
                            {filteredMessages.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                        <span>
                                            Showing {filteredMessages.length} of {projectMessages?.length || 0} messages
                                        </span>
                                        <div className="flex items-center gap-4">
                                            <span>
                                                {filteredMessages.filter(m => m.priority === 'high').length} High Priority
                                            </span>
                                            <span>
                                                {filteredMessages.filter(m => m.priority === 'medium').length} Medium Priority
                                            </span>
                                            <span>
                                                {filteredMessages.filter(m => m.priority === 'low').length} Low Priority
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'Alerts':
                // Complete Current Alerts section - FILTERED FOR CURRENT PROJECT
                return (
                    <div className="w-full" data-section="current-alerts">
                        <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h1>
                                        <p className={`text-[9px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Showing alerts for project: #{String(project.projectNumber || project.id).padStart(5, '0')} - {project.name || project.projectName}
                                        </p>
                                        <p className={`text-[9px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            User: {currentUser.name} ({currentUser.role})
                                        </p>
                                        {expandedAlerts.size > 0 && (
                                            <p className={`text-[9px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {expandedAlerts.size} of {getPaginatedAlerts().length} alert{getPaginatedAlerts().length !== 1 ? 's' : ''} expanded
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Filter Controls - Only User Group filter, project is fixed */}
                                <div className="flex items-center gap-2 mb-2 mt-3">
                                    <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by user group:</span>
                                    
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
                                                            <div className={`w-5 h-5 ${getPhaseCircleColors(phase).bg} rounded-full flex items-center justify-center text-white font-bold text-[9px] shadow-sm`}>
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
                                                            <div className="flex items-center gap-1 flex-shrink-0" style={{marginLeft: '36px'}}>
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
                                                <div className="flex items-center text-[9px]" style={{ marginTop: '-2px', marginLeft: '-6px' }}>
                                                    {/* Section - align S with project number (50px width) */}
                                                    <div className="flex items-center gap-1" style={{ width: '210px' }}>
                                                        <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ width: '50px' }}>Section:</span>
                                                        <span className={`font-semibold truncate ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                                            {sectionName || 'Unknown Section'}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Line Item - align L with PM (align under PM section) */}
                                                    <div className="flex items-center gap-1 flex-1">
                                                        <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Line Item:</span>
                                                        <span 
                                                            className={`font-semibold cursor-pointer hover:underline max-w-[120px] truncate ${
                                                                colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                                            }`}
                                                            title={lineItemName || 'Unknown Line Item'}
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
                                                                                         lineItemId: actionData.stepId || actionData.lineItemId || alert.stepId,
                                                                                         workflowId: actionData.workflowId || alert.workflowId,
                                                                                        highlightMode: 'line-item',
                                                                                        scrollBehavior: 'smooth',
                                                                                         targetElementId: `lineitem-${actionData.stepId || actionData.lineItemId || lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                                                                        highlightColor: '#0066CC',
                                                                                        highlightDuration: 3000,
                                                                                        targetSectionId: targetSectionId,
                                                                                        expandPhase: true,
                                                                                        expandSection: true,
                                                                                        autoOpen: true
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
                                                                                        lineItemId: actionData.stepId || actionData.lineItemId,
                                                                                        workflowId: actionData.workflowId,
                                                                                        highlightMode: 'line-item',
                                                                                        scrollBehavior: 'smooth',
                                                                                        targetElementId: `line-item-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                                                                        highlightColor: '#0066CC',
                                                                                        highlightDuration: 3000,
                                                                                        targetSectionId: targetSectionId,
                                                                                        expandPhase: true,
                                                                                        expandSection: true,
                                                                                        autoOpen: true
                                                                                    }
                                                                                };
                                                                                handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts', targetLineItemId, targetSectionId);
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
                                                                                    lineItemId: actionData.stepId || actionData.lineItemId,
                                                                                    workflowId: actionData.workflowId,
                                                                                    highlightMode: 'line-item',
                                                                                    scrollBehavior: 'smooth',
                                                                                    targetElementId: `line-item-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                                                                    highlightColor: '#0066CC',
                                                                                    highlightDuration: 3000,
                                                                                    targetSectionId: targetSectionId,
                                                                                    expandPhase: true,
                                                                                    expandSection: true,
                                                                                    autoOpen: true
                                                                                }
                                                                            };
                                                                            handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts', targetLineItemId, targetSectionId);
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
                                                                                lineItemId: actionData.stepId || actionData.lineItemId,
                                                                                workflowId: actionData.workflowId,
                                                                                highlightMode: 'line-item',
                                                                                scrollBehavior: 'smooth',
                                                                                targetElementId: `line-item-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                                                                highlightColor: '#0066CC',
                                                                                highlightDuration: 3000
                                                                            }
                                                                        };
                                                                        handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts', targetLineItemId, targetSectionId);
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
                                            {Array.isArray(users) && users.map(user => (
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
                return <ProjectProfileTab project={projectData} colorMode={colorMode} onProjectSelect={onProjectSelect} />;
        }
    };

    const navItems = ['Project Profile', 'Project Workflow', 'Alerts', 'Messages', 'Project Schedule', 'Project Documents', 'Work Order'];

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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDeleteProject}
                            disabled={deleteProject.isPending}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border transition-colors ${deleteProject.isPending ? 'opacity-60 cursor-not-allowed' : colorMode ? 'border-red-400 text-red-300 hover:bg-red-900/20' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                            title="Delete project"
                        >
                            <TrashIcon className="w-4 h-4" />
                            <span>Delete</span>
                        </button>
                    </div>
                    
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
                                    onClick={async () => {
                                        if (!isDisabled) {
                                            console.log('🔍 PROJECT_DETAIL: Tab clicked:', item);
                                            console.log('🔍 PROJECT_DETAIL: Current activeView:', activeView);
                                            // If navigating to Project Workflow tab, compute deep-link target like Current Alerts
                                            if (item === 'Project Workflow') {
                                                try {
                                                    // Priority 1: Use navigationTarget/highlightTarget already on project
                                                    const navTarget = project?.navigationTarget || project?.highlightTarget || {};
                                                    let nextLineItemId = navTarget.lineItemId || workflowTarget.lineItemId || targetLineItemId || null;
                                                    let nextSectionId = navTarget.targetSectionId || navTarget.sectionId || workflowTarget.sectionId || targetSectionId || null;
                                                    // Priority 2: If coming from Current Alerts context, derive from alert id
                                                    if (!nextLineItemId && project?.dashboardState?.currentAlertsState?.scrollToAlert) {
                                                        const alertId = project.dashboardState.currentAlertsState.scrollToAlert;
                                                        // Attempt to find alert from loaded data if available
                                                        try {
                                                            // workflowAlerts may be available via hooks in this component
                                                            const allAlerts = (typeof workflowAlerts !== 'undefined' && Array.isArray(workflowAlerts)) ? workflowAlerts : [];
                                                            const matched = allAlerts.find(a => (a._id || a.id) === alertId);
                                                            const actionData = matched?.actionData || matched?.metadata || {};
                                                            if (matched) {
                                                                nextLineItemId = actionData.stepId || actionData.lineItemId || matched.stepId || null;
                                                                nextSectionId = actionData.sectionId || matched.sectionId || null;
                                                            }
                                                        } catch (_) {}
                                                    }
                                                    // Priority 3: Fallback to current project position API
                                                    if (!nextLineItemId) {
                                                        const posResp = await fetch(`/api/workflow-data/project-position/${project.id}`);
                                                        if (posResp.ok) {
                                                            const posJson = await posResp.json();
                                                            if (posJson.success && posJson.data) {
                                                                const position = posJson.data;
                                                                // Determine subtask index from full structure
                                                                let subtaskIndex = 0;
                                                                try {
                                                                    const wfResp = await fetch('/api/workflow-data/full-structure', {
                                                                        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}` }
                                                                    });
                                                                    if (wfResp.ok) {
                                                                        const wfJson = await wfResp.json();
                                                                        if (wfJson.success && wfJson.data) {
                                                                            const currentPhaseData = wfJson.data.find(ph => ph.id === position.currentPhase);
                                                                            const currentSectionData = currentPhaseData?.items?.find(it => it.id === position.currentSection);
                                                                            if (currentSectionData) {
                                                                                const idx = currentSectionData.subtasks.findIndex(st => typeof st === 'object' ? (st.id === position.currentLineItem || st.label === position.currentLineItemName) : st === position.currentLineItemName);
                                                                                subtaskIndex = idx >= 0 ? idx : 0;
                                                                            }
                                                                        }
                                                                    }
                                                                } catch (_) {}
                                                                nextLineItemId = position.currentLineItem || `${position.currentPhase}-${position.currentSection}-${subtaskIndex}`;
                                                                nextSectionId = position.currentSection;
                                                            }
                                                        }
                                                    }
                                                    // Save target for ProjectChecklistPage to consume on tab render
                                                    setWorkflowTarget({ lineItemId: nextLineItemId || null, sectionId: nextSectionId || null });
                                                } catch (e) {
                                                    // Non-blocking – proceed to tab render
                                                }
                                            }
                                            setActiveView(item);
                                            console.log('🔍 PROJECT_DETAIL: Setting activeView to:', item);
                                            
                                            // Update URL with replaceState to avoid history pollution
                                            const currentUrl = new URL(window.location.href);
                                            currentUrl.searchParams.set('tab', item.toLowerCase().replace(/\s+/g, '-'));
                                            window.history.replaceState(window.history.state, '', currentUrl.toString());
                                            
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
                        {(() => {
                            // Pass local workflow target into ProjectChecklistPage via render
                            if (activeView === 'Project Workflow') {
                                console.log('🔍 PROJECT_DETAIL: Passing workflow target to checklist:', workflowTarget);
                            }
                            return renderProjectView();
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage; 