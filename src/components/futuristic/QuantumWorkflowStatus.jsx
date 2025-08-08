import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HolographicCard, FuturisticThemes } from './index';
import {
  CheckCircleIcon,
  ClockIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  EyeIcon,
  CogIcon,
  ShieldCheckIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const QuantumWorkflowStatus = ({
  workflow = [],
  currentPhase = 0,
  title = 'Project Workflow',
  showDetails = true,
  animated = true,
  compactView = false,
  onPhaseClick = null,
  quantumEffects = true,
  className = ''
}) => {
  const [hoveredPhase, setHoveredPhase] = useState(null);
  const [energyFlow, setEnergyFlow] = useState([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Define workflow phases with quantum properties
  const quantumPhases = workflow.length > 0 ? workflow.map((phase, index) => ({
    ...phase,
    id: phase.id || index,
    quantumState: index < currentPhase ? 'completed' : index === currentPhase ? 'active' : 'pending',
    energyLevel: index <= currentPhase ? 1 : 0.3,
    resonance: index === currentPhase ? 'high' : index < currentPhase ? 'stable' : 'low'
  })) : [
    {
      id: 0,
      name: 'Lead Phase',
      description: 'Initial project setup and planning',
      status: 'completed',
      progress: 100,
      quantumState: 'completed',
      energyLevel: 1,
      resonance: 'stable',
      color: 'orange'
    },
    {
      id: 1,
      name: 'Approved Phase',
      description: 'Project approval and resource allocation',
      status: 'active',
      progress: 65,
      quantumState: 'active',
      energyLevel: 1,
      resonance: 'high',
      color: 'cyan'
    },
    {
      id: 2,
      name: 'Execution Phase',
      description: 'Active project work and implementation',
      status: 'pending',
      progress: 0,
      quantumState: 'pending',
      energyLevel: 0.3,
      resonance: 'low',
      color: 'purple'
    },
    {
      id: 3,
      name: 'Completion Phase',
      description: 'Final delivery and project closure',
      status: 'pending',
      progress: 0,
      quantumState: 'pending',
      energyLevel: 0.3,
      resonance: 'low',
      color: 'green'
    }
  ];

  // Initialize energy flow animation
  useEffect(() => {
    if (!quantumEffects) return;

    const flows = [];
    quantumPhases.forEach((phase, index) => {
      if (phase.quantumState === 'completed' || phase.quantumState === 'active') {
        flows.push({
          id: `flow-${index}`,
          fromPhase: index,
          toPhase: index + 1,
          intensity: phase.energyLevel,
          speed: phase.resonance === 'high' ? 2 : 1,
          particles: []
        });
      }
    });

    setEnergyFlow(flows);
  }, [workflow, currentPhase, quantumEffects]);

  // Quantum energy visualization
  useEffect(() => {
    if (!quantumEffects || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particles = [];

    const initParticles = () => {
      energyFlow.forEach(flow => {
        const particleCount = Math.floor(flow.intensity * 5);
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            flowId: flow.id,
            x: (flow.fromPhase / quantumPhases.length) * canvas.width,
            y: canvas.height / 2,
            vx: flow.speed,
            vy: 0,
            life: 1,
            maxLife: 1,
            size: Math.random() * 2 + 1,
            color: getPhaseColor(flow.fromPhase).primary
          });
        }
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        // Update particle position
        particle.x += particle.vx;
        particle.life -= 0.01;

        // Reset particle when it reaches end or dies
        if (particle.x > canvas.width || particle.life <= 0) {
          const flow = energyFlow.find(f => f.id === particle.flowId);
          if (flow) {
            particle.x = (flow.fromPhase / quantumPhases.length) * canvas.width;
            particle.life = particle.maxLife;
          }
        }

        // Draw particle
        const alpha = particle.life * 0.8;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[^,]+(?=\))/, alpha.toString());
        ctx.fill();

        // Add quantum glow
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10 * alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[^,]+(?=\))/, (alpha * 0.5).toString());
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.offsetWidth;
      canvas.height = 60;
      initParticles();
    };

    resizeCanvas();
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [energyFlow, quantumPhases]);

  const getPhaseColor = (phaseIndex) => {
    const phase = quantumPhases[phaseIndex];
    if (phase?.color) {
      return FuturisticThemes[phase.color] || FuturisticThemes.cyan;
    }
    
    const colors = ['orange', 'cyan', 'purple', 'green', 'magenta'];
    return FuturisticThemes[colors[phaseIndex % colors.length]];
  };

  const getPhaseIcon = (phase) => {
    switch (phase.quantumState) {
      case 'completed':
        return CheckCircleIcon;
      case 'active':
        return phase.resonance === 'high' ? BoltIcon : PlayCircleIcon;
      case 'pending':
        return ClockIcon;
      case 'paused':
        return PauseCircleIcon;
      case 'error':
        return ExclamationTriangleIcon;
      default:
        return ClockIcon;
    }
  };

  const getQuantumGlow = (phase, index) => {
    const theme = getPhaseColor(index);
    const intensity = phase.energyLevel;
    
    return {
      boxShadow: phase.quantumState === 'active' 
        ? `0 0 ${20 * intensity}px ${theme.glow}, 0 0 ${40 * intensity}px ${theme.glow.replace('0.3', '0.1')}`
        : `0 0 10px ${theme.glow.replace('0.3', '0.1')}`,
      borderColor: theme.primary
    };
  };

  if (compactView) {
    return (
      <div className={`quantum-workflow-compact ${className}`}>
        <HolographicCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <div className="text-xs text-gray-400">
              {currentPhase + 1} / {quantumPhases.length}
            </div>
          </div>
          
          <div className="flex gap-2">
            {quantumPhases.map((phase, index) => {
              const IconComponent = getPhaseIcon(phase);
              const theme = getPhaseColor(index);
              
              return (
                <motion.div
                  key={phase.id}
                  className={`flex-1 h-2 rounded-full relative overflow-hidden ${
                    phase.quantumState === 'active' ? 'animate-pulse' : ''
                  }`}
                  style={{
                    backgroundColor: phase.quantumState === 'completed' ? theme.primary :
                                   phase.quantumState === 'active' ? theme.secondary :
                                   'rgba(255, 255, 255, 0.1)'
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  {phase.quantumState === 'active' && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                      animate={{
                        width: [`${phase.progress || 0}%`, `${(phase.progress || 0) + 5}%`, `${phase.progress || 0}%`]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </HolographicCard>
      </div>
    );
  }

  return (
    <div className={`quantum-workflow-status ${className}`}>
      <HolographicCard
        glowColor={getPhaseColor(currentPhase).color}
        elevation="medium"
        className="p-6 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <StarIcon className="w-4 h-4" />
            Phase {currentPhase + 1} of {quantumPhases.length}
          </div>
        </div>

        {/* Quantum energy flow visualization */}
        {quantumEffects && (
          <div className="relative mb-6 h-15 overflow-hidden rounded-lg bg-black/20">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ mixBlendMode: 'screen' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent pointer-events-none" />
          </div>
        )}

        {/* Phase timeline */}
        <div className="space-y-4">
          {quantumPhases.map((phase, index) => {
            const IconComponent = getPhaseIcon(phase);
            const theme = getPhaseColor(index);
            const isHovered = hoveredPhase === index;

            return (
              <motion.div
                key={phase.id}
                className={`relative ${onPhaseClick ? 'cursor-pointer' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: animated ? index * 0.1 : 0 }}
                onHoverStart={() => setHoveredPhase(index)}
                onHoverEnd={() => setHoveredPhase(null)}
                onClick={() => onPhaseClick && onPhaseClick(phase, index)}
              >
                <div className="flex items-center gap-4">
                  {/* Phase icon with quantum effects */}
                  <motion.div
                    className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all"
                    style={getQuantumGlow(phase, index)}
                    animate={phase.quantumState === 'active' ? {
                      scale: [1, 1.05, 1],
                    } : {}}
                    transition={{
                      duration: 2,
                      repeat: phase.quantumState === 'active' ? Infinity : 0,
                      ease: 'easeInOut'
                    }}
                  >
                    <IconComponent 
                      className={`w-6 h-6 ${
                        phase.quantumState === 'completed' ? 'text-green-400' :
                        phase.quantumState === 'active' ? `text-${theme.color}-400` :
                        'text-gray-500'
                      }`}
                    />
                    
                    {/* Quantum resonance rings */}
                    {phase.resonance === 'high' && quantumEffects && (
                      <>
                        <motion.div
                          className="absolute inset-0 border-2 rounded-full"
                          style={{ borderColor: theme.glow }}
                          animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.div
                          className="absolute inset-0 border-2 rounded-full"
                          style={{ borderColor: theme.glow }}
                          animate={{ scale: [1, 1.3], opacity: [0.4, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        />
                      </>
                    )}
                  </motion.div>

                  {/* Phase content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white truncate">
                        {phase.name}
                      </h4>
                      
                      {/* Phase status badge */}
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        phase.quantumState === 'completed' ? 'bg-green-500/20 text-green-400' :
                        phase.quantumState === 'active' ? `bg-${theme.color}-500/20 text-${theme.color}-400` :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {phase.status || phase.quantumState}
                      </div>
                    </div>

                    {showDetails && (
                      <p className="text-sm text-gray-300 mb-3">
                        {phase.description || 'Phase in progress...'}
                      </p>
                    )}

                    {/* Progress bar with quantum effects */}
                    <div className="relative">
                      <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className={`h-2 rounded-full bg-gradient-to-r transition-all ${
                            phase.quantumState === 'completed' ? 'from-green-400 to-green-600' :
                            phase.quantumState === 'active' ? `from-${theme.color}-400 to-${theme.color}-600` :
                            'from-gray-500 to-gray-600'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${phase.progress || 0}%` }}
                          transition={{ duration: animated ? 1.5 : 0, ease: 'easeOut' }}
                          style={phase.quantumState === 'active' ? {
                            boxShadow: `0 0 10px ${theme.glow}`
                          } : {}}
                        />
                        
                        {/* Quantum scanning effect */}
                        {phase.quantumState === 'active' && quantumEffects && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-8 h-full"
                            animate={{ x: [-32, 300] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                      </div>
                      
                      <div className="absolute -top-6 right-0 text-xs text-gray-400">
                        {phase.progress || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Additional actions */}
                  {showDetails && isHovered && (
                    <motion.div
                      className="flex gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <button className={`p-2 rounded-lg bg-${theme.color}-500/20 text-${theme.color}-400 hover:bg-${theme.color}-500/30 transition-colors`}>
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className={`p-2 rounded-lg bg-${theme.color}-500/20 text-${theme.color}-400 hover:bg-${theme.color}-500/30 transition-colors`}>
                        <CogIcon className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Connection line to next phase */}
                {index < quantumPhases.length - 1 && (
                  <div className="ml-6 mt-2 mb-2">
                    <div className={`w-0.5 h-6 ${
                      phase.quantumState === 'completed' ? 'bg-green-400' :
                      phase.quantumState === 'active' ? `bg-${theme.color}-400` :
                      'bg-gray-600'
                    }`} style={phase.quantumState === 'active' ? {
                      boxShadow: `0 0 6px ${theme.glow}`
                    } : {}} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Quantum field overlay */}
        {quantumEffects && (
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              background: `radial-gradient(circle at center, ${getPhaseColor(currentPhase).primary} 0%, transparent 70%)`,
              mixBlendMode: 'screen',
            }}
            animate={{
              scale: [1, 1.02, 1],
              opacity: [0.05, 0.1, 0.05],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </HolographicCard>
    </div>
  );
};

export default QuantumWorkflowStatus;