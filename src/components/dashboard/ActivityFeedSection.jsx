import React, { useEffect } from 'react';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import TaskItem from '../ui/TaskItem';
import ReminderItem from '../ui/ReminderItem';
import WorkflowProgressService from '../../services/workflowProgress';
import { useActivity } from '../../contexts/ActivityContext';

const ActivityFeedSection = ({
  activityFeedItems,
  projects,
  colorMode,
  activityProjectFilter,
  activityTypeFilter,
  setActivityProjectFilter,
  setActivityTypeFilter,
  handleProjectSelectWithScroll,
  availableUsers = []
}) => {
  const { state, actions } = useActivity();

  // Initialize centralized state with activity feed items
  useEffect(() => {
    if (activityFeedItems && activityFeedItems.length > 0) {
      actions.setItems(activityFeedItems);
    }
  }, [activityFeedItems, actions]);
  return (
    <div className="w-full" data-section="activity-feed">
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible mb-6">
        <div className="mb-3">
          <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
            Activity Feed
          </h2>
          <div className="text-xs text-gray-500">
            {activityFeedItems.length} items total
          </div>
        </div>
        
        {/* Simple Filters */}
        <div className="flex items-center gap-2 mb-3">
          <select
            value={activityProjectFilter}
            onChange={(e) => setActivityProjectFilter(e.target.value)}
            className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[120px]"
          >
            <option value="">All Projects</option>
            {(projects || []).map(p => (
              <option key={p.id} value={p.id}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
            ))}
          </select>
          <select
            value={activityTypeFilter || ''}
            onChange={(e) => setActivityTypeFilter(e.target.value)}
            className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[100px]"
          >
            <option value="">All Types</option>
            <option value="message">Messages</option>
            <option value="task">Tasks</option>
            <option value="reminder">Reminders</option>
          </select>
        </div>
        
        <div className="space-y-3">
          {(() => {
            // Use centralized state items
            const allItems = state.items || [];
            
            // Apply Activity Feed filters
            const filteredItems = allItems.filter(item => {
              const projectMatch = !activityProjectFilter || String(item.projectId) === String(activityProjectFilter);
              const typeMatch = !activityTypeFilter || item.type === activityTypeFilter;
              return projectMatch && typeMatch;
            });
            
            // Sort by timestamp (newest first) - reverse chronological order
            const sortedItems = filteredItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // If no items, show empty state
            if (sortedItems.length === 0) {
              return (
                <div className="text-gray-400 text-center py-8 text-sm">
                  No activity yet.
                </div>
              );
            }
            
            return sortedItems.map(item => {
              if (item.type === 'message') {
                // Keep existing message rendering - Message Item stays the same
                return (
                  <ProjectMessagesCard
                    key={item.id}
                    activity={item}
                    onProjectSelect={handleProjectSelectWithScroll}
                    projects={projects || []}
                    colorMode={colorMode}
                    useRealData={true}
                    onQuickReply={() => {}} // Add this prop if needed
                    isExpanded={state.expandedItems.has(item.id)}
                    onToggleExpansion={() => actions.toggleExpanded(item.id)}
                    sourceSection="Activity Feed"
                  />
                );
              } else if (item.type === 'task') {
                // Use unified TaskItem component
                return (
                  <TaskItem
                    key={item.id}
                    item={item}
                    projects={projects || []}
                    colorMode={colorMode}
                    onProjectSelect={handleProjectSelectWithScroll}
                  />
                );
              } else if (item.type === 'reminder') {
                // Use unified ReminderItem component
                return (
                  <ReminderItem
                    key={item.id}
                    item={item}
                    projects={projects || []}
                    colorMode={colorMode}
                    onProjectSelect={handleProjectSelectWithScroll}
                    availableUsers={availableUsers}
                  />
                );
              }
              
              return null;
            });
          })()}
        </div>
      </div>
    </div>
  );
};

export default ActivityFeedSection;