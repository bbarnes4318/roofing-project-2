import React, { useState, useEffect, useRef } from 'react';
import {
  ChartPieIcon, DocumentTextIcon, BellIcon, SparklesIcon, CogIcon, LogoutIcon, CalendarIcon, ChatBubbleLeftRightIcon, ChevronDownIcon, ChartBarIcon, UserIcon, UserGroupIcon, FolderIcon, ArchiveBoxIcon
} from './components/common/Icons';
import { authService } from './services/api';
import DashboardPage from './components/pages/DashboardPage';
import ProjectsPage from './components/pages/ProjectsPage';
import ProjectDetailPage from './components/pages/ProjectDetailPage';
import ArchivedProjectsPage from './components/pages/ArchivedProjectsPage';
import ActivityFeedPage from './components/pages/ActivityFeedPage';
import TasksAndAlertsPage from './components/pages/TasksAndAlertsPage';
import AIAssistantPage from './components/pages/AIAssistantPage';
import AIToolsPage from './components/pages/AIToolsPage';
import EstimateComparisonTool from './components/pages/EstimateComparisonTool';
import SettingsPage from './components/pages/SettingsPage';
import CompanyCalendarPage from './components/pages/CompanyCalendarPage';
import ProjectSchedulesPage from './components/pages/ProjectSchedulesPage';
import CustomersPage from './components/pages/CustomersPage';
import { initialProjects, initialTasks, initialActivityData } from './data/mockData';
import AIPoweredBadge from './components/common/AIPoweredBadge';
import { mapStatusToPhase } from './components/pages/ProjectChecklistPage'; // or from wherever mapStatusToPhase is defined

export default function App() {
    const [activePage, setActivePage] = useState('Overview');
    // Remove old individual state variables - they're now in navigationState
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [colorMode, setColorMode] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [activities, setActivities] = useState(initialActivityData);
    const [tasks, setTasks] = useState(initialTasks);
    const [projects, setProjects] = useState(initialProjects);
    const profileDropdownRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // Get current user data on component mount
    useEffect(() => {
        const user = authService.getStoredUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    // Helper functions for dynamic user data
    const getGreeting = () => {
        if (!currentUser) return "Good afternoon!";
        const hour = new Date().getHours();
        const firstName = currentUser.firstName || "User";
        
        if (hour < 12) return `Good morning, ${firstName}!`;
        if (hour < 17) return `Good afternoon, ${firstName}!`;
        return `Good evening, ${firstName}!`;
    };

    const getUserFullName = () => {
        if (!currentUser) return "User";
        return `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
    };

    const getUserInitials = () => {
        if (!currentUser) return "U";
        const firstName = currentUser.firstName || "";
        const lastName = currentUser.lastName || "";
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const getUserPosition = () => {
        if (!currentUser) return "User";
        return currentUser.position || currentUser.role || "User";
    };

    // Handle clicking outside the profile dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Scroll to top whenever activePage changes
    useEffect(() => {
        // IMMEDIATE scroll to top - multiple methods
        window.scrollTo({ top: 0, behavior: 'auto' });
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;
        
        // Force scroll on all possible containers
        const containers = [
            document.querySelector('main'),
            document.querySelector('#root'),
            document.querySelector('.overflow-y-auto'),
            document.querySelector('.flex-1'),
            document.querySelector('[data-section]'),
            document.querySelector('.h-full'),
            document.querySelector('[class*="overflow"]'),
            document.querySelector('.scroll-container'),
            document.querySelector('.content-area'),
            document.querySelector('.flex-1.overflow-y-auto')
        ];
        
        containers.forEach(container => {
            if (container) {
                container.scrollTop = 0;
                container.scrollLeft = 0;
            }
        });
        
        // Multiple aggressive attempts
        const forceScroll = () => {
            window.scrollTo({ top: 0, behavior: 'auto' });
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            containers.forEach(container => {
                if (container) {
                    container.scrollTop = 0;
                }
            });
        };
        
        // Execute immediately and multiple times
        forceScroll();
        setTimeout(forceScroll, 5);
        setTimeout(forceScroll, 15);
        setTimeout(forceScroll, 30);
        setTimeout(forceScroll, 60);
        setTimeout(forceScroll, 120);
        setTimeout(forceScroll, 250);
        setTimeout(forceScroll, 500);
        
        // Final smooth scroll
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 600);
    }, [activePage]);

    // Replace individual navigation state variables with a single object
    const [navigationState, setNavigationState] = useState({
      selectedProject: null,
      projectInitialView: 'Project Workflow',
      projectSourceSection: null,
      previousPage: 'Overview'
    });

    // Additional useEffect specifically for when selectedProject changes
    useEffect(() => {
        if (navigationState.selectedProject) {
            const scrollToTop = () => {
                // Target the specific scroll container
                const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
                if (scrollContainer) {
                    scrollContainer.scrollTop = 0;
                }
                
                // Also try window
                window.scrollTo(0, 0);
                
                // And all other containers
                const containers = [
                    document.querySelector('main'),
                    document.querySelector('#root'),
                    document.querySelector('.overflow-y-auto'),
                    document.querySelector('.flex-1'),
                    document.querySelector('[data-section]'),
                    document.querySelector('.h-full'),
                    document.querySelector('[class*="overflow"]'),
                    document.querySelector('.scroll-container'),
                    document.querySelector('.content-area'),
                    document.querySelector('.flex-1.overflow-y-auto')
                ];
                
                containers.forEach(container => {
                    if (container) {
                        container.scrollTop = 0;
                        container.scrollLeft = 0;
                    }
                });
            };
            
            // Execute multiple times
            scrollToTop();
            setTimeout(scrollToTop, 10);
            setTimeout(scrollToTop, 50);
            setTimeout(scrollToTop, 100);
            setTimeout(scrollToTop, 500);
            setTimeout(scrollToTop, 1000);
        }
    }, [navigationState.selectedProject]);

    const navigate = (page) => { 
        setNavigationState(prev => ({
            ...prev,
            previousPage: activePage,
            selectedProject: null
        }));
        setActivePage(page); 
        setSidebarOpen(false); // Close sidebar on mobile after navigation
    };
    
    // Handle back button click
    const handleBackButton = () => {
        console.log('🔍 APP: handleBackButton called');
        console.log('🔍 APP: navigationState:', navigationState);
        
        if (navigationState.selectedProject) {
            console.log('🔍 APP: Going back from project detail');
            setNavigationState(prev => ({ ...prev, selectedProject: null }));
            setActivePage(navigationState.previousPage || 'Overview');
        } else {
            console.log('🔍 APP: No project selected, staying on current page');
        }
    };

    // Monitor navigation state changes
    useEffect(() => {
        console.log('🔍 NAV_STATE_CHANGE: navigationState updated:', navigationState);
        console.log('🔍 NAV_STATE_CHANGE: activePage:', activePage);
    }, [navigationState, activePage]);

    // Update handleProjectSelect to set all navigation state at once
    const handleProjectSelect = (project, view = 'Project Workflow', phase = null, sourceSection = null) => {
        console.log('🔍 APP: handleProjectSelect called with:');
        console.log('🔍 APP: project:', project?.name);
        console.log('🔍 APP: view:', view);
        console.log('🔍 APP: phase:', phase);
        console.log('🔍 APP: sourceSection:', sourceSection);
        
        // If view is 'Projects', navigate to Projects page instead of ProjectDetailPage
        if (view === 'Projects') {
            console.log('🔍 APP: Setting activePage to Projects');
            console.log('🔍 APP: Current activePage before update:', activePage);
            setActivePage('Projects');
            console.log('🔍 APP: Setting navigationState with selectedProject: null');
            console.log('🔍 APP: Current navigationState before update:', navigationState);
            setNavigationState(prev => {
                const newState = {
                    ...prev,
                    selectedProject: null, // <-- Ensure ProjectDetailPage is not shown
                    projectSourceSection: sourceSection,
                    previousPage: activePage,
                    scrollToProject: project // Pass the project data for scrolling
                };
                console.log('🔍 APP: New navigationState:', newState);
                return newState;
            });
            setSidebarOpen(false);
            console.log('🔍 APP: Navigation setup complete, returning early');
            return;
        }
        
        const fullProject = projects.find(p => p.id === project.id);
        const projectWithEnhancements = fullProject ? {
            ...fullProject,
            ...project,
            id: fullProject.id,
            _id: fullProject._id
        } : project;

        const newNavigationState = {
            selectedProject: projectWithEnhancements,
            projectInitialView: view,
            projectSourceSection: sourceSection,
            previousPage: navigationState.selectedProject ? navigationState.previousPage : activePage
        };
        
        console.log('🔍 APP: Setting navigationState:', newNavigationState);
        setNavigationState(newNavigationState);
        setSidebarOpen(false);
    };

    // Update handleBackToProjects to use navigationState
    const handleBackToProjects = () => {
      console.log('🔍 BACK_TO_PROJECTS: handleBackToProjects called');
      console.log('🔍 BACK_TO_PROJECTS: projectSourceSection:', navigationState.projectSourceSection);
      console.log('🔍 BACK_TO_PROJECTS: previousPage:', navigationState.previousPage);
      
      // Handle specific case: coming from Activity Feed tab in Project Messages
      if (navigationState.projectSourceSection === 'Project Messages') {
        console.log('🔍 BACK_TO_PROJECTS: Navigating back to ProjectDetailPage with Messages tab');
        // Find the project that was being viewed
        const currentProject = navigationState.selectedProject || navigationState.scrollToProject;
        if (currentProject) {
          setNavigationState(prev => ({
            ...prev,
            selectedProject: currentProject,
            projectInitialView: 'Messages',
            projectSourceSection: 'Project Messages'
          }));
          return;
        }
      }
      
      // Handle specific case: coming from Project Alerts tab in Project Workflow Alerts
      if (navigationState.projectSourceSection === 'Project Workflow Alerts') {
        console.log('🔍 BACK_TO_PROJECTS: Navigating back to ProjectDetailPage with Alerts tab');
        // Find the project that was being viewed
        const currentProject = navigationState.selectedProject || navigationState.scrollToProject;
        if (currentProject) {
          setNavigationState(prev => ({
            ...prev,
            selectedProject: currentProject,
            projectInitialView: 'Alerts',
            projectSourceSection: 'Project Workflow Alerts'
          }));
          return;
        }
      }
      
      setNavigationState(prev => ({ ...prev, selectedProject: null }));
      if (navigationState.previousPage === 'Projects') {
        setActivePage('Projects');
      } else if (navigationState.previousPage === 'Overview') {
        if (navigationState.projectSourceSection === 'Activity Feed') {
          setActivePage('Overview');
          setTimeout(() => {
            const activityFeedSection = document.querySelector('[data-section="activity-feed"]');
            if (activityFeedSection) activityFeedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        } else if (navigationState.projectSourceSection === 'Current Alerts') {
          setActivePage('Overview');
          setTimeout(() => {
            const currentAlertsSection = document.querySelector('[data-section="current-alerts"]');
            if (currentAlertsSection) currentAlertsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        } else if (navigationState.projectSourceSection === 'Project Cubes') {
          setActivePage('Overview');
          setTimeout(() => {
            const projectCubesSection = document.querySelector('[data-section="project-cubes"]');
            if (projectCubesSection) projectCubesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        } else if (navigationState.projectSourceSection === 'Project Phases') {
          setActivePage('Overview');
          setTimeout(() => {
            const projectPhasesSection = document.querySelector('[data-section="project-phases"]');
            if (projectPhasesSection) projectPhasesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        } else {
          setActivePage('Overview');
          setTimeout(() => {
            const projectCubesSection = document.querySelector('[data-section="project-cubes"]');
            if (projectCubesSection) projectCubesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      } else {
        setActivePage(navigationState.previousPage);
      }
    };
    
    const addActivity = (project, content, subject = 'General Update') => {
         const newActivity = { 
             id: Date.now(), 
             author: getUserFullName(), 
             avatar: getUserInitials().charAt(0), 
             content: content, 
             timestamp: new Date().toISOString(), 
             projectId: project ? project.id : null, 
             project: project ? project.name : null,
             subject: subject
         };
         setActivities(prev => [newActivity, ...prev]);
    };
    
    const addTask = (task) => {
        setTasks(prev => [task, ...prev]);
    };

    const handleProjectUpdate = (updatedProject) => {
        const newProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
        setProjects(newProjects);
        setNavigationState(prev => ({ ...prev, selectedProject: updatedProject })); // Keep the detail page in sync
    };

    const handleCreateProject = (project) => {
        setProjects(prev => [project, ...prev]);
    };

    // Define navigationItems after all state variables are declared
    const navigationItems = [
        { name: 'Dashboard', icon: <ChartPieIcon />, page: 'Overview' },
        { name: 'My Projects', icon: <DocumentTextIcon />, page: 'Projects' },
        { name: 'My Alerts', icon: <BellIcon />, page: 'Alerts', badge: tasks.filter(t => t.status === 'pending' || t.status === 'overdue').length },
        { name: 'My Messages', icon: <ChatBubbleLeftRightIcon />, page: 'Activity Feed', badge: activities.filter(a => new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length },
        { name: 'Company Calendar', icon: <CalendarIcon />, page: 'Company Calendar' },
        { isSeparator: true },
        { name: 'AI Assistant', icon: <SparklesIcon />, page: 'AI Assistant', isAIAssistant: true },
        { name: 'AI Estimate Analysis', icon: <DocumentTextIcon />, page: 'Estimator' },
        { name: 'AI Training Tools', icon: <ChartBarIcon />, page: 'AI Tools' },
        { name: 'Project Schedules', icon: <CalendarIcon />, page: 'Project Schedules', isDisabled: true },
        { name: 'Project Documents', icon: <FolderIcon />, page: 'Project Documents', isDisabled: true },
        { name: 'AI Knowledge Base', icon: <ChatBubbleLeftRightIcon />, page: 'Training & Knowledge Base' },
        { name: 'Archived Projects', icon: <ArchiveBoxIcon />, page: 'Archived Projects' },
    ];

    // Update renderPage to use navigationState
    const renderPage = () => {
        console.log('🔍 RENDER: renderPage called with activePage:', activePage);
        console.log('🔍 RENDER: navigationState.selectedProject:', navigationState.selectedProject);
        
        switch (activePage) {
            case 'Overview': return (
              <DashboardPage
                tasks={tasks}
                projects={projects}
                activities={activities}
                onProjectSelect={handleProjectSelect}
                onAddActivity={addActivity}
                colorMode={colorMode}
              />
            );
            case 'Activity Feed': return <ActivityFeedPage projects={projects} onProjectSelect={handleProjectSelect} activities={activities} onAddActivity={addActivity} colorMode={colorMode} />;
            case 'Projects': return <ProjectsPage onProjectSelect={handleProjectSelect} onProjectActionSelect={handleProjectSelect} onCreateProject={handleCreateProject} projects={projects} colorMode={colorMode} projectSourceSection={navigationState.projectSourceSection} onNavigateBack={handleBackToProjects} scrollToProject={navigationState.scrollToProject} />;
            case 'Customers': return <CustomersPage colorMode={colorMode} />;
            case 'Project Schedules': return <ProjectSchedulesPage />;
            case 'Company Calendar': return <CompanyCalendarPage projects={projects} tasks={tasks} activities={activities} onProjectSelect={handleProjectSelect} colorMode={colorMode} />;
            case 'Alerts': return <TasksAndAlertsPage tasks={tasks} projects={projects} onAddTask={addTask} colorMode={colorMode} onProjectSelect={handleProjectSelect} sourceSection="My Alerts" />;
            case 'AI Tools': return <AIToolsPage colorMode={colorMode} />;
            case 'Training & Knowledge Base':
              return (
                <div className="max-w-3xl mx-auto px-4 py-10">
                  <p className="text-lg text-gray-600 mb-8">AI Powered Guidance for Company Information Below</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AI Company Documents */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 flex flex-col gap-2 hover:shadow-xl transition">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5V18a2 2 0 002 2h12a2 2 0 002-2V6.5M4 6.5L12 3l8 3.5" /></svg>
                        <span className="font-bold text-blue-700 text-lg">AI Company Documents</span>
                      </div>
                      <p className="text-gray-600 text-sm">Instantly search, summarize, and answer questions about your company handbooks, policies, and internal documents using AI.</p>
                    </div>
                    {/* AI Project Documents */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 flex flex-col gap-2 hover:shadow-xl transition">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6a2 2 0 002-2v-5a2 2 0 00-2-2h-2a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2v2" /></svg>
                        <span className="font-bold text-green-700 text-lg">AI Project Documents</span>
                      </div>
                      <p className="text-gray-600 text-sm">Get AI-powered insights, summaries, and answers from your project files, contracts, and technical documents.</p>
                    </div>
                    {/* AI Manufacturer Guidance */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-500 flex flex-col gap-2 hover:shadow-xl transition">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-bold text-yellow-700 text-lg">AI Manufacturer Guidance</span>
                      </div>
                      <p className="text-gray-600 text-sm">Access up-to-date, AI-curated manufacturer recommendations, product specs, and compliance information.</p>
                    </div>
                    {/* AI Installation Guidance */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500 flex flex-col gap-2 hover:shadow-xl transition">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0m8 0V5a4 4 0 00-8 0v2m8 0a4 4 0 01-8 0m8 0v2a4 4 0 01-8 0V7" /></svg>
                        <span className="font-bold text-purple-700 text-lg">AI Installation Guidance</span>
                      </div>
                      <p className="text-gray-600 text-sm">Get step-by-step, AI-driven installation instructions and troubleshooting for your field teams.</p>
                    </div>
                  </div>
                </div>
              );
            case 'Archived Projects': return <ArchivedProjectsPage projects={projects} colorMode={colorMode} onProjectSelect={handleProjectSelect} />;
            case 'AI Assistant': return <AIAssistantPage projects={projects} colorMode={colorMode} />;
            case 'Settings': return <SettingsPage colorMode={colorMode} />;
            case 'Estimator': return <EstimateComparisonTool />;
            default: return (
              <DashboardPage
                tasks={tasks}
                projects={projects}
                activities={activities}
                onProjectSelect={handleProjectSelect}
                onAddActivity={addActivity}
                colorMode={colorMode}
              />
            );
        }
    };

    // Search logic
    useEffect(() => {
        if (!searchTerm) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }
        const term = searchTerm.toLowerCase();
        const matches = projects.filter(p =>
            p.name?.toLowerCase().startsWith(term) ||
            (p.projectNumber && p.projectNumber.toString().startsWith(term))
        ).slice(0, 8);
        setSearchResults(matches);
        setShowSearchDropdown(matches.length > 0);
    }, [searchTerm, projects]);

    const handleSearchSelect = (project) => {
        setSearchTerm('');
        setShowSearchDropdown(false);
        // Navigate to project workflow page
        setActivePage('Projects');
        setNavigationState({ ...navigationState, selectedProject: project, projectInitialView: 'Project Workflow' });
    };

    // Helper functions for phase colors and text
    const getPhaseColor = (phase) => {
        switch (phase) {
            case 'Planning': return 'from-blue-500 to-cyan-500';
            case 'Design': return 'from-purple-500 to-pink-500';
            case 'Construction': return 'from-green-500 to-emerald-500';
            case 'Testing': return 'from-yellow-500 to-orange-500';
            case 'Handover': return 'from-red-500 to-rose-500';
            case 'Completed': return 'from-gray-500 to-slate-500';
            default: return 'from-gray-500 to-slate-500'; // Default for unknown phases
        }
    };

    const getPhaseText = (phase) => {
        switch (phase) {
            case 'Planning': return 'Planning';
            case 'Design': return 'Design';
            case 'Construction': return 'Construction';
            case 'Testing': return 'Testing';
            case 'Handover': return 'Handover';
            case 'Completed': return 'Completed';
            default: return phase; // Fallback for unknown phases
        }
    };

    return (
        <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-500 ${colorMode 
          ? 'bg-gradient-to-br from-[#e3edf7] via-[#c7d2fe] to-[#e0f2fe] text-gray-900' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-900'}`}>
            {/* Mobile menu overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-80 lg:w-72 flex flex-col transition-all duration-300 ease-in-out
              ${colorMode 
                ? 'bg-gradient-to-b from-[#181f3a] via-[#232b4d] to-[#1e293b] border-r-2 border-[#3b82f6] text-white' 
                : 'bg-white/90 backdrop-blur-md shadow-strong border-r border-white/20 text-gray-900'}
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}> 
                {/* Sidebar header (logo) */}
                <div className={`p-3 flex flex-col items-center border-b ${colorMode ? 'border-[#3b82f6] bg-gradient-to-r from-[#232b4d] to-[#1e293b]' : 'border-gray-100/50 bg-gradient-to-r from-white to-gray-50/50'}`}>
                    <div className={`w-40 h-16 rounded-xl flex items-center justify-center shadow-glow overflow-hidden border-2 ${colorMode ? 'bg-[#232b4d] border-[#3b82f6]' : 'bg-white border-white/50'}`}>
                        <img src={colorMode ? "/logo2.png" : "/logo.png"} alt="Company Logo" className="w-full h-full object-contain rounded-xl" />
                    </div>
                    
                    {/* AI-Powered Badge - directly under logo */}
                    <AIPoweredBadge />
                </div>
                {/* Sidebar nav (improved spacing) */}
                <nav className="flex-1 py-3 pl-5 pr-4 space-y-1.5 overflow-hidden">
                    {navigationItems.map((item, idx) => (
                        item.isAIAssistant ? (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.page)}
                                className={`w-full text-left flex items-center gap-3 py-2 px-4 text-[10px] font-semibold rounded-lg transition-all duration-200 ${
                                activePage === item.page && !navigationState.selectedProject 
                                        ? colorMode 
                                            ? 'bg-gradient-to-r from-[#232526] via-[#26d0ce] to-[#1a2980] text-white shadow-md' 
                                            : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md'
                                        : colorMode 
                                            ? 'text-[#e0eaff] hover:bg-[#232526]/60 hover:text-[#26d0ce]' 
                                    : 'text-gray-700 hover:bg-white/80 hover:text-primary-700 hover:shadow-soft'
                            }`}>
                                <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                                <span className="flex-1">{item.name}</span>
                            </button>
                        ) : item.isDropdown ? (
                            <div key={item.name} className="relative group">
                                <button
                                    className={`w-full text-left flex items-center gap-3 py-2.5 px-4 font-bold rounded-lg uppercase tracking-wide text-[9px] transition-all duration-200 ${colorMode ? 'text-[#f2fcfe] hover:bg-[#232526]/60' : 'text-gray-700 hover:bg-white/80'}`}
                                    tabIndex={0}
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                >
                                    <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                                    <span className="flex-1">{item.name}</span>
                                    <span className="ml-auto"><ChevronDownIcon className="w-3 h-3" /></span>
                                </button>
                                {/* Dropdown menu */}
                                <div className="absolute left-0 top-full z-20 min-w-[180px] bg-gradient-to-b from-[#232b4d] to-[#181f3a] shadow-xl rounded-lg py-2 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none transition-all duration-200 border border-[#3b82f6] text-white" style={{marginTop: 2}}>
                                    {item.children.map((child) => (
                                        <button
                                            key={child.name}
                                            onClick={() => navigate(child.page)}
                                            className="w-full text-left flex items-center gap-3 py-2 px-4 text-[9px] font-semibold rounded-lg hover:bg-[#232526]/60 hover:text-[#26d0ce] transition-all duration-200"
                                        >
                                            <span>{child.icon}</span>
                                            <span>{child.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : item.isSection ? (
                            <div key={item.name} className={`mt-4 mb-2 flex items-center gap-3 font-bold text-[9px] uppercase tracking-wide ${colorMode ? 'text-[#f2fcfe] drop-shadow-lg' : 'text-gray-700 dark:text-gray-200'}`}> 
                                <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                                <span>{item.name}</span>
                            </div>
                        ) : item.isSubItem ? (
                            <button key={item.name} onClick={() => navigate(item.page)}
                                className={`w-full text-left flex items-center gap-3 py-2 px-4 ml-4 text-[9px] font-semibold rounded-lg transition-all duration-200 ${
                                activePage === item.page && !navigationState.selectedProject 
                                        ? colorMode 
                                            ? 'bg-gradient-to-r from-[#232526] via-[#26d0ce] to-[#1a2980] text-white shadow-md' 
                                            : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md'
                                        : colorMode 
                                            ? 'text-[#f2fcfe] hover:bg-[#232526]/60 hover:text-[#26d0ce]' 
                                            : 'text-gray-700 hover:bg-white/80 hover:text-primary-700 hover:shadow-soft'
                                }`}> 
                                <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                                <span className="flex-1">{item.name}</span>
                            </button>
                        ) : item.isBullet ? (
                            <button key={item.name} onClick={() => navigate(item.page)}
                                className={`w-full text-left flex items-center gap-3 pl-12 pr-4 py-2 text-[9px] font-medium rounded transition-all duration-200 group ${colorMode ? 'text-[#e0eaff] hover:bg-[#232526]/40 hover:text-[#26d0ce]' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30'}`}> 
                                <span className={`inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-tr ${colorMode ? 'from-[#26d0ce] to-[#1a2980]' : 'from-blue-400 to-emerald-400'} mr-2 group-hover:from-blue-600 group-hover:to-emerald-600`}></span>
                                <span>{item.name}</span>
                            </button>
                        ) : item.isSeparator ? (
                            <div key={idx} className={`my-3 mx-4 border-t ${colorMode ? 'border-[#26d0ce]/40' : 'border-gray-300 dark:border-gray-700'}`} />
                        ) : (
                        <button key={item.name} onClick={() => !item.isDisabled && navigate(item.page)}
                                disabled={item.isDisabled}
                                className={`w-full text-left flex items-center gap-3 py-2 px-4 text-[10px] font-semibold rounded-lg transition-all duration-200 ${
                                item.isDisabled 
                                    ? colorMode 
                                        ? 'text-gray-500 cursor-not-allowed opacity-50' 
                                        : 'text-gray-400 cursor-not-allowed opacity-50'
                                    : activePage === item.page && !navigationState.selectedProject 
                                        ? colorMode 
                                            ? 'bg-gradient-to-r from-[#232526] via-[#26d0ce] to-[#1a2980] text-white shadow-md' 
                                            : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md'
                                        : colorMode 
                                            ? 'text-[#e0eaff] hover:bg-[#232526]/60 hover:text-[#26d0ce]' 
                                    : 'text-gray-700 hover:bg-white/80 hover:text-primary-700 hover:shadow-soft'
                            }`}>
                            <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                            <span className="flex-1">{item.name}</span>
                            {item.badge && item.badge > 0 && (
                                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[7px] font-bold rounded-full ml-2 ${
                                    item.page === 'Activity Feed' 
                                        ? colorMode 
                                            ? 'bg-blue-500 text-white shadow-lg' 
                                            : 'bg-blue-500 text-white shadow-md'
                                        : colorMode 
                                            ? 'bg-red-500 text-white shadow-lg' 
                                            : 'bg-red-500 text-white shadow-md'
                                }`}>
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </button>
                        )
                    ))}
                </nav>
                {/* Sidebar footer (Color Mode button) always visible */}
                <div className="px-4 pb-2 pt-4 flex flex-col gap-1 flex-shrink-0">
                  {/* Compact Color Mode button */}
                  <button
                    onClick={() => setColorMode((prev) => !prev)}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded border transition-colors duration-200 text-[7px] font-medium
                      ${colorMode 
                        ? 'bg-[#232b4d] border-[#3b82f6] text-white hover:bg-[#1e293b] hover:text-[#3b82f6]' 
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:text-blue-700'}`}
                    aria-label="Toggle color mode"
                  >
                    <SparklesIcon className="w-2.5 h-2.5" />
                    <span>{colorMode ? 'Default' : 'Color'}</span>
                  </button>
                </div>
            </aside>
            
            {/* Main content */}
            <main className={`flex-1 flex flex-col min-w-0 text-xs font-sans transition-colors duration-500 ${colorMode ? 'bg-gradient-to-br from-[#101624] via-[#232b4d] to-[#181f3a] text-white' : ''}`} style={{ minWidth: 0, fontSize: '12px' }}>
                {/* Desktop header with user profile */}
                <header className={`hidden lg:flex items-center justify-between p-4 border-b transition-colors duration-500 z-[9999] ${colorMode ? 'bg-[#232b4d]/80 backdrop-blur-sm border-[#3b82f6]/40 text-white' : 'bg-white/80 backdrop-blur-sm border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                        {/* Global Search Bar */}
                        <div className="relative w-72">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onFocus={() => setShowSearchDropdown(searchResults.length > 0)}
                                placeholder="Search projects..."
                                className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 text-xs text-gray-900"
                            />
                            {showSearchDropdown && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                                    {searchResults.map((project) => (
                                        <div
                                            key={project._id || project.id}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                            onClick={() => handleProjectSelect(project)}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{project.projectName}</span>
                                                <span className="text-xs text-gray-500">#{project.projectNumber || project.id}</span>
                                            </div>
                                            <button
                                                className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getPhaseColor(project.phase || project.status)} text-white shadow border-none`}
                                                title={getPhaseText(project.phase || project.status)}
                                                style={{ minWidth: 90 }}
                                            >
                                                {getPhaseText(project.phase || project.status)}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {activePage === 'Overview' ? (
                            <div>
                                <h1 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{getGreeting()}</h1>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-600'}`}>Here's what's happening with your projects today.</p>
                            </div>
                        ) : (
                            <div>
                                <h1 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                    {activePage === 'Alerts' ? 'Project Alerts' :
                                     activePage === 'Company Calendar' ? 'Company Calendar' :
                                     activePage === 'AI Assistant' ? 'AI Assistant' :
                                     activePage === 'AI Tools' ? 'AI Training Tools' :
                                     activePage === 'Archived Projects' ? 'Archived Projects' :
                                     activePage === 'Activity Feed' ? 'Messages' :
                                     activePage === 'Estimator' ? 'Estimate Comparison & Analysis' :
                                     activePage === 'Customers' ? 'Customer Management' :
                                     activePage}
                                </h1>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-600'}`}>
                                    {activePage === 'Alerts' ? 'Monitor project alerts, tasks, and urgent notifications.' :
                                     activePage === 'Project Schedules' ? 'Plan and organize project timelines and milestones' :
                                     activePage === 'Company Calendar' ? 'Company-wide events, meetings, and project schedules' :
                                     activePage === 'AI Assistant' ? 'Get intelligent assistance with project management tasks' :
                                     activePage === 'AI Tools' ? 'Advanced AI-powered construction management tools' :
                                     activePage === 'Archived Projects' ? 'Completed projects and historical records' :
                                     activePage === 'Activity Feed' ? 'Stay up-to-date with activity feeds and manage important project messages in one place.' :
                                     activePage === 'Estimator' ? 'Upload documents to generate a discrepancy report or a pre-estimate advisory.' :
                                     activePage === 'Customers' ? 'Manage customer information, contacts, and project associations' :
                                     'Project management and construction oversight'}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* User Profile & Settings Area */}
                    <div className="flex items-center gap-3">
                        {/* Notifications */}
                        <button className={`p-2 rounded-lg transition-colors ${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                            <BellIcon />
                        </button>
                        
                        {/* User Profile Dropdown */}
                        <div className="relative" ref={profileDropdownRef}>
                            <button 
                                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                            >
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {getUserInitials()}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <div className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{getUserFullName()}</div>
                                    <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>{getUserPosition()}</div>
                                </div>
                                <ChevronDownIcon className="w-4 h-4" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {profileDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[99999]">
                                    <div className="py-2">
                                        <button 
                                            onClick={() => { setProfileDropdownOpen(false); navigate('Settings'); }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                            <UserIcon /> Profile
                                        </button>
                                        <button 
                                            onClick={() => { setProfileDropdownOpen(false); navigate('Settings'); }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                            <CogIcon /> Settings
                                        </button>
                                        <div className="border-t border-gray-200 my-1"></div>
                                        <button 
                                            onClick={() => { 
                                                setProfileDropdownOpen(false);
                                                authService.logout();
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <LogoutIcon /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                
                {/* Mobile header */}
                <header className={`lg:hidden border-b p-3 flex items-center justify-between transition-colors duration-500 ${colorMode ? 'bg-[#232b4d] border-[#3b82f6] text-white' : 'bg-white/80 backdrop-blur-sm border-gray-200'}`}>
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className={`p-2 rounded-lg transition-colors ${colorMode ? 'bg-[#232b4d] hover:bg-[#1e293b] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center">
                        <img src={colorMode ? "/logo2.png" : "/logo.png"} alt="Logo" className="w-8 h-8 rounded-lg" />
                        <span className={`ml-2 font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Kenstruction</span>
                    </div>
                    <div className="w-10"></div> {/* Spacer for centering */}
                </header>
                
                {/* Page content */}
                <div className={`flex-1 p-4 overflow-x-hidden ${colorMode ? 'bg-[#181f3a]/80' : ''}`}>
                    {/* Main Content */}
                    <div className="flex-1 overflow-hidden">
                        {(() => {
                            console.log('🔍 MAIN_RENDER: navigationState.selectedProject:', navigationState.selectedProject);
                            console.log('🔍 MAIN_RENDER: activePage:', activePage);
                            
                            if (navigationState.selectedProject) {
                                console.log('🔍 MAIN_RENDER: Rendering ProjectDetailPage');
                                return (
                                    <ProjectDetailPage 
                                        project={navigationState.selectedProject} 
                                        initialView={navigationState.projectInitialView}
                                        onBack={handleBackToProjects}
                                        colorMode={colorMode}
                                        previousPage={navigationState.previousPage}
                                        projectSourceSection={navigationState.projectSourceSection}
                                        onSendMessage={addActivity}
                                        tasks={tasks}
                                        projects={projects}
                                        onUpdate={handleProjectUpdate}
                                        activities={activities}
                                        onAddActivity={addActivity}
                                        onProjectSelect={handleProjectSelect}
                                    />
                                );
                            } else {
                                console.log('🔍 MAIN_RENDER: Rendering renderPage()');
                                return renderPage();
                            }
                        })()}
                    </div>
                </div>
            </main>
        </div>
    );
}