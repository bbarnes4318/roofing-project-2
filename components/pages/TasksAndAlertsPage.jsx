import React, { useState } from 'react';
import Modal from '../common/Modal';
import TaskCard from '../ui/TaskCard';
import { teamMembers } from '../../data/mockData';
import { TASK_FILTERS, TASK_PRIORITIES } from '../../data/constants';

const TasksAndAlertsPage = ({ tasks, projects, onAddTask, colorMode }) => {
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    assignedTo: '', 
    projectId: '', 
    alertDate: '', 
    priority: 'medium', 
    status: 'pending' 
  });

  const handleAddTask = () => {
    if (!newTask.title || !newTask.assignedTo || !newTask.alertDate) {
      alert("Please fill in all required fields (Title, Assign To, Alert Date).");
      return;
    }
    
    const taskWithId = { ...newTask, id: Date.now() };
    onAddTask(taskWithId);
    
    const assignee = teamMembers.find(tm => tm.id === taskWithId.assignedTo);
    console.log(`--- ALERT TRIGGERED ---
    An alert for the following task has been scheduled.
    An email will be sent to: ${assignee.name} (${assignee.email})
    On Date: ${taskWithId.alertDate}
    Task: ${taskWithId.title}
    Project: ${projects.find(p => p.id == taskWithId.projectId)?.name || 'General Task'}
    --- END ALERT ---`);
    
    setIsModalOpen(false);
    setNewTask({ 
      title: '', 
      description: '', 
      assignedTo: '', 
      projectId: '', 
      alertDate: '', 
      priority: 'medium', 
      status: 'pending' 
    });
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'All') return true;
    return task.status.replace('-', ' ').toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="h-full flex flex-col">
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Task">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={newTask.title} 
              onChange={e => setNewTask({...newTask, title: e.target.value})} 
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea 
              value={newTask.description} 
              onChange={e => setNewTask({...newTask, description: e.target.value})} 
              rows="3" 
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            ></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assign To <span className="text-red-500">*</span>
              </label>
              <select 
                value={newTask.assignedTo} 
                onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select Member</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Alert Date <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                value={newTask.alertDate} 
                onChange={e => setNewTask({...newTask, alertDate: e.target.value})} 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Link to Project (Optional)</label>
              <select 
                value={newTask.projectId} 
                onChange={e => setNewTask({...newTask, projectId: e.target.value})} 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">None</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select 
                value={newTask.priority} 
                onChange={e => setNewTask({...newTask, priority: e.target.value})} 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {TASK_PRIORITIES.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddTask} 
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Add Task & Alert
            </button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div className={`shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Current Alerts</h2>
            <p className={`text-xs mt-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {filteredTasks.length} active alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {filteredTasks.filter(t => t.priority === 'high').length} High Priority
            </span>
            <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {filteredTasks.filter(t => t.status === 'overdue').length} Overdue
            </span>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="border-b mb-4 flex items-center justify-between">
          <div className="flex">
            {TASK_FILTERS.map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`px-4 py-2 text-sm font-medium ${
                  filter === f 
                    ? `${colorMode ? 'border-b-2 border-blue-400 text-blue-400' : 'border-b-2 border-blue-600 text-blue-600'}` 
                    : `${colorMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`
                }`}
              >
                {f} ({f === 'All' ? filteredTasks.length : filteredTasks.filter(t => t.status.replace('-', ' ').toLowerCase() === f.toLowerCase()).length})
              </button>
            ))}
          </div>
        </div>
        
        {/* Alerts List */}
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No alerts found.</div>
          ) : (
            filteredTasks.map(task => (
              <div key={task.id} className={`${colorMode ? 'bg-[#1e293b]/80' : 'bg-white/80'} backdrop-blur-sm p-4 rounded-lg border ${colorMode ? 'border-[#3b82f6]/20' : 'border-white/20'} shadow-soft hover:shadow-medium transition-all duration-300 group relative`}>
                {/* Priority indicator bar */}
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${
                  task.priority === 'high' ? 'bg-red-500' : 
                  task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                
                {/* Status indicator */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                  task.status === 'overdue' ? 'bg-red-500' :
                  task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                
                <div className="flex justify-between items-start mb-3 pl-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'} mb-1 truncate`}>{task.title}</h3>
                    <p className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2`}>{task.description}</p>
                  </div>
                  <span className={`text-xs font-semibold ml-2 flex-shrink-0 px-2 py-1 rounded-full ${
                    task.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    `${colorMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`
                  }`}>{task.status}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pl-2">
                  <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Alert Date: {task.alertDate}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Priority:</span>
                    <span className={`
                      px-2 py-0.5 rounded-full font-semibold text-xs uppercase tracking-wide w-16 text-center
                      ${task.priority === 'high' 
                        ? 'bg-red-100 text-red-800 border border-red-300' 
                        : `${colorMode ? 'bg-gray-700 text-gray-200 border border-gray-600' : 'bg-gray-100 text-gray-700 border border-gray-300'}`
                      }
                    `}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksAndAlertsPage;
