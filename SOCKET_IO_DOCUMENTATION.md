# Kenstruction Socket.IO Real-time Features Documentation

## Overview

The Kenstruction backend implements comprehensive real-time features using Socket.IO, enabling instant communication, live updates, and collaborative functionality across the entire construction management platform.

## 🔌 Connection & Authentication

### Server Setup
- **URL**: `http://localhost:5000` (development) or your production URL
- **Authentication**: JWT token required in `socket.handshake.auth.token`
- **Transports**: WebSocket (primary), Polling (fallback)

### Client Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket', 'polling']
});
```

## 🏠 Room Management

### Automatic Room Joining
Upon connection, users are automatically:
- Joined to their personal room: `user_{userId}`
- Joined to all project rooms they're associated with: `project_{projectId}`

### Manual Room Operations
```javascript
// Join project room
socket.emit('join_project', projectId);

// Leave project room  
socket.emit('leave_project', projectId);

// Join conversation room
socket.emit('join_conversation', conversationId);

// Leave conversation room
socket.emit('leave_conversation', conversationId);
```

## 📨 Real-time Messaging

### Send Message
```javascript
socket.emit('sendMessage', {
  conversationId: 'conversation-123',  // Optional
  projectId: 'project-456',           // Optional
  recipientId: 'user-789',            // Optional
  message: 'Hello team!',
  type: 'project_message'
});
```

### Receive Messages
```javascript
socket.on('newMessage', (messageData) => {
  console.log('New message:', messageData);
  // messageData contains: conversationId, sender, text, timestamp, projectId, recipientId
});

socket.on('messageSent', (response) => {
  if (response.success) {
    console.log('Message sent successfully');
  }
});
```

## 🔔 Real-time Notifications

### Send Notification
```javascript
socket.emit('notification', {
  targetUserId: 'user-123',
  message: 'Task assigned to you',
  type: 'task_assigned',
  priority: 'high',
  projectId: 'project-456',           // Optional
  link: '/tasks/123',                 // Optional
  data: { taskId: '123' }            // Optional
});
```

### Receive Notifications
```javascript
socket.on('newNotification', (notification) => {
  console.log('New notification:', notification);
  // Show notification to user
});

socket.on('projectNotification', (notification) => {
  console.log('Project notification:', notification);
  // Handle project-specific notifications
});

socket.on('notificationSent', (response) => {
  if (response.success) {
    console.log('Notification sent successfully');
  }
});
```

## 🏗️ Project Updates

### Send Project Update
```javascript
socket.emit('projectUpdate', {
  projectId: 'project-123',
  updateType: 'progress',             // 'progress', 'status', 'task_added', etc.
  progress: 75,                       // For progress updates
  status: 'in_progress',              // For status updates
  updateData: {
    message: 'Project progress updated',
    details: 'Foundation work completed'
  }
});
```

### Receive Project Updates
```javascript
socket.on('projectUpdated', (updateData) => {
  console.log('Project updated:', updateData);
  // Update UI with new project data
});

socket.on('progressUpdated', (data) => {
  console.log('Progress updated:', data.progress);
  // Update progress bar in real-time
});

socket.on('statusUpdated', (data) => {
  console.log('Status updated:', data.status);
  // Update project status display
});

socket.on('projectUpdateSent', (response) => {
  if (response.success) {
    console.log('Project update sent successfully');
  }
});
```

## 📝 Task Updates

### Send Task Update
```javascript
socket.emit('task_update', {
  projectId: 'project-123',
  taskId: 'task-456',
  updateType: 'status_changed',       // 'status_changed', 'assigned', 'completed', etc.
  updateData: {
    status: 'completed',
    assignedTo: 'user-789'
  }
});
```

### Receive Task Updates
```javascript
socket.on('taskUpdated', (data) => {
  console.log('Task updated:', data);
  // Update task display in real-time
  // Auto-refresh project progress if needed
});
```

## 📊 Activity Updates

### Send Activity Update
```javascript
socket.emit('activity_update', {
  projectId: 'project-123',
  activityType: 'document_uploaded',
  activityData: {
    documentName: 'blueprint.pdf',
    uploadedBy: 'John Doe'
  }
});
```

### Receive Activity Updates
```javascript
socket.on('newActivity', (data) => {
  console.log('New activity:', data);
  // Update activity feed in real-time
});
```

## 📄 Document Updates

### Send Document Update
```javascript
socket.emit('document_update', {
  projectId: 'project-123',
  documentId: 'doc-456',
  updateType: 'uploaded',             // 'uploaded', 'modified', 'deleted'
  documentData: {
    fileName: 'blueprint.pdf',
    fileSize: 1024000,
    uploadedBy: 'user-789'
  }
});
```

### Receive Document Updates
```javascript
socket.on('documentUpdated', (data) => {
  console.log('Document updated:', data);
  // Refresh document list
});
```

## 👤 User Status Updates

### Send Status Update
```javascript
socket.emit('user_status_update', {
  status: 'busy',                     // 'online', 'offline', 'busy', 'away'
  projectId: 'project-123'            // Optional: specific to project
});
```

### Receive Status Updates
```javascript
socket.on('userStatusChanged', (data) => {
  console.log('User status changed:', data);
  // Update user status indicator
  // data contains: userId, status, timestamp
});
```

## ⌨️ Typing Indicators

### Start/Stop Typing
```javascript
// Start typing
socket.emit('typing_start', {
  conversationId: 'conversation-123', // Optional
  projectId: 'project-456'           // Optional
});

// Stop typing
socket.emit('typing_stop', {
  conversationId: 'conversation-123',
  projectId: 'project-456'
});
```

### Receive Typing Indicators
```javascript
socket.on('userTyping', (data) => {
  if (data.isTyping) {
    console.log(`${data.userId} is typing...`);
    // Show typing indicator
  } else {
    console.log(`${data.userId} stopped typing`);
    // Hide typing indicator
  }
});
```

## 🔄 Connection Events

### Connection Status
```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### User Join/Leave Events
```javascript
socket.on('userJoinedProject', (data) => {
  console.log(`User ${data.userId} joined project ${data.projectId}`);
});

socket.on('userLeftProject', (data) => {
  console.log(`User ${data.userId} left project ${data.projectId}`);
});
```

## 🚨 Error Handling

### Client-side Error Handling
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Handle error appropriately
});
```

### Server Response Validation
```javascript
// Always check for success in responses
socket.on('messageSent', (response) => {
  if (response.success) {
    console.log('Message sent successfully');
  } else {
    console.error('Failed to send message');
  }
});
```

## 📱 Frontend Integration Examples

### React Hook Example
```javascript
import { useSocket } from './client-socket-helper.js';

function MyComponent() {
  const { socketManager, isConnected } = useSocket('http://localhost:5000', authToken);
  
  useEffect(() => {
    if (socketManager) {
      socketManager.on('message', (messageData) => {
        // Handle new message
      });
      
      socketManager.on('projectUpdate', (updateData) => {
        // Handle project update
      });
    }
  }, [socketManager]);
  
  const sendMessage = async () => {
    try {
      await socketManager.sendMessage({
        projectId: 'project-123',
        message: 'Hello team!'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
}
```

### Vue 3 Composable Example
```javascript
import { useSocketVue } from './client-socket-helper.js';

export default {
  setup() {
    const { socketManager, isConnected } = useSocketVue('http://localhost:5000', authToken);
    
    watchEffect(() => {
      if (socketManager.value) {
        socketManager.value.on('message', (messageData) => {
          // Handle new message
        });
      }
    });
    
    const sendMessage = async () => {
      try {
        await socketManager.value.sendMessage({
          projectId: 'project-123',
          message: 'Hello team!'
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    };
    
    return {
      isConnected,
      sendMessage
    };
  }
};
```

## 🎯 Best Practices

### 1. Connection Management
- Always check `isConnected` before emitting events
- Handle reconnection gracefully
- Clean up event listeners on component unmount

### 2. Error Handling
- Always listen for response confirmations
- Implement timeout handling for critical operations
- Provide user feedback for connection issues

### 3. Performance
- Use room-based broadcasting to limit unnecessary traffic
- Debounce typing indicators
- Batch multiple updates when possible

### 4. Security
- Validate all incoming data
- Use JWT authentication for all connections
- Implement rate limiting for message sending

## 🧪 Testing

### Running Socket.IO Tests
```bash
# Run the comprehensive Socket.IO test suite
node test-socket-features.js
```

### Manual Testing
```javascript
// Use the provided examples to test specific features
import { SocketExamples } from './client-socket-helper.js';

// Test basic connection
const socketManager = SocketExamples.basicConnection('http://localhost:5000', authToken);

// Test project messaging
await SocketExamples.projectMessaging(socketManager, 'project-123', 'Hello team!');

// Test notifications
await SocketExamples.sendNotificationToUser(socketManager, 'user-456', 'Task assigned');

// Test project progress updates
await SocketExamples.updateProjectProgress(socketManager, 'project-123', 75);
```

## 🔧 Configuration

### Environment Variables
```env
# Server configuration
PORT=5000
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-secret-key

# Socket.IO specific
SOCKET_IO_TIMEOUT=20000
SOCKET_IO_PING_TIMEOUT=60000
```

### Server Configuration Options
```javascript
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});
```

## 📈 Monitoring & Analytics

### Connection Metrics
- Active connections count
- Reconnection attempts
- Message throughput
- Error rates

### Performance Monitoring
- Event emission latency
- Room join/leave frequency
- Memory usage per connection

## 🚀 Production Considerations

### Scaling
- Use Redis adapter for multiple server instances
- Implement connection pooling
- Monitor memory usage

### Security
- Rate limiting per user/IP
- Message content validation
- Connection authentication refresh

### Reliability
- Implement message queuing for offline users
- Add message persistence for critical updates
- Graceful degradation when Socket.IO is unavailable

---

This documentation covers all the real-time features implemented in the Kenstruction Socket.IO backend. The system provides comprehensive real-time functionality for construction project management with robust error handling, security, and scalability considerations. 