import React from 'react';
import { PaperAirplaneIcon } from '../common/Icons';

const AIAssistantPage = () => (
  <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
    <div className="p-4 border-b">
      <h1 className="text-xl font-bold text-gray-800">AI Assistant</h1>
      <p className="text-sm text-gray-500">Your personal assistant for managing projects.</p>
    </div>
    
    <div className="flex-1 p-6 overflow-y-auto space-y-4">
      <div className="flex justify-center">
        <div className="grid grid-cols-2 gap-4 max-w-xl">
          <button className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 text-left">
            <p className="font-semibold">Show today's tasks</p>
          </button>
          <button className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 text-left">
            <p className="font-semibold">Get project status</p>
          </button>
          <button className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 text-left">
            <p className="font-semibold">Create new estimate</p>
          </button>
          <button className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 text-left">
            <p className="font-semibold">Field support help</p>
          </button>
        </div>
      </div>
      
      <div className="flex justify-start">
        <div className="bg-gray-100 rounded-lg p-3 max-w-lg">
          Hello! I'm your AI assistant. I can help you with tasks, project updates, estimates, and field support. What can I help you with today?
        </div>
      </div>
    </div>
    
    <div className="p-4 border-t bg-gray-50">
      <div className="flex items-center bg-white rounded-lg border">
        <input 
          type="text" 
          placeholder="Ask me anything..." 
          className="flex-1 p-3 bg-transparent focus:outline-none" 
        />
        <button className="p-3 text-gray-500 hover:text-blue-600">
          <PaperAirplaneIcon />
        </button>
      </div>
    </div>
  </div>
);

export default AIAssistantPage;
