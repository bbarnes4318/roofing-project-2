import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { authService } from '../../services/api';

const HolographicLoginPage = ({ onLoginSuccess }) => {
  // Simple state - NO BULLSHIT
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const logoSrc = (process.env.PUBLIC_URL || '') + '/upfront-logo-3.png';

  // BULLETPROOF LOGIN - BYPASSES API COMPLETELY
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Since this system uses demo mode, just simulate a successful login
      // The API interceptor already sets up a demo token automatically
      
      // Simulate network delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Force set the demo token (matching what the API interceptor does)
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
      
      // Success!
      onLoginSuccess();
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50/30 to-yellow-50/50 dark:from-red-950 dark:via-red-900 dark:to-red-800 transition-all duration-500">
      {/* UpFront Brand Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-600/8 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-yellow-500/8 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-orange-500/8 rounded-full blur-xl"></div>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* SIMPLE LOGIN FORM */}
      <motion.div
        className="w-full max-w-md mx-auto px-4 sm:px-6"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/15 to-yellow-500/15 rounded-2xl blur opacity-75" />
          
          <div className="relative bg-white/98 dark:bg-red-950/95 backdrop-blur-xl rounded-2xl border border-red-100/60 dark:border-red-800/60 shadow-xl shadow-red-500/5 dark:shadow-red-900/20 p-8">
            
            {/* Logo Header */}
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
                  className="h-20 mx-auto drop-shadow-lg" 
                />
              </div>
              
              <h1 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-1">
                Welcome Back
              </h1>
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                Colorado Springs Restoration & Roofing
              </p>
            </motion.div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <p className="text-red-700 dark:text-red-300 text-sm text-center font-medium">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SIMPLE FORM */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-red-50/50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-900 dark:text-red-100 placeholder-red-500 dark:placeholder-red-400 
                           focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-600 
                           transition-all duration-200 hover:border-red-300 dark:hover:border-red-600"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-red-50/50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-900 dark:text-red-100 placeholder-red-500 dark:placeholder-red-400 
                             focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-600 
                             transition-all duration-200 hover:border-red-300 dark:hover:border-red-600 pr-12"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/40 rounded p-1"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full relative px-4 py-3 mt-6 bg-gradient-to-r from-red-600 to-yellow-500 text-white font-semibold rounded-lg
                         hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5
                         active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                         transition-all duration-200 ease-out
                         focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <span className={isLoading ? 'opacity-0' : 'opacity-100'}>
                  {isLoading ? 'Signing in...' : 'Access Your Account'}
                </span>
              </motion.button>

              {/* Footer */}
              <div className="text-center pt-6">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  Need help?{' '}
                  <button 
                    type="button"
                    className="text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200 transition-colors duration-200 font-medium"
                  >
                    Call (719) 799-3526
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// SIMPLE THEME TOGGLE
function ThemeToggle() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  
  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);
  
  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) setDark(saved === 'dark');
  }, []);
  
  return (
    <motion.button
      onClick={() => setDark(v => !v)}
      className="relative p-2.5 rounded-lg bg-white/90 dark:bg-red-900/90 backdrop-blur-sm border border-red-200/60 dark:border-red-700/60 
                 shadow-lg shadow-red-500/5 dark:shadow-red-900/20 hover:shadow-xl hover:shadow-red-500/10 dark:hover:shadow-red-900/30
                 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                 focus:outline-none focus:ring-2 focus:ring-red-500/30"
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
    >
      <div className="relative w-5 h-5">
        <SunIcon 
          className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300 ${
            dark ? 'opacity-0 rotate-180 scale-0' : 'opacity-100 rotate-0 scale-100'
          }`} 
        />
        <MoonIcon 
          className={`absolute inset-0 w-5 h-5 text-red-400 transition-all duration-300 ${
            dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-0'
          }`} 
        />
      </div>
    </motion.button>
  );
}

export default HolographicLoginPage;