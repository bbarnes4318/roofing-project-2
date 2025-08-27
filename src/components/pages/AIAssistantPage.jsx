import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { PaperAirplaneIcon, SparklesIcon, ClipboardDocumentCheckIcon, ChartBarIcon, DocumentTextIcon, CogIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, UserGroupIcon, ChevronDownIcon, ChatBubbleLeftRightIcon, EnvelopeIcon } from '../common/Icons';
import { bubblesService, projectsService, projectMessagesService, usersService } from '../../services/api';
import socketService from '../../services/socket';
import { useSubjects } from '../../contexts/SubjectsContext';
import EnhancedProjectDropdown from '../ui/EnhancedProjectDropdown';

const AIAssistantPage = ({ projects = [], colorMode = false }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const headerRef = useRef(null);
    const inputRef = useRef(null);
    const composerRef = useRef(null);
    const [messagesHeight, setMessagesHeight] = useState(null);
    const containerRef = useRef(null);
    const [containerHeight, setContainerHeight] = useState(null);

    // Message composer (subjects/recipients) for "Send Project Message"
    const { subjects } = useSubjects();
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [composerSubject, setComposerSubject] = useState('Project Status Update');
    const [composerRecipients, setComposerRecipients] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [composerBody, setComposerBody] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    // Enhanced markdown renderer for AI responses
    const renderMessageContent = (content) => {
        if (!content) return '';
        
        const lines = String(content).replace(/\r\n?/g, '\n').split('\n');
        const out = [];
        let inUl = false;
        let inOl = false;
        let pendingAutoList = false; // after a heading that ends with ':'
        
        const closeLists = () => {
            if (inUl) { out.push('</ul>'); inUl = false; }
            if (inOl) { out.push('</ol>'); inOl = false; }
        };
        
        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            const line = raw == null ? '' : String(raw);
            const trimmed = line.trim();
            
            // Blank line -> paragraph break / close lists and reset auto-list
            if (trimmed === '') {
                closeLists();
                pendingAutoList = false;
                out.push('<div class="h-3"></div>');
                continue;
            }
            
            // Bold (** **) and __ __
            let processed = line
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/__(.*?)__/g, '<strong>$1</strong>');
            
            // True markdown headers starting with #
            if (trimmed.startsWith('#')) {
                closeLists(); pendingAutoList = false;
                const level = Math.min((trimmed.match(/^#+/)?.[0]?.length) || 1, 6);
                const text = trimmed.replace(/^#+\s*/, '');
                out.push(`<h${level} class="font-bold text-lg mb-3 mt-2">${text}</h${level}>`);
                continue;
            }
            
            // Treat short lines ending with ':' as section headings
            if (/^.{1,80}:$/.test(trimmed)) {
                closeLists();
                pendingAutoList = true;
                const headingText = trimmed.slice(0, -1);
                out.push(`<h3 class="font-semibold text-base mb-2 mt-2">${headingText}</h3>`);
                continue;
            }
            
            // Numbered list item
            if (/^\d+\.\s+/.test(trimmed)) {
                if (inUl) { out.push('</ul>'); inUl = false; }
                if (!inOl) { out.push('<ol class="list-decimal ml-5 mb-2 space-y-1">'); inOl = true; }
                const text = trimmed.replace(/^\d+\.\s+/, '');
                out.push(`<li>${text}</li>`);
                pendingAutoList = false;
                continue;
            }
            
            // Bullet list item markers: -, *, •, –, —
            if (/^[-*•–—]\s+/.test(trimmed)) {
                if (inOl) { out.push('</ol>'); inOl = false; }
                if (!inUl) { out.push('<ul class="list-disc ml-5 mb-2 space-y-1">'); inUl = true; }
                const text = trimmed.replace(/^[-*•–—]\s+/, '');
                out.push(`<li>${text}</li>`);
                pendingAutoList = false;
                continue;
            }
            
            // Auto-list lines immediately following a heading ending with ':'
            if (pendingAutoList) {
                if (inOl) { out.push('</ol>'); inOl = false; }
                if (!inUl) { out.push('<ul class="list-disc ml-5 mb-2 space-y-1">'); inUl = true; }
                out.push(`<li>${processed}</li>`);
                continue;
            }
            
            // Label: Value blocks like Phase:, Section:, etc.
            if (/^(Phase|Section|Line Item|Status|Progress|Customer|Project):/i.test(trimmed)) {
                closeLists(); pendingAutoList = false;
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const label = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    out.push(`<div class="mb-3 p-2 bg-gray-50 rounded border-l-4 border-blue-400"><strong class="text-blue-700">${label}:</strong> <span class="text-gray-800">${value}</span></div>`);
                    continue;
                }
            }
            
            // Default paragraph line
            closeLists(); pendingAutoList = false;
            out.push(`<p class="mb-2 leading-relaxed">${processed}</p>`);
        }
        
        // Close any open lists at end
        const html = (function finalize(parts){
            if (inUl) parts.push('</ul>');
            if (inOl) parts.push('</ol>');
            return parts.join('');
        })(out);
        
        return html;
    };

    // Restore last selected project from sessionStorage when projects load
    useEffect(() => {
        try {
            if (!selectedProject && Array.isArray(projects) && projects.length > 0) {
                const storedId = sessionStorage.getItem('aiAssistant.lastProjectId');
                if (storedId === 'null') {
                    // User previously selected "No Project Selected"
                    setSelectedProject(null);
                } else if (storedId) {
                    const match = projects.find(p => String(p.id) === String(storedId));
                    if (match) setSelectedProject(match);
                }
            }
        } catch (_) {}
    }, [projects, selectedProject]);

    // Persist selection
    useEffect(() => {
        try {
            if (selectedProject?.id) {
                sessionStorage.setItem('aiAssistant.lastProjectId', String(selectedProject.id));
            } else if (selectedProject === null) {
                // User explicitly selected "No Project Selected"
                sessionStorage.setItem('aiAssistant.lastProjectId', 'null');
            }
        } catch (_) {}
    }, [selectedProject]);

    // Auto-select first project if only one available (but respect explicit "No Project Selected" choice)
    useEffect(() => {
        if (projects.length === 1 && !selectedProject) {
            // Check if user explicitly selected "No Project Selected" in session storage
            try {
                const storedId = sessionStorage.getItem('aiAssistant.lastProjectId');
                if (storedId === 'null') {
                    // User explicitly chose "No Project Selected", don't auto-select
                    return;
                }
            } catch (_) {}
            
            // Only auto-select if user hasn't made an explicit choice
            setSelectedProject(projects[0]);
        }
    }, [projects, selectedProject]);

    // Ensure initial view starts at top, without locking page scroll
    useEffect(() => {
        try {
            window.scrollTo(0, 0);
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = 0;
            }
        } catch (_) {}
    }, []);

    // Lock page scroll so only the messages container scrolls
    useEffect(() => {
        try {
            window.scrollTo(0, 0);
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } catch (_) {}
        return () => {
            try {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
            } catch (_) {}
        };
    }, []);

    // Calculate available height so input stays visible; shrink messages area as needed
    useLayoutEffect(() => {
        const recalcHeights = () => {
            try {
                const viewport = window.innerHeight || document.documentElement.clientHeight || 800;
                const containerTop = containerRef.current ? containerRef.current.getBoundingClientRect().top : 0;
                const headerH = headerRef.current ? headerRef.current.getBoundingClientRect().height : 0;
                const inputH = inputRef.current ? inputRef.current.getBoundingClientRect().height : 0;
                const composerH = composerRef.current ? composerRef.current.getBoundingClientRect().height : 0;
                const paddingAllowance = 0;
                const containerH = Math.max(viewport - containerTop, 400);
                setContainerHeight(containerH);
                const available = Math.max(containerH - headerH - composerH - inputH - paddingAllowance, 140);
                setMessagesHeight(available);
            } catch (_) {}
        };

        recalcHeights();
        window.addEventListener('resize', recalcHeights);
        return () => window.removeEventListener('resize', recalcHeights);
    }, [isComposerOpen]);

    // Fetch current step for selected project
    useEffect(() => {
        const fetchCurrent = async () => {
            if (!selectedProject?.id) { setCurrentStep(null); return; }
            try {
                const res = await bubblesService.getCurrentStep(selectedProject.id);
                // sendSuccess shape: { success, message, data: { current }, timestamp }
                setCurrentStep(res?.data?.current || res?.data?.data?.current || null);
            } catch (_) { setCurrentStep(null); }
        };
        fetchCurrent();
    }, [selectedProject]);

    // Load team for composer
    useEffect(() => {
        const loadTeam = async () => {
            if (!isComposerOpen) return;
            try {
                const res = await usersService.getTeamMembers();
                // API shape: { success, data: { teamMembers } }
                const members = res?.data?.teamMembers || (Array.isArray(res?.data) ? res.data : []);
                setTeamMembers(members);
            } catch (_) { setTeamMembers([]); }
        };
        loadTeam();
    }, [isComposerOpen]);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    // Remove auto-scroll on load; we'll scroll only when sending/receiving messages

    const handleSubmit = async (e, quickActionText = null) => {
        if (e) e.preventDefault();
        
        const userInput = quickActionText || input;
        if (!userInput.trim()) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: userInput,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        // Keep input visible; only scroll the messages container
        setTimeout(scrollToBottom, 0);
        setInput('');
        setIsLoading(true);

        try {
            // Use real Bubbles API with project context
            const response = await bubblesService.chat(userInput, selectedProject?.id);
            
            const assistantMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: response.data?.response?.content || 'I processed your request.',
                timestamp: new Date(),
                suggestedActions: response.data?.response?.suggestedActions || []
            };
            
            setMessages(prev => [...prev, assistantMessage]);
            setTimeout(scrollToBottom, 0);
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: 'I\'m having trouble connecting to my systems right now. Please try again in a moment.',
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Project selector component
    const ProjectSelector = () => (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Select a project for workflow actions:</h3>
                <div className="space-y-2">
                {projects.filter(p => p.status !== 'archived').map(project => (
                    <button
                        key={project.id}
                        onClick={() => {
                            setSelectedProject(project);
                            setShowProjectSelector(false);
                        }}
                        className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                        <div className="font-medium text-gray-900">{project.projectName || project.name}</div>
                        <div className="text-sm text-gray-500">{project.customerName} • {project.status}</div>
                    </button>
                ))}
                <button
                    onClick={() => setShowProjectSelector(false)}
                    className="w-full p-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
                </div>
            );

    const MessageBubble = ({ message }) => {
        const isAssistant = message.type === 'assistant';
        const isError = message.isError;
        const isContextMessage = message.isContextMessage;

        return (
            <div className="w-full">
                <div className={`rounded-xl px-4 py-3 border ${
                    isAssistant
                        ? (isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-[#f7f7f8] border-gray-200 text-gray-900')
                        : 'bg-white border-gray-200 text-gray-900'
                }`}>
                    <div 
                        className="text-[14px] md:text-[15px] leading-6 md:leading-7 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ 
                            __html: isAssistant ? renderMessageContent(message.content) : message.content 
                        }}
                    />
                    {message.suggestedActions && message.suggestedActions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {message.suggestedActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSubmit(null, action.label || action.action)}
                                    className="px-3 py-1 text-xs rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    {action.label || action.action}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="text-xs mt-2 text-gray-400">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        );
    };



    return (
        <div ref={containerRef} className="ai-assistant-container min-h-0 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: containerHeight ? `${containerHeight}px` : '100vh' }}>
            {/* Custom styles for message formatting */}
            <style jsx>{`
                .ai-assistant-container {
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
                }
                .prose strong {
                    font-weight: 600;
                    color: #1f2937;
                }
                .prose li {
                    margin-bottom: 0.25rem;
                    padding-left: 0.5rem;
                }
                .prose p {
                    margin-bottom: 0.5rem;
                    line-height: 1.6;
                }
                .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
                    margin-top: 1rem;
                    margin-bottom: 0.75rem;
                    font-weight: 600;
                    color: #1f2937;
                }
            `}</style>
            
            {/* Header with project selector - Compact and clean */}
            <div ref={headerRef} className="flex-shrink-0 p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 relative">
                <div className="flex items-center gap-4">
                    {/* Enhanced Project selector dropdown - Left aligned */}
                    <div className="flex-1 max-w-2xl relative">
                        <EnhancedProjectDropdown
                            projects={projects}
                            selectedProject={selectedProject}
                            onProjectSelect={(project) => {
                                setSelectedProject(project);
                                setShowProjectSelector(false);
                                setProjectSearch('');
                            }}
                            onProjectNavigate={(project, targetTab) => {
                                // Handle navigation to specific project tabs
                                console.log(`Navigating to ${targetTab} for project:`, project.name);
                                // You can implement navigation logic here if needed
                            }}
                            colorMode={colorMode}
                            placeholder="Select Project"
                        />
                    </div>
                </div>
            </div>

            {/* Messages Area - Centered, wider column for more visible text */}
            <div
                ref={messagesContainerRef}
                className="messages-container flex-1 min-h-0 overflow-y-auto"
                style={{ height: messagesHeight ? `${messagesHeight}px` : 'auto' }}
            >
                <div className="mx-auto w-full max-w-3xl md:max-w-4xl px-3 md:px-4 py-2">
                    <div className="space-y-3 md:space-y-4">
                        {messages
                            .filter(message => !message.isContextMessage)
                            .map(message => (
                                <MessageBubble key={message.id} message={message} />
                            ))}
                        {isLoading && (
                            <div className="mb-4">
                                <div className="bg-[#f7f7f8] border border-gray-200 rounded-xl px-5 py-3">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            {/* Composer Modal */}
            {isComposerOpen && (
                <div ref={composerRef} className="p-4 border-t border-gray-200 bg-white">
                    <div className="mb-2 text-sm font-semibold flex items-center gap-2"><ChatBubbleLeftRightIcon className="w-4 h-4" /> Send Project Message</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs block mb-1">Subject</label>
                            <select value={composerSubject} onChange={e => setComposerSubject(e.target.value)} className="w-full text-sm rounded-md border px-2 py-2">
                                {(subjects || []).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs block mb-1">Recipients</label>
                            <div className="max-h-24 overflow-auto rounded-md border p-2">
                                {(teamMembers || []).map(u => (
                                    <label key={u.id} className="flex items-center gap-2 text-sm py-0.5">
                                        <input type="checkbox" checked={composerRecipients.includes(u.id)} onChange={() => setComposerRecipients(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} />
                                        <span>{u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : (u.name || u.email || u.id)}</span>
                                    </label>
                                ))}
                                {(!teamMembers || teamMembers.length === 0) && (
                                    <div className="text-xs opacity-70">No team members listed.</div>
                                )}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs block mb-1">Message</label>
                            <textarea value={composerBody} onChange={e => setComposerBody(e.target.value)} rows={3} className="w-full text-sm rounded-md border px-2 py-2 resize-none" placeholder="Type your message..." />
                        </div>
                        <div className="md:col-span-2 flex items-center justify-end gap-2">
                            <button onClick={() => setIsComposerOpen(false)} className="text-xs px-3 py-2 rounded-md border">Cancel</button>
                            <button onClick={async () => {
                                if (!selectedProject?.id || !composerSubject || !composerBody.trim()) return;
                                setIsSendingMessage(true);
                                try {
                                    await projectMessagesService.create(selectedProject.id, {
                                        content: composerBody.trim(),
                                        subject: composerSubject,
                                        priority: 'MEDIUM',
                                        recipients: composerRecipients
                                    });
                                    // Emit per-recipient notifications (best-effort)
                                    try {
                                        if (Array.isArray(composerRecipients) && composerRecipients.length > 0) {
                                            await Promise.all(
                                                composerRecipients.map(uid => socketService.sendNotification({
                                                    title: 'New Project Message',
                                                    message: composerSubject,
                                                    type: 'PROJECT_UPDATE',
                                                    recipientId: uid,
                                                    actionData: { projectId: selectedProject.id }
                                                }).catch(() => null))
                                            );
                                        }
                                    } catch (_) {
                                        // Ignore notification errors
                                    }
                                    
                                    setMessages(prev => [...prev, { id: `msg_${Date.now()}`, type: 'assistant', content: `Message sent in project: ${composerSubject}\n\n${composerBody.trim()}`, timestamp: new Date() }]);
                                    setComposerBody(''); setComposerRecipients([]); setComposerSubject(subjects?.[0] || 'Project Status Update'); setIsComposerOpen(false);
                                } catch (e) {
                                    setMessages(prev => [...prev, { id: `msg_err_${Date.now()}`, type: 'error', content: 'Failed to send message. Please try again.', timestamp: new Date() }]);
                                } finally { setIsSendingMessage(false); }
                            }} disabled={isSendingMessage || !composerBody.trim()} className={`text-xs px-3 py-2 rounded-md text-white ${isSendingMessage || !composerBody.trim() ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                <span className="font-semibold text-sm md:text-base">{isSendingMessage ? 'Sending...' : 'SEND'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area - Always visible at bottom */}
            <div ref={inputRef} className="flex-shrink-0 p-1 border-t border-gray-200 bg-gray-50">
                <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl flex items-center gap-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={selectedProject 
                            ? `Ask about ${selectedProject.projectName || selectedProject.name}...` 
                            : "Send a message..."
                        }
                        className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`px-3 py-1 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all shadow-sm ${
                            isLoading || !input.trim()
                                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                : 'bg-black hover:bg-gray-900 text-white'
                        }`}
                    >
                        {isLoading ? (
                            <span className="text-xs md:text-sm">Processing...</span>
                        ) : (
                            <span className="text-xs md:text-sm">Send</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistantPage;