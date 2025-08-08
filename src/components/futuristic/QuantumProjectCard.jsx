import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HolographicCard, FuturisticThemes } from './index';
import {
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BoltIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

const QuantumProjectCard = ({
  project,
  onSelect,
  className = '',
  size = 'standard',
  showMetrics = true,
  showAlerts = true,
  animationDelay = 0,
  quantumEffects = true,
  dataVisualization = true
}) => {
  // Component state
  const [isHovered, setIsHovered] = useState(false);
  const [metricsData, setMetricsData] = useState(null);
  const [networkActivity, setNetworkActivity] = useState(0);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Get project phase color and status
  const getPhaseInfo = () => {
    const phase = project.currentPhase?.toLowerCase() || 'lead';
    const phaseConfigs = {
      lead: { color: 'orange', label: 'Lead Phase', theme: FuturisticThemes.orange },
      approved: { color: 'cyan', label: 'Approved', theme: FuturisticThemes.cyan },
      execution: { color: 'purple', label: 'In Progress', theme: FuturisticThemes.purple },
      completion: { color: 'green', label: 'Completion', theme: FuturisticThemes.green },
      closed: { color: 'green', label: 'Complete', theme: FuturisticThemes.green }
    };
    return phaseConfigs[phase] || phaseConfigs.lead;
  };

  // Calculate project health score
  const calculateHealthScore = () => {
    let score = 100;
    const now = new Date();
    const created = new Date(project.createdAt || project.dateCreated || now);
    const daysActive = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    // Timeline factors
    if (project.timeline?.isDelayed) score -= 20;
    if (daysActive > 90 && project.currentPhase === 'lead') score -= 15;

    // Budget factors
    if (project.budget?.overBudget) score -= 25;
    if (project.budget?.utilization > 0.9) score -= 10;

    // Alert factors
    const alertCount = project.alerts?.length || 0;
    score -= Math.min(alertCount * 5, 30);

    // Progress factors
    const progress = project.progress || 0;
    if (progress > 0) score += Math.min(progress * 0.2, 20);

    return Math.max(0, Math.min(100, score));
  };

  // Initialize metrics data
  useEffect(() => {
    const healthScore = calculateHealthScore();
    const phaseInfo = getPhaseInfo();
    
    setMetricsData({
      healthScore,
      progress: project.progress || 0,
      timeline: project.timeline || { onTrack: true, daysRemaining: 30 },
      budget: project.budget || { spent: 0, total: 100000, utilization: 0.65 },
      alerts: project.alerts || [],
      teamSize: project.teamMembers?.length || 4,
      phase: phaseInfo
    });

    // Simulate network activity based on project activity
    const baseActivity = healthScore / 100;
    setNetworkActivity(baseActivity + Math.random() * 0.3);
  }, [project]);

  // Quantum data visualization animation
  useEffect(() => {
    if (!quantumEffects || !dataVisualization || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor(metricsData?.healthScore / 10) || 5;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 2 + 1,
          color: metricsData?.phase.theme.primary || FuturisticThemes.cyan.primary
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Bounce off edges
        if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1;
        
        // Keep in bounds
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        
        // Update life
        particle.life -= 0.002;
        if (particle.life <= 0) {
          particle.life = particle.maxLife;
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
        }
        
        // Draw particle
        const alpha = particle.life * (isHovered ? 1.5 : 0.7);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[^,]+(?=\))/, alpha.toString());
        ctx.fill();
        
        // Connect nearby particles
        particles.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const distance = Math.sqrt(
              Math.pow(particle.x - otherParticle.x, 2) + 
              Math.pow(particle.y - otherParticle.y, 2)
            );
            
            if (distance < 50) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = particle.color.replace(/[^,]+(?=\))/, (alpha * 0.3).toString());
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    if (metricsData) {
      const resizeCanvas = () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        initParticles();
      };

      resizeCanvas();
      animate();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [metricsData, isHovered, quantumEffects, dataVisualization]);

  // Size configurations
  const sizeConfig = {
    compact: 'p-4 min-h-[200px]',
    standard: 'p-6 min-h-[280px]',
    expanded: 'p-8 min-h-[360px]'
  };

  if (!metricsData) return null;

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ 
        duration: 0.6, 
        delay: animationDelay,
        ease: [0.4, 0, 0.2, 1] 
      }}
      whileHover={{ scale: 1.02, rotateX: 5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <HolographicCard
        glowColor={metricsData.phase.color}
        elevation="medium"
        className={`${sizeConfig[size]} cursor-pointer overflow-hidden`}
        onClick={() => onSelect && onSelect(project)}
        animated={true}
      >
        {/* Quantum data visualization background */}
        {quantumEffects && dataVisualization && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{ mixBlendMode: 'screen' }}
          />
        )}

        {/* Project header */}
        <div className="relative z-10 mb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">
                {project.name || project.projectName}
              </h3>
              <p className="text-sm text-gray-300 truncate">
                {project.client?.name || project.customerName || 'Client Name'}
              </p>
            </div>
            
            {/* Health score indicator */}
            <div className="ml-3 text-center">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-700"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${metricsData.healthScore * 0.94} 100`}
                    className={`${
                      metricsData.healthScore >= 80 ? 'text-green-400' :
                      metricsData.healthScore >= 60 ? 'text-cyan-400' :
                      metricsData.healthScore >= 40 ? 'text-orange-400' :
                      'text-red-400'
                    }`}
                    style={{
                      filter: `drop-shadow(0 0 6px currentColor)`
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {Math.round(metricsData.healthScore)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">Health</div>
            </div>
          </div>

          {/* Phase indicator */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`px-3 py-1 rounded-full text-xs font-medium bg-${metricsData.phase.color}-500/20 text-${metricsData.phase.color}-300`}>
              {metricsData.phase.label}
            </div>
            
            {showAlerts && metricsData.alerts.length > 0 && (
              <div className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                {metricsData.alerts.length}
              </div>
            )}
            
            {/* Network activity indicator */}
            {quantumEffects && (
              <div className="flex items-center gap-1">
                <SignalIcon className={`w-4 h-4 ${
                  networkActivity > 0.7 ? 'text-green-400' :
                  networkActivity > 0.4 ? 'text-cyan-400' :
                  'text-orange-400'
                }`} />
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-0.5 h-2 rounded-full transition-all ${
                        networkActivity * 3 >= i ? 'bg-cyan-400' : 'bg-gray-600'
                      }`}
                      style={{
                        animation: networkActivity * 3 >= i ? 'pulse 2s infinite' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-2 rounded-full bg-gradient-to-r from-${metricsData.phase.color}-400 to-${metricsData.phase.color}-600`}
                initial={{ width: 0 }}
                animate={{ width: `${metricsData.progress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{
                  boxShadow: `0 0 8px ${metricsData.phase.theme.glow}`
                }}
              />
            </div>
            <div className="absolute -top-6 right-0 text-xs text-gray-400">
              {metricsData.progress}% Complete
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        {showMetrics && (
          <div className="relative z-10 grid grid-cols-2 gap-4">
            {/* Budget status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <CurrencyDollarIcon className="w-3 h-3" />
                Budget
              </div>
              <div className="text-sm text-white">
                ${(metricsData.budget.spent || 0).toLocaleString()} / 
                ${(metricsData.budget.total || 0).toLocaleString()}
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${
                    metricsData.budget.utilization > 0.9 ? 'bg-red-400' :
                    metricsData.budget.utilization > 0.7 ? 'bg-orange-400' :
                    'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(metricsData.budget.utilization * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Timeline status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ClockIcon className="w-3 h-3" />
                Timeline
              </div>
              <div className="text-sm text-white">
                {metricsData.timeline.daysRemaining || 0} days left
              </div>
              <div className={`text-xs ${
                metricsData.timeline.isDelayed ? 'text-red-400' :
                metricsData.timeline.daysRemaining < 14 ? 'text-orange-400' :
                'text-green-400'
              }`}>
                {metricsData.timeline.isDelayed ? 'Behind Schedule' :
                 metricsData.timeline.daysRemaining < 14 ? 'Due Soon' :
                 'On Track'}
              </div>
            </div>

            {/* Team size */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <UserGroupIcon className="w-3 h-3" />
                Team
              </div>
              <div className="text-sm text-white">
                {metricsData.teamSize} members
              </div>
            </div>

            {/* Location or status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {project.location ? (
                  <>
                    <MapPinIcon className="w-3 h-3" />
                    Location
                  </>
                ) : (
                  <>
                    <ChartBarIcon className="w-3 h-3" />
                    Status
                  </>
                )}
              </div>
              <div className="text-sm text-white truncate">
                {project.location || project.status || 'Active'}
              </div>
            </div>
          </div>
        )}

        {/* Hover overlay with additional actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex gap-2 w-full">
                <button className="flex-1 py-2 px-3 bg-cyan-500/20 text-cyan-300 rounded-md text-xs font-medium hover:bg-cyan-500/30 transition-colors">
                  View Details
                </button>
                {metricsData.alerts.length > 0 && (
                  <button className="py-2 px-3 bg-red-500/20 text-red-300 rounded-md text-xs font-medium hover:bg-red-500/30 transition-colors">
                    {metricsData.alerts.length} Alert{metricsData.alerts.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quantum energy pulse effect */}
        {quantumEffects && isHovered && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at center, ${metricsData.phase.theme.glow} 0%, transparent 70%)`,
              mixBlendMode: 'screen',
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </HolographicCard>
    </motion.div>
  );
};

export default QuantumProjectCard;