import React from 'react';

const MTRHeader = ({
  activeCommTab,
  setActiveCommTab,
  expandedMessages,
  activityFeedItems
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
            Messages, Tasks, & Reminders
          </h2>
          {expandedMessages.size > 0 && (
            <p className="text-sm text-gray-600 font-medium">
              {expandedMessages.size} of {(() => {
                if (activeCommTab === 'messages') return activityFeedItems.filter(i => i.type === 'message').length;
                if (activeCommTab === 'tasks') return activityFeedItems.filter(i => i.type === 'task').length;
                if (activeCommTab === 'reminders') return activityFeedItems.filter(i => i.type === 'reminder').length;
                return 0;
              })()} {activeCommTab}{(() => {
                const count = activeCommTab === 'messages' ? activityFeedItems.filter(i => i.type === 'message').length :
                             activeCommTab === 'tasks' ? activityFeedItems.filter(i => i.type === 'task').length :
                             activityFeedItems.filter(i => i.type === 'reminder').length;
                return count !== 1 ? 's' : '';
              })()} expanded
            </p>
          )}
        </div>
      </div>
      
      {/* Modern Tab Navigation */}
      <div className="relative mt-4 mb-6">
        <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
          <button 
            onClick={() => setActiveCommTab('messages')} 
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeCommTab === 'messages' 
                ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Messages
            </div>
          </button>
          <button 
            onClick={() => setActiveCommTab('tasks')} 
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeCommTab === 'tasks' 
                ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Tasks
            </div>
          </button>
          <button 
            onClick={() => setActiveCommTab('reminders')} 
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeCommTab === 'reminders' 
                ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reminders
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MTRHeader;