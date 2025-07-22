/**
 * Kenstruction Socket.IO Client Helper
 * 
 * This helper provides an easy-to-use interface for integrating Socket.IO
 * real-time features into your frontend application.
 * 
 * Usage:
 * import { SocketManager } from './client-socket-helper.js';
 * 
 * const socketManager = new SocketManager('http://localhost:5000', userToken);
 * socketManager.connect();
 */

import io from 'socket.io-client';

class SocketManager {
  constructor(serverUrl, authToken) {
    this.serverUrl = serverUrl;
    this.authToken = authToken;
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Connect to the Socket.IO server
   */
  connect() {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(this.serverUrl, {
      auth: {
        token: this.authToken
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.setupEventHandlers();
    this.setupReconnectionHandlers();

    return this;
  }

  /**
   * Disconnect from the Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Setup basic event handlers
   */
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('🔌 Connected to Kenstruction server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.emit('error', error);
    });

    // Real-time event handlers
    this.socket.on('newMessage', (data) => this.emit('message', data));
    this.socket.on('newNotification', (data) => this.emit('notification', data));
    this.socket.on('projectUpdated', (data) => this.emit('projectUpdate', data));
    this.socket.on('progressUpdated', (data) => this.emit('progressUpdate', data));
    this.socket.on('statusUpdated', (data) => this.emit('statusUpdate', data));
    this.socket.on('taskUpdated', (data) => this.emit('taskUpdate', data));
    this.socket.on('documentUpdated', (data) => this.emit('documentUpdate', data));
    this.socket.on('newActivity', (data) => this.emit('activity', data));
    this.socket.on('userStatusChanged', (data) => this.emit('userStatus', data));
    this.socket.on('userTyping', (data) => this.emit('typing', data));
    this.socket.on('userJoinedProject', (data) => this.emit('userJoined', data));
    this.socket.on('userLeftProject', (data) => this.emit('userLeft', data));
  }

  /**
   * Setup reconnection handlers
   */
  setupReconnectionHandlers() {
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.emit('reconnected', attemptNumber);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      this.reconnectAttempts = attemptNumber;
      this.emit('reconnectAttempt', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to server');
      this.emit('reconnectFailed');
    });
  }

  /**
   * Join a project room
   */
  joinProject(projectId) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('join_project', projectId);
    console.log(`👥 Joined project ${projectId}`);
  }

  /**
   * Leave a project room
   */
  leaveProject(projectId) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('leave_project', projectId);
    console.log(`👋 Left project ${projectId}`);
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('join_conversation', conversationId);
    console.log(`💬 Joined conversation ${conversationId}`);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('leave_conversation', conversationId);
    console.log(`💬 Left conversation ${conversationId}`);
  }

  /**
   * Send a message
   */
  sendMessage(messageData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return Promise.reject(new Error('Not connected to server'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('sendMessage', messageData);
      
      // Listen for confirmation
      this.socket.once('messageSent', (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Failed to send message'));
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, 5000);
    });
  }

  /**
   * Send a notification
   */
  sendNotification(notificationData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return Promise.reject(new Error('Not connected to server'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('notification', notificationData);
      
      // Listen for confirmation
      this.socket.once('notificationSent', (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Failed to send notification'));
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Notification send timeout'));
      }, 5000);
    });
  }

  /**
   * Send a project update
   */
  sendProjectUpdate(updateData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return Promise.reject(new Error('Not connected to server'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('projectUpdate', updateData);
      
      // Listen for confirmation
      this.socket.once('projectUpdateSent', (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Failed to send project update'));
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Project update send timeout'));
      }, 5000);
    });
  }

  /**
   * Send a task update
   */
  sendTaskUpdate(taskData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('task_update', taskData);
  }

  /**
   * Send an activity update
   */
  sendActivityUpdate(activityData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('activity_update', activityData);
  }

  /**
   * Send a document update
   */
  sendDocumentUpdate(documentData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('document_update', documentData);
  }

  /**
   * Update user status
   */
  updateUserStatus(status, projectId = null) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('user_status_update', { status, projectId });
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId = null, projectId = null) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('typing_start', { conversationId, projectId });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId = null, projectId = null) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('typing_stop', { conversationId, projectId });
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to local handlers
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

/**
 * React Hook for Socket.IO integration
 */
export function useSocket(serverUrl, authToken) {
  const [socketManager, setSocketManager] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    if (!authToken) return;

    const manager = new SocketManager(serverUrl, authToken);
    
    manager.on('connected', () => setIsConnected(true));
    manager.on('disconnected', () => setIsConnected(false));
    manager.on('reconnectAttempt', (attempts) => setReconnectAttempts(attempts));
    manager.on('reconnected', () => setReconnectAttempts(0));

    manager.connect();
    setSocketManager(manager);

    return () => {
      manager.disconnect();
    };
  }, [serverUrl, authToken]);

  return {
    socketManager,
    isConnected,
    reconnectAttempts
  };
}

/**
 * Vue 3 Composable for Socket.IO integration
 */
export function useSocketVue(serverUrl, authToken) {
  const socketManager = ref(null);
  const isConnected = ref(false);
  const reconnectAttempts = ref(0);

  watchEffect(() => {
    if (!authToken.value) return;

    const manager = new SocketManager(serverUrl, authToken.value);
    
    manager.on('connected', () => isConnected.value = true);
    manager.on('disconnected', () => isConnected.value = false);
    manager.on('reconnectAttempt', (attempts) => reconnectAttempts.value = attempts);
    manager.on('reconnected', () => reconnectAttempts.value = 0);

    manager.connect();
    socketManager.value = manager;

    onUnmounted(() => {
      manager.disconnect();
    });
  });

  return {
    socketManager,
    isConnected,
    reconnectAttempts
  };
}

/**
 * Example usage functions
 */
export const SocketExamples = {
  // Basic connection
  basicConnection: (serverUrl, authToken) => {
    const socketManager = new SocketManager(serverUrl, authToken);
    
    socketManager.on('connected', () => {
      console.log('Connected to server!');
    });
    
    socketManager.on('message', (messageData) => {
      console.log('New message:', messageData);
    });
    
    socketManager.on('notification', (notificationData) => {
      console.log('New notification:', notificationData);
    });
    
    socketManager.on('projectUpdate', (updateData) => {
      console.log('Project updated:', updateData);
    });
    
    socketManager.connect();
    return socketManager;
  },

  // Join project and send message
  projectMessaging: async (socketManager, projectId, message) => {
    // Join project room
    socketManager.joinProject(projectId);
    
    // Send message to project
    try {
      const response = await socketManager.sendMessage({
        projectId,
        message,
        type: 'project_message'
      });
      console.log('Message sent successfully:', response);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  },

  // Send notification to user
  sendNotificationToUser: async (socketManager, targetUserId, message, type = 'info') => {
    try {
      const response = await socketManager.sendNotification({
        targetUserId,
        message,
        type,
        priority: 'medium'
      });
      console.log('Notification sent successfully:', response);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  },

  // Update project progress
  updateProjectProgress: async (socketManager, projectId, progress) => {
    try {
      const response = await socketManager.sendProjectUpdate({
        projectId,
        updateType: 'progress',
        progress,
        updateData: {
          message: `Project progress updated to ${progress}%`
        }
      });
      console.log('Project progress updated successfully:', response);
    } catch (error) {
      console.error('Failed to update project progress:', error);
    }
  },

  // Real-time typing indicators
  setupTypingIndicators: (socketManager, conversationId) => {
    let typingTimer;
    
    const startTyping = () => {
      socketManager.startTyping(conversationId);
      
      // Stop typing after 3 seconds of inactivity
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        socketManager.stopTyping(conversationId);
      }, 3000);
    };
    
    const stopTyping = () => {
      clearTimeout(typingTimer);
      socketManager.stopTyping(conversationId);
    };
    
    return { startTyping, stopTyping };
  }
};

export default SocketManager; 