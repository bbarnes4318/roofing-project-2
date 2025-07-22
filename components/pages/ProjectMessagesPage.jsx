import React, { useState, useEffect } from 'react';
import { PaperAirplaneIcon } from '../common/Icons';

const ProjectMessagesPage = ({ project, onSendMessage }) => {
  const [messages, setMessages] = useState(project.messages);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    setMessages(project.messages);
  }, [project.messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const newMsg = { 
      id: Date.now(), 
      author: 'Sarah Owner', 
      avatar: 'S', 
      content: newMessage, 
      timestamp: 'Just now' 
    };
    setMessages([...messages, newMsg]);
    setNewMessage('');
    onSendMessage(project, newMessage);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm flex flex-col" style={{height: '70vh'}}>
      <div className="p-4 border-b">
        <h3 className="text-xl font-bold text-gray-800">Project Messages</h3>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-4 ${msg.author === 'Sarah Owner' ? 'flex-row-reverse' : ''}`}
          >
            <div 
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${
                msg.author === 'Sarah Owner' ? 'bg-blue-600' : 'bg-gray-500'
              }`}
            >
              {msg.avatar}
            </div>
            <div 
              className={`p-4 rounded-lg max-w-lg ${
                msg.author === 'Sarah Owner' ? 'bg-blue-50' : 'bg-gray-100'
              }`}
            >
              <p className="font-semibold">{msg.author}</p>
              <p className="text-gray-800 mt-1 whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs text-gray-400 mt-2 text-right">{msg.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center bg-white rounded-lg border">
          <input 
            type="text" 
            placeholder="Type your message..." 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            className="flex-1 p-3 bg-transparent focus:outline-none" 
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
          />
          <button 
            onClick={handleSendMessage} 
            className="p-3 text-gray-500 hover:text-blue-600"
          >
            <PaperAirplaneIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectMessagesPage;
