import React, { useState, useMemo, useRef, useEffect } from 'react';
import WorkflowProgressService from '../../services/workflowProgress';
import { useProjectMessages, useCreateProjectMessage, useMarkMessageAsRead } from '../../hooks/useProjectMessages';

const ProjectMessagesCard = ({ activity, onProjectSelect, projects, colorMode, onQuickReply, isExpanded, onToggleExpansion, useRealData = false, sourceSection = 'Project Messages', onDelete = null, isDeleting = false }) => {
    // Use external expansion state if provided, otherwise use internal state
    const [internalExpanded, setInternalExpanded] = useState(false);
    const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;
    const [showQuickReply, setShowQuickReply] = useState(false);
    const [quickReplyText, setQuickReplyText] = useState('');
    const quickReplyTextareaRef = useRef(null);

    // Get project data
    const project = projects?.find(p => p && p.id === activity.projectId);
    
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
                    user: message.author ? `${message.author.firstName} ${message.author.lastName}` : message.authorName || 'Unknown User',
                    comment: message.content,
                    timestamp: message.createdAt,
                    recipients: message.recipients || [] // Include recipients from message data
                };

                const replies = message.replies?.map(reply => ({
                    id: reply.id,
                    user: reply.author ? `${reply.author.firstName} ${reply.author.lastName}` : reply.authorName || 'Unknown User',
                    comment: reply.content,
                    timestamp: reply.createdAt,
                    recipients: reply.recipients || []
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

    // Get project data with proper fallbacks
    const projectNumber = project?.projectNumber || activity.projectNumber || '12345';
    const primaryCustomer = project?.customer?.primaryName || project?.client?.name || project?.clientName || project?.projectName || activity.projectName || 'Primary Customer';
    const subject = activity.subject || 'Project Update';
    
    // Debug logging
    console.log('ProjectMessagesCard Debug:', {
        projectId: activity.projectId,
        project: project,
        activity: activity,
        projectNumber,
        primaryCustomer,
        subject
    });

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
    
    // Use WorkflowProgressService for consistent phase colors and initials
    const getPhaseButton = (phase) => {
        try {
            return WorkflowProgressService.getPhaseButtonProps(phase || 'LEAD');
        } catch (err) {
            console.warn('Phase data unavailable for phase:', phase, err);
            return { initials: 'N', bgColor: 'bg-gray-400', textColor: 'text-white' };
        }
    };

    // State for contact info expansion
    const [showContactInfo, setShowContactInfo] = useState(false);
    
    // Refs for dropdown functionality
    const contactButtonRef = useRef(null);
    const dropdownRef = useRef(null);
    
    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showContactInfo && 
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target) &&
                contactButtonRef.current &&
                !contactButtonRef.current.contains(event.target)) {
                setShowContactInfo(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showContactInfo]);

    return (
        <div 
            className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d] border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-200'} rounded-[12px] shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer`}
            onClick={(e) => {
                console.log('🖱️ Container clicked, target:', e.target);
                console.log('🖱️ Is button?', e.target.closest('button[type="button"]'));
                console.log('🖱️ Is SVG?', e.target.closest('svg'));
                console.log('🖱️ Is delete action?', e.target.closest('[data-action="delete"]'));
                console.log('🖱️ Is reply action?', e.target.closest('[data-action="reply"]'));
                
                // Don't expand if clicking on action buttons or their children
                if (e.target.closest('button[type="button"]') || e.target.closest('svg') || e.target.closest('[data-action="delete"]') || e.target.closest('[data-action="reply"]')) {
                    console.log('🖱️ Clicked on action button, not expanding');
                    return;
                }
                console.log('🖱️ Expanding message');
                if (onToggleExpansion) {
                    onToggleExpansion(activity.id);
                } else {
                    setInternalExpanded(!internalExpanded);
                }
            }}
        >
            {/* Main message header - Strict Two-Column Layout */}
            <div className="flex items-start gap-1.5 p-1.5">
                {/* Phase Circle - Align to top */}
                {(() => {
                    const phaseProps = getPhaseButton(projectPhase);
                    return (
                        <div className={`w-5 h-5 ${phaseProps.bgColor} ${phaseProps.textColor} rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start`}>
                            {phaseProps.initials || 'N'}
                        </div>
                    );
                })()}
                
                {/* COLUMN 1: Main content (flexible width) */}
                <div className="flex-1 min-w-0">
                    {/* Row 1: Project# | Customer | Subject */}
                    <div className="flex items-center overflow-hidden relative">
                        <div className="flex items-center min-w-0 flex-1">
                            {/* Project Number - Fixed width for alignment */}
                            <button
                                className={`text-[9px] font-bold transition-colors hover:underline flex-shrink-0 ${
                                    colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                }`}
                                style={{ width: '46px' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Project Number Clicked:', { project, activity, projectNumber });
                                    
                                    // Create a proper project object for navigation
                                    let projectForNavigation = project;
                                    
                                    // If project is not available, try to find it in the projects array
                                    if (!projectForNavigation && projects && activity.projectId) {
                                        projectForNavigation = projects.find(p => p.id === activity.projectId || p.id === parseInt(activity.projectId));
                                    }
                                    
                                    // If still not found, create a fallback object
                                    if (!projectForNavigation) {
                                        projectForNavigation = {
                                            id: activity.projectId,
                                            projectNumber: projectNumber,
                                            projectName: primaryCustomer,
                                            customer: { primaryName: primaryCustomer }
                                        };
                                    }
                                    
                                    if (onProjectSelect) {
                                        console.log('Navigating to project:', projectForNavigation);
                                        onProjectSelect(projectForNavigation, 'Project Profile', null, sourceSection);
                                    } else {
                                        console.error('onProjectSelect is not available');
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
                            <div style={{ position: 'absolute', left: '140px', width: '200px' }}>
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
                    </div>
                    
                    {/* Row 2: From, To */}
                    <div className="flex items-baseline gap-0 mt-0 overflow-hidden relative">
                        <div className="flex items-baseline gap-0">
                            {/* From - Fixed width container for consistent spacing */}
                            <div 
                                className="flex-shrink-0"
                                style={{ width: '100px', marginLeft: '9px' }}
                            >
                                <span className={`text-[9px] font-medium whitespace-nowrap ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    From: {lastMessage.user}
                                </span>
                            </div>
                            
                            {/* To - Fixed position to match Subject exactly */}
                            <div style={{ position: 'absolute', left: '141px', width: '200px' }}>
                                <span
                                    className={`text-[9px] font-medium whitespace-nowrap ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}
                                    style={{
                                        display: 'inline-block',
                                        verticalAlign: 'baseline',
                                        lineHeight: '1'
                                    }}
                                >
                                    {(() => {
                                        // Use actual recipients from message data if available
                                        const messageRecipients = lastMessage?.recipients || [];

                                        if (messageRecipients.length === 0) {
                                            // No recipients specified - show "Team" as default
                                            return `To: Team`;
                                        } else if (messageRecipients.length === 1) {
                                            const recipient = messageRecipients[0];
                                            const recipientName = recipient.user
                                                ? `${recipient.user.firstName} ${recipient.user.lastName}`.trim()
                                                : 'Team Member';
                                            return `To: ${recipientName}`;
                                        } else if (messageRecipients.length === 2) {
                                            const names = messageRecipients.map(r =>
                                                r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : 'Team Member'
                                            );
                                            return `To: ${names.join(', ')}`;
                                        } else {
                                            const firstName = messageRecipients[0].user
                                                ? `${messageRecipients[0].user.firstName} ${messageRecipients[0].user.lastName}`.trim()
                                                : 'Team Member';
                                            return `To: ${firstName} +${messageRecipients.length - 1} others`;
                                        }
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: Fixed width, right-aligned elements - 2 ROWS ONLY */}
                <div className="flex flex-col justify-between items-end" style={{ width: '80px', minHeight: '32px' }}>
                    {/* Row 1: Task indicator and blue circle with number */}
                    <div className="flex items-center gap-1" style={{ marginRight: '8px' }}>
                        {/* Task indicator - shows when message has a task */}
                        {activity.hasTask && (
                            <span className="text-[8px] font-bold text-red-500">
                                Task
                            </span>
                        )}
                        
                        {/* Spacing to move blue circle to the right 9 spaces */}
                        <div style={{ width: '36px' }}></div>
                        
                        {/* New message indicator - moved up from Row 2 */}
                        <div className={`w-1.5 h-1.5 rounded-full ${colorMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                        <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {conversation.length}
                        </span>
                    </div>
                    
                    {/* Row 2: Timestamp and Actions */}
                    <div className="flex items-center gap-1" style={{ marginRight: '8px' }}>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Delete Button */}
                            {console.log('🔍 Checking delete button render:', { onDelete: typeof onDelete, onDeleteFunction: onDelete })}
                            {typeof onDelete === 'function' && (
                              <button
                                type="button"
                                data-action="delete"
                                style={{ zIndex: 10, position: 'relative' }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🗑️ Delete button clicked for message:', activity.id);
                                  console.log('🗑️ onDelete function:', typeof onDelete, onDelete);
                                  console.log('🗑️ isDeleting:', isDeleting);
                                  if (!isDeleting && typeof onDelete === 'function') {
                                    console.log('🗑️ Calling onDelete function');
                                    onDelete();
                                  } else {
                                    console.log('🗑️ Not calling onDelete - isDeleting:', isDeleting, 'onDelete type:', typeof onDelete);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onMouseUp={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                disabled={isDeleting}
                                className={`p-2 rounded transition-colors flex-shrink-0 border ${
                                  isDeleting
                                    ? 'text-gray-400 cursor-not-allowed border-gray-300'
                                    : colorMode
                                    ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20 border-gray-600 hover:border-red-400'
                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50 border-gray-300 hover:border-red-400'
                                }`}
                                title="Delete message"
                              >
                                {isDeleting ? (
                                  <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                                    <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a2 2 0 00-2-2h-4a2 2 0 00-2 2m6 0H9" />
                                  </svg>
                                )}
                              </button>
                            )}
                            
                            {/* Quick Reply Button */}
                            <button
                                type="button"
                                data-action="reply"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Ensure message is expanded when reply is clicked
                                    if (!expanded && onToggleExpansion) {
                                        onToggleExpansion();
                                    }
                                    setShowQuickReply(!showQuickReply);
                                    // Focus on textarea after a short delay to ensure it's rendered
                                    if (!showQuickReply) {
                                        setTimeout(() => {
                                            if (quickReplyTextareaRef.current) {
                                                quickReplyTextareaRef.current.focus();
                                            }
                                        }, 100);
                                    }
                                }}
                                className={`p-1 rounded transition-colors ${
                                    showQuickReply 
                                        ? colorMode 
                                            ? 'bg-[var(--color-primary-blueprint-blue)] text-white' 
                                            : 'bg-blue-500 text-white'
                                        : colorMode 
                                            ? 'bg-gray-700 text-gray-300 hover:bg-[var(--color-primary-blueprint-blue)] hover:text-white' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-blue-500 hover:text-white'
                                }`}
                                title="Quick Reply"
                            >
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                            </button>
                            
                        </div>
                        
                        {/* Timestamp */}
                        <span className={`text-[8px] whitespace-nowrap ${colorMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {formatTimestamp(lastMessage.timestamp)}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Customer Info Dropdown */}
            {showContactInfo && (
                <div className="relative">
                    <div 
                        ref={dropdownRef}
                        className={`absolute top-full left-0 z-50 mt-1 w-80 rounded-lg shadow-lg border backdrop-blur-sm ${
                            colorMode 
                                ? 'bg-slate-800/95 border-slate-600/50 shadow-black/20' 
                                : 'bg-white/95 border-gray-200/50 shadow-gray-900/10'
                        }`}
                        style={{
                            animation: 'fadeIn 0.15s ease-out'
                        }}
                    >
                        {/* Dropdown Header */}
                        <div className={`px-4 py-3 border-b ${colorMode ? 'border-slate-600/50' : 'border-gray-200/50'}`}>
                            <div className="flex items-center justify-between">
                                <h3 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    Customer Information
                                </h3>
                                <button
                                    onClick={() => setShowContactInfo(false)}
                                    className={`p-1 rounded-full transition-colors ${
                                        colorMode 
                                            ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' 
                                            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Dropdown Content */}
                        <div className="p-4 space-y-4">
                            {/* Primary Customer */}
                            <div className="space-y-3">
                                <div className={`text-xs font-semibold uppercase tracking-wide ${colorMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                    Primary Contact
                                </div>
                                
                                <div className="space-y-2">
                                    {/* Customer Name */}
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-full ${colorMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'} truncate`}>
                                                {project?.customer?.primaryName || project?.client?.name || project?.clientName || primaryCustomer}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phone Number */}
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-full ${colorMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <a 
                                                href={`tel:${(project?.customer?.primaryPhone || project?.client?.phone || project?.clientPhone || '(555) 123-4567').replace(/[^\d+]/g, '')}`}
                                                className={`text-sm hover:underline transition-colors ${
                                                    colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                                                }`}
                                            >
                                                {project?.customer?.primaryPhone || project?.client?.phone || project?.clientPhone || '(555) 123-4567'}
                                            </a>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-full ${colorMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <a 
                                                href={`mailto:${project?.customer?.primaryEmail || project?.client?.email || project?.clientEmail || 'customer@email.com'}`}
                                                className={`text-sm hover:underline transition-colors truncate ${
                                                    colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                                                }`}
                                            >
                                                {project?.customer?.primaryEmail || project?.client?.email || project?.clientEmail || 'customer@email.com'}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Secondary Customer (if exists) */}
                            {(project?.customer?.secondaryName || project?.customer?.secondaryPhone || project?.customer?.secondaryEmail) && (
                                <div className="space-y-3">
                                    <div className={`text-xs font-semibold uppercase tracking-wide ${colorMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                        Secondary Contact
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {/* Secondary Name */}
                                        {project?.customer?.secondaryName && (
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-full ${colorMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'} truncate`}>
                                                        {project.customer.secondaryName}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Secondary Phone */}
                                        {project?.customer?.secondaryPhone && (
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-full ${colorMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <a 
                                                        href={`tel:${project.customer.secondaryPhone.replace(/[^\d+]/g, '')}`}
                                                        className={`text-sm hover:underline transition-colors ${
                                                            colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                                                        }`}
                                                    >
                                                        {project.customer.secondaryPhone}
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {/* Secondary Email */}
                                        {project?.customer?.secondaryEmail && (
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-full ${colorMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <a 
                                                        href={`mailto:${project.customer.secondaryEmail}`}
                                                        className={`text-sm hover:underline transition-colors truncate ${
                                                            colorMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                                                        }`}
                                                    >
                                                        {project.customer.secondaryEmail}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Project Address */}
                            {(project?.address || project?.customer?.address || project?.client?.address) && (
                                <div className="space-y-3">
                                    <div className={`text-xs font-semibold uppercase tracking-wide ${colorMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                        Project Address
                                    </div>
                                    
                                    <div className="flex items-start gap-2">
                                        <div className={`p-1.5 rounded-full mt-0.5 ${colorMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm leading-relaxed ${colorMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                                {(() => {
                                                    const address = project?.address || project?.customer?.address || project?.client?.address || 'Address not available';
                                                    const parts = address.split(',');
                                                    if (parts.length >= 2) {
                                                        return (
                                                            <div>
                                                                <div className="font-medium">{parts[0]?.trim()}</div>
                                                                <div className="text-xs opacity-75">{parts.slice(1).join(',').trim()}</div>
                                                            </div>
                                                        );
                                                    }
                                                    return address;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                ref={quickReplyTextareaRef}
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
                                            ? 'bg-[var(--color-primary-blueprint-blue)] text-white hover:bg-blue-700'
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
                            ðŸ’¡ Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to send quickly
                        </div>
                    </form>
                </div>
            )}
            {/* Dropdown section - Professional message thread */}
            {expanded && (
                <div className={`px-3 py-3 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-200'}`} style={colorMode ? {} : {backgroundColor: 'white'}}>
                    <div className="space-y-3">
                        {/* Thread header - More professional */}
                        <div className={`${colorMode ? 'text-gray-300' : 'text-gray-700'} flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <div className={`${colorMode ? 'bg-blue-400' : 'bg-blue-500'} w-2 h-2 rounded-full`}></div>
                                <span className="text-xs font-semibold">
                                    {conversation.length} message{conversation.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Message thread - Professional layout */}
                        <div className={`max-h-48 overflow-y-auto space-y-3 ${colorMode ? 'scrollbar-dark' : 'scrollbar-light'}`}>
                            {conversation.map((message, index) => (
                                <div key={message.id} className={`${colorMode ? 'bg-[#374151]' : 'bg-white'} rounded-lg border ${colorMode ? 'border-gray-600' : 'border-gray-200'} p-3 shadow-sm`}>
                                    {/* Message header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {/* User avatar */}
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${
                                                message.user === 'You' 
                                                    ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                            }`}>
                                                {message.user.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                            </div>
                                            {/* User name */}
                                            <span className={`text-sm font-semibold ${
                                                colorMode ? 'text-gray-200' : 'text-gray-800'
                                            }`}>
                                                {message.user}
                                            </span>
                                        </div>
                                        
                                        {/* Timestamp and reply button */}
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs ${
                                                colorMode ? 'text-gray-400' : 'text-gray-500'
                                            }`}>
                                                {formatTimestamp(message.timestamp)}
                                            </span>
                                            {/* Quick Reply Icon */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Ensure message is expanded when reply is clicked
                                                    if (!expanded && onToggleExpansion) {
                                                        onToggleExpansion();
                                                    }
                                                    setShowQuickReply(true);
                                                    setQuickReplyText(`@${message.user}: `);
                                                    // Focus on textarea after a short delay to ensure it's rendered
                                                    setTimeout(() => {
                                                        if (quickReplyTextareaRef.current) {
                                                            quickReplyTextareaRef.current.focus();
                                                        }
                                                    }, 100);
                                                }}
                                                className={`p-1.5 rounded-full transition-colors ${
                                                    colorMode 
                                                        ? 'bg-gray-700 text-gray-300 hover:bg-[var(--color-primary-blueprint-blue)] hover:text-white' 
                                                        : 'bg-gray-100 text-gray-600 hover:bg-blue-500 hover:text-white'
                                                }`}
                                                title={`Reply to ${message.user}`}
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Message content */}
                                    <div className={`text-sm leading-relaxed ${
                                        colorMode ? 'text-gray-100' : 'text-gray-800'
                                    }`}>
                                        {message.comment}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectMessagesCard;

