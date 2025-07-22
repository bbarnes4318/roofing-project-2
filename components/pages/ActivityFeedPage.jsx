import React, { useState } from 'react';
import ActivityCard from '../ui/ActivityCard';

const ActivityFeedPage = ({ projects, onProjectSelect, activities, onAddActivity }) => {
  const [isComposing, setIsComposing] = useState(false);
  const [composeStep, setComposeStep] = useState(1);
  const [message, setMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const handlePost = () => {
    if (!message) return;
    const project = projects.find(p => p.id === parseInt(selectedProjectId));
    onAddActivity(project, message);
    resetCompose();
  };

  const resetCompose = () => {
    setIsComposing(false);
    setComposeStep(1);
    setMessage('');
    setSelectedProjectId('');
  };

  return (
    <div className="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-5 py-6 md:px-6 md:py-8 mb-8">
      <div>
        <h1 className="font-bold text-[#2D3748] text-[18px] leading-tight">Activity Feed</h1>
        <div className="border-b border-[#E2E8F0] mt-2 mb-2" />
        <p className="text-gray-500 mt-4 mb-2 text-sm">Recent messages and updates from all projects.</p>
      </div>
      {!isComposing && (
        <button 
          onClick={() => setIsComposing(true)} 
          className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-900 float-right mb-4"
        >
          + New Post
        </button>
      )}
      {isComposing && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          {composeStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">What is this about?</h3>
              <div className="flex space-x-4">
                <button 
                  onClick={() => setComposeStep(2)} 
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Project Update
                </button>
                <button 
                  onClick={resetCompose} 
                  className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {composeStep === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Create New Post</h3>
              <div className="space-y-4">
                <select 
                  value={selectedProjectId} 
                  onChange={(e) => setSelectedProjectId(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a Project to link...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <textarea 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  placeholder="Write your update here..." 
                  className="w-full p-2 border border-gray-300 rounded-lg" 
                  rows="4"
                ></textarea>
                <div className="flex justify-end space-x-4">
                  <button 
                    onClick={resetCompose} 
                    className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePost} 
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="space-y-6 mt-4">
        {activities.map(activity => (
          <ActivityCard 
            key={activity.id} 
            activity={activity} 
            onProjectSelect={onProjectSelect}
            projects={projects}
          />
        ))}
      </div>
    </div>
  );
};

export default ActivityFeedPage;
