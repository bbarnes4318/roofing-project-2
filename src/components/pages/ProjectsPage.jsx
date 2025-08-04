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
import UnifiedProgressTracker from '../ui/UnifiedProgressTracker';
// Removed broken drag libraries - using native implementation

const defaultNewProject = {
    projectNumber: '',
    projectName: '',
    customerName: '',
    jobType: '',
    projectManager: '', // New field for Project Manager
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
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
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
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (defaultsResponse.ok) {
                    const defaultsData = await defaultsResponse.json();
                    if (defaultsData.success) {
                        setDefaultRoles(defaultsData.data);
                        
                        // Pre-fill project manager if default exists
                        if (defaultsData.data.projectManager) {
                            setNewProject(prev => ({
                                ...prev,
                                projectManager: defaultsData.data.projectManager.id
                            }));
                            console.log('✅ Pre-filled project manager with default:', defaultsData.data.projectManager.name);
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
            
            // Find a secondary contact (first non-primary contact with a name)
            const secondaryContact = newProject.contacts.find(contact => 
                !contact.isPrimary && contact.name.trim() && contact !== primaryContact
            );

            // Step 1: Create customer with proper contact structure
            const customerData = {
                primaryName: newProject.customerName,
                primaryEmail: primaryContact?.email || 'noemail@example.com',
                primaryPhone: primaryContact?.phone || '0000000000',
                // Add secondary contact if available
                secondaryName: secondaryContact?.name || null,
                secondaryEmail: secondaryContact?.email || null,
                secondaryPhone: secondaryContact?.phone || null,
                primaryContact: 'PRIMARY', // Always set primary as the main contact
                address: `${newProject.customerName} Project`, // Better default address
                notes: `Project created from Add Project form`,
                // Send all contacts to be created in the new Contact table
                contacts: newProject.contacts
                    .filter(contact => contact.name && contact.name.trim()) // Only send contacts with names
                    .map(contact => ({
                        name: contact.name.trim(),
                        phone: contact.phone || null,
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
                    const customerResponse = await fetch('/api/customers', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify(customerData)
                    });
                    
                    if (!customerResponse.ok) {
                        throw new Error('Failed to create customer');
                    }
                    
                    const customerResult = await customerResponse.json();
                    customerId = customerResult.data.id;
                }
            } catch (error) {
                console.error('Error creating customer:', error);
                setError('Failed to create customer. Please try again.');
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

    // Removed all drag and drop functionality - reverted to original static buttons

    // At the top, after extracting scrollToProjectId/targetProjectId and projectSourceSection:
    // (Assume targetProjectId is already set as in the current code)
    const showHeaderBackButton = !((projectSourceSection === 'Activity Feed' || projectSourceSection === 'My Alerts' || projectSourceSection === 'Current Alerts' || projectSourceSection === 'Project Cubes' || projectSourceSection === 'Project Phases') && targetProjectId);

    const ProjectCard = ({ project }) => {
        const projectTrades = getProjectTrades(project);
        // Convert trades array to display string
        const tradesDisplay = Array.isArray(projectTrades) 
            ? projectTrades.map(trade => trade.name).join(', ')
            : projectTrades || project.projectType || 'General';
        
        // Determine if this card should show the back button
        const showCardBackButton = (projectSourceSection === 'Activity Feed' || projectSourceSection === 'My Alerts' || projectSourceSection === 'Current Alerts' || projectSourceSection === 'Project Cubes' || projectSourceSection === 'Project Phases' || projectSourceSection === 'Project Messages' || projectSourceSection === 'Project Workflow Alerts') && String(project.id) === String(targetProjectId);
        
        return (
            <div 
                data-project-id={String(project.id)}
                className={`${colorMode ? 'bg-slate-800/90 border-slate-600/50' : 'bg-white border-gray-200'} border rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md`}
            >
                {/* Header - Project Number with Phase and Type */}
                <div className={`p-3 border-b ${colorMode ? 'border-slate-600/30 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'}`}>
                    <div className="flex items-start justify-between">
                        {/* Left side - Project Number with Phase, Section, Line Item and Type */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                {project.projectNumber || '12345'}
                            </h3>
                            
                            {(() => {
                                // Use centralized phase detection
                                const projectPhase = WorkflowProgressService.getProjectPhase(project);
                                const phaseColors = WorkflowProgressService.getPhaseColor(projectPhase);
                                
                                // Get current workflow state (section and line item)
                                const workflowState = getWorkflowState(project.id);
                                const currentSection = workflowState?.currentSection?.name || 'Initial Setup';
                                const currentLineItem = workflowState?.currentLineItem?.description || 'Getting Started';
                                
                                return (
                                    <div className="flex items-center gap-2">
                                        {/* Phase Badge */}
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${phaseColors.bg} ${phaseColors.text} border ${colorMode ? 'border-slate-500/30' : 'border-white/50'}`}>
                                            {projectPhase}
                                        </span>
                                        
                                        {/* Workflow Progress Indicator */}
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-l-4 border-l-blue-500 ${
                                            colorMode 
                                                ? 'bg-slate-700/80 border border-slate-600/50 text-slate-200' 
                                                : 'bg-blue-50/80 border border-blue-200/50 text-gray-700'
                                        }`}>
                                            <div className="flex items-center gap-1.5">
                                                {/* Section Icon */}
                                                <div className={`w-2 h-2 rounded-full ${
                                                    colorMode ? 'bg-blue-400' : 'bg-blue-500'
                                                }`}></div>
                                                
                                                {/* Section and Line Item */}
                                                <div className="flex flex-col">
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${
                                                        colorMode ? 'text-blue-400' : 'text-blue-600'
                                                    }`}>
                                                        {currentSection}
                                                    </div>
                                                    <div className={`text-[9px] font-medium ${
                                                        colorMode ? 'text-slate-300' : 'text-gray-600'
                                                    }`}>
                                                        {currentLineItem.length > 25 ? `${currentLineItem.substring(0, 25)}...` : currentLineItem}
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Arrow */}
                                                <div className={`ml-1 ${colorMode ? 'text-blue-400' : 'text-blue-500'}`}>
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorMode ? 'bg-slate-600/60 text-slate-200 border border-slate-500/30' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                {tradesDisplay}
                            </span>
                        </div>
                    </div>
                    
                    {/* Customer Information */}
                    <div className="mt-3 space-y-3">
                        {/* Customer Name and Address */}
                        <div className="space-y-1">
                            <div className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} leading-tight`}>
                                {project.client?.name || project.customer?.primaryName || `${project.customer?.firstName || ''} ${project.customer?.lastName || ''}`.trim() || 'Unknown Customer'}
                            </div>
                            <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} font-normal leading-relaxed`}>
                                {project.customer?.address || project.client?.address || project.address || project.name || project.projectName || '123 Main Street, City, State'}
                            </div>
                        </div>
                        
                        {/* Customer Contact Info */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${colorMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                                    <span className="text-[10px]">📞</span>
                                </div>
                                <a 
                                    href={`tel:${(project.client?.phone || project.customer?.phone || project.customer?.primaryPhone || '').replace(/[^\d+]/g, '')}`}
                                    className={`text-sm font-medium hover:underline transition-colors ${
                                        colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                >
                                    {project.client?.phone || project.customer?.phone || project.customer?.primaryPhone || 'Add phone'}
                                </a>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${colorMode ? 'bg-green-500/20' : 'bg-green-50'}`}>
                                    <span className="text-[10px]">✉️</span>
                                </div>
                                <a 
                                    href={`mailto:${project.client?.email || project.customer?.email || project.customer?.primaryEmail || ''}`}
                                    className={`text-sm font-medium hover:underline transition-colors ${
                                        colorMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-800'
                                    }`}
                                >
                                    {project.client?.email || project.customer?.email || project.customer?.primaryEmail || 'Add email'}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Progress Bar Section */}
                <div className="p-3">
                    <UnifiedProgressTracker 
                        project={project}
                        projectTrades={projectTrades}
                        colorMode={colorMode}
                        showPhase={false}
                        showProjectNumber={false}
                        showCustomerName={false}
                        showProjectType={false}
                        showProjectManager={false}
                        showOnlyProgressBar={true}
                    />
                </div>
                
                {/* Back Button (if needed from source navigation) */}
                {showCardBackButton && (
                    <div className="px-3 pb-3">
                        <button
                            onClick={handleBackToSource}
                            className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-all duration-200 border text-sm font-medium ${
                                colorMode 
                                    ? 'bg-gradient-to-r from-orange-700/80 to-orange-800/80 border-orange-600/70 text-white hover:from-orange-600/90 hover:to-orange-700/90 hover:border-orange-500' 
                                    : 'bg-gradient-to-r from-orange-100 to-orange-200 border-orange-300 text-orange-800 hover:from-orange-200 hover:to-orange-300 hover:border-orange-400'
                            }`}
                        >
                            <span>⬅️</span>
                            <span>{getBackButtonText()}</span>
                        </button>
                    </div>
                )}
                
                {/* 6 Project Action Buttons - Bottom Section */}
                <div className="px-3 pb-3">
                    <div className="grid grid-cols-3 gap-2">
                        {/* Row 1 */}
                        <button
                            onClick={() => {
                              // ENHANCED: Get current workflow state and add highlighting like Current Alerts
                              const workflowState = WorkflowProgressService.calculateProjectProgress(project);
                              const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
                              const currentPhase = WorkflowProgressService.getProjectPhase(project);
                              
                              const projectWithWorkflowState = {
                                ...project,
                                currentWorkflowStep: currentStep,
                                workflowState: workflowState,
                                scrollToCurrentLineItem: true,
                                targetPhase: currentPhase,
                                targetSection: currentStep?.stepName || currentStep?.name,
                                targetLineItem: currentStep?.stepId,
                                highlightLineItem: currentStep?.stepId,
                                sourceSection: 'My Projects',
                                // Add navigation context for proper workflow highlighting like Current Alerts
                                navigationTarget: {
                                  phase: currentPhase,
                                  section: currentStep?.stepName || currentStep?.name,
                                  lineItem: currentStep?.stepName || currentStep?.name,
                                  stepName: currentStep?.stepName || currentStep?.name,
                                  stepId: currentStep?.stepId,
                                  highlightMode: 'line-item',
                                  scrollBehavior: 'smooth',
                                  targetElementId: `line-item-${(currentStep?.stepName || currentStep?.name || '').replace(/\s+/g, '-').toLowerCase()}`,
                                  highlightColor: '#3B82F6',
                                  highlightDuration: 3000
                                }
                              };
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
                        // Reset form to defaults with project manager pre-filled
                        const resetProject = { 
                            ...defaultNewProject,
                            projectManager: defaultRoles.projectManager?.id || ''
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
                                // Reset form to defaults with project manager pre-filled
                                const resetProject = { 
                                    ...defaultNewProject,
                                    projectManager: defaultRoles.projectManager?.id || ''
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