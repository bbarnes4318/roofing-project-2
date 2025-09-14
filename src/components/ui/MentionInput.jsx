import React, { useState, useRef, useEffect } from 'react';
import { UserIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const MentionInput = ({ 
  value, 
  onChange, 
  placeholder = "Type your comment here...",
  availableUsers = [],
  className = "",
  rows = 2,
  onKeyPress = null
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  const textareaRef = useRef(null);
  const mentionListRef = useRef(null);

  // Filter users based on mention query
  const filteredUsers = availableUsers.filter(user => 
    user.firstName?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Handle text change and detect @ mentions
  const handleTextChange = (e) => {
    const newValue = e.target.value;
    onChange(e);
    
    // Check for @ mention
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentions(true);
      setSelectedMentionIndex(0);
      
      // Position the mention dropdown
      const textarea = textareaRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        const textareaStyle = window.getComputedStyle(textarea);
        const lineHeight = parseInt(textareaStyle.lineHeight) || 20;
        const lines = textBeforeCursor.split('\n').length;
        
        setMentionPosition({
          top: lines * lineHeight + 25,
          left: 0
        });
      }
    } else {
      setShowMentions(false);
    }
  };

  // Handle mention selection
  const handleMentionSelect = (user) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Find the last @ and replace it with the mention
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const beforeMention = textBeforeCursor.substring(0, lastAtIndex);
    const mentionText = `@${user.firstName} ${user.lastName}`;
    
    const newValue = beforeMention + mentionText + textAfterCursor;
    onChange({ target: { value: newValue } });
    
    // Set cursor position after the mention
    const newCursorPosition = beforeMention.length + mentionText.length;
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      textarea.focus();
    }, 0);
    
    setShowMentions(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredUsers[selectedMentionIndex]) {
          handleMentionSelect(filteredUsers[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    } else if (onKeyPress) {
      onKeyPress(e);
    }
  };

  // Close mentions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mentionListRef.current && !mentionListRef.current.contains(event.target) &&
          textareaRef.current && !textareaRef.current.contains(event.target)) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected mention into view
  useEffect(() => {
    if (mentionListRef.current && showMentions) {
      const selectedElement = mentionListRef.current.children[selectedMentionIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedMentionIndex, showMentions]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-2 py-1 text-[10px] border border-gray-200 rounded resize-none focus:outline-none focus:border-blue-400 ${className}`}
        rows={rows}
      />
      
      {/* Mention dropdown */}
      {showMentions && filteredUsers.length > 0 && (
        <div
          ref={mentionListRef}
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`,
            minWidth: '200px'
          }}
        >
          {filteredUsers.map((user, index) => (
            <div
              key={user.id}
              onClick={() => handleMentionSelect(user)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                index === selectedMentionIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
              }`}
            >
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </div>
                {user.email && (
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* No results message */}
      {showMentions && filteredUsers.length === 0 && mentionQuery && (
        <div
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`,
            minWidth: '200px'
          }}
        >
          <div className="text-sm text-gray-500">No users found</div>
        </div>
      )}
    </div>
  );
};

export default MentionInput;
