import React from 'react';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';

const MessagesSection = ({
  activeCommTab,
  activityFeedItems,
  projects,
  colorMode,
  expandedMessages,
  messagesProjectFilter,
  messagesUserFilter,
  handleToggleMessage,
  handleProjectSelectWithScroll,
  handleQuickReply
}) => {
  if (activeCommTab !== 'messages') {
    return null;
  }

  return (
    <>
      {(() => {
        // Use activityFeedItems for consistent data source across all tabs
        const messageItems = activityFeedItems
          .filter(i => i.type === 'message')
          .filter(i => !messagesProjectFilter || String(i.projectId) === String(messagesProjectFilter))
          .filter(i => {
            if (!messagesUserFilter) return true;
            const uid = String(messagesUserFilter);
            // Simplified user filtering - just check if the user is mentioned in recipients or is the author
            const isRecipient = Array.isArray(i.recipients) && (i.recipients.includes('all') || i.recipients.some(r => String(r) === uid));
            const isAuthor = i.authorId && String(i.authorId) === uid;
            return isRecipient || isAuthor;
          });

        if (messageItems.length === 0) {
          return (
            <div className="text-gray-400 text-center py-8 text-sm">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="font-medium">No messages found</p>
              <p className="text-xs mt-1">Messages you send or receive will appear here</p>
            </div>
          );
        }

        return messageItems.map(item => (
          <ProjectMessagesCard 
            key={item.id} 
            activity={{
              ...item,
              // Ensure compatibility with the card component
              id: item.id,
              projectId: item.projectId,
              projectName: item.projectName,
              subject: item.subject,
              description: item.description || item.content,
              user: item.user,
              timestamp: item.timestamp,
              type: item.type,
              priority: item.priority,
              recipients: item.recipients
            }}
            onProjectSelect={handleProjectSelectWithScroll}
            projects={projects}
            colorMode={colorMode}
            useRealData={true}
            onQuickReply={handleQuickReply}
            isExpanded={expandedMessages.has(item.id)}
            onToggleExpansion={handleToggleMessage}
            sourceSection="Messages, Tasks, & Reminders"
          />
        ));
      })()}
    </>
  );
};

export default MessagesSection;