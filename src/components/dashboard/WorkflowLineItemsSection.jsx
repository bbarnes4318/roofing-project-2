import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import WorkflowProgressService from '../../services/workflowProgress';
import api from '../../services/api';

const WorkflowLineItemsSection = ({
  projects = [],
  colorMode = false,
  onProjectSelect
}) => {
  const [workflowData, setWorkflowData] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch workflow structure
  useEffect(() => {
    const fetchWorkflowData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/workflow-data/full-structure');
        if (response.data?.success) {
          setWorkflowData(response.data.data);
        } else {
          throw new Error('Failed to fetch workflow data');
        }
      } catch (err) {
        console.error('Error fetching workflow data:', err);
        setError(err.message);
        // Use fallback data
        setWorkflowData([
          {
            id: 'LEAD',
            name: 'Lead',
            displayName: 'Lead Phase',
            color: '#3B82F6',
            items: [
              {
                id: 'input-customer-info',
                name: 'Input Customer Information',
                displayName: 'Input Customer Information',
                subtasks: [
                  'Collect customer contact details',
                  'Verify customer information',
                  'Update customer database'
                ]
              },
              {
                id: 'complete-questions',
                name: 'Complete Questions to Ask Checklist',
                displayName: 'Complete Questions to Ask Checklist',
                subtasks: [
                  'Review questions checklist',
                  'Ask all required questions',
                  'Document responses'
                ]
              }
            ]
          },
          {
            id: 'PROSPECT',
            name: 'Prospect',
            displayName: 'Prospect Phase',
            color: '#10B981',
            items: [
              {
                id: 'site-inspection',
                name: 'Site Inspection',
                displayName: 'Site Inspection',
                subtasks: [
                  'Schedule inspection',
                  'Conduct site visit',
                  'Document findings',
                  'Create inspection report'
                ]
              },
              {
                id: 'write-estimate',
                name: 'Write Estimate',
                displayName: 'Write Estimate',
                subtasks: [
                  'Calculate material costs',
                  'Estimate labor hours',
                  'Add overhead and profit',
                  'Generate estimate document'
                ]
              }
            ]
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowData();
  }, []);

  const togglePhase = (phaseId) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const getProjectProgressForPhase = (project, phaseId) => {
    if (!project || !project.currentWorkflowItem) return 0;
    
    const projectPhase = WorkflowProgressService.getProjectPhase(project);
    if (projectPhase !== phaseId) return 0;
    
    // Calculate progress based on completed line items
    const totalLineItems = project.currentWorkflowItem.totalLineItems || 100;
    const completedLineItems = project.currentWorkflowItem.completedLineItems || 0;
    return Math.round((completedLineItems / totalLineItems) * 100);
  };

  const getProjectsInPhase = (phaseId) => {
    return projects.filter(project => {
      const projectPhase = WorkflowProgressService.getProjectPhase(project);
      return projectPhase === phaseId;
    });
  };

  const handleLineItemClick = (project, phaseId, sectionId, lineItemId) => {
    if (onProjectSelect) {
      const projectWithNavigation = {
        ...project,
        dashboardState: {
          selectedPhase: phaseId,
          expandedPhases: Array.from(expandedPhases),
          scrollToProject: project
        }
      };
      onProjectSelect(projectWithNavigation, 'Project Workflow', null, 'Workflow Line Items', lineItemId, sectionId);
    }
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-2xl border ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`}>
        <div className="animate-pulse">
          <div className={`h-6 w-48 rounded mb-4 ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-16 rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-2xl border ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Error loading workflow data: {error}
          </p>
        </div>
      </div>
    );
  }

  if (!workflowData || workflowData.length === 0) {
    return (
      <div className={`p-6 rounded-2xl border ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`}>
        <div className="text-center">
          <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
            No workflow data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl border ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} shadow-soft`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
            Project Workflow Line Items
          </h3>
          <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
            Track progress through workflow phases and line items
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {workflowData.map((phase) => {
          const projectsInPhase = getProjectsInPhase(phase.id);
          const isExpanded = expandedPhases.has(phase.id);
          
          return (
            <div key={phase.id} className={`rounded-xl border ${colorMode ? 'border-slate-600' : 'border-gray-200'} overflow-hidden`}>
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className={`w-full p-4 flex items-center justify-between hover:bg-opacity-5 transition-colors ${
                  colorMode ? 'hover:bg-white' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: phase.color }}
                  ></div>
                  <div className="text-left">
                    <h4 className={`font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                      {phase.displayName || phase.name}
                    </h4>
                    <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {projectsInPhase.length} project{projectsInPhase.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {projectsInPhase.length > 0 && (
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      colorMode ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {projectsInPhase.length}
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Phase Content */}
              {isExpanded && (
                <div className={`border-t ${colorMode ? 'border-slate-600' : 'border-gray-200'}`}>
                  {projectsInPhase.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        No projects in this phase
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {projectsInPhase.map((project) => {
                        const progress = getProjectProgressForPhase(project, phase.id);
                        return (
                          <div key={project.id} className={`p-3 rounded-lg border ${
                            colorMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                  #{String(project.projectNumber || '').padStart(5, '0')}
                                </span>
                                <span className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {project.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {progress}%
                                </span>
                                <div className={`w-16 h-2 rounded-full ${
                                  colorMode ? 'bg-slate-600' : 'bg-gray-200'
                                }`}>
                                  <div 
                                    className="h-full rounded-full bg-[#F8FAFC]"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Line Items */}
                            <div className="space-y-2">
                              {phase.items?.slice(0, 3).map((section) => (
                                <div key={section.id} className="space-y-1">
                                  <div className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    {section.displayName || section.name}
                                  </div>
                                  <div className="space-y-1 ml-4">
                                    {section.subtasks?.slice(0, 2).map((subtask, index) => (
                                      <button
                                        key={index}
                                        onClick={() => handleLineItemClick(project, phase.id, section.id, `${phase.id}-${section.id}-${index}`)}
                                        className={`flex items-center gap-2 text-xs hover:underline ${
                                          colorMode ? 'text-gray-300 hover:text-blue-300' : 'text-gray-600 hover:text-blue-600'
                                        }`}
                                      >
                                        <CheckCircleIcon className="w-3 h-3" />
                                        {subtask}
                                      </button>
                                    ))}
                                    {section.subtasks?.length > 2 && (
                                      <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        +{section.subtasks.length - 2} more items
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
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
        })}
      </div>
    </div>
  );
};

export default WorkflowLineItemsSection;
