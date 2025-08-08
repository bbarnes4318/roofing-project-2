import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

// Performance optimization context
const QuantumPerformanceContext = createContext({
  performanceLevel: 'high',
  reducedMotion: false,
  batteryLevel: 1,
  connectionSpeed: 'fast',
  deviceCapabilities: {}
});

// Performance monitoring hook
export const useQuantumPerformance = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    particleCount: 0,
    animationComplexity: 'high'
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const memoryRef = useRef(null);

  useEffect(() => {
    let animationId;
    
    const measurePerformance = () => {
      const now = performance.now();
      frameCountRef.current++;

      // Calculate FPS every second
      if (now - lastTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        
        // Get memory usage if available
        const memory = performance.memory || { usedJSHeapSize: 0, totalJSHeapSize: 1 };
        const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;

        setPerformanceMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage,
          renderTime: now - lastTimeRef.current,
        }));

        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationId = requestAnimationFrame(measurePerformance);
    };

    measurePerformance();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return performanceMetrics;
};

// Device capability detection hook
export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    deviceMemory: navigator.deviceMemory || 4,
    connection: null,
    battery: null,
    webGL: false,
    webGL2: false,
    reducedMotion: false,
    highContrast: false
  });

  useEffect(() => {
    // Detect WebGL capabilities
    const canvas = document.createElement('canvas');
    const webgl = canvas.getContext('webgl');
    const webgl2 = canvas.getContext('webgl2');

    // Check accessibility preferences
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;

    setCapabilities(prev => ({
      ...prev,
      webGL: !!webgl,
      webGL2: !!webgl2,
      reducedMotion,
      highContrast
    }));

    // Battery API (if available)
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setCapabilities(prev => ({
          ...prev,
          battery: {
            level: battery.level,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          }
        }));

        // Listen for battery changes
        const updateBattery = () => {
          setCapabilities(prev => ({
            ...prev,
            battery: {
              level: battery.level,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            }
          }));
        };

        battery.addEventListener('chargingchange', updateBattery);
        battery.addEventListener('levelchange', updateBattery);
      });
    }

    // Network Information API (if available)
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setCapabilities(prev => ({
        ...prev,
        connection: {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        }
      }));

      const updateConnection = () => {
        setCapabilities(prev => ({
          ...prev,
          connection: {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          }
        }));
      };

      connection.addEventListener('change', updateConnection);
    }
  }, []);

  return capabilities;
};

// Performance optimization utilities
export const QuantumPerformanceOptimizer = {
  // Determine optimal settings based on device capabilities
  getOptimalSettings: (capabilities, performanceMetrics) => {
    const settings = {
      particleCount: 50,
      animationComplexity: 'high',
      quantumEffects: true,
      neuralNetworks: true,
      glowEffects: true,
      particlePhysics: true,
      realTimeUpdates: true,
      canvasRendering: true
    };

    // Reduce settings for low-end devices
    if (capabilities.hardwareConcurrency < 4 || capabilities.deviceMemory < 4) {
      settings.particleCount = 20;
      settings.animationComplexity = 'medium';
      settings.particlePhysics = false;
    }

    // Adjust based on FPS
    if (performanceMetrics.fps < 30) {
      settings.particleCount = Math.floor(settings.particleCount * 0.5);
      settings.animationComplexity = 'low';
      settings.glowEffects = false;
      settings.realTimeUpdates = false;
    }

    // Respect reduced motion preference
    if (capabilities.reducedMotion) {
      settings.animationComplexity = 'none';
      settings.quantumEffects = false;
      settings.particlePhysics = false;
    }

    // Adjust for low battery
    if (capabilities.battery?.level < 0.2 && !capabilities.battery?.charging) {
      settings.particleCount = Math.floor(settings.particleCount * 0.3);
      settings.animationComplexity = 'low';
      settings.realTimeUpdates = false;
    }

    // Adjust for slow connection
    if (capabilities.connection?.effectiveType === 'slow-2g' || 
        capabilities.connection?.effectiveType === '2g' ||
        capabilities.connection?.saveData) {
      settings.realTimeUpdates = false;
      settings.canvasRendering = false;
    }

    return settings;
  },

  // Throttle function for expensive operations
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Debounce function for frequent operations
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Memory management for particle systems
  memoryPool: (() => {
    const pools = new Map();

    return {
      getParticle: (type = 'default') => {
        if (!pools.has(type)) {
          pools.set(type, []);
        }
        
        const pool = pools.get(type);
        return pool.length > 0 ? pool.pop() : {
          x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 1, color: 'white'
        };
      },

      returnParticle: (particle, type = 'default') => {
        if (!pools.has(type)) {
          pools.set(type, []);
        }
        
        const pool = pools.get(type);
        if (pool.length < 100) { // Limit pool size
          // Reset particle properties
          Object.assign(particle, {
            x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 1, color: 'white'
          });
          pool.push(particle);
        }
      },

      clearPool: (type) => {
        if (pools.has(type)) {
          pools.set(type, []);
        }
      },

      clearAllPools: () => {
        pools.clear();
      }
    };
  })(),

  // Animation frame management
  animationManager: (() => {
    const animations = new Set();
    let isRunning = false;
    let frameId = null;

    const animate = () => {
      animations.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.warn('Animation callback error:', error);
          animations.delete(callback);
        }
      });

      if (animations.size > 0) {
        frameId = requestAnimationFrame(animate);
      } else {
        isRunning = false;
      }
    };

    return {
      add: (callback) => {
        animations.add(callback);
        if (!isRunning) {
          isRunning = true;
          frameId = requestAnimationFrame(animate);
        }
      },

      remove: (callback) => {
        animations.delete(callback);
        if (animations.size === 0 && frameId) {
          cancelAnimationFrame(frameId);
          isRunning = false;
        }
      },

      clear: () => {
        animations.clear();
        if (frameId) {
          cancelAnimationFrame(frameId);
          isRunning = false;
        }
      },

      count: () => animations.size
    };
  })(),

  // Canvas optimization utilities
  canvasOptimizer: {
    // Pre-render static elements to off-screen canvas
    createOffscreenCanvas: (width, height, drawFunction) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      drawFunction(ctx, width, height);
      return canvas;
    },

    // Batch canvas operations
    batchCanvasOperations: (ctx, operations) => {
      ctx.save();
      operations.forEach(op => op(ctx));
      ctx.restore();
    },

    // Optimize for high DPI displays
    setupHighDPI: (canvas, ctx, width, height) => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(devicePixelRatio, devicePixelRatio);
      return devicePixelRatio;
    }
  }
};

// Performance provider component
export const QuantumPerformanceProvider = ({ children }) => {
  const capabilities = useDeviceCapabilities();
  const performanceMetrics = useQuantumPerformance();
  const [performanceLevel, setPerformanceLevel] = useState('high');

  useEffect(() => {
    const optimalSettings = QuantumPerformanceOptimizer.getOptimalSettings(
      capabilities, 
      performanceMetrics
    );

    // Determine overall performance level
    if (performanceMetrics.fps < 20 || capabilities.hardwareConcurrency < 2) {
      setPerformanceLevel('low');
    } else if (performanceMetrics.fps < 45 || capabilities.deviceMemory < 4) {
      setPerformanceLevel('medium');
    } else {
      setPerformanceLevel('high');
    }
  }, [capabilities, performanceMetrics]);

  const contextValue = {
    performanceLevel,
    reducedMotion: capabilities.reducedMotion,
    batteryLevel: capabilities.battery?.level || 1,
    connectionSpeed: capabilities.connection?.effectiveType || 'unknown',
    deviceCapabilities: capabilities,
    performanceMetrics,
    optimalSettings: QuantumPerformanceOptimizer.getOptimalSettings(
      capabilities, 
      performanceMetrics
    )
  };

  return (
    <QuantumPerformanceContext.Provider value={contextValue}>
      {children}
    </QuantumPerformanceContext.Provider>
  );
};

// Hook to use performance context
export const useQuantumPerformanceContext = () => {
  const context = useContext(QuantumPerformanceContext);
  if (!context) {
    throw new Error('useQuantumPerformanceContext must be used within QuantumPerformanceProvider');
  }
  return context;
};

// High-order component for performance optimization
export const withQuantumPerformance = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const performance = useQuantumPerformanceContext();
    
    return (
      <WrappedComponent
        ref={ref}
        {...props}
        quantumPerformance={performance}
      />
    );
  });
};

export default QuantumPerformanceOptimizer;