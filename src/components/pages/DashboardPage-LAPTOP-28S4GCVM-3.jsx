import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDownIcon, ChevronLeftIcon } from '../common/Icons';
import ActivityCard from '../ui/ActivityCard';

import ProjectCubes from '../dashboard/ProjectCubes';
import { initialTasks, teamMembers, mockAlerts } from '../../data/mockData';
import { formatPhoneNumber } from '../../utils/helpers';
import { useProjects, useProjectStats, useTasks, useRecentActivities, useWorkflowAlerts } from '../../hooks/useApi';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import { authService } from '../../services/api';
import { ACTIVITY_FEED_SUBJECTS, ALERT_SUBJECTS } from '../../data/constants';

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

// Project phases configuration
const PROJECT_PHASES = [
  { id: 'lead', name: 'Lead', color: 'from-gray-400 to-gray-600', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200' },
  { id: 'prospect', name: 'Prospect-Insurance-1st Supplement', color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  { id: 'approved', name: 'Approved', color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
  { id: 'execution', name: 'Execution', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  { id: 'supplement', name: '2nd Supplement', color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
  { id: 'completion', name: 'Completion', color: 'from-teal-500 to-teal-600', bgColor: 'bg-teal-50', textColor: 'text-teal-700', borderColor: 'border-teal-200' }
];

// Helper function to map project status to phase
const mapStatusToPhase = (status) => {
  switch (status?.toLowerCase()) {
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

// Helper function to convert project data to consistent format
const convertProjectToTableFormat = (project) => {
  return {
    id: project.id,
    projectName: project.name,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    progress: project.progress || 0,
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

    const DashboardPage = ({ tasks, projects, activities, onProjectSelect, colorMode }) => {
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
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
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
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const selectAllUsers = () => {
    setSelectedUsers(teamMembers.map(member => member.id));
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
    const alertsData = workflowAlerts && workflowAlerts.length > 0 ? workflowAlerts : mockAlerts;
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

  // Get paginated alerts
  const getPaginatedAlerts = () => {
    const sortedAlerts = getSortedAlerts();
    const startIndex = (alertCurrentPage - 1) * alertsPerPage;
    const endIndex = startIndex + alertsPerPage;
    return sortedAlerts.slice(startIndex, endIndex);
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

  // Helper function to map step names to correct section and line item structure
  const mapStepToWorkflowStructure = (stepName, phase) => {
    // Define the correct workflow structure based on project-phases.txt
    const workflowStructure = {
      'Lead': {
        'Input Customer Information': {
          section: 'Input Customer Information – Office 👩🏼‍💻',
          lineItems: ['Make sure the name is spelled correctly', 'Make sure the email is correct. Send a confirmation email to confirm email.']
        },
        'Complete Questions to Ask Checklist': {
          section: 'Complete Questions to Ask Checklist – Office 👩🏼‍💻',
          lineItems: ['Input answers from Question Checklist into notes', 'Record property details']
        },
        'Input Lead Property Information': {
          section: 'Input Lead Property Information – Office 👩🏼‍💻',
          lineItems: ['Add Home View photos – Maps', 'Add Street View photos – Google Maps', 'Add elevation screenshot – PPRBD', 'Add property age – County Assessor Website', 'Evaluate ladder requirements – By looking at the room']
        },
        'Assign A Project Manager': {
          section: 'Assign A Project Manager – Office 👩🏼‍💻',
          lineItems: ['Use workflow from Lead Assigning Flowchart', 'Select and brief the Project Manager']
        },
        'Schedule Initial Inspection': {
          section: 'Schedule Initial Inspection – Office 👩🏼‍💻',
          lineItems: ['Call Customer and coordinate with PM schedule', 'Create Calendar Appointment in AL']
        }
      },
      'Prospect': {
        'Site Inspection': {
          section: 'Site Inspection – Project Manager 👷🏼',
          lineItems: ['Take site photos', 'Complete inspection form', 'Document material colors', 'Capture Hover photos', 'Present upgrade options']
        },
        'Write Estimate': {
          section: 'Write Estimate – Project Manager 👷🏼',
          lineItems: ['Fill out Estimate Form', 'Write initial estimate – AccuLynx', 'Write Customer Pay Estimates', 'Send for Approval']
        },
        'Insurance Process': {
          section: 'Insurance Process – Administration 📝',
          lineItems: ['Compare field vs insurance estimates', 'Identify supplemental items', 'Draft estimate in Xactimate']
        },
        'Agreement Preparation': {
          section: 'Agreement Preparation – Administration 📝',
          lineItems: ['Trade cost analysis', 'Prepare Estimate Forms', 'Match AL estimates', 'Calculate customer pay items', 'Send shingle/class4 email – PDF']
        },
        'Agreement Signing': {
          section: 'Agreement Signing – Administration 📝',
          lineItems: ['Review and send signature request', 'Record in QuickBooks', 'Process deposit', 'Collect signed disclaimers']
        }
      },
      'Approved': {
        'Administrative Setup': {
          section: 'Administrative Setup – Administration 📝',
          lineItems: ['Confirm shingle choice', 'Order materials', 'Create labor orders', 'Send labor order to roofing crew']
        },
        'Pre-Job Actions': {
          section: 'Pre-Job Actions – Office 👩🏼‍💻',
          lineItems: ['Pull permits']
        },
        'Prepare for Production': {
          section: 'Prepare for Production – Administration 📝',
          lineItems: ['All pictures in Job (Gutter, Ventilation, Elevation)', 'Verify Labor Order in Scheduler', 'Verify Material Orders', 'Subcontractor Work']
        }
      },
      'Execution': {
        'Installation': {
          section: 'Installation – Field Director 🛠️',
          lineItems: ['Document work start', 'Capture progress photos', 'Daily Job Progress Note', 'Upload Pictures']
        },
        'Quality Check': {
          section: 'Quality Check – Field + Admin',
          lineItems: ['Completion photos – Roof Supervisor 🛠️', 'Complete inspection – Roof Supervisor 🛠️', 'Upload Roof Packet', 'Verify Packet is complete – Admin 📝']
        },
        'Multiple Trades': {
          section: 'Multiple Trades – Administration 📝',
          lineItems: ['Confirm start date', 'Confirm material/labor for all trades']
        },
        'Subcontractor Work': {
          section: 'Subcontractor Work – Administration 📝',
          lineItems: ['Confirm dates', 'Communicate with customer']
        },
        'Update Customer': {
          section: 'Update Customer – Administration 📝',
          lineItems: ['Notify of completion', 'Share photos', 'Send 2nd half payment link']
        }
      },
      '2nd Supplement': {
        'Create Supp in Xactimate': {
          section: 'Create Supp in Xactimate – Administration 📝',
          lineItems: ['Check Roof Packet & Checklist', 'Label photos', 'Add to Xactimate', 'Submit to insurance']
        },
        'Follow-Up Calls': {
          section: 'Follow-Up Calls – Administration 📝',
          lineItems: ['Call 2x/week until updated estimate']
        },
        'Review Approved Supp': {
          section: 'Review Approved Supp – Administration 📝',
          lineItems: ['Update trade cost', 'Prepare counter-supp or email', 'Add to AL Estimate']
        },
        'Customer Update': {
          section: 'Customer Update – Administration',
          lineItems: ['Share 2 items minimum', 'Let them know next steps']
        }
      },
      'Completion': {
        'Financial Processing': {
          section: 'Financial Processing – Administration 📝',
          lineItems: ['Verify worksheet', 'Final invoice & payment link', 'AR follow-up calls']
        },
        'Project Closeout': {
          section: 'Project Closeout – Office 👩🏼‍💻',
          lineItems: ['Register warranty', 'Send documentation', 'Submit insurance paperwork', 'Send final receipt and close job']
        }
      }
    };

    // Normalize the step name for matching
    const normalizedStepName = stepName.toLowerCase().trim();
    
    // Find the matching step in the workflow structure
    const phaseStructure = workflowStructure[phase];
    if (!phaseStructure) {
      return {
        section: 'Unknown Section',
        lineItem: stepName
      };
    }

    // Try to find an exact match first
    for (const [key, value] of Object.entries(phaseStructure)) {
      if (normalizedStepName === key.toLowerCase()) {
        return {
          section: value.section,
          lineItem: value.lineItems[0] || stepName
        };
      }
    }

    // Try to find partial matches with better logic
    for (const [key, value] of Object.entries(phaseStructure)) {
      const keyWords = key.toLowerCase().split(' ').filter(word => word.length > 2);
      const stepWords = normalizedStepName.split(' ').filter(word => word.length > 2);
      
      // Check for word matches
      const matchingWords = keyWords.filter(word => 
        stepWords.some(stepWord => stepWord.includes(word) || word.includes(stepWord))
      );
      
      // If we have at least 2 matching words or if the step name contains the key
      if (matchingWords.length >= 2 || normalizedStepName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedStepName)) {
        return {
          section: value.section,
          lineItem: value.lineItems[0] || stepName
        };
      }
    }



    // Fallback: return the step name as both section and line item
    return {
      section: stepName,
      lineItem: stepName
    };
  };

  return (
    <div className={`animate-fade-in w-full max-w-full ${isDarkMode ? 'dark' : ''}`}>
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
                    {projects.map(project => (
                      <option key={project.id} value={project.id.toString()}>
                        {project.name}
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
              {currentActivities.length === 0 ? (
                <div className="text-gray-400 text-center py-3 text-[9px]">
                  No activities found.
                </div>
              ) : (
                currentActivities.map(activity => (
                  <ActivityCard 
                    key={activity.id} 
                    activity={activity} 
                    onProjectSelect={onProjectSelect}
                    projects={projects}
                    colorMode={colorMode}
                  />
                ))
              )}
            </div>
            
            {/* Activity Feed Pagination Controls */}
            {totalPages > 1 && (
              <div className={`mt-2 pt-1 border-t ${colorMode ? 'border-[#3b82f6]/40' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-[9px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Page {currentPage} of {totalPages} ({sortedActivities.length} total activities)
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                        currentPage === 1
                          ? `${colorMode ? 'text-gray-500' : 'text-gray-400'} cursor-not-allowed`
                          : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                      }`}
                    >
                      ← Prev
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                        currentPage === totalPages
                          ? `${colorMode ? 'text-gray-500' : 'text-gray-400'} cursor-not-allowed`
                          : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                      {projects.map(project => (
                        <option key={project.id} value={project.id.toString()}>
                          {project.name}
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
                            {teamMembers.map(member => (
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
            {/* Header with better balanced controls */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h1>
                </div>
              </div>
              
              {/* Controls row - better balanced */}
              <div className="flex items-center justify-between gap-2">
                {/* Filter dropdowns */}
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
                    {projects.map(project => (
                      <option key={project.id} value={project.id.toString()}>
                        {project.name}
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
            <div className="space-y-2 mt-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {getPaginatedAlerts().length === 0 ? (
                <div className="text-gray-400 text-center py-3 text-[9px]">
                  {alertsLoading ? 'Loading alerts...' : 'No alerts found.'}
                </div>
              ) : (
                getPaginatedAlerts().map(alert => {
                  // Handle both workflow alerts and task alerts
                  const alertId = alert._id || alert.id;
                  const projectId = alert.project?._id || alert.projectId;
                  const project = projects.find(p => p.id === projectId);
                  const isExpanded = expandedAlerts.has(alertId);
                  
                  // Get alert details based on type - use the proper alert data
                  const alertTitle = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alert.stepName || alert.title || 'Unknown Alert';
                  const alertDescription = alert.message || alert.description || 'No description available';
                  const alertDate = alert.createdAt ? new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const assignedUser = alert.user || teamMembers.find(tm => (tm.id === (alert.assignedTo || alert.assignedToUser)) || (tm._id === (alert.assignedTo || alert.assignedToUser)));
                  const priority = alert.priority || 'medium';
                  
                  return (
                    <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-lg shadow-sm border transition-all duration-200 cursor-pointer`}>
                      
                      {/* Alert header - ENTIRE AREA CLICKABLE FOR DROPDOWN */}
                      <div 
                        className="flex items-center gap-2 p-2 hover:bg-opacity-80 transition-colors cursor-pointer"
                        onClick={() => toggleAlertExpansion(alertId)}
                      >
                        {/* User avatar and priority indicator */}
                        <div className="relative">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[8px] shadow-sm">
                            {assignedUser ? (assignedUser.firstName?.charAt(0) || assignedUser.name?.charAt(0)) : '?'}
                          </div>
                          {/* Priority indicator dot */}
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                            priority === 'high' ? 'bg-red-500' :
                            priority === 'medium' ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }`}></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Line 1: User Name Date Project Name */}
                          <div className="mb-0.5">
                            <span className={`text-[7px] font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                              {assignedUser ? (assignedUser.firstName && assignedUser.lastName ? `${assignedUser.firstName} ${assignedUser.lastName}` : assignedUser.name) : 'Unknown User'} {alertDate} 
                              <span 
                                className={`cursor-pointer hover:underline underline-offset-1 transition-all duration-200 ml-1 ${
                                  colorMode ? 'text-[#60a5fa] hover:text-[#7dd3fc]' : 'text-[#2563eb] hover:text-[#1d4ed8]'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProjectClick(projectId, alert);
                                }}
                              >
                                {alert.metadata?.projectName || getProjectName(projectId)}
                              </span>
                            </span>
                          </div>
                          
                          {/* Line 2: Phase: [phase] Section: [section] Line Item: [line item] */}
                          <div className={`text-[7px] ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-semibold">Phase:</span> {alert.metadata?.phase || 'Unknown Phase'} 
                            <span className="ml-2 font-semibold">Section:</span> 
                            {(() => {
                              const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alertTitle;
                              const phase = alert.metadata?.phase || 'Unknown Phase';
                              const { section } = mapStepToWorkflowStructure(stepName, phase);
                              return section;
                            })()}
                            <span className="ml-2 font-semibold">Line Item:</span> 
                            <span 
                              className={`cursor-pointer hover:underline underline-offset-1 transition-all duration-200 font-medium ml-1 ${
                                colorMode ? 'text-[#60a5fa] hover:text-[#7dd3fc]' : 'text-[#2563eb] hover:text-[#1d4ed8]'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                
                                if (!onProjectSelect) return;
                                
                                const projectName = alert.metadata?.projectName || getProjectName(projectId);
                                const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alertTitle;
                                const phase = alert.metadata?.phase || 'Unknown Phase';
                                const { section, lineItem } = mapStepToWorkflowStructure(stepName, phase);
                                
                                if (!projectName) return;
                                
                                try {
                                  let matchingProject = null;
                                  if (projects && projects.length > 0) {
                                    matchingProject = projects.find(p => 
                                      p.name === projectName || 
                                      p.projectName === projectName ||
                                      p.name?.includes(projectName) ||
                                      projectName?.includes(p.name) ||
                                      p.id === projectId ||
                                      p._id === projectId
                                    );
                                  }
                                  
                                  if (matchingProject) {
                                    // Enhanced navigation info with precise targeting
                                    const projectWithStepInfo = {
                                      ...matchingProject,
                                      highlightStep: lineItem,
                                      alertPhase: phase,
                                      alertSection: section,
                                      // Add precise navigation coordinates
                                      navigationTarget: {
                                        phase: phase,
                                        section: section,
                                        lineItem: lineItem,
                                        stepName: stepName,
                                        alertId: alert._id || alert.id
                                      }
                                    };
                                    handleProjectSelectWithScroll(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts');
                                  } else {
                                    // Create temporary project object if not found
                                    const tempProject = {
                                      id: projectId || Date.now(),
                                      _id: projectId,
                                      name: projectName,
                                      projectName: projectName,
                                      status: 'active',
                                      phase: phase,
                                      highlightStep: lineItem,
                                      alertPhase: phase,
                                      alertSection: section,
                                      navigationTarget: {
                                        phase: phase,
                                        section: section,
                                        lineItem: lineItem,
                                        stepName: stepName,
                                        alertId: alert._id || alert.id
                                      }
                                    };
                                    handleProjectSelectWithScroll(tempProject, 'Project Workflow', null, 'Current Alerts');
                                  }
                                } catch (error) {
                                  console.error('❌ Error navigating to workflow step:', error);
                                }
                              }}
                            >
                              {(() => {
                                const stepName = alert.metadata?.stepName || alert.metadata?.cleanTaskName || alertTitle;
                                const phase = alert.metadata?.phase || 'Unknown Phase';
                                const { lineItem } = mapStepToWorkflowStructure(stepName, phase);
                                return lineItem;
                              })()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Expand/collapse arrow */}
                        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Expanded content */}
                      {isExpanded && (
                        <div className={`px-2 pb-2 border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          {/* Notes section with meaningful alert information */}
                          <div className={`pt-2 pb-2 mb-2 rounded-lg border transition-colors ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-300'}`}>
                            <div className="px-2">
                              <div className="flex items-center gap-1.5 mb-2">
                                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                  Notes
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <div className={`text-[7px] ${colorMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                                  {(() => {
                                    const stepName = alert.metadata?.stepName || alertTitle;
                                    const phase = alert.metadata?.phase || 'Unknown Phase';
                                    const projectName = alert.metadata?.projectName || getProjectName(projectId);
                                    const daysOverdue = alert.metadata?.daysOverdue || 0;
                                    const daysUntilDue = alert.metadata?.daysUntilDue || 0;
                                    if (daysOverdue > 0) {
                                      return `${stepName} for ${projectName} is ${daysOverdue} days overdue. This task was due ${daysOverdue} days ago and requires immediate attention.`;
                                    } else if (daysUntilDue <= 1) {
                                      return `${stepName} for ${projectName} is due ${daysUntilDue === 0 ? 'today' : 'tomorrow'}. Please complete this task to keep the project on track.`;
                                    } else {
                                      return `${stepName} for ${projectName} is coming up in ${daysUntilDue} days. Phase: ${phase}`;
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Customer Information section */}
                          <div className={`pt-2 pb-2 rounded-lg border transition-colors ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-300'}`}>
                            <div className="px-2">
                              <div className="flex items-center gap-1.5 mb-2">
                                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                  Customer Information
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                {(() => {
                                  // Find customer info from project or use default
                                  const customerName = project?.client?.name || project?.clientName || 'Amanda Foster';
                                  const customerPhone = project?.client?.phone || project?.clientPhone || '(555) 777-8888';
                                  const customerEmail = project?.client?.email || project?.clientEmail || 'amanda.foster@email.com';
                                  
                                  return (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Name:</span>
                                        <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{customerName}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone:</span>
                                        <a 
                                          href={`tel:${customerPhone.replace(/[^\d+]/g, '')}`} 
                                          className={`text-[7px] font-semibold hover:underline cursor-pointer transition-all duration-200 ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}
                                        >
                                          {customerPhone}
                                        </a>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Email:</span>
                                        <a 
                                          href={`mailto:${customerEmail}`} 
                                          className={`text-[7px] font-semibold hover:underline cursor-pointer transition-all duration-200 truncate ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}
                                        >
                                          {customerEmail}
                                        </a>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action buttons - Professional styling matching Project Access buttons */}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                              onClick={() => handleCompleteAlert(alert)}
                              disabled={actionLoading[`${alertId}-complete`]}
                              className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold ${
                                actionLoading[`${alertId}-complete`] 
                                  ? 'bg-gray-400/60 border-gray-300 text-gray-600 cursor-not-allowed' 
                                  : colorMode 
                                    ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-green-700/80 hover:border-green-500 hover:shadow-lg' 
                                    : 'bg-white border-gray-200 text-gray-800 hover:bg-green-50 hover:border-green-400 hover:shadow-lg'
                              }`}
                            >
                              <span className="mb-1">✅</span>
                              {actionLoading[`${alertId}-complete`] ? 'Loading...' : 'Complete'}
                            </button>
                            <button
                              onClick={() => handleAssignAlert(alert)}
                              className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold ${
                                colorMode 
                                  ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-purple-700/80 hover:border-purple-500 hover:shadow-lg' 
                                  : 'bg-white border-gray-200 text-gray-800 hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg'
                              }`}
                            >
                              <span className="mb-1">👤</span>
                              Assign
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Alert Pagination Controls */}
            {alertTotalPages > 1 && (
              <div className={`mt-2 pt-1 border-t ${colorMode ? 'border-[#3b82f6]/40' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-[9px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Page {alertCurrentPage} of {alertTotalPages} ({getSortedAlerts().length} total alerts)
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={prevAlertPage}
                      disabled={alertCurrentPage === 1}
                      className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                        alertCurrentPage === 1
                          ? `${colorMode ? 'text-gray-500' : 'text-gray-400'} cursor-not-allowed`
                          : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                      }`}
                    >
                      ← Prev
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, alertTotalPages) }, (_, i) => {
                        let pageNum;
                        if (alertTotalPages <= 5) {
                          pageNum = i + 1;
                        } else if (alertCurrentPage <= 3) {
                          pageNum = i + 1;
                        } else if (alertCurrentPage >= alertTotalPages - 2) {
                          pageNum = alertTotalPages - 4 + i;
                        } else {
                          pageNum = alertCurrentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToAlertPage(pageNum)}
                            className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                              alertCurrentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={nextAlertPage}
                      disabled={alertCurrentPage === alertTotalPages}
                      className={`px-2 py-1 text-[9px] rounded-md transition-colors ${
                        alertCurrentPage === alertTotalPages
                          ? `${colorMode ? 'text-gray-500' : 'text-gray-400'} cursor-not-allowed`
                          : `${colorMode ? 'text-gray-300 hover:bg-[#1e293b] hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Cubes - Quick Access */}
      <div className="mt-16 border-t-4 border-blue-400 bg-white overflow-hidden relative rounded-t-[8px]" data-section="project-cubes">
        <div className="w-full">
          <ProjectCubes 
            projects={projects} 
            onProjectSelect={handleProjectSelectWithScroll} 
            colorMode={colorMode}
          />
        </div>
      </div>

      {/* Full Width - Project Overview by Phase */}
      <div className={`mt-16 border-t-4 border-blue-400 bg-white overflow-hidden relative shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] p-4 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'}`} data-section="project-phases">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Projects by Phase</h2>
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

        {/* Phase Cards */}
        <div className="space-y-3">
          {PROJECT_PHASES.map((phase) => (
            <div key={phase.id} id={`phase-${phase.id}`} className={`
              rounded-lg border transition-all duration-200 overflow-hidden
              ${colorMode ? 'bg-[#1e293b]/60 border-[#3b82f6]/20' : 'bg-white border-gray-200'}
              ${expandedPhases.has(phase.id) ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
            `}>
              {/* Phase Header */}
              <div 
                className={`
                  p-4 cursor-pointer transition-all duration-200
                  ${colorMode ? 'hover:bg-[#232b4d]/80' : 'hover:bg-gray-50'}
                `}
                onClick={() => togglePhase(phase.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${phase.color}`}></div>
                    <div>
                      <h3 className={`text-[9px] font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                        {phase.name}
                      </h3>
                      <p className={`text-[7px] ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {getSortedPhaseProjects(phase.id).length} projects
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronDownIcon 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedPhases.has(phase.id) ? 'rotate-180' : ''
                      } ${colorMode ? 'text-gray-300' : 'text-gray-500'}`} 
                    />
                  </div>
                </div>
              </div>

              {/* Phase Content */}
              {expandedPhases.has(phase.id) && (
                <div className={`border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[8px]">
                        <thead>
                          <tr className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              <button 
                                onClick={() => _handleSort('projectName')}
                                className="flex items-center gap-1 hover:underline"
                              >
                                Project Name
                                {sortConfig.key === 'projectName' && (
                                  <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </button>
                            </th>
                            <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              <button 
                                onClick={() => _handleSort('clientName')}
                                className="flex items-center gap-1 hover:underline"
                              >
                                Client
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
                                Manager
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
                              <button 
                                onClick={() => _handleSort('priority')}
                                className="flex items-center gap-1 hover:underline"
                              >
                                Priority
                                {sortConfig.key === 'priority' && (
                                  <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </button>
                            </th>
                            <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Project Workflow</th>
                            <th className={`text-left py-1 px-2 font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Profile</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedPhaseProjects(phase.id).map((project) => (
                            <tr 
                              key={project.id}
                              className={`border-b ${colorMode ? 'border-gray-600/30 hover:bg-[#1e293b]/40' : 'border-gray-100 hover:bg-gray-50'} cursor-pointer transition-colors`}
                              onClick={() => handleProjectSelectWithScroll(project, 'Project Profile', phase.id, 'Project Phases')}
                            >
                              <td className={`py-1 px-2 font-medium ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProjectSelectWithScroll(project, 'Project Profile', phase.id, 'Project Phases');
                                  }}
                                  className={`text-left hover:underline transition-colors ${
                                    colorMode 
                                      ? 'text-blue-400 hover:text-blue-300' 
                                      : 'text-blue-600 hover:text-blue-700'
                                  }`}
                                >
                                  {project.projectName}
                                </button>
                              </td>
                              <td className={`py-1 px-2 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {project.clientName}
                              </td>
                              <td className={`py-1 px-2 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {project.projectManager}
                              </td>
                              <td className={`py-1 px-2 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <div className="flex items-center gap-1">
                                  <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-500" 
                                      style={{ width: `${project.progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[7px] font-medium">{project.progress}%</span>
                                </div>
                              </td>
                              <td className="py-1 px-2">
                                {getPriorityBadge(project.priority)}
                              </td>
                              <td className="py-1 px-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProjectSelectWithScroll(project, 'Project Workflow', phase.id, 'Project Phases');
                                  }}
                                  className={`px-2 py-0.5 text-[7px] rounded transition-all duration-200 font-medium ${
                                    colorMode 
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25' 
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                                  }`}
                                >
                                  Workflow
                                </button>
                              </td>
                              <td className="py-1 px-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const projectWithScrollId = {
                                      ...project,
                                      scrollToProjectId: String(project.id)
                                    };
                                    handleProjectSelectWithScroll(projectWithScrollId, 'Projects', phase.id, 'Project Phases');
                                  }}
                                  className={`px-2 py-0.5 text-[7px] rounded transition-all duration-200 font-medium ${
                                    colorMode 
                                      ? 'bg-gray-600 hover:bg-gray-700 text-white shadow-lg hover:shadow-gray-500/25' 
                                      : 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg'
                                  }`}
                                >
                                  Profile
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg p-6 w-96 max-w-md ${colorMode ? 'bg-[#1e293b] border border-[#3b82f6]/30' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              Assign Alert to User
            </h3>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Alert: {selectedAlertForAssign?.title || 'Unknown Alert'}
              </label>
              <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select User:
              </label>
              <select
                value={assignToUser}
                onChange={(e) => setAssignToUser(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  colorMode 
                    ? 'bg-[#232b4d] border-[#3b82f6] text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Choose a user...</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
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
    </div>
  );
};

export default DashboardPage;