import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDownIcon, ChevronLeftIcon } from '../common/Icons';
import ActivityCard from '../ui/ActivityCard';
import ProjectCubes from '../dashboard/ProjectCubes';
import { formatPhoneNumber } from '../../utils/helpers';
import { useProjects, useProjectStats, useTasks, useRecentActivities } from '../../hooks/useApi';
import { useSocket, useRealTimeUpdates, useRealTimeNotifications } from '../../hooks/useSocket';
import { authService } from '../../services/api';

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
    id: project._id || project.id,
    projectName: project.name,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    progress: project.progress || 0,
    budget: project.budget || 0,
    expenses: project.actualCost || 0,
    responsibleTeam: project.teamMembers?.map(member => member.name).join(', ') || 'Team Alpha',
    priority: project.priority || 'Medium',
    clientName: project.customer?.name || 'Unknown',
    clientEmail: project.customer?.email || '',
    projectManager: project.projectManager?.name || 'Sarah Johnson',
    phase: mapStatusToPhase(project.status)
  };
};

const DashboardPageNew = ({ onProjectSelect, colorMode }) => {
  const [message, setMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const activitiesPerPage = 8;
  
  // API hooks
  const { data: projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { data: projectStats, loading: statsLoading } = useProjectStats();
  const { data: tasks, loading: tasksLoading } = useTasks();
  const { data: recentActivities, loading: activitiesLoading } = useRecentActivities(20);
  
  // Socket.IO hooks
  const { isConnected } = useSocket();
  const { notifications, unreadCount } = useRealTimeNotifications();
  
  // Project Management Table State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isDarkMode, setIsDarkMode] = useState(colorMode);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [alertExpanded, setAlertExpanded] = useState(false);
  const [alertSortConfig, setAlertSortConfig] = useState({ key: 'projectName', direction: 'asc' });
  const [alertProjectFilter, setAlertProjectFilter] = useState('all');
  const [alertSubjectFilter, setAlertSubjectFilter] = useState('');
  const [alertCurrentPage, setAlertCurrentPage] = useState(1);
  const alertsPerPage = 12;
  const [activitySortConfig, setActivitySortConfig] = useState({ key: null, direction: 'asc' });
  
  // Activity feed filter state (separate from posting state)
  const [activityProjectFilter, setActivityProjectFilter] = useState('');
  const [activitySubjectFilter, setActivitySubjectFilter] = useState('');

  // Subject options for dropdown
  const subjectOptions = [
    'General Update',
    'Project Status',
    'Material Delivery',
    'Safety Meeting',
    'Quality Inspection',
    'Client Communication',
    'Permit Update',
    'Weather Alert',
    'Equipment Issue',
    'Crew Assignment',
    'Budget Update',
    'Schedule Change',
    'Inspection Report',
    'Documentation',
    'Emergency Alert',
    'Training Update',
    'Maintenance Required',
    'Vendor Communication',
    'Insurance Update',
    'Warranty Information'
  ];

  // Loading states
  if (projectsLoading || statsLoading || tasksLoading || activitiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error states
  if (projectsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 text-center">
          <h3 className="text-lg font-semibold">Error Loading Data</h3>
          <p>{projectsError}</p>
        </div>
      </div>
    );
  }

  // Default to empty arrays if data is not loaded yet
  const safeProjects = projects || [];
  const safeTasks = tasks || [];
  const safeActivities = recentActivities || [];

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  };

  // Enhanced project selection handler with scroll to top
  const handleProjectSelectWithScroll = (project, view = 'Project Profile', phase = null, sourceSection = null) => {
    scrollToTop();
    onProjectSelect(project, view, phase, sourceSection);
  };

  const _recentTasks = safeTasks.slice(0, 3);

  // Pagination logic with subject filtering and sorting
  const filteredActivities = safeActivities.filter(activity => {
    const projectMatch = !activityProjectFilter || activity.projectId === activityProjectFilter;
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
    
    const selectedProject = selectedProjectId.trim() ? safeProjects.find(p => p.id === selectedProjectId) : null;
    const projectName = selectedProject ? selectedProject.name : 'General';
    const subject = selectedSubject.trim() || 'General Update';
    
    // TODO: Implement API call to create activity
    const newActivity = {
      id: Date.now(),
      author: authService.getStoredUser()?.name || 'Current User',
      avatar: (authService.getStoredUser()?.name || 'U').charAt(0),
      content: message,
      timestamp: new Date().toISOString(),
      project: projectName,
      projectId: selectedProject ? selectedProject.id : null,
      subject: subject
    };
    
    setMessage('');
    setSelectedProjectId('');
    setSelectedSubject('');
  };

  // Convert projects to table format for consistency
  const tableProjects = useMemo(() => {
    return safeProjects.map(project => convertProjectToTableFormat(project));
  }, [safeProjects]);

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

  const handleSort = (key) => {
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
        case 'active':
          return 'bg-green-100 text-green-800 border border-green-300';
        case 'not started':
        case 'planning':
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
    const project = safeProjects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  // Function to handle project selection from alerts
  const handleProjectClick = (projectId) => {
    if (projectId && onProjectSelect) {
      const project = safeProjects.find(p => p.id === projectId);
      if (project) {
        handleProjectSelectWithScroll(project, 'Project Profile', null, 'Current Alerts');
      }
    }
  };

  // Real-time connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
      {unreadCount > 0 && (
        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          {unreadCount} new
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <ConnectionStatus />
      </div>

      {/* Project Stats */}
      {projectStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
            <p className="text-2xl font-bold text-gray-900">{projectStats.totalProjects}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Projects</h3>
            <p className="text-2xl font-bold text-blue-600">{projectStats.activeProjects}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed Projects</h3>
            <p className="text-2xl font-bold text-green-600">{projectStats.completedProjects}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Budget</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${projectStats.totalBudget?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
      )}

      {/* Project Cubes */}
      <ProjectCubes 
        projects={safeProjects} 
        onProjectSelect={handleProjectSelectWithScroll} 
      />

      {/* Projects by Phase */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projects by Phase</h2>
          <div className="space-y-4">
            {PROJECT_PHASES.map(phase => {
              const phaseProjects = getSortedPhaseProjects(phase.id);
              const isExpanded = expandedPhases.has(phase.id);
              
              return (
                <div key={phase.id} className={`border rounded-lg ${phase.borderColor}`}>
                  <div 
                    className={`p-4 cursor-pointer flex items-center justify-between ${phase.bgColor}`}
                    onClick={() => togglePhase(phase.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${phase.color}`}></div>
                      <h3 className={`font-medium ${phase.textColor}`}>
                        {phase.name} ({phaseProjects.length})
                      </h3>
                    </div>
                    <ChevronDownIcon 
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 border-t">
                      {phaseProjects.length > 0 ? (
                        <div className="space-y-2">
                          {phaseProjects.map(project => (
                            <div 
                              key={project._id || project.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                              onClick={() => handleProjectSelectWithScroll(project)}
                            >
                              <div>
                                <h4 className="font-medium text-gray-900">{project.projectName}</h4>
                                <p className="text-sm text-gray-500">{project.clientName}</p>
                              </div>
                              <div className="text-right">
                                {getProjectStatusBadge(project.status)}
                                <p className="text-sm text-gray-500 mt-1">
                                  {project.progress}% Complete
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No projects in this phase</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h2>
          
          {/* Activity Filters */}
          <div className="flex space-x-4 mb-4">
            <select 
              value={activityProjectFilter} 
              onChange={(e) => setActivityProjectFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Projects</option>
              {safeProjects.map(project => (
                <option key={project._id || project.id} value={project._id || project.id}>{project.name}</option>
              ))}
            </select>
            
            <select 
              value={activitySubjectFilter} 
              onChange={(e) => setActivitySubjectFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Subjects</option>
              {subjectOptions.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          {/* Activities List */}
          <div className="space-y-4">
            {currentActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button 
                onClick={prevPage} 
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={nextPage} 
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Post Activity Update</h2>
          
          <div className="space-y-4">
            <div className="flex space-x-4">
              <select 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="border rounded px-3 py-2 flex-1"
              >
                <option value="">Select Project (Optional)</option>
                {safeProjects.map(project => (
                  <option key={project._id || project.id} value={project._id || project.id}>{project.name}</option>
                ))}
              </select>
              
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="border rounded px-3 py-2 flex-1"
              >
                <option value="">Select Subject</option>
                {subjectOptions.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share an update about your project..."
              className="w-full border rounded px-3 py-2 h-24 resize-none"
            />
            
            <button 
              onClick={handlePost}
              disabled={!message.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700"
            >
              Post Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageNew; 