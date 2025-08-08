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
        { name: '', phone: '', email: '', isPrimary: false },
        { name: '', phone: '', email: '', isPrimary: false },
        { name: '', phone: '', email: '', isPrimary: false }
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
    
    // Removed expandable progress states - simplified compact design
    
    // Removed drag and drop state - reverted to original layout
    
    // Fetch projects directly from database
    const { data: projectsFromDb, isLoading: projectsLoading, error: projectsError } = useProjects({ limit: 100 });
    
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
                contacts: [...newProject.contacts, { name: '', phone: '', email: '', isPrimary: false }]
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

            // Step 1: Create customer with proper contact structure
            const customerData = {
                primaryName: newProject.customerName,
                // Use a unique placeholder email if missing to avoid unique constraint collisions
                primaryEmail: (primaryContact?.email && primaryContact.email.trim()) || `no-reply+${Date.now()}@kenstruction.com`,
                // Normalize phone to satisfy regex; fallback to a valid default starting with 1
                primaryPhone: normalizePhone(primaryContact?.phone) || '1111111111',
                // Add secondary contact if available
                secondaryName: secondaryContact?.name || null,
                secondaryEmail: secondaryContact?.email || null,
                secondaryPhone: normalizePhone(secondaryContact?.phone) || null,
                primaryContact: 'PRIMARY', // Always set primary as the main contact
                address: `${newProject.customerName} Project`, // Better default address
                notes: `Project created from Add Project form`,
                // Send all contacts to be created in the new Contact table
                contacts: newProject.contacts
                    .filter(contact => contact.name && contact.name.trim()) // Only send contacts with names
                    .map(contact => ({
                        name: contact.name.trim(),
                        phone: normalizePhone(contact.phone) || null,
                        email: contact.email || null,
                        isPrimary: contact.isPrimary || false
                    }))
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
    
    // Get project progress percentage
    const getProjectProgress = (project) => {
        const progress = getProgressForProject(project) || project.progress || 0;
        return Math.min(100, Math.max(0, Math.round(progress)));
    };

    // Removed all drag and drop functionality - reverted to original static buttons

    // At the top, after extracting scrollToProjectId/targetProjectId and projectSourceSection:
    // (Assume targetProjectId is already set as in the current code)
    const showHeaderBackButton = !((projectSourceSection === 'Activity Feed' || projectSourceSection === 'My Alerts' || projectSourceSection === 'Current Alerts' || projectSourceSection === 'Project Cubes' || projectSourceSection === 'Project Phases') && targetProjectId);

    const ProjectCard = ({ project }) => {
        // Get current workflow state
        const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
        const currentPhase = getPhaseForProject(project);
        const currentSection = currentStep?.section || 'Not Set';
        const currentLineItem = currentStep?.lineItem || currentStep?.stepName || 'Not Set';
        const phaseColors = getPhaseColorForProject(project);
        const projectType = project.projectType || 'General';
        
        // Determine if this card should show the back button
        const showCardBackButton = (projectSourceSection === 'Activity Feed' || projectSourceSection === 'My Alerts' || projectSourceSection === 'Current Alerts' || projectSourceSection === 'Project Cubes' || projectSourceSection === 'Project Phases' || projectSourceSection === 'Project Messages' || projectSourceSection === 'Project Workflow Alerts') && String(project.id) === String(targetProjectId);
        
        return (
            <div 
                data-project-id={String(project.id)}
                className={`${colorMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden`}
            >
                {/* Condensed Header */}
                <div className={`px-3 py-2 ${colorMode ? 'bg-gradient-to-r from-slate-900 to-slate-800' : 'bg-gradient-to-r from-gray-50 to-white'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${phaseColors.bg} ${phaseColors.text} text-xs font-bold`}>
                                {project.projectNumber?.slice(-2) || '#'}
                            </div>
                            <div>
                                <h3 className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    #{project.projectNumber || '12345'}
                                </h3>
                                <span className={`text-xs ${colorMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                    {projectType}
                                </span>
                            </div>
                        </div>
                        
                        {/* Phase Badge */}
                        <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${phaseColors.bg} ${phaseColors.text}`}>
                                {currentPhase}
                            </span>
                            <div className={`text-xs mt-0.5 ${colorMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {getProjectProgress(project)}%
                            </div>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${getProjectProgress(project)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Customer & Contact Info */}
                <div className="px-3 py-2 space-y-2">
                    {/* Customer Section */}
                    <div>
                        <h4 className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Customer</h4>
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'} truncate`}>
                                    {project.customer?.primaryName || project.client?.name || 'Not Set'}
                                </p>
                                <p className={`text-xs ${colorMode ? 'text-slate-400' : 'text-gray-600'} truncate`}>
                                    {project.customer?.address || project.client?.address || project.projectName || 'No Address'}
                                </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                                {project.customer?.primaryPhone && (
                                    <a href={`tel:${project.customer.primaryPhone.replace(/[^\d+]/g, '')}`}
                                       className={`text-xs hover:underline ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}
                                       title={project.customer.primaryPhone}>
                                        📞
                                    </a>
                                )}
                                {project.customer?.primaryEmail && (
                                    <a href={`mailto:${project.customer.primaryEmail}`}
                                       className={`text-xs hover:underline ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}
                                       title={project.customer.primaryEmail}>
                                        ✉️
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Project Manager Section */}
                    <div className={`pt-2 border-t ${colorMode ? 'border-slate-700' : 'border-gray-200'}`}>
                        <h4 className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Project Manager</h4>
                        <p className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'} truncate`}>
                            {project.projectManager ? `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim() : 'Not Assigned'}
                        </p>
                    </div>
                    
                    {/* Current Task Section */}
                    <div className={`pt-2 border-t ${colorMode ? 'border-slate-700' : 'border-gray-200'}`}>
                        <h4 className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Current Task</h4>
                        <button
                            onClick={() => {
                                // Use the new direct navigation system for workflow
                                const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
                                const currentPhase = WorkflowProgressService.getProjectPhase(project);
                                
                                // Create navigation-compatible line item ID 
                                const targetLineItemId = currentStep?.stepId ? `DB_${currentPhase}-${currentStep.sectionId || 'unknown'}-${currentStep.stepIndex || 0}` : null;
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
                            className={`w-full text-left px-2 py-2 rounded transition-all hover:shadow-sm ${
                                colorMode ? 'bg-blue-900/30 hover:bg-blue-800/40 text-blue-200 border border-blue-700/50' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
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
                              const targetLineItemId = currentStep?.stepId ? `DB_${currentPhase}-${currentStep.sectionId || 'unknown'}-${currentStep.stepIndex || 0}` : null;
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
                            className={`flex flex-col items-center gap-1 p-2 rounded border transition-all hover:shadow-sm ${
                                colorMode ? 'bg-slate-800 border-slate-600 text-white hover:bg-blue-700/20 hover:border-blue-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-300'
                            }`}
                        >
                            <span className="text-sm">🗂️</span>
                            <span className="text-xs font-medium">Workflow</span>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Alerts')}
                            className={`flex flex-col items-center gap-1 p-2 rounded border transition-all hover:shadow-sm ${
                                colorMode ? 'bg-slate-800 border-slate-600 text-white hover:bg-amber-700/20 hover:border-amber-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-amber-50 hover:border-amber-300'
                            }`}
                        >
                            <span className="text-sm">⚠️</span>
                            <span className="text-xs font-medium">Alerts</span>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Messages')}
                            className={`flex flex-col items-center gap-1 p-2 rounded border transition-all hover:shadow-sm ${
                                colorMode ? 'bg-slate-800 border-slate-600 text-white hover:bg-sky-700/20 hover:border-sky-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-sky-50 hover:border-sky-300'
                            }`}
                        >
                            <span className="text-sm">💬</span>
                            <span className="text-xs font-medium">Messages</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${colorMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
            <div className="w-full max-w-7xl mx-auto py-4 px-4">
                {/* Condensed Header */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                My Projects
                            </h1>
                            <p className={`text-sm ${colorMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                {projectsArray.length} {projectsArray.length === 1 ? 'project' : 'projects'}
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg ${
                                colorMode
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white'
                            }`}
                        >
                            <span className="text-lg">+</span>
                            <span>Add New Project</span>
                        </button>
                    </div>
                    
                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-lg ${colorMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                            <div className={`text-sm font-medium ${colorMode ? 'text-slate-400' : 'text-gray-600'}`}>Total Projects</div>
                            <div className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>{projectsArray.length}</div>
                        </div>
                        <div className={`p-4 rounded-lg ${colorMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                            <div className={`text-sm font-medium ${colorMode ? 'text-slate-400' : 'text-gray-600'}`}>In Progress</div>
                            <div className={`text-2xl font-bold text-blue-600`}>{projectsArray.filter(p => p.status !== 'COMPLETED').length}</div>
                        </div>
                        <div className={`p-4 rounded-lg ${colorMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                            <div className={`text-sm font-medium ${colorMode ? 'text-slate-400' : 'text-gray-600'}`}>Avg Progress</div>
                            <div className={`text-2xl font-bold text-green-600`}>
                                {projectsArray.length > 0 ? Math.round(projectsArray.reduce((sum, p) => sum + getProjectProgress(p), 0) / projectsArray.length) : 0}%
                            </div>
                        </div>
                        <div className={`p-4 rounded-lg ${colorMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                            <div className={`text-sm font-medium ${colorMode ? 'text-slate-400' : 'text-gray-600'}`}>This Month</div>
                            <div className={`text-2xl font-bold text-purple-600`}>
                                {projectsArray.filter(p => {
                                    const created = new Date(p.createdAt);
                                    const now = new Date();
                                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                                }).length}
                            </div>
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
                    <div className={`p-8 rounded-xl ${colorMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
                        <ErrorState 
                            message={projectsError?.message || 'Unable to load projects. Please try again.'}
                            onRetry={() => window.location.reload()}
                            colorMode={colorMode}
                        />
                    </div>
                ) : projectsArray.length === 0 ? (
                    <div className={`p-12 rounded-xl text-center ${colorMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
                        <div className="mb-6">
                            <div className="text-6xl mb-4">🏗️</div>
                            <h3 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                                No projects yet
                            </h3>
                            <p className={`${colorMode ? 'text-slate-400' : 'text-gray-600'} mb-6`}>
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
                            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl ${
                                colorMode
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white'
                            }`}
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
            </div>
        </div>

            {/* Add Project Modal */}
            <Modal isOpen={isModalOpen} onClose={() => {
                setIsModalOpen(false);
                setNewProject(defaultNewProject);
                setError('');
            }}>
                <div className="p-6">
                    <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                        Add New Project
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Project Number */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Project Number *
                            </label>
                            <input
                                type="text"
                                name="projectNumber"
                                value={newProject.projectNumber}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    colorMode
                                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                }`}
                                placeholder="Enter project number (e.g., 12345)"
                                required
                            />
                        </div>

                        {/* Customer Name */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Customer Name *
                            </label>
                            <input
                                type="text"
                                name="customerName"
                                value={newProject.customerName}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    colorMode
                                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                }`}
                                placeholder="Enter customer name"
                                required
                            />
                        </div>

                        {/* Job Type */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Job Type *
                            </label>
                            <select
                                name="jobType"
                                value={newProject.jobType}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    colorMode
                                        ? 'bg-slate-700 border-slate-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                required
                            >
                                <option value="">Select job type</option>
                                <option value="ROOF_REPLACEMENT">Roof Replacement</option>
                                <option value="KITCHEN_REMODEL">Kitchen Remodel</option>
                                <option value="BATHROOM_RENOVATION">Bathroom Renovation</option>
                                <option value="SIDING_INSTALLATION">Siding Installation</option>
                                <option value="WINDOW_REPLACEMENT">Window Replacement</option>
                                <option value="FLOORING">Flooring</option>
                                <option value="PAINTING">Painting</option>
                                <option value="ELECTRICAL_WORK">Electrical Work</option>
                                <option value="PLUMBING">Plumbing</option>
                                <option value="HVAC">HVAC</option>
                                <option value="DECK_CONSTRUCTION">Deck Construction</option>
                                <option value="LANDSCAPING">Landscaping</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        {/* Project Manager - MANDATORY FIELD */}
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Project Manager *
                                <span className={`text-xs ml-2 ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                    (Pre-filled from Settings)
                                </span>
                            </label>
                            <select
                                name="projectManager"
                                value={newProject.projectManager}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    colorMode
                                        ? 'bg-slate-700 border-slate-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                required
                                disabled={usersLoading}
                            >
                                <option value="">
                                    {usersLoading ? 'Loading project managers...' : 'Select Project Manager'}
                                </option>
                                {availableUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.role})
                                    </option>
                                ))}
                            </select>
                            {defaultRoles.projectManager && (
                                <div className={`mt-1 text-xs ${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                                    ✓ Default: {defaultRoles.projectManager.name}
                                </div>
                            )}
                        </div>
                        
                        {/* Project Role Assignments Section */}
                        <div className={`border-t pt-6 ${colorMode ? 'border-slate-600' : 'border-gray-200'}`}>
                            <h4 className={`text-lg font-semibold mb-4 ${colorMode ? 'text-white' : 'text-gray-800'}`}>Additional Project Roles</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Field Director */}
                                <div>
                                    <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Field Director
                                    </label>
                                    <select
                                        name="fieldDirector"
                                        value={newProject.fieldDirector || ''}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            colorMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                        disabled={usersLoading}
                                    >
                                        <option value="">Select Field Director (Optional)</option>
                                        {availableUsers.filter(user => user.role === 'FIELD_DIRECTOR' || user.role === 'PROJECT_MANAGER').map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Sales Representative */}
                                <div>
                                    <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Sales Representative
                                    </label>
                                    <select
                                        name="salesRep"
                                        value={newProject.salesRep || ''}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            colorMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                        disabled={usersLoading}
                                    >
                                        <option value="">Select Sales Rep (Optional)</option>
                                        {availableUsers.filter(user => user.role === 'SALES' || user.role === 'PROJECT_MANAGER').map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Quality Inspector */}
                                <div>
                                    <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Quality Inspector
                                    </label>
                                    <select
                                        name="qualityInspector"
                                        value={newProject.qualityInspector || ''}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            colorMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                        disabled={usersLoading}
                                    >
                                        <option value="">Select Quality Inspector (Optional)</option>
                                        {availableUsers.filter(user => user.role === 'QUALITY' || user.role === 'FIELD_DIRECTOR' || user.role === 'PROJECT_MANAGER').map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Administrative Assistant */}
                                <div>
                                    <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                        Administrative Assistant
                                    </label>
                                    <select
                                        name="adminAssistant"
                                        value={newProject.adminAssistant || ''}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            colorMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                        disabled={usersLoading}
                                    >
                                        <option value="">Select Admin Assistant (Optional)</option>
                                        {availableUsers.filter(user => user.role === 'ADMINISTRATION' || user.role === 'OFFICE').map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Default roles display */}
                            {(defaultRoles.fieldDirector || defaultRoles.salesRep || defaultRoles.qualityInspector || defaultRoles.adminAssistant) && (
                                <div className={`mt-4 p-3 rounded-lg ${colorMode ? 'bg-slate-800/50 border-slate-600' : 'bg-gray-50 border-gray-200'} border`}>
                                    <div className={`text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>Default Role Assignments:</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {defaultRoles.fieldDirector && (
                                            <div className={`${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                                                Field Director: {defaultRoles.fieldDirector.name}
                                            </div>
                                        )}
                                        {defaultRoles.salesRep && (
                                            <div className={`${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                                                Sales Rep: {defaultRoles.salesRep.name}
                                            </div>
                                        )}
                                        {defaultRoles.qualityInspector && (
                                            <div className={`${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                                                Quality Inspector: {defaultRoles.qualityInspector.name}
                                            </div>
                                        )}
                                        {defaultRoles.adminAssistant && (
                                            <div className={`${colorMode ? 'text-green-400' : 'text-green-600'}`}>
                                                Admin Assistant: {defaultRoles.adminAssistant.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Project Contacts Section */}
                        <div className={`border-t pt-6 ${
                            colorMode ? 'border-slate-600' : 'border-gray-200'
                        }`}>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className={`text-lg font-semibold ${
                                    colorMode ? 'text-white' : 'text-gray-800'
                                }`}>Project Contacts</h4>
                                <button
                                    type="button"
                                    onClick={addContact}
                                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                                        colorMode
                                            ? 'border-slate-600 text-gray-300 hover:bg-slate-700'
                                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    + Add Contact
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {newProject.contacts.map((contact, index) => (
                                    <div key={index} className={`p-4 border rounded-lg ${
                                        colorMode ? 'border-slate-600 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
                                    }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`font-medium ${
                                                colorMode ? 'text-gray-200' : 'text-gray-700'
                                            }`}>Contact {index + 1}</span>
                                            <div className="flex items-center gap-2">
                                                {/* Set as Primary Radio */}
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="primaryContact"
                                                        checked={contact.isPrimary}
                                                        onChange={() => handlePrimaryContactChange(index)}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className={`text-sm ${
                                                        colorMode ? 'text-gray-300' : 'text-gray-600'
                                                    }`}>Set as Primary</span>
                                                </label>
                                                {/* Remove Contact Button */}
                                                {newProject.contacts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeContact(index)}
                                                        className={`text-sm text-red-500 hover:text-red-700 ml-3`}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Name */}
                                            <div>
                                                <label className={`block text-xs font-medium ${colorMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                    Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={contact.name}
                                                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                                        colorMode
                                                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                    }`}
                                                    placeholder="Enter contact name"
                                                />
                                            </div>
                                            
                                            {/* Phone */}
                                            <div>
                                                <label className={`block text-xs font-medium ${colorMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                    Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={contact.phone}
                                                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                                        colorMode
                                                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                    }`}
                                                    placeholder="Enter phone number"
                                                />
                                            </div>
                                            
                                            {/* Email */}
                                            <div>
                                                <label className={`block text-xs font-medium ${colorMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={contact.email}
                                                    onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                                        colorMode
                                                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                    }`}
                                                    placeholder="Enter email address"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {(error || createProjectMutation.error) && (
                            <div className="text-red-500 text-sm">
                                {error || createProjectMutation.error?.message || 'An error occurred'}
                            </div>
                        )}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setNewProject(defaultNewProject);
                                    setError('');
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
                                type="submit"
                                disabled={createProjectMutation.isLoading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                            >
                                {createProjectMutation.isLoading && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                )}
                                {createProjectMutation.isLoading ? 'Creating...' : 'Create Project'}
                            </button>
                        </div>
                    </form>
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
        </div>
    );
};

export default ProjectsPage;