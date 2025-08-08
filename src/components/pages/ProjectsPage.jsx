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
// ProjectRoleDropdowns moved to Add Project form - no longer needed
// Removed broken drag libraries - using native implementation

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
    
    // Role assignment moved to Add Project form - no longer need expansion state
    
    // Progress expansion state (matching Dashboard implementation)
    const [expandedProgress, setExpandedProgress] = useState(new Set());
    const [expandedTrades, setExpandedTrades] = useState(new Set());
    const [expandedAdditionalTrades, setExpandedAdditionalTrades] = useState(new Set());
    
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


    // Function to determine if project should have multiple trades (3 random projects)
    const shouldHaveMultipleTrades = (projectId) => {
        // Use project ID to consistently determine which projects get multiple trades
        return [1, 3, 5].includes(projectId); // Projects with IDs 1, 3, and 5 get multiple trades
    };

    // Function to get trades for a project
    const getProjectTrades = (project) => {
        // Use calculated progress data from backend if available
        if (project.calculatedProgress && project.calculatedProgress.trades && project.calculatedProgress.trades.length > 0) {
            return project.calculatedProgress.trades;
        }
        
        // Fallback to previous logic if no calculated data available
        if (shouldHaveMultipleTrades(project.id)) {
            // Multiple trades for selected projects - different numbers for each
            if (project.id === 1) {
                // Project 1: Add 2 trades
                return [
                    { name: 'Roofing', laborProgress: 75, materialsDelivered: true },
                    { name: 'Siding', laborProgress: 45, materialsDelivered: true },
                    { name: 'Windows', laborProgress: 20, materialsDelivered: false }
                ];
            } else if (project.id === 3) {
                // Project 3: Add 3 trades
                return [
                    { name: 'Roofing', laborProgress: 60, materialsDelivered: true },
                    { name: 'Siding', laborProgress: 30, materialsDelivered: false },
                    { name: 'Windows', laborProgress: 15, materialsDelivered: true },
                    { name: 'Decking', laborProgress: 0, materialsDelivered: false }
                ];
            } else if (project.id === 5) {
                // Project 5: Add 2 trades
                return [
                    { name: 'Roofing', laborProgress: 85, materialsDelivered: true },
                    { name: 'Siding', laborProgress: 55, materialsDelivered: true },
                    { name: 'Windows', laborProgress: 25, materialsDelivered: false }
                ];
            }
        }
        
        // Single trade based on project type - consistent delivery status
        const tradeName = project.projectType || project.type || 'General';
        // Use calculated progress if available, otherwise fallback
        const laborProgress = project.calculatedProgress ? project.calculatedProgress.overall : (project.progress || 0);
        const isDelivered = project.materialsDeliveryStart ? true : (project.id % 3 === 0);
        
        return [
            { 
                name: tradeName, 
                laborProgress: laborProgress, 
                materialsDelivered: isDelivered
            }
        ];
    };

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

    // Role assignment moved to Add Project form - functions no longer needed
    
    // Progress expansion functions (matching Dashboard implementation)
    const toggleProgress = (projectId) => {
        const newExpanded = new Set(expandedProgress);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
            // Also close trades when closing main progress
            const newTrades = new Set(expandedTrades);
            const newAdditionalTrades = new Set(expandedAdditionalTrades);
            newTrades.delete(projectId);
            newAdditionalTrades.delete(projectId);
            setExpandedTrades(newTrades);
            setExpandedAdditionalTrades(newAdditionalTrades);
        } else {
            newExpanded.add(projectId);
        }
        setExpandedProgress(newExpanded);
    };
    
    const toggleTrades = (projectId) => {
        const newExpanded = new Set(expandedTrades);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
            // Also close additional trades when closing main trades
            const newAdditionalTrades = new Set(expandedAdditionalTrades);
            newAdditionalTrades.delete(projectId);
            setExpandedAdditionalTrades(newAdditionalTrades);
        } else {
            newExpanded.add(projectId);
        }
        setExpandedTrades(newExpanded);
    };
    
    const toggleAdditionalTrades = (projectId) => {
        const newExpanded = new Set(expandedAdditionalTrades);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);
        }
        setExpandedAdditionalTrades(newExpanded);
    };
    
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
                className={`${colorMode ? 'bg-slate-800/90 border-slate-600/50' : 'bg-white border-gray-200'} border rounded-xl shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl`}
            >
                {/* Header - Clean Project Info */}
                <div className={`p-6 border-b ${colorMode ? 'border-slate-600/30 bg-slate-700/20' : 'border-gray-200 bg-gray-50/30'}`}>
                    {/* Project Number and Type */}
                    <div className="flex items-center gap-4 mb-4">
                        <h2 className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                            #{project.projectNumber || '12345'}
                        </h2>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            colorMode ? 'bg-slate-600/60 text-slate-200 border border-slate-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                            {projectType}
                        </span>
                    </div>

                    {/* Phase, Section, Line Item Row */}
                    <div className="flex items-center gap-3 mb-4">
                        {/* Phase Badge */}
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm ${phaseColors.bg} ${phaseColors.text} border`}>
                            {currentPhase}
                        </span>
                        
                        {/* Section */}
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            colorMode ? 'bg-slate-700/50 text-slate-200' : 'bg-gray-100 text-gray-700'
                        }`}>
                            {currentSection}
                        </div>
                        
                        {/* Line Item - Clickable Link to Workflow */}
                        <button
                            onClick={() => {
                                const projectWithWorkflowState = {
                                    ...project,
                                    scrollToCurrentLineItem: true,
                                    targetPhase: currentPhase,
                                    targetSection: currentSection,
                                    targetLineItem: currentLineItem,
                                    highlightLineItem: currentLineItem
                                };
                                onProjectSelect(projectWithWorkflowState, 'Project Workflow', null, 'My Projects');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:shadow-md ${
                                colorMode ? 'bg-blue-700/50 text-blue-300 hover:bg-blue-600/60' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                        >
                            📋 {currentLineItem.length > 30 ? `${currentLineItem.substring(0, 30)}...` : currentLineItem}
                        </button>
                    </div>
                </div>

                {/* Contact Information Grid */}
                <div className="p-6 space-y-6">
                    {/* Primary Customer */}
                    <div>
                        <h3 className={`text-lg font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-900'}`}>Primary Customer</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Name</p>
                                <p className={`text-base font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    {project.customer?.primaryName || project.client?.name || 'Not Set'}
                                </p>
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Address</p>
                                <p className={`text-base ${colorMode ? 'text-slate-200' : 'text-gray-700'}`}>
                                    {project.customer?.address || project.client?.address || project.projectName || 'Not Set'}
                                </p>
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone</p>
                                <a 
                                    href={`tel:${(project.customer?.primaryPhone || project.client?.phone || '').replace(/[^\d+]/g, '')}`}
                                    className={`text-base font-medium hover:underline ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}
                                >
                                    {project.customer?.primaryPhone || project.client?.phone || 'Not Set'}
                                </a>
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Email</p>
                                <a 
                                    href={`mailto:${project.customer?.primaryEmail || project.client?.email || ''}`}
                                    className={`text-base font-medium hover:underline ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}
                                >
                                    {project.customer?.primaryEmail || project.client?.email || 'Not Set'}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Contact */}
                    <div>
                        <h3 className={`text-lg font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-900'}`}>Secondary Contact</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Name</p>
                                <p className={`text-base ${colorMode ? 'text-slate-200' : 'text-gray-700'}`}>
                                    {project.customer?.secondaryName || 'Not Set'}
                                </p>
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone</p>
                                <a 
                                    href={`tel:${(project.customer?.secondaryPhone || '').replace(/[^\d+]/g, '')}`}
                                    className={`text-base font-medium hover:underline ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}
                                >
                                    {project.customer?.secondaryPhone || 'Not Set'}
                                </a>
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Email</p>
                                <a 
                                    href={`mailto:${project.customer?.secondaryEmail || ''}`}
                                    className={`text-base font-medium hover:underline ${colorMode ? 'text-blue-300' : 'text-blue-600'}`}
                                >
                                    {project.customer?.secondaryEmail || 'Not Set'}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Project Manager */}
                    <div>
                        <h3 className={`text-lg font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-900'}`}>Project Manager</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Name</p>
                                <p className={`text-base font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    {project.projectManager ? `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim() : 'Not Assigned'}
                                </p>
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone</p>
                                <a 
                                    href={`tel:${(project.pmPhone || project.projectManager?.phone || '').replace(/[^\d+]/g, '')}`}
                                    className={`text-base font-medium hover:underline ${colorMode ? 'text-green-300' : 'text-green-600'}`}
                                >
                                    {project.pmPhone || project.projectManager?.phone || 'Not Set'}
                                </a>
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Email</p>
                                <a 
                                    href={`mailto:${project.pmEmail || project.projectManager?.email || ''}`}
                                    className={`text-base font-medium hover:underline ${colorMode ? 'text-green-300' : 'text-green-600'}`}
                                >
                                    {project.pmEmail || project.projectManager?.email || 'Not Set'}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Expandable Progress Bar Section - Matching Current Project Access */}
                <div className="px-6 pb-4 border-b border-gray-200">
                    <button
                        onClick={() => toggleProgress(project.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${colorMode ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>Project Progress</span>
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${colorMode ? 'bg-slate-700/40' : 'bg-gray-100'}`}>
                                <div className={`w-16 h-2 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-300'}`}>
                                    <div 
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${getProjectProgress(project)}%` }}
                                    ></div>
                                </div>
                                <span className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                    {getProjectProgress(project)}%
                                </span>
                            </div>
                        </div>
                        <svg 
                            className={`w-5 h-5 transition-transform duration-200 ${expandedProgress.has(project.id) ? 'rotate-180' : ''} ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    {/* Expandable Progress Details */}
                    {expandedProgress.has(project.id) && (
                        <div className="mt-4 ml-6 space-y-4">
                            {/* Overall Progress Detail */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Overall Project Progress</span>
                                    <span className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{getProjectProgress(project)}%</span>
                                </div>
                                <div className={`w-full h-3 rounded-full overflow-hidden border ${colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-200 border-gray-300'}`}>
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                                        style={{ width: `${getProjectProgress(project)}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            {/* Materials & Labor Section */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => toggleTrades(project.id)}
                                    className={`flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}
                                >
                                    <span>📦 Materials & Labor</span>
                                    <svg 
                                        className={`w-4 h-4 transition-transform ${expandedTrades.has(project.id) ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {/* Materials & Labor Details */}
                                {expandedTrades.has(project.id) && (
                                    <div className="space-y-3 ml-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>Materials</span>
                                                <span className={`text-sm font-semibold ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>{project.materialsProgress || 85}%</span>
                                            </div>
                                            <div className={`w-full h-2 rounded-full overflow-hidden border ${colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-200 border-gray-300'}`}>
                                                <div 
                                                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${project.materialsProgress || 85}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>Labor</span>
                                                <span className={`text-sm font-semibold ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>{project.laborProgress || 75}%</span>
                                            </div>
                                            <div className={`w-full h-2 rounded-full overflow-hidden border ${colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-200 border-gray-300'}`}>
                                                <div 
                                                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${project.laborProgress || 75}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        
                                        {/* Additional Trades Section */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => toggleAdditionalTrades(project.id)}
                                                className={`flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}
                                            >
                                                <span>🔧 Additional Trades</span>
                                                <svg 
                                                    className={`w-4 h-4 transition-transform ${expandedAdditionalTrades.has(project.id) ? 'rotate-180' : ''}`} 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            
                                            {/* Additional Trades Details */}
                                            {expandedAdditionalTrades.has(project.id) && (
                                                <div className="space-y-2 ml-4">
                                                    {[
                                                        { name: 'Roofing', progress: project.roofingProgress || 90, color: 'bg-purple-500' },
                                                        { name: 'Siding', progress: project.sidingProgress || 60, color: 'bg-blue-500' },
                                                        { name: 'Windows', progress: project.windowsProgress || 40, color: 'bg-yellow-500' },
                                                        { name: 'Gutters', progress: project.guttersProgress || 30, color: 'bg-red-500' }
                                                    ].map((trade) => (
                                                        <div key={trade.name} className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>{trade.name}</span>
                                                                <span className={`text-sm font-semibold ${colorMode ? 'text-gray-200' : 'text-gray-800'}`}>{trade.progress}%</span>
                                                            </div>
                                                            <div className={`w-full h-1.5 rounded-full overflow-hidden border ${colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-200 border-gray-300'}`}>
                                                                <div 
                                                                    className={`h-full ${trade.color} rounded-full transition-all duration-300`}
                                                                    style={{ width: `${trade.progress}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 6 Project Action Buttons - Bottom Section */}
                <div className="px-3 pb-3 relative">
                    {/* Back Button - Lower Left Corner */}
                    {showCardBackButton && (
                        <div className="absolute bottom-2 left-2 z-10">
                            <button
                                onClick={handleBackToSource}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 border text-xs font-medium shadow-md ${
                                    colorMode 
                                        ? 'bg-gradient-to-r from-orange-700/90 to-orange-800/90 border-orange-600/70 text-white hover:from-orange-600/95 hover:to-orange-700/95 hover:border-orange-500' 
                                        : 'bg-gradient-to-r from-orange-100/95 to-orange-200/95 border-orange-300 text-orange-800 hover:from-orange-200/95 hover:to-orange-300/95 hover:border-orange-400'
                                }`}
                            >
                                <span className="text-[10px]">⬅️</span>
                                <span>Back</span>
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        {/* Row 1 */}
                        <button
                            onClick={() => {
                              // ENHANCED: Get current workflow state and add highlighting like Current Alerts
                              // ENHANCED: Get current workflow state and create direct navigation mapping
                              const workflowState = WorkflowProgressService.calculateProjectProgress(project);
                              const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
                              const currentPhase = WorkflowProgressService.getProjectPhase(project);
                              const currentStepName = currentStep?.stepName || currentStep?.name || 'Input Customer Information';
                              
                              console.log('🚀 MY PROJECTS: Workflow button clicked for:', project.name);
                              console.log('🎯 Current step:', currentStepName);
                              console.log('🎯 Current phase:', currentPhase);
                              
                              // Create direct mapping for current step
                              const createStepMapping = (stepName, phase) => {
                                const stepMappings = {
                                  // LEAD Phase mappings
                                  'Input Customer Information': { phase: 'LEAD', section: 'Input Customer Information', sectionId: 'input-customer-info' },
                                  'Complete Questions to Ask Checklist': { phase: 'LEAD', section: 'Complete Questions to Ask Checklist', sectionId: 'complete-questions' },
                                  'Input Lead Property Information': { phase: 'LEAD', section: 'Input Lead Property Information', sectionId: 'input-lead-property' },
                                  'Assign A Project Manager': { phase: 'LEAD', section: 'Assign A Project Manager', sectionId: 'assign-pm' },
                                  'Schedule Initial Inspection': { phase: 'LEAD', section: 'Schedule Initial Inspection', sectionId: 'schedule-inspection' },
                                  
                                  // PROSPECT Phase mappings
                                  'Site Inspection': { phase: 'PROSPECT', section: 'Site Inspection', sectionId: 'site-inspection' },
                                  'Write Estimate': { phase: 'PROSPECT', section: 'Write Estimate', sectionId: 'write-estimate' },
                                  'Insurance Process': { phase: 'PROSPECT', section: 'Insurance Process', sectionId: 'insurance-process' },
                                  'Agreement Preparation': { phase: 'PROSPECT', section: 'Agreement Preparation', sectionId: 'agreement-prep' },
                                  'Agreement Signing': { phase: 'PROSPECT', section: 'Agreement Signing', sectionId: 'agreement-signing' },
                                  
                                  // APPROVED Phase mappings
                                  'Administrative Setup': { phase: 'APPROVED', section: 'Administrative Setup', sectionId: 'admin-setup' },
                                  'Pre-Job Actions': { phase: 'APPROVED', section: 'Pre-Job Actions', sectionId: 'pre-job' },
                                  'Prepare for Production': { phase: 'APPROVED', section: 'Prepare for Production', sectionId: 'prepare-production' },
                                  
                                  // EXECUTION Phase mappings
                                  'Installation': { phase: 'EXECUTION', section: 'Installation', sectionId: 'installation' },
                                  'Quality Check': { phase: 'EXECUTION', section: 'Quality Check', sectionId: 'quality-check' },
                                  'Multiple Trades': { phase: 'EXECUTION', section: 'Multiple Trades', sectionId: 'multiple-trades' },
                                  'Subcontractor Work': { phase: 'EXECUTION', section: 'Subcontractor Work', sectionId: 'subcontractor-work' },
                                  'Update Customer': { phase: 'EXECUTION', section: 'Update Customer', sectionId: 'update-customer' },
                                  
                                  // SUPPLEMENT Phase mappings
                                  'Create Supp in Xactimate': { phase: 'SUPPLEMENT', section: 'Create Supp in Xactimate', sectionId: 'create-supp' },
                                  'Follow-Up Calls': { phase: 'SUPPLEMENT', section: 'Follow-Up Calls', sectionId: 'followup-calls' },
                                  'Review Approved Supp': { phase: 'SUPPLEMENT', section: 'Review Approved Supp', sectionId: 'review-approved' },
                                  'Customer Update': { phase: 'SUPPLEMENT', section: 'Customer Update', sectionId: 'customer-update' },
                                  
                                  // COMPLETION Phase mappings
                                  'Financial Processing': { phase: 'COMPLETION', section: 'Financial Processing', sectionId: 'financial-processing' },
                                  'Project Closeout': { phase: 'COMPLETION', section: 'Project Closeout', sectionId: 'project-closeout' }
                                };
                                
                                return stepMappings[stepName] || {
                                  phase: phase || 'LEAD',
                                  section: stepName || 'Input Customer Information',
                                  sectionId: (stepName || 'input-customer-info').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                                };
                              };
                              
                              const stepMapping = createStepMapping(currentStepName, currentPhase);
                              
                              const projectWithWorkflowState = {
                                ...project,
                                currentWorkflowStep: currentStep,
                                workflowState: workflowState,
                                highlightStep: currentStepName,
                                scrollToCurrentLineItem: true,
                                targetPhase: stepMapping.phase,
                                targetSection: stepMapping.section,
                                targetLineItem: stepMapping.section,
                                highlightLineItem: currentStepName,
                                sourceSection: 'My Projects',
                                navigationTarget: {
                                  phase: stepMapping.phase,
                                  section: stepMapping.section,
                                  sectionId: stepMapping.sectionId, // CRITICAL: Direct section ID
                                  lineItem: stepMapping.section,
                                  stepName: currentStepName,
                                  stepId: currentStep?.stepId,
                                  highlightMode: 'line-item',
                                  scrollBehavior: 'smooth',
                                  highlightColor: '#3B82F6',
                                  highlightDuration: 5000
                                }
                              };
                              
                              console.log('🎯 MY PROJECTS: Enhanced navigation data:', projectWithWorkflowState.navigationTarget);
                              onProjectSelect(projectWithWorkflowState, 'Project Workflow');
                            }}
                            className={`p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${
                                colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-blue-700/80' : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50'
                            }`}
                        >
                            <div className="text-center">
                                <div className="text-lg mb-1">🗂️</div>
                                <div className="text-xs font-medium">Workflow</div>
                            </div>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Alerts')}
                            className={`p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${
                                colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-amber-700/80' : 'bg-white border-gray-200 text-gray-800 hover:bg-amber-50'
                            }`}
                        >
                            <div className="text-center">
                                <div className="text-lg mb-1">⚠️</div>
                                <div className="text-xs font-medium">Alerts</div>
                            </div>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Messages')}
                            className={`p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${
                                colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-sky-700/80' : 'bg-white border-gray-200 text-gray-800 hover:bg-sky-50'
                            }`}
                        >
                            <div className="text-center">
                                <div className="text-lg mb-1">💬</div>
                                <div className="text-xs font-medium">Messages</div>
                            </div>
                        </button>
                        
                        {/* Row 2 */}
                        <button
                            disabled={true}
                            className={`p-3 rounded-lg border shadow-sm opacity-50 cursor-not-allowed ${
                                colorMode ? 'bg-slate-600/40 border-slate-500/30 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'
                            }`}
                        >
                            <div className="text-center">
                                <div className="text-lg mb-1">📄</div>
                                <div className="text-xs font-medium">Documents</div>
                            </div>
                        </button>
                        
                        <button
                            disabled={true}
                            className={`p-3 rounded-lg border shadow-sm opacity-50 cursor-not-allowed ${
                                colorMode ? 'bg-slate-600/40 border-slate-500/30 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'
                            }`}
                        >
                            <div className="text-center">
                                <div className="text-lg mb-1">📅</div>
                                <div className="text-xs font-medium">Schedule</div>
                            </div>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Projects')}
                            className={`p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${
                                colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-gray-700/80' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            <div className="text-center">
                                <div className="text-lg mb-1">👤</div>
                                <div className="text-xs font-medium">Profile</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-5xl mx-auto py-1 px-2">
            {/* Standard Header Row with Title */}
            <div className="mb-3 flex items-center gap-4">
                <h2 className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>My Projects ({projectsArray.length})</h2>
                <div className="flex-1" />
                <button
                    onClick={() => {
                        // Reset form to defaults with all roles pre-filled
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
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        colorMode
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                >
                    + Add Project
                </button>
            </div>

            {/* Loading state */}
            {projectsLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <ProjectCardSkeleton key={i} colorMode={colorMode} />
                    ))}
                </div>
            ) : projectsError ? (
                <ErrorState 
                    message={projectsError?.message || 'Unable to load projects. Please try again.'}
                    onRetry={() => window.location.reload()}
                    colorMode={colorMode}
                />
            ) : projectsArray.length === 0 ? (
                <EmptyState 
                    title="No projects yet"
                    description="Get started by creating your first project"
                    action={
                        <button
                            onClick={() => {
                                // Reset form to defaults with all roles pre-filled
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
                            className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                colorMode
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                        >
                            Create Your First Project
                        </button>
                    }
                    colorMode={colorMode}
                />
            ) : (
                <div className="space-y-3">
                    {projectsArray.map((p) => (<ProjectCard key={p.id} project={p} />))}
                </div>
            )}

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