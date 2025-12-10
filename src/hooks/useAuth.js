import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      // Use localStorage as single source of truth for auth token
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsLoading(false);
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setIsAuthenticated(true);
      } else {
        // Token is invalid, clear it from localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear localStorage (single source of truth)
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Also clear sessionStorage for any legacy data
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    // Check for existing authentication on mount
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Listen for session expiration events from API interceptor
  useEffect(() => {
    const handleSessionExpired = (event) => {
      console.warn('🔐 Session expired event received:', event.detail?.message);
      logout();
    };

    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    };
  }, [logout]);

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    logout,
    updateUser,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;

