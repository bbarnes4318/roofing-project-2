import React from 'react';
const ProjectCard = ({ project, onProjectSelect, onProjectActionSelect, getStatusStyles }) => (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-soft border border-white/20 hover:shadow-medium transition-all duration-300 group">
        <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-primary-600 transition-colors duration-200">{project.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm ${getStatusStyles(project.type)}`}>
                        {project.type}
                    </span>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm capitalize ${getStatusStyles(project.status)}`}>
                        {project.status}
                    </span>
                </div>
            </div>
            <div className="text-right ml-4">
                <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    ${project.estimateValue.toLocaleString()}
                </p>
            </div>
        </div>
        
        <div className="mb-6">
            <div className="flex justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Progress</span>
                <span className="text-sm font-bold text-primary-600">{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm" 
                    style={{ width: `${project.progress}%` }}
                ></div>
            </div>
        </div>
        
        <div className="border-t border-gray-100 pt-5 flex justify-between items-center">
            <div className="flex space-x-3">
                <button 
                    onClick={() => onProjectActionSelect(project, 'Messages')} 
                    className="flex items-center text-sm bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 border border-gray-200/50"
                >
                    Messages
                </button>
                <button 
                    onClick={() => onProjectActionSelect(project, 'Project Flow')} 
                    className="flex items-center text-sm bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 border border-gray-200/50"
                >
                    Project Flow
                </button>
            </div>
            <button 
                onClick={() => onProjectSelect(project)} 
                className="text-sm bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105"
            >
                View Details
            </button>
        </div>
    </div>
);
export default ProjectCard; 