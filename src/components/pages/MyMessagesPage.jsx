import React, { useState, useEffect, useRef } from 'react';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';
import { useSubjects } from '../../contexts/SubjectsContext';
import { messagesService, authService } from '../../services/api';
import { ResponsiveBackButton } from '../common/BackButton';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';

const MyMessagesPage = ({ colorMode, projects, onProjectSelect }) => {
  const { pushNavigation } = useNavigationHistory();
  
  // Track page navigation
  useEffect(() => {
    pushNavigation('My Messages', {
      projects
    });
  }, [pushNavigation]);

  // State management - matching dashboard implementation exactly
  const [messagesData, setMessagesData] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Filter and display states - exact copy from dashboard
  const [activityProjectFilter, setActivityProjectFilter] = useState('');
  const [activitySubjectFilter, setActivitySubjectFilter] = useState('');
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [allMessagesExpanded, setAllMessagesExpanded] = useState(false);
  
  // Message form states - exact copy from dashboard
  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const [newMessageProject, setNewMessageProject] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageRecipients, setNewMessageRecipients] = useState([]);
  const [attachTask, setAttachTask] = useState(false);
  const [taskAssignee, setTaskAssignee] = useState('');
  
  // Get subjects from context
  const { subjects } = useSubjects();
  
  // Track if messages have been fetched to prevent re-fetching
  const messagesFetchedRef = useRef(false);

  // Get current user on component mount
  useEffect(() => {
    const user = authService.getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Fetch messages and convert to activity format - FILTERED TO CURRENT USER ONLY
  useEffect(() => {
    const fetchMessages = async () => {
      if (messagesFetchedRef.current || !currentUser) return;
      
      try {
        setMessagesLoading(true);
        // Fetch all conversations using authenticated service
        const response = await messagesService.getConversations();
        
        if (response.success && response.data && response.data.length > 0) {
          const allMessages = [];
          
          // Convert messages to activity format - FILTER TO CURRENT USER ONLY
          for (const conversation of response.data) {
            // Extract project info from conversation title
            const projectNumberMatch = conversation.title.match(/#(\d+)/);
            if (!projectNumberMatch) continue;
            
            const projectNumber = parseInt(projectNumberMatch[1]);
            const project = projects.find(p => p.projectNumber === projectNumber);
            
            if (!project) continue;

            // Process messages in the conversation - FILTER TO CURRENT USER ONLY
            for (const msg of conversation.messages) {
              // Only include messages FROM the current user
              if (msg.senderId === currentUser.id || msg.sender === currentUser.username || msg.sender === currentUser.name) {
                allMessages.push({
                  id: `msg_${msg.id || Date.now()}_${Math.random()}`,
                  projectId: project.id,
                  projectName: project.projectName || project.name || project.address,
                  projectNumber: project.projectNumber,
                  subject: conversation.subject || 'General Discussion',
                  description: msg.content || msg.message,
                  user: currentUser.name || currentUser.username || 'You',
                  timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
                  type: 'message',
                  priority: msg.priority || 'medium',
                  recipients: msg.recipients || [],
                  hasTask: false
                });
              }
            }
          }

          // Sort by timestamp (most recent first)
          allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          setMessagesData(allMessages);
          messagesFetchedRef.current = true;
          
        } else {
          console.log('No messages data received');
          setMessagesData([]);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        setMessagesData([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    if (currentUser && projects && projects.length > 0) {
      fetchMessages();
    }
  }, [currentUser, projects]);

  // Filter messages based on project and subject filters
  const currentActivities = messagesData.filter(activity => {
    const projectMatch = !activityProjectFilter || String(activity.projectId) === String(activityProjectFilter);
    const subjectMatch = !activitySubjectFilter || activity.subject === activitySubjectFilter;
    return projectMatch && subjectMatch;
  });

  // Expansion control handlers - exact copy from dashboard
  const handleExpandAllMessages = () => {
    const allMessageIds = new Set(currentActivities.map(activity => activity.id));
    setExpandedMessages(allMessageIds);
    setAllMessagesExpanded(true);
  };

  const handleCollapseAllMessages = () => {
    setExpandedMessages(new Set());
    setAllMessagesExpanded(false);
  };

  const handleToggleMessage = (messageId) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };

  // Project selection handler
  const handleProjectSelectWithScroll = (project, view = 'Project Profile', phase = null, sourceSection = 'My Messages') => {
    window.scrollTo(0, 0);
    if (onProjectSelect) {
      onProjectSelect(project, view, phase, sourceSection);
    }
  };

  // Quick reply handler
  const handleQuickReply = (replyData) => {
    console.log('My Messages quick reply data:', replyData);
    
    // Find the project for the reply
    const project = projects.find(p => p.id === replyData.projectId);
    
    if (project) {
      // Add the quick reply as a new message from current user
      const newActivity = {
        id: `msg_${Date.now()}`,
        projectId: replyData.projectId,
        projectName: project.projectName || project.name,
        projectNumber: project.projectNumber,
        subject: replyData.subject || 'Reply',
        description: replyData.message,
        user: currentUser?.name || 'You',
        timestamp: new Date().toISOString(),
        type: 'message',
        priority: 'medium',
        recipients: [],
        hasTask: false
      };
      
      setMessagesData(prev => [newActivity, ...prev]);
    }
  };

  return (
    <div className={`min-h-screen ${colorMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-4xl mx-auto py-6 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <ResponsiveBackButton
            colorMode={colorMode}
            variant="secondary"
            preservePosition={true}
          />
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            My Messages
          </h1>
          <p className={`text-lg ${colorMode ? 'text-slate-400' : 'text-gray-600'}`}>
            All messages you've sent across projects
          </p>
        </div>

        {/* Messages Section - Exact copy from dashboard */}
        <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Your Project Messages</h2>
                {expandedMessages.size > 0 && (
                  <p className={`text-[9px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {expandedMessages.size} of {currentActivities.length} conversation{currentActivities.length !== 1 ? 's' : ''} expanded
                  </p>
                )}
              </div>
            </div>
            
            {/* Filter Controls - Exact copy from dashboard */}
            <div className="flex items-center gap-2 mb-2 mt-3">
              <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
              <select 
                value={activityProjectFilter} 
                onChange={(e) => setActivityProjectFilter(e.target.value)} 
                className={`text-[9px] font-medium px-1 py-0.5 rounded border transition-colors max-w-[180px] ${
                  colorMode 
                    ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <option value="">All Projects</option>
                {(projects || []).map(p => (
                  <option key={p.id} value={p.id}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
                ))}
              </select>
              
              <select 
                value={activitySubjectFilter} 
                onChange={(e) => setActivitySubjectFilter(e.target.value)} 
                className={`text-[9px] font-medium px-1 py-0.5 rounded border transition-colors max-w-[140px] ${
                  colorMode 
                    ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              
              {/* Expand/Collapse Controls - Exact copy from dashboard */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleExpandAllMessages}
                  className={`px-1.5 py-0.5 text-[7px] font-medium rounded border transition-colors ${
                    expandedMessages.size === currentActivities.length && currentActivities.length > 0
                      ? colorMode 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-blue-500 text-white border-blue-500'
                      : colorMode 
                        ? 'bg-[#1e293b] text-blue-300 border-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600' 
                        : 'bg-white text-blue-600 border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                  }`}
                  title="Expand all message conversations"
                  disabled={currentActivities.length === 0 || expandedMessages.size === currentActivities.length}
                >
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
                <button
                  onClick={handleCollapseAllMessages}
                  className={`px-1.5 py-0.5 text-[7px] font-medium rounded border transition-colors ${
                    expandedMessages.size === 0
                      ? colorMode 
                        ? 'bg-orange-600 text-white border-orange-600' 
                        : 'bg-orange-500 text-white border-orange-500'
                      : colorMode 
                        ? 'bg-[#1e293b] text-orange-300 border-gray-600 hover:bg-orange-600 hover:text-white hover:border-orange-600' 
                        : 'bg-white text-orange-600 border-gray-300 hover:bg-orange-50 hover:border-orange-400'
                  }`}
                  title="Collapse all message conversations"
                  disabled={expandedMessages.size === 0}
                >
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Add Message Dropdown Trigger - Exact copy from dashboard */}
            <div className="mb-3">
              <button
                onClick={() => setShowMessageDropdown(!showMessageDropdown)}
                className={`w-full px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-between ${
                  showMessageDropdown
                    ? colorMode 
                      ? 'border-blue-400 bg-blue-900/20 text-blue-300' 
                      : 'border-blue-400 bg-blue-50 text-blue-700'
                    : colorMode 
                      ? 'border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-300' 
                      : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-700'
                }`}
              >
                <span>+ Add Message</span>
                <svg className={`w-4 h-4 transition-transform ${showMessageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {/* Add Message Dropdown Form - Exact copy from dashboard */}
            {showMessageDropdown && (
              <div className={`p-4 border-t ${colorMode ? 'bg-[#1e293b] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (newMessageProject && newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0) {
                    const selectedProject = projects.find(p => p.id === parseInt(newMessageProject));
                    const newActivity = {
                      id: `msg_${Date.now()}`,
                      projectId: parseInt(newMessageProject),
                      projectName: selectedProject?.projectName || selectedProject?.name || selectedProject?.address || 'Unknown Project',
                      projectNumber: selectedProject?.projectNumber || Math.floor(Math.random() * 90000) + 10000,
                      subject: newMessageSubject,
                      description: newMessageText,
                      user: currentUser?.name || 'You',
                      timestamp: new Date().toISOString(),
                      type: 'message',
                      priority: 'medium',
                      recipients: newMessageRecipients,
                      hasTask: attachTask,
                      taskAssignedTo: attachTask ? taskAssignee : null
                    };
                    
                    setMessagesData(prev => [newActivity, ...prev]);
                    
                    // Close dropdown and reset form
                    setShowMessageDropdown(false);
                    setNewMessageProject('');
                    setNewMessageSubject('');
                    setNewMessageText('');
                    setNewMessageRecipients([]);
                    setAttachTask(false);
                    setTaskAssignee('');
                  }
                }} className="space-y-3">
                  {/* Form fields - Exact copy from dashboard */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Project <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newMessageProject}
                        onChange={(e) => setNewMessageProject(e.target.value)}
                        required
                        className={`w-full p-2 border rounded text-xs ${
                          colorMode 
                            ? 'bg-[#232b4d] border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        <option value="">Select Project</option>
                        {(projects || []).map(project => (
                          <option key={project.id} value={project.id}>
                            #{String(project.projectNumber || project.id).padStart(5, '0')} - {project.projectName || project.name || project.address}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        To <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newMessageRecipients || ''}
                        onChange={(e) => {
                          const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                          setNewMessageRecipients(selectedOptions);
                        }}
                        multiple
                        required
                        className={`w-full p-2 border rounded text-xs ${
                          colorMode 
                            ? 'bg-[#232b4d] border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        style={{ minHeight: '60px' }}
                      >
                        <option value="all" style={{ fontWeight: 'bold' }}>All Users</option>
                        <option value="sarah-owner">Sarah Owner</option>
                        <option value="mike-rodriguez">Mike Rodriguez (PM)</option>
                        <option value="john-smith">John Smith</option>
                        <option value="jane-doe">Jane Doe</option>
                        <option value="bob-wilson">Bob Wilson</option>
                        <option value="alice-johnson">Alice Johnson</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newMessageSubject}
                        onChange={(e) => setNewMessageSubject(e.target.value)}
                        required
                        className={`w-full p-2 border rounded text-xs ${
                          colorMode 
                            ? 'bg-[#232b4d] border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <input
                          type="checkbox"
                          checked={attachTask || false}
                          onChange={(e) => setAttachTask(e.target.checked)}
                          className="mr-1"
                        />
                        Send as a Task
                      </label>
                      {attachTask && (
                        <select
                          value={taskAssignee || ''}
                          onChange={(e) => setTaskAssignee(e.target.value)}
                          className={`w-full p-2 border rounded text-xs ${
                            colorMode 
                              ? 'bg-[#232b4d] border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        >
                          <option value="">Assign Task To...</option>
                          <option value="sarah-owner">Sarah Owner</option>
                          <option value="mike-rodriguez">Mike Rodriguez (PM)</option>
                          <option value="john-smith">John Smith</option>
                          <option value="jane-doe">Jane Doe</option>
                          <option value="bob-wilson">Bob Wilson</option>
                          <option value="alice-johnson">Alice Johnson</option>
                        </select>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Enter your message here..."
                      required
                      rows={3}
                      className={`w-full p-2 border rounded text-xs resize-none ${
                        colorMode 
                          ? 'bg-[#232b4d] border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMessageDropdown(false);
                        setNewMessageProject('');
                        setNewMessageSubject('');
                        setNewMessageText('');
                        setNewMessageRecipients([]);
                        setAttachTask(false);
                        setTaskAssignee('');
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                        colorMode 
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newMessageProject || !newMessageSubject || !newMessageText.trim() || newMessageRecipients.length === 0}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        newMessageProject && newMessageSubject && newMessageText.trim() && newMessageRecipients.length > 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          
          {/* Messages List - Exact copy from dashboard */}
          <div className="space-y-2 mt-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
            {messagesLoading ? (
              <div className="text-gray-400 text-center py-3 text-[9px]">
                Loading your messages...
              </div>
            ) : currentActivities.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">💬</div>
                <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                  No messages found
                </div>
                <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {activityProjectFilter || activitySubjectFilter 
                    ? 'Try adjusting your filters to see more messages.'
                    : 'Start a conversation by sending your first message.'}
                </div>
              </div>
            ) : (
              currentActivities.map(activity => (
                <ProjectMessagesCard 
                  key={activity.id} 
                  activity={activity} 
                  onProjectSelect={handleProjectSelectWithScroll}
                  projects={projects}
                  colorMode={colorMode}
                  useRealData={true}
                  onQuickReply={handleQuickReply}
                  isExpanded={expandedMessages.has(activity.id)}
                  onToggleExpansion={handleToggleMessage}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyMessagesPage;