import React, { useState } from 'react';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
// import { teamMembers } from '../../data/mockData';
import { ACTIVITY_FEED_SUBJECTS } from '../../data/constants';

const mockCoworkers = [
  { id: 1, name: 'Sarah Owner', status: 'online' },
  { id: 2, name: 'Mike Field', status: 'offline' },
  { id: 3, name: 'Emily Project Manager', status: 'online' },
  { id: 4, name: 'Carlos Crew Lead', status: 'offline' },
];

const initialChats = {
  1: [
    { fromMe: false, text: 'Hey Sarah, can you review the new project docs?', timestamp: new Date().toLocaleString() },
    { fromMe: true, text: 'Sure, I will check them out today.', timestamp: new Date().toLocaleString() },
    { fromMe: false, text: 'Great! I\'ve uploaded them to the shared drive.', timestamp: new Date().toLocaleString() },
    { fromMe: true, text: 'Perfect, I\'ll take a look this afternoon.', timestamp: new Date().toLocaleString() },
    { fromMe: false, text: 'Let me know if you need any clarification on the specifications.', timestamp: new Date().toLocaleString() },
    { fromMe: true, text: 'Will do! I should have feedback by tomorrow morning.', timestamp: new Date().toLocaleString() },
    { fromMe: false, text: 'Thanks Sarah, appreciate your quick turnaround.', timestamp: new Date().toLocaleString() },
    { fromMe: true, text: 'No problem at all! Happy to help.', timestamp: new Date().toLocaleString() },
    { fromMe: false, text: 'Also, don\'t forget about the team meeting at 3 PM.', timestamp: new Date().toLocaleString() },
    { fromMe: true, text: 'Got it! I\'ll be there. Thanks for the reminder.', timestamp: new Date().toLocaleString() },
  ],
  2: [
    { fromMe: false, text: 'Mike, how\'s the weather looking for tomorrow?', timestamp: new Date().toLocaleString() },
    { fromMe: true, text: 'Clear skies, perfect for the roof work.', timestamp: new Date().toLocaleString() },
  ],
  3: [
    { fromMe: false, text: 'Emily, can you update the project timeline?', timestamp: new Date().toLocaleString() },
    { fromMe: true, text: 'Already done! Check the shared calendar.', timestamp: new Date().toLocaleString() },
  ],
  4: [
    { fromMe: false, text: 'Carlos, the crew is ready for the next phase.', timestamp: new Date().toLocaleString() },
    { fromMe: true, text: 'Excellent! I\'ll coordinate with the materials team.', timestamp: new Date().toLocaleString() },
  ],
};

const ActivityFeedPage = ({ activities, projects, onProjectSelect, onAddActivity, colorMode }) => {
    const [tab, setTab] = useState('feed');
    const [message, setMessage] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    
    // Alert functionality state
    const [sendAsAlert, setSendAsAlert] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [alertPriority, setAlertPriority] = useState('low');
    
    // Direct message state
    const [selectedCoworkerId, setSelectedCoworkerId] = useState(mockCoworkers[0].id);
    const [dmInput, setDmInput] = useState('');
    const [chats, setChats] = useState(initialChats);


    // Filter activities to show only user-assigned activities (assuming current user is 'Sarah Owner')
    const currentUser = 'Sarah Owner';
    const userAssignedActivities = activities.filter(activity => 
        activity.author === currentUser || 
        activity.assignedTo === currentUser ||
        activity.projectManager === currentUser ||
        activity.accountManager === currentUser
    );

    const handlePost = () => {
        if (!message) return;
        
        if (sendAsAlert) {
            // Create alert
            if (selectedUsers.length === 0) {
                alert('Please select at least one user for the alert.');
                return;
            }
            
            console.log('Creating project messages alert:', {
                title: selectedSubject,
                message: message,
                projectId: selectedProjectId,
                priority: alertPriority,
                assignedUsers: selectedUsers
            });
            // TODO: Send alert to backend API
        }
        
        const project = projects.find(p => p.id === parseInt(selectedProjectId));
        onAddActivity(project, message, selectedSubject);
        setMessage('');
        setSelectedProjectId('');
        setSelectedSubject('');
        setSendAsAlert(false);
        setSelectedUsers([]);
        setAlertPriority('low');
    };

    // Quick reply handler
    const handleQuickReply = (replyData) => {
        console.log('Quick reply data:', replyData);
        
        // Find the project for the reply
        const project = projects.find(p => p.id === replyData.projectId);
        
        if (project && onAddActivity) {
            // Add the quick reply as a new activity
            onAddActivity(project, replyData.message, replyData.subject);
        }
        
        // Optional: Show success feedback
        // You could add a toast notification here
    };
    
    const resetCompose = () => { 
        setMessage(''); 
        setSelectedProjectId(''); 
        setSelectedSubject(''); 
        setSendAsAlert(false);
        setSelectedUsers([]);
        setAlertPriority('low');
    };

    // Helper functions for user selection
    const handleUserToggle = (userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const selectAllUsers = () => {
        setSelectedUsers([]);
    };

    const clearAllUsers = () => {
        setSelectedUsers([]);
    };

    const handleSendDM = () => {
      if (!dmInput) return;
      setChats(prev => ({
        ...prev,
        [selectedCoworkerId]: [
          ...(prev[selectedCoworkerId] || []),
          { fromMe: true, text: dmInput, timestamp: new Date().toLocaleString() },
        ],
      }));
      setDmInput('');
    };

    // Filter activities based on selected subject
    const filteredActivities = selectedSubject 
        ? userAssignedActivities.filter(activity => activity.subject === selectedSubject)
        : userAssignedActivities;

    return (
        <div className="w-full max-w-full m-0 p-0">
            {/* Tabs */}
            <div className="flex gap-2 m-0 p-0">
              <button
                className={`px-2 py-1 rounded-t-lg font-semibold text-[8px] transition-all duration-150 ${tab === 'feed' ? (colorMode ? 'bg-[#232b4d] text-white' : 'bg-blue-600 text-white') : (colorMode ? 'bg-[#181f3a] text-gray-300' : 'bg-gray-100 text-gray-700')}`}
                onClick={() => setTab('feed')}
              >
                Project Messages
              </button>
              <button
                className={`px-2 py-1 rounded-t-lg font-semibold text-[8px] transition-all duration-150 ${tab === 'dm' ? (colorMode ? 'bg-[#232b4d] text-white' : 'bg-blue-600 text-white') : (colorMode ? 'bg-[#181f3a] text-gray-300' : 'bg-gray-100 text-gray-700')}`}
                onClick={() => setTab('dm')}
              >
                Direct Messages
              </button>
            </div>

            {/* Project Messages Tab */}
            {tab === 'feed' && (
              <>
                <div className={`${colorMode ? 'bg-[#0f172a] text-white' : 'bg-white text-gray-800'} shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 mb-4`}>
                    <div>
                        <h1 className={`font-bold text-[9px] leading-tight ${colorMode ? 'text-white' : 'text-[#2D3748]'}`}>My Project Messages</h1>
                        <div className={`border-b mt-1 mb-2 ${colorMode ? 'border-gray-600' : 'border-[#E2E8F0]'}`} />
                        <p className={`mt-1 mb-2 text-[7px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>Your project conversations and updates from all projects.</p>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-[7px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
                            <select 
                                value={selectedProjectId} 
                                onChange={(e) => setSelectedProjectId(e.target.value)} 
                                className={`text-[7px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                    colorMode 
                                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                            >
                                <option value="">All Projects</option>
                                {(projects || []).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            
                            <select 
                                value={selectedSubject} 
                                onChange={(e) => setSelectedSubject(e.target.value)} 
                                className={`text-[7px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                    colorMode 
                                        ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                            >
                                <option value="">All Subjects</option>
                                {ACTIVITY_FEED_SUBJECTS.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Activity Count */}
                    {filteredActivities.filter(a => new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length > 0 && (
                        <div className={`mb-2 p-1 rounded ${colorMode ? 'bg-blue-900/20 border border-blue-700/30' : 'bg-blue-50 border border-blue-200'}`}>
                            <p className={`text-[7px] ${colorMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                <strong>{filteredActivities.filter(a => new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}</strong> new activities in the last 24 hours
                            </p>
                        </div>
                    )}

                    {/* Activity List */}
                    <div className="space-y-1">
                        {filteredActivities.length === 0 ? (
                            <div className={`text-center py-3 text-[7px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                No assigned activities found. {selectedSubject && `Try selecting a different subject or project.`}
                            </div>
                        ) : filteredActivities.map((activity) => (
                            <ProjectMessagesCard 
                                key={activity.id} 
                                activity={activity} 
                                onProjectSelect={onProjectSelect}
                                projects={projects}
                                colorMode={colorMode}
                                onQuickReply={handleQuickReply}
                            />
                        ))}
                    </div>

                    {/* Composer always at the bottom with full height allowance */}
                    <div className={`p-3 mt-4 rounded border ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                    <label className={`block text-[7px] font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Project
                                    </label>
                                    <select 
                                        value={selectedProjectId} 
                                        onChange={(e) => setSelectedProjectId(e.target.value)} 
                                        className={`w-full p-1 border rounded text-[7px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300'}`}
                                    >
                                        <option value="">All Projects</option>
                                        {(projects || []).map(project => (
                                            <option key={project.id || project._id} value={(project.id || project._id || '').toString()}>{project.name || project.projectName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-[7px] font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Subject
                                    </label>
                                    <select 
                                        value={selectedSubject} 
                                        onChange={(e) => setSelectedSubject(e.target.value)} 
                                        className={`w-full p-1 border rounded text-[7px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300'}`}
                                    >
                                        <option value="">All Subjects</option>
                                        {ACTIVITY_FEED_SUBJECTS.map(subject => (
                                            <option key={subject} value={subject}>{subject}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className={`block text-[7px] font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Message
                                </label>
                                <textarea 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    placeholder="Write your update here..." 
                                    className={`w-full p-1 border rounded text-[7px] resize-none ${colorMode ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'}`}
                                    rows="2"
                                />
                            </div>
                            
                            {/* Alert functionality */}
                            <div className="mt-2 space-y-2">
                                {/* Send as Alert checkbox */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="sendAsAlert"
                                        checked={sendAsAlert}
                                        onChange={(e) => setSendAsAlert(e.target.checked)}
                                        className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                    />
                                    <label htmlFor="sendAsAlert" className={`text-[7px] font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Send as Alert
                                    </label>
                                </div>
                                
                                {/* Alert options when checkbox is checked - Full visibility, no height constraints */}
                                {sendAsAlert && (
                                    <div className={`p-3 rounded border ${colorMode ? 'bg-[#232b4d] border-[#3b82f6]/30' : 'bg-blue-50 border-blue-200'}`}>
                                        {/* Header with alert icon */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-[8px] font-bold">!</span>
                                            </div>
                                            <span className={`text-[9px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                                Alert Configuration
                                            </span>
                                        </div>
                                        
                                        {/* Priority selection */}
                                        <div className="mb-3">
                                            <label className={`block text-[6px] font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Alert Priority:
                                            </label>
                                            <select
                                                value={alertPriority}
                                                onChange={(e) => setAlertPriority(e.target.value)}
                                                className={`w-full p-1.5 border rounded text-[6px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300 bg-white text-gray-800'}`}
                                            >
                                                <option value="low">🟢 Low Priority</option>
                                                <option value="medium">🟡 Medium Priority</option>
                                                <option value="high">🔴 High Priority</option>
                                            </select>
                                        </div>
                                        
                                        {/* User selection section with better header */}
                                        <div className="mb-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className={`text-[6px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    Send Alert To: {selectedUsers.length > 0 && (
                                                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[5px] font-bold ${colorMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                                            {selectedUsers.length} selected
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={selectAllUsers}
                                                        className={`px-2 py-0.5 rounded text-[5px] font-semibold transition-colors ${
                                                            colorMode 
                                                                ? 'bg-green-700 text-white hover:bg-green-600' 
                                                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        }`}
                                                    >
                                                        Select All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={clearAllUsers}
                                                        className={`px-2 py-0.5 rounded text-[5px] font-semibold transition-colors ${
                                                            colorMode 
                                                                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                                                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Enhanced user checkboxes with better styling - NO height constraints */}
                                            <div className={`border rounded p-2 space-y-1 ${colorMode ? 'border-gray-600 bg-[#1e293b]' : 'border-gray-200 bg-white'}`}>
                                                {[].map(member => (
                                                    <label key={member.id} className={`flex items-center gap-2 cursor-pointer p-1 rounded transition-colors ${
                                                        selectedUsers.includes(member.id) 
                                                            ? colorMode 
                                                                ? 'bg-blue-700/30' 
                                                                : 'bg-blue-50' 
                                                            : colorMode 
                                                                ? 'hover:bg-gray-700/30' 
                                                                : 'hover:bg-gray-50'
                                                    }`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.includes(member.id)}
                                                            onChange={() => handleUserToggle(member.id)}
                                                            className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                                                        />
                                                        <div className="flex items-center gap-1 flex-1">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[6px] ${
                                                                selectedUsers.includes(member.id) 
                                                                    ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                                                                    : 'bg-gradient-to-br from-gray-500 to-gray-600'
                                                            }`}>
                                                                {member.name.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <span className={`text-[6px] font-medium ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                    {member.name}
                                                                </span>
                                                                <div className={`text-[5px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    {member.role || 'Team Member'}
                                                                </div>
                                                            </div>
                                                            {selectedUsers.includes(member.id) && (
                                                                <div className="text-green-500 text-[6px]">✓</div>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            
                                            {/* Warning if no users selected */}
                                            {selectedUsers.length === 0 && (
                                                <div className={`mt-2 p-2 rounded border text-[5px] ${colorMode ? 'bg-red-900/20 border-red-700/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    ⚠️ Please select at least one team member to send the alert to
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end space-x-1">
                                <button 
                                    onClick={resetCompose} 
                                    className={`px-2 py-1 rounded text-[7px] font-medium transition-colors ${colorMode ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                >
                                    Clear
                                </button>
                                <button 
                                    onClick={handlePost} 
                                    disabled={!message.trim() || (sendAsAlert && selectedUsers.length === 0)}
                                    className={`px-2 py-1 rounded text-[7px] font-medium transition-colors ${
                                        (message.trim() && (!sendAsAlert || selectedUsers.length > 0))
                                            ? sendAsAlert 
                                                ? 'bg-red-600 text-white hover:bg-red-700'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-blue-600 text-white opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    {sendAsAlert ? 'Send Alert' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
              </>
            )}

            {/* Direct Messages Tab */}
            {tab === 'dm' && (
              <div className={`w-3/4 max-w-4xl flex rounded-xl shadow-lg border overflow-hidden ${colorMode ? 'bg-gradient-to-br from-[#232b4d] via-[#181f3a] to-[#232b4d] border-[#3b82f6]/40' : 'bg-white border-gray-200'}`} style={{minHeight: '400px'}}> 
                {/* Coworker sidebar */}
                <div className={`w-40 flex-shrink-0 border-r ${colorMode ? 'border-[#3b82f6]/30 bg-[#181f3a]' : 'border-gray-100 bg-gray-50'} py-2 px-2 flex flex-col`}> 
                  <div className="font-bold text-[7px] mb-2 px-1 text-gray-400 uppercase tracking-wider">Coworkers</div>
                  <div className="flex-1 space-y-1">
                    {mockCoworkers.map(cw => (
                      <button
                        key={cw.id}
                        onClick={() => setSelectedCoworkerId(cw.id)}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-left focus:outline-none focus:ring-1 focus:ring-blue-400 w-full ${selectedCoworkerId === cw.id ? (colorMode ? 'bg-[#232b4d] text-white' : 'bg-blue-100 text-blue-900') : (colorMode ? 'hover:bg-[#232b4d]/60 text-gray-200' : 'hover:bg-blue-50 text-gray-700')}`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[7px] ${colorMode ? 'bg-[#3b82f6] text-white' : 'bg-blue-600 text-white'}`}>{cw.name[0]}</span>
                        <span className="flex-1 truncate text-[7px]">{cw.name}</span>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cw.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                      </button>
                    ))}
                  </div>
                  

                </div>
                
                {/* Chat area - extended to full width */}
                <div className="flex-1 flex flex-col relative">
                  {/* Header */}
                  <div className={`flex items-center gap-2 px-4 py-2 border-b ${colorMode ? 'border-[#3b82f6]/30 bg-[#232b4d]/80' : 'border-gray-100 bg-white'} sticky top-0 z-10`}> 
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[7px] ${colorMode ? 'bg-[#3b82f6] text-white' : 'bg-blue-600 text-white'}`}>{mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.name[0]}</span>
                    <div className="flex-1">
                      <div className={`font-semibold text-[8px] ${colorMode ? 'text-white' : 'text-gray-800'}`}>{mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.name}</div>
                      <div className="flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                        <span className={`text-[7px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>{mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.status === 'online' ? 'Online' : 'Offline'}</span>

                      </div>
                    </div>
                  </div>
                  
                  {/* Messages - extended content area */}
                  <div className={`flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2 custom-scrollbar ${colorMode ? 'bg-gradient-to-br from-[#312e81] to-[#0e7490]' : 'bg-gradient-to-br from-[#fdf6e3] to-[#e0f2fe]'}`} style={{minHeight:'6rem', maxHeight:'50vh'}}>
                    {(chats[selectedCoworkerId] || []).length === 0 ? (
                      <div className="text-[7px] text-gray-400 text-center mt-4">No messages yet. Start the conversation below!</div>
                    ) : (
                      (chats[selectedCoworkerId] || []).map((msg, idx) => {
                        const isMe = msg.fromMe;
                        return (
                          <div key={idx} className={`flex items-end gap-1 ${isMe ? 'justify-end pr-6' : 'justify-start pl-4'} animate-fade-in`}>
                            {!isMe && (
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[7px] ${colorMode ? 'bg-[#3b82f6] text-white' : 'bg-blue-600 text-white'}`}>{mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.name[0]}</span>
                            )}
                            <div className={`flex flex-col max-w-[30%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`text-[7px] font-semibold mb-0.5 ${isMe ? (colorMode ? 'text-blue-200' : 'text-blue-700') : (colorMode ? 'text-white' : 'text-gray-800')}`}>{isMe ? 'You' : mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.name}</div>
                              <div className={`px-2 py-1 rounded-xl shadow border font-medium whitespace-pre-line transition-all duration-200 text-[7px]
                                ${isMe
                                  ? (colorMode
                                      ? 'bg-gradient-to-r from-[#3b82f6] to-[#1e293b] text-white border-transparent'
                                      : 'bg-blue-600 text-white border-transparent')
                                  : (colorMode
                                      ? 'bg-gradient-to-r from-[#a78bfa] to-[#38bdf8] text-white border-[#f472b6]/40'
                                      : 'bg-gradient-to-r from-[#ede9fe] to-[#a7f3d0] text-gray-900 border-[#a78bfa]/40')
                                }`}>
                                {msg.text}
                              </div>
                              <div className="text-[6px] mt-0.5 opacity-70 text-right">{msg.timestamp}</div>
                            </div>
                            {isMe && (
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[7px] ${colorMode ? 'bg-[#3b82f6] text-white' : 'bg-blue-600 text-white'}`}>Y</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Message input at the bottom */}
                  <form className={`flex gap-2 px-4 py-2 border-t items-center ${colorMode ? 'border-[#3b82f6]/30 bg-[#232b4d]/80' : 'border-gray-100 bg-white'}`} onSubmit={e => {e.preventDefault(); handleSendDM();}}>
                    <input
                      type="text"
                      value={dmInput}
                      onChange={e => setDmInput(e.target.value)}
                      placeholder="Type a message..."
                      className={`flex-1 p-1 border rounded-xl text-[7px] focus:ring-1 focus:ring-blue-400 ${colorMode ? 'bg-[#232b4d] border-[#3b82f6] text-white placeholder-gray-400' : 'border-gray-300'}`}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDM(); } }}
                      aria-label="Type a message"
                    />
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-[#3b82f6] to-[#1e293b] text-white font-bold py-1 px-3 rounded-xl text-[7px] shadow hover:from-[#1e293b] hover:to-[#3b82f6] transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      aria-label="Send message"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            )}
        </div>
    );
};

export default ActivityFeedPage;