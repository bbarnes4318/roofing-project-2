import React from 'react';

const MTRFilters = ({
  activeCommTab,
  projects,
  availableUsers,
  messagesProjectFilter,
  messagesUserFilter,
  tasksProjectFilter,
  tasksUserFilter,
  remindersProjectFilter,
  remindersUserFilter,
  setMessagesProjectFilter,
  setMessagesUserFilter,
  setTasksProjectFilter,
  setTasksUserFilter,
  setRemindersProjectFilter,
  setRemindersUserFilter,
  activityFeedItems,
  expandedMessages,
  handleExpandAllMessages,
  handleCollapseAllMessages
}) => {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 mt-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-700">Filter by:</span>
        <select 
          value={activeCommTab === 'messages' ? (messagesProjectFilter || '') : activeCommTab === 'tasks' ? (tasksProjectFilter || '') : (remindersProjectFilter || '')}
          onChange={(e) => {
            if (activeCommTab === 'messages') setMessagesProjectFilter(e.target.value);
            else if (activeCommTab === 'tasks') setTasksProjectFilter(e.target.value);
            else setRemindersProjectFilter(e.target.value);
          }}
          className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-900 hover:border-gray-300 transition-all duration-300 min-w-[120px]"
          style={{ color: '#111827' }}
        >
          <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>All Projects</option>
          {(projects || []).map(p => (
            <option key={p.id} value={p.id} style={{ color: '#111827', backgroundColor: '#ffffff' }}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
          ))}
        </select>
        
        <select
          value={activeCommTab === 'messages' ? (messagesUserFilter || '') : activeCommTab === 'tasks' ? (tasksUserFilter || '') : (remindersUserFilter || '')}
          onChange={(e) => {
            if (activeCommTab === 'messages') setMessagesUserFilter(e.target.value);
            else if (activeCommTab === 'tasks') setTasksUserFilter(e.target.value);
            else setRemindersUserFilter(e.target.value);
          }}
          className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-900 hover:border-gray-300 transition-all duration-300 min-w-[100px]"
          style={{ color: '#111827' }}
        >
          <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>All Users</option>
          {availableUsers.map(u => (
            <option key={u.id} value={u.id} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
      </div>
      
      {/* Condensed Expand/Collapse Controls - Right side */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExpandAllMessages}
          className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
            (() => {
              const currentCount = activeCommTab === 'messages' ? activityFeedItems.filter(i => i.type === 'message').length :
                                 activeCommTab === 'tasks' ? activityFeedItems.filter(i => i.type === 'task').length :
                                 activityFeedItems.filter(i => i.type === 'reminder').length;
              return expandedMessages.size === currentCount && currentCount > 0
                ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow'
                : 'bg-white/80 text-brand-600 border-gray-200 hover:bg-white hover:border-brand-300 hover:shadow-soft';
            })()
          }`}
          title="Expand all alert details"
          disabled={(() => {
            const currentCount = activeCommTab === 'messages' ? activityFeedItems.filter(i => i.type === 'message').length :
                               activeCommTab === 'tasks' ? activityFeedItems.filter(i => i.type === 'task').length :
                               activityFeedItems.filter(i => i.type === 'reminder').length;
            return currentCount === 0 || expandedMessages.size === currentCount;
          })()}
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
        
        <button
          onClick={handleCollapseAllMessages}
          className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
            expandedMessages.size === 0
              ? 'bg-orange-500 text-white border-orange-500 shadow-accent-glow'
              : 'bg-white/80 text-orange-600 border-gray-200 hover:bg-white hover:border-orange-300 hover:shadow-soft'
          }`}
          title="Collapse all alert details"
          disabled={expandedMessages.size === 0}
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MTRFilters;