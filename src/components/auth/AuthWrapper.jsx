import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

const AuthWrapper = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking authentication...');
        const hasToken = authService.isAuthenticated();
        console.log('📝 Has token:', hasToken);
        
        if (hasToken) {
          console.log('🔑 Token found, verifying with server...');
          // Verify the token is still valid
          const userData = await authService.getCurrentUser();
          console.log('✅ User data received:', userData);
          setIsAuthenticated(true);
        } else {
          console.log('❌ No token found');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('🚨 Auth check failed:', error);
        // Token is invalid, clear it
        authService.logout();
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const handleStorageChange = () => {
      const hasToken = authService.isAuthenticated();
      console.log('🔄 Storage changed, has token:', hasToken);
      setIsAuthenticated(hasToken);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Check URL for register page
    const isRegisterPage = window.location.pathname === '/register';
    
    if (isRegisterPage || showRegister) {
      return <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />;
    }
    
    return <LoginPage onSwitchToRegister={() => setShowRegister(true)} />;
  }

  return children;
};

export default AuthWrapper; 