import React, { useEffect, useState } from 'react';
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
  
  // Activity Feed expansion state - expanded by default
  const [isActivityFeedExpanded, setIsActivityFeedExpanded] = useState(true);

  // Initialize centralized state with activity feed items
  useEffect(() => {
    if (activityFeedItems && activityFeedItems.length > 0) {
      actions.setItems(activityFeedItems);
    }
  }, [activityFeedItems, actions]);

  // Expand/Collapse handlers
  const handleExpandAllActivity = () => {
    const allItemIds = new Set((state.items || []).map(item => item.id));
    allItemIds.forEach(id => {
      if (!state.expandedItems.has(id)) {
        actions.toggleExpanded(id);
      }
    });
  };

  const handleCollapseAllActivity = () => {
    const allItemIds = new Set((state.items || []).map(item => item.id));
    allItemIds.forEach(id => {
      if (state.expandedItems.has(id)) {
        actions.toggleExpanded(id);
      }
    });
  };
  return (
    <div className="w-full" data-section="activity-feed">
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible mb-6">
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                Activity Feed
              </h2>
              <div className="text-xs text-gray-500">
                {activityFeedItems.length} items total
              </div>
            </div>
            
            {/* Activity Feed Toggle and Controls */}
            <div className="flex items-center gap-2">
              {/* Main Activity Feed Toggle */}
              <button
                onClick={() => setIsActivityFeedExpanded(!isActivityFeedExpanded)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                  isActivityFeedExpanded
                    ? 'bg-orange-500 text-white border-orange-500 shadow-accent-glow'
                    : 'bg-white/80 text-orange-600 border-gray-200 hover:bg-white hover:border-orange-300 hover:shadow-soft'
                }`}
                title={isActivityFeedExpanded ? "Collapse Activity Feed" : "Expand Activity Feed"}
              >
                <div className="flex items-center gap-1">
                  <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${isActivityFeedExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span>{isActivityFeedExpanded ? 'Collapse' : 'Expand'}</span>
                </div>
              </button>
              
              {/* Expand All Items Button */}
              <button
                onClick={handleExpandAllActivity}
                className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                  (() => {
                    const currentCount = (state.items || []).length;
                    return state.expandedItems.size === currentCount && currentCount > 0
                      ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow'
                      : 'bg-white/80 text-brand-600 border-gray-200 hover:bg-white hover:border-brand-300 hover:shadow-soft';
                  })()
                }`}
                title="Expand all activity details"
                disabled={(() => {
                  const currentCount = (state.items || []).length;
                  return currentCount === 0 || state.expandedItems.size === currentCount;
                })()}
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
              
              {/* Collapse All Items Button */}
              <button
                onClick={handleCollapseAllActivity}
                className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                  state.expandedItems.size === 0
                    ? 'bg-orange-500 text-white border-orange-500 shadow-accent-glow'
                    : 'bg-white/80 text-orange-600 border-gray-200 hover:bg-white hover:border-orange-300 hover:shadow-soft'
                }`}
                title="Collapse all activity details"
                disabled={state.expandedItems.size === 0}
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
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
        
        {/* Activity Feed Content - Conditionally rendered based on expansion state */}
        {isActivityFeedExpanded && (
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
        )}
      </div>
    </div>
  );
};

export default ActivityFeedSection;