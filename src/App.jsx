import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import {
  ChartPieIcon, DocumentTextIcon, BellIcon, SparklesIcon, CogIcon, LogoutIcon, CalendarIcon, ChatBubbleLeftRightIcon, ChevronDownIcon, ChartBarIcon, UserIcon, FolderIcon, ArchiveBoxIcon
} from './components/common/Icons';
import { authService } from './services/api';
import DashboardPage from './components/pages/DashboardPage';
import ProjectProfilePage from './components/pages/ProjectProfilePage';
import ProjectDetailPage from './components/pages/ProjectDetailPage';
import ArchivedProjectsPage from './components/pages/ArchivedProjectsPage';
import ActivityFeedPage from './components/pages/ActivityFeedPage';
import TasksAndAlertsPage from './components/pages/TasksAndAlertsPage';
import AIAssistantPage from './components/pages/AIAssistantPage';
import AIToolsPage from './components/pages/AIToolsPage';
import EstimateComparisonTool from './components/pages/EstimateComparisonTool';
import SettingsPage from './components/pages/SettingsPage';
import CompanyCalendarPage from './components/pages/CompanyCalendarPage';
import AlertsCalendarPage from './components/pages/AlertsCalendarPage';
import ProjectSchedulesPage from './components/pages/ProjectSchedulesPage';
import MyMessagesPage from './components/pages/MyMessagesPage';
import HolographicLoginPage from './components/pages/HolographicLoginPage';
import BlueprintLoginPage from './components/pages/BlueprintLoginPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';

// Removed mock data import
import { projectsService, activitiesService } from './services/api';
import AIPoweredBadge from './components/common/AIPoweredBadge';
import GlobalSearch from './components/common/GlobalSearch';
import BubblesButton from './components/common/BubblesButton';
import { SubjectsProvider } from './contexts/SubjectsContext';
import { NavigationProvider } from './contexts/NavigationContext';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      // Enable retries for better reliability
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      // Enable reconnect refetch for better user experience
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function App() {
    // All hooks must be declared before any conditional returns
    const [activePage, setActivePage] = useState('Overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [colorMode, setColorMode] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    // Initialize with default user for mock auth to avoid re-renders
    const defaultUser = {
        _id: 'cme0ia6t00006umy4950saarf',
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@kenstruction.com',
        role: 'MANAGER',
        avatar: 'DC',
        company: 'Kenstruction',
        position: 'Manager',
        department: 'Office',
        isVerified: true
    };
    
    const [currentUser, setCurrentUser] = useState(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return defaultUser;
            }
        }
        return defaultUser;
    });
    const [isAuthenticated, setIsAuthenticated] = useState(true); // Always true in mock mode
    const [isLoading, setIsLoading] = useState(false); // Start as false since we're not loading
    const [activities, setActivities] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [projectsError, setProjectsError] = useState(null);
    const profileDropdownRef = useRef(null);
    
    // Onboarding state
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [onboardingChecked, setOnboardingChecked] = useState(false);
    
    // Navigation state must be declared before conditional returns
    const [navigationState, setNavigationState] = useState({
        selectedProject: null,
        projectInitialView: 'Profile',
        projectSourceSection: null,
        previousPage: 'Overview'
    });

    // Ensure localStorage has proper auth data on mount (only if not explicitly logged out)
    useEffect(() => {
        // Use a JWT-like token that backend might accept
        const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJjbWUwaWE2dDAwMDA2dW15NDk1MHNhYXJmIiwiZW1haWwiOiJkYXZpZC5jaGVuQGtlbnN0cnVjdGlvbi5jb20iLCJyb2xlIjoiTUFOQUdFUiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.demo';
        
        // Check if user has explicitly logged out by looking for a logout flag
        const hasLoggedOut = localStorage.getItem('has_logged_out') === 'true';
        
        // Only restore demo data if user hasn't explicitly logged out
        if (!hasLoggedOut) {
            const currentToken = localStorage.getItem('authToken');
            if (!currentToken || currentToken === 'mock-token-bypass') {
                localStorage.setItem('authToken', demoToken);
                localStorage.setItem('token', demoToken);
            }
            if (!localStorage.getItem('user')) {
                localStorage.setItem('user', JSON.stringify(currentUser));
            }
        }
    }, []); // Empty deps - only run once on mount

    // Check if user needs onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!isAuthenticated || !currentUser) return;
            
            try {
                // For now, check if user needs onboarding based on local logic
                // In production, you'd call onboardingService.getOnboardingStatus()
                const needsOnboarding = 
                    currentUser.role === 'WORKER' || // Default role
                    currentUser.hasCompletedOnboarding === false ||
                    (!currentUser.hasCompletedOnboarding && !currentUser.onboardingData);
                
                setNeedsOnboarding(needsOnboarding);
                setOnboardingChecked(true);
            } catch (error) {
                console.error('Error checking onboarding status:', error);
                setOnboardingChecked(true);
            }
        };

        checkOnboardingStatus();
    }, [isAuthenticated, currentUser]);

    // Handle onboarding completion
    const handleOnboardingComplete = (data) => {
        console.log('Onboarding completed:', data);
        
        // Update current user with new role/data
        const updatedUser = {
            ...currentUser,
            role: data?.mappedRole || data?.role || currentUser?.role,
            hasCompletedOnboarding: true,
            onboardingData: data
        };
        
        setCurrentUser(updatedUser);
        setNeedsOnboarding(false);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    // Handle successful login
    const handleLoginSuccess = (user, token) => {
        // Get user and token from localStorage (set by login page)
        const storedUser = authService.getStoredUser();
        const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token');
        
        setCurrentUser(storedUser);
        setIsAuthenticated(true);
        
        // Clear logout flag since user is now logged in
        localStorage.removeItem('has_logged_out');
        
        // Ensure both token keys are set for compatibility
        if (storedToken) {
            localStorage.setItem('token', storedToken);
            localStorage.setItem('authToken', storedToken);
        }
    };

    // Handle logout
    const handleLogout = () => {
        setCurrentUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // Set logout flag to prevent automatic token restoration
        localStorage.setItem('has_logged_out', 'true');
        authService.logout();
    };

    // Fetch projects from API - must be declared before conditional returns
    useEffect(() => {
        if (!isAuthenticated) return; // Skip if not authenticated
        let cancelled = false;
        const fetchProjects = async () => {
            try {
                setProjectsLoading(true);
                setProjectsError(null);
                const response = await projectsService.getAll();
                if (cancelled) return;
                if (response.success && response.data) {
                    const apiProjects = response.data.projects || response.data;
                    const normalizedProjects = (apiProjects || []).map(project => ({
                        ...project,
                        id: project.id || project._id,
                        name: project.name || project.projectName,
                        client: project.client || { name: 'Unknown Client', email: '', phone: '' },
                        projectManager: project.projectManager || { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@company.com', phone: '5559876543' }
                    }));
                    setProjects(normalizedProjects);
                    console.log('✅ Fetched projects from API:', normalizedProjects.length);
                } else {
                    setProjects([]);
                }
            } catch (error) {
                if (cancelled) return;
                console.error('Error fetching projects:', error);
                setProjectsError(error.message);
                setProjects([]);
            } finally {
                if (!cancelled) setProjectsLoading(false);
            }
        };
        fetchProjects();
        return () => { cancelled = true; };
    }, [isAuthenticated]);

    // Fetch activities from API - must be declared before conditional returns
    useEffect(() => {
        if (!isAuthenticated) return; // Skip if not authenticated
        const fetchActivities = async () => {
            try {
                console.log('🔍 Fetching activities from API...');
                const response = await activitiesService.getAll();
                if (response.success && response.data) {
                    // Normalize activity data to ensure consistent structure
                    const apiActivities = Array.isArray(response.data) ? response.data : 
                                        Array.isArray(response.data.activities) ? response.data.activities : [];
                    const normalizedActivities = apiActivities.map(activity => ({
                        ...activity,
                        id: activity.id || activity._id, // Ensure id field exists
                        projectId: activity.projectId || activity.project_id, // Normalize project reference
                        subject: activity.subject || activity.title, // Ensure subject field
                        content: activity.content || activity.description || activity.message,
                        author: activity.author || activity.user || activity.createdBy || 'Unknown User',
                        timestamp: activity.timestamp || activity.createdAt || activity.date || new Date().toISOString()
                    }));
                    setActivities(normalizedActivities);
                    console.log('✅ Fetched activities from API:', normalizedActivities.length);
                } else {
                    console.warn('Failed to fetch activities:', response.message);
                    setActivities([]);
                }
            } catch (error) {
                console.error('Error fetching activities:', error);
                setActivities([]);
            }
        };

        fetchActivities();
    }, [isAuthenticated]);

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

    // Monitor navigation state changes - must be before early returns
    useEffect(() => {
        console.log('🔍 NAV_STATE_CHANGE: navigationState updated:', navigationState);
        console.log('🔍 NAV_STATE_CHANGE: activePage:', activePage);
    }, [navigationState, activePage]);

    // Remove loading screen - we're never loading in mock auth mode
    // if (isLoading) {
    //     return (
    //         <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    //             <div className="text-center">
    //                 <div className="w-12 h-12 mx-auto mb-4 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    //                 <p className="text-gray-600">Loading...</p>
    //             </div>
    //         </div>
    //     );
    // }

    // Skip login page entirely in mock auth mode - we're always authenticated
    // if (!isAuthenticated) {
    //     return (
    //         <QueryClientProvider client={queryClient}>
    //             <BlueprintLoginPage onLoginSuccess={handleLoginSuccess} />
    //             {/* <HolographicLoginPage onLoginSuccess={handleLoginSuccess} /> */}
    //             <ReactQueryDevtools initialIsOpen={false} />
    //         </QueryClientProvider>
    //     );
    // }

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

    // Update handleProjectSelect to set all navigation state at once
    // Enhanced to support direct line item navigation
    const handleProjectSelect = (project, view = 'Project Workflow', phase = null, sourceSection = null, targetLineItemId = null, targetSectionId = null) => {
        console.log('🔍 APP: handleProjectSelect called with:');
        console.log('🔍 APP: project:', project?.name);
        console.log('🔍 APP: view:', view);
        console.log('🔍 APP: phase:', phase);
        console.log('🔍 APP: sourceSection:', sourceSection);
        console.log('🔍 APP: targetLineItemId:', targetLineItemId);
        console.log('🔍 APP: targetSectionId:', targetSectionId);
        
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
                    scrollToProject: project, // Pass the project data for scrolling
                    dashboardState: project.dashboardState // Preserve the dashboard state for back navigation
                };
                console.log('🔍 APP: New navigationState:', newState);
                console.log('🔍 APP: Preserved dashboard state:', project.dashboardState);
                return newState;
            });
            setSidebarOpen(false);
            console.log('🔍 APP: Navigation setup complete, returning early');
            return;
        }
        
        // Normalize project id to avoid null selection due to id shape/type
        const incomingId = project?.id || project?._id || project?.projectId || project?.project_id;
        const fullProject = projects.find(p => String(p.id) === String(incomingId));
        const projectWithEnhancements = fullProject ? {
            ...fullProject,
            ...project,
            id: fullProject.id,
            _id: fullProject._id
        } : {
            ...project,
            id: incomingId || `temp-${Date.now()}`,
            name: project?.name || project?.projectName || 'Selected Project'
        };

        const newNavigationState = {
            selectedProject: projectWithEnhancements,
            projectInitialView: view,
            projectSourceSection: sourceSection,
            previousPage: navigationState.selectedProject ? navigationState.previousPage : activePage,
            dashboardState: project.dashboardState, // Preserve the dashboard state for back navigation
            targetLineItemId: targetLineItemId, // For direct line item navigation
            targetSectionId: targetSectionId // For direct section navigation
        };
        
        console.log('🔍 APP: Setting navigationState:', newNavigationState);
        console.log('🔍 APP: Dashboard state being preserved:', project.dashboardState);
        setNavigationState(newNavigationState);
        setSidebarOpen(false);
    };

    // Update handleBackToProjects to use navigationState
    const handleBackToProjects = (specificProject = null) => {
        console.log('🔍 BACK_TO_PROJECTS: handleBackToProjects called');
        console.log('🔍 BACK_TO_PROJECTS: projectSourceSection:', navigationState.projectSourceSection);
        console.log('🔍 BACK_TO_PROJECTS: previousPage:', navigationState.previousPage);
        console.log('🔍 BACK_TO_PROJECTS: selectedProject:', navigationState.selectedProject);
        console.log('🔍 BACK_TO_PROJECTS: specificProject passed:', specificProject);
        
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
        
        // Handle specific case: coming from Project Phases section (Alerts, Messages, Workflow buttons)
        if (navigationState.projectSourceSection === 'Project Phases' && navigationState.selectedProject) {
            console.log('🔍 BACK_TO_PROJECTS: Coming from Project Phases section, returning to Overview with phase restored');
            // Get the dashboard state from the selected project
            const dashboardState = navigationState.selectedProject.dashboardState;
            console.log('🔍 BACK_TO_PROJECTS: Dashboard state from project:', dashboardState);
            
            // Clear the selected project and restore the dashboard state
            setNavigationState(prev => ({
                ...prev,
                selectedProject: null,
                dashboardState: dashboardState
            }));
            
            // Navigate back to Overview page
            setActivePage('Overview');
            
            // Scroll to the project phases section
            setTimeout(() => {
                const projectPhasesSection = document.querySelector('[data-section="project-phases"]');
                if (projectPhasesSection) projectPhasesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            
            return;
        }
        
        setNavigationState(prev => ({ ...prev, selectedProject: null }));
        if (navigationState.previousPage === 'Projects') {
            setActivePage('Projects');
                    } else if (navigationState.previousPage === 'Overview') {
            // Use the preserved dashboard state from navigationState
            const dashboardState = navigationState.dashboardState;
            console.log('🔍 BACK_TO_PROJECTS: Dashboard state for restoration:', dashboardState);
        
        if (navigationState.projectSourceSection === 'Project Messages') {
            setActivePage('Overview');
            setTimeout(() => {
                const projectMessagesSection = document.querySelector('[data-section="project-messages"]');
                if (projectMessagesSection) projectMessagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                if (projectCubesSection) {
                    projectCubesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    // Fallback - scroll to bottom where project cubes are
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
            }, 500);
        } else if (navigationState.projectSourceSection === 'Project Phases') {
            setActivePage('Overview');
            console.log('🔍 BACK_TO_PROJECTS: Project Phases - dashboard state being restored:', dashboardState);
            console.log('🔍 BACK_TO_PROJECTS: selectedPhase in dashboard state:', dashboardState?.selectedPhase);
            // Store the dashboard state and specific project info for the DashboardPage to restore
            setNavigationState(prev => {
                const newState = {
                    ...prev,
                    dashboardState: dashboardState,
                    // If a specific project was passed, store it for highlighting
                    scrollToProject: specificProject || prev.scrollToProject
                };
                console.log('🔍 BACK_TO_PROJECTS: New navigation state:', newState);
                return newState;
            });
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
    
    const addActivity = async (project, content, subject = 'General Update') => {
        try {
            const activityData = {
                type: 'message_sent',
                description: content,
                projectId: project ? project.id : null,
                priority: 'Low',
                metadata: {
                    subject: subject
                }
            };
            
            const response = await activitiesService.create(activityData);
            if (response.success && response.activity) {
                // Add the new activity to local state
                setActivities(prev => [response.activity, ...prev]);
            }
        } catch (error) {
            console.error('Error creating activity:', error);
            // Fallback to local state if API fails
            const newActivity = { 
                id: Date.now(), 
                author: getUserFullName(), 
                avatar: 'I', // Default to Lead phase initial
                content: content, 
                timestamp: new Date().toISOString(), 
                projectId: project ? project.id : null, 
                project: project ? project.name : null,
                subject: subject
            };
            setActivities(prev => [newActivity, ...prev]);
        }
    };
    
    const addTask = (task) => {
        setTasks(prev => [task, ...prev]);
    };

    const handleProjectUpdate = (updatedProject) => {
        const newProjects = (projects || []).map(p => p.id === updatedProject.id ? updatedProject : p);
        setProjects(newProjects);
        setNavigationState(prev => ({ ...prev, selectedProject: updatedProject })); // Keep the detail page in sync
    };

    const handleCreateProject = (project) => {
        setProjects(prev => [project, ...prev]);
    };

    // Handle Create Alert action from search results
    const handleCreateAlert = (project) => {
        console.log('ACTION: Creating alert for project:', project);
        // In a real app, you would open a modal or navigate to create alert page
        alert(`Creating an alert for "${project.name || project.projectName}"...`);
        // You could also navigate to the project's alerts section
        // handleProjectSelect(project, 'Alerts', null, 'Global Search');
    };

    // Handle Add Activity action from search results  
    const handleAddActivity = (project) => {
        console.log('ACTION: Adding activity for project:', project);
        // In a real app, you would open a modal or navigate to add activity page
        alert(`Adding an activity for "${project.name || project.projectName}"...`);
        // You could also navigate to the project's messages section
        // handleProjectSelect(project, 'Messages', null, 'Global Search');
    };

    // Handle navigation from search results
    const handleSearchNavigation = (result) => {
        const target = result.navigationTarget;
        
        switch (target.page) {
            case 'project-detail':
                if (target.project) {
                    handleProjectSelect(target.project, 'Project Workflow', null, 'Global Search');
                }
                break;
            case 'project-messages':
                if (target.project) {
                    handleProjectSelect(target.project, 'Messages', null, 'Global Search');
                }
                break;
            case 'projects':
                if (target.project) {
                    handleProjectSelect(target.project, 'Projects', null, 'Global Search');
                } else {
                    navigate('Projects');
                }
                break;
            default:
                console.log('Unhandled search navigation:', target);
        }
    };

    // Define navigationItems after all state variables are declared
    const navigationItems = [
        { name: 'Dashboard', icon: <ChartPieIcon />, page: 'Overview' },
        { name: 'My Messages', icon: <ChatBubbleLeftRightIcon />, page: 'Project Messages' },
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
                    activities={activities}
                    onProjectSelect={handleProjectSelect}
                    onAddActivity={addActivity}
                    colorMode={colorMode}
                    dashboardState={navigationState.dashboardState}
                />
            );
            case 'Projects': return (
                <ProjectProfilePage 
                    onProjectSelect={handleProjectSelect} 
                    onCreateProject={handleCreateProject}
                    projects={projects} 
                    colorMode={colorMode} 
                    projectSourceSection={navigationState.projectSourceSection}
                    onNavigateBack={handleBackToProjects}
                    scrollToProject={navigationState.scrollToProject}
                />
            );
            case 'Project Messages': return <MyMessagesPage colorMode={colorMode} projects={projects} onProjectSelect={handleProjectSelect} />;
            case 'Project Schedules': return <ProjectSchedulesPage />;
            case 'Company Calendar': return <CompanyCalendarPage projects={projects} tasks={tasks} activities={activities} onProjectSelect={handleProjectSelect} colorMode={colorMode} />;
            case 'Alerts Calendar': return <AlertsCalendarPage projects={projects} tasks={tasks} activities={activities} onProjectSelect={handleProjectSelect} colorMode={colorMode} />;
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
                                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0m8 0V5a4 4 0 00-8 0v2m8 0a4 4 0 01-8 0V7" /></svg>
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
                    activities={activities}
                    onProjectSelect={handleProjectSelect}
                    onAddActivity={addActivity}
                    colorMode={colorMode}
                    dashboardState={navigationState.dashboardState}
                />
            );
        }
    };

    // Show onboarding if user needs it
    if (needsOnboarding && onboardingChecked) {
        return (
            <QueryClientProvider client={queryClient}>
                <OnboardingFlow 
                    currentUser={currentUser}
                    onComplete={handleOnboardingComplete}
                />
                <Toaster />
            </QueryClientProvider>
        );
    }

    // Show loading state while checking onboarding
    if (!onboardingChecked) {
        return (
            <QueryClientProvider client={queryClient}>
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up your workspace...</h2>
                        <p className="text-gray-600">Please wait while we prepare everything for you.</p>
                    </div>
                </div>
                <Toaster />
            </QueryClientProvider>
        );
    }

    return (
        <QueryClientProvider client={queryClient}>
            <NavigationProvider>
            <SubjectsProvider>
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
                    ? 'bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900 border-r-2 border-brand-500 text-white' 
                    : 'bg-white/90 backdrop-blur-md shadow-strong border-r border-white/20 text-gray-900'}
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                mobile-safe-area`}> 
                {/* Sidebar header (logo) */}
                <div className={`p-3 flex flex-col items-center border-b ${colorMode ? 'border-brand-500 bg-gradient-to-r from-neutral-800 to-neutral-900' : 'border-neutral-200 bg-gradient-to-r from-white to-neutral-50'}`}>
                    <div className={`w-40 h-16 rounded-xl flex items-center justify-center shadow-brand-glow overflow-hidden border-2 ${colorMode ? 'bg-neutral-800 border-brand-500' : 'bg-white border-neutral-200'}`}>
                        <img src={colorMode ? "/kenstruction-logo-dark.png" : "/kenstruction-logo.png"} alt="Kenstruction Logo" className="w-full h-full object-contain rounded-xl" />
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
                                    item.page === 'Project Messages' 
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
            <main className={`flex-1 flex flex-col min-w-0 text-xs font-sans transition-colors duration-500 ${colorMode ? 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white' : ''}`} style={{ minWidth: 0, fontSize: '12px' }}>
                {/* Desktop header with user profile */}
                <header className={`hidden lg:flex items-center justify-between p-4 border-b transition-colors duration-500 z-[9999] ${colorMode ? 'bg-neutral-800/80 backdrop-blur-sm border-brand-500/40 text-white' : 'bg-white/80 backdrop-blur-sm border-neutral-200'}`}>
                    <div className="flex items-center flex-1 min-w-0">
                        {activePage === 'Overview' ? (
                            <div className="flex-shrink-0">
                                <h1 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{getGreeting()}</h1>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-600'}`}>Here's what's happening with your projects today.</p>
                            </div>
                        ) : (
                            <div className="flex-shrink-0">
                                <h1 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                    {activePage === 'Alerts' ? 'Project Alerts' :
                                        activePage === 'Company Calendar' ? 'Company Calendar' :
                                        activePage === 'AI Assistant' ? 'AI Assistant' :
                                        activePage === 'AI Tools' ? 'AI Training Tools' :
                                        activePage === 'Archived Projects' ? 'Archived Projects' :
                                        activePage === 'Project Messages' ? 'Messages' :
                                        activePage === 'Estimator' ? 'Estimate Comparison & Analysis' :
                                        activePage === 'Customers' ? 'Customer Management' :
                                        activePage === 'Projects' ? 'Project Workflow' :
                                        activePage}
                                </h1>
                                <p className={`text-sm font-medium ${colorMode ? 'text-gray-200' : 'text-gray-600'}`}>
                                    {activePage === 'Alerts' ? 'Monitor project alerts, tasks, and urgent notifications.' :
                                        activePage === 'Project Schedules' ? 'Plan and organize project timelines and milestones' :
                                        activePage === 'Company Calendar' ? 'Company-wide events, meetings, and project schedules' :
                                        activePage === 'AI Assistant' ? 'Get intelligent assistance with project management tasks' :
                                        activePage === 'AI Tools' ? 'Advanced AI-powered construction management tools' :
                                        activePage === 'Archived Projects' ? 'Completed projects and historical records' :
                                        activePage === 'Project Messages' ? 'Stay up-to-date with activity feeds and manage important project messages in one place.' :
                                        activePage === 'Estimator' ? 'Upload documents to generate a discrepancy report or a pre-estimate advisory.' :
                                        activePage === 'Customers' ? 'Manage customer information, contacts, and project associations' :
                                        'Project management and construction oversight'}
                                </p>
                            </div>
                        )}
                        
                        {/* Global Search - Center */}
                        <div className="flex-1 max-w-md mx-8">
                            <GlobalSearch
                                projects={projects}
                                activities={activities}
                                onNavigateToResult={handleSearchNavigation}
                                handleCreateAlert={handleCreateAlert}
                                handleAddActivity={handleAddActivity}
                                colorMode={colorMode}
                                className="w-full"
                            />
                        </div>
                    </div>
                    
                    {/* User Profile & Settings Area */}
                    <div className="flex items-center gap-3 flex-shrink-0">
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
                                                handleLogout();
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
                <header className={`lg:hidden border-b p-3 flex items-center justify-between transition-colors duration-500 ${colorMode ? 'bg-neutral-800 border-brand-500 text-white' : 'bg-white/80 backdrop-blur-sm border-neutral-200'}`}>
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className={`p-2 rounded-lg transition-colors ${colorMode ? 'bg-[#232b4d] hover:bg-[#1e293b] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center">
                        <img src={colorMode ? "/kenstruction-logo-dark.png" : "/kenstruction-logo.png"} alt="Kenstruction Logo" className="w-8 h-8 rounded-lg" />
                        <span className={`ml-2 font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Kenstruction</span>
                    </div>
                    <div className="w-10"></div> {/* Spacer for centering */}
                </header>
                
                {/* Page content */}
                <div className={`flex-1 p-4 overflow-x-hidden`}>
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
                                        targetLineItemId={navigationState.targetLineItemId}
                                        targetSectionId={navigationState.targetSectionId}
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
        
        {/* Bubbles AI Assistant */}
        <BubblesButton 
          currentProject={navigationState.selectedProject} 
          colorMode={colorMode}
        />
        
        </SubjectsProvider>
        </NavigationProvider>
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster />
        </QueryClientProvider>
    );
}
