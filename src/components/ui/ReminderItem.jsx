import React from 'react';
import WorkflowProgressService from '../../services/workflowProgress';
import { useActivity } from '../../contexts/ActivityContext';

const ReminderItem = ({ 
  item, 
  projects, 
  colorMode, 
  onProjectSelect,
  availableUsers = []
}) => {
  const { state, actions } = useActivity();
  
  const isCompleted = state.completedItems.has(item.id);
  const isExpanded = state.expandedItems.has(item.id);
  const project = projects?.find(p => p && p.id === item.projectId);
  const projectNumber = project?.projectNumber || item.projectNumber || '12345';
  const primaryCustomer = project?.customer?.primaryName || project?.client?.name || project?.clientName || project?.projectName || item.projectName || 'Primary Customer';
  const subject = item.subject || item.title || 'Reminder';
  const author = availableUsers.find(u => String(u.id) === String(item.authorId)) || { firstName: 'System', lastName: 'Admin' };
  const recipients = Array.isArray(item.recipients) ? 
    item.recipients.map(id => {
      if (id === 'all') return { firstName: 'All', lastName: 'Users', isAll: true };
      return availableUsers.find(u => String(u.id) === String(id));
    }).filter(Boolean) : [];

  const handleToggleExpanded = () => {
    actions.toggleExpanded(item.id);
  };

  const handleToggleCompleted = (e) => {
    e.stopPropagation();
    actions.toggleCompleted(item.id);
  };

  const handleAddComment = () => {
    const commentText = state.commentInputs[item.id];
    if (commentText?.trim()) {
      const comment = {
        id: Date.now(),
        content: commentText.trim(),
        userName: 'Current User', // This should come from auth context
        createdAt: new Date().toISOString()
      };
      actions.addComment(item.id, comment);
    }
  };

  const handleCommentTextChange = (e) => {
    actions.setCommentInputs(item.id, e.target.value);
  };

  const toggleCommentInput = () => {
    actions.setShowCommentInput(item.id, !state.showCommentInput[item.id]);
  };

  return (
    <div className="bg-white hover:bg-gray-50 border-gray-200 rounded-[12px] shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer">
      {/* Main reminder header - Strict Two-Column Layout */}
      <div 
        className="flex items-start gap-1.5 p-1"
        onClick={handleToggleExpanded}
      >
        {/* Phase Circle - Dynamic based on project association */}
        {(() => {
          // Check if reminder is tied to a project
          const isProjectReminder = item.projectId && project;
          
          if (isProjectReminder) {
            // Get project phase and colors
            const projectPhase = WorkflowProgressService.getProjectPhase(project);
            const phaseInitial = WorkflowProgressService.getPhaseInitials(projectPhase);
            const phaseColor = WorkflowProgressService.getPhaseColor(projectPhase);
            
            return (
              <div 
                className="w-5 h-5 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start"
                style={{ backgroundColor: phaseColor }}
              >
                {phaseInitial}
              </div>
            );
          } else {
            // No project - use orange R for reminder
            return (
              <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start">
                R
              </div>
            );
          }
        })()}
        
        {/* COLUMN 1: Main content (flexible width) */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Project# or General | Customer | Subject */}
          <div className="flex items-baseline overflow-hidden relative">
            <div className="flex items-center min-w-0 flex-1">
              {/* Project Number or General Reminder - Fixed width for alignment */}
              {item.projectId && project ? (
                <button
                  className="text-[9px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex-shrink-0"
                  style={{ width: '46px', marginLeft: '2px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onProjectSelect) {
                      onProjectSelect(project, 'Project Profile', null, 'Messages, Tasks, & Reminders');
                    }
                  }}
                >
                  {projectNumber ? `#${String(projectNumber).padStart(5, '0')}` : '#00000'}
                </button>
              ) : (
                <span className="text-[9px] font-bold text-gray-600" style={{ width: '46px', marginLeft: '10px' }}>
                  General
                </span>
              )}
              
              {/* Customer Name - Dynamic width */}
              <div className="flex items-center min-w-0 mx-1.5">
                {item.projectId && project && (
                  <>
                    <span className="text-[9px] font-bold text-gray-700 truncate flex-shrink-0" style={{ maxWidth: '120px' }}>
                      {primaryCustomer}
                    </span>
                    <span className="mx-1.5 text-[9px] text-gray-400 flex-shrink-0">|</span>
                  </>
                )}
                
                {/* Subject - Fixed position to align with To field */}
                <div style={{ position: 'absolute', left: '140px', width: '160px' }}>
                  <span 
                    className="text-[9px] font-medium text-gray-600 truncate"
                    style={{ 
                      display: 'inline-block',
                      verticalAlign: 'baseline',
                      lineHeight: '1',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%'
                    }}
                  >
                    Subject: {subject}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 2: From and To - matching Messages tab exactly */}
          <div className="flex items-baseline gap-0 -mt-0.5 overflow-hidden relative">
            <div className="flex items-baseline gap-0">
              {/* From - Fixed width container for consistent spacing */}
              <div className="flex-shrink-0" style={{ width: '100px', marginLeft: '10px' }}>
                <span className="text-[9px] font-medium whitespace-nowrap text-gray-600">
                  From: {author.firstName} {author.lastName}
                </span>
              </div>
              
              {/* To - Fixed position to match Subject exactly */}
              <div style={{ position: 'absolute', left: '140px', width: '200px' }}>
                <span className="text-[9px] font-medium whitespace-nowrap text-gray-600" style={{ display: 'inline-block', verticalAlign: 'baseline', lineHeight: '1' }}>
                  To: {recipients.length > 0 ? (
                    recipients[0].isAll ? 'All Users' : `${recipients[0].firstName} ${recipients[0].lastName}`
                  ) : 'No recipients'}
                  {recipients.length > 1 && !recipients[0].isAll && (
                    <span className="text-[7px] bg-orange-100 text-orange-700 px-1 py-0.5 rounded-full font-medium ml-1">
                      +{recipients.length - 1}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Fixed width, right-aligned elements - 2 ROWS ONLY */}
        <div className="flex flex-col justify-between items-end" style={{ width: '80px', minHeight: '32px', marginRight: '20px' }}>
          {/* Row 1: Checkbox and Reminder label */}
          <div className="flex items-center gap-1" style={{ marginRight: '20px' }}>
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={handleToggleCompleted}
              onClick={handleToggleCompleted}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
            />
            
            {/* Type Label */}
            <span className="text-[8px] font-bold text-orange-500">
              Reminder
            </span>
          </div>
          
          {/* Row 2: Timestamp and dropdown arrow */}
          <div className="flex items-center gap-1">
            {/* Timestamp */}
            <span className="text-[8px] whitespace-nowrap text-gray-500">
              {new Date(item.timestamp).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
              }) + ', ' + new Date(item.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
            
            {/* Dropdown arrow - expand/collapse indicator */}
            <div className={`p-1 rounded transition-colors transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-gray-600`}>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
          {/* Reminder content */}
          {item.content && (
            <div className="mb-3">
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.content}
              </p>
            </div>
          )}
          
          {/* Comments Section */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-semibold text-gray-700">Comments</h4>
              <button 
                onClick={toggleCommentInput}
                className="text-[9px] text-blue-600 hover:text-blue-700 font-medium"
              >
                {state.showCommentInput[item.id] ? 'Cancel' : 'Add Comment'}
              </button>
            </div>
            
            {/* Comments list */}
            {state.comments[item.id] && state.comments[item.id].length > 0 && (
              <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                {state.comments[item.id].map((comment, idx) => (
                  <div key={idx} className="bg-gray-50 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[9px] font-semibold text-gray-700">
                        Comment by: {comment.userName || 'Unknown User'}
                      </span>
                      <span className="text-[8px] text-gray-500">
                        • {new Date(comment.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Comment input */}
            {state.showCommentInput[item.id] && (
              <div className="mt-2">
                <textarea
                  value={state.commentInputs[item.id] || ''}
                  onChange={handleCommentTextChange}
                  placeholder="Type your comment here..."
                  className="w-full px-2 py-1 text-[10px] border border-gray-200 rounded resize-none focus:outline-none focus:border-blue-400"
                  rows={2}
                />
                <div className="flex justify-end gap-1 mt-1">
                  <button
                    onClick={() => {
                      actions.setShowCommentInput(item.id, false);
                      actions.setCommentInputs(item.id, '');
                    }}
                    className="px-2 py-1 text-[9px] text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!state.commentInputs[item.id]?.trim()}
                    className="px-2 py-1 text-[9px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          {onProjectSelect && item.projectId && project && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onProjectSelect) {
                    onProjectSelect(project, 'Project Profile', null, 'Messages, Tasks, & Reminders');
                  }
                }}
                className="text-[8px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
              >
                View Project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReminderItem;
