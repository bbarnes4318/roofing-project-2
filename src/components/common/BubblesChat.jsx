import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { bubblesService } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';

const BubblesChat = ({ 
  isOpen, 
  onClose, 
  currentProject = null, 
  colorMode = false,
  className = ""
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socket = useSocket();

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        id: 'welcome',
        type: 'ai',
        content: `Hello! I'm Bubbles, your AI project management assistant. 🎉

I'm here to help you with:
• **Project monitoring** and status updates
• **Workflow management** and task completion
• **Alert creation** and monitoring
• **Team coordination** and assignments

${currentProject ? `I see you're working on **${currentProject.name}**. ` : ''}How can I assist you today?`,
        timestamp: new Date(),
        suggestedActions: [
          { type: 'check_alerts', label: 'Check Current Alerts' },
          { type: 'project_status', label: 'Project Status' },
          { type: 'help', label: 'Show All Commands' }
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, currentProject]);

  // Listen for real-time Bubbles responses
  useEffect(() => {
    if (!socket) return;

    const handleBubblesResponse = (data) => {
      setIsLoading(false);
      setIsTyping(false);
      
      const aiMessage = {
        id: data.sessionId || Date.now(),
        type: 'ai',
        content: data.response.content,
        suggestedActions: data.response.suggestedActions || [],
        timestamp: new Date(data.timestamp),
        responseType: data.response.type
      };
      
      setMessages(prev => [...prev, aiMessage]);
    };

    const handleActionComplete = (data) => {
      const actionMessage = {
        id: `action_${Date.now()}`,
        type: 'system',
        content: `✅ Action completed: ${data.actionType}`,
        timestamp: new Date(data.timestamp),
        actionResult: data.result
      };
      
      setMessages(prev => [...prev, actionMessage]);
    };

    socket.on('bubbles_response', handleBubblesResponse);
    socket.on('bubbles_action_complete', handleActionComplete);

    return () => {
      socket.off('bubbles_response', handleBubblesResponse);
      socket.off('bubbles_action_complete', handleActionComplete);
    };
  }, [socket]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message = inputMessage.trim()) => {
    if (!message) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await bubblesService.chat(
        message, 
        currentProject?.id, 
        { 
          projectName: currentProject?.name,
          currentPage: window.location.pathname
        }
      );
      
      // Response handled by socket listener
    } catch (error) {
      setIsLoading(false);
      setIsTyping(false);
      
      const errorMessage = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      console.error('Bubbles chat error:', error);
    }
  };

  const handleActionClick = async (action) => {
    const actionMessage = `Execute ${action.type}: ${action.label}`;
    await handleSendMessage(actionMessage);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className={`w-96 h-[600px] rounded-2xl shadow-2xl border flex flex-col transition-all duration-300 ${
        colorMode 
          ? 'bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900 border-blue-500/50 text-white' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b rounded-t-2xl ${
          colorMode 
            ? 'border-blue-500/30 bg-gradient-to-r from-blue-900/50 to-purple-900/50' 
            : 'border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              colorMode ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`font-bold text-lg ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Bubbles AI
              </h3>
              <p className={`text-xs ${colorMode ? 'text-blue-200' : 'text-blue-600'}`}>
                {isTyping ? 'Thinking...' : 'Ready to help'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              colorMode 
                ? 'hover:bg-white/10 text-white' 
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 ${
                message.type === 'user'
                  ? colorMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : message.type === 'error'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : message.type === 'system'
                  ? colorMode
                    ? 'bg-green-900/30 text-green-200 border border-green-500/30'
                    : 'bg-green-50 text-green-800 border border-green-200'
                  : colorMode
                    ? 'bg-neutral-700 text-white border border-neutral-600'
                    : 'bg-gray-100 text-gray-900 border border-gray-200'
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {/* Suggested Actions */}
                {message.suggestedActions && message.suggestedActions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestedActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleActionClick(action)}
                        className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                          colorMode
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-200 hover:bg-blue-600/30'
                            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className={`text-xs mt-2 opacity-60 ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className={`rounded-2xl p-3 ${
                colorMode 
                  ? 'bg-neutral-700 text-white border border-neutral-600' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs ml-2">Bubbles is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`p-4 border-t ${colorMode ? 'border-neutral-600' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Bubbles anything about your projects..."
              className={`flex-1 resize-none rounded-xl px-4 py-3 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                colorMode
                  ? 'bg-neutral-800 border-neutral-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              rows={1}
              style={{ maxHeight: '120px' }}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className={`p-3 rounded-xl transition-all ${
                isLoading || !inputMessage.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              } ${
                colorMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Quick actions */}
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              { text: 'Help', command: 'help' },
              { text: 'Project Status', command: 'show project status' },
              { text: 'Check Alerts', command: 'check my alerts' }
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(action.command)}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                  colorMode
                    ? 'bg-neutral-700 hover:bg-neutral-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {action.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubblesChat;