import React, { useState, useEffect, useRef } from 'react';
import { useSectionNavigation } from '../../contexts/NavigationContext';
import BackButton from '../common/BackButton';
import { useWorkflowAlerts } from '../../hooks/useQueryApi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';

const CurrentAlertsSection = ({ 
  alerts = [], 
  projects = [],
  onProjectSelect,
  onAlertDismiss,
  colorMode 
}) => {
  const { 
    saveFilters, 
    getSavedFilters, 
    saveExpandedState, 
    getSavedExpandedState,
    updateScrollPosition,
    navigateToAlert 
  } = useSectionNavigation('Current Alerts');

  // State for expanded alerts with context restoration
  const [expandedAlerts, setExpandedAlerts] = useState(() => {
    return getSavedExpandedState() || {};
  });

  // State for selected alert filter
  const [selectedAlertFilter, setSelectedAlertFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedAlert || null;
  });

  // State for project filter
  const [selectedProjectFilter, setSelectedProjectFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedProject || null;
  });

  // State for priority filter
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedPriority || null;
  });

  // State for status filter
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedStatus || 'ACTIVE';
  });

  // State for responsible role filter
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedRole || null;
  });

  // State for search filter
  const [searchFilter, setSearchFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.searchTerm || '';
  });

  // State for assign user modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAlertForAssign, setSelectedAlertForAssign] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  // State for sort configuration
  const [sortBy, setSortBy] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.sortBy || 'createdAt';
  });

  const [sortOrder, setSortOrder] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.sortOrder || 'desc';
  });

  // Scroll container ref for restoring position
  const scrollContainerRef = useRef(null);

  // Fetch available users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users/team-members');
        console.log('🔍 CurrentAlertsSection - API Response for users:', response.data);
        
        if (response.data.success && response.data.data?.teamMembers) {
          setAvailableUsers(response.data.data.teamMembers);
          console.log('✅ CurrentAlertsSection - Loaded users:', response.data.data.teamMembers.length);
        } else {
          // Don't use fallback users with invalid IDs - just log the issue
          console.log('⚠️ CurrentAlertsSection - API returned no team members');
          setAvailableUsers([]);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Don't use fallback users with invalid IDs - just set empty array
        setAvailableUsers([]);
      }
    };
    fetchUsers();
  }, []);

  // Handle user assignment
  const handleAssignUser = async (userId) => {
    if (!selectedAlertForAssign || !userId) return;
    
    setAssignLoading(true);
    try {
      const response = await api.patch(`/alerts/${selectedAlertForAssign.id}/assign`, {
        assignedTo: userId
      });
      
      if (response.data.success) {
        const assignedUser = availableUsers.find(u => u.id === userId);
        toast.success(`Alert assigned to ${assignedUser?.firstName} ${assignedUser?.lastName}`);
        setShowAssignModal(false);
        setSelectedAlertForAssign(null);
        
        // Refresh alerts
        setExpandedAlerts(prev => ({ ...prev }));
      }
    } catch (error) {
      console.error('Failed to assign alert:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign alert. Please try again.';
      toast.error(errorMessage);
    } finally {
      setAssignLoading(false);
    }
  };

  // Save expanded state whenever it changes
  useEffect(() => {
    saveExpandedState(expandedAlerts);
  }, [expandedAlerts, saveExpandedState]);

  // Save filters whenever they change
  useEffect(() => {
    saveFilters({
      selectedAlert: selectedAlertFilter,
      selectedProject: selectedProjectFilter,
      selectedPriority: selectedPriorityFilter,
      selectedStatus: selectedStatusFilter,
      selectedRole: selectedRoleFilter,
      searchTerm: searchFilter,
      sortBy,
      sortOrder
    });
  }, [selectedAlertFilter, selectedProjectFilter, selectedPriorityFilter, selectedStatusFilter, selectedRoleFilter, searchFilter, sortBy, sortOrder, saveFilters]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      updateScrollPosition();
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [updateScrollPosition]);

  // Toggle alert expansion
  const toggleAlertExpansion = (alertId) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [alertId]: !prev[alertId]
    }));
  };

  // Handle alert navigation with context
  const handleAlertNavigation = (alert, targetPage = 'Alerts') => {
    const contextData = {
      section: 'Current Alerts',
      type: 'alert',
      returnPath: '/dashboard',
      alertId: alert.id,
      projectId: alert.projectId,
      stepId: alert.stepId,
      projectName: alert.projectName,
      selectedData: alert,
      filters: {
        selectedAlert: selectedAlertFilter,
        selectedProject: selectedProjectFilter,
        selectedPriority: selectedPriorityFilter,
        selectedStatus: selectedStatusFilter,
        selectedRole: selectedRoleFilter,
        searchTerm: searchFilter,
        sortBy,
        sortOrder
      },
      expandedState: expandedAlerts,
      scrollPosition: window.scrollY
    };

    // Use the navigation system to track context
    navigateToAlert(alert, `/project/${alert.projectId}/alerts`);
  };

  // Handle project selection through alert - matches DashboardPage pattern
  const handleProjectSelectFromAlert = (project, targetPage, phase = null, sourceSection = null, targetLineItemId = null, targetSectionId = null, alertId = null) => {
    console.log('🎯 CURRENT_ALERTS: handleProjectSelectFromAlert called with:');
    console.log('🎯 CURRENT_ALERTS: project:', project?.name);
    console.log('🎯 CURRENT_ALERTS: targetPage:', targetPage);
    console.log('🎯 CURRENT_ALERTS: phase:', phase);
    console.log('🎯 CURRENT_ALERTS: sourceSection:', sourceSection);
    console.log('🎯 CURRENT_ALERTS: targetLineItemId:', targetLineItemId);
    console.log('🎯 CURRENT_ALERTS: targetSectionId:', targetSectionId);
    console.log('🎯 CURRENT_ALERTS: alertId:', alertId);
    
    if (onProjectSelect) {
      // Enhanced project with dashboard state for alert restoration
      const projectWithDashboardState = {
        ...project,
        dashboardState: {
          ...project.dashboardState,
          // Alert-specific restoration state
          currentAlertsState: {
            selectedAlertFilter: alertId || selectedAlertFilter,
            expandedAlerts: { ...expandedAlerts, [alertId]: true },
            scrollToAlert: alertId,
            filters: {
              selectedAlert: selectedAlertFilter,
              selectedProject: selectedProjectFilter,
              selectedPriority: selectedPriorityFilter,
              selectedStatus: selectedStatusFilter,
              selectedRole: selectedRoleFilter,
              searchTerm: searchFilter,
              sortBy: sortBy,
              sortOrder: sortOrder
            }
          }
        }
      };
      
      console.log('🎯 CURRENT_ALERTS: Calling onProjectSelect with all parameters');
      // Pass parameters in the same order as DashboardPage
      onProjectSelect(projectWithDashboardState, targetPage, phase, sourceSection, targetLineItemId, targetSectionId);
    }
  };

  // Use the same targeting logic as Projects by Phase: compute targetLineItemId/targetSectionId
  const navigateAlertToWorkflow = async (alert) => {
    const project = projects?.find(p => p.id === alert.projectId);
    if (!project || !onProjectSelect) return;

    try {
      const lineItemName = alert.stepName || alert.title || 'Unknown Item';
      let targetLineItemId = null;
      let targetSectionId = null;
      let targetPhaseId = null;
      let targetSectionName = null;

      // Get current project position (auto-initializes if needed)
      const positionResponse = await fetch(`/api/workflow-data/project-position/${project.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
        }
      });

      if (positionResponse.ok) {
        const positionResult = await positionResponse.json();
        if (positionResult.success && positionResult.data) {
          const position = positionResult.data;

          // Compute subtask index from full-structure
          let subtaskIndex = 0;
          try {
            const workflowResponse = await fetch('/api/workflow-data/full-structure', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
              }
            });
            if (workflowResponse.ok) {
              const workflowResult = await workflowResponse.json();
              if (workflowResult.success && workflowResult.data) {
                const currentPhaseData = workflowResult.data.find(phase => phase.id === position.currentPhase);
                if (currentPhaseData) {
                  const currentSectionData = currentPhaseData.items.find(item => item.id === position.currentSection);
                  if (currentSectionData) {
                    const idx = currentSectionData.subtasks.findIndex(subtask => {
                      if (typeof subtask === 'object') {
                        return subtask.id === position.currentLineItem || subtask.label === position.currentLineItemName;
                      }
                      return subtask === position.currentLineItemName;
                    });
                    subtaskIndex = idx >= 0 ? idx : 0;
                  }
                }
              }
            }
          } catch (_) {}

          // Prefer DB line item id when available
          targetLineItemId = position.currentLineItemId || position.currentLineItem || `${position.currentPhase}-${position.currentSection}-${subtaskIndex}`;
          targetSectionId = position.currentSectionId || position.currentSection;
          targetPhaseId = position.currentPhase || null;
        }
      }

      // Fallback to alert metadata when needed
      if (!targetLineItemId || !targetSectionId) {
        const metadata = alert.metadata || {};
        const phase = metadata.phase || alert.phase || 'LEAD';
        const sectionName = alert.section || metadata.section || 'Unknown Section';
        targetLineItemId = alert.stepId || metadata.stepId || metadata.lineItemId || `${phase}-${sectionName}-0`;
        targetSectionId = alert.sectionId || metadata.sectionId || sectionName.toLowerCase().replace(/\s+/g, '-');
        targetPhaseId = phase;
        targetSectionName = sectionName;
      }

      const projectWithNavigation = {
        ...project,
        navigationSource: 'Current Alerts',
        highlightStep: lineItemName,
        highlightLineItem: lineItemName,
        targetPhase: targetPhaseId || undefined,
        targetSection: targetSectionName || undefined,
        targetLineItem: lineItemName,
        scrollToCurrentLineItem: true,
        navigationTarget: {
          phase: targetPhaseId || undefined,
          section: targetSectionName || undefined,
          lineItem: lineItemName,
          stepName: lineItemName,
          alertId: alert.id,
          lineItemId: alert.stepId || alert.metadata?.stepId || alert.metadata?.lineItemId || targetLineItemId,
          highlightMode: 'line-item',
          scrollBehavior: 'smooth',
          targetElementId: `lineitem-${targetLineItemId}`,
          highlightColor: '#0066CC',
          highlightDuration: 3000,
          targetSectionId: targetSectionId,
          expandPhase: true,
          expandSection: true,
          autoOpen: true
        }
      };

      handleProjectSelectFromAlert(
        projectWithNavigation,
        'Project Workflow',
        null,
        'Current Alerts',
        targetLineItemId,
        targetSectionId,
        alert.id
      );
    } catch (error) {
      console.error('🎯 CURRENT_ALERTS: navigateAlertToWorkflow error:', error);
      // Final fallback matching pattern
      const metadata = alert.metadata || {};
      const phase = metadata.phase || alert.phase || 'LEAD';
      const sectionName = alert.section || metadata.section || 'Unknown Section';
      const lineItemName = alert.stepName || alert.title || 'Unknown Item';
      const targetLineItemId = alert.stepId || metadata.stepId || `${phase}-${sectionName}-0`;
      const targetSectionId = alert.sectionId || sectionName.toLowerCase().replace(/\s+/g, '-');
      const project = projects?.find(p => p.id === alert.projectId);
      if (!project) return;
      const projectWithStepInfo = {
        ...project,
        navigationSource: 'Current Alerts',
        highlightStep: lineItemName,
        highlightLineItem: lineItemName,
        targetPhase: phase,
        targetSection: sectionName,
        targetLineItem: lineItemName,
        scrollToCurrentLineItem: true,
        navigationTarget: {
          phase: phase,
          section: sectionName,
          lineItem: lineItemName,
          stepName: lineItemName,
          alertId: alert.id,
          lineItemId: alert.stepId || metadata.stepId,
          highlightMode: 'line-item',
          scrollBehavior: 'smooth',
          targetElementId: `lineitem-${targetLineItemId}`,
          highlightColor: '#0066CC',
          highlightDuration: 3000,
          targetSectionId: targetSectionId,
          expandPhase: true,
          expandSection: true,
          autoOpen: true
        }
      };
      handleProjectSelectFromAlert(projectWithStepInfo, 'Project Workflow', null, 'Current Alerts', targetLineItemId, targetSectionId, alert.id);
    }
  };

  // Normalize alert data for consistent display and navigation
  const normalizeAlert = (alert) => {
    const metadata = alert.metadata || alert.actionData || {};
    const project = alert.relatedProject || alert.project || {};
    const priorityRaw = (alert.priority || metadata.priority || '').toString().toUpperCase();
    const statusRaw = (alert.status || metadata.status || 'ACTIVE').toString().toUpperCase();

    // Map various role representations to enum values used in filters here
    const resolveRole = () => {
      const role = metadata.responsibleRole
        || alert.responsibleRole
        || metadata.defaultResponsible
        || alert.user?.role
        || 'OFFICE';
      const r = role.toString().toUpperCase();
      if (r === 'PM') return 'PROJECT_MANAGER';
      if (r === 'FIELD') return 'FIELD_DIRECTOR';
      if (r === 'ADMIN') return 'ADMINISTRATION';
      return r;
    };

    // CRITICAL FIX: Properly map section field from database
    // The database has sectionId field, but we need the section name for display
    // Check metadata first, then fallback to database fields
    const sectionName = metadata.section || 
                       (alert.section && typeof alert.section === 'string' ? alert.section : null) ||
                       'Unknown Section';
    
    // CRITICAL FIX: Ensure we have the correct line item information
    const lineItemName = metadata.lineItem || 
                        alert.stepName || 
                        metadata.stepName || 
                        alert.title || 
                        'Unknown Item';

    const normalized = {
      id: alert._id || alert.id,
      projectId: metadata.projectId || alert.projectId || project._id || project.id,
      projectName: project.projectName || alert.projectName || project.name,
      projectType: alert.projectType || project.projectType || metadata.projectType,
      title: alert.title || metadata.title || metadata.stepName || alert.stepName || 'Alert',
      message: alert.message || metadata.message || '',
      stepName: lineItemName, // Use the properly resolved line item name
      responsibleRole: resolveRole(),
      createdAt: alert.createdAt || alert.timestamp || new Date().toISOString(),
      dueDate: alert.dueDate || metadata.dueDate,
      status: statusRaw,
      priority: priorityRaw === 'HIGH' || priorityRaw === 'MEDIUM' || priorityRaw === 'LOW'
        ? priorityRaw
        : (priorityRaw.charAt(0) ? priorityRaw : 'MEDIUM'),
      // CRITICAL FIX: Keep original fields for navigation helpers with proper mapping
      stepId: alert.stepId || metadata.stepId || metadata.lineItemId,
      sectionId: metadata.sectionId || alert.sectionId, // Database sectionId
      section: sectionName, // Display section name
      // Add metadata for navigation
      metadata: {
        ...metadata,
        section: sectionName,
        lineItem: lineItemName,
        phase: metadata.phase || alert.phase || 'LEAD',
        lineItemId: alert.stepId || metadata.stepId || metadata.lineItemId,
        workflowId: alert.workflowId || metadata.workflowId
      }
    };
    return normalized;
  };

  // Optionally fetch alerts if none were passed in - use ACTIVE (uppercase) for API
  const { data: fetchedAlerts = [], isLoading: fetchedLoading } = useWorkflowAlerts({ status: 'ACTIVE' });
  const sourceAlerts = (alerts && alerts.length > 0) ? alerts : (fetchedAlerts || []);
  const alertsForView = sourceAlerts.map(normalizeAlert).filter(a => !!a.id);

  // Filter and sort alerts
  const getFilteredAndSortedAlerts = () => {
    let filteredAlerts = [...alertsForView];

    // Apply project filter
    if (selectedProjectFilter) {
      filteredAlerts = filteredAlerts.filter(alert => alert.projectId === selectedProjectFilter);
    }

    // Apply priority filter
    if (selectedPriorityFilter) {
      filteredAlerts = filteredAlerts.filter(alert => alert.priority === selectedPriorityFilter);
    }

    // Apply status filter
    if (selectedStatusFilter) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === selectedStatusFilter);
    }

    // Apply role filter
    if (selectedRoleFilter) {
      filteredAlerts = filteredAlerts.filter(alert => alert.responsibleRole === selectedRoleFilter);
    }

    // Apply search filter
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      filteredAlerts = filteredAlerts.filter(alert => 
        (alert.title || '').toLowerCase().includes(searchTerm) ||
        (alert.message || '').toLowerCase().includes(searchTerm) ||
        (alert.stepName || '').toLowerCase().includes(searchTerm) ||
        (alert.projectName || '').toLowerCase().includes(searchTerm)
      );
    }

    // Apply single alert filter
    if (selectedAlertFilter) {
      filteredAlerts = filteredAlerts.filter(alert => alert.id === selectedAlertFilter);
    }

    // Sort alerts
    filteredAlerts.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'project':
          aValue = a.projectName || '';
          bValue = b.projectName || '';
          break;
        case 'priority':
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'stepName':
          aValue = a.stepName || '';
          bValue = b.stepName || '';
          break;
        case 'responsibleRole':
          aValue = a.responsibleRole || '';
          bValue = b.responsibleRole || '';
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate || a.createdAt);
          bValue = new Date(b.dueDate || b.createdAt);
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return filteredAlerts;
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedAlertFilter(null);
    setSelectedProjectFilter(null);
    setSelectedPriorityFilter(null);
    setSelectedStatusFilter('ACTIVE');
    setSelectedRoleFilter(null);
    setSearchFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  // Get unique projects for filter dropdown
  const getUniqueProjects = () => {
    const projectsMap = new Map();
    alertsForView.forEach(alert => {
      if (alert.projectId && !projectsMap.has(alert.projectId)) {
        projectsMap.set(alert.projectId, {
          id: alert.projectId,
          name: alert.projectName || `Project ${alert.projectId}`
        });
      }
    });
    return Array.from(projectsMap.values());
  };

  // Get priority color classes
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status color classes
  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ACKNOWLEDGED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DISMISSED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAlerts = getFilteredAndSortedAlerts();
  const uniqueProjects = getUniqueProjects();

  return (
    <div className="mb-6 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6" data-section="current-alerts">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl leading-tight font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
            Current Alerts
          </h2>
          <p className="text-[15px] leading-snug text-gray-600 font-medium">
            Active workflow alerts requiring attention
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-4">
          {/* Search Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectFilter || ''}
            onChange={(e) => setSelectedProjectFilter(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Projects</option>
            {uniqueProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriorityFilter || ''}
            onChange={(e) => setSelectedPriorityFilter(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter || ''}
            onChange={(e) => setSelectedStatusFilter(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Role Filter */}
          <select
            value={selectedRoleFilter || ''}
            onChange={(e) => setSelectedRoleFilter(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Roles</option>
            <option value="OFFICE">Office</option>
            <option value="PROJECT_MANAGER">Project Manager</option>
            <option value="FIELD_DIRECTOR">Field Director</option>
            <option value="ADMINISTRATION">Administration</option>
          </select>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="createdAt">Date Created</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="project">Project</option>
              <option value="stepName">Step</option>
              <option value="responsibleRole">Role</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <svg className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Clear Filters */}
          {(selectedProjectFilter || selectedPriorityFilter || selectedRoleFilter || searchFilter || selectedAlertFilter || selectedStatusFilter !== 'ACTIVE') && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div 
        ref={scrollContainerRef}
        className="space-y-4 max-h-96 overflow-y-auto"
      >
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 ${
                selectedAlertFilter === alert.id ? 'ring-2 ring-blue-500 border-blue-300' : 'hover:border-gray-300'
              }`}
            >
              {/* Alert Header - Clickable */}
              <button
                onClick={() => {
                  if (selectedAlertFilter === alert.id) {
                    setSelectedAlertFilter(null); // Collapse if already selected
                  } else {
                    setSelectedAlertFilter(alert.id); // Select this alert
                    handleAlertNavigation(alert);
                  }
                }}
                className="w-full px-6 py-4 bg-white hover:bg-gray-50 transition-colors duration-200 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Priority Indicator */}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(alert.priority)}`}>
                        {alert.priority}
                      </div>
                      
                      {/* Status Indicator */}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </div>
                      

                      
                      {/* Title */}
                      <h3 className="font-semibold text-[17px] leading-tight text-gray-900 truncate flex-1">
                        {alert.title}
                      </h3>
                      
                      {/* Project Name - Clickable to navigate to Project Profile */}
                      <span 
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-200 transition-colors"
                        title={`Click to view ${alert.projectName} profile`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const project = projects?.find(p => p.id === alert.projectId);
                          if (project && onProjectSelect) {
                            console.log('🎯 CURRENT_ALERTS CLICK: Navigating to project profile:', project.name);
                            handleProjectSelectFromAlert(project, 'Profile', null, 'Current Alerts');
                          }
                        }}
                      >
                        {alert.projectName}
                      </span>

                      {/* Project Type Tag - match Projects by Phase rectangular style */}
                      {alert.projectType && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border max-w-[140px] whitespace-nowrap truncate ${
                            colorMode ? getProjectTypeColorDark(alert.projectType) : getProjectTypeColor(alert.projectType)
                          }`}
                          title={`Project Type: ${formatProjectType(alert.projectType)}`}
                        >
                          {formatProjectType(alert.projectType)}
                        </span>
                      )}
                    </div>
                    
                    {/* Message */}
                    <p className="text-[15px] leading-snug text-gray-600 mb-2 line-clamp-2">
                      {alert.message}
                    </p>
                    
                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {/* Line Item - Clickable to navigate to Project Workflow */}
                      <div className="flex items-center gap-1">
                        <span>Line Item:</span>
                        <span 
                          className={`font-semibold cursor-pointer hover:underline max-w-[120px] truncate ${
                            colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                          }`}
                          title={alert.stepName}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await navigateAlertToWorkflow(alert);
                          }}
                        >
                          {alert.stepName}
                        </span>
                      </div>
                      {/* Removed role pill per request; replaced with project type tag above */}
                      <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                      {alert.dueDate && (
                        <span className={new Date(alert.dueDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                          Due: {new Date(alert.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand/Collapse Icon */}
                  <div className="ml-4">
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${
                        selectedAlertFilter === alert.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Alert Content */}
              {selectedAlertFilter === alert.id && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {/* Alert Actions */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Alert Actions</h4>
                      <button
                        onClick={() => setSelectedAlertFilter(null)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <button
                        onClick={() => handleAlertNavigation(alert, 'Alerts')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        View Alert Details
                      </button>
                      
                      <button
                        onClick={async () => {
                          const project = projects?.find(p => p.id === alert.projectId);
                          if (project) {
                            await navigateAlertToWorkflow(alert);
                          }
                        }}
                        className="px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        View in Workflow
                      </button>
                      
                      <button
                        onClick={() => {
                          const project = projects?.find(p => p.id === alert.projectId);
                          if (project) {
                            handleProjectSelectFromAlert(project, 'Messages', null, 'Current Alerts');
                          }
                        }}
                        className="px-4 py-2 bg-[var(--color-success-green)] text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Project Messages
                      </button>
                      
                      <button
                        onClick={() => {
                          const project = projects?.find(p => p.id === alert.projectId);
                          if (project) {
                            handleProjectSelectFromAlert(project, 'Profile', null, 'Current Alerts');
                          }
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        Project Details
                      </button>
                    </div>

                    {/* Alert Management Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedAlertForAssign(alert);
                          setShowAssignModal(true);
                        }}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                      >
                        Assign User
                      </button>
                      <button
                        onClick={async () => {
                          const loadingToast = toast.loading('Acknowledging alert...');
                          try {
                            const response = await api.patch(`/alerts/${alert.id}/acknowledge`);
                            toast.dismiss(loadingToast);
                            if (response.data.success) {
                              toast.success('Alert acknowledged successfully', {
                                duration: 3000,
                                icon: '👍'
                              });
                              // Refresh alerts to show updated status
                              window.location.reload();
                            }
                          } catch (error) {
                            toast.dismiss(loadingToast);
                            console.error('Failed to acknowledge alert:', error);
                            const errorMessage = error.response?.data?.message || 'Failed to acknowledge alert. Please try again.';
                            toast.error(errorMessage, { duration: 4000 });
                          }
                        }}
                        disabled={alert.status === 'ACKNOWLEDGED'}
                        className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {alert.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Acknowledge'}
                      </button>
                      
                      <button
                        onClick={() => {
                          if (onAlertDismiss) {
                            onAlertDismiss(alert.id);
                          }
                        }}
                        disabled={alert.status === 'DISMISSED'}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {alert.status === 'DISMISSED' ? 'Dismissed' : 'Dismiss'}
                      </button>
                      
                      <button
                        onClick={async () => {
                          try {
                            // Show loading state with custom styling
                            const loadingToast = toast.loading('🔄 Completing task and generating next alert...', {
                              style: {
                                background: '#3B82F6',
                                color: '#ffffff',
                                fontWeight: '600',
                              },
                            });
                            
                            // Complete the workflow line item
                            const response = await api.post('/workflows/complete-item', {
                              projectId: alert.projectId,
                              lineItemId: alert.lineItemId || alert.metadata?.lineItemId || alert.stepId || alert.metadata?.stepId,
                              notes: `Completed via Current Alerts Section at ${new Date().toLocaleString()}`,
                              alertId: alert.id
                            });
                            
                            toast.dismiss(loadingToast);
                            
                            if (response.data.success) {
                              // Show completion notification
                              toast.success(
                                <div className="flex items-center gap-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>✅ Task completed successfully!</span>
                                </div>,
                                {
                                  duration: 4000,
                                  style: {
                                    background: '#10B981',
                                    color: '#ffffff',
                                    fontWeight: '600',
                                  },
                                }
                              );
                              
                              // Show next step notification if available
                              const nextItem = response.data?.data?.next;
                              if (nextItem) {
                                setTimeout(() => {
                                  toast.success(
                                    <div className="flex items-center gap-2">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                      <span>📋 Next task: {nextItem.lineItemName}</span>
                                    </div>,
                                    { 
                                      duration: 6000,
                                      style: {
                                        background: '#0F172A',
                                        color: '#ffffff',
                                        fontWeight: '600',
                                      },
                                    }
                                  );
                                }, 1500);
                              }
                              
                              // Show workflow progress if available
                              const progress = response.data?.data?.progress;
                              if (progress) {
                                setTimeout(() => {
                                  toast.success(`📊 Workflow progress: ${Math.round(progress.completionPercentage)}%`, { 
                                    duration: 4000,
                                    style: {
                                      background: '#7C3AED',
                                      color: '#ffffff',
                                      fontWeight: '600',
                                    },
                                  });
                                }, 3000);
                              }
                              
                              // Mark alert as completed and remove from UI immediately
                              try {
                                await api.patch(`/alerts/${alert.id}/complete`);
                              } catch (alertError) {
                                console.warn('Failed to mark alert as completed:', alertError);
                              }
                              
                              // Dispatch global event to notify Project Workflow page
                              const globalEvent = new CustomEvent('workflowStepCompleted', {
                                detail: {
                                  projectId: alert.projectId,
                                  lineItemId: alert.lineItemId || alert.metadata?.lineItemId || alert.stepId || alert.metadata?.stepId,
                                  stepName: alert.stepName || alert.title,
                                  projectName: alert.projectName,
                                  source: 'Current Alerts Section',
                                  timestamp: new Date().toISOString()
                                }
                              });
                              window.dispatchEvent(globalEvent);
                              console.log('📡 GLOBAL EVENT: Dispatched workflowStepCompleted event from Current Alerts Section');
                              
                              // Clear this alert from expanded view
                              setSelectedAlertFilter(null);
                              
                              // Force refresh of alerts by calling dismiss callback and reloading
                              if (onAlertDismiss) {
                                onAlertDismiss(alert.id);
                              }
                              
                              // Force a page refresh to show updated alerts
                              setTimeout(() => {
                                window.location.reload();
                              }, 2000);
                              
                            } else {
                              toast.error('Failed to complete task. Please try again.');
                            }
                          } catch (error) {
                            console.error('Failed to complete line item:', error);
                            const errorMessage = error.response?.data?.message || 'Failed to complete task. Please try again.';
                            toast.error(errorMessage, {
                              duration: 5000,
                              style: {
                                background: '#EF4444',
                                color: '#ffffff',
                                fontWeight: '600',
                              },
                            });
                          }
                        }}
                        disabled={alert.status === 'COMPLETED'}
                        className="px-3 py-2 bg-[var(--color-success-green)] text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {alert.status === 'COMPLETED' ? 'Completed' : 'Complete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">🚨</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchFilter || selectedProjectFilter || selectedPriorityFilter || selectedRoleFilter || selectedAlertFilter
                ? 'No alerts match your filters'
                : 'No alerts found'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchFilter || selectedProjectFilter || selectedPriorityFilter || selectedRoleFilter || selectedAlertFilter
                ? 'Try adjusting your filter settings.'
                : 'Workflow alerts will appear here when they require attention.'
              }
            </p>
            {(searchFilter || selectedProjectFilter || selectedPriorityFilter || selectedRoleFilter || selectedAlertFilter || selectedStatusFilter !== 'ACTIVE') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alerts Summary */}
      {filteredAlerts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                {filteredAlerts.filter(a => a.priority === 'HIGH').length} High
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                {filteredAlerts.filter(a => a.priority === 'MEDIUM').length} Medium
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {filteredAlerts.filter(a => a.priority === 'LOW').length} Low
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Assign Alert to User</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAlertForAssign(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Alert: <span className="font-medium">{selectedAlertForAssign?.title}</span>
              </p>
              <p className="text-sm text-gray-600">
                Project: <span className="font-medium">{selectedAlertForAssign?.projectName}</span>
              </p>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableUsers.length > 0 ? (
                availableUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleAssignUser(user.id)}
                    disabled={assignLoading}
                    className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-gray-600">{user.role || 'Team Member'}</div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No users available</p>
              )}
            </div>
            
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAlertForAssign(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentAlertsSection;