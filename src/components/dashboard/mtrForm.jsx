import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { projectMessagesService, calendarService } from '../../services/api';
import { queryKeys } from '../../hooks/useQueryApi';
import toast from 'react-hot-toast';

const MTRForm = ({
  activeCommTab,
  colorMode,
  showMessageDropdown,
  setShowMessageDropdown,
  projects,
  availableUsers,
  subjects,
  currentUser,
  // Message form state
  newMessageProject,
  setNewMessageProject,
  newMessageSubject,
  setNewMessageSubject,
  newMessageCustomSubject,
  setNewMessageCustomSubject,
  newMessageText,
  setNewMessageText,
  newMessageRecipients,
  setNewMessageRecipients,
  // Task form state
  quickTaskSubject,
  setQuickTaskSubject,
  quickTaskDescription,
  setQuickTaskDescription,
  quickTaskDue,
  setQuickTaskDue,
  quickTaskAssignAll,
  setQuickTaskAssignAll,
  quickTaskAssigneeId,
  setQuickTaskAssigneeId,
  tasksProjectFilter,
  setTasksProjectFilter,
  // Reminder form state
  reminderTitle,
  setReminderTitle,
  reminderDescription,
  setReminderDescription,
  reminderWhen,
  setReminderWhen,
  reminderAllUsers,
  setReminderAllUsers,
  reminderUserIds,
  setReminderUserIds,
  remindersProjectFilter,
  setRemindersProjectFilter,
  // Callbacks
  setMessagesData,
  setFeed,
  uiProjects
}) => {
  const queryClient = useQueryClient();

  return (
    <div className="mb-3">
      <button
        onClick={() => setShowMessageDropdown(!showMessageDropdown)}
        className={`w-full px-2 py-1.5 text-xs font-medium border rounded-lg transition-all duration-300 flex items-center justify-between ${
          showMessageDropdown
            ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-soft' 
            : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:border-brand-400 hover:text-brand-600'
        }`}
      >
        <span>{activeCommTab === 'messages' ? '+ Add Message' : activeCommTab === 'tasks' ? '+ Add Task' : '+ Add Reminder'}</span>
        <svg className={`w-3 h-3 transition-transform ${showMessageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Messages Form */}
      {showMessageDropdown && activeCommTab === 'messages' && (
        <div className={`p-2 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const finalSubject = newMessageSubject === 'CUSTOM_SUBJECT' ? newMessageCustomSubject : newMessageSubject;
            if (newMessageProject && finalSubject && newMessageText.trim() && newMessageRecipients.length > 0) {
              // Create new message activity
              const selectedProject = projects.find(p => p.id === parseInt(newMessageProject));
              
              // Create message using the API service
              const createMessage = async () => {
                try {
                  const response = await projectMessagesService.create(newMessageProject, {
                    content: newMessageText,
                    subject: finalSubject,
                    priority: 'MEDIUM'
                  });
                  
                  if (response.success) {
                    console.log('Message saved to database:', response.data);
                    // Refresh the messages data by invalidating the query
                    queryClient.invalidateQueries(['projectMessages']);
                  } else {
                    console.error('Failed to save message to database:', response.message);
                  }
                } catch (error) {
                  console.error('Error saving message:', error);
                }
              };
              
              // Call the API to save the message
              createMessage();
              
              // Also add to local state for immediate UI update
              const newActivity = {
                id: `msg_${Date.now()}`,
                projectId: parseInt(newMessageProject),
                projectName: selectedProject?.projectName || selectedProject?.name || selectedProject?.customer?.primaryName || selectedProject?.client?.name || selectedProject?.address || 'Unknown Project',
                projectNumber: selectedProject?.projectNumber || Math.floor(Math.random() * 90000) + 10000,
                subject: finalSubject,
                description: newMessageText,
                user: 'You',
                timestamp: new Date().toISOString(),
                type: 'message',
                priority: 'medium',
                recipients: newMessageRecipients
              };
              
              // Add to messages data
              setMessagesData(prev => [newActivity, ...prev]);
              setFeed(prev => [newActivity, ...prev]);
              
              // Close dropdown and reset form
              setShowMessageDropdown(false);
              setNewMessageProject('');
              setNewMessageSubject('');
              setNewMessageCustomSubject('');
              setNewMessageText('');
              setNewMessageRecipients([]);
            }
          }} className="space-y-2">
            {/* First Row: Project and To fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  colorMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={newMessageProject}
                  onChange={(e) => setNewMessageProject(e.target.value)}
                  required
                  className={`w-full px-2 py-1 border rounded text-xs ${
                    colorMode 
                      ? 'bg-[#232b4d] border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="">Select Project</option>
                  {(projects || []).map(project => (
                    <option key={project.id} value={project.id}>
                      #{String(project.projectNumber || project.id).padStart(5, '0')} - {project.projectName || project.name || project.customer?.primaryName || project.client?.name || project.address}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  colorMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  To <span className="text-red-500">*</span>
                </label>
                <select
                  value={newMessageRecipients || ''}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setNewMessageRecipients(selectedOptions);
                  }}
                  multiple
                  required
                  className={`w-full px-2 py-1 border rounded text-xs ${
                    colorMode 
                      ? 'bg-[#232b4d] border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  <option value="all" style={{ fontWeight: 'bold' }}>All Users</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName || ''} {user.lastName ? '' : `(${user.email})`}
                    </option>
                  ))}
                </select>
                <p className={`text-[10px] mt-1 ${
                  colorMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Hold Ctrl/Cmd to select multiple recipients
                </p>
              </div>
            </div>
            
            {/* Second Row: Subject */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${
                colorMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={newMessageSubject === 'CUSTOM_SUBJECT' ? 'CUSTOM_SUBJECT' : newMessageSubject}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM_SUBJECT') {
                    setNewMessageSubject('CUSTOM_SUBJECT');
                  } else {
                    setNewMessageSubject(e.target.value);
                  }
                }}
                required
                className={`w-full px-2 py-1 border rounded text-xs mb-2 ${
                  colorMode 
                    ? 'bg-[#232b4d] border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="">Select Subject</option>
                <option value="CUSTOM_SUBJECT">+ Add Custom Subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              
              {newMessageSubject === 'CUSTOM_SUBJECT' && (
                <input
                  type="text"
                  placeholder="Enter custom subject..."
                  value={newMessageCustomSubject || ''}
                  onChange={(e) => setNewMessageCustomSubject(e.target.value)}
                  className={`w-full px-2 py-1 border rounded text-xs ${
                    colorMode 
                      ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                />
              )}
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-1 ${
                colorMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Enter your message here..."
                required
                rows={2}
                className={`w-full px-2 py-1 border rounded text-xs resize-none ${
                  colorMode 
                    ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
              />
            </div>
            
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowMessageDropdown(false);
                  setNewMessageProject('');
                  setNewMessageSubject('');
                  setNewMessageCustomSubject('');
                  setNewMessageText('');
                  setNewMessageRecipients([]);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                  colorMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newMessageProject || !(newMessageSubject === 'CUSTOM_SUBJECT' ? newMessageCustomSubject : newMessageSubject) || !newMessageText.trim() || newMessageRecipients.length === 0}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  newMessageProject && (newMessageSubject === 'CUSTOM_SUBJECT' ? newMessageCustomSubject : newMessageSubject) && newMessageText.trim() && newMessageRecipients.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks Form */}
      {showMessageDropdown && activeCommTab === 'tasks' && (
        <div className={`p-2 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!quickTaskSubject.trim() || !quickTaskDue) return;
            try {
              // Create as calendar DEADLINE event; project optional
              const payload = {
                title: quickTaskSubject.trim(),
                description: quickTaskDescription || '',
                startTime: quickTaskDue,
                endTime: quickTaskDue,
                eventType: 'DEADLINE',
                organizerId: currentUser?.id,
                projectId: tasksProjectFilter || undefined,
                attendees: quickTaskAssignAll ? availableUsers.map(u => ({ userId: u.id })) : (quickTaskAssigneeId ? [{ userId: quickTaskAssigneeId }] : [])
              };
              const res = await calendarService.create(payload);
              // Invalidate events so the task appears
              queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents });
              // Add to activity feed immediately
              // Determine assigned user for display
              let assignedToDisplay = 'Unassigned';
              if (quickTaskAssignAll) {
                assignedToDisplay = 'All Users';
              } else if (quickTaskAssigneeId) {
                const assignedUser = availableUsers.find(u => String(u.id) === String(quickTaskAssigneeId));
                if (assignedUser) {
                  assignedToDisplay = `${assignedUser.firstName} ${assignedUser.lastName}`;
                }
              }
              
              setFeed(prev => [{
                id: `cal_${Date.now()}`,
                type: 'task',
                authorId: currentUser?.id || null,
                author: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
                assignedTo: assignedToDisplay,
                assigneeId: quickTaskAssigneeId || null,
                assignedToAll: quickTaskAssignAll || false,
                projectId: tasksProjectFilter || null,
                projectName: (projects.find(p => String(p.id) === String(tasksProjectFilter)) || {}).projectName || null,
                subject: quickTaskSubject.trim(),
                content: quickTaskDescription || '',
                timestamp: quickTaskDue
              }, ...prev]);
              // Confirmation
              toast.success('Task created successfully');
              // Reset
              setQuickTaskSubject(''); setQuickTaskDescription(''); setQuickTaskDue(''); setQuickTaskAssignAll(false); setQuickTaskAssigneeId(''); setTasksProjectFilter('');
            } catch (err) {
              console.error('Failed to create task:', err);
              toast.error('Failed to create task');
            }
          }} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Project</label>
                <select 
                  value={tasksProjectFilter || ''} 
                  onChange={(e) => setTasksProjectFilter(e.target.value)} 
                  className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                >
                  <option value="">General (No Project)</option>
                  {(uiProjects || []).map(p => (
                    <option key={p.id} value={p.id}>
                      #{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject <span className="text-red-500">*</span></label>
                <input value={quickTaskSubject} onChange={(e)=>setQuickTaskSubject(e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} placeholder="Task subject" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Due <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={quickTaskDue} onChange={(e)=>setQuickTaskDue(e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Assign To</label>
                <select value={quickTaskAssigneeId} onChange={(e)=>{ setQuickTaskAssigneeId(e.target.value); setQuickTaskAssignAll(false); }} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}>
                  <option value="">Unassigned</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName || ''} {u.lastName ? '' : `(${u.email})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
              <textarea value={quickTaskDescription} onChange={(e)=>setQuickTaskDescription(e.target.value)} rows={2} className={`w-full px-2 py-1 border rounded text-xs resize-none ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} />
            </div>
            <div className="flex items-center">
              <label className={`text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <input type="checkbox" className="mr-1" checked={quickTaskAssignAll} onChange={(e)=>{ setQuickTaskAssignAll(e.target.checked); if (e.target.checked) setQuickTaskAssigneeId(''); }} /> Send to all users
              </label>
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button type="button" onClick={()=>{ setShowMessageDropdown(false); setQuickTaskSubject(''); setQuickTaskDescription(''); setQuickTaskDue(''); setQuickTaskAssignAll(false); setQuickTaskAssigneeId(''); setTasksProjectFilter(''); }} className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${colorMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
              <button type="submit" disabled={!quickTaskSubject.trim() || !quickTaskDue} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${quickTaskSubject.trim() && quickTaskDue ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Create Task</button>
            </div>
          </form>
        </div>
      )}

      {/* Reminders Form */}
      {showMessageDropdown && activeCommTab === 'reminders' && (
        <div className={`p-2 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!reminderTitle.trim() || !reminderWhen) return;
            try {
              const payload = {
                title: reminderTitle.trim(),
                description: reminderDescription || '',
                startTime: reminderWhen,
                endTime: reminderWhen,
                eventType: 'REMINDER',
                organizerId: currentUser?.id,
                projectId: remindersProjectFilter || undefined,
                attendees: reminderAllUsers ? availableUsers.map(u => ({ userId: u.id })) : (reminderUserIds.length ? reminderUserIds.map(id => ({ userId: id })) : [])
              };
              const res = await calendarService.create(payload);
              // Invalidate events so the reminder appears
              queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents });
              // Add to activity feed immediately
              setFeed(prev => [{
                id: `cal_${Date.now()}`,
                type: 'reminder',
                authorId: currentUser?.id || null,
                author: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
                projectId: remindersProjectFilter || null,
                projectName: (projects.find(p => String(p.id) === String(remindersProjectFilter)) || {}).projectName || null,
                subject: reminderTitle.trim(),
                content: reminderDescription || '',
                timestamp: reminderWhen
              }, ...prev]);
              toast.success('Reminder created successfully');
              setReminderTitle(''); setReminderDescription(''); setReminderWhen(''); setReminderAllUsers(false); setReminderUserIds([]);
            } catch (err) {
              console.error('Failed to create reminder:', err);
              toast.error('Failed to create reminder');
            }
          }} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Title <span className="text-red-500">*</span></label>
                <input value={reminderTitle} onChange={(e)=>setReminderTitle(e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} placeholder="Reminder title" />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>When <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={reminderWhen} onChange={(e)=>setReminderWhen(e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
              <textarea value={reminderDescription} onChange={(e)=>setReminderDescription(e.target.value)} rows={2} className={`w-full px-2 py-1 border rounded text-xs resize-none ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Recipients</label>
                <select multiple value={reminderUserIds} onChange={(e)=>setReminderUserIds(Array.from(e.target.selectedOptions, o => o.value))} className={`w-full px-2 py-1 border rounded text-xs ${colorMode ? 'bg-[#232b4d] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`} style={{ minHeight: '40px' }}>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
                <p className={`text-[10px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Hold Ctrl/Cmd to select multiple recipients</p>
              </div>
              <div className="flex items-end">
                <label className={`text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input type="checkbox" className="mr-1" checked={reminderAllUsers} onChange={(e)=>{ setReminderAllUsers(e.target.checked); if (e.target.checked) setReminderUserIds([]); }} /> Send to all users
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button type="button" onClick={()=>{ setShowMessageDropdown(false); setReminderTitle(''); setReminderDescription(''); setReminderWhen(''); setReminderAllUsers(false); setReminderUserIds([]); }} className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${colorMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
              <button type="submit" disabled={!reminderTitle.trim() || !reminderWhen} className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${reminderTitle.trim() && reminderWhen ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Create Reminder</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MTRForm;