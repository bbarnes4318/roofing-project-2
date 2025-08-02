import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronLeftIcon } from '../common/Icons';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import DraggablePopup from '../ui/DraggablePopup';

import ProjectCubes from '../dashboard/ProjectCubes';
// import { initialTasks, teamMembers, mockAlerts } from '../../data/mockData';
import { formatPhoneNumber } from '../../utils/helpers';
import { useProjects, useProjectStats, useTasks, useRecentActivities, useWorkflowAlerts } from '../../hooks/useApi';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import { authService, messagesService } from '../../services/api';
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

// DEPRECATED: Use centralized workflow progress instead
// This function is kept for backward compatibility but should use centralized data
const getProjectProgress = (project) => {
  // This will be replaced by centralized workflow data in component
  if (project.calculatedProgress?.completedSteps && project.calculatedProgress?.totalSteps) {
    return Math.round((project.calculatedProgress.completedSteps / project.calculatedProgress.totalSteps) * 100);
  }
  return project.progress || 0;
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
    projectManager: project.projectManager || 'Sarah Johnson', // Default value
    phase: project.phase || 'Lead'
  };
};

const DashboardPage = ({ tasks, activities, onProjectSelect, onAddActivity, colorMode, dashboardState }) => {
  console.log('🔍 DASHBOARD: Component rendering...');
  // Use database data instead of props
  const { data: projectsData, loading: projectsLoading, error: projectsError, refetch: refetchProjects } = useProjects({ limit: 100 });
  const projects = projectsData || [];
  
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
  const [selectedPhase, setSelectedPhase] = useState(null); // Start with no projects showing until phase selected
  
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
  
  // Refs for alert popups
  const alertContactButtonRefs = useRef({});
  const alertPmButtonRefs = useRef({});
  const [isDarkMode, setIsDarkMode] = useState(colorMode);
  const [alertExpanded, setAlertExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Alert action state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAlertForAssign, setSelectedAlertForAssign] = useState(null);
  const [assignToUser, setAssignToUser] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  
  // Fetch real alerts from API
  const { alerts: workflowAlerts, loading: alertsLoading, error: alertsError, refresh: refetchWorkflowAlerts } = useWorkflowAlerts({ status: 'active' });
  
  // Debug alerts loading
  console.log('🔍 DASHBOARD: Alerts loading state:', alertsLoading);
  console.log('🔍 DASHBOARD: Alerts error:', alertsError);
  console.log('🔍 DASHBOARD: Alerts data:', workflowAlerts);
  console.log('🔍 DASHBOARD: Alerts array length:', workflowAlerts?.length || 0);
  
  // Activity feed filter state (separate from posting state)
  const [newMessage, setNewMessage] = useState('');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Get current user on component mount
  useEffect(() => {
    const user = authService.getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Removed automatic popup closing - popups now require manual close only

  // Fetch messages and convert to activity format, with fallback to activities prop
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setMessagesLoading(true);
        // Fetch all conversations using authenticated service
        const response = await messagesService.getConversations();
        
        if (response.success && response.data && response.data.length > 0) {
          const allMessages = [];
          
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
                  priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                  metadata: {
                    projectPhase: project.status || 'Lead',
                    projectValue: project.budget || project.estimatedCost,
                    assignedTo: project.projectManager || 'Unknown',
                    customerName: project.customer?.primaryName || 'Unknown Customer'
                  }
                });
              });
            }
          }
          
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
      }
    };
    
    if (projects.length > 0 && !projectsLoading) {
      fetchMessages();
    }
  }, [projects, projectsLoading, activities]);

  // Restore dashboard state when navigating back from project detail
  useEffect(() => {
    if (dashboardState) {
      console.log('🔍 DASHBOARD: Restoring dashboard state:', dashboardState);
      
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

  // Remove DDD entries on component mount
  useEffect(() => {
    removeLatestDDD();
  }, []);

  // Subject options for dropdown
  const subjectOptions = subjects;

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  };

  // Enhanced project selection handler with scroll to top
      const handleProjectSelectWithScroll = (project, view = 'Project Profile', phase = null, sourceSection = null) => {
      console.log('🔍 DASHBOARD: handleProjectSelectWithScroll called with:');
      console.log('🔍 DASHBOARD: project:', project?.name);
      console.log('🔍 DASHBOARD: view:', view);
      console.log('🔍 DASHBOARD: phase:', phase);
      console.log('🔍 DASHBOARD: sourceSection:', sourceSection);
      console.log('🔍 DASHBOARD: sourceSection type:', typeof sourceSection);
      console.log('🔍 DASHBOARD: sourceSection === "Current Alerts":', sourceSection === 'Current Alerts');
      
      scrollToTop(); // Scroll to top immediately
      if (onProjectSelect) {
        console.log('🔍 DASHBOARD: Calling onProjectSelect with sourceSection:', sourceSection);
        onProjectSelect(project, view, phase, sourceSection); // FIX: pass sourceSection
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

  // Pagination logic with subject filtering and sorting
  const filteredActivities = feed.filter(activity => {
    const projectMatch = !activityProjectFilter || activity.projectId === parseInt(activityProjectFilter);
    const subjectMatch = !activitySubjectFilter || activity.subject === activitySubjectFilter;
    return projectMatch && subjectMatch;
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

  // Convert projects to table format for consistency
  const tableProjects = useMemo(() => {
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
      const phase = project.phase;
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
          return 'bg-blue-100 text-blue-800 border border-blue-300';
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
    return project ? project.name : 'Unknown Project';
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
        
        // Show success feedback
        console.log(`✅ SUCCESS: Line item '${stepName}' has been completed for project ${projectName}`);
        
        // ENHANCED: Dispatch global event to notify Project Workflow tab
        const globalEvent = new CustomEvent('workflowStepCompleted', {
          detail: {
            projectId: projectId,
            stepId: stepId,
            stepName: stepName,
            projectName: projectName,
            source: 'Dashboard Alert Completion',
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(globalEvent);
        console.log('📡 GLOBAL EVENT: Dispatched workflowStepCompleted event for Project Workflow tab');
        
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
                (step.stepName && stepName && typeof step.stepName === 'string' && typeof stepName === 'string' && 
                 step.stepName.toLowerCase().includes(stepName.toLowerCase()))
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
        
        // Step 3: Check for section and phase completion
        try {
          console.log('🔄 COMPLETION: Checking section and phase completion...');
          
          // Get the complete workflow data to analyze completion status
          const fullWorkflowResponse = await fetch(`/api/workflows/project/${projectId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (fullWorkflowResponse.ok) {
            const workflowData = await fullWorkflowResponse.json();
            const workflow = workflowData.data;
            
            console.log('✅ COMPLETION: Retrieved full workflow data for completion analysis');
            
            // Find the completed step to get its phase and section info
            const completedStep = workflow.steps?.find(step => 
              step.id === stepId || step.stepId === stepId || step._id === stepId
            );
            
            if (completedStep && completedStep.phase && completedStep.section) {
              const currentPhase = completedStep.phase;
              const currentSection = completedStep.section;
              
              console.log(`🎯 COMPLETION: Analyzing completion for Phase: ${currentPhase}, Section: ${currentSection}`);
              
              // Check if all line items in the current section are now completed
              const sectionSteps = workflow.steps?.filter(step => 
                step.phase === currentPhase && step.section === currentSection
              ) || [];
              
              const completedSectionSteps = sectionSteps.filter(step => step.isCompleted || step.completed || step.id === stepId);
              
              console.log(`📊 SECTION: ${completedSectionSteps.length}/${sectionSteps.length} steps completed in section '${currentSection}'`);
              
              // If this was the last step in the section, mark section as completed
              if (completedSectionSteps.length === sectionSteps.length && sectionSteps.length > 0) {
                console.log(`✅ SECTION: Section '${currentSection}' is now complete!`);
                
                // Make API call to mark section as completed
                try {
                  const sectionCompleteResponse = await fetch(`/api/workflows/project/${projectId}/section/${encodeURIComponent(currentSection)}/complete`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                      phase: currentPhase,
                      completedBy: currentUser?.firstName || 'User',
                      timestamp: new Date().toISOString()
                    })
                  });
                  
                  if (sectionCompleteResponse.ok) {
                    console.log('✅ SECTION: Successfully marked section as completed');
                  }
                } catch (sectionError) {
                  console.log('⚠️ SECTION: Section completion API call failed:', sectionError.message);
                }
                
                // Check if all sections in the current phase are now completed
                const phaseSteps = workflow.steps?.filter(step => step.phase === currentPhase) || [];
                const completedPhaseSteps = phaseSteps.filter(step => step.isCompleted || step.completed || step.id === stepId);
                
                // Get unique sections in this phase
                const phaseSections = [...new Set(phaseSteps.map(step => step.section))];
                const completedSections = phaseSections.filter(section => {
                  const sectionSteps = phaseSteps.filter(step => step.section === section);
                  const completedInThisSection = sectionSteps.filter(step => step.isCompleted || step.completed || step.id === stepId);
                  return completedInThisSection.length === sectionSteps.length && sectionSteps.length > 0;
                });
                
                console.log(`📊 PHASE: ${completedSections.length}/${phaseSections.length} sections completed in phase '${currentPhase}'`);
                
                // If all sections in the phase are completed, mark phase as completed
                if (completedSections.length === phaseSections.length && phaseSections.length > 0) {
                  console.log(`✅ PHASE: Phase '${currentPhase}' is now complete!`);
                  
                  // Make API call to mark phase as completed
                  try {
                    const phaseCompleteResponse = await fetch(`/api/workflows/project/${projectId}/phase/${encodeURIComponent(currentPhase)}/complete`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({
                        completedBy: currentUser?.firstName || 'User',
                        timestamp: new Date().toISOString()
                      })
                    });
                    
                    if (phaseCompleteResponse.ok) {
                      console.log('✅ PHASE: Successfully marked phase as completed');
                    }
                  } catch (phaseError) {
                    console.log('⚠️ PHASE: Phase completion API call failed:', phaseError.message);
                  }
                }
              }
            }
          }
        } catch (completionError) {
          console.log('⚠️ COMPLETION: Section/phase completion check failed:', completionError.message);
          // Don't fail the whole operation if completion check fails
        }
        
        // Step 4: Emit enhanced socket events for real-time updates across the application
        if (window.io && window.io.connected) {
          // Emit the main workflow step completion event
          window.io.emit('workflow_step_completed', {
            workflowId,
            stepId,
            projectId,
            stepName,
            completedBy: currentUser?.firstName || 'User',
            timestamp: new Date().toISOString()
          });
          
          // Emit project workflow update event to refresh all workflow-related components
          window.io.emit('project_workflow_updated', {
            projectId,
            workflowId,
            updateType: 'step_completed',
            stepId,
            stepName,
            timestamp: new Date().toISOString()
          });
          
          // Emit general project update event to refresh dashboards and project lists
          window.io.emit('project_updated', {
            projectId,
            updateType: 'workflow_progress',
            timestamp: new Date().toISOString()
          });
          
          console.log('📡 SOCKET: Emitted comprehensive workflow completion events');
        }
        
        // Step 5: Refresh dashboard data to reflect changes immediately
        try {
          // Refresh workflow alerts to remove completed alert
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
        
        // Step 6: Navigate to Project Workflow to show the completion (with delay for processing)
        setTimeout(() => {
          const project = projects.find(p => p.id === projectId);
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
      
      // Show error feedback to user
      alert(`Failed to complete workflow step: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: false }));
      
      // Remove completed alert from the local state to provide immediate feedback
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
      
      // Simulate API call to assign alert
      setTimeout(() => {
        console.log('✅ Alert assigned successfully');
        setShowAssignModal(false);
        setSelectedAlertForAssign(null);
        setAssignToUser('');
        setActionLoading(prev => ({ ...prev, [`${alertId}-assign`]: false }));
      }, 500);
      
    } catch (error) {
      console.error('❌ Failed to assign alert:', error);
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


  return (
    <div className={`animate-fade-in w-full max-w-full ${isDarkMode ? 'dark' : ''}`}>
      {/* Full Width - Project Overview by Phase - AT THE TOP */}
      {(
      <div className={`mb-6 border-t-4 border-blue-400 bg-white overflow-hidden relative shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] p-4 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'}`} data-section="project-phases">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Projects by Phase</h2>
            <p className={`text-xs mt-2 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Complete project details organized by phase
            </p>
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-colors duration-150 ${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        {/* Phase Filter Buttons - Oval Shapes with More Spacing */}
        <div className="flex items-center gap-8 mb-6 flex-wrap">
          <button 
            onClick={() => setSelectedPhase(selectedPhase === 'all' ? null : 'all')}
            className={`w-16 h-6 px-2 py-1 text-xs font-medium rounded-full transition-colors border flex items-center justify-center gap-1 ${
              selectedPhase === 'all'
                ? 'border-blue-400 bg-blue-50 shadow-sm text-blue-700'
                : colorMode 
                  ? 'border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 bg-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>All</span>
          </button>
          {PROJECT_PHASES.map(phase => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`w-28 h-9 px-4 py-2 text-xs font-bold rounded-full transition-colors border flex items-center justify-center gap-2 ${
                selectedPhase === phase.id
                  ? 'border-gray-400 bg-gray-50 shadow-sm'
                  : colorMode 
                    ? 'border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 bg-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: phase.color }}
              ></div>
              <span>{phase.name}</span>
            </button>
          ))}
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
                
                // Only show header if there are filtered projects
                if (filteredProjects.length > 0) {
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
                        <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Progress</th>
                        <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Alerts</th>
                        <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Messages</th>
                        <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Workflow</th>
                      </tr>
                    </thead>
                  );
                }
                return null;
              })()}
              <tbody>
                {(() => {
                  // Show loading state
                  if (projectsLoading) {
                    return (
                      <tr>
                        <td colSpan="8" className="text-center py-8">
                          <div className="text-blue-600">Loading projects...</div>
                        </td>
                      </tr>
                    );
                  }
                  
                  // Show error state but still try to show any projects we have
                  if (projectsError && (!projects || projects.length === 0)) {
                    return (
                      <tr>
                        <td colSpan="8" className="text-center py-8">
                          <div className="text-red-600">Error loading projects: {projectsError}</div>
                          <button 
                            onClick={() => refetchProjects()} 
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  
                  // Show no projects state
                  if (!projects || projects.length === 0) {
                    return (
                      <tr>
                        <td colSpan="8" className="text-center py-8">
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
                  
                  return sortedProjects.map((project) => {
                    const projectPhase = getProjectPhase(project);
                    const phaseConfig = PROJECT_PHASES.find(p => p.id === projectPhase) || PROJECT_PHASES[0];
                    
                    return (
                      <tr key={project.id} data-project-id={project.id} className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'} hover:bg-gray-50 transition-colors duration-300`}>
                        {/* Phase Column - First position with colored circle */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: phaseConfig.color }}
                            title={`Phase: ${phaseConfig.name}`}
                          >
                            {phaseConfig.initial}
                          </div>
                        </td>
                        
                        {/* Project Number - Second position - 5 digits only - Navigate to My Projects page */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <button 
                            onClick={() => {
                              if (onProjectSelect) {
                                const projectWithScrollId = {
                                  ...project,
                                  scrollToProjectId: String(project.id)
                                };
                                onProjectSelect(projectWithScrollId, 'Projects', null, 'Project Phases');
                              }
                            }}
                            className={`text-sm font-bold hover:underline cursor-pointer transition-colors ${
                              colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                            }`}
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
                        
                        {/* Progress - Click-based Collapsible */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <div className="relative">
                            <button 
                              ref={(el) => progressButtonRefs.current[project.id] = el}
                              onClick={() => toggleProgress(project.id)}
                              className="flex items-center gap-1 hover:bg-gray-100 rounded px-2 py-1.5 transition-colors w-full min-w-[100px]"
                            >
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${getProjectProgress(project)}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                {getProjectProgress(project)}%
                              </span>
                              <svg 
                                className={`w-4 h-4 transition-transform ml-auto ${expandedProgress.has(project.id) ? 'rotate-180' : ''}`} 
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
                            className="w-16 h-6 border border-blue-500 text-black text-xs rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center"
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
                            className="w-16 h-6 border border-blue-500 text-black text-xs rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center"
                          >
                            Messages
                          </button>
                        </td>
                        
                        {/* Workflow - Navigate to specific line item based on current project state */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (onProjectSelect) {
                                // Get the current workflow state using the centralized service
                                const workflowState = WorkflowProgressService.calculateProjectProgress(project);
                                const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
                                const currentPhase = WorkflowProgressService.getProjectPhase(project);
                                
                                const projectWithWorkflowState = {
                                  ...project,
                                  currentWorkflowStep: currentStep,
                                  workflowState: workflowState,
                                  scrollToCurrentLineItem: true,
                                  targetPhase: currentPhase,
                                  targetSection: currentStep?.stepName || currentStep?.name,
                                  targetLineItem: currentStep?.stepId,
                                  highlightLineItem: currentStep?.stepId,
                                  sourceSection: 'Project Phases',
                                  dashboardState: {
                                    selectedPhase: phaseConfig.id,
                                    expandedPhases: Array.from(expandedPhases),
                                    scrollToProject: project
                                  }
                                };
                                handleProjectSelectWithScroll(projectWithWorkflowState, 'Project Workflow', null, 'Project Phases');
                              }
                            }}
                            className="w-16 h-6 border border-blue-500 text-black text-xs rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center"
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
          <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Messages</h1>
                  {expandedMessages.size > 0 && (
                    <p className={`text-[9px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {expandedMessages.size} of {currentActivities.length} conversation{currentActivities.length !== 1 ? 's' : ''} expanded
                    </p>
                  )}
                </div>
                
                {/* Expand/Collapse All Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExpandAllMessages}
                    className={`px-2 py-1 text-[9px] font-medium rounded border transition-all duration-200 hover:scale-105 ${
                      expandedMessages.size === currentActivities.length && currentActivities.length > 0
                        ? colorMode 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-blue-500 text-white border-blue-500'
                        : colorMode 
                          ? 'bg-[#1e293b] text-blue-300 border-blue-400 hover:bg-blue-600 hover:text-white' 
                          : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                    }`}
                    title="Expand all message conversations"
                    disabled={currentActivities.length === 0 || expandedMessages.size === currentActivities.length}
                  >
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      Expand All
                    </div>
                  </button>
                  
                  <button
                    onClick={handleCollapseAllMessages}
                    className={`px-2 py-1 text-[9px] font-medium rounded border transition-all duration-200 hover:scale-105 ${
                      expandedMessages.size === 0 || currentActivities.length === 0
                        ? colorMode 
                          ? 'bg-gray-600 text-gray-300 border-gray-600' 
                          : 'bg-gray-300 text-gray-500 border-gray-300'
                        : colorMode 
                          ? 'bg-[#1e293b] text-gray-300 border-gray-400 hover:bg-gray-600 hover:text-white' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Collapse all message conversations"
                    disabled={currentActivities.length === 0 || expandedMessages.size === 0}
                  >
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      Collapse All
                    </div>
                  </button>
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
                  {subjects.map(subject => (
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
                      const selectedProject = projects.find(p => p.id === parseInt(newMessageProject));
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
                          {(projects || []).map(project => (
                            <option key={project.id} value={project.id}>
                              #{String(project.projectNumber || project.id).padStart(5, '0')} - {project.name || project.address}
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
                          {subjects.map(subject => (
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
                    isExpanded={expandedMessages.has(activity.id)}
                    onToggleExpansion={handleToggleMessage}
                  />
                ))
              )}
            </div>
          </div>
        </div>
        {/* Right Column - Current Alerts */}
        <div className="w-full" data-section="current-alerts">
          <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h1>
                  {expandedAlerts.size > 0 && (
                    <p className={`text-[9px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {expandedAlerts.size} of {getPaginatedAlerts().length} alert{getPaginatedAlerts().length !== 1 ? 's' : ''} expanded
                    </p>
                  )}
                </div>
                
                {/* Expand/Collapse All Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExpandAllAlerts}
                    className={`px-2 py-1 text-[9px] font-medium rounded border transition-all duration-200 hover:scale-105 ${
                      expandedAlerts.size === getPaginatedAlerts().length && getPaginatedAlerts().length > 0
                        ? colorMode 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-blue-500 text-white border-blue-500'
                        : colorMode 
                          ? 'bg-[#1e293b] text-blue-300 border-blue-400 hover:bg-blue-600 hover:text-white' 
                          : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                    }`}
                    title="Expand all alert details"
                    disabled={getPaginatedAlerts().length === 0 || expandedAlerts.size === getPaginatedAlerts().length}
                  >
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      Expand All
                    </div>
                  </button>
                  
                  <button
                    onClick={handleCollapseAllAlerts}
                    className={`px-2 py-1 text-[9px] font-medium rounded border transition-all duration-200 hover:scale-105 ${
                      expandedAlerts.size === 0 || getPaginatedAlerts().length === 0
                        ? colorMode 
                          ? 'bg-gray-600 text-gray-300 border-gray-600' 
                          : 'bg-gray-300 text-gray-500 border-gray-300'
                        : colorMode 
                          ? 'bg-[#1e293b] text-gray-300 border-gray-400 hover:bg-gray-600 hover:text-white' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Collapse all alert details"
                    disabled={getPaginatedAlerts().length === 0 || expandedAlerts.size === 0}
                  >
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      Collapse All
                    </div>
                  </button>
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
              
            </div>
            
            {/* Horizontal line to match Project Messages alignment */}
            <div className={`border-t mb-3 mt-3 ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
            
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
                    // Use centralized phase normalization
                    const normalizedPhase = WorkflowProgressService.normalizePhase(phase || 'LEAD');
                    return WorkflowProgressService.getPhaseColor(normalizedPhase);
                  };
                  return (
                    <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-[12px] shadow-sm border transition-all duration-200 cursor-pointer`}>
                      {/* Alert header - ENTIRE AREA CLICKABLE FOR DROPDOWN */}
                      <div 
                        className="flex flex-col gap-0 px-1.5 py-0 hover:bg-opacity-80 transition-colors cursor-pointer"
                        onClick={() => toggleAlertExpansion(alertId)}
                      >
                        {/* First Row - Project# | Customer ▼ | PM ▼ | UserGroup | Arrow - More spaced out */}
                        <div className="flex items-center justify-between gap-3">
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
                                  if (project && onProjectSelect) {
                                    const projectWithScrollId = {
                                      ...project,
                                      scrollToProjectId: String(project.id)
                                    };
                                    handleProjectSelectWithScroll(projectWithScrollId, 'Projects', null, 'Current Alerts');
                                  }
                                }}
                              >
                                {project?.projectNumber || actionData.projectNumber || '12345'}
                              </span>
                              
                              {/* Customer with dropdown arrow - Moved 2 more spaces left */}
                              <div className="flex items-center gap-1 flex-shrink-0" style={{width: '140px', marginLeft: '3px'}}>
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
                              
                              {/* PM with dropdown arrow - Moved 2 more spaces right */}
                              <div className="flex items-center gap-1 flex-shrink-0" style={{marginLeft: '22px'}}>
                                <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>PM:</span>
                                <button 
                                  ref={(el) => alertPmButtonRefs.current[alertId] = el}
                                  className={`text-[9px] font-semibold cursor-pointer hover:underline truncate max-w-[80px] ${
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
                            
                            {/* Right Section: User Group & Arrow */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="w-8 h-3 px-0.5 py-0 border border-gray-300 rounded-full flex items-center justify-center text-black font-medium text-[7px] bg-white">
                                {formatUserRole(alert.user?.role || actionData.defaultResponsible || 'OFFICE')}
                              </div>
                              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Second Row - Section and Line Item */}
                        <div className="flex items-center text-[9px]" style={{ marginTop: '-2px', marginLeft: '32px' }}>
                          {/* Section label aligned under Project Number, Section value aligned under Customer Name */}
                          <div className="flex items-center" style={{ width: '210px' }}>
                            {/* Section label - S aligns under Project Number first digit */}
                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ width: '50px' }}>Section:</span>
                            {/* Section value - first letter aligns under Customer's Name first letter (5px left margin adjustment) */}
                            <span className={`font-semibold truncate ${colorMode ? 'text-gray-200' : 'text-gray-700'}`} style={{ marginLeft: '2px' }}>
                              {sectionName?.split('-')[0]?.trim() || sectionName}
                            </span>
                          </div>
                          
                          {/* Line Item - moved 3 spaces right, L aligns under P of PM */}
                          <div className="flex items-center gap-1 flex-1" style={{ marginLeft: '23px' }}>
                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Line Item:</span>
                            <span 
                                className={`font-semibold cursor-pointer hover:underline max-w-[120px] truncate ${
                                  colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                }`}
                                title={lineItemName}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (project && onProjectSelect) {
                                    const projectWithStepInfo = {
                                      ...project,
                                      highlightStep: alertTitle,
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
      </div>


      {/* Project Cubes - Quick Access */}
      <div className="mt-6 border-t-4 border-blue-400 bg-white overflow-hidden relative rounded-t-[8px]" data-section="project-cubes">
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
                disabled={!assignToUser}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  assignToUser
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                Assign
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
                    className={`text-sm hover:underline ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {project.client?.phone || 'No phone'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✉️</span>
                  <a 
                    href={`mailto:${project.client?.email || ''}`}
                    className={`text-sm hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
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
                    className={`text-sm hover:underline ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {project.pmPhone || project.projectManager?.phone || 'No phone'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✉️</span>
                  <a 
                    href={`mailto:${project.pmEmail || project.projectManager?.email || ''}`}
                    className={`text-sm hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {project.pmEmail || project.projectManager?.email || 'No email'}
                  </a>
                </div>
              </div>
            </div>
          </DraggablePopup>
        );
      })}

      {/* Draggable Progress Popups */}
      {Array.from(expandedProgress).map(projectId => {
        const project = projects?.find(p => p.id === projectId);
        if (!project) return null;
        
        return (
          <DraggablePopup
            key={`progress-${projectId}`}
            isOpen={true}
            onClose={() => toggleProgress(projectId)}
            colorMode={colorMode}
            triggerRef={progressButtonRefs.current[projectId] ? { current: progressButtonRefs.current[projectId] } : null}
            className="min-w-[300px]"
          >
            <div className="space-y-4">
              <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Project Progress Details
              </div>
              
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Overall Project Progress</span>
                  <span className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{getProjectProgress(project)}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden border ${colorMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`}>
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${getProjectProgress(project)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Materials & Labor Section */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleTrades(project.id)}
                  className={`flex items-center gap-2 text-xs font-semibold hover:opacity-80 transition-opacity ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}
                >
                  <span>Materials & Labor</span>
                  <svg 
                    className={`w-3 h-3 transition-transform ${expandedTrades.has(project.id) ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Materials & Labor Details */}
                {expandedTrades.has(project.id) && (
                  <div className="space-y-3 ml-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>Materials</span>
                        <span className={`text-xs font-semibold ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>{project.materialsProgress || 85}%</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden border ${colorMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`}>
                        <div 
                          className="h-full bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: `${project.materialsProgress || 85}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>Labor</span>
                        <span className={`text-xs font-semibold ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>{project.laborProgress || 75}%</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden border ${colorMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`}>
                        <div 
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                          style={{ width: `${project.laborProgress || 75}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Additional Trades Section */}
                    <div className="space-y-2">
                      <button
                        onClick={() => toggleAdditionalTrades(project.id)}
                        className={`flex items-center gap-2 text-xs font-semibold hover:opacity-80 transition-opacity ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        <span>Additional Trades</span>
                        <svg 
                          className={`w-3 h-3 transition-transform ${expandedAdditionalTrades.has(project.id) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Additional Trades Details */}
                      {expandedAdditionalTrades.has(project.id) && (
                        <div className="space-y-2 ml-4">
                          {[
                            { name: 'Roofing', progress: project.roofingProgress || 90, color: 'bg-purple-500' },
                            { name: 'Siding', progress: project.sidingProgress || 60, color: 'bg-blue-500' },
                            { name: 'Windows', progress: project.windowsProgress || 40, color: 'bg-yellow-500' },
                            { name: 'Gutters', progress: project.guttersProgress || 30, color: 'bg-red-500' }
                          ].map((trade) => (
                            <div key={trade.name} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>{trade.name}</span>
                                <span className={`text-xs font-semibold ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>{trade.progress}%</span>
                              </div>
                              <div className={`w-full h-1 rounded-full overflow-hidden border ${colorMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`}>
                                <div 
                                  className={`h-full ${trade.color} rounded-full transition-all duration-300`}
                                  style={{ width: `${trade.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DraggablePopup>
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
            triggerRef={alertContactButtonRefs.current[alertId] ? { current: alertContactButtonRefs.current[alertId] } : null}
          >
            <div className="space-y-3">
              <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                {project?.customer?.name || project?.clientName || 'Primary Customer'}
              </div>
              <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} flex items-start gap-2`}>
                <span>📍</span>
                <span>{project?.customer?.address || project?.clientAddress || '123 Main Street, City, State 12345'}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📞</span>
                  <a 
                    href={`tel:${(project?.customer?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`}
                    className={`text-sm hover:underline ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {project?.customer?.phone || project?.clientPhone || '(555) 123-4567'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✉️</span>
                  <a 
                    href={`mailto:${project?.customer?.email || project?.clientEmail || 'customer@email.com'}`}
                    className={`text-sm hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {project?.customer?.email || project?.clientEmail || 'customer@email.com'}
                  </a>
                </div>
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
                    className={`text-sm hover:underline ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {project?.projectManager?.phone || '(555) 234-5678'}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✉️</span>
                  <a 
                    href={`mailto:${project?.projectManager?.email || 'mike.field@company.com'}`}
                    className={`text-sm hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {project?.projectManager?.email || 'mike.field@company.com'}
                  </a>
                </div>
              </div>
            </div>
          </DraggablePopup>
        );
      })}
      
    </div>
  );
};

export default DashboardPage;