import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, CalendarIcon, FolderIcon } from '../common/Icons';
import { getStatusStyles, formatPhoneNumber } from '../../utils/helpers';
import Modal from '../common/Modal';
import { useProjects, useCustomers, useCreateProject } from '../../hooks/useQueryApi';
import { API_BASE_URL } from '../../services/api';
import { projectsService } from '../../services/api';
import { ProjectCardSkeleton, ErrorState, EmptyState } from '../ui/SkeletonLoaders';
import { useWorkflowStates } from '../../hooks/useWorkflowState';
import WorkflowProgressService from '../../services/workflowProgress';

const defaultNewProject = {
    projectNumber: '',
    projectName: '',
    customerName: '',
    jobType: '',
    projectManager: '', // New field for Project Manager
    fieldDirector: '', // Field Director role
    salesRep: '', // Sales Representative role
    qualityInspector: '', // Quality Inspector role
    adminAssistant: '', // Administrative Assistant role
    status: 'Pending',
    budget: '',
    startDate: '',
    endDate: '',
    customer: '',
    address: '',
    priority: 'Low',
    description: '',
    contacts: [
        { name: '', phone: '', email: '', role: '', isPrimary: false },
        { name: '', phone: '', email: '', role: '', isPrimary: false },
        { name: '', phone: '', email: '', role: '', isPrimary: false }
    ]
};

const ProjectsPage = ({ onProjectSelect, onProjectActionSelect, onCreateProject, projects, colorMode, projectSourceSection, onNavigateBack, scrollToProject }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProject, setNewProject] = useState(defaultNewProject);
    const [error, setError] = useState('');
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [projectToArchive, setProjectToArchive] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const createProjectMutation = useCreateProject();
    const { data: customersData, isLoading: customersLoading, error: customersError } = useCustomers({ limit: 100 });
    
    // Role management state
    const [availableUsers, setAvailableUsers] = useState([]);
    const [defaultRoles, setDefaultRoles] = useState({});
    const [usersLoading, setUsersLoading] = useState(true);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Removed expandable progress states - simplified compact design
    
    // Removed drag and drop state - reverted to original layout
    
    // Fetch projects directly from database with pagination
    const { data: projectsResponse, isLoading: projectsLoading, error: projectsError, refetch } = useProjects({ 
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: statusFilter,
        retry: 3, // Enable retries
        retryDelay: 1000, // 1 second retry delay
        refetchOnWindowFocus: true // Refetch when window regains focus
    });
    
    // Extract projects data from paginated response
    const projectsFromDb = projectsResponse?.data || [];
    const totalProjects = projectsResponse?.total || 0;
    const totalPages = Math.ceil(totalProjects / pageSize);
    
    // CRITICAL: Use centralized workflow states for 100% consistency
    const { workflowStates, getWorkflowState, getPhaseForProject, getPhaseColorForProject, getPhaseInitialForProject, getProgressForProject } = useWorkflowStates(projectsFromDb);
    
    // Always use database projects - no fallback to props
    const projectsData = projectsFromDb || [];
    const projectsArray = Array.isArray(projectsData) ? projectsData : [];
    
    // Ensure all arrays are properly handled
    const customers = Array.isArray(customersData) ? customersData : [];
    
    // Debug logging
    console.log('🔍 ProjectsPage - Projects from DB:', projectsFromDb);
    console.log('🔍 ProjectsPage - Projects from props:', projects);
    console.log('🔍 ProjectsPage - Final projects array:', projectsArray);
    console.log('🔍 ProjectsPage - Loading states:', { projectsLoading, projectsError });

    // Calculate targetProjectId for component-wide use
    const urlParams = new URLSearchParams(window.location.search);
    const scrollToProjectId = urlParams.get('scrollToProject');
    
    // Also check if any project has scrollToProjectId property (from ActivityCard)
    const projectToScrollTo = projectsArray.find(p => p.scrollToProjectId);
    
    // Check if scrollToProject prop is passed (from navigation state)
    const targetProjectId = scrollToProjectId || 
                          (projectToScrollTo ? projectToScrollTo.scrollToProjectId : null) ||
                          (scrollToProject ? scrollToProject.scrollToProjectId : null);

    // Handle scrolling to specific project when navigating from Activity Feed
    useEffect(() => {
        if (targetProjectId && projectsArray.length > 0) {
            // Find the project element and scroll to it
            setTimeout(() => {
                const projectElement = document.querySelector(`[data-project-id="${targetProjectId}"]`);
                if (projectElement) {
                    projectElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                    
                    // Add a temporary highlight effect
                    projectElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
                    setTimeout(() => {
                        projectElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
                    }, 3000);
                }
            }, 500);
        }
    }, [projectsArray, scrollToProject, targetProjectId]);

    // Load users and default role assignments for project manager field
    useEffect(() => {
        const loadUsersAndDefaults = async () => {
            try {
                setUsersLoading(true);
                
                // Load available users
                const usersResponse = await fetch(`${API_BASE_URL}/roles/users`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || 'demo-sarah-owner-token-fixed-12345'}`
                    }
                });
                
                if (usersResponse.ok) {
                    const usersData = await usersResponse.json();
                    if (usersData.success) {
                        setAvailableUsers(usersData.data);
                        console.log('✅ Loaded users for project creation:', usersData.data.length);
                    }
                }
                
                // Load default role assignments
                const defaultsResponse = await fetch(`${API_BASE_URL}/roles/defaults`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || 'demo-sarah-owner-token-fixed-12345'}`
                    }
                });
                
                if (defaultsResponse.ok) {
                    const defaultsData = await defaultsResponse.json();
                    if (defaultsData.success) {
                        setDefaultRoles(defaultsData.data);
                        
                        // Pre-fill all roles if defaults exist
                        const roleUpdates = {};
                        if (defaultsData.data.projectManager) {
                            roleUpdates.projectManager = defaultsData.data.projectManager.id;
                            console.log('✅ Pre-filled project manager with default:', defaultsData.data.projectManager.name);
                        }
                        if (defaultsData.data.fieldDirector) {
                            roleUpdates.fieldDirector = defaultsData.data.fieldDirector.id;
                            console.log('✅ Pre-filled field director with default:', defaultsData.data.fieldDirector.name);
                        }
                        if (defaultsData.data.salesRep) {
                            roleUpdates.salesRep = defaultsData.data.salesRep.id;
                            console.log('✅ Pre-filled sales rep with default:', defaultsData.data.salesRep.name);
                        }
                        if (defaultsData.data.qualityInspector) {
                            roleUpdates.qualityInspector = defaultsData.data.qualityInspector.id;
                            console.log('✅ Pre-filled quality inspector with default:', defaultsData.data.qualityInspector.name);
                        }
                        if (defaultsData.data.adminAssistant) {
                            roleUpdates.adminAssistant = defaultsData.data.adminAssistant.id;
                            console.log('✅ Pre-filled admin assistant with default:', defaultsData.data.adminAssistant.name);
                        }
                        
                        if (Object.keys(roleUpdates).length > 0) {
                            setNewProject(prev => ({
                                ...prev,
                                ...roleUpdates
                            }));
                        }
                    }
                }
                
            } catch (error) {
                console.error('Error loading users and defaults:', error);
            } finally {
                setUsersLoading(false);
            }
        };
        
        loadUsersAndDefaults();
    }, []);


    // Removed complex trade calculation functions - using simplified design

    const getPhaseColor = (phase) => {
        switch (phase?.toLowerCase()) {
            case 'lead':
            case 'lead phase':
                return 'from-blue-500 to-blue-600';
            case 'prospect':
            case 'prospect phase':
                return 'from-teal-500 to-teal-600';
            case 'approved':
            case 'approved phase':
                return 'from-purple-500 to-purple-600';
            case 'execution':
            case 'execution phase':
                return 'from-orange-500 to-orange-600';
            case 'supplement':
            case '2nd supplement':
            case '2nd supplement phase':
            case '2nd supp':
                return 'from-pink-500 to-pink-600';
            case 'completion':
            case 'completion phase':
                return 'from-green-500 to-green-600';
            default:
                return 'from-blue-500 to-blue-600';
        }
    };

    const getPhaseText = (phase) => {
        if (!phase || phase === 'Unknown') {
            // If no phase, try to infer from project status or return a default
            return 'Lead';
        }
        
        // Map to correct project phases
        switch (phase?.toLowerCase()) {
            case 'lead phase':
            case 'lead':
                return 'Lead';
            case 'prospect phase':
            case 'prospect':
                return 'Prospect';
            case 'approved phase':
            case 'approved':
                return 'Approved';
            case 'execution phase':
            case 'execution':
                return 'Execution';
            case '2nd supplement phase':
            case '2nd supplement':
                return '2nd Supplement';
            case 'completion phase':
            case 'completion':
                return 'Completion';
            default:
                return phase.replace(/\s*phase$/i, '');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewProject({ ...newProject, [name]: value });
    };

    // Handle contact input changes
    const handleContactChange = (index, field, value) => {
        const updatedContacts = [...newProject.contacts];
        updatedContacts[index] = { ...updatedContacts[index], [field]: value };
        setNewProject({ ...newProject, contacts: updatedContacts });
    };

    // Handle primary contact selection
    const handlePrimaryContactChange = (index) => {
        const updatedContacts = newProject.contacts.map((contact, i) => ({
            ...contact,
            isPrimary: i === index
        }));
        setNewProject({ ...newProject, contacts: updatedContacts });
    };

    // Add a new contact
    const addContact = () => {
        if (newProject.contacts.length < 10) { // Limit to 10 contacts
            setNewProject({
                ...newProject,
                contacts: [...newProject.contacts, { name: '', phone: '', email: '', role: '', isPrimary: false }]
            });
        }
    };

    // Remove a contact
    const removeContact = (index) => {
        if (newProject.contacts.length > 1) { // Keep at least one contact
            const updatedContacts = newProject.contacts.filter((_, i) => i !== index);
            setNewProject({ ...newProject, contacts: updatedContacts });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!newProject.projectNumber || !newProject.customerName || !newProject.jobType) {
            setError('Please fill in all required fields: Project Number, Customer Name, and Job Type');
            return;
        }

        // Validate that at least one contact has a name
        const validContacts = newProject.contacts.filter(contact => contact.name.trim());
        if (validContacts.length === 0) {
            setError('Please add at least one contact with a name');
            return;
        }

        // Ensure one contact is marked as primary (or set the first valid contact as primary)
        const hasPrimaryContact = validContacts.some(contact => contact.isPrimary);
        if (!hasPrimaryContact && validContacts.length > 0) {
            // Auto-set the first valid contact as primary
            const firstValidIndex = newProject.contacts.findIndex(contact => contact.name.trim());
            handlePrimaryContactChange(firstValidIndex);
        }

        setError('');

        try {
            // First, find the primary contact
            const primaryContact = newProject.contacts.find(contact => contact.isPrimary && contact.name.trim()) ||
                                 newProject.contacts.find(contact => contact.name.trim());

            // Utility: normalize phone to match server regex ^[+]?[1-9][\d]{0,15}$
            const normalizePhone = (value) => {
                if (!value) return '';
                const digits = (value || '').toString().replace(/\D/g, '');
                if (!digits) return '';
                return digits[0] === '0' ? '1' + digits.slice(1) : digits;
            };

            // Find a secondary contact (first non-primary contact with a name)
            const secondaryContact = newProject.contacts.find(contact => 
                !contact.isPrimary && contact.name.trim() && contact !== primaryContact
            );

            // Step 1: Create customer with contact information directly in Customer table
            const customerData = {
                primaryName: primaryContact?.name?.trim() || newProject.customerName,
                // Use a unique placeholder email if missing to avoid unique constraint collisions
                primaryEmail: (primaryContact?.email && primaryContact.email.trim()) || `no-reply+${Date.now()}@kenstruction.com`,
                // Normalize phone to satisfy regex; fallback to a valid default starting with 1
                primaryPhone: normalizePhone(primaryContact?.phone) || '1111111111',
                primaryRole: primaryContact?.role || null,
                // Add secondary contact if available
                secondaryName: secondaryContact?.name?.trim() || null,
                secondaryEmail: secondaryContact?.email?.trim() || null,
                secondaryPhone: normalizePhone(secondaryContact?.phone) || null,
                secondaryRole: secondaryContact?.role || null,
                primaryContact: 'PRIMARY', // Always set primary as the main contact
                address: newProject.customerAddress || `${newProject.customerName} Project`, // Better default address
                notes: `Project created from Add Project form`,
                isActive: true
            };

            // Check if customer already exists or create new one
            let customerId;
            try {
                // Try to find existing customer
                const existingCustomers = customers.filter(c => 
                    c.primaryName === newProject.customerName ||
                    c.name === newProject.customerName
                );
                
                if (existingCustomers.length > 0) {
                    customerId = existingCustomers[0].id;
                } else {
                    // Create new customer
                    const customerResponse = await fetch(`${API_BASE_URL}/customers`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || 'demo-sarah-owner-token-fixed-12345'}`
                        },
                        body: JSON.stringify(customerData)
                    });
                    const maybeJson = await customerResponse.json().catch(() => null);
                    if (!customerResponse.ok) {
                        const serverMsg = maybeJson?.message || maybeJson?.error || 'Failed to create customer';
                        throw new Error(serverMsg);
                    }
                    const customerResult = maybeJson;
                    customerId = customerResult.data.id;
                }
            } catch (error) {
                console.error('Error creating customer:', error);
                setError(error?.message || 'Failed to create customer. Please try again.');
                return;
            }

            // Step 2: Create project with customerId
            const projectData = {
                projectName: newProject.customerName,
                projectType: newProject.jobType,
                customerId: customerId,
                status: 'PENDING',
                budget: 1000, // Default budget for now
                startDate: new Date().toISOString(), // Today as start date
                endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
                priority: 'MEDIUM',
                description: `Project #${newProject.projectNumber}` // Clean description without contact info
            };

            const response = await createProjectMutation.mutateAsync(projectData);
            
            // Close modal and reset form
            setIsModalOpen(false);
            setNewProject(defaultNewProject);
            
            // Optionally trigger a refresh of the projects list
            if (onCreateProject) {
                onCreateProject(response.data || response);
            }
            
            // Show success message
            console.log('Project created successfully:', response.data || response);
        } catch (err) {
            console.error('Error creating project:', err);
            setError(err.message || 'Failed to create project');
        }
    };

    // Handle project deletion


    // Handle project archiving
    const handleArchiveProject = async () => {
        if (!projectToArchive) return;
        
        setActionLoading(true);
        try {
            const response = await projectsService.archive(projectToArchive.id || projectToArchive._id);
            const isArchived = response.data?.project?.archived;
            console.log(`✅ Project ${isArchived ? 'archived' : 'unarchived'} successfully`);
            
            // Close modal and reset
            setIsArchiveModalOpen(false);
            setProjectToArchive(null);
            
            // Trigger refresh if callback provided
            if (onCreateProject) {
                onCreateProject({ archived: isArchived, projectId: projectToArchive.id });
            }
            
            // Reload page to refresh the projects list
            window.location.reload();
        } catch (err) {
            console.error('❌ Error archiving project:', err);
            setError(err.response?.data?.message || 'Failed to archive project');
        } finally {
            setActionLoading(false);
        }
    };

    // Back button function
    const handleBackToSource = () => {
        if (onNavigateBack) {
            // For Project Phases, we need to pass the specific project info back
            if (projectSourceSection === 'Project Phases' && targetProjectId) {
                // Find the specific project that was clicked
                const specificProject = projectsArray.find(p => String(p.id) === String(targetProjectId));
                if (specificProject) {
                    // Create a project object with the scrollToProjectId for highlighting
                    const projectWithScrollInfo = {
                        ...specificProject,
                        scrollToProjectId: String(specificProject.id)
                    };
                    // Pass this to the navigation handler
                    onNavigateBack(projectWithScrollInfo);
                    return;
                }
            }
            // Default behavior for other cases
            onNavigateBack();
        }
    };

    // Get back button text based on source section
    const getBackButtonText = () => {
        switch (projectSourceSection) {
            case 'Project Cubes':
                return 'Back to Current Project Access';
            case 'Current Alerts':
                return 'Back to Current Alerts';
            case 'My Alerts':
                return 'Back to My Alerts';
            case 'Activity Feed':
                return 'Back to Activity Feed';
            case 'Project Messages':
                return 'Back to Project Messages';
            case 'Project Workflow Alerts':
                return 'Back to Project Workflow Alerts';
            case 'Project Phases':
                return 'Back to Projects by Phase';
            default:
                return 'Back to Dashboard';
        }
    };

    // Removed complex expansion functions - using compact design
    
    // Get project progress percentage based on completed workflow line items
    const getProjectProgress = (project) => {
        const progressData = WorkflowProgressService.calculateProjectProgress(project);
        return Math.min(100, Math.max(0, Math.round(progressData.overall || 0)));
    };

    // Removed all drag and drop functionality - reverted to original static buttons

    // At the top, after extracting scrollToProjectId/targetProjectId and projectSourceSection:
    // (Assume targetProjectId is already set as in the current code)
    const showHeaderBackButton = !((projectSourceSection === 'Activity Feed' || projectSourceSection === 'My Alerts' || projectSourceSection === 'Current Alerts' || projectSourceSection === 'Project Cubes' || projectSourceSection === 'Project Phases') && targetProjectId);

    const ProjectCard = ({ project }) => {
        // Get current workflow state
        const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
        const phaseKey = getPhaseForProject(project?.id);
        const currentPhase = WorkflowProgressService.getPhaseName(phaseKey);
        const currentSection = currentStep?.section || 'Not Set';
        const currentLineItem = currentStep?.lineItem || currentStep?.stepName || 'Not Set';
        const phaseColors = WorkflowProgressService.getPhaseColor(phaseKey);
        const projectType = project.projectType || 'General';
        
        // Determine if this card should show the back button
        const showCardBackButton = (projectSourceSection === 'Activity Feed' || projectSourceSection === 'My Alerts' || projectSourceSection === 'Current Alerts' || projectSourceSection === 'Project Cubes' || projectSourceSection === 'Project Phases' || projectSourceSection === 'Project Messages' || projectSourceSection === 'Project Workflow Alerts') && String(project.id) === String(targetProjectId);
        
        return (
            <div 
                data-project-id={String(project.id)}
                className="bg-white border border-gray-200/50 shadow-soft rounded-2xl hover:shadow-medium transition-all duration-300 overflow-hidden hover:-translate-y-1"
            >
                {/* Condensed Header */}
                <div className="px-4 py-4 bg-[#F8FAFC]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${phaseColors.bg} ${phaseColors.text} text-sm font-bold shadow-sm`}>
                                {String(project.projectNumber || '').padStart(5, '0')}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    #{project.projectNumber || '12345'}
                                </h3>
                                <span className="text-sm text-gray-600">
                                    {projectType}
                                </span>
                            </div>
                        </div>
                        
                        {/* Phase Badge */}
                        <div className="text-right">
                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-medium ${phaseColors.bg} ${phaseColors.text} shadow-sm`}>
                                {currentPhase}
                            </span>
                            <div className="text-sm mt-1 text-gray-600 font-medium">
                                {getProjectProgress(project)}%
                            </div>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200">
                        <div 
                            className="h-full bg-[#F8FAFC] rounded-full transition-all duration-300"
                            style={{ width: `${getProjectProgress(project)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Customer & Contact Info */}
                <div className="px-4 py-4 space-y-4">
                    {/* Customer Section */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer</h4>
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-medium text-gray-900 truncate">
                                    {project.customer?.primaryName || project.client?.name || 'Not Set'}
                                </p>
                                <p className="text-sm text-gray-600 truncate">
                                    {project.customer?.address || project.client?.address || project.projectName || 'No Address'}
                                </p>
                            </div>
                            <div className="flex gap-2 ml-3">
                                {project.customer?.primaryPhone && (
                                    <a href={`tel:${project.customer.primaryPhone.replace(/[^\d+]/g, '')}`}
                                       className="text-sm hover:underline text-brand-600 hover:text-brand-700 transition-colors"
                                       title={project.customer.primaryPhone}>
                                        📞
                                    </a>
                                )}
                                {project.customer?.primaryEmail && (
                                    <a href={`mailto:${project.customer.primaryEmail}`}
                                       className="text-sm hover:underline text-brand-600 hover:text-brand-700 transition-colors"
                                       title={project.customer.primaryEmail}>
                                        ✉️
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Project Manager Section */}
                    <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Project Manager</h4>
                        <p className="text-base font-medium text-gray-900 truncate">
                            {project.projectManager ? `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim() : 'Not Assigned'}
                        </p>
                    </div>
                    
                    {/* Current Task Section */}
                    <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Task</h4>
                        <button
                            onClick={() => {
                                // Use the new direct navigation system for workflow
                                const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
                                const currentPhase = WorkflowProgressService.getProjectPhase(project);
                                
                                // Create navigation-compatible line item ID
                                // Prefer DB subtask id when available; otherwise use PHASE-SECTION-INDEX (no DB_ prefix)
                                const targetLineItemId = currentStep?.stepId 
                                    ? currentStep.stepId 
                                    : `${currentPhase}-${currentStep?.sectionId || 'unknown'}-${currentStep?.stepIndex ?? 0}`;
                                const targetSectionId = currentStep?.sectionId || null;
                                
                                // Use the new navigation system with targetLineItemId
                                onProjectSelect(
                                    project, 
                                    'Project Workflow', 
                                    null, 
                                    'My Projects',
                                    targetLineItemId,
                                    targetSectionId
                                );
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                colorMode 
                                    ? 'bg-[#F8FAFC] text-white border-blue-600 hover:from-blue-700 hover:to-indigo-700 hover:border-blue-700' 
                                    : 'bg-[#F8FAFC] text-white border-blue-600 hover:from-blue-700 hover:to-indigo-700 hover:border-blue-700'
                            }`}
                        >
                            <div className="flex items-center gap-1">
                                <span className="text-sm">📋</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                        {currentLineItem.length > 40 ? `${currentLineItem.substring(0, 40)}...` : currentLineItem}
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Condensed Action Buttons */}
                <div className={`px-3 py-2 border-t ${colorMode ? 'border-slate-700 bg-slate-900/30' : 'border-gray-200 bg-gray-50/50'} relative`}>
                    {/* Back Button */}
                    {showCardBackButton && (
                        <div className="absolute top-1 right-1 z-10">
                            <button
                                onClick={handleBackToSource}
                                className={`px-2 py-1 text-xs rounded transition-all ${
                                    colorMode 
                                        ? 'bg-orange-700/80 text-white hover:bg-orange-600' 
                                        : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                }`}
                            >
                                ← Back
                            </button>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => {
                              // Use the new direct navigation system for workflow
                              const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
                              const currentPhase = WorkflowProgressService.getProjectPhase(project);
                              
                              // Create navigation-compatible line item ID
                              // Prefer DB subtask id when available; otherwise use PHASE-SECTION-INDEX (no DB_ prefix)
                              const targetLineItemId = currentStep?.stepId 
                                ? currentStep.stepId 
                                : `${currentPhase}-${currentStep?.sectionId || 'unknown'}-${currentStep?.stepIndex ?? 0}`;
                              const targetSectionId = currentStep?.sectionId || null;
                              
                              // Use the new navigation system with targetLineItemId
                              onProjectSelect(
                                project, 
                                'Project Workflow', 
                                null, 
                                'My Projects',
                                targetLineItemId,
                                targetSectionId
                              );
                            }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                colorMode 
                                    ? 'bg-[#F8FAFC] text-white border-blue-600 hover:from-blue-700 hover:to-indigo-700 hover:border-blue-700' 
                                    : 'bg-[#F8FAFC] text-white border-blue-600 hover:from-blue-700 hover:to-indigo-700 hover:border-blue-700'
                            }`}
                        >
                            <span className="text-sm">🗂️</span>
                            <span className="text-xs font-semibold">Workflow</span>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Alerts')}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                colorMode 
                                    ? 'bg-[#F8FAFC] text-white border-red-600 hover:from-red-700 hover:to-pink-700 hover:border-red-700' 
                                    : 'bg-[#F8FAFC] text-white border-red-600 hover:from-red-700 hover:to-pink-700 hover:border-red-700'
                            }`}
                        >
                            <span className="text-sm">⚠️</span>
                            <span className="text-xs font-semibold">Alerts</span>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Messages')}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                colorMode 
                                    ? 'bg-[#F8FAFC] text-white border-gray-600 hover:from-gray-700 hover:to-gray-800 hover:border-gray-700' 
                                    : 'bg-[#F8FAFC] text-white border-gray-600 hover:from-gray-700 hover:to-gray-800 hover:border-gray-700'
                            }`}
                        >
                            <span className="text-sm">💬</span>
                            <span className="text-xs font-semibold">Messages</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
        <div className="min-h-screen bg-[#F8FAFC] text-gray-900">
            <div className="w-full max-w-7xl mx-auto py-6 px-6">
                {/* Condensed Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold bg-[#F8FAFC] bg-clip-text text-transparent mb-2">
                                My Projects
                            </h1>
                            <p className="text-lg text-gray-600 font-medium">
                                {totalProjects} total {totalProjects === 1 ? 'project' : 'projects'} • Showing page {currentPage} of {totalPages}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                const resetProject = { 
                                    ...defaultNewProject,
                                    projectManager: defaultRoles.projectManager?.id || '',
                                    fieldDirector: defaultRoles.fieldDirector?.id || '',
                                    salesRep: defaultRoles.salesRep?.id || '',
                                    qualityInspector: defaultRoles.qualityInspector?.id || '',
                                    adminAssistant: defaultRoles.adminAssistant?.id || ''
                                };
                                setNewProject(resetProject);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 bg-[#F8FAFC] text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5"
                        >
                            <span className="text-lg">+</span>
                            <span>Add New Project</span>
                        </button>
                    </div>
                    
                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="p-6 bg-white border border-gray-200/50 shadow-soft rounded-2xl">
                            <div className="text-sm font-medium text-gray-600 mb-1">Total Projects</div>
                            <div className="text-3xl font-bold text-gray-900">{projectsArray.length}</div>
                        </div>
                        <div className="p-6 bg-white border border-gray-200/50 shadow-soft rounded-2xl">
                            <div className="text-sm font-medium text-gray-600 mb-1">In Progress</div>
                            <div className="text-3xl font-bold text-brand-600">{projectsArray.filter(p => p.status !== 'COMPLETED').length}</div>
                        </div>
                        <div className="p-6 bg-white border border-gray-200/50 shadow-soft rounded-2xl">
                            <div className="text-sm font-medium text-gray-600 mb-1">Avg Progress</div>
                            <div className="text-3xl font-bold text-green-600">
                                {projectsArray.length > 0 ? Math.round(projectsArray.reduce((sum, p) => {
                                    try {
                                        return sum + (getProjectProgress ? getProjectProgress(p) : 0);
                                    } catch (err) {
                                        console.error('Error calculating progress for project:', p?.id, err);
                                        return sum;
                                    }
                                }, 0) / projectsArray.length) : 0}%
                            </div>
                        </div>
                        <div className="p-6 bg-white border border-gray-200/50 shadow-soft rounded-2xl">
                            <div className="text-sm font-medium text-gray-600 mb-1">This Month</div>
                            <div className="text-3xl font-bold text-purple-600">
                                {projectsArray.filter(p => {
                                    const created = new Date(p.createdAt);
                                    const now = new Date();
                                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                                }).length}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="mb-6 p-4 bg-white border border-gray-200/50 shadow-soft rounded-2xl">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1); // Reset to first page on search
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        
                        {/* Status Filter */}
                        <div className="min-w-[200px]">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1); // Reset to first page on filter
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value="">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="ON_HOLD">On Hold</option>
                            </select>
                        </div>
                        
                        {/* Page Size */}
                        <div className="min-w-[120px]">
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(parseInt(e.target.value));
                                    setCurrentPage(1); // Reset to first page on page size change
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                                <option value={50}>50 per page</option>
                                <option value={100}>100 per page</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Projects Grid */}
                {projectsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <ProjectCardSkeleton key={i} colorMode={colorMode} />
                        ))}
                    </div>
                ) : projectsError ? (
                    <div className="p-8 bg-white border border-gray-200/50 shadow-soft rounded-2xl">
                        <ErrorState 
                            message={projectsError?.message || 'Unable to load projects. Please try again.'}
                            onRetry={() => refetch()}
                            colorMode={colorMode}
                        />
                        <div className="mt-6 text-center">
                            <button 
                                onClick={() => refetch()}
                                className="px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all duration-300 shadow-soft hover:shadow-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : projectsArray.length === 0 ? (
                    <div className="p-12 bg-white border border-gray-200/50 shadow-soft rounded-2xl text-center">
                        <div className="mb-8">
                            <div className="text-6xl mb-6">🏗️</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                No projects yet
                            </h3>
                            <p className="text-lg text-gray-600 mb-8">
                                Get started by creating your first project and begin managing your roofing business more efficiently.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                const resetProject = { 
                                    ...defaultNewProject,
                                    projectManager: defaultRoles.projectManager?.id || '',
                                    fieldDirector: defaultRoles.fieldDirector?.id || '',
                                    salesRep: defaultRoles.salesRep?.id || '',
                                    qualityInspector: defaultRoles.qualityInspector?.id || '',
                                    adminAssistant: defaultRoles.adminAssistant?.id || ''
                                };
                                setNewProject(resetProject);
                                setIsModalOpen(true);
                            }}
                            className="px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 bg-[#F8FAFC] text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5"
                        >
                            Create Your First Project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        {projectsArray.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalProjects)} of {totalProjects} projects
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            {/* Previous Button */}
                            <button
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            
                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                                            currentPage === pageNum
                                                ? 'bg-brand-600 text-white'
                                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            
                            {/* Next Button */}
                            <button
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

            {/* Add Project Modal - NUKED AND REBUILT */}
            <Modal isOpen={isModalOpen} onClose={() => {
                setIsModalOpen(false);
                setNewProject(defaultNewProject);
                setError('');
            }}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
                    {/* Clean Header */}
                    <div className="bg-[#F8FAFC] text-white p-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight">Create New Project</h2>
                                <p className="text-slate-300 mt-2 text-lg">Set up your project with essential details</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setNewProject(defaultNewProject);
                                    setError('');
                                }}
                                className="p-3 rounded-xl hover:bg-white transition-all duration-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="p-8 max-h-[75vh] overflow-y-auto">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Essential Project Details */}
                            <div className="bg-[#F8FAFC] rounded-2xl p-8 border border-blue-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-[var(--color-primary-blueprint-blue)] rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900">Project Details</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Project Number */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Project Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="projectNumber"
                                            value={newProject.projectNumber}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
                                            placeholder="e.g., 2024-001"
                                            required
                                        />
                                    </div>

                                    {/* Customer Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Customer Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="customerName"
                                            value={newProject.customerName}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
                                            placeholder="Enter customer name"
                                            required
                                        />
                                    </div>

                                    {/* Job Type */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Project Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="jobType"
                                            value={newProject.jobType}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg bg-white"
                                            required
                                        >
                                            <option value="">Select project type</option>
                                            <option value="ROOFING">🏠 Roofing</option>
                                            <option value="GUTTERS">🌧️ Gutters</option>
                                            <option value="INTERIOR_PAINT">🎨 Interior Paint</option>
                                            <option value="WATER_LEAK">💧 Water Leak</option>
                                            <option value="MOLD">🦠 Mold</option>
                                            <option value="DECKS">🪵 Decks</option>
                                            <option value="REPAIR_EXTERIOR">🔧 Repair - Exterior</option>
                                            <option value="REPAIR_INTERIOR">🛠️ Repair - Interior</option>
                                            <option value="WINDOWS">🪟 Windows</option>
                                            <option value="SIDING">🏗️ Siding</option>
                                            <option value="FENCE">🚧 Fence</option>
                                            <option value="KITCHEN_REMODEL">🍳 Kitchen Remodel</option>
                                            <option value="BATHROOM_RENOVATION">🚿 Bathroom Renovation</option>
                                            <option value="FLOORING">🪑 Flooring</option>
                                            <option value="PAINTING">🖌️ Painting</option>
                                            <option value="ELECTRICAL_WORK">⚡ Electrical Work</option>
                                            <option value="PLUMBING">🔧 Plumbing</option>
                                            <option value="HVAC">❄️ HVAC</option>
                                            <option value="LANDSCAPING">🌱 Landscaping</option>
                                            <option value="OTHER">📋 Other</option>
                                        </select>
                                    </div>

                                    {/* Project Manager */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Project Manager <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="projectManager"
                                            value={newProject.projectManager}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg bg-white"
                                            required
                                            disabled={usersLoading}
                                        >
                                            <option value="">
                                                {usersLoading ? '⏳ Loading project managers...' : '👤 Select Project Manager'}
                                            </option>
                                            {availableUsers.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </select>
                                        {defaultRoles.projectManager && (
                                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-green-700">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-sm font-medium">Default: {defaultRoles.projectManager.name}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Team Assignment */}
                            <div className="bg-[#F8FAFC] rounded-2xl p-8 border border-emerald-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900">Team Assignment</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Field Director */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Field Director
                                        </label>
                                        <select
                                            name="fieldDirector"
                                            value={newProject.fieldDirector || ''}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg bg-white"
                                            disabled={usersLoading}
                                        >
                                            <option value="">👷 Select Field Director (Optional)</option>
                                            {availableUsers.filter(user => user.role === 'FIELD_DIRECTOR' || user.role === 'PROJECT_MANAGER').map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Sales Representative */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Sales Representative
                                        </label>
                                        <select
                                            name="salesRep"
                                            value={newProject.salesRep || ''}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg bg-white"
                                            disabled={usersLoading}
                                        >
                                            <option value="">💼 Select Sales Rep (Optional)</option>
                                            {availableUsers.filter(user => user.role === 'SALES' || user.role === 'PROJECT_MANAGER').map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Quality Inspector */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Quality Inspector
                                        </label>
                                        <select
                                            name="qualityInspector"
                                            value={newProject.qualityInspector || ''}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg bg-white"
                                            disabled={usersLoading}
                                        >
                                            <option value="">🔍 Select Quality Inspector (Optional)</option>
                                            {availableUsers.filter(user => user.role === 'QUALITY' || user.role === 'FIELD_DIRECTOR' || user.role === 'PROJECT_MANAGER').map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Administrative Assistant */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Administrative Assistant
                                        </label>
                                        <select
                                            name="adminAssistant"
                                            value={newProject.adminAssistant || ''}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-lg bg-white"
                                            disabled={usersLoading}
                                        >
                                            <option value="">📋 Select Admin Assistant (Optional)</option>
                                            {availableUsers.filter(user => user.role === 'ADMINISTRATION' || user.role === 'OFFICE').map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Default roles display */}
                                {(defaultRoles.fieldDirector || defaultRoles.salesRep || defaultRoles.qualityInspector || defaultRoles.adminAssistant) && (
                                    <div className="mt-6 p-4 bg-emerald-100 border border-emerald-200 rounded-xl">
                                        <div className="text-sm font-semibold mb-3 text-emerald-900">Default Role Assignments:</div>
                                        <div className="grid grid-cols-2 gap-3 text-sm text-emerald-800">
                                            {defaultRoles.fieldDirector && (
                                                <div className="flex items-center gap-2">
                                                    <span>👷</span>
                                                    <span>Field Director: {defaultRoles.fieldDirector.name}</span>
                                                </div>
                                            )}
                                            {defaultRoles.salesRep && (
                                                <div className="flex items-center gap-2">
                                                    <span>💼</span>
                                                    <span>Sales Rep: {defaultRoles.salesRep.name}</span>
                                                </div>
                                            )}
                                            {defaultRoles.qualityInspector && (
                                                <div className="flex items-center gap-2">
                                                    <span>🔍</span>
                                                    <span>Quality Inspector: {defaultRoles.qualityInspector.name}</span>
                                                </div>
                                            )}
                                            {defaultRoles.adminAssistant && (
                                                <div className="flex items-center gap-2">
                                                    <span>📋</span>
                                                    <span>Admin Assistant: {defaultRoles.adminAssistant.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Project Contacts */}
                            <div className="bg-[#F8FAFC] rounded-2xl p-8 border border-purple-100">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900">Project Contacts</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addContact}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-semibold flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add Contact
                                    </button>
                                </div>
                                
                                <div className="space-y-6">
                                    {newProject.contacts.map((contact, index) => (
                                        <div key={index} className="bg-white p-6 border-2 border-purple-200 rounded-2xl shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                                        <span className="text-purple-600 font-bold text-sm">{index + 1}</span>
                                                    </div>
                                                    <span className="font-semibold text-slate-900 text-lg">Contact {index + 1}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {/* Set as Primary Radio */}
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="primaryContact"
                                                            checked={contact.isPrimary}
                                                            onChange={() => handlePrimaryContactChange(index)}
                                                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-purple-300"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">Set as Primary</span>
                                                    </label>
                                                    {/* Remove Contact Button */}
                                                    {newProject.contacts.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeContact(index)}
                                                            className="text-red-600 hover:text-red-700 font-medium text-sm"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                                                {/* Name */}
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                        Full Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={contact.name}
                                                        onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                                        placeholder="Enter full name"
                                                    />
                                                </div>
                                                
                                                {/* Phone */}
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                        Phone Number
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        value={contact.phone}
                                                        onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                                                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                                        placeholder="(555) 123-4567"
                                                    />
                                                </div>
                                                
                                                {/* Email */}
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                        Email Address
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={contact.email}
                                                        onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                                        placeholder="email@example.com"
                                                    />
                                                </div>
                                                
                                                {/* Role */}
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                        Role/Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={contact.role || ''}
                                                        onChange={(e) => handleContactChange(index, 'role', e.target.value)}
                                                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                                        placeholder="e.g., Homeowner, Property Manager"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Error Display */}
                            {(error || createProjectMutation.error) && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="text-red-700 font-semibold text-lg">
                                            {error || createProjectMutation.error?.message || 'An error occurred'}
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Form Actions */}
                            <div className="bg-[#F8FAFC] px-8 py-6 border-t border-slate-200 -mx-8 -mb-8">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">
                                        Fill in the required fields marked with <span className="text-red-500">*</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                setNewProject(defaultNewProject);
                                                setError('');
                                            }}
                                            className="px-8 py-4 text-slate-700 bg-white border-2 border-slate-300 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={createProjectMutation.isLoading}
                                            className="px-8 py-4 bg-[#F8FAFC] text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
                                        >
                                            {createProjectMutation.isLoading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                    <span>Creating Project...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                    <span>Create Project</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>

            {/* Archive Project Modal */}
            <Modal isOpen={isArchiveModalOpen} onClose={() => {
                setIsArchiveModalOpen(false);
                setProjectToArchive(null);
            }}>
                <div className="p-6">
                    <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                        Archive Project
                    </h3>
                    <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                        Are you sure you want to archive "{projectToArchive?.name}"? This action can be undone later.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => {
                                setIsArchiveModalOpen(false);
                                setProjectToArchive(null);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                colorMode
                                    ? 'bg-slate-600 hover:bg-slate-700 text-white'
                                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleArchiveProject}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200"
                        >
                            Archive Project
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ProjectsPage;