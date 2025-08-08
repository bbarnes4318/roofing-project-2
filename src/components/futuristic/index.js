// Futuristic UI Component Library
// Export all quantum-inspired, holographic, and neural network components

export { default as HolographicCard, HolographicProjectCard, HolographicButton } from './HolographicCard';
export { default as NeuralBackground, PresetNeuralBackgrounds } from './NeuralBackground';
export { default as QuantumButton } from './QuantumButton';
export { default as ParticleField, ParticlePresets } from './ParticleField';

// Phase 4: Quantum Dashboard Components
export { default as QuantumProjectCard } from './QuantumProjectCard';
export { default as HolographicChart } from './HolographicChart';
export { default as QuantumWorkflowStatus } from './QuantumWorkflowStatus';
export { default as NeuralActivityFeed } from './NeuralActivityFeed';

// Component configurations and presets
export const FuturisticThemes = {
  // Cyan theme - primary brand color
  cyan: {
    primary: 'rgba(0, 245, 255, 0.8)',
    secondary: 'rgba(0, 245, 255, 0.4)',
    accent: 'rgba(0, 245, 255, 0.6)',
    glow: 'rgba(0, 245, 255, 0.3)',
    name: 'Quantum Cyan'
  },
  
  // Magenta theme - alerts and warnings
  magenta: {
    primary: 'rgba(255, 0, 128, 0.8)',
    secondary: 'rgba(255, 0, 128, 0.4)',
    accent: 'rgba(255, 0, 128, 0.6)',
    glow: 'rgba(255, 0, 128, 0.3)',
    name: 'Neural Magenta'
  },
  
  // Green theme - success states
  green: {
    primary: 'rgba(57, 255, 20, 0.8)',
    secondary: 'rgba(57, 255, 20, 0.4)',
    accent: 'rgba(57, 255, 20, 0.6)',
    glow: 'rgba(57, 255, 20, 0.3)',
    name: 'Bio Green'
  },
  
  // Purple theme - premium features
  purple: {
    primary: 'rgba(124, 58, 237, 0.8)',
    secondary: 'rgba(124, 58, 237, 0.4)',
    accent: 'rgba(124, 58, 237, 0.6)',
    glow: 'rgba(124, 58, 237, 0.3)',
    name: 'Quantum Purple'
  },
  
  // Orange theme - warnings and energy
  orange: {
    primary: 'rgba(249, 115, 22, 0.8)',
    secondary: 'rgba(249, 115, 22, 0.4)',
    accent: 'rgba(249, 115, 22, 0.6)',
    glow: 'rgba(249, 115, 22, 0.3)',
    name: 'Energy Orange'
  }
};

// Common animation configurations
export const AnimationPresets = {
  // Quick interactions
  fast: {
    duration: 0.2,
    ease: 'easeOut'
  },
  
  // Standard interactions
  medium: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1]
  },
  
  // Smooth, premium feel
  slow: {
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1]
  },
  
  // Organic, breathing motion
  organic: {
    duration: 2,
    ease: 'easeInOut',
    repeat: Infinity,
    repeatType: 'reverse'
  },
  
  // Quantum uncertainty
  quantum: {
    duration: 0.1,
    ease: 'linear',
    repeat: Infinity,
    repeatDelay: Math.random() * 2
  }
};

// Component size standards
export const ComponentSizes = {
  xs: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    rounded: 'rounded-md'
  },
  sm: {
    padding: 'px-3 py-2',
    text: 'text-sm',
    rounded: 'rounded-lg'
  },
  md: {
    padding: 'px-4 py-3',
    text: 'text-base',
    rounded: 'rounded-xl'
  },
  lg: {
    padding: 'px-6 py-4',
    text: 'text-lg',
    rounded: 'rounded-xl'
  },
  xl: {
    padding: 'px-8 py-5',
    text: 'text-xl',
    rounded: 'rounded-2xl'
  }
};

// Utility functions for futuristic effects
export const FuturisticUtils = {
  // Generate holographic gradient
  holographicGradient: (color1, color2, angle = 135) => 
    `linear-gradient(${angle}deg, ${color1}, ${color2})`,
  
  // Generate quantum glow shadow
  quantumGlow: (color, intensity = 1) => 
    `0 0 ${20 * intensity}px ${color}, 0 0 ${40 * intensity}px ${color.replace(/[^,]+(?=\))/, (parseFloat(color.match(/[^,]+(?=\))/)[0]) * 0.5).toString())}`,
  
  // Generate neural connection path
  neuralPath: (from, to, curvature = 0.3) => {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2 + curvature * Math.abs(to.x - from.x);
    return `M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`;
  },
  
  // Generate particle burst coordinates
  particleBurst: (centerX, centerY, count = 10, radius = 50) => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count;
      return {
        x: centerX + Math.cos(angle) * radius * Math.random(),
        y: centerY + Math.sin(angle) * radius * Math.random(),
        vx: Math.cos(angle) * (Math.random() * 5 + 2),
        vy: Math.sin(angle) * (Math.random() * 5 + 2)
      };
    });
  },
  
  // Calculate quantum uncertainty position
  quantumUncertainty: (basePosition, uncertainty = 1) => ({
    x: basePosition.x + (Math.random() - 0.5) * uncertainty,
    y: basePosition.y + (Math.random() - 0.5) * uncertainty
  }),
  
  // Generate synaptic firing pattern
  synapticPattern: (frequency = 0.001) => 
    Math.random() < frequency,
  
  // Create holographic texture coordinates
  holographicTexture: (x, y, time = 0) => ({
    u: (x + Math.sin(time * 0.001 + y * 0.01)) % 1,
    v: (y + Math.cos(time * 0.0015 + x * 0.01)) % 1
  })
};

// Accessibility helpers
export const A11yHelpers = {
  // Reduce motion for users who prefer it
  respectsReducedMotion: () => 
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  
  // High contrast mode detection
  isHighContrast: () =>
    window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches,
  
  // Get accessible color contrast
  getAccessibleColor: (color, background = '#000000') => {
    // Simplified - in production use a proper contrast calculation
    return color; // Placeholder
  },
  
  // Screen reader friendly descriptions
  getAriaDescription: (componentType, state = {}) => {
    const descriptions = {
      holographicCard: `Interactive holographic card${state.glowColor ? ` with ${state.glowColor} glow effect` : ''}`,
      quantumButton: `Quantum-style button${state.variant ? ` in ${state.variant} variant` : ''}${state.disabled ? ', currently disabled' : ''}`,
      neuralBackground: `Animated neural network background with ${state.nodeCount || 'multiple'} connection nodes`,
      particleField: `Dynamic particle field animation in ${state.variant || 'default'} mode`
    };
    return descriptions[componentType] || 'Interactive futuristic component';
  }
};

// Performance optimization helpers
export const PerformanceHelpers = {
  // Debounce function for animations
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
  
  // Throttle function for mouse interactions
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
  
  // Check if device can handle complex animations
  canHandleComplexAnimations: () => {
    // Simple heuristic based on user agent and hardware
    const hasGoodGPU = navigator.hardwareConcurrency > 4;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return hasGoodGPU && !isMobile;
  },
  
  // Get optimal particle count based on device performance
  getOptimalParticleCount: (baseCount = 50) => {
    if (PerformanceHelpers.canHandleComplexAnimations()) {
      return baseCount;
    } else if (navigator.hardwareConcurrency > 2) {
      return Math.floor(baseCount * 0.6);
    } else {
      return Math.floor(baseCount * 0.3);
    }
  }
};

// Component usage examples and documentation
export const ComponentExamples = {
  holographicCard: `
    // Basic usage
    <HolographicCard glowColor="cyan">
      <h3>Project Status</h3>
      <p>In Progress</p>
    </HolographicCard>
    
    // With project data
    <HolographicProjectCard 
      project={{ name: "Roof Repair", status: "Active", progress: 75 }}
      onClick={() => navigate('/project/123')}
    />
  `,
  
  quantumButton: `
    // Primary action button
    <QuantumButton 
      variant="primary" 
      size="large"
      onClick={handleSubmit}
    >
      Launch Project
    </QuantumButton>
    
    // With custom particle effects
    <QuantumButton 
      variant="success"
      particleCount={25}
      quantumEffect={true}
    >
      Complete Task
    </QuantumButton>
  `,
  
  neuralBackground: `
    // Animated background
    <div className="relative min-h-screen">
      <NeuralBackground 
        nodeCount={30}
        interactive={true}
        synapticFiring={true}
      />
      <div className="relative z-10">
        {/* Your content here */}
      </div>
    </div>
  `,
  
  particleField: `
    // Energy field background
    <div className="relative">
      <ParticleField 
        {...ParticlePresets.energy}
        className="opacity-60"
      />
      <YourComponent />
    </div>
  `
};

export default {
  FuturisticThemes,
  AnimationPresets,
  ComponentSizes,
  FuturisticUtils,
  A11yHelpers,
  PerformanceHelpers,
  ComponentExamples
};