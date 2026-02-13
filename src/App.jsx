import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { getUserFullName, getUserInitials } from './utils/userUtils';
import {
  ChartPieIcon, DocumentTextIcon, BellIcon, SparklesIcon, CogIcon, LogoutIcon, CalendarIcon, ChatBubbleLeftRightIcon, ChevronDownIcon, ChartBarIcon, UserIcon, ArchiveBoxIcon, EnvelopeIcon
} from './components/common/Icons';
import { getCurrentUser, isUserVerified } from './lib/supabaseClient';
import DashboardPage from './components/pages/DashboardPage';
import ProjectProfilePage from './components/pages/ProjectProfilePage';
import ProjectDetailPage from './components/pages/ProjectDetailPage';
import ProjectChecklistPage from './components/pages/ProjectChecklistPage';
import ArchivedProjectsPage from './components/pages/ArchivedProjectsPage';
import TasksAndAlertsPage from './components/pages/TasksAndAlertsPage';
import AIAssistantPage from './components/pages/AIAssistantPage';
import AIToolsPage from './components/pages/AIToolsPage';
import EstimateComparisonTool from './components/pages/EstimateComparisonTool';
import SettingsPage from './components/pages/SettingsPage';
import CompanyCalendarPage from './components/pages/CompanyCalendarPage';
import AlertsCalendarPage from './components/pages/AlertsCalendarPage';
import ProjectSchedulesPage from './components/pages/ProjectSchedulesPage';
import DocumentsResourcesPage from './components/pages/DocumentsResourcesPage';
import MyMessagesPage from './components/pages/MyMessagesPage';
import EmailHistoryPage from './components/pages/EmailHistoryPage';
import FeedbackHubPage from './components/pages/FeedbackHubPage';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ResetPassword from './pages/ResetPassword';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import SetupProfilePage from './components/pages/SetupProfilePage';
import GoogleOAuthCallback from './components/auth/GoogleOAuthCallback';

// Removed mock data import
import { projectsService, activitiesService, messagesService, API_BASE_URL } from './services/api';
import socketService from './services/socket';
import AIPoweredBadge from './components/common/AIPoweredBadge';
import GlobalSearch from './components/common/GlobalSearch';
import AddProjectModal from './components/common/AddProjectModal';
import { SubjectsProvider } from './contexts/SubjectsContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { AuthProvider } from './hooks/useAuth';
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarPinned, setSidebarPinned] = useState(() => {
        try {
            const saved = localStorage.getItem('sidebarPinned');
            return saved ? JSON.parse(saved) : true;
        } catch (_) {
            return true;
        }
    });
    const [colorMode, setColorMode] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [showAddProjectModal, setShowAddProjectModal] = useState(false);
    // No default demo user in production auth
    const defaultUser = null;
    
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const storedLocal = localStorage.getItem('user');
            if (storedLocal) return JSON.parse(storedLocal);
        } catch (_) {}
        try {
            const storedSession = sessionStorage.getItem('user');
            if (storedSession) return JSON.parse(storedSession);
        } catch (_) {}
        return defaultUser;
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Start as false since we're not loading
    const [activities, setActivities] = useState([]);
    // unauthenticated view state: 'login' | 'register'
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [projectsError, setProjectsError] = useState(null);
    const profileDropdownRef = useRef(null);
    // Prevent global scroll-to-top during targeted back navigation
    const suppressScrollTopUntilRef = useRef(0);
    const suppressScrollTopUntil = suppressScrollTopUntilRef.current;
    
    // Track per-page scroll positions to restore on back navigation
    const pageScrollPositionsRef = useRef({});
    const getPrimaryScrollTop = () => {
        try {
            const candidates = [
                window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0,
                (document.querySelector('.flex-1.overflow-y-auto')?.scrollTop) || 0,
                (document.querySelector('main')?.scrollTop) || 0,
                (document.querySelector('#root')?.scrollTop) || 0,
                (document.querySelector('.overflow-y-auto')?.scrollTop) || 0
            ];
            return Math.max(...candidates);
        } catch (_) {
            return window.pageYOffset || 0;
        }
    };
    const recordScrollFor = (pageName) => {
        try {
            if (!pageName) return;
            pageScrollPositionsRef.current[pageName] = getPrimaryScrollTop();
        } catch (_) {}
    };
    const restoreScrollFor = (pageName) => {
        try {
            const pos = pageScrollPositionsRef.current[pageName];
            if (pos == null) return;
            const apply = () => {
                window.scrollTo({ top: pos, left: 0, behavior: 'auto' });
                const containers = [
                    document.querySelector('.flex-1.overflow-y-auto'),
                    document.querySelector('main'),
                    document.querySelector('#root'),
                    document.querySelector('.overflow-y-auto')
                ];
                containers.forEach(el => { if (el) el.scrollTop = pos; });
            };
            apply();
            setTimeout(apply, 50);
            setTimeout(apply, 120);
            setTimeout(apply, 250);
        } catch (_) {}
    };

    const [navigationState, setNavigationState] = useState({
        selectedProject: null,
        projectInitialView: 'Profile',
        projectSourceSection: null,
        previousPage: 'Overview'
    });

    // Onboarding state
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [onboardingChecked, setOnboardingChecked] = useState(false);

    // Unread messages count for My Messages indicator
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

    // On mount, check Supabase auth state and perform token exchange
    useEffect(() => {
        const checkAuthState = async () => {
            // Skip if already authenticated (e.g., from login)
            if (isAuthenticated && currentUser) {
                console.log('🔍 AUTH: Already authenticated, skipping auth check');
                return;
            }
            
            // IMMEDIATE FIX: Clear all temp/demo tokens to force re-auth with consistent IDs
            const existingToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('user');
            
            if (existingToken && (existingToken.startsWith('demo-') || existingToken.startsWith('temp-token-'))) {
                if (storedUser) {
                    try {
                        const userData = JSON.parse(storedUser);
                        const tokenParts = existingToken.split('-');
                        const tokenId = tokenParts[tokenParts.length - 1];
                        const expectedUserId = `demo-user-${tokenId}`;
                        
                        // If IDs don't match, clear everything and re-auth
                        if (userData.id !== expectedUserId) {
                            console.log('🔄 CLEARING INCONSISTENT AUTH DATA - Will re-authenticate...');
                            localStorage.removeItem('authToken');
                            localStorage.removeItem('user');
                            // Force re-authentication by continuing below
                        } else {
                            // IDs match, proceed with existing auth
                            setCurrentUser(userData);
                            setIsAuthenticated(true);
                            return;
                        }
                    } catch (e) {
                        console.error('Error parsing stored user:', e);
                        // Clear corrupted data
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                    }
                }
            }
            
            // Re-check token after potential cleanup (localStorage is single source of truth)
            const token = localStorage.getItem('authToken');
            console.log('🔍 AUTH: Checking for token. Found:', !!token);
            if (token) {
                console.log('🔍 AUTH: Token found, verifying...');
                try {
                    // Check if it's a demo token (bypass verification)
                    if (token.startsWith('demo-') || token.startsWith('temp-token-')) {
                        const user = localStorage.getItem('user');
                        if (user) {
                            const userData = JSON.parse(user);
                            setCurrentUser(userData);
                            setIsAuthenticated(true);
                            return;
                        }
                    }
                    
                    // Verify the existing token with timeout
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                        
                        console.log('🔍 AUTH: Verifying token with API:', `${API_BASE_URL}/auth/me`);
                        const response = await fetch(`${API_BASE_URL}/auth/me`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            },
                            signal: controller.signal
                        });
                        
                        console.log('🔍 AUTH: Token verification response status:', response.status);
                        
                        clearTimeout(timeoutId);
                        
                        if (response.ok) {
                            const userData = await response.json();
                            console.log('🔍 AUTH: Token verification successful, user data:', userData);
                            if (userData.user || userData.data?.user) {
                                const user = userData.user || userData.data.user;
                                console.log('🔍 AUTH: Setting authenticated user:', user);
                                setCurrentUser(user);
                                setIsAuthenticated(true);
                                return;
                            }
                        } else {
                            // Token is invalid, clear it from localStorage
                            console.log('🔍 AUTH: Token verification failed - clearing token. Status:', response.status);
                            localStorage.removeItem('authToken');
                        }
                    } catch (verifyError) {
                        if (verifyError.name === 'AbortError') {
                            console.error('Token verification timed out');
                        } else {
                            console.log('Token verification failed:', verifyError.message);
                        }
                        // Don't use fallback auth - just clear and show login
                        localStorage.removeItem('authToken');
                        setIsAuthenticated(false);
                        setCurrentUser(null);
                        return;
                    }
                } catch (error) {
                    console.error('Token verification failed:', error);
                    localStorage.removeItem('authToken');
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                    return;
                }
            }
            
            // Only try Supabase if no token exists and not in production
            // Skip Supabase check to avoid hanging
            console.log('🔍 AUTH: No valid token found - showing login screen');
            setIsAuthenticated(false);
            setCurrentUser(null);
        };
        checkAuthState();
    }, []); // Only run once on mount

    // Check if user needs onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!isAuthenticated || !currentUser) return;
            
            try {
                // Skip onboarding for existing users - only show for brand new users without any data
                const needsOnboardingFlag = 
                    currentUser.hasCompletedOnboarding === false ||
                    (currentUser.role === 'WORKER' && !currentUser.id); // Only if no user ID (brand new)
                
                console.log('🔍 ONBOARDING: Checking status for user:', currentUser);
                console.log('🔍 ONBOARDING: User role:', currentUser.role);
                console.log('🔍 ONBOARDING: User ID:', currentUser.id);
                console.log('🔍 ONBOARDING: hasCompletedOnboarding:', currentUser.hasCompletedOnboarding);
                console.log('🔍 ONBOARDING: needsOnboarding result:', needsOnboardingFlag);
                
                setNeedsOnboarding(needsOnboardingFlag);
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

    // Handle successful login from Supabase or regular backend login/registration
    const handleLoginSuccess = async (user) => {
        if (!user) return;
        
        // Check if this is a regular backend user (from login/registration)
        // Regular backend users have: id, firstName, lastName, email, role
        // Supabase users have: user_metadata, email, etc.
        if (user.id && user.firstName && !user.user_metadata) {
            // This is a regular backend user - token is already stored by Login component
            // Just set the state directly
            console.log('✅ Regular backend login/registration - setting user state');
            setCurrentUser(user);
            setIsAuthenticated(true);
            return;
        }
        
        // Otherwise, treat as Supabase user and exchange token
        const supabaseUser = user;
        try {
            // Use relative URL for production, localhost for development
const apiUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api/auth/supabase-token-exchange'
                : '/api/auth/supabase-token-exchange';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: supabaseUser.email,
                    firstName: supabaseUser.user_metadata?.firstName || supabaseUser.email?.split('@')[0] || 'User',
                    lastName: supabaseUser.user_metadata?.lastName || '',
                    role: supabaseUser.user_metadata?.role || 'WORKER'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.token && data.user) {
                    // Store the traditional JWT token in localStorage (single source of truth)
                    localStorage.setItem('authToken', data.token);
                    
                    // Store user data from server response (not Supabase metadata)
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Set user state using server response data
                    setCurrentUser(data.user);
                    setIsAuthenticated(true);
                }
            } else {
                console.error('Token exchange failed with status:', response.status);
                // Fallback: create a temporary user for demo purposes
                await handleFallbackAuth(supabaseUser);
            }
        } catch (error) {
            console.error('Failed to exchange Supabase token:', error);
            // Fallback: create a temporary user for demo purposes
            await handleFallbackAuth(supabaseUser);
        }
    };

    // Fallback authentication when Supabase token exchange fails
    const handleFallbackAuth = async (supabaseUser) => {
        console.log('Using fallback authentication for user:', supabaseUser.email);
        
        // Create a temporary token (this is just for demo purposes)
        const tempToken = 'temp-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Extract the consistent user ID that the backend will use (last part of token)
        const tokenParts = tempToken.split('-');
        const tokenId = tokenParts[tokenParts.length - 1];
        const userId = `demo-user-${tokenId}`;
        
        // Create a temporary user object with ID matching what backend will extract
        const fallbackUser = {
            id: userId,
            email: supabaseUser.email,
            firstName: supabaseUser.user_metadata?.firstName || supabaseUser.email?.split('@')[0] || 'User',
            lastName: supabaseUser.user_metadata?.lastName || '',
            role: supabaseUser.user_metadata?.role || 'WORKER',
            isActive: true,
            theme: 'LIGHT'
        };
        
        // Store the temporary data in localStorage (single source of truth)
        localStorage.setItem('authToken', tempToken);
        localStorage.setItem('user', JSON.stringify(fallbackUser));
        
        // Set user state
        setCurrentUser(fallbackUser);
        setIsAuthenticated(true);
        
        console.log('Fallback authentication completed for:', fallbackUser.email, 'with ID:', userId);
    };

    // Demo authentication for development/testing
    const handleDemoAuth = async () => {
        console.log('Using demo authentication for development');
        
        // Create a demo token
        const demoToken = 'demo-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Extract the consistent user ID that the backend will use (last part of token)
        const tokenParts = demoToken.split('-');
        const tokenId = tokenParts[tokenParts.length - 1];
        const userId = `demo-user-${tokenId}`;
        
        // Create a demo user with ID matching what backend will extract
        const demoUser = {
            id: userId,
            email: `demo-${tokenId}@roofingapp.com`,
            firstName: 'Demo',
            lastName: 'User',
            role: 'ADMIN',
            isActive: true,
            theme: 'LIGHT'
        };
        
        // Store the demo data in localStorage (single source of truth)
        localStorage.setItem('authToken', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser));
        
        // Set user state
        setCurrentUser(demoUser);
        setIsAuthenticated(true);
        
        console.log('Demo authentication completed for:', demoUser.email, 'with ID:', userId);
    };


    // Handle logout
    const handleLogout = async () => {
        const { supabase } = await import('./lib/supabaseClient');
        await supabase.auth.signOut();
        
        // Clear auth data from localStorage (single source of truth)
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    // Listen for session expired events from API interceptor
    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.warn('🔐 App: Session expired event received:', event.detail?.message);
            setIsAuthenticated(false);
            setCurrentUser(null);
        };

        window.addEventListener('auth:sessionExpired', handleSessionExpired);
        return () => {
            window.removeEventListener('auth:sessionExpired', handleSessionExpired);
        };
    }, []);

    // Fetch projects from API - must be declared before conditional returns
    useEffect(() => {
        if (!isAuthenticated) return; // Skip if not authenticated
        let cancelled = false;
        const fetchProjects = async () => {
            try {
                setProjectsLoading(true);
                setProjectsError(null);
                const response = await projectsService.getAll({ limit: 200 });
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
                        author: activity.author || activity.user || activity.createdBy || 'Unknown User', // TODO: Update to use first/last name
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
        const firstName = currentUser.firstName || currentUser.user_metadata?.first_name || "User";
        
        if (hour < 12) return `Good morning, ${firstName}!`;
        if (hour < 17) return `Good afternoon, ${firstName}!`;
        return `Good evening, ${firstName}!`;
    };

    // getUserInitials is now imported from utils/userUtils

    const getUserPosition = () => {
        if (!currentUser) return "User";
        const roleUpper = String(currentUser.role || "").toUpperCase();
        if (currentUser.position) return currentUser.position;
        if (roleUpper === "WORKER") return "User";
        return currentUser.role || "User";
    };

    const getUserEmail = () => {
        return currentUser?.email || "";
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
        // Skip global scroll-to-top when doing a back navigation; instead restore saved position
        if (Date.now() < suppressScrollTopUntilRef.current) {
            restoreScrollFor(activePage);
            return;
        }
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

    //                 <p className="text-gray-600">Loading...</p>
    //             </div>
    //         </div>
    //     );
    // }

    // Listen for global navigation events from File Manager "Docs" buttons (declare before early returns)
    useEffect(() => {
        const handleOpenProjectDocs = (e) => {
            try {
                const detail = e?.detail || {};
                const projectId = detail.projectId || detail.project?.id;
                if (!projectId) return;
                const target = projects.find(p => String(p.id) === String(projectId)) || detail.project;
                if (!target) return;
                setNavigationState(prev => ({
                    ...prev,
                    selectedProject: target,
                    projectInitialView: 'Project Documents',
                    projectSourceSection: 'Documents & Resources',
                    previousPage: activePage
                }));
            } catch (err) {
                console.error('Failed to handle app:openProjectDocuments event', err);
            }
        };
        window.addEventListener('app:openProjectDocuments', handleOpenProjectDocs);
        return () => window.removeEventListener('app:openProjectDocuments', handleOpenProjectDocs);
    }, [projects, activePage]);

    // Listen for requests to clear the persisted dashboard workflow restore target
    useEffect(() => {
        const handler = () => {
            try {
                setNavigationState(prev => {
                    if (!prev || !prev.dashboardState) return prev;
                    const nextDashboardState = { ...prev.dashboardState };
                    if (nextDashboardState.workflowRestore) {
                        delete nextDashboardState.workflowRestore;
                    }
                    return { ...prev, dashboardState: nextDashboardState };
                });
            } catch (e) {
                console.warn('Failed to clear dashboard workflowRestore', e);
            }
        };
        window.addEventListener('dashboard:clearWorkflowRestore', handler);
        return () => window.removeEventListener('dashboard:clearWorkflowRestore', handler);
    }, []);
    // Check for token in localStorage when not authenticated (handles OAuth callback race condition)
    useEffect(() => {
        if (!isAuthenticated && !isLoading) {
            // Use localStorage as single source of truth
            const token = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('user');
            
            if (token && storedUser && !token.startsWith('demo-') && !token.startsWith('temp-token-')) {
                // We have a real token but aren't authenticated - verify it
                // This handles the race condition where callback stored token but state hasn't updated
                const verifyToken = async () => {
                    try {
                        setIsLoading(true);
                        const response = await fetch(`${API_BASE_URL}/auth/me`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (response.ok) {
                            const userData = await response.json();
                            if (userData.user || userData.data?.user) {
                                const user = userData.user || userData.data.user;
                                setCurrentUser(user);
                                setIsAuthenticated(true);
                            }
                        } else {
                            // Token is invalid, clear it from localStorage
                            localStorage.removeItem('authToken');
                            localStorage.removeItem('user');
                        }
                    } catch (error) {
                        console.error('Token verification failed in auth check:', error);
                        localStorage.removeItem('authToken');
                    } finally {
                        setIsLoading(false);
                    }
                };
                
                verifyToken();
            }
        }
    }, [isAuthenticated, isLoading]);

    // Fetch unread messages count for My Messages indicator
    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (!isAuthenticated) {
                setHasUnreadMessages(false);
                return;
            }
            try {
                const response = await messagesService.getUnreadCount();
                const count = response?.data?.unreadCount || response?.unreadCount || 0;
                setHasUnreadMessages(count > 0);
            } catch (error) {
                console.error('Failed to fetch unread messages count:', error);
                setHasUnreadMessages(false);
            }
        };

        // Fetch immediately
        fetchUnreadCount();

        // Poll every 30 seconds to keep indicator updated
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Real-time socket listener for new direct messages
    // This updates the sidebar indicator immediately when a message is received
    useEffect(() => {
        if (!isAuthenticated) return;

        // Connect to socket if not already connected
        socketService.connect();

        // Handle new direct message event
        const handleNewDirectMessage = (data) => {
            console.log('📬 Real-time: New direct message received', data);
            // Immediately show the unread indicator
            setHasUnreadMessages(true);
            
            // Optionally show a browser notification
            if (Notification.permission === 'granted' && document.hidden) {
                new Notification(`New message from ${data.senderName || 'Team Member'}`, {
                    body: data.content || 'You have a new message',
                    icon: '/kenstruction-logo.png',
                    tag: `message-${data.messageId}`
                });
            }
        };

        // Listen for the newDirectMessage event
        socketService.on('newDirectMessage', handleNewDirectMessage);

        // Cleanup
        return () => {
            socketService.off('newDirectMessage', handleNewDirectMessage);
        };
    }, [isAuthenticated]);

    // Gate the app behind login when unauthenticated, but allow special routes to bypass
    const currentPath = window.location.pathname;
    const isBypassPath = currentPath === '/auth/callback' || currentPath === '/auth/error' || currentPath === '/reset-password' || currentPath.startsWith('/setup-profile');
    
    // Handle auth error route - clear any stale data and show login
    if (currentPath === '/auth/error') {
        // Clear any stale auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // Clear the URL and reload to show clean login
        window.history.replaceState({}, '', '/');
        window.location.reload();
        return null;
    }
    
    if (!isAuthenticated && !isBypassPath) {
        return (
            <QueryClientProvider client={queryClient}>
                <Login onLoginSuccess={handleLoginSuccess} />
            </QueryClientProvider>
        );
    }


    const navigate = (page) => { 
        console.log('🔍 APP: navigate called with page:', page);
        console.log('🔍 APP: Current activePage:', activePage);
        // Record current page scroll before navigating
        recordScrollFor(activePage);
        
        // Enhanced navigation with proper state management
        setNavigationState(prev => ({
            ...prev,
            previousPage: activePage,
            selectedProject: null,
            // Clear dashboard state when navigating to Overview via menu button
            // This ensures no phases are auto-selected
            dashboardState: page === 'Overview' ? null : prev.dashboardState,
            // Preserve any existing navigation context
            navigationContext: {
                ...prev.navigationContext,
                fromPage: activePage,
                toPage: page,
                timestamp: Date.now(),
                isMenuNavigation: true // Flag to indicate this is menu navigation, not back navigation
            }
        }));
        setActivePage(page); 
        setSidebarOpen(false); // Close sidebar on mobile after navigation
        
        // Clear unread indicator when navigating to My Messages
        // The messages will be marked as read when viewed, so just hide the dot immediately
        if (page === 'Project Messages') {
            setHasUnreadMessages(false);
        }
    };
    
    // Handle back button click with enhanced logic
    const handleBackButton = () => {
        console.log('🔍 APP: handleBackButton called');
        console.log('🔍 APP: navigationState:', navigationState);
        // Record current scroll and suppress scroll-to-top, we will restore target page position
        recordScrollFor(activePage);
        suppressScrollTopUntilRef.current = Date.now() + 1500;
        
        if (navigationState.selectedProject) {
            console.log('🔍 APP: Going back from project detail');
            setNavigationState(prev => ({ ...prev, selectedProject: null }));
            // If user came from My Project Messages, always go back to Overview and scroll to messages section
            if (navigationState.projectSourceSection === 'Project Messages' || navigationState.projectSourceSection === 'My Project Messages') {
                setActivePage('Overview');
                setTimeout(() => {
                    const messagesSection = document.querySelector('[data-section="project-messages"]');
                    if (messagesSection) {
                        messagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 150);
                return;
            }
            // If user came from Current Alerts, go back to Overview and scroll to alerts section
            if (
                navigationState.projectSourceSection === 'Project Workflow Line Items' ||
                navigationState.projectSourceSection === 'Current Alerts'
            ) {
                setActivePage('Overview');
                setTimeout(() => {
                    const workflowSection = document.querySelector('[data-section="project-workflow-tasks"]');
                    if (workflowSection) {
                        workflowSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 150);
                return;
            }
            setActivePage(navigationState.previousPage || 'Overview');
        } else {
            console.log('🔍 APP: No project selected, checking navigation context');
            
            // Check if we're on My Messages page and need special handling
            if (activePage === 'Project Messages') {
                console.log('🔍 APP: On My Messages page, using navigation context');
                console.log('🔍 APP: navigationContext:', navigationState.navigationContext);
                
                // Check if this was a menu navigation (from left sidebar)
                const isMenuNavigation = navigationState.navigationContext?.isMenuNavigation;
                console.log('🔍 APP: isMenuNavigation:', isMenuNavigation);
                
                // Use the navigation context to determine where to go back to
                const fromPage = navigationState.navigationContext?.fromPage;
                console.log('🔍 APP: fromPage:', fromPage);
                
                // If this was a menu navigation, always go back to the previous page
                if (isMenuNavigation && fromPage && fromPage !== 'Project Messages') {
                    console.log('🔍 APP: Menu navigation detected, going back to:', fromPage);
                    
                    // Special handling: if coming from Overview, go back to Overview and scroll to My Project Messages section
                    if (fromPage === 'Overview') {
                        setActivePage('Overview');
                        setTimeout(() => {
                            const messagesSection = document.querySelector('[data-section="project-messages"]');
                            if (messagesSection) {
                                messagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }, 150);
                    } else {
                        setActivePage(fromPage);
                    }
                } else if (fromPage && fromPage !== 'Project Messages') {
                    console.log('🔍 APP: Navigating back to:', fromPage);
                    setActivePage(fromPage);
                } else {
                    // Default fallback to Overview
                    console.log('🔍 APP: No specific from page, going to Overview');
                    setActivePage('Overview');
                }
            } else {
                console.log('🔍 APP: Regular back navigation');
                // For other pages, use the previous page from navigation state
                setActivePage(navigationState.previousPage || 'Overview');
            }
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
        
        // Special case: if project is null and view is a page name, just navigate to that page
        if (!project && (view === 'Overview' || view === 'Projects' || view === 'Project Messages' || view === 'AI Assistant' || view === 'AI Tools' || view === 'Company Calendar' || view === 'Archived Projects' || view === 'Settings' || view === 'Estimator')) {
            console.log('🔍 APP: Null project with page navigation, going to:', view);
            // If we have a pending targetLineItemId (from clicking a workflow line item), persist it into dashboardState
            setNavigationState(prev => {
                const workflowRestore = {
                    targetLineItemId: prev.targetLineItemId || null,
                    targetSectionId: prev.targetSectionId || null,
                    project: prev.selectedProject || prev.scrollToProject || null
                };
                return {
                    ...prev,
                    dashboardState: {
                        ...(prev.dashboardState || {}),
                        workflowRestore
                    }
                };
            });
            setActivePage(view);
            setSidebarOpen(false);
            return;
        }
        
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
                    // Capture dashboard state for precise restoration on back
                    dashboardState: {
                        ...(prev.dashboardState || {}),
                        selectedPhase: phase || (prev.dashboardState && prev.dashboardState.selectedPhase) || null,
                        expandedPhases: (prev.dashboardState && prev.dashboardState.expandedPhases) || null,
                        scrollToProject: project
                    }
                };
                console.log('🔍 APP: New navigationState:', newState);
                console.log('🔍 APP: Preserved dashboard state:', project?.dashboardState);
                return newState;
            });
            setSidebarOpen(false);
            console.log('🔍 APP: Navigation setup complete, returning early');
            return;
        }

        // If view is 'Profile' or 'Project Profile', navigate to Projects page with the project selected
        if (view === 'Profile' || view === 'Project Profile') {
            console.log('🔍 APP: Navigating to Project Profile for:', project?.name);
            setActivePage('Projects');
            
            // Normalize project id
            const incomingId = project?.id || project?._id || project?.projectId || project?.project_id;
            const fullProject = projects.find(p => String(p.id) === String(incomingId));
            const projectToSelect = fullProject ? {
                ...fullProject,
                ...project,
                id: fullProject.id,
                _id: fullProject._id
            } : {
                ...project,
                id: incomingId || `temp-${Date.now()}`,
                name: project?.name || project?.projectName || 'Selected Project'
            };

            setNavigationState(prev => ({
                ...prev,
                selectedProject: projectToSelect,
                projectInitialView: 'Profile',
                projectSourceSection: sourceSection || 'Dashboard',
                previousPage: activePage,
                dashboardState: {
                    ...(prev.dashboardState || {}),
                    selectedPhase: phase || (prev.dashboardState && prev.dashboardState.selectedPhase) || null
                }
            }));
            setSidebarOpen(false);
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

        // Persist globally selected project for AI Assistant auto-context
        try {
            if (projectWithEnhancements?.id) {
                sessionStorage.setItem('aiAssistant.lastProjectId', String(projectWithEnhancements.id));
            }
        } catch (_) {}

        // Robustly determine source section to ensure correct Back behavior
        const normalizedReturnTo = (project?.returnToSection || '').toString().toLowerCase();
        const inferredSourceFromReturn = normalizedReturnTo === 'current-alerts' ? 'Current Alerts' : null;
        // Preserve 'Current Alerts' as the origin even when navigating via intermediary pages (e.g., Project Profile → Workflow)
        let effectiveSourceSection = sourceSection || project?.navigationSource || inferredSourceFromReturn || navigationState.projectSourceSection || null;
        if (navigationState.projectSourceSection === 'Current Alerts' && effectiveSourceSection !== 'Current Alerts') {
            effectiveSourceSection = 'Current Alerts';
        }

        const newNavigationState = {
            selectedProject: projectWithEnhancements,
            projectInitialView: view,
            projectSourceSection: effectiveSourceSection,
            previousPage: (effectiveSourceSection === 'Current Alerts')
              ? 'Overview'
              : (navigationState.selectedProject ? navigationState.previousPage : activePage),
            // Preserve the dashboard state for back navigation if provided
            dashboardState: {
                ...(project?.dashboardState || navigationState.dashboardState || {}),
                // If a direct line-item target was provided, persist it so Dashboard can restore on back
                ...(targetLineItemId ? { workflowRestore: { targetLineItemId, targetSectionId, project: projectWithEnhancements } } : {})
            },
            targetLineItemId: targetLineItemId, // For direct line item navigation
            targetSectionId: targetSectionId, // For direct section navigation
            selectionNonce: project?.navigationTarget?.nonce || Date.now()
        };
        
        console.log('🔍 APP: Setting navigationState:', newNavigationState);
        console.log('🔍 APP: Dashboard state being preserved:', project?.dashboardState);
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
        
        // Remove legacy behavior that returned to the project's Messages tab
        
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
        
        // PRIORITY: Handle Current Alerts before Project Phases (prevents conflicts)
        const cameFromCurrentAlerts = navigationState.projectSourceSection === 'Current Alerts'
            || (navigationState.selectedProject && navigationState.selectedProject.returnToSection === 'current-alerts')
            || (navigationState.dashboardState && navigationState.dashboardState.currentAlertsState);
        if (cameFromCurrentAlerts) {
            console.log('🔍 BACK_TO_PROJECTS: PRIORITY HANDLING - Navigating back to Current Alerts section');
            // Prevent the global scroll-to-top effect from fighting our targeted scroll
            suppressScrollTopUntilRef.current = Date.now() + 1500;
            setNavigationState(prev => ({ ...prev, selectedProject: null, dashboardState: null }));
            setActivePage('Overview');
            
            // Enhanced navigation to Current Alerts section with multiple fallbacks
            setTimeout(() => {
                const currentAlertsSection = document.querySelector('[data-section="current-alerts"]');
                if (currentAlertsSection) {
                    console.log('🔍 BACK_TO_PROJECTS: Successfully scrolled to Current Alerts section');
                    currentAlertsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Add temporary highlight to make it clear where we returned
                    currentAlertsSection.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
                    setTimeout(() => {
                        currentAlertsSection.style.boxShadow = '';
                        // Re-enable global scroll-to-top after we're done
                        suppressScrollTopUntilRef.current = 0;
                    }, 2000);
                } else {
                    console.warn('🔍 BACK_TO_PROJECTS: Current Alerts section not found, retrying...');
                    // Fallback: try again with a longer delay
                    setTimeout(() => {
                        const currentAlertsSection = document.querySelector('[data-section="current-alerts"]');
                        if (currentAlertsSection) {
                            console.log('🔍 BACK_TO_PROJECTS: Found Current Alerts section on retry');
                            currentAlertsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            suppressScrollTopUntilRef.current = 0;
                        } else {
                            console.error('🔍 BACK_TO_PROJECTS: Current Alerts section still not found');
                            suppressScrollTopUntilRef.current = 0;
                        }
                    }, 500);
                }
            }, 100);
            // Extra enforcement scroll to counter any later auto-scrolls
            setTimeout(() => {
                const currentAlertsSection2 = document.querySelector('[data-section="current-alerts"]');
                if (currentAlertsSection2) currentAlertsSection2.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 700);
            return;
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
        
        if (navigationState.projectSourceSection === 'Project Messages' || navigationState.projectSourceSection === 'My Project Messages') {
            setActivePage('Overview');
            // Multiple attempts with increasing delays to ensure DOM is ready
            setTimeout(() => {
                const section = document.querySelector('[data-section="project-messages"]');
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    // Fallback: try again with a longer delay
                    setTimeout(() => {
                        const section = document.querySelector('[data-section="project-messages"]');
                        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 200);
                }
            }, 150);
            return;
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
                author: getUserFullName(currentUser),
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
        console.log('🔍 Search navigation called with result:', result);
        
        if (!result || !result.navigationTarget) {
            console.error('❌ Invalid search result - missing navigationTarget');
            return;
        }
        
        const target = result.navigationTarget;
        console.log('🔍 Navigation target:', target);

        // PRIORITIZE explicit workflow navigation with deep-link targets from search
        if (target.page === 'Project Workflow' && target.project) {
            console.log('🔍 Navigating directly to Project Workflow from search with targeting');
            handleProjectSelect(
                target.project,
                'Project Workflow',
                null,
                'Global Search',
                target.targetLineItemId,
                target.targetSectionId
            );
            return;
        }
        
        // For project results, always navigate to the unified Project Detail page
        if (result.type === 'project' && result.data) {
            console.log('🔍 Navigating to project detail:', result.data.projectNumber || result.data.id);
            handleProjectSelect(result.data, 'Project Profile', null, 'Global Search');
            return;
        }
        
        // Handle other navigation targets
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
                // Normalize to Project Detail page for project clicks from search
                if (target.project) {
                    handleProjectSelect(target.project, 'Project Profile', null, 'Global Search');
                } else {
                    setActivePage('Projects');
                }
                break;
            case 'Profile':
            case 'Project Profile':
                if (target.project) {
                    handleProjectSelect(target.project, 'Project Profile', null, 'Global Search');
                }
                break;
            case 'Project Workflow':
                if (target.project) {
                    handleProjectSelect(target.project, 'Project Workflow', null, 'Global Search', target.targetLineItemId, target.targetSectionId);
                }
                break;
            default:
                console.log('Unhandled search navigation - defaulting to Projects page');
                setActivePage('Projects');
        }
    };

    // Define navigationItems after all state variables are declared
    const navigationItems = [
        { name: 'Dashboard', icon: <ChartPieIcon />, page: 'Overview' },
        { name: 'My Messages', icon: <ChatBubbleLeftRightIcon />, page: 'Project Messages', hasUnread: hasUnreadMessages },
        { name: 'Company Calendar', icon: <CalendarIcon />, page: 'Company Calendar' },
        { isSeparator: true },
        { name: 'Bubbles', icon: <SparklesIcon />, page: 'AI Assistant', isAIAssistant: true },
        { name: 'AI Estimate Analysis', icon: <DocumentTextIcon />, page: 'Estimator' },
        { name: 'AI Training Tools', icon: <ChartBarIcon />, page: 'AI Tools' },
        { name: 'Project Schedules', icon: <CalendarIcon />, page: 'Project Schedules', isDisabled: true },
        { name: 'Documents & Resources', icon: <DocumentTextIcon />, page: 'Documents & Resources' },
        { name: 'AI Knowledge Base', icon: <ChatBubbleLeftRightIcon />, page: 'Training & Knowledge Base' },
        { name: 'Feedback Hub', icon: <BellIcon />, page: 'Feedback Hub' },
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
            case 'Project Messages': return (
                <MyMessagesPage 
                    colorMode={colorMode} 
                    projects={projects} 
                    onProjectSelect={handleProjectSelect}
                    navigationContext={navigationState.navigationContext}
                    previousPage={navigationState.previousPage}
                />
            );
            case 'Project Schedules': return <ProjectSchedulesPage />;
            case 'Company Calendar': return <CompanyCalendarPage projects={projects} tasks={tasks} activities={activities} onProjectSelect={handleProjectSelect} colorMode={colorMode} />;
            case 'Feedback Hub': return <FeedbackHubPage colorMode={colorMode} currentUser={currentUser} />;
            case 'Documents & Resources': return <DocumentsResourcesPage />;
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
            case 'Archived Projects': return <ArchivedProjectsPage projects={projects} colorMode={colorMode} onProjectSelect={handleProjectSelect} navigate={navigate} />;
            case 'Email History': return <EmailHistoryPage colorMode={colorMode} />;
            case 'AI Assistant': return <AIAssistantPage projects={projects} colorMode={colorMode} onProjectSelect={handleProjectSelect} />;
            case 'Settings': return (
                <SettingsPage 
                    colorMode={colorMode}
                    setColorMode={setColorMode}
                    currentUser={currentUser}
                    onUserUpdated={(u) => { 
                        console.log('🔄 USER UPDATED: Received updated user:', u);
                        console.log('🔄 USER UPDATED: Avatar URL:', u?.avatar);
                        try { 
                            setCurrentUser(u); 
                            localStorage.setItem('user', JSON.stringify(u)); 
                            sessionStorage.setItem('user', JSON.stringify(u)); 
                            // Force a re-render by updating a timestamp
                            setCurrentUser({...u, _lastUpdated: Date.now()});
                        } catch (_) {} 
                    }}
                />
            );
            case 'Estimator': return <EstimateComparisonTool />;
            default: return (
                <DashboardPage
                    tasks={tasks}
                    activities={activities}
                    onProjectSelect={handleProjectSelect}
                    onAddActivity={addActivity}
                    dashboardState={navigationState.dashboardState}
                />
            );
        }
    };

    // Show onboarding if user needs it
    if (needsOnboarding && onboardingChecked) {
        return (
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <OnboardingFlow 
                        currentUser={currentUser}
                        onComplete={handleOnboardingComplete}
                    />
                </AuthProvider>
                <Toaster />
            </QueryClientProvider>
        );
    }

    // Check for OAuth callback route FIRST (before onboarding check)
    // This allows OAuth callback to process and set authentication state
    if (window.location.pathname === '/auth/callback') {
        return (
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <GoogleOAuthCallback onLoginSuccess={handleLoginSuccess} />
                </AuthProvider>
            </QueryClientProvider>
        );
    }

    // Check for password reset route
    if (window.location.pathname === '/reset-password') {
        return (
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <ResetPassword />
                </AuthProvider>
            </QueryClientProvider>
        );
    }

    // Check for setup profile route
    if (window.location.pathname.startsWith('/setup-profile')) {
        return (
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <SetupProfilePage colorMode={colorMode} />
                </AuthProvider>
            </QueryClientProvider>
        );
    }

    // Show loading state while checking onboarding
    // Only show this if we're authenticated but onboarding check hasn't completed
    if (!onboardingChecked && isAuthenticated) {
        return (
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up your workspace...</h2>
                            <p className="text-gray-600">Please wait while we prepare everything for you.</p>
                        </div>
                    </div>
                </AuthProvider>
                <Toaster />
            </QueryClientProvider>
        );
    }

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
            <NavigationProvider>
            <SubjectsProvider>
            <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-500 ${colorMode 
                ? 'bg-[#1e293b] text-gray-100' 
                : 'bg-[#F8FAFC] text-gray-900'}`}>
            {/* Mobile menu overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <aside 
                className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out
                ${colorMode 
                    ? 'bg-neutral-900 border-r border-neutral-700 text-white' 
                    : 'bg-white shadow-soft border-r border-[#E2E8F0] text-gray-900'}
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                mobile-safe-area`}
                style={{
                    width: sidebarCollapsed && !sidebarPinned ? '64px' : '288px'
                }}
                onMouseEnter={() => !sidebarPinned && setSidebarCollapsed(false)}
                onMouseLeave={() => !sidebarPinned && setTimeout(() => setSidebarCollapsed(true), 300)}
            > 
                {/* Sidebar header (logo) */}
                <div className={`p-3 flex flex-col items-center border-b ${colorMode ? 'border-neutral-700 bg-neutral-900' : 'border-[#E2E8F0] bg-white'}`}>
                    {!sidebarCollapsed ? (
                        <>
                            <div className={`w-40 h-16 rounded-xl flex items-center justify-center shadow-brand-glow overflow-hidden border-2 ${colorMode ? 'bg-neutral-800 border-brand-500' : 'bg-white border-neutral-200'}`}>
                                <img src={colorMode ? "/kenstruction-logo-dark.png" : "/kenstruction-logo.png"} alt="Kenstruction Logo" className="w-full h-full object-contain rounded-xl" />
                            </div>
                            <AIPoweredBadge />
                        </>
                    ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl ${colorMode ? 'bg-brand-500 text-white' : 'bg-blue-600 text-white'} shadow-lg`}>
                            K
                        </div>
                    )}
                    
                    {/* Pin/Unpin Toggle Button */}
                    <button
                        onClick={() => {
                            const newPinned = !sidebarPinned;
                            setSidebarPinned(newPinned);
                            localStorage.setItem('sidebarPinned', JSON.stringify(newPinned));
                            if (!newPinned) {
                                setSidebarCollapsed(true);
                            }
                        }}
                        className={`mt-2 p-1.5 rounded-lg transition-colors ${colorMode ? 'hover:bg-neutral-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                        title={sidebarPinned ? 'Auto-collapse sidebar' : 'Pin sidebar'}
                    >
                        {sidebarPinned ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z" />
                            </svg>
                        )}
                    </button>
                </div>
                {/* Sidebar nav (improved spacing) */}
                <nav className={`flex-1 py-3 space-y-1.5 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'px-2' : 'pl-5 pr-4'}`}>
                    {navigationItems.map((item, idx) => (
                        item.isAIAssistant ? (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.page)}
                                className={`w-full text-left flex items-center gap-3 py-2 px-4 text-[10px] font-semibold rounded-lg transition-all duration-200 ${
                                activePage === item.page && !navigationState.selectedProject 
                                    ? colorMode 
                                        ? 'bg-neutral-700 text-white shadow-md' 
                                        : 'bg-blue-50 text-blue-700 shadow-md'
                                    : colorMode 
                                        ? 'text-[#e0eaff] hover:bg-[#232526]/60 hover:text-[#26d0ce]' 
                                : 'text-gray-700 hover:bg-white hover:text-primary-700 hover:shadow-soft'
                            }`}>
                                <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                                {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                            </button>
                        ) : item.isDropdown ? (
                            <div key={item.name} className="relative group">
                                <button
                                    className={`w-full text-left flex items-center gap-3 py-2.5 px-4 font-bold rounded-lg uppercase tracking-wide text-[9px] transition-all duration-200 ${colorMode ? 'text-[#f2fcfe] hover:bg-[#232526]/60' : 'text-gray-700 hover:bg-white'}`}
                                    tabIndex={0}
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                >
                                    <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                                    {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                                    {!sidebarCollapsed && <span className="ml-auto"><ChevronDownIcon className="w-3 h-3" /></span>}
                                </button>
                                {/* Dropdown menu */}
                                <div className="absolute left-0 top-full z-20 min-w-[180px] bg-[#F8FAFC] shadow-xl rounded-lg py-2 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none transition-all duration-200 border border-[#3b82f6] text-white" style={{marginTop: 2}}>
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
                                        ? 'bg-neutral-700 text-white shadow-md' 
                                        : 'bg-blue-50 text-blue-700 shadow-md'
                                    : colorMode 
                                        ? 'text-[#f2fcfe] hover:bg-[#232526]/60 hover:text-[#26d0ce]' 
                                        : 'text-gray-700 hover:bg-white hover:text-primary-700 hover:shadow-soft'
                                }`}> 
                                <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                                {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
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
                                            ? 'bg-neutral-700 text-white shadow-md' 
                                            : 'bg-blue-50 text-blue-700 shadow-md'
                                        : colorMode 
                                            ? 'text-[#e0eaff] hover:bg-[#232526]/60 hover:text-[#26d0ce]' 
                                    : 'text-gray-700 hover:bg-white hover:text-primary-700 hover:shadow-soft'
                            }`}>
                            <span className="w-4 h-4 flex items-center justify-center relative">
                                {item.icon}
                                {/* Red dot for collapsed sidebar - shows on icon for badges or unread messages */}
                                {sidebarCollapsed && (item.badge > 0 || item.hasUnread) && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                )}
                            </span>
                            {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                            {/* Red dot for expanded sidebar - shows when there are unread messages */}
                            {!sidebarCollapsed && item.hasUnread && (
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-lg ml-2" title="New messages"></span>
                            )}
                            {!sidebarCollapsed && item.badge && item.badge > 0 && (
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
                
            </aside>
            
            {/* Main content */}
            <main className={`flex-1 flex flex-col min-w-0 text-xs font-sans transition-colors duration-500 ${colorMode ? 'bg-neutral-900 text-white' : 'bg-[#F8FAFC]'}`} style={{ minWidth: 0, fontSize: '12px' }}>
                {/* Desktop header with user profile */}
                <header className={`hidden lg:flex items-center justify-between p-4 border-b transition-all duration-300 z-[9999] ${colorMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-[#E2E8F0] shadow-soft'}`}>
                    <div className="flex items-center flex-1 min-w-0">
                        {activePage !== 'Overview' && (
                            <div className="flex-shrink-0">
                                <h1 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                                    {activePage === 'Alerts' ? 'Project Alerts' :
                                        activePage === 'Company Calendar' ? 'Company Calendar' :
                                        activePage === 'Email History' ? 'Email History' :
                                        activePage === 'AI Assistant' ? '' :
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
                                        activePage === 'Email History' ? 'View all sent emails with tracking, attachments, and project associations' :
                                        activePage === 'AI Assistant' ? '' :
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
                        <div className="flex-1 max-w-3xl xl:max-w-4xl mx-8">
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
                        {/* Add Project Button */}
                        <button
                            onClick={() => setShowAddProjectModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 bg-[#0089D1] text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5 border border-[#0089D1]/20"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Add Project</span>
                        </button>
                        
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
                                {currentUser?.avatar ? (
                                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500">
                                        <img 
                                            key={currentUser.avatar} // Force re-render when avatar changes
                                            src={currentUser.avatar.startsWith('spaces://') 
                                                ? `https://${process.env.REACT_APP_DO_SPACES_NAME || 'kenstruction'}.${process.env.REACT_APP_DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}/${currentUser.avatar.replace('spaces://', '')}`
                                                : currentUser.avatar
                                            } 
                                            alt="Profile" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.error('Profile image failed to load:', e);
                                                console.error('Avatar URL:', currentUser.avatar);
                                                e.target.style.display = 'none';
                                            }}
                                            onLoad={() => {
                                                console.log('Profile image loaded successfully:', currentUser.avatar);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 bg-[#F8FAFC] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                        {getUserInitials(currentUser)}
                                    </div>
                                )}
                            </button>
                            
                            {/* Dropdown Menu */}
                            {profileDropdownOpen && (
                                <div className={`absolute right-0 top-full mt-2 w-56 rounded-lg shadow-xl z-[99999] border ${colorMode ? 'bg-[#1e293b] border-brand-500/40 text-white' : 'bg-white border-gray-200'}`}>
                                    <div className="py-2">
                                        <div className={`px-4 pb-2 text-[10px] ${colorMode ? 'text-gray-300' : 'text-gray-500'}`}>Signed in as</div>
                                        <div className={`px-4 pb-2 text-sm font-medium truncate ${colorMode ? 'text-white' : 'text-gray-900'}`} title={getUserEmail()}>{getUserEmail()}</div>
                                        <div className={`${colorMode ? 'border-[#3b82f6]/30' : 'border-gray-200'} border-t my-2`}></div>
                                        <button 
                                            onClick={() => { setProfileDropdownOpen(false); navigate('Settings'); }}
                                            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${colorMode ? 'text-white hover:bg-[#232b4d]' : 'text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            <CogIcon /> Settings
                                        </button>
                                        <div className={`${colorMode ? 'border-[#3b82f6]/30' : 'border-gray-200'} border-t my-2`}></div>
                                        <button 
                                            onClick={(e) => { 
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setProfileDropdownOpen(false);
                                                handleLogout();
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${colorMode ? 'text-red-300 hover:bg-[#3b0f0f]' : 'text-red-600 hover:bg-red-50'}`}
                                        >
                                            <LogoutIcon /> Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                
                {/* Mobile header */}
                <header className={`lg:hidden border-b p-3 flex items-center justify-between transition-colors duration-500 ${colorMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-[#E2E8F0]'}`}>
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
                                // Render ProjectChecklistPage for Workflow view, ProjectDetailPage for Profile view
                                if (navigationState.projectInitialView === 'Project Workflow') {
                                    console.log('🔍 MAIN_RENDER: Rendering ProjectChecklistPage (Workflow view)');
                                    return (
                                        <ProjectChecklistPage 
                                            project={navigationState.selectedProject}
                                            onUpdate={handleProjectUpdate}
                                            onPhaseCompletionChange={(phase, completed) => console.log('Phase completion:', phase, completed)}
                                            targetLineItemId={navigationState.targetLineItemId}
                                            targetSectionId={navigationState.targetSectionId}
                                            selectionNonce={navigationState.selectionNonce}
                                            onBack={handleBackToProjects}
                                            colorMode={colorMode}
                                            projectSourceSection={navigationState.projectSourceSection}
                                            onProjectSelect={handleProjectSelect}
                                        />
                                    );
                                }
                                console.log('🔍 MAIN_RENDER: Rendering ProjectDetailPage (Profile view)');
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
                                        selectionNonce={navigationState.selectionNonce}
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
        
        {/* Add Project Modal */}
        <AddProjectModal
            isOpen={showAddProjectModal}
            onClose={() => setShowAddProjectModal(false)}
            onProjectCreated={(project) => {
                console.log('Project created:', project);
                setShowAddProjectModal(false);
                
                // Add the new project to the list immediately to avoid waiting for fetch
                const normalizedNewProject = {
                    ...project,
                    id: project.id || project._id,
                    name: project.name || project.projectName,
                    client: project.client || project.customer ? {
                        name: project.customer?.primaryName || project.client?.name || 'Unknown Client',
                        email: project.customer?.primaryEmail || project.client?.email || '',
                        phone: project.customer?.primaryPhone || project.client?.phone || ''
                    } : { name: 'Unknown Client', email: '', phone: '' },
                    projectManager: project.projectManager || { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@company.com', phone: '5559876543' }
                };
                
                setProjects(prev => [normalizedNewProject, ...prev]);

                // Background refresh to ensure consistency
                if (projectsService && projectsService.getAll) {
                    projectsService.getAll({ limit: 200 }).then(response => {
                        if (response.success && response.data) {
                            const apiProjects = response.data.projects || response.data;
                            const normalizedProjects = (apiProjects || []).map(p => ({
                                ...p,
                                id: p.id || p._id,
                                name: p.name || p.projectName,
                                client: p.client || { name: 'Unknown Client', email: '', phone: '' },
                                projectManager: p.projectManager || { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@company.com', phone: '5559876543' }
                            }));
                            setProjects(normalizedProjects);
                        }
                    }).catch(error => {
                        console.error('Error refreshing projects:', error);
                    });
                }
            }}
        />
        
        </SubjectsProvider>
        </NavigationProvider>
        </AuthProvider>
        <Toaster />
        </QueryClientProvider>
    );
}
