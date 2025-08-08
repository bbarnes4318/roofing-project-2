import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const NeuralBackground = ({ 
  nodeCount = 30,
  connectionOpacity = 0.3,
  animationSpeed = 1,
  nodeColor = 'rgba(0, 245, 255, 0.6)',
  connectionColor = 'rgba(0, 245, 255, 0.2)',
  className = '',
  interactive = false,
  pulseEffect = true,
  synapticFiring = true
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const nodesRef = useRef([]);
  const connectionsRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  // Initialize nodes and connections
  const initializeNetwork = (canvas) => {
    const { width, height } = canvas;
    const nodes = [];
    const connections = [];

    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5 * animationSpeed,
        vy: (Math.random() - 0.5) * 0.5 * animationSpeed,
        radius: Math.random() * 3 + 2,
        pulse: Math.random() * Math.PI * 2,
        synapticCharge: 0,
        lastFired: 0,
      });
    }

    // Create connections between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = Math.sqrt(
          Math.pow(nodes[i].x - nodes[j].x, 2) + 
          Math.pow(nodes[i].y - nodes[j].y, 2)
        );

        // Connect nodes within a certain distance
        if (distance < 150 && Math.random() > 0.7) {
          connections.push({
            from: i,
            to: j,
            strength: Math.random() * 0.5 + 0.3,
            activity: 0,
            lastActivity: 0,
          });
        }
      }
    }

    nodesRef.current = nodes;
    connectionsRef.current = connections;
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const now = Date.now();

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Update and draw nodes
    nodesRef.current.forEach((node, index) => {
      // Update position
      node.x += node.vx;
      node.y += node.vy;

      // Bounce off edges
      if (node.x <= 0 || node.x >= width) node.vx *= -1;
      if (node.y <= 0 || node.y >= height) node.vy *= -1;

      // Keep nodes in bounds
      node.x = Math.max(0, Math.min(width, node.x));
      node.y = Math.max(0, Math.min(height, node.y));

      // Update pulse for breathing effect
      if (pulseEffect) {
        node.pulse += 0.02 * animationSpeed;
      }

      // Interactive effect with mouse
      if (interactive) {
        const mouseDistance = Math.sqrt(
          Math.pow(node.x - mouseRef.current.x, 2) + 
          Math.pow(node.y - mouseRef.current.y, 2)
        );
        
        if (mouseDistance < 100) {
          const force = (100 - mouseDistance) / 100;
          node.radius = Math.max(2, 5 * force + 2);
          node.synapticCharge = Math.min(1, force);
        } else {
          node.radius = Math.max(2, node.radius * 0.95);
          node.synapticCharge *= 0.95;
        }
      }

      // Synaptic firing
      if (synapticFiring && Math.random() < 0.001) {
        node.synapticCharge = 1;
        node.lastFired = now;
      }

      // Decay synaptic charge
      if (now - node.lastFired > 100) {
        node.synapticCharge *= 0.98;
      }

      // Draw node
      const alpha = connectionOpacity + (pulseEffect ? Math.sin(node.pulse) * 0.2 : 0);
      const radius = node.radius + (pulseEffect ? Math.sin(node.pulse) * 0.5 : 0);
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      
      // Create gradient for node
      const gradient = ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, radius * 2
      );
      
      const nodeAlpha = alpha + node.synapticCharge * 0.5;
      gradient.addColorStop(0, nodeColor.replace('0.6', nodeAlpha.toString()));
      gradient.addColorStop(1, nodeColor.replace('0.6', '0'));
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add glow effect for active nodes
      if (node.synapticCharge > 0.5) {
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = 10 * node.synapticCharge;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor.replace('0.6', (node.synapticCharge * 0.8).toString());
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Update and draw connections
    connectionsRef.current.forEach((connection, index) => {
      const fromNode = nodesRef.current[connection.from];
      const toNode = nodesRef.current[connection.to];

      if (!fromNode || !toNode) return;

      // Update connection activity based on node charges
      const combinedCharge = (fromNode.synapticCharge + toNode.synapticCharge) / 2;
      connection.activity = Math.max(connection.activity * 0.95, combinedCharge);

      // Draw connection
      const distance = Math.sqrt(
        Math.pow(toNode.x - fromNode.x, 2) + 
        Math.pow(toNode.y - fromNode.y, 2)
      );

      // Fade connections based on distance
      const maxDistance = 150;
      const distanceFactor = Math.max(0, 1 - distance / maxDistance);
      const alpha = connectionOpacity * distanceFactor * connection.strength;
      const activityAlpha = alpha + connection.activity * 0.3;

      if (activityAlpha > 0.01) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = connectionColor.replace('0.2', activityAlpha.toString());
        ctx.lineWidth = 1 + connection.activity * 2;
        ctx.stroke();

        // Draw synaptic pulse
        if (connection.activity > 0.3 && synapticFiring) {
          const pulsePosition = (now % 1000) / 1000;
          const pulseX = fromNode.x + (toNode.x - fromNode.x) * pulsePosition;
          const pulseY = fromNode.y + (toNode.y - fromNode.y) * pulsePosition;

          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 2 * connection.activity, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor.replace('0.6', (connection.activity * 0.8).toString());
          ctx.fill();
        }
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle mouse movement for interactivity
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

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      
      // Reinitialize network on resize
      if (canvas.width > 0 && canvas.height > 0) {
        initializeNetwork(canvas);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start animation
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nodeCount, animationSpeed, interactive, pulseEffect, synapticFiring]);

  // Don't render on server
  if (!isClient) {
    return null;
  }

  return (
    <motion.div
      className={`neural-background ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
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
      
      {/* Organic growth effect overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, ${nodeColor.replace('0.6', '0.1')} 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${nodeColor.replace('0.6', '0.1')} 0%, transparent 50%),
            radial-gradient(circle at 60% 20%, ${nodeColor.replace('0.6', '0.05')} 0%, transparent 40%)
          `,
          mixBlendMode: 'screen',
        }}
      />
      
      {/* Neural activity indicators */}
      <div className="absolute top-4 left-4 text-xs text-cyan-400 opacity-40 font-mono">
        <div>Nodes: {nodeCount}</div>
        <div>Connections: {connectionsRef.current.length}</div>
        <div>Activity: {synapticFiring ? 'Active' : 'Dormant'}</div>
      </div>
    </motion.div>
  );
};

// Preset configurations
export const PresetNeuralBackgrounds = {
  // Default cyan neural network
  default: {
    nodeColor: 'rgba(0, 245, 255, 0.6)',
    connectionColor: 'rgba(0, 245, 255, 0.2)',
    nodeCount: 30,
    interactive: true,
    synapticFiring: true,
  },
  
  // Magenta/pink network for warnings or special states
  magenta: {
    nodeColor: 'rgba(255, 0, 128, 0.6)',
    connectionColor: 'rgba(255, 0, 128, 0.2)',
    nodeCount: 25,
    interactive: false,
    synapticFiring: true,
  },
  
  // Green network for success states
  green: {
    nodeColor: 'rgba(57, 255, 20, 0.6)',
    connectionColor: 'rgba(57, 255, 20, 0.2)',
    nodeCount: 20,
    interactive: false,
    synapticFiring: false,
    pulseEffect: true,
  },
  
  // Dense network for complex data views
  dense: {
    nodeColor: 'rgba(124, 58, 237, 0.6)',
    connectionColor: 'rgba(124, 58, 237, 0.2)',
    nodeCount: 50,
    interactive: true,
    synapticFiring: true,
    animationSpeed: 0.5,
  },
  
  // Minimal network for subtle backgrounds
  minimal: {
    nodeColor: 'rgba(0, 245, 255, 0.3)',
    connectionColor: 'rgba(0, 245, 255, 0.1)',
    nodeCount: 15,
    interactive: false,
    synapticFiring: false,
    pulseEffect: false,
    animationSpeed: 0.3,
  }
};

export default NeuralBackground;