import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socket';
import { authService } from '../services/api';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    // Only connect if user is authenticated
    if (authService.isAuthenticated()) {
      socketService.connect();

      // Setup event listeners
      socketService.on('connected', () => setIsConnected(true));
      socketService.on('disconnected', () => setIsConnected(false));
      socketService.on('reconnectAttempt', (attempts) => setReconnectAttempts(attempts));
      socketService.on('reconnected', () => setReconnectAttempts(0));

      // Cleanup on unmount
      return () => {
        socketService.disconnect();
      };
    }
  }, []);

  return {
    socketService,
    isConnected,
    reconnectAttempts
  };
};

export const useRealTimeUpdates = (projectId) => {
  const { socketService, isConnected } = useSocket();
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (isConnected && projectId) {
      // Join project room
      socketService.joinProject(projectId);

      // Listen for updates
      const handleProjectUpdate = (update) => {
        setUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
      };

      const handleProgressUpdate = (update) => {
        setUpdates(prev => [{ type: 'progress', ...update }, ...prev.slice(0, 49)]);
      };

      const handleTaskUpdate = (update) => {
        setUpdates(prev => [{ type: 'task', ...update }, ...prev.slice(0, 49)]);
      };

      const handleActivity = (activity) => {
        setUpdates(prev => [{ type: 'activity', ...activity }, ...prev.slice(0, 49)]);
      };

      const handlePhaseOverride = (overrideData) => {
        setUpdates(prev => [{ type: 'phase_override', ...overrideData }, ...prev.slice(0, 49)]);
      };

      socketService.on('projectUpdate', handleProjectUpdate);
      socketService.on('progressUpdate', handleProgressUpdate);
      socketService.on('taskUpdate', handleTaskUpdate);
      socketService.on('activity', handleActivity);
      socketService.on('phaseOverride', handlePhaseOverride);

      // Cleanup
      return () => {
        socketService.leaveProject(projectId);
        socketService.off('projectUpdate', handleProjectUpdate);
        socketService.off('progressUpdate', handleProgressUpdate);
        socketService.off('taskUpdate', handleTaskUpdate);
        socketService.off('activity', handleActivity);
        socketService.off('phaseOverride', handlePhaseOverride);
      };
    }
  }, [isConnected, projectId, socketService]);

  return {
    updates,
    clearUpdates: () => setUpdates([])
  };
};

export const useRealTimeMessages = (conversationId) => {
  const { socketService, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (isConnected && conversationId) {
      // Join conversation room
      socketService.joinConversation(conversationId);

      // Listen for messages
      const handleMessage = (message) => {
        setMessages(prev => [...prev, message]);
      };

      const handleTyping = (data) => {
        if (data.isTyping) {
          setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        } else {
          setTypingUsers(prev => prev.filter(id => id !== data.userId));
        }
      };

      socketService.on('message', handleMessage);
      socketService.on('typing', handleTyping);

      // Cleanup
      return () => {
        socketService.leaveConversation(conversationId);
        socketService.off('message', handleMessage);
        socketService.off('typing', handleTyping);
      };
    }
  }, [isConnected, conversationId, socketService]);

  const sendMessage = useCallback(async (messageText) => {
    if (!isConnected || !conversationId) return;

    try {
      await socketService.sendMessage({
        conversationId,
        message: messageText,
        type: 'conversation_message'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [isConnected, conversationId, socketService]);

  const startTyping = useCallback(() => {
    if (isConnected && conversationId) {
      socketService.startTyping(conversationId);
    }
  }, [isConnected, conversationId, socketService]);

  const stopTyping = useCallback(() => {
    if (isConnected && conversationId) {
      socketService.stopTyping(conversationId);
    }
  }, [isConnected, conversationId, socketService]);

  return {
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping
  };
};

export const useRealTimeNotifications = () => {
  const { socketService, isConnected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isConnected) {
      const handleNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(notification.message, {
            icon: '/kenstruction-logo.png',
            tag: notification.id
          });
        }
      };

      socketService.on('notification', handleNotification);

      return () => {
        socketService.off('notification', handleNotification);
      };
    }
  }, [isConnected, socketService]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};

// Hook for tracking user online/offline presence
export const useUserPresence = () => {
  const { socketService, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [lastActivity, setLastActivity] = useState(new Map());

  useEffect(() => {
    if (isConnected) {
      // Broadcast that current user is online when connected
      socketService.updateUserStatus('online');

      // Handle user status changes
      const handleUserStatus = (data) => {
        const { userId, status, timestamp } = data;
        
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          if (status === 'online') {
            updated.set(userId, true);
          } else if (status === 'offline') {
            updated.delete(userId);
          } else {
            // Handle 'busy', 'away' etc - still considered online
            updated.set(userId, status);
          }
          return updated;
        });

        setLastActivity(prev => {
          const updated = new Map(prev);
          updated.set(userId, new Date(timestamp));
          return updated;
        });

        console.log(`👤 User ${userId} is now ${status}`);
      };

      // Listen for user status changes
      socketService.on('userStatus', handleUserStatus);

      // Set up activity tracking - update status on activity
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];
      let inactivityTimer = null;
      
      const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        
        // If user was away, mark as online again
        socketService.updateUserStatus('online');
        
        // Set user as "away" after 5 minutes of inactivity
        inactivityTimer = setTimeout(() => {
          socketService.updateUserStatus('away');
        }, 5 * 60 * 1000);
      };

      activityEvents.forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true });
      });

      // Handle page visibility changes
      const handleVisibilityChange = () => {
        if (document.hidden) {
          socketService.updateUserStatus('away');
        } else {
          socketService.updateUserStatus('online');
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Handle window close/unload
      const handleUnload = () => {
        socketService.updateUserStatus('offline');
      };

      window.addEventListener('beforeunload', handleUnload);

      // Cleanup
      return () => {
        socketService.off('userStatus', handleUserStatus);
        socketService.updateUserStatus('offline');
        
        activityEvents.forEach(event => {
          window.removeEventListener(event, resetInactivityTimer);
        });
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleUnload);
        
        if (inactivityTimer) clearTimeout(inactivityTimer);
      };
    }
  }, [isConnected, socketService]);

  // Helper function to check if a user is online
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Helper function to get user status (online, away, busy, offline)
  const getUserStatus = useCallback((userId) => {
    const status = onlineUsers.get(userId);
    if (!status) return 'offline';
    if (status === true) return 'online';
    return status; // 'away', 'busy', etc.
  }, [onlineUsers]);

  // Helper function to get last activity time
  const getLastActivity = useCallback((userId) => {
    return lastActivity.get(userId) || null;
  }, [lastActivity]);

  return {
    onlineUsers,
    isUserOnline,
    getUserStatus,
    getLastActivity,
    isConnected
  };
};

export const useRealTimeWorkflowAlerts = () => {
  const { socketService, isConnected } = useSocket();
  const [workflowAlerts, setWorkflowAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (isConnected) {
      const handleWorkflowAlert = (alert) => {
        setWorkflowAlerts(prev => [alert, ...prev]);
        setAlertCount(prev => prev + 1);
        
        // Show browser notification for urgent alerts
        if (Notification.permission === 'granted' && (alert.priority === 'urgent' || alert.priority === 'high')) {
          new Notification(`Workflow Alert: ${alert.message}`, {
            icon: '/kenstruction-logo.png',
            tag: alert.id,
            body: `Project: ${alert.projectId?.name || 'Unknown'}\nStep: ${alert.stepTitle || 'Unknown'}`
          });
        }
      };

      const handleWorkflowAlertUpdate = (alertUpdate) => {
        setWorkflowAlerts(prev => 
          prev.map(alert => 
            alert._id === alertUpdate.alertId 
              ? { ...alert, ...alertUpdate.changes }
              : alert
          )
        );
      };

      const handleWorkflowAlertDismissed = (alertId) => {
        setWorkflowAlerts(prev => prev.filter(alert => alert._id !== alertId));
        setAlertCount(prev => Math.max(0, prev - 1));
      };

      socketService.on('workflowAlert', handleWorkflowAlert);
      socketService.on('workflowAlertUpdate', handleWorkflowAlertUpdate);
      socketService.on('workflowAlertDismissed', handleWorkflowAlertDismissed);

      return () => {
        socketService.off('workflowAlert', handleWorkflowAlert);
        socketService.off('workflowAlertUpdate', handleWorkflowAlertUpdate);
        socketService.off('workflowAlertDismissed', handleWorkflowAlertDismissed);
      };
    }
  }, [isConnected, socketService]);

  const acknowledgeAlert = useCallback((alertId) => {
    setWorkflowAlerts(prev => 
      prev.map(alert => 
        alert._id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  }, []);

  const dismissAlert = useCallback((alertId) => {
    setWorkflowAlerts(prev => prev.filter(alert => alert._id !== alertId));
    setAlertCount(prev => Math.max(0, prev - 1));
  }, []);

  return {
    workflowAlerts,
    alertCount,
    acknowledgeAlert,
    dismissAlert
  };
};

export default useSocket; 