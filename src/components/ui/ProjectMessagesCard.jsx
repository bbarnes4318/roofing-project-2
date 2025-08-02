import React, { useState, useMemo } from 'react';
import WorkflowProgressService from '../../services/workflowProgress';

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

    // Get project phase for circle color - use WorkflowProgressService if project has workflow data
    let projectPhase;
    
    if (project && project.workflow) {
        // Use the service to get the current phase from workflow data
        projectPhase = WorkflowProgressService.getCurrentPhase(project);
    } else if (activity?.metadata?.phase) {
        // If activity has phase metadata (like alerts), use that
        projectPhase = activity.metadata.phase;
    } else {
        // Fallback to status mapping or default
        const rawPhase = project?.status || project?.phase || activity?.phase || 'LEAD';
        
        // Map common status values to proper phases
        const phaseNormalizationMap = {
            'IN_PROGRESS': 'EXECUTION',
            'INPROGRESS': 'EXECUTION',
            'IN PROGRESS': 'EXECUTION',
            'ACTIVE': 'EXECUTION',
            'PENDING': 'LEAD',
            'NEW': 'LEAD',
            'COMPLETED': 'COMPLETION',
            'COMPLETE': 'COMPLETION',
            'FINISHED': 'COMPLETION',
            'DONE': 'COMPLETION',
            '2ND SUPP': '2ND_SUPP',
            '2ND-SUPP': '2ND_SUPP',
            'SECOND SUPP': '2ND_SUPP'
        };
        
        const upperPhase = String(rawPhase).toUpperCase();
        
        if (phaseNormalizationMap[upperPhase]) {
            projectPhase = phaseNormalizationMap[upperPhase];
        } else {
            const validPhases = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', '2ND_SUPP', 'COMPLETION'];
            projectPhase = validPhases.includes(upperPhase) ? upperPhase : 'LEAD';
        }
    }
    
    // Use WorkflowProgressService for consistent phase colors
    const getPhaseColors = (phase) => {
        return WorkflowProgressService.getPhaseColor(phase);
    };

    // State for contact info expansion
    const [showContactInfo, setShowContactInfo] = useState(false);

    return (
        <div className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d] border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-200'} rounded-[20px] shadow-sm border transition-all duration-200 hover:shadow-md`}>
            {/* Main message header - Compact 2-row layout */}
            <div 
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-opacity-80 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Phase Circle - Align to top */}
                <div className={`w-7 h-7 ${getPhaseColors(projectPhase).bg} rounded-full flex items-center justify-center ${getPhaseColors(projectPhase).text} font-bold text-xs shadow-sm flex-shrink-0 self-start`}>
                    {projectPhase.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                    {/* Row 1: Project# | Customer | Subject */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                            {/* Project Number - Fixed width for alignment */}
                            <button
                                className={`text-xs font-bold transition-colors hover:underline flex-shrink-0 ${
                                    colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                }`}
                                style={{ width: '60px' }}
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
                                {projectNumber}
                            </button>
                            
                            {/* Separator - Fixed position */}
                            <span className={`text-gray-400 text-xs mx-3`}>|</span>
                            
                            {/* Primary Customer - Fixed width container */}
                            <div className="flex items-center gap-1 flex-shrink-0" style={{ width: '140px' }}>
                                <button 
                                    className={`text-xs font-semibold transition-colors hover:underline truncate ${
                                        colorMode ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                                    }`}
                                    style={{ maxWidth: '120px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowContactInfo(!showContactInfo);
                                    }}
                                >
                                    {primaryCustomer}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowContactInfo(!showContactInfo);
                                    }}
                                    className={`transform transition-transform duration-200 ${showContactInfo ? 'rotate-180' : ''}`}
                                >
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Separator - Fixed position */}
                            <span className={`text-gray-400 text-xs mx-3`}>|</span>
                            
                            {/* Subject - Fixed start position */}
                            <span className={`text-xs font-medium truncate ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {subject}
                            </span>
                        </div>
                        
                        {/* Right side - Message indicator and actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* New message indicator */}
                            <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${colorMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                                <span className={`text-xs font-medium ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {conversation.length}
                                </span>
                            </div>
                            
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
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
                    
                    {/* Row 2: User name and message preview - MOVED CLOSER */}
                    <div className="flex items-center gap-2 mt-0">
                        <span className={`text-xs font-medium ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {lastMessage.user}:
                        </span>
                        <span className={`text-xs truncate flex-1 ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {lastMessage.comment}
                        </span>
                        <span className={`text-[10px] ${colorMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {formatTimestamp(lastMessage.timestamp)}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Contact Info Dropdown - Match Current Alerts styling exactly */}
            {showContactInfo && (
                <div className="flex items-start gap-2">
                    <div className="w-8 flex-shrink-0"></div>
                    <div className={`flex-1 p-2 rounded border text-[9px] ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`font-semibold mb-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                            {primaryCustomer}
                        </div>
                        <div className="space-y-0.5">
                            <div className={`${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                📍 {project?.client?.address || project?.clientAddress || '123 Main Street, City, State 12345'}
                            </div>
                            <a 
                                href={`tel:${(project?.client?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                                className={`block font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                            >
                                📞 {project?.client?.phone || project?.clientPhone || '(555) 123-4567'}
                            </a>
                            <a 
                                href={`mailto:${project?.client?.email || project?.clientEmail || 'customer@email.com'}`} 
                                className={`block font-medium transition-colors ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
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
            
            {/* Dropdown section - Professional message thread */}
            {isExpanded && (
                <div className={`px-4 py-4 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    {/* Thread header */}
                    <div className={`text-xs font-semibold mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Message Thread ({conversation.length} messages)
                    </div>
                    <div className={`max-h-72 overflow-y-auto space-y-4 ${colorMode ? 'scrollbar-dark' : 'scrollbar-light'}`}>
                        {conversation.map((message, index) => (
                            <div key={message.id} className={`flex flex-col ${
                                message.user === 'You' ? 'items-end' : 'items-start'
                            }`}>
                                {/* Message header with user and timestamp */}
                                <div className={`flex items-center gap-2 mb-1 ${
                                    message.user === 'You' ? 'flex-row-reverse' : 'flex-row'
                                }`}>
                                    {/* User avatar */}
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${
                                        message.user === 'You' 
                                            ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                    }`}>
                                        {message.user.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    {/* User name */}
                                    <span className={`text-xs font-semibold ${
                                        colorMode ? 'text-gray-200' : 'text-gray-700'
                                    }`}>
                                        {message.user}
                                    </span>
                                    {/* Timestamp */}
                                    <span className={`text-xs ${
                                        colorMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        {formatTimestamp(message.timestamp)}
                                    </span>
                                    {/* Quick Reply Icon for Individual Messages */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowQuickReply(true);
                                            setQuickReplyText(`@${message.user}: `);
                                        }}
                                        className={`ml-2 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                                            colorMode 
                                                ? 'bg-gray-700 text-gray-300 hover:bg-blue-600 hover:text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-blue-500 hover:text-white'
                                        }`}
                                        title={`Reply to ${message.user}`}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {/* Message content - Professional bubble style */}
                                <div className={`ml-8 p-3 rounded-lg relative group shadow-sm max-w-[80%] border ${
                                    message.user === 'You' 
                                        ? colorMode 
                                            ? 'bg-green-600 text-white ml-auto mr-0 border-green-500' 
                                            : 'bg-green-500 text-white ml-auto mr-0 border-green-400'
                                        : colorMode 
                                            ? 'bg-[#374151] text-gray-100 border-gray-600' 
                                            : 'bg-white text-gray-800 border-gray-200'
                                }`}>
                                    {/* Chat bubble tail */}
                                    <div className={`absolute top-2 w-3 h-3 transform rotate-45 ${
                                        message.user === 'You'
                                            ? colorMode
                                                ? 'bg-blue-600 -right-1'
                                                : 'bg-blue-500 -right-1'
                                            : colorMode
                                                ? 'bg-[#374151] -left-1'
                                                : 'bg-gray-100 -left-1'
                                    }`}></div>
                                    <div className={`text-sm leading-relaxed relative z-10 ${
                                        message.user === 'You' ? 'text-white' : colorMode ? 'text-gray-100' : 'text-gray-800'
                                    }`}>
                                        {message.comment}
                                    </div>
                                </div>
                                
                                {/* Separator line except for last message */}
                                {index < conversation.length - 1 && (
                                    <div className={`mt-2 border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectMessagesCard;