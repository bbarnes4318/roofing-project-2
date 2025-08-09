import React, { useState, useMemo, useRef } from 'react';
import WorkflowProgressService from '../../services/workflowProgress';
import DraggablePopup from './DraggablePopup';
import { useProjectMessages, useCreateProjectMessage, useMarkMessageAsRead } from '../../hooks/useProjectMessages';

const ProjectMessagesCard = ({ activity, onProjectSelect, projects, colorMode, onQuickReply, isExpanded, onToggleExpansion, useRealData = false }) => {
    // Use external expansion state if provided, otherwise use internal state
    const [internalExpanded, setInternalExpanded] = useState(false);
    const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;
    const [showQuickReply, setShowQuickReply] = useState(false);
    const [quickReplyText, setQuickReplyText] = useState('');

    // Get project data
    const project = projects?.find(p => p.id === activity.projectId);
    
    // Fetch real project messages if enabled
    const { 
        data: projectMessagesData, 
        isLoading: messagesLoading,
        error: messagesError 
    } = useProjectMessages(activity.projectId, {
        limit: 10,
        includeReplies: true
    });
    
    const createMessage = useCreateProjectMessage();
    const markAsRead = useMarkMessageAsRead();

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
        
        // Sort by timestamp (newest first for most recent message display)
        return conversation.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    // Use real data if available and enabled, otherwise generate mock conversation
    const conversation = useMemo(() => {
        if (useRealData && projectMessagesData?.data?.length > 0) {
            // Transform real project messages to conversation format
            const realMessages = projectMessagesData.data.flatMap(message => {
                const mainMessage = {
                    id: message.id,
                    user: message.authorName,
                    comment: message.content,
                    timestamp: message.createdAt
                };
                
                const replies = message.replies?.map(reply => ({
                    id: reply.id,
                    user: reply.authorName,
                    comment: reply.content,
                    timestamp: reply.createdAt
                })) || [];
                
                return [mainMessage, ...replies];
            });
            
            // Sort by timestamp (newest first)
            return realMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else {
            // Fall back to mock data
            return generateConversation();
        }
    }, [activity.id, useRealData, projectMessagesData]);
    
    const lastMessage = conversation[0]; // First item is now the most recent

    // Get project data (already defined above)
    const projectNumber = project?.projectNumber || activity.projectNumber || '12345';
    const primaryCustomer = project?.client?.name || project?.clientName || activity.projectName || 'Primary Customer';
    const subject = activity.subject || 'Project Update';

    // Quick reply handlers
    const handleQuickReplySubmit = async (e) => {
        e.preventDefault();
        if (!quickReplyText.trim()) return;
        
        try {
            if (useRealData && activity.projectId) {
                // Use real API to create message
                await createMessage.mutateAsync({
                    projectId: activity.projectId,
                    content: quickReplyText.trim(),
                    subject: `Re: ${subject}`,
                    priority: 'MEDIUM'
                });
            } else if (onQuickReply) {
                // Fall back to legacy quick reply handler
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
        } catch (error) {
            console.error('Failed to send quick reply:', error);
            // Could add toast notification here
        }
    };

    const handleQuickReplyCancel = () => {
        setQuickReplyText('');
        setShowQuickReply(false);
    };

    // Use centralized phase detection service - SINGLE SOURCE OF TRUTH
    const projectPhase = WorkflowProgressService.getProjectPhase(project, activity);
    
    // Use WorkflowProgressService for consistent phase colors
    const getPhaseColors = (phase) => {
        return WorkflowProgressService.getPhaseColor(phase);
    };

    // State for contact info expansion
    const [showContactInfo, setShowContactInfo] = useState(false);
    
    // Ref for tracking primary contact button
    const contactButtonRef = useRef(null);

    return (
        <div className={`card-simple ${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d] border-gray-600' : 'hover:bg-gray-50/50'}`}>
            {/* Main message header - Compact 2-row layout */}
            <div 
                className="flex items-center gap-1.5 p-1.5 cursor-pointer hover:bg-opacity-80 transition-colors"
                onClick={() => {
                    if (onToggleExpansion) {
                        onToggleExpansion(activity.id);
                    } else {
                        setInternalExpanded(!internalExpanded);
                    }
                }}
            >
                {/* Phase Circle - Align to top */}
                <div className={`w-5 h-5 ${getPhaseColors(projectPhase).bg} rounded-full flex items-center justify-center ${getPhaseColors(projectPhase).text} font-bold text-[9px] shadow-sm flex-shrink-0 self-start`}>
                    {projectPhase.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                    {/* Row 1: Project# | Customer | Subject */}
                    <div className="flex items-center justify-between overflow-hidden relative">
                        <div className="flex items-center min-w-0 flex-1">
                            {/* Project Number - Fixed width for alignment */}
                            <button
                                className={`text-[9px] font-bold transition-colors hover:underline flex-shrink-0 ${
                                    colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                }`}
                                style={{ width: '46px' }}
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
                            
                            {/* Primary Customer */}
                            <div className="flex items-center gap-1">
                                <button 
                                    ref={contactButtonRef}
                                    className={`text-[9px] font-semibold transition-colors hover:underline truncate ${
                                        colorMode ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                                    }`}
                                    style={{ maxWidth: '80px' }}
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
                                    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Subject - Fixed position for perfect alignment */}
                            <div style={{ position: 'absolute', left: '200px', width: '200px' }}>
                                <span 
                                    className={`text-[9px] font-medium whitespace-nowrap ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}
                                    style={{ 
                                        display: 'inline-block',
                                        verticalAlign: 'baseline',
                                        lineHeight: '1'
                                    }}
                                >
                                    Subject: {subject}
                                </span>
                            </div>
                        </div>
                        
                        {/* Right side - Message indicator and actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* New message indicator */}
                            <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${colorMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                                <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {conversation.length}
                                </span>
                            </div>
                            
                            {/* Task indicator - shows when message has a task */}
                            {activity.hasTask && (
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-red-500">
                                        Task
                                    </span>
                                </div>
                            )}
                            
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
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                            </button>
                            
                            {/* Dropdown arrow */}
                            <div className={`transform transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    {/* Row 2: From, To, and Timestamp */}
                    <div className="flex items-baseline justify-between gap-0 mt-0 overflow-hidden relative">
                        <div className="flex items-baseline gap-0">
                            {/* From - Fixed width container for consistent spacing */}
                            <div 
                                className="flex-shrink-0"
                                style={{ width: '100px', marginLeft: '8px' }}
                            >
                                <span className={`text-[9px] font-medium whitespace-nowrap ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    From: {lastMessage.user}
                                </span>
                            </div>
                            
                            {/* To - Fixed position to match Subject exactly */}
                            <div style={{ position: 'absolute', left: '200px', width: '200px' }}>
                                <span 
                                    className={`text-[9px] font-medium whitespace-nowrap ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}
                                    style={{ 
                                        display: 'inline-block',
                                        verticalAlign: 'baseline',
                                        lineHeight: '1'
                                    }}
                                >
                                    {(() => {
                                        // Dynamic To field based on message participants
                                        const allParticipants = [...new Set(conversation.map(msg => msg.user))];
                                        const recipients = allParticipants.filter(user => user !== lastMessage.user);
                                        
                                        if (recipients.length === 0) {
                                            return `To: ${primaryCustomer}`;
                                        } else if (recipients.length === 1) {
                                            return `To: ${recipients[0]}`;
                                        } else if (recipients.length === 2) {
                                            return `To: ${recipients.join(', ')}`;
                                        } else {
                                            return `To: ${recipients[0]} +${recipients.length - 1} others`;
                                        }
                                    })()}
                                </span>
                            </div>
                        </div>
                        
                        {/* Timestamp - Far right */}
                        <div className="flex-shrink-0">
                            <span className={`text-[8px] whitespace-nowrap ${colorMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                {formatTimestamp(lastMessage.timestamp)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Draggable Contact Info Popup */}
            <DraggablePopup
                isOpen={showContactInfo}
                onClose={() => setShowContactInfo(false)}
                colorMode={colorMode}
                triggerRef={contactButtonRef}
            >
                <div className="space-y-2 max-w-[280px]">
                    {/* Primary Customer */}
                    <div className={`text-xs font-semibold border-b ${colorMode ? 'text-white border-gray-600' : 'text-gray-900 border-gray-200'} pb-1`}>
                        Primary Customer
                    </div>
                    <div className="space-y-1">
                        <div className={`text-xs font-medium ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {project?.customer?.primaryName || project?.client?.name || project?.clientName || primaryCustomer}
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px]">📞</span>
                            <a 
                                href={`tel:${(project?.customer?.primaryPhone || project?.client?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`}
                                className={`text-[10px] hover:underline ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                            >
                                {project?.customer?.primaryPhone || project?.client?.phone || project?.clientPhone || '(555) 123-4567'}
                            </a>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px]">✉️</span>
                            <a 
                                href={`mailto:${project?.customer?.primaryEmail || project?.client?.email || project?.clientEmail || 'customer@email.com'}`}
                                className={`text-[10px] hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                            >
                                {project?.customer?.primaryEmail || project?.client?.email || project?.clientEmail || 'customer@email.com'}
                            </a>
                        </div>
                    </div>
                    
                    {/* Secondary Customer (if exists) */}
                    {(project?.customer?.secondaryName || project?.customer?.secondaryPhone || project?.customer?.secondaryEmail) && (
                        <>
                            <div className={`text-xs font-semibold border-b ${colorMode ? 'text-white border-gray-600' : 'text-gray-900 border-gray-200'} pb-1 pt-2`}>
                                Secondary Customer
                            </div>
                            <div className="space-y-1">
                                {project?.customer?.secondaryName && (
                                    <div className={`text-xs font-medium ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {project.customer.secondaryName}
                                    </div>
                                )}
                                {project?.customer?.secondaryPhone && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px]">📞</span>
                                        <a 
                                            href={`tel:${project.customer.secondaryPhone.replace(/[^\d+]/g, '')}`}
                                            className={`text-[10px] hover:underline ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                                        >
                                            {project.customer.secondaryPhone}
                                        </a>
                                    </div>
                                )}
                                {project?.customer?.secondaryEmail && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px]">✉️</span>
                                        <a 
                                            href={`mailto:${project.customer.secondaryEmail}`}
                                            className={`text-[10px] hover:underline truncate ${colorMode ? 'text-blue-400' : 'text-blue-600'}`}
                                        >
                                            {project.customer.secondaryEmail}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    
                    {/* Project Address */}
                    <div className={`text-[10px] ${colorMode ? 'text-gray-400' : 'text-gray-600'} flex items-start gap-1 pt-1 border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <span>📍</span>
                        <span className="leading-tight">{project?.customer?.address || project?.client?.address || project?.clientAddress || '123 Main Street, City, State 12345'}</span>
                    </div>
                </div>
            </DraggablePopup>
            
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
            {expanded && (
                <div className={`px-2 py-2 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    {/* Thread header */}
                    <div className={`text-[9px] font-semibold mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Message Thread ({conversation.length} messages)
                    </div>
                    <div className={`max-h-48 overflow-y-auto space-y-2 ${colorMode ? 'scrollbar-dark' : 'scrollbar-light'}`}>
                        {conversation.map((message, index) => (
                            <div key={message.id} className={`flex flex-col ${
                                message.user === 'You' ? 'items-end' : 'items-start'
                            }`}>
                                {/* Message header with user and timestamp */}
                                <div className={`flex items-center gap-1 mb-1 ${
                                    message.user === 'You' ? 'flex-row-reverse' : 'flex-row'
                                }`}>
                                    {/* User avatar */}
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[8px] shadow-sm ${
                                        message.user === 'You' 
                                            ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                    }`}>
                                        {message.user.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    {/* User name */}
                                    <span className={`text-[9px] font-semibold ${
                                        colorMode ? 'text-gray-200' : 'text-gray-700'
                                    }`}>
                                        {message.user}
                                    </span>
                                    {/* Timestamp */}
                                    <span className={`text-[8px] ${
                                        colorMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        {formatTimestamp(message.timestamp)}
                                    </span>
                                    {/* Quick Reply Icon for Individual Messages - Always visible */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowQuickReply(true);
                                            setQuickReplyText(`@${message.user}: `);
                                        }}
                                        className={`ml-1 p-0.5 rounded transition-colors ${
                                            colorMode 
                                                ? 'bg-gray-700 text-gray-300 hover:bg-blue-600 hover:text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-blue-500 hover:text-white'
                                        }`}
                                        title={`Reply to ${message.user}`}
                                    >
                                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {/* Message content - Compact bubble style */}
                                <div className={`ml-5 p-1.5 rounded relative group shadow-sm max-w-[85%] border ${
                                    message.user === 'You' 
                                        ? colorMode 
                                            ? 'bg-green-600 text-white ml-auto mr-0 border-green-500' 
                                            : 'bg-green-500 text-white ml-auto mr-0 border-green-400'
                                        : colorMode 
                                            ? 'bg-[#374151] text-gray-100 border-gray-600' 
                                            : 'bg-white text-gray-800 border-gray-200'
                                }`}>
                                    {/* Chat bubble tail - smaller */}
                                    <div className={`absolute top-1 w-2 h-2 transform rotate-45 ${
                                        message.user === 'You'
                                            ? colorMode
                                                ? 'bg-green-600 -right-0.5'
                                                : 'bg-green-500 -right-0.5'
                                            : colorMode
                                                ? 'bg-[#374151] -left-0.5'
                                                : 'bg-white -left-0.5'
                                    }`}></div>
                                    <div className={`text-[9px] leading-tight relative z-10 ${
                                        message.user === 'You' ? 'text-white' : colorMode ? 'text-gray-100' : 'text-gray-800'
                                    }`}>
                                        {message.comment}
                                    </div>
                                </div>
                                
                                {/* Separator line except for last message */}
                                {index < conversation.length - 1 && (
                                    <div className={`mt-1 border-b ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
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