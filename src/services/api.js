import axios from 'axios';

// Dynamic API Configuration: use production URL for DigitalOcean
const getApiBaseUrl = () => {
  // FORCE production URL for DigitalOcean to override any caching issues
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    console.log('🔍 API CONFIG: Current host:', host);
    
    if (host.includes('ondigitalocean.app')) {
      const apiUrl = `${window.location.protocol}//${host}/api`;
      console.log('🔍 API CONFIG: Using production API:', apiUrl);
      return apiUrl;
    }
  }
  
  // Use environment variable if set
  if (process.env.REACT_APP_API_URL) {
    console.log('🔍 API CONFIG: Using env var API:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback for local development
  console.log('🔍 API CONFIG: Using localhost fallback');
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();
// Origin for non-API assets (e.g., /uploads). Strip trailing /api
export const API_ORIGIN = (() => {
  try {
    if (API_BASE_URL.endsWith('/api')) return API_BASE_URL.slice(0, -4);
  } catch (_) {}
  return API_BASE_URL;
})();
// Compute a safe same-origin fallback for production deployments
const getSameOriginApi = () => {
  try {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}/api`;
    }
  } catch (_) {}
  return null;
};
const SAME_ORIGIN_API = getSameOriginApi();

// Request throttling to prevent excessive calls
const requestCache = new Map();
// Extend to reduce rapid UI flicker during transient errors
const CACHE_DURATION = 5000; // Cache GET requests for 5 seconds

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and implement caching
api.interceptors.request.use(
  (config) => {
    // Simple caching for GET requests to prevent rapid repeated calls
    if (config.method === 'get') {
      const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
      const cached = requestCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // Return cached response
        return Promise.reject({
          cached: true,
          data: cached.data,
          config: config
        });
      }
    }
    
    // Use original JWT token system - Supabase only handles login gate
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and caching
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get') {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
      requestCache.set(cacheKey, {
        timestamp: Date.now(),
        data: response.data
      });
      
      // Clear old cache entries periodically
      if (requestCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of requestCache.entries()) {
          if (now - value.timestamp > CACHE_DURATION * 3) {
            requestCache.delete(key);
          }
        }
      }
    }
    return response;
  },
  (error) => {
    // Automatic fallback: if network error and a same-origin API is available, retry once
    const isNetworkError = !error.response || error.message === 'Network Error' || error.code === 'ERR_NETWORK';
    const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
    if ((isNetworkError || isTimeout) && !error.config?.__triedSameOrigin && SAME_ORIGIN_API && api.defaults.baseURL !== SAME_ORIGIN_API) {
      try {
        const retryConfig = { ...error.config, baseURL: SAME_ORIGIN_API, __triedSameOrigin: true };
        return api.request(retryConfig);
      } catch (_) {
        // fall through to normal handling
      }
    }

    // Treat 5xx as cacheable no-op for a short period to avoid refetch storms
    if (error.response?.status >= 500 && error.config?.method === 'get') {
      const cacheKey = `${error.config.url}${JSON.stringify(error.config.params || {})}`;
      const cached = requestCache.get(cacheKey);
      if (cached) {
        return Promise.resolve({ data: cached.data, config: error.config, cached: true });
      }
    }
    // Handle cached responses
    if (error.cached) {
      return Promise.resolve({ 
        data: error.data, 
        config: error.config,
        cached: true 
      });
    }
    
    console.error('🚨 API ERROR:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // 401s are handled by login screen transitions in app
    
    // Add more specific error messages for common issues
    // Normalize network/timeout errors across environments
    if (isNetworkError || isTimeout) {
      const base = (error.config && (error.config.baseURL || api.defaults.baseURL)) || API_BASE_URL || 'server';
      error.message = `Network error: Cannot reach ${base}. Please ensure the backend is running.`;
    } else if (error.response?.status >= 500) {
      error.message = 'Server error: The server is experiencing issues. Please try again later.';
    } else if (error.response?.status === 404) {
      error.message = 'Not found: The requested resource could not be found.';
    }
    
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  // Logout user
  logout: () => {
    // Clear both storages to ensure full logout
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (_) {}
    try {
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    } catch (_) {}
    // Don't reload - let the app handle the logout state change
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token =
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('token');
    return Boolean(token);
  },

  // Get stored user data
  getStoredUser: () => {
    const userLocal = localStorage.getItem('user');
    if (userLocal) {
      try { return JSON.parse(userLocal); } catch (_) { /* ignore */ }
    }
    const userSession = sessionStorage.getItem('user');
    if (userSession) {
      try { return JSON.parse(userSession); } catch (_) { /* ignore */ }
    }
    return null;
  },

  // Update user profile (including onboarding data)
  updateUserProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    if (response.data.data && response.data.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  }
};

// Onboarding Service
export const onboardingService = {
  // Get onboarding status
  getOnboardingStatus: async () => {
    const response = await api.get('/onboarding/status');
    return response.data;
  },

  // Update user role during onboarding
  updateRole: async (roleData) => {
    const response = await api.put('/onboarding/role', roleData);
    if (response.data.data && response.data.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Complete onboarding
  completeOnboarding: async (onboardingData) => {
    const response = await api.post('/onboarding/complete', { onboardingData });
    if (response.data.data && response.data.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Get available roles
  getAvailableRoles: async () => {
    const response = await api.get('/onboarding/roles');
    return response.data;
  },

  // Reset onboarding (for testing)
  resetOnboarding: async () => {
    const response = await api.post('/onboarding/reset');
    if (response.data.data && response.data.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
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

  // Get project workflow (using test endpoint temporarily)
  getWorkflow: async (projectId) => {
    const response = await api.get(`/test/workflow/${projectId}`);
    return response.data;
  },

  // Update workflow step (using test endpoint temporarily)
  updateWorkflowStep: async (projectId, stepId, updateData) => {
    const response = await api.put(`/test/workflow/${projectId}/step/${stepId}`, updateData);
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
  },

  // Family Members
  // Get all family members for a customer
  getFamilyMembers: async (customerId) => {
    const response = await api.get(`/customers/${customerId}/family-members`);
    return response.data;
  },

  // Create a new family member
  createFamilyMember: async (customerId, familyMemberData) => {
    const response = await api.post(`/customers/${customerId}/family-members`, familyMemberData);
    return response.data;
  },

  // Update a family member
  updateFamilyMember: async (customerId, familyMemberId, familyMemberData) => {
    const response = await api.put(`/customers/${customerId}/family-members/${familyMemberId}`, familyMemberData);
    return response.data;
  },

  // Delete a family member
  deleteFamilyMember: async (customerId, familyMemberId) => {
    const response = await api.delete(`/customers/${customerId}/family-members/${familyMemberId}`);
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

  // Get recent activities (for dashboard)
    getRecent: async (limit = 10) => {
      const response = await api.get('/activities/recent', { params: { limit } });
      return response.data;
    },

  // Get activities by project
  getByProject: async (projectId) => {
    const response = await api.get(`/activities/project/${projectId}`);
    return response.data;
  },

  // Create new activity
  create: async (activityData) => {
    const response = await api.post('/activities', activityData);
    return response.data;
  }
};

// Company Documents Service
export const companyDocsService = {
  // Customer-facing assets
  listAssets: async (params = {}) => {
    const response = await api.get('/company-docs/assets', { params });
    return response.data;
  },
  uploadAsset: async (file, meta = {}) => {
    const form = new FormData();
    form.append('file', file);
    if (meta.title) form.append('title', meta.title);
    if (meta.description) form.append('description', meta.description);
    if (meta.tags) form.append('tags', JSON.stringify(meta.tags));
    if (meta.section) form.append('section', meta.section);
    if (meta.parentId) form.append('parentId', meta.parentId);
    if (meta.sortOrder !== undefined) form.append('sortOrder', meta.sortOrder.toString());
    const response = await api.post('/company-docs/assets/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },
  deleteAsset: async (id) => {
    const response = await api.delete(`/company-docs/assets/${id}`);
    return response.data;
  },
  downloadAsset: async (id) => {
    const response = await api.get(`/company-docs/assets/${id}/download`, {
      responseType: 'blob',
    });
    return response;
  },
  
  // Enhanced document management
  getAssetPreview: async (id) => {
    const response = await api.get(`/company-docs/assets/${id}/preview`);
    return response.data;
  },
  
  generateThumbnail: async (id) => {
    const response = await api.post(`/company-docs/assets/${id}/thumbnail`);
    return response.data;
  },
  
  getAssetVersions: async (id) => {
    const response = await api.get(`/company-docs/assets/${id}/versions`);
    return response.data;
  },
  
  createAssetVersion: async (id, file, meta = {}) => {
    const form = new FormData();
    form.append('file', file);
    if (meta.description) form.append('description', meta.description);
    if (meta.versionNumber) form.append('versionNumber', meta.versionNumber);
    const response = await api.post(`/company-docs/assets/${id}/versions`, form, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
    return response.data;
  },
  
  getAssetStats: async () => {
    const response = await api.get('/company-docs/assets/stats');
    return response.data;
  },
  
  searchAssets: async (searchParams = {}) => {
    const response = await api.get('/company-docs/assets/search', { params: searchParams });
    return response.data;
  },
  
  // Folder operations
  createFolder: async (folderData) => {
    const response = await api.post('/company-docs/folders', folderData);
    return response.data;
  },
  
  updateAsset: async (id, updateData) => {
    const response = await api.patch(`/company-docs/assets/${id}`, updateData);
    return response.data;
  },
  
  reorderAssets: async (updates) => {
    const response = await api.patch('/company-docs/assets/reorder', { updates });
    return response.data;
  },
  bulkDeleteAssets: async (ids) => {
    const response = await api.delete('/company-docs/assets/bulk', { data: { ids } });
    return response.data;
  },
  bulkMoveAssets: async (ids, parentId) => {
    const response = await api.patch('/company-docs/assets/bulk-move', { ids, parentId });
    return response.data;
  },
  
  // Rename asset
  renameAsset: async (id, newName) => {
    const response = await api.patch(`/company-docs/assets/${id}`, { title: newName });
    return response.data;
  },
  
  // Move asset to different folder
  moveAsset: async (id, parentId) => {
    const response = await api.patch(`/company-docs/assets/${id}`, { parentId });
    return response.data;
  },
  
  // Toggle favorite
  toggleFavorite: async (id) => {
    const response = await api.post(`/company-docs/assets/${id}/favorite`);
    return response.data;
  },
  // Templates
  listTemplates: async () => {
    const response = await api.get('/company-docs/templates');
    return response.data;
  },
  createTemplate: async (file, template) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', template.name);
    if (template.description) form.append('description', template.description);
    if (template.format) form.append('format', template.format);
    if (template.section) form.append('section', template.section);
    if (template.fields !== undefined) {
      const fieldsPayload = typeof template.fields === 'string' ? template.fields : JSON.stringify(template.fields);
      form.append('fields', fieldsPayload);
    }
    const response = await api.post('/company-docs/templates', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },
  // Generation
  generate: async (payload) => {
    const response = await api.post('/company-docs/generate', payload);
    return response.data;
  },
  
  // Delete template
  deleteTemplate: async (id) => {
    const response = await api.delete(`/company-docs/templates/${id}`);
    return response.data;
  },
  
  // Update template
  updateTemplate: async (id, data, file = null) => {
    const form = new FormData();
    if (data.name) form.append('name', data.name);
    if (data.description !== undefined) form.append('description', data.description);
    if (data.format) form.append('format', data.format);
    if (data.section !== undefined) form.append('section', data.section);
    if (data.fields !== undefined) {
      const fieldsPayload = typeof data.fields === 'string' ? data.fields : JSON.stringify(data.fields);
      form.append('fields', fieldsPayload);
    }
    if (file) form.append('file', file);
    
    const response = await api.patch(`/company-docs/templates/${id}`, form, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
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

// Project Messages Service (per-project chat)
export const projectMessagesService = {
  // List messages for a project (paginated via params)
  getByProject: async (projectId, params = {}) => {
    const response = await api.get(`/project-messages/${projectId}`, { params });
    return response.data;
  },

  // Create a new message in a project
  // Accepts optional `recipients` array of user IDs and forwards it to the backend
  create: async (projectId, { content, subject, priority = 'MEDIUM', parentMessageId, recipients } = {}) => {
    const payload = {
      content,
      subject,
      priority,
    };
    if (parentMessageId) payload.parentMessageId = parentMessageId;
    if (Array.isArray(recipients) && recipients.length > 0) payload.recipients = recipients;

    const response = await api.post(`/project-messages/${projectId}`, payload);
    return response.data;
  },

  // Mark message as read
  markRead: async (messageId) => {
    const response = await api.patch(`/project-messages/${messageId}/read`);
    return response.data;
  },

  // Get a message thread (message + replies)
  getThread: async (messageId) => {
    const response = await api.get(`/project-messages/thread/${messageId}`);
    return response.data;
  },

  // Delete a message
  delete: async (messageId) => {
    const response = await api.delete(`/project-messages/${messageId}`);
    return response.data;
  },
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
  },
  // Create notification (manager and above)
  create: async (payload) => {
    const response = await api.post('/notifications', payload);
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

// Bubbles AI Assistant Service
export const bubblesService = {
  // Chat with Bubbles AI Assistant
  chat: async (message, projectId = null, context = {}) => {
    const payload = { message, context };
    if (projectId !== null && projectId !== undefined && String(projectId).trim() !== '') {
      payload.projectId = String(projectId);
    }
    const response = await api.post('/bubbles/chat', payload);
    return response.data;
  },

  // Complete a pending action with selected recipients
  completeAction: async (pendingAction, selectedRecipientIds, customEmails = []) => {
    const response = await api.post('/bubbles/complete-action', {
      pendingAction,
      selectedRecipientIds,
      customEmails
    });
    return response.data;
  },

  // Get current step for selected project
  getCurrentStep: async (projectId) => {
    const response = await api.get(`/bubbles/project/${projectId}/current-step`);
    return response.data;
  },

  // Execute Bubbles action
  executeAction: async (actionType, parameters = {}) => {
    const response = await api.post('/bubbles/action', {
      actionType,
      parameters
    });
    return response.data;
  },

  // Get conversation history
  getHistory: async (limit = 20) => {
    const response = await api.get('/bubbles/history', {
      params: { limit }
    });
    return response.data;
  },

  // Reset conversation context
  resetContext: async () => {
    const response = await api.post('/bubbles/reset');
    return response.data;
  },

  // Get Bubbles status and capabilities
  getStatus: async () => {
    const response = await api.get('/bubbles/status');
    return response.data;
  },

  // Quick actions
  quickActions: {
    // Mark workflow item as complete
    completeTask: async (projectId, lineItemId) => {
      return await bubblesService.executeAction('complete_task', {
        projectId,
        lineItemId
      });
    },

    // Create new alert
    createAlert: async (projectId, message, priority = 'MEDIUM') => {
      return await bubblesService.executeAction('create_alert', {
        projectId,
        message,
        priority
      });
    },

    // List active projects
    listProjects: async () => {
      return await bubblesService.executeAction('list_projects');
    },

    // Check current alerts
    checkAlerts: async () => {
      return await bubblesService.executeAction('check_alerts');
    }
  },

  // AI Insights
  insights: {
    // Get project insights
    getProjectInsights: async (projectId) => {
      const response = await api.get(`/bubbles/insights/project/${projectId}`);
      return response.data;
    },

    // Get portfolio insights
    getPortfolioInsights: async () => {
      const response = await api.get('/bubbles/insights/portfolio');
      return response.data;
    },

    // Get project completion prediction
    getProjectPrediction: async (projectId) => {
      const response = await api.get(`/bubbles/insights/prediction/${projectId}`);
      return response.data;
    },

    // Get project risk analysis
    getProjectRisks: async (projectId) => {
      const response = await api.get(`/bubbles/insights/risks/${projectId}`);
      return response.data;
    },

    // Get optimization recommendations
    getOptimizationRecommendations: async (projectId) => {
      const response = await api.get(`/bubbles/insights/optimization/${projectId}`);
      return response.data;
    }
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

  // Mark step as complete (NEW: uses comprehensive workflow completion)
  completeStep: async (alertId, projectId, lineItemId, notes = '') => {
    const response = await api.post('/workflows/complete-item', { 
      projectId,
      lineItemId,
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
  },
  
  // Dismiss/complete an alert
  dismissAlert: async (alertId) => {
    const response = await api.patch(`/alerts/${alertId}/dismiss`);
    return response.data;
  },
  
  // Mark alert as complete
  completeAlert: async (alertId) => {
    const response = await api.patch(`/alerts/${alertId}/complete`);
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

  // Complete workflow line item (MODERNIZED: uses new workflow system)
  completeStep: async (projectId, lineItemId, notes = '') => {
    console.log(`🚀 Frontend: Completing line item ${lineItemId} for project ${projectId}`);
    const response = await api.post('/workflows/complete-item', {
      projectId,
      lineItemId,
      notes: notes || ''
    });
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
  },

  // Delete a user
  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  }
};

// Roles Service
export const rolesService = {
  // Get available users used in Settings -> Roles (endpoint: /api/roles/users)
  getUsers: async () => {
    const response = await api.get('/roles/users');
    // Backend returns { success: true, data: formattedUsers }
    return response.data;
  }
};

// Phase Override Service
export const phaseOverrideService = {
  // Get available phases for override
  getAvailablePhases: async () => {
    const response = await api.get('/phase-override/phases');
    return response.data;
  },

  // Get current phase status for a project
  getProjectPhaseStatus: async (projectId) => {
    const response = await api.get(`/phase-override/project/${projectId}/status`);
    return response.data;
  },

  // Override project phase
  overrideProjectPhase: async (projectId, toPhase, reason, userId) => {
    const response = await api.post(`/phase-override/project/${projectId}/override`, {
      toPhase,
      reason,
      userId
    });
    return response.data;
  },

  // Revert phase override
  revertPhaseOverride: async (projectId, overrideId, userId) => {
    const response = await api.post(`/phase-override/project/${projectId}/revert`, {
      overrideId,
      userId
    });
    return response.data;
  },

  // Get suppressed alerts for a project
  getSuppressedAlerts: async (projectId) => {
    const response = await api.get(`/phase-override/project/${projectId}/suppressed-alerts`);
    return response.data;
  }
};

// Workflow Import Service
export const workflowImportService = {
  // Upload file for parsing
  uploadFile: async (formData) => {
    const response = await api.post('/workflow-import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Get preview data for an import session
  getPreview: async (importId) => {
    const response = await api.get(`/workflow-import/preview/${importId}`);
    return response.data;
  },

  // Confirm and execute import
  confirmImport: async (importId, data) => {
    const response = await api.post(`/workflow-import/confirm/${importId}`, data);
    return response.data;
  },

  // Download template file
  downloadTemplate: async (format = 'xlsx') => {
    const response = await api.get('/workflow-import/template', {
      params: { format },
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `workflow_template.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Cancel import session
  cancelImport: async (importId) => {
    const response = await api.delete(`/workflow-import/cancel/${importId}`);
    return response.data;
  }
};

// Feedback Service
export const feedbackService = {
  getFeedback: (params = {}) => api.get('/feedback', { params }),
  getFeedbackById: (id) => api.get(`/feedback/${id}`),
  createFeedback: (feedbackData) => api.post('/feedback', feedbackData),
  updateFeedback: (id, updates) => api.patch(`/feedback/${id}`, updates),
  deleteFeedback: (id) => api.delete(`/feedback/${id}`),
  vote: (feedbackId, action) => api.post(`/feedback/${feedbackId}/vote`, { action }),
  updateStatus: (feedbackId, updates) => api.patch(`/feedback/${feedbackId}/status`, updates),
  addComment: (feedbackId, commentData) => api.post(`/feedback/${feedbackId}/comments`, commentData),
  getComments: (feedbackId) => api.get(`/feedback/${feedbackId}/comments`),
  uploadFile: (file, type = 'attachment') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getNotifications: (userId) => api.get(`/users/${userId}/notifications`),
  markNotificationAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  markAllNotificationsAsRead: (userId) => api.patch(`/users/${userId}/notifications/read-all`),
  subscribeToFeedback: (feedbackId) => api.post(`/feedback/${feedbackId}/subscribe`),
  unsubscribeFromFeedback: (feedbackId) => api.delete(`/feedback/${feedbackId}/subscribe`),
  getFeedbackAnalytics: (params = {}) => api.get('/feedback/analytics', { params }),
  getFeedbackStats: () => api.get('/feedback/stats'),
  searchFeedback: (query, filters = {}) => api.get('/feedback/search', { params: { q: query, ...filters } }),
  getTags: () => api.get('/tags'),
  createTag: (tagData) => api.post('/tags', tagData),
  findDuplicates: (feedbackId) => api.get(`/feedback/${feedbackId}/duplicates`),
  mergeFeedback: (sourceId, targetId) => api.post(`/feedback/${sourceId}/merge`, { targetId })
};

// Export the main API instance for custom requests
export default api; 