import axios from 'axios';

const getApiBaseUrl = () => {
  // Check if we're in the browser environment
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    const protocol = window.location.protocol;
    
    // Check for DigitalOcean App Platform
    if (host.includes('ondigitalocean.app')) {
      return `${protocol}//${host}/api/company-docs-enhanced`;
    }
    
    // Check for local development with environment variable
    if (process.env.REACT_APP_API_URL) {
      const base = process.env.REACT_APP_API_URL.replace(/\/$/, '');
      return `${base}/company-docs-enhanced`;
    }
    
    // Default local development
    return 'http://localhost:5000/api/company-docs-enhanced';
  }
  
  // Server-side fallback
  return process.env.REACT_APP_API_URL 
    ? `${process.env.REACT_APP_API_URL.replace(/\/$/, '')}/company-docs-enhanced`
    : 'http://localhost:5000/api/company-docs-enhanced';
};

// Internal helper for authenticated blob download
const downloadAssetBlob = async (id) => {
  const res = await api.get(`/assets/${id}/download`, { responseType: 'blob' });
  const contentType = res.headers?.['content-type'] || 'application/octet-stream';
  const filename = getFilenameFromDisposition(res.headers?.['content-disposition']) || 'download';
  const blob = new Blob([res.data], { type: contentType });
  return { blob, contentType, filename };
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token =
    (typeof sessionStorage !== 'undefined' && (sessionStorage.getItem('authToken') || sessionStorage.getItem('token'))) ||
    (typeof localStorage !== 'undefined' && (localStorage.getItem('authToken') || localStorage.getItem('token')));
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Helper to parse filename from Content-Disposition header
const getFilenameFromDisposition = (cd) => {
  try {
    if (!cd || typeof cd !== 'string') return null;
    // Try RFC 5987 format first: filename*=UTF-8''...
    const rfc5987 = cd.match(/filename\*=UTF-8''([^;]+)/i);
    if (rfc5987 && rfc5987[1]) return decodeURIComponent(rfc5987[1]);
    // Fallback to simple filename="name.ext" or filename=name.ext
    const simple = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
    if (simple && simple[1]) return simple[1];
  } catch (_) {}
  return null;
};

export const assetsService = {
  list: async ({ parentId = null, search = '', page = 1, limit = 50, sortBy, sortOrder, type } = {}) => {
    const params = { parentId: parentId === null ? 'null' : parentId, page, limit };
    if (search) params.search = search;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    if (type) params.type = type;
    const res = await api.get('/assets', { params });
    return res.data?.data;
  },
  // Convenience helper to list only folders at a given level
  listFolders: async ({ parentId = null, sortBy = 'title', sortOrder = 'asc', limit = 1000 } = {}) => {
    const data = await assetsService.list({ parentId, type: 'FOLDER', sortBy, sortOrder, limit });
    return data?.assets || [];
  },
  // Fetch a single asset by id
  get: async (id) => {
    const res = await api.get(`/assets/${id}`);
    return res.data?.data?.asset;
  },
  // Get presigned URL for viewing (no download)
  getViewUrl: async (id) => {
    const res = await api.get(`/assets/${id}/view-url`);
    return res.data?.data;
  },
  createFolder: async ({ name, parentId = null, description = '', metadata = null }) => {
    try {
      console.log('Creating folder with payload:', { name, parentId, description, metadata });

      // Ensure parentId is properly formatted (null or string, not 'null' or 'undefined')
      const cleanParentId = (!parentId || parentId === 'null' || parentId === 'undefined') ? null : parentId;

      // Build the payload with correct field names matching the backend validation
      // Use a valid DocumentSection enum value
      const section = 'OFFICE_DOCUMENTS'; // Using OFFICE_DOCUMENTS as a valid section

      const payload = {
        name: name, // Backend validation expects 'name' not 'title'
        title: name, // Also include title for the Prisma model
        folderName: name,
        description: description || '',
        parentId: cleanParentId,
        section: section,
        isPublic: false,
        accessLevel: 'private',
        type: 'FOLDER',
        tags: [],
        isActive: true,
        version: 1,
        metadata: metadata // Include metadata if provided
      };

      console.log('Using section:', section);

      console.log('Sending payload to /folders:', payload);

      const res = await api.post('/folders', payload);
      console.log('Folder created successfully:', res.data);

      return res.data?.data?.folder || res.data?.data || res.data;
    } catch (error) {
      console.error('Error in createFolder:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      
      // Create a more descriptive error
      const errorMessage = error.response?.data?.message || 'Failed to create folder';
      const err = new Error(errorMessage);
      err.response = error.response;
      throw err;
    }
  },
  updateAsset: async (id, data) => {
    const res = await api.patch(`/assets/${id}`, data);
    return res.data?.data?.asset;
  },
  bulkOperation: async ({ operation, assetIds, data = {} }) => {
    const res = await api.post('/bulk-operation', { operation, assetIds, data });
    return res.data?.data;
  },
  uploadFiles: async ({ files, parentId = null, description = '', tags = [], metadata = {}, onUploadProgress = undefined } = {}) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    if (parentId !== null) form.append('parentId', parentId);
    if (description) form.append('description', description);
    if (tags?.length) form.append('tags', JSON.stringify(tags));
    if (metadata && Object.keys(metadata).length > 0) form.append('metadata', JSON.stringify(metadata));
    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    if (typeof onUploadProgress === 'function') config.onUploadProgress = onUploadProgress;

    try {
      const res = await api.post('/assets/upload', form, config);
      console.log('Upload response:', res);

      // Check if the response indicates success
      if (res.data && res.data.success) {
        return res.data.data;
      } else {
        throw new Error(res.data?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error in assetsService:', error);
      throw error;
    }
  },
  downloadUrl: (id) => `${API_BASE_URL}/assets/${id}/download`,

  // Authenticated download helpers (avoid opening URL without auth header)
  downloadBlob: downloadAssetBlob,

  openInNewTab: async (id) => {
    // Open a tab synchronously to avoid popup blockers, then stream content into it
    const popup = (() => {
      try {
        return window.open('about:blank', '_blank');
      } catch (_) {
        return null;
      }
    })();

    try {
      const { blob } = await downloadAssetBlob(id);
      const url = URL.createObjectURL(blob);
      if (popup) {
        // Navigate the pre-opened tab to the blob URL
        popup.location.href = url;
      } else {
        // Fallback: same-tab navigation if popup was blocked
        window.location.href = url;
      }
      // Revoke later to free memory
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      // Close the placeholder tab if something went wrong
      try { if (popup && !popup.closed) popup.close(); } catch (_) {}
      throw err;
    }
  },

  saveToDisk: async (id, fallbackName = 'download') => {
    const { blob, filename } = await downloadAssetBlob(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
};

export default assetsService;
