import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    if (host.includes('ondigitalocean.app')) {
      return `${window.location.protocol}//${host}/api`;
    }
  }
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const ragService = {
  initiateUpload: async ({ jobId, projectId, fileName, fileType, size, uploaderId, metadata }) => {
    const res = await api.post('/upload/initiate', { jobId, projectId, fileName, fileType, size, uploaderId, metadata });
    return res.data?.data;
  },
  completeUpload: async ({ uploadId, jobId, key, fileUrl, checksum, metadata }) => {
    const res = await api.post('/upload/complete', { uploadId, jobId, key, fileUrl, checksum, metadata });
    return res.data?.data;
  },
  proxyUpload: async ({ file, projectId, metadata = {} }) => {
    const form = new FormData();
    form.append('file', file);
    if (projectId != null) form.append('projectId', projectId);
    form.append('metadata', JSON.stringify(metadata));
    const res = await api.post('/upload/proxy', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data?.data;
  },
  listFiles: async ({ projectId, type, tags, limit } = {}) => {
    const res = await api.get('/files', { params: { projectId, type, tags, limit } });
    return res.data?.data;
  },
  listFilesSemantic: async ({ projectId, query, limit = 12 }) => {
    const res = await api.get('/files', { params: { projectId, semantic_query: query, limit } });
    return res.data?.data;
  },
  getFile: async (fileId) => {
    const res = await api.get(`/files/${fileId}`);
    return res.data?.data;
  },
  assistantQuery: async ({ projectId, query, userId, contextFileIds = [], mode = 'chat' }) => {
    const res = await api.post('/assistant/query', { projectId, query, userId, contextFileIds, mode });
    return res.data?.data;
  },
  semanticSearch: async ({ projectId, query, topK = 8, filters = {} }) => {
    const res = await api.post('/search/semantic', { projectId, query, topK, filters });
    return res.data?.data;
  }
};

export default ragService;
