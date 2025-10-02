import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProjects, useWorkflowAlerts, useRecentActivities } from '../../hooks/useQueryApi';
import WorkflowProgressService from '../../services/workflowProgress';
import { assetsService } from '../../services/api';

const ActivityFeedPage = ({ activities, projects, onProjectSelect, onAddActivity, colorMode }) => {
    // Dashboard sync state - EXACT same as Dashboard page
    const [expandedMessages, setExpandedMessages] = useState(new Set());
    const [completedTasks, setCompletedTasks] = useState(new Set());
    const [activeCommTab, setActiveCommTab] = useState('messages');
    
    const messagesData = activities?.filter(a => a.type === 'message') || [];
    const calendarEvents = activities?.filter(a => a.type === 'task' || a.type === 'reminder') || [];
    const { alerts: workflowAlerts } = useWorkflowAlerts({ status: 'active' });

    // Build Activity Feed items - EXACT SAME logic as Dashboard
    const activityFeedItems = useMemo(() => {
        const items = [];
        
        // Messages
        (messagesData || []).forEach(m => {
            items.push({
                id: `msg_${m.id}`,
                type: 'message',
                authorId: m.recipientId || null,
                author: m.author || 'Team Member',
                projectId: m.projectId || null,
                projectName: m.projectName || null,
                projectNumber: m.projectNumber || '12345',
                subject: m.subject || 'Message',
                content: m.description || m.content || '',
                timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
                recipient: m.recipient || 'You',
            });
        });
        
        // Calendar Events: tasks (DEADLINE) and reminders (REMINDER)
        calendarEvents.forEach(ev => {
            const evType = (ev.eventType || ev.type || '').toString().toUpperCase();
            const mappedType = evType === 'REMINDER' ? 'reminder' : 'task';
            const attendeesIds = Array.isArray(ev.attendees) ? ev.attendees.map(a => a.userId).filter(Boolean) : [];
            
            items.push({
                id: `cal_${ev.id}`,
                type: mappedType,
                authorId: ev.organizerId || null,
                author: ev.organizer?.firstName ? `${ev.organizer.firstName} ${ev.organizer.lastName}` : ev.author || 'System',
                projectId: ev.projectId || null,
                projectName: ev.project?.projectName || ev.projectName || null,
                projectNumber: ev.projectNumber || '12345',
                subject: ev.title || ev.subject || (mappedType === 'task' ? 'Task' : 'Reminder'),
                content: ev.description || ev.content || '',
                timestamp: ev.startTime || ev.createdAt || ev.timestamp || new Date().toISOString(),
                attendees: attendeesIds,
                assignedTo: ev.assignedTo || ev.recipient || 'You',
            });
        });
        
        // Workflow Alerts: Keep separate from tasks - they are workflow line items, not manual tasks
        // Do not add workflow alerts to the activity feed as "tasks" 
        // Workflow line items have their own dedicated alerts section and should not be mixed with user-created tasks
        
        // Sort newest first
        return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [messagesData, calendarEvents, workflowAlerts, realProjects]);

    // Expand all items by default on first load, mirroring Dashboard behavior
    const expandedInitRef = useRef(false);
    useEffect(() => {
        if (expandedInitRef.current) return;
        if (Array.isArray(activityFeedItems) && activityFeedItems.length > 0) {
            setExpandedMessages(new Set(activityFeedItems.map(i => i.id)));
            expandedInitRef.current = true;
        }
    }, [activityFeedItems]);

    // EXACT same handlers as Dashboard
    const handleTaskToggle = (taskId) => {
        setCompletedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const handleToggleMessage = (messageId) => {
        setExpandedMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            return newSet;
        });
    };

    // Get current filtered items based on active tab (same as Dashboard)
    const getCurrentItems = () => {
        if (activeCommTab === 'messages') {
            return activityFeedItems.filter(i => i.type === 'message');
        } else if (activeCommTab === 'tasks') {
            return activityFeedItems.filter(i => i.type === 'task');
        } else if (activeCommTab === 'reminders') {
            return activityFeedItems.filter(i => i.type === 'reminder');
        }
        return activityFeedItems;
    };

    return (
        <div className="w-full max-w-full m-0 p-0">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="flex items-center justify-between mb-3 p-4">
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                            Messages, Tasks, & Reminders
                        </h2>
                        {expandedMessages.size > 0 && (
                            <p className="text-sm text-gray-600 font-medium">
                                {expandedMessages.size} of {getCurrentItems().length} {activeCommTab}{getCurrentItems().length !== 1 ? 's' : ''} expanded
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Modern Tab Navigation - EXACT SAME as Dashboard */}
                <div className="relative mt-4 mb-6 px-4">
                    <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                        <button 
                            onClick={() => setActiveCommTab('messages')} 
                            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                activeCommTab === 'messages' 
                                    ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Messages
                            </div>
                        </button>
                        <button 
                            onClick={() => setActiveCommTab('tasks')} 
                            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                activeCommTab === 'tasks' 
                                    ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Tasks
                            </div>
                        </button>
                        <button 
                            onClick={() => setActiveCommTab('reminders')} 
                            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                activeCommTab === 'reminders' 
                                    ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' 
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Reminders
                            </div>
                        </button>
                    </div>
                </div>
                
                {/* Content Area - Shows current tab content - EXACT SAME as Dashboard */}
                {/* Scrollable container with max-height for 8 items (~80px each = 640px) */}
                <div className="px-4 pb-4 max-h-[640px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        {getCurrentItems().length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    No {activeCommTab} found
                                </h3>
                                <p className="text-gray-500">
                                    {activeCommTab === 'messages' ? 'Messages will appear here' : 
                                     activeCommTab === 'tasks' ? 'Tasks assigned to you will appear here' :
                                     'Reminders will appear here'}
                                </p>
                            </div>
                        ) : getCurrentItems().map(item => {
                            const isCompleted = completedTasks.has(item.id);
                            const project = realProjects?.find(p => p.id === item.projectId);
                            const projectNumber = project?.projectNumber || item.projectNumber || '12345';
                            const primaryCustomer = project?.customer?.primaryName || project?.client?.name || project?.clientName || project?.projectName || item.projectName || 'Primary Customer';
                            
                            return (
                                <div key={item.id} className={`bg-white hover:bg-gray-50 border-gray-200 rounded-[12px] shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer ${isCompleted && activeCommTab === 'tasks' ? 'opacity-75' : ''}`}>
                                    {/* Main header - EXACT SAME layout as Dashboard */}
                                    <div 
                                        className="flex items-center gap-1.5 p-1.5"
                                        onClick={() => handleToggleMessage(item.id)}
                                    >
                                        {/* Phase Circle */}
                                        {(() => {
                                            const isProjectItem = item.projectId && project;
                                            
                                            if (isProjectItem) {
                                                const projectPhase = WorkflowProgressService.getProjectPhase(project);
                                                const phaseColor = WorkflowProgressService.getPhaseColor(projectPhase);
                                                const phaseInitial = WorkflowProgressService.getPhaseInitials(projectPhase);
                                                
                                                return (
                                                    <div 
                                                        className="w-5 h-5 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start"
                                                        style={{ backgroundColor: phaseColor }}
                                                    >
                                                        {phaseInitial}
                                                    </div>
                                                );
                                            } else {
                                                const typeInitial = item.type === 'message' ? 'M' : item.type === 'task' ? 'T' : 'R';
                                                return (
                                                    <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0 self-start">
                                                        {typeInitial}
                                                    </div>
                                                );
                                            }
                                        })()}
                                        
                                        <div className="flex-1 min-w-0">
                                            {/* Row 1: Project# or General | Customer | Subject */}
                                            <div className="flex items-center justify-between overflow-hidden relative">
                                                <div className="flex items-center min-w-0 flex-1">
                                                    {/* Project Number or General */}
                                                    {item.projectId && project ? (
                                                        <button
                                                            className="text-[9px] font-bold transition-colors hover:underline flex-shrink-0 text-blue-600 hover:text-blue-800"
                                                            style={{ width: '46px', marginLeft: '10px' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onProjectSelect) {
                                                                    onProjectSelect(project, 'Project Profile', null, 'Activity Feed');
                                                                }
                                                            }}
                                                        >
                                                            #{String(projectNumber).padStart(5, '0')}
                                                        </button>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-gray-600" style={{ width: '46px', marginLeft: '10px' }}>
                                                            General
                                                        </span>
                                                    )}
                                                    
                                                    {/* Primary Customer */}
                                                    {item.projectId && project && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] font-semibold transition-colors truncate text-gray-700 hover:text-gray-800" style={{ maxWidth: '80px' }}>
                                                                {primaryCustomer}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Subject - Fixed position with proper truncation */}
                                                    <div style={{ position: 'absolute', left: '140px', width: '160px' }}>
                                                        <span 
                                                            className="text-[9px] font-medium text-gray-600 truncate"
                                                            style={{ 
                                                                display: 'inline-block', 
                                                                verticalAlign: 'baseline', 
                                                                lineHeight: '1',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                maxWidth: '100%'
                                                            }}
                                                        >
                                                            Subject: {item.subject}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Right side - Checkbox and actions - MATCHING REMINDERS TAB EXACTLY */}
                                                <div className="flex items-center gap-1.5 flex-shrink-0" style={{ marginLeft: '-16px' }}>
                                                    {/* Timestamp for ALL types - Messages, Tasks, Reminders */}
                                                            <span className="text-[8px] whitespace-nowrap text-gray-500">
                                                                {new Date(item.timestamp).toLocaleDateString('en-US', { 
                                                                    month: 'short', 
                                                                    day: 'numeric'
                                                                }) + ', ' + new Date(item.timestamp).toLocaleTimeString('en-US', {
                                                                    hour: 'numeric',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })}
                                                            </span>
                                                    
                                                    {/* Messages: Just type indicator */}
                                                    {item.type === 'message' && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[8px] font-bold text-orange-500">
                                                                Message
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Dropdown arrow */}
                                                    <div className={`p-1 rounded transition-colors transform duration-200 ${expandedMessages.has(item.id) ? 'rotate-180' : ''} text-gray-600`}>
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Row 2: From, To, and Timestamp (except Tasks which moved timestamp to top) */}
                                            <div className="flex items-baseline justify-between gap-0 mt-0 overflow-hidden relative">
                                                <div className="flex items-baseline gap-0">
                                                    {/* From */}
                                                    <div className="flex-shrink-0" style={{ width: '100px', marginLeft: '11px' }}>
                                                        <span className="text-[9px] font-medium whitespace-nowrap text-gray-600">
                                                            From: {item.author}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* To */}
                                                    <div style={{ position: 'absolute', left: '141px', width: '200px' }}>
                                                        <span className="text-[9px] font-medium whitespace-nowrap text-gray-600" style={{ display: 'inline-block', verticalAlign: 'baseline', lineHeight: '1' }}>
                                                            To: {item.assignedTo || item.recipient || 'You'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Checkbox and type indicator for Tasks and Reminders (bottom right) */}
                                                {item.type === 'task' && (
                                                    <div className="flex items-center gap-1.5 flex-shrink-0" style={{ marginLeft: '-50px' }}>
                                                        {/* Checkbox for Tasks */}
                                                        <input
                                                            type="checkbox"
                                                            checked={isCompleted}
                                                            onChange={() => handleTaskToggle(item.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                                                        />
                                                        
                                                        {/* Task indicator */}
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[8px] font-bold text-orange-500">
                                                                Task
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {item.type === 'reminder' && (
                                                    <div className="flex items-center gap-1.5 flex-shrink-0" style={{ marginLeft: '-16px' }}>
                                                        {/* Checkbox for Reminders */}
                                                        <input
                                                            type="checkbox"
                                                            checked={completedTasks.has(item.id)}
                                                            onChange={() => handleTaskToggle(item.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                                                        />
                                                        
                                                        {/* Reminder indicator */}
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[8px] font-bold text-gray-900">
                                                                Reminder
                                                        </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Expanded content */}
                                    {expandedMessages.has(item.id) && (
                                        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                                            {item.content && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                        {item.content}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Attachments - Display outside expanded section so they're always visible */}
                                    {Array.isArray(item?.metadata?.attachments) && item.metadata.attachments.length > 0 && (
                                        <div className="px-3 pb-3">
                                            <div className="flex flex-col gap-1.5">
                                                {item.metadata.attachments.map((att, idx) => {
                                                    const fileName = att.title || att.fileName || att.originalName || 'Attachment';
                                                    const fileExt = (att.extension || att.fileType || fileName.split('.').pop() || '').toString();
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg bg-white px-3 py-2 text-xs shadow-sm hover:shadow transition-shadow"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-gray-900 truncate">{fileName}</div>
                                                                    {fileExt && (
                                                                        <div className="text-[10px] text-gray-500 uppercase">{fileExt}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        console.log('[ActivityFeed] Opening attachment:', att);
                                                                        try {
                                                                            // ALWAYS use assetId through the download endpoint - never open fileUrl directly
                                                                            const idToUse = att.assetId || att.id;
                                                                            if (idToUse) {
                                                                                console.log('[ActivityFeed] Opening via assetId:', idToUse);
                                                                                await assetsService.openInNewTab(idToUse);
                                                                            } else {
                                                                                console.error('[ActivityFeed] No assetId found for attachment:', att);
                                                                                alert('Unable to open attachment: No asset ID found. Please contact support.');
                                                                            }
                                                                        } catch (err) {
                                                                            console.error('[ActivityFeed] Failed to open attachment:', err);
                                                                            alert(`Failed to open attachment: ${err.message || 'Unknown error'}. The file may have been moved or deleted.`);
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100"
                                                                >
                                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-4-4m4 4l4-4" />
                                                                    </svg>
                                                                    Open
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityFeedPage;