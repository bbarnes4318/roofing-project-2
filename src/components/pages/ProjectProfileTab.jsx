import React, { useState, useEffect, useRef } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import WorkflowProgressService from '../../services/workflowProgress';
import api, { projectsService, customersService, documentsService, API_BASE_URL, API_ORIGIN } from '../../services/api';
import { documentService } from '../../services/documentService';
// import { assetsService } from '../../services/assetsService'; // Commented out - service doesn't exist
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';
import WorkflowDataService from '../../services/workflowDataService';
import toast from 'react-hot-toast';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon, 
  UserIcon, 
  UserGroupIcon, 
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XCircleIcon
} from '../common/Icons';

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
        const { usersService } = await import('../../services/api');
        const result = await usersService.getTeamMembers();
        const teamMembers = Array.isArray(result?.data?.teamMembers) ? result.data.teamMembers : [];
        if (teamMembers.length > 0) {
          setUsers(teamMembers);
        } else {
          // Fallback to mock users if API returns empty
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

        const custResp = await customersService.update(project.customer.id, customerUpdateData);
        if (!custResp?.success) {
          throw new Error(custResp?.message || 'Customer update failed');
        }
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

      const projResp = await projectsService.update(project.id, projectUpdateData);
      if (!projResp?.success) {
        throw new Error(projResp?.message || 'Project update failed');
      }
      
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
      const msg = error?.response?.data?.message || error?.message || 'Failed to update project information. Please try again.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">ðŸ“‹</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-500">Please select a project to view its profile information.</p>
        </div>
      </div>
    );
  }

  // Compact Header Section
  const HeaderSection = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        {/* Left: Number, Name */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold text-blue-700">
            {String(project.projectNumber || project.id || '')}
          </span>
          <h1 className="text-base font-semibold text-gray-900 truncate">
              {project.projectName || project.name || 'Project Profile'}
            </h1>
          </div>
        {/* Right: Type */}
          {project.projectType && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getProjectTypeColor(project.projectType)}`}>
                {formatProjectType(project.projectType)}
              </span>
          )}
        </div>
      {/* Address in single row */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-700 truncate">
        <MapPinIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
              {!isEditingAddress ? (
          <div className="flex items-center gap-2 min-w-0 w-full">
            <span className="truncate">
                    {(project.address || project.customer?.address || 'Address not provided').trim()}
                  </span>
                  <button
                    onClick={handleEditAddress}
              className="px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            >Edit</button>
                </div>
              ) : (
          <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Project address"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      try {
                        if (project.customer?.id) {
                          await customersService.update(project.customer.id, { address: editFormData.address });
                        } else {
                          await projectsService.update(project.id, { address: editFormData.address });
                        }
                        setIsEditingAddress(false);
                        toast.success('Address updated successfully!');
                      } catch (error) {
                        console.error('Error updating address:', error);
                        toast.error('Failed to update address');
                      }
                    }}
              className="px-2 py-1 text-[11px] bg-[var(--color-primary-blueprint-blue)] text-white rounded hover:bg-blue-700"
            >Save</button>
                  <button
              onClick={() => { setIsEditingAddress(false); setEditFormData(prev => ({ ...prev, address: project.customer?.address || project.address || '' })); }}
              className="px-2 py-1 text-[11px] bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >Cancel</button>
                </div>
              )}
      </div>
    </div>
  );

  // Workflow Navigation Section
  const WorkflowNavigation = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Phase</span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-800">
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary-blueprint-blue)]"></div>
            {WorkflowProgressService.getPhaseName(project.currentWorkflowItem?.phase || WorkflowProgressService.getProjectPhase(project))}
          </span>
        </div>
        
        <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Section</span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800">
            <div className="w-2 h-2 rounded-full bg-gray-600"></div>
            {(() => {
              const cw = project.currentWorkflowItem;
              if (cw?.sectionDisplayName) return cw.sectionDisplayName;
              if (cw?.sectionName) return cw.sectionName;
              if (cw?.section) return cw.section;
              return 'Not Available';
            })()}
          </span>
        </div>
        
        <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Line Item</span>
          <button
            onClick={async () => {
              if (!onProjectSelect) {
                console.error('ðŸŽ¯ LINE ITEM CLICKED! onProjectSelect is not available');
                toast.error('Navigation failed: onProjectSelect not available');
                return;
              }
              
              try {
                console.log('ðŸŽ¯ PROJECT PROFILE TAB: Line item clicked for project:', project.id);
                
                const cw = project?.currentWorkflowItem;
                const currentLineItem = WorkflowDataService.getCurrentLineItem(project);
                const currentSection = cw?.sectionId || cw?.section || WorkflowDataService.getCurrentSection(project);
                const currentPhase = cw?.phase || WorkflowProgressService.getProjectPhase(project) || 'LEAD';
                
                let targetLineItemId = currentLineItem?.id || `${currentPhase}-${currentSection}-0`;
                let targetSectionId = typeof currentSection === 'string' ? currentSection.toLowerCase().replace(/\s+/g, '-') : (currentSection || '');
                
                try {
                  const positionResponse = await fetch(`/api/workflow-data/project-position/${project.id}`, {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
                    }
                  });
                  
                  if (positionResponse.ok) {
                    const positionResult = await positionResponse.json();
                    if (positionResult.success && positionResult.data) {
                      const position = positionResult.data;
                      if (position.currentLineItemId) {
                        targetLineItemId = position.currentLineItemId;
                      }
                      if (position.currentSectionId) {
                        targetSectionId = position.currentSectionId;
                      }
                    }
                  }
                } catch (positionError) {
                  console.warn('ðŸŽ¯ PROJECT PROFILE TAB: Could not fetch position data, using fallback:', positionError);
                }
                
                const projectWithNavigation = {
                  ...project,
                  navigationSource: 'Project Profile Tab',
                  returnToSection: 'project-profile',
                  highlightStep: currentLineItem?.name || 'Line Item',
                  highlightLineItem: currentLineItem?.name || 'Line Item',
                  targetPhase: currentPhase,
                  targetSection: currentSection,
                  targetLineItem: currentLineItem?.name || 'Line Item',
                  scrollToCurrentLineItem: true,
                  navigationTarget: {
                    phase: currentPhase,
                    section: currentSection,
                    lineItem: currentLineItem?.name || 'Line Item',
                    stepName: currentLineItem?.name || 'Line Item',
                    lineItemId: targetLineItemId,
                    highlightMode: 'line-item',
                    scrollBehavior: 'smooth',
                    targetElementId: `lineitem-${targetLineItemId}`,
                    highlightColor: '#0066CC',
                    highlightDuration: 3000,
                    targetSectionId: targetSectionId,
                    expandPhase: true,
                    expandSection: true,
                    autoOpen: true,
                    scrollAndHighlight: true,
                    nonce: Date.now()
                  }
                };
                
                onProjectSelect(
                  projectWithNavigation, 
                  'Project Workflow', 
                  null, 
                  'Project Profile', 
                  targetLineItemId, 
                  targetSectionId
                );
                
              } catch (error) {
                console.error('ðŸŽ¯ PROJECT PROFILE TAB: Error navigating to workflow:', error);
                const fallbackProject = {
                  ...project,
                  navigationSource: 'Project Profile Tab (Fallback)',
                  returnToSection: 'project-profile'
                };
                onProjectSelect(fallbackProject, 'Project Workflow', null, 'Project Profile');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <div className="w-2 h-2 rounded-full bg-white"></div>
            {(() => {
              const cw = project.currentWorkflowItem;
              if (cw?.lineItemDisplayName) return cw.lineItemDisplayName;
              if (cw?.lineItemName) return cw.lineItemName;
              if (cw?.lineItem) return cw.lineItem;
              return 'View Workflow';
            })()}
          </button>
        </div>
      </div>
    </div>
  );

  // Compact Customer Information Panel (Primary + Secondary)
  const ContactCards = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Customer Information</h3>
          </div>
          {!isEditingContact && (
          <button onClick={handleEditContact} className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded">
              Edit
            </button>
          )}
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Primary */}
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">Primary</div>
          <div className="text-gray-800">{project.customer?.primaryName || project.customer?.name || 'Not Available'}</div>
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-3 h-3 text-green-600" />
            <a href={`tel:${(project.customer?.primaryPhone || '').replace(/[^\d+]/g, '')}`} className="text-gray-700 hover:text-blue-600">
              {project.customer?.primaryPhone ? formatPhoneNumber(project.customer.primaryPhone) : 'Not Available'}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-3 h-3 text-blue-600" />
            <a href={`mailto:${project.customer?.primaryEmail || ''}`} className="text-gray-700 hover:text-blue-600">
              {project.customer?.primaryEmail || 'Not Available'}
            </a>
          </div>
        </div>
        {/* Secondary */}
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">Secondary</div>
          <div className="text-gray-800">{project.customer?.secondaryName || 'Not Provided'}</div>
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-3 h-3 text-green-600" />
            {project.customer?.secondaryPhone ? (
              <a href={`tel:${project.customer.secondaryPhone.replace(/[^\d+]/g, '')}`} className="text-gray-700 hover:text-blue-600">
                {formatPhoneNumber(project.customer.secondaryPhone)}
              </a>
            ) : (
              <span className="text-gray-500">Not Provided</span>
            )}
            </div>
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-3 h-3 text-blue-600" />
            {project.customer?.secondaryEmail ? (
              <a href={`mailto:${project.customer.secondaryEmail}`} className="text-gray-700 hover:text-blue-600">
                {project.customer.secondaryEmail}
              </a>
            ) : (
              <span className="text-gray-500">Not Provided</span>
          )}
        </div>
      </div>
      </div>
      <EditContactForm />
    </div>
  );

  // Secondary Contact Card
  const SecondaryContactCard = () => {
    const hasSecondaryContact = project.customer?.secondaryName || project.customer?.secondaryPhone || project.customer?.secondaryEmail;
    
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Secondary Contact</h3>
              <p className="text-sm text-gray-600">Additional contact person</p>
            </div>
          </div>
          {!hasSecondaryContact && !isEditingContact && (
            <button
              onClick={() => setIsEditingContact(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Contact
            </button>
          )}
        </div>
        
        {hasSecondaryContact ? (
          <div className="space-y-3">
            {project.customer?.secondaryName && (
              <div className="font-semibold text-gray-900 text-lg">
                {project.customer.secondaryName}
              </div>
            )}
            
            {project.customer?.secondaryPhone && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="w-4 h-4 text-green-600" />
                <a 
                  href={`tel:${project.customer.secondaryPhone.replace(/[^\d+]/g, '')}`}
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {formatPhoneNumber(project.customer.secondaryPhone)}
                </a>
              </div>
            )}
            
            {project.customer?.secondaryEmail && (
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                <a 
                  href={`mailto:${project.customer.secondaryEmail}`}
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {project.customer.secondaryEmail}
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">ðŸ‘¤</div>
            <p className="text-gray-500">No secondary contact added</p>
          </div>
        )}
      </div>
    );
  };

  // Modern Progress Chart
  const ProgressChart = () => {
    const trades = getProjectTrades(project);
    const overall = Math.round(trades.reduce((s,t)=> s + (t.laborProgress||0), 0) / (trades.length||1));
    const materialsProgress = Math.round((trades.filter(t=>t.materialsDelivered).length / trades.length) * 100);
    
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 leading-5">Project Progress</h3>
            </div>
          </div>
          {/* Integrated PM info */}
          <div className="text-right text-xs text-gray-700 w-56 overflow-hidden">
            <div className="font-semibold truncate" title={(project.projectManager?.firstName && project.projectManager?.lastName)
                ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
                : (project.projectManager?.name || 'PM: Not Assigned')}>
              {(project.projectManager?.firstName && project.projectManager?.lastName)
                ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
                : (project.projectManager?.name || 'PM: Not Assigned')}
            </div>
            {project.projectManager?.email && (
              <div className="truncate" title={project.projectManager.email}>{project.projectManager.email}</div>
            )}
            {project.projectManager?.phone && (
              <div className="truncate" title={project.projectManager.phone}>{formatPhoneNumber(project.projectManager.phone)}</div>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Overall Progress</span>
            <span className="text-xs font-bold text-gray-900">{overall}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                overall === 100 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}
              style={{ width: `${overall}%` }}
            >
              {overall > 15 && (
                <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* Materials Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Materials Delivered</span>
            <span className="text-xs font-bold text-gray-900">{materialsProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${materialsProgress}%` }}
            />
          </div>
        </div>

        {/* Trade Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Trade Breakdown</span>
            <button
              onClick={() => setProgressExpanded(!progressExpanded)}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {progressExpanded ? (
                <>
                  <span>Hide Details</span>
                  <ChevronUpIcon className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Show Details</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          
          {progressExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              {trades.map((trade, idx) => {
                const colors = [
                  'from-purple-500 to-purple-600',
                  'from-pink-500 to-pink-600', 
                  'from-yellow-500 to-yellow-600',
                  'from-teal-500 to-teal-600',
                  'from-red-500 to-red-600',
                  'from-indigo-500 to-indigo-600',
                  'from-cyan-500 to-cyan-600',
                  'from-amber-500 to-amber-600',
                  'from-lime-500 to-lime-600',
                  'from-fuchsia-500 to-fuchsia-600'
                ];
                const gradientClass = colors[idx % colors.length];
                
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate">{trade.name}</span>
                      <span className="text-sm font-bold text-gray-900">{trade.laborProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-500`}
                        style={{ width: `${trade.laborProgress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Documents Panel (compact table)
  const DocumentsPanel = () => {
    const [docs, setDocs] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [docsError, setDocsError] = useState('');
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
      let cancelled = false;
      const load = async () => {
        if (!project?.id) return;
        try {
          setDocsLoading(true); setDocsError('');
          const res = await documentsService.getByProject(project.id);
          if (cancelled) return;
          setDocs(Array.isArray(res?.data?.documents) ? res.data.documents : []);
        } catch (e) {
          if (!cancelled) setDocsError(e.message || 'Failed to load documents');
        } finally {
          if (!cancelled) setDocsLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [project?.id]);

    // Upload handler - uploads to BOTH Document table AND CompanyAssets for sync
    const handleUpload = async () => {
      if (selectedFiles.length === 0 || !project?.id) return;

      setUploading(true);
      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('projectId', project.id);
        formData.append('description', 'Uploaded from Project Profile');
        formData.append('fileType', 'OTHER');
        formData.append('isPublic', 'false');

        await documentService.uploadDocument(formData);
        toast.success('Documents uploaded successfully!');
        setUploadModalOpen(false);
        setSelectedFiles([]);
        // Reload documents
        const res = await documentsService.getByProject(project.id);
        setDocs(Array.isArray(res?.data?.documents) ? res.data.documents : []);
      } catch (error) {
        toast.error(`Upload failed: ${error.message}`);
      } finally {
        setUploading(false);
      }
    };

    // Helpers
    const formatBytes = (bytes) => {
      const n = parseInt(bytes, 10) || 0;
      if (n < 1024) return `${n} B`;
      const kb = n / 1024;
      if (kb < 1024) return `${Math.round(kb)} KB`;
      const mb = kb / 1024;
      return `${mb.toFixed(1)} MB`;
    };

    // Shared column template to align header and rows
    const gridTemplate = 'minmax(240px,1fr) 140px 90px 120px 160px';
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-soft mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <CloudArrowUpIcon className="w-4 h-4" />
            Upload
          </button>
        </div>
        {docsError && <div className="text-xs text-red-600 mb-2">{docsError}</div>}
        {docsLoading ? (
          <div className="text-xs text-gray-600">Loadingâ€¦</div>
        ) : docs.length === 0 ? (
          <div className="text-xs text-gray-500">No documents yet</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[780px] grid gap-2 items-center px-2 py-1 border-b text-[11px] text-gray-500" style={{ gridTemplateColumns: gridTemplate }}>
              <div>Name</div>
              <div>Type</div>
              <div>Size</div>
              <div>Uploaded</div>
              <div className="text-right pr-1">Actions</div>
            </div>
            {docs.map(d => (
              <div key={d.id} className="min-w-[780px] grid gap-2 items-center px-2 py-2 border-b text-xs" style={{ gridTemplateColumns: gridTemplate }}>
                <a href={`${API_ORIGIN}${d.fileUrl}`} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline whitespace-nowrap overflow-hidden text-ellipsis" title={d.originalName || d.fileName}>{d.originalName || d.fileName}</a>
                <div className="text-gray-700 truncate" title={d.mimeType || d.fileType}>{d.mimeType || d.fileType}</div>
                <div className="text-gray-700">{formatBytes(d.fileSize)}</div>
                <div className="text-gray-700">{new Date(d.createdAt || d.updatedAt || Date.now()).toLocaleDateString()}</div>
                <div className="text-right space-x-3">
                  <a href={`${API_ORIGIN}${d.fileUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Preview</a>
                  <a href={`${API_ORIGIN}${d.fileUrl}`} target="_blank" rel="noreferrer" download className="text-blue-600 hover:underline">Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
                <button
                  onClick={() => { setUploadModalOpen(false); setSelectedFiles([]); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Select Files</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition"
                  >
                    <CloudArrowUpIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to select files</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, XLS, images, and more</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="text-xs text-gray-600">
                          {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => { setUploadModalOpen(false); setSelectedFiles([]); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={selectedFiles.length === 0 || uploading}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                      selectedFiles.length === 0 || uploading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {uploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Edit Contact Form Modal
  const EditContactForm = () => {
    if (!isEditingContact) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Edit Contact Information</h3>
            <button
              onClick={handleCancelEdit}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Primary Customer */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-blue-700 border-b border-blue-200 pb-2">Primary Customer</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={editFormData.customerName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Customer Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  value={editFormData.customerPhone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="Phone Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="email"
                  value={editFormData.customerEmail}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="Email Address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Project Manager */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-purple-700 border-b border-purple-200 pb-2">Project Manager</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={usersLoading}
                >
                  <option value="">
                    {usersLoading ? 'â³ Loading users...' : 'ðŸ‘¤ Select Project Manager'}
                  </option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={editFormData.pmPhone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, pmPhone: e.target.value }))}
                  placeholder="Phone Number (Optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="email"
                  value={editFormData.pmEmail}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, pmEmail: e.target.value }))}
                  placeholder="Email Address (Optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Secondary Contact */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-600 border-b border-gray-200 pb-2">Secondary Contact (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={editFormData.secondaryName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, secondaryName: e.target.value }))}
                  placeholder="Secondary Contact Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  value={editFormData.secondaryPhone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, secondaryPhone: e.target.value }))}
                  placeholder="Phone Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="email"
                  value={editFormData.secondaryEmail}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, secondaryEmail: e.target.value }))}
                  placeholder="Email Address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Subcontractors Panel Component
  const SubcontractorsPanel = () => {
    const subcontractors = project.teamMembers?.filter(member => member.role === 'SUBCONTRACTOR') || [];

    if (subcontractors.length === 0) {
      return null; // Don't show panel if no subcontractors
    }

    return (
      <div className={`rounded-lg shadow-sm border p-4 ${
        colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔨</span>
          <h3 className={`text-sm font-semibold ${
            colorMode ? 'text-orange-300' : 'text-orange-700'
          }`}>
            Subcontractors ({subcontractors.length})
          </h3>
        </div>
        <div className="space-y-2">
          {subcontractors.map((member, index) => (
            <div
              key={member.id || index}
              className={`flex items-center gap-2 p-2 rounded ${
                colorMode ? 'bg-orange-900/20' : 'bg-orange-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                colorMode ? 'bg-orange-700 text-orange-100' : 'bg-orange-200 text-orange-800'
              }`}>
                {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  colorMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  {member.user?.firstName} {member.user?.lastName}
                </div>
                {member.user?.email && (
                  <div className={`text-xs truncate ${
                    colorMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {member.user.email}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <HeaderSection />
      <WorkflowNavigation />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Compact customer + documents */}
        <div className="lg:col-span-2 space-y-4">
          <ContactCards />
          <DocumentsPanel />
        </div>
        {/* Right Column - Progress with PM and Subcontractors */}
        <div className="lg:col-span-1 space-y-4">
          <ProgressChart />
          <SubcontractorsPanel />
        </div>
      </div>
    </div>
  );
};

export default ProjectProfileTab;
