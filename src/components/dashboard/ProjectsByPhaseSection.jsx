import React, { useState, useEffect, useRef } from 'react';
import { useSectionNavigation } from '../../contexts/NavigationContext';
import BackButton from '../common/BackButton';
import WorkflowProgressService from '../../services/workflowProgress';

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

  // Progress expansion state and helpers (match Current Project Access section)
  const [expandedProgress, setExpandedProgress] = useState({});

  // Refs for progress chart containers to handle positioning
  const progressChartRefs = useRef({});

  const toggleProgressExpansion = (projectId, section) => {
    const expandedKey = `${projectId}-${section}`;
    const newExpandedState = {
      ...expandedProgress,
      [expandedKey]: !expandedProgress[expandedKey]
    };
    
    setExpandedProgress(newExpandedState);
    
    // If expanding, ensure the chart is visible
    if (!expandedProgress[expandedKey]) {
      setTimeout(() => {
        ensureProgressChartVisibility(projectId, section);
      }, 100); // Small delay to allow DOM update
    }
  };

  // Function to ensure progress chart is fully visible
  const ensureProgressChartVisibility = (projectId, section) => {
    const chartRef = progressChartRefs.current[`${projectId}-${section}`];
    if (!chartRef) return;

    const rect = chartRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const buffer = 20; // Extra space for padding

    // Check if chart is cut off at the bottom
    if (rect.bottom > viewportHeight - buffer) {
      // Calculate how much we need to scroll
      const scrollAmount = rect.bottom - viewportHeight + buffer;
      
      // Smooth scroll to make chart fully visible
      window.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }

    // Check if chart is cut off at the top
    if (rect.top < buffer) {
      // Scroll to position chart with some buffer at the top
      const scrollAmount = rect.top - buffer;
      
      window.scrollBy({
        top: -scrollAmount,
        behavior: 'smooth'
      });
    }

    // Fallback: Use scrollIntoView for better browser compatibility
    if (rect.bottom > viewportHeight - buffer || rect.top < buffer) {
      chartRef.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  };

  // Function to handle dynamic positioning for expanded charts
  const handleChartPositioning = (projectId, section, isExpanded) => {
    if (isExpanded) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        ensureProgressChartVisibility(projectId, section);
      });
    }
  };

  const getProjectTrades = (project) => {
    // Use existing trades if already calculated properly
    if (project.trades && project.trades.length > 0 && project.trades[0].completedItems !== undefined) {
      return project.trades;
    }
    
    // Calculate trades using WorkflowProgressService
    const progressData = WorkflowProgressService.calculateProjectProgress(project);
    const currentWorkflow = project.currentWorkflowItem;
    
    // First calculate progress with skipped items included
    const progressWithSkipped = WorkflowProgressService.calculateProgressWithSkippedItems(
      currentWorkflow?.completedItems || [],
      currentWorkflow?.phase || 'LEAD',
      currentWorkflow?.section,
      currentWorkflow?.lineItem,
      currentWorkflow?.totalLineItems || WorkflowProgressService.estimateTotalLineItems(),
      currentWorkflow?.workflowStructure || null
    );
    
    // Use the adjusted completed items which includes skipped items
    const completedItems = progressWithSkipped.adjustedCompletedItems || 
                           progressData.completedLineItems || 
                           (currentWorkflow?.completedItems || []);
    
    return WorkflowProgressService.calculateTradeBreakdown(
      project,
      Array.isArray(completedItems) ? completedItems : [],
      progressData.totalLineItems || currentWorkflow?.totalLineItems || 25,
      currentWorkflow?.workflowStructure || null
    );
  };

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
    setExpandedPhases(prev => {
      const newExpanded = {
        ...prev,
        [phaseId]: !prev[phaseId]
      };
      
      // Update URL with replaceState to maintain context
      const currentUrl = new URL(window.location.href);
      const expandedPhaseIds = Object.keys(newExpanded).filter(id => newExpanded[id]);
      if (expandedPhaseIds.length > 0) {
        currentUrl.searchParams.set('expandedPhases', expandedPhaseIds.join(','));
      } else {
        currentUrl.searchParams.delete('expandedPhases');
      }
      window.history.replaceState(window.history.state, '', currentUrl.toString());
      
      return newExpanded;
    });
  };

  // Handle project navigation with context
  const handleProjectNavigation = async (project, targetPage, phaseId, phaseName) => {
    // Build current dashboard URL with all context for returnTo
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('section', 'projectsByPhase');
    currentUrl.searchParams.set('phase', phaseId || selectedPhaseFilter || 'all');
    currentUrl.searchParams.set('highlight', project.id || project._id);
    currentUrl.searchParams.set('search', searchFilter || '');
    if (selectedPhaseFilter) {
      currentUrl.searchParams.set('phaseFilter', selectedPhaseFilter);
    }
    
    // Build a lightweight dashboard state for restoration when coming back
    const expandedPhaseKeys = Object.keys(expandedPhases || {}).filter(key => expandedPhases[key]);
    const dashboardState = {
      selectedPhase: phaseId || null,
      expandedPhases: expandedPhaseKeys.length ? expandedPhaseKeys : null,
      scrollToProject: { id: project.id || project._id },
      returnTo: currentUrl.toString()
    };

    // Enhanced navigation for Project Workflow to navigate to current line item
    if (targetPage === 'Project Workflow') {
      try {
        console.log('🎯 PROJECTS BY PHASE: Navigating to workflow for project:', project.projectName || project.name);
        
        // Get current workflow state
        const currentWorkflow = project.currentWorkflowItem || {};
        const phase = currentWorkflow.phase || phaseId || 'LEAD';
        const section = currentWorkflow.section || 'Unknown Section';
        const lineItem = currentWorkflow.lineItem || 'Unknown Item';
        
        console.log('🎯 PROJECTS BY PHASE: Current workflow state:', {
          phase,
          section,
          lineItem
        });
        
        // Get project position data for proper targeting
        const projectId = project.id || project._id;
        const positionResponse = await fetch(`/api/workflow-data/project-position/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
          }
        });
        
        if (positionResponse.ok) {
          const positionResult = await positionResponse.json();
          if (positionResult.success && positionResult.data) {
            const position = positionResult.data;
            console.log('🎯 PROJECTS BY PHASE: Project position data:', position);
            
            // Generate proper target IDs for navigation
            const targetLineItemId = position.currentLineItemId || 
                                   position.currentLineItem || 
                                   `${phase}-${section}-0`;
            
            const targetSectionId = position.currentSectionId || 
                                  position.currentSection ||
                                  section.toLowerCase().replace(/\s+/g, '-');
            
            console.log('🎯 PROJECTS BY PHASE: Target IDs:', {
              targetLineItemId,
              targetSectionId
            });
            
            const projectWithNavigation = {
              ...project,
              dashboardState,
              highlightStep: lineItem,
              highlightLineItem: lineItem,
              targetPhase: phase,
              targetSection: section,
              targetLineItem: lineItem,
              scrollToCurrentLineItem: true,
              navigationTarget: {
                phase: phase,
                section: section,
                lineItem: lineItem,
                stepName: lineItem,
                lineItemId: targetLineItemId,
                workflowId: position.workflowId,
                highlightMode: 'line-item',
                scrollBehavior: 'smooth',
                targetElementId: `lineitem-${targetLineItemId}`,
                highlightColor: '#0066CC',
                highlightDuration: 3000,
                targetSectionId: targetSectionId,
                expandPhase: true,
                expandSection: true
              }
            };
            
            if (onProjectSelect) {
              onProjectSelect(projectWithNavigation, targetPage, phaseId, 'Project Phases', targetLineItemId, targetSectionId);
            }
            return;
          }
        }
        
        console.log('🎯 PROJECTS BY PHASE: Could not get position data, using fallback navigation');
      } catch (error) {
        console.error('🎯 PROJECTS BY PHASE: Error enhancing workflow navigation:', error);
      }
    }
    
    // Default navigation for other pages
    const projectWithState = {
      ...project,
      dashboardState
    };

    if (onProjectSelect) {
      // Pass canonical source label expected by back handler
      onProjectSelect(projectWithState, targetPage, phaseId, 'Project Phases');
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
              onChange={(e) => {
                setSearchFilter(e.target.value);
                // Update URL with replaceState to maintain context
                const currentUrl = new URL(window.location.href);
                if (e.target.value) {
                  currentUrl.searchParams.set('search', e.target.value);
                } else {
                  currentUrl.searchParams.delete('search');
                }
                window.history.replaceState(window.history.state, '', currentUrl.toString());
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Phase Filter */}
          <select
            value={selectedPhaseFilter || ''}
            onChange={(e) => {
              setSelectedPhaseFilter(e.target.value || null);
              // Update URL with replaceState to maintain context
              const currentUrl = new URL(window.location.href);
              if (e.target.value) {
                currentUrl.searchParams.set('phaseFilter', e.target.value);
              } else {
                currentUrl.searchParams.delete('phaseFilter');
              }
              window.history.replaceState(window.history.state, '', currentUrl.toString());
            }}
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
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${phase.color} text-white text-sm font-bold`}>
                      {phaseProjects.length}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                      <p className="text-sm text-gray-600">
                        {phaseProjects.length} project{phaseProjects.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                          id={`project-${project.id || project._id}`}
                          data-project-id={project.id || project._id}
                          className="group bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all duration-200 overflow-visible"
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
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProjectNavigation(project, 'Project Profile', phase.id, phase.name);
                                      }}
                                      className="hover:underline transition-colors text-blue-600 hover:text-blue-800"
                                    >
                                      #{String(project.projectNumber || '').padStart(5, '0')}
                                    </button>
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

                          {/* Enhanced Progress Bar (exact from Current Project Access) */}
                          <div className="p-4 relative">
                            {(() => {
                              const trades = getProjectTrades(project);
                              // Calculate overall progress correctly: total completed items / total items across all trades
                              const totalCompletedItems = trades.reduce((sum, t) => sum + (t.completedItems || 0), 0);
                              const totalItems = trades.reduce((sum, t) => sum + (t.totalItems || 0), 0);
                              const overall = totalItems > 0 ? Math.round((totalCompletedItems / totalItems) * 100) : 0;
                              const expandedKey = `${project.id || project._id}-materials-labor`;
                              const isExpanded = expandedProgress[expandedKey];
                              
                              // Positioning handled when toggling expansion; avoid hooks inside render

                              return (
                                <div
                                  className={`rounded-lg transition-all duration-300 relative ${
                                    colorMode
                                      ? `bg-slate-700/20 border border-slate-600/30 ${isExpanded ? 'border-8 border-blue-400 shadow-2xl shadow-blue-400/50 bg-blue-900/20 z-10' : ''}`
                                      : `bg-gray-50/90 border border-gray-200/50 ${isExpanded ? 'border-8 border-brand-500 shadow-2xl shadow-brand-500/50 bg-blue-100 z-10' : ''}`
                                  }`}
                                  ref={el => progressChartRefs.current[expandedKey] = el}
                                  style={{
                                    ...(isExpanded && {
                                      position: 'relative',
                                      zIndex: 10
                                    })
                                  }}
                                >
                                  <div className="mb-2">
                                    <button
                                      onClick={() => toggleProgressExpansion(project.id || project._id, 'materials-labor')}
                                      className={`w-full text-left transition-all duration-200 ${
                                        colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'
                                      } rounded p-1`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                          Overall Project Progress
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{overall}%</span>
                                          <svg
                                            className={`w-3 h-3 transition-transform duration-200 ${
                                              colorMode ? 'text-gray-300' : 'text-gray-600'
                                            } ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>
                                      </div>
                                      <div className={`w-full h-2 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div
                                          className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                                          style={{ width: `${overall}%` }}
                                        ></div>
                                      </div>
                                    </button>

                                    {isExpanded && (
                                      <div className="space-y-2 mt-2">
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                              Materials Progress
                                            </span>
                                            <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                              {Math.round((trades.filter(t => t.materialsDelivered).length / trades.length) * 100)}%
                                            </span>
                                          </div>
                                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                            <div
                                              className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                                              style={{
                                                width: `${Math.round((trades.filter(t => t.materialsDelivered).length / trades.length) * 100)}%`
                                              }}
                                            ></div>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                              Labor Progress
                                            </span>
                                            <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{overall}%</span>
                                          </div>
                                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                            <div
                                              className="bg-orange-400 h-1.5 rounded-full transition-all duration-500"
                                              style={{ width: `${overall}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {isExpanded && (
                                    <div
                                      ref={el => progressChartRefs.current[`${project.id || project._id}-trades`] = el}
                                    >
                                      <button
                                        onClick={() => toggleProgressExpansion(project.id || project._id, 'trades')}
                                        className={`w-full flex items-center justify-between p-1 rounded transition-all duration-200 ${
                                          colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'
                                        }`}
                                      >
                                        <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                          Individual Trades
                                        </span>
                                        <svg
                                          className={`w-3 h-3 transition-transform duration-200 ${
                                            colorMode ? 'text-gray-300' : 'text-gray-600'
                                          } ${expandedProgress[`${project.id || project._id}-trades`] ? 'rotate-180' : ''}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                      {expandedProgress[`${project.id || project._id}-trades`] && (
                                        <div className="space-y-2 mt-2">
                                          {trades.map((trade, tradeIndex) => {
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
                                            const barColor = tradeColors[tradeIndex % tradeColors.length];
                                            return (
                                              <div key={tradeIndex}>
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className={`${colorMode ? 'text-white' : 'text-gray-800'} text-[11px] font-semibold`}>
                                                    {trade.name}
                                                  </span>
                                                  <span className={`${colorMode ? 'text-white' : 'text-gray-800'} text-[11px] font-bold`}>
                                                    {trade.laborProgress}%
                                                  </span>
                                                </div>
                                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                                  <div
                                                    className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
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
                              );
                            })()}
                          </div>

                          {/* Project Actions */}
                          <div className="p-4 pt-0">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleProjectNavigation(project, 'Project Workflow', phase.id, phase.name)}
                                className="inline-flex items-center justify-center w-16 h-6 border border-brand-500 text-black rounded-md hover:bg-brand-50 transition-colors text-[10px] font-semibold"
                              >
                                Workflow
                              </button>
                              <button
                                onClick={() => handleProjectNavigation(project, 'Messages', phase.id, phase.name)}
                                className="inline-flex items-center justify-center w-16 h-6 border border-brand-500 text-black rounded-md hover:bg-brand-50 transition-colors text-[10px] font-semibold"
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
            className="px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectsByPhaseSection;