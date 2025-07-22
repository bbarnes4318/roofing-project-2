import React, { useState } from 'react';
import ActivityCard from '../ui/ActivityCard';
import { teamMembers } from '../../data/mockData';
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
  2: [],
  3: [],
  4: [],
};

const ProjectMessagesPage = ({ project, activities, onAddActivity, colorMode, projects, onProjectSelect, sourceSection = 'Activity Feed', initialTab = 'feed' }) => {
    const [tab, setTab] = useState(initialTab);
    const [message, setMessage] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    
    // Alert functionality state
    const [sendAsAlert, setSendAsAlert] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [alertPriority, setAlertPriority] = useState('medium');
    
    // Direct message state
    const [selectedCoworkerId, setSelectedCoworkerId] = useState(mockCoworkers[0].id);
    const [dmInput, setDmInput] = useState('');
    const [chats, setChats] = useState(initialChats);

    // Activity filter state
    const [activityProjectFilter, setActivityProjectFilter] = useState('');
    const [activitySubjectFilter, setActivitySubjectFilter] = useState('');

    // Filter activities to show only those for the current project
    const projectActivities = activities.filter(activity => activity.projectId === project.id);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    };

    // Enhanced project selection handler with scroll to top - matching dashboard functionality
    const handleProjectSelectWithScroll = (selectedProject, view = 'Project Profile', phase = null, sourceSection = null) => {
        console.log('🔍 PROJECT_MESSAGES: handleProjectSelectWithScroll called with:');
        console.log('🔍 PROJECT_MESSAGES: project:', selectedProject?.name);
        console.log('🔍 PROJECT_MESSAGES: view:', view);
        console.log('🔍 PROJECT_MESSAGES: phase:', phase);
        console.log('🔍 PROJECT_MESSAGES: sourceSection:', sourceSection);
        
        scrollToTop(); // Scroll to top immediately
        if (onProjectSelect) {
            console.log('🔍 PROJECT_MESSAGES: Calling onProjectSelect with sourceSection:', sourceSection);
            onProjectSelect(selectedProject, view, phase, sourceSection);
        }
    };

    // Handle project selection from activity cards - updated to match dashboard functionality
    const handleProjectSelect = (selectedProject) => {
        if (onProjectSelect) {
            // Pass the project with a flag to indicate it should be highlighted on the Projects page
            const projectWithHighlight = {
                ...selectedProject,
                highlightOnProjectsPage: true,
                scrollToProjectId: String(selectedProject.id) // Ensure it's a string to match data-project-id
            };
            handleProjectSelectWithScroll(projectWithHighlight, 'Projects', null, sourceSection);
        }
    };

    const handlePost = () => {
        if (!message) return;
        
        if (sendAsAlert) {
            // Create alert
            if (selectedUsers.length === 0) {
                alert('Please select at least one user for the alert.');
                return;
            }
            
            console.log('Creating project alert:', {
                title: selectedSubject,
                message: message,
                project: project,
                priority: alertPriority,
                assignedUsers: selectedUsers
            });
            // TODO: Send alert to backend API
        }
        
        onAddActivity(project, message, selectedSubject);
        setMessage('');
        setSelectedSubject('');
        setSendAsAlert(false);
        setSelectedUsers([]);
        setAlertPriority('medium');
    };

    const resetCompose = () => { 
        setMessage(''); 
        setSelectedSubject(''); 
        setSendAsAlert(false);
        setSelectedUsers([]);
        setAlertPriority('medium');
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
        setSelectedUsers(teamMembers.map(member => member.id));
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

    return (
        <div className="w-full max-w-full m-0 p-0">
            {/* Tabs */}
            <div className="flex gap-2 m-0 p-0">
              <button
                className={`px-4 py-1 rounded-t-lg font-semibold text-xs transition-all duration-150 ${tab === 'feed' ? (colorMode ? 'bg-[#232b4d] text-white' : 'bg-blue-600 text-white') : (colorMode ? 'bg-[#181f3a] text-gray-300' : 'bg-gray-100 text-gray-700')}`}
                onClick={() => setTab('feed')}
              >
                Activity Feed
              </button>
              <button
                className={`px-4 py-1 rounded-t-lg font-semibold text-xs transition-all duration-150 ${tab === 'dm' ? (colorMode ? 'bg-[#232b4d] text-white' : 'bg-blue-600 text-white') : (colorMode ? 'bg-[#181f3a] text-gray-300' : 'bg-gray-100 text-gray-700')}`}
                onClick={() => setTab('dm')}
              >
                Direct Messages
              </button>
              <button
                disabled={true}
                className={`px-4 py-1 rounded-t-lg font-semibold text-xs transition-all duration-150 cursor-not-allowed ${colorMode ? 'bg-[#181f3a] text-gray-400 opacity-70' : 'bg-gray-100 text-gray-500 opacity-70'}`}
              >
                AI Directive
              </button>
            </div>

            {/* Activity Feed Tab */}
            {tab === 'feed' && (
              <>
                {/* Main Container - matching Current Activity Feed style */}
                <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-visible relative`} style={{ width: '100%', minHeight: '750px' }}>
                    {/* Header with better balanced controls */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Activity Feed</h1>
                            </div>
                        </div>
                        
                        {/* Controls row - better balanced */}
                        <div className="flex items-center justify-between gap-2">
                            {/* Filter dropdowns */}
                            <div className="flex items-center gap-2">
                                <select
                                    value={activityProjectFilter}
                                    onChange={e => setActivityProjectFilter(e.target.value)}
                                    className={`w-32 max-w-[140px] truncate text-[8px] font-medium px-1.5 py-1 rounded border transition-colors ${
                                        colorMode 
                                            ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                    }`}
                                >
                                    <option value="">All Projects</option>
                                    {projects && projects.map(proj => (
                                        <option key={proj.id} value={proj.id}>
                                            {proj.name || proj.projectName}
                                        </option>
                                    ))}
                                </select>
                                
                                <select
                                    value={activitySubjectFilter}
                                    onChange={e => setActivitySubjectFilter(e.target.value)}
                                    className={`w-32 max-w-[140px] truncate text-[8px] font-medium px-1.5 py-1 rounded border transition-colors ${
                                        colorMode 
                                            ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                    }`}
                                >
                                    <option value="">All Subjects</option>
                                    {ACTIVITY_FEED_SUBJECTS.map(subject => (
                                        <option key={subject} value={subject}>
                                            {subject}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2 mt-3 max-h-[350px] overflow-y-auto overflow-x-hidden pb-4 pr-1 custom-scrollbar">
                        
                        {/* Activity Cards */}
                        <div className="space-y-2">
                            {projectActivities.length === 0 ? (
                                <div className={`text-center py-3 text-[8px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    No activities found for this project.
                                </div>
                            ) : projectActivities.map(activity => (
                                <ActivityCard 
                                    key={activity.id} 
                                    activity={activity} 
                                    onProjectSelect={handleProjectSelect}
                                    projects={projects}
                                    colorMode={colorMode}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Add POST label */}
                    <div className={`mt-8 mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <h3 className="text-[10px] font-semibold">Add POST</h3>
                    </div>

                    {/* Composer always at the bottom */}
                    <div className={`mb-8 p-2 pb-8 rounded-lg ${colorMode ? 'bg-[#1e293b]' : 'bg-gray-50'}`} style={{ minHeight: '200px' }}>
                        <div className="mb-1">
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="flex items-center justify-center">
                                    <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        Project: {project.name}
                                    </span>
                                </div>
                                <select
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(e.target.value)}
                                    className={`w-full p-1 border rounded text-[9px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300'}`}
                                    required
                                >
                                    <option value="">Select Subject *</option>
                                    {ACTIVITY_FEED_SUBJECTS.map(subject => (
                                        <option key={subject} value={subject}>
                                            {subject}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Write your message here..."
                                className={`w-full p-1 border rounded text-[9px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300'}`}
                                rows="2"
                            ></textarea>
                            
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
                                    <label htmlFor="sendAsAlert" className={`text-[9px] font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Send as Alert
                                    </label>
                                </div>
                                
                                {/* Alert options when checkbox is checked */}
                                {sendAsAlert && (
                                    <div className={`p-3 rounded border ${colorMode ? 'bg-[#232b4d] border-[#3b82f6]/30' : 'bg-blue-50 border-blue-200'}`} style={{ marginBottom: '20px' }}>
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
                                            <label className={`block text-[8px] font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Alert Priority:
                                            </label>
                                            <select
                                                value={alertPriority}
                                                onChange={(e) => setAlertPriority(e.target.value)}
                                                className={`w-full p-1.5 border rounded text-[8px] ${colorMode ? 'bg-[#1e293b] border-[#3b82f6] text-white' : 'border-gray-300 bg-white text-gray-800'}`}
                                            >
                                                <option value="low">🟢 Low Priority</option>
                                                <option value="medium">🟡 Medium Priority</option>
                                                <option value="high">🔴 High Priority</option>
                                            </select>
                                        </div>
                                        
                                        {/* User selection section with better header */}
                                        <div className="mb-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className={`text-[8px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    Send Alert To: {selectedUsers.length > 0 && (
                                                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[7px] font-bold ${colorMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                                            {selectedUsers.length} selected
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={selectAllUsers}
                                                        className={`px-2 py-0.5 rounded text-[7px] font-semibold transition-colors ${
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
                                                        className={`px-2 py-0.5 rounded text-[7px] font-semibold transition-colors ${
                                                            colorMode 
                                                                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                                                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Enhanced user checkboxes with better styling */}
                                            <div className={`border rounded p-2 space-y-1.5 ${colorMode ? 'border-gray-600 bg-[#1e293b]' : 'border-gray-200 bg-white'}`} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {teamMembers.map(member => (
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
                                                            className="w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                                                        />
                                                        <div className="flex items-center gap-1.5 flex-1">
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[7px] ${
                                                                selectedUsers.includes(member.id) 
                                                                    ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                                                                    : 'bg-gradient-to-br from-gray-500 to-gray-600'
                                                            }`}>
                                                                {member.name.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <span className={`text-[8px] font-medium ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                    {member.name}
                                                                </span>
                                                                <div className={`text-[7px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    {member.role || 'Team Member'}
                                                                </div>
                                                            </div>
                                                            {selectedUsers.includes(member.id) && (
                                                                <div className="text-green-500 text-[8px]">✓</div>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            
                                            {/* Warning if no users selected */}
                                            {selectedUsers.length === 0 && (
                                                <div className={`mt-2 p-2 rounded border text-[7px] ${colorMode ? 'bg-red-900/20 border-red-700/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    ⚠️ Please select at least one team member to send the alert to
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-between items-center mt-2">
                                <div className={`text-[9px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {(!selectedSubject || (sendAsAlert && selectedUsers.length === 0)) && (
                                        <span className="text-black">
                                            * {!selectedSubject ? 'Subject required' :
                                               sendAsAlert && selectedUsers.length === 0 ? 'Select users for alert' : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={resetCompose}
                                        className={`font-bold py-1 px-2 rounded text-[9px] ${colorMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={handlePost}
                                        disabled={!message.trim() || !selectedSubject || (sendAsAlert && selectedUsers.length === 0)}
                                        className={`font-bold py-1 px-2 rounded text-[9px] ${
                                            (message.trim() && selectedSubject && (!sendAsAlert || selectedUsers.length > 0))
                                                ? sendAsAlert 
                                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                        {sendAsAlert ? 'Send Alert' : 'Post'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </>
            )}

            {/* Direct Messages Tab */}
            {tab === 'dm' && (
              <div className={`w-full flex rounded-2xl shadow-lg border overflow-hidden h-[calc(100vh-300px)] ${colorMode ? 'bg-gradient-to-br from-[#232b4d] via-[#181f3a] to-[#232b4d] border-[#3b82f6]/40' : 'bg-white border-gray-200'}`}> 
                {/* Coworker sidebar */}
                <div className={`w-44 flex-shrink-0 border-r ${colorMode ? 'border-[#3b82f6]/30 bg-[#181f3a]' : 'border-gray-100 bg-gray-50'} py-3 px-2 flex flex-col`}> 
                  <div className="font-bold text-xs mb-2 px-2 text-gray-400 uppercase tracking-wider">Coworkers</div>
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {mockCoworkers.map(cw => (
                      <button
                        key={cw.id}
                        onClick={() => setSelectedCoworkerId(cw.id)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 w-full ${selectedCoworkerId === cw.id ? (colorMode ? 'bg-[#232b4d] text-white' : 'bg-blue-100 text-blue-900') : (colorMode ? 'hover:bg-[#232b4d]/60 text-gray-200' : 'hover:bg-blue-50 text-gray-700')}`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${colorMode ? 'bg-[#3b82f6] text-white' : 'bg-blue-600 text-white'}`}>{cw.name[0]}</span>
                        <span className="flex-1 truncate text-xs">{cw.name}</span>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cw.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                      </button>
                    ))}
                  </div>
                  

                </div>
                
                {/* Chat area - extended to full width */}
                <div className="flex-1 flex flex-col relative">
                  {/* Header */}
                  <div className={`flex items-center gap-2 px-4 py-2 border-b ${colorMode ? 'border-[#3b82f6]/30 bg-[#232b4d]/80' : 'border-gray-100 bg-white'} sticky top-0 z-10`}> 
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${colorMode ? 'bg-[#3b82f6] text-white' : 'bg-blue-600 text-white'}`}>{mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.name[0]}</span>
                    <div className="flex-1">
                      <div className={`font-semibold text-xs ${colorMode ? 'text-white' : 'text-gray-800'}`}>{mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.name}</div>
                      <div className="flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                        <span className={`text-[10px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>{mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.status === 'online' ? 'Online' : 'Offline'}</span>

                      </div>
                    </div>
                  </div>
                  
                  {/* Messages - condensed content area */}
                  <div className={`flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2 custom-scrollbar ${colorMode ? 'bg-gradient-to-br from-[#312e81] to-[#0e7490]' : 'bg-gradient-to-br from-[#fdf6e3] to-[#e0f2fe]'}`}>
                    {(chats[selectedCoworkerId] || []).length === 0 ? (
                      <div className="text-xs text-gray-400 text-center mt-4">No messages yet. Start the conversation below!</div>
                    ) : (
                      (chats[selectedCoworkerId] || []).map((msg, idx) => {
                        const isMe = msg.fromMe;
                        return (
                          <div key={idx} className={`flex items-end gap-1.5 ${isMe ? 'justify-end pr-16' : 'justify-start pl-8'} animate-fade-in`}>
                            {!isMe && (
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${colorMode ? 'bg-[#3b82f6] text-white' : 'bg-blue-600 text-white'}`}>{mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.name[0]}</span>
                            )}
                            <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`text-[10px] font-semibold mb-0.5 ${isMe ? (colorMode ? 'text-blue-200' : 'text-blue-700') : (colorMode ? 'text-white' : 'text-gray-800')}`}>{isMe ? 'You' : mockCoworkers.find(cw => cw.id === selectedCoworkerId)?.name}</div>
                              <div className={`px-3 py-1.5 rounded-xl shadow-md border font-medium whitespace-pre-line transition-all duration-200
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
                              <div className="text-[8px] mt-0.5 opacity-70 text-right">{msg.timestamp}</div>
                            </div>
                            {isMe && (
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${colorMode ? 'bg-[#3b82f6] text-white' : 'bg-blue-600 text-white'}`}>Y</span>
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
                      className={`flex-1 p-1.5 border rounded-xl text-xs focus:ring-2 focus:ring-blue-400 ${colorMode ? 'bg-[#232b4d] border-[#3b82f6] text-white placeholder-gray-400' : 'border-gray-300'}`}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDM(); } }}
                      aria-label="Type a message"
                    />
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-[#3b82f6] to-[#1e293b] text-white font-bold py-1 px-4 rounded-xl text-xs shadow-md hover:from-[#1e293b] hover:to-[#3b82f6] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
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

export default ProjectMessagesPage; 