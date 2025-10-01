// --- BubblesChat Component ---
import React, { useState, useEffect, useRef } from 'react';
import { bubblesService, workflowAlertsService, usersService, projectMessagesService } from '../../services/api';
import CheatSheet, { CheatSheetPopover, CheatSheetModal } from './CheatSheet';
import socketService from '../../services/socket';
import { CalendarIcon, ExclamationTriangleIcon, BellIcon, SparklesIcon, ClockIcon, ChevronDownIcon, XCircleIcon, ChatBubbleLeftRightIcon, TrashIcon, ArchiveBoxIcon, ChevronLeftIcon } from '../common/Icons';
import { useSubjects } from '../../contexts/SubjectsContext';
import Vapi from '@vapi-ai/web';

const BubblesChat = ({
  isOpen,
  onClose,
  onMinimize = null,
  currentProject = { id: 'proj_123', name: 'North Retail Complex' }, // Mock project
  colorMode = false,
  className = ""
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [insightChips, setInsightChips] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Project Message Composer state
  const { subjects } = useSubjects();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerSubject, setComposerSubject] = useState('Project Status Update');
  const [composerRecipients, setComposerRecipients] = useState([]); // user ids
  const [teamMembers, setTeamMembers] = useState([]);
  const [composerBody, setComposerBody] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  // Pending action state for recipient selection
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingActionRecipients, setPendingActionRecipients] = useState([]);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [customEmails, setCustomEmails] = useState([]);

  // Voice (Vapi) state
  const vapiRef = useRef(null);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [isVoiceLive, setIsVoiceLive] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [isVoiceReady, setIsVoiceReady] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState([]); // last lines
  const [showTranscript, setShowTranscript] = useState(false);

  // Chat History state
  const [chatHistory, setChatHistory] = useState([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isSavingChat, setIsSavingChat] = useState(false);

  // Get Vapi configuration from environment variables
  const VAPI_PUBLIC_KEY = process.env.REACT_APP_VAPI_PUBLIC_KEY || 'bafbcec8-96b4-48d0-8ea0-6c8ce48d3ac4';
  const VAPI_ASSISTANT_ID = process.env.REACT_APP_VAPI_ASSISTANT_ID || '1ad2d156-7732-4f8b-97d3-41addce2d6a7';

  // Fetch a dynamic, AI-generated welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const fetchInitialGreeting = async () => {
        setIsLoading(true);
        try {
          const response = await bubblesService.chat('initial_greeting', currentProject?.id);
          const aiMessage = {
            id: response.data.sessionContext?.sessionId || 'welcome',
            type: 'ai',
            content: response.data.response.content,
            suggestedActions: response.data.response.suggestedActions || [],
            timestamp: new Date(response.data.response.timestamp),
          };
          setMessages([aiMessage]);
        } catch (error) {
          setMessages([{
            id: 'error_welcome',
            type: 'error',
            content: 'Sorry, I had trouble starting up. Please try again in a moment.',
            timestamp: new Date(),
          }]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitialGreeting();
    }
  }, [isOpen, currentProject]);

  // Fetch dynamic insight chips
  useEffect(() => {
    const fetchChips = async () => {
      if (!isOpen || !currentProject?.id) return;
      try {
        const [predictionRes, risksRes, alertsRes, currentStepRes] = await Promise.all([
          bubblesService.insights.getProjectPrediction(currentProject.id),
          bubblesService.insights.getProjectRisks(currentProject.id),
          workflowAlertsService.getByProject(currentProject.id),
          bubblesService.getCurrentStep(currentProject.id)
        ]);
        
        const chips = [];
        if (predictionRes.data?.prediction?.eta) {
          chips.push({ key: 'eta', icon: CalendarIcon, label: 'ETA', value: new Date(predictionRes.data.prediction.eta).toLocaleDateString(), action: 'project status' });
        }
        const riskCount = risksRes.data?.risks?.risks?.length || 0;
        chips.push({ key: 'risks', icon: ExclamationTriangleIcon, label: 'Risks', value: String(riskCount), tone: riskCount > 0 ? 'warn' : 'ok', action: 'show risks' });
        
        const activeAlerts = alertsRes.data?.alerts?.data?.filter(a => a.status === 'ACTIVE').length || 0;
        chips.push({ key: 'alerts', icon: BellIcon, label: 'Alerts', value: String(activeAlerts), tone: activeAlerts > 0 ? 'warn' : 'ok', action: 'check alerts' });

        const current = currentStepRes?.data?.current;
        if (current?.lineItemName) {
          chips.push({ key: 'complete_current', icon: SparklesIcon, label: 'Complete', value: current.lineItemName, action: `Complete "${current.lineItemName}"` });
        }
        // Add Send Project Message chip
        chips.push({ key: 'send_message', icon: ChatBubbleLeftRightIcon, label: 'Send Project Message', value: '', action: 'send_project_message' });
        
        setInsightChips(chips);
      } catch (e) {
        console.warn('Bubbles chips fetch failed:', e);
      }
    };
    fetchChips();
  }, [isOpen, currentProject]);

  // Auto-scroll to the latest message with improved behavior
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        // Use smooth scrolling for new messages
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
      }
    };

    // Small delay to ensure DOM is updated before scrolling
    const timeoutId = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  // Ensure when the widget is opened it is scrolled to the bottom
  useEffect(() => {
    if (!isOpen) return;
    try {
      // run immediately and on next tick to catch first paint
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    } catch (_) {}
  }, [isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Initialize Vapi voice SDK
  useEffect(() => {
    try {
      const initVapi = () => {
        try {
          if (vapiRef.current) return;
          
          vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
          console.log('[Vapi] initialized in BubblesChat');
          setIsVoiceReady(true);
          
          // Wire events
          vapiRef.current.on('call-start', () => {
            setIsVoiceConnecting(false);
            setIsVoiceLive(true);
            setVoiceError('');
            // Show transcript AFTER the call ends, not during
            setShowTranscript(false);
            console.log('[Vapi] call started');
          });
          
          vapiRef.current.on('call-end', () => {
            setIsVoiceConnecting(false);
            setIsVoiceLive(false);
            setVoiceError('');
            // Preserve transcript and show it when the call finishes
            setShowTranscript(true);
            console.log('[Vapi] call ended');
          });
          
          vapiRef.current.on('speech-start', () => {
            console.log('[Vapi] speech started');
          });
          
          vapiRef.current.on('speech-end', () => {
            console.log('[Vapi] speech ended');
          });
          
          vapiRef.current.on('message', (message) => {
            if (message.type === 'transcript' && message.transcript) {
              setVoiceTranscript(prev => {
                const text = String(message.transcript).trim();
                return text ? [...prev, text].slice(-3) : prev;
              });
            }
          });
          
          vapiRef.current.on('error', (e) => {
            setVoiceError(String(e?.message || 'Voice error'));
            setIsVoiceConnecting(false);
            setIsVoiceLive(false);
            console.error('[Vapi] error', e);
          });
        } catch (e) {
          console.error('[Vapi] Init error:', e);
        }
      };
      
      // Initialize Vapi immediately since it's imported
      initVapi();
    } catch (e) {
      console.error('[Vapi] Setup error:', e);
    }
  }, [VAPI_PUBLIC_KEY]);

  // Load team members when composer opens
  useEffect(() => {
    const loadTeam = async () => {
      if (!isComposerOpen) return;
      try {
        const res = await usersService.getTeamMembers();
        const members = Array.isArray(res?.data) ? res.data : (res?.data?.users || []);
        setTeamMembers(members);
      } catch (_) {}
    };
    loadTeam();
  }, [isComposerOpen]);

  const handleSendMessage = async (messageContent = inputMessage) => {
    const trimmedMessage = messageContent.trim();
    if (!trimmedMessage || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    };

    // Add user message and scroll to it
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await bubblesService.chat(trimmedMessage, currentProject?.id);

      // Check if Bubbles requires recipient selection
      if (response.data?.response?.requiresRecipientSelection) {
        const aiMessage = {
          id: response.data.sessionContext?.sessionId || Date.now() + 1,
          type: 'ai',
          content: response.data.response.content,
          timestamp: new Date(response.data.response.timestamp),
          requiresRecipientSelection: true,
          availableRecipients: response.data.response.availableRecipients || [],
          pendingAction: response.data.response.pendingAction
        };

        // Store pending action
        setPendingAction(response.data.response.pendingAction);
        setTeamMembers(response.data.response.availableRecipients || []);
        setPendingActionRecipients([]);

        setMessages(prev => [...prev, aiMessage]);
      } else {
        const aiMessage = {
          id: response.data.sessionContext?.sessionId || Date.now() + 1,
          type: 'ai',
          content: response.data.response.content,
          suggestedActions: response.data.response.suggestedActions || [],
          timestamp: new Date(response.data.response.timestamp),
        };

        // Add AI response and it will auto-scroll via useEffect
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      const errorMessage = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: 'I seem to be having connection issues. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };
  
  const handleClearChat = () => {
    startNewChat();
  };

  const handleResetConversation = () => {
    setMessages([]);
     const fetchInitialGreeting = async () => {
        setIsLoading(true);
        try {
          const response = await bubblesService.chat('initial_greeting', currentProject?.id);
          const aiMessage = {
            id: response.data.sessionContext?.sessionId || 'welcome',
            type: 'ai',
            content: response.data.response.content,
            suggestedActions: response.data.response.suggestedActions || [],
            timestamp: new Date(response.data.response.timestamp),
          };
          setMessages([aiMessage]);
        } catch (error) {
          setMessages([{
            id: 'error_welcome',
            type: 'error',
            content: 'Sorry, I had trouble starting up. Please try again in a moment.',
            timestamp: new Date(),
          }]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitialGreeting();
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Chat History Functions
  const getChatStorageKey = () => `bubbles_chat_history_${currentProject?.id || 'general'}`;

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
    if (messages.length === 0 || isSavingChat) return;
    
    setIsSavingChat(true);
    try {
      const userMessages = messages.filter(msg => msg.type === 'user');
      if (userMessages.length === 0) return;
      
      const firstUserMessage = userMessages[0];
      const title = firstUserMessage.content.slice(0, 60) + (firstUserMessage.content.length > 60 ? '...' : '');
      
      const chatToSave = {
        id: currentChatId || `chat_${Date.now()}`,
        title,
        messages: [...messages],
        timestamp: new Date().toISOString(),
        projectId: currentProject?.id || null,
        projectName: currentProject?.name || null
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
    } finally {
      setIsSavingChat(false);
    }
  };

  const loadChatFromHistory = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chat.id);
      setShowChatHistory(false);
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const deleteChatFromHistory = (chatId) => {
    try {
      const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
      setChatHistory(updatedHistory);
      localStorage.setItem(getChatStorageKey(), JSON.stringify(updatedHistory));
      
      // If we're currently viewing the deleted chat, start fresh
      if (currentChatId === chatId) {
        setMessages([]);
        setCurrentChatId(null);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setIsLoading(false);
    setIsTyping(false);
    setShowChatHistory(false);
    
    // Focus input for immediate typing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Load chat history when component mounts or project changes
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen, currentProject?.id]);

  // Save chat when messages change (debounced)
  useEffect(() => {
    if (messages.length > 0 && !isLoading && !isTyping) {
      const timeoutId = setTimeout(() => {
        saveChatToHistory();
      }, 1000); // Save 1 second after last message
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isLoading, isTyping]);

  const handleVoiceToggle = async () => {
    console.log('[Vapi] mic clicked');
    setVoiceError('');
    
    const vapi = vapiRef.current;
    if (!vapi) {
      setVoiceError('Voice not ready.');
      console.error('[Vapi] vapi instance not available');
      return;
    }
    
    try {
      if (isVoiceLive || isVoiceConnecting) {
        console.log('[Vapi] Stopping call...');
        vapi.stop();
        return;
      }
      
      setIsVoiceConnecting(true);
      setVoiceError('');
      
      // Start with assistant ID and optional overrides
      const overrides = {};
      if (currentProject?.id && currentProject.id !== 'proj_123') {
        overrides.variableValues = {
          projectId: currentProject.id,
          projectName: currentProject.name || currentProject.projectName || 'Current Project'
        };
      }
      
      console.log('[Vapi] Starting call with assistant:', VAPI_ASSISTANT_ID);
      vapi.start(VAPI_ASSISTANT_ID, overrides);
      
    } catch (e) {
      setIsVoiceConnecting(false);
      setIsVoiceLive(false);
      setVoiceError(String(e?.message || 'Voice start failed'));
      console.error('[Vapi] start error', e);
    }
  };

  // Message composer handlers
  const toggleRecipient = (userId) => {
    setComposerRecipients(prev => prev.includes(userId)
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

  const handleCompletePendingAction = async () => {
    if (!pendingAction || (pendingActionRecipients.length === 0 && customEmails.length === 0)) return;

    setIsLoading(true);
    try {
      const response = await bubblesService.completeAction(
        pendingAction,
        pendingActionRecipients,
        customEmails
      );

      const confirmationMessage = {
        id: Date.now(),
        type: 'ai',
        content: response.data?.response?.content || 'Action completed successfully.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmationMessage]);

      // Clear pending action state
      setPendingAction(null);
      setPendingActionRecipients([]);
      setCustomEmails([]);
      setCustomEmailInput('');
    } catch (error) {
      const errorMessage = {
        id: Date.now(),
        type: 'error',
        content: 'Failed to complete the action. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
      type: 'ai',
      content: 'Action cancelled. How else can I help you?',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  const submitProjectMessage = async () => {
    if (!currentProject?.id || !composerSubject || !composerBody.trim()) return;
    setIsSendingMessage(true);
    try {
      await projectMessagesService.create(currentProject.id, {
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
              actionData: { projectId: currentProject.id }
            }).catch(() => null))
          );
        }
      } catch (_) {}
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        type: 'assistant',
        content: `Message sent in project: ${composerSubject}\n\n${composerBody.trim()}`,
        timestamp: new Date()
      }]);
      setComposerBody('');
      setComposerRecipients([]);
      setComposerSubject(subjects?.[0] || 'Project Status Update');
      setIsComposerOpen(false);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `msg_err_${Date.now()}`,
        type: 'error',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Robust markdown → HTML renderer (aligned with AIAssistantPage)
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

      // Inline emphasis (bold/italic)
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

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`} style={{ paddingRight: 'env(safe-area-inset-right)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className={`rounded-2xl shadow-2xl border flex flex-col transition-all duration-300 backdrop-blur-xl ${
        colorMode
          ? 'bg-slate-900/90 border-blue-400/30 text-white shadow-blue-500/20'
          : 'bg-white/90 border-gray-200/80 text-gray-900 shadow-blue-200/40'
      }`} style={{ width: 'min(94vw, 420px)', height: 'min(86vh, 680px)' }}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b rounded-t-2xl sticky top-0 z-10 ${
          colorMode ? 'border-blue-400/20 bg-slate-900/70' : 'border-gray-200/80 bg-white/70'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-[#0089D1] to-[#0069B5]">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-md">Bubbles AI</h3>
              <p className={`text-xs ${colorMode ? 'text-blue-300' : 'text-slate-600'}`}>
                {isTyping ? 'Thinking...' : (currentProject?.name || 'Your Project Copilot')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Assistant Playbook Button - PROMINENT */}
            <button
              onClick={() => setIsQuickModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all shadow-sm bg-[#7ED242] hover:bg-[#6BC22E] text-white"
              title="Bubbles Assistant Playbook"
            >
              <SparklesIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Playbook</span>
            </button>
            
            {/* Quick help popover button */}
            <div className="relative">
              <button
                onClick={() => setShowCheatSheet(prev => !prev)}
                className={`p-2 rounded-full transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                title="Quick help"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9h.01M12 5a4 4 0 10-4 4m0 0v1a3 3 0 006 0V9a3 3 0 00-3-3"/></svg>
              </button>
              {showCheatSheet && (
                <div className="absolute right-0 mt-2">
                  <CheatSheetPopover onOpenQuickCard={() => { setIsQuickModalOpen(true); setShowCheatSheet(false); }} onClose={() => setShowCheatSheet(false)} />
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowChatHistory(!showChatHistory)} 
              className={`p-2 rounded-full transition-colors relative ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${
                showChatHistory ? (colorMode ? 'bg-white/20' : 'bg-blue-100') : ''
              }`} 
              title="Chat History"
            >
              <ArchiveBoxIcon className="w-5 h-5" />
              {chatHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#7ED242] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {chatHistory.length > 99 ? '99+' : chatHistory.length}
                </span>
              )}
            </button>
            <button onClick={handleClearChat} className={`p-2 rounded-full transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="Clear Chat"><TrashIcon className="w-5 h-5" /></button>
            <button onClick={handleResetConversation} className={`p-2 rounded-full transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="Reset Conversation"><ClockIcon className="w-5 h-5" /></button>
            {onMinimize && <button onClick={onMinimize} className={`p-2 rounded-full transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="Minimize"><ChevronDownIcon className="w-5 h-5" /></button>}
            <button onClick={onClose} className={`p-2 rounded-full transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="Close"><XCircleIcon className="w-5 h-5" /></button>
          </div>
        </div>

  {/* In-app Quick Card Modal */}
  <CheatSheetModal visible={isQuickModalOpen} onClose={() => setIsQuickModalOpen(false)} colorMode={colorMode} />

        {/* Chat History Panel */}
        {showChatHistory && (
          <div className={`absolute top-0 left-0 w-full h-full z-20 rounded-2xl overflow-hidden ${
            colorMode ? 'bg-slate-900/95' : 'bg-white/95'
          } backdrop-blur-xl flex flex-col`}>
            {/* History Header */}
            <div className={`flex items-center justify-between p-4 border-b sticky top-0 z-30 ${
              colorMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChatHistory(false)}
                  className={`p-2 rounded-full transition-colors ${
                    colorMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-md">Chat History</h3>
                  <p className={`text-xs ${
                    colorMode ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    {chatHistory.length} saved conversations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={startNewChat}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    colorMode 
                      ? 'bg-[#7ED242] hover:bg-[#6BC22E] text-white' 
                      : 'bg-[#7ED242] hover:bg-[#6BC22E] text-white'
                  }`}
                >
                  New Chat
                </button>
                <button
                  onClick={() => setShowChatHistory(false)}
                  className={`p-2 rounded-full transition-colors ${
                    colorMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                  }`}
                  title="Close"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ArchiveBoxIcon className={`w-12 h-12 mb-4 ${
                    colorMode ? 'text-slate-600' : 'text-gray-400'
                  }`} />
                  <h4 className={`font-medium mb-2 ${
                    colorMode ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    No saved chats yet
                  </h4>
                  <p className={`text-sm ${
                    colorMode ? 'text-slate-500' : 'text-gray-500'
                  }`}>
                    Your conversations will appear here automatically
                  </p>
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
                      className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                        isActive
                          ? (colorMode ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-blue-50 border border-blue-200')
                          : (colorMode ? 'hover:bg-slate-800/50 border border-transparent' : 'hover:bg-slate-50 border border-transparent')
                      }`}
                      onClick={() => loadChatFromHistory(chat.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm truncate mb-1 ${
                            isActive
                              ? (colorMode ? 'text-blue-300' : 'text-blue-700')
                              : (colorMode ? 'text-slate-200' : 'text-gray-900')
                          }`}>
                            {chat.title}
                          </h4>
                          <p className={`text-xs mb-1 ${
                            colorMode ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                            {timeLabel}
                          </p>
                          {chat.projectName && (
                            <p className={`text-xs truncate ${
                              colorMode ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              📁 {chat.projectName}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChatFromHistory(chat.id);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all ${
                            colorMode ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'
                          }`}
                          title="Delete chat"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {isActive && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${
                          colorMode ? 'bg-blue-400' : 'bg-blue-500'
                        }`} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Insight Chips */}
        <div className={`px-3 pt-3 pb-2 border-b ${colorMode ? 'border-neutral-700/60' : 'border-gray-200/80'}`}>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {insightChips.map((chip) => {
              const base = colorMode ? 'bg-neutral-800 border-neutral-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700';
              const warn = colorMode ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700';
              const ok = colorMode ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700';
              const toneClass = chip.tone === 'warn' ? warn : chip.tone === 'ok' ? ok : base;
              const onClick = chip.key === 'complete_current'
                ? async () => {
                    // Attempt completion via chat tool call; if that fails, heuristic will complete
                    await handleSendMessage(chip.action);
                  }
                : chip.key === 'send_message'
                  ? () => setIsComposerOpen(true)
                  : () => handleSendMessage(chip.action);
              return (
                <button key={chip.key} onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border shadow-sm hover:opacity-90 transition whitespace-nowrap ${toneClass}`}>
                  <chip.icon className="w-3.5 h-3.5" />
                  <span className="font-semibold">{chip.label}{chip.value ? ':' : ''}</span>
                  {chip.value ? <span>{chip.value}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse" style={{ scrollBehavior: 'smooth' }}>
          {isLoading && messages.length === 0 && (
             <div className="flex justify-center items-center h-full">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <SparklesIcon className="w-5 h-5 animate-pulse text-blue-500" />
                    <span>Bubbles is preparing your daily brief...</span>
                </div>
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <div className="flex flex-col justify-center items-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 mb-4">
                <SparklesIcon className="w-8 h-8 text-[#0089D1]" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Chat Cleared
              </h3>
              <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Start a new conversation with Bubbles AI
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl p-3 shadow-md transition-all duration-200 text-sm leading-relaxed ${
                msg.type === 'user' ? (colorMode ? 'bg-[#0089D1] text-white' : 'bg-blue-500 text-white') :
                msg.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                (colorMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900')
              }`}>
                <div className="space-y-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMessageContent(msg.content) }} />
                {msg.requiresRecipientSelection && msg.availableRecipients && (
                  <div className="mt-4 p-3 bg-white border border-blue-300 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Select Recipients:</h4>

                    {/* Team Members */}
                    <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                      {msg.availableRecipients.map(user => (
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
                            onChange={(e) => setCustomEmailInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomEmail()}
                            placeholder="email@example.com"
                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={addCustomEmail}
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
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.suggestedActions.map((action, i) => (
                      <button key={i} onClick={() => handleSendMessage(action.label)} className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        colorMode ? 'bg-blue-500/20 border-blue-500/50 text-blue-200 hover:bg-blue-500/40' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      }`}>
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className={`rounded-xl p-3 shadow-md ${colorMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-[#0089D1] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#0089D1] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#0089D1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Modal */}
        {isComposerOpen && (
          <div className={`px-4 pb-3 border-t ${colorMode ? 'border-blue-400/20 bg-slate-900/40' : 'border-gray-200/80 bg-white/70'}`}>
            <div className="mb-2 text-sm font-semibold flex items-center gap-2"><ChatBubbleLeftRightIcon className="w-4 h-4" /> Send Project Message</div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-xs block mb-1">Subject</label>
                <select value={composerSubject} onChange={e => setComposerSubject(e.target.value)} className={`w-full text-sm rounded-md border px-2 py-1 ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'}`}>
                  {(subjects || []).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1">Recipients</label>
                <div className={`max-h-24 overflow-auto rounded-md border p-2 ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'}`}>
                  {(teamMembers || []).map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-sm py-0.5">
                      <input type="checkbox" checked={composerRecipients.includes(u.id)} onChange={() => toggleRecipient(u.id)} />
                      <span>{u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : (u.name || u.email || u.id)}</span>
                    </label>
                  ))}
                  {(!teamMembers || teamMembers.length === 0) && (
                    <div className="text-xs opacity-70">No team members listed.</div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1">Message</label>
                <textarea value={composerBody} onChange={e => setComposerBody(e.target.value)} rows={3} className={`w-full text-sm rounded-md border px-2 py-1 resize-none ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'}`} placeholder="Type your message..." />
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <button onClick={() => setIsComposerOpen(false)} className={`text-xs px-3 py-1 rounded-md border ${colorMode ? 'border-slate-600 hover:bg-white/10' : 'border-gray-300 hover:bg-gray-50'}`}>Cancel</button>
                <button onClick={submitProjectMessage} disabled={isSendingMessage || !composerBody.trim()} className={`text-xs px-3 py-1 rounded-md text-white flex items-center gap-1 ${isSendingMessage || !composerBody.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#7ED242] hover:bg-[#6BC22E]'}`}>
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  {isSendingMessage ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className={`p-3 border-t ${colorMode ? 'border-blue-400/20 bg-slate-900/50' : 'border-gray-200/80 bg-white/50'}`}>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about status, risks, or tasks..."
              className={`flex-1 w-full rounded-lg px-4 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner ${
                colorMode ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              disabled={isLoading}
            />
            <button onClick={() => handleSendMessage()} disabled={!inputMessage.trim() || isLoading} className={`p-2.5 rounded-lg transition-all text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                colorMode ? 'bg-[#0089D1] hover:bg-[#0069B5]' : 'bg-blue-500 hover:bg-blue-600'
            }`}>
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </button>
            {/* Vapi Voice mic button */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`p-2.5 rounded-lg border flex items-center justify-center transition ${
                isVoiceLive ? 'border-blue-600 bg-blue-50 shadow-lg' : 
                colorMode ? 'border-slate-600 bg-slate-700 hover:bg-slate-600' : 'border-gray-300 bg-white hover:bg-gray-100'
              }`}
              aria-label={isVoiceLive ? 'End voice with Bubbles' : (isVoiceConnecting ? 'Connecting to Bubbles' : 'Speak to Bubbles')}
              title={isVoiceLive ? 'End voice' : (isVoiceConnecting ? 'Connecting…' : 'Speak to Bubbles')}
            >
              {isVoiceConnecting ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="#93c5fd" strokeWidth="3" opacity="0.35" />
                  <path d="M21 12a9 9 0 00-9-9" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={isVoiceLive ? 'animate-pulse' : ''}>
                  <path d="M9 5a3 3 0 016 0v6a3 3 0 11-6 0V5z" fill={isVoiceLive ? '#2563eb' : (colorMode ? '#e2e8f0' : '#111827')} />
                  <path d="M5 12a7 7 0 0014 0M12 19v-3" stroke={isVoiceLive ? '#2563eb' : (colorMode ? '#e2e8f0' : '#111827')} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
          {(voiceError && voiceError !== 'Voice SDK failed to load. Add /public/vapi-web.js or allow CDN.') && (
            <div className="mt-1 text-xs text-red-600">{voiceError}</div>
          )}
          {(isVoiceLive || isVoiceConnecting) && (
            <div className="flex items-center gap-2 text-xs mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                colorMode ? 'bg-blue-900/50 border border-blue-500 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-blueprint-blue)] animate-pulse"></span>
                {isVoiceConnecting ? 'Connecting…' : 'Listening…'}
              </span>
            </div>
          )}
          {showTranscript && voiceTranscript.length > 0 && (
            <div className={`text-xs mt-2 border rounded p-2 ${
              colorMode ? 'border-slate-600 bg-slate-800 text-gray-300' : 'border-gray-200 bg-white text-gray-600'
            }`}>
              {voiceTranscript.slice(-3).map((t, i) => (
                <div key={i} className="truncate">{t}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BubblesChat;
