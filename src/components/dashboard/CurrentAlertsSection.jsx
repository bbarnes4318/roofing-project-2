import React, { useState, useEffect, useRef } from 'react';
import { useSectionNavigation } from '../../contexts/NavigationContext';
import BackButton from '../common/BackButton';
import { useWorkflowAlerts } from '../../hooks/useQueryApi';

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
  const handleProjectSelectFromAlert = (project, targetPage, phase = null, sourceSection = null, targetLineItemId = null, targetSectionId = null) => {
    if (onProjectSelect) {
      // Pass parameters in the same order as DashboardPage
      onProjectSelect(project, targetPage, phase, sourceSection, targetLineItemId, targetSectionId);
    }
  };

  // Normalize alert to a consistent shape for this component
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

    const normalized = {
      id: alert._id || alert.id,
      projectId: metadata.projectId || alert.projectId || project._id || project.id,
      projectName: project.projectName || alert.projectName || project.name,
      title: alert.title || metadata.title || metadata.stepName || alert.stepName || 'Alert',
      message: alert.message || metadata.message || '',
      stepName: alert.stepName || metadata.stepName || metadata.lineItem,
      responsibleRole: resolveRole(),
      createdAt: alert.createdAt || alert.timestamp || new Date().toISOString(),
      dueDate: alert.dueDate || metadata.dueDate,
      status: statusRaw,
      priority: priorityRaw === 'HIGH' || priorityRaw === 'MEDIUM' || priorityRaw === 'LOW'
        ? priorityRaw
        : (priorityRaw.charAt(0) ? priorityRaw : 'MEDIUM'),
      // keep original fields for potential navigation helpers
      stepId: alert.stepId || metadata.stepId || metadata.lineItemId,
      sectionId: metadata.sectionId || metadata.section,
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
          <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
            Current Alerts
          </h2>
          <p className="text-sm text-gray-600 font-medium">
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
                      <h3 className="font-semibold text-gray-900 truncate flex-1">
                        {alert.title}
                      </h3>
                      
                      {/* Project Name */}
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {alert.projectName}
                      </span>
                    </div>
                    
                    {/* Message */}
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {alert.message}
                    </p>
                    
                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Step: {alert.stepName}</span>
                      <span>Role: {alert.responsibleRole}</span>
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
                            try {
                              // Use the same logic as DashboardPage for navigation
                              const metadata = alert.metadata || {};
                              const phase = metadata.phase || alert.phase || 'LEAD';
                              const sectionName = metadata.section || alert.section || 'Unknown Section';
                              const lineItemName = alert.stepName || alert.title || 'Unknown Item';
                              
                              // Get project position data for proper targeting
                              const positionResponse = await fetch(`/api/workflow-data/project-position/${project.id}`, {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-david-chen-token-fixed-12345'}`
                                }
                              });
                              
                              if (positionResponse.ok) {
                                const positionResult = await positionResponse.json();
                                if (positionResult.success && positionResult.data) {
                                  const position = positionResult.data;
                                  
                                  // Generate targetLineItemId and targetSectionId like Dashboard
                                  const targetLineItemId = alert.stepId || metadata.stepId || `${position.currentPhase}-${position.currentSection}-0`;
                                  const targetSectionId = metadata.sectionId || position.currentSection;
                                  
                                  const projectWithNavigation = {
                                    ...project,
                                    highlightStep: lineItemName,
                                    navigationContext: {
                                      phase: phase,
                                      section: sectionName,
                                      lineItem: lineItemName,
                                      stepName: lineItemName,
                                      alertId: alert.id,
                                      stepId: alert.stepId || metadata.stepId,
                                      workflowId: alert.workflowId || metadata.workflowId,
                                      highlightMode: 'line-item',
                                      scrollBehavior: 'smooth',
                                      targetElementId: `lineitem-${alert.stepId || lineItemName.replace(/\s+/g, '-').toLowerCase()}`,
                                      highlightColor: '#0066CC',
                                      highlightDuration: 3000
                                    }
                                  };
                                  
                                  handleProjectSelectFromAlert(
                                    projectWithNavigation,
                                    'Project Workflow',
                                    null,
                                    'Current Alerts',
                                    targetLineItemId,
                                    targetSectionId
                                  );
                                } else {
                                  // Fallback navigation
                                  handleProjectSelectFromAlert(project, 'Project Workflow', {
                                    targetStepId: alert.stepId,
                                    targetSectionId: alert.sectionId || metadata.sectionId
                                  });
                                }
                              } else {
                                // Fallback navigation
                                handleProjectSelectFromAlert(project, 'Project Workflow', {
                                  targetStepId: alert.stepId,
                                  targetSectionId: alert.sectionId || metadata.sectionId
                                });
                              }
                            } catch (error) {
                              console.error('Error navigating to workflow step:', error);
                              // Final fallback
                              handleProjectSelectFromAlert(project, 'Project Workflow');
                            }
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Go to Workflow Step
                      </button>
                      
                      <button
                        onClick={() => {
                          const project = projects?.find(p => p.id === alert.projectId);
                          if (project) {
                            handleProjectSelectFromAlert(project, 'Messages', null, 'Current Alerts');
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Project Messages
                      </button>
                      
                      <button
                        onClick={() => {
                          const project = projects?.find(p => p.id === alert.projectId);
                          if (project) {
                            handleProjectSelectFromAlert(project, 'Projects', null, 'Current Alerts');
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
                          // Handle acknowledge alert
                          console.log('Acknowledge alert:', alert.id);
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
                        onClick={() => {
                          // Handle mark as completed
                          console.log('Mark alert as completed:', alert.id);
                        }}
                        disabled={alert.status === 'COMPLETED'}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {alert.status === 'COMPLETED' ? 'Completed' : 'Mark Complete'}
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
    </div>
  );
};

export default CurrentAlertsSection;