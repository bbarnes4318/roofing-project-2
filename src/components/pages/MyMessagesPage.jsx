import React, { useState, useEffect } from 'react';
import { ResponsiveBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';
import { authService } from '../../services/api';

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

const MyMessagesPage = ({ colorMode, projects, onProjectSelect }) => {
  const { pushNavigation, goBack, canGoBack } = useNavigationHistory();
  
  // Track page navigation
  useEffect(() => {
    pushNavigation('My Messages', {
      projects
    });
  }, [pushNavigation]);
  
  // Custom back button handler that always works
  const handleBackNavigation = () => {
    if (canGoBack()) {
      // Use navigation history if available
      goBack();
    } else {
      // Fallback to browser history or dashboard
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/'; // Fallback to dashboard
      }
    }
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCoworkerId, setSelectedCoworkerId] = useState(mockCoworkers[0].id);
  const [dmInput, setDmInput] = useState('');
  const [chats, setChats] = useState(initialChats);

  // Get current user on component mount
  useEffect(() => {
    const user = authService.getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Send direct message function
  const handleSendDM = (e) => {
    e.preventDefault();
    if (dmInput.trim() && selectedCoworkerId) {
      const newMessage = {
        fromMe: true,
        text: dmInput.trim(),
        timestamp: new Date().toLocaleString()
      };
      
      setChats(prevChats => ({
        ...prevChats,
        [selectedCoworkerId]: [...(prevChats[selectedCoworkerId] || []), newMessage]
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
        {/* Back Button */}
        <div className="mb-6">
          <ResponsiveBackButton
            colorMode={colorMode}
            variant="secondary"
            preservePosition={true}
            onClick={handleBackNavigation}
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

            {/* Message Input */}
            <div className={`p-4 border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyMessagesPage;