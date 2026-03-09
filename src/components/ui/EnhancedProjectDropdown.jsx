import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const EnhancedProjectDropdown = ({ 
  projects = [], 
  selectedProject, 
  onProjectSelect,
  onProjectNavigate,
  colorMode = false,
  placeholder = "Select Project"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [projectSearch, setProjectSearch] = useState('');
  const triggerRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const [detailsStyle, setDetailsStyle] = useState(null);

  const handleProjectSelect = (project) => {
    console.log('🔍 EnhancedProjectDropdown: handleProjectSelect called with:', project);
    console.log('🔍 EnhancedProjectDropdown: Current selectedProject:', selectedProject);
    console.log('🔍 EnhancedProjectDropdown: About to call onProjectSelect');
    onProjectSelect(project);
    console.log('🔍 EnhancedProjectDropdown: onProjectSelect called, closing dropdown');
    setIsOpen(false);
    setProjectSearch('');
  };

  const handleProjectNavigate = (project, targetTab) => {
    if (onProjectNavigate) {
      onProjectNavigate(project, targetTab);
    }
  };

  const toggleProjectExpansion = (projectId) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  // Compute positions for portal menus relative to trigger
  useEffect(() => {
    const computePositions = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const base = {
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 30000
      };
      setMenuStyle(base);
      setDetailsStyle({ ...base });
    };

    if (isOpen || (selectedProject && expandedProject === selectedProject.id)) {
      computePositions();
      window.addEventListener('resize', computePositions);
      window.addEventListener('scroll', computePositions, true);
      return () => {
        window.removeEventListener('resize', computePositions);
        window.removeEventListener('scroll', computePositions, true);
      };
    }
  }, [isOpen, expandedProject, selectedProject]);

  // Get project phase and phase configuration
  const getProjectPhase = (project) => {
    if (!project) return 'LEAD';
    
    // Use currentWorkflowItem if available (new system)
    if (project.currentWorkflowItem && project.currentWorkflowItem.phase) {
      return project.currentWorkflowItem.phase;
    }
    
    // Fallback to project.phase if available
    if (project.phase) {
      return project.phase;
    }
    
    // Default fallback
    return 'LEAD';
  };

  // Phase configuration
  const PHASES = {
    LEAD: { name: "Lead", color: '#EAB308', initial: 'L' },
    PROSPECT: { name: "Prospect", color: '#F97316', initial: 'P' },
    APPROVED: { name: "Approved", color: '#10B981', initial: 'A' },
    EXECUTION: { name: "Execution", color: '#D946EF', initial: 'E' },
    SECOND_SUPPLEMENT: { name: "2nd Supplement", color: '#8B5CF6', initial: 'S' },
    COMPLETION: { name: "Completion", color: '#0EA5E9', initial: 'C' }
  };

  const getPhaseConfig = (project) => {
    const phase = getProjectPhase(project);
    return PHASES[phase] || PHASES.LEAD;
  };

  const getContrastTextColor = (backgroundColor) => {
    // Remove # if present
    const hex = backgroundColor.replace('#', '').toUpperCase();
    
    // Prospect override: ensure text uses #111827 on Prospect background
    if (hex === 'F59E0B') {
      return '#111827';
    }
    
    // All other phases use white text
    return 'white';
  };

  const getProjectIcon = (iconType) => {
    const iconClasses = "w-4 h-4 cursor-pointer hover:scale-110 transition-transform duration-200";
    
    switch (iconType) {
      case 'workflow':
        return (
          <svg className={`${iconClasses} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      case 'alerts':
        return (
          <svg className={`${iconClasses} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'messages':
        return (
          <svg className={`${iconClasses} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const filteredProjects = projects
    .filter(p => p.status !== 'archived')
    .filter(p => {
      const q = (projectSearch || '').toLowerCase().trim();
      if (!q) return true;
      const num = String(p.projectNumber || p.id || '').padStart(5, '0').toLowerCase();
      const name = (p.customerName || p.customer?.name || p.clientName || p.projectName || p.name || '').toLowerCase();
      return num.includes(q.replace('#','')) || name.includes(q);
    })
    .slice(0, 200);

  return (
    <div className="relative w-full" style={{ zIndex: 200, position: 'sticky', top: 0 }}>
      {/* Main Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 transition-colors relative z-30 w-full"
        ref={triggerRef}
      >
        <span className="text-sm font-medium">
          {selectedProject ? (
            <div className="flex items-center gap-3 w-full">
              {/* Phase Circle */}
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm"
                style={{ 
                  backgroundColor: getPhaseConfig(selectedProject).color,
                  color: getContrastTextColor(getPhaseConfig(selectedProject).color)
                }}
                title={`Phase: ${getPhaseConfig(selectedProject).name}`}
              >
                {getPhaseConfig(selectedProject).initial}
              </div>

                              {/* Project Number */}
                <span className="text-sm font-bold text-blue-600">
                  #{String(selectedProject.projectNumber || selectedProject.id).padStart(5, '0')}
                </span>

              {/* Project Name */}
              <span className="text-sm font-semibold text-gray-900 truncate flex-1">
                {selectedProject.projectName || selectedProject.name}
              </span>

              {/* Action Icons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectNavigate(selectedProject, 'Project Workflow');
                  }}
                  title="Go to Project Workflow"
                  className="p-1 hover:bg-blue-100 rounded"
                >
                  {getProjectIcon('workflow')}
                </div>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectNavigate(selectedProject, 'Alerts');
                  }}
                  title="Go to Project Alerts"
                  className="p-1 hover:bg-red-100 rounded"
                >
                  {getProjectIcon('alerts')}
                </div>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectNavigate(selectedProject, 'Messages');
                  }}
                  title="Go to Project Profile"
                  className="p-1 hover:bg-green-100 rounded"
                >
                  {getProjectIcon('messages')}
                </div>
              </div>

              {/* Clear Selection Button */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleProjectSelect(null);
                }}
                title="Clear project selection"
                className="p-1 rounded hover:bg-red-100 cursor-pointer text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              {/* Expand/Collapse Arrow */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleProjectExpansion(selectedProject.id);
                }}
                title={expandedProject === selectedProject.id ? "Hide project details (Address, Contact, PM)" : "Show project details (Address, Contact, PM)"}
                className="p-1 rounded hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3 h-3 transition-transform" style={{ transform: expandedProject === selectedProject.id ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs text-gray-500">Details</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full">
              {/* General Chat Icon */}
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm bg-gray-400 text-white"
                title="General Chat - No Project Context"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>

              {/* No Project Text */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900">
                  No Project Selected
                </span>
                <span className="text-xs text-gray-500">
                  Chat about general topics
                </span>
              </div>
            </div>
          )}
        </span>
        <svg className="w-4 h-4 text-gray-500 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" title={isOpen ? "Close project list" : "Open project list to search and select"}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Details for Selected Project */}
      {selectedProject && expandedProject === selectedProject.id && detailsStyle && ReactDOM.createPortal(
        <div style={detailsStyle} className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg shadow-lg">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Project Information
          </div>
          
          {/* Address Section */}
          <div className="mb-2">
            <div className="flex items-center">
              <svg className="w-3 h-3 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide w-16">Address:</span>
              <span className="text-sm text-gray-800 ml-2">
                {selectedProject.address || selectedProject.customer?.address || 'No address available'}
              </span>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mb-2">
            <div className="flex items-center">
              <svg className="w-3 h-3 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide w-16">Contact:</span>
              <span className="text-sm text-gray-800 ml-2">
                {selectedProject.customer?.primaryName || selectedProject.client?.name || 'No name'} | 
                {selectedProject.customer?.primaryPhone || selectedProject.client?.phone || ' No phone'} | 
                {selectedProject.customer?.primaryEmail || selectedProject.client?.email || ' No email'}
              </span>
            </div>
          </div>

          {/* PM Section */}
          <div>
            <div className="flex items-center">
              <svg className="w-3 h-3 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide w-16">PM:</span>
              <span className="text-sm text-gray-800 ml-2">
                {selectedProject.projectManager?.name || 
                 (selectedProject.projectManager?.firstName && selectedProject.projectManager?.lastName ? 
                  `${selectedProject.projectManager.firstName} ${selectedProject.projectManager.lastName}` : 
                  'No PM assigned')} | 
                {selectedProject.projectManager?.phone || ' No phone'} | 
                {selectedProject.projectManager?.email || ' No email'}
              </span>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Dropdown Options */}
      {isOpen && menuStyle && ReactDOM.createPortal(
        <div style={menuStyle} className="bg-white border border-gray-300 rounded-lg shadow-lg max-h-[60vh] overflow-y-auto">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search by project number (#12345) or customer name..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Project List */}
          <div className="py-1">
            {/* No Project Selected Option - Always visible */}
            <div
              onClick={() => handleProjectSelect(null)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 bg-gray-50"
            >
              {/* General Chat Icon */}
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm bg-blue-500 text-white"
                title="General Chat - No Project Context"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>

              {/* No Project Text */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900">
                  No Project Selected
                </span>
                <span className="text-xs text-gray-500">
                  Chat about general topics, company info, or workflows
                </span>
              </div>
            </div>

            {/* Filtered Projects */}
            {filteredProjects.length === 0 ? (
              <div className="px-4 py-2 text-gray-500 text-sm">No projects found</div>
            ) : (
              filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    {/* Phase Circle */}
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm"
                      style={{ 
                        backgroundColor: getPhaseConfig(project).color,
                        color: getContrastTextColor(getPhaseConfig(project).color)
                      }}
                      title={`Phase: ${getPhaseConfig(project).name}`}
                    >
                      {getPhaseConfig(project).initial}
                    </div>

                    {/* Project Number */}
                    <span className="text-sm font-bold text-blue-600">
                      #{String(project.projectNumber || project.id).padStart(5, '0')}
                    </span>

                    {/* Project Info */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {project.projectName || project.name}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {project.customerName || project.customer?.name || project.clientName}
                      </span>
                    </div>

                    {/* Action Icons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectNavigate(project, 'Project Workflow');
                        }}
                        title="Go to Project Workflow"
                        className="p-1 hover:bg-blue-100 rounded"
                      >
                        {getProjectIcon('workflow')}
                      </div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectNavigate(project, 'Alerts');
                        }}
                        title="Go to Project Alerts"
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        {getProjectIcon('alerts')}
                      </div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectNavigate(project, 'Messages');
                        }}
                        title="Go to Project Profile"
                        className="p-1 hover:bg-green-100 rounded"
                      >
                        {getProjectIcon('messages')}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default EnhancedProjectDropdown;
