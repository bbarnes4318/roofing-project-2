import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, ChevronLeftIcon, XCircleIcon } from '../common/Icons';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import CurrentAlertsSection from '../dashboard/CurrentAlertsSection';
import DraggablePopup from '../ui/DraggablePopup';
import Modal from '../common/Modal';
import AddProjectModal from '../common/AddProjectModal';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';

import ProjectCubes from '../dashboard/ProjectCubes';
// import { initialTasks, teamMembers, mockAlerts } from '../../data/mockData';
import { formatPhoneNumber } from '../../utils/helpers';
import { useProjects, useProjectStats, useTasks, useRecentActivities, useWorkflowAlerts, useCreateProject, useCustomers, useCalendarEvents, queryKeys } from '../../hooks/useQueryApi';
import { DashboardStatsSkeleton, ActivityFeedSkeleton, ErrorState } from '../ui/SkeletonLoaders';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import api, { authService, messagesService, customersService, usersService, projectMessagesService, calendarService } from '../../services/api';
import toast from 'react-hot-toast';
import WorkflowProgressService from '../../services/workflowProgress';
import { ALERT_SUBJECTS } from '../../data/constants';
import { useSubjects } from '../../contexts/SubjectsContext';
import { mapStepToWorkflowStructure } from '../../utils/workflowMapping';
import { useWorkflowStates } from '../../hooks/useWorkflowState';

// Enhanced activity generation with better variety
const generateActivitiesFromProjects = (projects) => {
  if (!projects || projects.length === 0) return [];
  
  const activities = [];
  const baseDate = new Date();
  
  // Message types with subjects for project communications
  const messageTypes = [
    { type: 'project_update', subject: 'Project Status Update', templates: ['Project status updated', 'Progress milestone reached', 'Phase transition completed'] },
    { type: 'material_delivery', subject: 'Material Delivery', templates: ['Materials delivered on site', 'Delivery scheduled', 'Materials inspection completed'] },
    { type: 'site_inspection', subject: 'Site Inspection', templates: ['Site inspection completed', 'Inspection scheduled', 'Quality check performed'] },
    { type: 'customer_communication', subject: 'Customer Communication', templates: ['Customer meeting held', 'Client approval received', 'Follow-up call completed'] },
    { type: 'documentation', subject: 'Project Documentation', templates: ['Documents updated', 'Photos uploaded', 'Report generated'] },
    { type: 'crew_assignment', subject: 'Team Assignment', templates: ['Crew assigned', 'Team schedule updated', 'Labor coordination completed'] },
    { type: 'quality_check', subject: 'Quality Review', templates: ['Quality inspection passed', 'Work standards verified', 'Final review completed'] },
    { type: 'permit_update', subject: 'Permit Status', templates: ['Permits approved', 'Regulatory compliance verified', 'License requirements met'] },
    { type: 'schedule_change', subject: 'Schedule Update', templates: ['Timeline adjusted', 'Meeting rescheduled', 'Milestone date changed'] },
    { type: 'budget_discussion', subject: 'Budget Review', templates: ['Budget approved', 'Cost estimate updated', 'Payment processed'] }
  ];

  projects.forEach((project, index) => {
    // Generate 2-4 activities per project
    const activityCount = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < activityCount; i++) {
      const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      const template = messageType.templates[Math.floor(Math.random() * messageType.templates.length)];
      
      // Create realistic timestamps (spread over last 7 days)
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const timestamp = new Date(baseDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
      
      activities.push({
        id: `message_${project.id}_${i}`,
        projectId: project.id,
        projectName: project.name,
        projectNumber: project.projectNumber,
        type: messageType.type,
        subject: messageType.subject,
        description: template,
        user: 'Unknown User',
        timestamp: timestamp.toISOString(),
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        metadata: {
          projectPhase: WorkflowProgressService.getProjectPhase(project) || 'LEAD',
          projectValue: project.budget || project.estimateValue,
          assignedTo: project.assignedTo || 'Sarah Owner'
        }
      });
    }
  });

  return activities;
};

// Use centralized phase configuration from WorkflowProgressService
const PROJECT_PHASES = WorkflowProgressService.getAllPhases();

// Calculate progress based on completed workflow line items
const getProjectProgress = (project) => {
  // Use WorkflowProgressService to calculate real progress based on completed line items
  const progressData = WorkflowProgressService.calculateProjectProgress(project);
  return progressData.overall || 0;
};

// Phase should come directly from the API - no mapping needed

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

// Helper function to convert project data to consistent format
const convertProjectToTableFormat = (project) => {
  // Single source of truth for phase: use tracker-driven helper with fallbacks
  const canonicalPhase = WorkflowProgressService.getProjectPhase(project);
  return {
    id: project.id,
    projectName: project.projectName || project.name,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    progress: getProjectProgress(project),
    budget: project.estimateValue || project.budget || 0,
    expenses: 0,
    responsibleTeam: 'Team Alpha',
    priority: project.priority || 'Low',
    clientName: project.client?.name || project.customer?.primaryName || 'Unknown',
    clientEmail: project.client?.email || project.customer?.primaryEmail || '',
    projectManager: project.projectManager || null,
    // Canonical uppercase phase key
    phase: canonicalPhase || 'LEAD'
  };
};

const DashboardPage = ({ tasks, activities, onProjectSelect, onAddActivity, colorMode, dashboardState }) => {
  console.log('🔍 DASHBOARD: Component rendering...');
  const queryClient = useQueryClient();
  
  // Use database data instead of props
  const { data: projectsData, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useProjects({ limit: 100 });
  // Extract the projects array from the response object
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data || []);
  
  // DEBUG: Log projects data
  console.log('🔍 DASHBOARD DEBUG: projectsData:', projectsData);
  console.log('🔍 DASHBOARD DEBUG: projectsData.data:', projectsData?.data);
  console.log('🔍 DASHBOARD DEBUG: projectsData.success:', projectsData?.success);
  console.log('🔍 DASHBOARD DEBUG: projects array:', projects);
  console.log('🔍 DASHBOARD DEBUG: projects length:', projects?.length);
  // Enriched projects with canonical phase from workflow position when missing
  const [projectsEnriched, setProjectsEnriched] = useState(null);
  const uiProjects = projectsEnriched || projects;

  useEffect(() => {
    let cancelled = false;
    const enrich = async () => {
      if (!Array.isArray(projects) || projects.length === 0) {
        if (!cancelled) setProjectsEnriched(null);
        return;
      }
      try {
        // Only enrich projects that do not have a reliable phase
        const headers = {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
        };
        const enriched = await Promise.all(projects.map(async (p) => {
          const existingPhase = WorkflowProgressService.getProjectPhase(p);
          if (existingPhase && existingPhase !== 'LEAD') return p;
          try {
            const resp = await fetch(`/api/workflow-data/project-position/${p.id}`, { headers });
            if (!resp.ok) return p;
            const result = await resp.json();
            if (result?.success && result.data) {
              const pos = result.data;
              return {
                ...p,
                currentWorkflowItem: {
                  ...(p.currentWorkflowItem || {}),
                  phase: pos.phaseType || p.currentWorkflowItem?.phase || p.phase || 'LEAD',
                  phaseDisplay: pos.phaseName || p.currentWorkflowItem?.phaseDisplay || null,
                  section: pos.sectionDisplayName || p.currentWorkflowItem?.section || null,
                  lineItem: pos.currentLineItemName || p.currentWorkflowItem?.lineItem || null,
                  lineItemId: pos.currentLineItem || p.currentWorkflowItem?.lineItemId || null,
                  sectionId: pos.currentSectionId || p.currentWorkflowItem?.sectionId || null,
                  phaseId: pos.currentPhase || p.currentWorkflowItem?.phaseId || null,
                  isComplete: false,
                  totalLineItems: p.currentWorkflowItem?.totalLineItems || WorkflowProgressService.estimateTotalLineItems()
                }
              };
            }
          } catch (_) {}
          return p;
        }));
        if (!cancelled) setProjectsEnriched(enriched);
      } catch (_) {
        if (!cancelled) setProjectsEnriched(null);
      }
    };
    enrich();
    return () => { cancelled = true; };
  }, [projects]);
  
  // Get subjects from context
  const { subjects } = useSubjects();
  
  // Fetch messages from conversations
  const [messagesData, setMessagesData] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  
  // Debug project loading
  console.log('🔍 DASHBOARD: Projects loading state:', projectsLoading);
  console.log('🔍 DASHBOARD: Projects error:', projectsError);
  console.log('🔍 DASHBOARD: Projects data:', projectsData);
  console.log('🔍 DASHBOARD: Projects array length:', projects.length);
  
  // URGENT DEBUG: If error, show what's happening
  if (projectsError) {
    console.error('🚨 PROJECTS ERROR DETAILS:', {
      error: projectsError,
      projectsData: projectsData,
      loading: projectsLoading
    });
  }

  // Track if we've already processed a dashboard state for refetch to prevent loops
  const processedRefetchStateRef = useRef(null);
  
  // Additional debug for navigation back from project workflow
  useEffect(() => {
    if (dashboardState && dashboardState !== processedRefetchStateRef.current) {
      console.log('🔍 DASHBOARD: Dashboard state received, triggering data refresh if needed');
      processedRefetchStateRef.current = dashboardState;
      
      // If we have dashboard state but projects failed to load, try refetching
      if (projectsError && typeof refetchProjects === 'function') {
        console.log('🔄 DASHBOARD: Attempting to refetch projects due to navigation state restoration');
        setTimeout(() => {
          refetchProjects();
        }, 500); // Small delay to allow component to settle
      }
    }
    // Remove refetchProjects from dependencies to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardState, projectsError]);
  
  // Posting state
  const [message, setMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [sendAsAlert, setSendAsAlert] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [alertPriority, setAlertPriority] = useState('low');
  // Tabs for communications section
  const [activeCommTab, setActiveCommTab] = useState('messages'); // 'messages' | 'tasks' | 'reminders'
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  // Users/Project filters per tab
  const [messagesUserFilter, setMessagesUserFilter] = useState('');
  const [messagesProjectFilter, setMessagesProjectFilter] = useState('');
  const [tasksUserFilter, setTasksUserFilter] = useState('');
  const [tasksProjectFilter, setTasksProjectFilter] = useState('');
  const [remindersUserFilter, setRemindersUserFilter] = useState('');
  const [remindersProjectFilter, setRemindersProjectFilter] = useState('');
  // To/From toggles per tab (default: both on)
  const [messagesToFilter, setMessagesToFilter] = useState(true);
  const [messagesFromFilter, setMessagesFromFilter] = useState(true);
  const [tasksToFilter, setTasksToFilter] = useState(true);
  const [tasksFromFilter, setTasksFromFilter] = useState(true);
  const [remindersToFilter, setRemindersToFilter] = useState(true);
  const [remindersFromFilter, setRemindersFromFilter] = useState(true);
  // Quick Task (without project) fields
  const [quickTaskSubject, setQuickTaskSubject] = useState('');
  const [quickTaskDescription, setQuickTaskDescription] = useState('');
  const [quickTaskDue, setQuickTaskDue] = useState('');
  const [quickTaskAssignAll, setQuickTaskAssignAll] = useState(false);
  const [quickTaskAssigneeId, setQuickTaskAssigneeId] = useState('');
  
  // Completed tasks state
  const [completedTasks, setCompletedTasks] = useState(new Set());
  
  // Task comments state - stores comments for each task
  const [taskComments, setTaskComments] = useState(() => {
    // Load comments from localStorage on initial mount as cache
    const savedComments = localStorage.getItem('taskComments');
    return savedComments ? JSON.parse(savedComments) : {};
  });
  const [newCommentText, setNewCommentText] = useState({});
  
  // Reminder comments state - stores comments for each reminder
  const [reminderComments, setReminderComments] = useState({});
  const [showCommentInput, setShowCommentInput] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  
  // Fetch comments from database when task is expanded
  const fetchTaskComments = async (taskId) => {
    if (loadingComments[taskId]) return; // Already loading
    
    setLoadingComments(prev => ({ ...prev, [taskId]: true }));
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Update state with fetched comments
          setTaskComments(prev => ({
            ...prev,
            [taskId]: data.data.map(comment => ({
              id: comment.id,
              text: comment.content || comment.text,
              user: comment.user ? `${comment.user.firstName} ${comment.user.lastName}` : 'Unknown User',
              userId: comment.userId,
              timestamp: comment.createdAt || comment.timestamp
            }))
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      // Fall back to localStorage cache if available
    } finally {
      setLoadingComments(prev => ({ ...prev, [taskId]: false }));
    }
  };
  
  // Handle task completion toggle
  const handleTaskToggle = (taskId) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };
  
  // Handle adding a comment to a task
  const handleAddComment = async (taskId) => {
    const commentText = newCommentText[taskId];
    if (!commentText?.trim()) return;
    
    const newComment = {
      id: `comment_${Date.now()}`,
      text: commentText.trim(),
      user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown User',
      userId: currentUser?.id,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Save to database via API
      const response = await fetch('/api/tasks/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
        },
        body: JSON.stringify({
          taskId: taskId,
          comment: commentText.trim(),
          userId: currentUser?.id
        })
      });
      
      if (response.ok) {
        // Update local state immediately for responsive UI
        setTaskComments(prev => {
          const updated = {
            ...prev,
            [taskId]: [...(prev[taskId] || []), newComment]
          };
          // Still save to localStorage as a fallback/cache
          localStorage.setItem('taskComments', JSON.stringify(updated));
          return updated;
        });
        
        toast.success('Comment added');
      } else {
        toast.error('Failed to save comment');
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Failed to save comment');
      
      // Fallback to localStorage only if API fails
      setTaskComments(prev => {
        const updated = {
          ...prev,
          [taskId]: [...(prev[taskId] || []), newComment]
        };
        localStorage.setItem('taskComments', JSON.stringify(updated));
        return updated;
      });
    }
    
    setNewCommentText(prev => ({
      ...prev,
      [taskId]: ''
    }));
  };
  // Fetch reminder comments from database
  const fetchReminderComments = async (reminderId) => {
    if (loadingComments[`reminder_${reminderId}`]) return; // Already loading
    
    setLoadingComments(prev => ({ ...prev, [`reminder_${reminderId}`]: true }));
    
    try {
      const response = await api.get(`/calendar-events/${reminderId}/comments`);
      
      if (response.data.success && response.data.data) {
        setReminderComments(prev => ({
          ...prev,
          [reminderId]: response.data.data.map(comment => ({
            id: comment.id,
            content: comment.content,
            userName: comment.user ? `${comment.user.firstName} ${comment.user.lastName}` : 'Unknown User',
            userId: comment.userId,
            createdAt: comment.createdAt
          }))
        }));
      }
    } catch (error) {
      console.error('Error fetching reminder comments:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [`reminder_${reminderId}`]: false }));
    }
  };
  
  // Add comment to reminder
  const handleAddReminderComment = async (reminderId) => {
    const commentText = commentInputs[reminderId]?.trim();
    if (!commentText) return;
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const newComment = {
      content: commentText,
      userName: currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
      userId: currentUser.id,
      createdAt: new Date().toISOString()
    };
    
    try {
      const response = await api.post(`/calendar-events/${reminderId}/comments`, {
        content: commentText
      });
      
      if (response.data.success) {
        // Update local state immediately for responsive UI
        setReminderComments(prev => ({
          ...prev,
          [reminderId]: [...(prev[reminderId] || []), newComment]
        }));
        
        // Clear input and hide form
        setCommentInputs(prev => ({ ...prev, [reminderId]: '' }));
        setShowCommentInput(prev => ({ ...prev, [reminderId]: false }));
        
        toast.success('Comment added to reminder');
      } else {
        toast.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding reminder comment:', error);
      toast.error('Failed to add comment');
    }
  };
  
  // Reminder fields
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDescription, setReminderDescription] = useState('');
  const [reminderWhen, setReminderWhen] = useState('');
  const [reminderAllUsers, setReminderAllUsers] = useState(false);
  const [reminderUserIds, setReminderUserIds] = useState([]);
  
  // Message dropdown state (replaces old modal)
  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const [newMessageProject, setNewMessageProject] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageCustomSubject, setNewMessageCustomSubject] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageRecipients, setNewMessageRecipients] = useState([]);

  // Activity feed filter state (separate from posting state)
  const [activityProjectFilter, setActivityProjectFilter] = useState('');
  const [activitySubjectFilter, setActivitySubjectFilter] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('');

  // Alert filter state
  const [alertProjectFilter, setAlertProjectFilter] = useState('all');
  const [alertUserGroupFilter, setAlertUserGroupFilter] = useState('all');
  
  // Feed and filtering state - use real messages data
  const [feed, setFeed] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [alertCurrentPage, setAlertCurrentPage] = useState(1);
  const activitiesPerPage = 8;
  const alertsPerPage = 12;
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [alertSortConfig, setAlertSortConfig] = useState({ key: null, direction: 'asc' });
  const [activitySortConfig, setActivitySortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  
  // UI state
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [selectedPhase, setSelectedPhase] = useState(null); // No phase selected by default
  
  // Project Messages expansion control
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [allMessagesExpanded, setAllMessagesExpanded] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [expandedProgress, setExpandedProgress] = useState(new Set());
  const [expandedTrades, setExpandedTrades] = useState(new Set());
  const [expandedAdditionalTrades, setExpandedAdditionalTrades] = useState(new Set());
  const [expandedContacts, setExpandedContacts] = useState(new Set());
  const [expandedPMs, setExpandedPMs] = useState(new Set());
  const [contactDropdownPos, setContactDropdownPos] = useState({});
  const [pmDropdownPos, setPmDropdownPos] = useState({});
  
  // Refs for tracking popup trigger buttons
  const contactButtonRefs = useRef({});
  const pmButtonRefs = useRef({});
  const progressButtonRefs = useRef({});
  
  // Refs for progress dropdowns
  const progressDropdownRefs = useRef({});
  
  // Refs for alert popups
  const alertContactButtonRefs = useRef({});
  const alertPmButtonRefs = useRef({});
  const [isDarkMode, setIsDarkMode] = useState(colorMode);
  const [alertExpanded, setAlertExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Alert action state
  const [alertNotes, setAlertNotes] = useState({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAlertForAssign, setSelectedAlertForAssign] = useState(null);
  const [assignToUser, setAssignToUser] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [availableUsers, setAvailableUsers] = useState([]);
  
  // Add Project state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [projectError, setProjectError] = useState('');
  const [usersLoading, setUsersLoading] = useState(true);
  const [workflowPhases, setWorkflowPhases] = useState([]);
  const [newProjects, setNewProjects] = useState([{
    projectNumber: '',
    projectName: '',
    customerName: '',
    customerEmail: '',
    jobType: [],
    projectManager: '',
    fieldDirector: '',
    salesRep: '',
    qualityInspector: '',
    adminAssistant: '',
    status: 'Pending',
    budget: '',
    startDate: '',
    endDate: '',
    customer: '',
    address: '',
    priority: 'Low',
    description: '',
    startingPhase: 'LEAD',
    contacts: [
      { name: '', phone: '', email: '', isPrimary: false },
      { name: '', phone: '', email: '', isPrimary: false },
      { name: '', phone: '', email: '', isPrimary: false }
    ]
  }]);
  const { data: customersData } = useCustomers();
  // Load team members for filters and recipients - handled in the more comprehensive useEffect below
  const { data: calendarEventsData = [] } = useCalendarEvents();
  
  // Create project mutation
  const createProjectMutation = useCreateProject();
  
  // Fetch real alerts from API
  const { data: workflowAlerts, isLoading: alertsLoading, error: alertsError, refetch: refetchWorkflowAlerts } = useWorkflowAlerts({ status: 'ACTIVE' });
  
  // Debug alerts loading
  console.log('🔍 DASHBOARD: Alerts loading state:', alertsLoading);
  console.log('🔍 DASHBOARD: Alerts error:', alertsError);
  console.log('🔍 DASHBOARD: Alerts data:', workflowAlerts);
  console.log('🔍 DASHBOARD: Alerts array length:', workflowAlerts?.length || 0);
  
  // Force refresh alerts (for debugging)
  const forceRefreshAlerts = () => {
    console.log('🔄 Force refreshing alerts...');
    refetchWorkflowAlerts();
  };
  
  // Activity feed filter state (separate from posting state)
  const [newMessage, setNewMessage] = useState('');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Get current user on component mount
  useEffect(() => {
    const user = authService.getStoredUser();
    console.log('🔍 INITIAL USER FROM STORAGE:', user);
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Also load server-authenticated user to ensure we have the real ID (e.g., David Chen)
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        console.log('🔍 FETCHING CURRENT USER FROM SERVER...');
        const resp = await authService.getCurrentUser();
        console.log('🔍 SERVER RESPONSE:', resp);
        const serverUser = resp?.data?.user || resp?.data || resp?.user;
        console.log('🔍 EXTRACTED USER:', serverUser);
        if (serverUser && serverUser.id) {
          setCurrentUser(serverUser);
          console.log('✅ CURRENT USER SET TO:', serverUser.firstName, serverUser.lastName, 'ID:', serverUser.id);
        } else {
          console.log('❌ NO VALID USER FROM SERVER');
        }
      } catch (e) {
        console.error('❌ ERROR LOADING CURRENT USER:', e);
        // ignore; fall back to stored user
      }
    };
    loadCurrentUser();
  }, []);

  // Fetch available users for assignment dropdown
  useEffect(() => {
    const fetchUsers = async () => {
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

  // Fetch workflow phases for project creation
  useEffect(() => {
    const fetchWorkflowPhases = async () => {
      try {
        console.log('🔍 DASHBOARD: Fetching workflow phases for Add Project dropdown...');
        const api = (await import('../../services/api')).default;
        const response = await api.get('/workflow-data/phases');
        const result = response.data;
        if (result?.success && result.data) {
          const phases = result.data.map(phase => ({
            id: phase.id,
            name: phase.name,
            displayName: phase.displayName || phase.name
          }));
          setWorkflowPhases(phases);
          console.log('✅ DASHBOARD: Loaded workflow phases from database:', phases);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('❌ DASHBOARD: Failed to fetch workflow phases:', error);
        const fallbackPhases = [
          { id: 'LEAD', name: 'LEAD', displayName: 'Lead' },
          { id: 'PROSPECT', name: 'PROSPECT', displayName: 'Prospect' },
          { id: 'APPROVED', name: 'APPROVED', displayName: 'Approved' },
          { id: 'EXECUTION', name: 'EXECUTION', displayName: 'Execution' },
          { id: 'COMPLETION', name: 'COMPLETION', displayName: 'Completion' }
        ];
        setWorkflowPhases(fallbackPhases);
        console.log('⚠️ DASHBOARD: Using fallback workflow phases due to API error');
      }
    };

    fetchWorkflowPhases();
  }, []);

  // Removed automatic popup closing - popups now require manual close only

  // Track if messages have been fetched to prevent re-fetching
  const messagesFetchedRef = useRef(false);

  // Fetch messages and convert to activity format, with fallback to activities prop
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setMessagesLoading(true);
        const allMessages = [];
        
        // DEBUG: Log projects being processed
        console.log('🔍 DASHBOARD DEBUG: fetchMessages called with projects:', projects);
        console.log('🔍 DASHBOARD DEBUG: projects length in fetchMessages:', projects?.length);
        
        // Fetch project messages for each project
        for (const project of projects) {
          try {
            const projectMessagesResponse = await projectMessagesService.getByProject(project.id);
            
            if (projectMessagesResponse.success && projectMessagesResponse.data && projectMessagesResponse.data.length > 0) {
              projectMessagesResponse.data.forEach(message => {
                allMessages.push({
                  id: message.id,
                  author: message.author ? `${message.author.firstName} ${message.author.lastName}` : message.authorName || 'Unknown User',
                  avatar: message.author ? message.author.firstName.charAt(0) : (message.authorName ? message.authorName.charAt(0) : 'U'),
                  content: message.content,
                  timestamp: message.createdAt,
                  project: project.projectName,
                  projectId: project.id,
                  projectNumber: project.projectNumber,
                  subject: message.subject || 'Project Update',
                  // Use readBy as recipients for filtering
                  recipients: message.readBy || [],
                  priority: message.priority?.toLowerCase() || 'medium',
                  metadata: {
                    projectPhase: project.phase || 'LEAD',
                    projectValue: project.budget || project.estimatedCost,
                    assignedTo: project.projectManager || 'Unknown',
                    customerName: project.customer?.primaryName || 'Unknown Customer',
                    messageType: message.messageType,
                    isWorkflowMessage: message.isWorkflowMessage,
                    isSystemGenerated: message.isSystemGenerated
                  }
                });
              });
            }
          } catch (projectError) {
            console.warn(`Failed to fetch messages for project ${project.projectNumber}:`, projectError);
          }
        }
        
        // Also try to fetch conversations using authenticated service (for backward compatibility)
        const response = await messagesService.getConversations();
        
        if (response.success && response.data && response.data.length > 0) {
          
          // Convert messages to activity format
          for (const conversation of response.data) {
            // Extract project info from conversation title
            const projectNumberMatch = conversation.title.match(/#(\d+)/);
            if (!projectNumberMatch) continue;
            
            const projectNumber = parseInt(projectNumberMatch[1]);
            const project = projects.find(p => p.projectNumber === projectNumber);
            
            if (!project) continue;
            
            // Get messages for this conversation
            if (conversation.messages && conversation.messages.length > 0) {
              conversation.messages.forEach(message => {
                // Extract subject from message text
                const subjectMatch = message.text.match(/\*\*(.+?)\*\*/);
                const subject = subjectMatch ? subjectMatch[1] : 'Project Update';
                const content = message.text.replace(/\*\*(.+?)\*\*\n\n/, '');
                
                // Use canonical tracker-driven phase
                const canonicalPhase = WorkflowProgressService.getProjectPhase(project) || 'LEAD';
                const messageRecipients = [];
                // Prefer explicit recipientId
                if (message.recipientId) {
                  messageRecipients.push(message.recipientId);
                }
                // If participants includes current user or 'all', include those
                if (Array.isArray(conversation.participants)) {
                  conversation.participants.forEach(p => {
                    if (!messageRecipients.includes(p)) messageRecipients.push(p);
                  });
                }
                // Treat announcements as 'all'
                if (message.type === 'ANNOUNCEMENT' || conversation.type === 'ANNOUNCEMENT') {
                  messageRecipients.push('all');
                }
                allMessages.push({
                  id: message.id,
                  author: message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Unknown User',
                  avatar: message.sender ? message.sender.firstName.charAt(0) : 'U',
                  content: content,
                  timestamp: message.createdAt,
                  project: project.projectName,
                  projectId: project.id,
                  projectNumber: project.projectNumber,
                  subject: subject,
                  // Attach recipient identifiers for strict filtering in My Project Messages
                  recipientId: message.recipientId || null,
                  recipients: messageRecipients,
                  priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                  metadata: {
                    projectPhase: canonicalPhase,
                    projectValue: project.budget || project.estimatedCost,
                    assignedTo: project.projectManager || 'Unknown',
                    customerName: project.customer?.primaryName || 'Unknown Customer'
                  }
                });
              });
            }
          }
        }
        
        // Process all collected messages (from both project messages and conversations)
        if (allMessages.length > 0) {
          // Sort by timestamp (newest first)
          allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          console.log('🔍 DASHBOARD: Fetched messages from API:', allMessages.length);
          console.log('🔍 DASHBOARD DEBUG: Setting messagesData and feed with:', allMessages);
          setMessagesData(allMessages);
         // activityFeedItems automatically updates when messagesData changes
        } else {
          // Fallback to activities prop if no messages found
          console.log('🔍 DASHBOARD: No messages from API, using activities fallback:', activities?.length || 0);
          
          // Generate mock messages based on activities prop or projects
          const fallbackMessages = activities && activities.length > 0 
            ? activities.map(activity => ({
                ...activity,
                // Ensure activity has required fields for ProjectMessagesCard
                projectNumber: activity.projectNumber || Math.floor(Math.random() * 90000) + 10000,
                subject: activity.subject || 'Project Update'
              }))
            : generateActivitiesFromProjects(projects); // Generate mock data if no activities
            
          setMessagesData(fallbackMessages);
          // activityFeedItems automatically updates when messagesData changes

        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        // Fallback to activities prop on error
        console.log('🔍 DASHBOARD: Error fetching messages, using activities fallback:', activities?.length || 0);
        
        const fallbackMessages = activities && activities.length > 0 
          ? activities.map(activity => ({
              ...activity,
              projectNumber: activity.projectNumber || Math.floor(Math.random() * 90000) + 10000,
              subject: activity.subject || 'Project Update'
            }))
          : generateActivitiesFromProjects(projects);
          
        setMessagesData(fallbackMessages);
        // activityFeedItems automatically updates when messagesData changes
      } finally {
        setMessagesLoading(false);
        messagesFetchedRef.current = true;
      }
    };
    
    // Only fetch messages once when projects are loaded and not fetched before
    if (projects.length > 0 && !projectsLoading && !messagesFetchedRef.current) {
      fetchMessages();
    }
    // Remove projects from dependencies to prevent re-fetching on every projects update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsLoading]);

  // Track processed dashboard states to prevent infinite loops
  const processedDashboardStateRef = useRef(null);
  
  // Restore dashboard state when navigating back from project detail
  useEffect(() => {
    if (dashboardState && dashboardState !== processedDashboardStateRef.current) {
      console.log('🔍 DASHBOARD: Restoring dashboard state:', dashboardState);
      processedDashboardStateRef.current = dashboardState;
      
      // Restore expanded phases
      if (dashboardState.expandedPhases) {
        setExpandedPhases(new Set(dashboardState.expandedPhases));
        console.log('🔍 DASHBOARD: Restored expanded phases:', dashboardState.expandedPhases);
      }
      
      // Restore selected phase
      if (dashboardState.selectedPhase) {
        setSelectedPhase(dashboardState.selectedPhase);
        console.log('🔍 DASHBOARD: Restored selected phase:', dashboardState.selectedPhase);
      }
      
      // Scroll to project phases section and highlight specific project after state is restored
      setTimeout(() => {
        const projectPhasesSection = document.querySelector('[data-section="project-phases"]');
        if (projectPhasesSection) {
          projectPhasesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          console.log('🔍 DASHBOARD: Scrolled to project phases section');
          
          // If there's a specific project to highlight, scroll to it within the phase
          if (dashboardState.scrollToProject) {
            setTimeout(() => {
              // Look for the project row within the expanded phase
              const projectRow = document.querySelector(`[data-project-id="${dashboardState.scrollToProject.id}"]`);
              if (projectRow) {
                // Add temporary highlight class
                projectRow.classList.add('bg-blue-100', 'border-2', 'border-blue-300');
                projectRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log('🔍 DASHBOARD: Highlighted and scrolled to specific project:', dashboardState.scrollToProject.name);
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                  projectRow.classList.remove('bg-blue-100', 'border-2', 'border-blue-300');
                }, 3000);
              }
            }, 200);
          }
        }
      }, 100);
    }
  }, [dashboardState]);

  // URL parameter restoration for returnTo context
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    const phase = urlParams.get('phase');
    const highlight = urlParams.get('highlight');
    const search = urlParams.get('search');
    const phaseFilter = urlParams.get('phaseFilter');
    const projectFilter = urlParams.get('projectFilter');
    const priorityFilter = urlParams.get('priorityFilter');
    const expandedPhases = urlParams.get('expandedPhases');

    console.log('🔍 DASHBOARD: URL params restoration:', { section, phase, highlight, search, expandedPhases });

    if (section === 'projectsByPhase') {
      // Restore Projects by Phase section state
      if (phaseFilter) {
        setSelectedPhase(phaseFilter);
      }
      if (expandedPhases) {
        const phaseIds = expandedPhases.split(',');
        setExpandedPhases(prev => {
          const newSet = new Set(prev);
          phaseIds.forEach(id => newSet.add(id));
          return newSet;
        });
      } else if (phase) {
        setExpandedPhases(prev => new Set([...prev, phase]));
      }

      // Wait for render, then scroll and highlight
      setTimeout(() => {
        const projectPhasesSection = document.querySelector('[data-section="project-phases"]');
        if (projectPhasesSection) {
          projectPhasesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          if (highlight) {
            setTimeout(() => {
              const projectElement = document.getElementById(`project-${highlight}`);
              if (projectElement) {
                projectElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                projectElement.classList.add('bg-yellow-100', 'border-2', 'border-yellow-400', 'ring-2', 'ring-yellow-300');
                setTimeout(() => {
                  projectElement.classList.remove('bg-yellow-100', 'border-2', 'border-yellow-400', 'ring-2', 'ring-yellow-300');
                }, 3000);
              }
            }, 300);
          }
        }
      }, 200);
    }

    if (section === 'myProjectMessages') {
      // Wait for render, then scroll to My Project Messages section
      setTimeout(() => {
        const messagesSection = document.querySelector('[data-section="project-messages"]');
        if (messagesSection) {
          messagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }

    // Clean up URL after restoration to avoid cluttering browser history
    if (section || phase || highlight) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = '';
      window.history.replaceState(window.history.state, '', cleanUrl.toString());
    }
  }, []);

  // Remove DDD entries on component mount
  useEffect(() => {
    removeLatestDDD();
  }, []);

  // Handle click outside for progress dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any progress dropdown
      let shouldClose = [];
      
      for (const projectId of expandedProgress) {
        const dropdown = progressDropdownRefs.current[projectId];
        const button = progressButtonRefs.current[projectId];
        
        if (dropdown && !dropdown.contains(event.target) &&
            button && !button.contains(event.target)) {
          shouldClose.push(projectId);
        }
      }
      
      if (shouldClose.length > 0) {
        const newExpanded = new Set(expandedProgress);
        shouldClose.forEach(id => {
          newExpanded.delete(id);
          // Also close trades
          const newTrades = new Set(expandedTrades);
          newTrades.delete(id);
          setExpandedTrades(newTrades);
          // Also close additional trades
          const newAdditionalTrades = new Set(expandedAdditionalTrades);
          newAdditionalTrades.delete(id);
          setExpandedAdditionalTrades(newAdditionalTrades);
        });
        setExpandedProgress(newExpanded);
      }
    };

    if (expandedProgress.size > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expandedProgress, expandedTrades, expandedAdditionalTrades]);

  // Subject options for dropdown
  const subjectOptions = subjects;

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  };

  // Enhanced project selection handler with scroll to top
      const handleProjectSelectWithScroll = (project, view = 'Project Profile', phase = null, sourceSection = null, targetLineItemId = null, targetSectionId = null) => {
      console.log('🔍 DASHBOARD: handleProjectSelectWithScroll called with:');
      console.log('🔍 DASHBOARD: project:', project);
      console.log('🔍 DASHBOARD: project.name:', project?.name);
      console.log('🔍 DASHBOARD: project.id:', project?.id);
      console.log('🔍 DASHBOARD: project.projectNumber:', project?.projectNumber);
      console.log('🔍 DASHBOARD: view:', view);
      console.log('🔍 DASHBOARD: phase:', phase);
      console.log('🔍 DASHBOARD: sourceSection:', sourceSection);
      console.log('🔍 DASHBOARD: targetLineItemId:', targetLineItemId);
      console.log('🔍 DASHBOARD: targetSectionId:', targetSectionId);
      console.log('🔍 DASHBOARD: sourceSection type:', typeof sourceSection);
      console.log('🔍 DASHBOARD: sourceSection === "Current Alerts":', sourceSection === 'Current Alerts');
      console.log('🔍 DASHBOARD: onProjectSelect available:', !!onProjectSelect);
      
      scrollToTop(); // Scroll to top immediately
      if (onProjectSelect) {
        console.log('🔍 DASHBOARD: Calling onProjectSelect with all parameters');
        onProjectSelect(project, view, phase, sourceSection, targetLineItemId, targetSectionId);
      } else {
        console.error('🔍 DASHBOARD: onProjectSelect is not available!');
      }
    };

  // Quick reply handler for Dashboard Project Messages
  const handleQuickReply = (replyData) => {
    console.log('Dashboard quick reply data:', replyData);
    
    // Find the project for the reply
    const project = projects.find(p => p.id === replyData.projectId);
    
    if (project && onAddActivity) {
      // Add the quick reply as a new activity
      onAddActivity(project, replyData.message, replyData.subject);
    }
    
    // Optional: Show success feedback
    // You could add a toast notification here
  };

  const _recentTasks = tasks.slice(0, 3);

  // Pagination logic with subject filtering, sorting, and recipient filtering
  // STRICT: Only show messages addressed to the logged-in user OR messages to 'ALL' - NO EXCEPTIONS FOR ANY ROLE
  const filteredActivities = feed.filter(activity => {
    const projectMatch = !activityProjectFilter || activity.projectId === parseInt(activityProjectFilter);
    const subjectMatch = !activitySubjectFilter || activity.subject === activitySubjectFilter;
    
    // CRITICAL: ONLY show messages where the logged-in user is a recipient OR the message is to 'ALL'
    // This applies to ALL users regardless of role (including Managers and Admins)
    let recipientMatch = false;
    const loggedInUserId = currentUser?.id || currentUser?._id || null;
    
    // DEBUG: Log what we're checking
    if (activity.subject && activity.recipients) {
      console.log('🔍 MESSAGE FILTERING:', {
        subject: activity.subject,
        recipients: activity.recipients,
        loggedInUserId: loggedInUserId,
        currentUser: currentUser
      });
    }
    
    if (loggedInUserId && Array.isArray(activity.recipients) && activity.recipients.length > 0) {
      // Show message if:
      // 1. Recipients includes 'all' (message to everyone)
      // 2. Recipients includes the current user's ID
      recipientMatch = activity.recipients.includes('all') ||
                       activity.recipients.includes('ALL') ||
                       activity.recipients.some(r => String(r) === String(loggedInUserId));
      
      if (activity.subject) {
        console.log('✅ Recipient match result:', recipientMatch);
      }
    } else if (!Array.isArray(activity.recipients) || activity.recipients.length === 0) {
      // If no recipients specified, hide the message (don't show to anyone)
      recipientMatch = false;
    }
    
    return projectMatch && subjectMatch && recipientMatch;
  });

  // Sort activities if sorting is configured
  const sortedActivities = activitySortConfig.key 
    ? [...filteredActivities].sort((a, b) => {
        let aValue = a[activitySortConfig.key];
        let bValue = b[activitySortConfig.key];

        // Handle timestamp sorting as dates
        if (activitySortConfig.key === 'timestamp') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return activitySortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return activitySortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredActivities;
  
  const totalPages = Math.ceil(sortedActivities.length / activitiesPerPage);
  const startIndex = (currentPage - 1) * activitiesPerPage;
  const endIndex = startIndex + activitiesPerPage;
  const currentActivities = sortedActivities.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePost = () => {
    if (!message.trim()) return;
    
    const selectedProject = selectedProjectId.trim() ? projects.find(p => p.id === parseInt(selectedProjectId)) : null;
    const projectName = selectedProject ? selectedProject.name : 'General';
    const subject = selectedSubject.trim() || 'General Update';
    
    if (sendAsAlert) {
      // Create alert
      if (selectedUsers.length === 0) {
        alert('Please select at least one user for the alert.');
        return;
      }
      
      const newAlert = {
        id: Date.now(),
        title: subject,
        message: message,
        project: selectedProject,
        projectId: selectedProject ? selectedProject.id : null,
        projectName: projectName,
        priority: alertPriority,
        assignedUsers: selectedUsers,
        createdBy: 'Sarah Owner',
        createdAt: new Date().toISOString(),
        status: 'active',
        type: 'manual'
      };
      
      console.log('Creating alert:', newAlert);
      // TODO: Send alert to backend API
      // For now, we'll add it as a special activity with alert flag
      
      const alertActivity = {
        id: Date.now(),
        author: 'Sarah Owner',
        avatar: 'S',
        content: `🚨 ALERT: ${message}`,
        timestamp: new Date().toISOString(),
        project: projectName,
        projectId: selectedProject ? selectedProject.id : null,
        subject: subject,
        isAlert: true,
        priority: alertPriority,
        assignedUsers: selectedUsers
      };
      
      setFeed(prev => [alertActivity, ...prev]);
    } else {
      // Create regular activity post
      const newActivity = {
        id: Date.now(),
        author: 'Sarah Owner',
        avatar: 'S',
        content: message,
        timestamp: new Date().toISOString(),
        project: projectName,
        projectId: selectedProject ? selectedProject.id : null,
        subject: subject
      };
      
      setFeed(prev => [newActivity, ...prev]);
    }
    
    // Reset form
    setMessage('');
    setSelectedProjectId('');
    setSelectedSubject('');
    setSendAsAlert(false);
    setSelectedUsers([]);
    setAlertPriority('low');
  };

  // Helper functions for user selection
  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => {
      if (!prev || !Array.isArray(prev)) return [userId];
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const selectAllUsers = () => {
            setSelectedUsers([]);
  };

  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  // Remove the latest activity that contains "DDDD"
  const removeLatestDDD = () => {
    setFeed(prev => {
      if (!prev || !Array.isArray(prev)) return [];
      const filtered = prev.filter(activity => activity && activity.content && !activity.content.includes('DDDD'));
      return filtered;
    });
  };

  // Project form handlers
  const handleInputChange = (e, index) => {
    const { name, value } = e.target;
    setNewProjects(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [name]: value };
      return updated;
    });
  };

  const resetProjectForm = () => {
    setNewProjects([{
      projectNumber: '',
      projectName: '',
      customerName: '',
      customerEmail: '',
      jobType: [],
      projectManager: '',
      fieldDirector: '',
      salesRep: '',
      qualityInspector: '',
      adminAssistant: '',
      status: 'Pending',
      budget: '',
      startDate: '',
      endDate: '',
      customer: '',
      address: '',
      priority: 'Low',
      description: '',
      startingPhase: 'LEAD',
      contacts: [
        { name: '', phone: '', email: '', isPrimary: false },
        { name: '', phone: '', email: '', isPrimary: false },
        { name: '', phone: '', email: '', isPrimary: false }
      ]
    }]);
    setProjectError('');
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    // This function is no longer needed since we're using AddProjectModal
    // The form submission is handled by the AddProjectModal component
  };

  // Convert projects to table format for consistency
  const tableProjects = useMemo(() => {
    if (!Array.isArray(uiProjects)) return [];
    return uiProjects.map(project => convertProjectToTableFormat(project));
  }, [uiProjects]);

  // Normalize calendar events for activity feed (tasks/reminders)
  const calendarEvents = useMemo(() => {
    const raw = calendarEventsData?.events || calendarEventsData || [];
    return Array.isArray(raw) ? raw : [];
  }, [calendarEventsData]);

  // Build Activity Feed items from messages, calendar events, and workflow alerts
  const activityFeedItems = useMemo(() => {
    const items = [];
    // Messages
    (messagesData || []).forEach(m => {
      items.push({
        id: `msg_${m.id}`,
        type: 'message',
        authorId: m.recipientId || null,
        author: m.author,
        projectId: m.projectId || null,
        projectName: m.projectName || null,
        subject: m.subject || 'Message',
        content: m.description || m.content || '',
        timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
      });
    });
    // Calendar Events: tasks (DEADLINE) and reminders (REMINDER)
    calendarEvents.forEach(ev => {
      const evType = (ev.eventType || '').toString().toUpperCase();
      const mappedType = evType === 'REMINDER' ? 'reminder' : evType === 'DEADLINE' ? 'task' : null;
      if (!mappedType) return;
      const attendeesIds = Array.isArray(ev.attendees) ? ev.attendees.map(a => a.userId).filter(Boolean) : [];
      items.push({
        id: `cal_${ev.id}`,
        type: mappedType,
        authorId: ev.organizerId || null,
        author: ev.organizer?.firstName ? `${ev.organizer.firstName} ${ev.organizer.lastName}` : 'Unknown',
        projectId: ev.projectId || null,
        projectName: ev.project?.projectName || null,
        subject: ev.title || (mappedType === 'task' ? 'Task' : 'Reminder'),
        content: ev.description || '',
        timestamp: ev.startTime || ev.createdAt || new Date().toISOString(),
        attendees: attendeesIds,
      });
    });
    // Workflow Alerts: Add as tasks
    if (workflowAlerts?.length > 0) {
      workflowAlerts.forEach(alert => {
        const actionData = alert.actionData || alert.metadata || {};
        const project = projects?.find(p => p.id === (actionData.projectId || alert.projectId));
        
        items.push({
          id: `alert_${alert._id || alert.id}`,
          type: 'task',
          authorId: null,
          author: 'System',
          projectId: actionData.projectId || alert.projectId,
          projectName: project?.name || alert.projectName,
          subject: actionData.stepName || alert.title || 'Workflow Alert',
          content: alert.description || actionData.description || 'Workflow item needs attention',
          timestamp: alert.createdAt || new Date().toISOString(),
          priority: actionData.priority || alert.priority || 'medium',
          phase: actionData.phase || alert.phase,
          lineItem: actionData.stepName || alert.title,
          originalAlert: alert
        });
      });
    }
    // Sort newest first
    return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [messagesData, calendarEvents, workflowAlerts, projects]);

  // Group projects by phase
  const projectsByPhase = useMemo(() => {
    const grouped = {};
    PROJECT_PHASES.forEach(phase => {
      grouped[phase.id] = [];
    });
    
    // Ensure tableProjects is an array
    const safeTableProjects = Array.isArray(tableProjects) ? tableProjects : [];
    
    safeTableProjects.forEach(project => {
      // Ensure canonical uppercase phase key for grouping using tracker-driven helper
      const phase = String(WorkflowProgressService.getProjectPhase(project) || 'LEAD').toUpperCase();
      if (grouped[phase]) {
        grouped[phase].push(project);
      } else {
        // Default to LEAD phase if phase not found
        if (!grouped['LEAD']) {
          grouped['LEAD'] = [];
        }
        grouped['LEAD'].push(project);
      }
    });
    
    return grouped;
  }, [tableProjects]);

  const getSortedPhaseProjects = (phaseId) => {
    const phaseProjects = projectsByPhase[phaseId] || [];
    if (!sortConfig.key) return phaseProjects;

    return [...phaseProjects].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const _handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleAlertSort = (key) => {
    setAlertSortConfig({
      key,
      direction: alertSortConfig.key === key && alertSortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleActivitySort = (key) => {
    setActivitySortConfig({
      key,
      direction: activitySortConfig.key === key && activitySortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleProjectSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Project Messages expansion control handlers
  const handleExpandAllMessages = () => {
    // Get the currently visible items based on the active tab
    let currentItems = [];
    if (activeCommTab === 'messages') {
      currentItems = activityFeedItems.filter(i => i.type === 'message');
    } else if (activeCommTab === 'tasks') {
      currentItems = activityFeedItems.filter(i => i.type === 'task');
    } else if (activeCommTab === 'reminders') {
      currentItems = activityFeedItems.filter(i => i.type === 'reminder');
    }
    
    const allIds = new Set(currentItems.map(item => item.id));
    setExpandedMessages(allIds);
    setAllMessagesExpanded(true);
  };

  const handleCollapseAllMessages = () => {
    setExpandedMessages(new Set());
    setAllMessagesExpanded(false);
  };

  // Alert expansion control handlers
  const handleExpandAllAlerts = () => {
    const allAlertIds = new Set(getPaginatedAlerts().map(alert => alert._id || alert.id));
    setExpandedAlerts(allAlertIds);
  };

  const handleCollapseAllAlerts = () => {
    setExpandedAlerts(new Set());
  };

  const handleToggleMessage = (messageId) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
      
      // Check if this is a reminder and fetch comments if needed
      const currentItem = activityFeedItems.find(item => item.id === messageId);
      if (currentItem && currentItem.type === 'reminder') {
        // Fetch reminder comments when expanded
        if (!reminderComments[messageId] || reminderComments[messageId].length === 0) {
          fetchReminderComments(messageId);
        }
      } else {
        // Fetch task comments from database when task is expanded
        // Only fetch if we don't already have comments for this task
        if (!taskComments[messageId] || taskComments[messageId].length === 0) {
          fetchTaskComments(messageId);
        }
      }
    }
    setExpandedMessages(newExpanded);
    
    // Update the global state based on current expansion
    const totalMessages = currentActivities.length;
    const expandedCount = newExpanded.size;
    setAllMessagesExpanded(expandedCount === totalMessages);
  };

  // Alert pagination functions
  const goToAlertPage = (page) => {
    setAlertCurrentPage(page);
  };

  const nextAlertPage = () => {
    if (alertCurrentPage < alertTotalPages) {
      setAlertCurrentPage(alertCurrentPage + 1);
    }
  };

  const prevAlertPage = () => {
    if (alertCurrentPage > 1) {
      setAlertCurrentPage(alertCurrentPage - 1);
    }
  };

  const toggleProgress = (projectId) => {
    const newExpanded = new Set(expandedProgress);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
      // Also close trades when closing progress
      const newTrades = new Set(expandedTrades);
      newTrades.delete(projectId);
      setExpandedTrades(newTrades);
      // Also close additional trades
      const newAdditionalTrades = new Set(expandedAdditionalTrades);
      newAdditionalTrades.delete(projectId);
      setExpandedAdditionalTrades(newAdditionalTrades);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProgress(newExpanded);
  };

  const toggleContact = (contactId, buttonElement = null) => {
    const newExpanded = new Set(expandedContacts);
    if (newExpanded.has(contactId)) {
      newExpanded.delete(contactId);
    } else {
      newExpanded.add(contactId);
    }
    setExpandedContacts(newExpanded);
  };

  const togglePM = (pmId, buttonElement = null) => {
    const newExpanded = new Set(expandedPMs);
    if (newExpanded.has(pmId)) {
      newExpanded.delete(pmId);
    } else {
      newExpanded.add(pmId);
    }
    setExpandedPMs(newExpanded);
  };

  const toggleTrades = (projectId) => {
    const newExpanded = new Set(expandedTrades);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
      // Also close additional trades when closing main trades
      const newAdditionalTrades = new Set(expandedAdditionalTrades);
      newAdditionalTrades.delete(projectId);
      setExpandedAdditionalTrades(newAdditionalTrades);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedTrades(newExpanded);
  };

  const toggleAdditionalTrades = (projectId) => {
    const newExpanded = new Set(expandedAdditionalTrades);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedAdditionalTrades(newExpanded);
  };

  const togglePhase = (phaseId) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  // Status badge styling for project table
  const getProjectStatusBadge = (status) => {
    const getStatusClasses = (status) => {
      switch (status.toLowerCase()) {
        case 'in progress':
          return 'bg-green-100 text-green-800 border border-green-300';
        case 'not started':
          return 'bg-gray-100 text-gray-800 border border-gray-300';
        case 'completed':
          return 'bg-blue-100 text-brand-800 border border-blue-300';
        default:
          return 'bg-gray-100 text-gray-800 border border-gray-300';
      }
    };

    return (
      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusClasses(status)}`}>
        {status}
      </span>
    );
  };

  // Priority badge styling
  const getPriorityBadge = (priority) => {
    const getPriorityClasses = (priority) => {
      switch (priority.toLowerCase()) {
        case 'high':
          return 'bg-red-100 text-red-800 border border-red-300';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
        case 'low':
          return 'bg-green-100 text-green-800 border border-green-300';
        default:
          return 'bg-gray-100 text-gray-800 border border-gray-300';
      }
    };

    return (
      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap w-16 text-center ${getPriorityClasses(priority)}`}>
        {priority}
      </span>
    );
  };

  // Function to get project name from projectId
  const getProjectName = (projectId) => {
    if (!projectId) return 'General';
    const project = projects.find(p => p.id === projectId || p._id === projectId);
    return project ? (project.projectName || project.name || project.address) : 'Unknown Project';
  };

  // Function to handle project selection from alerts
  const handleProjectClick = (projectId, alert) => {
    if (onProjectSelect) {
      let project = null;
      
      // Try to find project by ID with multiple matching strategies
      if (projectId) {
        project = projects.find(p => 
          p.id === projectId || 
          p._id === projectId || 
          p.id === parseInt(projectId) || 
          p._id === parseInt(projectId) ||
          p.id === projectId.toString() || 
          p._id === projectId.toString()
        );
      }
      
      // If no project found by ID, try to find by name
      if (!project && alert?.metadata?.projectName) {
        project = projects.find(p => 
          p.name === alert.metadata.projectName ||
          p.projectName === alert.metadata.projectName
        );
      }
      
      // If still no project found, create a temporary project object
      if (!project && alert?.metadata?.projectName) {
        project = {
          id: projectId || Date.now(),
          _id: projectId,
          name: alert.metadata.projectName,
          projectName: alert.metadata.projectName,
          status: 'active',
          phase: alert.metadata?.phase || 'Unknown Phase'
        };
      }
      
      if (project) {
        console.log('🚀 Navigating to Projects page for project:', project.name);
        console.log('🚀 Source section: Current Alerts');
        // Add scrollToProjectId for Projects page scrolling
        const projectWithScrollId = {
          ...project,
          scrollToProjectId: String(project.id)
        };
        // Navigate to Projects page with scrolling
        handleProjectSelectWithScroll(projectWithScrollId, 'Projects', null, 'Current Alerts');
      } else {
        console.warn('❌ No project found for alert:', alert);
      }
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
      // Prefer explicit metadata.responsibleRole (backend transformation),
      // then actionData.responsibleRole, then defaultResponsible
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
      
      if (alertSortConfig.key === 'projectName') {
        if (alertSortConfig.direction === 'asc') {
          return projectNameA.localeCompare(projectNameB);
        } else {
          return projectNameB.localeCompare(projectNameA);
        }
      }
      if (alertSortConfig.key === 'subject') {
        const subjectA = a.stepName || a.metadata?.lineItem || a.subject || '';
        const subjectB = b.stepName || b.metadata?.lineItem || b.subject || '';
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

  // Get all alerts (no pagination for natural flow)
  const getPaginatedAlerts = () => {
    const sortedAlerts = getSortedAlerts();
    // Return all alerts instead of paginating
    return sortedAlerts;
  };

  const alertTotalPages = Math.ceil(getSortedAlerts().length / alertsPerPage);

  const toggleAlertExpansion = (alertId) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  // Alert action handlers
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
            source: 'Dashboard Alert Completion',
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(globalEvent);
        console.log('📡 GLOBAL EVENT: Dispatched workflowStepCompleted event for Project Workflow tab');
        
        // The comprehensive endpoint handles all workflow progression, alert dismissal, and alert generation
        // No need for manual phase/section completion or socket events - they're handled server-side
        console.log('✅ Comprehensive workflow completion handled by server');
        
        // Refresh dashboard data to reflect changes immediately
        try {
          // Invalidate and refetch workflow alerts to remove completed alert
          queryClient.invalidateQueries(['workflowAlerts']);
          
          // CRITICAL: Invalidate projects data to update progress bars and currentWorkflowItem
          queryClient.invalidateQueries(['projects']);
          
          if (typeof refetchWorkflowAlerts === 'function') {
            refetchWorkflowAlerts();
          }
          
          // Get old phase before refreshing data
          const project = projects.find(p => p.id === projectId);
          const oldPhase = project ? WorkflowProgressService.getProjectPhase(project) : null;
          
          // Refresh projects data to update progress indicators
          if (typeof refetchProjects === 'function') {
            refetchProjects();
          }
          
          // After data refresh, check for phase changes and notify all components
          setTimeout(() => {
            const updatedProject = projects.find(p => p.id === projectId);
            if (updatedProject && oldPhase) {
              const newPhase = WorkflowProgressService.getProjectPhase(updatedProject);
              if (oldPhase !== newPhase) {
                console.log(`🔄 PHASE CHANGE DETECTED: ${oldPhase} → ${newPhase}`);
                WorkflowProgressService.notifyPhaseChange(updatedProject, oldPhase, newPhase);
              }
            }
          }, 1000); // Wait for data refresh to complete
          
          console.log('✅ REFRESH: Dashboard data refresh initiated');
        } catch (refreshError) {
          console.log('⚠️ REFRESH: Dashboard refresh failed:', refreshError.message);
        }
        
        // Stay on the same page: do not navigate after completion
      } else {
        let message = 'Failed to complete workflow step';
        try {
          const errorResult = await response.json();
          console.error('❌ Failed to complete workflow step:', errorResult);
          message = errorResult?.message || message;
        } catch (parseError) {
          const text = await response.text();
          console.error('❌ Failed to complete workflow step (non-JSON response):', text);
          // Surface at least some of the server response
          message = text?.slice(0, 200) || message;
        }
        throw new Error(message);
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
      
      // Invalidate cache and remove completed alert from the local state to provide immediate feedback
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
      const selectedUser = availableUsers.find(user => user.id === assignToUser);
      console.log('👤 Selected user:', selectedUser);
      
      // Make API call to assign alert using the api client
      const response = await api.patch(`/alerts/${alertId}/assign`, {
        assignedTo: assignToUser
      });
      
      if (response.data.success) {
        console.log('✅ Alert assigned successfully:', response.data);
        
        // Show success toast with user assignment confirmation
        toast.success(
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Assigned to {selectedUser?.firstName} {selectedUser?.lastName}</span>
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
        
        // Refresh alerts to show updated assignment
        if (typeof refetchWorkflowAlerts === 'function') {
          refetchWorkflowAlerts();
        }
        
        // Close modal and reset state
        setShowAssignModal(false);
        setSelectedAlertForAssign(null);
        setAssignToUser('');
      }
      
    } catch (error) {
      console.error('❌ Failed to assign alert:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign alert. Please try again.';
      toast.error(errorMessage, {
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

  const handleAcknowledgeAlert = async (alert) => {
    const alertId = alert._id || alert.id;
    setActionLoading(prev => ({ ...prev, [`${alertId}-read`]: true }));
    
    try {
      console.log('🔄 Marking alert as read:', alert);
      
      // Simulate API call to mark as read
      setTimeout(() => {
        console.log('✅ Alert marked as read');
        setActionLoading(prev => ({ ...prev, [`${alertId}-read`]: false }));
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to mark alert as read:', error);
      setActionLoading(prev => ({ ...prev, [`${alertId}-read`]: false }));
    }
  };

  const handleDismissAlert = async (alert) => {
    const alertId = alert._id || alert.id;
    setActionLoading(prev => ({ ...prev, [`${alertId}-dismiss`]: true }));
    
    try {
      console.log('🔄 Dismissing alert:', alert);
      
      // Simulate API call to dismiss alert
      setTimeout(() => {
        console.log('✅ Alert dismissed');
        setActionLoading(prev => ({ ...prev, [`${alertId}-dismiss`]: false }));
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to dismiss alert:', error);
      setActionLoading(prev => ({ ...prev, [`${alertId}-dismiss`]: false }));
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProjectId]);

  // Keyboard event listener for closing progress side panel with Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && expandedProgress.size > 0) {
        // Close all open progress panels
        setExpandedProgress(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedProgress.size]);





  // Function to initialize workflow from a specific starting phase
  const initializeWorkflowFromPhase = async (projectId, startingPhase) => {
    try {
      console.log(`🚀 Initializing workflow for project ${projectId} from phase ${startingPhase}`);
      
      // Get the complete workflow structure
      const workflowResponse = await fetch('/api/workflow-data/full-structure', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
        }
      });
      
      if (!workflowResponse.ok) {
        throw new Error('Failed to fetch workflow structure');
      }
      
      const workflowResult = await workflowResponse.json();
      if (!workflowResult.success || !workflowResult.data) {
        throw new Error('Invalid workflow structure response');
      }
      
      const phases = workflowResult.data;
      const startingPhaseIndex = phases.findIndex(phase => phase.id === startingPhase);
      
      if (startingPhaseIndex === -1) {
        throw new Error(`Starting phase ${startingPhase} not found in workflow structure`);
      }
      
      // Mark all phases before the starting phase as completed
      const completedItems = [];
      
      for (let phaseIdx = 0; phaseIdx < startingPhaseIndex; phaseIdx++) {
        const phase = phases[phaseIdx];
        console.log(`📋 Marking phase ${phase.id} as completed`);
        
        // Mark all sections and line items in this phase as completed
        for (const section of phase.items || []) {
          for (let lineItemIdx = 0; lineItemIdx < (section.subtasks || []).length; lineItemIdx++) {
            const lineItemId = `${phase.id}-${section.id}-${lineItemIdx}`;
            completedItems.push({
              projectId: projectId,
              phaseId: phase.id,
              sectionId: section.id,
              lineItemId: lineItemId,
              subtaskIndex: lineItemIdx,
              completedAt: new Date().toISOString(),
              completedBy: 'system', // Marked as system completion for phase skipping
              notes: `Auto-completed: Project started from ${startingPhase} phase`
            });
          }
        }
      }
      
      // Batch create all completed workflow items
      if (completedItems.length > 0) {
        const batchResponse = await fetch('/api/workflow/batch-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
          },
          body: JSON.stringify({
            items: completedItems
          })
        });
        
        if (batchResponse.ok) {
          console.log(`✅ Successfully marked ${completedItems.length} items as completed`);
        } else {
          console.warn('⚠️ Failed to batch complete workflow items, but project was created');
        }
      }
      
      // Set the current project position to the starting phase
      const startingPhaseData = phases[startingPhaseIndex];
      if (startingPhaseData.items && startingPhaseData.items.length > 0) {
        const firstSection = startingPhaseData.items[0];
        await fetch('/api/workflow/set-position', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
          },
          body: JSON.stringify({
            projectId: projectId,
            currentPhase: startingPhase,
            currentSection: firstSection.id,
            currentLineItem: `${startingPhase}-${firstSection.id}-0`
          })
        });
        console.log(`📍 Set current position to first item in ${startingPhase} phase`);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize workflow from starting phase:', error);
      // Don't throw error - project creation should still succeed even if workflow initialization fails
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900 overflow-hidden">
      {/* Full Width - Project Overview by Phase - AT THE TOP */}
      {(
      <div className="mb-6 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6" data-section="project-phases">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
              Current Projects by Phase
            </h2>
            {/* Subtitle removed per request */}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Add Project Button - Modern Design */}
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5 border border-blue-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Project</span>
            </button>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 rounded-xl transition-all duration-300 bg-white/80 hover:bg-white border border-gray-200/50 hover:shadow-medium hover:-translate-y-0.5"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        
        {/* Professional Phase Filter Section - Optimized Layout */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Filter by Phase</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent"></div>
          </div>
          
          {/* Optimized Phase Container Row - Single Row, Uniform Sizing */}
          <div className="w-full flex items-center gap-3">
            {/* All Projects Button - Smaller */}
            <button 
              onClick={() => setSelectedPhase(selectedPhase === 'all' ? null : 'all')}
              className={`h-12 px-4 text-sm font-semibold rounded-xl transition-all duration-300 border-2 flex items-center justify-center gap-2 hover:shadow-medium flex-shrink-0 ${
                selectedPhase === 'all'
                  ? 'border-brand-500 bg-brand-50 shadow-brand-glow text-brand-800'
                  : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:border-gray-300 hover:shadow-soft'
              }`}
              style={{ minWidth: 72 }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-brand-500 flex-shrink-0 shadow-sm"></div>
              <span className="text-xs font-semibold">All</span>
            </button>

            {/* Six phases - equal width pill buttons, bigger text and circle */}
            <div className="flex-1 grid grid-cols-6 gap-3">
              {PROJECT_PHASES.map(phase => (
                <button
                  key={phase.id}
                  onClick={() => {
                    console.log('Phase button clicked:', phase.id, 'Current selectedPhase:', selectedPhase);
                    setSelectedPhase(selectedPhase === phase.id ? null : phase.id);
                  }}
                  className={`h-14 px-4 text-base font-semibold rounded-2xl transition-all duration-300 border-2 flex items-center justify-center gap-3 hover:shadow-medium ${
                    selectedPhase === phase.id
                      ? 'border-gray-400 bg-gray-50 shadow-medium text-gray-900'
                      : 'border-gray-200 bg-white/90 text-gray-800 hover:bg-white hover:border-gray-300 hover:shadow-soft'
                  }`}
                >
                  <div 
                    className="w-4.5 h-4.5 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: phase.color, width: 18, height: 18 }}
                  ></div>
                  <span className="text-center leading-tight whitespace-nowrap truncate">
                    {phase.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* All Projects Table */}
        <div className="mb-4 overflow-x-auto">
          {(() => {
            // Use centralized phase detection service - SINGLE SOURCE OF TRUTH
            const getProjectPhase = (project) => {
              return WorkflowProgressService.getProjectPhase(project);
            };

            return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-full">
              {(() => {

                // Filter projects based on selected phase
                const filteredProjects = !selectedPhase ? [] : selectedPhase === 'all' 
                  ? projects 
                  : projects.filter(project => {
                      const projectPhase = WorkflowProgressService.getProjectPhase(project);
                      return String(projectPhase).toUpperCase() === String(selectedPhase).toUpperCase();
                    });
                
                console.log('Selected Phase:', selectedPhase, 'Filtered Projects Count:', filteredProjects.length);
                
                // Show headers only when there are projects to display
                if (filteredProjects.length === 0) {
                  return null;
                }
                
                return (
                  <thead>
                    <tr className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Phase</th>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => handleProjectSort('projectNumber')}
                          className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                          Project #
                          {sortConfig.key === 'projectNumber' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => handleProjectSort('primaryContact')}
                          className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                          Primary Contact
                          {sortConfig.key === 'primaryContact' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => handleProjectSort('projectManager')}
                          className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                          PM
                          {sortConfig.key === 'projectManager' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => handleProjectSort('projectType')}
                          className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                          Project Type
                          {sortConfig.key === 'projectType' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => handleProjectSort('progress')}
                          className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                          Progress
                          {sortConfig.key === 'progress' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Alerts</th>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Messages</th>
                      <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Workflow</th>
                    </tr>
                  </thead>
                );
              })()}
              <tbody>
                {(() => {
                  // Show loading state
                  if (projectsLoading) {
                    return (
                      <tr>
                        <td colSpan="9" className="text-center py-8">
                          <div className="text-brand-600">Loading projects...</div>
                        </td>
                      </tr>
                    );
                  }
                  
                  // Show error state but still try to show any projects we have
                  if (projectsError && (!projects || projects.length === 0)) {
                    return (
                      <tr>
                        <td colSpan="9" className="text-center py-8">
                          <div className="text-red-600 mb-4">
                            <div className="font-semibold">Error loading projects:</div>
                            <div className="text-sm">{String(projectsError?.message || projectsError || 'Unknown error')}</div>
                            <div className="text-xs mt-2 text-gray-500">
                              This often happens after navigating back from Project Workflow. Try refreshing the data.
                            </div>
                          </div>
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={async () => {
                                console.log('🔄 RETRY: Attempting to refetch projects...');
                                console.log('🔄 RETRY: Dashboard state:', dashboardState);
                                console.log('🔄 RETRY: Current error:', projectsError);
                                try {
                                  await refetchProjects();
                                  console.log('✅ RETRY: Successfully refetched projects');
                                } catch (error) {
                                  console.error('❌ RETRY: Failed to refetch projects:', error);
                                  // If retry fails, offer page refresh
                                  // eslint-disable-next-line no-restricted-globals
                                  if (confirm('Retry failed. Would you like to refresh the entire page?')) {
                                    window.location.reload();
                                  }
                                }
                              }} 
                              className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-blue-600 transition-colors"
                              disabled={projectsLoading}
                            >
                              {projectsLoading ? 'Retrying...' : 'Retry'}
                            </button>
                            <button 
                              onClick={() => {
                                console.log('🔄 REFRESH: User chose to refresh page due to persistent error');
                                window.location.reload();
                              }} 
                              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                            >
                              Refresh Page
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  
                  // Show no projects state
                  if (!projects || projects.length === 0) {
                    return (
                      <tr>
                        <td colSpan="9" className="text-center py-8">
                          <div className="text-gray-600">No projects found</div>
                        </td>
                      </tr>
                    );
                  }
                  
                  
                  // Filter projects based on selected phase - only show projects when a phase is selected
                  const filteredProjects = !selectedPhase ? [] : selectedPhase === 'all' 
                    ? projects 
                    : projects.filter(project => {
                        const projectPhase = WorkflowProgressService.getProjectPhase(project);
                        return String(projectPhase).toUpperCase() === String(selectedPhase).toUpperCase();
                      });
                  
                  console.log('Card View - Selected Phase:', selectedPhase, 'Filtered Projects Count:', filteredProjects.length);
                  
                  // Sort projects if sorting is configured
                  const sortedProjects = sortConfig.key 
                    ? [...filteredProjects].sort((a, b) => {
                        let aValue, bValue;
                        
                        if (sortConfig.key === 'projectNumber') {
                          aValue = a.projectNumber || a.id;
                          bValue = b.projectNumber || b.id;
                        } else if (sortConfig.key === 'primaryContact') {
                          aValue = a.client?.name || a.clientName || '';
                          bValue = b.client?.name || b.clientName || '';
                        } else if (sortConfig.key === 'projectManager') {
                          aValue = typeof a.projectManager === 'object' && a.projectManager !== null
                            ? (a.projectManager.name || `${a.projectManager.firstName || ''} ${a.projectManager.lastName || ''}`.trim() || '')
                            : a.projectManager || '';
                          bValue = typeof b.projectManager === 'object' && b.projectManager !== null
                            ? (b.projectManager.name || `${b.projectManager.firstName || ''} ${b.projectManager.lastName || ''}`.trim() || '')
                            : b.projectManager || '';
                        } else if (sortConfig.key === 'projectType') {
                          aValue = a.projectType || 'N/A';
                          bValue = b.projectType || 'N/A';
                        } else if (sortConfig.key === 'phase') {
                          aValue = WorkflowProgressService.getProjectPhase(a) || '';
                          bValue = WorkflowProgressService.getProjectPhase(b) || '';
                        }
                        
                        // Convert to strings for comparison
                        if (typeof aValue === 'string') {
                          aValue = aValue.toLowerCase();
                          bValue = bValue.toLowerCase();
                        }
                        
                        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                        return 0;
                      })
                    : filteredProjects;
                  
                  // Handle empty state for filtered projects
                  if (!selectedPhase) {
                    // No phase selected - show instruction message
                    return null;
                  } else if (filteredProjects.length === 0 && selectedPhase && !projectsLoading) {
                    const phaseName = selectedPhase === 'all' ? 'All Projects' : 
                      PROJECT_PHASES.find(p => p.id === selectedPhase)?.name || selectedPhase;
                    
                    return (
                      <tr>
                        <td colSpan="9" className="text-center py-12">
                          <div className={`${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <div className="text-4xl mb-3">📋</div>
                            <div className="font-medium text-sm mb-1">No projects in {phaseName}</div>
                            <div className="text-xs">Projects will appear here when they are in this phase</div>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  
                  return sortedProjects.map((project) => {
                    const projectPhase = getProjectPhase(project);
                    const phaseConfig = PROJECT_PHASES.find(p => p.id === projectPhase) || PROJECT_PHASES[0];
                    
                    return (
                      <tr key={project.id} data-project-id={project.id} className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'} hover:bg-gray-50 transition-colors duration-300`}>
                        {/* Phase Column - First position with colored circle */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ 
                              backgroundColor: phaseConfig.color,
                              color: WorkflowProgressService.getContrastTextColor(phaseConfig.color)
                            }}
                            title={`Phase: ${phaseConfig.name}`}
                          >
                            {phaseConfig.initial}
                          </div>
                        </td>
                        
                        {/* Project Number - Second position - 5 digits only - Navigate to Project Profile tab */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <button 
                            onClick={() => {
                              const projectWithDashboardState = {
                                ...project,
                                dashboardState: {
                                  selectedPhase: phaseConfig.id,
                                  expandedPhases: Array.from(expandedPhases),
                                  scrollToProject: project,
                                  projectSourceSection: 'Project Phases'
                                }
                              };
                              handleProjectSelectWithScroll(projectWithDashboardState, 'Profile', null, 'Project Phases');
                            }}
                            className="text-sm font-bold hover:underline cursor-pointer transition-colors text-blue-600 hover:text-blue-800"
                          >
                            {String(project.projectNumber || project.id).padStart(5, '0')}
                          </button>
                        </td>
                        
                        {/* Primary Contact - Third position */}
                        <td className="py-2 px-2 whitespace-nowrap max-w-32 overflow-hidden">
                          <div className="relative" data-dropdown="contact">
                            <button 
                              ref={(el) => contactButtonRefs.current[project.id] = el}
                              onClick={(e) => toggleContact(project.id, e.currentTarget)}
                              className={`flex items-center gap-1 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors ${
                                expandedContacts.has(project.id) ? 'bg-gray-100' : ''
                              }`}>
                              <span className="text-sm font-semibold text-gray-700 truncate">
                                {project.client?.name || project.clientName || ''}
                              </span>
                              <svg 
                                className={`w-3 h-3 transition-transform flex-shrink-0 ${expandedContacts.has(project.id) ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        
                        {/* Project Manager with dropdown */}
                        <td className="py-2 px-2 max-w-24 overflow-hidden relative">
                          <div className="relative">
                            <button 
                              ref={(el) => pmButtonRefs.current[project.id] = el}
                              onClick={(e) => togglePM(project.id, e.currentTarget)}
                              className={`flex items-center gap-1 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors ${
                                expandedPMs.has(project.id) ? 'bg-gray-100' : ''
                              }`}>
                              <span className={`text-sm truncate ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                {typeof project.projectManager === 'object' && project.projectManager !== null
                                  ? (project.projectManager.name || `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim() || '')
                                  : project.projectManager || ''}
                              </span>
                              <svg 
                                className={`w-3 h-3 transition-transform ${expandedPMs.has(project.id) ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        
                        {/* Project Type Column */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${colorMode ? getProjectTypeColorDark(project.projectType) : getProjectTypeColor(project.projectType)}`}>
                            {formatProjectType(project.projectType)}
                          </span>
                        </td>
                        
                        {/* Progress - Enhanced Professional Design */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <div className="relative">
                            <button 
                              ref={(el) => progressButtonRefs.current[project.id] = el}
                              onClick={() => toggleProgress(project.id)}
                              className={`flex items-center gap-3 hover:bg-opacity-80 rounded-lg px-3 py-2 transition-all duration-200 w-full ${
                                colorMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Progress
                                  </span>
                                  <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                    {getProjectProgress(project)}%
                                  </span>
                                </div>
                                <div className={`w-full h-2.5 rounded-full overflow-hidden shadow-inner ${
                                  colorMode ? 'bg-slate-700' : 'bg-gray-200'
                                }`}>
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                                      getProjectProgress(project) === 100 
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                    }`}
                                    style={{ width: `${getProjectProgress(project)}%` }}
                                  >
                                    {getProjectProgress(project) > 15 && (
                                      <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              <svg 
                                className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
                                  colorMode ? 'text-gray-400' : 'text-gray-500'
                                } ${expandedProgress.has(project.id) ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        
                        {/* Alerts - Blue outlined oval box */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <button 
                            onClick={() => {
                              const projectWithDashboardState = {
                                ...project,
                                dashboardState: {
                                  selectedPhase: phaseConfig.id,
                                  expandedPhases: Array.from(expandedPhases),
                                  scrollToProject: project,
                                  projectSourceSection: 'Project Phases'
                                }
                              };
                              handleProjectSelectWithScroll(projectWithDashboardState, 'Alerts', null, 'Project Phases');
                            }}
                            className="inline-flex items-center justify-center w-16 h-6 border border-brand-500 text-black rounded-md hover:bg-brand-50 transition-colors text-[10px] font-semibold"
                          >
                            Alerts
                          </button>
                        </td>
                        
                        {/* Messages - Blue outlined oval box */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <button 
                            onClick={() => {
                              const projectWithDashboardState = {
                                ...project,
                                dashboardState: {
                                  selectedPhase: phaseConfig.id,
                                  expandedPhases: Array.from(expandedPhases),
                                  scrollToProject: project,
                                  projectSourceSection: 'Project Phases'
                                }
                              };
                              handleProjectSelectWithScroll(projectWithDashboardState, 'Messages', null, 'Project Phases');
                            }}
                            className="inline-flex items-center justify-center w-16 h-6 border border-brand-500 text-black rounded-md hover:bg-brand-50 transition-colors text-[10px] font-semibold"
                          >
                            Messages
                          </button>
                        </td>
                        
                        {/* Workflow - Navigate to specific line item using new navigation system */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <button
                            onClick={async () => {
                              if (onProjectSelect) {
                                try {
                                  // Get current project position from the API
                                  const response = await api.get(`/workflow-data/project-position/${project.id}`);
                                  
                                  if (response.data) {
                                    const result = response.data;
                                    if (result.success && result.data) {
                                      const position = result.data;
                                      
                                      // Generate the correct line item ID format that ProjectChecklistPage expects
                                      // Format: ${phase.id}-${item.id}-${subIdx}
                                      // Get the workflow structure to find the subtask index
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
                                              const currentPhaseData = workflowResult.data.find(phase => phase.id === position.currentPhase);
                                              if (currentPhaseData) {
                                                // Find the current section
                                                const currentSectionData = currentPhaseData.items.find(item => item.id === position.currentSection);
                                                if (currentSectionData) {
                                                  // Find the subtask index by matching the current line item name
                                                  const subtaskIndex = currentSectionData.subtasks.findIndex(subtask => {
                                                    if (typeof subtask === 'object') {
                                                      return subtask.id === position.currentLineItem || subtask.label === position.currentLineItemName;
                                                    }
                                                    return subtask === position.currentLineItemName;
                                                  });
                                                  return subtaskIndex >= 0 ? subtaskIndex : 0;
                                                }
                                              }
                                            }
                                          }
                                        } catch (error) {
                                          console.warn('Could not determine subtask index:', error);
                                        }
                                        return 0; // Default fallback
                                      };
                                      
                                      const subtaskIndex = await getSubtaskIndex();
                                      // Prefer DB line item id for precise highlight; keep section id for expansion
                                      const targetLineItemId = position.currentLineItem || `${position.currentPhase}-${position.currentSection}-${subtaskIndex}`;
                                      const targetSectionId = position.currentSection;
                                      
                                      console.log('🎯 WORKFLOW BUTTON CLICKED for project', project.projectNumber);
                                      console.log('   Phase:', position.currentPhase, '(' + position.phaseName + ')');
                                      console.log('   Section:', position.sectionDisplayName, '(ID:', targetSectionId + ')');
                                      console.log('   Line Item:', position.currentLineItemName, '(ID:', targetLineItemId + ')');
                                      console.log('   Will navigate to Project Workflow tab with highlighting');
                                      
                                      const projectWithNavigation = {
                                        ...project,
                                        dashboardState: {
                                          selectedPhase: phaseConfig.id,
                                          expandedPhases: Array.from(expandedPhases),
                                          scrollToProject: project
                                        }
                                      };
                                      
                                      // Use the new navigation system with correct targetLineItemId
                                      handleProjectSelectWithScroll(
                                        projectWithNavigation, 
                                        'Project Workflow', 
                                        null, 
                                        'Project Phases',
                                        targetLineItemId,
                                        targetSectionId
                                      );
                                    } else {
                                      console.warn('No project position data found, using fallback navigation');
                                      // Fallback to basic navigation
                                      handleProjectSelectWithScroll(project, 'Project Workflow', null, 'Project Phases');
                                    }
                                  } else {
                                    console.error('Failed to get project position, using fallback navigation');
                                    // Fallback to basic navigation
                                    handleProjectSelectWithScroll(project, 'Project Workflow', null, 'Project Phases');
                                  }
                                } catch (error) {
                                  console.error('Error getting project position:', error);
                                  // Fallback to basic navigation
                                  handleProjectSelectWithScroll(project, 'Project Workflow', null, 'Project Phases');
                                }
                              }
                            }}
                            className="inline-flex items-center justify-center w-16 h-6 border border-brand-500 text-black rounded-md hover:bg-brand-50 transition-colors text-[10px] font-semibold"
                          >
                            Workflow
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* Main Dashboard Layout - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 items-start overflow-visible">
        {/* Left Column - Project Messages */}
        <div className="w-full" data-section="project-messages">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                    Messages, Tasks, & Reminders
                  </h2>
                  {expandedMessages.size > 0 && (
                    <p className="text-sm text-gray-600 font-medium">
                      {expandedMessages.size} of {(() => {
                        if (activeCommTab === 'messages') return activityFeedItems.filter(i => i.type === 'message').length;
                        if (activeCommTab === 'tasks') return activityFeedItems.filter(i => i.type === 'task').length;
                        if (activeCommTab === 'reminders') return activityFeedItems.filter(i => i.type === 'reminder').length;
                        return 0;
                      })()} {activeCommTab}{(() => {
                        const count = activeCommTab === 'messages' ? activityFeedItems.filter(i => i.type === 'message').length :
                                     activeCommTab === 'tasks' ? activityFeedItems.filter(i => i.type === 'task').length :
                                     activityFeedItems.filter(i => i.type === 'reminder').length;
                        return count !== 1 ? 's' : '';
                      })()} expanded
                    </p>
                  )}
                </div>
              </div>
              
              {/* Modern Tab Navigation */}
              <div className="relative mt-4 mb-6">
                <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                  <button 
                    onClick={() => setActiveCommTab('messages')} 
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      activeCommTab === 'messages' 
                        ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Messages
                    </div>
                  </button>
                  <button 
                    onClick={() => setActiveCommTab('tasks')} 
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      activeCommTab === 'tasks' 
                        ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Tasks
                    </div>
                  </button>
                  <button 
                    onClick={() => setActiveCommTab('reminders')} 
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      activeCommTab === 'reminders' 
                        ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Reminders
                    </div>
                  </button>
                </div>
              </div>


              {/* Filter Controls with Expand/Collapse Controls */}
              <div className="flex items-center justify-between gap-2 mb-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Filter by:</span>
                  <select 
                    value={activeCommTab === 'messages' ? (messagesProjectFilter || '') : activeCommTab === 'tasks' ? (tasksProjectFilter || '') : (remindersProjectFilter || '')}
                    onChange={(e) => {
                      if (activeCommTab === 'messages') setMessagesProjectFilter(e.target.value);
                      else if (activeCommTab === 'tasks') setTasksProjectFilter(e.target.value);
                      else setRemindersProjectFilter(e.target.value);
                    }}
                    className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[120px]"
                  >
                    <option value="">All Projects</option>
                    {(projects || []).map(p => (
                      <option key={p.id} value={p.id}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={activeCommTab === 'messages' ? (messagesUserFilter || '') : activeCommTab === 'tasks' ? (tasksUserFilter || '') : (remindersUserFilter || '')}
                    onChange={(e) => {
                      if (activeCommTab === 'messages') setMessagesUserFilter(e.target.value);
                      else if (activeCommTab === 'tasks') setTasksUserFilter(e.target.value);
                      else setRemindersUserFilter(e.target.value);
                    }}
                    className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[100px]"
                  >
                    <option value="">All Users</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>
                
                {/* Condensed Expand/Collapse Controls - Right side */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExpandAllMessages}
                    className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                      (() => {
                        const currentCount = activeCommTab === 'messages' ? activityFeedItems.filter(i => i.type === 'message').length :
                                           activeCommTab === 'tasks' ? activityFeedItems.filter(i => i.type === 'task').length :
                                           activityFeedItems.filter(i => i.type === 'reminder').length;
                        return expandedMessages.size === currentCount && currentCount > 0
                          ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow'
                          : 'bg-white/80 text-brand-600 border-gray-200 hover:bg-white hover:border-brand-300 hover:shadow-soft';
                      })()
                    }`}
                    title="Expand all alert details"
                    disabled={(() => {
                      const currentCount = activeCommTab === 'messages' ? activityFeedItems.filter(i => i.type === 'message').length :
                                         activeCommTab === 'tasks' ? activityFeedItems.filter(i => i.type === 'task').length :
                                         activityFeedItems.filter(i => i.type === 'reminder').length;
                      return currentCount === 0 || expandedMessages.size === currentCount;
                    })()}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={handleCollapseAllMessages}
                    className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                      expandedMessages.size === 0
                        ? 'bg-orange-500 text-white border-orange-500 shadow-accent-glow'
                        : 'bg-white/80 text-orange-600 border-gray-200 hover:bg-white hover:border-orange-300 hover:shadow-soft'
                    }`}
                    title="Collapse all alert details"
                    disabled={expandedMessages.size === 0}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Add Forms per Tab */}
              <div className="mb-3">
                <button
                  onClick={() => setShowMessageDropdown(!showMessageDropdown)}
                  className={`w-full px-2 py-1.5 text-xs font-medium border rounded-lg transition-all duration-300 flex items-center justify-between ${
                    showMessageDropdown
                      ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-soft' 
                      : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  <span>{activeCommTab === 'messages' ? '+ Add Message' : activeCommTab === 'tasks' ? '+ Add Task' : '+ Add Reminder'}</span>
                  <svg className={`w-3 h-3 transition-transform ${showMessageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {showMessageDropdown && activeCommTab === 'messages' && (
                <div className={`p-2 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const finalSubject = newMessageSubject === 'CUSTOM_SUBJECT' ? newMessageCustomSubject : newMessageSubject;
                    if (newMessageProject && finalSubject && newMessageText.trim() && newMessageRecipients.length > 0) {
                      // Create new message activity
                      const selectedProject = projects.find(p => p.id === parseInt(newMessageProject));
                      
                      // Debug logging
                      console.log('Message Creation Debug:', {
                          newMessageProject,
                          selectedProject,
                          projects: projects?.length,
                          newMessageSubject,
                          newMessageText
                      });
                      
                      // Create message using the API service
                      const createMessage = async () => {
                        try {
                          const response = await projectMessagesService.create(newMessageProject, {
                            content: newMessageText,
                            subject: finalSubject,
                            priority: 'MEDIUM'
                          });
                          
                          if (response.success) {
                            console.log('Message saved to database:', response.data);
                            
                            // Refresh the messages data by invalidating the query
                            queryClient.invalidateQueries(['projectMessages']);
                          } else {
                            console.error('Failed to save message to database:', response.message);
                          }
                        } catch (error) {
                          console.error('Error saving message:', error);
                        }
                      };
                      
                      // Call the API to save the message
                      createMessage();
                      
                      // Also add to local state for immediate UI update
                      const newActivity = {
                        id: `msg_${Date.now()}`,
                        projectId: parseInt(newMessageProject),
                        projectName: selectedProject?.projectName || selectedProject?.name || selectedProject?.customer?.primaryName || selectedProject?.client?.name || selectedProject?.address || 'Unknown Project',
                        projectNumber: selectedProject?.projectNumber || Math.floor(Math.random() * 90000) + 10000,
                        subject: finalSubject,
                        description: newMessageText,
                        user: 'You',
                        timestamp: new Date().toISOString(),
                        type: 'message',
                        priority: 'medium',
                        recipients: newMessageRecipients
                      };
                      
                      // Add to messages data
                      setMessagesData(prev => [newActivity, ...prev]);
                      setFeed(prev => [newActivity, ...prev]);
                      
                      // Close dropdown and reset form
                      setShowMessageDropdown(false);
                      setNewMessageProject('');
                      setNewMessageSubject('');
                      setNewMessageCustomSubject('');
                      setNewMessageText('');
                      setNewMessageRecipients([]);
                    }
                  }} className="space-y-2">
                    {/* First Row: Project and To fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                          className={`w-full px-2 py-1 border rounded text-xs ${
                            colorMode 
                              ? 'bg-[#232b4d] border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        >
                          <option value="">Select Project</option>
                          {(projects || []).map(project => (
                            <option key={project.id} value={project.id}>
                              #{String(project.projectNumber || project.id).padStart(5, '0')} - {project.projectName || project.name || project.customer?.primaryName || project.client?.name || project.address}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
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
                          className={`w-full px-2 py-1 border rounded text-xs ${
                            colorMode 
                              ? 'bg-[#232b4d] border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
                          style={{ minHeight: '40px' }}
                        >
                          <option value="all" style={{ fontWeight: 'bold' }}>All Users</option>
                          {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName || ''} {user.lastName ? '' : `(${user.email})`} ({user.role || 'User'})
                            </option>
                          ))}
                        </select>
                        <p className={`text-[10px] mt-1 ${
                          colorMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Hold Ctrl/Cmd to select multiple recipients
                        </p>
                      </div>
                    </div>
                    
                    {/* Second Row: Subject */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        colorMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newMessageSubject === 'CUSTOM_SUBJECT' ? 'CUSTOM_SUBJECT' : newMessageSubject}
                        onChange={(e) => {
                          if (e.target.value === 'CUSTOM_SUBJECT') {
                            setNewMessageSubject('CUSTOM_SUBJECT');
                          } else {
                            setNewMessageSubject(e.target.value);
                          }
                        }}
                        required
                        className={`w-full px-2 py-1 border rounded text-xs mb-2 ${
                          colorMode 
                            ? 'bg-[#232b4d] border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        <option value="">Select Subject</option>
                        <option value="CUSTOM_SUBJECT">+ Add Custom Subject</option>
                        {subjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                      
                      {newMessageSubject === 'CUSTOM_SUBJECT' && (
                        <input
                          type="text"
                          placeholder="Enter custom subject..."
                          value={newMessageCustomSubject || ''}
                          onChange={(e) => setNewMessageCustomSubject(e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs ${
                            colorMode 
                              ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                          }`}
                        />
                      )}
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
                        rows={2}
                        className={`w-full px-2 py-1 border rounded text-xs resize-none ${
                          colorMode 
                            ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMessageDropdown(false);
                          setNewMessageProject('');
                          setNewMessageSubject('');
                          setNewMessageCustomSubject('');
                          setNewMessageText('');
                          setNewMessageRecipients([]);
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
                        disabled={!newMessageProject || !(newMessageSubject === 'CUSTOM_SUBJECT' ? newMessageCustomSubject : newMessageSubject) || !newMessageText.trim() || newMessageRecipients.length === 0}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          newMessageProject && (newMessageSubject === 'CUSTOM_SUBJECT' ? newMessageCustomSubject : newMessageSubject) && newMessageText.trim() && newMessageRecipients.length > 0
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

              {showMessageDropdown && activeCommTab === 'tasks' && (
                <div className={`p-2 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!quickTaskSubject.trim() || !quickTaskDue) return;
                    try {
                      // Create as calendar DEADLINE event; project optional
                      const payload = {
                        title: quickTaskSubject.trim(),
                        description: quickTaskDescription || '',
                        startTime: quickTaskDue,
                        endTime: quickTaskDue,
                        eventType: 'DEADLINE',
                        organizerId: currentUser?.id,
                        projectId: tasksProjectFilter || undefined,
                        attendees: quickTaskAssignAll ? availableUsers.map(u => ({ userId: u.id })) : (quickTaskAssigneeId ? [{ userId: quickTaskAssigneeId }] : [])
                      };
                      const res = await calendarService.create(payload);
                      // Invalidate events so the task appears
                      queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents });
                      // Add to activity feed immediately
                      setFeed(prev => [{
                        id: `cal_${Date.now()}`,
                        type: 'task',
                        authorId: currentUser?.id || null,
                        author: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
                        projectId: tasksProjectFilter || null,
                        projectName: (projects.find(p => String(p.id) === String(tasksProjectFilter)) || {}).projectName || null,
                        subject: quickTaskSubject.trim(),
                        content: quickTaskDescription || '',
                        timestamp: quickTaskDue
                      }, ...prev]);
                      // Confirmation
                      toast.success('Task created successfully');
                      // Reset
                      setQuickTaskSubject(''); setQuickTaskDescription(''); setQuickTaskDue(''); setQuickTaskAssignAll(false); setQuickTaskAssigneeId(''); setTasksProjectFilter('');
                    } catch (err) {
                      console.error('Failed to create task:', err);
                      toast.error('Failed to create task');
                    }
                  }} className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Project</label>
                        <select 
                          value={tasksProjectFilter || ''} 
                          onChange={(e) => setTasksProjectFilter(e.target.value)} 
                          className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                        >
                          <option value="">General (No Project)</option>
                          {(uiProjects || []).map(p => (
                            <option key={p.id} value={p.id}>
                              #{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject <span className="text-red-500">*</span></label>
                        <input value={quickTaskSubject} onChange={(e)=>setQuickTaskSubject(e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} placeholder="Task subject" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Due <span className="text-red-500">*</span></label>
                        <input type="datetime-local" value={quickTaskDue} onChange={(e)=>setQuickTaskDue(e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Assign To</label>
                        <select value={quickTaskAssigneeId} onChange={(e)=>{ setQuickTaskAssigneeId(e.target.value); setQuickTaskAssignAll(false); }} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}>
                          <option value="">Unassigned</option>
                          {availableUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.firstName} {u.lastName || ''} {u.lastName ? '' : `(${u.email})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                      <textarea value={quickTaskDescription} onChange={(e)=>setQuickTaskDescription(e.target.value)} rows={2} className={`w-full px-2 py-1 border rounded text-xs resize-none ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} />
                    </div>
                    <div className="flex items-center">
                      <label className={`text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <input type="checkbox" className="mr-1" checked={quickTaskAssignAll} onChange={(e)=>{ setQuickTaskAssignAll(e.target.checked); if (e.target.checked) setQuickTaskAssigneeId(''); }} /> Send to all users
                      </label>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button type="button" onClick={()=>{ setShowMessageDropdown(false); setQuickTaskSubject(''); setQuickTaskDescription(''); setQuickTaskDue(''); setQuickTaskAssignAll(false); setQuickTaskAssigneeId(''); setTasksProjectFilter(''); }} className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${colorMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
                      <button type="submit" disabled={!quickTaskSubject.trim() || !quickTaskDue} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${quickTaskSubject.trim() && quickTaskDue ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Create Task</button>
                    </div>
                  </form>
                </div>
              )}

              {showMessageDropdown && activeCommTab === 'reminders' && (
                <div className={`p-2 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!reminderTitle.trim() || !reminderWhen) return;
                    try {
                      const payload = {
                        title: reminderTitle.trim(),
                        description: reminderDescription || '',
                        startTime: reminderWhen,
                        endTime: reminderWhen,
                        eventType: 'REMINDER',
                        organizerId: currentUser?.id,
                        projectId: remindersProjectFilter || undefined,
                        attendees: reminderAllUsers ? availableUsers.map(u => ({ userId: u.id })) : (reminderUserIds.length ? reminderUserIds.map(id => ({ userId: id })) : [])
                      };
                      const res = await calendarService.create(payload);
                      // Invalidate events so the reminder appears
                      queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents });
                      // Add to activity feed immediately
                      setFeed(prev => [{
                        id: `cal_${Date.now()}`,
                        type: 'reminder',
                        authorId: currentUser?.id || null,
                        author: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
                        projectId: remindersProjectFilter || null,
                        projectName: (projects.find(p => String(p.id) === String(remindersProjectFilter)) || {}).projectName || null,
                        subject: reminderTitle.trim(),
                        content: reminderDescription || '',
                        timestamp: reminderWhen
                      }, ...prev]);
                      toast.success('Reminder created successfully');
                      setReminderTitle(''); setReminderDescription(''); setReminderWhen(''); setReminderAllUsers(false); setReminderUserIds([]);
                    } catch (err) {
                      console.error('Failed to create reminder:', err);
                      toast.error('Failed to create reminder');
                    }
                  }} className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Title <span className="text-red-500">*</span></label>
                        <input value={reminderTitle} onChange={(e)=>setReminderTitle(e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} placeholder="Reminder title" />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>When <span className="text-red-500">*</span></label>
                        <input type="datetime-local" value={reminderWhen} onChange={(e)=>setReminderWhen(e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                      <textarea value={reminderDescription} onChange={(e)=>setReminderDescription(e.target.value)} rows={2} className={`w-full px-2 py-1 border rounded text-xs resize-none ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Recipients</label>
                        <select multiple value={reminderUserIds} onChange={(e)=>setReminderUserIds(Array.from(e.target.selectedOptions, o => o.value))} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} style={{ minHeight: '40px' }}>
                          {availableUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                          ))}
                        </select>
                        <p className={`text-[10px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Hold Ctrl/Cmd to select multiple recipients</p>
                      </div>
                      <div className="flex items-end">
                        <label className={`text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <input type="checkbox" className="mr-1" checked={reminderAllUsers} onChange={(e)=>{ setReminderAllUsers(e.target.checked); if (e.target.checked) setReminderUserIds([]); }} /> Send to all users
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button type="button" onClick={()=>{ setShowMessageDropdown(false); setReminderTitle(''); setReminderDescription(''); setReminderWhen(''); setReminderAllUsers(false); setReminderUserIds([]); }} className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${colorMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
                      <button type="submit" disabled={!reminderTitle.trim() || !reminderWhen} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${reminderTitle.trim() && reminderWhen ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Create Reminder</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
            
            <div className="space-y-2 mt-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
              {activeCommTab === 'messages' && (
                (() => {
                  // Use activityFeedItems for consistent data source across all tabs
                  const messageItems = activityFeedItems
                    .filter(i => i.type === 'message')
                    .filter(i => !messagesProjectFilter || String(i.projectId) === String(messagesProjectFilter))
                    .filter(i => {
                      if (!messagesUserFilter) return true;
                      const uid = String(messagesUserFilter);
                      // Simplified user filtering - just check if the user is mentioned in recipients or is the author
                      const isRecipient = Array.isArray(i.recipients) && (i.recipients.includes('all') || i.recipients.some(r => String(r) === uid));
                      const isAuthor = i.authorId && String(i.authorId) === uid;
                      return isRecipient || isAuthor;
                    });

                  if (messageItems.length === 0) {
                    return (
                      <div className="text-gray-400 text-center py-8 text-sm">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="font-medium">No messages found</p>
                        <p className="text-xs mt-1">Messages you send or receive will appear here</p>
                      </div>
                    );
                  }

                  return messageItems.map(item => (
                    <ProjectMessagesCard 
                      key={item.id} 
                      activity={{
                        ...item,
                        // Ensure compatibility with the card component
                        id: item.id,
                        projectId: item.projectId,
                        projectName: item.projectName,
                        subject: item.subject,
                        description: item.description || item.content,
                        user: item.user,
                        timestamp: item.timestamp,
                        type: item.type,
                        priority: item.priority,
                        recipients: item.recipients
                      }}
                      onProjectSelect={handleProjectSelectWithScroll}
                      projects={projects}
                      colorMode={colorMode}
                      useRealData={true}
                      onQuickReply={handleQuickReply}
                      isExpanded={expandedMessages.has(item.id)}
                      onToggleExpansion={handleToggleMessage}
                      sourceSection="Messages, Tasks, & Reminders"
                    />
                  ));
                })()
              )}

              {/* Tasks Tab - New Format */}
              {activeCommTab === 'tasks' && (
                (() => {
                  const allTaskItems = activityFeedItems
                    .filter(i => i.type === 'task')
                    .filter(i => !tasksProjectFilter || String(i.projectId) === String(tasksProjectFilter))
                    .filter(i => {
                      if (!tasksUserFilter) return true;
                      const uid = String(tasksUserFilter);
                      const isAssignee = Array.isArray(i.attendees) && i.attendees.some(id => String(id) === uid);
                      const isAuthor = i.authorId && String(i.authorId) === uid;
                      return isAssignee || isAuthor;
                    });

                  // Filter based on completion status
                  const taskItems = allTaskItems.filter(item => {
                    const isCompleted = completedTasks.has(item.id);
                    return showCompletedTasks ? isCompleted : !isCompleted;
                  });

                  const completedCount = allTaskItems.filter(item => completedTasks.has(item.id)).length;
                  const activeCount = allTaskItems.length - completedCount;

                  return (
                    <div>
                      {/* Task Summary and Toggle - Compact */}
                      <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
                        <div className="flex items-center gap-4">
                          <span>{activeCount} active</span>
                          <span>{completedCount} completed</span>
                        </div>
                        <button
                          onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {showCompletedTasks ? '← Show Active Tasks' : 'Show Completed Tasks →'}
                        </button>
                      </div>

                      {taskItems.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            {showCompletedTasks ? 'No completed tasks' : 'No active tasks'}
                          </h3>
                          <p className="text-gray-500">
                            {showCompletedTasks ? 'Completed tasks will appear here' : 'Tasks assigned to you will appear here'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Task List - EXACT SAME AS MESSAGES */}
                          <div className="space-y-2">
                            {taskItems.map(item => {
                              const isCompleted = completedTasks.has(item.id);
                              const project = projects?.find(p => p.id === item.projectId);
                              const projectNumber = project?.projectNumber || item.projectNumber || '12345';
                              const primaryCustomer = project?.customer?.primaryName || project?.client?.name || project?.clientName || project?.projectName || item.projectName || 'Primary Customer';
                              const subject = item.subject || 'Task';
                              
                              return (
                                <div key={item.id} className={`bg-white hover:bg-gray-50 border-gray-200 rounded-[12px] shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer ${isCompleted ? 'opacity-75' : ''}`}>
                                  {/* Main task header - Compact 2-row layout - EXACT SAME AS MESSAGES */}
                                  <div 
                                    className="flex items-center gap-1.5 p-1.5"
                                    onClick={() => handleToggleMessage(item.id)}
                                  >
                                    {/* Phase Circle - Dynamic based on project association */}
                                    {(() => {
                                      // Check if task is tied to a project
                                      const isProjectTask = item.projectId && project;
                                      
                                      if (isProjectTask) {
                                        // Get project phase and colors
                                        const projectPhase = WorkflowProgressService.getProjectPhase(project);
                                        const phaseProps = WorkflowProgressService.getPhaseButtonProps(projectPhase);
                                        const phaseInitial = WorkflowProgressService.getPhaseInitials(projectPhase);
                                        const phaseColor = WorkflowProgressService.getPhaseColor(projectPhase);
                                        
                                        return (
                                          <div 
                                            className="w-5 h-5 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start"
                                            style={{ backgroundColor: phaseColor }}
                                          >
                                            {phaseInitial}
                                          </div>
                                        );
                                      } else {
                                        // No project - use orange T
                                        return (
                                          <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start">
                                            T
                                          </div>
                                        );
                                      }
                                    })()}
                                    
                                    <div className="flex-1 min-w-0">
                                      {/* Row 1: Project# or General | Customer | Subject */}
                                      <div className="flex items-center justify-between overflow-hidden relative">
                                        <div className="flex items-center min-w-0 flex-1">
                                          {/* Project Number or General - Fixed width for alignment */}
                                          {item.projectId && project ? (
                                            <button
                                              className="text-[9px] font-bold transition-colors hover:underline flex-shrink-0 text-blue-600 hover:text-blue-800"
                                              style={{ width: '46px', marginLeft: '-8px' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (onProjectSelect) {
                                                  onProjectSelect(project, 'Project Profile', null, 'Messages, Tasks, & Reminders');
                                                }
                                              }}
                                            >
                                              {projectNumber}
                                            </button>
                                          ) : (
                                            <span className="text-[9px] font-bold text-gray-600" style={{ width: '46px' }}>
                                              General
                                            </span>
                                          )}
                                          
                                          {/* Primary Customer - Only show if project exists */}
                                          {item.projectId && project && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-[9px] font-semibold transition-colors truncate text-gray-700 hover:text-gray-800" style={{ maxWidth: '80px' }}>
                                                {primaryCustomer}
                                              </span>
                                            </div>
                                          )}
                                          
                                          {/* Subject - Fixed position for perfect alignment */}
                                          <div style={{ position: 'absolute', left: '140px', width: '200px' }}>
                                            <span className="text-[9px] font-medium whitespace-nowrap text-gray-600" style={{ display: 'inline-block', verticalAlign: 'baseline', lineHeight: '1' }}>
                                              Subject: {subject}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Right side - Timestamp, Checkbox and actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          {/* Timestamp - moved to left of checkbox */}
                                          <span className="text-[8px] whitespace-nowrap text-gray-500">
                                            {new Date(item.timestamp).toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric'
                                            }) + ', ' + new Date(item.timestamp).toLocaleTimeString('en-US', {
                                              hour: 'numeric',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </span>
                                          
                                          {/* Checkbox - moved to where timestamp was */}
                                          <input
                                            type="checkbox"
                                            checked={isCompleted}
                                            onChange={() => handleTaskToggle(item.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                                          />
                                          
                                          {/* Task indicator - CLEARLY INDICATES IT IS A TASK */}
                                          <div className="flex flex-col items-center">
                                            <span className="text-[8px] font-bold text-orange-500">
                                              Task
                                            </span>
                                          </div>
                                          
                                          {/* Dropdown arrow - visual indicator only */}
                                          <div className={`p-1 rounded transition-colors transform duration-200 ${expandedMessages.has(item.id) ? 'rotate-180' : ''} text-gray-600`}>
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Row 2: From and To */}
                                      <div className="flex items-baseline justify-between gap-0 mt-0 overflow-hidden relative">
                                        <div className="flex items-baseline gap-0">
                                          {/* From - Fixed width container for consistent spacing */}
                                          <div className="flex-shrink-0" style={{ width: '100px', marginLeft: '0px' }}>
                                            <span className="text-[9px] font-medium whitespace-nowrap text-gray-600">
                                              From: {item.author}
                                            </span>
                                          </div>
                                          
                                          {/* To - Fixed position to match Subject exactly */}
                                          <div style={{ position: 'absolute', left: '140px', width: '200px' }}>
                                            <span className="text-[9px] font-medium whitespace-nowrap text-gray-600" style={{ display: 'inline-block', verticalAlign: 'baseline', lineHeight: '1' }}>
                                              To: {item.assignedTo || item.recipient || item.author}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Dropdown section - Task content when expanded */}
                                  {expandedMessages.has(item.id) && (
                                    <div className="px-3 py-3 border-t bg-gray-50 border-gray-200">
                                      <div className="space-y-3">
                                        {/* Task content */}
                                        {item.content && (
                                          <div className="text-sm text-gray-800 leading-relaxed bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            {item.content}
                                          </div>
                                        )}
                                        
                                        {/* Comments Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                          <h4 className="text-xs font-semibold text-gray-700 mb-2">Comments</h4>
                                          
                                          {/* Existing Comments */}
                                          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                                            {taskComments[item.id] && taskComments[item.id].length > 0 ? (
                                              taskComments[item.id].map(comment => (
                                                <div key={comment.id} className="bg-gray-50 p-2 rounded border border-gray-100">
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                      <p className="text-[10px] font-semibold text-gray-700">
                                                        Comment by: {comment.user}
                                                      </p>
                                                      <p className="text-xs text-gray-600 mt-1">
                                                        {comment.text}
                                                      </p>
                                                    </div>
                                                    <span className="text-[9px] text-gray-400 ml-2">
                                                      {new Date(comment.timestamp).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit'
                                                      })}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))
                                            ) : (
                                              <p className="text-xs text-gray-400 italic">No comments yet</p>
                                            )}
                                          </div>
                                          
                                          {/* Add Comment Form */}
                                          <div className="border-t border-gray-200 pt-2">
                                            <div className="flex gap-2">
                                              <input
                                                type="text"
                                                value={newCommentText[item.id] || ''}
                                                onChange={(e) => setNewCommentText(prev => ({
                                                  ...prev,
                                                  [item.id]: e.target.value
                                                }))}
                                                onKeyPress={(e) => {
                                                  if (e.key === 'Enter') {
                                                    handleAddComment(item.id);
                                                  }
                                                }}
                                                placeholder="Add a comment..."
                                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                              />
                                              <button
                                                onClick={() => handleAddComment(item.id)}
                                                disabled={!newCommentText[item.id]?.trim()}
                                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                                  newCommentText[item.id]?.trim()
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                              >
                                                Add
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Reminders Tab - Matching Tasks Tab Format */}
              {activeCommTab === 'reminders' && (
                (() => {
                  const reminderItems = activityFeedItems
                    .filter(i => i.type === 'reminder')
                    .filter(i => !remindersProjectFilter || String(i.projectId) === String(remindersProjectFilter))
                    .filter(i => {
                      if (!remindersUserFilter) return true;
                      const uid = String(remindersUserFilter);
                      const isRecipient = Array.isArray(i.recipients) && (i.recipients.includes('all') || i.recipients.some(r => String(r) === uid));
                      const isAuthor = i.authorId && String(i.authorId) === uid;
                      return isRecipient || isAuthor;
                    });

                  if (reminderItems.length === 0) {
                    return (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No reminders found</h3>
                        <p className="text-gray-500">Reminders you create or receive will appear here</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {reminderItems.map(item => {
                        const project = projects?.find(p => String(p.id) === String(item.projectId));
                        const projectNumber = project?.projectNumber || item.projectNumber || null;
                        const primaryCustomer = project?.customer?.primaryName || project?.customer?.name || project?.client?.name || project?.clientName || project?.projectName || item.projectName || 'Unknown Customer';
                        const subject = item.subject || item.title || 'Reminder';
                        const author = availableUsers.find(u => String(u.id) === String(item.authorId)) || { firstName: 'System', lastName: 'Admin' };
                        const recipients = Array.isArray(item.recipients) ? 
                          item.recipients.map(id => {
                            if (id === 'all') return { firstName: 'All', lastName: 'Users', isAll: true };
                            return availableUsers.find(u => String(u.id) === String(id));
                          }).filter(Boolean) : [];
                        
                        // Format timestamp for display
                        const formatTimeAgo = (timestamp) => {
                          const now = new Date();
                          const date = new Date(timestamp);
                          const diffMs = now - date;
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMs / 3600000);
                          const diffDays = Math.floor(diffMs / 86400000);
                          
                          if (diffMins < 1) return 'Just now';
                          if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
                          if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                          if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
                        };
                        
                        return (
                          <div key={item.id} className="bg-white hover:bg-gray-50 border-gray-200 rounded-[12px] shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer">
                            {/* Main reminder header - Compact 2-row layout matching tasks exactly */}
                            <div 
                              className="flex items-center gap-1.5 p-1.5"
                              onClick={() => handleToggleMessage(item.id)}
                            >
                              {/* Phase Circle - Dynamic based on project association */}
                              {(() => {
                                // Check if reminder is tied to a project
                                const isProjectReminder = item.projectId && project;
                                
                                if (isProjectReminder) {
                                  // Get project phase and colors
                                  const projectPhase = WorkflowProgressService.getProjectPhase(project);
                                  const phaseInitial = WorkflowProgressService.getPhaseInitials(projectPhase);
                                  const phaseColor = WorkflowProgressService.getPhaseColor(projectPhase);
                                  
                                  return (
                                    <div 
                                      className="w-5 h-5 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start"
                                      style={{ backgroundColor: phaseColor }}
                                    >
                                      {phaseInitial}
                                    </div>
                                  );
                                } else {
                                  // No project - use orange R for reminder
                                  return (
                                    <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start">
                                      R
                                    </div>
                                  );
                                }
                              })()}
                              
                              <div className="flex-1 min-w-0">
                                {/* Row 1: Project# or General | Customer | Subject */}
                                <div className="flex items-center justify-between overflow-hidden relative">
                                  <div className="flex items-center min-w-0 flex-1">
                                    {/* Project Number or General Reminder - Fixed width for alignment */}
                                    {item.projectId && project ? (
                                      <button
                                        className="text-[9px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex-shrink-0"
                                        style={{ width: '46px' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onProjectSelect) {
                                            onProjectSelect(project, 'Project Profile', null, 'Messages, Tasks, & Reminders');
                                          }
                                        }}
                                      >
                                        {projectNumber ? `#${String(projectNumber).padStart(5, '0')}` : '#00000'}
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-bold text-gray-600" style={{ width: '46px' }}>
                                        General
                                      </span>
                                    )}
                                    
                                    {/* Customer Name and Subject - Dynamic width */}
                                    <div className="flex items-center min-w-0 flex-1 mx-1.5">
                                      {item.projectId && project && (
                                        <>
                                          <span className="text-[9px] font-bold text-gray-700 truncate flex-shrink-0" style={{ maxWidth: '120px' }}>
                                            {primaryCustomer}
                                          </span>
                                          <span className="mx-1.5 text-[9px] text-gray-400 flex-shrink-0">|</span>
                                        </>
                                      )}
                                      <span className="text-[9px] font-semibold text-gray-800 truncate flex-1">
                                        Subject: {subject}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Type indicator - Far right */}
                                  <span className="text-[8px] font-bold text-orange-600 uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded flex-shrink-0 ml-2">
                                    Reminder
                                  </span>
                                </div>
                                
                                {/* Row 2: From/To, Timestamp and Checkbox */}
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex items-center gap-3 text-[8px] text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">From:</span>
                                      <span className="font-semibold text-gray-700">
                                        {author.firstName} {author.lastName}
                                      </span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">To:</span>
                                      <span className="font-semibold text-gray-700">
                                        {recipients.length > 0 ? (
                                          recipients[0].isAll ? 'All Users' : `${recipients[0].firstName} ${recipients[0].lastName}`
                                        ) : 'No recipients'}
                                        {recipients.length > 1 && !recipients[0].isAll && (
                                          <span className="text-[7px] bg-orange-100 text-orange-700 px-1 py-0.5 rounded-full font-medium ml-1">
                                            +{recipients.length - 1}
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {/* Timestamp - moved to left of checkbox, using same format as Tasks tab */}
                                    <span className="text-[8px] whitespace-nowrap text-gray-500">
                                      {new Date(item.timestamp).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric'
                                      }) + ', ' + new Date(item.timestamp).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                    {/* Checkbox for marking reminder as completed */}
                                    <input
                                      type="checkbox"
                                      checked={completedTasks.has(item.id)}
                                      onChange={() => handleTaskToggle(item.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Expand/Collapse icon */}
                              <div className="flex-shrink-0 self-start">
                                {expandedMessages.has(item.id) ? (
                                  <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                                ) : (
                                  <ChevronLeftIcon className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                            </div>
                            
                            {/* Expanded content */}
                            {expandedMessages.has(item.id) && (
                              <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                                {/* Reminder content */}
                                {item.content && (
                                  <div className="mb-3">
                                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                      {item.content}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Comments Section */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[10px] font-semibold text-gray-700">Comments</h4>
                                    <button 
                                      onClick={() => setShowCommentInput(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                      className="text-[9px] text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                      {showCommentInput[item.id] ? 'Cancel' : 'Add Comment'}
                                    </button>
                                  </div>
                                  
                                  {/* Comments list */}
                                  {reminderComments[item.id] && reminderComments[item.id].length > 0 && (
                                    <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                                      {reminderComments[item.id].map((comment, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded p-2">
                                          <div className="flex items-center gap-1 mb-1">
                                            <span className="text-[9px] font-semibold text-gray-700">
                                              Comment by: {comment.userName || 'Unknown User'}
                                            </span>
                                            <span className="text-[8px] text-gray-500">
                                              • {formatTimeAgo(comment.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-gray-600">{comment.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Comment input */}
                                  {showCommentInput[item.id] && (
                                    <div className="mt-2">
                                      <textarea
                                        value={commentInputs[item.id] || ''}
                                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        placeholder="Type your comment here..."
                                        className="w-full px-2 py-1 text-[10px] border border-gray-200 rounded resize-none focus:outline-none focus:border-blue-400"
                                        rows={2}
                                      />
                                      <div className="flex justify-end gap-1 mt-1">
                                        <button
                                          onClick={() => {
                                            setShowCommentInput(prev => ({ ...prev, [item.id]: false }));
                                            setCommentInputs(prev => ({ ...prev, [item.id]: '' }));
                                          }}
                                          className="px-2 py-1 text-[9px] text-gray-600 hover:text-gray-700 font-medium"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleAddReminderComment(item.id)}
                                          disabled={!commentInputs[item.id]?.trim()}
                                          className="px-2 py-1 text-[9px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                                        >
                                          Post Comment
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Action buttons */}
                                {onProjectSelect && item.projectId && project && (
                                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onProjectSelect) {
                                          onProjectSelect(project, 'Project Profile', null, 'Messages, Tasks, & Reminders');
                                        }
                                      }}
                                      className="text-[8px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                    >
                                      View Project
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
        </div>
          </div>
        </div>

        {/* Project Workflow Line Items - Now positioned below Messages, Tasks, and Reminders */}
        <div className="w-full mb-6" data-section="project-workflow-tasks">
          {/* Beautiful original alerts UI with new functionality */}
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                    Project Workflow Line Items
                  </h2>
                  {expandedAlerts.size > 0 && (
                    <p className="text-sm text-gray-600 font-medium">
                      {expandedAlerts.size} of {getPaginatedAlerts().length} alert{getPaginatedAlerts().length !== 1 ? 's' : ''} expanded
                    </p>
                  )}
                </div>
              </div>
              
              {/* Filter Controls with Expand/Collapse Controls */}
              <div className="flex items-center justify-between gap-2 mb-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Filter by:</span>
                  <select 
                    value={alertProjectFilter} 
                    onChange={(e) => setAlertProjectFilter(e.target.value)} 
                    className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[120px]"
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
                    className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[100px]"
                  >
                    <option value="all">All Roles</option>
                    <option value="PM">Project Manager</option>
                    <option value="FIELD">Field Director</option>
                    <option value="OFFICE">Office Staff</option>
                    <option value="ADMIN">Administration</option>
                  </select>
                </div>
                
                {/* Condensed Expand/Collapse Controls - Right side */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={forceRefreshAlerts}
                    className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    title="Refresh alerts"
                  >
                    🔄
                  </button>
                  <button
                    onClick={handleExpandAllAlerts}
                    className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                    expandedAlerts.size === getPaginatedAlerts().length && getPaginatedAlerts().length > 0
                      ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow'
                      : 'bg-white/80 text-brand-600 border-gray-200 hover:bg-white hover:border-brand-300 hover:shadow-soft'
                  }`}
                  title="Expand all alert details"
                  disabled={getPaginatedAlerts().length === 0 || expandedAlerts.size === getPaginatedAlerts().length}
                >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </button>
                
                  <button
                    onClick={handleCollapseAllAlerts}
                    className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                    expandedAlerts.size === 0 || getPaginatedAlerts().length === 0
                      ? 'bg-orange-500 text-white border-orange-500 shadow-accent-glow'
                      : 'bg-white/80 text-orange-600 border-gray-200 hover:bg-white hover:border-orange-300 hover:shadow-soft'
                  }`}
                  title="Collapse all alert details"
                  disabled={getPaginatedAlerts().length === 0 || expandedAlerts.size === 0}
                >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </div>
              
            </div>
            
            {/* Horizontal line to match Project Messages alignment */}
            <div className={`border-t mb-3 mt-0 ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
            
            <div className="space-y-2 mt-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
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
                  const project = projects?.find(p => String(p.id) === String(projectId) || String(p._id) === String(projectId));
                  
                  // Alert details
                  const alertTitle = actionData.stepName || alert.title || 'Unknown Alert';
                  const isExpanded = expandedAlerts.has(alertId);
                  
                  // Get proper section and line item from alert metadata (already correct from backend)
                  const sectionName = actionData.section || 'Unknown Section';
                  const lineItemName = actionData.lineItem || 'Unknown Line Item';
                  
                  // Get user group from alert's responsible role
                  const getUserGroupFromAlert = (alert) => {
                    const role = alert.responsibleRole || alert.metadata?.responsibleRole || 'OFFICE';
                    return formatUserRole(String(role));
                  };
                  
                  const correctUserGroup = getUserGroupFromAlert(alert);
                  // Determine project type from alert payload with reliable fallbacks
                  const projectTypeRaw = alert.projectType 
                    || alert.relatedProject?.projectType 
                    || actionData.projectType 
                    || project?.projectType;
                  
                  // Use WorkflowProgressService for consistent phase colors and initials
                  const getPhaseProps = (phase) => {
                    return WorkflowProgressService.getPhaseButtonProps(phase || 'LEAD');
                  };
                  return (
                    <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-[12px] shadow-sm border transition-all duration-200 cursor-pointer`}>
                      {/* Alert header - ENTIRE AREA CLICKABLE FOR DROPDOWN */}
                      <div 
                        className="flex flex-col gap-0 px-1.5 py-1 hover:bg-opacity-80 transition-colors cursor-pointer"
                        onClick={() => toggleAlertExpansion(alertId)}
                      >
                        {/* First Row - Project# | Customer ▼ | PM ▼ | UserGroup | Arrow - More spaced out */}
                        <div className="flex items-center justify-between gap-3">
                          {/* Phase Circle - Smaller */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-5 h-5 ${getPhaseProps(phase).bgColor} rounded-full flex items-center justify-center ${getPhaseProps(phase).textColor} font-bold text-[9px] shadow-sm`}>
                              {getPhaseProps(phase).initials}
                            </div>
                            {priority === 'high' && (
                              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
                            )}
                          </div>
                          
                          {/* Left Section: Project# | Customer | PM - Fixed positioning */}
                          <div className="flex items-center text-[9px] flex-1">
                              {/* Project Number as blue clickable link */}
                              <button 
                                className={`font-bold flex-shrink-0 hover:underline ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-700 hover:text-blue-900'}`}
                                style={{ width: '50px', textAlign: 'left' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (project && onProjectSelect) {
                                    // Ensure navigation state tracks Current Alerts correctly
                                    const projectWithScrollId = {
                                      ...project,
                                      scrollToProjectId: String(project.id),
                                      navigationSource: 'Project Workflow Line Items',
                                      returnToSection: 'project-workflow-tasks'
                                    };
                                    console.log('🎯 PROJECT NUMBER CLICK: Navigating from Project Workflow Line Items to Profile');
                                    handleProjectSelectWithScroll(projectWithScrollId, 'Profile', null, 'Project Workflow Line Items');
                                  }
                                }}
                                title={`Go to project #${project?.projectNumber || actionData.projectNumber || 'N/A'}`}
                              >
                                {project?.projectNumber || actionData.projectNumber || '12345'}
                              </button>
                              
                              {/* Customer with dropdown arrow - Made smaller */}
                              <div className="flex items-center gap-1 flex-shrink-0" style={{width: '100px', marginLeft: '0px'}}>
                                <button 
                                  ref={(el) => alertContactButtonRefs.current[alertId] = el}
                                  className={`text-[9px] font-semibold cursor-pointer hover:underline ${
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
                                  {project?.customer?.name || project?.clientName || project?.name || 'Customer'}
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
                                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                              
                              {/* PM with dropdown arrow - align baseline with Line Item label */}
                              <div className="flex items-center gap-1 flex-shrink-0" style={{ marginLeft: '8px' }}>
                                <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>PM:</span>
                                <button 
                                  ref={(el) => alertPmButtonRefs.current[alertId] = el}
                                  className={`text-[8px] font-semibold cursor-pointer hover:underline truncate max-w-[60px] ${
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
                                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {/* Right Section: Project Type Tag & Arrow */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {projectTypeRaw && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border max-w-[140px] whitespace-nowrap truncate ${
                                    colorMode ? getProjectTypeColorDark(projectTypeRaw) : getProjectTypeColor(projectTypeRaw)
                                  }`}
                                  title={`Project Type: ${formatProjectType(projectTypeRaw)}`}
                                >
                                  {formatProjectType(projectTypeRaw)}
                                </span>
                              )}
                              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Second Row - Section and Line Item */}
                        <div className="flex items-center text-[9px]" style={{ marginTop: '-2px', marginLeft: '32px' }}>
                          {/* Section label and value - properly aligned */}
                          <div className="flex items-center" style={{ width: '150px' }}>
                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '4px' }}>Section:</span>
                            <span className={`font-semibold truncate ${colorMode ? 'text-gray-200' : 'text-gray-700'}`} style={{ marginLeft: '4px' }}>
                              {sectionName || 'Unknown Section'}
                            </span>
                          </div>
                          
                          {/* Line Item - properly aligned */}
                          <div className="flex items-center flex-shrink-0 ml-2">
                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '8px' }}>Line Item:</span>
                            <span 
                                className={`font-semibold cursor-pointer hover:underline max-w-[120px] truncate ${
                                  colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-brand-600 hover:text-brand-800'
                                }`}
                                style={{ marginLeft: '4px' }}
                                title={lineItemName || 'Unknown Line Item'}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (project && onProjectSelect) {
                                    console.log('🎯 ALERTS CLICK: Starting alert line item navigation');
                                    console.log('🎯 ALERTS CLICK: Project:', project.name);
                                    console.log('🎯 ALERTS CLICK: Phase:', phase);
                                    console.log('🎯 ALERTS CLICK: Section:', sectionName);
                                    console.log('🎯 ALERTS CLICK: Line Item:', lineItemName);
                                    
                                    try {
                                      // EXACT SAME API CALL AS WORKING WORKFLOW BUTTON
                                      const response = await api.get(`/workflow-data/project-position/${project.id}`);
                                      
                                      if (response.data) {
                                        const result = response.data;
                                        if (result.success && result.data) {
                                          const position = result.data;
                                          
                                          // EXACT SAME LOGIC AS WORKING WORKFLOW BUTTON
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
                                                  const currentPhaseData = workflowResult.data.find(phase => phase.id === position.currentPhase);
                                                  if (currentPhaseData) {
                                                    // Find the current section
                                                    const currentSectionData = currentPhaseData.items.find(item => item.id === position.currentSection);
                                                    if (currentSectionData) {
                                                      // Find the subtask index by matching the current line item name
                                                      const subtaskIndex = currentSectionData.subtasks.findIndex(subtask => {
                                                        if (typeof subtask === 'object') {
                                                          return subtask.id === position.currentLineItem || subtask.label === position.currentLineItemName;
                                                        }
                                                        return subtask === position.currentLineItemName;
                                                      });
                                                      return subtaskIndex >= 0 ? subtaskIndex : 0;
                                                    }
                                                  }
                                                }
                                              }
                                            } catch (error) {
                                              console.warn('Could not determine subtask index:', error);
                                            }
                                            return 0; // Default fallback
                                          };
                                          
                                           const subtaskIndex = await getSubtaskIndex();
                                           // Prefer DB step id from alert metadata when present; fallback to composite
                                           const targetLineItemId = actionData.stepId || actionData.lineItemId || `${position.currentPhase}-${position.currentSection}-${subtaskIndex}`;
                                           const targetSectionId = actionData.sectionId || position.currentSection;
                                          
                                          console.log('🎯 ALERTS CLICK: Generated targetLineItemId:', targetLineItemId);
                                          console.log('🎯 ALERTS CLICK: Generated targetSectionId:', targetSectionId);
                                          
                                          const projectWithNavigation = {
                                            ...project,
                                            highlightStep: lineItemName,
                                            highlightLineItem: lineItemName,
                                            targetPhase: phase,
                                            targetSection: sectionName,
                                            targetLineItem: lineItemName,
                                            scrollToCurrentLineItem: true,
                                            alertPhase: phase,
                                            // Enhanced navigation target with unique identifiers
                                            navigationTarget: {
                                              nonce: Date.now(),
                                              phase: phase,
                                              section: sectionName,
                                              lineItem: lineItemName,
                                              stepName: lineItemName,
                                              alertId: alertId,
                                              lineItemId: actionData.stepId || actionData.lineItemId || alert.stepId,
                                              workflowId: actionData.workflowId || alert.workflowId,
                                              highlightMode: 'line-item',
                                              scrollBehavior: 'smooth',
                                              // Prefer DB id if available
                                              targetElementId: `lineitem-${targetLineItemId}`,
                                              highlightColor: '#0066CC',
                                              highlightDuration: 3000,
                                              targetSectionId: targetSectionId,
                                              expandPhase: true,
                                              expandSection: true,
                                              autoOpen: true
                                            }
                                          };
                                          
                                          // Enhanced navigation with comprehensive state tracking for Project Workflow Line Items
                                          console.log('🎯 LINE ITEM CLICK: Navigating from Project Workflow Line Items to Workflow with targeting');
                                          console.log('🎯 LINE ITEM CLICK: targetLineItemId:', targetLineItemId);
                                          console.log('🎯 LINE ITEM CLICK: targetSectionId:', targetSectionId);
                                          console.log('🎯 LINE ITEM CLICK: position data:', position);
                                          
                                          // Ensure project has all navigation metadata for proper back button behavior
                                          projectWithNavigation.navigationSource = 'Project Workflow Tasks';
                                          projectWithNavigation.returnToSection = 'project-workflow-tasks';
                                          projectWithNavigation.highlightTarget = {
                                            lineItemId: targetLineItemId,
                                            sectionId: targetSectionId,
                                            phaseId: position.currentPhase,
                                            autoOpen: true,
                                            scrollAndHighlight: true
                                          };
                                          
                                          // Use the enhanced navigation system with precise targeting (matching workflow button)
                                          handleProjectSelectWithScroll(
                                            projectWithNavigation, 
                                            'Project Workflow', 
                                            null, 
                                            'Project Workflow Line Items',
                                            targetLineItemId,
                                            targetSectionId
                                          );
                                        } else {
                                          console.warn('🎯 ALERTS CLICK: No position data found, using fallback navigation');
                                          // Fallback to enhanced static navigation with Project Workflow Line Items tracking
                                          const projectWithStepInfo = {
                                            ...project,
                                            highlightStep: lineItemName,
                                            highlightLineItem: lineItemName,
                                            targetPhase: phase,
                                            targetSection: sectionName,
                                            targetLineItem: lineItemName,
                                            scrollToCurrentLineItem: true,
                                            alertPhase: phase,
                                            navigationSource: 'Project Workflow Line Items',
                                            returnToSection: 'project-workflow-tasks',
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
                                              targetElementId: `lineitem-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                              highlightColor: '#0066CC',
                                              highlightDuration: 3000,
                                              autoOpen: true,
                                              scrollAndHighlight: true
                                            }
                                          };
                                          handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Project Workflow Tasks');
                                        }
                                      } else {
                                        console.error('🎯 ALERTS CLICK: Failed to get project position, using fallback navigation');
                                        // Fallback to basic navigation with Project Workflow Line Items source tracking
                                        const projectWithStepInfo = {
                                          ...project,
                                          highlightStep: lineItemName,
                                          highlightLineItem: lineItemName,
                                          targetPhase: phase,
                                          targetSection: sectionName,
                                          targetLineItem: lineItemName,
                                          scrollToCurrentLineItem: true,
                                          alertPhase: phase,
                                          navigationSource: 'Project Workflow Line Items',
                                          returnToSection: 'project-workflow-tasks',
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
                                            targetElementId: `lineitem-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                            highlightColor: '#0066CC',
                                            highlightDuration: 3000,
                                            autoOpen: true,
                                            scrollAndHighlight: true
                                          }
                                        };
                                        handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Project Workflow Tasks');
                                      }
                                    } catch (error) {
                                      console.error('🎯 ALERTS CLICK: Error getting project position:', error);
                                      // Fallback to basic navigation
                                      const projectWithStepInfo = {
                                        ...project,
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
                                          targetElementId: `lineitem-${lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                          highlightColor: '#0066CC',
                                          highlightDuration: 3000
                                        }
                                      };
                                      handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Project Workflow Tasks');
                                    }
                                  }
                                }}
                              >
                                {lineItemName}
                              </span>
                          </div>
                        </div>
                        
                        
                      
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
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-brand-500 hover:from-blue-600 hover:to-blue-700 hover:border-blue-600 shadow-sm hover:shadow-md'
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
                          
                          {/* Note Box */}
                          <div className="mt-3">
                            <label className={`block text-[9px] font-medium mb-1 ${
                              colorMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Add Note:
                            </label>
                            <textarea
                              placeholder="Enter a note for this alert..."
                              rows={2}
                              value={alertNotes[alertId] || ''}
                              className={`w-full p-2 text-[9px] border rounded resize-none transition-colors ${
                                colorMode 
                                  ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-blue-500' 
                                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-blue-500'
                              }`}
                              onChange={(e) => {
                                setAlertNotes(prev => ({
                                  ...prev,
                                  [alertId]: e.target.value
                                }));
                              }}
                            />
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

        {/* Right Column - Activity Feed only */}
        <div className="w-full" data-section="activity-feed">
          {/* Activity Feed */}
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible mb-6">
            <div className="mb-3">
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">Activity Feed</h2>
            </div>
            {/* Simple Filters */}
            <div className="flex items-center gap-2 mb-3">
              <select
                value={activityProjectFilter}
                onChange={(e) => setActivityProjectFilter(e.target.value)}
                className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[120px]"
              >
                <option value="">All Projects</option>
                {(projects || []).map(p => (
                  <option key={p.id} value={p.id}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
                ))}
              </select>
              <select
                value={activityTypeFilter || ''}
                onChange={(e) => setActivityTypeFilter(e.target.value)}
                className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[120px]"
              >
                <option value="">All Types</option>
                <option value="message">Messages</option>
                <option value="task">Tasks</option>
                <option value="reminder">Reminders</option>
              </select>
            </div>
            {/* Feed List - EXACT SAME AS RESPECTIVE SECTIONS */}
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1 custom-scrollbar">
              {activityFeedItems
                .filter(item => !activityProjectFilter || String(item.projectId) === String(activityProjectFilter))
                .filter(item => !activityTypeFilter || item.type === activityTypeFilter)
                .map(item => {
                  if (item.type === 'message') {
                    // EXACT SAME AS MESSAGES TAB
                    return (
                      <ProjectMessagesCard 
                        key={item.id} 
                        activity={{
                          ...item,
                          id: item.id,
                          projectId: item.projectId,
                          projectName: item.projectName,
                          subject: item.subject,
                          description: item.description || item.content,
                          user: item.user,
                          timestamp: item.timestamp,
                          type: item.type,
                          priority: item.priority,
                          recipients: item.recipients
                        }}
                        onProjectSelect={handleProjectSelectWithScroll}
                        projects={projects}
                        colorMode={colorMode}
                        useRealData={true}
                        onQuickReply={handleQuickReply}
                        isExpanded={expandedMessages.has(item.id)}
                        onToggleExpansion={handleToggleMessage}
                        sourceSection="Activity Feed"
                      />
                    );
                  } else if (item.type === 'task') {
                    // EXACT SAME AS TASKS TAB
                    const isCompleted = completedTasks.has(item.id);
                    const project = projects?.find(p => p.id === item.projectId);
                    const projectNumber = project?.projectNumber || item.projectNumber || '12345';
                    const primaryCustomer = project?.customer?.primaryName || project?.client?.name || project?.clientName || project?.projectName || item.projectName || 'Primary Customer';
                    const subject = item.subject || 'Task';
                    
                    return (
                      <div key={item.id} className={`bg-white hover:bg-gray-50 border-gray-200 rounded-[12px] shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer ${isCompleted ? 'opacity-75' : ''}`}>
                        {/* Main task header - Compact 2-row layout - EXACT SAME AS MESSAGES */}
                        <div 
                          className="flex items-center gap-1.5 p-1.5"
                          onClick={() => handleToggleMessage(item.id)}
                        >
                          {/* Checkbox - TOP LEFT CORNER */}
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleTaskToggle(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0 self-start"
                          />
                          
                          {/* Phase Circle - Dynamic based on project association */}
                          {(() => {
                            // Check if task is tied to a project
                            const isProjectTask = item.projectId && project;
                            
                            if (isProjectTask) {
                              // Get project phase and colors
                              const projectPhase = WorkflowProgressService.getProjectPhase(project);
                              const phaseProps = WorkflowProgressService.getPhaseButtonProps(projectPhase);
                              const phaseInitial = WorkflowProgressService.getPhaseInitials(projectPhase);
                              const phaseColor = WorkflowProgressService.getPhaseColor(projectPhase);
                              
                              return (
                                <div 
                                  className="w-5 h-5 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start"
                                  style={{ backgroundColor: phaseColor }}
                                >
                                  {phaseInitial}
                                </div>
                              );
                            } else {
                              // No project - use orange T
                              return (
                                <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start">
                                  T
                                </div>
                              );
                            }
                          })()}
                          
                          <div className="flex-1 min-w-0">
                            {/* Row 1: Project# or General | Customer | Subject */}
                            <div className="flex items-center justify-between overflow-hidden relative">
                              <div className="flex items-center min-w-0 flex-1">
                                {/* Project Number or General - Fixed width for alignment */}
                                {item.projectId && project ? (
                                  <button
                                    className="text-[9px] font-bold transition-colors hover:underline flex-shrink-0 text-blue-600 hover:text-blue-800"
                                    style={{ width: '46px', marginLeft: '-8px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onProjectSelect) {
                                        onProjectSelect(project, 'Project Profile', null, 'Activity Feed');
                                      }
                                    }}
                                  >
                                    {projectNumber}
                                  </button>
                                ) : (
                                  <span className="text-[9px] font-bold text-gray-600" style={{ width: '46px' }}>
                                    General
                                  </span>
                                )}
                                
                                {/* Primary Customer - Only show if project exists */}
                                {item.projectId && project && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-semibold transition-colors truncate text-gray-700 hover:text-gray-800" style={{ maxWidth: '80px' }}>
                                      {primaryCustomer}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Subject - Fixed position for perfect alignment */}
                                <div style={{ position: 'absolute', left: '140px', width: '200px' }}>
                                  <span className="text-[9px] font-medium whitespace-nowrap text-gray-600" style={{ display: 'inline-block', verticalAlign: 'baseline', lineHeight: '1' }}>
                                    Subject: {subject}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Right side - Task indicator and actions */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {/* Task indicator - CLEARLY INDICATES IT IS A TASK */}
                                <div className="flex flex-col items-center">
                                  <div className="w-3 h-3 bg-blue-500 rounded-sm flex items-center justify-center">
                                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <span className="text-[7px] font-bold text-blue-600 mt-0.5">TASK</span>
                                </div>
                                
                                {/* Expand/Collapse Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleMessage(item.id);
                                  }}
                                  className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                >
                                  <svg className={`w-3 h-3 transition-transform duration-200 ${expandedMessages.has(item.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {/* Row 2: From/To and Timestamp - EXACT SAME AS MESSAGES */}
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-3 text-[8px] text-gray-500">
                                <span>From: <span className="font-semibold text-gray-700">{item.author || 'System'}</span></span>
                                {item.attendees && item.attendees.length > 0 && (
                                  <span>To: <span className="font-semibold text-gray-700">
                                    {item.attendees.length === 1 ? 
                                      (availableUsers.find(u => String(u.id) === String(item.attendees[0]))?.firstName || 'User') : 
                                      `${item.attendees.length} users`
                                    }
                                  </span></span>
                                )}
                              </div>
                              <div className="text-[8px] text-gray-500">
                                {new Date(item.timestamp).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Content - EXACT SAME AS MESSAGES */}
                        {expandedMessages.has(item.id) && (
                          <div className="px-2 pb-2 border-t border-gray-100">
                            <div className="pt-2">
                              {item.content && (
                                <p className="text-[9px] text-gray-600 leading-relaxed mb-2">
                                  {item.content}
                                </p>
                              )}
                              
                              {/* Task Actions */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskToggle(item.id);
                                  }}
                                  className={`text-[8px] font-medium px-2 py-1 rounded transition-colors ${
                                    isCompleted 
                                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                  }`}
                                >
                                  {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                                </button>
                                
                                {item.projectId && project && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onProjectSelect) {
                                        onProjectSelect(project, 'Project Profile', null, 'Activity Feed');
                                      }
                                    }}
                                    className="text-[8px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                  >
                                    View Project
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else if (item.type === 'reminder') {
                    // EXACT SAME AS REMINDERS TAB - Compact format
                    const project = projects?.find(p => String(p.id) === String(item.projectId));
                    const projectNumber = project?.projectNumber || item.projectNumber || null;
                    const primaryCustomer = project?.customer?.primaryName || project?.customer?.name || project?.client?.name || project?.clientName || project?.projectName || item.projectName || 'Unknown Customer';
                    const subject = item.subject || item.title || 'Reminder';
                    
                    return (
                      <div key={item.id} className="bg-white hover:bg-gray-50 border-gray-200 rounded-[12px] shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer">
                        {/* Main reminder header - Compact 2-row layout matching tasks exactly */}
                        <div 
                          className="flex items-center gap-1.5 p-1.5"
                          onClick={() => handleToggleMessage(item.id)}
                        >
                          {/* Phase Circle - Dynamic based on project association */}
                          {(() => {
                            // Check if reminder is tied to a project
                            const isProjectReminder = item.projectId && project;
                            
                            if (isProjectReminder) {
                              // Get project phase and colors
                              const projectPhase = WorkflowProgressService.getProjectPhase(project);
                              const phaseInitial = WorkflowProgressService.getPhaseInitials(projectPhase);
                              const phaseColor = WorkflowProgressService.getPhaseColor(projectPhase);
                              
                              return (
                                <div 
                                  className="w-5 h-5 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start"
                                  style={{ backgroundColor: phaseColor }}
                                >
                                  {phaseInitial}
                                </div>
                              );
                            } else {
                              // No project - use orange R for reminder
                              return (
                                <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start">
                                  R
                                </div>
                              );
                            }
                          })()}
                          
                          <div className="flex-1 min-w-0">
                            {/* Row 1: Project# or General | Customer | Subject */}
                            <div className="flex items-center justify-between overflow-hidden relative">
                              <div className="flex items-center min-w-0 flex-1">
                                {/* Project Number or General Reminder - Fixed width for alignment */}
                                {item.projectId && project ? (
                                  <button
                                    className="text-[9px] font-bold transition-colors hover:underline flex-shrink-0 text-blue-600 hover:text-blue-800"
                                    style={{ width: '46px', marginLeft: '-8px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onProjectSelect) {
                                        onProjectSelect(project, 'Project Profile', null, 'Activity Feed');
                                      }
                                    }}
                                  >
                                    {projectNumber}
                                  </button>
                                ) : (
                                  <span className="text-[9px] font-bold text-gray-600" style={{ width: '46px' }}>
                                    General
                                  </span>
                                )}
                                
                                {/* Primary Customer */}
                                <div className="flex items-center gap-1">
                                  <span 
                                    className="text-[9px] font-semibold text-gray-700 truncate"
                                    style={{ maxWidth: '80px' }}
                                    title={primaryCustomer}
                                  >
                                    {primaryCustomer}
                                  </span>
                                </div>
                                
                                {/* Subject - Fixed position for perfect alignment */}
                                <div style={{ position: 'absolute', left: '140px', width: '200px' }}>
                                  <span 
                                    className="text-[9px] font-medium text-gray-600 whitespace-nowrap"
                                    style={{ 
                                      display: 'inline-block',
                                      verticalAlign: 'baseline',
                                      lineHeight: '1'
                                    }}
                                  >
                                    Subject: {subject}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Right side - Reminder indicator and actions */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {/* Clock icon for reminders */}
                                <div className="flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                
                                {/* Dropdown arrow */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleMessage(item.id);
                                  }}
                                  className="p-1 rounded transition-colors text-gray-600 hover:bg-gray-200"
                                  title={expandedMessages.has(item.id) ? "Collapse reminder" : "Expand reminder"}
                                >
                                  <svg className={`w-2.5 h-2.5 transform duration-200 ${expandedMessages.has(item.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {/* Row 2: From, To, and Timestamp */}
                            <div className="flex items-baseline justify-between gap-0 mt-0 overflow-hidden relative">
                              <div className="flex items-baseline gap-0">
                                {/* From - Fixed width container for consistent spacing */}
                                <div 
                                  className="flex-shrink-0"
                                  style={{ width: '100px', marginLeft: '8px' }}
                                >
                                  <span className="text-[9px] font-medium text-gray-600 whitespace-nowrap">
                                    From: {item.author || 'System'}
                                  </span>
                                </div>
                                
                                {/* To - Fixed position to match Subject exactly */}
                                <div style={{ position: 'absolute', left: '140px', width: '200px' }}>
                                  <span 
                                    className="text-[9px] font-medium text-gray-600 whitespace-nowrap"
                                    style={{ 
                                      display: 'inline-block',
                                      verticalAlign: 'baseline',
                                      lineHeight: '1'
                                    }}
                                  >
                                    To: All Users
                                  </span>
                                </div>
                              </div>
                              
                              {/* Timestamp - Far right */}
                              <div className="flex-shrink-0">
                                <span className="text-[8px] text-gray-500 whitespace-nowrap">
                                  {(() => {
                                    const date = new Date(item.timestamp);
                                    return date.toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric'
                                    }) + ', ' + date.toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expandable content (if needed) */}
                        {expandedMessages.has(item.id) && item.content && (
                          <div className="px-3 py-2 border-t bg-gray-50 border-gray-200">
                            <div className="text-[8px] text-gray-700">
                              {item.content}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return null;
                })}
              {activityFeedItems.length === 0 && (
                <div className="text-gray-400 text-center py-3 text-sm">No activity yet.</div>
              )}

            </div>
          </div>
        </div>
      </div>


      {/* Project Cubes - Quick Access (hidden) */}
      <div className="hidden" data-section="project-cubes" aria-hidden="true"></div>
      
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
                    {user.firstName} {user.lastName || ''} {user.lastName ? '' : `(${user.email})`} ({user.role || 'User'})
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
      
      {/* Draggable Contact Popups */}
      {Array.from(expandedContacts).map(projectId => {
        const project = projects?.find(p => p.id === projectId);
        if (!project) return null;
        
        return (
          <DraggablePopup
            key={`contact-${projectId}`}
            isOpen={true}
            onClose={() => toggleContact(projectId)}
            colorMode={colorMode}
            triggerRef={contactButtonRefs.current[projectId] ? { current: contactButtonRefs.current[projectId] } : null}
          >
            <div className="space-y-3">
              <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                {project.client?.name || project.clientName || 'Primary Contact'}
              </div>
              <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} flex items-start gap-2`}>
                <span>📍</span>
                <span>{project.client?.address || project.clientAddress || project.address || '123 Main Street, City, State 12345'}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📞</span>
                  <a 
                    href={`tel:${project.client?.phone || ''}`}
                    className={`text-sm hover:underline ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                  >
                    {project.client?.phone || 'No phone'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✉️</span>
                  <a 
                    href={`mailto:${project.client?.email || ''}`}
                    className={`text-sm hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                  >
                    {project.client?.email || 'No email'}
                  </a>
                </div>
              </div>
            </div>
          </DraggablePopup>
        );
      })}
      
      {/* Draggable PM Popups */}
      {Array.from(expandedPMs).map(projectId => {
        const project = projects?.find(p => p.id === projectId);
        if (!project) return null;
        
        return (
          <DraggablePopup
            key={`pm-${projectId}`}
            isOpen={true}
            onClose={() => togglePM(projectId)}
            colorMode={colorMode}
            triggerRef={pmButtonRefs.current[projectId] ? { current: pmButtonRefs.current[projectId] } : null}
          >
            <div className="space-y-3">
              <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                {typeof project.projectManager === 'object' && project.projectManager !== null
                  ? (project.projectManager.name || `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim() || 'No PM')
                  : project.projectManager || 'Project Manager'}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📞</span>
                  <a 
                    href={`tel:${project.pmPhone || project.projectManager?.phone || ''}`}
                    className={`text-sm hover:underline ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                  >
                    {project.pmPhone || project.projectManager?.phone || 'No phone'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✉️</span>
                  <a 
                    href={`mailto:${project.pmEmail || project.projectManager?.email || ''}`}
                    className={`text-sm hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                  >
                    {project.pmEmail || project.projectManager?.email || 'No email'}
                  </a>
                </div>
              </div>
            </div>
          </DraggablePopup>
        );
      })}

      {/* Progress Dropdowns */}
      {Array.from(expandedProgress).map(projectId => {
        const project = projects?.find(p => p.id === projectId);
        if (!project) return null;
        
        const overallProgress = getProjectProgress(project);
        
        return (
          <>
            {/* Backdrop */}
            {expandedProgress.has(projectId) && (
              <div 
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => toggleProgress(projectId)}
              />
            )}
            
            {/* Side Panel */}
            <div
              key={`progress-side-panel-${projectId}`}
              ref={el => progressDropdownRefs.current[projectId] = el}
              className={`fixed z-50 top-0 right-0 h-full w-96 ${colorMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'} shadow-2xl border-l ${colorMode ? 'border-slate-600' : 'border-gray-200'} transform transition-transform duration-300 ease-out`}
              style={{
                transform: expandedProgress.has(projectId) ? 'translateX(0)' : 'translateX(100%)',
              }}
            >
            <div className={`px-6 py-4 border-b ${colorMode ? 'border-slate-600' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Project Progress</h3>
                  <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                    {project.name} (
                    <button
                      onClick={() => onProjectSelect(project, 'Project Profile', null, 'Project Progress Panel')}
                      className={`hover:underline transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      #{String(project.projectNumber || '').padStart(5, '0')}
                    </button>
                    )
                  </p>
                </div>
                <button
                  onClick={() => toggleProgress(projectId)}
                  className={`p-2 rounded-lg hover:bg-opacity-10 transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              {/* Enhanced Progress Bar Section */}
              <div className="space-y-4">
                {/* Overall Progress Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Progress</span>
                    <p className="text-xs text-gray-500 mt-0.5">Complete project status</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${overallProgress === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                      {Math.round(overallProgress || 0)}%
                    </span>
                    <div className={`text-xs ${overallProgress === 100 ? 'text-green-500' : 'text-blue-500'}`}>
                      {overallProgress === 100 ? 'Complete' : 'In Progress'}
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Progress Bar */}
                <div className="relative">
                  <div className={`w-full h-3 rounded-full overflow-hidden shadow-inner ${
                    colorMode ? 'bg-slate-700' : 'bg-gray-200'
                  }`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        overallProgress === 100 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      }`}
                      style={{ width: `${Math.min(overallProgress || 0, 100)}%` }}
                    >
                      {overallProgress > 15 && (
                        <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
                      )}
                    </div>
                  </div>
                  
                  {/* Progress indicator dot */}
                  {overallProgress > 0 && (
                    <div 
                      className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full border-2 shadow-lg transition-all duration-700 ${
                        overallProgress === 100 
                          ? 'bg-green-500 border-green-300' 
                          : 'bg-blue-500 border-blue-300'
                      }`}
                      style={{ left: `calc(${Math.min(overallProgress || 0, 100)}% - 6px)` }}
                    />
                  )}
                </div>
              </div>
              
              {/* Enhanced Materials & Labor Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phase Breakdown</span>
                    <p className="text-xs text-gray-500 mt-0.5">Materials and labor progress</p>
                  </div>
                  <button
                    onClick={() => toggleTrades(project.id)}
                    className={`flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity px-2 py-1 rounded ${
                      colorMode ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{expandedTrades.has(project.id) ? 'Hide' : 'Show'} Details</span>
                    <svg 
                      className={`w-3 h-3 transition-transform duration-200 ${expandedTrades.has(project.id) ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {/* Base Material & Labor Progress */}
                <div className="space-y-4">
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Materials</span>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {getProjectProgress(project)}%
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden shadow-inner ${
                      colorMode ? 'bg-slate-700' : 'bg-gray-200'
                    }`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${getProjectProgress(project)}%` }}
                      >
                        {getProjectProgress(project) > 15 && (
                          <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Labor</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {getProjectProgress(project)}%
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden shadow-inner ${
                      colorMode ? 'bg-slate-700' : 'bg-gray-200'
                    }`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out"
                        style={{ width: `${getProjectProgress(project)}%` }}
                      >
                        {getProjectProgress(project) > 15 && (
                          <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Detailed Trades Breakdown */}
                {expandedTrades.has(project.id) && (
                  <div className="space-y-3 pt-2 border-t border-gray-200/50">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trade Progress</span>
                      <button
                        onClick={() => toggleAdditionalTrades(project.id)}
                        className={`flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}
                      >
                        <span>{expandedAdditionalTrades.has(project.id) ? 'Less' : 'More'}</span>
                        <svg 
                          className={`w-3 h-3 transition-transform ${expandedAdditionalTrades.has(project.id) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {[
                        { name: 'Roofing', progress: getProjectProgress(project), color: 'from-purple-500 to-purple-600' },
                        { name: 'Siding', progress: getProjectProgress(project), color: 'from-blue-500 to-indigo-600' },
                        ...(expandedAdditionalTrades.has(project.id) ? [
                          { name: 'Windows', progress: getProjectProgress(project), color: 'from-yellow-500 to-amber-500' },
                          { name: 'Gutters', progress: getProjectProgress(project), color: 'from-red-500 to-rose-500' }
                        ] : [])
                      ].map((trade) => (
                        <div key={trade.name} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium group-hover:text-blue-500 transition-colors">
                              {trade.name}
                            </span>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                              {trade.progress}%
                            </span>
                          </div>
                          <div className={`w-full h-1.5 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                trade.name === 'Roofing' ? 'bg-purple-500' :
                                trade.name === 'Siding' ? 'bg-pink-500' :
                                trade.name === 'Windows' ? 'bg-yellow-500' :
                                trade.name === 'Gutters' ? 'bg-red-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${trade.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
        );
      })}
      
      {/* Draggable Alert Contact Popups */}
      {Array.from(expandedContacts).map(alertId => {
        // Skip project contacts - only handle alert contacts
        const isProjectId = projects?.some(p => p.id === alertId);
        if (isProjectId) return null;
        
        const alert = workflowAlerts?.find(a => (a._id || a.id) === alertId);
        const project = projects?.find(p => p.id === alert?.projectId);
        
        if (!alert) return null;
        
        return (
          <DraggablePopup
            key={`alert-contact-${alertId}`}
            isOpen={true}
            onClose={() => {
              const newExpanded = new Set(expandedContacts);
              newExpanded.delete(alertId);
              setExpandedContacts(newExpanded);
            }}
            colorMode={colorMode}
            closeOnOutsideClick={false}
            triggerRef={alertContactButtonRefs.current[alertId] ? { current: alertContactButtonRefs.current[alertId] } : null}
          >
            <div className="space-y-1.5 max-w-[400px] min-w-[350px]">
              {/* Project Address - Moved to top */}
              <div className={`text-[9px] ${colorMode ? 'text-gray-400' : 'text-gray-600'} flex items-start gap-1 pb-1.5 border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <span>📍</span>
                <span className="leading-tight font-medium">{project?.address || project?.customer?.address || project?.client?.address || 'Address not available'}</span>
              </div>

              {/* Customer Info in Horizontal Layout */}
              <div className="grid grid-cols-2 gap-3">
                {/* Primary Customer */}
                <div className="space-y-1">
                  <div className={`text-[10px] font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                    Primary Customer
                  </div>
                  <div className={`text-[9px] font-medium ${colorMode ? 'text-gray-200' : 'text-gray-800'} truncate`}>
                    {project?.customer?.primaryName || project?.customer?.name || project?.clientName || 'Primary Customer'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px]">📞</span>
                    <a 
                      href={`tel:${(project?.customer?.primaryPhone || project?.customer?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`}
                      className={`text-[8px] hover:underline ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                    >
                      {project?.customer?.primaryPhone || project?.customer?.phone || project?.clientPhone || '(555) 123-4567'}
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px]">✉️</span>
                    <a 
                      href={`mailto:${project?.customer?.primaryEmail || project?.customer?.email || project?.clientEmail || 'customer@email.com'}`}
                      className={`text-[8px] hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                    >
                      {project?.customer?.primaryEmail || project?.customer?.email || project?.clientEmail || 'customer@email.com'}
                    </a>
                  </div>
                </div>

                {/* Secondary Customer (if exists) */}
                {(project?.customer?.secondaryName || project?.customer?.secondaryPhone || project?.customer?.secondaryEmail) && (
                  <div className="space-y-1">
                    <div className={`text-[10px] font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                      Secondary Customer
                    </div>
                    {project?.customer?.secondaryName && (
                      <div className={`text-[9px] font-medium ${colorMode ? 'text-gray-200' : 'text-gray-800'} truncate`}>
                        {project.customer.secondaryName}
                      </div>
                    )}
                    {project?.customer?.secondaryPhone && (
                      <div className="flex items-center gap-1">
                        <span className="text-[8px]">📞</span>
                        <a 
                          href={`tel:${project.customer.secondaryPhone.replace(/[^\d+]/g, '')}`}
                          className={`text-[8px] hover:underline ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                        >
                          {project.customer.secondaryPhone}
                        </a>
                      </div>
                    )}
                    {project?.customer?.secondaryEmail && (
                      <div className="flex items-center gap-1">
                        <span className="text-[8px]">✉️</span>
                        <a 
                          href={`mailto:${project.customer.secondaryEmail}`}
                          className={`text-[8px] hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                        >
                          {project.customer.secondaryEmail}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DraggablePopup>
        );
      })}

      {/* Draggable Alert PM Popups */}
      {Array.from(expandedPMs).map(alertId => {
        // Skip project PMs - only handle alert PMs
        const isProjectId = projects?.some(p => p.id === alertId);
        if (isProjectId) return null;
        
        const alert = workflowAlerts?.find(a => (a._id || a.id) === alertId);
        const project = projects?.find(p => p.id === alert?.projectId);
        
        if (!alert) return null;
        
        return (
          <DraggablePopup
            key={`alert-pm-${alertId}`}
            isOpen={true}
            onClose={() => {
              const newExpanded = new Set(expandedPMs);
              newExpanded.delete(alertId);
              setExpandedPMs(newExpanded);
            }}
            colorMode={colorMode}
            triggerRef={alertPmButtonRefs.current[alertId] ? { current: alertPmButtonRefs.current[alertId] } : null}
          >
            <div className="space-y-3">
              <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                {project?.projectManager?.name || project?.projectManager?.firstName + ' ' + project?.projectManager?.lastName || 'Project Manager'}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📞</span>
                  <a 
                    href={`tel:${(project?.projectManager?.phone || '(555) 234-5678').replace(/[^\d+]/g, '')}`}
                    className={`text-sm hover:underline ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                  >
                    {project?.projectManager?.phone || '(555) 234-5678'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✉️</span>
                  <a 
                    href={`mailto:${project?.projectManager?.email || 'mike.field@company.com'}`}
                    className={`text-sm hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-brand-600'}`}
                  >
                    {project?.projectManager?.email || 'mike.field@company.com'}
                  </a>
                </div>
              </div>
            </div>
          </DraggablePopup>
        );
      })}
      
      {/* Add Project Modal - BEAUTIFUL & MODERN */}
      <AddProjectModal
        isOpen={showAddProjectModal}
        onClose={() => {
        setShowAddProjectModal(false);
          setProjectError('');
        }}
        onProjectCreated={(newProject) => {
          // Refresh projects data
          queryClient.invalidateQueries(['projects']);
          queryClient.invalidateQueries(['project-stats']);
          
          // Show success message
          toast.success(`Project "${newProject.projectName}" created successfully!`);
          
          // Close modal
                  setShowAddProjectModal(false);
          setProjectError('');
        }}
      />
      
    </div>
  );
};

export default DashboardPage;

