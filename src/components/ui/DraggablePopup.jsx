import React, { useState, useRef, useEffect } from 'react';

const DraggablePopup = ({ 
  isOpen, 
  onClose, 
  children, 
  colorMode, 
  className = "",
  initialPosition = { x: 0, y: 0 },
  triggerRef = null 
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);

  // Position popup near trigger element when it opens
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupRect = popupRef.current?.getBoundingClientRect();
      
      // Default positioning: below and to the right of trigger
      let x = rect.left;
      let y = rect.bottom + 8;
      
      // Adjust if popup would go off screen
      if (popupRect) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Keep popup within viewport bounds
        if (x + popupRect.width > viewportWidth - 20) {
          x = viewportWidth - popupRect.width - 20;
        }
        if (x < 20) {
          x = 20;
        }
        
        if (y + popupRect.height > viewportHeight - 20) {
          y = rect.top - popupRect.height - 8;
        }
        if (y < 20) {
          y = 20;
        }
      }
      
      setPosition({ x, y });
    }
  }, [isOpen, triggerRef]);

  // Handle mouse down - start dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle') || e.target.closest('.popup-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  // Handle mouse move - update position while dragging
  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep popup within viewport bounds
      const popupRect = popupRef.current?.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let boundedX = newX;
      let boundedY = newY;
      
      if (popupRect) {
        boundedX = Math.max(20, Math.min(newX, viewportWidth - popupRect.width - 20));
        boundedY = Math.max(20, Math.min(newY, viewportHeight - popupRect.height - 20));
      }
      
      setPosition({ x: boundedX, y: boundedY });
    }
  };

  // Handle mouse up - stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle touch events for mobile
  const handleTouchStart = (e) => {
    if (e.target.closest('.drag-handle') || e.target.closest('.popup-header')) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      // Keep popup within viewport bounds
      const popupRect = popupRef.current?.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let boundedX = newX;
      let boundedY = newY;
      
      if (popupRect) {
        boundedX = Math.max(20, Math.min(newX, viewportWidth - popupRect.width - 20));
        boundedY = Math.max(20, Math.min(newY, viewportHeight - popupRect.height - 20));
      }
      
      setPosition({ x: boundedX, y: boundedY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add global event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragStart, position]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[9998]" />
      
      {/* Draggable popup */}
      <div
        ref={popupRef}
        className={`fixed z-[9999] ${className}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div 
          className={`
            shadow-2xl rounded-lg border-2 min-w-[280px] max-w-[400px] transform transition-all duration-200
            ${isDragging ? 'scale-105' : 'scale-100'}
            ${colorMode 
              ? 'bg-slate-800 border-slate-600 text-white' 
              : 'bg-white border-gray-200 text-gray-900'
            }
          `}
        >
          {/* Drag handle header */}
          <div 
            className={`
              popup-header flex items-center justify-between p-3 border-b cursor-grab select-none
              ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
              ${colorMode 
                ? 'border-slate-600 bg-slate-700' 
                : 'border-gray-200 bg-gray-50'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              {/* Drag handle icon */}
              <div className="drag-handle flex flex-col space-y-1">
                <div className={`w-4 h-0.5 rounded ${colorMode ? 'bg-gray-400' : 'bg-gray-400'}`} />
                <div className={`w-4 h-0.5 rounded ${colorMode ? 'bg-gray-400' : 'bg-gray-400'}`} />
                <div className={`w-4 h-0.5 rounded ${colorMode ? 'bg-gray-400' : 'bg-gray-400'}`} />
              </div>
              <span className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Drag to move
              </span>
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className={`
                p-1 rounded hover:bg-opacity-10 transition-colors
                ${colorMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-white' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-black'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default DraggablePopup;