import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const QuantumButton = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  glowIntensity = 1,
  particleCount = 15,
  quantumEffect = true,
  className = '',
  ...props
}) => {
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Variant configurations
  const variants = {
    primary: {
      baseColor: 'rgba(0, 245, 255, 0.8)',
      glowColor: 'rgba(0, 245, 255, 0.4)',
      particleColor: 'rgba(0, 245, 255, 0.9)',
      borderColor: 'border-cyan-400',
      textColor: 'text-white',
    },
    secondary: {
      baseColor: 'rgba(124, 58, 237, 0.8)',
      glowColor: 'rgba(124, 58, 237, 0.4)',
      particleColor: 'rgba(124, 58, 237, 0.9)',
      borderColor: 'border-purple-400',
      textColor: 'text-white',
    },
    success: {
      baseColor: 'rgba(57, 255, 20, 0.8)',
      glowColor: 'rgba(57, 255, 20, 0.4)',
      particleColor: 'rgba(57, 255, 20, 0.9)',
      borderColor: 'border-green-400',
      textColor: 'text-white',
    },
    warning: {
      baseColor: 'rgba(249, 115, 22, 0.8)',
      glowColor: 'rgba(249, 115, 22, 0.4)',
      particleColor: 'rgba(249, 115, 22, 0.9)',
      borderColor: 'border-orange-400',
      textColor: 'text-white',
    },
    danger: {
      baseColor: 'rgba(255, 0, 128, 0.8)',
      glowColor: 'rgba(255, 0, 128, 0.4)',
      particleColor: 'rgba(255, 0, 128, 0.9)',
      borderColor: 'border-pink-400',
      textColor: 'text-white',
    }
  };

  // Size configurations
  const sizes = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const config = variants[variant];

  // Initialize particles
  const initializeParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: Math.random(),
        maxLife: Math.random() * 0.5 + 0.5,
        size: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
        frequency: Math.random() * 0.1 + 0.05,
      });
    }

    particlesRef.current = particles;
  };

  // Animate particles
  const animateParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particlesRef.current.forEach((particle, index) => {
      // Update position with quantum fluctuation
      if (quantumEffect) {
        particle.phase += particle.frequency;
        particle.x += particle.vx + Math.sin(particle.phase) * 0.5;
        particle.y += particle.vy + Math.cos(particle.phase * 0.7) * 0.5;
      } else {
        particle.x += particle.vx;
        particle.y += particle.vy;
      }

      // Boundary conditions with quantum tunneling effect
      if (particle.x < 0 || particle.x > canvas.width) {
        if (quantumEffect && Math.random() < 0.1) {
          // Quantum tunneling - particle appears on other side
          particle.x = particle.x < 0 ? canvas.width : 0;
        } else {
          particle.vx *= -1;
        }
      }

      if (particle.y < 0 || particle.y > canvas.height) {
        if (quantumEffect && Math.random() < 0.1) {
          particle.y = particle.y < 0 ? canvas.height : 0;
        } else {
          particle.vy *= -1;
        }
      }

      // Keep particles in bounds
      particle.x = Math.max(0, Math.min(canvas.width, particle.x));
      particle.y = Math.max(0, Math.min(canvas.height, particle.y));

      // Update life
      particle.life -= 0.005;
      if (particle.life <= 0) {
        // Respawn particle
        particle.life = particle.maxLife;
        particle.x = Math.random() * canvas.width;
        particle.y = Math.random() * canvas.height;
      }

      // Calculate alpha based on life and hover state
      let alpha = particle.life;
      if (isHovered) alpha *= 1.5;
      if (isPressed) alpha *= 2;
      alpha = Math.min(1, alpha * glowIntensity);

      // Draw particle with quantum glow
      if (alpha > 0.01) {
        const size = particle.size * (isPressed ? 1.5 : 1);
        
        // Create quantum glow gradient
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size * 3
        );
        
        gradient.addColorStop(0, config.particleColor.replace('0.9', alpha.toString()));
        gradient.addColorStop(1, config.particleColor.replace('0.9', '0'));

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Add quantum uncertainty blur
        if (quantumEffect) {
          ctx.shadowColor = config.particleColor;
          ctx.shadowBlur = 5 * alpha;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = config.particleColor.replace('0.9', (alpha * 0.3).toString());
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });

    // Draw quantum connections between nearby particles
    if (quantumEffect) {
      ctx.strokeStyle = config.baseColor.replace('0.8', '0.2');
      ctx.lineWidth = 1;

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];
          
          const distance = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
          );

          if (distance < 50) {
            const alpha = (50 - distance) / 50 * 0.3;
            ctx.globalAlpha = alpha * glowIntensity;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    animationRef.current = requestAnimationFrame(animateParticles);
  };

  // Handle click with particle burst effect
  const handleClick = (e) => {
    if (disabled || !onClick) return;

    // Create burst effect
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Add burst particles
      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          x: clickX,
          y: clickY,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1,
          maxLife: 1,
          size: Math.random() * 3 + 2,
          phase: Math.random() * Math.PI * 2,
          frequency: Math.random() * 0.2 + 0.1,
        });
      }
    }

    onClick(e);
  };

  // Setup canvas and animation
  useEffect(() => {
    setIsClient(true);
    
    const canvas = canvasRef.current;
    const button = buttonRef.current;
    if (!canvas || !button) return;

    const resizeCanvas = () => {
      const rect = button.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initializeParticles();
    };

    resizeCanvas();
    animateParticles();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(button);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [particleCount, quantumEffect]);

  // Dynamic button styles
  const buttonStyle = {
    background: isPressed
      ? `linear-gradient(135deg, ${config.baseColor}, ${config.glowColor})`
      : isHovered
      ? `linear-gradient(135deg, ${config.glowColor}, ${config.baseColor})`
      : `linear-gradient(135deg, ${config.baseColor.replace('0.8', '0.6')}, ${config.glowColor})`,
    boxShadow: isHovered
      ? `0 0 30px ${config.glowColor}, 0 0 60px ${config.glowColor.replace('0.4', '0.2')}, inset 0 0 20px ${config.glowColor.replace('0.4', '0.1')}`
      : `0 0 15px ${config.glowColor.replace('0.4', '0.3')}`,
    borderColor: config.baseColor,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  // Animation variants
  const buttonVariants = {
    initial: { scale: 1, rotateX: 0 },
    hover: { 
      scale: 1.05,
      rotateX: 5,
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.95,
      rotateX: -5,
      transition: { duration: 0.1 }
    }
  };

  if (!isClient) {
    // Server-side render without canvas
    return (
      <button
        className={`
          relative overflow-hidden rounded-xl font-semibold
          ${sizes[size]}
          ${config.borderColor}
          ${config.textColor}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      ref={buttonRef}
      className={`
        relative overflow-hidden rounded-xl font-semibold border-2
        ${sizes[size]}
        ${config.borderColor}
        ${config.textColor}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={buttonStyle}
      variants={buttonVariants}
      initial="initial"
      whileHover={!disabled ? "hover" : undefined}
      whileTap={!disabled ? "tap" : undefined}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => !disabled && setIsHovered(false)}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => !disabled && setIsPressed(false)}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {/* Quantum particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Scanning line effect */}
      {isHovered && !disabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
          style={{
            background: `linear-gradient(90deg, 
              transparent, 
              ${config.baseColor}, 
              transparent)`,
            width: '2px',
          }}
        />
      )}

      {/* Button content */}
      <span className="relative z-10">{children}</span>

      {/* Quantum field overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(circle at center, 
            ${config.glowColor} 0%, 
            transparent 70%)`,
          mixBlendMode: 'screen',
        }}
      />
    </motion.button>
  );
};

export default QuantumButton;