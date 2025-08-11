import React from 'react';
import ProjectsByPhaseSection from '../dashboard/ProjectsByPhaseSection';
import CurrentProjectAccessSection from '../dashboard/CurrentProjectAccessSection';

const NewProjectsPage = ({ 
  projects, 
  onProjectSelect, 
  colorMode, 
  projectSourceSection,
  onNavigateBack,
  scrollToProject 
}) => {
  // Group projects by phase for the ProjectsByPhaseSection
  const PROJECT_PHASES = [
    { id: 'lead', name: 'Lead', color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-800' },
    { id: 'prospect', name: 'Prospect', color: 'bg-yellow-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-800' },
    { id: 'approved', name: 'Approved', color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-800' },
    { id: 'execution', name: 'Execution', color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-800' },
    { id: 'completion', name: 'Completion', color: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-800' },
    { id: 'archived', name: 'Archived', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-800' }
  ];

  // Group projects by phase
  const projectsByPhase = PROJECT_PHASES.reduce((acc, phase) => {
    acc[phase.id] = (projects || []).filter(project => {
      const projectPhase = (project.phase || project.status || 'lead').toLowerCase();
      return projectPhase === phase.id || 
             projectPhase.includes(phase.id) ||
             (phase.id === 'lead' && (!project.phase && !project.status));
    });
    return acc;
  }, {});

  // Get project progress
  const getProjectProgress = (project) => {
    return project.progress || project.calculatedProgress?.overallProgress || 0;
  };

  // Sort projects within phases
  const getSortedPhaseProjects = (phaseId) => {
    const phaseProjects = projectsByPhase[phaseId] || [];
    return phaseProjects.sort((a, b) => {
      // Sort by project number or ID
      const aNum = parseInt(a.projectNumber || a.id || 0);
      const bNum = parseInt(b.projectNumber || b.id || 0);
      return aNum - bNum;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Projects Management
          </h1>
          <p className="text-gray-600 text-lg">
            Comprehensive project overview and management tools
          </p>
        </div>

        {/* Projects by Phase Section */}
        <ProjectsByPhaseSection
          projectsByPhase={projectsByPhase}
          PROJECT_PHASES={PROJECT_PHASES}
          onProjectSelect={onProjectSelect}
          sortConfig={{ sortBy: 'projectNumber', sortOrder: 'asc' }}
          getSortedPhaseProjects={getSortedPhaseProjects}
          getProjectProgress={getProjectProgress}
          colorMode={colorMode}
        />

        {/* Project Access Section */}
        <CurrentProjectAccessSection
          projects={projects}
          onProjectSelect={onProjectSelect}
          colorMode={colorMode}
        />

        {/* Project Summary Stats */}
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Project Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {PROJECT_PHASES.map(phase => {
              const count = projectsByPhase[phase.id]?.length || 0;
              return (
                <div key={phase.id} className="text-center">
                  <div className={`w-8 h-8 ${phase.color} rounded-full mx-auto mb-2`}></div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{phase.name}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <div className="text-3xl font-bold text-blue-600">{projects?.length || 0}</div>
            <div className="text-sm text-gray-600 font-medium">Total Projects</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewProjectsPage;