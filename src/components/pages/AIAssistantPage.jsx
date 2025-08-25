import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, SparklesIcon, ClipboardDocumentCheckIcon, ChartBarIcon, DocumentTextIcon, CogIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, UserGroupIcon, ChevronDownIcon, ChatBubbleLeftRightIcon, EnvelopeIcon } from '../common/Icons';
import { bubblesService, projectsService, projectMessagesService, usersService } from '../../services/api';
import socketService from '../../services/socket';
import { useSubjects } from '../../contexts/SubjectsContext';

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
                
                // Add a context message to the AI when project is selected (only if not already present)
                const hasContextMessage = messages.some(msg => 
                    msg.isContextMessage && msg.content.includes(selectedProject.projectName || selectedProject.name)
                );
                
                if (!hasContextMessage) {
                    const contextMessage = {
                        id: Date.now(),
                        type: 'assistant',
                        content: `Project context set: **#${String(selectedProject.projectNumber || selectedProject.id).padStart(5, '0')} — ${selectedProject.projectName || selectedProject.name}**\n\nI'm now ready to help you with this project. You can ask me about tasks, status, phases, or any other project-related questions.`,
                        timestamp: new Date(),
                        isContextMessage: true
                    };
                    setMessages(prev => [...prev, contextMessage]);
                }
            }
        } catch (_) {}
    }, [selectedProject, messages]);

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

    const quickActions = [
        {
            id: 'complete-photo',
            icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
            label: 'Complete "Take site photos"',
            requiresProject: true,
            text: 'Check off "Take site photos"'
        },
        {
            id: 'complete-inspection',
            icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
            label: 'Complete "Inspection"',
            requiresProject: true,
            text: 'Mark "Complete inspection form" as complete'
        },
        {
            id: 'blocking-tasks',
            icon: <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />,
            label: 'Find Blocking Tasks',
            requiresProject: true,
            text: 'What\'s blocking the current phase?'
        },
        {
            id: 'phase-status',
            icon: <ChartBarIcon className="w-5 h-5 text-blue-600" />,
            label: 'Check Phase Status',
            requiresProject: true,
            text: 'Can we advance to the next phase?'
        },
        {
            id: 'incomplete-tasks',
            icon: <ClipboardDocumentCheckIcon className="w-5 h-5 text-gray-600" />,
            label: 'Show Incomplete Tasks',
            requiresProject: true,
            text: 'Show me all incomplete tasks in the current phase'
        },
        {
            id: 'company-help',
            icon: <CogIcon className="w-5 h-5 text-purple-600" />,
            label: 'Company Knowledge',
            requiresProject: false,
            text: 'What are the project phases and workflow process?'
        }
    ];

    const handleQuickAction = (actionText) => {
        // Check if action requires project selection
        const action = quickActions.find(a => a.text === actionText);
        if (action?.requiresProject && !selectedProject) {
            // Show project selector if project is required
            setShowProjectSelector(true);
            return;
        }
        handleSubmit(null, actionText);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    // Dynamic prompts when a project is selected
    const dynamicPrompts = [];
    if (selectedProject?.id) {
        if (currentStep?.lineItemName) {
            dynamicPrompts.push({ id: 'dyn-complete', label: `Complete "${currentStep.lineItemName}"`, onClick: () => handleSubmit(null, `Complete "${currentStep.lineItemName}"`) });
        }
        dynamicPrompts.push({ id: 'dyn-send-msg', label: 'Send Project Message', onClick: () => setIsComposerOpen(true) });
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-sm">
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
            
            {/* Header with project selector */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Bubbles AI Assistant</h2>
                            <p className="text-sm text-gray-600">Your workflow copilot</p>
                        </div>
                    </div>
                    
                    {/* Project selector dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProjectSelector(!showProjectSelector)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                        >
                            <span className="text-sm font-medium">
                                {selectedProject ? selectedProject.projectName || selectedProject.name : 'Select Project'}
                            </span>
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                        </button>
                        
                        {showProjectSelector && (
                            <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                <div className="p-3">
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Choose Active Project:</h3>
                                    <input
                                        value={projectSearch}
                                        onChange={(e) => setProjectSearch(e.target.value)}
                                        placeholder="Search by project # or customer name..."
                                        className="w-full mb-3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                        {projects
                                            .filter(p => p.status !== 'archived')
                                            .filter(p => {
                                                const q = (projectSearch || '').toLowerCase().trim();
                                                if (!q) return true;
                                                const num = (p.projectNumber || p.id || '').toString().toLowerCase();
                                                const name = (p.customerName || p.customer?.name || p.clientName || p.projectName || p.name || '').toLowerCase();
                                                return num.includes(q.replace('#','')) || name.includes(q);
                                            })
                                            .slice(0, 50)
                                            .map(project => (
                                                <button
                                                    key={project.id}
                                                    onClick={() => {
                                                        setSelectedProject(project);
                                                        setShowProjectSelector(false);
                                                        setProjectSearch('');
                                                    }}
                                                    className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                                                >
                                                    <div className="font-medium text-gray-900">
                                                        #{String(project.projectNumber || project.id).padStart(5, '0')} — {project.projectName || project.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{project.customerName || project.customer?.name || project.clientName}</div>
                                                </button>
                                            ))}
                                        {projects.filter(p => p.status !== 'archived').length === 0 && (
                                            <div className="text-sm text-gray-500 p-2">No active projects found.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Selected Project Context Indicator */}
                {selectedProject && (
                    <div className="mt-3 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <CheckCircleIcon className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Active Project Context</span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedProject(null);
                                    setMessages([]);
                                    sessionStorage.removeItem('aiAssistant.lastProjectId');
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                                Clear Context
                            </button>
                        </div>
                        <div className="text-sm text-blue-800">
                            <strong>#{String(selectedProject.projectNumber || selectedProject.id).padStart(5, '0')}</strong> — {selectedProject.projectName || selectedProject.name}
                            {selectedProject.customerName && (
                                <span className="text-blue-600"> • {selectedProject.customerName}</span>
                            )}
                            {selectedProject.status && (
                                <span className="text-blue-600"> • {selectedProject.status}</span>
                            )}
                        </div>
                    </div>
                )}
                
                {/* No Project Selected Message */}
                {!selectedProject && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-900">No Project Selected</span>
                        </div>
                        <div className="text-sm text-yellow-800">
                            Please select a project from the dropdown above to get project-specific assistance.
                        </div>
                    </div>
                )}
                
                {/* Dynamic Prompts */}
                {dynamicPrompts.length > 0 && (
                    <div className="mb-3 grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {dynamicPrompts.map(dp => (
                            <button
                                key={dp.id}
                                onClick={dp.onClick}
                                className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left text-sm font-medium"
                            >
                                {dp.id === 'dyn-complete' ? (
                                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                ) : (
                                    <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                                )}
                                <span>{dp.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {quickActions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => handleQuickAction(action.text)}
                            disabled={action.requiresProject && !selectedProject}
                            className={`flex items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
                                action.requiresProject && !selectedProject
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                            }`}
                        >
                            <div className={action.requiresProject && !selectedProject ? 'opacity-50' : ''}>{action.icon}</div>
                            <span className="text-sm font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
                
                {selectedProject && (
                    <div className="mt-3 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <UserGroupIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                                Active Project: {selectedProject.projectName || selectedProject.name}
                            </span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                            Phase: {currentStep?.phaseName || currentStep?.phaseType || '-'}
                            {'   '}Section: {currentStep?.sectionName || '-'}
                            {'   '}Line Item: {currentStep?.lineItemName || '-'}
                        </p>
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    {messages.map(message => (
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
                                    } catch (_) {}
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

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
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