import React, { useState, useEffect } from 'react';
import { ResponsiveBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';
import { authService } from '../../services/api';
import { useSubjects } from '../../contexts/SubjectsContext';

// Mock coworkers data matching Messages Tab
const mockCoworkers = [
  { id: 1, name: 'Sarah Owner', status: 'online' },
  { id: 2, name: 'Mike Rodriguez (PM)', status: 'offline' },
  { id: 3, name: 'John Smith', status: 'online' },
  { id: 4, name: 'Jane Doe', status: 'offline' },
  { id: 5, name: 'Bob Wilson', status: 'online' },
  { id: 6, name: 'Alice Johnson', status: 'offline' },
];

// Initial direct message chats
const initialChats = {
  1: [
    { fromMe: false, text: 'Hey, can you review the new project docs?', timestamp: new Date(Date.now() - 3600000).toLocaleString() },
    { fromMe: true, text: 'Sure, I will check them out today.', timestamp: new Date(Date.now() - 3400000).toLocaleString() },
    { fromMe: false, text: 'Great! I\'ve uploaded them to the shared drive.', timestamp: new Date(Date.now() - 3200000).toLocaleString() },
    { fromMe: true, text: 'Perfect, I\'ll take a look this afternoon.', timestamp: new Date(Date.now() - 3000000).toLocaleString() },
  ],
  2: [
    { fromMe: true, text: 'Mike, what\'s the status on the Johnson project?', timestamp: new Date(Date.now() - 7200000).toLocaleString() },
    { fromMe: false, text: 'We\'re on track. Should be done by Friday.', timestamp: new Date(Date.now() - 7000000).toLocaleString() },
  ],
  3: [
    { fromMe: false, text: 'Can you send me the material estimates?', timestamp: new Date(Date.now() - 1800000).toLocaleString() },
    { fromMe: true, text: 'I\'ll get those to you within the hour.', timestamp: new Date(Date.now() - 1600000).toLocaleString() },
  ],
  4: [],
  5: [
    { fromMe: true, text: 'Bob, the permits came through!', timestamp: new Date(Date.now() - 900000).toLocaleString() },
  ],
  6: [],
};

const MyMessagesPage = ({ colorMode, projects, onProjectSelect, navigationContext, previousPage }) => {
  const { pushNavigation, goBack, canGoBack, getPrevious } = useNavigationHistory();
  const { subjects } = useSubjects();
  
  // Track page navigation with enhanced context
  useEffect(() => {
    console.log('🔍 MY MESSAGES: Component mounted');
    console.log('🔍 MY MESSAGES: navigationContext from props:', navigationContext);
    console.log('🔍 MY MESSAGES: previousPage from props:', previousPage);
    
    // Capture the current page state and navigation context
    const enhancedNavigationContext = {
      pageName: 'My Messages',
      sourcePage: window.location.pathname,
      timestamp: Date.now(),
      projects,
      // Use the navigation context from App.jsx if available
      fromPage: navigationContext?.fromPage || previousPage || 'Dashboard',
      toPage: 'Project Messages',
      // Capture any URL parameters or state that might be relevant
      urlParams: new URLSearchParams(window.location.search),
      // Store the current scroll position and any active elements
      scrollPosition: {
        x: window.scrollX || window.pageXOffset || document.documentElement.scrollLeft,
        y: window.scrollY || window.pageYOffset || document.documentElement.scrollTop
      }
    };

    console.log('🔍 MY MESSAGES: Enhanced navigation context:', enhancedNavigationContext);

    pushNavigation('My Messages', {
      projects,
      navigationContext: enhancedNavigationContext
    });
  }, [pushNavigation, projects, navigationContext, previousPage]);
  
  // Enhanced back button handler with proper navigation restoration
  const handleBackNavigation = () => {
    console.log('🔍 MY MESSAGES: handleBackNavigation called');
    console.log('🔍 MY MESSAGES: navigationContext:', navigationContext);
    console.log('🔍 MY MESSAGES: previousPage:', previousPage);
    
    if (canGoBack()) {
      console.log('🔍 MY MESSAGES: Using navigation history for back navigation');
      
      // Get the previous navigation entry to understand where to go back to
      const previousEntry = getPrevious();
      console.log('🔍 MY MESSAGES: Previous entry:', previousEntry);
      
      if (previousEntry) {
        // Use the navigation history system
        const result = goBack();
        console.log('🔍 MY MESSAGES: Navigation result:', result);
        
        // If the navigation history system doesn't handle the navigation,
        // we'll need to handle it manually based on the previous entry
        if (!result) {
          handleManualBackNavigation(previousEntry);
        }
      } else {
        // Fallback to browser history
        console.log('🔍 MY MESSAGES: No previous entry, using browser back');
        window.history.back();
      }
    } else {
      console.log('🔍 MY MESSAGES: No navigation history, using fallback');
      // Fallback navigation logic
      handleFallbackNavigation();
    }
  };

  // Handle manual back navigation when navigation history doesn't suffice
  const handleManualBackNavigation = (previousEntry) => {
    console.log('🔍 MY MESSAGES: Handling manual back navigation to:', previousEntry.pageName);
    
    // Check if we need to navigate to a specific page or section
    if (previousEntry.pageName === 'Dashboard' || previousEntry.pageName === 'Overview') {
      // Navigate back to dashboard
      if (onProjectSelect) {
        onProjectSelect(null, 'Overview');
      } else {
        window.location.href = '/';
      }
    } else if (previousEntry.pageName === 'Projects') {
      // Navigate back to projects page
      if (onProjectSelect) {
        onProjectSelect(null, 'Projects');
      } else {
        window.location.href = '/projects';
      }
    } else if (previousEntry.pageName === 'Project Messages') {
      // Navigate back to project messages (this shouldn't happen, but handle it)
      if (onProjectSelect) {
        onProjectSelect(null, 'Overview');
      } else {
        window.location.href = '/';
      }
    } else {
      // Generic fallback - try to use browser history
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Ultimate fallback - go to dashboard
        if (onProjectSelect) {
          onProjectSelect(null, 'Overview');
        } else {
          window.location.href = '/';
        }
      }
    }
  };

  // Handle fallback navigation when no history is available
  const handleFallbackNavigation = () => {
    console.log('🔍 MY MESSAGES: Handling fallback navigation');
    
    // Use the navigation context from App.jsx if available
    const fromPage = navigationContext?.fromPage || previousPage;
    console.log('🔍 MY MESSAGES: From page from context:', fromPage);
    
    if (fromPage && fromPage !== 'Project Messages') {
      console.log('🔍 MY MESSAGES: Navigating back to:', fromPage);
      if (onProjectSelect) {
        onProjectSelect(null, fromPage);
      } else {
        window.location.href = '/';
      }
      return;
    }
    
    // Check if we have a referrer or can determine where the user came from
    const referrer = document.referrer;
    const currentHost = window.location.host;
    
    if (referrer && referrer.includes(currentHost)) {
      // User came from within our app, try to go back
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Navigate to dashboard
        if (onProjectSelect) {
          onProjectSelect(null, 'Overview');
        } else {
          window.location.href = '/';
        }
      }
    } else {
      // User came from outside or direct link, go to dashboard
      if (onProjectSelect) {
        onProjectSelect(null, 'Overview');
      } else {
        window.location.href = '/';
      }
    }
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCoworkerId, setSelectedCoworkerId] = useState(mockCoworkers[0].id);
  const [dmInput, setDmInput] = useState('');
  const [chats, setChats] = useState(initialChats);
  
  // New message form state
  const [newMessageProject, setNewMessageProject] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageRecipients, setNewMessageRecipients] = useState([]);
  const [attachTask, setAttachTask] = useState(false);
  const [taskAssignee, setTaskAssignee] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showAddMessageForm, setShowAddMessageForm] = useState(false);

  // Get current user on component mount
  useEffect(() => {
    const user = authService.getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Fetch available users for message recipients
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // This would be a real API call in production
        const mockUsers = [
          { id: 1, name: 'Sarah Owner', role: 'Owner' },
          { id: 2, name: 'Mike Rodriguez', role: 'Project Manager' },
          { id: 3, name: 'John Smith', role: 'Field Director' },
          { id: 4, name: 'Jane Doe', role: 'Administration' },
          { id: 5, name: 'Bob Wilson', role: 'Roof Supervisor' },
          { id: 6, name: 'Alice Johnson', role: 'Customer Service' },
        ];
        setAvailableUsers(mockUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        setAvailableUsers([]);
      }
    };

    fetchUsers();
  }, []);

  const handleSendDM = () => {
    if (dmInput.trim()) {
      setChats(prev => ({
        ...prev,
        [selectedCoworkerId]: [
          ...(prev[selectedCoworkerId] || []),
          {
            fromMe: true,
            text: dmInput.trim(),
            timestamp: new Date().toLocaleString(),
            read: true
          }
        ]
      }));
      
      setDmInput('');
    }
  };

  // Get selected coworker info
  const selectedCoworker = mockCoworkers.find(c => c.id === selectedCoworkerId);
  const selectedChat = chats[selectedCoworkerId] || [];

  // Get unread message counts for each coworker
  const getUnreadCount = (coworkerId) => {
    const chat = chats[coworkerId] || [];
    return chat.filter(msg => !msg.fromMe && !msg.read).length;
  };

  // Mark messages as read when coworker is selected
  useEffect(() => {
    if (selectedCoworkerId && chats[selectedCoworkerId]) {
      setChats(prevChats => ({
        ...prevChats,
        [selectedCoworkerId]: prevChats[selectedCoworkerId].map(msg => ({ ...msg, read: true }))
      }));
    }
  }, [selectedCoworkerId]);

  return (
    <div className={`min-h-screen ${colorMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-6xl mx-auto py-6 px-4">
        {/* Enhanced Back Button with Navigation Context */}
        <div className="mb-6">
          <ResponsiveBackButton
            colorMode={colorMode}
            variant="secondary"
            preservePosition={true}
            onClick={handleBackNavigation}
            // Add additional props for better navigation context
            showNavigationInfo={true}
            navigationContext={{
              currentPage: 'My Messages',
              canGoBack: canGoBack(),
              previousPage: getPrevious()?.pageName || navigationContext?.fromPage || previousPage || 'Dashboard'
            }}
          />
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            My Messages
          </h1>
          <p className={`text-lg ${colorMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Direct conversations with team members
          </p>
        </div>

        {/* Direct Messages Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coworkers List */}
          <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] p-4 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'}`}>
            <h3 className={`text-sm font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>Team Members</h3>
            <div className="space-y-2">
              {mockCoworkers.map(coworker => {
                const unreadCount = getUnreadCount(coworker.id);
                return (
                  <button
                    key={coworker.id}
                    onClick={() => setSelectedCoworkerId(coworker.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCoworkerId === coworker.id
                        ? colorMode 
                          ? 'bg-blue-600/20 border border-blue-500/30' 
                          : 'bg-blue-50 border border-blue-200'
                        : colorMode 
                          ? 'hover:bg-gray-700/30' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {coworker.name.charAt(0)}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                            colorMode ? 'border-[#232b4d]' : 'border-white'
                          } ${
                            coworker.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <div>
                          <div className={`font-medium text-sm ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                            {coworker.name}
                          </div>
                          <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {coworker.status === 'online' ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <div className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`lg:col-span-2 border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} flex flex-col`}>
            {/* Chat Header */}
            <div className={`p-4 border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {selectedCoworker?.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                    colorMode ? 'border-[#232b4d]' : 'border-white'
                  } ${
                    selectedCoworker?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div>
                  <h3 className={`font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedCoworker?.name}
                  </h3>
                  <p className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedCoworker?.status === 'online' ? 'Active now' : 'Last seen recently'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 max-h-96 overflow-y-auto custom-scrollbar">
              {selectedChat.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">💬</div>
                  <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                    No messages yet
                  </div>
                  <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Start a conversation with {selectedCoworker?.name}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedChat.map((msg, index) => (
                    <div key={index} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.fromMe
                          ? 'bg-blue-600 text-white'
                          : colorMode
                            ? 'bg-gray-700 text-gray-200'
                            : 'bg-gray-200 text-gray-800'
                      }`}>
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-xs mt-1 opacity-75`}>
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input Options */}
            <div className={`p-4 border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setShowAddMessageForm(false)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    !showAddMessageForm
                      ? 'bg-blue-600 text-white'
                      : colorMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Quick Message
                </button>
                <button
                  onClick={() => setShowAddMessageForm(true)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    showAddMessageForm
                      ? 'bg-blue-600 text-white'
                      : colorMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Project Message
                </button>
              </div>

              {!showAddMessageForm ? (
                /* Quick Message Form */
                <form onSubmit={handleSendDM} className="flex gap-2">
                  <input
                    type="text"
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    placeholder={`Message ${selectedCoworker?.name}...`}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                      colorMode 
                        ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!dmInput.trim()}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      dmInput.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Send
                  </button>
                </form>
              ) : (
                /* Project Message Form */
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (newMessageProject && newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0) {
                    // Create new message activity
                    const selectedProject = projects.find(p => p.id === parseInt(newMessageProject));
                    const newActivity = {
                      id: `msg_${Date.now()}`,
                      projectId: parseInt(newMessageProject),
                      projectName: selectedProject?.projectName || selectedProject?.name || selectedProject?.address || 'Unknown Project',
                      projectNumber: selectedProject?.projectNumber || Math.floor(Math.random() * 90000) + 10000,
                      subject: newMessageSubject,
                      description: newMessageText,
                      user: 'You',
                      timestamp: new Date().toISOString(),
                      type: 'message',
                      priority: 'medium',
                      recipients: newMessageRecipients,
                      hasTask: attachTask,
                      taskAssignedTo: attachTask ? taskAssignee : null
                    };
                    
                    console.log('New project message created:', newActivity);
                    
                    // Reset form
                    setNewMessageProject('');
                    setNewMessageSubject('');
                    setNewMessageText('');
                    setNewMessageRecipients([]);
                    setAttachTask(false);
                    setTaskAssignee('');
                    setShowAddMessageForm(false);
                    
                    // Show success message
                    alert('Project message sent successfully!');
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
                            #{String(project.projectNumber || project.id).padStart(5, '0')} - {project.projectName || project.name || project.address}
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
                            {user.firstName} {user.lastName} ({user.role || 'User'})
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
                  
                  {/* Second Row: Subject and Task Assignment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        colorMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newMessageSubject}
                        onChange={(e) => setNewMessageSubject(e.target.value)}
                        required
                        className={`w-full px-2 py-1 border rounded text-xs ${
                          colorMode 
                            ? 'bg-[#232b4d] border-gray-600 text-white' 
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
                      <label className={`block text-xs font-medium mb-1 ${
                        colorMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <input
                          type="checkbox"
                          checked={attachTask || false}
                          onChange={(e) => setAttachTask(e.target.checked)}
                          className="mr-1"
                        />
                        Send as a Task
                      </label>
                      {attachTask && (
                        <select
                          value={taskAssignee || ''}
                          onChange={(e) => setTaskAssignee(e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs ${
                            colorMode 
                              ? 'bg-[#232b4d] border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        >
                          <option value="">Assign Task To...</option>
                          {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.role || 'User'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
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
                        setNewMessageProject('');
                        setNewMessageSubject('');
                        setNewMessageText('');
                        setNewMessageRecipients([]);
                        setAttachTask(false);
                        setTaskAssignee('');
                        setShowAddMessageForm(false);
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
                      disabled={!newMessageProject || !newMessageSubject || !newMessageText.trim() || newMessageRecipients.length === 0}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        newMessageProject && newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyMessagesPage;