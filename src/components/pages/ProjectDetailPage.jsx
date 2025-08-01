import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronLeftIcon, LocationMarkerIcon } from '../common/Icons';
import ProjectChecklistPage from './ProjectChecklistPage';
import ProjectMessagesPage from './ProjectMessagesPage';
import ProjectDocumentsPage from './ProjectDocumentsPage';
import TasksAndAlertsPage from './TasksAndAlertsPage';
import ProjectTimeline from '../../dashboard/ProjectTimeline';
import ScrollToTop from '../common/ScrollToTop';
import { formatPhoneNumber } from '../../utils/helpers';
import { useWorkflowAlerts } from '../../hooks/useApi';
import { teamMembers } from '../../data/mockData';

// Helper functions for advanced progress bars (moved to top level)

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
    } else {
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
    }
};

const getPhaseStyles = (phase) => {
    switch (phase?.toLowerCase()) {
        case 'lead':
        case 'lead phase':
            return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
        case 'prospect':
        case 'prospect phase':
            return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300';
        case 'approved':
        case 'approved phase':
            return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
        case 'execution':
        case 'execution phase':
            return 'bg-gradient-to-r from-sky-100 to-sky-200 text-sky-800 border border-sky-300';
        case 'supplement':
        case '2nd supplement':
        case '2nd supplement phase':
        case '2nd supp':
            return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
        case 'completion':
        case 'completion phase':
            return 'bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border border-teal-300';
        default: return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
    }
};



const ProjectDetailPage = ({ project, onBack, initialView = 'Project Workflow', onSendMessage, tasks, projects, onUpdate, activities, onAddActivity, colorMode, previousPage, projectSourceSection, onProjectSelect }) => {
    console.log('🔍 PROJECT DETAIL PAGE PROPS:');
    console.log('🔍 project:', project?.name);
    console.log('🔍 previousPage:', previousPage);
    console.log('🔍 projectSourceSection:', projectSourceSection);
    console.log('🔍 projectSourceSection type:', typeof projectSourceSection);
    console.log('🏗️ PROJECT DETAIL: Received props:');
    console.log('🏗️ PROJECT DETAIL: previousPage:', previousPage);
    console.log('🏗️ PROJECT DETAIL: projectSourceSection:', projectSourceSection);
    const [activeView, setActiveView] = useState(initialView);
    console.log('🔍 PROJECT_DETAIL: activeView state:', activeView);
    console.log('🔍 PROJECT_DETAIL: initialView prop:', initialView);
    const [projectData, setProjectData] = useState(project);
    const [phaseCompletion, setPhaseCompletion] = useState({
        completedPhases: {},
        progress: project?.progress || 0
    });
    const scrollRef = useRef(null);
    const [expandedProgress, setExpandedProgress] = useState({});
    const [selectedUserGroup, setSelectedUserGroup] = useState('all');
    
    // Alerts state for expanded functionality - matching dashboard
    const [expandedAlerts, setExpandedAlerts] = useState(new Set());
    const [expandedContacts, setExpandedContacts] = useState(new Set());
    const [expandedPMs, setExpandedPMs] = useState(new Set());
    
    // Call useWorkflowAlerts at the top level to comply with React hooks rules
    const { workflowAlerts, isLoading: alertsLoading, error: alertsError } = useWorkflowAlerts(projects);

    // Toggle progress expansion (updated to match ProjectsPage format)
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

    // Force scroll to top when component mounts or when project changes
    useEffect(() => {
        const scrollToTop = () => {
            // Scroll the main window
            window.scrollTo({ top: 0, behavior: 'auto' });
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            
            // Scroll the internal container
            if (scrollRef.current) {
                scrollRef.current.scrollTop = 0;
            }
            
            // Scroll any other scrollable containers
            const scrollableContainers = document.querySelectorAll('.overflow-y-auto, .flex-1, [class*="overflow"]');
            scrollableContainers.forEach(container => {
                if (container && container !== scrollRef.current) {
                    container.scrollTop = 0;
                }
            });
        };

        // Execute immediately
        scrollToTop();
        
        // Execute after a short delay to ensure DOM is ready
        setTimeout(scrollToTop, 1);
        setTimeout(scrollToTop, 10);
        setTimeout(scrollToTop, 50);
        setTimeout(scrollToTop, 100);
    }, [project?.id, activeView]);

    // Additional scroll to top when activeView changes (tab switching)
    useEffect(() => {
        const scrollToTop = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = 0;
            }
            window.scrollTo({ top: 0, behavior: 'auto' });
        };
        
        scrollToTop();
        setTimeout(scrollToTop, 10);
    }, [activeView]);

    useEffect(() => {
        setProjectData(project);
        setActiveView(initialView);
    }, [project, initialView]);

    // Monitor activeView changes
    useEffect(() => {
        console.log('🔍 PROJECT_DETAIL: activeView changed to:', activeView);
    }, [activeView]);

    useLayoutEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }, [project, initialView, activeView]);

    const handleChecklistUpdate = (newChecklist) => {
        const updatedProject = { ...projectData, checklist: newChecklist };
        setProjectData(updatedProject);
        onUpdate(updatedProject);
    };

    const handlePhaseCompletionChange = ({ completedPhases, progress }) => {
        setPhaseCompletion({ completedPhases, progress });
        // Optionally update project progress in parent state
        setProjectData(prev => ({ ...prev, progress }));
    };

    const handleAddTask = (newTask) => {
        // This would be handled by the TasksAndAlertsPage component
        console.log('New task added:', newTask);
    };

    // Custom back button handler to handle Project Workflow Alerts navigation
    const handleBackButton = () => {
        console.log('🔍 BACK BUTTON: handleBackButton called');
        console.log('🔍 BACK BUTTON: projectSourceSection:', projectSourceSection);
        
        // If we came from Project Workflow Alerts, navigate back to Alerts tab
        if (projectSourceSection === 'Project Workflow Alerts') {
            console.log('🔍 BACK BUTTON: Navigating back to Alerts tab');
            setActiveView('Alerts');
            return;
        }
        
        // Otherwise, use the default onBack behavior
        console.log('🔍 BACK BUTTON: Using default onBack behavior');
        onBack();
    };

    const getBackButtonText = () => {
        console.log('🔍 BACK BUTTON DEBUG:');
        console.log('🔍 previousPage:', previousPage);
        console.log('🔍 projectSourceSection:', projectSourceSection);
        console.log('🔍 projectSourceSection type:', typeof projectSourceSection);
        console.log('🔍 projectSourceSection === "Current Alerts":', projectSourceSection === 'Current Alerts');
        
        // FORCE TEST - if projectSourceSection is Current Alerts, return the correct text
        if (projectSourceSection === 'Current Alerts') {
            console.log('🔍 FORCE TEST: Returning Back to Current Alerts');
            return 'Back to Current Alerts';
        }
        
        // FORCE TEST - if projectSourceSection is Project Cubes, return the correct text
        if (projectSourceSection === 'Project Cubes') {
            console.log('🔍 FORCE TEST: Returning Back to Current Project Access');
            return 'Back to Current Project Access';
        }
        
        // NEW: Handle Project Workflow Alerts specifically
        if (projectSourceSection === 'Project Workflow Alerts') {
            console.log('🔍 FORCE TEST: Returning Back to Alerts');
            return 'Back to Alerts';
        }
        

        
        switch (previousPage) {
            case 'Overview':
                // Check if we came from a specific section on the dashboard
                if (projectSourceSection === 'Project Messages') {
                    console.log('🔍 Returning: Back to Project Messages');
                    return 'Back to Project Messages';
                } else if (projectSourceSection === 'Current Alerts') {
                    console.log('🔍 Returning: Back to Current Alerts');
                    return 'Back to Current Alerts';
                } else if (projectSourceSection === 'Project Cubes') {
                    console.log('🔍 Returning: Back to Current Project Access');
                    return 'Back to Current Project Access';
                } else if (projectSourceSection === 'Project Phases') {
                    console.log('🔍 Returning: Back to Project Phases');
                    return 'Back to Project Phases';
                } else if (projectSourceSection === 'Project Workflow Alerts') {
                    console.log('🔍 Returning: Back to Alerts');
                    return 'Back to Alerts';
                }
                console.log('🔍 Returning: Back to Current Project Access (default)');
                return 'Back to Current Project Access';
            case 'Projects':
                return 'Back to Current Projects';
            case 'Alerts':
                return 'Back to Project Alerts';
            case 'Project Messages':
                return 'Back to Project Messages';
            case 'Project Schedules':
                return 'Back to Project Schedules';
            case 'Company Calendar':
                return 'Back to Company Calendar';
            case 'AI Assistant':
                return 'Back to AI Assistant';
            case 'AI Tools':
                return 'Back to AI Training Tools';
            case 'Training & Knowledge Base':
                return 'Back to AI Knowledge Base';
            case 'Archived Projects':
                return 'Back to Archived Projects';
            default:
                console.log('🔍 Returning: Back to Current Project Access (default case)');
                return 'Back to Current Project Access';
        }
    };

    // Helper functions for alerts - matching dashboard implementation
    const mapStepToWorkflowStructure = (stepName, phase) => {
        // Default mapping - this should match your workflow structure
        return {
            section: phase === 'LEAD' ? 'Initial Contact' : 
                    phase === 'PROSPECT' ? 'Preliminary Assessment' :
                    phase === 'APPROVED' ? 'Contract & Permitting' :
                    phase === 'EXECUTION' ? 'Installation & Progress' :
                    phase === 'COMPLETION' ? 'Final Documentation' : 'Unknown Section',
            lineItem: stepName || 'Unknown Line Item'
        };
    };

    const renderProjectView = () => {
        console.log('🔍 PROJECT_DETAIL: renderProjectView called with activeView:', activeView);
        if (!project || (!project.client && !project.customer)) {
            return <div className="text-red-600 font-bold">Project data is missing or incomplete.</div>;
        }
        switch(activeView) {
            case 'Project Workflow':
                console.log('🏗️ DETAIL: Rendering Project Workflow with project:', projectData);
                console.log('🏗️ DETAIL: Project has highlightStep:', !!projectData?.highlightStep);
                console.log('🏗️ DETAIL: highlightStep value:', projectData?.highlightStep);
                return <ProjectChecklistPage project={projectData} onUpdate={handleChecklistUpdate} onPhaseCompletionChange={handlePhaseCompletionChange} />;
            case 'Project Schedule':
                return (
                    <div className="space-y-6">
                        {/* Schedule Section */}
                        <div className="bg-gradient-to-br from-blue-100/40 to-blue-200/10 p-3 rounded-xl border border-blue-100/40">
                            <h4 className="font-semibold text-gray-700 mb-3 text-xs">Schedule</h4>
                            <div className="space-y-3">
                                {/* Materials Delivery */}
                                <div className="flex items-center justify-between rounded-lg shadow-sm bg-gradient-to-r from-green-100 to-green-50 border border-green-200 px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        {/* Box Icon */}
                                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="2"/></svg>
                                        <span className="text-green-800 font-medium text-sm">Materials Delivery</span>
                                    </div>
                                    <span className="text-green-700 font-extrabold text-base">
                                        {project.materialsDeliveryStart && project.materialsDeliveryEnd 
                                            ? `${project.materialsDeliveryStart} - ${project.materialsDeliveryEnd}`
                                            : project.materialsDeliveryStart 
                                                ? project.materialsDeliveryStart
                                                : 'TBD'
                                        }
                                    </span>
                                </div>
                                {/* Labor */}
                                <div className="flex items-center justify-between rounded-lg shadow-sm bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200 px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        {/* Hardhat Icon */}
                                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 17v-1a10 10 0 0120 0v1" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 7v4" stroke="currentColor" strokeWidth="2"/><path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="2"/></svg>
                                        <span className="text-yellow-800 font-medium text-sm">Labor</span>
                                    </div>
                                    <span className="text-yellow-700 font-extrabold text-base">
                                        {project.laborStart && project.laborEnd 
                                            ? `${project.laborStart} - ${project.laborEnd}`
                                            : project.laborStart 
                                                ? project.laborStart
                                                : 'TBD'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Messages':
                const projectActivities = activities?.filter(a => a.projectId === project.id || a.projectId === project._id || a.relatedProject === project.id || a.relatedProject === project._id) || [];
                
                // Project-specific Project Messages section (copied from dashboard)
                return (
                    <div className="w-full" data-section="project-messages">
                        <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] px-4 py-3 pb-6 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} relative overflow-visible`}>
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Messages</h1>
                                    </div>
                                </div>
                                
                                {/* Filter Controls */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[7px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
                                    <select 
                                        className={`text-[7px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                            colorMode 
                                                ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        <option value="">All Subjects</option>
                                        <option value="Project Update">Project Update</option>
                                        <option value="Material Delivery">Material Delivery</option>
                                        <option value="Site Inspection">Site Inspection</option>
                                        <option value="Customer Communication">Customer Communication</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2 mt-3">
                                {projectActivities.length === 0 ? (
                                    <div className="text-gray-400 text-center py-3 text-[9px]">
                                        No messages found for this project.
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-center py-3 text-xs">
                                        Project-specific messages will be displayed here using ProjectMessagesCard components.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'Alerts':
                // Filter alerts for this specific project (using hook values from top level)
                const projectAlerts = workflowAlerts?.filter(alert => 
                    alert.projectId === project.id || alert.projectId === project._id
                ) || [];
                
                // Further filter by user group if selected
                const filteredProjectAlerts = selectedUserGroup === 'all' 
                    ? projectAlerts 
                    : projectAlerts.filter(alert => alert.userGroup === selectedUserGroup);
                
                const handleCompleteAlert = async (alert, alertIndex) => {
                    try {
                        // Step 1: Mark the specific workflow line item as completed
                        const response = await fetch('/api/workflow/complete-step', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                projectId: alert.projectId,
                                stepId: alert.stepId,
                                phase: alert.phase,
                                section: alert.section,
                                step: alert.step
                            })
                        });

                        if (!response.ok) {
                            throw new Error('Failed to complete workflow step');
                        }

                        const result = await response.json();
                        
                        // Step 2: Get current workflow state to check for completions
                        const workflowResponse = await fetch(`/api/workflow/${alert.projectId}`);
                        if (!workflowResponse.ok) {
                            throw new Error('Failed to fetch workflow');
                        }
                        
                        const { data: workflow } = await workflowResponse.json();
                        
                        // Find current phase and section
                        const currentPhase = alert.phase;
                        const currentSection = alert.section;
                        
                        // Step 3: Check for section and phase completion
                        const sectionSteps = workflow.steps?.filter(step => 
                            step.phase === currentPhase && step.section === currentSection
                        );
                        
                        const completedSectionSteps = sectionSteps?.filter(step => step.isCompleted) || [];
                        
                        if (completedSectionSteps.length === sectionSteps.length) {
                            // Mark section as completed
                            await fetch('/api/workflow/complete-section', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    projectId: alert.projectId,
                                    phase: currentPhase,
                                    section: currentSection
                                })
                            });
                            
                            // Check if all sections in phase are completed
                            const phaseSteps = workflow.steps?.filter(step => step.phase === currentPhase);
                            const completedPhaseSteps = phaseSteps?.filter(step => step.isCompleted) || [];
                            
                            if (completedPhaseSteps.length === phaseSteps.length - 1) { // -1 because we just completed one
                                // Mark phase as completed
                                await fetch('/api/workflow/complete-phase', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        projectId: alert.projectId,
                                        phase: currentPhase
                                    })
                                });
                            }
                        }
                        
                        // Emit socket event for real-time updates
                        if (window.socket) {
                            window.socket.emit('workflowUpdated', {
                                projectId: alert.projectId,
                                stepId: alert.stepId,
                                phase: alert.phase,
                                section: alert.section,
                                isCompleted: true
                            });
                        }
                        
                        console.log('✅ Alert completed successfully:', result);
                        
                    } catch (error) {
                        console.error('❌ Error completing alert:', error);
                        // Optionally show user-friendly error message
                    }
                };
                
                // Project-specific Current Alerts section (copied from dashboard)
                return (
                    <div className="w-full" data-section="project-alerts">
                        <div className={`border-t-4 border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-[8px] rounded-t-[8px] px-4 py-3 ${colorMode ? 'bg-[#232b4d]/80' : 'bg-white'} overflow-hidden relative`}>
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h1 className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Project Alerts</h1>
                                    </div>
                                </div>
                                
                                {/* Filter Controls */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[9px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter by:</span>
                                    <select 
                                        value={selectedUserGroup}
                                        onChange={(e) => setSelectedUserGroup(e.target.value)}
                                        className={`text-[10px] font-medium px-1 py-0.5 rounded border transition-colors ${
                                            colorMode 
                                                ? 'bg-[#1e293b] border-[#3b82f6]/30 text-gray-300 hover:border-[#3b82f6]/50' 
                                                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        <option value="all">All User Groups</option>
                                        <option value="PM">PM</option>
                                        <option value="FIELD">FIELD</option>
                                        <option value="OFFICE">OFFICE</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Scrollable content area with fixed height */}
                            <div className="h-[650px] overflow-y-auto space-y-2 mt-3">
                                {alertsLoading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                        <p className={`mt-2 text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading alerts...</p>
                                    </div>
                                ) : alertsError ? (
                                    <div className="text-center py-8">
                                        <p className="text-red-500 text-sm">Error loading alerts: {alertsError}</p>
                                    </div>
                                ) : filteredProjectAlerts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className={`text-6xl mb-4 ${colorMode ? 'text-gray-600' : 'text-gray-300'}`}>🎉</div>
                                        <p className={`text-sm font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            No alerts for this project
                                        </p>
                                        <p className={`text-xs mt-1 ${colorMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            All workflow items are up to date!
                                        </p>
                                    </div>
                                ) : (
                                    filteredProjectAlerts.map((alert, index) => {
                                        const alertProject = projects?.find(p => p.id === alert.projectId || p._id === alert.projectId);
                                        const projectNumber = alertProject?.projectNumber || alert.projectNumber || 'N/A';
                                        const primaryContact = alertProject?.client?.name || alertProject?.customer?.name || alertProject?.clientName || alert.customerName || 'Unknown Customer';
                                        
                                        return (
                                            <div
                                                key={alert.id || `${alert.projectId}-${alert.stepId}-${index}`}
                                                className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-lg shadow-sm border transition-all duration-200`}
                                            >
                                                <div className="flex items-center gap-2 p-2">
                                                    {/* User Group Circle */}
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 ${
                                                        alert.userGroup === 'PM'
                                                            ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-800 border border-green-300'
                                                            : alert.userGroup === 'FIELD'
                                                            ? 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border border-orange-300'
                                                            : alert.userGroup === 'OFFICE'
                                                            ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
                                                            : alert.userGroup === 'ADMIN'
                                                            ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 border border-purple-300'
                                                            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                                                    }`}>
                                                        {alert.userGroup?.charAt(0) || 'A'}
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        {/* Main row with project info */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                                {/* Project Number */}
                                                                <button
                                                                    className={`text-sm font-bold transition-colors hover:underline ${ 
                                                                        colorMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                                                    }`}
                                                                    onClick={() => {
                                                                        if (onProjectSelect && alertProject) {
                                                                            onProjectSelect(alertProject, 'Overview', null, 'Current Alerts');
                                                                        }
                                                                    }}
                                                                >
                                                                    {projectNumber}
                                                                </button>
                                                                
                                                                {/* Primary Contact */}
                                                                <span className={`text-sm font-semibold truncate ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                    {primaryContact}
                                                                </span>
                                                                
                                                                {/* Alert Description */}
                                                                <span className={`text-sm font-medium truncate ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    {alert.step || alert.description || 'Workflow Alert'}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Complete Button */}
                                                            <button
                                                                onClick={() => handleCompleteAlert(alert, index)}
                                                                className="px-3 py-1 bg-green-600 text-white text-[11px] font-medium rounded hover:bg-green-700 transition-colors flex-shrink-0"
                                                            >
                                                                Complete
                                                            </button>
                                                        </div>
                                                        
                                                        {/* Phase and Section info */}
                                                        <div className={`text-[11px] mt-1 ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            <span className="font-medium">{alert.phase}</span>
                                                            <span className="mx-1">•</span>
                                                            <span>{alert.section}</span>
                                                            {alert.userGroup && (
                                                                <>
                                                                    <span className="mx-1">•</span>
                                                                    <span className="font-medium">{alert.userGroup}</span>
                                                                </>
                                                            )}
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'Project Timeline':
                // Calculate actual dates based on project timeline
                const calculatePhaseDates = (startDate, endDate, phaseIndex, totalPhases) => {
                    if (!startDate || !endDate) return 'TBD';
                    
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const totalDuration = end - start;
                    const phaseDuration = totalDuration / totalPhases;
                    
                    const phaseStart = new Date(start.getTime() + (phaseIndex * phaseDuration));
                    const phaseEnd = new Date(start.getTime() + ((phaseIndex + 1) * phaseDuration));
                    
                    return `${phaseStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${phaseEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                };

                // Format delivery and labor dates
                const formatDateRange = (startDate, endDate) => {
                    if (!startDate) return 'TBD';
                    if (!endDate) return startDate;
                    
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    
                    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                };

                const projectTimeline = [
                    // Delivery and Labor dates at the TOP
                    {
                        phase: 'Materials Delivery',
                        date: formatDateRange(projectData.materialsDeliveryStart, projectData.materialsDeliveryEnd),
                        label: 'Materials Delivery',
                        detail: 'Delivery and inspection of all project materials',
                        tasks: [
                            'Schedule Delivery',
                            'Receive Materials',
                            'Inspect Materials',
                            'Store Materials Securely',
                            'Verify All Items Received'
                        ],
                        responsible: '🚚 Delivery + 👷‍♂️ PM'
                    },
                    {
                        phase: 'Labor Phase',
                        date: formatDateRange(projectData.laborStart, projectData.laborEnd),
                        label: 'Installation & Labor',
                        detail: 'Field installation, progress monitoring, quality assurance',
                        tasks: [
                            'Installation Process (Field Crew)',
                            'Daily Progress Documentation',
                            'Quality Check (Field + Admin)',
                            'Customer Updates',
                            'Subcontractor Coordination'
                        ],
                        responsible: '🛠️ Field Crew + 📝 Admin'
                    },
                    // Project phases after delivery and labor
                    {
                        phase: 'Lead Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 0, 6),
                        label: 'Lead Processing',
                        detail: 'Customer information input, property evaluation, PM assignment',
                        tasks: [
                            'Input Customer Information',
                            'Complete Questions Checklist', 
                            'Input Lead Property Information',
                            'Assign Project Manager',
                            'Schedule Initial Inspection'
                        ],
                        responsible: '🏢 Office'
                    },
                    {
                        phase: 'Prospect Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 1, 6),
                        label: 'Site Inspection & Estimation',
                        detail: 'Site inspection, estimate preparation, insurance processing',
                        tasks: [
                            'Site Inspection (PM)',
                            'Write Estimate (PM)',
                            'Insurance Process (Admin)',
                            'Agreement Preparation (Admin)',
                            'Agreement Signing (Admin)'
                        ],
                        responsible: '👷‍♂️ PM + 📝 Admin'
                    },
                    {
                        phase: 'Approved Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 2, 6),
                        label: 'Project Setup',
                        detail: 'Material ordering, permit processing, production preparation',
                        tasks: [
                            'Administrative Setup',
                            'Pre-Job Actions (Permits)',
                            'Prepare for Production',
                            'Verify Labor Orders',
                            'Verify Material Orders'
                        ],
                        responsible: '📝 Admin + 🏢 Office'
                    },
                    {
                        phase: 'Execution Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 3, 6),
                        label: 'Installation & Quality Check',
                        detail: 'Field installation, progress monitoring, quality assurance',
                        tasks: [
                            'Installation Process (Field Crew)',
                            'Daily Progress Documentation',
                            'Quality Check (Field + Admin)',
                            'Customer Updates',
                            'Subcontractor Coordination'
                        ],
                        responsible: '🛠️ Field Crew + 📝 Admin'
                    },
                    {
                        phase: '2nd Supplement Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 4, 6),
                        label: 'Supplement Processing',
                        detail: 'Insurance supplement creation, follow-up, customer updates',
                        tasks: [
                            'Create Supplement in Xactimate',
                            'Insurance Follow-up',
                            'Review Approved Items',
                            'Customer Updates',
                            'Final Supplement Processing'
                        ],
                        responsible: '📝 Administration'
                    },
                    {
                        phase: 'Completion Phase',
                        date: calculatePhaseDates(projectData.startDate, projectData.endDate, 5, 6),
                        label: 'Project Closeout',
                        detail: 'Final inspection, financial processing, warranty registration',
                        tasks: [
                            'Final Inspection',
                            'Financial Processing',
                            'AR Follow-Up',
                            'Project Closeout',
                            'Warranty Registration'
                        ],
                        responsible: '🏢 Office + 📝 Admin'
                    }
                ];
                
                // Calculate current step based on project progress and actual dates
                const getCurrentStep = (progress, materialsDeliveryStart, laborStart) => {
                    const now = new Date();
                    
                    // Check if materials delivery has started
                    if (materialsDeliveryStart && new Date(materialsDeliveryStart) <= now) {
                        if (progress < 15) return 0; // Materials Delivery
                        if (progress < 30) return 1; // Labor Phase
                        if (progress < 45) return 2; // Lead Phase
                        if (progress < 60) return 3; // Prospect Phase
                        if (progress < 75) return 4; // Approved Phase
                        if (progress < 85) return 5; // Execution Phase
                        if (progress < 95) return 6; // 2nd Supplement Phase
                        return 7; // Completion Phase
                    }
                    
                    // Before materials delivery
                    if (progress < 15) return 0; // Materials Delivery (pending)
                    if (progress < 30) return 1; // Labor Phase (pending)
                    if (progress < 45) return 2; // Lead Phase
                    if (progress < 60) return 3; // Prospect Phase
                    if (progress < 75) return 4; // Approved Phase
                    if (progress < 85) return 5; // Execution Phase
                    if (progress < 95) return 6; // 2nd Supplement Phase
                    return 7; // Completion Phase
                };
                
                const currentStep = getCurrentStep(projectData.progress || 0, projectData.materialsDeliveryStart, projectData.laborStart);
                
                return (
                    <div className="space-y-6">
                        {/* Project Timeline */}
                        <ProjectTimeline timeline={projectTimeline} currentStep={currentStep} />
                    </div>
                );
            case 'Project Documents':
                return <ProjectDocumentsPage project={projectData} onBack={onBack} colorMode={colorMode} />;
            case 'Work Order':
                return <div className="p-8 text-center text-gray-400 text-sm">(Blank for now)</div>;
            default:
                return <ProjectChecklistPage project={projectData} onUpdate={handleChecklistUpdate} onPhaseCompletionChange={handlePhaseCompletionChange} />;
        }
    };

    const navItems = ['Project Workflow', 'Alerts', 'Messages', 'Project Schedule', 'Project Documents', 'Work Order'];

    if (!project) {
        return <div className="text-red-600 font-bold p-8">No project selected or project data is missing.</div>;
    }

    return (
        <div className="h-full flex flex-col">
            <ScrollToTop />
            
            {/* Header with Back Button and Tabs - Normal Position */}
            <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                {/* Back Button Row */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <button 
                        onClick={handleBackButton} 
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors duration-200 border border-blue-200 hover:border-blue-300"
                    >
                        <ChevronLeftIcon className="w-3 h-3" />
                        {getBackButtonText()}
                    </button>
                    
                    {/* Compact Project & Customer Info */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`font-semibold ${colorMode ? 'text-gray-800' : 'text-gray-800'}`}>
                            {project.projectName || project.name || 'Project Name'}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className={`font-semibold ${colorMode ? 'text-gray-800' : 'text-gray-800'}`}>
                            {project.customer?.name || project.client?.name || 'Client Name'}
                        </span>
                        <span className="text-gray-400">•</span>
                        <a 
                            href={`tel:${((project.customer?.phone || project.client?.phone) || '(555) 123-4567').replace(/[^\d+]/g, '')}`} 
                            className={`hover:underline ${colorMode ? 'text-blue-600 hover:text-blue-500' : 'text-blue-600 hover:text-blue-700'}`}
                        >
                            {formatPhoneNumber(project.customer?.phone || project.client?.phone)}
                        </a>
                        <span className="text-gray-400">•</span>
                        <a 
                            href={`mailto:${(project.customer?.email || project.client?.email) || 'client@email.com'}`} 
                            className={`hover:underline ${colorMode ? 'text-blue-600 hover:text-blue-500' : 'text-blue-600 hover:text-blue-700'}`}
                        >
                            {project.customer?.email || project.client?.email || 'client@email.com'}
                        </a>
                    </div>
                </div>
                
                {/* Tabs Navigation */}
                <div className="px-3 py-1">
                    <nav className="flex space-x-4" aria-label="Tabs">
                        {navItems.map(item => {
                            // Define which tabs are disabled/not ready
                            const disabledTabs = ['Project Schedule', 'Work Order', 'Project Documents'];
                            const isDisabled = disabledTabs.includes(item);
                            
                            return (
                                <button 
                                    key={item} 
                                    disabled={isDisabled}
                                    onClick={() => {
                                        if (!isDisabled) {
                                            console.log('🔍 PROJECT_DETAIL: Tab clicked:', item);
                                            console.log('🔍 PROJECT_DETAIL: Current activeView:', activeView);
                                            setActiveView(item);
                                            console.log('🔍 PROJECT_DETAIL: Setting activeView to:', item);
                                            // Force scroll to top when switching tabs
                                            setTimeout(() => {
                                                if (scrollRef.current) {
                                                    scrollRef.current.scrollTop = 0;
                                                }
                                                window.scrollTo({ top: 0, behavior: 'auto' });
                                            }, 1);
                                        }
                                    }} 
                                    className={`whitespace-nowrap py-1 px-1 border-b-2 font-medium text-xs transition-colors duration-200 ${
                                        isDisabled 
                                            ? 'border-transparent text-gray-400 opacity-70 cursor-not-allowed' 
                                            : activeView === item 
                                                ? 'border-primary-500 text-primary-600' 
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {item === 'Project Workflow' && phaseCompletion.completedPhases && Object.values(phaseCompletion.completedPhases).length === 7 && Object.values(phaseCompletion.completedPhases).every(Boolean) ? (
                                        <span className="line-through">{item}</span>
                                    ) : item}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>
            
            {/* Content Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                {/* Scrollable Content */}
                <div className="p-4">
                    <div className="min-h-[calc(100vh-200px)]">
                        {renderProjectView()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage; 