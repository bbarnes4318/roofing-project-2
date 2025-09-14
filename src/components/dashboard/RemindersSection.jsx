import React from 'react';
import ReminderItem from '../ui/ReminderItem';
import WorkflowProgressService from '../../services/workflowProgress';
import { useActivity } from '../../contexts/ActivityContext';

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
  const { state } = useActivity();
  
  if (activeCommTab !== 'reminders') {
    return null;
  }

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
          });

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
              />
            ))}
          </div>
        );
      })()}
    </>
  );
};

export default RemindersSection;