import React, { useState, useRef } from 'react';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';
import WorkflowProgressService from '../../services/workflowProgress';
import api from '../../services/api';

const ProjectWorkflowLineItemsSection = ({
  projects = [],
  colorMode = false,
  onProjectSelect,
  workflowAlerts = [],
  alertsLoading = false,
  availableUsers = [],
  currentUser = null,
  handleProjectSelectWithScroll
}) => {
  const alertsCount = Array.isArray(workflowAlerts) ? workflowAlerts.length : 0;
  // State for alerts
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [expandedContacts, setExpandedContacts] = useState(new Set());
  const [expandedPMs, setExpandedPMs] = useState(new Set());
  const [alertProjectFilter, setAlertProjectFilter] = useState('all');
  const [alertUserGroupFilter, setAlertUserGroupFilter] = useState('all');
  const [alertNotes, setAlertNotes] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAlertForAssign, setSelectedAlertForAssign] = useState(null);
  const [assignToUser, setAssignToUser] = useState('');

  // Refs for popup triggers
  const alertContactButtonRefs = useRef({});
  const alertPmButtonRefs = useRef({});

  // Utility functions
  const formatUserRole = (role) => {
    const roleMap = {
      'PM': 'PM',
      'FIELD': 'FIELD',
      'OFFICE': 'OFFICE',
      'ADMIN': 'ADMIN'
    };
    return roleMap[role] || 'OFFICE';
  };

  const forceRefreshAlerts = () => {
    console.log('🔄 Force refreshing alerts...');
    // This would need to be passed as a prop from parent
  };

  const handleExpandAllAlerts = () => {
    const allAlertIds = new Set(getPaginatedAlerts().map(alert => alert._id || alert.id));
    setExpandedAlerts(allAlertIds);
  };

  const handleCollapseAllAlerts = () => {
    setExpandedAlerts(new Set());
  };

  const toggleAlertExpansion = (alertId) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  // Alert filtering and pagination
  const getSortedAlerts = () => {
    const alertsData = workflowAlerts && workflowAlerts.length > 0 ? workflowAlerts : [];
    let filteredAlerts = [...alertsData];
    
    // Apply project filter
    if (alertProjectFilter !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => {
        if (alertProjectFilter === 'general') {
          return !alert.projectId && !alert.project;
        }
        const alertProjectId = alert.project?._id || alert.projectId;
        return alertProjectId === alertProjectFilter || alertProjectId === parseInt(alertProjectFilter);
      });
    }
    
    // Apply user group filter
    if (alertUserGroupFilter !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => {
        const role = alert.metadata?.responsibleRole || alert.actionData?.responsibleRole || 'OFFICE';
        return formatUserRole(String(role)) === alertUserGroupFilter;
      });
    }
    
    return filteredAlerts;
  };

  const getPaginatedAlerts = () => {
    return getSortedAlerts();
  };

  // Alert action handlers
  const handleCompleteAlert = async (alert) => {
    const alertId = alert._id || alert.id;
    setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: true }));
    
    try {
      const projectId = alert.relatedProject?._id || alert.projectId || alert.project?._id;
      const lineItemId = alert.lineItemId || alert.metadata?.lineItemId || alert.stepId || alert.id;
      
      const response = await api.post('/workflows/complete-item', {
        projectId: projectId,
        lineItemId: lineItemId,
        notes: `Completed via dashboard alert by ${currentUser?.firstName || 'User'} ${currentUser?.lastName || ''}`,
        alertId: alertId
      });

      if (response.status >= 200 && response.status < 300) {
        console.log('✅ Alert completed successfully');
        // Refresh would be handled by parent component
      }
    } catch (error) {
      console.error('❌ Failed to complete alert:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${alertId}-complete`]: false }));
    }
  };

  const handleAssignAlert = (alert) => {
    setSelectedAlertForAssign(alert);
    setShowAssignModal(true);
  };

  const handleAssignConfirm = async () => {
    const alertId = selectedAlertForAssign._id || selectedAlertForAssign.id;
    setActionLoading(prev => ({ ...prev, [`${alertId}-assign`]: true }));
    
    try {
      const response = await api.patch(`/alerts/${alertId}/assign`, {
        assignedTo: assignToUser
      });
      
      if (response.data.success) {
        console.log('✅ Alert assigned successfully');
        setShowAssignModal(false);
        setSelectedAlertForAssign(null);
        setAssignToUser('');
      }
    } catch (error) {
      console.error('❌ Failed to assign alert:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${alertId}-assign`]: false }));
    }
  };

  return (
    <div className="w-full" data-section="project-workflow-tasks">
      {/* Beautiful original alerts UI with new functionality */}
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-soft rounded-2xl p-6 relative overflow-visible">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                Project Workflow Line Items
              </h2>
              {expandedAlerts.size > 0 && (
                <p className="text-sm text-gray-600 font-medium">
                  {expandedAlerts.size} of {getPaginatedAlerts().length} alert{getPaginatedAlerts().length !== 1 ? 's' : ''} expanded
                </p>
              )}
            </div>
          </div>
          
          {/* Filter Controls with Expand/Collapse Controls */}
          <div className="flex items-center justify-between gap-2 mb-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Filter by:</span>
              <select 
                value={alertProjectFilter} 
                onChange={(e) => setAlertProjectFilter(e.target.value)} 
                className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[120px]"
              >
                <option value="all">All Projects</option>
                <option value="general">General</option>
                {(projects || []).map(p => (
                  <option key={p.id} value={p.id}>#{String(p.projectNumber || p.id).padStart(5, '0')} - {p.customer?.name || p.clientName || p.name}</option>
                ))}
              </select>
              
              <select 
                value={alertUserGroupFilter} 
                onChange={(e) => setAlertUserGroupFilter(e.target.value)} 
                className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white transition-all duration-300 min-w-[100px]"
              >
                <option value="all">All Roles</option>
                <option value="PM">Project Manager</option>
                <option value="FIELD">Field Director</option>
                <option value="OFFICE">Office Staff</option>
                <option value="ADMIN">Administration</option>
              </select>
            </div>
            
            {/* Condensed Expand/Collapse Controls - Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={forceRefreshAlerts}
                className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-[var(--color-primary-blueprint-blue)] transition-colors"
                title="Refresh alerts"
              >
                🔄
              </button>
              <button
                onClick={handleExpandAllAlerts}
                className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                expandedAlerts.size === getPaginatedAlerts().length && getPaginatedAlerts().length > 0
                  ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow'
                  : 'bg-white/80 text-brand-600 border-gray-200 hover:bg-white hover:border-brand-300 hover:shadow-soft'
              }`}
                title="Expand all alert details"
                disabled={getPaginatedAlerts().length === 0 || expandedAlerts.size === getPaginatedAlerts().length}
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
              
              <button
                onClick={handleCollapseAllAlerts}
                className={`px-1.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-300 ${
                expandedAlerts.size === 0 || getPaginatedAlerts().length === 0
                  ? 'bg-orange-500 text-white border-orange-500 shadow-accent-glow'
                  : 'bg-white/80 text-orange-600 border-gray-200 hover:bg-white hover:border-orange-300 hover:shadow-soft'
              }`}
                title="Collapse all alert details"
                disabled={getPaginatedAlerts().length === 0 || expandedAlerts.size === 0}
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </div>
          
        </div>
        
        {/* Horizontal line to match Project Messages alignment */}
        <div className={`border-t mb-3 mt-0 ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
        
        <div className="space-y-2 mt-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
          {getPaginatedAlerts().length === 0 && (
            <div className="text-gray-400 text-center py-3 text-sm">
              {alertsLoading ? 'Loading alerts...' : 'No alerts found.'}
            </div>
          )}
          {getPaginatedAlerts().length > 0 && (
            getPaginatedAlerts().map(alert => {
            // Extract data from alert
            const alertId = alert._id || alert.id;
            const actionData = alert.actionData || alert.metadata || {};
            const phase = actionData.phase || 'UNKNOWN';
            const priority = actionData.priority || 'medium';
              
              // Find associated project
              const projectId = actionData.projectId;
              const project = projects?.find(p => String(p.id) === String(projectId) || String(p._id) === String(projectId));
              
              // Alert details
              const alertTitle = actionData.stepName || alert.title || 'Unknown Alert';
              const isExpanded = expandedAlerts.has(alertId);
              
              // Get proper section and line item from alert metadata
              const sectionName = actionData.section || actionData.sectionName || 'Unknown Section';

              // Resolve line item display name from multiple possible shapes (exhaustive)
              const resolveLineItemName = (alertObj) => {
                if (!alertObj) return 'Unknown Line Item';
                // Top-level candidates
                const top = [alertObj.lineItem, alertObj.stepName, alertObj.stepLabel, alertObj.title, alertObj.message, alertObj.name];

                // Action/metadata bucket
                const ad = alertObj.actionData || alertObj.metadata || {};
                const actionCandidates = [
                  ad.stepName, ad.lineItemName, ad.lineItem, ad.currentLineItemName, ad.stepLabel, ad.lineItemLabel, ad.name, ad.label, ad.title, ad.cleanTaskName
                ];

                const meta = alertObj.metadata || {};
                const metaCandidates = [meta.lineItem, meta.cleanTaskName, meta.stepName, meta.lineItemName, meta.name, meta.label];

                const candidates = [...top, ...actionCandidates, ...metaCandidates];

                for (const c of candidates) {
                  if (c === null || c === undefined) continue;
                  if (typeof c === 'object') {
                    if (c.name) return String(c.name);
                    if (c.label) return String(c.label);
                    continue;
                  }
                  if (typeof c === 'string' && c.trim()) return c.trim();
                  if (typeof c === 'number') return String(c);
                }

                // If there's a stepId/lineItemId, show that raw id as a fallback so something is visible
                if (alertObj.stepId) return String(alertObj.stepId);
                if (alertObj.lineItemId) return String(alertObj.lineItemId);

                // Last resort: return a clear placeholder
                return '(unknown line item)';
              };

              const lineItemName = resolveLineItemName(alert);

              // Compute a stable rendered id for this line item so Dashboard can target it when restoring
              const renderedLineItemId = actionData.stepId || actionData.lineItemId || alert.stepId || alert.lineItemId || `alert-${alertId}`;

              // Debugging: if we couldn't resolve a meaningful line item, log the alert payload (limited to first few occurrences)
              try {
                if ((!lineItemName || lineItemName === '(unknown line item)') && window && window.console) {
                  // Log once per session for diagnosis
                  console.debug('⚠️ Workflow Alert missing lineItemName, actionData:', actionData, 'alert:', alert);
                }
              } catch (_) {}
              
              // Get user group from alert's responsible role
              const getUserGroupFromAlert = (alert) => {
                const role = alert.responsibleRole || alert.metadata?.responsibleRole || 'OFFICE';
                return formatUserRole(String(role));
              };
              
              const correctUserGroup = getUserGroupFromAlert(alert);
              // Determine project type from alert payload with reliable fallbacks
              const projectTypeRaw = alert.projectType 
                || alert.relatedProject?.projectType 
                || actionData.projectType 
                || project?.projectType;
              
              // Use WorkflowProgressService for consistent phase colors and initials
              const getPhaseProps = (phase) => {
                return WorkflowProgressService.getPhaseButtonProps(phase || 'LEAD');
              };
              
              return (
                <div key={alertId} className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-[12px] shadow-sm border transition-all duration-200 cursor-pointer`}>
                  {/* Alert header - ENTIRE AREA CLICKABLE FOR DROPDOWN */}
                  <div 
                    className="flex flex-col gap-0 px-1.5 py-1 hover:bg-opacity-80 transition-colors cursor-pointer"
                    onClick={() => toggleAlertExpansion(alertId)}
                  >
                    {/* First Row - Project# | Customer ▼ | PM ▼ | UserGroup | Arrow - More spaced out */}
                    <div className="flex items-center justify-between gap-3">
                      {/* Phase Circle - Smaller */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-5 h-5 ${getPhaseProps(phase).bgColor} rounded-full flex items-center justify-center ${getPhaseProps(phase).textColor} font-bold text-[9px] shadow-sm`}>
                          {getPhaseProps(phase).initials}
                        </div>
                        {priority === 'high' && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
                        )}
                      </div>
                      
                      {/* Left Section: Project# | Customer | PM - Fixed positioning */}
                      <div className="flex items-center text-[9px] flex-1">
                          {/* Project Number as blue clickable link */}
                          <button 
                            className={`font-bold flex-shrink-0 hover:underline ${colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-700 hover:text-blue-900'}`}
                            style={{ width: '50px', textAlign: 'left' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (project && onProjectSelect) {
                                const projectWithScrollId = {
                                  ...project,
                                  scrollToProjectId: String(project.id),
                                  navigationSource: 'Project Workflow Line Items',
                                  returnToSection: 'project-workflow-tasks'
                                };
                                console.log('🎯 PROJECT NUMBER CLICK: Navigating from Project Workflow Line Items to Profile');
                                handleProjectSelectWithScroll(projectWithScrollId, 'Profile', null, 'Project Workflow Line Items');
                              }
                            }}
                            title={`Go to project #${project?.projectNumber || actionData.projectNumber || 'N/A'}`}
                          >
                            {project?.projectNumber || actionData.projectNumber || '12345'}
                          </button>
                          
                          {/* Customer with dropdown arrow - Made smaller */}
                          <div className="flex items-center gap-1 flex-shrink-0 relative" style={{width: '100px', marginLeft: '0px'}}>
                            <button 
                              ref={(el) => alertContactButtonRefs.current[alertId] = el}
                              className={`text-[9px] font-semibold cursor-pointer hover:underline ${
                                colorMode ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                              }`}
                              title={project?.customer?.name || project?.clientName || actionData.projectName || 'Primary Customer'}
                              onClick={(e) => {
                                e.stopPropagation();
                                const newExpanded = new Set(expandedContacts);
                                if (newExpanded.has(alertId)) {
                                  newExpanded.delete(alertId);
                                } else {
                                  newExpanded.add(alertId);
                                }
                                setExpandedContacts(newExpanded);
                              }}
                            >
                              {project?.customer?.name || project?.clientName || project?.name || 'Customer'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newExpanded = new Set(expandedContacts);
                                if (newExpanded.has(alertId)) {
                                  newExpanded.delete(alertId);
                                } else {
                                  newExpanded.add(alertId);
                                }
                                setExpandedContacts(newExpanded);
                              }}
                              className={`transform transition-transform duration-200 ${expandedContacts.has(alertId) ? 'rotate-180' : ''}`}
                            >
                              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {/* Contact Details Popup */}
                            {expandedContacts.has(alertId) && (project?.customer || project?.client) && (
                              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-2.5 min-w-[180px] text-[10px] space-y-1">
                                {(() => {
                                  const customerData = project?.customer || project?.client;
                                  return (
                                    <>
                                      <div className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-1">
                                        {customerData.primaryName || customerData.name || project?.clientName || 'Customer'}
                                      </div>
                                      {customerData.primaryPhone && (
                                        <div className="flex items-start gap-1">
                                          <span>📞</span>
                                          <span className="text-gray-700">{customerData.primaryPhone}</span>
                                        </div>
                                      )}
                                      {customerData.primaryEmail && (
                                        <div className="flex items-start gap-1">
                                          <span>📧</span>
                                          <span className="text-gray-700 break-all">{customerData.primaryEmail}</span>
                                        </div>
                                      )}
                                      {customerData.primaryAddress && (
                                        <div className="flex items-start gap-1">
                                          <span>📍</span>
                                          <span className="text-gray-700">{customerData.primaryAddress}</span>
                                        </div>
                                      )}
                                      {!customerData.primaryPhone && !customerData.primaryEmail && !customerData.primaryAddress && (
                                        <div className="text-gray-500 italic text-[9px]">No contact details</div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          
                          {/* PM with dropdown arrow - align baseline with Line Item label */}
                          <div className="flex items-center gap-1 flex-shrink-0" style={{ marginLeft: '8px' }}>
                            <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>PM:</span>
                            <button 
                              ref={(el) => alertPmButtonRefs.current[alertId] = el}
                              className={`text-[8px] font-semibold cursor-pointer hover:underline truncate max-w-[60px] ${
                                colorMode ? 'text-gray-300 hover:text-gray-200' : 'text-gray-700 hover:text-gray-800'
                              }`}
                              title={project?.projectManager?.name || project?.projectManager?.firstName + ' ' + project?.projectManager?.lastName || 'Mike Field'}
                              onClick={(e) => {
                                e.stopPropagation();
                                const newExpanded = new Set(expandedPMs);
                                if (newExpanded.has(alertId)) {
                                  newExpanded.delete(alertId);
                                } else {
                                  newExpanded.add(alertId);
                                }
                                setExpandedPMs(newExpanded);
                              }}
                            >
                              {project?.projectManager?.firstName || project?.projectManager?.name || 'Mike'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newExpanded = new Set(expandedPMs);
                                if (newExpanded.has(alertId)) {
                                  newExpanded.delete(alertId);
                                } else {
                                  newExpanded.add(alertId);
                                }
                                setExpandedPMs(newExpanded);
                              }}
                              className={`transform transition-transform duration-200 ${expandedPMs.has(alertId) ? 'rotate-180' : ''}`}
                            >
                              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Right Section: Project Type Tag & Arrow */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {projectTypeRaw && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border max-w-[140px] whitespace-nowrap truncate ${
                                colorMode ? getProjectTypeColorDark(projectTypeRaw) : getProjectTypeColor(projectTypeRaw)
                              }`}
                              title={`Project Type: ${formatProjectType(projectTypeRaw)}`}
                            >
                              {formatProjectType(projectTypeRaw)}
                            </span>
                          )}
                          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Second Row - Section and Line Item */}
                    <div className="flex items-center text-[9px]" style={{ marginTop: '-2px', marginLeft: '32px' }}>
                      {/* Section label and value - properly aligned */}
                      <div className="flex items-center" style={{ width: '150px' }}>
                        <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '4px' }}>Section:</span>
                        <span className={`font-semibold truncate ${colorMode ? 'text-white' : 'text-gray-800'}`} style={{ marginLeft: '4px' }}>
                          {sectionName || 'Unknown Section'}
                        </span>
                      </div>
                      
                      {/* Line Item - properly aligned */}
                      <div className="flex items-center flex-shrink-0 ml-2">
                        <span className={`font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ marginLeft: '8px' }}>Line Item:</span>
                        <span 
                            className={`font-semibold cursor-pointer hover:underline max-w-[120px] truncate ${
                              colorMode ? 'text-white hover:text-gray-200' : 'text-gray-800 hover:text-gray-900'
                            }`}
                            style={{ marginLeft: '4px' }}
                            id={`lineitem-${renderedLineItemId}`}
                            data-lineitem-id={renderedLineItemId}
                            data-alert-id={alertId}
                            title={lineItemName || 'Unknown Line Item'}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (project && onProjectSelect) {
                                console.log('🎯 ALERTS CLICK: Starting alert line item navigation');
                                
                                try {
                                  const response = await api.get(`/workflow-data/project-position/${project.id}`);
                                  
                                  if (response.data) {
                                    const result = response.data;
                                    if (result.success && result.data) {
                                      const position = result.data;
                                      
                                      const getSubtaskIndex = async () => {
                                        try {
                                          const workflowResponse = await fetch('/api/workflow-data/full-structure', {
                                            headers: {
                                              'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                                            }
                                          });
                                          
                                          if (workflowResponse.ok) {
                                            const workflowResult = await workflowResponse.json();
                                            if (workflowResult.success && workflowResult.data) {
                                              const currentPhaseData = workflowResult.data.find(phase => phase.id === position.currentPhase);
                                              if (currentPhaseData) {
                                                const currentSectionData = currentPhaseData.items.find(item => item.id === position.currentSection);
                                                if (currentSectionData) {
                                                  const subtaskIndex = currentSectionData.subtasks.findIndex(subtask => {
                                                    if (typeof subtask === 'object') {
                                                      return subtask.id === position.currentLineItem || subtask.label === position.currentLineItemName;
                                                    }
                                                    return subtask === position.currentLineItemName;
                                                  });
                                                  return subtaskIndex >= 0 ? subtaskIndex : 0;
                                                }
                                              }
                                            }
                                          }
                                        } catch (error) {
                                          console.warn('Could not determine subtask index:', error);
                                        }
                                        return 0;
                                      };
                                      
                                      const subtaskIndex = await getSubtaskIndex();
                                      const targetLineItemId = actionData.stepId || actionData.lineItemId || `${position.currentPhase}-${position.currentSection}-${subtaskIndex}`;
                                      const targetSectionId = actionData.sectionId || position.currentSection;
                                      
                                      const projectWithNavigation = {
                                        ...project,
                                        highlightStep: lineItemName,
                                        highlightLineItem: lineItemName,
                                        targetPhase: phase,
                                        targetSection: sectionName,
                                        targetLineItem: lineItemName,
                                        scrollToCurrentLineItem: true,
                                        alertPhase: phase,
                                        navigationTarget: {
                                          nonce: Date.now(),
                                          phase: phase,
                                          section: sectionName,
                                          lineItem: lineItemName,
                                          stepName: lineItemName,
                                          alertId: alertId,
                                          lineItemId: actionData.stepId || actionData.lineItemId || alert.stepId,
                                          workflowId: actionData.workflowId || alert.workflowId,
                                          highlightMode: 'line-item',
                                          scrollBehavior: 'smooth',
                                          targetElementId: `lineitem-${targetLineItemId}`,
                                          highlightColor: '#0066CC',
                                          highlightDuration: 3000,
                                          targetSectionId: targetSectionId,
                                          expandPhase: true,
                                          expandSection: true,
                                          autoOpen: true
                                        }
                                      };
                                      
                                      projectWithNavigation.navigationSource = 'Project Workflow Tasks';
                                      projectWithNavigation.returnToSection = 'project-workflow-tasks';
                                      projectWithNavigation.highlightTarget = {
                                        lineItemId: targetLineItemId,
                                        sectionId: targetSectionId,
                                        phaseId: position.currentPhase,
                                        autoOpen: true,
                                        scrollAndHighlight: true
                                      };
                                      
                                      handleProjectSelectWithScroll(
                                        projectWithNavigation, 
                                        'Project Workflow', 
                                        null, 
                                        'Project Workflow Line Items',
                                        targetLineItemId,
                                        targetSectionId
                                      );
                                    }
                                  }
                                } catch (error) {
                                  console.error('🎯 ALERTS CLICK: Error getting project position:', error);
                                }
                              }
                            }}
                          >
                            {lineItemName}
                          </span>
                      </div>
                    </div>
                  
                  {/* Expandable dropdown section */}
                  {isExpanded && (
                    <div className={`px-2 py-2 border-t ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      {/* Action Buttons - First Priority */}
                      <div className="flex gap-2 mb-2">
                        {/* Complete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteAlert(alert);
                          }}
                          disabled={actionLoading[`${alertId}-complete`]}
                          className={`flex-1 px-2 py-1 text-[9px] font-semibold rounded border transition-all duration-200 ${
                            actionLoading[`${alertId}-complete`] 
                              ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' 
                              : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 hover:from-green-600 hover:to-green-700 hover:border-green-600 shadow-sm hover:shadow-md'
                          }`}
                        >
                          {actionLoading[`${alertId}-complete`] ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Completing...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Complete
                            </span>
                          )}
                        </button>
                        
                        {/* Assign to User Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignAlert(alert);
                          }}
                          disabled={actionLoading[`${alertId}-assign`]}
                          className={`flex-1 px-2 py-1 text-[9px] font-semibold rounded border transition-all duration-200 ${
                            actionLoading[`${alertId}-assign`]
                              ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-brand-500 hover:from-blue-600 hover:to-blue-700 hover:border-blue-600 shadow-sm hover:shadow-md'
                          }`}
                        >
                          <span className="flex items-center justify-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Assign to User
                          </span>
                        </button>
                      </div>
                      
                      {/* Note Box */}
                      <div className="mt-3">
                        <label className={`block text-[9px] font-medium mb-1 ${
                          colorMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Add Note:
                        </label>
                        <textarea
                          placeholder="Enter a note for this alert..."
                          rows={2}
                          value={alertNotes[alertId] || ''}
                          className={`w-full p-2 text-[9px] border rounded resize-none transition-colors ${
                            colorMode 
                              ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-blue-500' 
                              : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-blue-500'
                          }`}
                          onChange={(e) => {
                            setAlertNotes(prev => ({
                              ...prev,
                              [alertId]: e.target.value
                            }));
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-[20px] p-6 w-96 max-w-md ${colorMode ? 'bg-[#1e293b] border border-[#3b82f6]/30' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              Assign Alert
            </h3>
            
            {/* Alert Information */}
            {selectedAlertForAssign && (
              <div className={`mb-4 p-3 rounded border ${colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Alert: {selectedAlertForAssign.title || 'Unknown Alert'}
                </p>
                <p className={`text-xs mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Project: {selectedAlertForAssign.metadata?.projectName || selectedAlertForAssign.relatedProject?.projectName || 'Unknown Project'}
                </p>
              </div>
            )}
            
            {/* User Selection Dropdown */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Assign to User:
              </label>
              <select
                value={assignToUser}
                onChange={(e) => setAssignToUser(e.target.value)}
                className={`w-full p-3 border rounded-lg text-sm transition-colors ${
                  colorMode 
                    ? 'bg-[#1e293b] border-gray-600 text-white focus:border-brand-500 focus:ring-1 focus:ring-blue-500' 
                    : 'bg-white border-gray-300 text-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-blue-500'
                }`}
              >
                <option value="">Select a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName || ''} {user.lastName ? '' : `(${user.email})`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAlertForAssign(null);
                  setAssignToUser('');
                }}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  colorMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignConfirm}
                disabled={!assignToUser || actionLoading[`${selectedAlertForAssign?.id || selectedAlertForAssign?._id}-assign`]}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  assignToUser && !actionLoading[`${selectedAlertForAssign?.id || selectedAlertForAssign?._id}-assign`]
                    ? 'bg-[var(--color-primary-blueprint-blue)] text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                {actionLoading[`${selectedAlertForAssign?.id || selectedAlertForAssign?._id}-assign`] ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Assigning...
                  </span>
                ) : (
                  'Assign'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkflowLineItemsSection;
