import React, { useState } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import WorkflowProgressService from '../../services/workflowProgress';

const ProjectCubes = ({ projects, onProjectSelect, colorMode }) => {
  // Show all projects instead of just active ones
  const allProjects = projects || [];
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const projectsPerPage = 6;
  const totalPages = Math.ceil(allProjects.length / projectsPerPage);
  
  // Get current projects to display
  const startIndex = currentPage * projectsPerPage;
  const endIndex = startIndex + projectsPerPage;
  const currentProjects = allProjects.slice(startIndex, endIndex);

  // State to track which customer info sections are expanded
  const [expandedCustomers, setExpandedCustomers] = useState({});

  // State to track which progress sections are expanded
  const [expandedProgress, setExpandedProgress] = useState({});
  
  // State for project documents dropdown
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Toggle customer info expansion
  const toggleCustomerInfo = (projectId) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Toggle progress expansion
  const toggleProgressExpansion = (projectId, section) => {
    setExpandedProgress(prev => ({
      ...prev,
      [`${projectId}-${section}`]: !prev[`${projectId}-${section}`]
    }));
  };

  // Mock function to check for new messages/alerts - replace with actual data source
  const hasNewMessages = (project) => {
    // Mock logic - use project ID to determine notifications for consistency
    return project.id % 3 === 0; // Every 3rd project has new messages
  };

  const hasNewAlerts = (project) => {
    // Mock logic - use project ID to determine notifications for consistency
    return project.id % 4 === 0; // Every 4th project has new alerts
  };

  // Function to determine if project should have multiple trades (3 random projects)
  const shouldHaveMultipleTrades = (projectId) => {
    // Use project ID to consistently determine which projects get multiple trades
    return [1, 3, 5].includes(projectId); // Projects with IDs 1, 3, and 5 get multiple trades
  };

  // Function to get trades for a project
  const getProjectTrades = (project) => {
    if (shouldHaveMultipleTrades(project.id)) {
      // Multiple trades for selected projects - different numbers for each
      if (project.id === 1) {
        // Project 1: Add 2 trades
        return [
          { name: 'Roofing', laborProgress: 75, materialsDelivered: true },
          { name: 'Siding', laborProgress: 45, materialsDelivered: true },
          { name: 'Windows', laborProgress: 20, materialsDelivered: false }
        ];
      } else if (project.id === 3) {
        // Project 3: Add 3 trades
        return [
          { name: 'Roofing', laborProgress: 60, materialsDelivered: true },
          { name: 'Siding', laborProgress: 30, materialsDelivered: false },
          { name: 'Windows', laborProgress: 15, materialsDelivered: true },
          { name: 'Decking', laborProgress: 0, materialsDelivered: false }
        ];
      } else if (project.id === 5) {
        // Project 5: Add 2 trades
        return [
          { name: 'Roofing', laborProgress: 85, materialsDelivered: true },
          { name: 'Siding', laborProgress: 55, materialsDelivered: true },
          { name: 'Windows', laborProgress: 25, materialsDelivered: false }
        ];
      }
    } else {
      // Single trade based on project type
      const tradeName = project.type || 'General';
      return [
        { 
          name: tradeName, 
          laborProgress: project.progress || 0, 
          materialsDelivered: Math.random() > 0.3 // 70% chance materials are delivered
        }
      ];
    }
  };

  const getPhaseColor = (phase) => {
    switch (phase?.toUpperCase()) {
      case 'LEAD':
        return 'from-blue-500 to-blue-600';
      case 'PROSPECT':
        return 'from-teal-500 to-teal-600';
      case 'APPROVED':
        return 'from-purple-500 to-purple-600';
      case 'EXECUTION':
        return 'from-orange-500 to-orange-600';
      case 'SUPPLEMENT':
        return 'from-pink-500 to-pink-600';
      case 'COMPLETION':
        return 'from-green-500 to-green-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  const getPhaseText = (phase) => {
    if (!phase) return 'Unknown';
    // Map database enum values to display names
    switch (phase?.toUpperCase()) {
      case 'LEAD':
        return 'Lead';
      case 'PROSPECT':
        return 'Prospect';
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

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'LEAD':
        return 'from-blue-500 to-blue-600';
      case 'PROSPECT':
        return 'from-teal-500 to-teal-600';
      case 'APPROVED':
        return 'from-purple-500 to-purple-600';
      case 'IN_PROGRESS':
      case 'EXECUTION':
        return 'from-orange-500 to-orange-600';
      case 'SUPPLEMENT':
        return 'from-pink-500 to-pink-600';
      case 'COMPLETED':
      case 'COMPLETION':
        return 'from-green-500 to-green-600';
      case 'ON_HOLD':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'Lead';
      case 'LEAD':
        return 'Lead';
      case 'PROSPECT':
        return 'Prospect';
      case 'APPROVED':
        return 'Approved';
      case 'IN_PROGRESS':
      case 'EXECUTION':
        return 'Execution';
      case 'SUPPLEMENT':
        return '2nd Supplement';
      case 'COMPLETED':
      case 'COMPLETION':
        return 'Completion';
      case 'ON_HOLD':
        return 'On Hold';
      default:
        return 'Lead';
    }
  };

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  // Handle project documents modal
  const handleProjectDocumentsClick = () => {
    setShowProjectDropdown(true);
  };

  const handleProjectSelect = (project) => {
    console.log('Project selected:', project.name);
    setShowProjectDropdown(false);
    onProjectSelect(project, 'Project Documents');
  };

  // Sort projects by name
  const getSortedProjects = () => {
    return [...allProjects].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
  };

  if (allProjects.length === 0) {
    return (
      <div className={`rounded-2xl shadow-lg p-8 ${colorMode ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50' : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'}`}>
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-60">📋</div>
          <h3 className={`text-xl font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-800'}`}>No Projects Available</h3>
          <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
            No projects are currently available for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl shadow-lg overflow-hidden ${colorMode ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50' : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'}`}>
      {/* Header Section */}
      <div className={`px-6 py-5 border-b ${colorMode ? 'border-slate-700/50 bg-slate-800/50' : 'border-gray-200 bg-white/80'} rounded-t-2xl`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-1`}>Current Project Access</h2>
            <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Quick access to project management tools and communications</p>
          </div>
          
          {/* Navigation Info and Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Page {currentPage + 1} of {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className={`p-1.5 rounded-md transition-colors ${
                    currentPage === 0 
                      ? `${colorMode ? 'text-gray-500' : 'text-gray-400'} cursor-not-allowed` 
                      : `${colorMode ? 'text-gray-300 hover:text-white hover:bg-slate-600' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`
                  }`}
                  title="Previous page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages - 1}
                  className={`p-1.5 rounded-md transition-colors ${
                    currentPage === totalPages - 1 
                      ? `${colorMode ? 'text-gray-500' : 'text-gray-400'} cursor-not-allowed` 
                      : `${colorMode ? 'text-gray-300 hover:text-white hover:bg-slate-600' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`
                  }`}
                  title="Next page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Grid */}
      <div className="p-6 relative">
        {/* Side Navigation Arrows */}
        {totalPages > 1 && (
          <>
            {/* Left Arrow */}
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className={`absolute left-2 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 ${
                currentPage === 0 
                  ? `${colorMode ? 'bg-slate-700/50 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed` 
                  : `${colorMode ? 'bg-slate-700/80 text-white hover:bg-slate-600' : 'bg-white text-gray-700 hover:bg-gray-50'} hover:shadow-xl`
              }`}
              title="Previous page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Right Arrow */}
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 ${
                currentPage === totalPages - 1 
                  ? `${colorMode ? 'bg-slate-700/50 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed` 
                  : `${colorMode ? 'bg-slate-700/80 text-white hover:bg-slate-600' : 'bg-white text-gray-700 hover:bg-gray-50'} hover:shadow-xl`
              }`}
              title="Next page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentProjects.map((project, index) => {
            const newMessages = hasNewMessages(project);
            const newAlerts = hasNewAlerts(project);
            const projectTrades = getProjectTrades(project);
            return (
              <div 
                key={project.id}
                className={`group relative rounded-xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer overflow-hidden p-3 ${
                  colorMode 
                    ? 'bg-gradient-to-br from-slate-700/80 to-slate-800/80 border-slate-600/50 hover:border-blue-500/60 hover:shadow-blue-500/10' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg'
                } ${index >= 3 ? 'mt-8' : ''}`}
              >
                {/* Project Header */}
                <div className={`p-2 border-b ${colorMode ? 'border-slate-600/50 bg-slate-700/50' : 'border-gray-100 bg-gray-50/50'}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onProjectSelect(project, 'Projects', null, 'Project Cubes')}
                        className={`text-[7px] font-bold truncate text-left w-full hover:underline transition-all duration-200 ${colorMode ? 'text-white hover:text-blue-300' : 'text-gray-800 hover:text-blue-600'}`}
                        title={`View ${project.projectName || project.name} details`}
                      >
                        {project.projectName || project.name}
                      </button>
                    </div>
                    <div className={`ml-2 px-1 py-0.5 rounded-full text-[6px] font-semibold bg-gradient-to-r ${getPhaseColor(project.phase)} text-white shadow-sm`}>
                      {getPhaseText(project.phase)}
                    </div>
                  </div>
                </div>
                
                {/* Customer Information & Project Manager Section - Collapsible */}
                <div className={`mb-2 rounded-lg border transition-colors ${colorMode ? 'bg-slate-700/20 border-slate-600/30' : 'bg-gray-50/90 border-gray-200/50'}`}>
                  <button
                    onClick={() => toggleCustomerInfo(project.id || project._id)}
                    className={`w-full p-1.5 flex items-center justify-between transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-1">
                      <svg className="w-2 h-2 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className={`text-[6px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Contact Info</span>
                    </div>
                    <svg 
                      className={`w-2.5 h-2.5 transition-transform duration-200 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedCustomers[project.id || project._id] ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedCustomers[project.id] && (
                    <div className="px-1.5 pb-1.5">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Customer Information - Left Column */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 mb-1">
                            <svg className="w-2 h-2 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className={`text-[6px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Customer</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[6px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Name:</span>
                            <span className={`text-[6px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'} truncate max-w-20`} title={project.customer?.primaryName || project.client?.name || 'Unknown Client'}>
                              {project.customer?.primaryName || project.client?.name || 'Unknown Client'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-semibold ${colorMode ? 'text-white' : 'text-black'}`}>Phone:</span>
                            <a 
                              href={`tel:${(project.customer?.primaryPhone || project.client?.phone || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                              className={`text-[8px] font-semibold hover:underline cursor-pointer transition-all duration-200 truncate max-w-20 ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}
                              title={formatPhoneNumber(project.customer?.primaryPhone || project.client?.phone)}
                            >
                              {formatPhoneNumber(project.customer?.primaryPhone || project.client?.phone)}
                            </a>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-semibold ${colorMode ? 'text-white' : 'text-black'}`}>Email:</span>
                            <a 
                              href={`mailto:${project.customer?.primaryEmail || project.client?.email || 'client@email.com'}`} 
                              className={`text-[8px] font-semibold hover:underline cursor-pointer transition-all duration-200 truncate max-w-20 ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}
                              title={project.customer?.primaryEmail || project.client?.email || 'client@email.com'}
                            >
                              {project.customer?.primaryEmail || project.client?.email || 'client@email.com'}
                            </a>
                          </div>
                        </div>

                        {/* Project Manager Information - Right Column */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 mb-1">
                            <svg className="w-2 h-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className={`text-[6px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Manager</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[6px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Name:</span>
                            <span className={`text-[6px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'} truncate max-w-20`} title={project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : 'Sarah Johnson'}>
                              {project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : 'Sarah Johnson'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-semibold ${colorMode ? 'text-white' : 'text-black'}`}>Phone:</span>
                            <a 
                              href={`tel:${(project.pmPhone || project.projectManager?.phone || '(555) 987-6543').replace(/[^\d+]/g, '')}`} 
                              className={`text-[8px] font-semibold hover:underline cursor-pointer transition-all duration-200 truncate max-w-20 ${colorMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-700'}`}
                              title={formatPhoneNumber(project.pmPhone || project.projectManager?.phone)}
                            >
                              {formatPhoneNumber(project.pmPhone || project.projectManager?.phone || '(555) 987-6543')}
                            </a>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-semibold ${colorMode ? 'text-white' : 'text-black'}`}>Email:</span>
                            <a 
                              href={`mailto:${project.pmEmail || project.projectManager?.email || 'sarah.johnson@company.com'}`} 
                              className={`text-[8px] font-semibold hover:underline cursor-pointer transition-all duration-200 truncate max-w-20 ${colorMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-700'}`}
                              title={project.pmEmail || project.projectManager?.email || 'sarah.johnson@company.com'}
                            >
                              {project.pmEmail || project.projectManager?.email || 'sarah.johnson@company.com'}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Progress Bar Section */}
                <div className={`p-2 mb-2 rounded-lg transition-all duration-300 relative ${colorMode ? 'bg-slate-700/20 border border-slate-600/30' : 'bg-gray-50/90 border border-gray-200/50'} ${expandedProgress[`${project.id || project._id}-materials-labor`] ? (colorMode ? 'border-8 border-blue-400 shadow-2xl shadow-blue-400/50 bg-blue-900/20' : 'border-8 border-blue-500 shadow-2xl shadow-blue-500/50 bg-blue-100') : ''}`}>
                  {/* Row 1: Main Project Progress Bar (clickable to expand) */}
                  <div className="mb-2">
                    <button
                      onClick={() => toggleProgressExpansion(project.id || project._id, 'materials-labor')}
                      className={`w-full text-left transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'} rounded p-1`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Overall Project Progress</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                            {WorkflowProgressService.calculateProjectProgress(project).overall}%
                          </span>
                          <svg 
                            className={`w-2.5 h-2.5 transition-transform duration-200 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedProgress[`${project.id || project._id}-materials-labor`] ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <div className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${WorkflowProgressService.calculateProjectProgress(project).overall}%` }}
                        ></div>
                      </div>
                    </button>
                    
                    {/* Materials and Labor Progress Bars (expandable) */}
                    {expandedProgress[`${project.id || project._id}-materials-labor`] && (
                      <div className="space-y-2 mt-2">
                        {/* Materials Progress */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Materials Progress</span>
                            <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round(projectTrades.filter(trade => trade.materialsDelivered).length / projectTrades.length * 100)}%</span>
                          </div>
                          <div className={`w-full h-2.5 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            <div 
                              className="bg-green-600 h-2.5 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.round(projectTrades.filter(trade => trade.materialsDelivered).length / projectTrades.length * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        {/* Labor Progress */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Labor Progress</span>
                            <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{WorkflowProgressService.calculateProjectProgress(project).overall}%</span>
                          </div>
                          <div className={`w-full h-2.5 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            <div 
                              className="bg-orange-400 h-2.5 rounded-full transition-all duration-500" 
                              style={{ width: `${WorkflowProgressService.calculateProjectProgress(project).overall}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Individual Trades Progress Bars (only visible when materials-labor is expanded) */}
                  {expandedProgress[`${project.id || project._id}-materials-labor`] && (
                    <div>
                      <button
                        onClick={() => toggleProgressExpansion(project.id || project._id, 'trades')}
                        className={`w-full flex items-center justify-between p-1 rounded transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'}`}
                      >
                        <span className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Individual Trades</span>
                        <svg 
                          className={`w-2.5 h-2.5 transition-transform duration-200 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedProgress[`${project.id || project._id}-trades`] ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedProgress[`${project.id || project._id}-trades`] && (
                        <div className="space-y-2 mt-2">
                          {projectTrades.map((trade, index) => {
                            // Cycle through a palette of solid colors
                            const tradeColors = [
                              'bg-purple-500',
                              'bg-pink-500',
                              'bg-yellow-500',
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

                {/* Action Boxes Grid - Classic 2x3 Layout */}
                <div className="grid grid-cols-3 gap-2 gap-y-4 mb-4 mt-4">
                  <button
                    onClick={() => onProjectSelect(project, 'Project Workflow')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-blue-700/80 hover:border-blue-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-400'}`}
                  >
                    <span className="mb-0.5">🗂️</span>
                    Project Workflow
                  </button>
                  <button
                    onClick={() => onProjectSelect(project, 'Alerts')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold relative ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-amber-700/80 hover:border-amber-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-amber-50 hover:border-amber-400'}`}
                  >
                    <span className="mb-0.5">⚠️</span>
                    Alerts
                    {hasNewAlerts(project) && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </button>
                  <button
                    onClick={() => onProjectSelect(project, 'Messages')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold relative ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-sky-700/80 hover:border-sky-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-sky-50 hover:border-sky-400'}`}
                  >
                    <span className="mb-0.5">💬</span>
                    Messages
                    {hasNewMessages(project) && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </button>
                  <button
                    onClick={() => {}}
                    disabled={true}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold cursor-not-allowed opacity-50 ${colorMode ? 'bg-slate-600/40 border-slate-500/30 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                  >
                    <span className="mb-0.5">📄</span>
                    Project Documents
                  </button>
                  <button
                    onClick={() => onProjectSelect(project, 'Project Schedule')}
                    disabled
                    className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold cursor-not-allowed opacity-50 ${colorMode ? 'bg-slate-600/40 border-slate-500/30 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                  >
                    <span className="mb-0.5">📅</span>
                    Project Schedules
                  </button>
                  <button
                    onClick={() => {
                      const projectWithScrollId = {
                        ...project,
                        scrollToProjectId: String(project.id)
                      };
                      onProjectSelect(projectWithScrollId, 'Projects', null, 'Project Cubes');
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[7px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-gray-700/80 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-400'}`}
                  >
                    <span className="mb-0.5 flex flex-col items-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" fill="#2563eb" />
                        <path d="M4 20c0-2.5 3.5-4.5 8-4.5s8 2 8 4.5" fill="#2563eb" />
                      </svg>
                    </span>
                    Project Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Project Documents Modal */}
      {showProjectDropdown && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
          onClick={() => setShowProjectDropdown(false)}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-blue-950/95 backdrop-blur-sm"></div>
          
          {/* Modal */}
          <div 
            className={`relative z-10 w-80 max-w-[85vw] max-h-[70vh] rounded-2xl shadow-2xl border-0 transition-all duration-300 overflow-hidden ${
              colorMode ? 'bg-slate-800/95 border-slate-600/50' : 'bg-white/95 border-gray-200/50'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b ${colorMode ? 'border-slate-600/50 bg-gradient-to-r from-slate-800 to-slate-700' : 'border-gray-200/50 bg-gradient-to-r from-gray-50 to-white'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg`}>
                    <span className="text-white text-lg">📄</span>
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                      Select Project
                    </h3>
                    <p className={`text-[10px] ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Choose a project for documents
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProjectDropdown(false)}
                  className={`p-2 rounded-xl transition-all duration-200 hover:scale-105 ${
                    colorMode ? 'hover:bg-slate-700/80 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Sort Controls */}
            <div className={`px-6 py-3 border-b ${colorMode ? 'border-slate-600/50' : 'border-gray-200/50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Sort by:
                  </span>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 hover:scale-105 ${
                      colorMode 
                        ? 'bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-600/50 hover:border-blue-500/50' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-xs font-semibold">Project Name</span>
                    <svg 
                      className={`w-3 h-3 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>
                <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getSortedProjects().length} projects
                </span>
              </div>
            </div>

            {/* Project Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                {getSortedProjects().map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={`group w-full p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                      colorMode 
                        ? 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-600/40 hover:border-blue-500/60 hover:shadow-blue-500/20' 
                        : 'bg-white border-gray-200 hover:bg-blue-50/80 hover:border-blue-300 hover:shadow-blue-200/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 text-left">
                        <h4 className={`font-bold text-xs text-blue-600 group-hover:text-blue-700`}>
                          {project.projectName || project.name}
                        </h4>
                        {(project.customer || project.client) && (
                          <p className={`text-[10px] mt-1 ${colorMode ? 'text-gray-300 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-700'}`}>
                            {project.customer?.primaryName || project.client?.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 ${
                          colorMode 
                            ? 'bg-gradient-to-r from-slate-600 to-slate-500 text-white shadow-sm' 
                            : 'bg-gradient-to-r from-gray-200 to-gray-100 text-gray-700 shadow-sm'
                        }`}>
                          {getPhaseText(project.phase || project.status)}
                        </span>
                        <svg className={`w-4 h-4 transition-all duration-200 ${colorMode ? 'text-gray-400 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCubes;