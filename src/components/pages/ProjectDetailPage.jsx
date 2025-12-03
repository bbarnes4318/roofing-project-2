import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronLeftIcon, LocationMarkerIcon } from '../common/Icons';
import { TrashIcon } from '../common/Icons';
import ProjectChecklistPage from './ProjectChecklistPage';
import ProjectMessagesPage from './ProjectMessagesPage';
import ProjectDocumentsPage from './ProjectDocumentsPage';
import TasksAndAlertsPage from './TasksAndAlertsPage';
import ProjectProfileTab from './ProjectProfileTab';
import ProjectTimeline from '../../dashboard/ProjectTimeline';
import ProjectEmailHistory from '../Email/ProjectEmailHistory';
import ScrollToTop from '../common/ScrollToTop';
import { formatPhoneNumber } from '../../utils/helpers';
import { projectsService } from '../../services/api';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';
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
                <div className="p-3 bg-white">
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