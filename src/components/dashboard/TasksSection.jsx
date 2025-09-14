import React from 'react';
import TaskItem from '../ui/TaskItem';
import WorkflowProgressService from '../../services/workflowProgress';
import { useActivity } from '../../contexts/ActivityContext';

const TasksSection = ({
  activeCommTab,
  activityFeedItems,
  projects,
  colorMode,
  tasksProjectFilter,
  tasksUserFilter,
  showCompletedTasks,
  setShowCompletedTasks,
  handleProjectSelectWithScroll,
  availableUsers = []
}) => {
  const { state } = useActivity();
  
  if (activeCommTab !== 'tasks') {
    return null;
  }

  return (
    <>
      {(() => {
        const allTaskItems = state.items
          .filter(i => i.type === 'task')
          .filter(i => !tasksProjectFilter || String(i.projectId) === String(tasksProjectFilter))
          .filter(i => {
            if (!tasksUserFilter) return true;
            const uid = String(tasksUserFilter);
            const isAssignee = Array.isArray(i.attendees) && i.attendees.some(id => String(id) === uid);
            const isAuthor = i.authorId && String(i.authorId) === uid;
            return isAssignee || isAuthor;
          });

        // Filter based on completion status
        const taskItems = allTaskItems.filter(item => {
          const isCompleted = state.completedItems.has(item.id);
          return showCompletedTasks ? isCompleted : !isCompleted;
        });

        const completedCount = allTaskItems.filter(item => state.completedItems.has(item.id)).length;
        const activeCount = allTaskItems.length - completedCount;

        return (
          <div>
            {/* Task Summary and Toggle - Compact */}
            <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span>{activeCount} active</span>
                <span>{completedCount} completed</span>
              </div>
              <button
                onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {showCompletedTasks ? '← Show Active Tasks' : 'Show Completed Tasks →'}
              </button>
            </div>

            {taskItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {showCompletedTasks ? 'No completed tasks' : 'No active tasks'}
                </h3>
                <p className="text-gray-500">
                  {showCompletedTasks ? 'Completed tasks will appear here' : 'Tasks assigned to you will appear here'}
                </p>
              </div>
            ) : (
              <>
                {/* Task List - Using unified TaskItem component */}
                <div className="space-y-2">
                  {taskItems.map(item => (
                    <TaskItem
                      key={item.id}
                      item={item}
                      projects={projects || []}
                      colorMode={colorMode}
                      onProjectSelect={handleProjectSelectWithScroll}
                      availableUsers={availableUsers}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}
    </>
  );
};

export default TasksSection;