import React, { useState, useMemo } from 'react';

const ProjectMessagesCard = ({ activity, onProjectSelect, projects, colorMode, onQuickReply }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showQuickReply, setShowQuickReply] = useState(false);
    const [quickReplyText, setQuickReplyText] = useState('');

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
        }) + ', ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Generate mock conversation data for the dropdown
    const generateConversation = () => {
        const users = ['Sarah Owner', 'Mike Rodriguez', 'Jennifer Williams', 'David Chen'];
        const comments = [
            'Project is progressing well. Materials arrived on schedule.',
            'Customer has approved the color selection.',
            'Inspection completed successfully. Moving to next phase.',
            'Weather delays expected for tomorrow. Adjusting timeline.',
            'Quality check passed. Ready for final review.',
            'Customer meeting scheduled for Friday at 2 PM.',
            'All permits have been approved and filed.',
            'Updated project timeline shared with team.'
        ];

        const conversation = [];
        const messageCount = Math.floor(Math.random() * 5) + 2; // 2-6 messages
        
        for (let i = 0; i < messageCount; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const comment = comments[Math.floor(Math.random() * comments.length)];
            const daysAgo = Math.floor(Math.random() * 7);
            const hoursAgo = Math.floor(Math.random() * 24);
            const messageTime = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
            
            conversation.push({
                id: `msg_${i}`,
                user: user,
                comment: comment,
                timestamp: messageTime.toISOString()
            });
        }
        
        // Sort by timestamp (oldest first for chat-like flow)
        return conversation.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };

    // Generate conversation only once using useMemo to prevent re-generation on every render
    const conversation = useMemo(() => generateConversation(), [activity.id]);
    const lastMessage = conversation[conversation.length - 1];

    // Get project data
    const project = projects?.find(p => p.id === activity.projectId);
    const projectNumber = project?.projectNumber || activity.projectNumber || '12345';
    const primaryCustomer = project?.client?.name || project?.clientName || activity.projectName || 'Primary Customer';
    const subject = activity.subject || 'Project Update';

    // Quick reply handlers
    const handleQuickReplySubmit = (e) => {
        e.preventDefault();
        if (!quickReplyText.trim()) return;
        
        if (onQuickReply) {
            onQuickReply({
                projectId: activity.projectId,
                projectNumber: projectNumber,
                primaryCustomer: primaryCustomer,
                subject: subject,
                message: quickReplyText.trim(),
                replyToActivity: activity
            });
        }
        
        setQuickReplyText('');
        setShowQuickReply(false);
    };

    const handleQuickReplyCancel = () => {
        setQuickReplyText('');
        setShowQuickReply(false);
    };

    // Get project phase for circle color - ensure we have the right phase
    const projectPhase = project?.status || project?.phase || activity.phase || 'LEAD';
    
    // Helper function to get phase circle colors (matching alerts section exactly)
    const getPhaseCircleColors = (phase) => {
        const phaseMap = {
            'LEAD': 'from-purple-400 to-purple-600',     
            'PROSPECT': 'from-orange-500 to-orange-600', 
            'APPROVED': 'from-green-500 to-green-600',   
            'EXECUTION': 'from-blue-500 to-blue-600',    
            '2ND_SUPP': 'from-pink-500 to-pink-600',     
            'COMPLETION': 'from-emerald-500 to-emerald-600',
            // Handle lowercase versions
            'lead': 'from-purple-400 to-purple-600',     
            'prospect': 'from-orange-500 to-orange-600', 
            'approved': 'from-green-500 to-green-600',   
            'execution': 'from-blue-500 to-blue-600',    
            '2nd_supp': 'from-pink-500 to-pink-600',     
            'completion': 'from-emerald-500 to-emerald-600'
        };
        return phaseMap[phase] || 'from-purple-400 to-purple-600'; // Default to LEAD colors
    };

    // State for contact info expansion
    const [showContactInfo, setShowContactInfo] = useState(false);

    return (
        <div className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-lg shadow-sm border transition-all duration-200`}>
            {/* Main message header - Compact like alerts */}
            <div 
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-opacity-80 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Phase Circle - Same size as alerts */}
                <div className={`w-8 h-8 bg-gradient-to-br ${getPhaseCircleColors(projectPhase)} rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0`}>
                    {projectPhase.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                    {/* Main row with all info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            {/* Project Number - Clickable blue link */}
                            <button
                                className={`text-xs font-bold transition-colors hover:underline ${
                                    colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onProjectSelect && project) {
                                        const projectWithHighlight = {
                                            ...project,
                                            highlightOnProjectsPage: true,
                                            scrollToProjectId: String(project.id)
                                        };
                                        onProjectSelect(projectWithHighlight, 'Projects', null, 'Project Messages');
                                    }
                                }}
                            >
                                #{projectNumber}
                            </button>
                            
                            {/* Primary Customer - Clickable for contact info */}
                            <button 
                                className={`text-xs font-semibold transition-colors hover:underline truncate ${
                                    colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowContactInfo(!showContactInfo);
                                }}
                            >
                                {primaryCustomer}
                            </button>
                            
                            {/* Subject */}
                            <span className={`text-xs font-medium truncate ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {subject}
                            </span>
                        </div>
                        
                        {/* Right side - Actions only */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Quick Reply Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowQuickReply(!showQuickReply);
                                }}
                                className={`p-1 rounded transition-colors ${
                                    showQuickReply 
                                        ? colorMode 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-blue-500 text-white'
                                        : colorMode 
                                            ? 'bg-gray-700 text-gray-300 hover:bg-blue-600 hover:text-white' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-blue-500 hover:text-white'
                                }`}
                                title="Quick Reply"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 818 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                            </button>
                            
                            {/* Dropdown arrow */}
                            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    {/* Last message with user and timestamp - cohesive flow */}
                    <div className={`text-xs mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{lastMessage.user}</span>
                        <span className="mx-1">•</span>
                        <span>{formatTimestamp(lastMessage.timestamp)}</span>
                        <span className="mx-2">—</span>
                        <span className="italic">{lastMessage.comment}</span>
                    </div>
                </div>
            </div>
            
            {/* Contact Info Dropdown */}
            {showContactInfo && (
                <div className={`px-3 py-2 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`p-3 rounded-lg ${colorMode ? 'bg-[#1e293b]' : 'bg-white'} border ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <div className={`text-sm font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                            {primaryCustomer}
                        </div>
                        <div className="space-y-1">
                            <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                📍 {project?.client?.address || project?.clientAddress || '123 Main Street, City, State 12345'}
                            </div>
                            <a 
                                href={`tel:${(project?.client?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                                className={`block text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                            >
                                📞 {project?.client?.phone || project?.clientPhone || '(555) 123-4567'}
                            </a>
                            <a 
                                href={`mailto:${project?.client?.email || project?.clientEmail || 'customer@email.com'}`} 
                                className={`block text-xs font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                            >
                                ✉️ {project?.client?.email || project?.clientEmail || 'customer@email.com'}
                            </a>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Quick Reply Section */}
            {showQuickReply && (
                <div className={`px-4 py-3 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
                    <form onSubmit={handleQuickReplySubmit} className="space-y-3">
                        {/* Reply Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 818 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                <span className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                    Quick Reply to {primaryCustomer}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleQuickReplyCancel}
                                className={`p-1 rounded-full hover:bg-gray-200 ${colorMode ? 'hover:bg-gray-700 text-gray-400' : 'text-gray-500'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Project Context */}
                        <div className={`text-xs p-2 rounded ${colorMode ? 'bg-[#232b4d] text-gray-300' : 'bg-white text-gray-600'}`}>
                            <span className="font-medium">Project:</span> {projectNumber} | <span className="font-medium">Subject:</span> {subject}
                        </div>
                        
                        {/* Quick Reply Input */}
                        <div className="flex gap-2">
                            <textarea
                                value={quickReplyText}
                                onChange={(e) => setQuickReplyText(e.target.value)}
                                placeholder="Type your quick reply..."
                                className={`flex-1 p-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    colorMode 
                                        ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                                        : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                                }`}
                                rows="2"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        handleQuickReplySubmit(e);
                                    }
                                }}
                            />
                            <div className="flex flex-col gap-1">
                                <button
                                    type="submit"
                                    disabled={!quickReplyText.trim()}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                        quickReplyText.trim()
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    Send
                                </button>
                                <button
                                    type="button"
                                    onClick={handleQuickReplyCancel}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                        colorMode 
                                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                        
                        {/* Keyboard Shortcut Hint */}
                        <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            💡 Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to send quickly
                        </div>
                    </form>
                </div>
            )}
            
            {/* Dropdown section - REAL Chat-style Messages */}
            {isExpanded && (
                <div className={`border-t ${colorMode ? 'bg-[#1a1f2e] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`max-h-80 overflow-y-auto p-4 space-y-4 ${colorMode ? 'scrollbar-dark' : 'scrollbar-light'}`}>
                        {conversation.map((message, index) => {
                            // Alternate message alignment to simulate back-and-forth conversation
                            const isCurrentUser = index % 2 === 0;
                            
                            return (
                                <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-end gap-3`}>
                                    {/* Avatar for others (left side) */}
                                    {!isCurrentUser && (
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                            {message.user.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                        </div>
                                    )}
                                    
                                    {/* Message bubble container */}
                                    <div className={`max-w-xs lg:max-w-sm xl:max-w-md`}>
                                        {/* Sender name and timestamp */}
                                        <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                            <span className={`text-xs font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {isCurrentUser ? 'You' : message.user}
                                            </span>
                                            <span className={`text-xs ${colorMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {formatTimestamp(message.timestamp)}
                                            </span>
                                            {/* Quick Reply Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowQuickReply(true);
                                                    setTimeout(() => {
                                                        const replyForm = document.querySelector('textarea[placeholder*="reply"]');
                                                        if (replyForm) {
                                                            replyForm.focus();
                                                        }
                                                    }, 150);
                                                }}
                                                className={`p-1 rounded-full transition-all duration-200 hover:scale-105 opacity-60 hover:opacity-100 ${
                                                    colorMode 
                                                        ? 'hover:bg-gray-600 text-gray-400 hover:text-blue-300' 
                                                        : 'hover:bg-gray-200 text-gray-500 hover:text-blue-600'
                                                }`}
                                                title={`Reply to ${message.user}`}
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 818 8v2M3 10l6 6m-6-6l6-6" />
                                                </svg>
                                            </button>
                                        </div>
                                        
                                        {/* Message bubble with chat styling */}
                                        <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                                            isCurrentUser 
                                                ? colorMode
                                                    ? 'bg-blue-600 text-white rounded-br-md'
                                                    : 'bg-blue-500 text-white rounded-br-md'
                                                : colorMode
                                                    ? 'bg-[#2d3748] text-gray-100 border border-gray-600 rounded-bl-md'
                                                    : 'bg-white text-gray-800 border border-gray-200 shadow-md rounded-bl-md'
                                        }`}>
                                            {/* Message text */}
                                            <div className="text-sm leading-relaxed">
                                                {message.comment}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Avatar for current user (right side) */}
                                    {isCurrentUser && (
                                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                            Y
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectMessagesCard;