import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import WorkflowProgressService from '../../services/workflowProgress';
import api, { projectsService, customersService, documentsService, API_BASE_URL, API_ORIGIN } from '../../services/api';
import { documentService } from '../../services/documentService';
// import { assetsService } from '../../services/assetsService'; // Commented out - service doesn't exist
import { formatProjectType, getProjectTypeColor, getProjectTypeColorDark } from '../../utils/projectTypeFormatter';
import WorkflowDataService from '../../services/workflowDataService';
import toast from 'react-hot-toast';
import GoogleMapsAutocomplete from '../ui/GoogleMapsAutocomplete';
import DocumentViewerModal from '../ui/DocumentViewerModal';
import GoogleMapModal from '../ui/GoogleMapModal';
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
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [activeSection] = useState('overview');
  // Match Projects by Phase progress behavior (keyed expansion + visibility management)
  const progressChartRefs = useRef({});
  const [expandedProgress, setExpandedProgress] = useState({});
  const [progressExpanded, setProgressExpanded] = useState(false);

  // Document modal state
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  // Edit states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editFormData, setEditFormData] = useState({
    address: '',
    addressComponents: {}, // Store parsed address components
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    secondaryName: '',
    secondaryPhone: '',
    secondaryEmail: '',
    pmName: '',
    pmPhone: '',
    pmEmail: '',
    pmId: '',
    doublePull: false,
    petNames: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Family members state
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyMembersLoading, setFamilyMembersLoading] = useState(false);
  const [isAddingFamilyMember, setIsAddingFamilyMember] = useState(false);
  const [editingFamilyMemberId, setEditingFamilyMemberId] = useState(null);
  const [newFamilyMember, setNewFamilyMember] = useState({ name: '', relation: '', customRelation: '' });
  const [editFamilyMember, setEditFamilyMember] = useState({ name: '', relation: '', customRelation: '' });

  // Pets state
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [isAddingPet, setIsAddingPet] = useState(false);
  const [editingPetId, setEditingPetId] = useState(null);
  const [newPet, setNewPet] = useState({ name: '', type: '', customType: '', hasYardAccess: false });
  const [editPet, setEditPet] = useState({ name: '', type: '', customType: '', hasYardAccess: false });

  // Refs to maintain focus on inputs
  const nameInputRef = useRef(null);
  const editNameInputRef = useRef(null);
  const petNameInputRef = useRef(null);
  const editPetNameInputRef = useRef(null);

  // Focus input when adding/editing starts
  useEffect(() => {
    if (isAddingFamilyMember && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAddingFamilyMember]);

  useEffect(() => {
    if (editingFamilyMemberId && editNameInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        if (editNameInputRef.current) {
          editNameInputRef.current.focus();
        }
      }, 10);
    }
  }, [editingFamilyMemberId]);

  // Focus pet input when adding/editing starts
  useEffect(() => {
    if (isAddingPet && petNameInputRef.current) {
      petNameInputRef.current.focus();
    }
  }, [isAddingPet]);

  useEffect(() => {
    if (editingPetId && editPetNameInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        if (editPetNameInputRef.current) {
          editPetNameInputRef.current.focus();
        }
      }, 10);
    }
  }, [editingPetId]);

  // Relation options
  const relationOptions = ['Spouse', 'Grandma', 'Grandpa', 'Child', 'Significant Other'];

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

  // Load family members when project changes
  const loadFamilyMembers = useCallback(async () => {
    if (!project?.customer?.id) return;

    setFamilyMembersLoading(true);
    try {
      const response = await customersService.getFamilyMembers(project.customer.id);
      if (response?.success && Array.isArray(response.data)) {
        setFamilyMembers(response.data);
      } else {
        setFamilyMembers([]);
      }
    } catch (error) {
      console.error('Error loading family members:', error);
      setFamilyMembers([]);
    } finally {
      setFamilyMembersLoading(false);
    }
  }, [project?.customer?.id]);

  // Load pets when project changes
  const loadPets = useCallback(async () => {
    if (!project?.id) return;

    setPetsLoading(true);
    try {
      const response = await projectsService.getPets(project.id);
      if (response?.success && Array.isArray(response.data)) {
        setPets(response.data);
      } else {
        setPets([]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  }, [project?.id]);

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
    // Only load family members if we're not currently adding/editing one
    if (!isAddingFamilyMember && !editingFamilyMemberId) {
      loadFamilyMembers();
    }
    // Only load pets if we're not currently adding/editing one
    if (!isAddingPet && !editingPetId) {
      loadPets();
    }
  }, [project?.id, project?.customer?.id, isAddingFamilyMember, editingFamilyMemberId, isAddingPet, editingPetId, loadFamilyMembers, loadPets]);

  // Pet type options
  const petTypeOptions = ['Dog', 'Cat'];

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
        pmId: project.projectManager?.id || project.projectManagerId || '',
        doublePull: project.doublePull || false
      });
    }
  }, [project]);

  const handleEditAddress = () => {
    setEditFormData(prev => ({
      ...prev,
      address: project.address || project.customer?.address || '',
      addressComponents: {} // Reset address components
    }));
    setIsEditingAddress(true);
  };

  const handlePlaceSelect = (placeData) => {
    console.log('🔍 ADDRESS DEBUG: Place selected in ProjectProfileTab:', placeData);
    console.log('🔍 ADDRESS DEBUG: Address components:', placeData.addressComponents);

    setEditFormData(prev => ({
      ...prev,
      address: placeData.formattedAddress,
      addressComponents: placeData.addressComponents || {}
    }));
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
        pmId: project.projectManager?.id || project.projectManagerId || '',
        doublePull: project.doublePull || false,
        petNames: project.petNames || ''
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
        pmEmail: editFormData.pmEmail || null,
        doublePull: editFormData.doublePull || false,
        petNames: editFormData.petNames || null
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
        {/* Left: Number, Primary Customer Name */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold text-blue-700">
            {String(project.projectNumber || project.id || '')}
          </span>
          <h1 className="text-base font-semibold text-gray-900 truncate">
              {project.customer?.primaryName || project.customer?.name || 'Customer Name'}
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
            <button
              onClick={() => {
                const address = (project.address || project.customer?.address || '').trim();
                if (address) {
                  setIsMapModalOpen(true);
                }
              }}
              className="truncate text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
              title="Click to view map"
            >
              {(project.address || project.customer?.address || 'Address not provided').trim()}
            </button>
                  <button
                    onClick={handleEditAddress}
              className="px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            >Edit</button>
                </div>
              ) : (
          <div className="flex items-center gap-2 w-full">
                  <GoogleMapsAutocomplete
                    name="address"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                    onPlaceSelect={handlePlaceSelect}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Project address"
                    autoFocus
                  />

                  {/* Address Components Display */}
                  {editFormData.addressComponents && typeof editFormData.addressComponents === 'object' && Object.keys(editFormData.addressComponents).length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="text-blue-800 font-semibold mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Address Details
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {editFormData.addressComponents.street_number && editFormData.addressComponents.route && (
                          <div>
                            <span className="text-gray-600">Street: </span>
                            <span className="text-gray-800">{editFormData.addressComponents.street_number} {editFormData.addressComponents.route}</span>
                          </div>
                        )}
                        {editFormData.addressComponents.locality && (
                          <div>
                            <span className="text-gray-600">City: </span>
                            <span className="text-gray-800">{editFormData.addressComponents.locality}</span>
                          </div>
                        )}
                        {editFormData.addressComponents.administrative_area_level_1 && (
                          <div>
                            <span className="text-gray-600">State: </span>
                            <span className="text-gray-800">{editFormData.addressComponents.administrative_area_level_1}</span>
                          </div>
                        )}
                        {editFormData.addressComponents.postal_code && (
                          <div>
                            <span className="text-gray-600">ZIP: </span>
                            <span className="font-semibold text-blue-700">{editFormData.addressComponents.postal_code}</span>
                            <span className="font-semibold text-blue-700">{editFormData.addressComponents.postal_code}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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

      {/* Double Pull and Pet Names Section */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Double Pull */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="doublePull"
              checked={editFormData.doublePull}
              onChange={(e) => setEditFormData(prev => ({ ...prev, doublePull: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="doublePull" className="text-xs font-medium text-gray-700 cursor-pointer">
              Double Pull House (requires two ladders)
            </label>
          </div>

        </div>
        {/* Save button for Double Pull */}
        {(editFormData.doublePull !== (project.doublePull || false)) && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                try {
                  const updateData = {
                    doublePull: editFormData.doublePull
                  };
                  await projectsService.update(project.id, updateData);
                  toast.success('Project details updated successfully!');
                  // Refresh the project data if onUpdate callback exists
                  if (onProjectSelect && project) {
                    // Trigger a refresh by calling onProjectSelect with updated project
                    const updatedProject = { ...project, ...updateData };
                    onProjectSelect(updatedProject, 'Project Profile', null, 'Project Profile');
                  }
                } catch (error) {
                  console.error('Error updating project details:', error);
                  toast.error('Failed to update project details');
                }
              }}
              className="px-3 py-1.5 text-xs bg-[var(--color-primary-blueprint-blue)] text-white rounded hover:bg-blue-700 font-medium"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setEditFormData(prev => ({
                  ...prev,
                  doublePull: project.doublePull || false
                }));
              }}
              className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      </div>
      <EditContactForm />
    </div>
  );

  // Family Members Section
  const FamilyMembersSection = () => {
    const handleAddFamilyMember = async () => {
      if (!newFamilyMember.name.trim() || !newFamilyMember.relation.trim()) {
        toast.error('Please enter both name and relation');
        return;
      }

      if (!project?.customer?.id) {
        toast.error('Customer information not available');
        return;
      }

      try {
        const response = await customersService.createFamilyMember(project.customer.id, {
          name: newFamilyMember.name.trim(),
          relation: newFamilyMember.relation.trim()
        });

        if (response?.success) {
          toast.success('Family member added successfully');
          setNewFamilyMember({ name: '', relation: '', customRelation: '' });
          setIsAddingFamilyMember(false);
          loadFamilyMembers();
        } else {
          throw new Error(response?.message || 'Failed to add family member');
        }
      } catch (error) {
        console.error('Error adding family member:', error);
        toast.error(error.message || 'Failed to add family member');
      }
    };

    const handleUpdateFamilyMember = async (id) => {
      if (!editFamilyMember.name.trim() || !editFamilyMember.relation.trim()) {
        toast.error('Please enter both name and relation');
        return;
      }

      if (!project?.customer?.id) {
        toast.error('Customer information not available');
        return;
      }

      try {
        const response = await customersService.updateFamilyMember(project.customer.id, id, {
          name: editFamilyMember.name.trim(),
          relation: editFamilyMember.relation.trim()
        });

        if (response?.success) {
          toast.success('Family member updated successfully');
          setEditingFamilyMemberId(null);
          setEditFamilyMember({ name: '', relation: '', customRelation: '' });
          loadFamilyMembers();
        } else {
          throw new Error(response?.message || 'Failed to update family member');
        }
      } catch (error) {
        console.error('Error updating family member:', error);
        toast.error(error.message || 'Failed to update family member');
      }
    };

    const handleDeleteFamilyMember = async (id) => {
      if (!window.confirm('Are you sure you want to delete this family member?')) {
        return;
      }

      if (!project?.customer?.id) {
        toast.error('Customer information not available');
        return;
      }

      try {
        const response = await customersService.deleteFamilyMember(project.customer.id, id);

        if (response?.success) {
          toast.success('Family member deleted successfully');
          loadFamilyMembers();
        } else {
          throw new Error(response?.message || 'Failed to delete family member');
        }
      } catch (error) {
        console.error('Error deleting family member:', error);
        toast.error(error.message || 'Failed to delete family member');
      }
    };

    const startEditing = (member) => {
      setEditingFamilyMemberId(member.id);
      const isCustomRelation = !relationOptions.includes(member.relation);
      setEditFamilyMember({ 
        name: member.name, 
        relation: isCustomRelation ? 'Other' : member.relation,
        customRelation: isCustomRelation ? member.relation : ''
      });
    };

    const cancelEditing = () => {
      setEditingFamilyMemberId(null);
      setEditFamilyMember({ name: '', relation: '', customRelation: '' });
    };

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-soft mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Family Members</h3>
          </div>
          {!isAddingFamilyMember && (
            <button
              onClick={() => setIsAddingFamilyMember(true)}
              className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded flex items-center gap-1"
            >
              <PlusIcon className="w-3 h-3" />
              Add
            </button>
          )}
        </div>

        {/* Add Family Member Form */}
        {isAddingFamilyMember && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <input
                ref={nameInputRef}
                type="text"
                placeholder="Name"
                value={newFamilyMember.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewFamilyMember(prev => ({ ...prev, name: value }));
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex gap-1">
                <select
                  value={newFamilyMember.relation}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value && !relationOptions.includes(value)) {
                      // Custom relation entered via select (if we add an "Other" option)
                      setNewFamilyMember(prev => ({ ...prev, relation: value }));
                    } else {
                      setNewFamilyMember(prev => ({ ...prev, relation: value }));
                    }
                  }}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Relation</option>
                  {relationOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {newFamilyMember.relation === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter relation"
                    value={newFamilyMember.customRelation || ''}
                    onChange={(e) => setNewFamilyMember(prev => ({ ...prev, customRelation: e.target.value, relation: e.target.value }))}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddFamilyMember}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAddingFamilyMember(false);
                  setNewFamilyMember({ name: '', relation: '', customRelation: '' });
                }}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Family Members List */}
        {familyMembersLoading ? (
          <div className="text-xs text-gray-500 py-2">Loading...</div>
        ) : familyMembers.length === 0 ? (
          <div className="text-xs text-gray-500 py-2 italic">No family members added yet</div>
        ) : (
          <div className="space-y-2">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
              >
                {editingFamilyMemberId === member.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      ref={editNameInputRef}
                      type="text"
                      value={editFamilyMember.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditFamilyMember(prev => ({ ...prev, name: value }));
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <select
                        value={editFamilyMember.relation}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'Other') {
                            setEditFamilyMember(prev => ({ ...prev, relation: 'Other', customRelation: prev.customRelation || '' }));
                          } else {
                            setEditFamilyMember(prev => ({ ...prev, relation: value, customRelation: '' }));
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Relation</option>
                        {relationOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {editFamilyMember.relation === 'Other' && (
                        <input
                          type="text"
                          placeholder="Enter relation"
                          value={editFamilyMember.customRelation || ''}
                          onChange={(e) => setEditFamilyMember(prev => ({ ...prev, customRelation: e.target.value, relation: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                      )}
                    </div>
                    <div className="flex gap-2 md:col-span-2">
                      <button
                        onClick={() => handleUpdateFamilyMember(member.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-900">{member.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({member.relation})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(member)}
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="Edit"
                      >
                        <PencilIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteFamilyMember(member.id)}
                        className="p-1 text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <XCircleIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Pets Section
  const PetsSection = () => {
    const handleAddPet = async () => {
      if (!newPet.name.trim() || !newPet.type.trim()) {
        toast.error('Please enter both pet name and type');
        return;
      }

      if (!project?.id) {
        toast.error('Project information not available');
        return;
      }

      try {
        const response = await projectsService.createPet(project.id, {
          name: newPet.name.trim(),
          type: newPet.type.trim(),
          hasYardAccess: newPet.hasYardAccess || false
        });

        if (response?.success) {
          toast.success('Pet added successfully');
          setNewPet({ name: '', type: '', customType: '', hasYardAccess: false });
          setIsAddingPet(false);
          loadPets();
        } else {
          throw new Error(response?.message || 'Failed to add pet');
        }
      } catch (error) {
        console.error('Error adding pet:', error);
        toast.error(error.message || 'Failed to add pet');
      }
    };

    const handleUpdatePet = async (id) => {
      if (!editPet.name.trim() || !editPet.type.trim()) {
        toast.error('Please enter both pet name and type');
        return;
      }

      if (!project?.id) {
        toast.error('Project information not available');
        return;
      }

      try {
        const response = await projectsService.updatePet(project.id, id, {
          name: editPet.name.trim(),
          type: editPet.type.trim(),
          hasYardAccess: editPet.hasYardAccess || false
        });

        if (response?.success) {
          toast.success('Pet updated successfully');
          setEditingPetId(null);
          setEditPet({ name: '', type: '', customType: '', hasYardAccess: false });
          loadPets();
        } else {
          throw new Error(response?.message || 'Failed to update pet');
        }
      } catch (error) {
        console.error('Error updating pet:', error);
        toast.error(error.message || 'Failed to update pet');
      }
    };

    const handleDeletePet = async (id) => {
      if (!window.confirm('Are you sure you want to delete this pet?')) {
        return;
      }

      if (!project?.id) {
        toast.error('Project information not available');
        return;
      }

      try {
        const response = await projectsService.deletePet(project.id, id);

        if (response?.success) {
          toast.success('Pet deleted successfully');
          loadPets();
        } else {
          throw new Error(response?.message || 'Failed to delete pet');
        }
      } catch (error) {
        console.error('Error deleting pet:', error);
        toast.error(error.message || 'Failed to delete pet');
      }
    };

    const startEditing = (pet) => {
      setEditingPetId(pet.id);
      const isCustomType = !petTypeOptions.includes(pet.type);
      setEditPet({ 
        name: pet.name, 
        type: isCustomType ? 'Other' : pet.type,
        customType: isCustomType ? pet.type : '',
        hasYardAccess: pet.hasYardAccess || false
      });
    };

    const cancelEditing = () => {
      setEditingPetId(null);
      setEditPet({ name: '', type: '', customType: '', hasYardAccess: false });
    };

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-soft mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Pets</h3>
          </div>
          {!isAddingPet && (
            <button
              onClick={() => setIsAddingPet(true)}
              className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded flex items-center gap-1"
            >
              <PlusIcon className="w-3 h-3" />
              Add
            </button>
          )}
        </div>

        {/* Add Pet Form */}
        {isAddingPet && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <input
                ref={petNameInputRef}
                type="text"
                placeholder="Pet Name"
                value={newPet.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewPet(prev => ({ ...prev, name: value }));
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex gap-1">
                <select
                  value={newPet.type}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'Other') {
                      setNewPet(prev => ({ ...prev, type: 'Other', customType: prev.customType || '' }));
                    } else {
                      setNewPet(prev => ({ ...prev, type: value, customType: '' }));
                    }
                  }}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  {petTypeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {newPet.type === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter pet type"
                    value={newPet.customType || ''}
                    onChange={(e) => setNewPet(prev => ({ ...prev, customType: e.target.value, type: e.target.value }))}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                )}
              </div>
            </div>
            <div className="mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPet.hasYardAccess}
                  onChange={(e) => setNewPet(prev => ({ ...prev, hasYardAccess: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-700">Has access to yard</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPet}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAddingPet(false);
                  setNewPet({ name: '', type: '', customType: '', hasYardAccess: false });
                }}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Pets List */}
        {petsLoading ? (
          <div className="text-xs text-gray-500 py-2">Loading...</div>
        ) : pets.length === 0 ? (
          <div className="text-xs text-gray-500 py-2 italic">No pets added yet</div>
        ) : (
          <div className="space-y-2">
            {pets.map((pet) => (
              <div
                key={pet.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
              >
                {editingPetId === pet.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      ref={editPetNameInputRef}
                      type="text"
                      value={editPet.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditPet(prev => ({ ...prev, name: value }));
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <select
                        value={editPet.type}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'Other') {
                            setEditPet(prev => ({ ...prev, type: 'Other', customType: prev.customType || '' }));
                          } else {
                            setEditPet(prev => ({ ...prev, type: value, customType: '' }));
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Type</option>
                        {petTypeOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {editPet.type === 'Other' && (
                        <input
                          type="text"
                          placeholder="Enter pet type"
                          value={editPet.customType || ''}
                          onChange={(e) => setEditPet(prev => ({ ...prev, customType: e.target.value, type: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPet.hasYardAccess}
                          onChange={(e) => setEditPet(prev => ({ ...prev, hasYardAccess: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-700">Has access to yard</span>
                      </label>
                    </div>
                    <div className="flex gap-2 md:col-span-2">
                      <button
                        onClick={() => handleUpdatePet(pet.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-900">{pet.name}</span>
                        <span className="text-xs text-gray-500">({pet.type})</span>
                        {pet.hasYardAccess && (
                          <span className="text-xs text-green-600 font-medium">• Yard Access</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(pet)}
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="Edit"
                      >
                        <PencilIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeletePet(pet.id)}
                        className="p-1 text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <XCircleIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
    const [fileNames, setFileNames] = useState({});
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
        // First, ensure project folder exists in assets
        const { assetsService } = await import('../../services/assetsService');

        // Get or create Projects root folder
        const roots = await assetsService.listFolders({ parentId: null, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
        let root = roots.find(r => (r.folderName || r.title) === 'Projects');
        if (!root) {
          root = await assetsService.createFolder({ name: 'Projects', parentId: null });
          if (typeof window?.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: null } }));
        }

        if (!root || !root.id) {
          throw new Error('Failed to get or create Projects root folder');
        }

        // Find or create project folder
        const children = await assetsService.listFolders({ parentId: root.id, sortBy: 'title', sortOrder: 'asc', limit: 1000 });

        // Use the correct format: "Project Number - Primary Customer Contact"
        const primaryContact = project.customer?.primaryName || project.customer?.firstName + ' ' + project.customer?.lastName || project.customerName || 'Unknown';
        const name = `${project.projectNumber} - ${primaryContact}`;

        // FIRST: Try to find by project number in metadata (most reliable)
        let projectFolder = null;
        if (project.projectNumber) {
          projectFolder = children.find(c => c.metadata?.projectNumber === project.projectNumber);
          console.log('🔍 Searching for project folder by project number:', project.projectNumber, 'Found:', !!projectFolder);
          if (projectFolder) {
            console.log('📁 Found project folder by number:', projectFolder.title || projectFolder.folderName);
          }
        }

        // SECOND: If not found by project number, try by exact name match
        if (!projectFolder) {
          projectFolder = children.find(c => (c.folderName || c.title) === name);
          console.log('🔍 Searching for project folder by name:', name, 'Found:', !!projectFolder);
        }

        // Create project folder if it doesn't exist
        if (!projectFolder) {
          const metadata = {
            projectId: project.id,
            projectNumber: project.projectNumber,
            customerName: primaryContact,
            address: project.projectName || project.name || '',
            isProjectFolder: true
          };
          projectFolder = await assetsService.createFolder({
            name,
            parentId: root.id,
            metadata: metadata
          });
        }

        console.log('📁 Using project folder for assets:', projectFolder?.id, projectFolder?.title);

        // Upload files one by one since the endpoint only supports single file upload
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const customName = fileNames[i] || file.name;

          // Create a new file object with the custom name
          const renamedFile = new File([file], customName, { type: file.type });

          const formData = new FormData();
          formData.append('file', renamedFile);
          formData.append('projectId', project.id);
          formData.append('description', 'Uploaded from Project Profile');
          formData.append('fileType', 'OTHER');
          formData.append('isPublic', 'false');

          await documentService.uploadDocument(formData);

          // Also upload to assets service for organization
          await assetsService.uploadFiles({ 
            files: [renamedFile], 
            parentId: projectFolder?.id || null, 
            description: 'Uploaded from Project Profile',
            tags: []
          });
        }

        // Refresh file manager
        if (typeof window?.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: projectFolder?.id || null } }));
          window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: null } }));
        }

        toast.success('Documents uploaded and organized in project folder!');
        setUploadModalOpen(false);
        setSelectedFiles([]);
        setFileNames({});
        // Reload documents
        const res = await documentsService.getByProject(project.id);
        setDocs(Array.isArray(res?.data?.documents) ? res.data.documents : []);
      } catch (error) {
        console.error('Upload failed:', error);
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
            {docs.map(d => {
              const handleDownload = async (e) => {
                e.preventDefault();
                try {
                  const response = await documentsService.download(d.id);
                  const blob = response.data;
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = d.originalName || d.fileName || 'document';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Download failed:', error);
                  toast.error('Failed to download document');
                }
              };

              const handlePreview = async (e) => {
                e.preventDefault();
                try {
                  const response = await documentsService.download(d.id);
                  const blob = response.data;
                  const url = window.URL.createObjectURL(blob);

                  // Create document object for modal
                  const documentForModal = {
                    ...d,
                    url: url,
                    fileName: d.fileName || d.name || 'Document'
                  };

                  setSelectedDocument(documentForModal);
                  setIsDocumentModalOpen(true);

                  // Clean up blob URL after modal closes
                  setTimeout(() => {
                    if (!isDocumentModalOpen) {
                      window.URL.revokeObjectURL(url);
                    }
                  }, 60000);
                } catch (error) {
                  console.error('Preview failed:', error);
                  toast.error('Failed to preview document');
                }
              };

              return (
                <div key={d.id} className="min-w-[780px] grid gap-2 items-center px-2 py-2 border-b text-xs" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className="font-medium text-blue-700 whitespace-nowrap overflow-hidden text-ellipsis" title={d.originalName || d.fileName}>
                    {d.originalName || d.fileName}
                  </div>
                  <div className="text-gray-700 truncate" title={d.mimeType || d.fileType}>{d.mimeType || d.fileType}</div>
                  <div className="text-gray-700">{formatBytes(d.fileSize)}</div>
                  <div className="text-gray-700">{new Date(d.createdAt || d.updatedAt || Date.now()).toLocaleDateString()}</div>
                  <div className="text-right space-x-3">
                    <button 
                      onClick={handlePreview}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
                <button
                  onClick={() => { setUploadModalOpen(false); setSelectedFiles([]); setFileNames({}); }}
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
                    onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setSelectedFiles(files);
                        const initialNames = {};
                        files.forEach((f, i) => {
                            initialNames[i] = f.name;
                        });
                        setFileNames(initialNames);
                    }}
                    className="hidden"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 font-medium">Original: {file.name}</span>
                                <span className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">File Name</label>
                                <input 
                                    type="text" 
                                    value={fileNames[index] || ''}
                                    onChange={(e) => setFileNames(prev => ({...prev, [index]: e.target.value}))}
                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="Enter file name"
                                />
                            </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => { setUploadModalOpen(false); setSelectedFiles([]); setFileNames({}); }}
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

            {/* Double Pull, Pet Names, and Pets Have Yard Access */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-orange-700 border-b border-orange-200 pb-2">Project Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="editDoublePull"
                    checked={editFormData.doublePull}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, doublePull: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="editDoublePull" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Double Pull House (requires two ladders to access roof)
                  </label>
                </div>
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
          <FamilyMembersSection />
          <PetsSection />
          <DocumentsPanel />
        </div>
        {/* Right Column - Progress with PM and Subcontractors */}
        <div className="lg:col-span-1 space-y-4">
          <ProgressChart />
          <SubcontractorsPanel />
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        document={selectedDocument}
        isOpen={isDocumentModalOpen}
        onClose={() => {
          setIsDocumentModalOpen(false);
          setSelectedDocument(null);
        }}
      />

      {/* Google Map Modal */}
      <GoogleMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        address={project.address || project.customer?.address || ''}
      />
    </div>
  );
};

export default ProjectProfileTab;