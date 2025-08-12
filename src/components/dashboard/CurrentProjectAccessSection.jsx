import React, { useState, useEffect } from 'react';
import { useSectionNavigation } from '../../contexts/NavigationContext';
import BackButton from '../common/BackButton';
import ProjectCubes from './ProjectCubes';

const CurrentProjectAccessSection = ({ 
  projects, 
  onProjectSelect, 
  colorMode 
}) => {
  const { 
    saveFilters, 
    getSavedFilters, 
    saveExpandedState, 
    getSavedExpandedState,
    updateScrollPosition,
    navigateToProjectCube 
  } = useSectionNavigation('Current Project Access');

  // State for pagination with context restoration
  const [currentPage, setCurrentPage] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.currentPage || 0;
  });

  // State for expanded project details
  const [expandedProjects, setExpandedProjects] = useState(() => {
    return getSavedExpandedState() || {};
  });

  // State for selected project filter
  const [selectedProjectFilter, setSelectedProjectFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedProject || null;
  });

  // State for phase filter
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
  const [sortBy, setSortBy] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.sortBy || 'name';
  });

  const [sortOrder, setSortOrder] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.sortOrder || 'asc';
  });

  // Projects per page
  const projectsPerPage = 6;

  // Save expanded state whenever it changes
  useEffect(() => {
    saveExpandedState(expandedProjects);
  }, [expandedProjects, saveExpandedState]);

  // Save filters whenever they change
  useEffect(() => {
    saveFilters({
      currentPage,
      selectedProject: selectedProjectFilter,
      selectedPhase: selectedPhaseFilter,
      searchTerm: searchFilter,
      sortBy,
      sortOrder
    });
  }, [currentPage, selectedProjectFilter, selectedPhaseFilter, searchFilter, sortBy, sortOrder, saveFilters]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      updateScrollPosition();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateScrollPosition]);

  // Handle project cube navigation with context
  const handleProjectCubeNavigation = (project, targetPage, additionalContext, sourceSection) => {
    const contextData = {
      section: 'Current Project Access',
      type: 'project-cube',
      returnPath: '/dashboard',
      projectId: project.id,
      projectName: project.projectName || project.name,
      projectNumber: project.projectNumber,
      selectedData: project,
      filters: {
        currentPage,
        selectedProject: selectedProjectFilter,
        selectedPhase: selectedPhaseFilter,
        searchTerm: searchFilter,
        sortBy,
        sortOrder
      },
      expandedState: expandedProjects,
      scrollPosition: window.scrollY,
      cubePosition: {
        page: currentPage,
        position: getCurrentPageProjects().findIndex(p => p.id === project.id)
      },
      ...additionalContext
    };

    // Use the navigation system to track context
    navigateToProjectCube(project, getTargetPath(targetPage, project));
    
    // Also call the original onProjectSelect to maintain existing functionality
    if (onProjectSelect) {
      onProjectSelect(project, targetPage, contextData, 'Current Project Access');
    }
  };

  // Get target path for navigation
  const getTargetPath = (targetPage, project) => {
    switch (targetPage) {
      case 'Project Workflow':
        return `/project/${project.id}/workflow`;
      case 'Messages':
        return `/project/${project.id}/messages`;
      case 'Alerts':
        return `/project/${project.id}/alerts`;
      case 'Projects':
        return `/project/${project.id}`;
      default:
        return `/project/${project.id}`;
    }
  };

  // Filter and sort projects
  const getFilteredAndSortedProjects = () => {
    let filteredProjects = [...(projects || [])];

    // Apply phase filter
    if (selectedPhaseFilter) {
      filteredProjects = filteredProjects.filter(project => {
        const projectPhase = project.phase || project.status || 'lead';
        return projectPhase.toLowerCase().includes(selectedPhaseFilter.toLowerCase());
      });
    }

    // Apply search filter
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      filteredProjects = filteredProjects.filter(project => 
        (project.name || '').toLowerCase().includes(searchTerm) ||
        (project.projectName || '').toLowerCase().includes(searchTerm) ||
        (project.projectNumber || '').toString().toLowerCase().includes(searchTerm) ||
        (project.client?.name || '').toLowerCase().includes(searchTerm)
      );
    }

    // Apply single project filter
    if (selectedProjectFilter) {
      filteredProjects = filteredProjects.filter(project => project.id === selectedProjectFilter);
    }

    // Sort projects
    filteredProjects.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'projectNumber':
          aValue = parseInt(a.projectNumber) || 0;
          bValue = parseInt(b.projectNumber) || 0;
          break;
        case 'client':
          aValue = a.client?.name || '';
          bValue = b.client?.name || '';
          break;
        case 'phase':
          aValue = a.phase || a.status || '';
          bValue = b.phase || b.status || '';
          break;
        case 'progress':
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || a.startDate || 0);
          bValue = new Date(b.createdAt || b.startDate || 0);
          break;
        case 'name':
        default:
          aValue = (a.projectName || a.name || '').toLowerCase();
          bValue = (b.projectName || b.name || '').toLowerCase();
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

    return filteredProjects;
  };

  // Get current page projects
  const getCurrentPageProjects = () => {
    const filteredProjects = getFilteredAndSortedProjects();
    const startIndex = currentPage * projectsPerPage;
    const endIndex = startIndex + projectsPerPage;
    return filteredProjects.slice(startIndex, endIndex);
  };

  // Get total pages
  const getTotalPages = () => {
    const filteredProjects = getFilteredAndSortedProjects();
    return Math.ceil(filteredProjects.length / projectsPerPage);
  };

  // Navigate to next page
  const nextPage = () => {
    const totalPages = getTotalPages();
    setCurrentPage(prev => (prev + 1) % totalPages);
  };

  // Navigate to previous page
  const prevPage = () => {
    const totalPages = getTotalPages();
    setCurrentPage(prev => (prev - 1 + totalPages) % totalPages);
  };

  // Go to specific page
  const goToPage = (page) => {
    const totalPages = getTotalPages();
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  // Toggle project expansion
  const toggleProjectExpansion = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedProjectFilter(null);
    setSelectedPhaseFilter(null);
    setSearchFilter('');
    setSortBy('name');
    setSortOrder('asc');
    setCurrentPage(0);
  };

  // Get unique phases for filter dropdown
  const getUniquePhases = () => {
    const phasesSet = new Set();
    projects?.forEach(project => {
      const phase = project.phase || project.status || 'lead';
      phasesSet.add(phase);
    });
    return Array.from(phasesSet).sort();
  };

  const filteredProjects = getFilteredAndSortedProjects();
  const currentProjects = getCurrentPageProjects();
  const totalPages = getTotalPages();
  const uniquePhases = getUniquePhases();

  return (
    <div className="mb-6" data-section="current-project-access">
      {/* Enhanced Controls */}
      <div className="mb-6 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
              Current Project Access
            </h2>
            <p className="text-sm text-gray-600 font-medium">
              Quick access to project management tools and communications
            </p>
          </div>

          {/* Project Count and Page Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            </span>
            {totalPages > 1 && (
              <span>
                Page {currentPage + 1} of {totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
            {uniquePhases.map(phase => (
              <option key={phase} value={phase}>
                {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="name">Project Name</option>
            <option value="projectNumber">Project Number</option>
            <option value="client">Client Name</option>
            <option value="phase">Phase</option>
            <option value="progress">Progress</option>
            <option value="createdAt">Date Created</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-2"
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            <span className="text-sm">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
            <svg className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Clear Filters */}
          {(selectedPhaseFilter || searchFilter || selectedProjectFilter || sortBy !== 'name' || sortOrder !== 'asc') && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 0}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageIndex = currentPage <= 2 ? i : currentPage - 2 + i;
                  if (pageIndex >= totalPages) return null;
                  
                  return (
                    <button
                      key={pageIndex}
                      onClick={() => goToPage(pageIndex)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        currentPage === pageIndex
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageIndex + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages - 1}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              Showing {currentPage * projectsPerPage + 1}-{Math.min((currentPage + 1) * projectsPerPage, filteredProjects.length)} of {filteredProjects.length}
            </div>
          </div>
        )}
      </div>

      {/* Project Cubes with Enhanced Navigation */}
      {filteredProjects.length > 0 ? (
        <ProjectCubes
          projects={currentProjects}
          onProjectSelect={handleProjectCubeNavigation}
          colorMode={colorMode}
        />
      ) : (
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-12">
          <div className="text-center">
            <div className="text-gray-400 text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchFilter || selectedPhaseFilter || selectedProjectFilter
                ? 'No projects match your filters'
                : 'No projects available'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchFilter || selectedPhaseFilter || selectedProjectFilter
                ? 'Try adjusting your filter settings to find projects.'
                : 'Project access cubes will appear here when projects are available.'
              }
            </p>
            {(searchFilter || selectedPhaseFilter || selectedProjectFilter) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected Project Details */}
      {selectedProjectFilter && (
        <div className="mt-6 bg-white/90 backdrop-blur-sm border border-blue-200/50 shadow-soft rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Selected Project Details</h3>
            <button
              onClick={() => setSelectedProjectFilter(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {(() => {
            const selectedProject = projects?.find(p => p.id === selectedProjectFilter);
            if (!selectedProject) return <p className="text-gray-600">Project not found.</p>;
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">{selectedProject.projectName || selectedProject.name}</h4>
                  <p className="text-sm text-gray-600 mb-4">Project #{selectedProject.projectNumber}</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Client:</span> {selectedProject.client?.name || 'Unknown'}
                      {/* Customer Address - Formatted as requested */}
                      {selectedProject.client?.address && (
                        <div className="text-sm font-normal text-black mt-1" style={{fontFamily: 'inherit'}}>
                          <div>{selectedProject.client.address.split(',')[0]?.trim() || ''}</div>
                          <div>
                            {(() => {
                              const parts = selectedProject.client.address.split(',').slice(1);
                              if (parts.length >= 2) {
                                return `${parts[0].trim()}, ${parts[1].trim()}`;
                              } else if (parts.length === 1) {
                                return parts[0].trim();
                              }
                              return 'City, State 00000';
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    <div><span className="font-medium">Phase:</span> {selectedProject.phase || selectedProject.status || 'Lead'}</div>
                    <div><span className="font-medium">Progress:</span> {selectedProject.progress || 0}%</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Quick Actions</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleProjectCubeNavigation(selectedProject, 'Project Workflow')}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Workflow
                    </button>
                    <button
                      onClick={() => handleProjectCubeNavigation(selectedProject, 'Messages')}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Messages
                    </button>
                    <button
                      onClick={() => handleProjectCubeNavigation(selectedProject, 'Alerts')}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Alerts
                    </button>
                    <button
                      onClick={() => handleProjectCubeNavigation(selectedProject, 'Projects')}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default CurrentProjectAccessSection;