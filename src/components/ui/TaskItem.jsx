import React from 'react';
import WorkflowProgressService from '../../services/workflowProgress';
import { useActivity } from '../../contexts/ActivityContext';

const TaskItem = ({ 
  item, 
  projects, 
  colorMode, 
  onProjectSelect 
}) => {
  const { state, actions } = useActivity();
  
  const isCompleted = state.completedItems.has(item.id);
  const isExpanded = state.expandedItems.has(item.id);
  const project = projects?.find(p => p && p.id === item.projectId);
  const projectNumber = project?.projectNumber || item.projectNumber || '12345';
  const primaryCustomer = project?.customer?.primaryName || project?.client?.name || project?.clientName || project?.projectName || item.projectName || 'Primary Customer';
  const subject = item.subject || 'Task';

  const handleToggleExpanded = () => {
    actions.toggleExpanded(item.id);
  };

  const handleToggleCompleted = (e) => {
    e.stopPropagation();
    actions.toggleCompleted(item.id);
  };

  const handleAddComment = () => {
    const commentText = state.newCommentText[item.id];
    if (commentText?.trim()) {
      const comment = {
        id: Date.now(),
        text: commentText.trim(),
        user: 'Current User', // This should come from auth context
        timestamp: new Date().toISOString()
      };
      actions.addComment(item.id, comment);
    }
  };

  const handleCommentTextChange = (e) => {
    actions.updateCommentText(item.id, e.target.value);
  };

  return (
    <div className={`bg-white hover:bg-gray-50 border-gray-200 rounded-[12px] shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer ${isCompleted ? 'opacity-75' : ''}`}>
      {/* Main task header - Strict Two-Column Layout */}
      <div 
        className="flex items-start gap-1.5 p-1"
        onClick={handleToggleExpanded}
      >
        {/* Phase Circle - Dynamic based on project association */}
        {(() => {
          // Check if task is tied to a project
          const isProjectTask = item.projectId && project;
          
          if (isProjectTask) {
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
            // No project - use orange T
            return (
              <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start">
                T
              </div>
            );
          }
        })()}
        
        {/* COLUMN 1: Main content (flexible width) */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Project# or General | Customer | Subject */}
          <div className="flex items-baseline overflow-hidden relative">
            <div className="flex items-center min-w-0 flex-1">
              {/* Project Number or General - Fixed width for alignment */}
              {item.projectId && project ? (
                <button
                  className="text-[9px] font-bold transition-colors hover:underline flex-shrink-0 text-blue-600 hover:text-blue-800"
                  style={{ width: '46px', marginLeft: '-6px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onProjectSelect) {
                      onProjectSelect(project, 'Project Profile', null, 'Messages, Tasks, & Reminders');
                    }
                  }}
                >
                  {projectNumber}
                </button>
              ) : (
                <span className="text-[9px] font-bold text-gray-600" style={{ width: '46px', marginLeft: '2px' }}>
                  General
                </span>
              )}
              
              {/* Primary Customer - Only show if project exists */}
              {item.projectId && project && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold transition-colors truncate text-gray-700 hover:text-gray-800" style={{ maxWidth: '80px' }}>
                    {primaryCustomer}
                  </span>
                </div>
              )}
              
              {/* Subject - Fixed position with proper truncation */}
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
          
          {/* Row 2: From, To */}
          <div className="flex items-baseline gap-0 -mt-0.5 overflow-hidden relative">
            <div className="flex items-baseline gap-0">
              {/* From - Fixed width container for consistent spacing */}
              <div className="flex-shrink-0" style={{ width: '100px', marginLeft: '2px' }}>
                <span className="text-[9px] font-medium whitespace-nowrap text-gray-600">
                  From: {item.author}
                </span>
              </div>
              
              {/* To - Fixed position to match Subject exactly */}
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
                  To: {item.assignedTo || item.recipient || item.author}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Fixed width, right-aligned elements - 2 ROWS ONLY */}
        <div className="flex flex-col justify-between items-end" style={{ width: '80px', minHeight: '32px', marginRight: '20px' }}>
          {/* Row 1: Checkbox and Task label */}
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
              Task
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
      
      {/* Dropdown section - Task content when expanded */}
      {isExpanded && (
        <div className="px-3 py-3 border-t bg-gray-50 border-gray-200">
          <div className="space-y-3">
            {/* Task content */}
            {item.content && (
              <div className="text-sm text-gray-800 leading-relaxed bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                {item.content}
              </div>
            )}
            
            {/* Comments Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Comments</h4>
              
              {/* Existing Comments */}
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {state.comments[item.id] && state.comments[item.id].length > 0 ? (
                  state.comments[item.id].map(comment => (
                    <div key={comment.id} className="bg-gray-50 p-2 rounded border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-gray-700">
                            Comment by: {comment.user}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {comment.text}
                          </p>
                        </div>
                        <span className="text-[9px] text-gray-400 ml-2">
                          {new Date(comment.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No comments yet</p>
                )}
              </div>
              
              {/* Add Comment Form */}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={state.newCommentText[item.id] || ''}
                    onChange={handleCommentTextChange}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddComment();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!state.newCommentText[item.id]?.trim()}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      state.newCommentText[item.id]?.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
              {item.projectId && project && (
                <button
                  onClick={() => {
                    if (onProjectSelect) {
                      onProjectSelect(project, 'Project Profile', null, 'Activity Feed');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Project
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItem;
