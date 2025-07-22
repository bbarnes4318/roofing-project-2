import React from 'react';
import { getStatusStyles, getPriorityStyles } from '../../utils/helpers';

const TaskCard = ({ task, project, assignee }) => (
  <div className={`p-4 rounded-lg flex items-center justify-between ${getPriorityStyles(task.priority)} bg-gray-50`}>
    <div className="flex-1">
      <p className="font-semibold text-gray-900">{task.title}</p>
      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
        <span>To: <strong>{assignee?.name || 'N/A'}</strong></span>
        {project && <span>Project: <strong>{project.name}</strong></span>}
        <span>Alert Date: <strong>{task.alertDate}</strong></span>
      </div>
    </div>
    <div className="text-right">
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${getStatusStyles(task.status)}`}>
        {task.status}
      </span>
      <button className="text-sm mt-2 block w-full bg-white border border-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-lg hover:bg-gray-100">
        Details
      </button>
    </div>
  </div>
);

export default TaskCard;
