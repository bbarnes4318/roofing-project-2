import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HolographicCard, FuturisticThemes } from './index';
import {
  ChatBubbleLeftRightIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ClockIcon,
  DocumentTextIcon,
  CogIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const NeuralActivityFeed = ({
  activities = [],
  maxItems = 10,
  showAvatars = true,
  showTimestamps = true,
  showProjects = true,
  animated = true,
  neuralEffects = true,
  realTimeUpdates = false,
  className = '',
  onActivityClick = null,
  filterByProject = null
}) => {
  const [displayActivities, setDisplayActivities] = useState([]);
  const [neuralConnections, setNeuralConnections] = useState([]);
  const [activityNodes, setActivityNodes] = useState([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Process and enhance activities with neural properties
  useEffect(() => {
    let processedActivities = activities
      .filter(activity => filterByProject ? activity.projectId === filterByProject : true)
      .slice(0, maxItems)
      .map((activity, index) => ({
        ...activity,
        id: activity.id || index,
        neuralId: `node-${activity.id || index}`,
        synapticWeight: getSynapticWeight(activity),
        activityType: getActivityType(activity),
        priority: getPriority(activity),
        connections: [],
        energyLevel: Math.random() * 0.5 + 0.5
      }));

    // Create neural connections between related activities
    processedActivities.forEach((activity, index) => {
      processedActivities.forEach((otherActivity, otherIndex) => {
        if (index !== otherIndex && areRelated(activity, otherActivity)) {
          activity.connections.push({
            targetId: otherActivity.neuralId,
            strength: getConnectionStrength(activity, otherActivity),
            type: getConnectionType(activity, otherActivity)
          });
        }
      });
    });

    setDisplayActivities(processedActivities);
  }, [activities, maxItems, filterByProject]);

  // Initialize neural network visualization
  useEffect(() => {
    if (!neuralEffects || !displayActivities.length) return;

    const nodes = displayActivities.map((activity, index) => ({
      id: activity.neuralId,
      x: 50 + (index % 3) * 100,
      y: 50 + Math.floor(index / 3) * 80,
      radius: 3 + activity.synapticWeight * 5,
      energy: activity.energyLevel,
      activity: activity,
      pulsePhase: Math.random() * Math.PI * 2
    }));

    const connections = [];
    displayActivities.forEach(activity => {
      activity.connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === activity.neuralId);
        const toNode = nodes.find(n => n.id === conn.targetId);
        if (fromNode && toNode) {
          connections.push({
            from: fromNode,
            to: toNode,
            strength: conn.strength,
            type: conn.type
          });
        }
      });
    });

    setActivityNodes(nodes);
    setNeuralConnections(connections);
  }, [displayActivities, neuralEffects]);

  // Neural network animation
  useEffect(() => {
    if (!neuralEffects || !canvasRef.current || !isClient) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationTime = 0;

    const animate = () => {
      animationTime += 0.016; // ~60fps
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      neuralConnections.forEach(connection => {
        const alpha = 0.2 + connection.strength * 0.3;
        const gradient = ctx.createLinearGradient(
          connection.from.x, connection.from.y,
          connection.to.x, connection.to.y
        );
        
        gradient.addColorStop(0, FuturisticThemes.cyan.primary.replace('0.8', alpha.toString()));
        gradient.addColorStop(1, FuturisticThemes.cyan.glow.replace('0.3', (alpha * 0.5).toString()));

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1 + connection.strength * 2;
        ctx.beginPath();
        ctx.moveTo(connection.from.x, connection.from.y);
        ctx.lineTo(connection.to.x, connection.to.y);
        ctx.stroke();

        // Synaptic pulse effect
        if (connection.strength > 0.6) {
          const pulseProgress = (animationTime % 2) / 2;
          const pulseX = connection.from.x + (connection.to.x - connection.from.x) * pulseProgress;
          const pulseY = connection.from.y + (connection.to.y - connection.from.y) * pulseProgress;

          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2);
          ctx.fillStyle = FuturisticThemes.cyan.accent;
          ctx.fill();
        }
      });

      // Draw nodes
      activityNodes.forEach(node => {
        node.pulsePhase += 0.05;
        const pulseIntensity = 0.7 + 0.3 * Math.sin(node.pulsePhase);
        
        // Node glow
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 3
        );
        gradient.addColorStop(0, getActivityColor(node.activity).primary);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulseIntensity * 2, 0, Math.PI * 2);
        ctx.fill();

        // Node core
        ctx.fillStyle = getActivityColor(node.activity).accent;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulseIntensity, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.offsetWidth;
        canvas.height = 200;
      }
    };

    resizeCanvas();
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [neuralConnections, activityNodes, neuralEffects, isClient]);

  // Helper functions
  const getSynapticWeight = (activity) => {
    const weights = {
      'high': 0.9,
      'medium': 0.6,
      'low': 0.3
    };
    return weights[activity.priority] || weights[getPriority(activity)];
  };

  const getActivityType = (activity) => {
    if (activity.type) return activity.type;
    if (activity.content?.toLowerCase().includes('message')) return 'communication';
    if (activity.content?.toLowerCase().includes('complete')) return 'completion';
    if (activity.content?.toLowerCase().includes('alert')) return 'alert';
    if (activity.content?.toLowerCase().includes('update')) return 'update';
    return 'general';
  };

  const getPriority = (activity) => {
    if (activity.priority) return activity.priority.toLowerCase();
    
    const content = (activity.content || activity.description || '').toLowerCase();
    if (content.includes('urgent') || content.includes('critical')) return 'high';
    if (content.includes('important') || content.includes('alert')) return 'medium';
    return 'low';
  };

  const areRelated = (activity1, activity2) => {
    // Activities are related if they're from the same project or user
    return activity1.projectId === activity2.projectId ||
           activity1.author === activity2.author ||
           Math.abs(new Date(activity1.timestamp) - new Date(activity2.timestamp)) < 1000 * 60 * 60; // Within 1 hour
  };

  const getConnectionStrength = (activity1, activity2) => {
    let strength = 0;
    if (activity1.projectId === activity2.projectId) strength += 0.4;
    if (activity1.author === activity2.author) strength += 0.3;
    if (getActivityType(activity1) === getActivityType(activity2)) strength += 0.3;
    return Math.min(strength, 1);
  };

  const getConnectionType = (activity1, activity2) => {
    if (activity1.author === activity2.author) return 'user';
    if (activity1.projectId === activity2.projectId) return 'project';
    return 'temporal';
  };

  const getActivityColor = (activity) => {
    const colors = {
      'communication': FuturisticThemes.cyan,
      'completion': FuturisticThemes.green,
      'alert': FuturisticThemes.magenta,
      'update': FuturisticThemes.purple,
      'general': FuturisticThemes.orange
    };
    return colors[getActivityType(activity)] || FuturisticThemes.cyan;
  };

  const getActivityIcon = (activity) => {
    const type = getActivityType(activity);
    const icons = {
      'communication': ChatBubbleLeftRightIcon,
      'completion': CheckCircleIcon,
      'alert': ExclamationTriangleIcon,
      'update': BoltIcon,
      'document': DocumentTextIcon,
      'security': ShieldCheckIcon,
      'financial': CurrencyDollarIcon,
      'schedule': CalendarIcon,
      'location': MapPinIcon,
      'general': CogIcon
    };
    return icons[type] || CogIcon;
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className={`neural-activity-feed ${className}`}>
      <HolographicCard
        glowColor="cyan"
        elevation="medium"
        className="p-6 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Activity Neural Network</h3>
          <div className="flex items-center gap-2 text-sm text-cyan-300">
            <BoltIcon className="w-4 h-4" />
            {displayActivities.length} active connections
          </div>
        </div>

        {/* Neural network visualization */}
        {neuralEffects && displayActivities.length > 0 && (
          <div className="relative mb-6 h-50 overflow-hidden rounded-lg bg-black/30">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ mixBlendMode: 'screen' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              Neural Activity Visualization
            </div>
          </div>
        )}

        {/* Activity feed */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <AnimatePresence initial={false}>
            {displayActivities.map((activity, index) => {
              const IconComponent = getActivityIcon(activity);
              const activityColor = getActivityColor(activity);
              const priority = getPriority(activity);

              return (
                <motion.div
                  key={activity.id}
                  className={`relative p-4 rounded-lg border border-opacity-30 transition-all cursor-pointer ${
                    onActivityClick ? 'hover:border-opacity-60' : ''
                  }`}
                  style={{
                    backgroundColor: `${activityColor.secondary}20`,
                    borderColor: activityColor.glow
                  }}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    boxShadow: priority === 'high' 
                      ? `0 0 20px ${activityColor.glow}, 0 0 40px ${activityColor.glow.replace('0.3', '0.1')}` 
                      : `0 0 10px ${activityColor.glow.replace('0.3', '0.1')}`
                  }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: animated ? index * 0.1 : 0,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  whileHover={{ 
                    scale: 1.02, 
                    boxShadow: `0 0 25px ${activityColor.glow}`,
                    transition: { duration: 0.2 }
                  }}
                  onClick={() => onActivityClick && onActivityClick(activity)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar or Icon */}
                    <div className="flex-shrink-0">
                      {showAvatars && activity.author ? (
                        <div className="relative">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: activityColor.primary }}
                          >
                            {getUserInitials(activity.author)}
                          </div>
                          {priority === 'high' && (
                            <motion.div
                              className="absolute -inset-1 border-2 rounded-full"
                              style={{ borderColor: activityColor.accent }}
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.6, 0.9, 0.6],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut'
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${activityColor.primary}40` }}
                        >
                          <IconComponent 
                            className="w-5 h-5"
                            style={{ color: activityColor.accent }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Activity content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {activity.author && (
                          <span className="font-medium text-white text-sm">
                            {activity.author}
                          </span>
                        )}
                        
                        {showProjects && activity.project && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${activityColor.primary}30`,
                              color: activityColor.accent
                            }}
                          >
                            {activity.project}
                          </span>
                        )}

                        {priority === 'high' && (
                          <motion.div
                            className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-medium"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            High Priority
                          </motion.div>
                        )}
                      </div>

                      <p className="text-sm text-gray-300 leading-relaxed">
                        {activity.content || activity.description || activity.subject}
                      </p>

                      {showTimestamps && activity.timestamp && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <ClockIcon className="w-3 h-3" />
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </div>
                      )}
                    </div>

                    {/* Neural activity indicator */}
                    {neuralEffects && (
                      <div className="flex-shrink-0">
                        <div className="flex flex-col items-center gap-1">
                          {/* Synaptic strength indicator */}
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map(i => (
                              <motion.div
                                key={i}
                                className="w-1 h-3 rounded-full"
                                style={{
                                  backgroundColor: activity.synapticWeight * 3 >= i 
                                    ? activityColor.accent 
                                    : activityColor.glow.replace('0.3', '0.2')
                                }}
                                animate={activity.synapticWeight * 3 >= i ? {
                                  scale: [1, 1.2, 1],
                                  opacity: [0.7, 1, 0.7],
                                } : {}}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: i * 0.2
                                }}
                              />
                            ))}
                          </div>
                          
                          {/* Connection count */}
                          <div 
                            className="text-xs font-mono"
                            style={{ color: activityColor.accent }}
                          >
                            {activity.connections.length}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantum energy pulse overlay */}
                  {priority === 'high' && neuralEffects && (
                    <motion.div
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at center, ${activityColor.glow} 0%, transparent 70%)`,
                        mixBlendMode: 'screen',
                      }}
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.1, 0.3, 0.1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {displayActivities.length === 0 && (
          <div className="text-center py-12">
            <BoltIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No neural activity detected</p>
          </div>
        )}

        {/* Real-time status indicator */}
        {realTimeUpdates && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-cyan-500/20">
            <motion.div
              className="w-2 h-2 bg-green-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            <span className="text-xs text-green-400">Live neural feed active</span>
          </div>
        )}
      </HolographicCard>
    </div>
  );
};

export default NeuralActivityFeed;