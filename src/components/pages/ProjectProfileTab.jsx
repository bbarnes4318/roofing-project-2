import React, { useState, useEffect, useRef } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import WorkflowProgressService from '../../services/workflowProgress';
import api, { projectsService, customersService } from '../../services/api';
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';
import WorkflowDataService from '../../services/workflowDataService';
import toast from 'react-hot-toast';
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
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-500">Please select a project to view its profile information.</p>
        </div>
      </div>
    );
  }

  // Modern Header Section
  const HeaderSection = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6 shadow-soft">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Project Title and Number */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {project.name || project.projectName || 'Project Profile'}
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800 border border-blue-200">
              #{String(project.projectNumber || project.id || '').padStart(5, '0')}
            </span>
          </div>
          
          {/* Project Type Badge */}
          {project.projectType && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getProjectTypeColor(project.projectType)}`}>
                {formatProjectType(project.projectType)}
              </span>
            </div>
          )}
        </div>

        {/* Address Section */}
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <MapPinIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-600 mb-1 block">Project Address</label>
              {!isEditingAddress ? (
                <div className="flex items-center gap-3">
                  <span className="text-gray-900 font-medium">
                    {(project.address || project.customer?.address || 'Address not provided').trim()}
                  </span>
                  <button
                    onClick={handleEditAddress}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <PencilIcon className="w-3 h-3" />
                    Edit
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingAddress(false);
                      setEditFormData(prev => ({ ...prev, address: project.customer?.address || project.address || '' }));
                    }}
                    className="px-3 py-2 text-xs font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
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
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
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
                console.error('🎯 LINE ITEM CLICKED! onProjectSelect is not available');
                toast.error('Navigation failed: onProjectSelect not available');
                return;
              }
              
              try {
                console.log('🎯 PROJECT PROFILE TAB: Line item clicked for project:', project.id);
                
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
                  console.warn('🎯 PROJECT PROFILE TAB: Could not fetch position data, using fallback:', positionError);
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
                console.error('🎯 PROJECT PROFILE TAB: Error navigating to workflow:', error);
                const fallbackProject = {
                  ...project,
                  navigationSource: 'Project Profile Tab (Fallback)',
                  returnToSection: 'project-profile'
                };
                onProjectSelect(fallbackProject, 'Project Workflow', null, 'Project Profile');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
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

  // Contact Information Cards
  const ContactCards = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Primary Customer Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Primary Customer</h3>
              <p className="text-sm text-gray-600">Main point of contact</p>
            </div>
          </div>
          {!isEditingContact && (
            <button
              onClick={handleEditContact}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="font-semibold text-gray-900 text-lg">
            {project.customer?.primaryName || project.customer?.name || 'Not Available'}
          </div>
          
          <div className="flex items-center gap-3">
            <PhoneIcon className="w-4 h-4 text-green-600" />
            <a 
              href={`tel:${(project.customer?.primaryPhone || '').replace(/[^\d+]/g, '')}`}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              {project.customer?.primaryPhone ? formatPhoneNumber(project.customer.primaryPhone) : 'Not Available'}
            </a>
          </div>
          
          <div className="flex items-center gap-3">
            <EnvelopeIcon className="w-4 h-4 text-blue-600" />
            <a 
              href={`mailto:${project.customer?.primaryEmail || ''}`}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              {project.customer?.primaryEmail || 'Not Available'}
            </a>
          </div>
        </div>
      </div>

      {/* Project Manager Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Project Manager</h3>
            <p className="text-sm text-gray-600">Project oversight</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="font-semibold text-gray-900 text-lg">
            {project.projectManager?.firstName && project.projectManager?.lastName
              ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
              : project.projectManager?.name || 'Not Assigned'}
          </div>
          
          {project.projectManager?.phone && (
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-4 h-4 text-green-600" />
              <a 
                href={`tel:${project.projectManager.phone.replace(/[^\d+]/g, '')}`}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {formatPhoneNumber(project.projectManager.phone)}
              </a>
            </div>
          )}
          
          {project.projectManager?.email && (
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-4 h-4 text-blue-600" />
              <a 
                href={`mailto:${project.projectManager.email}`}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {project.projectManager.email}
              </a>
            </div>
          )}
        </div>
      </div>
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
            <div className="text-gray-400 text-4xl mb-3">👤</div>
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Project Progress</h3>
              <p className="text-sm text-gray-600">Overall completion status</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{overall}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-gray-900">{overall}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Materials Delivered</span>
            <span className="text-sm font-bold text-gray-900">{materialsProgress}%</span>
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
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <HeaderSection />
      <WorkflowNavigation />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Contact Information */}
        <div className="xl:col-span-2 space-y-6">
          <ContactCards />
          <SecondaryContactCard />
        </div>
        
        {/* Right Column - Progress Chart */}
        <div className="xl:col-span-1">
          <ProgressChart />
        </div>
      </div>
      
      <EditContactForm />
    </div>
  );
};

export default ProjectProfileTab;