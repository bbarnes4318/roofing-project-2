import axios from 'axios';

// Dynamic API Configuration
const getApiBaseUrl = () => {
  // Check if we're in production (Vercel)
  if (window.location.hostname.includes('vercel.app') || 
      window.location.hostname.includes('your-domain.com') ||
      window.location.hostname !== 'localhost') {
    // Use the current domain for production
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  // Local development
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('authToken') || localStorage.getItem('token');
    
    // If no token exists, create a demo token for Sarah Owner
    if (!token) {
      const demoToken = 'demo-sarah-owner-token-' + Date.now();
      localStorage.setItem('authToken', demoToken);
      localStorage.setItem('user', JSON.stringify({
        _id: 'demo-sarah-owner-id',
        firstName: 'Sarah',
        lastName: 'Owner',
        email: 'sarah@example.com',
        role: 'admin',
        avatar: 'SO',
        company: 'Kenstruction',
        position: 'Owner',
        department: 'Management',
        isVerified: true
      }));
      token = demoToken;
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token but don't redirect to login since login is disabled
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.warn('Authentication failed, but login is disabled');
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    // Backend returns: { success: true, data: { user, token }, message: '...' }
    if (response.data.data && response.data.data.token) {
      localStorage.setItem('authToken', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    // Backend returns: { success: true, data: { user, token }, message: '...' }
    if (response.data.data && response.data.data.token) {
      localStorage.setItem('authToken', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Since login is disabled, just reload the page
    window.location.reload();
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Check if user is authenticated (always true since login is disabled)
  isAuthenticated: () => {
    return true; // Authentication disabled - always allow access
  },

  // Get stored user data
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    if (user) {
      return JSON.parse(user);
    }
    
    // Return mock user data when no authentication is present
    return {
      _id: 'mock-user-123',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@kenstruction.com',
      role: 'admin',
      avatar: 'DU',
      company: 'Kenstruction',
      position: 'Demo User',
      department: 'Operations',
      isVerified: true
    };
  },

  // Update user workflow assignment
  updateWorkflowAssignment: async (workflowAssignment) => {
    const response = await api.put('/auth/workflow-assignment', { workflowAssignment });
    // Update stored user data with new workflow assignment
    if (response.data.data && response.data.data.user) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...response.data.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    return response.data;
  },

  // Update other user's workflow assignment (admin only)
  updateOtherUserWorkflowAssignment: async (userId, workflowAssignment) => {
    const response = await api.put(`/auth/workflow-assignment/${userId}`, { workflowAssignment });
    return response.data;
  }
};

// Projects Service
export const projectsService = {
  // Get all projects
  getAll: async (params = {}) => {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  // Get project by ID
  getById: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // Create new project
  create: async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  // Update project
  update: async (id, projectData) => {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },

  // Delete project and all associated data
  delete: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  // Archive/unarchive project
  archive: async (id) => {
    const response = await api.patch(`/projects/${id}/archive`);
    return response.data;
  },

  // Get archived projects
  getArchived: async (params = {}) => {
    const response = await api.get('/projects', { 
      params: { ...params, includeArchived: 'only' } 
    });
    return response.data;
  },

  // Update project progress
  updateProgress: async (id, progress) => {
    const response = await api.patch(`/projects/${id}/progress`, { progress });
    return response.data;
  },

  // Update project status
  updateStatus: async (id, status) => {
    const response = await api.patch(`/projects/${id}/status`, { status });
    return response.data;
  },

  // Get project statistics
  getStats: async () => {
    const response = await api.get('/projects/stats/overview');
    return response.data;
  },

  // Search projects
  search: async (query) => {
    const response = await api.get(`/projects/search/query?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Get project workflow
  getWorkflow: async (projectId) => {
    const response = await api.get(`/workflows/project/${projectId}`);
    return response.data;
  },

  // Update workflow step
  updateWorkflowStep: async (projectId, stepId, updateData) => {
    const response = await api.put(`/workflows/project/${projectId}/workflow/${stepId}`, updateData);
    return response.data;
  }
};

// Tasks Service
export const tasksService = {
  // Get all tasks
  getAll: async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  // Get task by ID
  getById: async (id) => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  // Create new task
  create: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  // Update task
  update: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  // Delete task
  delete: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  // Update task status
  updateStatus: async (id, status) => {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    return response.data;
  },

  // Assign task
  assign: async (id, assignedTo) => {
    const response = await api.patch(`/tasks/${id}/assign`, { assignedTo });
    return response.data;
  },

  // Get tasks by project
  getByProject: async (projectId) => {
    const response = await api.get(`/tasks/project/${projectId}`);
    return response.data;
  },

  // Get tasks assigned to user
  getAssignedToUser: async (assignedTo) => {
    const response = await api.get(`/tasks/assigned/${assignedTo}`);
    return response.data;
  },

  // Add comment to task
  addComment: async (id, content) => {
    const response = await api.post(`/tasks/${id}/comments`, { content });
    return response.data;
  }
};

// Customers Service
export const customersService = {
  // Get all customers
  getAll: async (params = {}) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  // Get customer by ID
  getById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  // Create new customer
  create: async (customerData) => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },

  // Update customer
  update: async (id, customerData) => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },

  // Delete customer
  delete: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  // Search customers
  search: async (query) => {
    const response = await api.get(`/customers/search/query?q=${encodeURIComponent(query)}`);
    return response.data;
  }
};

// Activities Service
export const activitiesService = {
  // Get all activities
  getAll: async (params = {}) => {
    const response = await api.get('/activities', { params });
    return response.data;
  },

  // Get activities by project
  getByProject: async (projectId) => {
    const response = await api.get(`/activities/project/${projectId}`);
    return response.data;
  },

  // Get recent activities
  getRecent: async (limit = 10) => {
    const response = await api.get(`/activities/recent?limit=${limit}`);
    return response.data;
  },

  // Create new activity
  create: async (activityData) => {
    const response = await api.post('/activities', activityData);
    return response.data;
  }
};

// Messages Service
export const messagesService = {
  // Get conversation messages
  getConversation: async (conversationId) => {
    const response = await api.get(`/messages/${conversationId}`);
    return response.data;
  },

  // Send message
  send: async (messageData) => {
    const response = await api.post('/messages', messageData);
    return response.data;
  },

  // Get conversations
  getConversations: async () => {
    const response = await api.get('/messages/conversations');
    return response.data;
  }
};

// Documents Service
export const documentsService = {
  // Get all documents
  getAll: async (params = {}) => {
    const response = await api.get('/documents', { params });
    return response.data;
  },

  // Get documents by project
  getByProject: async (projectId) => {
    const response = await api.get(`/documents/project/${projectId}`);
    return response.data;
  },

  // Upload document
  upload: async (formData) => {
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete document
  delete: async (id) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  // Download document
  download: async (id) => {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response;
  }
};

// Notifications Service
export const notificationsService = {
  // Get all notifications
  getAll: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread/count');
    return response.data;
  },

  // Mark as read
  markAsRead: async (id) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  }
};

// Calendar Events Service
export const calendarService = {
  // Get all events
  getAll: async (params = {}) => {
    const response = await api.get('/calendar-events', { params });
    return response.data;
  },

  // Create event
  create: async (eventData) => {
    const response = await api.post('/calendar-events', eventData);
    return response.data;
  },

  // Update event
  update: async (id, eventData) => {
    const response = await api.put(`/calendar-events/${id}`, eventData);
    return response.data;
  },

  // Delete event
  delete: async (id) => {
    const response = await api.delete(`/calendar-events/${id}`);
    return response.data;
  }
};

// AI Service
export const aiService = {
  // Chat with AI
  chat: async (message) => {
    const response = await api.post('/ai/chat', { message });
    return response.data;
  },

  // Get AI capabilities
  getCapabilities: async () => {
    const response = await api.get('/ai/capabilities');
    return response.data;
  },

  // Analyze project
  analyzeProject: async (projectId) => {
    const response = await api.post('/ai/analyze-project', { projectId });
    return response.data;
  }
};

// Workflow Alerts Service
export const workflowAlertsService = {
  // Get all alerts for current user
  getAll: async (params = {}) => {
    const response = await api.get('/alerts', { params });
    return response.data;
  },

  // Get alerts by project
  getByProject: async (projectId) => {
    const response = await api.get(`/alerts/project/${projectId}`);
    return response.data;
  },

  // Get alerts by user (same as getAll since it's user-specific)
  getByUser: async (userId) => {
    const response = await api.get('/alerts', { params: { userId } });
    return response.data;
  },

  // Get alerts by priority
  getByPriority: async (priority) => {
    const response = await api.get('/alerts', { params: { priority } });
    return response.data;
  },

  // Get alerts statistics
  getSummary: async () => {
    const response = await api.get('/alerts/stats');
    return response.data;
  },

  // Mark alert as read
  acknowledge: async (alertId) => {
    const response = await api.patch(`/alerts/${alertId}/read`);
    return response.data;
  },

  // Delete alert (dismiss)
  dismiss: async (alertId) => {
    const response = await api.delete(`/alerts/${alertId}`);
    return response.data;
  },

  // Mark step as complete (completes the workflow step)
  completeStep: async (alertId, workflowId, stepId, notes = '') => {
    const response = await api.post(`/workflows/${workflowId}/steps/${stepId}/complete`, { 
      notes,
      alertId // Include alert ID to mark it as resolved
    });
    return response.data;
  },

  // Mark all alerts as read
  markAllAsRead: async () => {
    const response = await api.patch('/alerts/read-all');
    return response.data;
  },

  // Create general alert
  create: async (alertData) => {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  // Trigger manual workflow alert check
  triggerManualCheck: async () => {
    const response = await api.post('/alerts/check-workflow');
    return response.data;
  },

  // Get workflow alert statistics
  getWorkflowStats: async () => {
    const response = await api.get('/alerts/workflow-stats');
    return response.data;
  },

  // Assign alert to another team member
  assignAlert: async (alertId, assignedToUserId) => {
    const response = await api.patch(`/alerts/${alertId}/assign`, { 
      assignedTo: assignedToUserId 
    });
    return response.data;
  }
};

// Workflow Management Service
export const workflowService = {
  // Get workflow by project
  getByProject: async (projectId) => {
    const response = await api.get(`/workflows/project/${projectId}`);
    return response.data;
  },

  // Create workflow for project
  create: async (projectId, workflowData) => {
    const response = await api.post(`/workflows/project/${projectId}`, workflowData);
    return response.data;
  },

  // Update workflow step
  updateStep: async (workflowId, stepId, updateData) => {
    const response = await api.put(`/workflows/${workflowId}/steps/${stepId}`, updateData);
    return response.data;
  },

  // Complete workflow step
  completeStep: async (workflowId, stepId) => {
    const response = await api.post(`/workflows/${workflowId}/steps/${stepId}/complete`);
    return response.data;
  },

  // Complete sub-task
  completeSubTask: async (workflowId, stepId, subTaskId) => {
    const response = await api.post(`/workflows/${workflowId}/steps/${stepId}/subtasks/${subTaskId}/complete`);
    return response.data;
  },

  // Assign team member to step
  assignTeamMember: async (workflowId, stepId, userId) => {
    const response = await api.put(`/workflows/${workflowId}/steps/${stepId}/assign`, { assignedTo: userId });
    return response.data;
  },

  // Get workflow progress
  getProgress: async (projectId) => {
    const response = await api.get(`/workflows/project/${projectId}/alerts`);
    return response.data;
  },

  // Get workflow statistics
  getStats: async () => {
    const response = await api.get('/workflows/stats');
    return response.data;
  }
};

// Health Service
export const healthService = {
  // Get basic health
  getHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Get detailed health
  getDetailedHealth: async () => {
    const response = await api.get('/health/detailed');
    return response.data;
  }
};

// Users Service
export const usersService = {
  // Get team members for assignment
  getTeamMembers: async () => {
    const response = await api.get('/users/team-members');
    return response.data;
  }
};

// Export the main API instance for custom requests
export default api; 