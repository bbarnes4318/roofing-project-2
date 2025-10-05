import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ReminderItem from '../ui/ReminderItem';
import WorkflowProgressService from '../../services/workflowProgress';
import { useActivity } from '../../contexts/ActivityContext';
import { calendarService } from '../../services/api';

const RemindersSection = ({
  activeCommTab,
  activityFeedItems,
  projects,
  colorMode,
  remindersProjectFilter,
  remindersUserFilter,
  availableUsers,
  handleProjectSelectWithScroll,
  currentUser = null
}) => {
  const { state, actions } = useActivity();
  const [deletingIds, setDeletingIds] = useState(new Set());
  
  if (activeCommTab !== 'reminders') {
    return null;
  }

  const handleDeleteReminder = async (item) => {
    if (!item?.id) return;

    const confirmed = window.confirm('Delete this reminder? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    try {
      // Extract real ID by removing prefixes like 'reminder_', 'cal_', 'activity_'
      const realId = String(item.id || '').replace(/^(task_|cal_|activity_|reminder_|msg_)/, '');
      await calendarService.delete(realId);
      actions.removeItem(item.id);
      toast.success('Reminder deleted successfully.');
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to delete reminder.';
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
      {(() => {
        const reminderItems = state.items
          .filter(i => i.type === 'reminder')
          .filter(i => !remindersProjectFilter || String(i.projectId) === String(remindersProjectFilter))
          .filter(i => {
            if (!remindersUserFilter) return true;
            const uid = String(remindersUserFilter);
            const isRecipient = Array.isArray(i.recipients) && (i.recipients.includes('all') || i.recipients.some(r => String(r) === uid));
            const isAuthor = i.authorId && String(i.authorId) === uid;
            return isRecipient || isAuthor;
          })
          .filter(i => !state.completedItems.has(i.id)); // Filter out completed reminders

        if (reminderItems.length === 0) {
          return (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No reminders found</h3>
              <p className="text-gray-500">Reminders you create or receive will appear here</p>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            {reminderItems.map(item => (
              <ReminderItem
                key={item.id}
                item={item}
                projects={projects || []}
                colorMode={colorMode}
                onProjectSelect={handleProjectSelectWithScroll}
                availableUsers={availableUsers}
                currentUser={currentUser}
                onDelete={() => handleDeleteReminder(item)}
                isDeleting={deletingIds.has(item.id)}
              />
            ))}
          </div>
        );
      })()}
    </>
  );
};

export default RemindersSection;