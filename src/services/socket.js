import io from 'socket.io-client';
import { authService } from './api';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    // In production, default to same-origin as the app (DigitalOcean App Platform)
    this.serverUrl = (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
      ? `${window.location.protocol}//${window.location.host}`
      : (process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
  }

  // Connect to Socket.IO server
  connect() {
    if (this.socket) {
      this.disconnect();
    }

    let token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      // Align with API mock auth behavior: generate a demo token so sockets can connect in dev/demo
      token = 'demo-david-chen-token-' + Date.now();
      localStorage.setItem('authToken', token);
      localStorage.setItem('token', token);
      console.warn('⚠️ No auth token found. Generated demo token for Socket.IO connection.');
    }

    this.socket = io(this.serverUrl, {
      auth: { token },
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

  // Disconnect from Socket.IO server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Setup basic event handlers
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
    
    // Critical alert event handlers for real-time updates
    this.socket.on('workflow_updated', (data) => {
      console.log('🔄 Workflow updated:', data);
      this.emit('workflowUpdate', data);
      this.emit('alertsChanged', { projectId: data.projectId, type: 'workflow' });
    });
    
    this.socket.on('alerts_refresh', (data) => {
      console.log('🔄 Alerts refresh requested:', data);
      this.emit('alertsChanged', data);
    });
    
    this.socket.on('new_alert', (data) => {
      console.log('🚨 New alert received:', data);
      this.emit('newAlert', data);
      
      // Show browser notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(data.title || 'New Alert', {
            body: data.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `alert-${data.id}`,
            requireInteraction: data.priority === 'HIGH'
          });
        }
      }
    });
    
    this.socket.on('alert_completed', (data) => {
      console.log('✅ Alert completed:', data);
      this.emit('alertCompleted', data);
      this.emit('alertsChanged', { type: 'completion' });
    });
  }

  // Setup reconnection handlers with exponential backoff
  setupReconnectionHandlers() {
    let reconnectBackoff = 1000;
    let reconnectTimer = null;
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      reconnectBackoff = 1000; // Reset backoff on successful reconnect
      this.emit('reconnected', attemptNumber);
      
      // Rejoin rooms after reconnection
      this.rejoinRooms();
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      this.reconnectAttempts = attemptNumber;
      this.emit('reconnectAttempt', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to server');
      this.emit('reconnectFailed');
      
      // Implement manual reconnection with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        reconnectTimer = setTimeout(() => {
          console.log(`🔄 Manual reconnection attempt after ${reconnectBackoff}ms`);
          this.socket.connect();
          reconnectBackoff = Math.min(reconnectBackoff * 2, 30000); // Cap at 30 seconds
        }, reconnectBackoff);
      }
    });
    
    // Handle disconnect for better reconnection strategy
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server forced disconnect, reconnect immediately
        console.log('🔄 Server initiated disconnect, reconnecting...');
        this.socket.connect();
      } else if (reason === 'transport close' || reason === 'transport error') {
        // Network issue, use exponential backoff
        if (!reconnectTimer && this.reconnectAttempts < this.maxReconnectAttempts) {
          reconnectTimer = setTimeout(() => {
            console.log(`🔄 Reconnecting after network issue (backoff: ${reconnectBackoff}ms)`);
            this.socket.connect();
            reconnectBackoff = Math.min(reconnectBackoff * 2, 30000);
            reconnectTimer = null;
          }, reconnectBackoff);
        }
      }
    });
  }
  
  // Rejoin rooms after reconnection
  rejoinRooms() {
    // Rejoin any rooms we were in before disconnect
    if (this.currentProjectId) {
      this.joinProject(this.currentProjectId);
      console.log(`👥 Rejoined project ${this.currentProjectId}`);
    }
    
    if (this.currentConversationId) {
      this.joinConversation(this.currentConversationId);
      console.log(`💬 Rejoined conversation ${this.currentConversationId}`);
    }
  }

  // Join a project room
  joinProject(projectId) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.currentProjectId = projectId; // Track for reconnection
    this.socket.emit('join_project', projectId);
    console.log(`👥 Joined project ${projectId}`);
  }

  // Leave a project room
  leaveProject(projectId) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
    this.socket.emit('leave_project', projectId);
    console.log(`👋 Left project ${projectId}`);
  }

  // Join a conversation room
  joinConversation(conversationId) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.currentConversationId = conversationId; // Track for reconnection
    this.socket.emit('join_conversation', conversationId);
    console.log(`💬 Joined conversation ${conversationId}`);
  }

  // Leave a conversation room
  leaveConversation(conversationId) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
    this.socket.emit('leave_conversation', conversationId);
    console.log(`💬 Left conversation ${conversationId}`);
  }

  // Send a message
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

  // Send a notification
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

  // Send a project update
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

  // Send a task update
  sendTaskUpdate(taskData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('task_update', taskData);
  }

  // Send an activity update
  sendActivityUpdate(activityData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('activity_update', activityData);
  }

  // Send a document update
  sendDocumentUpdate(documentData) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('document_update', documentData);
  }

  // Update user status
  updateUserStatus(status, projectId = null) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('user_status_update', { status, projectId });
  }

  // Start typing indicator
  startTyping(conversationId = null, projectId = null) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('typing_start', { conversationId, projectId });
  }

  // Stop typing indicator
  stopTyping(conversationId = null, projectId = null) {
    if (!this.isConnected) {
      console.warn('⚠️ Not connected to server');
      return;
    }
    
    this.socket.emit('typing_stop', { conversationId, projectId });
  }

  // Add event listener
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  // Remove event listener
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Emit event to local handlers
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

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService; 