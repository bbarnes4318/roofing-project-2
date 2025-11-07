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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-100 relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/bubbles-logo.png" 
              alt="Bubbles AI" 
              className="h-20 w-auto object-contain"
              onError={(e) => {
                // Fallback if logo doesn't load
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Welcome to Bubbles AI
          </h1>
          <p className="text-gray-600 text-lg">
            Sign in with your Google account to get started
          </p>
        </div>

        {/* Login Button Section */}
        <div className="space-y-6">
          <GoogleLoginButton 
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
          
          {/* Additional Info */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Secure authentication powered by Google
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Login;