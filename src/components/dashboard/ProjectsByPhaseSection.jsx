import React, { useState, useEffect } from 'react';
import { useSectionNavigation } from '../../contexts/NavigationContext';
import BackButton from '../common/BackButton';

const ProjectsByPhaseSection = ({ 
  projectsByPhase, 
  PROJECT_PHASES, 
  onProjectSelect,
  sortConfig,
  getSortedPhaseProjects,
  getProjectProgress,
  colorMode 
}) => {
  const { 
    saveFilters, 
    getSavedFilters, 
    saveExpandedState, 
    getSavedExpandedState,
    updateScrollPosition 
  } = useSectionNavigation('Current Projects by Phase');

  // State for expanded phases with context restoration
  const [expandedPhases, setExpandedPhases] = useState(() => {
    // Try to restore from saved context
    return getSavedExpandedState() || {};
  });

  // State for selected phase filter
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedPhase || null;
  });

  // State for search filter
  const [searchFilter, setSearchFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.searchTerm || '';
  });

  // State for sort configuration
  const [localSortConfig, setLocalSortConfig] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.sortConfig || sortConfig;
  });

  // Save expanded state whenever it changes
  useEffect(() => {
    saveExpandedState(expandedPhases);
  }, [expandedPhases, saveExpandedState]);

  // Save filters whenever they change
  useEffect(() => {
    saveFilters({
      selectedPhase: selectedPhaseFilter,
      searchTerm: searchFilter,
      sortConfig: localSortConfig
    });
  }, [selectedPhaseFilter, searchFilter, localSortConfig, saveFilters]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      updateScrollPosition();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateScrollPosition]);

  // Toggle phase expansion
  const togglePhaseExpansion = (phaseId) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  // Handle project navigation with context
  const handleProjectNavigation = (project, targetPage, phaseId, phaseName) => {
    const contextData = {
      section: 'Current Projects by Phase',
      type: 'project',
      returnPath: '/dashboard',
      selectedPhase: phaseName,
      selectedPhaseId: phaseId,
      projectId: project.id,
      projectName: project.projectName || project.name,
      projectNumber: project.projectNumber,
      selectedData: project,
      filters: {
        selectedPhase: selectedPhaseFilter,
        searchTerm: searchFilter,
        sortConfig: localSortConfig
      },
      expandedState: expandedPhases,
      scrollPosition: window.scrollY
    };

    // Use the section navigation to track context
    if (onProjectSelect) {
      onProjectSelect(project, targetPage, contextData, 'Current Projects by Phase');
    }
  };

  // Filter projects based on search and phase selection
  const getFilteredPhaseProjects = (phaseId) => {
    let projects = getSortedPhaseProjects ? getSortedPhaseProjects(phaseId) : (projectsByPhase[phaseId] || []);
    
    // Apply search filter
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      projects = projects.filter(project => 
        (project.name || '').toLowerCase().includes(searchTerm) ||
        (project.projectName || '').toLowerCase().includes(searchTerm) ||
        (project.projectNumber || '').toString().toLowerCase().includes(searchTerm) ||
        (project.client?.name || '').toLowerCase().includes(searchTerm)
      );
    }
    
    return projects;
  };

  // Get phases to display based on filter
  const getPhasesToDisplay = () => {
    if (selectedPhaseFilter) {
      return PROJECT_PHASES.filter(phase => phase.id === selectedPhaseFilter);
    }
    return PROJECT_PHASES;
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedPhaseFilter(null);
    setSearchFilter('');
    setLocalSortConfig(sortConfig);
  };

  return (
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

        {/* Filter Controls */}
        <div className="flex items-center gap-4">
          {/* Search Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Phase Filter */}
          <select
            value={selectedPhaseFilter || ''}
            onChange={(e) => setSelectedPhaseFilter(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Phases</option>
            {PROJECT_PHASES.map(phase => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(selectedPhaseFilter || searchFilter) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Phase Sections */}
      <div className="space-y-6">
        {getPhasesToDisplay().map(phase => {
          const phaseProjects = getFilteredPhaseProjects(phase.id);
          const isExpanded = expandedPhases[phase.id];
          
          if (phaseProjects.length === 0 && selectedPhaseFilter) {
            return null; // Don't show empty phases when filtering
          }

          return (
            <div key={phase.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Phase Header */}
              <button
                onClick={() => togglePhaseExpansion(phase.id)}
                className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors duration-200 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${phase.color}`}></div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                      <p className="text-sm text-gray-600">
                        {phaseProjects.length} project{phaseProjects.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {phaseProjects.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {phaseProjects.length}
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
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

              {/* Phase Projects */}
              {isExpanded && phaseProjects.length > 0 && (
                <div className="border-t border-gray-200">
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {phaseProjects.map(project => (
                        <div
                          key={project.id}
                          className="group bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all duration-200 overflow-hidden"
                        >
                          {/* Project Header */}
                          <div className="p-4 border-b border-gray-100">
                            <button
                              onClick={() => handleProjectNavigation(project, 'Projects', phase.id, phase.name)}
                              className="w-full text-left hover:bg-gray-50 transition-colors rounded p-2 -m-2"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600">
                                    {project.projectName || project.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    #{project.projectNumber || project.id}
                                  </p>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${phase.bgColor} ${phase.textColor}`}>
                                  {phase.name}
                                </div>
                              </div>
                              
                              {/* Client Info */}
                              <div className="text-sm text-gray-600">
                                <p className="font-medium">{project.client?.name || 'Unknown Client'}</p>
                                {project.client?.phone && (
                                  <p>{project.client.phone}</p>
                                )}
                              </div>
                            </button>
                          </div>

                          {/* Project Progress */}
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Progress</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {getProjectProgress ? getProjectProgress(project) : project.progress || 0}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getProjectProgress ? getProjectProgress(project) : project.progress || 0}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Project Actions */}
                          <div className="p-4 pt-0">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleProjectNavigation(project, 'Project Workflow', phase.id, phase.name)}
                                className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                              >
                                Workflow
                              </button>
                              <button
                                onClick={() => handleProjectNavigation(project, 'Messages', phase.id, phase.name)}
                                className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium"
                              >
                                Messages
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {isExpanded && phaseProjects.length === 0 && !selectedPhaseFilter && (
                <div className="p-8 text-center border-t border-gray-200">
                  <div className="text-gray-400 text-4xl mb-2">📋</div>
                  <p className="text-gray-600">No projects in this phase</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results State */}
      {(selectedPhaseFilter || searchFilter) && 
       getPhasesToDisplay().every(phase => getFilteredPhaseProjects(phase.id).length === 0) && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search terms or filter settings.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectsByPhaseSection;