import React, { useState } from 'react';

const statusColors = {
  completed: 'bg-green-500',
  'in progress': 'bg-blue-500',
  pending: 'bg-orange-400',
};

const ActivityCard = ({ activity, onProjectSelect, projects }) => {
  const [loading, setLoading] = useState(false);
  const handleViewProject = () => {
    setLoading(true);
    setTimeout(() => {
      onProjectSelect(projects.find(p => p.id === activity.projectId));
      setLoading(false);
    }, 600); // Simulate loading
  };
  return (
    <div
      className="relative bg-white rounded-lg flex items-start space-x-4 min-h-[44px] transition-transform duration-200 ease-in-out hover:scale-[1.02] hover:bg-[#F8F9FA] cursor-pointer shadow-sm px-4 py-3"
      style={{ fontSize: '15px' }}
    >
      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-lg">
        {activity.avatar}
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-[#1A202C] text-[14px]">{activity.clientName || activity.author}</span>
          {activity.status && (
            <span className={`inline-block w-2 h-2 rounded-full ${statusColors[activity.status] || 'bg-gray-300'}`}></span>
          )}
          {activity.unread && (
            <span className="ml-2 inline-block bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">Unread</span>
          )}
        </div>
        <div className="mb-2">
          <button
            onClick={handleViewProject}
            disabled={loading}
            className="block text-[#718096] text-[12px] underline-offset-2 hover:underline transition-all duration-200 cursor-pointer mb-2 focus:outline-none"
            style={{ pointerEvents: loading ? 'none' : 'auto' }}
          >
            {loading ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin h-4 w-4 mr-1 text-gray-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Loading...
              </span>
            ) : (
              <>view project...</>
            )}
          </button>
        </div>
        <div className="text-gray-800 mb-1" style={{ fontSize: '14px' }}>{activity.content}</div>
        <span className="text-gray-500 font-normal text-xs ml-0">{activity.timestamp}</span>
      </div>
    </div>
  );
};

export default ActivityCard;
