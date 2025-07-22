import React, { useState } from 'react';
import { ClockIcon, ChartBarIcon, LocationMarkerIcon, ClipboardDocumentCheckIcon, ChevronLeftIcon } from '../common/Icons';

const TaskDetailPage = ({ task, onBack, onUpdate }) => {
    const [editedTask, setEditedTask] = useState(task);

    const handleStatusChange = (newStatus) => {
        const updatedTask = { ...editedTask, status: newStatus };
        setEditedTask(updatedTask);
        onUpdate(updatedTask);
    };

    const handlePriorityChange = (newPriority) => {
        const updatedTask = { ...editedTask, priority: newPriority };
        setEditedTask(updatedTask);
        onUpdate(updatedTask);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
            case 'in_progress': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
            case 'pending': return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
            default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
            case 'medium': return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
            case 'low': return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
            default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
        }
    };

    return (
        <div className="h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft border border-white/20">
            <div className="p-8 border-b border-gray-100/50 bg-gradient-to-r from-white to-gray-50/50 rounded-t-2xl">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/60 rounded-xl transition-all duration-200"
                    >
                        <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-1">Task Details</h1>
                        <p className="text-gray-600 text-lg font-medium">Manage task information and progress</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(editedTask.status)}`}>
                        {editedTask.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getPriorityColor(editedTask.priority)}`}>
                        {editedTask.priority.toUpperCase()} PRIORITY
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Task Title and Description */}
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-soft border border-white/20">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">{editedTask.title}</h2>
                        <p className="text-gray-600 text-lg leading-relaxed">{editedTask.description}</p>
                    </div>

                    {/* Task Information Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-soft border border-white/20">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">Task Information</h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="p-2 bg-primary-100 rounded-lg">
                                        <ClockIcon className="w-6 h-6 text-primary-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-600">Due Date</p>
                                        <p className="text-lg font-bold text-gray-800">{new Date(editedTask.dueDate || editedTask.alertDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="p-2 bg-primary-100 rounded-lg">
                                        <ChartBarIcon className="w-6 h-6 text-primary-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-600">Progress</p>
                                        <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                                            <div 
                                                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm" 
                                                style={{ width: `${editedTask.progress || 0}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-sm font-bold text-primary-600 mt-1">{editedTask.progress || 0}% Complete</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="p-2 bg-primary-100 rounded-lg">
                                        <LocationMarkerIcon className="w-6 h-6 text-primary-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-600">Location</p>
                                        <p className="text-lg font-bold text-gray-800">{editedTask.location || 'Project Site'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-soft border border-white/20">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">Project Details</h3>
                            <div className="space-y-6">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-sm font-semibold text-gray-600 mb-1">Project Name</p>
                                    <p className="text-lg font-bold text-gray-800">{editedTask.project || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-sm font-semibold text-gray-600 mb-1">Assigned To</p>
                                    <p className="text-lg font-bold text-gray-800">{editedTask.assignedTo || 'Unassigned'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-sm font-semibold text-gray-600 mb-1">Created By</p>
                                    <p className="text-lg font-bold text-gray-800">{editedTask.createdBy || 'System'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Task Actions */}
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-soft border border-white/20">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Task Actions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <p className="text-sm font-semibold text-gray-600 mb-4">Update Status</p>
                                <div className="flex flex-wrap gap-3">
                                    {['pending', 'in_progress', 'completed'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(status)}
                                            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                                editedTask.status === status
                                                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-medium'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-soft'
                                            }`}
                                        >
                                            {status.replace('_', ' ').toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-600 mb-4">Change Priority</p>
                                <div className="flex flex-wrap gap-3">
                                    {['low', 'medium', 'high'].map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={() => handlePriorityChange(priority)}
                                            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                                editedTask.priority === priority
                                                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-medium'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-soft'
                                            }`}
                                        >
                                            {priority.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Task Notes */}
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-soft border border-white/20">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Notes & Comments</h3>
                        <div className="space-y-6">
                            {editedTask.notes?.length > 0 ? editedTask.notes.map((note, index) => (
                                <div key={index} className="border-b border-gray-200 pb-6 last:border-0">
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="font-semibold text-gray-800">{note.author}</p>
                                        <p className="text-sm text-gray-500">{new Date(note.timestamp).toLocaleString()}</p>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">{note.content}</p>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-gray-400">
                                    <ClipboardDocumentCheckIcon className="w-8 h-8 mx-auto mb-2" />
                                    <p>No notes yet. Add your first comment!</p>
                                </div>
                            )}
                            <div className="mt-6">
                                <textarea
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                    placeholder="Add a note or comment..."
                                    rows="4"
                                ></textarea>
                                <button className="mt-3 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 font-semibold shadow-soft hover:shadow-medium">
                                    Add Note
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailPage; 