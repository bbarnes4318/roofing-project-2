import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResponsiveBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';
import { authService } from '../../services/api';
import { useSubjects } from '../../contexts/SubjectsContext';
import api from '../../services/api';

const MyMessagesPage = ({ colorMode, projects, onProjectSelect, navigationContext, previousPage }) => {
  const { pushNavigation, goBack, canGoBack, getPrevious } = useNavigationHistory();
  const { subjects } = useSubjects();
  const messagesEndRef = useRef(null);
  
  // State for users, conversations, and messages
  const [currentUser, setCurrentUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [conversations, setConversations] = useState({});
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dmInput, setDmInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // New message form state
  const [newMessageProject, setNewMessageProject] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageRecipients, setNewMessageRecipients] = useState([]);
  const [attachTask, setAttachTask] = useState(false);
  const [taskAssignee, setTaskAssignee] = useState('');
  const [showAddMessageForm, setShowAddMessageForm] = useState(false);

  // Track page navigation with enhanced context
  useEffect(() => {
    console.log('🔍 MY MESSAGES: Component mounted');
    pushNavigation('My Messages', {
      projects,
      navigationContext: {
        pageName: 'My Messages',
        fromPage: navigationContext?.fromPage || previousPage || 'Dashboard',
      }
    });
  }, [pushNavigation, projects, navigationContext, previousPage]);
  
  // Get current user on component mount
  useEffect(() => {
    const user = authService.getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Fetch real team members from the API
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get('/users/team-members');
        
        if (response.data?.success && response.data?.data?.teamMembers) {
          const members = response.data.data.teamMembers;
          // Filter out the current user from the list
          const filteredMembers = members.filter(m => m.id !== currentUser?.id);
          setTeamMembers(filteredMembers);
          
          // Select the first user by default if available
          if (filteredMembers.length > 0 && !selectedUserId) {
            setSelectedUserId(filteredMembers[0].id);
          }
        } else {
          console.warn('No team members found in response');
          setTeamMembers([]);
        }
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Failed to load team members');
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchTeamMembers();
    }
  }, [currentUser, selectedUserId]);

  // Fetch conversation when a user is selected
  const fetchConversation = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      setMessagesLoading(true);
      
      const response = await api.get(`/messages/conversation/${userId}`);
      
      if (response.data?.success && response.data?.data) {
        const messages = response.data.data || [];
        setConversations(prev => ({
          ...prev,
          [userId]: messages.map(msg => ({
            id: msg.id,
            fromMe: msg.senderId === currentUser?.id,
            text: msg.content,
            timestamp: new Date(msg.created_at).toLocaleString(),
            read: msg.readBy?.includes(currentUser?.id) || msg.senderId === currentUser?.id,
            sender: msg.sender
          }))
        }));
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
      // Initialize empty conversation on error
      setConversations(prev => ({
        ...prev,
        [userId]: []
      }));
    } finally {
      setMessagesLoading(false);
    }
  }, [currentUser]);

  // Fetch conversation when selected user changes
  useEffect(() => {
    if (selectedUserId && currentUser) {
      fetchConversation(selectedUserId);
    }
  }, [selectedUserId, currentUser, fetchConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, selectedUserId]);

  // Send a direct message
  const handleSendDM = async () => {
    if (!dmInput.trim() || !selectedUserId || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      const response = await api.post('/messages', {
        content: dmInput.trim(),
        type: 'DIRECT',
        recipientId: selectedUserId,
        priority: 'MEDIUM'
      });
      
      if (response.data?.success) {
        // Add message to local state immediately for instant feedback
        const newMessage = {
          id: response.data.data?.message?.id || Date.now(),
          fromMe: true,
          text: dmInput.trim(),
          timestamp: new Date().toLocaleString(),
          read: true
        };
        
        setConversations(prev => ({
          ...prev,
          [selectedUserId]: [...(prev[selectedUserId] || []), newMessage]
        }));
        
        setDmInput('');
      } else {
        console.error('Failed to send message:', response.data?.message);
        alert('Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Send project message
  const handleSendProjectMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessageProject || !newMessageSubject || !newMessageText.trim() || newMessageRecipients.length === 0) {
      return;
    }
    
    try {
      setSendingMessage(true);
      
      // Send to each recipient
      const promises = newMessageRecipients.map(recipientId => {
        if (recipientId === 'all') {
          // If "all" is selected, we'd need to send to all team members
          // For now, skip the "all" option and require individual selection
          return Promise.resolve();
        }
        
        return api.post('/messages', {
          content: `**${newMessageSubject}**\n\n${newMessageText.trim()}`,
          type: 'DIRECT',
          recipientId: recipientId,
          projectId: newMessageProject,
          priority: 'MEDIUM'
        });
      });
      
      await Promise.all(promises);
      
      // Reset form
      setNewMessageProject('');
      setNewMessageSubject('');
      setNewMessageText('');
      setNewMessageRecipients([]);
      setAttachTask(false);
      setTaskAssignee('');
      setShowAddMessageForm(false);
      
      // Refresh conversation if one of the recipients is selected
      if (newMessageRecipients.includes(selectedUserId)) {
        fetchConversation(selectedUserId);
      }
      
      alert('Project message sent successfully!');
    } catch (err) {
      console.error('Error sending project message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Get selected user info
  const selectedUser = teamMembers.find(m => m.id === selectedUserId);
  const selectedChat = conversations[selectedUserId] || [];

  // Get unread message counts for each user
  const getUnreadCount = (userId) => {
    const chat = conversations[userId] || [];
    return chat.filter(msg => !msg.fromMe && !msg.read).length;
  };

  // Get user display name
  const getUserDisplayName = (user) => {
    if (!user) return 'Unknown User';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || 'Unknown User';
  };

  // Get user initials
  const getUserInitials = (user) => {
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?';
  };

  // Navigation handlers
  const handleBackNavigation = () => {
    const isMenuNavigation = navigationContext?.isMenuNavigation;
    
    if (isMenuNavigation) {
      const fromPage = navigationContext?.fromPage;
      if (fromPage && fromPage !== 'Project Messages') {
        if (onProjectSelect) {
          onProjectSelect(null, fromPage);
        } else {
          window.location.href = '/';
        }
        return;
      }
    }
    
    if (canGoBack()) {
      const result = goBack();
      if (!result) {
        if (onProjectSelect) {
          onProjectSelect(null, 'Overview');
        } else {
          window.location.href = '/';
        }
      }
    } else {
      if (onProjectSelect) {
        onProjectSelect(null, 'Overview');
      } else {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className={`min-h-screen ${colorMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-6xl mx-auto py-6 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <ResponsiveBackButton
            colorMode={colorMode}
            variant="secondary"
            preservePosition={true}
            onClick={handleBackNavigation}
            showNavigationInfo={true}
            navigationContext={{
              currentPage: 'My Messages',
              canGoBack: canGoBack(),
              previousPage: getPrevious()?.pageName || navigationContext?.fromPage || previousPage || 'Dashboard'
            }}
          />
        </div>

        {/* Page Header */}
        <div className="mb-3">
          <h1 className={`text-3xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'} mb-1`}>
            My Messages
          </h1>
          <p className={`text-lg ${colorMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Direct conversations with team members
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-4 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className={`ml-3 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Loading team members...
            </span>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className={`text-center py-12 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="text-5xl mb-4">👥</div>
            <p className="text-lg font-medium">No team members found</p>
            <p className="text-sm">Add team members to start messaging</p>
          </div>
        ) : (
          /* Direct Messages Section */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Members List */}
            <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] p-4 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'}`}>
              <h3 className={`text-sm font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                Team Members ({teamMembers.length})
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {teamMembers.map(member => {
                  const unreadCount = getUnreadCount(member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedUserId(member.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedUserId === member.id
                          ? colorMode 
                            ? 'bg-[var(--color-primary-blueprint-blue)]/20 border border-blue-500/30' 
                            : 'bg-blue-50 border border-blue-200'
                          : colorMode 
                            ? 'hover:bg-gray-700/30' 
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {member.avatar ? (
                              <img 
                                src={member.avatar} 
                                alt={getUserDisplayName(member)}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {getUserInitials(member)}
                              </div>
                            )}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                              colorMode ? 'border-[#232b4d]' : 'border-white'
                            } ${
                              member.isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                          </div>
                          <div>
                            <div className={`font-medium text-sm ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                              {getUserDisplayName(member)}
                            </div>
                            <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {member.role || 'Team Member'}
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
                {selectedUser ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {selectedUser.avatar ? (
                        <img 
                          src={selectedUser.avatar} 
                          alt={getUserDisplayName(selectedUser)}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {getUserInitials(selectedUser)}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                        colorMode ? 'border-[#232b4d]' : 'border-white'
                      } ${
                        selectedUser.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div>
                      <h3 className={`font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                        {getUserDisplayName(selectedUser)}
                      </h3>
                      <p className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {selectedUser.role || 'Team Member'} • {selectedUser.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select a team member to start chatting
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 max-h-96 overflow-y-auto custom-scrollbar">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : selectedChat.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">💬</div>
                    <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                      No messages yet
                    </div>
                    <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Start a conversation with {getUserDisplayName(selectedUser)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedChat.map((msg, index) => (
                      <div key={msg.id || index} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.fromMe
                            ? 'bg-[var(--color-primary-blueprint-blue)] text-white'
                            : colorMode
                              ? 'bg-gray-700 text-gray-200'
                              : 'bg-gray-200 text-gray-800'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                          <p className={`text-xs mt-1 opacity-75`}>
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input Options */}
              {selectedUser && (
                <div className={`p-4 border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setShowAddMessageForm(false)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        !showAddMessageForm
                          ? 'bg-[var(--color-primary-blueprint-blue)] text-white'
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
                          ? 'bg-[var(--color-primary-blueprint-blue)] text-white'
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
                    <form onSubmit={(e) => { e.preventDefault(); handleSendDM(); }} className="flex gap-2">
                      <input
                        type="text"
                        value={dmInput}
                        onChange={(e) => setDmInput(e.target.value)}
                        placeholder={`Message ${getUserDisplayName(selectedUser)}...`}
                        disabled={sendingMessage}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                          colorMode 
                            ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        } ${sendingMessage ? 'opacity-50' : ''}`}
                      />
                      <button
                        type="submit"
                        disabled={!dmInput.trim() || sendingMessage}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          dmInput.trim() && !sendingMessage
                            ? 'bg-[var(--color-primary-blueprint-blue)] text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {sendingMessage ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  ) : (
                    /* Project Message Form */
                    <form onSubmit={handleSendProjectMessage} className="space-y-2">
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
                            {teamMembers.map(user => (
                              <option key={user.id} value={user.id}>
                                {getUserDisplayName(user)}
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
                          <input
                            type="text"
                            placeholder="Enter subject line..."
                            value={newMessageSubject}
                            onChange={(e) => setNewMessageSubject(e.target.value)}
                            required
                            className={`w-full px-2 py-1 border rounded text-xs ${
                              colorMode 
                                ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                            }`}
                          />
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
                              {teamMembers.map(user => (
                                <option key={user.id} value={user.id}>
                                  {getUserDisplayName(user)}
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
                          disabled={!newMessageProject || !newMessageSubject || !newMessageText.trim() || newMessageRecipients.length === 0 || sendingMessage}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            newMessageProject && newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0 && !sendingMessage
                              ? 'bg-[var(--color-primary-blueprint-blue)] text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {sendingMessage ? 'Sending...' : 'Send Message'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyMessagesPage;