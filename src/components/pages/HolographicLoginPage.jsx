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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { authService } from '../../services/api';

const HolographicLoginPage = ({ onLoginSuccess }) => {
  // Authentication state
  const [loginMethod, setLoginMethod] = useState('traditional'); // traditional, biometric, mfa
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  // Initialize security features
  useEffect(() => {
    initializeSecurity();
    generateDeviceFingerprint();
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

  // Traditional email/password login
  const handleTraditionalLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // In development mode, skip API call and auto-login with demo user
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          const demoUser = authService.getStoredUser();
          const demoToken = 'demo-token-' + Date.now();
          onLoginSuccess(demoUser, demoToken);
          setIsLoading(false);
        }, 1000); // Simulate loading time
        return;
      }

      // Production: Send behavioral data along with login
      const behaviorData = {
        keystrokes: keystrokeRef.current,
        mouseMovements: mouseMovements,
        deviceFingerprint
      };

      const response = await authService.login({
        ...formData,
        behaviorData
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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-black">
      {/* Dynamic background based on security level */}
      <NeuralBackground
        {...(securityLevel === 'quantum' ? {
          nodeColor: FuturisticThemes.green.primary,
          connectionColor: FuturisticThemes.green.glow,
          nodeCount: 40,
          synapticFiring: true,
          interactive: true
        } : securityLevel === 'enhanced' ? {
          nodeColor: FuturisticThemes.purple.primary,
          connectionColor: FuturisticThemes.purple.glow,
          nodeCount: 35,
          synapticFiring: true,
          interactive: false
        } : {
          nodeColor: FuturisticThemes.cyan.primary,
          connectionColor: FuturisticThemes.cyan.glow,
          nodeCount: 30,
          synapticFiring: false,
          interactive: true
        })}
      />

      {/* Particle field overlay */}
      <ParticleField
        {...ParticlePresets.subtle}
        className="opacity-40"
      />

      {/* Main login interface */}
      <div 
        className="relative z-10 w-full max-w-md p-6"
        onMouseMove={handleMouseMove}
      >
        {/* Security level indicator */}
        <motion.div
          className="mb-6 flex items-center justify-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <HolographicCard
            glowColor={getSecurityIndicator().color}
            elevation="low"
            className="px-4 py-2 text-center"
          >
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheckIcon className="w-4 h-4" />
              {getSecurityIndicator().label}
            </div>
          </HolographicCard>
        </motion.div>

        {/* Login form container */}
        <HolographicCard
          glowColor={getSecurityIndicator().color}
          elevation="high"
          className="p-8"
        >
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-white mb-2">
              Quantum Access Portal
            </h1>
            <p className="text-cyan-300 text-sm">
              Secure authentication with advanced biometrics
            </p>
          </motion.div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg flex items-center gap-2 text-red-300 text-sm"
              >
                <ExclamationTriangleIcon className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authentication method selector */}
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
              <button
                onClick={() => setLoginMethod('traditional')}
                className={`flex-1 py-2 px-3 rounded-md text-xs transition-all ${
                  loginMethod === 'traditional'
                    ? 'bg-cyan-500/30 text-cyan-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ComputerDesktopIcon className="w-4 h-4 mx-auto mb-1" />
                Traditional
              </button>
              
              {biometricSupported && (
                <button
                  onClick={() => setLoginMethod('biometric')}
                  className={`flex-1 py-2 px-3 rounded-md text-xs transition-all ${
                    loginMethod === 'biometric'
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FingerPrintIcon className="w-4 h-4 mx-auto mb-1" />
                  Biometric
                </button>
              )}
              
              {loginMethod === 'mfa' && (
                <button
                  className="flex-1 py-2 px-3 rounded-md text-xs bg-green-500/30 text-green-300"
                >
                  <DevicePhoneMobileIcon className="w-4 h-4 mx-auto mb-1" />
                  MFA Required
                </button>
              )}
            </div>
          </div>

          {/* Traditional login form */}
          <AnimatePresence mode="wait">
            {loginMethod === 'traditional' && (
              <motion.form
                key="traditional"
                ref={formRef}
                onSubmit={handleTraditionalLogin}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    className="w-full px-4 py-3 bg-black/30 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                      className="w-full px-4 py-3 bg-black/30 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <QuantumButton
                  type="submit"
                  variant="primary"
                  size="large"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Authenticating...' : 'Access System'}
                </QuantumButton>
              </motion.form>
            )}

            {/* Biometric authentication */}
            {loginMethod === 'biometric' && (
              <motion.div
                key="biometric"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center space-y-6"
              >
                <div className="relative">
                  <motion.div
                    animate={scanningBiometric ? { scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] } : {}}
                    transition={{ duration: 2, repeat: scanningBiometric ? Infinity : 0 }}
                    className="w-24 h-24 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center border-2 border-purple-500/40"
                  >
                    <FingerPrintIcon className="w-12 h-12 text-purple-300" />
                  </motion.div>
                  
                  {scanningBiometric && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-purple-400"
                      animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Biometric Authentication
                  </h3>
                  <p className="text-purple-300 text-sm mb-4">
                    Use your fingerprint, face, or other biometric data
                  </p>
                </div>

                <QuantumButton
                  variant="secondary"
                  size="large"
                  className="w-full"
                  onClick={handleBiometricLogin}
                  disabled={scanningBiometric}
                >
                  {scanningBiometric ? 'Scanning...' : 'Scan Biometric'}
                </QuantumButton>

                <button
                  onClick={() => setLoginMethod('traditional')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Use traditional login instead
                </button>
              </motion.div>
            )}

            {/* MFA verification */}
            {loginMethod === 'mfa' && (
              <motion.form
                key="mfa"
                onSubmit={handleMFAVerification}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Multi-Factor Authentication
                  </h3>
                  <p className="text-green-300 text-sm">
                    Enter your verification code or backup code
                  </p>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setBackupCode('')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs transition-all ${
                      !backupCode
                        ? 'bg-green-500/30 text-green-300'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    TOTP Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupCode(' ')} // Non-empty to trigger backup mode
                    className={`flex-1 py-2 px-3 rounded-md text-xs transition-all ${
                      backupCode
                        ? 'bg-orange-500/30 text-orange-300'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Backup Code
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    value={backupCode ? backupCode.trim() : mfaToken}
                    onChange={(e) => backupCode 
                      ? setBackupCode(e.target.value)
                      : setMfaToken(e.target.value)
                    }
                    className="w-full px-4 py-3 bg-black/30 border border-green-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all text-center text-lg font-mono"
                    placeholder={backupCode ? "Enter backup code" : "Enter 6-digit code"}
                    required
                    maxLength={backupCode ? 8 : 6}
                  />
                </div>

                <QuantumButton
                  type="submit"
                  variant="success"
                  size="large"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Verify Identity'}
                </QuantumButton>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Additional options */}
          {loginMethod === 'traditional' && (
            <motion.div
              className="mt-6 text-center space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                Forgot password?
              </button>
              <br />
              <button className="text-gray-400 hover:text-white text-sm transition-colors">
                Need help accessing your account?
              </button>
            </motion.div>
          )}
        </HolographicCard>

        {/* Company branding */}
        <motion.div
          className="text-center mt-6 text-gray-400 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p>Kenstruction Management System</p>
          <p>Secured by Quantum Authentication Protocol</p>
        </motion.div>
      </div>
    </div>
  );
};

export default HolographicLoginPage;