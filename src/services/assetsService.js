import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    if (host.includes('ondigitalocean.app')) {
      return `${window.location.protocol}//${host}/api/company-docs-enhanced`;
    }
  }
  if (process.env.REACT_APP_API_URL) return `${process.env.REACT_APP_API_URL.replace(/\/$/, '')}/company-docs-enhanced`;
  return 'http://localhost:5000/api/company-docs-enhanced';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const assetsService = {
  list: async ({ parentId = null, search = '', page = 1, limit = 50, sortBy, sortOrder } = {}) => {
    const params = { parentId: parentId === null ? 'null' : parentId, page, limit };
    if (search) params.search = search;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    const res = await api.get('/assets', { params });
    return res.data?.data;
  },
  createFolder: async ({ name, parentId = null, description = '' }) => {
    const res = await api.post('/folders', { name, parentId, description });
    return res.data?.data?.folder;
  },
  updateAsset: async (id, data) => {
    const res = await api.patch(`/assets/${id}`, data);
    return res.data?.data?.asset;
  },
  bulkOperation: async ({ operation, assetIds, data = {} }) => {
    const res = await api.post('/bulk-operation', { operation, assetIds, data });
    return res.data?.data;
  },
  uploadFiles: async ({ files, parentId = null, description = '', tags = [] }) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    if (parentId !== null) form.append('parentId', parentId);
    if (description) form.append('description', description);
    if (tags?.length) form.append('tags', JSON.stringify(tags));
    const res = await api.post('/assets/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data?.data;
  },
  downloadUrl: (id) => `${API_BASE_URL}/assets/${id}/download`
};

export default assetsService;
