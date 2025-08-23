import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, ChevronLeftIcon, XCircleIcon } from '../common/Icons';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import DraggablePopup from '../ui/DraggablePopup';
import Modal from '../common/Modal';
import AddProjectModal from '../common/AddProjectModal';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';

import ProjectCubes from '../dashboard/ProjectCubes';
// import { initialTasks, teamMembers, mockAlerts } from '../../data/mockData';
import { formatPhoneNumber } from '../../utils/helpers';
import { useProjects, useProjectStats, useTasks, useRecentActivities, useWorkflowAlerts, useCreateProject, useCustomers } from '../../hooks/useQueryApi';
import { DashboardStatsSkeleton, ActivityFeedSkeleton, ErrorState } from '../ui/SkeletonLoaders';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import api, { authService, messagesService, customersService, usersService, projectMessagesService } from '../../services/api';
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
          projectPhase: project.phase || 'Lead',
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
  return {
    id: project.id,
    projectName: project.name,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    progress: getProjectProgress(project),
    budget: project.estimateValue || 0,
    expenses: 0, // Not available in current project structure
    responsibleTeam: 'Team Alpha', // Default value
    priority: project.priority || 'Low',
    clientName: project.client?.name || 'Unknown',
    clientEmail: project.client?.email || '',
    projectManager: project.projectManager || null,
    // Use canonical phase key from API (server provides uppercase key)
    phase: project.phase || 'LEAD'
  };
};

const DashboardPage = ({ tasks, activities, onProjectSelect, onAddActivity, colorMode, dashboardState }) => {
  console.log('🔍 DASHBOARD: Component rendering...');
  const queryClient = useQueryClient();
  
  // Use database data instead of props
  const { data: projectsData, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useProjects({ limit: 100 });
  // Extract the projects array from the response object
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data || []);
  
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
  
  // Message dropdown state (replaces old modal)
  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const [newMessageProject, setNewMessageProject] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageRecipients, setNewMessageRecipients] = useState([]);
  const [attachTask, setAttachTask] = useState(false);
  const [taskAssignee, setTaskAssignee] = useState('');

  // Activity feed filter state (separate from posting state)
  const [activityProjectFilter, setActivityProjectFilter] = useState('');
  const [activitySubjectFilter, setActivitySubjectFilter] = useState('');

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
                
                // Use canonical phase from project to ensure consistency
                const canonicalPhase = (project.phase || 'LEAD');
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
          setMessagesData(allMessages);
          setFeed(allMessages); // Update feed with real messages
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
          setFeed(fallbackMessages);
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
        setFeed(fallbackMessages);
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
    if (!Array.isArray(projects)) return [];
    return projects.map(project => convertProjectToTableFormat(project));
  }, [projects]);

  // Group projects by phase
  const projectsByPhase = useMemo(() => {
    const grouped = {};
    PROJECT_PHASES.forEach(phase => {
      grouped[phase.id] = [];
    });
    
    // Ensure tableProjects is an array
    const safeTableProjects = Array.isArray(tableProjects) ? tableProjects : [];
    
    safeTableProjects.forEach(project => {
      // Ensure canonical uppercase phase key for grouping
      const phase = (project.phase || 'LEAD').toUpperCase();
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
    const allMessageIds = new Set(currentActivities.map(activity => activity.id));
    setExpandedMessages(allMessageIds);
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
            <p className="text-sm text-gray-600 font-medium">
              Complete project details organized by phase
            </p>
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
                      const projectPhase = getProjectPhase(project);
                      return projectPhase === selectedPhase;
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
                        const projectPhase = getProjectPhase(project);
                        return projectPhase === selectedPhase;
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
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorMode ? getProjectTypeColorDark(project.projectType) : getProjectTypeColor(project.projectType)}`}>
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
                            className="w-16 h-6 border border-brand-500 text-black text-xs rounded-full hover:bg-brand-50 transition-colors flex items-center justify-center"
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
                            className="w-16 h-6 border border-brand-500 text-black text-xs rounded-full hover:bg-brand-50 transition-colors flex items-center justify-center"
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
                            className="w-16 h-6 border border-brand-500 text-black text-xs rounded-full hover:bg-brand-50 transition-colors flex items-center justify-center"
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
                    My Project Messages
                  </h2>
                  {expandedMessages.size > 0 && (
                    <p className="text-sm text-gray-600 font-medium">
                      {expandedMessages.size} of {currentActivities.length} conversation{currentActivities.length !== 1 ? 's' : ''} expanded
                    </p>
                  )}
                </div>
              </div>
              
              {/* Filter Controls - Optimized Layout */}
              <div className="flex items-center justify-between gap-2 mb-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Filter by:</span>
                  <select 
                    value={activityProjectFilter} 
                    onChange={(e) => setActivityProjectFilter(e.target.value)} 
                    className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[120px] max-w-[200px]"
                  >
                    <option value="">All Projects</option>
                    {(projects || []).map(p => (
                      <option key={p.id} value={p.id}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={activitySubjectFilter} 
                    onChange={(e) => setActivitySubjectFilter(e.target.value)} 
                    className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[80px] max-w-[150px]"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                
                {/* Expand/Collapse Controls - Positioned to the right */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleExpandAllMessages}
                    className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                      expandedMessages.size === currentActivities.length && currentActivities.length > 0
                        ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow'
                        : 'bg-white/80 text-brand-600 border-gray-200 hover:bg-white hover:border-brand-300 hover:shadow-soft'
                    }`}
                    title="Expand all message conversations"
                    disabled={currentActivities.length === 0 || expandedMessages.size === currentActivities.length}
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
                    title="Collapse all message conversations"
                    disabled={expandedMessages.size === 0}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Add Message Dropdown Trigger */}
              <div className="mb-3">
                <button
                  onClick={() => setShowMessageDropdown(!showMessageDropdown)}
                  className={`w-full px-2 py-1.5 text-xs font-medium border rounded-lg transition-all duration-300 flex items-center justify-between ${
                    showMessageDropdown
                      ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-soft' 
                      : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  <span>+ Add Message</span>
                  
                  {/* Dropdown Arrow */}
                  <svg className={`w-3 h-3 transition-transform ${showMessageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Add Message Dropdown Form */}
              {showMessageDropdown && (
                <div className={`p-2 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (newMessageProject && newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0) {
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
                            subject: newMessageSubject,
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
                        subject: newMessageSubject,
                        description: newMessageText,
                        user: 'You',
                        timestamp: new Date().toISOString(),
                        type: 'message',
                        priority: 'medium',
                        recipients: newMessageRecipients,
                        hasTask: attachTask,
                        taskAssignedTo: attachTask ? taskAssignee : null
                      };
                      
                      // Add to messages data
                      setMessagesData(prev => [newActivity, ...prev]);
                      setFeed(prev => [newActivity, ...prev]);
                      
                      // Close dropdown and reset form
                      setShowMessageDropdown(false);
                      setNewMessageProject('');
                      setNewMessageSubject('');
                      setNewMessageText('');
                      setNewMessageRecipients([]);
                      setAttachTask(false);
                      setTaskAssignee('');
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
                              {user.firstName} {user.lastName} ({user.role || 'User'})
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
                    
                    {/* Second Row: Subject and Task Assignment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                          className={`w-full px-2 py-1 border rounded text-xs ${
                            colorMode 
                              ? 'bg-[#232b4d] border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        >
                          <option value="">Select Subject</option>
                          {subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          colorMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <input
                            type="checkbox"
                            checked={attachTask || false}
                            onChange={(e) => setAttachTask(e.target.checked)}
                            className="mr-1"
                          />
                          Send as a Task
                        </label>
                        {attachTask && (
                          <select
                            value={taskAssignee || ''}
                            onChange={(e) => setTaskAssignee(e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-xs ${
                              colorMode 
                                ? 'bg-[#232b4d] border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-800'
                            }`}
                          >
                            <option value="">Assign Task To...</option>
                            {availableUsers.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.role || 'User'})
                              </option>
                            ))}
                          </select>
                        )}
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
                          setNewMessageText('');
                          setNewMessageRecipients([]);
                          setAttachTask(false);
                          setTaskAssignee('');
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
                        disabled={!newMessageProject || !newMessageSubject || !newMessageText.trim() || newMessageRecipients.length === 0}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          newMessageProject && newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0
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
                    useRealData={true}
                    onQuickReply={handleQuickReply}
                    isExpanded={expandedMessages.has(activity.id)}
                    onToggleExpansion={handleToggleMessage}
                    sourceSection="My Project Messages"
                  />
                ))
              )}
            </div>
          </div>
        </div>
        {/* Right Column - Current Alerts */}
        <div className="w-full" data-section="current-alerts">
          {/* Beautiful original alerts UI with new functionality */}
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                    Current Alerts
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
                                      navigationSource: 'Current Alerts',
                                      returnToSection: 'current-alerts'
                                    };
                                    console.log('🎯 PROJECT NUMBER CLICK: Navigating from Current Alerts to Profile');
                                    handleProjectSelectWithScroll(projectWithScrollId, 'Profile', null, 'Current Alerts');
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
                              <div className="flex items-center gap-1 flex-shrink-0" style={{ marginLeft: '40px' }}>
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
                                  className={`px-2 py-0.5 rounded-full border text-[8px] font-semibold ${
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
                        <div className="flex items-center text-[9px]" style={{ marginTop: '-2px', marginLeft: '20px' }}>
                          {/* Section label aligned under Project Number, Section value aligned under Customer Name */}
                          <div className="flex items-center" style={{ width: '210px' }}>
                            {/* Section label - moved 1 space right closer to its value */}
                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ width: '49px', marginLeft: '16px' }}>Section:</span>
                            {/* Section value - first letter aligns under Customer's Name first letter (5px left margin adjustment) */}
                            <span className={`font-semibold truncate ${colorMode ? 'text-gray-200' : 'text-gray-700'}`} style={{ marginLeft: '8px' }}>
                              {sectionName || 'Unknown Section'}
                            </span>
                          </div>
                          
                          {/* Line Item - moved closer to Section */}
                          <div className="flex items-center gap-1 flex-shrink-0" style={{ marginLeft: '0px' }}>
                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Line Item:</span>
                            <span 
                                className={`font-semibold cursor-pointer hover:underline max-w-[120px] truncate ${
                                  colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-brand-600 hover:text-brand-800'
                                }`}
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
                                          
                                          // Enhanced navigation with comprehensive state tracking for Current Alerts
                                          console.log('🎯 LINE ITEM CLICK: Navigating from Current Alerts to Workflow with targeting');
                                          console.log('🎯 LINE ITEM CLICK: targetLineItemId:', targetLineItemId);
                                          console.log('🎯 LINE ITEM CLICK: targetSectionId:', targetSectionId);
                                          console.log('🎯 LINE ITEM CLICK: position data:', position);
                                          
                                          // Ensure project has all navigation metadata for proper back button behavior
                                          projectWithNavigation.navigationSource = 'Current Alerts';
                                          projectWithNavigation.returnToSection = 'current-alerts';
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
                                            'Current Alerts',
                                            targetLineItemId,
                                            targetSectionId
                                          );
                                        } else {
                                          console.warn('🎯 ALERTS CLICK: No position data found, using fallback navigation');
                                          // Fallback to enhanced static navigation with Current Alerts tracking
                                          const projectWithStepInfo = {
                                            ...project,
                                            highlightStep: lineItemName,
                                            highlightLineItem: lineItemName,
                                            targetPhase: phase,
                                            targetSection: sectionName,
                                            targetLineItem: lineItemName,
                                            scrollToCurrentLineItem: true,
                                            alertPhase: phase,
                                            navigationSource: 'Current Alerts',
                                            returnToSection: 'current-alerts',
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
                                          handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
                                        }
                                      } else {
                                        console.error('🎯 ALERTS CLICK: Failed to get project position, using fallback navigation');
                                        // Fallback to basic navigation with Current Alerts source tracking
                                        const projectWithStepInfo = {
                                          ...project,
                                          highlightStep: lineItemName,
                                          highlightLineItem: lineItemName,
                                          targetPhase: phase,
                                          targetSection: sectionName,
                                          targetLineItem: lineItemName,
                                          scrollToCurrentLineItem: true,
                                          alertPhase: phase,
                                          navigationSource: 'Current Alerts',
                                          returnToSection: 'current-alerts',
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
                                        handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
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
                                      handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
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
      </div>


      {/* Project Cubes - Quick Access */}
      <div className="mt-6 border-t-4 border-brand-400 bg-white overflow-hidden relative rounded-t-[8px]" data-section="project-cubes">
        <div className="w-full">
          <ProjectCubes 
            projects={projects} 
            onProjectSelect={handleProjectSelectWithScroll} 
            colorMode={colorMode}
          />
        </div>
      </div>
      
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
                    {user.firstName} {user.lastName} ({user.role || 'User'})
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
                      #{project.projectNumber || project.id}
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
                        {project.materialsProgress || 85}%
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden shadow-inner ${
                      colorMode ? 'bg-slate-700' : 'bg-gray-200'
                    }`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${project.materialsProgress || 85}%` }}
                      >
                        {(project.materialsProgress || 85) > 15 && (
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
                        {project.laborProgress || 75}%
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden shadow-inner ${
                      colorMode ? 'bg-slate-700' : 'bg-gray-200'
                    }`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out"
                        style={{ width: `${project.laborProgress || 75}%` }}
                      >
                        {(project.laborProgress || 75) > 15 && (
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
                        { name: 'Roofing', progress: project.roofingProgress || 90, color: 'from-purple-500 to-purple-600' },
                        { name: 'Siding', progress: project.sidingProgress || 60, color: 'from-blue-500 to-indigo-600' },
                        ...(expandedAdditionalTrades.has(project.id) ? [
                          { name: 'Windows', progress: project.windowsProgress || 40, color: 'from-yellow-500 to-amber-500' },
                          { name: 'Gutters', progress: project.guttersProgress || 30, color: 'from-red-500 to-rose-500' }
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

