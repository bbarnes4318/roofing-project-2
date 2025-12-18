import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResponsiveBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';
import { authService } from '../../services/api';
import { useSubjects } from '../../contexts/SubjectsContext';
import api from '../../services/api';
import { useUserPresence } from '../../hooks/useSocket';

const MyMessagesPage = ({ colorMode, projects, onProjectSelect, navigationContext, previousPage }) => {
  const { pushNavigation, goBack, canGoBack, getPrevious } = useNavigationHistory();
  const { subjects } = useSubjects();
  const messagesEndRef = useRef(null);
  
  // Real-time user presence tracking
  const { isUserOnline, getUserStatus, isConnected: socketConnected } = useUserPresence();
  
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
  
  // Unread summary from server (for proper sorting without loading all conversations)
  const [unreadSummary, setUnreadSummary] = useState({ unreadBySender: [], conversationRecency: {} });
  
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

  // Fetch unread summary for sorting (runs once on mount and when currentUser is set)
  useEffect(() => {
    const fetchUnreadSummary = async () => {
      try {
        const response = await api.get('/messages/unread/by-sender');
        if (response.data?.success && response.data?.data) {
          setUnreadSummary(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching unread summary:', err);
      }
    };

    if (currentUser) {
      fetchUnreadSummary();
    }
  }, [currentUser]);

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
            createdAt: new Date(msg.created_at), // Added for sorting
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
          createdAt: new Date(), // Critical for sorting: marks conversation as active/recent
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

  // FORCE SORT: Enrich and sort team members using SERVER DATA
  // Priority 1: Unread status (True moves to top)
  // Priority 2: Recency (Newest timestamp first)
  const sortedTeamMembers = React.useMemo(() => {
    // Build lookup maps from server data
    const unreadMap = {};
    (unreadSummary.unreadBySender || []).forEach(item => {
      unreadMap[item.senderId] = {
        unreadCount: item.unreadCount,
        lastMessageAt: new Date(item.lastMessageAt)
      };
    });

    const recencyMap = unreadSummary.conversationRecency || {};

    return teamMembers.map(member => {
      // Check server data first, then fall back to local conversation state
      const serverUnread = unreadMap[member.id];
      const localChat = conversations[member.id] || [];
      const localUnreadCount = localChat.filter(msg => !msg.fromMe && !msg.read).length;
      const localLastMessage = localChat.length > 0 ? localChat[localChat.length - 1] : null;
      
      // Use server data if available, otherwise local
      const hasUnread = serverUnread ? serverUnread.unreadCount > 0 : localUnreadCount > 0;
      const unreadCount = serverUnread ? serverUnread.unreadCount : localUnreadCount;
      
      // Recency: prefer server recency, then local, then epoch
      let lastMessageAt;
      if (recencyMap[member.id]) {
        lastMessageAt = new Date(recencyMap[member.id]);
      } else if (localLastMessage?.createdAt) {
        lastMessageAt = localLastMessage.createdAt;
      } else {
        lastMessageAt = new Date(0);
      }

      return {
        ...member,
        hasUnread,
        unreadCount,
        lastMessageAt
      };
    }).sort((a, b) => {
      // Priority 1: Unread status (True/High count moves to top)
      const aUnread = a.hasUnread ? 1 : 0;
      const bUnread = b.hasUnread ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread; // Unread first

      // Priority 2: Recency (Newest timestamp first)
      return b.lastMessageAt - a.lastMessageAt;
    });
  }, [teamMembers, conversations, unreadSummary]);

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

  // Get presence status color and label based on real-time status
  const getPresenceStatus = (userId) => {
    const status = getUserStatus(userId);
    switch (status) {
      case 'online':
        return { color: 'bg-green-500', label: 'Online', pulse: true };
      case 'away':
        return { color: 'bg-yellow-500', label: 'Away', pulse: false };
      case 'busy':
        return { color: 'bg-red-500', label: 'Busy', pulse: false };
      case 'offline':
      default:
        return { color: 'bg-gray-400', label: 'Offline', pulse: false };
    }
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
    // FIX DOM/LAYOUT: Negative margins used to escape parent padding if necessary, or strict height
    <div className={`h-[calc(100vh-100px)] w-full flex flex-col overflow-hidden ${colorMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Fixed Header Section - Reduced Padding */}
      <div className={`flex-shrink-0 px-2 pt-1 pb-1 ${colorMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        {/* Back Button - Compact */}
        <div className="flex items-center justify-between">
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
          
          {/* Real-time connection status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            socketConnected 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              socketConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`}></div>
            {socketConnected ? 'Live' : 'Connecting...'}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-4 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area - Fills remaining height */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className={`ml-3 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Loading team members...
            </span>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="text-5xl mb-4">👥</div>
            <p className="text-lg font-medium">No team members found</p>
            <p className="text-sm">Add team members to start messaging</p>
          </div>
        ) : (
          /* Direct Messages Section - Full Height Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Team Members List - Independent Scroll */}
            <div className={`flex flex-col border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden`}>
              <div className={`flex-shrink-0 p-4 border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                  Team Members ({teamMembers.length})
                </h3>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {sortedTeamMembers.map(member => {
                  const unreadCount = member.unreadCount;
                  const presence = getPresenceStatus(member.id);
                  const hasUnread = member.hasUnread;
                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedUserId(member.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 relative ${
                        selectedUserId === member.id
                          ? colorMode 
                            ? 'bg-[var(--color-primary-blueprint-blue)]/20 border border-blue-500/30' 
                            : 'bg-blue-50 border border-blue-200'
                          : hasUnread
                            ? colorMode
                              ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20'
                              : 'bg-red-50 border border-red-200 hover:bg-red-100'
                            : colorMode 
                              ? 'hover:bg-gray-700/30 border border-transparent' 
                              : 'hover:bg-gray-50 border border-transparent'
                      } ${hasUnread ? 'shadow-md' : ''}`}
                    >
                      {/* FORCED UI INDICATOR: Absolute positioned red dot */}
                      {hasUnread && (
                        <div className="absolute right-2 top-2 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                      )}
                      
                      {/* New Message Banner */}
                      {hasUnread && (
                        <div className="flex items-center gap-1.5 mb-2 -mt-1">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <span>NEW MESSAGE{unreadCount > 1 ? 'S' : ''}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {member.avatar ? (
                              <img 
                                src={member.avatar} 
                                alt={getUserDisplayName(member)}
                                className={`w-8 h-8 rounded-full object-cover ${hasUnread ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}
                              />
                            ) : (
                              <div className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium ${hasUnread ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}>
                                {getUserInitials(member)}
                              </div>
                            )}
                            {/* Real-time presence indicator */}
                            <div 
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                                colorMode ? 'border-[#232b4d]' : 'border-white'
                              } ${presence.color} ${presence.pulse ? 'animate-pulse' : ''}`}
                              title={presence.label}
                            ></div>
                          </div>
                          <div>
                            <div className={`font-medium text-sm ${hasUnread ? 'font-semibold' : ''} ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                              {getUserDisplayName(member)}
                            </div>
                            <div className={`text-xs flex items-center gap-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <span>{member.role || 'Team Member'}</span>
                              <span className="text-[10px]">•</span>
                              <span className={`text-[10px] ${
                                presence.label === 'Online' ? 'text-green-500' : 
                                presence.label === 'Away' ? 'text-yellow-500' : 
                                'text-gray-400'
                              }`}>
                                {presence.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="flex flex-col items-center">
                            <div className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Area - Independent Scroll for Messages */}
            <div className={`lg:col-span-2 flex flex-col border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden`}>
              {/* Chat Header - Fixed */}
              <div className={`flex-shrink-0 p-4 border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
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
                      {/* Real-time presence indicator in chat header */}
                      {(() => {
                        const presence = getPresenceStatus(selectedUser.id);
                        return (
                          <div 
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                              colorMode ? 'border-[#232b4d]' : 'border-white'
                            } ${presence.color} ${presence.pulse ? 'animate-pulse' : ''}`}
                            title={presence.label}
                          ></div>
                        );
                      })()}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                        {getUserDisplayName(selectedUser)}
                      </h3>
                      <p className={`text-xs flex items-center gap-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span>{selectedUser.role || 'Team Member'}</span>
                        <span>•</span>
                        {(() => {
                          const presence = getPresenceStatus(selectedUser.id);
                          return (
                            <span className={`font-medium ${
                              presence.label === 'Online' ? 'text-green-500' : 
                              presence.label === 'Away' ? 'text-yellow-500' : 
                              'text-gray-400'
                            }`}>
                              {presence.label}
                            </span>
                          );
                        })()}
                        <span>•</span>
                        <span>{selectedUser.email}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select a team member to start chatting
                  </div>
                )}
              </div>

              {/* Chat Messages - Scrollable, takes remaining space */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : selectedChat.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
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

              {/* Message Input - Fixed at bottom */}
              {selectedUser && (
                <div className={`flex-shrink-0 p-4 border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
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