import React, { useState } from 'react';
import { CalendarIcon, CheckCircleIcon, ChevronDownIcon } from '../common/Icons';

const GanttChart = ({ projects }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects.length > 0 ? projects[0].id : null);

  if (!projects || projects.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-soft border border-white/20 p-6 w-full">
        <div className="flex items-center justify-center h-24 text-gray-400">
          <CalendarIcon className="w-6 h-6 mr-3" />
          <span className="text-base font-semibold">No projects to display</span>
        </div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const getStatusColor = (status) => {
    switch (status) {
      case 'lead':
      case 'lead phase':
        return 'bg-gradient-to-r from-purple-500 to-purple-600';
      case 'prospect':
      case 'prospect phase':
        return 'bg-gradient-to-r from-orange-500 to-orange-600';
      case 'approved':
      case 'approved phase':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'execution':
      case 'execution phase':
      case 'active':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'supplement':
      case '2nd supplement':
      case '2nd supplement phase':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
      case 'completion':
      case 'completion phase':
      case 'completed':
        return 'bg-gradient-to-r from-teal-500 to-teal-600';
      case 'pending': return 'bg-gradient-to-r from-gray-400 to-gray-500';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'lead':
      case 'lead phase':
        return 'Lead';
      case 'prospect':
      case 'prospect phase':
        return 'Prospect-Insurance-1st Supplement';
      case 'approved':
      case 'approved phase':
        return 'Approved';
      case 'execution':
      case 'execution phase':
      case 'active':
        return 'Execution';
      case 'supplement':
      case '2nd supplement':
      case '2nd supplement phase':
        return '2nd Supplement';
      case 'completion':
      case 'completion phase':
      case 'completed':
        return 'Completion';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-soft border border-white/20 p-6 w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-1">
            Project Timeline
          </h3>
          <p className="text-sm text-gray-600 font-medium">Track project progress and deadlines</p>
        </div>
        
        {/* Project Selector */}
        <div className="relative w-full lg:w-auto">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(parseInt(e.target.value))}
            className="w-full lg:w-auto appearance-none bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm text-gray-800 font-semibold shadow-soft hover:shadow-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {projects.map(project => (
                                  <option key={project._id || project.id} value={project._id || project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <span>Lead</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600"></div>
          <span>Prospect</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <span>Execution</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
          <span>Supplement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-600"></div>
          <span>Completion</span>
        </div>
      </div>

      {/* Single Project Timeline */}
      <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-white/30 p-4 hover:shadow-medium transition-all duration-300 group w-full">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors duration-200 truncate">
              {selectedProject.name}
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(selectedProject.startDate)} - {formatDate(selectedProject.endDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-primary-600">${selectedProject.estimateValue?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(selectedProject.status)}`}>
              {getStatusText(selectedProject.status)}
            </span>
            <span className="text-base font-bold text-primary-600">{selectedProject.progress}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{selectedProject.progress}% Complete</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${getStatusColor(selectedProject.status)}`}
              style={{ width: `${selectedProject.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="relative">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Start</span>
            <span>End</span>
          </div>
          <div className="relative h-6 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            {/* Timeline background with week markers */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 12 }, (_, i) => (
                <div 
                  key={i} 
                  className="flex-1 border-r border-gray-200 last:border-r-0"
                  style={{ backgroundColor: i % 2 === 0 ? 'rgba(243, 244, 246, 0.5)' : 'transparent' }}
                ></div>
              ))}
            </div>
            
            {/* Project timeline bar */}
            <div className="absolute top-1 left-1 right-1 h-4 bg-white rounded-md border border-gray-300 shadow-sm">
              <div 
                className={`h-full rounded-md transition-all duration-500 ${getStatusColor(selectedProject.status)}`}
                style={{ width: `${selectedProject.progress}%` }}
              ></div>
            </div>

            {/* Progress indicator */}
            <div 
              className="absolute top-0 w-6 h-6 bg-white rounded-full border-2 border-primary-500 shadow-md flex items-center justify-center transform -translate-x-3 transition-all duration-500"
              style={{ left: `${selectedProject.progress}%` }}
            >
              <CheckCircleIcon className="w-3 h-3 text-primary-500" />
            </div>
          </div>
        </div>

        {/* Project details */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="min-w-0">
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-semibold text-gray-700 truncate block">{selectedProject.type}</span>
            </div>
            <div className="min-w-0">
              <span className="text-gray-500">Location:</span>
              <span className="ml-2 font-semibold text-gray-700 truncate block">{selectedProject.location}</span>
            </div>
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <span className="text-gray-500">Team Size:</span>
              <span className="ml-2 font-semibold text-gray-700">{selectedProject.teamSize || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart; 