import React, { useState, useEffect } from 'react';
import { projectsService, authService } from '../../services/api';

const WorkflowSettingsPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadProjects();
    loadTeamMembers();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsService.getAll();
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setMessage('Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      // This would need to be implemented in the API
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setTeamMembers(data.data?.users || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadWorkflow = async (projectId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workflows/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setWorkflow(data.data?.workflow || null);
    } catch (error) {
      console.error('Error loading workflow:', error);
      setMessage('Error loading workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setWorkflow(null);
    loadWorkflow(project._id);
  };

  const createWorkflow = async () => {
    if (!selectedProject) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/workflows/project/${selectedProject._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setWorkflow(data.data.workflow);
        setMessage('Workflow created successfully!');
      } else {
        setMessage(data.message || 'Error creating workflow');
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      setMessage('Error creating workflow');
    } finally {
      setSaving(false);
    }
  };

  const assignTeamMember = async (stepId, userId) => {
    if (!workflow) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/workflows/${workflow._id}/steps/${stepId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ assignedTo: userId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local workflow state
        const updatedWorkflow = { ...workflow };
        const step = updatedWorkflow.steps.find(s => s.stepId === stepId);
        if (step) {
          step.assignedTo = userId;
        }
        setWorkflow(updatedWorkflow);
        setMessage('Team member assigned successfully!');
      } else {
        setMessage(data.message || 'Error assigning team member');
      }
    } catch (error) {
      console.error('Error assigning team member:', error);
      setMessage('Error assigning team member');
    } finally {
      setSaving(false);
    }
  };

  const getTeamMemberName = (userId) => {
    const member = teamMembers.find(m => m._id === userId);
    return member ? `${member.firstName} ${member.lastName}` : 'Unassigned';
  };

  const getPhaseColor = (phase) => {
    const colors = {
      'Lead': 'bg-blue-100 text-blue-800',
      'Prospect': 'bg-green-100 text-green-800',
      'Approved': 'bg-yellow-100 text-yellow-800',
      'Execution': 'bg-purple-100 text-purple-800',
      '2nd Supplement': 'bg-orange-100 text-orange-800',
      'Completion': 'bg-gray-100 text-gray-800'
    };
    return colors[phase] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role) => {
    const colors = {
      'office': 'bg-blue-50 text-blue-700 border-blue-200',
      'administration': 'bg-green-50 text-green-700 border-green-200',
      'project_manager': 'bg-purple-50 text-purple-700 border-purple-200',
      'field_director': 'bg-orange-50 text-orange-700 border-orange-200',
      'roof_supervisor': 'bg-red-50 text-red-700 border-red-200'
    };
    return colors[role] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'office': '🏢',
      'administration': '📝',
      'project_manager': '👷‍♂️',
      'field_director': '🛠️',
      'roof_supervisor': '🔧'
    };
    return icons[role] || '👤';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workflow Team Assignments</h1>
          <p className="mt-2 text-sm text-gray-600">
            Assign team members to specific workflow steps for each project. This determines who receives alerts for each step.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Project Selection */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Select Project</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project._id}
                    onClick={() => handleProjectSelect(project)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedProject?._id === project._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900">{project.projectName}</h3>
                    <p className="text-sm text-gray-500">{project.projectType}</p>
                    <p className="text-sm text-gray-500">Status: {project.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workflow Management */}
        {selectedProject && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  Workflow for {selectedProject.projectName}
                </h2>
                {!workflow && (
                  <button
                    onClick={createWorkflow}
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Workflow'}
                  </button>
                )}
              </div>
            </div>

            {workflow ? (
              <div className="p-6">
                {/* Workflow Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm text-gray-500">{workflow.overallProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${workflow.overallProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Workflow Steps by Phase */}
                {['Lead', 'Prospect', 'Approved', 'Execution', '2nd Supplement', 'Completion'].map((phase) => {
                  const phaseSteps = workflow.steps.filter(step => step.phase === phase);
                  
                  return (
                    <div key={phase} className="mb-8">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${getPhaseColor(phase)}`}>
                        {phase} Phase ({phaseSteps.length} steps)
                      </div>
                      
                      <div className="grid gap-4">
                        {phaseSteps.map((step) => (
                          <div key={step.stepId} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h3 className="text-lg font-medium text-gray-900">{step.stepName}</h3>
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getRoleColor(step.defaultResponsible)}`}>
                                    {getRoleIcon(step.defaultResponsible)} {step.defaultResponsible.replace('_', ' ').toUpperCase()}
                                  </span>
                                  {step.isCompleted && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Complete
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                                
                                {/* Sub-tasks */}
                                {step.subTasks && step.subTasks.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Sub-tasks:</p>
                                    <ul className="space-y-1">
                                      {step.subTasks.map((subTask) => (
                                        <li key={subTask.subTaskId} className="flex items-center text-sm text-gray-600">
                                          <span className={`mr-2 ${subTask.isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                            {subTask.isCompleted ? '✓' : '○'}
                                          </span>
                                          {subTask.subTaskName}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Timing */}
                                <div className="mt-3 flex space-x-4 text-sm text-gray-500">
                                  <span>Duration: {step.estimatedDuration} day{step.estimatedDuration !== 1 ? 's' : ''}</span>
                                  {step.scheduledStartDate && (
                                    <span>Start: {new Date(step.scheduledStartDate).toLocaleDateString()}</span>
                                  )}
                                  {step.scheduledEndDate && (
                                    <span>Due: {new Date(step.scheduledEndDate).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>

                              {/* Team Assignment */}
                              <div className="ml-6 min-w-0 flex-shrink-0" style={{ width: '250px' }}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Assigned Team Member
                                </label>
                                <select
                                  value={step.assignedTo || ''}
                                  onChange={(e) => assignTeamMember(step.stepId, e.target.value)}
                                  disabled={saving}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Select team member...</option>
                                  {teamMembers
                                    .filter(member => member.role === step.defaultResponsible || member.role === 'admin' || member.role === 'manager')
                                    .map((member) => (
                                    <option key={member._id} value={member._id}>
                                      {member.firstName} {member.lastName} ({member.role})
                                    </option>
                                  ))}
                                </select>
                                
                                {step.assignedTo && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                    <span className="font-medium">Assigned to:</span><br />
                                    {getTeamMemberName(step.assignedTo)}
                                  </div>
                                )}

                                {/* Alert Settings */}
                                <div className="mt-3 text-xs text-gray-500">
                                  <p>Alerts:</p>
                                  <p>• Warning: {step.alertTriggers.warningDays} day{step.alertTriggers.warningDays !== 1 ? 's' : ''} before</p>
                                  <p>• Urgent: {step.alertTriggers.urgentDays} day{step.alertTriggers.urgentDays !== 1 ? 's' : ''} before</p>
                                  <p>• Overdue: {step.alertTriggers.overdueIntervals.join(', ')} days after</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {loading ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <p>No workflow found for this project. Create one to start managing team assignments.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowSettingsPage; 