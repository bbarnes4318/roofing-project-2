import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityProvider } from '../../contexts/ActivityContext';
// Icons removed; not used directly in this file
import AddProjectModal from '../common/AddProjectModal';
import ActivityFeedSection from '../dashboard/ActivityFeedSection';
import MessagesSection from '../dashboard/MessagesSection';
import TasksSection from '../dashboard/TasksSection';
import RemindersSection from '../dashboard/RemindersSection';
import ProjectWorkflowLineItemsSection from '../dashboard/ProjectWorkflowLineItemsSection';
import MTRHeader from '../dashboard/mtrHeader';
import MTRFilters from '../dashboard/mtrFilters';
import MTRForm from '../dashboard/mtrForm';
import ProjectProgressPanel from '../dashboard/ProjectProgressPanel';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';

import ProjectCubes from '../dashboard/ProjectCubes';
import CurrentProjectsByPhase from '../dashboard/CurrentProjectsByPhase';
import { mockProjects, mockMessages, mockTasks, mockReminders } from '../../data/mockData';
import { formatPhoneNumber } from '../../utils/helpers';
import { useProjects, useProjectStats, useTasks, useRecentActivities, useWorkflowAlerts, useCreateProject, useCustomers, useCalendarEvents, useCurrentUser, queryKeys } from '../../hooks/useQueryApi';
import { DashboardStatsSkeleton, ActivityFeedSkeleton, ErrorState } from '../ui/SkeletonLoaders';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import api, { API_BASE_URL, authService, messagesService, customersService, usersService, projectMessagesService, calendarService, activitiesService, tasksService } from '../../services/api';
import toast from 'react-hot-toast';
import WorkflowProgressService from '../../services/workflowProgress';
import { getUserFullName } from '../../utils/userUtils';
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
  
  // Use mock data as fallback when no real projects are available
  const displayProjects = (projects && projects.length > 0) ? projects : mockProjects;
  
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
  
  // Use React Query hooks for user data (must be declared before activityFeedItems useMemo)
  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser();
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assignableUsersLoading, setAssignableUsersLoading] = useState(false);
  const [assignableUsersError, setAssignableUsersError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAssignableUsers = async () => {
      setAssignableUsersLoading(true);
      setAssignableUsersError(null);
      try {
        const token =
          localStorage.getItem('authToken') ||
          localStorage.getItem('token') ||
          sessionStorage.getItem('authToken') ||
          sessionStorage.getItem('token');

        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/roles/users`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to load users: ${response.status}`);
        }

        const result = await response.json();
        const usersArray = Array.isArray(result?.data) ? result.data : [];

        const normalized = usersArray.map((user) => ({
          id: user.id || user.userId || user._id || user.uuid || null,
          firstName: user.firstName || user.name?.first || user.fullName?.split?.(' ')?.[0] || '',
          lastName: user.lastName || user.name?.last || user.fullName?.split?.(' ')?.slice(1).join(' ') || '',
          email: user.email || user.primaryEmail || '',
          phone: user.phone || user.primaryPhone || '',
          role: user.role || user.userRole || user.assignedRole || '',
          avatarUrl: user.avatarUrl || user.avatar || user.photoUrl || '',
          raw: user
        })).filter((user) => user.id);

        if (!cancelled) {
          setAssignableUsers(normalized);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch assignable users from roles endpoint:', error);
          setAssignableUsersError(error);
          setAssignableUsers([]);
        }
      } finally {
        if (!cancelled) {
          setAssignableUsersLoading(false);
        }
      }
    };

    fetchAssignableUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const usersForUi = useMemo(() => {
    return Array.isArray(assignableUsers) ? assignableUsers : [];
  }, [assignableUsers]);
  
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

  // Restore workflow-specific navigation when coming back from a project workflow link
  useEffect(() => {
    try {
      const workflowRestore = dashboardState?.workflowRestore;
      if (!workflowRestore) return;

      const { targetLineItemId, targetSectionId, project } = workflowRestore || {};
      if (!targetLineItemId || !project) return;

      // Scroll to the Project Workflow section and highlight the specific line item if present
      setTimeout(() => {
        const workflowSection = document.querySelector('[data-section="project-workflow-tasks"]');
        if (workflowSection) {
          workflowSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Attempt to find the specific line item element by id pattern used elsewhere
        const targetEl = document.getElementById(`lineitem-${targetLineItemId}`) || document.querySelector(`[data-lineitem-id="${targetLineItemId}"]`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const original = targetEl.style.boxShadow;
          targetEl.style.boxShadow = '0 0 10px rgba(59,130,246,0.6)';
          setTimeout(() => { targetEl.style.boxShadow = original || ''; }, 2500);
        }
      }, 120);
    } catch (err) {
      console.warn('Workflow restore failed:', err);
    }
  }, [dashboardState]);

  // After a successful restore, notify App to clear the stored workflowRestore to avoid repeating
  useEffect(() => {
    try {
      const workflowRestore = dashboardState?.workflowRestore;
      if (!workflowRestore) return;

      const { targetLineItemId } = workflowRestore || {};
      if (!targetLineItemId) return;

      // Wait a bit to allow highlight to complete, then dispatch event
      const t = setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('dashboard:clearWorkflowRestore'));
        } catch (e) {}
      }, 800);

      return () => clearTimeout(t);
    } catch (_) {}
  }, [dashboardState]);
  
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
    
    // currentUser is now available from the hook above
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
  
  // Local feed state for newly created items (messages/tasks/reminders)
  const [feed, setFeed] = useState([]);

  // Workflow alerts for Project Workflow section
  const { data: workflowAlertsData, isLoading: alertsLoading } = useWorkflowAlerts({ limit: 200 });
  const workflowAlerts = Array.isArray(workflowAlertsData) ? workflowAlertsData : (workflowAlertsData?.data || []);

  // Get real activities from API
  const { data: realActivities = [], isLoading: activitiesLoading } = useRecentActivities(50);
  const { data: realTasks = [], isLoading: tasksLoading } = useTasks({ page: 1, limit: 20 });
  const { data: realCalendarEvents = [], isLoading: calendarLoading } = useCalendarEvents({ limit: 20 });
  
  // Use mock data as fallback when no real data is available
  const displayActivities = (realActivities && realActivities.length > 0) ? realActivities : mockMessages;
  const displayTasks = (realTasks && realTasks.length > 0) ? realTasks : mockTasks;
  const displayCalendarEvents = (realCalendarEvents && realCalendarEvents.length > 0) ? realCalendarEvents : mockReminders;
  
  // Build activity feed items from real data + fallback synthesis
  const activityFeedItems = useMemo(() => {
    try {
      // Start with locally added items (messages/tasks/reminders) so they appear immediately
      const realItems = Array.isArray(feed) ? [...feed] : [];
      // Track seen items using stable composite keys: `${type}:${rawId}`
      const seenKeys = new Set();
      const markSeen = (type, id) => {
        const rawId = String(id || '').replace(/^(activity_|task_|reminder_)/, '');
        seenKeys.add(`${type}:${rawId}`);
      };
      realItems.forEach(it => markSeen(it.type || 'message', it.id));
      
      // Add activities (messages) using displayActivities fallback
      (Array.isArray(displayActivities) ? displayActivities : []).forEach(activity => {
        const normalizedType = ['message', 'task', 'reminder'].includes(activity.type) ? activity.type : 'message';
        const key = `${normalizedType}:${activity.id}`;
        if (!seenKeys.has(key)) {
          realItems.push({
            id: `activity_${activity.id}`,
            type: normalizedType || 'message',
            subject: activity.subject || activity.title || 'Activity Update',
            description: activity.description || activity.content,
            user: activity.user || activity.userName || 'Unknown User',
            timestamp: activity.createdAt || activity.timestamp,
            projectId: activity.projectId,
            projectName: activity.projectName,
            priority: activity.priority || 'medium',
            // Preserve server-provided metadata (e.g., attachments) so UI can render thumbnails
            metadata: activity.metadata || null
          });
          markSeen(normalizedType, activity.id);
        }
      });
      
      // Add tasks using displayTasks fallback
      (Array.isArray(displayTasks) ? displayTasks : []).forEach(task => {
        const key = `task:${task.id}`;
        if (!seenKeys.has(key)) {
          realItems.push({
            id: `task_${task.id}`,
            type: 'task',
            subject: task.title || task.subject || 'Task',
            description: task.description || task.content,
            user: task.assignedToUser ? `${task.assignedToUser.firstName} ${task.assignedToUser.lastName}` : (task.assignedTo || 'Unassigned'),
            // Provide robust timestamp fallbacks for mock data
            timestamp: task.createdAt || task.timestamp || task.dueDate || new Date().toISOString(),
            projectId: task.projectId,
            projectName: task.project?.name || task.projectName,
            priority: task.priority || 'medium',
            status: task.status,
            dueDate: task.dueDate,
            // Normalize fields used by TaskItem
            author: task.author || 'System',
            assignedTo: task.assignedTo || (task.assignedToUser ? `${task.assignedToUser.firstName} ${task.assignedToUser.lastName}` : undefined)
          });
          markSeen('task', task.id);
        }
      });
      
      // Add calendar events (reminders) using displayCalendarEvents fallback
      (Array.isArray(displayCalendarEvents) ? displayCalendarEvents : []).forEach(event => {
        const key = `reminder:${event.id}`;
        if (!seenKeys.has(key)) {
          realItems.push({
            id: `reminder_${event.id}`,
            type: 'reminder', 
            subject: event.title || event.subject || 'Reminder',
            description: event.description || event.content,
            user: event.createdByUser ? `${event.createdByUser.firstName} ${event.createdByUser.lastName}` : 'Unknown User',
            // Use 'when' as timestamp fallback for mock reminders
            timestamp: event.createdAt || event.timestamp || event.when || event.startDate || new Date().toISOString(),
            projectId: event.projectId,
            projectName: event.project?.name || event.projectName,
            priority: event.priority || 'medium',
            when: event.startDate || event.when,
            // Provide authorId and recipients for UI filters and display
            authorId: event.createdBy || event.organizerId || event.authorId || currentUser?.id || null,
            recipients: Array.isArray(event.userIds) ? event.userIds : ['all']
          });
          markSeen('reminder', event.id);
        }
      });
      
      // Fallback to synthesized activities if no real data
      if (realItems.length === 0) {
        const synthesized = generateActivitiesFromProjects(uiProjects || []);
        return Array.isArray(synthesized) ? synthesized : [];
      }
      
      // Sort by timestamp (newest first)
      return realItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error building activity feed:', error);
      const synthesized = generateActivitiesFromProjects(uiProjects || []);
      return Array.isArray(synthesized) ? synthesized : [];
    }
  }, [feed, realActivities, realTasks, realCalendarEvents, uiProjects, currentUser]);

  // Use mock messages as fallback (must be declared after activityFeedItems)
  const displayMessages = (activityFeedItems && activityFeedItems.length > 0) ? activityFeedItems : mockMessages;

  // Current activities after filters
  const currentActivities = useMemo(() => {
    let items = activityFeedItems;
    if (activityTypeFilter) items = items.filter(i => i.type === activityTypeFilter);
    if (activityProjectFilter) items = items.filter(i => String(i.projectId) === String(activityProjectFilter));
    return items;
  }, [activityFeedItems, activityTypeFilter, activityProjectFilter]);

  // Navigation helper used throughout JSX
  const handleProjectSelectWithScroll = (project, view = 'Profile', phase = null, sourceSection = 'Dashboard', targetLineItemId = null, targetSectionId = null) => {
    if (onProjectSelect) {
      onProjectSelect(project, view, phase, sourceSection, targetLineItemId, targetSectionId);
    }
  };

  // Add Project modal + error
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [projectError, setProjectError] = useState('');

  // Projects grouped by phase for ProjectsByPhaseSection
  const projectsByPhase = useMemo(() => {
    const map = {};
    (PROJECT_PHASES || []).forEach(p => { map[p.id] = []; });
    (uiProjects || []).forEach(p => {
      const phase = WorkflowProgressService.getProjectPhase(p) || 'LEAD';
      if (!map[phase]) map[phase] = [];
      map[phase].push(p);
    });
    return map;
  }, [uiProjects]);

  // Sort helper for ProjectsByPhaseSection
  const getSortedPhaseProjects = (phaseId) => {
    const arr = [...(projectsByPhase[phaseId] || [])];
    const { key, direction } = sortConfig || {};
    if (!key) return arr;
    const dir = direction === 'desc' ? -1 : 1;
    return arr.sort((a, b) => {
      const val = (p) => {
        switch (key) {
          case 'progress': return getProjectProgress(p) || 0;
          case 'startDate': return new Date(p.startDate || 0).getTime();
          case 'endDate': return new Date(p.endDate || 0).getTime();
          case 'projectName':
          default: return String(p.projectName || p.name || '').toLowerCase();
        }
      };
      const va = val(a); const vb = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  };

  // Quick reply handler used by MessagesSection
  const handleQuickReply = async (messageId, text) => {
    try {
      if (projectMessagesService?.sendQuickReply) {
        await projectMessagesService.sendQuickReply(messageId, text);
        toast.success('Reply sent');
      } else {
        console.log('Quick reply:', { messageId, text });
        toast.success('Reply posted');
      }
    } catch (err) {
      console.error('Failed to send quick reply:', err);
      toast.error('Failed to send reply');
    }
  };

  // Alert filter state
  // const [alertProjectFilter, setAlertProjectFilter] = useState('all'); // moved inside ProjectWorkflowLineItemsSection
  // const [alertUserGroupFilter, setAlertUserGroupFilter] = useState('all'); // moved inside ProjectWorkflowLineItemsSection
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // const [alertCurrentPage, setAlertCurrentPage] = useState(1); // no longer used
  const activitiesPerPage = 8;
  // const alertsPerPage = 12; // no longer used
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  // const [alertSortConfig, setAlertSortConfig] = useState({ key: null, direction: 'asc' }); // moved inside ProjectWorkflowLineItemsSection
  const [activitySortConfig, setActivitySortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  
  // UI state
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [selectedPhase, setSelectedPhase] = useState(null); // Start blank: no phase selected until user chooses one
  
  // Project Messages expansion control
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [allMessagesExpanded, setAllMessagesExpanded] = useState(false);

  // Expand all message items by default on initial load
  const messagesExpandedInitRef = useRef(false);
  useEffect(() => {
    if (messagesExpandedInitRef.current) return;
    const ids = (activityFeedItems || [])
      .filter(item => item.type === 'message')
      .map(item => item.id);
    if (ids.length > 0) {
      setExpandedMessages(new Set(ids));
      setAllMessagesExpanded(true);
      messagesExpandedInitRef.current = true;
    }
  }, [activityFeedItems]);
  // const [expandedAlerts, setExpandedAlerts] = useState(new Set()); // moved inside ProjectWorkflowLineItemsSection
  const [expandedProgress, setExpandedProgress] = useState(new Set());
  const [expandedTrades, setExpandedTrades] = useState(new Set());
  const [expandedAdditionalTrades, setExpandedAdditionalTrades] = useState(new Set());
  // Contact/PM popups removed
  
  // Alerts UI is self-contained in ProjectWorkflowLineItemsSection
  
  console.log('🔍 DASHBOARD: currentUser from hook:', currentUser);
  console.log('🔍 DASHBOARD: assignableUsers length:', assignableUsers?.length);
  console.log('🔍 DASHBOARD: usersForUi length:', usersForUi?.length);
  console.log('🔍 DASHBOARD: subjects from context:', subjects);
  
  // Team members are now loaded via useTeamMembers hook above
  
  // HANDLERS FOR MTR FORMS
  
  // Handle message submission
  const handleSubmitMessage = async (messageData) => {
    try {
      console.log('📨 DASHBOARD: Submitting message:', messageData);
      
      // Create activity via API
      const activityPayload = {
        type: 'message',
        subject: messageData.subject || messageData.customSubject,
        description: messageData.message || messageData.text,
        projectId: messageData.projectId,
        userId: currentUser?.id,
        priority: messageData.priority || 'MEDIUM'
      };
      
      const response = await activitiesService.create(activityPayload);
      
      if (response.success) {
        toast.success('Message sent successfully!');
        // Invalidate activities to refresh the feed
        queryClient.invalidateQueries({ queryKey: queryKeys.activities });
        queryClient.invalidateQueries({ queryKey: queryKeys.recentActivities(50) });
        
        // Clear form
        setNewMessageText('');
        setNewMessageProject('');
        setNewMessageSubject('');
        setNewMessageCustomSubject('');
        setNewMessageRecipients([]);
        setShowMessageDropdown(false);
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting message:', error);
      toast.error(error.message || 'Failed to send message');
    }
  };
  
  // Handle task submission
  const handleSubmitTask = async (taskData) => {
    try {
      console.log('📋 DASHBOARD: Submitting task:', taskData);
      
      const taskPayload = {
        title: taskData.subject,
        description: taskData.description,
        projectId: taskData.projectId,
        assignedTo: taskData.assigneeId,
        dueDate: taskData.due,
        priority: taskData.priority || 'MEDIUM',
        status: 'PENDING',
        createdBy: currentUser?.id
      };
      
      const response = await tasksService.create(taskPayload);
      
      if (response.success) {
        toast.success('Task created successfully!');
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        queryClient.invalidateQueries({ queryKey: queryKeys.recentActivities(50) });
        
        // Clear form
        setQuickTaskSubject('');
        setQuickTaskDescription('');
        setQuickTaskDue('');
        setQuickTaskAssigneeId('');
        setQuickTaskAssignAll(false);
      } else {
        throw new Error(response.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error(error.message || 'Failed to create task');
    }
  };

  // Handle reminder submission
  const handleSubmitReminder = async (reminderData) => {
    try {
      console.log('📅 DASHBOARD: Submitting reminder:', reminderData);
      
      const reminderPayload = {
        title: reminderData.title,
        description: reminderData.description,
        startDate: reminderData.when,
        projectId: reminderData.projectId,
        createdBy: currentUser?.id,
        userIds: reminderData.allUsers ? usersForUi.map(u => u.id) : reminderData.userIds || []
      };
      
      const response = await calendarService.create(reminderPayload);
      
      if (response.success) {
        toast.success('Reminder created successfully!');
        // Invalidate calendar events to refresh the feed
        queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents });
        queryClient.invalidateQueries({ queryKey: queryKeys.recentActivities(50) });
        
        // Clear form
        setReminderTitle('');
        setReminderDescription('');
        setReminderWhen('');
        setReminderUserIds([]);
        setReminderAllUsers(false);
      } else {
        throw new Error(response.message || 'Failed to create reminder');
      }
    } catch (error) {
      console.error('Error submitting reminder:', error);
      toast.error(error.message || 'Failed to create reminder');
    }
  };
  
  const _handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
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

  // Alerts expansion handlers moved into ProjectWorkflowLineItemsSection

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

  // Alert pagination moved into ProjectWorkflowLineItemsSection

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

  // Contact/PM toggles removed with popup UI

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
        console.log('🚀 Source section: Project Workflow Line Items');
        // Add scrollToProjectId for Projects page scrolling
        const projectWithScrollId = {
          ...project,
          scrollToProjectId: String(project.id)
        };
        // Navigate to Projects page with scrolling
        handleProjectSelectWithScroll(projectWithScrollId, 'Projects', null, 'Project Workflow Line Items');
      } else {
        console.warn('❌ No project found for alert:', alert);
      }
    }
  };
  
  // Alert handlers removed; alerts are fully handled within ProjectWorkflowLineItemsSection

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
    <ActivityProvider>
  <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Top Actions */}
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={() => setShowAddProjectModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5 border border-blue-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Project</span>
        </button>
      </div>

      {/* Current Projects by Phase (original table view) */}
      <CurrentProjectsByPhase
        projects={uiProjects || displayProjects}
        PROJECT_PHASES={PROJECT_PHASES}
        colorMode={colorMode}
        onProjectSelect={handleProjectSelectWithScroll}
        selectedPhase={selectedPhase}
        setSelectedPhase={setSelectedPhase}
        sortConfig={sortConfig}
        handleProjectSort={handleProjectSort}
        projectsLoading={projectsLoading}
        projectsError={projectsError}
        refetchProjects={refetchProjects}
        expandedPhases={expandedPhases}
        teamMembers={usersForUi}
      />

      {/* Main Dashboard Layout - Two Column (Flex-based to avoid grid row height issues) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start overflow-visible">
        {/* Left Column - Project Messages */}
        <div className="w-full lg:flex-1 flex flex-col gap-6" data-section="project-messages">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible">
            <MTRHeader
              activeCommTab={activeCommTab}
              setActiveCommTab={setActiveCommTab}
              expandedMessages={expandedMessages}
              activityFeedItems={activityFeedItems}
            />
            
            <MTRFilters
              activeCommTab={activeCommTab}
              projects={displayProjects}
              availableUsers={usersForUi}
              messagesProjectFilter={messagesProjectFilter}
              messagesUserFilter={messagesUserFilter}
              tasksProjectFilter={tasksProjectFilter}
              tasksUserFilter={tasksUserFilter}
              remindersProjectFilter={remindersProjectFilter}
              remindersUserFilter={remindersUserFilter}
              setMessagesProjectFilter={setMessagesProjectFilter}
              setMessagesUserFilter={setMessagesUserFilter}
              setTasksProjectFilter={setTasksProjectFilter}
              setTasksUserFilter={setTasksUserFilter}
              setRemindersProjectFilter={setRemindersProjectFilter}
              setRemindersUserFilter={setRemindersUserFilter}
              activityFeedItems={activityFeedItems}
              expandedMessages={expandedMessages}
              handleExpandAllMessages={handleExpandAllMessages}
              handleCollapseAllMessages={handleCollapseAllMessages}
            />
            
            <MTRForm
              activeCommTab={activeCommTab}
              colorMode={colorMode}
              showMessageDropdown={showMessageDropdown}
              setShowMessageDropdown={setShowMessageDropdown}
              projects={displayProjects}
              availableUsers={usersForUi}
              usersLoading={assignableUsersLoading}
              subjects={subjects}
              currentUser={currentUser}
              newMessageProject={newMessageProject}
              setNewMessageProject={setNewMessageProject}
              newMessageSubject={newMessageSubject}
              setNewMessageSubject={setNewMessageSubject}
              newMessageCustomSubject={newMessageCustomSubject}
              setNewMessageCustomSubject={setNewMessageCustomSubject}
              newMessageText={newMessageText}
              setNewMessageText={setNewMessageText}
              newMessageRecipients={newMessageRecipients}
              setNewMessageRecipients={setNewMessageRecipients}
              quickTaskSubject={quickTaskSubject}
              setQuickTaskSubject={setQuickTaskSubject}
              quickTaskDescription={quickTaskDescription}
              setQuickTaskDescription={setQuickTaskDescription}
              quickTaskDue={quickTaskDue}
              setQuickTaskDue={setQuickTaskDue}
              quickTaskAssignAll={quickTaskAssignAll}
              setQuickTaskAssignAll={setQuickTaskAssignAll}
              quickTaskAssigneeId={quickTaskAssigneeId}
              setQuickTaskAssigneeId={setQuickTaskAssigneeId}
              tasksProjectFilter={tasksProjectFilter}
              setTasksProjectFilter={setTasksProjectFilter}
              reminderTitle={reminderTitle}
              setReminderTitle={setReminderTitle}
              reminderDescription={reminderDescription}
              setReminderDescription={setReminderDescription}
              reminderWhen={reminderWhen}
              setReminderWhen={setReminderWhen}
              reminderAllUsers={reminderAllUsers}
              setReminderAllUsers={setReminderAllUsers}
              reminderUserIds={reminderUserIds}
              setReminderUserIds={setReminderUserIds}
              remindersProjectFilter={remindersProjectFilter}
              setRemindersProjectFilter={setRemindersProjectFilter}
              setMessagesData={setMessagesData}
              setFeed={setFeed}
              uiProjects={uiProjects}
            />
            
            <div className="space-y-2 mt-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
              <MessagesSection
                activeCommTab={activeCommTab}
                activityFeedItems={displayMessages}
                projects={displayProjects}
                colorMode={colorMode}
                expandedMessages={expandedMessages}
                messagesProjectFilter={messagesProjectFilter}
                messagesUserFilter={messagesUserFilter}
                handleToggleMessage={handleToggleMessage}
                handleProjectSelectWithScroll={handleProjectSelectWithScroll}
                handleQuickReply={handleQuickReply}
              />
              
              <TasksSection
                activeCommTab={activeCommTab}
                activityFeedItems={displayTasks}
                projects={displayProjects}
                colorMode={colorMode}
                expandedMessages={expandedMessages}
                completedTasks={completedTasks}
                tasksProjectFilter={tasksProjectFilter}
                tasksUserFilter={tasksUserFilter}
                showCompletedTasks={showCompletedTasks}
                setShowCompletedTasks={setShowCompletedTasks}
                handleToggleMessage={handleToggleMessage}
                handleTaskToggle={handleTaskToggle}
                handleProjectSelectWithScroll={handleProjectSelectWithScroll}
                availableUsers={usersForUi}
                currentUser={currentUser}
                taskComments={taskComments}
                newCommentText={newCommentText}
                setNewCommentText={setNewCommentText}
                handleAddComment={handleAddComment}
              />
              
              <RemindersSection
                activeCommTab={activeCommTab}
                activityFeedItems={displayCalendarEvents}
                projects={displayProjects}
                colorMode={colorMode}
                expandedMessages={expandedMessages}
                completedTasks={completedTasks}
                remindersProjectFilter={remindersProjectFilter}
                remindersUserFilter={remindersUserFilter}
                availableUsers={usersForUi}
                currentUser={currentUser}
                handleToggleMessage={handleToggleMessage}
                handleTaskToggle={handleTaskToggle}
                handleProjectSelectWithScroll={handleProjectSelectWithScroll}
                reminderComments={reminderComments}
                showCommentInput={showCommentInput}
                setShowCommentInput={setShowCommentInput}
                commentInputs={commentInputs}
                setCommentInputs={setCommentInputs}
                handleAddReminderComment={handleAddReminderComment}
              />

            </div>
          </div>

          {/* Project Workflow Line Items (directly under MTR) */}
          <div className="w-full lg:flex-1">
            <ProjectWorkflowLineItemsSection
              projects={displayProjects}
              colorMode={colorMode}
              onProjectSelect={onProjectSelect}
              workflowAlerts={workflowAlerts}
              alertsLoading={alertsLoading}
              availableUsers={usersForUi}
              currentUser={currentUser}
              handleProjectSelectWithScroll={handleProjectSelectWithScroll}
            />
          </div>
        </div>

        {/* Right Column - Activity Feed Section */}
        <div className="w-full">
          <ActivityFeedSection
            activityFeedItems={activityFeedItems}
            projects={displayProjects}
            colorMode={colorMode}
            expandedMessages={expandedMessages}
            completedTasks={completedTasks}
            activityProjectFilter={activityProjectFilter}
            activityTypeFilter={activityTypeFilter}
            setActivityProjectFilter={setActivityProjectFilter}
            setActivityTypeFilter={setActivityTypeFilter}
            handleToggleMessage={handleToggleMessage}
            handleTaskToggle={handleTaskToggle}
            handleProjectSelectWithScroll={handleProjectSelectWithScroll}
            availableUsers={usersForUi}
            currentUser={currentUser}
            taskComments={taskComments}
            newCommentText={newCommentText}
            setNewCommentText={setNewCommentText}
            handleAddComment={handleAddComment}
          />
        </div>

      </div>

      
      {/* Alerts UI and popups are handled inside ProjectWorkflowLineItemsSection */}

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
            
            {/* Side Panel (refactored to reusable component) */}
            <ProjectProgressPanel
              open={expandedProgress.has(projectId)}
              onClose={() => toggleProgress(projectId)}
              project={project}
              colorMode={colorMode}
              getProjectProgress={getProjectProgress}
              expandedTrades={expandedTrades}
              toggleTrades={toggleTrades}
              expandedAdditionalTrades={expandedAdditionalTrades}
              toggleAdditionalTrades={toggleAdditionalTrades}
            />
          </>
        );
      })}
      
      {/* Draggable alert popups removed (handled in ProjectWorkflowLineItemsSection) */}
      
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
    </ActivityProvider>
  );
};

export default DashboardPage;
