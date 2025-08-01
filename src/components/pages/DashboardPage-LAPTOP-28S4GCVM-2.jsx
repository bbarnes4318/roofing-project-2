import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDownIcon, ChevronLeftIcon } from '../common/Icons';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';

import ProjectCubes from '../dashboard/ProjectCubes';
// import { initialTasks, teamMembers, mockAlerts } from '../../data/mockData';
import { formatPhoneNumber } from '../../utils/helpers';
import { useProjects, useProjectStats, useTasks, useRecentActivities, useWorkflowAlerts } from '../../hooks/useApi';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import { authService, messagesService } from '../../services/api';
import { ACTIVITY_FEED_SUBJECTS, ALERT_SUBJECTS } from '../../data/constants';
import { mapStepToWorkflowStructure } from '../../utils/workflowMapping';

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

// Project phases configuration
const PROJECT_PHASES = [
  { id: 'lead', name: 'Lead', initial: 'L', color: '#8B5CF6', gradientColor: 'from-purple-400 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
  { id: 'prospect', name: 'Prospect', initial: 'P', color: '#F97316', gradientColor: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  { id: 'approved', name: 'Approved', initial: 'A', color: '#10B981', gradientColor: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
  { id: 'execution', name: 'Execute', initial: 'E', color: '#3B82F6', gradientColor: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  { id: 'supplement', name: '2nd Supp', initial: 'S', color: '#EAB308', gradientColor: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
  { id: 'completion', name: 'Completion', initial: 'C', color: '#14B8A6', gradientColor: 'from-teal-500 to-teal-600', bgColor: 'bg-teal-50', textColor: 'text-teal-700', borderColor: 'border-teal-200' }
];

// Helper function to calculate actual project progress from workflow steps
const getProjectProgress = (project) => {
  if (project.calculatedProgress?.completedSteps && project.calculatedProgress?.totalSteps) {
    return Math.round((project.calculatedProgress.completedSteps / project.calculatedProgress.totalSteps) * 100);
  }
  return project.progress || 0;
};

// Helper function to map project status to phase
const mapStatusToPhase = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
    case 'planning':
    case 'lead':
      return 'lead';
    case 'active':
    case 'in-progress':
    case 'execution':
      return 'execution';
    case 'completed':
    case 'completion':
      return 'completion';
    case 'approved':
      return 'approved';
    case 'supplement':
      return 'supplement';
    case 'prospect':
      return 'prospect';
    default:
      return 'lead';
  }
};

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
    priority: project.priority || 'Medium',
    clientName: project.client?.name || 'Unknown',
    clientEmail: project.client?.email || '',
    projectManager: project.projectManager || 'Sarah Johnson', // Default value
    phase: mapStatusToPhase(project.status)
  };
};

    const DashboardPage = ({ tasks, activities, onProjectSelect, onAddActivity, colorMode, dashboardState }) => {
      // Use database data instead of props
      const { data: projectsData, loading: projectsLoading, error: projectsError } = useProjects({ limit: 100 });
      const projects = projectsData || [];
      
      // Fetch messages from conversations
      const [messagesData, setMessagesData] = useState([]);
      const [messagesLoading, setMessagesLoading] = useState(true);
      
      // Debug project loading
      console.log('🔍 DASHBOARD: Projects loading state:', projectsLoading);
      console.log('🔍 DASHBOARD: Projects error:', projectsError);
      console.log('🔍 DASHBOARD: Projects data:', projectsData);
      console.log('🔍 DASHBOARD: Projects array length:', projects.length);
    // Posting state
    const [message, setMessage] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [sendAsAlert, setSendAsAlert] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [alertPriority, setAlertPriority] = useState('medium');

    // Activity feed filter state (separate from posting state)
    const [activityProjectFilter, setActivityProjectFilter] = useState('');
    const [activitySubjectFilter, setActivitySubjectFilter] = useState('');

    // Alert filter state
    const [alertProjectFilter, setAlertProjectFilter] = useState('all');
    const [alertSubjectFilter, setAlertSubjectFilter] = useState('all');
  
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
  const [activitySortConfig, setActivitySortConfig] = useState({ key: null, direction: 'asc' });
  
  // UI state
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [selectedPhase, setSelectedPhase] = useState(null); // Start with no phase selected
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [expandedProgress, setExpandedProgress] = useState(new Set());
  const [expandedTrades, setExpandedTrades] = useState(new Set());
  const [expandedAdditionalTrades, setExpandedAdditionalTrades] = useState(new Set());
  const [expandedContacts, setExpandedContacts] = useState(new Set());
  const [expandedPMs, setExpandedPMs] = useState(new Set());
  const [contactDropdownPos, setContactDropdownPos] = useState({});
  const [pmDropdownPos, setPmDropdownPos] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(colorMode);
  const [alertExpanded, setAlertExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Alert action state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAlertForAssign, setSelectedAlertForAssign] = useState(null);
  const [assignToUser, setAssignToUser] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  
  // Fetch real alerts from API
  const { alerts: workflowAlerts, loading: alertsLoading, error: alertsError } = useWorkflowAlerts({ status: 'active' });
  
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

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any dropdown
      const isInsideDropdown = event.target.closest('[data-dropdown="contact"]') || 
                              event.target.closest('[data-dropdown="pm"]') ||
                              event.target.closest('[data-dropdown="progress"]') ||
                              event.target.closest('[data-dropdown="trades"]') ||
                              event.target.closest('[data-dropdown="additional-trades"]');
      
      if (!isInsideDropdown) {
        // Close all dropdowns
        setExpandedContacts(new Set());
        setExpandedPMs(new Set());
        setExpandedProgress(new Set());
        setExpandedTrades(new Set());
        setExpandedAdditionalTrades(new Set());
        setContactDropdownPos({});
        setPmDropdownPos({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
  const subjectOptions = ACTIVITY_FEED_SUBJECTS;

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

        if (typeof aValue === 'string') {
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
    setAlertPriority('medium');
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
    
    tableProjects.forEach(project => {
      const phase = project.phase;
      if (grouped[phase]) {
        grouped[phase].push(project);
      } else {
        // Default to lead phase if phase not found
        grouped['lead'].push(project);
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
      setContactDropdownPos(prev => ({ ...prev, [contactId]: null }));
    } else {
      newExpanded.add(contactId);
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        setContactDropdownPos(prev => ({ 
          ...prev, 
          [contactId]: { 
            top: rect.bottom + window.scrollY + 5, 
            left: rect.left + window.scrollX 
          } 
        }));
      }
    }
    setExpandedContacts(newExpanded);
  };

  const togglePM = (pmId, buttonElement = null) => {
    const newExpanded = new Set(expandedPMs);
    if (newExpanded.has(pmId)) {
      newExpanded.delete(pmId);
      setPmDropdownPos(prev => ({ ...prev, [pmId]: null }));
    } else {
      newExpanded.add(pmId);
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        setPmDropdownPos(prev => ({ 
          ...prev, 
          [pmId]: { 
            top: rect.bottom + window.scrollY + 5, 
            left: rect.left + window.scrollX 
          } 
        }));
      }
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
    
    // Apply subject filter
    // Note: alertSubjectFilter removed as it's not being used in the UI
    
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
      <div className={`mb-6 border-t-4 border-blue-400 bg-white overflow-hidden relative shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] p-4 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'}`} data-section="project-phases">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-base font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Projects by Phase</h2>
            <p className={`text-xs mt-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
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
            onClick={() => setSelectedPhase('all')}
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
              className={`w-28 h-9 px-4 py-2 text-xs font-medium rounded-full transition-colors border flex items-center justify-center gap-2 ${
                selectedPhase === phase.id
                  ? 'border-gray-400 bg-gray-50 shadow-sm'
                  : colorMode 
                    ? 'border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 bg-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: phase.color }}
              ></div>
              <span>{phase.name}</span>
            </button>
          ))}
        </div>


        {/* All Projects Table */}
        <div className="mb-4 overflow-visible">
          
          <div className="overflow-visible">
            <table className="w-full text-[10px]">
              <thead>
                <tr className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>Phase</th>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project #</th>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>Address</th>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>Primary Contact</th>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>PM</th>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>Progress</th>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>Alerts</th>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>Messages</th>
                  <th className={`text-left py-2 px-2 font-semibold whitespace-nowrap ${colorMode ? 'text-white' : 'text-gray-800'}`}>Workflow</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Show loading state
                  if (projectsLoading) {
                    return (
                      <tr>
                        <td colSpan="9" className="text-center py-8">
                          <div className="text-blue-600">Loading projects...</div>
                        </td>
                      </tr>
                    );
                  }
                  
                  // Show error state
                  if (projectsError) {
                    return (
                      <tr>
                        <td colSpan="9" className="text-center py-8">
                          <div className="text-red-600">Error loading projects: {projectsError.message}</div>
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
                        const projectPhase = mapStatusToPhase(project.status) || project.phase || 'lead';
                        return projectPhase === selectedPhase;
                      });
                  
                  return filteredProjects.map((project) => {
                    const projectPhase = mapStatusToPhase(project.status) || project.phase || 'lead';
                    const phaseConfig = PROJECT_PHASES.find(p => p.id === projectPhase) || PROJECT_PHASES[0];
                    
                    return (
                      <tr key={project.id} data-project-id={project.id} className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'} hover:bg-gray-50 transition-colors duration-300`}>
                        {/* Phase Column - First position with colored circle */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          {projectPhase === 'lead' && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-purple-500 border-2 border-purple-500">
                              L
                            </div>
                          )}
                          {projectPhase === 'prospect' && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-orange-500 border-2 border-orange-500">
                              P
                            </div>
                          )}
                          {projectPhase === 'approved' && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-green-500 border-2 border-green-500">
                              A
                            </div>
                          )}
                          {projectPhase === 'execution' && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-blue-500 border-2 border-blue-500">
                              E
                            </div>
                          )}
                          {projectPhase === 'supplement' && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-yellow-500 border-2 border-yellow-500">
                              S
                            </div>
                          )}
                          {projectPhase === 'completion' && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-teal-500 border-2 border-teal-500">
                              C
                            </div>
                          )}
                          {!['lead', 'prospect', 'approved', 'execution', 'supplement', 'completion'].includes(projectPhase) && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-red-500 border-2 border-red-500">
                              ?
                            </div>
                          )}
                        </td>
                        
                        {/* Project Number - 5 digits only */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className={`text-xs font-bold ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}>
                            {String(project.projectNumber || project.id).padStart(5, '0')}
                          </span>
                        </td>
                        
                        {/* Project Name */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className="text-xs text-gray-700">
                            {project.address || project.name}
                          </span>
                        </td>
                        
                        {/* Customer */}
                        <td className="py-2 px-2 whitespace-nowrap overflow-visible relative">
                          <div className="relative" data-dropdown="contact">
                            <button 
                              onClick={(e) => toggleContact(project.id, e.currentTarget)}
                              className={`flex items-center gap-1 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors ${
                                expandedContacts.has(project.id) ? 'bg-gray-100' : ''
                              }`}>
                              <span className="text-xs font-semibold text-gray-700">
                                {project.client?.name || project.clientName || ''}
                              </span>
                              <svg 
                                className={`w-3 h-3 transition-transform ${expandedContacts.has(project.id) ? 'rotate-180' : ''}`} 
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
                        <td className="py-2 px-2 whitespace-nowrap overflow-visible relative">
                          <div className="relative">
                            <button 
                              onClick={(e) => togglePM(project.id, e.currentTarget)}
                              className={`flex items-center gap-1 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors ${
                                expandedPMs.has(project.id) ? 'bg-gray-100' : ''
                              }`}>
                              <span className="text-xs text-gray-700">
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
                              onClick={() => toggleProgress(project.id)}
                              className="flex items-center gap-1 hover:bg-gray-100 rounded px-2 py-1.5 transition-colors w-full min-w-[100px]"
                            >
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${getProjectProgress(project)}%` }}
                                ></div>
                              </div>
                              <span className={`text-[10px] ${colorMode ? 'text-white' : 'text-gray-800'}`}>
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
                            
                            {/* Progress Details - Only show when clicked */}
                            {expandedProgress.has(project.id) && (
                              <>
                                <div className="fixed bg-white border-2 border-blue-500 rounded-[20px] shadow-xl z-50 min-w-[250px] max-w-[300px]" data-dropdown="progress" style={{
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)'
                                }}>
                                <div className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] font-semibold text-gray-800">Project Progress Details</div>
                                    <button 
                                      onClick={() => toggleProgress(project.id)}
                                      className="text-gray-500 hover:text-gray-700 text-lg font-bold"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  
                                  {/* Overall Progress */}
                                  <div className="mb-3">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[9px] text-gray-600">Overall Project Progress</span>
                                      <span className="text-[9px] font-semibold text-gray-800">{getProjectProgress(project)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                      <div 
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${getProjectProgress(project)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  
                                  {/* Materials & Labor Section - First dropdown level */}
                                  <div data-dropdown="trades">
                                    <button
                                      onClick={() => toggleTrades(project.id)}
                                      className="flex items-center gap-1 text-[10px] font-semibold text-gray-800 mb-1 hover:text-gray-600"
                                    >
                                      <span>Materials & Labor</span>
                                      <svg 
                                        className={`w-2 h-2 transition-transform ${expandedTrades.has(project.id) ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                    
                                    {/* Materials & Labor - First level dropdown */}
                                    {expandedTrades.has(project.id) && (
                                      <div className="space-y-1 mt-2" data-dropdown="trades">
                                        <div>
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-[8px] text-gray-600">Materials</span>
                                            <span className="text-[8px] font-semibold text-gray-800">{project.materialsProgress || 85}%</span>
                                          </div>
                                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                            <div 
                                              className="h-full bg-green-500 rounded-full"
                                              style={{ width: `${project.materialsProgress || 85}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-[8px] text-gray-600">Labor</span>
                                            <span className="text-[8px] font-semibold text-gray-800">{project.laborProgress || 75}%</span>
                                          </div>
                                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                            <div 
                                              className="h-full bg-orange-500 rounded-full"
                                              style={{ width: `${project.laborProgress || 75}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                        
                                        {/* Additional Trades Section - Second dropdown level */}
                                        <div className="mt-2" data-dropdown="additional-trades">
                                          <button
                                            onClick={() => toggleAdditionalTrades(project.id)}
                                            className="flex items-center gap-1 text-[10px] font-semibold text-gray-700 mb-1 hover:text-gray-500"
                                          >
                                            <span>Additional Trades</span>
                                            <svg 
                                              className={`w-4 h-4 transition-transform ${expandedAdditionalTrades.has(project.id) ? 'rotate-180' : ''}`} 
                                              fill="none" 
                                              stroke="currentColor" 
                                              viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                          
                                          {/* Additional Trades - Second level dropdown */}
                                          {expandedAdditionalTrades.has(project.id) && (
                                            <div className="space-y-1 mt-1 ml-2" data-dropdown="additional-trades">
                                              <div>
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="text-[7px] text-gray-600">Roofing</span>
                                                  <span className="text-[7px] font-semibold text-gray-800">{project.roofingProgress || 90}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                                  <div 
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${project.roofingProgress || 90}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                              
                                              <div>
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="text-[7px] text-gray-600">Siding</span>
                                                  <span className="text-[7px] font-semibold text-gray-800">{project.sidingProgress || 60}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                                  <div 
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${project.sidingProgress || 60}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                              
                                              <div>
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="text-[7px] text-gray-600">Windows</span>
                                                  <span className="text-[7px] font-semibold text-gray-800">{project.windowsProgress || 40}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                                  <div 
                                                    className="h-full bg-yellow-500 rounded-full"
                                                    style={{ width: `${project.windowsProgress || 40}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                              
                                              <div>
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="text-[7px] text-gray-600">Gutters</span>
                                                  <span className="text-[7px] font-semibold text-gray-800">{project.guttersProgress || 30}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                                  <div 
                                                    className="h-full bg-red-500 rounded-full"
                                                    style={{ width: `${project.guttersProgress || 30}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              </>
                            )}
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
                            className="w-16 h-6 border border-blue-500 text-black text-[10px] rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center"
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
                            className="w-16 h-6 border border-blue-500 text-black text-[10px] rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center"
                          >
                            Messages
                          </button>
                        </td>
                        
                        {/* Workflow - Blue outlined oval box */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              const projectWithDashboardState = {
                                ...project,
                                scrollToWorkflowStepId: 'current_step', // Will be handled by ProjectChecklistPage
                                navigationTarget: 'workflow',
                                sourceSection: 'Project Phases',
                                dashboardState: {
                                  selectedPhase: phaseConfig.id,
                                  expandedPhases: Array.from(expandedPhases),
                                  scrollToProject: project,
                                  projectSourceSection: 'Project Phases'
                                }
                              };
                              handleProjectSelectWithScroll(projectWithDashboardState, 'Project Checklist', null, 'Project Phases');
                            }}
                            className="w-16 h-6 border border-blue-500 text-black text-[10px] rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center"
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
        </div>
      </div>

      {/* Main Dashboard Layout - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 items-start overflow-visible">
        {/* Left Column - Project Messages */}
        <div className="w-full" data-section="project-messages">
          <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Messages</h1>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-3">
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
        {/* Right Column - Current Alerts */}
        <div className="w-full" data-section="current-alerts">
          <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] rounded-t-[8px] px-4 py-3 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden relative`}>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h1>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-3">
              {getPaginatedAlerts().length === 0 ? (
                <div className="text-gray-400 text-center py-3 text-xs">
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
                  
                  // Helper function to get phase colors matching PROJECT_PHASES
                  const getPhaseCircleColors = (phase) => {
                    const phaseMap = {
                      'LEAD': 'from-purple-400 to-purple-600',     
                      'PROSPECT': 'from-orange-500 to-orange-600', 
                      'APPROVED': 'from-green-500 to-green-600',   
                      'EXECUTION': 'from-blue-500 to-blue-600',    
                      '2ND_SUPP': 'from-yellow-500 to-yellow-600', 
                      'COMPLETION': 'from-green-500 to-green-600'  
                    };
                    return phaseMap[phase] || 'from-blue-500 to-blue-600';
                  };
                  
                  return (
                    <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-[20px] shadow-sm border transition-all duration-200 cursor-pointer`}>
                      {/* Alert header - ENTIRE AREA CLICKABLE FOR DROPDOWN */}
                      <div 
                        className="flex items-start gap-2 p-2 hover:bg-opacity-80 transition-colors cursor-pointer"
                        onClick={() => toggleAlertExpansion(alertId)}
                      >
                        {/* Large Phase Circle with Priority Indicator */}
                        <div className="relative flex-shrink-0 mt-1">
                          {/* Main phase circle - spans both rows */}
                          <div className={`w-8 h-8 bg-gradient-to-br ${getPhaseCircleColors(phase)} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                            {phase.charAt(0).toUpperCase()}
                          </div>
                          {/* High priority red circle indicator - only show for high alerts */}
                          {priority === 'high' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Row 1: ProjectNumber  PrimaryCustomer  AssignedUsers - NO TEXT WRAPPING */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              {/* Project Number */}
                              <span 
                                className={`text-xs font-bold cursor-pointer hover:underline whitespace-nowrap truncate ${
                                  colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                }`}
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
                              
                              {/* Primary Customer - Blue clickable with dropdown */}
                              <div className="flex items-center gap-1">
                                <button 
                                  className={`text-xs font-semibold whitespace-nowrap truncate max-w-[120px] transition-colors hover:underline ${
                                    colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
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
                                  {project?.customer?.name || project?.clientName || actionData.projectName || 'Primary Customer'}
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
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {/* Assigned Users */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="px-1.5 py-0.5 border border-gray-300 rounded-full flex items-center justify-center text-black font-medium text-xs bg-white whitespace-nowrap">
                                {formatUserRole(alert.user?.role || actionData.defaultResponsible || 'OFFICE')}
                              </div>
                            </div>
                            <div className="flex flex-col mr-4">
                              <div className="flex items-center mb-1">
                                <span className="font-semibold w-8">PM:</span>
                                <div className="flex items-center gap-1 ml-1">
                                  <button 
                                    className={`cursor-pointer hover:underline font-medium whitespace-nowrap truncate inline-block max-w-[120px] ${
                                      colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                    title={project?.projectManager?.name || 'Mike Field'}
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
                                    {project?.projectManager?.name || 'Mike Field'}
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
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex items-center">
                                <span className="font-semibold">Line Item:</span>
                                <span 
                                  className={`ml-1 cursor-pointer hover:underline font-medium whitespace-nowrap truncate inline-block max-w-[120px] ${
                                    colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                  }`}
                                  title={lineItemName}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (project && onProjectSelect) {
                                      const projectWithStepInfo = {
                                        ...project,
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
                          </div>
                          
                          {/* Row 2: Section */}
                          <div className="flex items-center justify-between">
                            <div className={`text-xs min-w-0 flex-1 flex items-center ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                              <div className="flex items-center mr-4">
                                <span className="font-semibold">Section:</span>
                                <span className="ml-1 whitespace-nowrap truncate inline-block max-w-[100px]" title={sectionName}>{sectionName}</span>
                              </div>
                            </div>
                            
                            {/* Dropdown arrow */}
                            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ml-2 flex-shrink-0`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact Info Dropdown */}
                      {expandedContacts.has(alertId) && (
                        <div className={`px-3 py-2 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <div className={`p-3 rounded-lg ${colorMode ? 'bg-[#1e293b]' : 'bg-white'} border ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <div className={`text-sm font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                              {project?.customer?.name || project?.clientName || actionData.projectName || 'Primary Customer'}
                            </div>
                            <div className="space-y-1">
                              <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                📍 {project?.customer?.address || project?.clientAddress || '123 Main Street, City, State 12345'}
                              </div>
                              <a 
                                href={`tel:${(project?.customer?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                                className={`block text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                              >
                                📞 {project?.customer?.phone || project?.clientPhone || '(555) 123-4567'}
                              </a>
                              <a 
                                href={`mailto:${project?.customer?.email || project?.clientEmail || 'customer@email.com'}`} 
                                className={`block text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                              >
                                ✉️ {project?.customer?.email || project?.clientEmail || 'customer@email.com'}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* PM Info Dropdown */}
                      {expandedPMs.has(alertId) && (
                        <div className={`px-3 py-2 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <div className={`p-3 rounded-lg ${colorMode ? 'bg-[#1e293b]' : 'bg-white'} border ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <div className={`text-sm font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                              {project?.projectManager?.name || 'Mike Field'} - Project Manager
                            </div>
                            <div className="space-y-1">
                              <a 
                                href={`tel:${(project?.projectManager?.phone || '(555) 234-5678').replace(/[^\d+]/g, '')}`} 
                                className={`block text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                              >
                                📞 {project?.projectManager?.phone || '(555) 234-5678'}
                              </a>
                              <a 
                                href={`mailto:${project?.projectManager?.email || 'mike.field@company.com'}`} 
                                className={`block text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                              >
                                ✉️ {project?.projectManager?.email || 'mike.field@company.com'}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Expandable dropdown section */}
                      {isExpanded && (
                        <div className={`px-3 py-3 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          {/* Action Buttons - First Priority */}
                          <div className="flex gap-3 mb-4">
                            {/* Complete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteAlert(alert);
                              }}
                              disabled={actionLoading[`${alertId}-complete`]}
                              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${
                                actionLoading[`${alertId}-complete`] 
                                  ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' 
                                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 hover:from-green-600 hover:to-green-700 hover:border-green-600 shadow-sm hover:shadow-md'
                              }`}
                            >
                              {actionLoading[`${alertId}-complete`] ? (
                                <span className="flex items-center justify-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Completing...
                                </span>
                              ) : (
                                <span className="flex items-center justify-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${
                                actionLoading[`${alertId}-assign`]
                                  ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 hover:from-blue-600 hover:to-blue-700 hover:border-blue-600 shadow-sm hover:shadow-md'
                              }`}
                            >
                              <span className="flex items-center justify-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Assign to User
                              </span>
                            </button>
                          </div>

                          {/* Alert Notes Section - Second Priority */}
                          <div className={`mb-4 p-3 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-300'}`}>
                            <div className={`text-sm leading-relaxed ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {alert.message || alert.description || 'This workflow step requires attention and completion to proceed with the project timeline.'}
                            </div>
                          </div>

                          {/* Contact Information - Third Priority */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Primary Customer */}
                            <div className={`p-3 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-300'}`}>
                              <div className={`text-sm font-bold mb-3 pb-2 border-b ${colorMode ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-200'}`}>
                                Primary Customer
                              </div>
                              <div className="space-y-2">
                                <div className={`text-sm font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {project?.client?.name || project?.clientName || actionData.projectName || 'Primary Customer'}
                                </div>
                                <div className={`text-xs leading-relaxed ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {project?.client?.address || project?.clientAddress || '123 Main Street, City, State 12345'}
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <a 
                                    href={`tel:${(project?.client?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                                    className={`text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                  >
                                    📞 {project?.client?.phone || project?.clientPhone || '(555) 123-4567'}
                                  </a>
                                  <a 
                                    href={`mailto:${project?.client?.email || project?.clientEmail || 'customer@email.com'}`} 
                                    className={`text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                  >
                                    ✉️ {project?.client?.email || project?.clientEmail || 'customer@email.com'}
                                  </a>
                                </div>
                              </div>
                            </div>

                            {/* Project Manager */}
                            <div className={`p-3 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-300'}`}>
                              <div className={`text-sm font-bold mb-3 pb-2 border-b ${colorMode ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-200'}`}>
                                Project Manager
                              </div>
                              <div className="space-y-2">
                                <div className={`text-sm font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {typeof project?.projectManager === 'object' && project?.projectManager !== null
                                    ? (project.projectManager.name || `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim() || 'No PM assigned')
                                    : project?.projectManager || 'No PM assigned'}
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <a 
                                    href={`tel:${(project?.projectManager?.phone || project?.pmPhone || '').replace(/[^\d+]/g, '')}`} 
                                    className={`text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                  >
                                    📞 {project?.projectManager?.phone || project?.pmPhone || 'No phone'}
                                  </a>
                                  <a 
                                    href={`mailto:${project?.projectManager?.email || project?.pmEmail || ''}`} 
                                    className={`text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                                  >
                                    ✉️ {project?.projectManager?.email || project?.pmEmail || 'No email'}
                                  </a>
                                </div>
                              </div>
                            </div>
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
      
      {/* Fixed positioned dropdowns rendered outside table structure */}
      {Array.from(expandedContacts).map(projectId => {
        const project = projects?.find(p => p.id === projectId);
        const position = contactDropdownPos[projectId];
        if (!project || !position) return null;
        
        return (
          <div 
            key={`contact-${projectId}`}
            className="fixed bg-white border border-gray-200 rounded-[15px] shadow-xl z-[999] min-w-[200px]"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`
            }}
          >
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-700 mb-1">
                {project.client?.name || project.clientName || ''}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">📞</span>
                  <a 
                    href={`tel:${project.client?.phone || ''}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {project.client?.phone || 'No phone'}
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">✉️</span>
                  <a 
                    href={`mailto:${project.client?.email || ''}`}
                    className="text-xs text-blue-600 hover:underline truncate"
                  >
                    {project.client?.email || 'No email'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {Array.from(expandedPMs).map(projectId => {
        const project = projects?.find(p => p.id === projectId);
        const position = pmDropdownPos[projectId];
        if (!project || !position) return null;
        
        return (
          <div 
            key={`pm-${projectId}`}
            className="fixed bg-white border border-gray-200 rounded-[15px] shadow-xl z-[999] min-w-[200px]"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`
            }}
          >
            <div className="p-2">
              <div className="text-xs text-gray-700 mb-1">
                {typeof project.projectManager === 'object' && project.projectManager !== null
                  ? (project.projectManager.name || `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim() || 'No PM')
                  : project.projectManager || 'No PM'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">📞</span>
                  <a 
                    href={`tel:${project.pmPhone || project.projectManager?.phone || ''}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {project.pmPhone || project.projectManager?.phone || 'No phone'}
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">✉️</span>
                  <a 
                    href={`mailto:${project.pmEmail || project.projectManager?.email || ''}`}
                    className="text-xs text-blue-600 hover:underline truncate"
                  >
                    {project.pmEmail || project.projectManager?.email || 'No email'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardPage;