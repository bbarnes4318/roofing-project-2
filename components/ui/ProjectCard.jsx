import React from 'react';
import { ChatBubbleLeftRightIcon, ClipboardDocumentCheckIcon } from '../common/Icons';
import { getStatusStyles } from '../../utils/helpers';

const ProjectCard = ({ project, onProjectSelect, onProjectActionSelect }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{project.name}</h3>
        <div className="flex items-center mt-2">
          <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full ${getStatusStyles(project.type)}`}>
            {project.type}
          </span>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${getStatusStyles(project.status)}`}>
            {project.status}
          </span>
        </div>
      </div>
      <p className="text-lg font-semibold text-green-600">
        ${project.estimateValue.toLocaleString()}
      </p>
    </div>
    
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">Progress</span>
        <span className="text-sm font-medium text-gray-700">{project.progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${project.progress}%` }}
        ></div>
      </div>
    </div>
    
    <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
      <div className="flex space-x-2">
        <button 
          onClick={() => onProjectActionSelect(project, 'Messages')} 
          className="flex items-center text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-sm"
        >
          <ChatBubbleLeftRightIcon /> Messages
        </button>
        <button 
          onClick={() => onProjectActionSelect(project, 'Checklist')} 
          className="flex items-center text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-sm"
        >
          <ClipboardDocumentCheckIcon /> Checklist
        </button>
      </div>
      <button 
        onClick={() => onProjectSelect(project)} 
        className="text-sm bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-lg shadow-sm"
      >
        View Details
      </button>
    </div>
  </div>
);

export default ProjectCard;
