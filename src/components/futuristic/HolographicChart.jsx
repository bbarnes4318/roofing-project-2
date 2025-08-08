import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HolographicCard, FuturisticThemes } from './index';

const HolographicChart = ({
  data = [],
  type = 'line', // line, bar, area, circle, neural
  title = 'Data Visualization',
  color = 'cyan',
  width = 400,
  height = 300,
  animated = true,
  gridLines = true,
  dataPoints = true,
  glowEffect = true,
  quantumNoise = false,
  className = ''
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isClient, setIsClient] = useState(false);

  const theme = FuturisticThemes[color] || FuturisticThemes.cyan;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width: canvasWidth, height: canvasHeight } = canvas;
    
    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    let progress = 0;
    const duration = animated ? 2000 : 0; // 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Set up drawing styles
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw grid lines
      if (gridLines) {
        drawGrid(ctx, canvasWidth, canvasHeight);
      }

      // Draw chart based on type
      switch (type) {
        case 'line':
          drawLineChart(ctx, data, canvasWidth, canvasHeight, progress);
          break;
        case 'bar':
          drawBarChart(ctx, data, canvasWidth, canvasHeight, progress);
          break;
        case 'area':
          drawAreaChart(ctx, data, canvasWidth, canvasHeight, progress);
          break;
        case 'circle':
          drawCircleChart(ctx, data, canvasWidth, canvasHeight, progress);
          break;
        case 'neural':
          drawNeuralChart(ctx, data, canvasWidth, canvasHeight, progress);
          break;
      }

      // Continue animation
      if (progress < 1 && animated) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, type, animated, isClient]);

  const drawGrid = (ctx, width, height) => {
    const padding = 40;
    const gridSpacing = 40;
    
    ctx.strokeStyle = theme.glow.replace('0.3', '0.1');
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let y = padding; y < height - padding; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical lines
    for (let x = padding; x < width - padding; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
  };

  const drawLineChart = (ctx, data, width, height, progress) => {
    if (data.length === 0) return;

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const maxValue = Math.max(...data.map(d => d.value || d));
    const minValue = Math.min(...data.map(d => d.value || d));
    const range = maxValue - minValue || 1;

    const points = data.map((item, index) => {
      const value = item.value || item;
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      return { x, y, value };
    });

    // Draw the line with animation
    const animatedPoints = points.slice(0, Math.ceil(points.length * progress));
    
    if (animatedPoints.length > 1) {
      // Main line
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 3;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = glowEffect ? 10 : 0;

      ctx.beginPath();
      ctx.moveTo(animatedPoints[0].x, animatedPoints[0].y);
      
      for (let i = 1; i < animatedPoints.length; i++) {
        ctx.lineTo(animatedPoints[i].x, animatedPoints[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Quantum noise effect
      if (quantumNoise) {
        ctx.strokeStyle = theme.accent.replace('0.6', '0.3');
        ctx.lineWidth = 1;
        
        for (let i = 0; i < animatedPoints.length - 1; i++) {
          const point1 = animatedPoints[i];
          const point2 = animatedPoints[i + 1];
          
          // Add random offset for quantum uncertainty
          const offset1 = (Math.random() - 0.5) * 4;
          const offset2 = (Math.random() - 0.5) * 4;
          
          ctx.beginPath();
          ctx.moveTo(point1.x, point1.y + offset1);
          ctx.lineTo(point2.x, point2.y + offset2);
          ctx.stroke();
        }
      }
    }

    // Draw data points
    if (dataPoints) {
      animatedPoints.forEach((point, index) => {
        ctx.fillStyle = theme.accent;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = glowEffect ? 8 : 0;
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer glow ring
        if (glowEffect) {
          ctx.strokeStyle = theme.glow;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      ctx.shadowBlur = 0;
    }
  };

  const drawBarChart = (ctx, data, width, height, progress) => {
    if (data.length === 0) return;

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const maxValue = Math.max(...data.map(d => d.value || d));
    const barWidth = chartWidth / data.length * 0.7;
    const barSpacing = chartWidth / data.length * 0.3;

    data.forEach((item, index) => {
      const value = item.value || item;
      const barHeight = (value / maxValue) * chartHeight * progress;
      
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const y = padding + chartHeight - barHeight;

      // Bar gradient
      const gradient = ctx.createLinearGradient(x, y + barHeight, x, y);
      gradient.addColorStop(0, theme.secondary);
      gradient.addColorStop(1, theme.primary);

      ctx.fillStyle = gradient;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = glowEffect ? 15 : 0;

      ctx.fillRect(x, y, barWidth, barHeight);

      // Bar outline
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, barWidth, barHeight);
      
      ctx.shadowBlur = 0;
    });
  };

  const drawAreaChart = (ctx, data, width, height, progress) => {
    if (data.length === 0) return;

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const maxValue = Math.max(...data.map(d => d.value || d));
    const minValue = Math.min(...data.map(d => d.value || d));
    const range = maxValue - minValue || 1;

    const points = data.map((item, index) => {
      const value = item.value || item;
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      return { x, y };
    });

    const animatedPoints = points.slice(0, Math.ceil(points.length * progress));

    if (animatedPoints.length > 1) {
      // Create area gradient
      const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
      gradient.addColorStop(0, theme.primary.replace('0.8', '0.4'));
      gradient.addColorStop(1, theme.primary.replace('0.8', '0.1'));

      // Draw area
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(animatedPoints[0].x, padding + chartHeight);
      ctx.lineTo(animatedPoints[0].x, animatedPoints[0].y);
      
      for (let i = 1; i < animatedPoints.length; i++) {
        ctx.lineTo(animatedPoints[i].x, animatedPoints[i].y);
      }
      
      ctx.lineTo(animatedPoints[animatedPoints.length - 1].x, padding + chartHeight);
      ctx.closePath();
      ctx.fill();

      // Draw top line
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 3;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = glowEffect ? 10 : 0;

      ctx.beginPath();
      ctx.moveTo(animatedPoints[0].x, animatedPoints[0].y);
      for (let i = 1; i < animatedPoints.length; i++) {
        ctx.lineTo(animatedPoints[i].x, animatedPoints[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  };

  const drawCircleChart = (ctx, data, width, height, progress) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    
    const total = data.reduce((sum, item) => sum + (item.value || item), 0);
    let currentAngle = -Math.PI / 2; // Start from top

    data.forEach((item, index) => {
      const value = item.value || item;
      const angle = (value / total) * Math.PI * 2 * progress;
      
      const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.3,
        centerX, centerY, radius
      );
      
      const itemColor = item.color || theme.primary;
      gradient.addColorStop(0, itemColor.replace('0.8', '0.9'));
      gradient.addColorStop(1, itemColor.replace('0.8', '0.4'));

      ctx.fillStyle = gradient;
      ctx.strokeStyle = itemColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = itemColor;
      ctx.shadowBlur = glowEffect ? 15 : 0;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      currentAngle += angle;
    });
    
    ctx.shadowBlur = 0;

    // Center circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawNeuralChart = (ctx, data, width, height, progress) => {
    const nodes = [];
    const connections = [];
    const nodeCount = Math.min(data.length, 12);
    
    // Create nodes in a network pattern
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radiusVariation = 0.3 + (data[i]?.value || 0) / Math.max(...data.map(d => d.value || d)) * 0.4;
      const radius = Math.min(width, height) * 0.3 * radiusVariation;
      
      nodes.push({
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        value: data[i]?.value || data[i] || 0,
        size: 4 + (data[i]?.value || 0) / Math.max(...data.map(d => d.value || d)) * 8
      });
    }

    // Create connections between nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = Math.sqrt(
          Math.pow(nodes[i].x - nodes[j].x, 2) + 
          Math.pow(nodes[i].y - nodes[j].y, 2)
        );
        
        if (distance < width * 0.4) {
          connections.push({
            from: i,
            to: j,
            strength: 1 - distance / (width * 0.4)
          });
        }
      }
    }

    // Draw connections
    connections.forEach(conn => {
      const alpha = conn.strength * 0.5 * progress;
      ctx.strokeStyle = theme.glow.replace('0.3', alpha.toString());
      ctx.lineWidth = conn.strength * 2;
      
      ctx.beginPath();
      ctx.moveTo(nodes[conn.from].x, nodes[conn.from].y);
      ctx.lineTo(nodes[conn.to].x, nodes[conn.to].y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node, index) => {
      if (index / nodes.length <= progress) {
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.size * 2
        );
        gradient.addColorStop(0, theme.primary);
        gradient.addColorStop(1, theme.primary.replace('0.8', '0.2'));

        ctx.fillStyle = gradient;
        ctx.shadowColor = theme.primary;
        ctx.shadowBlur = glowEffect ? 10 : 0;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulse effect
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    
    ctx.shadowBlur = 0;
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className={`holographic-chart ${className}`}>
      <HolographicCard
        glowColor={color}
        elevation="medium"
        className="p-6 overflow-hidden"
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          {animated && (
            <div className="text-xs text-gray-400">
              Loading: {Math.round(animationProgress * 100)}%
            </div>
          )}
        </div>
        
        <div className="relative" style={{ width, height }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="max-w-full h-auto"
            style={{ filter: glowEffect ? `drop-shadow(0 0 20px ${theme.glow})` : 'none' }}
          />
          
          {quantumNoise && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
                mixBlendMode: 'screen',
              }}
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
        </div>

        {/* Chart legend or controls could go here */}
        <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
          <span>Type: {type.charAt(0).toUpperCase() + type.slice(1)}</span>
          <span>{data.length} data points</span>
        </div>
      </HolographicCard>
    </div>
  );
};

export default HolographicChart;