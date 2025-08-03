import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, CalendarIcon, FolderIcon } from '../common/Icons';
import { getStatusStyles, formatPhoneNumber } from '../../utils/helpers';
import Modal from '../common/Modal';
import { useApiCall, useCreateProject, useCustomers, useProjects } from '../../hooks/useApi';
import { projectsService } from '../../services/api';
import { useWorkflowStates } from '../../hooks/useWorkflowState';
import WorkflowProgressService from '../../services/workflowProgress';

const defaultNewProject = {
    projectNumber: '',
    projectName: '',
    customerName: '',
    jobType: '',
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
    const [expandedProgress, setExpandedProgress] = useState({});
    const [error, setError] = useState('');
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [projectToArchive, setProjectToArchive] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const { createProject, loading: createLoading, error: createError } = useCreateProject();
    const { data: customersData, loading: customersLoading, error: customersError } = useCustomers({ limit: 100 });
    
    // Fetch projects directly from database
    const { data: projectsFromDb, loading: projectsLoading, error: projectsError } = useProjects({ limit: 100 });
    
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

    // Toggle progress expansion
    const toggleProgressExpansion = (projectId, section, event) => {
        // Prevent default behavior to avoid unwanted scrolling
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const key = `${projectId}-${section}`;
        setExpandedProgress(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

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

            const response = await createProject(projectData);
            
            if (response.success) {
                // Close modal and reset form
                setIsModalOpen(false);
                setNewProject(defaultNewProject);
                
                // Optionally trigger a refresh of the projects list
                if (onCreateProject) {
                    onCreateProject(response.data.project);
                }
                
                // Show success message
                console.log('Project created successfully:', response.data.project);
            }
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
                {/* Redesigned Header - Project Number with Phase and Type */}
                <div className={`p-3 border-b ${colorMode ? 'border-slate-600/30 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'}`}>
                    <div className="flex items-start justify-between">
                        {/* Left side - Project Number with Phase and Type */}
                        <div className="flex items-center gap-3">
                            <h3 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                {project.projectNumber || '12345'}
                            </h3>
                            {(() => {
                                // Use centralized phase detection
                                const projectPhase = WorkflowProgressService.getProjectPhase(project);
                                const phaseColors = WorkflowProgressService.getPhaseColor(projectPhase);
                                return (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${phaseColors.bg} ${phaseColors.text} border ${colorMode ? 'border-slate-500/30' : 'border-white/50'}`}>
                                        {projectPhase}
                                    </span>
                                );
                            })()}
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorMode ? 'bg-slate-600/60 text-slate-200 border border-slate-500/30' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                {tradesDisplay}
                            </span>
                        </div>
                    </div>
                    
                    {/* Customer Information Section - Redesigned */}
                    <div className="mt-3 space-y-2">
                        {/* Customer Name - Adjusted size and styling */}
                        <div className={`text-base font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} leading-tight`}>
                            {project.client?.name || `${project.customer?.firstName || ''} ${project.customer?.lastName || ''}`.trim() || 'Unknown Customer'}
                        </div>
                        
                        {/* Customer Contact Information - Compact layout */}
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${colorMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                                    <span className="text-[10px]">📞</span>
                                </div>
                                <a 
                                    href={`tel:${(project.client?.phone || project.customer?.phone || project.customer?.primaryPhone || '(555) 000-0000').replace(/[^\d+]/g, '')}`}
                                    className={`text-sm font-medium hover:underline transition-colors ${
                                        colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                >
                                    {project.client?.phone || project.customer?.phone || project.customer?.primaryPhone || '(555) 000-0000'}
                                </a>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${colorMode ? 'bg-green-500/20' : 'bg-green-50'}`}>
                                    <span className="text-[10px]">✉️</span>
                                </div>
                                <a 
                                    href={`mailto:${project.client?.email || project.customer?.email || project.customer?.primaryEmail || 'customer@email.com'}`}
                                    className={`text-sm font-medium hover:underline transition-colors ${
                                        colorMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-800'
                                    }`}
                                >
                                    {project.client?.email || project.customer?.email || project.customer?.primaryEmail || 'customer@email.com'}
                                </a>
                            </div>
                        </div>
                        
                        {/* Customer Address - Compact styling */}
                        <div className="flex items-start gap-1.5">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${colorMode ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
                                <span className="text-[10px]">📍</span>
                            </div>
                            <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} font-normal leading-relaxed flex-1`}>
                                {project.customer?.address || project.client?.address || project.address || project.name || project.projectName || '123 Main Street, City, State'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar Section - Moved Above Secondary Info */}
                <div className="p-3">
                    {/* Modern Progress Bar */}
                    <div className={`p-3 rounded-xl transition-all duration-300 backdrop-blur-sm ${colorMode ? 'bg-gradient-to-r from-slate-800/60 to-slate-700/60 border border-slate-600/40 shadow-lg' : 'bg-gradient-to-r from-white/90 to-gray-50/90 border border-gray-200/50 shadow-md'} ${expandedProgress[`${project.id}-materials-labor`] ? (colorMode ? 'ring-2 ring-blue-400/50 shadow-blue-500/10' : 'ring-2 ring-blue-500/50 shadow-blue-500/10') : ''}`}>
                        {/* Main Progress Bar Header */}
                        <button
                            onClick={() => toggleProgressExpansion(project.id, 'materials-labor')}
                            className={`w-full text-left transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/30' : 'hover:bg-gray-100/70'} rounded-lg p-2`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-bold tracking-wide ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Progress</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round(projectTrades.reduce((sum, trade) => sum + trade.laborProgress, 0) / projectTrades.length)}%</span>
                                    <svg 
                                        className={`w-4 h-4 transition-transform duration-300 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedProgress[`${project.id}-materials-labor`] ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {/* Modern Progress Bar */}
                            <div className={`w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                <div className="relative h-full">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-700 ease-out shadow-lg" 
                                        style={{ width: `${Math.round(projectTrades.reduce((sum, trade) => sum + trade.laborProgress, 0) / projectTrades.length)}%` }}
                                    ></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </button>
                        
                        {/* Expanded Progress Details */}
                        {expandedProgress[`${project.id}-materials-labor`] && (
                            <div className="space-y-3 mt-3 pl-2">
                                {/* Materials Progress */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Materials Delivered</span>
                                        <span className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round(projectTrades.filter(trade => trade.materialsDelivered).length / projectTrades.length * 100)}%</span>
                                    </div>
                                    <div className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div 
                                            className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-700 ease-out" 
                                            style={{ width: `${Math.round(projectTrades.filter(trade => trade.materialsDelivered).length / projectTrades.length * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                {/* Labor Progress */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Labor Completed</span>
                                        <span className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round(projectTrades.reduce((sum, trade) => sum + trade.laborProgress, 0) / projectTrades.length)}%</span>
                                    </div>
                                    <div className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div 
                                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-full rounded-full transition-all duration-700 ease-out" 
                                            style={{ width: `${Math.round(projectTrades.reduce((sum, trade) => sum + trade.laborProgress, 0) / projectTrades.length)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                {/* Trades Details Button */}
                                <div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleProgressExpansion(project.id, 'trades');
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'}`}
                                    >
                                        <span className={`text-sm font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Individual Trades</span>
                                        <svg 
                                            className={`w-3 h-3 transition-transform duration-200 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedProgress[`${project.id}-trades`] ? 'rotate-180' : ''}`} 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {/* Individual Trade Progress */}
                                    {expandedProgress[`${project.id}-trades`] && (
                                        <div className="space-y-2 mt-2 pl-3">
                                            {projectTrades.map((trade, index) => {
                                                const tradeColors = [
                                                    'from-purple-500 to-purple-600',
                                                    'from-pink-500 to-pink-600',
                                                    'from-yellow-500 to-yellow-600',
                                                    'from-teal-500 to-teal-600',
                                                    'from-red-500 to-red-600',
                                                    'from-indigo-500 to-indigo-600',
                                                    'from-cyan-500 to-cyan-600',
                                                    'from-amber-500 to-amber-600',
                                                    'from-lime-500 to-lime-600',
                                                    'from-fuchsia-500 to-fuchsia-600',
                                                ];
                                                const barColor = tradeColors[index % tradeColors.length];
                                                return (
                                                    <div key={index}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={`text-xs font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{trade.name}</span>
                                                            <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{trade.laborProgress}%</span>
                                                        </div>
                                                        <div className={`w-full h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                                            <div 
                                                                className={`bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-700 ease-out`} 
                                                                style={{ width: `${trade.laborProgress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Secondary Contacts and Project Manager - Below Progress Bar */}
                <div className="px-3 pb-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                        {/* Enhanced Secondary Customer 1 */}
                        <div className={`p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${colorMode ? 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/70' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-2 flex items-center gap-2`}>
                                <span className="text-sm">👤</span>
                                {project.customer?.secondaryName || 'Secondary Customer'}
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">📞</span>
                                    <a 
                                        href={`tel:${project.customer?.secondaryPhone || '(555) 000-0001'}`}
                                        className={`text-xs font-medium hover:underline transition-colors ${
                                            colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                        }`}
                                    >
                                        {project.customer?.secondaryPhone || '(555) 000-0001'}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">✉️</span>
                                    <a 
                                        href={`mailto:${project.customer?.secondaryEmail || 'secondary@email.com'}`}
                                        className={`text-xs font-medium hover:underline transition-colors ${
                                            colorMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-800'
                                        }`}
                                    >
                                        {project.customer?.secondaryEmail || 'secondary@email.com'}
                                    </a>
                                </div>
                            </div>
                        </div>
                        
                        {/* Enhanced Secondary Customer 2 */}
                        <div className={`p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${colorMode ? 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/70' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-2 flex items-center gap-2`}>
                                <span className="text-sm">👤</span>
                                Secondary Customer 2
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">📞</span>
                                    <a 
                                        href="tel:(555) 000-0002"
                                        className={`text-xs font-medium hover:underline transition-colors ${
                                            colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                        }`}
                                    >
                                        (555) 000-0002
                                    </a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">✉️</span>
                                    <a 
                                        href="mailto:secondary2@email.com"
                                        className={`text-xs font-medium hover:underline transition-colors ${
                                            colorMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-800'
                                        }`}
                                    >
                                        secondary2@email.com
                                    </a>
                                </div>
                            </div>
                        </div>
                        
                        {/* Enhanced Project Manager */}
                        <div className={`p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${colorMode ? 'bg-gradient-to-br from-blue-700/40 to-purple-700/40 border-blue-600/50 hover:from-blue-700/60 hover:to-purple-700/60' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100'}`}>
                            <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-2 flex items-center gap-2`}>
                                <span className="text-sm">🛠️</span>
                                PM: {project.projectManager?.firstName || project.projectManager?.name || 'Mike Rodriguez'}
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">📞</span>
                                    <a 
                                        href={`tel:${project.projectManager?.phone || '(555) 234-5678'}`}
                                        className={`text-xs font-medium hover:underline transition-colors ${
                                            colorMode ? 'text-blue-200 hover:text-blue-100' : 'text-blue-700 hover:text-blue-900'
                                        }`}
                                    >
                                        {project.projectManager?.phone || '(555) 234-5678'}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">✉️</span>
                                    <a 
                                        href={`mailto:${project.projectManager?.email || 'mike@company.com'}`}
                                        className={`text-xs font-medium hover:underline transition-colors ${
                                            colorMode ? 'text-green-200 hover:text-green-100' : 'text-green-700 hover:text-green-900'
                                        }`}
                                    >
                                        {project.projectManager?.email || 'mike@company.com'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Enhanced Action Buttons (Cubes) */}
                <div className="p-3">
                    <div className="grid grid-cols-3 gap-2">
                        {/* Row 1: Enhanced Workflow, Alerts, Messages */}
                        <button
                            onClick={() => onProjectSelect(project, 'Project Workflow')}
                            className={`group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2 text-xs font-bold shadow-md hover:shadow-lg transform hover:scale-105 ${
                                colorMode 
                                    ? 'bg-gradient-to-br from-slate-700/80 to-slate-800/80 border-slate-600/60 text-white hover:from-slate-600/90 hover:to-slate-700/90 hover:border-slate-500 hover:shadow-slate-900/30' 
                                    : 'bg-gradient-to-br from-white to-gray-50 border-gray-300 text-gray-800 hover:from-blue-50 hover:to-blue-100 hover:border-blue-400 hover:shadow-blue-200/50'
                            }`}
                        >
                            <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-200">⚙️</span>
                            <span className="text-center leading-tight">Workflow</span>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Alerts')}
                            className={`group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2 text-xs font-bold shadow-md hover:shadow-lg transform hover:scale-105 ${
                                colorMode 
                                    ? 'bg-gradient-to-br from-red-700/70 to-red-800/70 border-red-600/60 text-white hover:from-red-600/80 hover:to-red-700/80 hover:border-red-500 hover:shadow-red-900/30' 
                                    : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 text-red-800 hover:from-red-100 hover:to-red-200 hover:border-red-400 hover:shadow-red-200/50'
                            }`}
                        >
                            <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-200">🚨</span>
                            <span className="text-center leading-tight">Alerts</span>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Messages')}
                            className={`group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2 text-xs font-bold shadow-md hover:shadow-lg transform hover:scale-105 ${
                                colorMode 
                                    ? 'bg-gradient-to-br from-green-700/70 to-green-800/70 border-green-600/60 text-white hover:from-green-600/80 hover:to-green-700/80 hover:border-green-500 hover:shadow-green-900/30' 
                                    : 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 text-green-800 hover:from-green-100 hover:to-green-200 hover:border-green-400 hover:shadow-green-200/50'
                            }`}
                        >
                            <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-200">💬</span>
                            <span className="text-center leading-tight">Messages</span>
                        </button>
                        
                        {/* Row 2: Back button (if needed), Documents, Schedule */}
                        {showCardBackButton ? (
                            <button
                                onClick={handleBackToSource}
                                className={`group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2 text-xs font-bold shadow-md hover:shadow-lg transform hover:scale-105 ${
                                    colorMode 
                                        ? 'bg-gradient-to-br from-orange-700/80 to-orange-800/80 border-orange-600/70 text-white hover:from-orange-600/90 hover:to-orange-700/90 hover:border-orange-500 hover:shadow-orange-900/30' 
                                        : 'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300 text-orange-800 hover:from-orange-200 hover:to-orange-300 hover:border-orange-400 hover:shadow-orange-200/50'
                                }`}
                            >
                                <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-200">⬅️</span>
                                <span className="text-center leading-tight">Back</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => onProjectSelect(project, 'Analytics')}
                                className={`group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2 text-xs font-bold shadow-md hover:shadow-lg transform hover:scale-105 ${
                                    colorMode 
                                        ? 'bg-gradient-to-br from-purple-700/70 to-purple-800/70 border-purple-600/60 text-white hover:from-purple-600/80 hover:to-purple-700/80 hover:border-purple-500 hover:shadow-purple-900/30' 
                                        : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300 text-purple-800 hover:from-purple-100 hover:to-purple-200 hover:border-purple-400 hover:shadow-purple-200/50'
                                }`}
                            >
                                <span className="text-lg mb-1 group-hover:scale-110 transition-transform duration-200">📊</span>
                                <span className="text-center leading-tight">Analytics</span>
                            </button>
                        )}
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Documents')}
                            disabled
                            className={`group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2 text-xs font-bold shadow-md cursor-not-allowed opacity-50 ${
                                colorMode 
                                    ? 'bg-gradient-to-br from-slate-600/30 to-slate-700/30 border-slate-500/20 text-gray-400' 
                                    : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-200 text-gray-400'
                            }`}
                        >
                            <span className="text-lg mb-1">📁</span>
                            <span className="text-center leading-tight">Documents</span>
                        </button>
                        
                        <button
                            onClick={() => onProjectSelect(project, 'Project Schedule')}
                            disabled
                            className={`group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2 text-xs font-bold shadow-md cursor-not-allowed opacity-50 ${
                                colorMode 
                                    ? 'bg-gradient-to-br from-slate-600/30 to-slate-700/30 border-slate-500/20 text-gray-400' 
                                    : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-200 text-gray-400'
                            }`}
                        >
                            <span className="text-lg mb-1">📅</span>
                            <span className="text-center leading-tight">Schedule</span>
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
                    onClick={() => setIsModalOpen(true)}
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
                <div className={`${colorMode ? 'bg-slate-800/90 border-slate-600/50' : 'bg-white border-gray-200'} border rounded-lg p-6 text-center`}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                    <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading projects...
                    </p>
                </div>
            ) : projectsError ? (
                <div className={`${colorMode ? 'bg-red-900/20 border-red-600/50' : 'bg-red-50 border-red-200'} border rounded-lg p-6 text-center`}>
                    <div className="mb-3">
                        <svg className="mx-auto h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 className={`text-base font-semibold ${colorMode ? 'text-red-300' : 'text-red-800'}`}>Error loading projects</h3>
                    <p className={`mt-1 text-sm ${colorMode ? 'text-red-400' : 'text-red-600'}`}>
                        {projectsError}
                    </p>
                </div>
            ) : projectsArray.length === 0 ? (
                <div className={`${colorMode ? 'bg-slate-800/90 border-slate-600/50' : 'bg-white border-gray-200'} border rounded-lg p-6 text-center`}>
                    <div className="mb-3">
                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className={`text-base font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>No projects yet</h3>
                    <p className={`mt-1 text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Get started by creating your first project
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className={`mt-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            colorMode
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        Create Your First Project
                    </button>
                </div>
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
                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
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
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                            >
                                Create Project
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