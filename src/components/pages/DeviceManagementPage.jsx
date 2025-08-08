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
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  MapPinIcon,
  CalendarIcon,
  TrashIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const DeviceManagementPage = ({ userId }) => {
  // Device management state
  const [devices, setDevices] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState('devices'); // devices, events, settings
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(null);

  useEffect(() => {
    fetchDevices();
    fetchSecurityEvents();
  }, [userId]);

  // Fetch user's devices
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/devices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setDevices(result.devices || []);
      } else {
        setError(result.message || 'Failed to fetch devices');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch security events
  const fetchSecurityEvents = async () => {
    try {
      const response = await fetch('/api/auth/security/events?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setSecurityEvents(result.data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch security events:', err);
    }
  };

  // Trust a device
  const trustDevice = async (deviceId) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/auth/device/${deviceId}/trust`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setSuccess('Device trusted successfully');
        fetchDevices();
      } else {
        setError(result.message || 'Failed to trust device');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a device
  const removeDevice = async (deviceId) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/auth/device/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setSuccess('Device removed successfully');
        setConfirmRemoval(null);
        fetchDevices();
      } else {
        setError(result.message || 'Failed to remove device');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get device icon based on type
  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return DevicePhoneMobileIcon;
      case 'tablet':
        return DeviceTabletIcon;
      default:
        return ComputerDesktopIcon;
    }
  };

  // Get trust status color
  const getTrustStatusColor = (device) => {
    if (device.trusted) return 'green';
    const riskFactors = calculateRiskFactors(device);
    if (riskFactors >= 3) return 'magenta';
    if (riskFactors >= 2) return 'orange';
    return 'cyan';
  };

  // Calculate risk factors
  const calculateRiskFactors = (device) => {
    let risk = 0;
    const now = new Date();
    const lastUsed = new Date(device.lastUsed);
    const daysSinceLastUse = (now - lastUsed) / (1000 * 60 * 60 * 24);

    if (!device.trusted) risk++;
    if (daysSinceLastUse > 30) risk++;
    if (!device.biometricEnabled) risk++;
    if (device.location?.country && device.location.country !== 'US') risk++;

    return risk;
  };

  // Get security event icon
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'DEVICE_NEW':
        return ComputerDesktopIcon;
      case 'DEVICE_TRUSTED':
        return ShieldCheckIcon;
      case 'DEVICE_SUSPICIOUS':
        return ShieldExclamationIcon;
      case 'LOCATION_NEW':
        return MapPinIcon;
      default:
        return ExclamationTriangleIcon;
    }
  };

  // Get event color
  const getEventColor = (eventType, riskScore = 0) => {
    if (riskScore >= 70) return 'magenta';
    if (riskScore >= 40) return 'orange';
    
    switch (eventType) {
      case 'DEVICE_TRUSTED':
        return 'green';
      case 'DEVICE_SUSPICIOUS':
        return 'magenta';
      case 'LOCATION_NEW':
        return 'orange';
      default:
        return 'cyan';
    }
  };

  const overallSecurityLevel = devices.reduce((acc, device) => {
    return acc + (device.trusted ? 25 : 10) + (device.biometricEnabled ? 15 : 0);
  }, 0) / Math.max(devices.length * 40, 1) * 100;

  const securityTheme = overallSecurityLevel >= 80 
    ? { color: 'green', theme: FuturisticThemes.green }
    : overallSecurityLevel >= 60
    ? { color: 'purple', theme: FuturisticThemes.purple }
    : overallSecurityLevel >= 40
    ? { color: 'cyan', theme: FuturisticThemes.cyan }
    : { color: 'orange', theme: FuturisticThemes.orange };

  return (
    <div className="min-h-screen relative bg-black overflow-hidden">
      {/* Neural background */}
      <NeuralBackground
        nodeColor={securityTheme.theme.primary}
        connectionColor={securityTheme.theme.glow}
        nodeCount={25 + Math.floor(overallSecurityLevel / 10)}
        synapticFiring={overallSecurityLevel >= 60}
        interactive={true}
      />

      {/* Particle field */}
      <ParticleField
        {...ParticlePresets.active}
        particleColor={securityTheme.theme.accent}
        className="opacity-30"
      />

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Device Security Management
          </h1>
          <p className="text-cyan-300">
            Monitor and manage your trusted devices and security events
          </p>
        </motion.div>

        {/* Security overview */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <HolographicCard
            glowColor={securityTheme.color}
            elevation="medium"
            className="p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {devices.length}
                </div>
                <div className="text-sm text-gray-300">Total Devices</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {devices.filter(d => d.trusted).length}
                </div>
                <div className="text-sm text-gray-300">Trusted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {devices.filter(d => d.biometricEnabled).length}
                </div>
                <div className="text-sm text-gray-300">Biometric Enabled</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400 mb-1">
                  {Math.round(overallSecurityLevel)}%
                </div>
                <div className="text-sm text-gray-300">Security Score</div>
              </div>
            </div>
          </HolographicCard>
        </motion.div>

        {/* Tab navigation */}
        <div className="mb-8">
          <div className="flex gap-1 p-1 bg-black/20 rounded-lg max-w-md">
            {[
              { id: 'devices', label: 'Devices' },
              { id: 'events', label: 'Security Events' },
              { id: 'settings', label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-4 rounded-md text-sm transition-all ${
                  activeTab === tab.id
                    ? `bg-${securityTheme.color}-500/30 text-${securityTheme.color}-300`
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
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

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* Devices tab */}
          {activeTab === 'devices' && (
            <motion.div
              key="devices"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-cyan-400">Loading devices...</div>
                </div>
              ) : devices.length === 0 ? (
                <HolographicCard className="p-8 text-center">
                  <div className="text-gray-400">No devices found</div>
                </HolographicCard>
              ) : (
                devices.map((device) => {
                  const DeviceIcon = getDeviceIcon(device.deviceType);
                  const trustColor = getTrustStatusColor(device);
                  const riskFactors = calculateRiskFactors(device);

                  return (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      layout
                    >
                      <HolographicCard
                        glowColor={trustColor}
                        elevation="low"
                        className="p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 bg-${trustColor}-500/20 rounded-lg`}>
                              <DeviceIcon className={`w-6 h-6 text-${trustColor}-400`} />
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-white text-lg">
                                {device.deviceName}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" />
                                  Last used: {format(new Date(device.lastUsed), 'MMM d, yyyy')}
                                </span>
                                {device.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPinIcon className="w-3 h-3" />
                                    {device.location.city}, {device.location.country}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Trust status */}
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              device.trusted
                                ? 'bg-green-500/20 text-green-400'
                                : riskFactors >= 3
                                ? 'bg-red-500/20 text-red-400'
                                : riskFactors >= 2
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-cyan-500/20 text-cyan-400'
                            }`}>
                              {device.trusted ? 'Trusted' : 
                               riskFactors >= 3 ? 'High Risk' :
                               riskFactors >= 2 ? 'Medium Risk' : 'New Device'}
                            </div>

                            {/* Biometric indicator */}
                            {device.biometricEnabled && (
                              <div className="w-2 h-2 bg-purple-400 rounded-full" title="Biometric Enabled" />
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              <QuantumButton
                                variant="secondary"
                                size="small"
                                onClick={() => {
                                  setSelectedDevice(device);
                                  setShowDeviceDetails(true);
                                }}
                              >
                                <EyeIcon className="w-4 h-4" />
                              </QuantumButton>

                              {!device.trusted && (
                                <QuantumButton
                                  variant="success"
                                  size="small"
                                  onClick={() => trustDevice(device.id)}
                                >
                                  <ShieldCheckIcon className="w-4 h-4" />
                                </QuantumButton>
                              )}

                              <QuantumButton
                                variant="danger"
                                size="small"
                                onClick={() => setConfirmRemoval(device.id)}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </QuantumButton>
                            </div>
                          </div>
                        </div>
                      </HolographicCard>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* Security Events tab */}
          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {securityEvents.length === 0 ? (
                <HolographicCard className="p-8 text-center">
                  <div className="text-gray-400">No security events</div>
                </HolographicCard>
              ) : (
                securityEvents.map((event, index) => {
                  const EventIcon = getEventIcon(event.eventType);
                  const eventColor = getEventColor(event.eventType, event.riskScore);

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <HolographicCard
                        glowColor={eventColor}
                        elevation="low"
                        className="p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 bg-${eventColor}-500/20 rounded-lg`}>
                            <EventIcon className={`w-5 h-5 text-${eventColor}-400`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white">
                                {event.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              {event.riskScore >= 50 && (
                                <div className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                  Risk: {event.riskScore}
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 flex items-center gap-2">
                              <ClockIcon className="w-3 h-3" />
                              {format(new Date(event.createdAt), 'MMM d, yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                      </HolographicCard>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <HolographicCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Device Security Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Auto-trust familiar devices</div>
                      <div className="text-sm text-gray-400">Automatically trust devices used frequently</div>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Require biometric verification</div>
                      <div className="text-sm text-gray-400">Always require biometric authentication</div>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Email notifications</div>
                      <div className="text-sm text-gray-400">Get notified about new device logins</div>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                </div>
              </HolographicCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Device details modal */}
      <AnimatePresence>
        {showDeviceDetails && selectedDevice && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeviceDetails(false)}
          >
            <motion.div
              className="w-full max-w-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <HolographicCard
                glowColor={getTrustStatusColor(selectedDevice)}
                elevation="high"
                className="p-8"
              >
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Device Details</h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Device Name</label>
                      <div className="text-white">{selectedDevice.deviceName}</div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Device Type</label>
                      <div className="text-white">{selectedDevice.deviceType}</div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Last Used</label>
                      <div className="text-white">
                        {format(new Date(selectedDevice.lastUsed), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Trust Status</label>
                      <div className={`text-${getTrustStatusColor(selectedDevice)}-400`}>
                        {selectedDevice.trusted ? 'Trusted' : 'Not Trusted'}
                      </div>
                    </div>
                    {selectedDevice.location && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Location</label>
                          <div className="text-white">
                            {selectedDevice.location.city}, {selectedDevice.location.region}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Country</label>
                          <div className="text-white">{selectedDevice.location.country}</div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <QuantumButton
                      variant="secondary"
                      onClick={() => setShowDeviceDetails(false)}
                    >
                      Close
                    </QuantumButton>
                    
                    {!selectedDevice.trusted && (
                      <QuantumButton
                        variant="success"
                        onClick={() => {
                          trustDevice(selectedDevice.id);
                          setShowDeviceDetails(false);
                        }}
                      >
                        Trust Device
                      </QuantumButton>
                    )}
                  </div>
                </div>
              </HolographicCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirmRemoval && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <HolographicCard
                glowColor="magenta"
                elevation="high"
                className="p-6 text-center"
              >
                <ExclamationTriangleIcon className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Remove Device</h3>
                <p className="text-gray-300 text-sm mb-6">
                  Are you sure you want to remove this device? This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <QuantumButton
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setConfirmRemoval(null)}
                  >
                    Cancel
                  </QuantumButton>
                  <QuantumButton
                    variant="danger"
                    className="flex-1"
                    onClick={() => removeDevice(confirmRemoval)}
                  >
                    Remove
                  </QuantumButton>
                </div>
              </HolographicCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeviceManagementPage;