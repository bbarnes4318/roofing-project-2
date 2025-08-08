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
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  KeyIcon,
  EyeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  CogIcon,
  LockClosedIcon,
  FingerPrintIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { format, subDays } from 'date-fns';

const SecurityDashboardPage = ({ userId }) => {
  // Security state
  const [securityOverview, setSecurityOverview] = useState(null);
  const [devices, setDevices] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [mfaMethods, setMfaMethods] = useState([]);
  const [securityScore, setSecurityScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState('overview'); // overview, devices, events, settings
  const [timeRange, setTimeRange] = useState('7d'); // 24h, 7d, 30d
  const [threatLevel, setThreatLevel] = useState('low'); // low, medium, high, critical

  useEffect(() => {
    fetchSecurityData();
  }, [userId, timeRange]);

  // Fetch all security data
  const fetchSecurityData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchDevices(),
        fetchSecurityEvents(),
        fetchMFAMethods(),
        calculateSecurityScore()
      ]);
    } catch (err) {
      setError('Failed to load security data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/auth/devices', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setDevices(result.devices || []);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  // Fetch security events
  const fetchSecurityEvents = async () => {
    try {
      const response = await fetch(`/api/auth/security/events?limit=50`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setSecurityEvents(result.data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch security events:', err);
    }
  };

  // Fetch MFA methods
  const fetchMFAMethods = async () => {
    try {
      const response = await fetch('/api/auth/mfa/methods', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setMfaMethods(result.methods || []);
      }
    } catch (err) {
      console.error('Failed to fetch MFA methods:', err);
    }
  };

  // Calculate overall security score
  const calculateSecurityScore = () => {
    let score = 0;
    let maxScore = 100;

    // Base score
    score += 20;

    // MFA enabled (+30 points)
    if (mfaMethods.length > 0) {
      score += 30;
      // Bonus for multiple methods
      if (mfaMethods.length > 1) score += 10;
    }

    // Trusted devices (+20 points)
    const trustedDevices = devices.filter(d => d.trusted);
    if (trustedDevices.length > 0) {
      score += 20;
      // Bonus for biometric-enabled devices
      const biometricDevices = trustedDevices.filter(d => d.biometricEnabled);
      score += Math.min(biometricDevices.length * 5, 15);
    }

    // Recent security events (penalty for high-risk events)
    const recentHighRiskEvents = securityEvents.filter(e => 
      e.riskScore >= 70 && 
      new Date(e.createdAt) > subDays(new Date(), 7)
    );
    score -= Math.min(recentHighRiskEvents.length * 10, 30);

    // Device security (penalty for untrusted/old devices)
    const untrustedDevices = devices.filter(d => !d.trusted);
    score -= Math.min(untrustedDevices.length * 5, 20);

    setSecurityScore(Math.max(0, Math.min(score, maxScore)));

    // Determine threat level
    if (recentHighRiskEvents.length >= 3) {
      setThreatLevel('critical');
    } else if (recentHighRiskEvents.length >= 1 || untrustedDevices.length >= 3) {
      setThreatLevel('high');
    } else if (mfaMethods.length === 0 || untrustedDevices.length >= 1) {
      setThreatLevel('medium');
    } else {
      setThreatLevel('low');
    }
  };

  useEffect(() => {
    if (devices.length > 0 && securityEvents.length > 0) {
      calculateSecurityScore();
    }
  }, [devices, securityEvents, mfaMethods]);

  // Get security theme based on threat level
  const getSecurityTheme = () => {
    switch (threatLevel) {
      case 'critical':
        return { color: 'magenta', theme: FuturisticThemes.magenta, label: 'Critical Threat' };
      case 'high':
        return { color: 'orange', theme: FuturisticThemes.orange, label: 'High Risk' };
      case 'medium':
        return { color: 'cyan', theme: FuturisticThemes.cyan, label: 'Medium Security' };
      case 'low':
      default:
        return { color: 'green', theme: FuturisticThemes.green, label: 'Secure' };
    }
  };

  const securityTheme = getSecurityTheme();

  // Get event statistics
  const getEventStats = () => {
    const now = new Date();
    const timeRanges = {
      '24h': 1,
      '7d': 7,
      '30d': 30
    };
    
    const days = timeRanges[timeRange];
    const cutoffDate = subDays(now, days);
    const recentEvents = securityEvents.filter(e => new Date(e.createdAt) > cutoffDate);

    return {
      total: recentEvents.length,
      highRisk: recentEvents.filter(e => e.riskScore >= 70).length,
      mediumRisk: recentEvents.filter(e => e.riskScore >= 40 && e.riskScore < 70).length,
      lowRisk: recentEvents.filter(e => e.riskScore < 40).length,
      deviceEvents: recentEvents.filter(e => e.eventType.includes('DEVICE')).length,
      locationEvents: recentEvents.filter(e => e.eventType.includes('LOCATION')).length,
      mfaEvents: recentEvents.filter(e => e.eventType.includes('MFA')).length
    };
  };

  const eventStats = getEventStats();

  if (isLoading) {
    return (
      <div className="min-h-screen relative bg-black flex items-center justify-center">
        <NeuralBackground
          nodeColor={FuturisticThemes.cyan.primary}
          connectionColor={FuturisticThemes.cyan.glow}
          nodeCount={20}
          synapticFiring={true}
        />
        <div className="text-center text-white">
          <div className="text-xl mb-4">Loading Security Dashboard...</div>
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-black overflow-hidden">
      {/* Neural background with dynamic intensity */}
      <NeuralBackground
        nodeColor={securityTheme.theme.primary}
        connectionColor={securityTheme.theme.glow}
        nodeCount={Math.max(20, 40 - (securityScore / 2.5))} // More nodes = better security
        synapticFiring={threatLevel === 'critical' || threatLevel === 'high'}
        interactive={true}
        pulseEffect={securityScore < 50}
      />

      {/* Particle field overlay */}
      <ParticleField
        particleCount={Math.max(30, securityScore)}
        particleColor={securityTheme.theme.accent}
        variant={threatLevel === 'critical' ? 'energy' : 'constellation'}
        interactive={true}
        className="opacity-40"
      />

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header with threat level indicator */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Security Command Center
              </h1>
              <p className="text-cyan-300">
                Advanced threat monitoring and protection status
              </p>
            </div>

            {/* Threat level indicator */}
            <HolographicCard
              glowColor={securityTheme.color}
              elevation="high"
              className="px-6 py-4 text-center"
            >
              <div className="flex items-center gap-3">
                {threatLevel === 'critical' ? (
                  <ShieldExclamationIcon className="w-8 h-8 text-red-400" />
                ) : threatLevel === 'high' ? (
                  <ExclamationTriangleIcon className="w-8 h-8 text-orange-400" />
                ) : threatLevel === 'medium' ? (
                  <ShieldCheckIcon className="w-8 h-8 text-cyan-400" />
                ) : (
                  <CheckCircleIcon className="w-8 h-8 text-green-400" />
                )}
                <div>
                  <div className="text-lg font-bold text-white">
                    {securityTheme.label}
                  </div>
                  <div className="text-sm opacity-80">
                    Score: {securityScore}/100
                  </div>
                </div>
              </div>
            </HolographicCard>
          </div>

          {/* Security score visualization */}
          <HolographicCard
            glowColor={securityTheme.color}
            elevation="medium"
            className="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Security Status</h3>
              <div className="flex gap-2">
                {['24h', '7d', '30d'].map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-md text-xs transition-all ${
                      timeRange === range
                        ? `bg-${securityTheme.color}-500/30 text-${securityTheme.color}-300`
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Security score bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Overall Security Score</span>
                <span className="text-lg font-bold text-white">{securityScore}%</span>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-4 relative overflow-hidden">
                <motion.div
                  className={`h-4 rounded-full bg-gradient-to-r ${
                    securityScore >= 80 ? 'from-green-400 to-green-600' :
                    securityScore >= 60 ? 'from-cyan-400 to-cyan-600' :
                    securityScore >= 40 ? 'from-orange-400 to-orange-600' :
                    'from-red-400 to-red-600'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${securityScore}%` }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                  style={{
                    boxShadow: `0 0 20px ${securityTheme.theme.glow}`,
                  }}
                />
                
                {/* Scanning line effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-8"
                  animate={{ x: [-32, window.innerWidth] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{devices.length}</div>
                <div className="text-xs text-gray-300">Devices</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{mfaMethods.length}</div>
                <div className="text-xs text-gray-300">MFA Methods</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {devices.filter(d => d.biometricEnabled).length}
                </div>
                <div className="text-xs text-gray-300">Biometric</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400 mb-1">{eventStats.total}</div>
                <div className="text-xs text-gray-300">Events ({timeRange})</div>
              </div>
            </div>
          </HolographicCard>
        </motion.div>

        {/* Tab navigation */}
        <div className="mb-8">
          <div className="flex gap-1 p-1 bg-black/20 rounded-lg max-w-2xl">
            {[
              { id: 'overview', label: 'Security Overview', icon: ChartBarIcon },
              { id: 'devices', label: 'Device Matrix', icon: ComputerDesktopIcon },
              { id: 'events', label: 'Threat Log', icon: ExclamationTriangleIcon },
              { id: 'settings', label: 'Security Config', icon: CogIcon }
            ].map(tab => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-md text-sm transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? `bg-${securityTheme.color}-500/30 text-${securityTheme.color}-300`
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* Security Overview */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Threat analysis grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active threats */}
                <HolographicCard
                  glowColor={eventStats.highRisk > 0 ? 'magenta' : 'green'}
                  elevation="medium"
                  className="p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <ShieldExclamationIcon className="w-5 h-5" />
                    Active Threats
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-red-300">High Risk Events</span>
                      <span className="text-xl font-bold text-red-400">{eventStats.highRisk}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-300">Medium Risk Events</span>
                      <span className="text-xl font-bold text-orange-400">{eventStats.mediumRisk}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-300">Low Risk Events</span>
                      <span className="text-xl font-bold text-green-400">{eventStats.lowRisk}</span>
                    </div>
                  </div>

                  {eventStats.highRisk > 0 && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                      <div className="text-sm text-red-300">
                        <strong>Action Required:</strong> Review high-risk security events immediately
                      </div>
                    </div>
                  )}
                </HolographicCard>

                {/* Device security status */}
                <HolographicCard
                  glowColor="cyan"
                  elevation="medium"
                  className="p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <ComputerDesktopIcon className="w-5 h-5" />
                    Device Security
                  </h3>
                  
                  <div className="space-y-4">
                    {devices.slice(0, 3).map((device) => (
                      <div key={device.id} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          device.trusted ? 'bg-green-400' : 'bg-orange-400'
                        }`} />
                        <div className="flex-1">
                          <div className="text-white text-sm">{device.deviceName}</div>
                          <div className="text-xs text-gray-400">
                            Last used: {format(new Date(device.lastUsed), 'MMM d, HH:mm')}
                          </div>
                        </div>
                        {device.biometricEnabled && (
                          <FingerPrintIcon className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                    ))}
                    
                    {devices.length > 3 && (
                      <button
                        onClick={() => setActiveTab('devices')}
                        className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                      >
                        View all {devices.length} devices →
                      </button>
                    )}
                  </div>
                </HolographicCard>
              </div>

              {/* Security recommendations */}
              <HolographicCard
                glowColor="purple"
                elevation="medium"
                className="p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Security Recommendations
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mfaMethods.length === 0 && (
                    <div className="p-4 bg-orange-500/20 border border-orange-500/40 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <KeyIcon className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-300 font-medium">Enable MFA</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        Multi-factor authentication adds an extra layer of security
                      </p>
                      <QuantumButton variant="warning" size="small">
                        Setup MFA
                      </QuantumButton>
                    </div>
                  )}
                  
                  {devices.filter(d => !d.trusted).length > 0 && (
                    <div className="p-4 bg-cyan-500/20 border border-cyan-500/40 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheckIcon className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-300 font-medium">Trust Devices</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        {devices.filter(d => !d.trusted).length} devices need verification
                      </p>
                      <QuantumButton 
                        variant="primary" 
                        size="small"
                        onClick={() => setActiveTab('devices')}
                      >
                        Review Devices
                      </QuantumButton>
                    </div>
                  )}
                  
                  {devices.filter(d => !d.biometricEnabled).length > 0 && (
                    <div className="p-4 bg-purple-500/20 border border-purple-500/40 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FingerPrintIcon className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 font-medium">Enable Biometrics</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        Biometric authentication provides the highest security
                      </p>
                      <QuantumButton variant="secondary" size="small">
                        Setup Biometrics
                      </QuantumButton>
                    </div>
                  )}
                  
                  {securityScore >= 80 && (
                    <div className="p-4 bg-green-500/20 border border-green-500/40 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                        <span className="text-green-300 font-medium">Excellent Security</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Your account has strong security measures in place
                      </p>
                    </div>
                  )}
                </div>
              </HolographicCard>

              {/* Recent activity timeline */}
              <HolographicCard
                glowColor="cyan"
                elevation="medium"
                className="p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5" />
                  Recent Security Activity
                </h3>
                
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {securityEvents.slice(0, 10).map((event, index) => (
                    <motion.div
                      key={event.id}
                      className="flex items-center gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        event.riskScore >= 70 ? 'bg-red-400' :
                        event.riskScore >= 40 ? 'bg-orange-400' :
                        'bg-green-400'
                      }`} />
                      
                      <div className="flex-1">
                        <div className="text-white text-sm">
                          {event.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(event.createdAt), 'MMM d, HH:mm')}
                        </div>
                      </div>
                      
                      {event.riskScore >= 50 && (
                        <div className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                          Risk: {event.riskScore}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </HolographicCard>
            </motion.div>
          )}

          {/* Other tabs would go here - devices, events, settings */}
          {activeTab !== 'overview' && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center py-20"
            >
              <HolographicCard className="p-8 max-w-md mx-auto">
                <div className="text-gray-400 mb-4">
                  {activeTab === 'devices' && 'Device Matrix interface coming soon'}
                  {activeTab === 'events' && 'Threat Log interface coming soon'}
                  {activeTab === 'settings' && 'Security Configuration coming soon'}
                </div>
                <QuantumButton
                  variant="secondary"
                  onClick={() => setActiveTab('overview')}
                >
                  Return to Overview
                </QuantumButton>
              </HolographicCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SecurityDashboardPage;