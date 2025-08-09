import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HolographicCard,
  NeuralBackground,
  QuantumButton,
  ParticleField,
  ParticlePresets,
  FuturisticThemes
} from '../futuristic';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  FingerPrintIcon, 
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { authService } from '../../services/api';

const HolographicLoginPage = ({ onLoginSuccess }) => {
  // Authentication state
  const [loginMethod, setLoginMethod] = useState('traditional'); // traditional, biometric, mfa
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);
  
  // Biometric authentication state
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [scanningBiometric, setScanningBiometric] = useState(false);
  
  // UI state
  const [keystrokes, setKeystrokes] = useState([]);
  const [mouseMovements, setMouseMovements] = useState([]);
  const [securityLevel, setSecurityLevel] = useState('standard');
  
  const keystrokeRef = useRef([]);
  const formRef = useRef(null);
  // Using upfront-logo-3.png as it's the stronger, more modern brand mark
  const logoSrc = (process.env.PUBLIC_URL || '') + '/upfront-logo-3.png';

  // Initialize security features (disabled to prevent network errors)
  useEffect(() => {
    // Commented out to prevent 401 errors on production
    // initializeSecurity();
    // generateDeviceFingerprint();
  }, []);

  const initializeSecurity = async () => {
    // Check WebAuthn support
    if (window.PublicKeyCredential) {
      setBiometricSupported(true);
      
      // In development mode, skip API call for credentials check
      if (process.env.NODE_ENV === 'development') {
        setBiometricRegistered(false);
        return;
      }
      
      // Production: Check if user has registered credentials
      try {
        const response = await fetch('/api/auth/webauthn/credentials', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setBiometricRegistered(data.data?.credentials?.length > 0);
        }
      } catch (err) {
        console.log('No existing credentials found');
      }
    }
  };

  const generateDeviceFingerprint = () => {
    // Generate client-side fingerprint
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      plugins: Array.from(navigator.plugins).map(p => p.name).sort().join(','),
      canvas: generateCanvasFingerprint(),
    };
    setDeviceFingerprint(fingerprint);
  };

  const generateCanvasFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprinting', 2, 2);
    return canvas.toDataURL();
  };

  // Behavioral biometrics - keystroke dynamics
  const handleKeyDown = (e) => {
    const timestamp = Date.now();
    keystrokeRef.current.push({
      key: e.key,
      pressTime: timestamp,
      keyCode: e.keyCode,
    });
  };

  const handleKeyUp = (e) => {
    const timestamp = Date.now();
    const pressEvent = keystrokeRef.current.find(k => k.key === e.key && !k.releaseTime);
    if (pressEvent) {
      pressEvent.releaseTime = timestamp;
    }
  };

  // Mouse behavior tracking
  const handleMouseMove = (e) => {
    const timestamp = Date.now();
    setMouseMovements(prev => [
      ...prev.slice(-50), // Keep only last 50 movements
      {
        x: e.clientX,
        y: e.clientY,
        timestamp
      }
    ]);
  };

  // Traditional email/password login with construction-themed loading
  const handleTraditionalLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // In development mode, skip API call and auto-login with demo user
      if (process.env.NODE_ENV === 'development') {
        // Start construction-themed transition
        setTimeout(() => {
          setIsTransitioning(true);
        }, 500);
        
        setTimeout(() => {
          const demoUser = authService.getStoredUser();
          const demoToken = 'demo-token-' + Date.now();
          onLoginSuccess(demoUser, demoToken);
          setIsLoading(false);
          setIsTransitioning(false);
        }, 2500); // Extended loading time for dramatic effect
        return;
      }

      // Production: Simple login without behavioral data to avoid issues
      const response = await authService.login({
        ...formData
      });

      if (response.success) {
        // Check if MFA is required
        if (response.requiresMFA) {
          setLoginMethod('mfa');
          setSecurityLevel('enhanced');
        } else {
          onLoginSuccess(response.data.user, response.data.token);
        }
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Biometric authentication
  const handleBiometricLogin = async () => {
    setScanningBiometric(true);
    setError('');

    try {
      // Request authentication options
      const optionsResponse = await fetch('/api/auth/webauthn/authenticate/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options');
      }

      const { data: options } = await optionsResponse.json();

      // Perform WebAuthn authentication
      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: new Uint8Array(options.challenge),
          allowCredentials: options.allowCredentials.map(cred => ({
            ...cred,
            id: new Uint8Array(cred.id)
          }))
        }
      });

      // Verify authentication
      const verifyResponse = await fetch('/api/auth/webauthn/authenticate/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: {
            id: credential.id,
            rawId: Array.from(new Uint8Array(credential.rawId)),
            type: credential.type,
            response: {
              authenticatorData: Array.from(new Uint8Array(credential.response.authenticatorData)),
              clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
              signature: Array.from(new Uint8Array(credential.response.signature)),
              userHandle: credential.response.userHandle ? Array.from(new Uint8Array(credential.response.userHandle)) : null
            }
          },
          challengeKey: options.challengeKey
        })
      });

      const result = await verifyResponse.json();

      if (result.success) {
        onLoginSuccess(result.data.user, result.data.token);
      } else {
        setError(result.message || 'Biometric authentication failed');
      }

    } catch (err) {
      console.error('Biometric auth error:', err);
      setError('Biometric authentication failed. Please try another method.');
    } finally {
      setScanningBiometric(false);
    }
  };

  // MFA verification
  const handleMFAVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = backupCode ? '/api/auth/mfa/backup/verify' : '/api/auth/mfa/totp/verify';
      const token = backupCode || mfaToken;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formData.userId, // This would be set from the initial login response
          [backupCode ? 'code' : 'token']: token
        })
      });

      const result = await response.json();

      if (result.success) {
        onLoginSuccess(result.data.user, result.data.token);
      } else {
        setError(result.message || 'Invalid verification code');
      }

    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Security level indicator
  const getSecurityIndicator = () => {
    const levels = {
      standard: { color: 'cyan', label: 'Standard Security' },
      enhanced: { color: 'purple', label: 'Enhanced Security' },
      quantum: { color: 'green', label: 'Quantum Security' }
    };
    return levels[securityLevel];
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500">
      {/* Modern Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle geometric shapes */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-brand-primary/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-brand-accent/5 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-blue-500/5 rounded-full blur-xl"></div>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Modern Login Interface */}
      <motion.div 
        className="relative z-10 w-full max-w-md mx-auto px-4"
        onMouseMove={handleMouseMove}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Modern Card Design */}
        <div className="relative">
          {/* Subtle glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 rounded-2xl blur opacity-75" />
          
          {/* Main card */}
          <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-xl shadow-black/5 dark:shadow-black/20 p-8">
            
            {/* Prominent Logo Header */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {/* Beautiful Logo Display */}
              <div className="mb-6">
                <img 
                  src={logoSrc} 
                  alt="UpFront Restoration & Roofing" 
                  className="h-20 mx-auto drop-shadow-lg" 
                />
              </div>
              
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                Welcome back
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Sign in to your account
              </p>
            </motion.div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm"
                >
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compact Modern Form */}
            <motion.form
              ref={formRef}
              onSubmit={handleTraditionalLogin}
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 
                           focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary 
                           transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 
                             focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary 
                             transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500 pr-12"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 rounded p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Compact Options Row */}
              <div className="flex items-center justify-between text-sm pt-2">
                <label htmlFor="remember" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input 
                    id="remember"
                    name="remember"
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-primary focus:ring-brand-primary/30 focus:ring-2"
                  />
                  Remember me
                </label>
                <button 
                  type="button"
                  className="text-brand-primary hover:text-brand-primary/80 transition-colors duration-200 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {/* Modern Sign In Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full relative px-4 py-3 mt-6 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-medium rounded-lg
                         hover:shadow-lg hover:shadow-brand-primary/25 hover:-translate-y-0.5
                         active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                         transition-all duration-200 ease-out
                         focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:ring-offset-2"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <span className={isLoading ? 'opacity-0' : 'opacity-100'}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </span>
              </motion.button>

              {/* Compact Footer */}
              <div className="text-center pt-6">
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Don't have an account?{' '}
                  <button 
                    type="button"
                    className="text-brand-primary hover:text-brand-primary/80 transition-colors duration-200 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </motion.form>
          </div>
        </div>
      </motion.div>
      
      {/* Modern Loading Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              {/* Modern Loading Spinner */}
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-slate-200/20 rounded-full"></div>
                <motion.div
                  className="absolute inset-0 border-4 border-transparent border-t-brand-primary rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-2 border-3 border-transparent border-t-brand-accent rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <h2 className="text-xl font-semibold text-white mb-2">Signing you in</h2>
                <p className="text-slate-400 text-sm">Please wait a moment...</p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HolographicLoginPage;

// Modern theme toggle component
function ThemeToggle() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);
  
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) setDark(saved === 'dark');
  }, []);
  
  return (
    <motion.button
      onClick={() => setDark(v => !v)}
      className="relative p-2.5 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 
                 shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30
                 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      aria-label="Toggle theme"
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
    >
      <div className="relative w-5 h-5">
        <SunIcon 
          className={`absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-300 ${
            dark ? 'opacity-0 rotate-180 scale-0' : 'opacity-100 rotate-0 scale-100'
          }`} 
        />
        <MoonIcon 
          className={`absolute inset-0 w-5 h-5 text-indigo-500 transition-all duration-300 ${
            dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-0'
          }`} 
        />
      </div>
    </motion.button>
  );
}