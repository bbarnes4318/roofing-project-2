// --- BubblesButton Component ---
import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '../common/Icons';
import BubblesChat from '../common/BubblesChat';
import { bubblesService } from '../../services/api';

const BubblesButton = ({ currentProject = null, colorMode = false, className = "" }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNewSuggestion, setHasNewSuggestion] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await bubblesService.getStatus();
        setIsOnline(true);
      } catch (error) {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsChatOpen(true);
    } else {
      setIsChatOpen(!isChatOpen);
    }
    setHasNewSuggestion(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsChatOpen(false);
  };

  return (
    <>
      <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
        <button
          onClick={handleToggleChat}
          className={`group relative w-16 h-16 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 flex items-center justify-center
            ${colorMode ? 'bg-[#F8FAFC]' : 'bg-[#F8FAFC]'}
            ${isChatOpen ? 'rotate-12' : ''}`}
        >
          <SparklesIcon className="w-8 h-8 text-white transition-transform group-hover:scale-110" />
          {hasNewSuggestion && !isChatOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${colorMode ? 'border-slate-900' : 'border-white'} ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        </button>
      </div>
      <BubblesChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onMinimize={handleMinimize}
        currentProject={currentProject}
        colorMode={colorMode}
      />
    </>
  );
};

export default BubblesButton;
