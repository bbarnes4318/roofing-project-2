import React from 'react';
import WorkflowProgressService from '../../services/workflowProgress';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';
import api from '../../services/api';

const CurrentProjectsByPhase = ({
  projects = [],
  PROJECT_PHASES = [],
  colorMode = false,
  onProjectSelect,
  selectedPhase,
  setSelectedPhase,
  sortConfig,
  handleProjectSort,
  projectsLoading = false,
  projectsError = null,
  refetchProjects,
  expandedPhases = new Set(),
  // Optional list of team members to resolve PM ids to display names
  teamMembers = [],
}) => {
  // Build a simple lookup map for quick id/email -> member
  const teamMemberMap = Array.isArray(teamMembers)
    ? teamMembers.reduce((m, u) => {
        try {
          if (u == null) return m;
          const idKey = u.id != null ? String(u.id) : null;
          if (idKey) m[idKey] = u;
          if (u.email) m[String(u.email).toLowerCase()] = u;
          if (u.username) m[String(u.username).toLowerCase()] = u;
        } catch (_) {}
        return m;
      }, {})
    : {};
  const getProjectPhase = (project) => WorkflowProgressService.getProjectPhase(project);
  const getProjectProgress = (project) => (WorkflowProgressService.calculateProjectProgress(project)?.overall || 0);

  const filteredProjects = !selectedPhase
    ? []
    : selectedPhase === 'all'
      ? projects
      : projects.filter((p) => String(getProjectPhase(p)).toUpperCase() === String(selectedPhase).toUpperCase());

  return (
    <div className="mb-6 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6" data-section="project-phases">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
            Current Projects by Phase
          </h2>
          {/* Subtitle intentionally omitted to match established UI */}
        </div>
      </div>

      {/* Phase Filter Row */}
      <div className="mb-6">
        <div className="w-full flex items-center gap-3">
          {/* All Projects */}
          <button
            onClick={() => setSelectedPhase(selectedPhase === 'all' ? null : 'all')}
            className={`h-12 px-4 text-sm font-semibold rounded-xl transition-all duration-300 border-2 flex items-center justify-center gap-2 hover:shadow-medium flex-shrink-0 ${
              selectedPhase === 'all'
                ? 'border-brand-500 bg-brand-50 shadow-brand-glow text-brand-800'
                : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:border-gray-300 hover:shadow-soft'
            }`}
            style={{ minWidth: 72 }}
          >
            <div className="h-8 w-8 rounded-full bg-brand-500 flex-shrink-0 shadow-sm flex items-center justify-center text-white text-xs font-bold">
              {Array.isArray(projects) ? projects.length : 0}
            </div>
            <span className="text-xs font-semibold">All</span>
          </button>

          {/* Phases */}
          <div className="flex-1 grid grid-cols-6 gap-3">
            {PROJECT_PHASES.map((phase) => {
              const phaseCount = Array.isArray(projects)
                ? projects.filter((p) => String(getProjectPhase(p)).toUpperCase() === String(phase.id).toUpperCase()).length
                : 0;
              return (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhase(selectedPhase === phase.id ? null : phase.id)}
                  className={`min-h-14 py-2 px-4 text-base font-semibold rounded-2xl transition-all duration-300 border-2 flex items-center justify-center gap-3 hover:shadow-medium ${
                    selectedPhase === phase.id
                      ? 'border-gray-400 bg-gray-50 shadow-medium text-gray-900'
                      : 'border-gray-200 bg-white/90 text-gray-800 hover:bg-white hover:border-gray-300 hover:shadow-soft'
                  }`}
                >
                  <div
                    className="h-8 w-8 rounded-full flex-shrink-0 shadow-sm flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: phase.color }}
                    title={`${phase.name} projects`}
                  >
                    {phaseCount}
                  </div>
                  <span className="text-[11px] leading-tight text-center whitespace-normal break-words">{phase.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Projects Table (only when a filter is selected or All) */}
      <div className="mb-4 overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-full">
            {(() => {
              // Show headers only when there are projects to display
              if (filteredProjects.length === 0) {
                return null;
              }
              return (
                <thead>
                  <tr className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Phase</th>
                    <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <button 
                        onClick={() => handleProjectSort && handleProjectSort('projectNumber')}
                        className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                      >
                        Project #
                        {sortConfig?.key === 'projectNumber' && (
                          <span className="text-xs">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <button 
                        onClick={() => handleProjectSort && handleProjectSort('primaryContact')}
                        className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                      >
                        Primary Contact
                        {sortConfig?.key === 'primaryContact' && (
                          <span className="text-xs">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <button 
                        onClick={() => handleProjectSort && handleProjectSort('projectManager')}
                        className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                      >
                        PM
                        {sortConfig?.key === 'projectManager' && (
                          <span className="text-xs">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <button 
                        onClick={() => handleProjectSort && handleProjectSort('projectType')}
                        className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                      >
                        Project Type
                        {sortConfig?.key === 'projectType' && (
                          <span className="text-xs">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <button 
                        onClick={() => handleProjectSort && handleProjectSort('progress')}
                        className={`flex items-center gap-1 hover:underline ${colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                      >
                        Progress
                        {sortConfig?.key === 'progress' && (
                          <span className="text-xs">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Messages</th>
                    <th className={`text-left py-2 px-2 text-xs font-medium whitespace-nowrap ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Workflow</th>
                  </tr>
                </thead>
              );
            })()}
            <tbody>
              {(() => {
                if (projectsLoading) {
                  return (
                    <tr>
                      <td colSpan="8" className="text-center py-8">
                        <div className="text-brand-600">Loading projects...</div>
                      </td>
                    </tr>
                  );
                }
                if (projectsError && (!projects || projects.length === 0)) {
                  return (
                    <tr>
                      <td colSpan="8" className="text-center py-8">
                        <div className="text-red-600 mb-4">
                          <div className="font-semibold">Error loading projects:</div>
                          <div className="text-sm">{String(projectsError?.message || projectsError || 'Unknown error')}</div>
                          <div className="text-xs mt-2 text-gray-500">
                            This often happens after navigating back from Project Workflow. Try refreshing the data.
                          </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={async () => { try { await refetchProjects?.(); } catch (_) {} }}
                            className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-[var(--color-primary-blueprint-blue)] transition-colors"
                            disabled={projectsLoading}
                          >
                            {projectsLoading ? 'Retrying...' : 'Retry'}
                          </button>
                          <button 
                            onClick={() => { window.location.reload(); }}
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            Refresh Page
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                if (!projects || projects.length === 0) {
                  return (
                    <tr>
                      <td colSpan="8" className="text-center py-8">
                        <div className="text-gray-600">No projects found</div>
                      </td>
                    </tr>
                  );
                }

                // Sort projects if sorting is configured
                const sortedProjects = (() => {
                  let base = filteredProjects;
                  if (!sortConfig?.key) return base;
                  const dir = sortConfig.direction === 'asc' ? 1 : -1;
                  return [...base].sort((a, b) => {
                    let aValue, bValue;
                    switch (sortConfig.key) {
                      case 'projectNumber':
                        aValue = a.projectNumber || a.id;
                        bValue = b.projectNumber || b.id;
                        break;
                      case 'primaryContact':
                        aValue = a.client?.name || a.clientName || a.customer?.primaryName || '';
                        bValue = b.client?.name || b.clientName || b.customer?.primaryName || '';
                        break;
                      case 'projectManager':
                        aValue = typeof a.projectManager === 'object' && a.projectManager !== null
                          ? (a.projectManager.name || `${a.projectManager.firstName || ''} ${a.projectManager.lastName || ''}`.trim() || '')
                          : a.projectManager || '';
                        bValue = typeof b.projectManager === 'object' && b.projectManager !== null
                          ? (b.projectManager.name || `${b.projectManager.firstName || ''} ${b.projectManager.lastName || ''}`.trim() || '')
                          : b.projectManager || '';
                        break;
                      case 'projectType':
                        aValue = a.projectType || 'N/A';
                        bValue = b.projectType || 'N/A';
                        break;
                      case 'phase':
                        aValue = getProjectPhase(a) || '';
                        bValue = getProjectPhase(b) || '';
                        break;
                      case 'progress':
                        aValue = getProjectProgress(a) || 0;
                        bValue = getProjectProgress(b) || 0;
                        break;
                      default:
                        aValue = '';
                        bValue = '';
                    }
                    if (typeof aValue === 'string') {
                      aValue = aValue.toLowerCase();
                      bValue = bValue.toLowerCase();
                    }
                    if (aValue < bValue) return -1 * dir;
                    if (aValue > bValue) return 1 * dir;
                    return 0;
                  });
                })();

                if (!selectedPhase) {
                  return null; // No phase selected - headers hidden already
                }
                if (filteredProjects.length === 0 && selectedPhase && !projectsLoading) {
                  const phaseName = selectedPhase === 'all' ? 'All Projects' : (PROJECT_PHASES.find(p => p.id === selectedPhase)?.name || selectedPhase);
                  return (
                    <tr>
                      <td colSpan="8" className="text-center py-12">
                        <div className={`${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <div className="text-4xl mb-3">📋</div>
                          <div className="font-medium text-sm mb-1">No projects in {phaseName}</div>
                          <div className="text-xs">Projects will appear here when they are in this phase</div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return sortedProjects.map((project) => {
                  const projectPhase = getProjectPhase(project);
                  const phaseConfig = PROJECT_PHASES.find(p => p.id === projectPhase) || PROJECT_PHASES[0];
                  // Robust project manager extraction to handle varying API shapes
                  const pm = project.projectManager || project.pm || project.projectManagerId || project.projectManagerName || project.pmName || null;
                  const getPMDisplay = (pmVal, projectObj) => {
                    if (!pmVal && projectObj && (projectObj.projectManagerName || projectObj.pmName)) return projectObj.projectManagerName || projectObj.pmName;
                    if (!pmVal) return '';
                    if (typeof pmVal === 'object') {
                      return pmVal.name || pmVal.displayName || `${(pmVal.firstName || '').trim()} ${(pmVal.lastName || '').trim()}`.trim() || pmVal.fullName || '';
                    }
                    // If it's a string id or email, try to resolve via teamMemberMap
                    if (typeof pmVal === 'string') {
                      const key = pmVal.trim();
                      // direct id match
                      if (teamMemberMap[key]) {
                        const user = teamMemberMap[key];
                        return user.name || `${(user.firstName || '').trim()} ${(user.lastName || '').trim()}`.trim() || user.displayName || user.email || key;
                      }
                      // try lower-cased email/username match
                      const lower = key.toLowerCase();
                      if (teamMemberMap[lower]) {
                        const user = teamMemberMap[lower];
                        return user.name || `${(user.firstName || '').trim()} ${(user.lastName || '').trim()}`.trim() || user.displayName || user.email || key;
                      }
                      // fallback to project explicit name fields
                      if (projectObj && (projectObj.projectManagerName || projectObj.pmName)) return projectObj.projectManagerName || projectObj.pmName;
                      return key;
                    }
                    return '';
                  };
                  const contact = project.client?.name || project.clientName || project.customer?.primaryName || '';
                  const projectType = project.projectType || 'N/A';

                  return (
                    <tr key={project.id} data-project-id={project.id} className={`border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'} hover:bg-gray-50 transition-colors duration-300`}>
                      {/* Phase */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ 
                            backgroundColor: phaseConfig?.color,
                            color: WorkflowProgressService.getContrastTextColor(phaseConfig?.color || '#000')
                          }}
                          title={`Phase: ${phaseConfig?.name}`}
                        >
                          {phaseConfig?.initial}
                        </div>
                      </td>

                      {/* Project # */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <button 
                          onClick={() => {
                            const projectWithDashboardState = {
                              ...project,
                              dashboardState: {
                                selectedPhase: phaseConfig?.id,
                                expandedPhases: Array.from(expandedPhases || []),
                                scrollToProject: project,
                                projectSourceSection: 'Project Phases'
                              }
                            };
                            onProjectSelect && onProjectSelect(projectWithDashboardState, 'Profile', null, 'Project Phases');
                          }}
                          className="text-sm font-bold hover:underline cursor-pointer transition-colors text-blue-600 hover:text-blue-800"
                        >
                          {String(project.projectNumber || project.id).padStart(5, '0')}
                        </button>
                      </td>

                      {/* Primary Contact */}
                      <td className="py-2 px-2 whitespace-nowrap max-w-32 overflow-hidden">
                        <span className="text-sm font-semibold text-gray-700 truncate">{contact}</span>
                      </td>

                      {/* PM */}
                      <td className="py-2 px-2 max-w-24 overflow-hidden">
                        <span className={`text-sm truncate ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {getPMDisplay(pm, project)}
                        </span>
                      </td>

                      {/* Project Type */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${colorMode ? getProjectTypeColorDark(projectType) : getProjectTypeColor(projectType)}`}>
                          {formatProjectType(projectType)}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden relative">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 flex items-center justify-center"
                              style={{ width: `${getProjectProgress(project)}%` }}
                            >
                              <span className="text-[10px] font-bold text-white drop-shadow-sm px-2">
                                {getProjectProgress(project)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>



                      {/* Messages */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <button 
                          onClick={() => {
                            const projectWithDashboardState = {
                              ...project,
                              dashboardState: {
                                selectedPhase: phaseConfig?.id,
                                expandedPhases: Array.from(expandedPhases || []),
                                scrollToProject: project,
                                projectSourceSection: 'Project Phases'
                              }
                            };
                            onProjectSelect && onProjectSelect(projectWithDashboardState, 'Messages', null, 'Project Phases');
                          }}
                          className="inline-flex items-center justify-center w-16 h-6 border border-brand-500 text-black rounded-md hover:bg-brand-50 transition-colors text-[10px] font-semibold"
                        >
                          Messages
                        </button>
                      </td>

                      {/* Workflow */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            if (!onProjectSelect) return;
                            try {
                              const response = await api.get(`/workflow-data/project-position/${project.id}`);
                              if (response.data) {
                                const result = response.data;
                                if (result.success && result.data) {
                                  const position = result.data;
                                  const getSubtaskIndex = async () => {
                                    try {
                                      const workflowResponse = await fetch('/api/workflow-data/full-structure', {
                                        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}` }
                                      });
                                      if (workflowResponse.ok) {
                                        const workflowResult = await workflowResponse.json();
                                        if (workflowResult.success && workflowResult.data) {
                                          const currentPhaseData = workflowResult.data.find(phase => phase.id === position.currentPhase);
                                          if (currentPhaseData) {
                                            const currentSectionData = currentPhaseData.items.find(item => item.id === position.currentSection);
                                            if (currentSectionData) {
                                              const subtaskIndex = currentSectionData.subtasks.findIndex(subtask => {
                                                if (typeof subtask === 'object') {
                                                  return subtask.id === position.currentLineItem || subtask.label === position.currentLineItemName;
                                                }
                                                return subtask === position.currentLineItemName;
                                              });
                                              return subtaskIndex >= 0 ? subtaskIndex : 0;
                                            }
                                          }
                                        }
                                      }
                                    } catch (_) {}
                                    return 0;
                                  };
                                  const subtaskIndex = await getSubtaskIndex();
                                  const targetLineItemId = position.currentLineItem || `${position.currentPhase}-${position.currentSection}-${subtaskIndex}`;
                                  const targetSectionId = position.currentSection;
                                  const projectWithNavigation = {
                                    ...project,
                                    dashboardState: {
                                      selectedPhase: phaseConfig?.id,
                                      expandedPhases: Array.from(expandedPhases || []),
                                      scrollToProject: project
                                    }
                                  };
                                  onProjectSelect(
                                    projectWithNavigation,
                                    'Project Workflow',
                                    null,
                                    'Project Phases',
                                    targetLineItemId,
                                    targetSectionId
                                  );
                                } else {
                                  onProjectSelect(project, 'Project Workflow', null, 'Project Phases');
                                }
                              } else {
                                onProjectSelect(project, 'Project Workflow', null, 'Project Phases');
                              }
                            } catch (_) {
                              onProjectSelect(project, 'Project Workflow', null, 'Project Phases');
                            }
                          }}
                          className="inline-flex items-center justify-center w-16 h-6 border border-brand-500 text-black rounded-md hover:bg-brand-50 transition-colors text-[10px] font-semibold"
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

        {/* Empty indicator when no filter selected */}
        {selectedPhase == null && (
          <div className={`p-4 rounded border mt-2 ${colorMode ? 'bg-slate-800/40 border-slate-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            Select a phase above to view projects, or choose All.
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentProjectsByPhase;
