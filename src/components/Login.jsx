import React from 'react';
import GoogleLoginButton from './auth/GoogleLoginButton';

const Login = ({ onLoginSuccess }) => {
  const handleGoogleSuccess = (user) => {
    if (onLoginSuccess) {
      onLoginSuccess(user);
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google login error:', error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome
          </h2>
          <p className="text-gray-600">
            Sign in with your Google account to continue
          </p>
        </div>

        <div className="space-y-4">
          <GoogleLoginButton 
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;