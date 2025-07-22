import React, { useState } from 'react';
import { authService } from '../../services/api';

const LoginPage = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login with:', formData.email);
      const response = await authService.login(formData);
      console.log('✅ Login successful:', response);
      
      // Small delay to ensure localStorage operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if token was stored with retry
      let hasToken = authService.isAuthenticated();
      console.log('🔑 Token stored (first check):', hasToken);
      
      // If first check fails, try once more after a brief delay
      if (!hasToken) {
        console.log('⏱️ Retrying token check...');
        await new Promise(resolve => setTimeout(resolve, 200));
        hasToken = authService.isAuthenticated();
        console.log('🔑 Token stored (retry check):', hasToken);
      }
      
      if (hasToken) {
        console.log('🔄 Reloading page to trigger auth check...');
        // Reload the page to trigger the auth wrapper to show the main app
        window.location.reload();
      } else {
        console.error('❌ Token not stored properly after retries');
        console.log('🔍 Debug - checking localStorage directly:');
        console.log('🔍 authToken:', localStorage.getItem('authToken'));
        console.log('🔍 user:', localStorage.getItem('user'));
        setError('Login failed - unable to store authentication token. Please try again.');
      }
    } catch (err) {
      console.error('🚨 Login failed:', err);
      setError(err.message || err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img
            className="mx-auto h-12 w-auto"
            src="/logo.png"
            alt="Kenstruction"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-500 underline"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage; 