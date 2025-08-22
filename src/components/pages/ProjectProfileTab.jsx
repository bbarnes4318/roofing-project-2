import React, { useState, useEffect, useRef } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import WorkflowProgressService from '../../services/workflowProgress';
import api from '../../services/api';
import { formatProjectType } from '../../utils/projectTypeFormatter';
import WorkflowDataService from '../../services/workflowDataService';
import toast from 'react-hot-toast';

const ProjectProfileTab = ({ project, colorMode, onProjectSelect }) => {
  const [activeSection] = useState('overview');
  // Match Projects by Phase progress behavior (keyed expansion + visibility management)
  const progressChartRefs = useRef({});
  const [expandedProgress, setExpandedProgress] = useState({});
  const [progressExpanded, setProgressExpanded] = useState(false);
  
  // Edit states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editFormData, setEditFormData] = useState({
    address: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    secondaryName: '',
    secondaryPhone: '',
    secondaryEmail: '',
    pmName: '',
    pmPhone: '',
    pmEmail: '',
    pmId: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const toggleProgressExpansion = (projectId, section) => {
    const expandedKey = `${projectId || 'project'}-${section}`;
    setExpandedProgress(prev => ({
      ...prev,
      [expandedKey]: !prev[expandedKey]
    }));
  };

  const ensureProgressChartVisibility = (projectId, section) => {
    const key = `${projectId || 'project'}-${section}`;
    const chartRef = progressChartRefs.current[key];
    if (!chartRef) return;

    const rect = chartRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const buffer = 20;

    if (rect.bottom > viewportHeight - buffer) {
      const scrollAmount = rect.bottom - viewportHeight + buffer;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }

    if (rect.top < buffer) {
      const scrollAmount = rect.top - buffer;
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    }

    if (rect.bottom > viewportHeight - buffer || rect.top < buffer) {
      chartRef.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  };

  const handleChartPositioning = (projectId, section, isExpanded) => {
    if (!isExpanded) return;
    requestAnimationFrame(() => {
      ensureProgressChartVisibility(projectId, section);
    });
  };

  const getProjectTrades = (proj) => {
    if (proj?.trades && proj.trades.length > 0) return proj.trades;
    const tradeName = proj?.projectType || proj?.type || 'General';
    return [
      {
        name: tradeName,
        laborProgress: proj?.progress || 0,
        materialsDelivered: proj?.materialsDelivered || false
      }
    ];
  };

  // Load users for dropdown
  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await api.get('/users');
        if (response.data && response.data.success) {
          setUsers(response.data.data || []);
        } else {
          // Fallback to mock users if API fails
          setUsers([
            { id: 1, firstName: 'Mike', lastName: 'Field', role: 'Project Manager', email: 'mike.field@company.com' },
            { id: 2, firstName: 'Sarah', lastName: 'Johnson', role: 'Office Manager', email: 'sarah.johnson@company.com' },
            { id: 3, firstName: 'John', lastName: 'Smith', role: 'Field Director', email: 'john.smith@company.com' },
            { id: 4, firstName: 'Emily', lastName: 'Davis', role: 'Administration', email: 'emily.davis@company.com' },
            { id: 5, firstName: 'Robert', lastName: 'Wilson', role: 'Roof Supervisor', email: 'robert.wilson@company.com' },
            { id: 6, firstName: 'Lisa', lastName: 'Anderson', role: 'Customer Service', email: 'lisa.anderson@company.com' },
            { id: 7, firstName: 'David', lastName: 'Martinez', role: 'Estimator', email: 'david.martinez@company.com' },
            { id: 8, firstName: 'Jennifer', lastName: 'Brown', role: 'Accounting', email: 'jennifer.brown@company.com' }
          ]);
        }
      } catch (error) {
        console.error('Error loading users:', error);
        // Fallback to mock users
        setUsers([
          { id: 1, firstName: 'Mike', lastName: 'Field', role: 'Project Manager', email: 'mike.field@company.com' },
          { id: 2, firstName: 'Sarah', lastName: 'Johnson', role: 'Office Manager', email: 'sarah.johnson@company.com' },
          { id: 3, firstName: 'John', lastName: 'Smith', role: 'Field Director', email: 'john.smith@company.com' },
          { id: 4, firstName: 'Emily', lastName: 'Davis', role: 'Administration', email: 'emily.davis@company.com' },
          { id: 5, firstName: 'Robert', lastName: 'Wilson', role: 'Roof Supervisor', email: 'robert.wilson@company.com' },
          { id: 6, firstName: 'Lisa', lastName: 'Anderson', role: 'Customer Service', email: 'lisa.anderson@company.com' },
          { id: 7, firstName: 'David', lastName: 'Martinez', role: 'Estimator', email: 'david.martinez@company.com' },
          { id: 8, firstName: 'Jennifer', lastName: 'Brown', role: 'Accounting', email: 'jennifer.brown@company.com' }
        ]);
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Initialize edit form data when project changes
  useEffect(() => {
    if (project) {
      setEditFormData({
        address: project.customer?.address || '',
        customerName: project.customer?.primaryName || project.customer?.name || '',
        customerPhone: project.customer?.primaryPhone || '',
        customerEmail: project.customer?.primaryEmail || '',
        secondaryName: project.customer?.secondaryName || '',
        secondaryPhone: project.customer?.secondaryPhone || '',
        secondaryEmail: project.customer?.secondaryEmail || '',
        pmName: project.projectManager?.firstName && project.projectManager?.lastName 
          ? `${project.projectManager.firstName} ${project.projectManager.lastName}`.trim()
          : project.projectManager?.name || '',
        pmPhone: project.projectManager?.phone || project.pmPhone || '',
        pmEmail: project.projectManager?.email || project.pmEmail || '',
        pmId: project.projectManager?.id || project.projectManagerId || ''
      });
    }
  }, [project]);

  const handleEditAddress = () => {
    setIsEditingAddress(true);
  };

  const handleEditContact = () => {
    setIsEditingContact(true);
  };

  const handleCancelEdit = () => {
    setIsEditingAddress(false);
    setIsEditingContact(false);
    // Reset form data to original values
    if (project) {
      setEditFormData({
        address: project.customer?.address || '',
        customerName: project.customer?.primaryName || project.customer?.name || '',
        customerPhone: project.customer?.primaryPhone || '',
        customerEmail: project.customer?.primaryEmail || '',
        secondaryName: project.customer?.secondaryName || '',
        secondaryPhone: project.customer?.secondaryPhone || '',
        secondaryEmail: project.customer?.secondaryEmail || '',
        pmName: project.projectManager?.firstName && project.projectManager?.lastName 
          ? `${project.projectManager.firstName} ${project.projectManager.lastName}`.trim()
          : project.projectManager?.name || '',
        pmPhone: project.projectManager?.phone || project.pmPhone || '',
        pmEmail: project.projectManager?.email || project.pmEmail || '',
        pmId: project.projectManager?.id || project.projectManagerId || ''
      });
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // First, update customer information if customer exists
      if (project.customer?.id) {
        const customerUpdateData = {
          primaryName: editFormData.customerName,
          primaryPhone: editFormData.customerPhone,
          primaryEmail: editFormData.customerEmail,
          secondaryName: editFormData.secondaryName,
          secondaryPhone: editFormData.secondaryPhone,
          secondaryEmail: editFormData.secondaryEmail,
          address: editFormData.address
        };

        // Remove empty/null values
        Object.keys(customerUpdateData).forEach(key => {
          if (customerUpdateData[key] === '' || customerUpdateData[key] === null) {
            delete customerUpdateData[key];
          }
        });

        await api.put(`/customers/${project.customer.id}`, customerUpdateData);
      }

      // Then, update project information
      const projectUpdateData = {
        projectManagerId: editFormData.pmId || null,
        pmPhone: editFormData.pmPhone || null,
        pmEmail: editFormData.pmEmail || null
      };

      // Remove empty/null values
      Object.keys(projectUpdateData).forEach(key => {
        if (projectUpdateData[key] === '' || projectUpdateData[key] === null) {
          delete projectUpdateData[key];
        }
      });

      await api.put(`/projects/${project.id}`, projectUpdateData);
      
      // Close edit modes
      setIsEditingAddress(false);
      setIsEditingContact(false);
      
      // Show success message
      toast.success('Project information updated successfully!');
      
      // Refresh project data if onUpdate callback is provided
      if (project.onUpdate) {
        project.onUpdate();
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-500">Please select a project to view its profile information.</p>
        </div>
      </div>
    );
  }

  const formatAddress = (address) => {
    if (!address) return 'Address not provided';
    
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 3) {
      // Format: Street, City, State ZIP
      return (
        <div className="text-sm text-gray-700">
          <div className="font-medium">{parts[0]}</div>
          <div className="text-gray-600">{parts.slice(1).join(', ')}</div>
        </div>
      );
    } else if (parts.length === 2) {
      // Format: Street, State ZIP (missing city - fix this)
      return (
        <div className="text-sm text-gray-700">
          <div className="font-medium">{parts[0]}</div>
          <div className="text-gray-600">{parts[1]}</div>
        </div>
      );
    }
    return <div className="text-sm text-gray-700">{address}</div>;
  };

  const getProjectAddress = (proj) => {
    if (!proj) return null;
    const addr = (proj.address || '').trim();
    const name = (proj.projectName || '').trim();
    if (addr && addr !== name) return addr;
    // Fallbacks when legacy data mapped projectName into address
    return proj.customer?.address || proj.client?.address || addr || null;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left column: Primary Details */}
        <div className="lg:col-span-7 space-y-4">
          {/* Primary Details card: Name, Number|Type, Address, Phase|Section|Line Item */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 truncate">
              {project.name || project.projectName || 'Project Profile'}
            </h1>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-base font-bold text-gray-900">{String(project.projectNumber || project.id || '').padStart(5, '0')}</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-700">{formatProjectType(project.projectType) || project.jobType || 'Project'}</span>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Address</div>
                {!isEditingAddress && (
                  <button
                    onClick={handleEditAddress}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
              {isEditingAddress ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editFormData.address}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full address..."
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
              <div className="mt-1 text-sm text-gray-900">{formatAddress(getProjectAddress(project))}</div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center">
                <span className="text-gray-500 font-medium text-[10px] uppercase tracking-wide w-12 flex-shrink-0">Phase:</span>
                <span className="text-gray-900 font-medium ml-1 truncate">{WorkflowProgressService.getPhaseName(project.currentWorkflowItem?.phase || WorkflowProgressService.getProjectPhase(project))}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 font-medium text-[10px] uppercase tracking-wide w-14 flex-shrink-0">Section:</span>
                <span className="text-gray-900 font-medium ml-1 truncate">
                  {(() => {
                    // Get section from the correct database field
                    if (project.currentWorkflowItem?.sectionDisplayName) {
                      return project.currentWorkflowItem.sectionDisplayName;
                    }
                    if (project.currentWorkflowItem?.sectionName) {
                      return project.currentWorkflowItem.sectionName;
                    }
                    if (project.currentWorkflowItem?.section) {
                      return project.currentWorkflowItem.section;
                    }
                    return 'Not Available';
                  })()}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 font-medium text-[10px] uppercase tracking-wide w-16 flex-shrink-0">Line Item:</span>
                <button
                  onClick={async () => {
                    if (!onProjectSelect) return;
                    try {
                      console.log('🎯 PROJECT PROFILE: Getting project position for workflow navigation');
                      
                      // Get project position data for proper targeting (same as working sections)
                      const positionResponse = await fetch(`/api/workflow-data/project-position/${project.id}`, {
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                        }
                      });
                      
                      if (positionResponse.ok) {
                        const positionResult = await positionResponse.json();
                        if (positionResult.success && positionResult.data) {
                          const position = positionResult.data;
                          console.log('🎯 PROJECT PROFILE: Project position data:', position);
                          
                          if (position.currentPhase && position.currentSection) {
                            // Get subtask index and DB phase id for precise targeting
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
                                    // Find the current phase by phase type (LEAD, PROSPECT, etc.)
                                    const currentPhaseData = workflowResult.data.find(phase => phase.phaseType === position.currentPhase);
                                    if (currentPhaseData) {
                                      // Find the current section by ID
                                      const currentSectionData = currentPhaseData.items.find(item => item.id === position.currentSection);
                                      if (currentSectionData) {
                                        // Find the subtask index by matching the current DB id or name
                                        const subtaskIndex = currentSectionData.subtasks.findIndex(subtask => {
                                          if (typeof subtask === 'object') {
                                            return subtask.id === position.currentLineItem || subtask.label === position.currentLineItemName;
                                          }
                                          return subtask === position.currentLineItemName;
                                        });
                                        return { subtaskIndex: subtaskIndex >= 0 ? subtaskIndex : 0, phaseId: currentPhaseData.id };
                                      }
                                    }
                                  }
                                }
                              } catch (error) {
                                console.warn('Could not determine subtask index:', error);
                              }
                              return { subtaskIndex: 0, phaseId: null }; // Default fallback
                            };
                            
                            const { subtaskIndex, phaseId } = await getSubtaskIndex();
                            const phaseName = position.currentPhase || 'LEAD';
                            const sectionName = position.currentSectionName || position.currentSection || 'Unknown Section';
                            const lineItemName = project.currentWorkflowItem?.lineItemName || project.currentWorkflowItem?.lineItem || project.currentWorkflowItem?.itemName || position.currentLineItemName || 'Unknown Item';
                            
                            // Prefer DB line item id; otherwise construct composite id using DB phaseId for DOM match
                            const compositeId = phaseId != null ? `${phaseId}-${position.currentSection}-${subtaskIndex}` : null;
                            const targetLineItemId = position.currentLineItemId || compositeId || position.currentLineItem || `${phaseName}-${sectionName}-0`;
                            const targetSectionId = position.currentSectionId || position.currentSection || (sectionName ? sectionName.toLowerCase().replace(/\s+/g, '-') : '');
                            
                            console.log('🎯 PROJECT PROFILE: Generated targetLineItemId:', targetLineItemId);
                            console.log('🎯 PROJECT PROFILE: Generated targetSectionId:', targetSectionId);

                            const projectWithNavigation = {
                              ...project,
                              highlightStep: lineItemName,
                              highlightLineItem: lineItemName,
                              targetPhase: phaseName,
                              targetSection: sectionName,
                              targetLineItem: lineItemName,
                              scrollToCurrentLineItem: true,
                              navigationTarget: {
                                phase: phaseName,
                                section: sectionName,
                                lineItem: lineItemName,
                                stepName: lineItemName,
                                lineItemId: targetLineItemId,
                                workflowId: position.workflowId,
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

                            onProjectSelect(projectWithNavigation, 'Project Workflow', null, 'Project Profile', targetLineItemId, targetSectionId);
                          } else {
                            console.warn('No project position data found, using fallback navigation');
                            // Fallback navigation with basic targeting
                            const phaseName = project.currentWorkflowItem?.phase || 'LEAD';
                            const sectionName = project.currentWorkflowItem?.section || 'Unknown Section';
                            const lineItemName = project.currentWorkflowItem?.lineItemName || project.currentWorkflowItem?.lineItem || project.currentWorkflowItem?.itemName || 'Unknown Item';
                            const targetLineItemId = `${phaseName}-${sectionName}-0`;
                            const targetSectionId = sectionName.toLowerCase().replace(/\s+/g, '-');
                            const projectWithNavigation = {
                              ...project,
                              highlightStep: lineItemName,
                              highlightLineItem: lineItemName,
                              targetPhase: phaseName,
                              targetSection: sectionName,
                              targetLineItem: lineItemName,
                              scrollToCurrentLineItem: true,
                              navigationTarget: {
                                phase: phaseName,
                                section: sectionName,
                                lineItem: lineItemName,
                                stepName: lineItemName,
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
                            onProjectSelect(projectWithNavigation, 'Project Workflow', null, 'Project Profile', targetLineItemId, targetSectionId);
                          }
                        } else {
                          console.error('Failed to get project position, using fallback navigation');
                          // Fallback navigation
                          const phaseName = project.currentWorkflowItem?.phase || 'LEAD';
                          const sectionName = project.currentWorkflowItem?.section || 'Unknown Section';
                          const lineItemName = project.currentWorkflowItem?.lineItemName || project.currentWorkflowItem?.lineItem || project.currentWorkflowItem?.itemName || 'Unknown Item';
                          const targetLineItemId = `${phaseName}-${sectionName}-0`;
                          const targetSectionId = sectionName.toLowerCase().replace(/\s+/g, '-');
                          const projectWithNavigation = {
                            ...project,
                            highlightStep: lineItemName,
                            highlightLineItem: lineItemName,
                            targetPhase: phaseName,
                            targetSection: sectionName,
                            targetLineItem: lineItemName,
                            scrollToCurrentLineItem: true,
                            navigationTarget: {
                              phase: phaseName,
                              section: sectionName,
                              lineItem: lineItemName,
                              stepName: lineItemName,
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
                          onProjectSelect(projectWithNavigation, 'Project Workflow', null, 'Project Profile', targetLineItemId, targetSectionId);
                        }
                      } else {
                        console.error('Failed to get project position, using fallback navigation');
                        // Fallback navigation
                        const phaseName = project.currentWorkflowItem?.phase || 'LEAD';
                        const sectionName = project.currentWorkflowItem?.section || 'Unknown Section';
                        const lineItemName = project.currentWorkflowItem?.lineItemName || project.currentWorkflowItem?.lineItem || project.currentWorkflowItem?.itemName || 'Unknown Item';
                        const targetLineItemId = `${phaseName}-${sectionName}-0`;
                        const targetSectionId = sectionName.toLowerCase().replace(/\s+/g, '-');
                        const projectWithNavigation = {
                          ...project,
                          highlightStep: lineItemName,
                          highlightLineItem: lineItemName,
                          targetPhase: phaseName,
                          targetSection: sectionName,
                          targetLineItem: lineItemName,
                          scrollToCurrentLineItem: true,
                          navigationTarget: {
                            phase: phaseName,
                            section: sectionName,
                            lineItem: lineItemName,
                            stepName: lineItemName,
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
                        onProjectSelect(projectWithNavigation, 'Project Workflow', null, 'Project Profile', targetLineItemId, targetSectionId);
                      }
                    } catch (error) {
                      console.error('Error in Project Profile line item navigation:', error);
                      // Fallback navigation
                      const phaseName = project.currentWorkflowItem?.phase || 'LEAD';
                      const sectionName = project.currentWorkflowItem?.section || 'Unknown Section';
                      const lineItemName = project.currentWorkflowItem?.lineItemName || project.currentWorkflowItem?.lineItem || project.currentWorkflowItem?.itemName || 'Unknown Item';
                      const targetLineItemId = `${phaseName}-${sectionName}-0`;
                      const targetSectionId = sectionName.toLowerCase().replace(/\s+/g, '-');
                      const projectWithNavigation = {
                        ...project,
                        highlightStep: lineItemName,
                        highlightLineItem: lineItemName,
                        targetPhase: phaseName,
                        targetSection: sectionName,
                        targetLineItem: lineItemName,
                        scrollToCurrentLineItem: true,
                        navigationTarget: {
                          phase: phaseName,
                          section: sectionName,
                          lineItem: lineItemName,
                          stepName: lineItemName,
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
                      onProjectSelect(projectWithNavigation, 'Project Workflow', null, 'Project Profile', targetLineItemId, targetSectionId);
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline ml-1 truncate text-left flex-1"
                >
                  {(() => {
                    // Get line item from the correct database field
                    if (project.currentWorkflowItem?.lineItemName) {
                      return project.currentWorkflowItem.lineItemName;
                    }
                    if (project.currentWorkflowItem?.lineItem) {
                      return project.currentWorkflowItem.lineItem;
                    }
                    if (project.currentWorkflowItem?.itemName) {
                      return project.currentWorkflowItem.itemName;
                    }
                    return 'View Workflow';
                  })()}
                </button>
              </div>
            </div>
            
            {/* Edit Contact Information Form */}
            {isEditingContact && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Edit Contact Information</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Primary Customer */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Primary Customer</h5>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editFormData.customerName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder="Customer Name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="tel"
                        value={editFormData.customerPhone}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                        placeholder="Phone Number"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="email"
                        value={editFormData.customerEmail}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                        placeholder="Email Address"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                                     {/* Project Manager */}
                   <div className="space-y-3">
                     <h5 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Project Manager</h5>
                     <div className="space-y-2">
                       <select
                         value={editFormData.pmId}
                         onChange={(e) => {
                           const selectedUser = users.find(user => user.id.toString() === e.target.value);
                           setEditFormData(prev => ({
                             ...prev,
                             pmId: e.target.value,
                             pmName: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : '',
                             pmEmail: selectedUser?.email || '',
                             pmPhone: selectedUser?.phone || ''
                           }));
                         }}
                         className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                         disabled={usersLoading}
                       >
                         <option value="">
                           {usersLoading ? '⏳ Loading users...' : '👤 Select Project Manager'}
                         </option>
                         {users.map(user => (
                           <option key={user.id} value={user.id}>
                             {user.firstName} {user.lastName} ({user.role || 'No role'})
                           </option>
                         ))}
                       </select>
                       <input
                         type="tel"
                         value={editFormData.pmPhone}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, pmPhone: e.target.value }))}
                         placeholder="Phone Number (Optional)"
                         className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       />
                       <input
                         type="email"
                         value={editFormData.pmEmail}
                         onChange={(e) => setEditFormData(prev => ({ ...prev, pmEmail: e.target.value }))}
                         placeholder="Email Address (Optional)"
                         className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       />
                     </div>
                   </div>
                </div>
                
                {/* Secondary Contact */}
                <div className="mt-6 space-y-3">
                  <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Secondary Contact (Optional)</h5>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={editFormData.secondaryName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, secondaryName: e.target.value }))}
                      placeholder="Secondary Contact Name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      value={editFormData.secondaryPhone}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, secondaryPhone: e.target.value }))}
                      placeholder="Phone Number"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      value={editFormData.secondaryEmail}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, secondaryEmail: e.target.value }))}
                      placeholder="Email Address"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 text-sm font-medium"
                  >
                    Cancel
                </button>
              </div>
            </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              {!isEditingContact && (
                <button
                  onClick={handleEditContact}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Primary Customer</div>
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900 text-lg">
                      {project.customer?.primaryName || project.customer?.name || project.clientName || 'Not Available'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-medium">{project.customer?.primaryPhone ? formatPhoneNumber(project.customer.primaryPhone) : 'Not Available'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{project.customer?.primaryEmail || 'Not Available'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                  <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Project Manager</div>
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900 text-lg">
                      {project.projectManager?.firstName || project.projectManager?.lastName
                        ? `${project.projectManager?.firstName || ''} ${project.projectManager?.lastName || ''}`.trim()
                        : project.projectManager?.name || 'Not Available'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-medium">{project.projectManager?.phone ? formatPhoneNumber(project.projectManager.phone) : 'Not Available'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{project.projectManager?.email || 'Not Available'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {(project.customer?.secondaryName || project.customer?.secondaryPhone || project.customer?.secondaryEmail) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="border-l-4 border-gray-400 bg-gray-50 p-4 rounded-r-lg">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Secondary Contact</div>
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900">
                      {project.customer?.secondaryName || 'Not Available'}
                    </div>
                    {project.customer?.secondaryPhone && (
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="font-medium">{formatPhoneNumber(project.customer.secondaryPhone)}</span>
                        </div>
                      </div>
                    )}
                    {project.customer?.secondaryEmail && (
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">{project.customer.secondaryEmail}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Progress + Project Manager */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:min-h-[420px]">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Project Progress</h3>
            {(() => {
              const trades = getProjectTrades(project);
              const overall = Math.round(trades.reduce((s,t)=> s + (t.laborProgress||0), 0) / (trades.length||1));
              return (
                <div className={`rounded-lg transition-all duration-300 relative ${colorMode ? 'bg-slate-700/20 border border-slate-600/30' : 'bg-gray-50/90 border border-gray-200/50'}`}>
                  <button
                    onClick={() => setProgressExpanded(!progressExpanded)}
                    className={`w-full text-left transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'} rounded p-2`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Overall Project Progress</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{overall}%</span>
                        <svg className={`w-3 h-3 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${progressExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                      <div className="bg-brand-500 h-2 rounded-full transition-all duration-500" style={{ width: `${overall}%` }}></div>
                    </div>
                  </button>
                  <div className="px-2 pb-2">
                    {progressExpanded && (
                      <div className="space-y-2 mt-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Materials Progress</span>
                            <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round((trades.filter(t=>t.materialsDelivered).length / trades.length) * 100)}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.round((trades.filter(t=>t.materialsDelivered).length / trades.length) * 100)}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Labor Progress</span>
                            <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{overall}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            <div className="bg-orange-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${overall}%` }}></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {trades.map((trade, idx) => {
                            const colors = ['bg-purple-500','bg-pink-500','bg-yellow-500','bg-teal-500','bg-red-500','bg-indigo-500','bg-cyan-500','bg-amber-500','bg-lime-500','bg-fuchsia-500'];
                            const barColor = colors[idx % colors.length];
                            return (
                              <div key={idx}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`${colorMode ? 'text-white' : 'text-gray-800'} text-[11px] font-semibold truncate`}>{trade.name}</span>
                                  <span className={`${colorMode ? 'text-white' : 'text-gray-800'} text-[11px] font-bold`}>{trade.laborProgress}%</span>
                                </div>
                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                  <div className={`${barColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${trade.laborProgress}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ProjectProfileTab;