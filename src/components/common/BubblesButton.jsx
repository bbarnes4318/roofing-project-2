import React, { useState, useEffect } from 'react';
import { SparklesIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import BubblesChat from './BubblesChat';
import { bubblesService } from '../../services/api';

const BubblesButton = ({ 
  currentProject = null, 
  colorMode = false, 
  className = "" 
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNewSuggestion, setHasNewSuggestion] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Periodic check for AI suggestions or alerts
  useEffect(() => {
    const checkForSuggestions = async () => {
      try {
        const status = await bubblesService.getStatus();
        setIsOnline(true);
        // Logic to determine if there are new suggestions
        // This could be based on new alerts, project updates, etc.
        setHasNewSuggestion(false); // Reset for now
      } catch (error) {
        setIsOnline(false);
        console.warn('Bubbles status check failed - service may be initializing:', error.message);
        // Don't spam console with errors during initialization
      }
    };

    // Check immediately, then every 5 minutes
    checkForSuggestions();
    const interval = setInterval(checkForSuggestions, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleChat = () => {
    if (isMinimized) {
      // If minimized, restore chat
      setIsMinimized(false);
      setIsChatOpen(true);
    } else {
      // Normal toggle behavior
      setIsChatOpen(!isChatOpen);
    }
    if (hasNewSuggestion) {
      setHasNewSuggestion(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsChatOpen(false);
  };

  const handleClose = () => {
    setIsChatOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
        <button
          onClick={handleToggleChat}
          className={`group relative w-16 h-16 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
            colorMode
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
          } ${isChatOpen ? 'rotate-12' : ''} ${isMinimized ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}`}
        >
          {/* Main Icon */}
          <div className="flex items-center justify-center w-full h-full">
            {isChatOpen ? (
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-white transition-transform group-hover:scale-110" />
            ) : (
              <SparklesIcon className="w-8 h-8 text-white transition-transform group-hover:scale-110" />
            )}
          </div>

          {/* Notification Badge */}
          {hasNewSuggestion && !isChatOpen && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          )}

          {/* Status Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}></div>

          {/* Ripple Effect */}
          {!isChatOpen && (
            <div className="absolute inset-0 rounded-full">
              <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                colorMode
                  ? 'bg-blue-400'
                  : 'bg-blue-400'
              }`}></div>
            </div>
          )}
        </button>

        {/* Tooltip */}
        {!isChatOpen && (
          <div className={`absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transform transition-all duration-200 opacity-0 group-hover:opacity-100 ${
            colorMode
              ? 'bg-neutral-800 text-white border border-neutral-600'
              : 'bg-gray-900 text-white'
          }`}>
            {isMinimized 
              ? "Restore your project copilot" 
              : hasNewSuggestion 
                ? "Bubbles has a recommendation" 
                : "Open Bubbles — your project copilot"
            }
            <div className={`absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
              colorMode ? 'border-t-neutral-800' : 'border-t-gray-900'
            }`}></div>
          </div>
        )}
      </div>

      {/* Bubbles Chat Component */}
      <BubblesChat
        isOpen={isChatOpen}
        onClose={handleClose}
        onMinimize={handleMinimize}
        currentProject={currentProject}
        colorMode={colorMode}
      />

      {/* Background Overlay for Mobile */}
      {isChatOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={handleClose}
        />
      )}
    </>
  );
};

export default BubblesButton;