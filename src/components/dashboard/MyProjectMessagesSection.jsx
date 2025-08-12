import React, { useState, useEffect, useRef } from 'react';
import { useSectionNavigation } from '../../contexts/NavigationContext';
import BackButton from '../common/BackButton';
import ProjectMessagesCard from '../ui/ProjectMessagesCard';

const MyProjectMessagesSection = ({ 
  activity, 
  projects, 
  onProjectSelect, 
  colorMode,
  useRealData = false 
}) => {
  const { 
    saveFilters, 
    getSavedFilters, 
    saveExpandedState, 
    getSavedExpandedState,
    updateScrollPosition,
    navigateToMessage 
  } = useSectionNavigation('My Project Messages');

  // State for expanded messages with context restoration
  const [expandedMessages, setExpandedMessages] = useState(() => {
    return getSavedExpandedState() || {};
  });

  // State for selected message filter
  const [selectedMessageFilter, setSelectedMessageFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedMessage || null;
  });

  // State for project filter
  const [selectedProjectFilter, setSelectedProjectFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedProject || null;
  });

  // State for priority filter
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.selectedPriority || null;
  });

  // State for search filter
  const [searchFilter, setSearchFilter] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.searchTerm || '';
  });

  // State for sort configuration
  const [sortBy, setSortBy] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.sortBy || 'timestamp';
  });

  const [sortOrder, setSortOrder] = useState(() => {
    const savedFilters = getSavedFilters();
    return savedFilters.sortOrder || 'desc';
  });

  // Scroll container ref for restoring position
  const scrollContainerRef = useRef(null);

  // Save expanded state whenever it changes
  useEffect(() => {
    saveExpandedState(expandedMessages);
  }, [expandedMessages, saveExpandedState]);

  // Save filters whenever they change
  useEffect(() => {
    saveFilters({
      selectedMessage: selectedMessageFilter,
      selectedProject: selectedProjectFilter,
      selectedPriority: selectedPriorityFilter,
      searchTerm: searchFilter,
      sortBy,
      sortOrder
    });
  }, [selectedMessageFilter, selectedProjectFilter, selectedPriorityFilter, searchFilter, sortBy, sortOrder, saveFilters]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      updateScrollPosition();
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [updateScrollPosition]);

  // Toggle message expansion
  const toggleMessageExpansion = (messageId) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Handle message navigation with context
  const handleMessageNavigation = (message, targetPage = 'Messages') => {
    const contextData = {
      section: 'My Project Messages',
      type: 'message',
      returnPath: '/dashboard',
      messageId: message.id,
      projectId: message.projectId,
      projectName: message.projectName,
      selectedData: message,
      filters: {
        selectedMessage: selectedMessageFilter,
        selectedProject: selectedProjectFilter,
        selectedPriority: selectedPriorityFilter,
        searchTerm: searchFilter,
        sortBy,
        sortOrder
      },
      expandedState: expandedMessages,
      scrollPosition: window.scrollY
    };

    // Use the navigation system to track context
    navigateToMessage(message, `/project/${message.projectId}/messages`);
  };

  // Handle project selection through message
  const handleProjectSelectFromMessage = (project, targetPage, additionalContext) => {
    const contextData = {
      section: 'My Project Messages',
      type: 'project',
      returnPath: '/dashboard',
      projectId: project.id,
      projectName: project.projectName || project.name,
      selectedData: project,
      sourceContext: 'message',
      filters: {
        selectedMessage: selectedMessageFilter,
        selectedProject: selectedProjectFilter,
        selectedPriority: selectedPriorityFilter,
        searchTerm: searchFilter,
        sortBy,
        sortOrder
      },
      expandedState: expandedMessages,
      scrollPosition: window.scrollY,
      ...additionalContext
    };

    if (onProjectSelect) {
      onProjectSelect(project, targetPage, contextData, 'My Project Messages');
    }
  };

  // Filter and sort messages
  const getFilteredAndSortedMessages = () => {
    let filteredMessages = [...(activity || [])];

    // Apply project filter
    if (selectedProjectFilter) {
      filteredMessages = filteredMessages.filter(msg => msg.projectId === selectedProjectFilter);
    }

    // Apply priority filter
    if (selectedPriorityFilter) {
      filteredMessages = filteredMessages.filter(msg => msg.priority === selectedPriorityFilter);
    }

    // Apply search filter
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      filteredMessages = filteredMessages.filter(msg => 
        (msg.subject || '').toLowerCase().includes(searchTerm) ||
        (msg.description || '').toLowerCase().includes(searchTerm) ||
        (msg.projectName || '').toLowerCase().includes(searchTerm) ||
        (msg.user || '').toLowerCase().includes(searchTerm)
      );
    }

    // Apply single message filter
    if (selectedMessageFilter) {
      filteredMessages = filteredMessages.filter(msg => msg.id === selectedMessageFilter);
    }

    // Sort messages
    filteredMessages.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'project':
          aValue = a.projectName || '';
          bValue = b.projectName || '';
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'user':
          aValue = a.user || '';
          bValue = b.user || '';
          break;
        case 'timestamp':
        default:
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
      }

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return filteredMessages;
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedMessageFilter(null);
    setSelectedProjectFilter(null);
    setSelectedPriorityFilter(null);
    setSearchFilter('');
    setSortBy('timestamp');
    setSortOrder('desc');
  };

  // Get unique projects for filter dropdown
  const getUniqueProjects = () => {
    const projectsMap = new Map();
    activity?.forEach(msg => {
      if (msg.projectId && !projectsMap.has(msg.projectId)) {
        projectsMap.set(msg.projectId, {
          id: msg.projectId,
          name: msg.projectName
        });
      }
    });
    return Array.from(projectsMap.values());
  };

  const filteredMessages = getFilteredAndSortedMessages();
  const uniqueProjects = getUniqueProjects();

  return (
    <div className="mb-6 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6" data-section="project-messages">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
            My Project Messages
          </h2>
          <p className="text-sm text-gray-600 font-medium">
            Recent project communications and updates
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-4">
          {/* Search Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectFilter || ''}
            onChange={(e) => setSelectedProjectFilter(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm max-w-[200px]"
          >
            <option value="">All Projects</option>
            {uniqueProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriorityFilter || ''}
            onChange={(e) => setSelectedPriorityFilter(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm max-w-[150px]"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm max-w-[120px]"
            >
              <option value="timestamp">Date</option>
              <option value="project">Project</option>
              <option value="priority">Priority</option>
              <option value="user">User</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <svg className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Clear Filters */}
          {(selectedProjectFilter || selectedPriorityFilter || searchFilter || selectedMessageFilter) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div 
        ref={scrollContainerRef}
        className="space-y-4 max-h-96 overflow-y-auto"
      >
        {filteredMessages.length > 0 ? (
          filteredMessages.map(message => (
            <div
              key={message.id}
              className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 ${
                selectedMessageFilter === message.id ? 'ring-2 ring-blue-500 border-blue-300' : 'hover:border-gray-300'
              }`}
            >
              {/* Message Header - Clickable */}
              <button
                onClick={() => {
                  if (selectedMessageFilter === message.id) {
                    setSelectedMessageFilter(null); // Collapse if already selected
                  } else {
                    setSelectedMessageFilter(message.id); // Select this message
                    handleMessageNavigation(message);
                  }
                }}
                className="w-full px-6 py-4 bg-white hover:bg-gray-50 transition-colors duration-200 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Priority Indicator */}
                      <div className={`w-2 h-2 rounded-full ${
                        message.priority === 'high' ? 'bg-red-500' : 
                        message.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      
                      {/* Subject */}
                      <h3 className="font-semibold text-gray-900 truncate">
                        {message.subject}
                      </h3>
                      
                      {/* Project Name */}
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {message.projectName}
                      </span>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {message.description}
                    </p>
                    
                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>From: {message.user}</span>
                      <span>{new Date(message.timestamp).toLocaleString()}</span>
                      {message.metadata?.projectPhase && (
                        <span>Phase: {message.metadata.projectPhase}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand/Collapse Icon */}
                  <div className="ml-4">
                    <svg
                      className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${
                        selectedMessageFilter === message.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Message Content */}
              {selectedMessageFilter === message.id && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {/* Message Actions */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Message Actions</h4>
                      <button
                        onClick={() => setSelectedMessageFilter(null)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button
                        onClick={() => handleMessageNavigation(message, 'Messages')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Full Thread
                      </button>
                      
                      <button
                        onClick={() => {
                          const project = projects?.find(p => p.id === message.projectId);
                          if (project) {
                            handleProjectSelectFromMessage(project, 'Project Workflow');
                          }
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        Project Workflow
                      </button>
                      
                      <button
                        onClick={() => {
                          const project = projects?.find(p => p.id === message.projectId);
                          if (project) {
                            handleProjectSelectFromMessage(project, 'Alerts');
                          }
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        Project Alerts
                      </button>
                      
                      <button
                        onClick={() => {
                          const project = projects?.find(p => p.id === message.projectId);
                          if (project) {
                            handleProjectSelectFromMessage(project, 'Projects');
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Project Details
                      </button>
                    </div>
                  </div>

                  {/* Enhanced Message Card */}
                  <div className="px-6 pb-4">
                    <ProjectMessagesCard
                      activity={message}
                      onProjectSelect={handleProjectSelectFromMessage}
                      projects={projects}
                      colorMode={colorMode}
                      isExpanded={expandedMessages[message.id]}
                      onToggleExpansion={() => toggleMessageExpansion(message.id)}
                      useRealData={useRealData}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">📬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchFilter || selectedProjectFilter || selectedPriorityFilter 
                ? 'No messages match your filters'
                : 'No messages found'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchFilter || selectedProjectFilter || selectedPriorityFilter 
                ? 'Try adjusting your filter settings.'
                : 'Project messages will appear here when available.'
              }
            </p>
            {(searchFilter || selectedProjectFilter || selectedPriorityFilter) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages Summary */}
      {filteredMessages.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredMessages.length} of {activity?.length || 0} messages
            </span>
            <div className="flex items-center gap-4">
              <span>
                {filteredMessages.filter(m => m.priority === 'high').length} High Priority
              </span>
              <span>
                {filteredMessages.filter(m => m.priority === 'medium').length} Medium Priority
              </span>
              <span>
                {filteredMessages.filter(m => m.priority === 'low').length} Low Priority
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProjectMessagesSection;