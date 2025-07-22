import React, { useState, useRef, useEffect } from 'react';
import { ClockIcon, BellIcon, ChevronDownIcon, ChevronLeftIcon } from '../common/Icons';

// Mock chat messages
const mockChat = [
      { id: 1, sender: 'user', author: 'You', avatar: 'Y', content: 'Hey team, any update on the Stephens project?', timestamp: '2 min ago' },
      { id: 2, sender: 'system', author: 'Mike Field', avatar: 'M', content: 'Completed the initial inspection for the Stephens Residence. Photos are uploaded.', timestamp: '1 min ago' },
  { id: 3, sender: 'user', author: 'You', avatar: 'Y', content: 'Great, thanks Mike!', timestamp: 'Just now' },
          { id: 4, sender: 'system', author: 'Sarah Owner', avatar: 'S', content: 'Permit for Rodriguez job submitted. City expects 3-day turnaround.', timestamp: 'Just now' },
];

const DashboardPageChatTest = () => {
  const [chat, setChat] = useState(mockChat);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat]);

  const handleSend = () => {
    if (!message.trim()) return;
    setChat(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', author: 'You', avatar: 'Y', content: message, timestamp: 'Just now' }
    ]);
    setMessage('');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat/Activity Feed */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow p-0 flex flex-col h-[480px] border border-gray-100">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-lg">Activity Feed / Chat</div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ background: '#f7fafc' }}>
              {chat.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}> 
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border'}`}> 
                    <div className="flex items-center mb-1">
                      <span className="font-bold text-xs mr-2">{msg.author}</span>
                      <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                    </div>
                    <div className="text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-gray-100 p-2 bg-white flex items-center">
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={handleSend}
                className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-full font-semibold text-sm hover:bg-blue-700 transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
        {/* Placeholder for rest of dashboard */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow p-6 h-[480px] flex items-center justify-center text-gray-400 text-xl border border-gray-100">
            Dashboard content area (test)
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageChatTest; 