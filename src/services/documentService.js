import axios from 'axios';

// Use the same API configuration as the main app
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    console.log('🔍 DOCUMENT SERVICE API CONFIG: Current host:', host);
    
    // If we're NOT on localhost, use same-origin API (production)
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      const apiUrl = `${window.location.protocol}//${host}/api`;
      console.log('🔍 DOCUMENT SERVICE API CONFIG: Using production API:', apiUrl);
      return apiUrl;
    }
  }
  
  // Use environment variable if set
  if (process.env.REACT_APP_API_URL) {
    console.log('🔍 DOCUMENT SERVICE API CONFIG: Using env var API:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback for local development
  console.log('🔍 DOCUMENT SERVICE API CONFIG: Using localhost fallback');
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const documentService = {
  // Get documents with filtering and pagination
  getDocuments: async (params = {}) => {
    const response = await api.get('/documents-enhanced', { params });
    return response.data;
  },

  // Get single document by ID
  getDocument: async (id) => {
    const response = await api.get(`/documents-enhanced/${id}`);
    return response.data;
  },

  // Upload new document
  uploadDocument: async (formData) => {
    const response = await api.post('/documents-enhanced', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update document
  updateDocument: async (id, data) => {
    const response = await api.put(`/documents-enhanced/${id}`, data);
    return response.data;
  },

  // Delete document
  deleteDocument: async (id) => {
    const response = await api.delete(`/documents-enhanced/${id}`);
    return response.data;
  },

  // Download document
  downloadDocument: async (id) => {
    const response = await api.post(`/documents-enhanced/${id}/download`);
    return response.data;
  },

  // Download document (GET method for blob response)
  download: async (id) => {
    const response = await api.get(`/documents-enhanced/${id}/download`, {
      responseType: 'blob'
    });
    return response;
  },

  // Toggle document favorite
  toggleFavorite: async (id) => {
    const response = await api.post(`/documents-enhanced/${id}/favorite`);
    return response.data;
  },

  // Get document categories
  getCategories: async () => {
    const response = await api.get('/documents-enhanced/categories');
    return response.data;
  },

  // Get document versions
  getDocumentVersions: async (id) => {
    const response = await api.get(`/documents-enhanced/${id}/versions`);
    return response.data;
  },

  // Add document comment
  addComment: async (id, comment) => {
    const response = await api.post(`/documents-enhanced/${id}/comments`, comment);
    return response.data;
  },

  // Get document comments
  getComments: async (id) => {
    const response = await api.get(`/documents-enhanced/${id}/comments`);
    return response.data;
  },

  // Update document comment
  updateComment: async (documentId, commentId, comment) => {
    const response = await api.put(`/documents-enhanced/${documentId}/comments/${commentId}`, comment);
    return response.data;
  },

  // Delete document comment
  deleteComment: async (documentId, commentId) => {
    const response = await api.delete(`/documents-enhanced/${documentId}/comments/${commentId}`);
    return response.data;
  },

  // Get document access permissions
  getDocumentAccess: async (id) => {
    const response = await api.get(`/documents-enhanced/${id}/access`);
    return response.data;
  },

  // Update document access permissions
  updateDocumentAccess: async (id, accessData) => {
    const response = await api.put(`/documents-enhanced/${id}/access`, accessData);
    return response.data;
  },

  // Search documents
  searchDocuments: async (query, filters = {}) => {
    const response = await api.get('/documents-enhanced/search', {
      params: { q: query, ...filters }
    });
    return response.data;
  },

  // Get user's favorite documents
  getFavoriteDocuments: async (params = {}) => {
    const response = await api.get('/documents-enhanced/favorites', { params });
    return response.data;
  },

  // Get recent documents
  getRecentDocuments: async (limit = 10) => {
    const response = await api.get('/documents-enhanced/recent', {
      params: { limit }
    });
    return response.data;
  },

  // Get document statistics
  getDocumentStats: async () => {
    const response = await api.get('/documents-enhanced/stats');
    return response.data;
  },

  // Bulk operations
  bulkDownload: async (documentIds) => {
    const response = await api.post('/documents-enhanced/bulk-download', {
      documentIds
    });
    return response.data;
  },

  bulkDelete: async (documentIds) => {
    const response = await api.post('/documents-enhanced/bulk-delete', {
      documentIds
    });
    return response.data;
  },

  bulkUpdate: async (documentIds, updateData) => {
    const response = await api.post('/documents-enhanced/bulk-update', {
      documentIds,
      updateData
    });
    return response.data;
  },

  // Document templates
  getTemplates: async (category = null) => {
    const response = await api.get('/documents-enhanced/templates', {
      params: category ? { category } : {}
    });
    return response.data;
  },

  // Create document from template
  createFromTemplate: async (templateId, customizations = {}) => {
    const response = await api.post(`/documents-enhanced/templates/${templateId}/create`, customizations);
    return response.data;
  },

  // Document sharing
  shareDocument: async (id, shareData) => {
    const response = await api.post(`/documents-enhanced/${id}/share`, shareData);
    return response.data;
  },

  // Get shared documents
  getSharedDocuments: async (params = {}) => {
    const response = await api.get('/documents-enhanced/shared', { params });
    return response.data;
  },

  // Revoke document sharing
  revokeShare: async (id, shareId) => {
    const response = await api.delete(`/documents-enhanced/${id}/share/${shareId}`);
    return response.data;
  },

  // Document analytics
  getDocumentAnalytics: async (id, period = '30d') => {
    const response = await api.get(`/documents-enhanced/${id}/analytics`, {
      params: { period }
    });
    return response.data;
  },

  // Get popular documents
  getPopularDocuments: async (params = {}) => {
    const response = await api.get('/documents-enhanced/popular', { params });
    return response.data;
  },

  // Document versioning
  createNewVersion: async (id, formData) => {
    const response = await api.post(`/documents-enhanced/${id}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Restore document version
  restoreVersion: async (id, versionId) => {
    const response = await api.post(`/documents-enhanced/${id}/versions/${versionId}/restore`);
    return response.data;
  },

  // Archive document
  archiveDocument: async (id) => {
    const response = await api.post(`/documents-enhanced/${id}/archive`);
    return response.data;
  },

  // Restore archived document
  restoreDocument: async (id) => {
    const response = await api.post(`/documents-enhanced/${id}/restore`);
    return response.data;
  },

  // Get archived documents
  getArchivedDocuments: async (params = {}) => {
    const response = await api.get('/documents-enhanced/archived', { params });
    return response.data;
  }
};

export default documentService;
