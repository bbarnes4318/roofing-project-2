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
    const containerRef = useRef(null);
    

    // Message composer (subjects/recipients) for "Send Project Message"
    const { subjects } = useSubjects();
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [composerSubject, setComposerSubject] = useState('Project Status Update');
    const [composerRecipients, setComposerRecipients] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [composerBody, setComposerBody] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [inputHeight, setInputHeight] = useState(0);
    // Voice (Vapi) state
    const vapiRef = useRef(null);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [isVoiceLive, setIsVoiceLive] = useState(false);
    const [voiceError, setVoiceError] = useState('');
    const [isVoiceReady, setIsVoiceReady] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState([]); // last lines
    const [showTranscript, setShowTranscript] = useState(false);

    // Replace with envs if supported
    const VAPI_PUBLIC_KEY = 'bafbcec8-96b4-48d0-8ea0-6c8ce48d3ac4'; // TEST KEY
    const VAPI_ASSISTANT_ID = '1ad2d156-7732-4f8b-97d3-41addce2d6a7'; // TEST ASSISTANT

    // Enhanced markdown renderer for AI responses
    const renderMessageContent = (content) => {
        if (!content) return '';
        const escapeHtml = (s) => String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const replaceLinks = (s) => s.replace(/\[(.*?)\]\((https?:\/\/[^)\s]+)\)/g, (_m, text, url) => {
            return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${escapeHtml(text)}</a>`;
        });

        const lines = String(content).replace(/\r\n?/g, '\n').split('\n');
        const out = [];
        let inUl = false;
        let inOl = false;
        let inCodeBlock = false;
        let pendingAutoList = false;

        const closeLists = () => {
            if (inUl) { out.push('</ul>'); inUl = false; }
            if (inOl) { out.push('</ol>'); inOl = false; }
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i] ?? '';
            const trimmed = String(line).trim();

            // Code fence toggle
            if (/^```/.test(trimmed)) {
                if (inCodeBlock) {
                    out.push('</code></pre>');
                    inCodeBlock = false;
                } else {
                    closeLists();
                    inCodeBlock = true;
                    out.push('<pre class="bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto"><code>');
                }
                continue;
            }

            if (inCodeBlock) {
                out.push(`${escapeHtml(line)}\n`);
                continue;
            }

            // Blank line
            if (trimmed === '') {
                closeLists(); pendingAutoList = false;
                out.push('<div class="h-2"></div>');
                continue;
            }

            // Headers
            if (trimmed.startsWith('#')) {
                closeLists(); pendingAutoList = false;
                const level = Math.min((trimmed.match(/^#+/)?.[0]?.length) || 1, 6);
                const text = trimmed.replace(/^#+\s*/, '');
                out.push(`<h${level} class="font-semibold mb-2 mt-1">${escapeHtml(text)}</h${level}>`);
                continue;
            }

            // Section heading ending with :
            if (/^.{1,120}:$/.test(trimmed)) {
                closeLists(); pendingAutoList = true;
                const headingText = trimmed.slice(0, -1);
                out.push(`<h3 class="font-semibold mb-1 mt-1">${escapeHtml(headingText)}</h3>`);
                continue;
            }

            // Numbered list: 1., 1) or 1 - patterns
            if (/^\d+[\.)]\s+/.test(trimmed) || /^\d+\s+-\s+/.test(trimmed) || /^\d+\.\s*/.test(trimmed)) {
                if (inUl) { out.push('</ul>'); inUl = false; }
                if (!inOl) { out.push('<ol class="list-decimal ml-5 mb-1 space-y-1">'); inOl = true; }
                const text = trimmed
                    .replace(/^\d+[\.)]\s+/, '')
                    .replace(/^\d+\s+-\s+/, '')
                    .replace(/^\d+\.\s*/, '');
                out.push(`<li>${replaceLinks(escapeHtml(text))}</li>`);
                pendingAutoList = false;
                continue;
            }

            // Bulleted list (-, *, •, –, —)
            if (/^[-*•–—]\s+/.test(trimmed)) {
                if (inOl) { out.push('</ol>'); inOl = false; }
                if (!inUl) { out.push('<ul class="list-disc ml-5 mb-1 space-y-1">'); inUl = true; }
                const text = trimmed.replace(/^[-*•–—]\s+/, '');
                out.push(`<li>${replaceLinks(escapeHtml(text))}</li>`);
                pendingAutoList = false;
                continue;
            }

            // Auto-list after heading:
            if (pendingAutoList) {
                if (!inUl) { out.push('<ul class="list-disc ml-5 mb-1 space-y-1">'); inUl = true; }
                out.push(`<li>${replaceLinks(escapeHtml(trimmed))}</li>`);
                continue;
            }

            // Label: Value blocks
            if (/^(Phase|Section|Line Item|Status|Progress|Customer|Project):/i.test(trimmed)) {
                closeLists(); pendingAutoList = false;
                const idx = line.indexOf(':');
                const label = line.slice(0, idx).trim();
                const value = line.slice(idx + 1).trim();
                out.push(`<div class="mb-2 p-2 bg-gray-50 rounded border-l-4 border-blue-400"><strong class="text-blue-700">${escapeHtml(label)}:</strong> <span class="text-gray-800">${replaceLinks(escapeHtml(value))}</span></div>`);
                continue;
            }

            // Inline emphasis (bold/italic) without showing tokens
            let processed = escapeHtml(line)
                .replace(/\*\*\*([^*]+)\*\*\*/g, '<em><strong>$1</strong></em>')
                .replace(/___([^_]+)___/g, '<em><strong>$1</strong></em>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/__([^_]+)__/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/_([^_]+)_/g, '<em>$1</em>');
            processed = replaceLinks(processed);

            closeLists(); pendingAutoList = false;
            out.push(`<p class="mb-1 leading-relaxed">${processed}</p>`);
        }

        if (inUl) out.push('</ul>');
        if (inOl) out.push('</ol>');
        if (inCodeBlock) out.push('</code></pre>');
        let html = out.join('');
        // Final cleanup: remove stray markdown tokens that might remain
        html = html
            .replace(/\s?`{1,3}\s?/g, ' ')
            .replace(/\s?\*{3,}\s?/g, ' ')
            .replace(/\s?_{3,}\s?/g, ' ')
            .replace(/\s?#{2,}\s?/g, ' ');
        return html;
    };

    const stripMarkdown = (content) => {
        try {
            let text = String(content ?? '');
            // Code fences: keep content, drop the backticks
            text = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''));
            // Inline code
            text = text.replace(/`([^`]+)`/g, '$1');
            // Images ![alt](url) -> alt
            text = text.replace(/!\[(.*?)\]\([^)]*\)/g, '$1');
            // Links [text](url) -> text
            text = text.replace(/\[(.*?)\]\([^)]*\)/g, '$1');
            // Bold/italic
            text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
            text = text.replace(/__([^_]+)__/g, '$1');
            text = text.replace(/\*([^*]+)\*/g, '$1');
            text = text.replace(/_([^_]+)_/g, '$1');
            // Headings: remove leading hashes
            text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
            // Blockquotes
            text = text.replace(/^\s{0,3}>\s?/gm, '');
            // Lists markers
            text = text.replace(/^\s{0,3}(?:[-*•–—]\s+|\d+\.\s+)/gm, '');
            // Horizontal rules
            text = text.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '');
            // Tables pipes
            text = text.replace(/[|]/g, ' ');
            // Trim repeated blank lines
            text = text.replace(/\n{3,}/g, '\n\n');
            return text;
        } catch (_){
            return String(content ?? '');
        }
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

    // Hard lock page scroll so only the messages container scrolls (pre-paint)
    useLayoutEffect(() => {
        try {
            window.scrollTo(0, 0);

            const htmlEl = document.documentElement;
            const bodyEl = document.body;

            // Add strong class-based no-scroll (CSS handles cross-browser hiding)
            htmlEl.classList.add('no-page-scroll');
            bodyEl.classList.add('no-page-scroll');

            // Inline hard lock (works across Windows browsers that still show gutter)
            const prev = {
                html: {
                    overflowY: htmlEl.style.overflowY,
                    overflowX: htmlEl.style.overflowX,
                    height: htmlEl.style.height
                },
                body: {
                    position: bodyEl.style.position,
                    top: bodyEl.style.top,
                    right: bodyEl.style.right,
                    bottom: bodyEl.style.bottom,
                    left: bodyEl.style.left,
                    width: bodyEl.style.width,
                    height: bodyEl.style.height,
                    overflowY: bodyEl.style.overflowY,
                    overflowX: bodyEl.style.overflowX
                }
            };

            htmlEl.style.overflowY = 'hidden';
            htmlEl.style.overflowX = 'hidden';
            htmlEl.style.height = '100%';

            bodyEl.style.position = 'fixed';
            bodyEl.style.top = '0';
            bodyEl.style.right = '0';
            bodyEl.style.bottom = '0';
            bodyEl.style.left = '0';
            bodyEl.style.width = '100%';
            bodyEl.style.height = '100vh';
            bodyEl.style.overflowY = 'hidden';
            bodyEl.style.overflowX = 'hidden';

            return () => {
                try {
                    htmlEl.classList.remove('no-page-scroll');
                    bodyEl.classList.remove('no-page-scroll');
                    htmlEl.style.overflowY = prev.html.overflowY;
                    htmlEl.style.overflowX = prev.html.overflowX;
                    htmlEl.style.height = prev.html.height;
                    bodyEl.style.position = prev.body.position;
                    bodyEl.style.top = prev.body.top;
                    bodyEl.style.right = prev.body.right;
                    bodyEl.style.bottom = prev.body.bottom;
                    bodyEl.style.left = prev.body.left;
                    bodyEl.style.width = prev.body.width;
                    bodyEl.style.height = prev.body.height;
                    bodyEl.style.overflowY = prev.body.overflowY;
                    bodyEl.style.overflowX = prev.body.overflowX;
                } catch (_) {}
            };
        } catch (_) {}
    }, []);

    // Observe input area height so messages list can have bottom padding
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        const updateHeight = () => {
            try { setInputHeight(el.offsetHeight || 0); } catch (_) {}
        };
        updateHeight();
        let ro = null;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => updateHeight());
            try { ro.observe(el); } catch (_) {}
        } else {
            window.addEventListener('resize', updateHeight);
        }
        return () => {
            if (ro) {
                try { ro.disconnect(); } catch (_) {}
            } else {
                window.removeEventListener('resize', updateHeight);
            }
        };
    }, []);

    // (Header sits above the scrollable messages; no need to observe its height)

    // Removed dynamic height calculations; layout uses flex + overflow
    // Load Vapi Web SDK (UMD) and initialize once
    useEffect(() => {
        try {
            const initVapi = () => {
                try {
                    if (!window) return;
                    const V = (window.Vapi && (window.Vapi.default || window.Vapi.Vapi || window.Vapi)) || null;
                    if (!V) return;
                    if (vapiRef.current) return;
                    vapiRef.current = new V(VAPI_PUBLIC_KEY);
                    // Debug hook
                    try { console.log('[Vapi] initialized'); } catch(_){}
                    setIsVoiceReady(true);
                    // Wire events
                    const on = (evt, cb) => { try { vapiRef.current.on && vapiRef.current.on(evt, cb); } catch(_){} };
                    on('call.started', () => { setIsVoiceConnecting(false); setIsVoiceLive(true); setVoiceError(''); setShowTranscript(true); try { console.log('[Vapi] call.started'); } catch(_){} });
                    on('call-started', () => { setIsVoiceConnecting(false); setIsVoiceLive(true); setVoiceError(''); setShowTranscript(true); try { console.log('[Vapi] call-started'); } catch(_){} });
                    on('call.ended', () => { setIsVoiceConnecting(false); setIsVoiceLive(false); setVoiceError(''); setShowTranscript(false); setVoiceTranscript([]); try { console.log('[Vapi] call.ended'); } catch(_){} });
                    on('call-ended', () => { setIsVoiceConnecting(false); setIsVoiceLive(false); setVoiceError(''); setShowTranscript(false); setVoiceTranscript([]); try { console.log('[Vapi] call-ended'); } catch(_){} });
                    on('transcript.partial', (t) => { setVoiceTranscript(prev => { const text = String(t?.text || '').trim(); const next = text ? [...prev, text].slice(-3) : prev; return next; }); });
                    on('transcript.final', (t) => { setVoiceTranscript(prev => { const text = String(t?.text || '').trim(); const next = text ? [...prev, text].slice(-3) : prev; return next; }); });
                    on('error', (e) => { setVoiceError(String(e?.message || 'Voice error')); setIsVoiceConnecting(false); setIsVoiceLive(false); try { console.error('[Vapi] error', e); } catch(_){} });
                } catch(_){}
            };
            const tryLoad = (urls, idx = 0) => {
                if (idx >= urls.length) {
                    setVoiceError('Voice SDK failed to load.');
                    return;
                }
                const url = urls[idx];
                const tagId = `vapi-web-sdk-${idx}`;
                if (document.getElementById(tagId)) {
                    const timer = setInterval(() => {
                        const V = window && window.Vapi;
                        if (V) { clearInterval(timer); initVapi(); }
                    }, 100);
                    setTimeout(() => { try { clearInterval(timer); } catch(_){} }, 5000);
                    return;
                }
                const s = document.createElement('script');
                s.id = tagId;
                s.async = true;
                s.src = url;
                s.onload = initVapi;
                s.onerror = () => {
                    try { console.error('[Vapi] SDK load failed:', url); } catch(_){}
                    tryLoad(urls, idx + 1);
                };
                document.body.appendChild(s);
            };
            if (!window || window.Vapi == null) {
                tryLoad([
                    'https://unpkg.com/@vapi-ai/web@latest/dist/index.umd.js',
                    'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.umd.js'
                ]);
            } else {
                initVapi();
            }
        } catch(_){ }
    }, [VAPI_PUBLIC_KEY]);

    const handleVoiceToggle = async () => {
        try { console.log('[Vapi] mic clicked'); } catch(_){}
        setVoiceError('');
        const vapi = vapiRef.current;
        if (!vapi || typeof vapi.start !== 'function' || typeof vapi.end !== 'function') {
            setVoiceError('Voice not ready.');
            return;
        }
        try {
            if (isVoiceLive || isVoiceConnecting) {
                await vapi.end();
                return;
            }
            setIsVoiceConnecting(true);
            const metadata = {};
            try {
                if (selectedProject) {
                    metadata.projectId = selectedProject.id;
                    metadata.projectName = selectedProject.projectName || selectedProject.name;
                }
            } catch(_){}
            await vapi.start({ assistantId: VAPI_ASSISTANT_ID, mode: 'voice', metadata });
        } catch (e) {
            setIsVoiceConnecting(false);
            setIsVoiceLive(false);
            setVoiceError(String(e?.message || 'Unable to start voice.'));
            try { console.error('[Vapi] start error', e); } catch(_){}
        }
    };


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
                        className="prose prose-sm max-w-none"
                        style={{ fontSize: '10px', lineHeight: '14px' }}
                        dangerouslySetInnerHTML={{ 
                            __html: isAssistant ? renderMessageContent(message.content) : renderMessageContent(String(message.content ?? ''))
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
        <div ref={containerRef} className="ai-assistant-container min-h-0 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: '100vh' }}>
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

            {/* Input Area - Moved to top, above messages */}
            <div ref={inputRef} className="flex-shrink-0 p-1 px-3 md:px-4 border-b border-gray-200 bg-gray-50">
                <form onSubmit={handleSubmit} className="w-full max-w-2xl flex items-center gap-1">
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
                    {/* Vapi Voice mic button */}
                    <button
                        type="button"
                        onClick={handleVoiceToggle}
                        className={`ml-1 p-[6px] rounded-full border flex items-center justify-center transition ${isVoiceLive ? 'border-blue-600 bg-blue-50 shadow-glow' : 'border-gray-300 bg-white hover:bg-gray-100'}`}
                        aria-label={isVoiceLive ? 'End voice with Bubbles' : (isVoiceConnecting ? 'Connecting to Bubbles' : 'Speak to Bubbles')}
                        title={isVoiceLive ? 'End voice' : (isVoiceConnecting ? 'Connecting…' : 'Speak to Bubbles')}
                    >
                        {isVoiceConnecting ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin" aria-hidden="true">
                                <circle cx="12" cy="12" r="9" stroke="#93c5fd" strokeWidth="3" opacity="0.35" />
                                <path d="M21 12a9 9 0 00-9-9" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={isVoiceLive ? 'animate-pulse' : ''}>
                                <path d="M9 5a3 3 0 016 0v6a3 3 0 11-6 0V5z" fill={isVoiceLive ? '#2563eb' : '#111827'} />
                                <path d="M5 12a7 7 0 0014 0M12 19v-3" stroke={isVoiceLive ? '#2563eb' : '#111827'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </button>

                    {/* Telephone call button */}
                    <a
                        href="tel:+17243812859"
                        className="ml-1 p-[6px] rounded-full border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center"
                        aria-label="Call +17243812859"
                        title="+17243812859"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M2.5 6.75C2.5 5.78 3.28 5 4.25 5h2.2c.72 0 1.35.47 1.54 1.16l.8 2.82c.18.65-.07 1.35-.63 1.73l-1.24.85c1.14 2.1 2.95 3.92 5.05 5.05l.85-1.24c.38-.56 1.08-.81 1.73-.63l2.82.8c.69.2 1.16.82 1.16 1.54v2.2c0 .97-.78 1.75-1.75 1.75h-1.5C8.49 21.99 2 15.51 2 7.25v-1.5z" fill="#111827"/>
                        </svg>
                    </a>
                </form>
                {voiceError && (
                    <div className="mt-1 text-[10px] text-red-600">{voiceError}</div>
                )}
            </div>

            {/* Messages Area - Centered, wider column for more visible text */}
            <div
                className="messages-container flex-1 min-h-0 overflow-hidden"
            >
                <div ref={messagesContainerRef} className="w-full h-full overflow-y-auto custom-scrollbar px-3 md:px-4 py-2">
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
                        {(isVoiceLive || isVoiceConnecting) && (
                            <div className="flex items-center gap-2 text-[10px] text-blue-700">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                    {isVoiceConnecting ? 'Connecting…' : 'Listening…'}
                                </span>
                            </div>
                        )}
                        {showTranscript && voiceTranscript.length > 0 && (
                            <div className="text-[10px] text-gray-600 border border-gray-200 rounded p-2 bg-white">
                                {voiceTranscript.slice(-3).map((t, i) => (
                                    <div key={i} className="truncate">{t}</div>
                                ))}
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

        </div>
    );
};

export default AIAssistantPage;