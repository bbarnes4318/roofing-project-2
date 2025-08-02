import React, { useState } from 'react';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
// import { teamMembers } from '../../data/mockData';
import { useSubjects } from '../../contexts/SubjectsContext';

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

const ProjectMessagesPage = ({ project, activities, onAddActivity, colorMode, projects, onProjectSelect, sourceSection = 'Project Messages', initialTab = 'dm' }) => {
    const [tab, setTab] = useState(initialTab);
    
    // Get subjects from context
    const { subjects } = useSubjects();
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

    // Activity filter state - updated to match dashboard implementation
    const [activityProjectFilter, setActivityProjectFilter] = useState('');
    const [activitySubjectFilter, setActivitySubjectFilter] = useState('');
    
    // Message modal state
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showMessageDropdown, setShowMessageDropdown] = useState(false);
    const [newMessageProject, setNewMessageProject] = useState('');
    const [newMessageSubject, setNewMessageSubject] = useState('');
    const [newMessageText, setNewMessageText] = useState('');

    // Filter activities to show only those for the current project and sort by most recent timestamp first
    const projectActivities = activities
        .filter(activity => activity.projectId === project.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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
        setSelectedUsers([]);
    };

    const clearAllUsers = () => {
        setSelectedUsers([]);
    };

    // Quick reply handler
    const handleQuickReply = (replyData) => {
        console.log('Project Messages page quick reply data:', replyData);
        
        if (onAddActivity) {
            // Add the quick reply as a new activity for this project
            onAddActivity(project, replyData.message, replyData.subject);
        }
        
        // Optional: Show success feedback
        // You could add a toast notification here
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
            {/* Tabs - Only Direct Messages and AI Directive */}
            <div className="flex gap-2 m-0 p-0">
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

            {/* Direct Messages Tab */}
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
            
            {/* Message Composition Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className={`w-full max-w-md mx-4 rounded-lg shadow-xl ${
                        colorMode ? 'bg-[#232b4d]' : 'bg-white'
                    }`}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`text-lg font-semibold ${
                                    colorMode ? 'text-white' : 'text-gray-800'
                                }`}>
                                    Add Message to {project.name}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowMessageModal(false);
                                        setNewMessageSubject('');
                                        setNewMessageText('');
                                    }}
                                    className={`text-gray-400 hover:text-gray-600 transition-colors`}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (newMessageSubject && newMessageText.trim()) {
                                    // Create new message activity for this specific project
                                    const newActivity = {
                                        id: `msg_${Date.now()}`,
                                        projectId: project.id,
                                        projectName: project.name,
                                        projectNumber: project.projectNumber || Math.floor(Math.random() * 90000) + 10000,
                                        subject: newMessageSubject,
                                        description: newMessageText,
                                        user: 'You',
                                        timestamp: new Date().toISOString(),
                                        type: 'message',
                                        priority: 'medium'
                                    };
                                    
                                    // Add to activities via the parent callback
                                    if (onAddActivity) {
                                        onAddActivity(project, newMessageText, newMessageSubject);
                                    }
                                    
                                    // Close modal and reset form
                                    setShowMessageModal(false);
                                    setNewMessageSubject('');
                                    setNewMessageText('');
                                }
                            }} className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${
                                        colorMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                        Subject <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={newMessageSubject}
                                        onChange={(e) => setNewMessageSubject(e.target.value)}
                                        required
                                        className={`w-full p-2 border rounded-lg text-sm ${
                                            colorMode 
                                                ? 'bg-[#1e293b] border-gray-600 text-white' 
                                                : 'bg-white border-gray-300 text-gray-800'
                                        }`}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(subject => (
                                            <option key={subject} value={subject}>{subject}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${
                                        colorMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                        Message <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={newMessageText}
                                        onChange={(e) => setNewMessageText(e.target.value)}
                                        placeholder="Enter your message here..."
                                        required
                                        rows={4}
                                        className={`w-full p-2 border rounded-lg text-sm resize-none ${
                                            colorMode 
                                                ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-400' 
                                                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                                        }`}
                                    />
                                </div>
                                
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMessageModal(false);
                                            setNewMessageSubject('');
                                            setNewMessageText('');
                                        }}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                                            colorMode 
                                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newMessageSubject || !newMessageText.trim()}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                            newMessageSubject && newMessageText.trim()
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        Send Message
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectMessagesPage; 