import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, CalendarIcon, FolderIcon } from '../common/Icons';
import { getStatusStyles, formatPhoneNumber } from '../../utils/helpers';
import Modal from '../common/Modal';
import { useProjects, useCustomers, useCreateProject } from '../../hooks/useQueryApi';
import { projectsService } from '../../services/api';
import { ProjectCardSkeleton, ErrorState, EmptyState } from '../ui/SkeletonLoaders';
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
    const createProjectMutation = useCreateProject();
    const { data: customersData, isLoading: customersLoading, error: customersError } = useCustomers({ limit: 100 });
    
    // Fetch projects directly from database
    const { data: projectsFromDb, isLoading: projectsLoading, error: projectsError } = useProjects({ limit: 100 });
    
    // CRITICAL: Use centralized workflow states for 100% consistency
    const { workflowStates, getWorkflowState, getPhaseForProject, getPhaseColorForProject, getPhaseInitialForProject, getProgressForProject } = useWorkflowStates(projectsFromDb);
    
    // Helper functions for phase-based progress
    const getPhaseIndex = (phase) => {
        const phases = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', '2ND SUPP', 'COMPLETION'];
        return phases.indexOf(phase) !== -1 ? phases.indexOf(phase) : 0;
    };

    const getPhaseProgress = (project, targetPhase) => {
        if (!project.workflow || !project.workflow.steps) return 0;
        
        const phaseSteps = project.workflow.steps.filter(step => 
            step.phase === targetPhase || 
            (targetPhase === '2ND SUPP' && step.phase === 'SECOND_SUPP')
        );
        
        if (phaseSteps.length === 0) return 0;
        
        const completedSteps = phaseSteps.filter(step => step.isCompleted);
        return Math.round((completedSteps.length / phaseSteps.length) * 100);
    };
    
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
                    
                    {/* Customer Information Section with Project Cubes */}
                    <div className="mt-3 space-y-3">
                        {/* Customer Name and Address Together */}
                        <div className="space-y-1">
                            <div className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} leading-tight`}>
                                {project.client?.name || project.customer?.primaryName || `${project.customer?.firstName || ''} ${project.customer?.lastName || ''}`.trim() || 'Unknown Customer'}
                            </div>
                            {/* Address directly below name */}
                            <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} font-normal leading-relaxed`}>
                                {project.customer?.address || project.client?.address || project.address || project.name || project.projectName || '123 Main Street, City, State'}
                            </div>
                        </div>
                        
                        {/* Customer Contact Information and Project Cubes - Side by Side */}
                        <div className="flex items-start justify-between gap-4">
                            {/* Customer Contact Information - Left Side */}
                            <div className="flex flex-col gap-2">
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
                            
                            {/* Project Cubes - Right Side (Replicated from Dashboard) */}
                            <div className="grid grid-cols-3 gap-1.5 max-w-[180px]">
                                <button
                                    onClick={() => onProjectSelect(project, 'Project Workflow')}
                                    className={`group flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[8px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-blue-700/80 hover:border-blue-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-400'}`}
                                >
                                    <span className="mb-0.5 text-[10px]">🗂️</span>
                                    Workflow
                                </button>
                                
                                <button
                                    onClick={() => onProjectSelect(project, 'Alerts')}
                                    className={`group flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[8px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-amber-700/80 hover:border-amber-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-amber-50 hover:border-amber-400'}`}
                                >
                                    <span className="mb-0.5 text-[10px]">⚠️</span>
                                    Alerts
                                </button>
                                
                                <button
                                    onClick={() => onProjectSelect(project, 'Messages')}
                                    className={`group flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[8px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-sky-700/80 hover:border-sky-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-sky-50 hover:border-sky-400'}`}
                                >
                                    <span className="mb-0.5 text-[10px]">💬</span>
                                    Messages
                                </button>
                                
                                <button
                                    onClick={() => {}}
                                    disabled={true}
                                    className={`group flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[8px] font-semibold cursor-not-allowed opacity-50 ${colorMode ? 'bg-slate-600/40 border-slate-500/30 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                >
                                    <span className="mb-0.5 text-[10px]">📄</span>
                                    Documents
                                </button>
                                
                                <button
                                    onClick={() => onProjectSelect(project, 'Project Schedule')}
                                    disabled
                                    className={`group flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[8px] font-semibold cursor-not-allowed opacity-50 ${colorMode ? 'bg-slate-600/40 border-slate-500/30 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                >
                                    <span className="mb-0.5 text-[10px]">📅</span>
                                    Schedule
                                </button>
                                
                                <button
                                    onClick={() => onProjectSelect(project, 'Projects')}
                                    className={`group flex flex-col items-center justify-center p-2 rounded-lg shadow transition-all duration-200 border text-[8px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-gray-700/80 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-400'}`}
                                >
                                    <span className="mb-0.5 text-[10px]">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="8" r="4" fill="#2563eb" />
                                            <path d="M4 20c0-2.5 3.5-4.5 8-4.5s8 2 8 4.5" fill="#2563eb" />
                                        </svg>
                                    </span>
                                    Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Additional Household Members and Project Manager - Moved Up */}
                <div className="px-3 pb-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                        {/* Secondary Customer 1 - Conditional Rendering */}
                        {project.customer?.secondaryName ? (
                            <div className={`p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${colorMode ? 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/70' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'} mb-2 flex items-center gap-2`}>
                                    <span className="text-sm">👤</span>
                                    {project.customer.secondaryName}
                                </div>
                                <div className="space-y-1.5">
                                    {project.customer?.secondaryPhone && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs">📞</span>
                                            <a 
                                                href={`tel:${project.customer.secondaryPhone}`}
                                                className={`text-xs font-medium hover:underline transition-colors ${
                                                    colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                                }`}
                                            >
                                                {project.customer.secondaryPhone}
                                            </a>
                                        </div>
                                    )}
                                    {project.customer?.secondaryEmail && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs">✉️</span>
                                            <a 
                                                href={`mailto:${project.customer.secondaryEmail}`}
                                                className={`text-xs font-medium hover:underline transition-colors ${
                                                    colorMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-800'
                                                }`}
                                            >
                                                {project.customer.secondaryEmail}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={`p-3 rounded-lg border-2 border-dashed shadow-sm transition-all duration-200 hover:shadow-md ${colorMode ? 'bg-slate-800/30 border-slate-600/50 hover:bg-slate-800/50' : 'bg-gray-50/50 border-gray-300 hover:bg-gray-100/50'}`}>
                                <div className="text-center">
                                    <div className={`text-xs font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                                        Additional Household Member
                                    </div>
                                    <button className={`text-xs px-2 py-1 rounded transition-colors ${colorMode ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                                        + Add Contact
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Additional Contact Slot */}
                        <div className={`p-3 rounded-lg border-2 border-dashed shadow-sm transition-all duration-200 hover:shadow-md ${colorMode ? 'bg-slate-800/30 border-slate-600/50 hover:bg-slate-800/50' : 'bg-gray-50/50 border-gray-300 hover:bg-gray-100/50'}`}>
                            <div className="text-center">
                                <div className={`text-xs font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                                    Additional Household Member
                                </div>
                                <button className={`text-xs px-2 py-1 rounded transition-colors ${colorMode ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                                    + Add Contact
                                </button>
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
                
                {/* Project Progress Section - Moved to Bottom with Dashboard-Style Dropdown */}
                <div className="p-3">
                    <button
                        onClick={() => toggleProgressExpansion(project.id || project._id, 'progress')}
                        className={`w-full p-3 rounded-lg transition-all duration-200 ${colorMode ? 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800/70' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        {/* Project Progress Header - Clickable */}
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-sm font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Progress</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    {getProgressForProject(project)}%
                                </span>
                                <svg 
                                    className={`w-4 h-4 transition-transform duration-200 ${colorMode ? 'text-gray-400' : 'text-gray-600'} ${expandedProgress[`${project.id || project._id}-progress`] ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        
                        {/* Overall Progress Bar */}
                        <div className={`w-full h-4 rounded-full overflow-hidden ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${getProgressForProject(project)}%` }}
                            />
                        </div>
                    </button>
                    
                    {/* Expandable Progress Details - Dashboard Style */}
                    {expandedProgress[`${project.id || project._id}-progress`] && (
                        <div className="mt-3 space-y-3">
                            {/* Phase Indicators */}
                            <div className="grid grid-cols-6 gap-2">
                                {['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', '2ND SUPP', 'COMPLETION'].map((phase, index) => {
                                    const currentPhase = getPhaseForProject(project);
                                    const phaseProgress = getPhaseProgress(project, phase);
                                    const isCurrentPhase = currentPhase === phase;
                                    const isPastPhase = getPhaseIndex(currentPhase) > getPhaseIndex(phase);
                                    
                                    return (
                                        <div key={phase} className="text-center">
                                            <div className="relative mb-1">
                                                <div 
                                                    className={`w-full h-2 rounded-full overflow-hidden ${
                                                        colorMode ? 'bg-slate-700' : 'bg-gray-200'
                                                    }`}
                                                >
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            isPastPhase ? 'bg-green-500' :
                                                            isCurrentPhase ? 'bg-blue-500' :
                                                            'bg-gray-400'
                                                        }`}
                                                        style={{ 
                                                            width: isPastPhase ? '100%' : 
                                                                   isCurrentPhase ? `${phaseProgress}%` : 
                                                                   '0%' 
                                                        }}
                                                    />
                                                </div>
                                                {isCurrentPhase && (
                                                    <div className="absolute -top-1 -right-1">
                                                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`text-[10px] font-medium ${
                                                isCurrentPhase ? (colorMode ? 'text-blue-300' : 'text-blue-600') :
                                                isPastPhase ? (colorMode ? 'text-green-300' : 'text-green-600') :
                                                (colorMode ? 'text-gray-500' : 'text-gray-400')
                                            }`}>
                                                {phase === '2ND SUPP' ? '2ND SUPP' : phase}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* Materials and Labor Progress Bars - Dashboard Style */}
                            <div className="space-y-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Materials Progress</span>
                                        <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>75%</span>
                                    </div>
                                    <div className={`w-full h-2 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: '75%' }}></div>
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Labor Progress</span>
                                        <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{getProgressForProject(project)}%</span>
                                    </div>
                                    <div className={`w-full h-2 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div className="bg-orange-400 h-2 rounded-full transition-all duration-500" style={{ width: `${getProgressForProject(project)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
                            onClick={() => setIsModalOpen(true)}
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