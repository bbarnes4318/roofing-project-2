import React, { useState } from 'react';
import ProjectCard from '../ui/ProjectCard';
import { initialProjects } from '../../data/mockData';

const ProjectsPage = ({ onProjectSelect, onProjectActionSelect }) => {
  const [projects] = useState(initialProjects);

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Projects & Checklists</h1>
          <p className="text-gray-500 mt-2">Manage projects and monitor workflow</p>
        </div>
        <button className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-900">
          + New Project
        </button>
      </div>
      
      <div className="space-y-6">
        {projects.map(project => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onProjectSelect={onProjectSelect}
            onProjectActionSelect={onProjectActionSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectsPage;
