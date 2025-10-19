import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleOAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=' + encodeURIComponent(error));
        return;
      }

      if (token && userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          
          // Store authentication data
          localStorage.setItem('authToken', token);
          sessionStorage.setItem('authToken', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          console.log('✅ Google OAuth successful:', user);
          
          // Redirect to dashboard
          navigate('/dashboard');
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          navigate('/login?error=Invalid user data');
        }
      } else {
        console.error('Missing token or user data');
        navigate('/login?error=Authentication failed');
      }
    };

    handleCallback();
  }, [navigate]);

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
