// --- BubblesChat Component ---
import React, { useState, useEffect, useRef } from 'react';
import { bubblesService, workflowAlertsService, usersService, projectMessagesService } from '../../services/api';
import socketService from '../../services/socket';
import { CalendarIcon, ExclamationTriangleIcon, BellIcon, SparklesIcon, ClockIcon, ChevronDownIcon, XCircleIcon, ChatBubbleLeftRightIcon } from '../common/Icons';
import { useSubjects } from '../../contexts/SubjectsContext';

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

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await bubblesService.chat(trimmedMessage, currentProject?.id);
      const aiMessage = {
        id: response.data.sessionContext?.sessionId || Date.now() + 1,
        type: 'ai',
        content: response.data.response.content,
        suggestedActions: response.data.response.suggestedActions || [],
        timestamp: new Date(response.data.response.timestamp),
      };
      setMessages(prev => [...prev, aiMessage]);
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

  // Message composer handlers
  const toggleRecipient = (userId) => {
    setComposerRecipients(prev => prev.includes(userId)
      ? prev.filter(id => id !== userId)
      : [...prev, userId]
    );
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

  // Enhanced markdown renderer
  const renderMessageContent = (content) => {
    if (typeof content !== 'string') return content;
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-md font-bold mt-2 mb-1">{line.substring(4)}</h3>;
      }
      if (line.startsWith('* ')) {
        // **FIXED**: Use dangerouslySetInnerHTML for list items to render HTML correctly
        const styledLine = line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <li key={i} className="list-disc list-inside ml-2" dangerouslySetInnerHTML={{ __html: styledLine }} />;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={i} className={`border-l-4 ${colorMode ? 'border-blue-400' : 'border-blue-500'} pl-3 my-2 italic`}>{line.substring(2)}</blockquote>
      }
      // Basic bold support for paragraphs
      const styledLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} dangerouslySetInnerHTML={{ __html: styledLine }} />;
    });
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
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-md">Bubbles AI</h3>
              <p className={`text-xs ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}>
                {isTyping ? 'Thinking...' : (currentProject?.name || 'Your Project Copilot')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleResetConversation} className={`p-2 rounded-full transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="Reset Conversation"><ClockIcon className="w-5 h-5" /></button>
            {onMinimize && <button onClick={onMinimize} className={`p-2 rounded-full transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="Minimize"><ChevronDownIcon className="w-5 h-5" /></button>}
            <button onClick={onClose} className={`p-2 rounded-full transition-colors ${colorMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} title="Close"><XCircleIcon className="w-5 h-5" /></button>
          </div>
        </div>

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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && messages.length === 0 && (
             <div className="flex justify-center items-center h-full">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <SparklesIcon className="w-5 h-5 animate-pulse text-blue-500" />
                    <span>Bubbles is preparing your daily brief...</span>
                </div>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl p-3 shadow-md transition-all duration-200 text-sm leading-relaxed ${
                msg.type === 'user' ? (colorMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') :
                msg.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                (colorMode ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-900')
              }`}>
                <div className="space-y-2">{renderMessageContent(msg.content)}</div>
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.suggestedActions.map((action, i) => (
                      <button key={i} onClick={() => handleSendMessage(action.label)} className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        colorMode ? 'bg-blue-600/20 border-blue-500/50 text-blue-200 hover:bg-blue-600/40' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
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
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                <button onClick={submitProjectMessage} disabled={isSendingMessage || !composerBody.trim()} className={`text-xs px-3 py-1 rounded-md text-white flex items-center gap-1 ${isSendingMessage || !composerBody.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
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
                colorMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
            }`}>
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubblesChat;
