import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import assetsService from '../../services/assetsService';
import TaskItem from '../ui/TaskItem';
import ReminderItem from '../ui/ReminderItem';
import FeedbackItem from './FeedbackItem';
import WorkflowProgressService from '../../services/workflowProgress';
import { useActivity } from '../../contexts/ActivityContext';
import DocumentViewerModal from '../ui/DocumentViewerModal';
import { tasksService, projectMessagesService, calendarService } from '../../services/api';

const ActivityFeedSection = ({
  activityFeedItems,
  projects,
  colorMode,
  activityProjectFilter,
  activityTypeFilter,
  setActivityProjectFilter,
  setActivityTypeFilter,
  handleProjectSelectWithScroll,
  availableUsers = [],
  currentUser = null,
  sourceSection = "Activity Feed"
}) => {
  const { state, actions } = useActivity();

  // Activity Feed expansion state - expanded by default
  const [isActivityFeedExpanded, setIsActivityFeedExpanded] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());

  // Color styles per activity type for clear separation
  const getTypeStyle = (type) => {
    switch (type) {
      case 'message':
        // Make messages stand out more with a darker container background and stronger border
        return { stripe: 'bg-blue-500', container: 'bg-blue-100 border-blue-200' };
      case 'task':
        // Make tasks stand out more too
        return { stripe: 'bg-emerald-500', container: 'bg-emerald-100 border-emerald-200' };
      case 'reminder':
        // ORANGE for reminders - ORANGE. ORANGE. ORANGE. REMINDERS ARE ORANGE.
        return { stripe: 'bg-orange-500', container: 'bg-orange-100 border-orange-200' };
      case 'feedback':
        // Custom feedback color #EF946C for Feedback Hub messages
        return { stripe: 'bg-[#EF946C]', container: 'bg-[#FDF2E9] border-[#EF946C]/30' };
      default:
        return { stripe: 'bg-gray-300', container: 'bg-gray-50/40 border-gray-100' };
    }
  };

  // Build a stable signature for the incoming items so we only update when content truly changes
  const itemsSignature = useMemo(() => {
    if (!Array.isArray(activityFeedItems) || activityFeedItems.length === 0) return 'len:0';
    try {
      return 'len:' + activityFeedItems.length + '|' + activityFeedItems.map(it => `${it.id}:${it.timestamp || ''}`).join('|');
    } catch {
      return 'len:' + activityFeedItems.length;
    }
  }, [activityFeedItems]);

  // Initialize centralized state with activity feed items only when signature changes
  const lastSigRef = useRef(null);
  useEffect(() => {
    if (itemsSignature !== lastSigRef.current) {
      actions.setItems(Array.isArray(activityFeedItems) ? activityFeedItems : []);
      lastSigRef.current = itemsSignature;
    }
  }, [itemsSignature, activityFeedItems, actions]);

  // Expand all items by default - keep track of which items we've already expanded
  const expandedInitRef = useRef(new Set());
  
  useEffect(() => {
    const items = state.items || [];
    if (items.length > 0) {
      // Expand any items that haven't been expanded yet
      let hasChanges = false;
      items.forEach(it => {
        // Only try to expand if we haven't touched this item yet
        if (!expandedInitRef.current.has(it.id)) {
          // Check if it needs expansion (not already in expandedItems)
          if (!state.expandedItems.has(it.id)) {
            actions.toggleExpanded(it.id);
            hasChanges = true;
          }
          expandedInitRef.current.add(it.id);
        }
      });
    }
  }, [state.items, actions]); // Removed state.expandedItems to prevent fighting user interaction

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

  const handleDeleteItem = async (item) => {
    if (!item?.id) return;

    const typeLabel = item.type === 'message' ? 'message'
      : item.type === 'task' ? 'task'
      : item.type === 'reminder' ? 'reminder'
      : 'item';

    const confirmed = window.confirm(`Delete this ${typeLabel}? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    try {
      // Extract real ID by removing prefixes like 'task_', 'cal_', 'activity_', 'reminder_', 'msg_'
      let realId = String(item.id || '');
      
      // Remove common prefixes
      realId = realId.replace(/^(task_|cal_|activity_|reminder_|msg_|feedback_)/, '');
      
      console.log('🗑️ Delete attempt:', {
        originalId: item.id,
        realId: realId,
        type: item.type
      });
      
      if (item.type === 'message') {
        await projectMessagesService.delete(realId);
      } else if (item.type === 'task') {
        await tasksService.delete(realId);
      } else if (item.type === 'reminder') {
        await calendarService.delete(realId);
      } else {
        throw new Error(`Unsupported activity type: ${item.type}`);
      }

      actions.removeItem(item.id);
      toast.success(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} deleted.`);
    } catch (error) {
      console.error('Failed to delete activity item:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to delete item.';
      toast.error(message);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };
  return (
    <>
    <div className="w-full flex flex-col" data-section="activity-feed">
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible flex-1 min-h-[800px]">
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
            
            {/* Activity Feed Controls */}
            <div className="flex items-center gap-2">
              
              {/* Expand All Items Button */}
              <button
                onClick={handleExpandAllActivity}
                className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                  (() => {
                    const currentCount = (state.items || []).length;
                    // Active (Brand) if NOT all expanded (size < count)
                    // Disabled (White) if ALL expanded (size === count)
                    return state.expandedItems.size < currentCount && currentCount > 0
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
                  // Active (Orange) if ANY expanded (size > 0)
                  // Disabled (White) if NONE expanded (size === 0)
                  state.expandedItems.size > 0
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
            <option value="feedback">Feedback</option>
          </select>
        </div>
        
        {/* Activity Feed Content - Conditionally rendered based on expansion state */}
        {/* Extended height to match Project Workflow Line Items container */}
        {isActivityFeedExpanded && (
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
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
              const style = getTypeStyle(item.type);
              const isDeleting = deletingIds.has(item.id);
              if (item.type === 'message') {
                // Message item with colored stripe and soft background
                return (
                  <div key={item.id} className={`relative rounded-xl border ${style.container} overflow-hidden shadow-md`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.stripe}`} />
                    <ProjectMessagesCard
                      activity={item}
                      onProjectSelect={handleProjectSelectWithScroll}
                      projects={projects || []}
                      colorMode={colorMode}
                      useRealData={true}
                      onQuickReply={() => {}}
                      // Expand messages by default on initial load. Use a safe fallback so we don't race with the init effect.
                      // If no items are marked expanded yet but we have items, render expanded by default.
                      isExpanded={state.expandedItems.has(item.id) || (state.expandedItems.size === 0 && (state.items || []).length > 0)}
                      onToggleExpansion={() => actions.toggleExpanded(item.id)}
                      sourceSection="Activity Feed"
                      onDelete={() => handleDeleteItem(item)}
                      isDeleting={isDeleting}
                    />
                  </div>
                );
              } else if (item.type === 'task') {
                // Task item with colored stripe and soft background
                return (
                  <div key={item.id} className={`relative rounded-xl border ${style.container} overflow-hidden shadow-md`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.stripe}`} />
                    <TaskItem
                      item={item}
                      projects={projects || []}
                      colorMode={colorMode}
                      onProjectSelect={handleProjectSelectWithScroll}
                      availableUsers={availableUsers}
                      currentUser={currentUser}
                      onDelete={() => handleDeleteItem(item)}
                      isDeleting={isDeleting}
                    />
                  </div>
                );
              } else if (item.type === 'reminder') {
                // Reminder item with colored stripe and soft background
                return (
                  <div key={item.id} className={`relative rounded-xl border ${style.container} overflow-hidden shadow-md`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.stripe}`} />
                    <ReminderItem
                      item={item}
                      projects={projects || []}
                      colorMode={colorMode}
                      onProjectSelect={handleProjectSelectWithScroll}
                      availableUsers={availableUsers}
                      currentUser={currentUser}
                      onDelete={() => handleDeleteItem(item)}
                      isDeleting={isDeleting}
                    />
                  </div>
                );
              } else if (item.type === 'feedback') {
                // Feedback items are no longer displayed in the activity feed
                // They have their own dedicated Feedback Hub page
                return null;
              }
              
              return null;
            });
          })()}
          </div>
        )}
      </div>
    </div>

    {/* Document Viewer Modal */}
    <DocumentViewerModal
      document={selectedDocument}
      isOpen={isDocumentModalOpen}
      onClose={() => {
        setIsDocumentModalOpen(false);
        setSelectedDocument(null);
      }}
    />
  </>
  );
};

export default ActivityFeedSection;
