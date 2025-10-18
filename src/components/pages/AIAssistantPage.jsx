import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChartBarIcon, DocumentTextIcon, CogIcon, CheckCircleIcon, ExclamationTriangleIcon, UserGroupIcon, ChevronDownIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, ChevronLeftIcon, TrashIcon, FolderIcon, SparklesIcon } from '../common/Icons';
import { bubblesService, projectsService, projectMessagesService, usersService } from '../../services/api';
import api from '../../services/api';
import socketService from '../../services/socket';
import { useSubjects } from '../../contexts/SubjectsContext';
import EnhancedProjectDropdown from '../ui/EnhancedProjectDropdown';
import TranscriptHistory from '../ui/TranscriptHistory2';
import { CheatSheetModal } from '../common/CheatSheet';
import assetsService from '../../services/assetsService';
import PermissionGate from '../ui/PermissionGate';
import { PERMISSIONS } from '../../utils/permissions';
// Vapi will be loaded dynamically

const AIAssistantPage = ({ projects = [], colorMode = false, onProjectSelect }) => {
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Chat History state
    const [chatHistory, setChatHistory] = useState([]);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showPlaybook, setShowPlaybook] = useState(false);
    const [selectedProjectNonce, setSelectedProjectNonce] = useState(0);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const headerRef = useRef(null);
    const inputRef = useRef(null);
    const actualInputRef = useRef(null);
    const composerRef = useRef(null);
    const containerRef = useRef(null);
    const liveTranscriptScrollRef = useRef(null);
    const autoScrollRef = useRef(true);
    const [autoScroll, setAutoScroll] = useState(true);
    

    // Message composer (subjects/recipients) for "Send Project Message"
    const { subjects } = useSubjects();
    const [composerSubject, setComposerSubject] = useState('Project Status Update');
    const [composerRecipients, setComposerRecipients] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [showRecipientPicker, setShowRecipientPicker] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [teamMembersLoading, setTeamMembersLoading] = useState(false);
    const [composerBody, setComposerBody] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    // Pending action state for recipient selection
    const [pendingAction, setPendingAction] = useState(null);
    const [pendingActionRecipients, setPendingActionRecipients] = useState([]);
    const [customEmailInput, setCustomEmailInput] = useState('');
    const [customEmails, setCustomEmails] = useState([]);
    // Voice and composer state/refs
    const vapiRef = useRef(null);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [isVoiceLive, setIsVoiceLive] = useState(false);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [inputHeight, setInputHeight] = useState(0);

    // Cleans common mojibake/garbled sequences from transcript text
    const cleanMojibake = (s) => {
        if (s == null) return '';
        let out = String(s);
        
        // Remove common mojibake patterns
        out = out.replace(/ÃƒÆ'Ã‚Â¢|Ã¢â‚¬Å¡Ã‚Â¬|Ã‚Â¢/g, '•');
        out = out.replace(/ÃƒÆ'[^\s]*\|[^\s]*\|[^\s]*/g, '');
        out = out.replace(/Ãƒâ€š/g, '');
        out = out.replace(/ÃƒÂ°/g, '');
        out = out.replace(/Ã…Â¸/g, '');
        out = out.replace(/Â¤/g, '');
        out = out.replace(/Å½/g, '');
        out = out.replace(/Â¡/g, '');
        out = out.replace(/ÃƒÂ°/g, '');
        out = out.replace(/Ã…Â¸/g, '');
        out = out.replace(/Ã…Â¸/g, '');
        
        // Remove other common mojibake sequences
        out = out.replace(/[ÃƒÂ°Ã…Â¸Ã…Â¸Â¤Å½Â¡]/g, '');
        out = out.replace(/[ÃƒÂ°Ã…Â¸Ã…Â¸Â¤Å½Â¡]/g, '');
        
        // Clean up any remaining garbled characters
        out = out.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');
        
        // Normalize whitespace
        out = out.replace(/\s{2,}/g, ' ').trim();
        
        return out;
    };

    const [voiceError, setVoiceError] = useState('');
    const [isVoiceReady, setIsVoiceReady] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState([]); // last lines
    const [showTranscript, setShowTranscript] = useState(false);
    const [liveTranscriptText, setLiveTranscriptText] = useState('');
    const MAX_TRANSCRIPT_PREVIEW_LINES = 8; // tweakable
    
    // Document browser state
    const [showDocumentBrowser, setShowDocumentBrowser] = useState(false);
    const [availableDocuments, setAvailableDocuments] = useState([]);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [documentSearch, setDocumentSearch] = useState('');
    
    // Current user display name (for transcript labels)
    const [currentUserDisplayName, setCurrentUserDisplayName] = useState('');

    useEffect(() => {
        try {
            const getName = (u) => {
                if (!u) return '';
                if (u.firstName || u.lastName) {
                    return [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
                }
                return (u.name || u.fullName || u.email || '').trim();
            };
            let name = '';
            const localUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
            if (localUser) {
                try { name = getName(JSON.parse(localUser)); } catch (_) {}
            }
            if (!name) {
                const sessionUser = sessionStorage.getItem('user') || sessionStorage.getItem('currentUser');
                if (sessionUser) {
                    try { name = getName(JSON.parse(sessionUser)); } catch (_) {}
                }
            }
            setCurrentUserDisplayName(name);
        } catch (_) {}
    }, []);

    // Close document browser when recipient selection is needed
    useEffect(() => {
        const hasRecipientSelection = messages.some(msg => msg.requiresRecipientSelection);
        if (hasRecipientSelection && showDocumentBrowser) {
            setShowDocumentBrowser(false);
        }
    }, [messages, showDocumentBrowser]);

    // Fetch available documents for the document browser
    useEffect(() => {
        const fetchDocuments = async () => {
            if (!showDocumentBrowser) return;
            setDocumentsLoading(true);
            try {
                console.log('Fetching documents...');
                // Fetch all documents recursively from all folders
                const allFiles = [];
                const foldersToProcess = [null]; // Start with root
                const processedFolders = new Set();
                
                while (foldersToProcess.length > 0) {
                    const currentParentId = foldersToProcess.shift();
                    const folderKey = currentParentId || 'root';
                    
                    if (processedFolders.has(folderKey)) continue;
                    processedFolders.add(folderKey);
                    
                    try {
                        const response = await assetsService.list({ 
                            parentId: currentParentId, 
                            limit: 1000 
                        });
                        
                        if (response && response.assets && Array.isArray(response.assets)) {
                            // Add files to our list
                            const files = response.assets.filter(item => item.type === 'FILE');
                            allFiles.push(...files);
                            
                            // Add folders to process queue
                            const folders = response.assets.filter(item => item.type === 'FOLDER');
                            folders.forEach(folder => foldersToProcess.push(folder.id));
                        }
                    } catch (err) {
                        console.error(`Failed to fetch from folder ${folderKey}:`, err);
                    }
                }
                
                console.log('Found documents:', allFiles.length, allFiles);
                setAvailableDocuments(allFiles);
            } catch (error) {
                console.error('Failed to fetch documents:', error);
                setAvailableDocuments([]);
            } finally {
                setDocumentsLoading(false);
            }
        };
        fetchDocuments();
    }, [showDocumentBrowser]);

    // Voice conversation tracking for summary
    const [voiceConversation, setVoiceConversation] = useState([]);
    const [voiceActions, setVoiceActions] = useState([]);
    const voiceStartTimeRef = useRef(null);
    const voiceEndTimeRef = useRef(null);
    // Refs to avoid stale state inside Vapi callbacks
    const voiceConversationRef = useRef([]);
    const voiceTranscriptRef = useRef([]);
// Transcript modal state
    const [showTranscriptModal, setShowTranscriptModal] = useState(false);
    const [transcriptSummary, setTranscriptSummary] = useState(null);
    const [selectedFileFormats, setSelectedFileFormats] = useState(['pdf', 'json']);
    const [isGeneratingFiles, setIsGeneratingFiles] = useState(false);
    const [downloadLinks, setDownloadLinks] = useState(null);
    
    // Transcript history state
    const [showTranscriptHistory, setShowTranscriptHistory] = useState(false);
    const [transcriptId, setTranscriptId] = useState(null);
    // Sync refs to latest state to avoid stale closures in Vapi events
    useEffect(() => { voiceConversationRef.current = voiceConversation; }, [voiceConversation]);
    useEffect(() => { voiceTranscriptRef.current = voiceTranscript; }, [voiceTranscript]);
// Get Vapi configuration from environment variables
    const VAPI_PUBLIC_KEY = process.env.REACT_APP_VAPI_PUBLIC_KEY || 'bafbcec8-96b4-48d0-8ea0-6c8ce48d3ac4';
    const VAPI_ASSISTANT_ID = process.env.REACT_APP_VAPI_ASSISTANT_ID || '1ad2d156-7732-4f8b-97d3-41addce2d6a7';

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
            // Only treat as numbered list if it's a small number (1-99) followed by punctuation and space
            // This prevents treating things like "1.5" or "100.25" as list items
            if (/^([1-9]|[1-9][0-9])[\.)]\s+/.test(trimmed) || /^([1-9]|[1-9][0-9])\s+-\s+/.test(trimmed)) {
                if (inUl) { out.push('</ul>'); inUl = false; }
                if (!inOl) { out.push('<ol class="list-decimal ml-5 mb-1 space-y-1">'); inOl = true; }
                const text = trimmed
                    .replace(/^([1-9]|[1-9][0-9])[\.)]\s+/, '')
                    .replace(/^([1-9]|[1-9][0-9])\s+-\s+/, '');
                out.push(`<li>${replaceLinks(escapeHtml(text))}</li>`);
                pendingAutoList = false;
                continue;
            }

            // Bulleted list (-, *, ÃƒÂ¢|â€šÂ¬|Â¢, ÃƒÂ¢|â€šÂ¬|â‚¬Å“, ÃƒÂ¢|â€šÂ¬|â‚¬Â)
            if (/^[-*ÃƒÂ¢|â€šÂ¬|Â¢ÃƒÂ¢|â€šÂ¬|â‚¬Å“ÃƒÂ¢|â€šÂ¬|â‚¬Â]\s+/.test(trimmed)) {
                if (inOl) { out.push('</ol>'); inOl = false; }
                if (!inUl) { out.push('<ul class="list-disc ml-5 mb-1 space-y-1">'); inUl = true; }
                const text = trimmed.replace(/^[-*ÃƒÂ¢|â€šÂ¬|Â¢ÃƒÂ¢|â€šÂ¬|â‚¬Å“ÃƒÂ¢|â€šÂ¬|â‚¬Â]\s+/, '');
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
        // Final cleanup: remove stray markdown or delimiter tokens that might remain
        html = html
            // remove any remaining backticks (inline/code fence leftovers)
            .replace(/\s?`{1,3}\s?/g, ' ')
            // remove long runs of asterisks/underscores/hashes
            .replace(/\s?\*{2,}\s?/g, ' ')
            .replace(/\s?_{2,}\s?/g, ' ')
            .replace(/\s?#{2,}\s?/g, ' ')
            // remove common LLM delimiter artifacts like '///' and ']/'
            .replace(/\/{3,}/g, ' ')
            .replace(/\]\s*\//g, ' ')
            // collapse stray brackets that aren't part of links
            .replace(/(^|\s)[\[\]](?=\s|$)/g, ' ')
            // normalize excessive whitespace
            .replace(/\s{2,}/g, ' ')
            .trim();
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
            text = text.replace(/^\s{0,3}(?:[-*ÃƒÂ¢|â€šÂ¬|Â¢ÃƒÂ¢|â€šÂ¬|â‚¬Å“ÃƒÂ¢|â€šÂ¬|â‚¬Â]\s+|\d+\.\s+)/gm, '');
            // Horizontal rules
            text = text.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '');
            // Tables pipes
            text = text.replace(/[|]/g, ' ');
            // Trim repeated blank lines
            text = text.replace(/\n{3,}/g, '\n\n');
            return cleanMojibake(text);
        } catch (_){
            return String(content ?? '');
        }
    };

    // Map raw speaker identifiers to friendly display names
    const normalizeSpeakerDisplay = (speaker) => {
        try {
            const raw = String(speaker || '').trim();
            const lower = raw.toLowerCase();

            // Known assistant identifiers -> Bubbles
            if (!raw) return currentUserDisplayName || 'You';
            if (['assistant', 'ai', 'aiaassistant', 'bubbles', 'bubble'].includes(lower) || lower.includes('assistant') || lower.includes('bubbles')) {
                return 'Bubbles';
            }

            // Known user identifiers -> show actual user name when available
            if (['user', 'you', 'client', 'customer'].includes(lower)) {
                return currentUserDisplayName || 'You';
            }

            // If the speaker looks like a personal name (contains a space or capitalized words), return as-is
            if (raw.indexOf(' ') >= 0 || /^[A-Z][a-z]+\s[A-Z]/.test(raw)) {
                return raw;
            }

            // Otherwise, if it's a short token like an email or id, fall back to user name for 'user'-like values
            return raw;
        } catch (_) {
            return currentUserDisplayName || 'You';
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
    }, [projects]);

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
    }, [selectedProject, selectedProjectNonce]);

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
    }, [])

    useEffect(() => {
        try {
          if (!showTranscript || !(isVoiceLive || isVoiceConnecting)) return;
          const el = liveTranscriptScrollRef.current;
          if (!el || !autoScrollRef.current) return;
          // Only auto-scroll when user is at bottom or autoScroll is enabled
          if (typeof el.scrollTo === 'function') {
            el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
          } else {
            el.scrollTop = el.scrollHeight;
          }
        } catch (_) {}
      }, [voiceTranscript, liveTranscriptText, showTranscript, isVoiceLive, isVoiceConnecting, autoScroll]);

    // Manage auto-scroll based on user scroll position in the transcript box
    useEffect(() => {
        const el = liveTranscriptScrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const threshold = 16; // px from bottom to consider "at bottom"
            const atBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= threshold;
            autoScrollRef.current = atBottom;
            setAutoScroll(atBottom);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        // Initialize state on mount
        onScroll();
        return () => { try { el.removeEventListener('scroll', onScroll); } catch (_) {} };
    }, [showTranscript]);

    // (Header sits above the scrollable messages; no need to observe its height)

    // Removed dynamic height calculations; layout uses flex + overflow
    // Load Vapi Web SDK dynamically and initialize
    useEffect(() => {
        let isUnmounted = false;
        
        const loadVapiSDK = async () => {
            try {
                // Check if Vapi is already loaded
                if (window.Vapi && typeof window.Vapi === 'function') {
                    console.log('[Vapi] SDK already loaded from window');
                    return window.Vapi;
                }
                
                // Try to load from npm package first
                try {
                    console.log('[Vapi] Attempting to load from npm package...');
                    const { default: Vapi } = await import('@vapi-ai/web');
                    if (Vapi && typeof Vapi === 'function') {
                        console.log('[Vapi] SDK loaded from npm package');
                        return Vapi;
                    }
                } catch (npmError) {
                    console.log('[Vapi] npm package not available, falling back to CDN:', npmError.message);
                }
                
                console.log('[Vapi] Loading SDK from CDN...');
                
                // Load the Vapi SDK from CDN as fallback
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.js';
                script.async = true;
                
                const loadPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Vapi SDK loading timeout'));
                    }, 10000); // 10 second timeout
                    
                    script.onload = () => {
                        clearTimeout(timeout);
                        if (window.Vapi && typeof window.Vapi === 'function') {
                            console.log('[Vapi] SDK loaded successfully from CDN');
                            resolve(window.Vapi);
                        } else {
                            reject(new Error('Vapi SDK loaded but constructor not available'));
                        }
                    };
                    script.onerror = () => {
                        clearTimeout(timeout);
                        reject(new Error('Failed to load Vapi SDK from CDN'));
                    };
                });
                
                // Remove existing script if any
                const existingScript = document.querySelector('script[src*="@vapi-ai/web"]');
                if (existingScript) existingScript.remove();
                
                document.head.appendChild(script);
                return await loadPromise;
                
            } catch (error) {
                console.error('[Vapi] SDK loading failed:', error);
                throw error;
            }
        };
        
        const initVapi = async () => {
            try {
                if (isUnmounted) return;
                
                if (vapiRef.current) {
                    console.log('[Vapi] Already initialized');
                    return;
                }
                
                if (!VAPI_PUBLIC_KEY || VAPI_PUBLIC_KEY === 'your-vapi-public-key') {
                    throw new Error('VAPI_PUBLIC_KEY not configured');
                }
                
                // Load SDK first
                const VapiClass = await loadVapiSDK();
                
                if (isUnmounted) return;
                
                console.log('[Vapi] Initializing with key:', VAPI_PUBLIC_KEY.substring(0, 8) + '...');
                vapiRef.current = new VapiClass(VAPI_PUBLIC_KEY);
                
                console.log('[Vapi] initialized in AIAssistantPage');
                setIsVoiceReady(true);
                setVoiceError('');
                
                // Wire events with better error handling
                vapiRef.current.on('call-start', () => {
                        console.log('[Vapi] call started');
                        setIsVoiceConnecting(false);
                        setIsVoiceLive(true);
                        setVoiceError('');
                        setShowTranscript(true);
                        
                        // Reset conversation tracking
                        setVoiceConversation([]);
                        setVoiceActions([]);
                        voiceConversationRef.current = [];
                        voiceTranscriptRef.current = [];
                        voiceStartTimeRef.current = new Date();
                        voiceEndTimeRef.current = null;
                    });
                    
                    vapiRef.current.on('call-end', async () => {
                        voiceEndTimeRef.current = new Date();
console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] Event triggered - DEBUGGING TRANSCRIPT MODAL');
                        console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] voiceConversation length:', voiceConversation.length);
                        console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] voiceTranscript:', voiceTranscript);
                        console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] showTranscriptModal before:', showTranscriptModal);
                        
                        const transcriptStrings = Array.isArray(voiceTranscriptRef.current) ? voiceTranscriptRef.current : [];
// If no conversation was captured, create one from the transcript
                        let conversationToUse = Array.isArray(voiceConversationRef.current) ? voiceConversationRef.current : [];
                        if (voiceConversation.length === 0 && transcriptStrings.length > 0) {
                            console.log('[Vapi] Using voiceTranscript as fallback');
                            conversationToUse = transcriptStrings.map((text, index) => ({
                                speaker: currentUserDisplayName || 'You',
                                message: text,
                                timestamp: new Date(),
                                confidence: 'high'
                            }));
                            setVoiceConversation(conversationToUse);
                        }
                        
                        // Generate conversation summary for modal
                        const summary = generateVoiceSummary();
                        console.log('[Vapi] DEBUG: generated summary:', summary);
                        
                        // Always show modal if there was any conversation
                        console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] conversationToUse.length:', conversationToUse.length);
                        console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] voiceTranscript.length:', transcriptStrings.length);
                        if (conversationToUse.length > 0 || transcriptStrings.length > 0) {
                            console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] SHOULD show transcript modal - entering try block');
                            try {
                                const enhancedSummary = await generateEnhancedTranscriptSummary(summary || {}, conversationToUse);
                                console.log('[Vapi] DEBUG: enhanced summary:', enhancedSummary);
                                setTranscriptSummary(enhancedSummary);
                                
                                // Save to database via the voice-transcripts API
                                try {
                                    const saveResponse = await fetch('/api/voice-transcripts', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                                        },
                                        body: JSON.stringify({
                                            sessionId: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                            projectId: selectedProject?.id || null,
                                            summary: enhancedSummary,
                                            fullTranscript: conversationToUse,
                                            metadata: {
                                                callDate: new Date().toLocaleDateString(),
                                                callTime: `${voiceStartTimeRef.current?.toLocaleTimeString() || 'Unknown'} - ${voiceEndTimeRef.current?.toLocaleTimeString() || 'Unknown'}`,
                                                duration: summary?.duration || 'Unknown',
                                                participantCount: conversationToUse.length > 0 ? new Set(conversationToUse.map(c => c.speaker)).size : 1,
                                                startTime: voiceStartTimeRef.current?.toISOString(),
                                                endTime: voiceEndTimeRef.current?.toISOString()
                                            }
                                        })
                                    });
                                    
                                    if (saveResponse.ok) {
                                        const saveResult = await saveResponse.json();
                                        if (saveResult.success) {
                                            console.log('[Vapi] Transcript saved to database:', saveResult.data.transcript.id);
                                            setTranscriptId(saveResult.data.transcript.id);
                                        // Persist to localStorage for history fallback
                                        try {
                                            const localKey = 'voiceTranscripts';
                                            const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
                                            const dateIso = saveResult.data.transcript.callDate || saveResult.data.transcript.createdAt || new Date().toISOString();
                                            const title = (saveResult.data.transcript.project?.projectName ? `${saveResult.data.transcript.project.projectName} Ã¢â‚¬â€ ` : 'Call Ã¢â‚¬â€ ') + new Date(dateIso).toLocaleString();
                                            const preview = saveResult.data.transcript.executiveSummary || (Array.isArray(saveResult.data.transcript.fullTranscript) && saveResult.data.transcript.fullTranscript[0]?.message) || '';
                                            const item = {
                                                id: saveResult.data.transcript.id,
                                                date: new Date(dateIso).toISOString(),
                                                title,
                                                preview,
                                                raw: saveResult.data.transcript
                                            };
                                            const next = [...existing.filter(it => it.id !== item.id), item].slice(-50);
                                            localStorage.setItem(localKey, JSON.stringify(next));
                                        } catch (_) {}
                                        }
                                    }
                                } catch (saveError) {
                                    console.error('[Vapi] Error saving transcript:', saveError);
                                    // Fallback: persist a minimal local item so history shows something
                                    try {
                                        const localKey = 'voiceTranscripts';
                                        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
                                        const dateIso = new Date().toISOString();
                                        const title = (selectedProject?.projectName || selectedProject?.name ? `${selectedProject.projectName || selectedProject.name} Ã¢â‚¬â€ ` : 'Call Ã¢â‚¬â€ ') + new Date(dateIso).toLocaleString();
                                        const preview = (enhancedSummary?.executiveSummary) || (Array.isArray(conversationToUse) && conversationToUse[0]?.message) || '';
                                        const temp = {
                                            id: `local_${Date.now()}`,
                                            date: dateIso,
                                            title,
                                            preview,
                                            raw: {
                                                id: undefined,
                                                callDate: dateIso,
                                                duration: enhancedSummary?.metadata?.duration || 'Unknown',
                                                executiveSummary: enhancedSummary?.executiveSummary || '',
                                                fullTranscript: conversationToUse || [],
                                                project: selectedProject ? { projectName: selectedProject.projectName || selectedProject.name } : null
                                            }
                                        };
                                        const next = [...existing, temp].slice(-50);
                                        localStorage.setItem(localKey, JSON.stringify(next));
                                    } catch (_) {}
                                }
                                
                                console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] SUCCESS - About to setShowTranscriptModal(true)');
                                setShowTranscriptModal(true);
                                console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] SUCCESS - Called setShowTranscriptModal(true)');
                            } catch (error) {
                                console.error('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] ERROR generating enhanced summary:', error);
                                // Show modal with basic summary even if enhancement fails
                                setTranscriptSummary({
                                    metadata: {
                                        callDate: new Date().toLocaleDateString(),
                                        callTime: `${voiceStartTimeRef.current?.toLocaleTimeString() || 'Unknown'} - ${voiceEndTimeRef.current?.toLocaleTimeString() || 'Unknown'}`,
                                        duration: summary?.duration || 'Unknown',
                                        participantCount: 1
                                    },
                                    executiveSummary: transcriptStrings.join(' ') || 'Voice call ended.',
                                    keyDecisions: [],
                                    actionItems: [],
                                    materialsList: [],
                                    risks: [],
                                    fullTranscript: conversationToUse
                                });
                                console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] FALLBACK - About to setShowTranscriptModal(true)');
                                setShowTranscriptModal(true);
                                console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] FALLBACK - Called setShowTranscriptModal(true)');
                            }
                        } else {
                            console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] No conversation data to show - FORCING MODAL ANYWAY FOR TESTING');
                            // FORCE MODAL TO SHOW EVEN WITH NO DATA
                            setTranscriptSummary({
                                metadata: {
                                    callDate: new Date().toLocaleDateString(),
                                    callTime: `${voiceStartTimeRef.current?.toLocaleTimeString() || 'Unknown'} - ${voiceEndTimeRef.current?.toLocaleTimeString() || 'Unknown'}`,
                                    duration: 'Unknown',
                                    participantCount: 1
                                },
                                executiveSummary: 'Call ended with no conversation data captured.',
                                keyDecisions: [],
                                actionItems: [],
                                materialsList: [],
                                risks: [],
                                fullTranscript: []
                            });
                            console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] FORCE - About to setShowTranscriptModal(true)');
                            setShowTranscriptModal(true);
                            console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â´ [CALL-END] FORCE - Called setShowTranscriptModal(true)');
                        }
                        
                        // Save transcription as a chat message if there was any
                        if (transcriptStrings.length > 0) {
                            const transcriptContent = transcriptStrings.join(' ');
                            const voiceMessage = {
                                id: `voice_${Date.now()}`,
                                type: 'user',
                                content: `Å½Â¤Voice: ${transcriptContent}`,
                                timestamp: new Date(),
                                isVoiceMessage: true
                            };
                            setMessages(prev => [voiceMessage, ...prev]);
                        }
                        
                        setIsVoiceConnecting(false);
                        setIsVoiceLive(false);
                        setVoiceError('');
                        setShowTranscript(false);
                        setVoiceTranscript([]);
                        voiceTranscriptRef.current = [];
                        setLiveTranscriptText('');
                    });
                    vapiRef.current.on('speech-start', () => {
                        console.log('[Vapi] speech started (user speaking)');
                    });
                    
                    vapiRef.current.on('speech-end', () => {
                        console.log('[Vapi] speech ended (user stopped speaking)');
                    });
                    
                    vapiRef.current.on('message', (message) => {
                        console.log('ÃƒÂ°Ã…Â¸Ã…Â¸|Â¡ [MESSAGE] type:', message.type, 'message:', message);
                        
                        // Handle various transcript types
                        if (message.type === 'transcript') {
                            console.log('ÃƒÂ°Ã…Â¸Ã…Â¸|Â¡ [MESSAGE] Processing transcript message');
                            const text = String(message.transcript || message.text || '').trim();
                            console.log('ÃƒÂ°Ã…Â¸Ã…Â¸|Â¡ [MESSAGE] Transcript text:', text);
                            if (text) {
                        // Update the on-screen evolving paragraph (natural text)
                    setLiveTranscriptText((prev) => {
                        if (!prev) return cleanMojibake(text);
                        // If the new text is an incremental extension of the previous, replace it
                        if (text.startsWith(prev)) return cleanMojibake(text);
                        // If the engine regresses to a shorter partial, keep the longer one
                        if (prev.startsWith(text)) return prev;
                        // Otherwise, use the latest text
                        return cleanMojibake(text);
                    });
  
                        // Retain deduped transcript lines (for history/end-of-call)
                    setVoiceTranscript(prev => {
                        const last = prev[prev.length - 1] || '';
                        let next = prev;
                        if (text.startsWith(last)) {
                        // Replace the last entry with the extended text
                        next = prev.slice(0, -1).concat(text);
                        } else if (last && last.startsWith(text)) {
                        // Ignore shorter backslide
                          next = prev;
                        } else {
                        // Push as a new entry
                          next = [...prev, text];
                        }
                        // Keep a larger history window if you like
                        const capped = next.slice(-50);
                        console.log('[Vapi] Updated transcript (deduped):', capped);
                                    voiceTranscriptRef.current = capped;
                                    return capped;
                        });

                                // Add to conversation tracking - determine speaker based on message.role
                                const speaker = message.role === 'assistant' ? 'Bubbles' : currentUserDisplayName || 'You';
                                setVoiceConversation(prev => {
                                    const updated = [...prev, {
                                        speaker: speaker,
                                        message: text,
                                        timestamp: new Date(),
                                        confidence: 'high'
                                    }];
                                    console.log('[Vapi] Updated conversation:', updated);
                                    voiceConversationRef.current = updated;
                                    return updated;
                                });
                            }
                        }
                        
                        // Also capture user-message events
                        if (message.type === 'user-message' && message.message) {
                            const text = String(message.message).trim();
                            if (text) {
                                setVoiceConversation(prev => {
                                    const updated = [...prev, {
                                        speaker: currentUserDisplayName || 'You',
                                        message: text,
                                        timestamp: new Date(),
                                        confidence: 'high'
                                    }];
                                    voiceConversationRef.current = updated;
                                    return updated;
                                });
                            }
                        }
                        
                        // Capture assistant-message events
                        if (message.type === 'assistant-message' && message.message) {
                            const text = String(message.message).trim();
                            if (text) {
                                setVoiceConversation(prev => {
                                    const updated = [...prev, {
                                        speaker: 'Bubbles',
                                        message: text,
                                        timestamp: new Date(),
                                        confidence: 'high'
                                    }];
                                    voiceConversationRef.current = updated;
                                    return updated;
                                });
                            }
                        }
                        
                        // Track function calls and actions
                        if (message.type === 'function-call' && message.functionCall) {
                            const action = `Called function: ${message.functionCall.name}`;
                            console.log('[Vapi] Function called:', action);
                            setVoiceActions(prev => [...prev, action]);
                        }
                        
                        // Track assistant speech responses
                        if (message.type === 'speech' && message.speech) {
                            const text = String(message.speech).trim();
                            if (text) {
                                setVoiceConversation(prev => {
                                    const updated = [...prev, {
                                        speaker: 'Bubbles',
                                        message: text,
                                        timestamp: new Date(),
                                        confidence: 'high'
                                    }];
                                    voiceConversationRef.current = updated;
                                    return updated;
                                });
                            }
                        }
                    });
                    
                    vapiRef.current.on('error', (e) => {
                        console.error('[Vapi] error event:', e);
                        const errorMsg = String(e?.message || e || 'Voice connection error');
                        setVoiceError(errorMsg);
                        setIsVoiceConnecting(false);
                        setIsVoiceLive(false);
                    });
                    
                    // Additional events for better debugging
                    vapiRef.current.on('volume-level', (level) => {
                        // Could be used for visual feedback
                    });
                    
                } catch (e) {
                    console.error('[Vapi] Init error:', e);
                    setVoiceError(`Voice initialization failed: ${e.message}`);
                    setIsVoiceReady(false);
                }
            };
            
            // Initialize Vapi (async)
            initVapi().catch(e => {
                console.error('[Vapi] Async init failed:', e);
                if (!isUnmounted) {
                    setVoiceError('Voice initialization failed');
                }
            });
        
        // Cleanup on unmount
        return () => {
            isUnmounted = true;
            try {
                if (vapiRef.current && typeof vapiRef.current.stop === 'function') {
                    vapiRef.current.stop();
                }
            } catch (e) {
                console.error('[Vapi] Cleanup error:', e);
            }
        };
    }, [VAPI_PUBLIC_KEY]);

    const handleVoiceToggle = async () => {
        try { console.log('[Vapi] mic clicked'); } catch(_){}
        setVoiceError('');
        
        const vapi = vapiRef.current;
        if (!vapi) {
            setVoiceError('Voice not initialized. Please refresh the page.');
            return;
        }
        
        if (typeof vapi.start !== 'function' || typeof vapi.stop !== 'function') {
            setVoiceError('Voice SDK not properly loaded.');
            return;
        }
        
        try {
            // If already active, stop the call
            if (isVoiceLive || isVoiceConnecting) {
                console.log('[Vapi] Stopping call...');
                await vapi.stop();
                return;
            }
            
            // Check microphone permissions before starting
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('[Vapi] Microphone permission granted');
            } catch (permError) {
                console.error('[Vapi] Microphone permission denied:', permError);
                setVoiceError('Microphone permission required for voice chat.');
                return;
            }
            
            setIsVoiceConnecting(true);
            setVoiceError('');
            
            // Prepare assistant overrides for project context
            const assistantOverrides = {};
            if (selectedProject?.id) {
                assistantOverrides.variableValues = {
                    projectId: selectedProject.id,
                    projectName: selectedProject.projectName || selectedProject.name || 'Current Project'
                };
                console.log('[Vapi] Adding project context:', assistantOverrides);
            }
            
            console.log('[Vapi] Starting call with assistant ID:', VAPI_ASSISTANT_ID);
            
            // Start the voice call with assistant ID and optional overrides
            // Format: vapi.start(assistantId, assistantOverrides?)
            if (Object.keys(assistantOverrides).length > 0) {
                await vapi.start(VAPI_ASSISTANT_ID, assistantOverrides);
            } else {
                await vapi.start(VAPI_ASSISTANT_ID);
            }
            
        } catch (e) {
            setIsVoiceConnecting(false);
            setIsVoiceLive(false);
            const errorMsg = String(e?.message || e || 'Voice start failed');
            setVoiceError(errorMsg);
            console.error('[Vapi] start error:', e);
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
            } catch (error) {
                console.error('Failed to load current workflow step:', error);
                setCurrentStep(null);
            }
        };

        fetchCurrent();
    }, [selectedProject?.id]);

    useEffect(() => {
        const loadTeam = async () => {
            if (!isComposerOpen && !showRecipientPicker) return;
            try {
                setTeamMembersLoading(true);
                const res = await usersService.getTeamMembers();
                const members = Array.isArray(res?.data)
                    ? res.data
                    : (res?.data?.teamMembers || res?.data?.users || []);
                setTeamMembers(Array.isArray(members) ? members : []);
            } catch (_) {
                setTeamMembers([]);
            } finally {
                setTeamMembersLoading(false);
            }
        };
        loadTeam();
    }, [isComposerOpen, showRecipientPicker]);

    useEffect(() => {
        setSelectedRecipients([]);
        setShowRecipientPicker(false);
    }, [selectedProject?.id]);

    const toggleSelectedRecipient = (userId) => {
        if (!userId) return;
        setSelectedRecipients(prev => prev.includes(userId)
            ? prev.filter(id => id !== userId)
            : [...prev, userId]
        );
    };

    const togglePendingActionRecipient = (userId) => {
        if (!userId) return;
        setPendingActionRecipients(prev => prev.includes(userId)
            ? prev.filter(id => id !== userId)
            : [...prev, userId]
        );
    };

    const addCustomEmail = () => {
        const email = customEmailInput.trim();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setCustomEmails(prev => [...prev, email]);
            setCustomEmailInput('');
        }
    };

    const removeCustomEmail = (email) => {
        setCustomEmails(prev => prev.filter(e => e !== email));
    };

    // Create actual system message/activity that will appear in Messages, Tasks, and Alerts
    const createSystemMessage = async (action, recipients, customEmails, queryClient) => {
        try {
            // Import the activities service
            const { activitiesService } = await import('../../services/api');
            
            // Get the current user
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            
            // Bubbles route handles creating the message automatically
            // Just invalidate cache to refresh the feed
            if (queryClient) {
                console.log('🔄 Invalidating activities cache...');
                queryClient.invalidateQueries({ queryKey: ['activities'] });
                queryClient.invalidateQueries({ queryKey: ['activities', 'recent', 50] });
                // Force refetch
                queryClient.refetchQueries({ queryKey: ['activities', 'recent', 50] });
            }
        } catch (error) {
            console.error('Error creating system message:', error);
            throw error;
        }
    };

    const handleCompletePendingAction = async () => {
        if (!pendingAction || (pendingActionRecipients.length === 0 && customEmails.length === 0)) return;

        setIsLoading(true);
        try {
            // First, create the actual message/activity in the system
            await createSystemMessage(pendingAction, pendingActionRecipients, customEmails, queryClient);

            // Then complete the Bubbles action
            const response = await bubblesService.completeAction(
                pendingAction,
                pendingActionRecipients,
                customEmails
            );

            const confirmationMessage = {
                id: Date.now(),
                type: 'assistant',
                content: response.data?.response?.content || 'Message sent successfully!',
                timestamp: new Date()
            };

            setMessages(prev => [confirmationMessage, ...prev]);

            // Clear pending action state
            setPendingAction(null);
            setPendingActionRecipients([]);
            setCustomEmails([]);
            setCustomEmailInput('');

            setTimeout(scrollToTop, 0);
        } catch (error) {
            const errorMessage = {
                id: Date.now(),
                type: 'assistant',
                content: 'Failed to complete the action. Please try again.',
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [errorMessage, ...prev]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelPendingAction = () => {
        setPendingAction(null);
        setPendingActionRecipients([]);
        setCustomEmails([]);
        setCustomEmailInput('');

        const cancelMessage = {
            id: Date.now(),
            type: 'assistant',
            content: 'Action cancelled. How else can I help you?',
            timestamp: new Date()
        };
        setMessages(prev => [cancelMessage, ...prev]);
    };

    const scrollToTop = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = 0;
        }
    };
    
    // Chat History Functions
    const getChatStorageKey = () => `ai_assistant_chat_history_${selectedProject?.id || 'general'}`;

    const loadChatHistory = () => {
        try {
            const stored = localStorage.getItem(getChatStorageKey());
            if (stored) {
                const history = JSON.parse(stored);
                setChatHistory(history || []);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            setChatHistory([]);
        }
    };

    const saveChatToHistory = () => {
        if (messages.length === 0) return;
        
        try {
            const userMessages = messages.filter(msg => msg.type === 'user');
            if (userMessages.length === 0) return;
            
            const firstUserMessage = userMessages[0];
            const contentSafe = String(firstUserMessage?.content ?? '');
            const title = contentSafe.slice(0, 60) + (contentSafe.length > 60 ? '...' : '');

            const chatToSave = {
                id: currentChatId || `chat_${Date.now()}`,
                messages: messages.length > 0 ? [...messages] : [],
                title: title.length > 0 ? title : 'No title',
                timestamp: new Date().toISOString(),
                projectId: selectedProject?.id || null,
                projectName: selectedProject?.projectName || selectedProject?.name || null
            };
            const stored = localStorage.getItem(getChatStorageKey());
            let history = [];
            if (stored) {
                history = JSON.parse(stored);
            }

            // Remove existing chat with same ID if updating
            history = history.filter(chat => chat.id !== chatToSave.id);
            
            // Add new chat to beginning
            history.unshift(chatToSave);
            
            // Keep only last 50 chats
            history = history.slice(0, 50);
            
            localStorage.setItem(getChatStorageKey(), JSON.stringify(history));
            setChatHistory(history);
            setCurrentChatId(chatToSave.id);
        } catch (error) {
            console.error('Failed to save chat:', error);
        }
    };
    
    // Load chat history when component mounts or project changes
    useEffect(() => {
        loadChatHistory();
    }, [selectedProject?.id]);

    // Save chat when messages change (debounced)
    useEffect(() => {
        if (messages.length > 0 && !isLoading) {
            const timeoutId = setTimeout(() => {
                saveChatToHistory();
            }, 1000); // Save 1 second after last message
            
            return () => clearTimeout(timeoutId);
        }
    }, [messages, isLoading]);
    
    // Voice Conversation Summary Functions
    const generateVoiceSummary = () => {
        if (voiceConversation.length === 0) return null;
        
        const duration = voiceStartTimeRef.current && voiceEndTimeRef.current
            ? Math.round((voiceEndTimeRef.current - voiceStartTimeRef.current) / 1000)
            : 0;
        
        const summary = {
            title: 'Voice Conversation Summary',
            duration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
            startTime: voiceStartTimeRef.current?.toLocaleTimeString() || 'Unknown',
            endTime: voiceEndTimeRef.current?.toLocaleTimeString() || 'Unknown',
            exchanges: voiceConversation.map(exchange => ({
                speaker: exchange.speaker,
                message: exchange.message,
                timestamp: exchange.timestamp
            })),
            actions: voiceActions.length > 0 ? voiceActions : ['No specific actions were taken during this conversation'],
            keyPoints: extractKeyPoints(voiceConversation),
            projectContext: selectedProject ? {
                id: selectedProject.id,
                name: selectedProject.projectName || selectedProject.name
            } : null
        };
        
        return summary;
    };
    
    const extractKeyPoints = (conversation) => {
        const points = [];
        
        // Extract questions asked
        const questions = conversation
            .filter(c => c.speaker === 'user' && c.message.includes('?'))
            .map(c => `Question: ${c.message}`);
        
        // Extract any mentions of specific tasks or issues
        const taskMentions = conversation
            .filter(c => c.message.toLowerCase().includes('task') || 
                        c.message.toLowerCase().includes('issue') ||
                        c.message.toLowerCase().includes('problem'))
            .map(c => `${c.speaker === 'user' ? 'User mentioned' : 'AI addressed'}: ${c.message.slice(0, 100)}...`);
        
        points.push(...questions.slice(0, 3)); // Top 3 questions
        points.push(...taskMentions.slice(0, 2)); // Top 2 task mentions
        
        if (points.length === 0) {
            points.push('General conversation about project status');
        }
        
        return points;
    };
    
    const sendVoiceSummaryAsProjectMessage = async (summary) => {
        if (!summary || !selectedProject) {
            console.log('[Voice] No summary or project to send message');
            return;
        }
        try {
            const messageBody = `
**Voice Interaction Summary**
â€œâ€¦ Date: ${new Date().toLocaleDateString()}
|ÂÂ±Ã¯Â¸Â Duration: ${summary.duration}
â€¢â€™ Time: ${summary.startTime} - ${summary.endTime}

**Key Points Discussed:**
${summary.keyPoints.map(point => `|â‚¬Â¢ ${point}`).join('\n')}

**Full Conversation:**
${summary.exchanges.map(ex => `${normalizeSpeakerDisplay(ex.speaker)}: ${ex.message}`).join('\n\n')}

**Actions Taken:**
${summary.actions.map(action => `|Å“â€¦ ${action}`).join('\n')}

---
*This summary was automatically generated from your voice conversation with Bubbles AI Assistant.*
            `.trim();
            
            // Get current user info (try to extract from browser or use anonymous)
            const getCurrentUser = () => {
                try {
                    // Check if user info is stored in localStorage
                    const userInfo = localStorage.getItem('user') || localStorage.getItem('currentUser');
                    if (userInfo) {
                        const user = JSON.parse(userInfo);
                        return user.id || user.userId || null;
                    }
                    
                    // Check session storage as fallback
                    const sessionUser = sessionStorage.getItem('user') || sessionStorage.getItem('currentUser');
                    if (sessionUser) {
                        const user = JSON.parse(sessionUser);
                        return user.id || user.userId || null;
                    }
                } catch (error) {
                    console.log('[Voice] Could not get current user:', error.message);
                }
                return null;
            };
            
            const currentUserId = getCurrentUser();
            
            // Get team members to include in recipients
            const getProjectRecipients = async () => {
                const recipients = [];
                
                // Always include current user if available
                if (currentUserId) {
                    recipients.push(currentUserId);
                }
                
                try {
                    // Get team members for additional recipients
                    const teamRes = await usersService.getTeamMembers();
                    const teamMembers = teamRes?.data?.teamMembers || (Array.isArray(teamRes?.data) ? teamRes.data : []);
                    
                    // Add team member IDs (avoid duplicates)
                    teamMembers.forEach(member => {
                        const memberId = member.id || member.userId;
                        if (memberId && !recipients.includes(memberId)) {
                            recipients.push(memberId);
                        }
                    });
                } catch (error) {
                    console.log('[Voice] Could not load team members:', error.message);
                }
                
                return recipients;
            };
            
            const recipients = await getProjectRecipients();
            console.log('[Voice] Sending summary to recipients:', recipients);
            
            // Create Bubbles message directly via backend API (bypassing user lookup)
            const response = await api.post(`/project-messages/${selectedProject.id}`, {
                content: messageBody,
                subject: 'Bubbles Conversation',
                priority: 'HIGH',
                messageType: 'SYSTEM_MESSAGE',
                authorName: 'Bubbles AI Assistant',
                authorRole: 'AI_ASSISTANT',
                isSystemGenerated: true,
                isFromBubbles: true,
                recipients: recipients,
                metadata: {
                    type: 'voice_summary',
                    duration: summary.duration,
                    timestamp: new Date().toISOString(),
                    isFromBubbles: true
                }
            });
            
            if (response.data.success) {
                // Add confirmation to chat
                const recipientCount = recipients.length;
                const confirmationMessage = {
                    id: `confirm_${Date.now()}`,
                    type: 'assistant',
                    content: `|Å“â€¦ Voice conversation summary sent as Project Message "Bubbles Conversation" to ${recipientCount > 0 ? `${recipientCount} team member${recipientCount > 1 ? 's' : ''}` : 'project team'}`,
                    timestamp: new Date()
                };
                setMessages(prev => [confirmationMessage, ...prev]);
                
                console.log('[Voice] Summary sent as project message');
            }
        } catch (error) {
            console.error('[Voice] Failed to send summary as project message:', error);
            
            // Add error message to chat
            const errorMessage = {
                id: `error_${Date.now()}`,
                type: 'assistant',
                content: `|Å¡Â Ã¯Â¸Â Could not send conversation summary as project message. The summary has been saved locally.`,
            };
            setMessages(prev => [errorMessage, ...prev]);
        }
    };
    
    // Enhanced transcript and summary generation for modal with GPT-4o
    const generateEnhancedTranscriptSummary = async (baseSummary, conversationData = null) => {
        try {
            const projectInfo = selectedProject ? {
                name: selectedProject.projectName || selectedProject.name,
                number: selectedProject.projectNumber,
                address: selectedProject.address || selectedProject.customer?.address
            } : null;
            
            // Use the conversation data passed to the function, or fall back to voiceConversation
            const conversationToProcess = conversationData || voiceConversation;
            
            // First, try to get AI-enhanced summary from backend using GPT-4o
            try {
                const response = await fetch('/api/transcripts/enhance', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                    },
                    body: JSON.stringify({
                        fullTranscript: conversationToProcess.map(exchange => ({
                            timestamp: exchange.timestamp || new Date(),
                            speaker: exchange.speaker || 'User',
                            message: exchange.message,
                            confidence: exchange.confidence || 'high'
                        })),
                        metadata: {
                            callDate: new Date().toLocaleDateString(),
                            callTime: `${voiceStartTimeRef.current?.toLocaleTimeString() || 'Unknown'} - ${voiceEndTimeRef.current?.toLocaleTimeString() || 'Unknown'}`,
                            duration: baseSummary?.duration || 'Unknown',
                            participantCount: conversationToProcess.length > 0 ? new Set(conversationToProcess.map(c => c.speaker)).size : 1
                        },
                        projectInfo
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data?.summary) {
                        console.log('[Vapi] Successfully generated GPT-4o enhanced summary');
                        // Store the transcript ID for potential later use
                        if (result.data.transcriptId) {
                            setTranscriptId(result.data.transcriptId);
                        }
                        return result.data.summary;
                    }
                }
            } catch (aiError) {
                console.error('[Vapi] Error getting AI-enhanced summary:', aiError);
            }
            
            // Fallback to local extraction if AI service fails
            console.log('[Vapi] Using fallback local extraction');
            const enhancedSummary = {
                metadata: {
                    callDate: new Date().toLocaleDateString(),
                    callTime: `${voiceStartTimeRef.current?.toLocaleTimeString() || 'Unknown'} - ${voiceEndTimeRef.current?.toLocaleTimeString() || 'Unknown'}`,
                    duration: baseSummary?.duration || 'Unknown',
                    project: projectInfo,
                    participantCount: conversationToProcess.length > 0 ? new Set(conversationToProcess.map(c => c.speaker)).size : 1
                },
                executiveSummary: await generateExecutiveSummary(conversationToProcess),
                keyDecisions: extractKeyDecisions(conversationToProcess),
                actionItems: extractActionItems(conversationToProcess),
                materialsList: extractMaterialsList(conversationToProcess),
                risks: extractRisksAndIssues(conversationToProcess),
                fullTranscript: conversationToProcess.map(exchange => ({
                    timestamp: exchange.timestamp || new Date(),
                    speaker: exchange.speaker || 'User',
                    message: exchange.message,
                    confidence: exchange.confidence || 'high'
                })),
                actions: voiceActions
            };
            
            return enhancedSummary;
        } catch (error) {
            console.error('Error generating enhanced summary:', error);
            return null;
        }
    };
    
    // Extract specific information from voice conversation
    const generateExecutiveSummary = async (conversation) => {
        if (!conversation || conversation.length === 0) return "No conversation recorded.";
        
        // Simple summarization - in production, this could use AI
        const messages = conversation.map(c => c.message).join(' ');
        if (messages.length > 200) {
            return `Discussion covered project status, materials, and timeline. Key topics included: ${messages.substring(0, 200)}...`;
        }
        return messages;
    };
    
    const extractKeyDecisions = (conversation) => {
        const decisions = [];
        conversation.forEach(exchange => {
            const message = exchange.message.toLowerCase();
            if (message.includes('approved') || message.includes('decided') || message.includes('agreed')) {
                decisions.push({
                    decision: exchange.message,
                    timestamp: exchange.timestamp || new Date(),
                    speaker: exchange.speaker
                });
            }
        });
        return decisions;
    };
    
    const extractActionItems = (conversation) => {
        const actions = [];
        conversation.forEach(exchange => {
            const message = exchange.message.toLowerCase();
            if (message.includes('need to') || message.includes('will') || message.includes('schedule') || message.includes('order')) {
                actions.push({
                    action: exchange.message,
                    assignee: exchange.speaker === 'User' ? 'Customer' : 'Team',
                    dueDate: null, // Could be extracted with better parsing
                    priority: 'medium'
                });
            }
        });
        return actions;
    };
    
    const extractMaterialsList = (conversation) => {
        const materials = [];
        conversation.forEach(exchange => {
            const message = exchange.message.toLowerCase();
            // Simple material detection - could be enhanced with NLP
            const materialKeywords = ['shingles', 'lumber', 'nails', 'tar', 'flashing', 'gutters', 'materials'];
            materialKeywords.forEach(keyword => {
                if (message.includes(keyword)) {
                    materials.push({
                        material: keyword,
                        mentioned: exchange.message,
                        timestamp: exchange.timestamp || new Date()
                    });
                }
            });
        });
        return materials;
    };
    
    const extractRisksAndIssues = (conversation) => {
        const risks = [];
        conversation.forEach(exchange => {
            const message = exchange.message.toLowerCase();
            if (message.includes('problem') || message.includes('issue') || message.includes('concern') || message.includes('delay')) {
                risks.push({
                    risk: exchange.message,
                    severity: 'medium',
                    timestamp: exchange.timestamp || new Date(),
                    status: 'open'
                });
            }
        });
        return risks;
    };
    
    // Handle file format selection
    const handleFileFormatChange = (format) => {
        setSelectedFileFormats(prev => {
            if (prev.includes(format)) {
                return prev.filter(f => f !== format);
            }
            return [...prev, format];
        });
    };
    
    // Client-side download helpers
    const downloadBlob = (filename, mime, data) => {
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    
    const generateClientDownloads = () => {
      const date = new Date().toISOString().split('T')[0];
      if (selectedFileFormats.includes('json')) {
        downloadBlob('transcript_' + date + '.json', 'application/json', JSON.stringify(transcriptSummary, null, 2));
      }
    if (selectedFileFormats.includes('txt') || selectedFileFormats.includes('pdf') || selectedFileFormats.includes('docx')) {
        const lines = [];
        lines.push('Voice Call Transcript & Summary');
        lines.push('Date: ' + (transcriptSummary?.metadata?.callDate || ''));
        lines.push('Duration: ' + (transcriptSummary?.metadata?.duration || ''));
        lines.push('');
        lines.push('Executive Summary:');
        lines.push(String(transcriptSummary?.executiveSummary || ''));
        lines.push('');
        lines.push('Full Transcript:');
                (transcriptSummary?.fullTranscript || []).forEach(ex => {
                    const t = new Date(ex.timestamp).toLocaleTimeString();
                    const speakerLabel = normalizeSpeakerDisplay(ex.speaker);
                    lines.push('[' + t + '] ' + speakerLabel + ': ' + ex.message);
                });
        downloadBlob('transcript_' + date + '.txt', 'text/plain', lines.join('\n'));
      }
    };
    
    // Generate and download files
    const handleDownloadFiles = async () => {
        if (!transcriptSummary || selectedFileFormats.length === 0) return;
        
        setIsGeneratingFiles(true);
        
        try {
            const response = await fetch('/api/transcripts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                },
                body: JSON.stringify({
                    summary: transcriptSummary,
                    formats: selectedFileFormats,
                    projectId: selectedProject?.id,
                    sessionId: `voice_${Date.now()}`,
                    useAI: true  // Flag to indicate we want AI-enhanced generation
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.downloadLinks) {
                    setDownloadLinks(result.data.downloadLinks);
                    
                    // Trigger downloads
                    Object.entries(result.data.downloadLinks).forEach(([format, url]) => {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `transcript_${new Date().toISOString().split('T')[0]}.${format}`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    });
                } else {
                    generateClientDownloads();
                }
            } else {
                generateClientDownloads();
            }
        } catch (error) {
            console.error('Error generating transcript files:', error);
            generateClientDownloads();
            alert('Failed to generate transcript files. Please try again.');
        } finally {
            setIsGeneratingFiles(false);
        }
    };
    
    // Close transcript modal
    const closeTranscriptModal = () => {
        setShowTranscriptModal(false);
        setTranscriptSummary(null);
        setDownloadLinks(null);
        setSelectedFileFormats(['pdf', 'json']);
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

        setMessages(prev => [userMessage, ...prev]);
        // Scroll to top to show newest message
        setTimeout(scrollToTop, 0);
        setInput('');
        setIsLoading(true);

        try {
            // Use real Bubbles API with project context
            const chatContext = {};
            if (selectedRecipients.length > 0) {
                chatContext.selectedRecipientIds = selectedRecipients;
            }
            const response = await bubblesService.chat(userInput, selectedProject?.id, chatContext);

            // Check if Bubbles requires recipient selection
            if (response.data?.response?.requiresRecipientSelection) {
                const assistantMessage = {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: response.data.response.content,
                    timestamp: new Date(),
                    requiresRecipientSelection: true,
                    availableRecipients: response.data.response.availableRecipients || [],
                    pendingAction: response.data.response.pendingAction
                };

                // Store pending action and show recipient picker
                setPendingAction(response.data.response.pendingAction);
                setTeamMembers(response.data.response.availableRecipients || []);
                setPendingActionRecipients([]);
                
                // Close document browser to prevent UI blocking
                setShowDocumentBrowser(false);

                setMessages(prev => {
                    const [lastUserMsg, ...rest] = prev;
                    return [lastUserMsg, assistantMessage, ...rest];
                });
                setTimeout(scrollToTop, 0);
            } else {
                const assistantMessage = {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: response.data?.response?.content || 'I processed your request.',
                    timestamp: new Date(),
                    suggestedActions: response.data?.response?.suggestedActions || []
                };

                // Add AI response with special flag to keep it paired with the user message
                setMessages(prev => {
                    // Remove the user message temporarily
                    const [lastUserMsg, ...rest] = prev;
                    // Add both back in correct order: user first, then AI response
                    return [lastUserMsg, assistantMessage, ...rest];
                });
                setTimeout(scrollToTop, 0);
            }
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: 'I\'m having trouble connecting to my systems right now. Please try again in a moment.',
                timestamp: new Date(),
                isError: true
            };
            // Add error message after the user message
            setMessages(prev => {
                const [lastUserMsg, ...rest] = prev;
                return [lastUserMsg, errorMessage, ...rest];
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Project selector component
    const ProjectSelector = () => (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Select a project for workflow actions:</h3>
                <div className="space-y-2">
                <button
                    onClick={() => {
                        setSelectedProject(null);
                        setShowProjectSelector(false);
                    }}
                    className="w-full text-left p-3 bg-gray-50 border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-100 transition-colors"
                >
                    <div className="font-medium text-gray-700">No Project Selected</div>
                    <div className="text-sm text-gray-500">Work without a specific project context</div>
                </button>
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
                        <div className="text-sm text-gray-500">{project.customerName} ÃƒÂ¢|â€šÂ¬|Â¢ {project.status}</div>
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
        const isVoiceMessage = message.isVoiceMessage;

        return (
            <div className="w-full">
                <div className={`rounded-xl px-4 py-3 border ${
                    isVoiceMessage
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : isAssistant
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
                    {message.requiresRecipientSelection && message.availableRecipients && (
                        <div className="mt-4 p-3 bg-white border border-blue-300 rounded-lg">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Select Recipients:</h4>

                            {/* Team Members */}
                            <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                                {message.availableRecipients.map(user => (
                                    <label key={user.id} className="flex items-center gap-2 text-sm py-1 px-2 hover:bg-blue-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={pendingActionRecipients.includes(user.id)}
                                            onChange={() => togglePendingActionRecipient(user.id)}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="text-gray-800">
                                            {user.firstName && user.lastName
                                                ? `${user.firstName} ${user.lastName}`
                                                : user.email || user.id}
                                        </span>
                                        {user.role && (
                                            <span className="text-xs text-gray-500">({user.role})</span>
                                        )}
                                    </label>
                                ))}
                            </div>

                            {/* Custom Email Input */}
                            {(pendingAction?.type === 'send_document_email' || pendingAction?.type === 'send_email') && (
                                <div className="mb-3 border-t pt-3">
                                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Or add custom email address:</h5>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="email"
                                            value={customEmailInput}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setCustomEmailInput(e.target.value);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addCustomEmail();
                                                }
                                            }}
                                            onFocus={(e) => e.stopPropagation()}
                                            placeholder="email@example.com"
                                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addCustomEmail();
                                            }}
                                            type="button"
                                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    {customEmails.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {customEmails.map((email, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">
                                                    {email}
                                                    <button
                                                        onClick={() => removeCustomEmail(email)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={handleCompletePendingAction}
                                    disabled={pendingActionRecipients.length === 0 && customEmails.length === 0}
                                    className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    Send to {pendingActionRecipients.length + customEmails.length} recipient{(pendingActionRecipients.length + customEmails.length) !== 1 ? 's' : ''}
                                </button>
                                <button
                                    onClick={handleCancelPendingAction}
                                    className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
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
                        {message.timestamp instanceof Date
                            ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                    </div>
                </div>
            </div>
        );
    };



    return (
        <div ref={containerRef} className="ai-assistant-container min-h-0 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden relative" style={{ height: '100vh' }}>
            {/* Custom styles for message formatting */}
            <style>{`
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
                <div className="flex items-center justify-between gap-4">
                    {/* Enhanced Project selector dropdown - Left aligned */}
                    <div className="flex-1 max-w-2xl relative">
                        <EnhancedProjectDropdown
                            projects={projects}
                            selectedProject={selectedProject}
                            onProjectSelect={(project) => {
                                console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â AIAssistantPage: onProjectSelect called with:', project);
                                console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â AIAssistantPage: Current selectedProject before:', selectedProject);
                                setSelectedProject(project);
                                console.log('ÃƒÂ°Ã…Â¸|â‚¬Â|Â AIAssistantPage: setSelectedProject called with:', project);
                                setSelectedProjectNonce(prev => prev + 1);
                                setShowProjectSelector(false);
                                setProjectSearch('');
                            }}
                            onProjectNavigate={async (project, targetTab) => {
                                try {
                                    if (!project || !onProjectSelect) return;
                                    
                                    // Enhanced navigation for Project Workflow to navigate to current line item
                                    if (targetTab === 'Project Workflow') {
                                        try {
                                            console.log('ÃƒÂ°Ã…Â¸Ã…Â½|Â¯ AI ASSISTANT: Navigating to workflow for project:', project.projectName || project.name);
                                            
                                            // Get current workflow state
                                            const currentWorkflow = project.currentWorkflowItem || {};
                                            const phase = currentWorkflow.phase || 'LEAD';
                                            const section = currentWorkflow.section || 'Unknown Section';
                                            const lineItem = currentWorkflow.lineItem || 'Unknown Item';
                                            
                                            console.log('ÃƒÂ°Ã…Â¸Ã…Â½|Â¯ AI ASSISTANT: Current workflow state:', {
                                                phase,
                                                section,
                                                lineItem
                                            });
                                            
                                            // Get project position data for proper targeting
                                            const projectId = project.id || project._id;
                                            const positionResponse = await fetch(`/api/workflow-data/project-position/${projectId}`, {
                                                headers: {
                                                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                                                }
                                            });
                                            
                                            if (positionResponse.ok) {
                                                const positionResult = await positionResponse.json();
                                                if (positionResult.success && positionResult.data) {
                                                    const position = positionResult.data;
                                                    console.log('ÃƒÂ°Ã…Â¸Ã…Â½|Â¯ AI ASSISTANT: Project position data:', position);
                                                    
                                                    // Generate proper target IDs for navigation
                                                    const targetLineItemId = position.currentLineItemId || 
                                                                           position.currentLineItem || 
                                                                           `${phase}-${section}-0`;
                                                    
                                                    const targetSectionId = position.currentSectionId || 
                                                                          position.currentSection ||
                                                                          section.toLowerCase().replace(/\s+/g, '-');
                                                    
                                                    console.log('ÃƒÂ°Ã…Â¸Ã…Â½|Â¯ AI ASSISTANT: Target IDs:', {
                                                        targetLineItemId,
                                                        targetSectionId
                                                    });
                                                    
                                                    const projectWithNavigation = {
                                                        ...project,
                                                        highlightStep: lineItem,
                                                        highlightLineItem: lineItem,
                                                        targetPhase: phase,
                                                        targetSection: section,
                                                        targetLineItem: lineItem,
                                                        scrollToCurrentLineItem: true,
                                                        navigationTarget: {
                                                            phase: phase,
                                                            section: section,
                                                            lineItem: lineItem,
                                                            stepName: lineItem,
                                                            lineItemId: targetLineItemId,
                                                            workflowId: position.workflowId,
                                                            highlightMode: 'line-item',
                                                            scrollBehavior: 'smooth',
                                                            targetElementId: `lineitem-${targetLineItemId}`,
                                                            highlightColor: '#0066CC',
                                                            highlightDuration: 3000,
                                                            targetSectionId: targetSectionId,
                                                            expandPhase: true,
                                                            expandSection: true
                                                        }
                                                    };
                                                    
                                                    onProjectSelect(projectWithNavigation, 'Project Workflow', null, 'AI Assistant', targetLineItemId, targetSectionId);
                                                    return;
                                                }
                                            }
                                            
                                            console.log('ÃƒÂ°Ã…Â¸Ã…Â½|Â¯ AI ASSISTANT: Could not get position data, using fallback navigation');
                                        } catch (error) {
                                            console.error('ÃƒÂ°Ã…Â¸Ã…Â½|Â¯ AI ASSISTANT: Error enhancing workflow navigation:', error);
                                        }
                                        
                                        // Fallback to simple navigation if enhanced navigation fails
                                        onProjectSelect(project, 'Project Workflow', null, 'AI Assistant');
                                    } else if (targetTab === 'Alerts') {
                                        onProjectSelect(project, 'Alerts', null, 'AI Assistant');
                                    } else if (targetTab === 'Messages') {
                                        onProjectSelect(project, 'Project Messages', null, 'AI Assistant');
                                    } else {
                                        onProjectSelect(project, 'Project Profile', null, 'AI Assistant');
                                    }
                                } catch (error) {
                                    console.error('ÃƒÂ°Ã…Â¸Ã…Â½|Â¯ AI ASSISTANT: Error in project navigation:', error);
                                    // Fallback to simple navigation
                                    onProjectSelect(project, targetTab || 'Project Profile', null, 'AI Assistant');
                                }
                            }}
                            colorMode={colorMode}
                            placeholder="Select Project"
                        />
                    </div>
                    
                    {/* Header Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowDocumentBrowser(!showDocumentBrowser)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md ${
                                showDocumentBrowser 
                                    ? 'bg-[#6BC22E] text-white hover:bg-[#5AB01D]' 
                                    : 'bg-[#7ED242] text-white hover:bg-[#6BC22E]'
                            }`}
                            title="Show available documents"
                        >
                            <FolderIcon className="w-4 h-4" />
                            <span className="hidden md:inline">Documents</span>
                        </button>
                        <button
                            onClick={() => setShowPlaybook(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-md bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700"
                            title="Bubbles Assistant Playbook"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            <span className="hidden md:inline">Assistant Playbook</span>
                            <span className="md:hidden">Playbook</span>
                        </button>
                        <button
                            onClick={() => {
                                setMessages([]);
                                setCurrentChatId(null);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Clear the current chat"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Clear Chat
                        </button>
                    </div>
                </div>
            </div>

            {/* Input Area - Moved to top, above messages */}
            <div ref={inputRef} className="flex-shrink-0 p-1 px-3 md:px-4 border-b border-gray-200 bg-gray-50">
                <form onSubmit={handleSubmit} className="w-full max-w-2xl flex items-center gap-1">
                    <input
                        ref={actualInputRef}
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
                        title={isVoiceLive ? 'End voice' : (isVoiceConnecting ? 'ConnectingÃƒÂ¢|â€šÂ¬|Â¦' : 'Speak to Bubbles')}
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

                    {/* Transcript History button */}
                    <button
                        type="button"
                        onClick={() => setShowTranscriptHistory(true)}
                        className="ml-1 p-[6px] rounded-full border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center"
                        aria-label="View transcript history"
                        title="Transcript History"
                    >
                        <DocumentTextIcon className="w-[18px] h-[18px] text-gray-700" />
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
            </div>

            {/* Chat History Panel */}
            {showChatHistory && (
                <div className="absolute top-0 left-0 w-full h-full z-20 bg-white">
                    <div className="flex flex-col h-full">
                        {/* History Header */}
                        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowChatHistory(false)}
                                        className="p-2 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                        <span>Back</span>
                                    </button>
                                    <div>
                                        <h3 className="font-bold text-lg">Chat History</h3>
                                        <p className="text-sm text-gray-600">{chatHistory.length} saved conversations</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setMessages([]);
                                        setCurrentChatId(null);
                                        setShowChatHistory(false);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 hover:bg-[var(--color-primary-blueprint-blue)] text-white"
                                >
                                    New Chat
                                </button>
                            </div>
                        </div>
                        
                        {/* History List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chatHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h4 className="font-medium text-gray-700 mb-2">No saved chats yet</h4>
                                    <p className="text-sm text-gray-500">Your conversations will appear here automatically</p>
                                </div>
                            ) : (
                                chatHistory.map((chat) => {
                                    const isActive = currentChatId === chat.id;
                                    const chatDate = new Date(chat.timestamp);
                                    const now = new Date();
                                    const diffDays = Math.floor((now - chatDate) / (1000 * 60 * 60 * 24));
                                    
                                    let timeLabel;
                                    if (diffDays === 0) timeLabel = 'Today';
                                    else if (diffDays === 1) timeLabel = 'Yesterday';
                                    else if (diffDays < 7) timeLabel = `${diffDays} days ago`;
                                    else timeLabel = chatDate.toLocaleDateString();
                                    
                                    return (
                                        <div
                                            key={chat.id}
                                            className={`group p-4 rounded-lg cursor-pointer transition-all border ${
                                                isActive
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'hover:bg-gray-50 border-gray-200'
                                            }`}
                                            onClick={() => {
                                                setMessages(chat.messages);
                                                setCurrentChatId(chat.id);
                                                setShowChatHistory(false);
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-sm truncate mb-1 text-gray-900">
                                                        {chat.title}
                                                    </h4>
                                                    <p className="text-xs text-gray-600 mb-1">{timeLabel}</p>
                                                    {chat.projectName && (
                                                        <p className="text-xs text-gray-500 truncate inline-flex items-center gap-1"><FolderIcon className="w-4 h-4" /> {chat.projectName}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setChatHistory(prev => prev.filter(c => c.id !== chat.id));
                                                        if (currentChatId === chat.id) {
                                                            setMessages([]);
                                                            setCurrentChatId(null);
                                                        }
                                                    }}
                                                    className="p-1.5 rounded-md hover:bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete chat"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Recipient Picker */}
            {showRecipientPicker && (
                <div className="w-full border-t border-b border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-sm font-semibold text-blue-900">Select recipients</h3>
                            <p className="text-xs text-blue-700">Chosen teammates will receive document shares initiated in this chat.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelectedRecipients([])}
                                className="text-xs px-2 py-1 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setShowRecipientPicker(false)}
                                className="text-xs px-2 py-1 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-white border border-blue-200 rounded-lg p-3 shadow-sm">
                        {teamMembersLoading ? (
                            <div className="text-sm text-blue-700">Loading team members...</div>
                        ) : (teamMembers || []).length === 0 ? (
                            <div className="text-sm text-blue-700">No team members available.</div>
                        ) : (
                            teamMembers.map(member => {
                                const memberId = member.id || member.userId;
                                const name = member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : (member.name || member.email || memberId);
                                return (
                                    <label key={memberId} className="flex items-center gap-2 text-sm py-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedRecipients.includes(memberId)}
                                            onChange={() => toggleSelectedRecipient(memberId)}
                                        />
                                        <span>{name}</span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                    {selectedRecipients.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {selectedRecipients.map(recipientId => {
                                const member = (teamMembers || []).find(tm => (tm.id || tm.userId) === recipientId);
                                const label = member
                                    ? (member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : (member.name || member.email || recipientId))
                                    : recipientId;
                                return (
                                    <span key={recipientId} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        {label}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Document Browser Popup */}
            {showDocumentBrowser && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-25 z-40"
                        onClick={() => setShowDocumentBrowser(false)}
                    />
                    {/* Popup */}
                    <div className="fixed top-4 right-4 w-80 max-h-[80vh] z-50 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-800">Available Documents</h3>
                            <button
                                onClick={() => setShowDocumentBrowser(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Close"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={documentSearch}
                            onChange={(e) => setDocumentSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        {documentsLoading ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                <div className="inline-flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                    Loading documents...
                                </div>
                            </div>
                        ) : availableDocuments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">No documents found</div>
                        ) : (
                            <div className="space-y-2">
                                {availableDocuments
                                    .filter(doc => {
                                        const name = doc.filename || doc.name || doc.title || '';
                                        return !documentSearch || name.toLowerCase().includes(documentSearch.toLowerCase());
                                    })
                                    .map(doc => {
                                        const docName = doc.filename || doc.name || doc.title || 'Untitled';
                                        return (
                                            <div
                                                key={doc.id}
                                                className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
                                                onClick={() => {
                                                    const newInput = input + (input ? ' ' : '') + `"${docName}"`;
                                                    setInput(newInput);
                                                    // Move cursor to end of text after state update
                                                    setTimeout(() => {
                                                        if (actualInputRef.current) {
                                                            actualInputRef.current.focus();
                                                            // Set cursor position to end of text
                                                            const length = newInput.length;
                                                            actualInputRef.current.setSelectionRange(length, length);
                                                        }
                                                    }, 0);
                                                }}
                                                title={`Click to insert "${docName}" into message`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <DocumentTextIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                                                            {docName}
                                                        </div>
                                                        {doc.fileSize && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {(doc.fileSize / 1024).toFixed(0)} KB
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                    </div>
                </>
            )}
            
            {/* Messages Area - Centered, wider column for more visible text */}
            <div
                className="messages-container flex-1 min-h-0 overflow-hidden"
            >
                <div ref={messagesContainerRef} className="w-full h-full overflow-y-auto custom-scrollbar px-3 md:px-4 py-2">
                    <div className="space-y-3 md:space-y-4">
                        {/* Voice Status and Transcription - Show at top when active */}
                        {(isVoiceLive || isVoiceConnecting) && (
                            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary-blueprint-blue)] animate-pulse"></span>
                                    {isVoiceConnecting ? 'Connecting to voice...' : 'Listening - speak now'}
                                </span>
                            </div>
                        )}
           {showTranscript && (liveTranscriptText || voiceTranscript.length > 0) && (
  <div className="w-full">
    <div className="rounded-xl px-4 py-3 border bg-blue-50 border-blue-200 text-blue-800">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-[var(--color-primary-blueprint-blue)] rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">Live Transcription</span>
      </div>
      <div
        ref={liveTranscriptScrollRef}
        className="text-sm leading-relaxed bg-white/50 px-3 py-2 rounded font-sans overflow-y-auto overflow-x-hidden h-44 md:h-56"
        style={{
          wordBreak: 'normal',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          textAlign: 'left',
          maxWidth: '100%',
          width: '100%'
        }}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
      >
        {(() => {
  // Render as continuous text instead of separate lines
  const rawLines = Array.isArray(voiceTranscript) ? voiceTranscript : [];
  const normalize = (s) => cleanMojibake(String(s || '')).trim();

  // Remove consecutive duplicates after normalization
  const normalized = [];
  for (let i = 0; i < rawLines.length; i++) {
    const txt = normalize(rawLines[i]);
    if (!txt) continue;
    if (normalized.length === 0 || normalized[normalized.length - 1] !== txt) {
      normalized.push(txt);
    }
  }

  // Keep only the last N lines for performance
  const safeLines = normalized.slice(-200);

  const live = normalize(liveTranscriptText || '');
  const lastFinal = safeLines.length > 0 ? safeLines[safeLines.length - 1] : '';
  const showLive = !!live && live !== lastFinal;

  // Combine all finalized text into one continuous string
  const finalizedText = safeLines.join(' ');
  
  return (
    <div className="whitespace-pre-wrap break-words">
      {finalizedText}
      {showLive && (
        <span className="opacity-80"> {live}</span>
      )}
    </div>
  );
})()}
      </div>
    </div>
  </div>
)}
                        
                        {/* Chat Messages */}
                        {messages
                            .filter(message => !message.isContextMessage)
                            .map(message => (
                                <MessageBubble key={message.id} message={message} />
                            ))}
                        
                        {/* Loading Indicator */}
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
                                    
                                    setMessages(prev => [{ id: `msg_${Date.now()}`, type: 'assistant', content: `Message sent in project: ${composerSubject}\n\n${composerBody.trim()}`, timestamp: new Date() }, ...prev]);
                                    setComposerBody(''); setComposerRecipients([]); setComposerSubject(subjects?.[0] || 'Project Status Update'); setIsComposerOpen(false);
                                } catch (e) {
                                    setMessages(prev => [{ id: `msg_err_${Date.now()}`, type: 'error', content: 'Failed to send message. Please try again.', timestamp: new Date() }, ...prev]);
                                } finally { setIsSendingMessage(false); }
                            }} disabled={isSendingMessage || !composerBody.trim()} className={`text-xs px-3 py-2 rounded-md text-white ${isSendingMessage || !composerBody.trim() ? 'bg-gray-400' : 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700'}`}>
                                <span className="font-semibold text-sm md:text-base">{isSendingMessage ? 'Sending...' : 'SEND'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transcript and Summary Modal */}
            {console.log('[Transcript] render showTranscriptModal:', showTranscriptModal, 'transcriptSummary:', !!transcriptSummary)}
            {showTranscriptModal && transcriptSummary && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8" style={{ zIndex: 999999 }}>
                    <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" style={{ zIndex: 999999 }}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Voice Call Transcript & Summary</h2>
                                    <p className="text-sm text-gray-600">
                                        {transcriptSummary.metadata.callDate} â€¢ {transcriptSummary.metadata.duration} â€¢ {transcriptSummary.metadata.participantCount} participant(s)
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeTranscriptModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Project Info */}
                            {transcriptSummary.metadata.project && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Project Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div><span className="font-medium">Project:</span> {transcriptSummary.metadata.project.name}</div>
                                        <div><span className="font-medium">Number:</span> #{transcriptSummary.metadata.project.number}</div>
                                        {transcriptSummary.metadata.project.address && (
                                            <div className="md:col-span-2"><span className="font-medium">Address:</span> {transcriptSummary.metadata.project.address}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Executive Summary */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Executive Summary</h3>
                                <p className="text-gray-800 leading-relaxed">{transcriptSummary.executiveSummary}</p>
                            </div>

                            {/* Key Sections Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Key Decisions */}
                                {(transcriptSummary?.keyDecisions || []).length > 0 && (
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-green-900 mb-3">Key Decisions & Approvals</h3>
                                        <div className="space-y-2">
                                            {transcriptSummary.keyDecisions.map((decision, index) => (
                                                <div key={index} className="bg-white p-3 rounded border border-green-200">
                                                    <p className="text-sm text-gray-800">{decision.decision}</p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {decision.speaker} â€¢ {new Date(decision.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Items */}
                                {(transcriptSummary?.actionItems || []).length > 0 && (
                                    <div className="bg-orange-50 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-orange-900 mb-3">Action Items</h3>
                                        <div className="space-y-2">
                                            {transcriptSummary.actionItems.map((item, index) => (
                                                <div key={index} className="bg-white p-3 rounded border border-orange-200">
                                                    <p className="text-sm text-gray-800 font-medium">{item.action}</p>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                                        <span>Assignee: {item.assignee}</span>
                                                        <span className={`px-2 py-1 rounded ${
                                                            item.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                                        }`}>
                                                            {item.priority} priority
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Materials List */}
                                {(transcriptSummary?.materialsList || []).length > 0 && (
                                    <div className="bg-purple-50 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-purple-900 mb-3">Materials Discussed</h3>
                                        <div className="space-y-2">
                                            {transcriptSummary.materialsList.map((material, index) => (
                                                <div key={index} className="bg-white p-3 rounded border border-purple-200">
                                                    <p className="text-sm text-gray-800 font-medium">{material.material}</p>
                                                    <p className="text-xs text-gray-600 mt-1">"{material.mentioned}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Risks/Issues */}
                                {(transcriptSummary?.risks || []).length > 0 && (
                                    <div className="bg-red-50 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-red-900 mb-3">Risks & Open Issues</h3>
                                        <div className="space-y-2">
                                            {transcriptSummary.risks.map((risk, index) => (
                                                <div key={index} className="bg-white p-3 rounded border border-red-200">
                                                    <p className="text-sm text-gray-800">{risk.risk}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            risk.severity === 'high' ? 'bg-red-100 text-red-800' :
                                                            risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                                        }`}>
                                                            {risk.severity} severity
                                                        </span>
                                                        <span className="text-xs text-gray-600">{risk.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Full Transcript */}
                            <div className="bg-gray-50 rounded-lg p-4 relative">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">Full Conversation Transcript</h3>
                                    <button
                                        onClick={closeTranscriptModal}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-200"
                                        title="Close transcript"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {(transcriptSummary?.fullTranscript || []).map((exchange, index) => (
                                        <div key={index} className="bg-white p-3 rounded border border-gray-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold text-gray-700">
                                                    {normalizeSpeakerDisplay(exchange.speaker)}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(exchange.timestamp).toLocaleTimeString()}
                                                </span>
                                                {exchange.confidence !== 'high' && (
                                                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                                        {exchange.confidence} confidence
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-800">{cleanMojibake(exchange.message)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-gray-200 p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                {/* File Format Selection */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Select file formats:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'pdf', label: 'PDF (Branded)' },
                                            { id: 'json', label: 'JSON (Structured)' },
                                            { id: 'docx', label: 'Word Document' },
                                            { id: 'txt', label: 'Plain Text' }
                                        ].map(format => (
                                            <label key={format.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFileFormats.includes(format.id)}
                                                    onChange={() => handleFileFormatChange(format.id)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{format.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={closeTranscriptModal}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={handleDownloadFiles}
                                        disabled={selectedFileFormats.length === 0 || isGeneratingFiles}
                                        className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                                            selectedFileFormats.length === 0 || isGeneratingFiles
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700'
                                        }`}
                                    >
                                        {isGeneratingFiles ? (
                                            <div className="flex items-center gap-2">
                                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generating...
                                            </div>
                                        ) : (
                                            `Download Selected (${selectedFileFormats.length})`
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transcript History Modal */}
            {showTranscriptHistory && (
                <TranscriptHistory
                    projectId={selectedProject?.id}
                    onTranscriptSelect={(transcript) => {
  // Normalize transcript into expected summary shape before opening modal
  try {
    const date = transcript?.date ? new Date(transcript.date) : new Date();
    const normalized = {
      metadata: {
        callDate: date.toLocaleDateString(),
        callTime: date.toLocaleTimeString(),
        duration: transcript?.duration || 'Unknown',
        participantCount: (transcript?.metadata?.participantCount) || 2,
        project: selectedProject ? {
          name: selectedProject.projectName || selectedProject.name,
          number: selectedProject.projectNumber,
          address: selectedProject.address || selectedProject.customer?.address
        } : null
      },
      executiveSummary: transcript?.preview || transcript?.title || '',
      keyDecisions: [],
      actionItems: [],
      materialsList: [],
      risks: [],
      fullTranscript: transcript?.fullTranscript || [],
      actions: []
    };
    setTranscriptSummary(normalized);
  } catch (_) {
    setTranscriptSummary({
      metadata: { callDate: '', callTime: '', duration: '', participantCount: '', project: null },
      executiveSummary: transcript?.title || '',
      keyDecisions: [],
      actionItems: [],
      materialsList: [],
      risks: [],
      fullTranscript: [],
      actions: []
    });
  }
  setShowTranscriptModal(true);
  setShowTranscriptHistory(false);
}}
                    onClose={() => setShowTranscriptHistory(false)}
                />
            )}

            {/* Bubbles Assistant Playbook Modal */}
            <CheatSheetModal visible={showPlaybook} onClose={() => setShowPlaybook(false)} colorMode={colorMode} />

        </div>
    );
};

export default AIAssistantPage;




