import React, { useState, useRef, useEffect } from 'react';
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
        
        // Split content into lines and process each line
        const lines = content.split('\n');
        let inList = false;
        let listItems = [];
        
        const processedLines = lines.map((line, index) => {
            // Handle bold text with ** or __
            let processedLine = line
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/__(.*?)__/g, '<strong>$1</strong>');
            
            // Handle headers (lines starting with #)
            if (line.startsWith('#')) {
                const level = line.match(/^#+/)[0].length;
                const text = line.replace(/^#+\s*/, '');
                return `<h${Math.min(level, 6)} class="font-bold text-lg mb-3 mt-2">${text}</h${Math.min(level, 6)}>`;
            }
            
            // Handle bullet points
            if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                const text = line.trim().replace(/^[-•]\s*/, '');
                return `<li class="ml-4 mb-2 list-disc">${text}</li>`;
            }
            
            // Handle numbered lists
            if (/^\d+\.\s/.test(line.trim())) {
                const text = line.trim().replace(/^\d+\.\s*/, '');
                return `<li class="ml-4 mb-2 list-decimal">${text}</li>`;
            }
            
            // Handle empty lines
            if (line.trim() === '') {
                return '<div class="h-3"></div>';
            }
            
            // Handle lines that look like section headers (Phase:, Section:, etc.)
            if (/^(Phase|Section|Line Item|Status|Progress|Customer|Project):/.test(line.trim())) {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const label = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    return `<div class="mb-3 p-2 bg-gray-50 rounded border-l-4 border-blue-400"><strong class="text-blue-700">${label}:</strong> <span class="text-gray-800">${value}</span></div>`;
                }
            }
            
            // Handle regular text with proper spacing
            return `<p class="mb-2 leading-relaxed">${processedLine}</p>`;
        });
        
        return processedLines.join('');
    };

    // Restore last selected project from sessionStorage when projects load
    useEffect(() => {
        try {
            if (!selectedProject && Array.isArray(projects) && projects.length > 0) {
                const storedId = sessionStorage.getItem('aiAssistant.lastProjectId');
                if (storedId) {
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
            }
        } catch (_) {}
    }, [selectedProject]);

    // Auto-select first project if only one available
    useEffect(() => {
        if (projects.length === 1 && !selectedProject) {
            setSelectedProject(projects[0]);
        }
    }, [projects, selectedProject]);

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

    // Scroll messages to bottom when new messages are added
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    // Only scroll to bottom when new messages are added (not on initial load)
    useEffect(() => {
        if (messages.length > 1) {
            scrollToBottom();
        }
    }, [messages.length]);

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
            <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}>
                <div className={`flex max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'} items-start gap-2`}>
                    {isAssistant && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isError ? 'bg-red-500' : isContextMessage ? 'bg-green-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                        isAssistant 
                            ? isError 
                                ? 'bg-red-50 text-red-800 border border-red-200' 
                                : isContextMessage
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-gray-100 text-gray-800' 
                            : 'bg-blue-600 text-white'
                    }`}>
                        <div 
                            className="text-sm leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ 
                                __html: isAssistant ? renderMessageContent(message.content) : message.content 
                            }}
                        />
                        
                        {/* Render suggested actions */}
                        {message.suggestedActions && message.suggestedActions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {message.suggestedActions.map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSubmit(null, action.label || action.action)}
                                        className="px-3 py-1 text-xs rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                    >
                                        {action.label || action.action}
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <div className={`text-xs mt-2 ${
                            isAssistant 
                                ? isError ? 'text-red-500' : 'text-gray-500' 
                                : 'text-blue-100'
                        }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    return (
        <div className="h-screen flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Custom styles for message formatting */}
            <style jsx>{`
                .prose strong {
                    font-weight: 600;
                    color: #1f2937;
                }
                .prose li {
                    margin-bottom: 0.5rem;
                    padding-left: 0.5rem;
                }
                .prose p {
                    margin-bottom: 0.75rem;
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
            <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 relative">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <img src="/bubblesai.png" alt="Bubbles AI" className="h-10 w-auto" />
                    </div>
                    {/* Enhanced Project selector dropdown - Closer to logo */}
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

            {/* Messages Area - Scrollable with flex-1 to fill available space */}
            <div className="flex-1 overflow-y-auto p-4 pb-20 min-h-0">
                <div className="space-y-4">
                    {messages
                        .filter(message => !message.isContextMessage) // Hide context messages
                        .map(message => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                            <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <SparklesIcon className="w-5 h-5 text-white" />
                                </div>
                                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Composer Modal */}
            {isComposerOpen && (
                <div className="p-4 border-t border-gray-200 bg-white">
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

            {/* Input Area - Fixed at bottom, always visible */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50" style={{ position: 'fixed', bottom: 0, left: '280px', right: 0, zIndex: 100 }}>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={selectedProject 
                            ? `Ask about ${selectedProject.projectName || selectedProject.name}...` 
                            : "Ask about workflows, tasks, or company processes..."
                        }
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all shadow-sm ${
                            isLoading || !input.trim()
                                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <span className="text-sm md:text-base">Processing...</span>
                            </>
                        ) : (
                            <>
                                <span className="uppercase tracking-wide text-sm md:text-base">SEND</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistantPage;