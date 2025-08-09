import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

const BlueprintLoginPage = ({ onLoginSuccess }) => {
  // State for form data, password visibility, loading, and errors
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Set logo source from public folder
  const logoSrc = (process.env.PUBLIC_URL || '') + '/upfront-logo-3.png';

  // Handles the login process
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate a successful login after a short delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const demoToken = 'demo-sarah-owner-token-fixed-12345';
      localStorage.setItem('authToken', demoToken);
      localStorage.setItem('user', JSON.stringify({
        _id: 'demo-sarah-owner-id',
        firstName: 'Sarah',
        lastName: 'Owner',
        email: 'sarah@upfrontrnr.com',
        role: 'admin',
        avatar: 'SO',
        company: 'UpFront Restoration & Roofing',
        position: 'Owner',
        department: 'Management',
        isVerified: true
      }));

      onLoginSuccess();

    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Main container with a dark, blueprint-grid background
    <div className="min-h-screen relative flex items-center justify-center bg-neutral-900 bg-blueprint-grid bg-center text-white">
      
      {/* Decorative background circles for a high-tech feel */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/3 right-1/4 w-32 h-32 bg-neutral-700/10 rounded-full blur-3xl animate-pulse-glow [animation-delay:1s]"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl animate-pulse-glow [animation-delay:2s]"></div>
      </div>

      {/* Login form container with animation */}
      <motion.div
        className="w-full max-w-md mx-auto px-4 sm:px-6"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="relative">
          {/* Main login card with a frosted glass effect */}
          <div className="relative bg-neutral-800/60 backdrop-blur-xl rounded-2xl border border-neutral-700/80 shadow-strong shadow-black/30 p-8">
            
            {/* Logo and header section */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="mb-6">
                <img
                  src={logoSrc}
                  alt="UpFront Restoration & Roofing"
                  className="h-20 mx-auto" // Removed drop-shadow for a cleaner look on dark bg
                />
              </div>
              <h1 className="text-2xl font-bold text-neutral-100 mb-1">
                System Access
              </h1>
              <p className="text-neutral-400 text-sm font-medium">
                UpFront Restoration & Roofing Portal
              </p>
            </motion.div>

            {/* Error message display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="mb-6 p-3 bg-accent-600/20 border border-accent-600/30 rounded-lg"
                >
                  <p className="text-red-300 text-sm text-center font-medium">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email input field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500
                             focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400
                             transition-all duration-200 hover:border-cyan-500"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password input field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500
                                 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400
                                 transition-all duration-200 hover:border-cyan-500 pr-12"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-cyan-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded p-1"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full relative px-4 py-3 mt-4 bg-accent-600 text-white font-semibold rounded-lg
                           hover:bg-accent-500 hover:shadow-lg hover:shadow-accent-600/30 hover:-translate-y-0.5
                           active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed
                           transition-all duration-200 ease-out
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-accent-500/50"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <span className={isLoading ? 'opacity-0' : 'opacity-100'}>
                  {isLoading ? 'Authenticating...' : 'Access Account'}
                </span>
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BlueprintLoginPage;
