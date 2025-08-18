import React, { useEffect } from 'react';
import ProjectsByPhaseSection from '../dashboard/ProjectsByPhaseSection';
import ProjectCubes from '../dashboard/ProjectCubes';
import { ResponsiveBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';

const NewProjectsPage = ({ 
  projects, 
  onProjectSelect, 
  colorMode, 
  projectSourceSection,
  onNavigateBack,
  scrollToProject 
}) => {
  const { pushNavigation } = useNavigationHistory();

  // Track page navigation for back button functionality
  useEffect(() => {
    pushNavigation('Projects', {
      projects,
      projectSourceSection,
      scrollToProject
    });
  }, [pushNavigation, projectSourceSection]);
  // Group projects by phase for the ProjectsByPhaseSection
  const PROJECT_PHASES = [
    { id: 'lead', name: 'Lead', color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-800' },           // Blue
    { id: 'prospect', name: 'Prospect', color: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-800' }, // Amber/Yellow
    { id: 'approved', name: 'Approved', color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-800' }, // Emerald Green
    { id: 'execution', name: 'Execution', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-800' },     // Red
    { id: 'completion', name: 'Completion', color: 'bg-sky-500', bgColor: 'bg-sky-50', textColor: 'text-sky-800' },   // Bright Cyan-Teal
    { id: 'archived', name: 'Archived', color: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-800' }
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

  // Get project progress based on completed workflow line items
  const getProjectProgress = (project) => {
    const progressData = WorkflowProgressService.calculateProjectProgress(project);
    return progressData.overall || 0;
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
        {/* Back Button - Responsive and context-aware */}
        <div className="flex items-center justify-between mb-6">
          <ResponsiveBackButton
            onBack={onNavigateBack}
            colorMode={colorMode}
            variant="secondary"
            preservePosition={true}
          />
          <div className="text-right">
            <span className="text-sm text-gray-500">
              {(projects || []).length} project{(projects || []).length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

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

        {/* Project Access Section - Using Original ProjectCubes */}
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6">
            Current Project Access
          </h2>
          <ProjectCubes
            projects={projects}
            onProjectSelect={onProjectSelect}
            colorMode={colorMode}
          />
        </div>

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