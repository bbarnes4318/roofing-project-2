import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronLeftIcon } from '../common/Icons';
import ActivityCard from '../ui/ActivityCard';

import ProjectCubes from '../dashboard/ProjectCubes';
import { initialTasks, teamMembers } from '../../data/mockData';
import { formatPhoneNumber } from '../../utils/helpers';
import { useProjects, useProjectStats, useTasks, useRecentActivities, useWorkflowAlerts, useActivities } from '../../hooks/useApi';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import { authService, activitiesService } from '../../services/api';
import { ACTIVITY_FEED_SUBJECTS, ALERT_SUBJECTS } from '../../data/constants';
import WorkflowProgressService from '../../services/workflowProgress';

// Enhanced activity generation with better variety
const generateActivitiesFromProjects = (projects) => {
  if (!projects || projects.length === 0) return [];
  
  const activities = [];
  const baseDate = new Date();
  
  // Activity types with subjects that match our constants
  const activityTypes = [
    { type: 'project_update', subject: 'Project Status', templates: ['Project status updated', 'Progress milestone reached', 'Phase transition completed'] },
    { type: 'material_delivery', subject: 'Material Delivery', templates: ['Materials delivered on site', 'Delivery scheduled', 'Materials inspection completed'] },
    { type: 'site_inspection', subject: 'Site Inspection', templates: ['Site inspection completed', 'Inspection scheduled', 'Quality check performed'] },
    { type: 'customer_communication', subject: 'Client Communication', templates: ['Customer meeting held', 'Client approval received', 'Follow-up call completed'] },
    { type: 'documentation', subject: 'Documentation', templates: ['Documents updated', 'Photos uploaded', 'Report generated'] },
    { type: 'crew_assignment', subject: 'Crew Assignment', templates: ['Crew assigned', 'Team schedule updated', 'Labor coordination completed'] },
    { type: 'quality_check', subject: 'Quality Check', templates: ['Quality inspection passed', 'Work standards verified', 'Final review completed'] },
    { type: 'permit_update', subject: 'Permit Update', templates: ['Permits approved', 'Regulatory compliance verified', 'License requirements met'] }
  ];

  projects.forEach((project, index) => {
    // Generate 2-4 activities per project
    const activityCount = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < activityCount; i++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const template = activityType.templates[Math.floor(Math.random() * activityType.templates.length)];
      
      // Create realistic timestamps (spread over last 7 days)
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const timestamp = new Date(baseDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
      
      activities.push({
        id: `activity_${project.id}_${i}`,
        projectId: project.id,
        projectName: project.name,
        type: activityType.type,
        subject: activityType.subject,
        description: template,
        user: teamMembers[Math.floor(Math.random() * teamMembers.length)].name,
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

// Project phases configuration - Updated to match PostgreSQL enum values
const PROJECT_PHASES = [
  { id: 'LEAD', name: 'Lead', color: 'from-gray-400 to-gray-600', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200', shortName: 'L', circleColor: 'bg-[#0D6EFD]' },
  { id: 'PROSPECT', name: 'Prospect-Insurance-1st Supplement', color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200', shortName: 'P', circleColor: 'bg-[#0B7285]' },
  { id: 'PROSPECT_NON_INSURANCE', name: 'Prospect: Non-Insurance', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200', shortName: 'N', circleColor: 'bg-[#8B5CF6]' },
  { id: 'APPROVED', name: 'Approved', color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200', shortName: 'A', circleColor: 'bg-[#6F42C1]' },
  { id: 'EXECUTION', name: 'Execution', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200', shortName: 'E', circleColor: 'bg-[#BA4E00]' },
  { id: 'SUPPLEMENT', name: '2nd Supplement', color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200', shortName: 'S', circleColor: 'bg-[#E91E63]' },
  { id: 'COMPLETION', name: 'Completion', color: 'from-teal-500 to-teal-600', bgColor: 'bg-teal-50', textColor: 'text-teal-700', borderColor: 'border-teal-200', shortName: 'C', circleColor: 'bg-[#198754]' }
];

// Helper function to map project status to phase - Updated to match database enums
const mapStatusToPhase = (status) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
    case 'LEAD':
      return 'LEAD';
    case 'PROSPECT':
      return 'PROSPECT';
    case 'PROSPECT_NON_INSURANCE':
      return 'PROSPECT_NON_INSURANCE';
    case 'APPROVED':
      return 'APPROVED';
    case 'IN_PROGRESS':
    case 'EXECUTION':
      return 'EXECUTION';
    case 'SUPPLEMENT':
    case '2ND_SUPPLEMENT':
      return 'SUPPLEMENT';
    case 'COMPLETED':
    case 'COMPLETION':
      return 'COMPLETION';
    case 'ON_HOLD':
      return 'LEAD'; // Default to lead for on-hold projects
    default:
      return 'LEAD'; // Default to lead phase
  }
};

// Updated project conversion function to properly map database fields
const convertProjectToTableFormat = (project) => {
  // Use projectNumber if available, otherwise generate 5-digit project ID
  const projectId = project.projectNumber ? String(project.projectNumber) : String(project.id || project._id).padStart(5, '0');
  
  // Get phase from workflow or map from status
  let phase = 'LEAD'; // Default phase
  
  // First try to get phase from the project's phase field (if it exists)
  if (project.phase) {
    phase = project.phase;
  } else if (project.workflow && project.workflow.steps && project.workflow.steps.length > 0) {
    // Find the current step and get its phase
    const currentStepIndex = project.workflow.currentStepIndex || 0;
    const currentStep = project.workflow.steps[currentStepIndex];
    if (currentStep) {
      phase = currentStep.phase;
    }
  } else if (project.workflow && project.workflow.currentStepIndex !== undefined) {
    // If we have workflow but no steps, derive phase from currentStepIndex
    const stepIndex = project.workflow.currentStepIndex;
    if (stepIndex < 5) {
      phase = 'LEAD';
    } else if (stepIndex < 10) {
      phase = 'PROSPECT';
    } else if (stepIndex < 12) {
      phase = 'PROSPECT_NON_INSURANCE';
    } else if (stepIndex < 17) {
      phase = 'APPROVED';
    } else if (stepIndex < 23) {
      phase = 'EXECUTION';
    } else if (stepIndex < 26) {
      phase = 'SUPPLEMENT';
    } else {
      phase = 'COMPLETION';
    }
  } else {
    // Fallback to status mapping
    phase = mapStatusToPhase(project.status);
  }
  
  return {
    id: project.id || project._id,
    projectId: projectId,
    projectName: project.projectName || project.name,
    // projectName contains the address according to new requirement
    address: project.projectName || project.address || project.location || '123 Main St, Anytown USA',
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    progress: project.progress || project.calculatedProgress?.overall || (project.workflow?.currentStepIndex || 0) * 3.8 || 15,
    budget: project.budget ? parseFloat(project.budget) : 0,
    expenses: 0, // Not available in current project structure
    responsibleTeam: 'Team Alpha', // Default value
    priority: project.priority || 'MEDIUM',
    // Customer data mapping - handle both customer and client aliases
    clientName: project.customer?.primaryName || project.client?.name || 'Unknown',
    clientEmail: project.customer?.primaryEmail || project.client?.email || '',
    clientPhone: project.customer?.primaryPhone || project.client?.phone || project.client?.phoneNumber || '',
    // Project Manager mapping - Handle both object and string formats
    projectManager: project.projectManager ? 
      (typeof project.projectManager === 'object' ? 
        `${project.projectManager.firstName} ${project.projectManager.lastName}` :
        project.projectManager
      ) : 
      'Sarah Johnson', // Default PM
    pmPhone: project.pmPhone || project.projectManager?.phone || '',
    pmEmail: project.pmEmail || project.projectManager?.email || '',
    phase: phase
  };
};

    const DashboardPage = ({ tasks, activities, onProjectSelect, colorMode, dashboardState }) => {
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
  
  // Feed and filtering state
  const [feed, setFeed] = useState(activities);
  
  // Removed pagination state - now showing all items with scroll
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [alertSortConfig, setAlertSortConfig] = useState({ key: null, direction: 'asc' });
  const [activitySortConfig, setActivitySortConfig] = useState({ key: null, direction: 'asc' });
  
  // UI state
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [expandedProgress, setExpandedProgress] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(colorMode);
  const [alertExpanded, setAlertExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  
  // Alert action state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAlertForAssign, setSelectedAlertForAssign] = useState(null);
  const [assignToUser, setAssignToUser] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState({});

  // State to track which customer info sections are expanded
  const [expandedCustomers, setExpandedCustomers] = useState({});

  // State to track which client info sections are expanded (for Current Alerts)
  const [expandedClients, setExpandedClients] = useState({});

  // State to track which PM info sections are expanded (for Current Alerts)
  const [expandedPMs, setExpandedPMs] = useState({});

  // Toggle customer info expansion
  const toggleCustomerInfo = (projectId) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Toggle client info expansion (for Current Alerts)
  const toggleClientInfo = (projectId) => {
    setExpandedClients(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Toggle PM info expansion (for Current Alerts)
  const togglePMInfo = (projectId) => {
    setExpandedPMs(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Fetch real data from API
  const { data: projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { alerts: workflowAlerts, loading: alertsLoading, error: alertsError } = useWorkflowAlerts({ status: 'active' });
  
  // Debug data
  useEffect(() => {
    console.log('🔍 DATA DEBUG:', {
      projects: projects,
      projectsLoading: projectsLoading,
      projectsError: projectsError,
      projectsCount: projects?.length || 0,
      workflowAlerts: workflowAlerts,
      alertsLoading: alertsLoading,
      alertsError: alertsError,
      alertsCount: workflowAlerts?.length || 0
    });
    

  }, [projects, projectsLoading, projectsError, workflowAlerts, alertsLoading, alertsError]);
  


  // Get current user on component mount
  useEffect(() => {
    const user = authService.getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Remove DDD entries on component mount
  useEffect(() => {
    removeLatestDDD();
  }, []);

  // Restore dashboard state when navigating back
  useEffect(() => {
    if (dashboardState) {
      // Restore all the state values
      if (dashboardState.selectedPhase !== undefined && dashboardState.selectedPhase !== null) {
        setSelectedPhase(dashboardState.selectedPhase);
      }
      
      if (dashboardState.activityProjectFilter) {
        setActivityProjectFilter(dashboardState.activityProjectFilter);
      }
      
      if (dashboardState.activitySubjectFilter) {
        setActivitySubjectFilter(dashboardState.activitySubjectFilter);
      }
      
      if (dashboardState.alertProjectFilter) {
        setAlertProjectFilter(dashboardState.alertProjectFilter);
      }
      
      if (dashboardState.alertSubjectFilter) {
        setAlertSubjectFilter(dashboardState.alertSubjectFilter);
      }
      
      if (dashboardState.sortConfig) {
        setSortConfig(dashboardState.sortConfig);
      }
      
      if (dashboardState.alertSortConfig) {
        setAlertSortConfig(dashboardState.alertSortConfig);
      }
      
      if (dashboardState.activitySortConfig) {
        setActivitySortConfig(dashboardState.activitySortConfig);
      }
      
      if (dashboardState.expandedPhases) {
        setExpandedPhases(new Set(dashboardState.expandedPhases));
      }
      
      if (dashboardState.selectedProjectId) {
        // Optionally, scroll to or highlight the project
        setTimeout(() => {
          const el = document.querySelector(`[data-project-id="${dashboardState.selectedProjectId}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
      

    }
  }, [dashboardState]);

  // Click outside to close progress popovers
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is on a progress expansion area
      const progressArea = event.target.closest('[class*="bg-slate-700/20"], [class*="bg-gray-50/90"]');
      
      // If click is not on progress area, close all popovers
      if (!progressArea) {
        setExpandedProgress({});
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);// Subject options for dropdown
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
    
    // Store the current dashboard state for back navigation
    // Use the passed phase parameter if available, otherwise use the current selectedPhase
    const phaseToStore = phase !== null ? phase : selectedPhase;
    
    const dashboardState = {
      selectedPhase: phaseToStore,
      expandedPhases: Array.from(expandedPhases), // <-- add this
      selectedProjectId: project?.id || project?._id, // <-- add this
      activityProjectFilter: activityProjectFilter,
      activitySubjectFilter: activitySubjectFilter,
      alertProjectFilter: alertProjectFilter,
      alertSubjectFilter: alertSubjectFilter,
      sortConfig: sortConfig,
      alertSortConfig: alertSortConfig,
      activitySortConfig: activitySortConfig
    };
    
    // Add the dashboard state to the project object
    const projectWithState = {
      ...project,
      dashboardState: dashboardState
    };
    
    scrollToTop(); // Scroll to top immediately
    if (onProjectSelect) {
      console.log('🔍 DASHBOARD: Calling onProjectSelect with sourceSection:', sourceSection);
      console.log('🔍 DASHBOARD: Dashboard state being passed:', dashboardState);
      console.log('🔍 DASHBOARD: Phase being stored for restoration:', phaseToStore);
      onProjectSelect(projectWithState, view, phase, sourceSection);
    }
  };

  const _recentTasks = tasks.slice(0, 3);

  // Filtering and sorting logic (no pagination)
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

  const handlePost = async () => {
    if (!message.trim()) return;
    
    const selectedProject = selectedProjectId.trim() ? projects.find(p => p.id === parseInt(selectedProjectId)) : null;
    const projectName = selectedProject ? selectedProject.name : 'General';
    const subject = selectedSubject.trim() || 'General Update';
    
    try {
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
          avatar: 'I', // Default to Lead phase initial
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
        // Create regular activity post using API
        const activityData = {
          type: 'message_sent',
          description: message,
          projectId: selectedProject ? selectedProject.id : null,
          priority: 'Medium',
          metadata: {
            subject: subject
          }
        };
        
        const response = await activitiesService.create(activityData);
        if (response.success && response.activity) {
          // Add the new activity to local state
          setFeed(prev => [response.activity, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      // Fallback to local state if API fails
      const newActivity = {
        id: Date.now(),
        author: 'Sarah Owner',
        avatar: 'I', // Default to Lead phase initial
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
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const selectAllUsers = () => {
    setSelectedUsers((teamMembers || []).map(member => member.id));
  };

  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  // Remove the latest activity that contains "DDDD"
  const removeLatestDDD = () => {
    setFeed(prev => {
      const filtered = prev.filter(activity => !activity.content.includes('DDDD'));
      return filtered;
    });
  };

  // Convert projects to table format for consistency
  const tableProjects = useMemo(() => {
    return (projects || []).map(project => convertProjectToTableFormat(project));
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
        // Default to LEAD phase if phase not found
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

  const getAllProjects = () => {
    const allProjects = tableProjects;
    if (!sortConfig.key) return allProjects;

    return [...allProjects].sort((a, b) => {
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

  // Removed alert pagination functions - now showing all alerts with scroll

  const togglePhase = (phaseId) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const selectPhase = (phaseId) => {
    setSelectedPhase(selectedPhase === phaseId ? null : phaseId);
  };

  const selectAllPhases = () => {
    setSelectedPhase(selectedPhase === 'all' ? null : 'all');
  };



  // Toggle progress details with smart positioning
  const toggleProgressExpansion = (projectId, section) => {
    setExpandedProgress(prev => ({
      ...prev,
      [`${projectId}-${section}`]: !prev[`${projectId}-${section}`]
    }));
  };

  // Helper function to determine if project should have multiple trades
  const shouldHaveMultipleTrades = (projectId) => {
    return [1, 3, 5].includes(projectId);
  };

  // Get project trades data (same as ProjectCubes)
  const getProjectTrades = (project) => {
    // Check if this project should have multiple trades based on project type
    if (shouldHaveMultipleTrades(project.id)) {
      // Multi-trade projects
      if (project.id === 1) {
        return [
          { name: 'Roofing', laborProgress: 75, materialsDelivered: true },
          { name: 'Siding', laborProgress: 45, materialsDelivered: false },
          { name: 'Windows', laborProgress: 20, materialsDelivered: false }
        ];
      } else if (project.id === 2) {
        return [
          { name: 'Kitchen Remodel', laborProgress: 90, materialsDelivered: true },
          { name: 'Electrical', laborProgress: 60, materialsDelivered: true },
          { name: 'Plumbing', laborProgress: 30, materialsDelivered: false }
        ];
      } else if (project.id === 3) {
        return [
          { name: 'Bathroom Renovation', laborProgress: 85, materialsDelivered: true },
          { name: 'Tile Work', laborProgress: 70, materialsDelivered: true },
          { name: 'Fixtures', laborProgress: 25, materialsDelivered: false }
        ];
      } else if (project.id === 4) {
        return [
          { name: 'Roofing', laborProgress: 95, materialsDelivered: true },
          { name: 'Gutters', laborProgress: 80, materialsDelivered: true },
          { name: 'Insulation', laborProgress: 65, materialsDelivered: true }
        ];
      } else if (project.id === 5) {
        // Project 5: Add 2 trades
        return [
          { name: 'Roofing', laborProgress: 85, materialsDelivered: true },
          { name: 'Siding', laborProgress: 55, materialsDelivered: true },
          { name: 'Windows', laborProgress: 25, materialsDelivered: false }
        ];
      }
    }
    
    // Single trade based on project type - consistent delivery status
    const tradeName = project.projectType || project.type || 'General';
    // Use calculated progress if available, otherwise calculate based on workflow step or use fallback
    const laborProgress = project.calculatedProgress ? project.calculatedProgress.overall : 
      (project.progress || (project.workflow?.currentStepIndex || 0) * 3.8 || 15);
    
    // FIXED: Don't show materials as delivered for LEAD phase projects
    const currentPhase = project.phase || mapStatusToPhase(project.status);
    const isLeadPhase = currentPhase === 'LEAD';
    const isDelivered = isLeadPhase ? false : (project.materialsDeliveryStart ? true : (project.id % 3 === 0));
    
    return [
      { 
        name: tradeName, 
        laborProgress: laborProgress, 
        materialsDelivered: isDelivered
      }
    ];
  };

  // Phase badge styling for project table
  const getProjectStatusBadge = (phase) => {
    const getPhaseClasses = (phase) => {
      switch (phase?.toUpperCase()) {
        case 'LEAD':
          return 'text-[#0D6EFD] font-semibold';
        case 'PROSPECT':
          return 'text-[#0B7285] font-semibold';
        case 'APPROVED':
          return 'text-[#6F42C1] font-semibold';
        case 'EXECUTION':
          return 'text-[#BA4E00] font-semibold';
        case 'SUPPLEMENT':
          return 'text-[#6610F2] font-semibold';
        case 'COMPLETION':
          return 'text-[#198754] font-semibold';
        default:
          return 'text-gray-700 font-semibold';
      }
    };

    const getPhaseDisplayName = (phase) => {
      switch (phase?.toUpperCase()) {
        case 'LEAD':
          return 'Lead';
        case 'PROSPECT':
          return 'Prospect';
        case 'PROSPECT_NON_INSURANCE':
          return 'Non-Insurance';
        case 'APPROVED':
          return 'Approved';
        case 'EXECUTION':
          return 'Execution';
        case 'SUPPLEMENT':
          return '2nd Supplement';
        case 'COMPLETION':
          return 'Completion';
        default:
          return 'Lead';
      }
    };

    return (
      <span className={`px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${getPhaseClasses(phase)}`}>
        {getPhaseDisplayName(phase)}
      </span>
    );
  };

  // Helper functions for phase circle styling (used in alerts and projects table)
  const getPhaseColor = (phase) => {
    switch (phase?.toUpperCase()) {
      case 'LEAD': return 'bg-[#0D6EFD]';
      case 'PROSPECT': return 'bg-[#0B7285]';
      case 'APPROVED': return 'bg-[#6F42C1]';
      case 'EXECUTION': return 'bg-[#BA4E00]';
      case 'SUPPLEMENT': return 'bg-[#6610F2]';
      case 'COMPLETION': return 'bg-[#198754]';
      default: return 'bg-[#0D6EFD]';
    }
  };

  const getPhaseInitial = (phase) => {
    switch (phase?.toUpperCase()) {
      case 'LEAD': return 'L';
      case 'PROSPECT': return 'P';
      case 'PROSPECT_NON_INSURANCE': return 'N';
      case 'APPROVED': return 'A';
      case 'EXECUTION': return 'E';
      case 'SUPPLEMENT': return 'S';
      case 'COMPLETION': return 'C';
      default: return 'L';
    }
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
    if (!projectId) return 'Unknown Project';
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
                  (projectId && p.id === projectId.toString()) || 
        (projectId && p._id === projectId.toString())
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
    // Use real alerts from API only - no fallback to mock data
    const alertsData = workflowAlerts || [];
    let filteredAlerts = [...alertsData];
    
    // Apply project filter
    if (alertProjectFilter !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => {
        if (alertProjectFilter === 'general') {
          return !alert.projectId && !alert.relatedProject;
        }
        // Handle both workflow alerts (relatedProject field) and task alerts (projectId field)
        const alertProjectId = alert.relatedProject?._id || alert.relatedProject?.projectNumber || alert.projectId;
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
    // Note: alertSubjectFilter removed as it's not being used in the UI
    
    // Apply sorting
    const sortedAlerts = filteredAlerts.sort((a, b) => {
      // Use relatedProject data directly from API response
      const projectNameA = a.relatedProject?.projectName || a.metadata?.projectName || 'General';
      const projectNameB = b.relatedProject?.projectName || b.metadata?.projectName || 'General';
      
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

  // Get all alerts (no pagination)
  const getAllAlerts = () => {
    return getSortedAlerts();
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

  const handleAssignAlert = (alert) => {
    setSelectedAlert(alert);
    setAssignModalOpen(true);
  };

  const handleAssignConfirm = async () => {
    if (!selectedUserId) return;
    
    setAssignLoading(true);
    try {
      // API call to assign alert to user
      await fetch('/api/alerts/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: selectedAlert.id,
          userId: selectedUserId,
        }),
      });
      
      setAssignModalOpen(false);
      setSelectedAlert(null);
      setSelectedUserId('');
      // Refresh alerts
      window.location.reload();
    } catch (error) {
      console.error('Error assigning alert:', error);
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleAssignDropdown = (alertId) => {
    setAssignDropdownOpen(prev => ({
      ...prev,
      [alertId]: !prev[alertId]
    }));
  };

  const handleAssignToUser = async (alert, userId) => {
    setActionLoading(prev => ({ ...prev, [`${alert.id}-assign`]: true }));
    try {
      await fetch('/api/alerts/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: alert.id,
          userId: userId,
        }),
      });
      // Refresh alerts
      window.location.reload();
    } catch (error) {
      console.error('Error assigning alert:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${alert.id}-assign`]: false }));
      setAssignDropdownOpen(prev => ({ ...prev, [alert.id]: false }));
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

  // Helper function to determine the next step for a project based on its phase and progress
  const getCurrentStepForProject = (project) => {
    const phase = project.phase || 'Unknown Phase';
    const progress = WorkflowProgressService.calculateProjectProgress(project).overall;
    
    // Map project phase to checklist phase ID
    const phaseMapping = {
      'Lead': 'lead',
      'Prospect': 'prospect', 
      'Prospect: Non-Insurance': 'prospect_non_insurance',
      'Approved': 'approved',
      'Execution': 'execution',
      '2nd Supplement': 'supplement',
      '2nd Supp': 'supplement',
      'Supplement': 'supplement',
      'Completion': 'completion'
    };
    
    const checklistPhaseId = phaseMapping[phase] || 'lead';
    
    // Define the current steps for each phase based on typical workflow progression and project progress
    const currentStepsByPhase = {
      'lead': {
        stepName: 'Input Customer Information',
        section: 'Input Customer Information – Office 👩🏼‍💻',
        lineItem: 'Make sure the name is spelled correctly',
        phase: 'Lead'
      },
      'prospect': {
        stepName: 'Site Inspection',
        section: 'Site Inspection – Project Manager 👷🏼',
        lineItem: 'Take site photos',
        phase: 'Prospect'
      },
      'prospect_non_insurance': {
        stepName: 'Write Estimate',
        section: 'Write Estimate – Project Manager 👷🏼',
        lineItem: 'Fill out Estimate Forms',
        phase: 'Prospect: Non-Insurance'
      },
      'approved': {
        stepName: 'Administrative Setup',
        section: 'Administrative Setup – Administration 📝',
        lineItem: 'Confirm shingle choice',
        phase: 'Approved'
      },
      'execution': {
        stepName: progress < 50 ? 'Installation' : 'Quality Check',
        section: progress < 50 ? 'Installation – Field Director 🛠️' : 'Quality Check – Field + Admin',
        lineItem: progress < 50 ? 'Document work start' : 'Completion photos – Roof Supervisor 🛠️',
        phase: 'Execution'
      },
      'supplement': {
        stepName: 'Create Supp in Xactimate',
        section: 'Create Supp in Xactimate – Administration 📝',
        lineItem: 'Check Roof Packet & Checklist',
        phase: '2nd Supplement'
      },
      'completion': {
        stepName: 'Financial Processing',
        section: 'Financial Processing – Administration 📝',
        lineItem: 'Verify worksheet',
        phase: 'Completion'
      }
    };
    
    return currentStepsByPhase[checklistPhaseId] || {
      stepName: 'Current Step',
      section: 'General',
      lineItem: 'Review project status',
      phase: 'Lead'
    };
  };

  const getNextStepForProject = (project) => {
    const phase = project.phase || 'Unknown Phase';
    const progress = WorkflowProgressService.calculateProjectProgress(project).overall;
    
    // Map project phase to checklist phase ID
    const phaseMapping = {
      'Lead': 'lead',
      'Prospect': 'prospect', 
      'Prospect: Non-Insurance': 'prospect_non_insurance',
      'Approved': 'approved',
      'Execution': 'execution',
      '2nd Supplement': 'supplement',
      '2nd Supp': 'supplement',
      'Supplement': 'supplement',
      'Completion': 'completion'
    };
    
    const checklistPhaseId = phaseMapping[phase] || 'lead';
    
    // Define the next steps for each phase based on typical workflow progression
    const nextStepsByPhase = {
      'lead': {
        stepName: 'Input Customer Information',
        section: 'Input Customer Information – Office 👩🏼‍💻',
        lineItem: 'Make sure the name is spelled correctly'
      },
      'prospect': {
        stepName: 'Site Inspection',
        section: 'Site Inspection – Project Manager 👷🏼',
        lineItem: 'Take site photos'
      },
      'prospect_non_insurance': {
        stepName: 'Write Estimate',
        section: 'Write Estimate – Project Manager 👷🏼',
        lineItem: 'Fill out Estimate Forms'
      },
      'approved': {
        stepName: 'Administrative Setup',
        section: 'Administrative Setup – Administration 📝',
        lineItem: 'Confirm shingle choice'
      },
      'execution': {
        stepName: progress < 50 ? 'Installation' : 'Quality Check',
        section: progress < 50 ? 'Installation – Field Director 🛠️' : 'Quality Check – Field + Admin',
        lineItem: progress < 50 ? 'Document work start' : 'Completion photos – Roof Supervisor 🛠️'
      },
      'supplement': {
        stepName: 'Create Supp in Xactimate',
        section: 'Create Supp in Xactimate – Administration 📝',
        lineItem: 'Check Roof Packet & Checklist'
      },
      'completion': {
        stepName: 'Financial Processing',
        section: 'Financial Processing – Administration 📝',
        lineItem: 'Verify worksheet'
      }
    };
    
    return nextStepsByPhase[checklistPhaseId] || {
      stepName: 'Current Step',
      section: 'General',
      lineItem: 'Review project status'
    };
  };

  // Helper function to map step names to correct section and line item structure
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

  // Close dropdowns when clicking outside
  const handleClickOutside = (event) => {
    if (!event.target.closest('.client-dropdown')) {
      setExpandedClients({});
    }
    if (!event.target.closest('.pm-dropdown')) {
      setExpandedPMs({});
    }
    // Also close the customer info dropdowns for Current Alerts
    if (!event.target.closest('.customer-dropdown')) {
      setExpandedCustomers({});
    }
  };

  // Add click outside listener
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Show loading state while data is being fetched
  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className={`animate-fade-in w-full max-w-full ${isDarkMode ? 'dark' : ''}`}>


      {/* Current Projects by Phase - Updated with Button Interface */}
      <div className={`mb-6 border-t-4 border-blue-400 bg-white overflow-hidden relative shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] p-3 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'}`} data-section="project-phases">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Projects by Phase</h2>
            <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Click a phase button to view projects
            </p>
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-1.5 rounded-lg transition-colors duration-150 ${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Phase Buttons - Professional Pills with Consistent Styling */}
        <div className="flex gap-3 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm flex-wrap">
          {/* All Projects Button - Smaller */}
          <div
            onClick={selectAllPhases}
            className={`flex items-center rounded px-3 h-6 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 border-2 ${
              selectedPhase === 'all' 
                ? 'bg-white text-gray-700 border-[#6C757D] shadow-md' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#6C757D] hover:bg-gray-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full mr-2" style={{backgroundColor: '#6C757D'}}></span>
            <span className="text-xs font-medium">All</span>
          </div>

          {/* Lead */}
          <div
            onClick={() => selectPhase('LEAD')}
            className={`flex items-center justify-center rounded w-32 h-8 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 border-2 ${
              selectedPhase === 'LEAD' 
                ? 'bg-white text-gray-700 border-[#0D6EFD] shadow-md' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#0D6EFD] hover:bg-blue-50'
            }`}
          >
            <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: '#0D6EFD'}}></span>
            <span className="text-sm font-medium">Lead</span>
          </div>

          {/* Prospect */}
          <div
            onClick={() => selectPhase('PROSPECT')}
            className={`flex items-center justify-center rounded w-32 h-8 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 border-2 ${
              selectedPhase === 'PROSPECT' 
                ? 'bg-white text-gray-700 border-[#0B7285] shadow-md' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#0B7285] hover:bg-teal-50'
            }`}
          >
            <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: '#0B7285'}}></span>
            <span className="text-sm font-medium">Prospect</span>
          </div>

          {/* Approved */}
          <div
            onClick={() => selectPhase('APPROVED')}
            className={`flex items-center justify-center rounded w-32 h-8 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 border-2 ${
              selectedPhase === 'APPROVED' 
                ? 'bg-white text-gray-700 border-[#6F42C1] shadow-md' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#6F42C1] hover:bg-purple-50'
            }`}
          >
            <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: '#6F42C1'}}></span>
            <span className="text-sm font-medium">Approved</span>
          </div>

          {/* Execution */}
          <div
            onClick={() => selectPhase('EXECUTION')}
            className={`flex items-center justify-center rounded w-32 h-8 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 border-2 ${
              selectedPhase === 'EXECUTION' 
                ? 'bg-white text-gray-700 border-[#BA4E00] shadow-md' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#BA4E00] hover:bg-orange-50'
            }`}
          >
            <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: '#BA4E00'}}></span>
            <span className="text-sm font-medium">Execution</span>
          </div>

          {/* 2nd Supp */}
          <div
            onClick={() => selectPhase('SUPPLEMENT')}
            className={`flex items-center justify-center rounded w-32 h-8 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 border-2 ${
              selectedPhase === 'SUPPLEMENT' 
                ? 'bg-white text-gray-700 border-[#E91E63] shadow-md' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#E91E63] hover:bg-pink-50'
            }`}
          >
            <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: '#E91E63'}}></span>
            <span className="text-sm font-medium">2nd Supp</span>
          </div>

          {/* Completion */}
          <div
            onClick={() => selectPhase('COMPLETION')}
            className={`flex items-center justify-center rounded w-32 h-8 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 border-2 ${
              selectedPhase === 'COMPLETION' 
                ? 'bg-white text-gray-700 border-[#198754] shadow-md' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#198754] hover:bg-green-50'
            }`}
          >
            <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: '#198754'}}></span>
            <span className="text-sm font-medium">Completion</span>
          </div>
        </div>

        {/* Selected Phase Projects */}
        <div className={`border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'} pt-2`}>
          {selectedPhase ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                  {selectedPhase === 'all' ? 'All Projects' : `${PROJECT_PHASES.find(p => p.id === selectedPhase)?.name} Projects`}
                </h3>
                <button
                  onClick={() => setSelectedPhase(null)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    colorMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✕ Close
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-[8px]">
                  <thead>
                    <tr className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => _handleSort('phase')}
                          className="flex items-center gap-1 hover:underline"
                        >
                          Phase
                          {sortConfig.key === 'phase' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => _handleSort('projectId')}
                          className="flex items-center gap-1 hover:underline"
                        >
                          Project ID
                          {sortConfig.key === 'projectId' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => _handleSort('address')}
                          className="flex items-center gap-1 hover:underline"
                        >
                          Address
                          {sortConfig.key === 'address' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => _handleSort('clientName')}
                          className="flex items-center gap-1 hover:underline"
                        >
                          Primary Contact
                          {sortConfig.key === 'clientName' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => _handleSort('projectManager')}
                          className="flex items-center gap-1 hover:underline"
                        >
                          PM
                          {sortConfig.key === 'projectManager' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <button 
                          onClick={() => _handleSort('progress')}
                          className="flex items-center gap-1 hover:underline"
                        >
                          Progress
                          {sortConfig.key === 'progress' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Alerts
                      </th>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Messages
                      </th>
                      <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Project Workflow
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {((selectedPhase === 'all' ? getAllProjects() : getSortedPhaseProjects(selectedPhase)) || []).map((project, index, array) => (
                      <tr key={project.id || project._id} data-project-id={project.id} className={`border-b ${colorMode ? 'border-gray-600/30' : 'border-gray-100'} hover:bg-opacity-50 transition-colors ${
                        colorMode ? 'hover:bg-[#232b4d]/30' : 'hover:bg-gray-50'
                      } ${expandedProgress[`${project.id}-materials-labor`] ? (colorMode ? 'border-b-4 border-blue-400/30' : 'border-b-4 border-blue-500/30') : ''}`}>
                        <td className="py-1 px-2">
                          <div className="flex items-center justify-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 ${getPhaseColor(project.phase)}`}>
                              {getPhaseInitial(project.phase)}
                            </div>
                          </div>
                        </td>
                        <td className={`py-1 px-2 ${colorMode ? 'text-blue-400' : 'text-blue-600'} font-mono`}>
                          <button
                            onClick={() => {
                              const projectWithScrollId = {
                                ...project,
                                scrollToProjectId: String(project.id)
                              };
                              // Pass the current phase so it can be restored when returning
                              handleProjectSelectWithScroll(projectWithScrollId, 'Projects', selectedPhase, 'Project Phases');
                            }}
                            className={`hover:underline cursor-pointer transition-all duration-200 font-semibold ${
                              colorMode ? 'hover:text-blue-300' : 'hover:text-blue-800'
                            }`}
                          >
                            {project.projectId}
                          </button>
                        </td>
                        <td className="py-1 px-2">
                          <span className={`text-left ${colorMode ? 'text-white' : 'text-black'}`}>
                            {project.address}
                          </span>
                        </td>
                        <td className={`py-1 px-2 ${colorMode ? 'text-white' : 'text-black'}`}>
                          <div className="relative client-dropdown">
                            <button
                              onClick={() => toggleClientInfo(project.id)}
                              className={`flex items-center gap-1 hover:underline cursor-pointer transition-all duration-200 ${
                                colorMode ? 'hover:text-blue-300' : 'hover:text-blue-600'
                              }`}
                            >
                              <span>{project.clientName}</span>
                              <svg 
                                className={`w-2.5 h-2.5 transition-transform duration-200 ${colorMode ? 'text-white' : 'text-black'} ${expandedClients[project.id] ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {expandedClients[project.id] && (
                              <div className={`absolute top-full left-0 mt-1 p-2 rounded-lg shadow-lg border z-10 min-w-[200px] ${
                                colorMode 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-gray-200 text-gray-800'
                              }`}>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-semibold">📞</span>
                                    <span className="text-[8px]">{project.clientPhone || 'No phone'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-semibold">✉️</span>
                                    <span className="text-[8px]">{project.clientEmail || 'No email'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`py-1 px-2 ${colorMode ? 'text-white' : 'text-black'}`}>
                          <div className="relative pm-dropdown">
                            <button
                              onClick={() => togglePMInfo(project.id)}
                              className={`flex items-center gap-1 hover:underline cursor-pointer transition-all duration-200 ${
                                colorMode ? 'hover:text-blue-300' : 'hover:text-blue-600'
                              }`}
                            >
                              <span>{project.projectManager}</span>
                              <svg 
                                className={`w-2.5 h-2.5 transition-transform duration-200 ${colorMode ? 'text-white' : 'text-black'} ${expandedPMs[project.id] ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {expandedPMs[project.id] && (
                              <div className={`absolute top-full left-0 mt-1 p-2 rounded-lg shadow-lg border z-10 min-w-[200px] ${
                                colorMode 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-gray-200 text-gray-800'
                              }`}>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-semibold">📞</span>
                                    <span className="text-[8px]">{project.pmPhone || 'No phone'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-semibold">✉️</span>
                                    <span className="text-[8px]">{project.pmEmail || 'No email'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-2">
                          <div className={`p-2 rounded-lg transition-all duration-300 relative ${colorMode ? 'bg-slate-700/20 border border-slate-600/30' : 'bg-gray-50/90 border border-gray-200/50'} ${expandedProgress[`${project.id}-materials-labor`] ? (colorMode ? 'border-8 border-blue-400 shadow-2xl shadow-blue-400/50 bg-blue-900/20' : 'border-8 border-blue-500 shadow-2xl shadow-blue-500/50 bg-blue-100') : ''}`}>
                            {/* Main Project Progress Bar (clickable to expand) */}
                            <div className="mb-2">
                              <button
                                onClick={() => toggleProgressExpansion(project.id, 'materials-labor')}
                                className={`w-full text-left transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'} rounded p-1`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Overall Project Progress</span>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                      {project.progress || WorkflowProgressService.calculateProjectProgress(project).overall || (project.workflow?.currentStepIndex || 0) * 3.8 || 15}%
                                    </span>
                                    <svg 
                                      className={`w-2.5 h-2.5 transition-transform duration-200 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedProgress[`${project.id}-materials-labor`] ? 'rotate-180' : ''}`} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                <div className={`w-full h-3 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                  <div 
                                    className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                                    style={{ width: `${project.progress || WorkflowProgressService.calculateProjectProgress(project).overall || (project.workflow?.currentStepIndex || 0) * 3.8 || 15}%` }}
                                  ></div>
                                </div>
                              </button>
                              
                              {/* Materials and Labor Progress Bars (expandable) */}
                              {expandedProgress[`${project.id}-materials-labor`] && (
                                <div className="space-y-2 mt-2">
                                  {/* Materials Progress - HIDE for LEAD phase */}
                                  {(project.phase || mapStatusToPhase(project.status)) !== 'LEAD' && (
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Materials Progress</span>
                                        <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                          {Math.round(getProjectTrades(project).filter(trade => trade.materialsDelivered).length / getProjectTrades(project).length * 100)}%
                                        </span>
                                      </div>
                                      <div className={`w-full h-2.5 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div 
                                          className="bg-green-600 h-2.5 rounded-full transition-all duration-500" 
                                          style={{ width: `${Math.round(getProjectTrades(project).filter(trade => trade.materialsDelivered).length / getProjectTrades(project).length * 100)}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Labor Progress */}
                                                                      <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Labor Progress</span>
                                        <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                          {project.progress || WorkflowProgressService.calculateProjectProgress(project).overall || (project.workflow?.currentStepIndex || 0) * 3.8 || 15}%
                                        </span>
                                    </div>
                                    <div className={`w-full h-2.5 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                      <div 
                                        className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" 
                                        style={{ width: `${project.progress || WorkflowProgressService.calculateProjectProgress(project).overall || (project.workflow?.currentStepIndex || 0) * 3.8 || 15}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Individual Trades Progress Bars (only visible when materials-labor is expanded) */}
                            {expandedProgress[`${project.id}-materials-labor`] && (
                              <div>
                                <button
                                  onClick={() => toggleProgressExpansion(project.id, 'trades')}
                                  className={`w-full flex items-center justify-between p-1 rounded transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'}`}
                                >
                                  <span className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Individual Trades</span>
                                  <svg 
                                    className={`w-3 h-3 transition-transform duration-200 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedProgress[`${project.id}-trades`] ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                
                                {expandedProgress[`${project.id}-trades`] && (
                                  <div className="space-y-2 mt-2">
                                    {getProjectTrades(project).map((trade, index) => {
                                      const tradeColors = [
                                        'bg-purple-600',
                                        'bg-pink-500',
                                        'bg-yellow-400',
                                        'bg-teal-500',
                                        'bg-red-500',
                                        'bg-indigo-500',
                                        'bg-cyan-500',
                                        'bg-amber-500',
                                        'bg-lime-500',
                                        'bg-fuchsia-500',
                                      ];
                                      const barColor = tradeColors[index % tradeColors.length];
                                      return (
                                        <div key={index}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{trade.name}</span>
                                            <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{trade.laborProgress}%</span>
                                          </div>
                                          <div className={`w-full h-2.5 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                            <div 
                                              className={`${barColor} h-2.5 rounded-full transition-all duration-500`} 
                                              style={{ width: `${trade.laborProgress}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProjectSelectWithScroll(project, 'Alerts', null, 'Project Phases');
                            }}
                            className={`w-16 px-2 py-0.5 text-[7px] rounded transition-all duration-200 font-medium border-2 ${
                              colorMode 
                                ? 'border-blue-500 text-black hover:border-blue-400 hover:text-gray-800' 
                                : 'border-blue-500 text-black hover:border-blue-400 hover:text-gray-800'
                            }`}
                          >
                            Alerts
                          </button>
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProjectSelectWithScroll(project, 'Messages', null, 'Project Phases');
                            }}
                            className={`w-16 px-2 py-0.5 text-[7px] rounded transition-all duration-200 font-medium border-2 ${
                              colorMode 
                                ? 'border-blue-500 text-black hover:border-blue-400 hover:text-gray-800' 
                                : 'border-blue-500 text-black hover:border-blue-400 hover:text-gray-800'
                            }`}
                          >
                            Messages
                          </button>
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              
                              if (!onProjectSelect) return;
                              
                              // Find the original project data
                              const originalProject = projects.find(p => p.id === project.id);
                              if (!originalProject) return;
                              
                              // Get the current step for this project based on its actual phase and progress
                              const currentStep = getCurrentStepForProject(project);
                              
                              try {
                                // Navigation with subtle line item highlighting only
                                const projectWithStepInfo = {
                                  ...originalProject,
                                  highlightStep: currentStep.lineItem,
                                  // Remove section indicators - only highlight the line item
                                  navigationTarget: {
                                    phase: currentStep.phase,
                                    section: currentStep.section,
                                    lineItem: currentStep.lineItem,
                                    stepName: currentStep.stepName,
                                    alertId: `project-${project.id}`
                                  }
                                };
                                
                                handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Project Phases');
                              } catch (error) {
                                console.error('❌ Error navigating to workflow step:', error);
                              }
                            }}
                            className={`w-16 px-2 py-0.5 text-[7px] rounded transition-all duration-200 font-medium border-2 ${
                              colorMode 
                                ? 'border-blue-500 text-black hover:border-blue-400 hover:text-gray-800' 
                                : 'border-blue-500 text-black hover:border-blue-400 hover:text-gray-800'
                            }`}
                          >
                            Workflow
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-center py-6 text-sm">
              No projects available.
            </div>
          )}
        </div>
      </div>

      {/* Main Dashboard Layout - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 items-start overflow-visible">
        {/* Left Column - Current Activity Feed */}
        <div className="w-full" data-section="activity-feed">
          <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`} style={{ width: '100%', height: '750px' }}>
            {/* Header with better balanced controls */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Activity Feed</h1>
                </div>
              </div>
              
              {/* Controls row - better balanced */}
              <div className="flex items-center justify-between gap-2">
                {/* Filter dropdowns */}
                <div className="flex items-center gap-2">
                  <select
                    value={activityProjectFilter}
                    onChange={(e) => setActivityProjectFilter(e.target.value)}
                    className={`w-32 max-w-[140px] truncate text-[8px] font-medium px-1.5 py-1 rounded border transition-colors ${
                      colorMode 
                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <option value="">All Projects</option>
                    <option value="general">General</option>
                    {(projects || []).map(project => (
                      <option key={project.id || project._id} value={(project.id || project._id || '').toString()}>
                        {project.name || project.projectName}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={activitySubjectFilter}
                    onChange={(e) => setActivitySubjectFilter(e.target.value)}
                    className={`w-32 max-w-[140px] truncate text-[8px] font-medium px-1.5 py-1 rounded border transition-colors ${
                      colorMode 
                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <option value="">All Subjects</option>
                    {ACTIVITY_FEED_SUBJECTS.map(subject => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {sortedActivities.length === 0 ? (
                <div className="text-gray-400 text-center py-3 text-[9px]">
                  No activities found.
                </div>
              ) : (
                (sortedActivities || []).map(activity => (
                  <ActivityCard 
                    key={activity.id} 
                    activity={activity} 
                    onProjectSelect={onProjectSelect}
                    projects={projects || []}
                    colorMode={colorMode}
                  />
                ))
              )}
            </div>
            
            {/* Removed pagination controls - now showing all activities with scroll */}

            {/* ADD POST label */}
            <div className={`mb-2 mt-4 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <h3 className="text-[10px] font-semibold">Add POST</h3>
            </div>

            {/* Composer always at the bottom with full height allowance and proper overflow handling */}
            <div className={`p-3 rounded border relative z-40 ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-gray-50 border-gray-200'}`}>
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[9px] font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className={`w-full p-1 border rounded text-[9px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300'}`}
                    >
                      <option value="">Select Project</option>
                      <option value="general">General</option>
                      {(projects || []).map(project => (
                        <option key={project.id || project._id} value={(project.id || project._id || '').toString()}>
                          {project.name || project.projectName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[9px] font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className={`w-full p-1 border rounded text-[9px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300'}`}
                    >
                      <option value="">Select Subject</option>
                      {subjectOptions.map(subject => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className={`block text-[9px] font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    className={`w-full p-1 border rounded text-[9px] resize-none ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500'}`}
                    rows="2"
                  />
                </div>
                
                <div className="mt-2 space-y-2">
                  {/* Send as Alert checkbox */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sendAsAlert"
                      checked={sendAsAlert}
                      onChange={(e) => {
                                              setSendAsAlert(e.target.checked);
                      }}
                      className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="sendAsAlert" className={`text-[9px] font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Send as Alert
                    </label>
                  </div>
                  
                  {/* Alert options when checkbox is checked - Allow full expansion with proper z-index */}
                  {sendAsAlert && (
                    <div className={`p-3 rounded border relative z-50 ${colorMode ? 'bg-[#232b4d] border-[#3b82f6]/30' : 'bg-blue-50 border-blue-200'}`}>
                      {/* Header with alert icon */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[8px] font-bold">!</span>
                        </div>
                        <span className={`text-[9px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                          Alert Configuration
                        </span>
                      </div>
                      
                      {/* Priority selection */}
                      <div className="mb-3">
                        <label className={`block text-[8px] font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Alert Priority:
                        </label>
                        <select
                          value={alertPriority}
                          onChange={(e) => setAlertPriority(e.target.value)}
                          className={`w-full p-1.5 border rounded text-[8px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300 bg-white text-gray-800'}`}
                        >
                          <option value="low">🟢 Low Priority</option>
                          <option value="medium">🟡 Medium Priority</option>
                          <option value="high">🔴 High Priority</option>
                        </select>
                      </div>
                      
                      {/* User selection section with better header */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className={`text-[8px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Send Alert To: {selectedUsers.length > 0 && (
                              <span className={`ml-1 px-1.5 py-0.5 rounded text-[7px] font-bold ${colorMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                {selectedUsers.length} selected
                              </span>
                            )}
                          </label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={selectAllUsers}
                              className={`px-2 py-0.5 rounded text-[7px] font-semibold transition-colors ${
                                colorMode 
                                  ? 'bg-green-700 text-white hover:bg-green-600' 
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={clearAllUsers}
                              className={`px-2 py-0.5 rounded text-[7px] font-semibold transition-colors ${
                                colorMode 
                                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        
                        {/* Simple user checkboxes - no height constraints, compact layout */}
                        <div className={`border rounded p-2 max-h-32 overflow-y-auto ${colorMode ? 'border-gray-600 bg-[#1e293b]' : 'border-gray-200 bg-white'}`}>
                          <div className="grid grid-cols-2 gap-1">
                            {(teamMembers || []).map(member => (
                              <label key={member.id} className={`flex items-center gap-1 cursor-pointer p-1 rounded transition-colors text-[7px] ${
                                selectedUsers.includes(member.id) 
                                  ? colorMode 
                                    ? 'bg-blue-700/30' 
                                    : 'bg-blue-50' 
                                  : colorMode 
                                    ? 'hover:bg-gray-700/30' 
                                    : 'hover:bg-gray-50'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(member.id)}
                                  onChange={() => handleUserToggle(member.id)}
                                  className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                                />
                                <div className={`w-3 h-3 rounded-full flex items-center justify-center text-white font-bold text-[6px] ${
                                  selectedUsers.includes(member.id) 
                                    ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                                    : 'bg-gradient-to-br from-gray-500 to-gray-600'
                                }`}>
                                  {member.name.charAt(0)}
                                </div>
                                <span className={`truncate ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                  {member.name}
                                </span>
                                {selectedUsers.includes(member.id) && (
                                  <div className="text-green-500 text-[6px]">✓</div>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Warning if no users selected */}
                        {selectedUsers.length === 0 && (
                          <div className={`mt-2 p-2 rounded border text-[7px] ${colorMode ? 'bg-red-900/20 border-red-700/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            ⚠️ Please select at least one team member to send the alert to
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div className={`text-[9px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {(!selectedProjectId || !selectedSubject || (sendAsAlert && selectedUsers.length === 0)) && (
                      <span className="text-black">
                        * {!selectedProjectId && !selectedSubject ? 'Project and Subject required' : 
                            !selectedProjectId ? 'Project required' : 
                            !selectedSubject ? 'Subject required' :
                            sendAsAlert && selectedUsers.length === 0 ? 'Select users for alert' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => { 
                        setMessage(''); 
                        setSelectedProjectId(''); 
                        setSelectedSubject(''); 
                        setSendAsAlert(false); 
                        setSelectedUsers([]); 
                        setAlertPriority('medium');
                      }}
                      className={`font-bold py-1 px-2 rounded text-[9px] ${colorMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                    >
                      Clear
                    </button>
                    <button
                      onClick={handlePost}
                      disabled={!message.trim() || (sendAsAlert && selectedUsers.length === 0)}
                      className={`font-bold py-1 px-2 rounded text-[9px] ${
                        (message.trim() && (!sendAsAlert || selectedUsers.length > 0))
                          ? sendAsAlert 
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {sendAsAlert ? 'Send Alert' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Right Column - Current Alerts */}
        <div className="w-full" data-section="current-alerts">
          <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] rounded-t-[8px] px-4 py-3 pb-10 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden relative`} style={{ height: '750px' }}>
            {/* Header */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h1>
                </div>
              </div>
              
              {/* Filter Controls */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={alertProjectFilter}
                    onChange={(e) => setAlertProjectFilter(e.target.value)}
                    className={`w-32 max-w-[140px] truncate text-[8px] font-medium px-1.5 py-1 rounded border transition-colors ${
                      colorMode 
                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <option value="all">All Projects</option>
                    <option value="general">General</option>
                    {(projects || []).map(project => (
                      <option key={project.id || project._id} value={(project.id || project._id || '').toString()}>
                        {project.name || project.projectName}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={alertSubjectFilter}
                    onChange={(e) => setAlertSubjectFilter(e.target.value)}
                    className={`w-32 max-w-[140px] truncate text-[8px] font-medium px-1.5 py-1 rounded border transition-colors ${
                      colorMode 
                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <option value="all">All Subjects</option>
                    {ALERT_SUBJECTS.map(subject => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Current Alerts Section */}
            <div className="mt-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {getAllAlerts().length === 0 ? (
                <div className="text-gray-400 text-center py-6 text-sm">
                  No alerts found.
                </div>
              ) : (
                <div className="space-y-2">
                  {getAllAlerts().map(alert => {
                    const alertId = alert._id || alert.id;
                    const relatedProject = alert.relatedProject;
                    const projectNumber = relatedProject?.projectNumber || alert.metadata?.projectNumber;
                    const projectName = relatedProject?.projectName || alert.metadata?.projectName;
                    const customer = relatedProject?.customer;
                    const customerName = customer?.primaryName || customer?.name || alert.metadata?.customerName || 'Unknown Customer';
                    const customerPhone = customer?.primaryPhone || customer?.phone || alert.metadata?.customerPhone || '';
                    const customerEmail = customer?.primaryEmail || customer?.email || alert.metadata?.customerEmail || '';
                    const customerAddress = customer?.address || alert.metadata?.customerAddress || relatedProject?.address || '';
                    const isExpanded = expandedAlerts.has(alertId);

                    const alertTitle = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alert.stepName || alert.title || 'Unknown Alert';
                    const phase = alert.metadata?.phase || 'Unknown';
                    const priority = alert.metadata?.priority || alert.priority || 'medium';
                    
                    // Get user information from workflow structure
                    const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alertTitle;
                    const workflowInfo = mapStepToWorkflowStructure(stepName, phase);
                    const userInfo = getUserInfo(workflowInfo.user);
                    const lineItem = workflowInfo.lineItem;
                    const section = workflowInfo.section;

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
                                  toggleCustomerInfo(projectNumber);
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
                            {/* Contact Information - Clean Two-Column Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                              {/* Customer Information - Left Side */}
                              <div className={`p-3 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-200'}`}>
                                <div className={`text-xs font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-800'}`}>
                                  CUSTOMER INFORMATION
                                </div>
                                <div className="space-y-1">
                                  <div className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {customerName}
                                  </div>
                                  {customerAddress && (
                                    <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {customerAddress}
                                    </div>
                                  )}
                                  {customerPhone && (
                                    <div className="text-xs">
                                      <a href={`tel:${customerPhone}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                                        📞 {customerPhone}
                                      </a>
                                    </div>
                                  )}
                                  {customerEmail && (
                                    <div className="text-xs">
                                      <a href={`mailto:${customerEmail}`} className="text-blue-600 hover:text-blue-800 hover:underline truncate block">
                                        ✉️ {customerEmail}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Project Manager Information - Right Side */}
                              <div className={`p-3 rounded-lg border ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-200'}`}>
                                <div className={`text-xs font-bold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-800'}`}>
                                  PROJECT MANAGER
                                </div>
                                <div className="space-y-1">
                                  <div className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {userInfo.firstName} {userInfo.lastName}
                                  </div>
                                  {userInfo.phone && (
                                    <div className="text-xs">
                                      <a href={`tel:${userInfo.phone}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                                        📞 {userInfo.phone}
                                      </a>
                                    </div>
                                  )}
                                  {userInfo.email && (
                                    <div className="text-xs">
                                      <a href={`mailto:${userInfo.email}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                                        ✉️ {userInfo.email}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Priority Badge */}
                            <div className="mb-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                priority === 'high' ? 'bg-red-100 text-red-800 border border-red-200' :
                                priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                'bg-green-100 text-green-800 border border-green-200'
                              }`}>
                                {priority === 'high' ? '🔴 High Priority' :
                                 priority === 'medium' ? '🟡 Medium Priority' :
                                 '🟢 Low Priority'}
                              </span>
                            </div>

                            {/* Action Buttons - Clean Professional Layout */}
                            <div className="flex flex-col sm:flex-row gap-3">
                              {/* Complete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteAlert(alert);
                                }}
                                disabled={actionLoading[`${alertId}-complete`]}
                                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                                  actionLoading[`${alertId}-complete`] 
                                    ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' 
                                    : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400'
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
                                    ✓ Complete
                                  </span>
                                )}
                              </button>
                              
                              {/* Assign to User Button with Dropdown */}
                              <div className="flex-1 relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAssignDropdown(alertId);
                                  }}
                                  disabled={actionLoading[`${alertId}-assign`]}
                                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                                    actionLoading[`${alertId}-assign`]
                                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                      : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:border-blue-400'
                                  }`}
                                >
                                  <span className="flex items-center justify-center">
                                    👤 Assign to User
                                    <svg className={`ml-2 w-4 h-4 transition-transform ${assignDropdownOpen[alertId] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </span>
                                </button>
                                
                                {/* User Dropdown */}
                                {assignDropdownOpen[alertId] && (
                                  <div className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-lg ${
                                    colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-200'
                                  }`}>
                                    <div className="p-2 max-h-48 overflow-y-auto">
                                      {teamMembers.map((member) => (
                                        <button
                                          key={member.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAssignToUser(alert, member.id);
                                          }}
                                          className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                                            colorMode 
                                              ? 'text-gray-300 hover:bg-gray-700' 
                                              : 'text-gray-700 hover:bg-gray-100'
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-2">
                                              {member.name.charAt(0)}
                                            </div>
                                            <span className="truncate">{member.name}</span>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

