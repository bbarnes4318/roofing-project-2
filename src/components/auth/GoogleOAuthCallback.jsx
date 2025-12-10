import React, { useEffect, useRef } from 'react';

const GoogleOAuthCallback = ({ onLoginSuccess }) => {
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent processing multiple times
    if (hasProcessed.current) return;
    
    const handleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        // Clear URL and reload to show login with error
        window.history.replaceState({}, '', '/');
        window.location.reload();
        return;
      }

      if (token && userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          
          // Store authentication data in localStorage (single source of truth)
          localStorage.setItem('authToken', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          console.log('✅ Google OAuth successful:', user);
          console.log('✅ Token stored in localStorage:', token.substring(0, 20) + '...');
          console.log('✅ User stored:', user.email);
          
          // Mark as processed to prevent re-processing
          hasProcessed.current = true;
          
          // Call login success handler to set React state
          // This will update isAuthenticated and currentUser in App.jsx
          if (onLoginSuccess) {
            console.log('✅ Calling onLoginSuccess handler with user:', user);
            console.log('✅ User object structure:', { 
              hasId: !!user.id, 
              hasFirstName: !!user.firstName, 
              hasUserMetadata: !!user.user_metadata,
              email: user.email 
            });
            // Call the handler to set authentication state
            // This will update isAuthenticated and currentUser in App.jsx
            onLoginSuccess(user);
            
            // Wait for React to process the state update before navigating
            // Use requestAnimationFrame to wait for the next render cycle
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Clear URL parameters and navigate to root WITHOUT reload
                // React will re-render automatically when isAuthenticated state changes
                window.history.replaceState({}, '', '/');
                // The App component will detect isAuthenticated=true and show dashboard
              });
            });
          } else {
            // If no handler, just navigate immediately
            window.history.replaceState({}, '', '/');
            window.location.reload();
          }
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          window.history.replaceState({}, '', '/');
          window.location.reload();
        }
      } else {
        console.error('Missing token or user data', { token: !!token, userParam: !!userParam });
        window.history.replaceState({}, '', '/');
        window.location.reload();
      }
    };

    handleCallback();
  }, [onLoginSuccess]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing Google authentication...</p>
      </div>
    </div>
  );
};

export default GoogleOAuthCallback;
