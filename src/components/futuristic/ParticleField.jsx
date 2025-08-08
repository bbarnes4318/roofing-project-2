import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ParticleField = ({
  particleCount = 100,
  particleColor = 'rgba(0, 245, 255, 0.6)',
  particleSize = 2,
  speed = 1,
  interactive = true,
  flowField = false,
  constellation = false,
  className = '',
  variant = 'floating'
}) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  // Particle system variants
  const variants = {
    floating: {
      behavior: 'float',
      connections: false,
      gravity: 0,
      turbulence: 0.02,
    },
    flowing: {
      behavior: 'flow',
      connections: false,
      gravity: 0.001,
      turbulence: 0.05,
    },
    constellation: {
      behavior: 'orbit',
      connections: true,
      gravity: 0,
      turbulence: 0.01,
    },
    energy: {
      behavior: 'energy',
      connections: true,
      gravity: -0.002,
      turbulence: 0.1,
    },
    quantum: {
      behavior: 'quantum',
      connections: false,
      gravity: 0,
      turbulence: 0.03,
    }
  };

  const config = variants[variant];

  // Initialize particle system
  const initializeParticles = (canvas) => {
    const { width, height } = canvas;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        originalX: 0,
        originalY: 0,
        life: Math.random(),
        maxLife: Math.random() * 0.8 + 0.2,
        size: Math.random() * particleSize + 1,
        phase: Math.random() * Math.PI * 2,
        frequency: Math.random() * 0.02 + 0.01,
        color: particleColor,
        mass: Math.random() * 0.5 + 0.5,
        charge: Math.random() > 0.5 ? 1 : -1,
        energy: Math.random(),
        connections: [],
      });
    }

    // Set original positions for constellation mode
    if (variant === 'constellation') {
      particles.forEach(particle => {
        particle.originalX = particle.x;
        particle.originalY = particle.y;
      });
    }

    particlesRef.current = particles;
  };

  // Update particle behavior
  const updateParticle = (particle, canvas, index, allParticles) => {
    const { width, height } = canvas;

    switch (config.behavior) {
      case 'float':
        // Simple floating motion with turbulence
        particle.phase += particle.frequency;
        particle.vx += (Math.random() - 0.5) * config.turbulence;
        particle.vy += (Math.random() - 0.5) * config.turbulence;
        break;

      case 'flow':
        // Flow field behavior
        const flowX = Math.sin(particle.x * 0.01 + particle.phase);
        const flowY = Math.cos(particle.y * 0.01 + particle.phase);
        particle.vx += flowX * config.turbulence;
        particle.vy += flowY * config.turbulence;
        break;

      case 'orbit':
        // Orbital motion around original position
        const dx = particle.originalX - particle.x;
        const dy = particle.originalY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          particle.vx += dx * 0.001;
          particle.vy += dy * 0.001;
        }
        
        // Add orbital motion
        particle.vx += -dy * 0.0001;
        particle.vy += dx * 0.0001;
        break;

      case 'energy':
        // Energy-based interactions between particles
        let forceX = 0;
        let forceY = 0;
        
        allParticles.forEach((other, otherIndex) => {
          if (index !== otherIndex) {
            const dx = other.x - particle.x;
            const dy = other.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < 100) {
              const force = (particle.charge * other.charge) / (distance * distance) * 0.1;
              forceX -= force * dx / distance;
              forceY -= force * dy / distance;
            }
          }
        });
        
        particle.vx += forceX;
        particle.vy += forceY;
        break;

      case 'quantum':
        // Quantum behavior with uncertainty principle
        particle.phase += particle.frequency;
        const uncertainty = 0.1;
        particle.vx += (Math.random() - 0.5) * uncertainty;
        particle.vy += (Math.random() - 0.5) * uncertainty;
        
        // Quantum tunneling
        if (Math.random() < 0.001) {
          particle.x = Math.random() * width;
          particle.y = Math.random() * height;
        }
        break;
    }

    // Apply gravity
    particle.vy += config.gravity;

    // Interactive mouse attraction/repulsion
    if (interactive) {
      const mouseDistance = Math.sqrt(
        Math.pow(particle.x - mouseRef.current.x, 2) + 
        Math.pow(particle.y - mouseRef.current.y, 2)
      );
      
      if (mouseDistance < 100) {
        const force = (100 - mouseDistance) / 100;
        const angle = Math.atan2(particle.y - mouseRef.current.y, particle.x - mouseRef.current.x);
        particle.vx += Math.cos(angle) * force * 0.02;
        particle.vy += Math.sin(angle) * force * 0.02;
        particle.energy = Math.min(1, particle.energy + force * 0.1);
      }
    }

    // Update position
    particle.x += particle.vx * speed;
    particle.y += particle.vy * speed;

    // Apply damping
    particle.vx *= 0.99;
    particle.vy *= 0.99;

    // Boundary conditions
    if (particle.x < 0 || particle.x > width) {
      if (variant === 'quantum' && Math.random() < 0.1) {
        // Quantum tunneling
        particle.x = particle.x < 0 ? width : 0;
      } else {
        particle.vx *= -0.8;
        particle.x = Math.max(0, Math.min(width, particle.x));
      }
    }

    if (particle.y < 0 || particle.y > height) {
      if (variant === 'quantum' && Math.random() < 0.1) {
        particle.y = particle.y < 0 ? height : 0;
      } else {
        particle.vy *= -0.8;
        particle.y = Math.max(0, Math.min(height, particle.y));
      }
    }

    // Update life cycle
    particle.life -= 0.001;
    if (particle.life <= 0) {
      particle.life = particle.maxLife;
      // Respawn logic based on variant
      switch (variant) {
        case 'flowing':
          particle.x = Math.random() * width;
          particle.y = -10;
          break;
        default:
          particle.x = Math.random() * width;
          particle.y = Math.random() * height;
      }
    }

    // Decay energy
    particle.energy *= 0.98;
  };

  // Find connections between particles
  const findConnections = (particles) => {
    if (!config.connections) return;

    const maxDistance = constellation ? 120 : 80;
    
    particles.forEach(particle => {
      particle.connections = [];
      
      particles.forEach((other, index) => {
        if (particle.id !== other.id) {
          const distance = Math.sqrt(
            Math.pow(other.x - particle.x, 2) + 
            Math.pow(other.y - particle.y, 2)
          );
          
          if (distance < maxDistance) {
            particle.connections.push({
              particle: other,
              distance,
              strength: (maxDistance - distance) / maxDistance,
            });
          }
        }
      });
      
      // Limit connections to prevent performance issues
      particle.connections = particle.connections
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    });
  };

  // Draw particles and connections
  const draw = (canvas, ctx) => {
    const particles = particlesRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find connections if needed
    if (config.connections) {
      findConnections(particles);
    }

    // Draw connections first (behind particles)
    if (config.connections) {
      particles.forEach(particle => {
        particle.connections.forEach(connection => {
          const alpha = connection.strength * 0.3 * particle.life;
          if (alpha > 0.01) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(connection.particle.x, connection.particle.y);
            ctx.strokeStyle = particleColor.replace(/[^,]+(?=\))/, alpha.toString());
            ctx.lineWidth = connection.strength;
            ctx.stroke();
          }
        });
      });
    }

    // Draw particles
    particles.forEach(particle => {
      const alpha = particle.life * (1 + particle.energy);
      const size = particle.size * (1 + particle.energy * 0.5);

      if (alpha > 0.01) {
        // Create glow effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size * 3
        );
        
        gradient.addColorStop(0, particle.color.replace(/[^,]+(?=\))/, alpha.toString()));
        gradient.addColorStop(1, particle.color.replace(/[^,]+(?=\))/, '0'));

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Add core particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[^,]+(?=\))/, (alpha * 0.8).toString());
        ctx.fill();

        // Add energy pulse effect
        if (particle.energy > 0.5) {
          ctx.shadowColor = particleColor;
          ctx.shadowBlur = 10 * particle.energy;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = particle.color.replace(/[^,]+(?=\))/, (particle.energy * 0.3).toString());
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = particlesRef.current;

    // Update particles
    particles.forEach((particle, index) => {
      updateParticle(particle, canvas, index, particles);
    });

    // Draw everything
    draw(canvas, ctx);

    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle mouse movement
  const handleMouseMove = (e) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Setup canvas and start animation
  useEffect(() => {
    setIsClient(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      
      if (canvas.width > 0 && canvas.height > 0) {
        initializeParticles(canvas);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [particleCount, speed, variant]);

  if (!isClient) {
    return null;
  }

  return (
    <motion.div
      className={`particle-field ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      onMouseMove={handleMouseMove}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 text-xs text-cyan-400 opacity-40 font-mono">
          <div>Particles: {particleCount}</div>
          <div>Variant: {variant}</div>
          <div>Interactive: {interactive ? 'Yes' : 'No'}</div>
        </div>
      )}
    </motion.div>
  );
};

// Preset configurations for different use cases
export const ParticlePresets = {
  // Subtle background for forms and cards
  subtle: {
    particleCount: 30,
    particleColor: 'rgba(0, 245, 255, 0.3)',
    particleSize: 1,
    speed: 0.3,
    variant: 'floating',
    interactive: false,
  },
  
  // Active background for dashboards
  active: {
    particleCount: 80,
    particleColor: 'rgba(0, 245, 255, 0.6)',
    particleSize: 2,
    speed: 1,
    variant: 'constellation',
    interactive: true,
  },
  
  // Energy field for special sections
  energy: {
    particleCount: 60,
    particleColor: 'rgba(57, 255, 20, 0.7)',
    particleSize: 2.5,
    speed: 1.5,
    variant: 'energy',
    interactive: true,
  },
  
  // Quantum field for advanced features
  quantum: {
    particleCount: 50,
    particleColor: 'rgba(124, 58, 237, 0.8)',
    particleSize: 2,
    speed: 1,
    variant: 'quantum',
    interactive: true,
  },
  
  // Flowing stream for loading states
  flowing: {
    particleCount: 40,
    particleColor: 'rgba(0, 245, 255, 0.5)',
    particleSize: 1.5,
    speed: 2,
    variant: 'flowing',
    interactive: false,
  }
};

export default ParticleField;