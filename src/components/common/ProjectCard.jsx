import React from 'react';
import PropTypes from 'prop-types';

const ProjectCard = ({ project, className = '' }) => {
  // Format project description with line clamping
  const description = project.description || 'No description available for this project.';
  
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}>
      {/* Image container with aspect ratio */}
      <div className="aspect-w-16 aspect-h-9 bg-gray-100 relative">
        {project.image ? (
          <img 
            src={project.image} 
            alt={project.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100">
            <span className="text-gray-400 text-sm">Project Image</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <h3 className="text-lg font-semibold text-white line-clamp-1">
            {project.name}
          </h3>
          <div className="flex items-center mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              project.status === 'In Progress' 
                ? 'bg-yellow-100 text-yellow-800' 
                : project.status === 'Completed'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {project.status || 'Not Started'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Project meta */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center text-sm text-gray-500">
            <span className="mr-2">
              <svg className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {project.dueDate || 'No due date'}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900">
            ${project.budget?.toLocaleString() || 'N/A'}
          </div>
        </div>

        {/* Description with line clamp */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {description}
        </p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{(() => {
              const progressData = WorkflowProgressService.calculateProjectProgress(project);
              return Math.round(progressData.overall || 0);
            })()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${(() => {
                const progressData = WorkflowProgressService.calculateProjectProgress(project);
                return Math.round(progressData.overall || 0);
              })()}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex space-x-2">
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Details
          </button>
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
        </div>
      </div>
    </div>
  );
};

ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.oneOf(['Not Started', 'In Progress', 'Completed']),
    dueDate: PropTypes.string,
    budget: PropTypes.number,
    progress: PropTypes.number,
    image: PropTypes.string,
  }).isRequired,
  className: PropTypes.string,
};

export default ProjectCard;
