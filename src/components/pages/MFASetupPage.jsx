import React, { useState, useEffect } from 'react';
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
  DevicePhoneMobileIcon,
  QrCodeIcon,
  KeyIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const MFASetupPage = ({ userId, onComplete }) => {
  // Setup state
  const [currentStep, setCurrentStep] = useState(1);
  const [setupMethod, setSetupMethod] = useState('totp'); // totp, backup
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // TOTP setup state
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [totpEnabled, setTotpEnabled] = useState(false);

  // Backup codes state
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodesConfirmed, setBackupCodesConfirmed] = useState(false);
  const [downloadedCodes, setDownloadedCodes] = useState(false);

  // Security visualization
  const [securityLevel, setSecurityLevel] = useState(1);
  const [quantumEffectIntensity, setQuantumEffectIntensity] = useState(0.3);

  useEffect(() => {
    // Update security level based on enabled methods
    let level = 1;
    let intensity = 0.3;
    
    if (totpEnabled) {
      level += 2;
      intensity += 0.3;
    }
    if (backupCodes.length > 0) {
      level += 1;
      intensity += 0.2;
    }

    setSecurityLevel(level);
    setQuantumEffectIntensity(Math.min(1, intensity));
  }, [totpEnabled, backupCodes]);

  // Initialize TOTP setup
  const initializeTOTPSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/totp/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (result.success) {
        setTotpSecret(result.secret);
        setQrCodeUrl(result.qrCode);
        setBackupCodes(result.backupCodes || []);
        setCurrentStep(2);
      } else {
        setError(result.message || 'Failed to initialize TOTP setup');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify TOTP setup
  const verifyTOTPSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/totp/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          token: verificationCode
        })
      });

      const result = await response.json();

      if (result.success) {
        setTotpEnabled(true);
        setSuccess('TOTP authentication enabled successfully!');
        setCurrentStep(3);
      } else {
        setError(result.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate new backup codes
  const generateBackupCodes = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/backup/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (result.success) {
        setBackupCodes(result.data.backupCodes);
        setSuccess('New backup codes generated successfully!');
      } else {
        setError(result.message || 'Failed to generate backup codes');
      }
    } catch (err) {
      setError('Failed to generate backup codes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download backup codes
  const downloadBackupCodes = () => {
    const content = backupCodes.map((code, index) => 
      `${index + 1}. ${code}`
    ).join('\n');
    
    const blob = new Blob([
      `Kenstruction MFA Backup Codes\n`,
      `Generated: ${new Date().toLocaleString()}\n`,
      `User ID: ${userId}\n\n`,
      `Important: Store these codes in a secure location.\n`,
      `Each code can only be used once.\n\n`,
      content
    ], { type: 'text/plain' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kenstruction-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setDownloadedCodes(true);
  };

  // Copy backup codes to clipboard
  const copyBackupCodes = async () => {
    const content = backupCodes.join('\n');
    try {
      await navigator.clipboard.writeText(content);
      setSuccess('Backup codes copied to clipboard!');
    } catch (err) {
      setError('Failed to copy backup codes');
    }
  };

  const getSecurityTheme = () => {
    if (securityLevel >= 4) {
      return { color: 'green', theme: FuturisticThemes.green, label: 'Maximum Security' };
    } else if (securityLevel >= 3) {
      return { color: 'purple', theme: FuturisticThemes.purple, label: 'High Security' };
    } else if (securityLevel >= 2) {
      return { color: 'cyan', theme: FuturisticThemes.cyan, label: 'Enhanced Security' };
    } else {
      return { color: 'orange', theme: FuturisticThemes.orange, label: 'Basic Security' };
    }
  };

  const securityTheme = getSecurityTheme();

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-black">
      {/* Dynamic neural background */}
      <NeuralBackground
        nodeColor={securityTheme.theme.primary}
        connectionColor={securityTheme.theme.glow}
        nodeCount={20 + (securityLevel * 5)}
        synapticFiring={securityLevel >= 2}
        interactive={true}
        pulseEffect={true}
      />

      {/* Quantum particle field */}
      <ParticleField
        particleCount={30 + (securityLevel * 10)}
        particleColor={securityTheme.theme.accent}
        interactive={true}
        variant="quantum"
        className={`opacity-${Math.floor(quantumEffectIntensity * 100)}`}
      />

      <div className="relative z-10 w-full max-w-2xl p-6">
        {/* Security level indicator */}
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <HolographicCard
            glowColor={securityTheme.color}
            elevation="medium"
            className="inline-block px-6 py-3"
          >
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-6 h-6" />
              <div className="text-left">
                <div className="text-lg font-semibold text-white">
                  {securityTheme.label}
                </div>
                <div className="text-sm opacity-80">
                  Level {securityLevel}/4
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={`w-2 h-6 rounded-full transition-all duration-500 ${
                      level <= securityLevel
                        ? `bg-${securityTheme.color}-400`
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </HolographicCard>
        </motion.div>

        {/* Main setup container */}
        <HolographicCard
          glowColor={securityTheme.color}
          elevation="high"
          className="p-8"
        >
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-white mb-2">
              Multi-Factor Authentication Setup
            </h1>
            <p className="text-cyan-300">
              Enhance your account security with quantum-level protection
            </p>
          </motion.div>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((step, index) => (
                <div key={step} className="flex items-center">
                  <motion.div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step <= currentStep
                        ? `bg-${securityTheme.color}-500 text-white`
                        : 'bg-gray-700 text-gray-400'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    {step < currentStep ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      step
                    )}
                  </motion.div>
                  {index < 3 && (
                    <div
                      className={`w-16 h-0.5 mx-2 transition-all ${
                        step < currentStep
                          ? `bg-${securityTheme.color}-500`
                          : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center text-sm text-gray-400">
              Step {currentStep} of 4: {
                currentStep === 1 ? 'Choose Method' :
                currentStep === 2 ? 'Setup Authenticator' :
                currentStep === 3 ? 'Backup Codes' :
                'Complete'
              }
            </div>
          </div>

          {/* Error/Success messages */}
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
            
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-4 p-3 bg-green-500/20 border border-green-500/40 rounded-lg flex items-center gap-2 text-green-300 text-sm"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step content */}
          <AnimatePresence mode="wait">
            {/* Step 1: Choose method */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white text-center">
                  Choose Authentication Method
                </h3>
                
                <div className="grid gap-4">
                  <HolographicCard
                    glowColor="cyan"
                    elevation="low"
                    className={`p-4 cursor-pointer transition-all ${
                      setupMethod === 'totp' ? 'ring-2 ring-cyan-400' : ''
                    }`}
                    onClick={() => setSetupMethod('totp')}
                  >
                    <div className="flex items-center gap-4">
                      <DevicePhoneMobileIcon className="w-8 h-8 text-cyan-400" />
                      <div>
                        <h4 className="font-semibold text-white">Time-based OTP (TOTP)</h4>
                        <p className="text-sm text-gray-300">
                          Use Google Authenticator, Authy, or similar apps
                        </p>
                      </div>
                    </div>
                  </HolographicCard>
                </div>

                <QuantumButton
                  variant="primary"
                  size="large"
                  className="w-full"
                  onClick={initializeTOTPSetup}
                  disabled={isLoading}
                >
                  {isLoading ? 'Initializing...' : 'Begin Setup'}
                </QuantumButton>
              </motion.div>
            )}

            {/* Step 2: TOTP Setup */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Scan QR Code
                  </h3>
                  
                  {qrCodeUrl && (
                    <div className="inline-block p-4 bg-white rounded-lg">
                      <img src={qrCodeUrl} alt="QR Code for TOTP setup" className="w-48 h-48" />
                    </div>
                  )}
                  
                  <p className="text-gray-300 text-sm mt-4">
                    Scan this QR code with your authenticator app, then enter the 6-digit code below
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 bg-black/30 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-center text-xl font-mono"
                    placeholder="000000"
                    maxLength="6"
                  />
                </div>

                <QuantumButton
                  variant="success"
                  size="large"
                  className="w-full"
                  onClick={verifyTOTPSetup}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Enable'}
                </QuantumButton>
              </motion.div>
            )}

            {/* Step 3: Backup Codes */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Backup Codes
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Save these backup codes in a secure location. Each code can only be used once.
                  </p>
                </div>

                <div className="relative">
                  <div className={`transition-all ${showBackupCodes ? 'blur-none' : 'blur-sm'}`}>
                    <div className="grid grid-cols-2 gap-2 p-4 bg-black/30 rounded-lg border border-purple-500/30">
                      {backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="p-2 bg-purple-500/10 rounded text-center font-mono text-sm text-purple-300"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {!showBackupCodes && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <QuantumButton
                        variant="secondary"
                        onClick={() => setShowBackupCodes(true)}
                      >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        Show Codes
                      </QuantumButton>
                    </div>
                  )}
                </div>

                {showBackupCodes && (
                  <div className="grid grid-cols-2 gap-4">
                    <QuantumButton
                      variant="warning"
                      onClick={downloadBackupCodes}
                    >
                      <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                      Download
                    </QuantumButton>
                    
                    <QuantumButton
                      variant="warning"
                      onClick={copyBackupCodes}
                    >
                      <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                      Copy
                    </QuantumButton>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={downloadedCodes}
                      onChange={(e) => setDownloadedCodes(e.target.checked)}
                      className="rounded border-purple-500/30 bg-black/30 text-purple-500"
                    />
                    <span className="text-gray-300">I have saved these backup codes securely</span>
                  </label>
                  
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={backupCodesConfirmed}
                      onChange={(e) => setBackupCodesConfirmed(e.target.checked)}
                      className="rounded border-purple-500/30 bg-black/30 text-purple-500"
                    />
                    <span className="text-gray-300">I understand each code can only be used once</span>
                  </label>
                </div>

                <QuantumButton
                  variant="success"
                  size="large"
                  className="w-full"
                  onClick={() => setCurrentStep(4)}
                  disabled={!downloadedCodes || !backupCodesConfirmed}
                >
                  Continue to Complete
                </QuantumButton>
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center space-y-6"
              >
                <motion.div
                  className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <CheckCircleIcon className="w-12 h-12 text-green-400" />
                </motion.div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Multi-Factor Authentication Enabled!
                  </h3>
                  <p className="text-green-300">
                    Your account is now protected with quantum-level security
                  </p>
                </div>

                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <h4 className="font-semibold text-green-300 mb-2">What's Protected:</h4>
                  <ul className="text-sm text-gray-300 space-y-1 text-left">
                    <li>• Account login with TOTP verification</li>
                    <li>• Backup codes for emergency access</li>
                    <li>• Device fingerprinting and trust management</li>
                    <li>• Behavioral biometrics monitoring</li>
                  </ul>
                </div>

                <QuantumButton
                  variant="primary"
                  size="large"
                  className="w-full"
                  onClick={() => onComplete && onComplete()}
                >
                  Complete Setup
                </QuantumButton>
              </motion.div>
            )}
          </AnimatePresence>
        </HolographicCard>
      </div>
    </div>
  );
};

export default MFASetupPage;