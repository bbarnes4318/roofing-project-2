import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const HolographicCard = ({ 
  children, 
  className = '', 
  glowColor = 'cyan',
  intensity = 0.7,
  animated = true,
  onClick,
  elevation = 'medium',
  borderStyle = 'solid',
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Color variations for different glow effects
  const glowColors = {
    cyan: 'rgba(0, 245, 255, 0.4)',
    magenta: 'rgba(255, 0, 128, 0.4)',
    green: 'rgba(57, 255, 20, 0.4)',
    purple: 'rgba(124, 58, 237, 0.4)',
    blue: 'rgba(59, 130, 246, 0.4)',
    orange: 'rgba(249, 115, 22, 0.4)',
  };

  // Elevation styles
  const elevations = {
    low: 'shadow-lg',
    medium: 'shadow-xl',
    high: 'shadow-2xl',
    floating: 'shadow-2xl transform translate-y-[-2px]',
  };

  // Border styles
  const borderStyles = {
    solid: 'border-2',
    dashed: 'border-2 border-dashed',
    dotted: 'border-2 border-dotted',
    glow: 'border border-opacity-60',
    none: '',
  };

  const handleMouseMove = (e) => {
    if (!animated) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    setMousePosition({
      x: (e.clientX - centerX) / (rect.width / 2),
      y: (e.clientY - centerY) / (rect.height / 2),
    });
  };

  // Dynamic styles based on props
  const cardStyle = {
    background: isHovered
      ? `linear-gradient(135deg, 
          rgba(255, 255, 255, 0.1) 0%, 
          rgba(255, 255, 255, 0.05) 50%, 
          rgba(0, 0, 0, 0.05) 100%)`
      : `linear-gradient(135deg, 
          rgba(255, 255, 255, 0.05) 0%, 
          rgba(255, 255, 255, 0.02) 50%, 
          rgba(0, 0, 0, 0.02) 100%)`,
    backdropFilter: 'blur(16px) saturate(180%)',
    border: borderStyle !== 'none' ? `2px solid ${glowColors[glowColor]}` : 'none',
    borderColor: isHovered ? glowColors[glowColor] : `${glowColors[glowColor]}80`,
    boxShadow: isHovered
      ? `0 8px 32px ${glowColors[glowColor]}, 
         0 0 40px ${glowColors[glowColor]}, 
         inset 0 0 20px rgba(255, 255, 255, 0.1)`
      : `0 4px 16px ${glowColors[glowColor]}, 
         0 0 20px ${glowColors[glowColor]}40`,
    transform: animated && isHovered
      ? `perspective(1000px) rotateX(${mousePosition.y * -10}deg) rotateY(${mousePosition.x * 10}deg) translateZ(20px)`
      : 'none',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  // Animation variants for framer-motion
  const cardVariants = {
    initial: {
      opacity: 0,
      scale: 0.9,
      rotateX: -15,
      y: 20,
    },
    animate: {
      opacity: 1,
      scale: 1,
      rotateX: 0,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
      },
    },
  };

  const content = (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl p-6
        ${elevations[elevation]}
        ${borderStyles[borderStyle]}
        ${className}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      style={cardStyle}
      variants={animated ? cardVariants : {}}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap={onClick ? "tap" : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      {...props}
    >
      {/* Holographic overlay effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(circle at ${50 + mousePosition.x * 20}% ${50 + mousePosition.y * 20}%, 
            ${glowColors[glowColor]}, 
            transparent 70%)`,
          mixBlendMode: 'screen',
          transition: 'all 0.3s ease-out',
        }}
      />

      {/* Scanning line effect (optional animated overlay) */}
      {animated && isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '100%', opacity: [0, 1, 0] }}
          transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
          style={{
            background: `linear-gradient(90deg, 
              transparent, 
              ${glowColors[glowColor]}, 
              transparent)`,
            width: '2px',
          }}
        />
      )}

      {/* Corner accent elements */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-current opacity-40" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-current opacity-40" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-current opacity-40" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-current opacity-40" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Neural connection points (decorative) */}
      <div className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-current opacity-20 transform -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-0 w-2 h-2 rounded-full bg-current opacity-20 transform -translate-y-1/2 translate-x-1/2" />
    </motion.div>
  );

  return content;
};

// Specialized variants
export const HolographicProjectCard = ({ project, ...props }) => {
  return (
    <HolographicCard 
      glowColor="cyan" 
      elevation="medium"
      className="min-h-[200px]"
      {...props}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {project.name || project.projectName}
          </h3>
          <div className="text-xs text-cyan-300 bg-cyan-500/20 px-2 py-1 rounded-full">
            {project.status}
          </div>
        </div>
        
        <div className="text-sm text-gray-300">
          {project.description || 'No description available'}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Progress: {project.progress || 0}%</span>
          <span>{project.phase || 'Unknown Phase'}</span>
        </div>

        {/* Progress bar with glow effect */}
        <div className="w-full bg-gray-700/50 rounded-full h-2">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600"
            initial={{ width: 0 }}
            animate={{ width: `${project.progress || 0}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              boxShadow: '0 0 10px rgba(0, 245, 255, 0.6)',
            }}
          />
        </div>
      </div>
    </HolographicCard>
  );
};

export const HolographicButton = ({ 
  children, 
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  ...props 
}) => {
  const variants = {
    primary: 'cyan',
    secondary: 'purple',
    success: 'green',
    warning: 'orange',
    danger: 'magenta',
  };

  const sizes = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  return (
    <HolographicCard
      glowColor={variants[variant]}
      elevation="low"
      className={`
        ${sizes[size]} 
        text-center font-semibold text-white
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        ${loading ? 'animate-pulse' : ''}
      `}
      animated={!disabled && !loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </div>
      ) : (
        children
      )}
    </HolographicCard>
  );
};

export default HolographicCard;