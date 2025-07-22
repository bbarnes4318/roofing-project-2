import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, CalendarIcon, FolderIcon } from '../common/Icons';
import { getStatusStyles, formatPhoneNumber } from '../../utils/helpers';
import Modal from '../common/Modal';
import { useApiCall, useCreateProject, useCustomers } from '../../hooks/useApi';
import { projectsService } from '../../services/api';

const defaultNewProject = {
    projectName: '',
    projectType: '',
    status: 'Pending',
    budget: '',
    startDate: '',
    endDate: '',
    customer: '',
    address: '',
    priority: 'Medium',
    description: ''
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
    
    // Ensure all arrays are properly handled
    const customers = Array.isArray(customersData) ? customersData : [];
    const projectsArray = Array.isArray(projects) ? projects : [];

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
                return 'from-gray-500 to-gray-600';
            case 'prospect':
            case 'prospect phase':
                return 'from-orange-500 to-orange-600';
            case 'approved':
            case 'approved phase':
                return 'from-green-500 to-green-600';
            case 'execution':
            case 'execution phase':
                return 'from-blue-500 to-blue-600';
            case 'supplement':
            case '2nd supplement':
            case '2nd supplement phase':
                return 'from-yellow-500 to-yellow-600';
            case 'completion':
            case 'completion phase':
                return 'from-teal-500 to-teal-600';
            default:
                return 'from-gray-500 to-gray-600';
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
                return 'Prospect-Insurance-1st Supplement';
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newProject.projectName || !newProject.projectType || !newProject.budget || !newProject.customer || !newProject.address) {
            setError('Please fill in all required fields');
            return;
        }

        setError('');

        try {
            const projectData = {
                ...newProject,
                budget: parseFloat(newProject.budget)
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
                {/* Compact Header */}
                <div className={`p-2 border-b ${colorMode ? 'border-slate-600/30 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-900'} truncate mb-0.5`}>
                                {project.name || project.projectName}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                                    project.phase === 'Lead' ? 'bg-yellow-100 text-yellow-800' :
                                    project.phase === 'Prospect' ? 'bg-blue-100 text-blue-800' :
                                    project.phase === 'Approved' ? 'bg-green-100 text-green-800' :
                                    project.phase === 'Execution' ? 'bg-purple-100 text-purple-800' :
                                    project.phase === 'Completion' ? 'bg-gray-100 text-gray-800' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {project.phase}
                                </span>
                                <span className={`text-[9px] ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {tradesDisplay}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Customer Info */}
                <div className="p-2 space-y-2">
                    <div className="grid grid-cols-3 gap-3 items-start">
                        {/* Customer Info Section - 1/3 width */}
                        <div className="flex items-start gap-1.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${colorMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                {project.client?.name?.charAt(0) || project.customer?.firstName?.charAt(0) || 'C'}
                            </div>
                            <div className="flex-1">
                                <div className={`text-xs font-medium ${colorMode ? 'text-white' : 'text-gray-900'} mb-0.5`}>
                                    {project.client?.name || `${project.customer?.firstName || ''} ${project.customer?.lastName || ''}`.trim() || 'Unknown Customer'}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px]">📞</span>
                                        <a 
                                            href={`tel:${project.client?.phone || project.customer?.phoneNumber || '(555) 000-0000'}`}
                                            className={`text-[9px] text-blue-600 hover:text-blue-800 hover:underline transition-colors`}
                                        >
                                            {project.client?.phone || project.customer?.phoneNumber || '(555) 000-0000'}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px]">✉️</span>
                                        <a 
                                            href={`mailto:${project.client?.email || project.customer?.email || 'customer@email.com'}`}
                                            className={`text-[9px] text-blue-600 hover:text-blue-800 hover:underline transition-colors`}
                                        >
                                            {project.client?.email || project.customer?.email || 'customer@email.com'}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Materials Section - 1/3 width */}
                        <div className={`p-2 rounded-lg opacity-50 ${colorMode ? 'bg-slate-600/30 border border-slate-500/20' : 'bg-gray-100 border border-gray-300'}`}>
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-sm opacity-60">📦</span>
                                <span className={`text-xs font-semibold ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Materials
                                </span>
                            </div>
                            <div className={`text-xs font-bold ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {project.materialsDeliveryStart ? project.materialsDeliveryStart : 'TBD'}
                            </div>
                        </div>

                        {/* Labor Section - 1/3 width */}
                        <div className={`p-2 rounded-lg opacity-50 ${colorMode ? 'bg-slate-600/30 border border-slate-500/20' : 'bg-gray-100 border border-gray-300'}`}>
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-sm opacity-60">👷</span>
                                <span className={`text-xs font-semibold ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Labor
                                </span>
                            </div>
                            <div className={`text-xs font-bold ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {project.laborStart ? project.laborStart : 'TBD'}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar Section - Full Width */}
                    <div className={`p-2 rounded-lg ${colorMode ? 'bg-slate-700/20 border border-slate-600/30' : 'bg-gray-50/90 border border-gray-200/50'}`}>
                        {/* Main Progress Bar (clickable to expand) */}
                        <button
                            onClick={() => toggleProgressExpansion(project.id, 'materials-labor')}
                            className={`w-full text-left transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'} rounded p-0.5`}
                        >
                            <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-[8px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Progress</span>
                                <div className="flex items-center gap-1">
                                    <span className={`text-[8px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round(projectTrades.reduce((sum, trade) => sum + trade.laborProgress, 0) / projectTrades.length)}%</span>
                                    <svg 
                                        className={`w-2 h-2 transition-transform duration-200 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedProgress[`${project.id}-materials-labor`] ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            <div className={`w-full h-1.5 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.round(projectTrades.reduce((sum, trade) => sum + trade.laborProgress, 0) / projectTrades.length)}%` }}
                                ></div>
                            </div>
                        </button>
                        {/* Materials and Labor Progress Bars (expandable) */}
                        {expandedProgress[`${project.id}-materials-labor`] && (
                            <div className="space-y-1.5 mt-1.5">
                                {/* Materials Progress */}
                                <div>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Materials</span>
                                        <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round(projectTrades.filter(trade => trade.materialsDelivered).length / projectTrades.length * 100)}%</span>
                                    </div>
                                    <div className={`w-full h-1 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div 
                                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-1 rounded-full transition-all duration-500" 
                                            style={{ width: `${Math.round(projectTrades.filter(trade => trade.materialsDelivered).length / projectTrades.length * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                {/* Labor Progress */}
                                <div>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Labor</span>
                                        <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round(projectTrades.reduce((sum, trade) => sum + trade.laborProgress, 0) / projectTrades.length)}%</span>
                                    </div>
                                    <div className={`w-full h-1 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                        <div 
                                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1 rounded-full transition-all duration-500" 
                                            style={{ width: `${Math.round(projectTrades.reduce((sum, trade) => sum + trade.laborProgress, 0) / projectTrades.length)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Individual Trades Progress Bars (only visible when materials-labor is expanded) */}
                        {expandedProgress[`${project.id}-materials-labor`] && (
                            <div>
                                <button
                                    onClick={() => toggleProgressExpansion(project.id, 'trades')}
                                    className={`w-full flex items-center justify-between p-0.5 rounded transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'}`}
                                >
                                    <span className={`text-[7px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Trades</span>
                                    <svg 
                                        className={`w-2 h-2 transition-transform duration-200 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${expandedProgress[`${project.id}-trades`] ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {expandedProgress[`${project.id}-trades`] && (
                                    <div className="space-y-1.5 mt-1.5">
                                        {projectTrades.map((trade, index) => (
                                            <div key={index}>
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className={`text-[7px] font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{trade.name}</span>
                                                    <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{trade.laborProgress}%</span>
                                                </div>
                                                <div className={`w-full h-1 bg-gray-200 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                                    <div 
                                                        className="bg-gradient-to-r from-blue-500 to-green-500 h-1 rounded-full transition-all duration-500" 
                                                        style={{ width: `${trade.laborProgress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Compact Action Buttons */}
                    <div className="grid grid-cols-3 gap-1">
                        {/* Row 1: Workflow, Alerts, Messages */}
                        <button
                            onClick={() => onProjectSelect(project, 'Project Workflow')}
                            className={`flex flex-col items-center justify-center p-1 rounded transition-all duration-200 border text-[7px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-gray-700/80 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-400'}`}
                        >
                            <span className="text-[9px] mb-0.5">⚙️</span>
                            Workflow
                        </button>
                        <button
                            onClick={() => onProjectSelect(project, 'Alerts')}
                            className={`flex flex-col items-center justify-center p-1 rounded transition-all duration-200 border text-[7px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-gray-700/80 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-400'}`}
                        >
                            <span className="text-[9px] mb-0.5">🚨</span>
                            Alerts
                        </button>
                        <button
                            onClick={() => onProjectSelect(project, 'Messages')}
                            className={`flex flex-col items-center justify-center p-1 rounded transition-all duration-200 border text-[7px] font-semibold ${colorMode ? 'bg-slate-700/60 border-slate-600/40 text-white hover:bg-gray-700/80 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-400'}`}
                        >
                            <span className="text-[9px] mb-0.5">💬</span>
                            Messages
                        </button>
                        {/* Row 2: Back button (if needed), Documents, Schedule */}
                        {showCardBackButton ? (
                            <button
                                onClick={handleBackToSource}
                                className={`flex flex-col items-center justify-center p-1 rounded transition-all duration-200 border text-[7px] font-semibold ${colorMode ? 'bg-orange-600/80 border-orange-500/80 text-white hover:bg-orange-700/90 hover:border-orange-600' : 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200 hover:border-orange-400'}`}
                            >
                                <span className="text-[9px] mb-0.5">⬅️</span>
                                Back
                            </button>
                        ) : (
                            <div />
                        )}
                        <button
                            onClick={() => onProjectSelect(project, 'Documents')}
                            disabled
                            className={`flex flex-col items-center justify-center p-1 rounded transition-all duration-200 border text-[7px] font-semibold cursor-not-allowed opacity-50 ${colorMode ? 'bg-slate-600/30 border-slate-500/20 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                        >
                            <span className="text-[9px] mb-0.5">📁</span>
                            Documents
                        </button>
                        <button
                            onClick={() => onProjectSelect(project, 'Project Schedule')}
                            disabled
                            className={`flex flex-col items-center justify-center p-1 rounded transition-all duration-200 border text-[7px] font-semibold cursor-not-allowed opacity-50 ${colorMode ? 'bg-slate-600/30 border-slate-500/20 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                        >
                            <span className="text-[9px] mb-0.5">📅</span>
                            Schedule
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

            {/* Projects list or empty state */}
            {projectsArray.length === 0 ? (
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Project Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={newProject.name}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    colorMode
                                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                }`}
                                placeholder="Enter project name"
                                required
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Customer Name
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
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Customer Phone
                            </label>
                            <input
                                type="tel"
                                name="customerPhone"
                                value={newProject.customerPhone}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    colorMode
                                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                }`}
                                placeholder="Enter customer phone"
                                required
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                Project Phase
                            </label>
                            <select
                                name="phase"
                                value={newProject.phase}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    colorMode
                                        ? 'bg-slate-700 border-slate-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                required
                            >
                                <option value="">Select a phase</option>
                                <option value="Pre-Construction">Pre-Construction</option>
                                <option value="Foundation">Foundation</option>
                                <option value="Framing">Framing</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Plumbing">Plumbing</option>
                                <option value="HVAC">HVAC</option>
                                <option value="Roofing">Roofing</option>
                                <option value="Siding">Siding</option>
                                <option value="Interior Finishing">Interior Finishing</option>
                                <option value="Exterior Finishing">Exterior Finishing</option>
                                <option value="Final Inspection">Final Inspection</option>
                                <option value="Punch List">Punch List</option>
                                <option value="Project Complete">Project Complete</option>
                            </select>
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