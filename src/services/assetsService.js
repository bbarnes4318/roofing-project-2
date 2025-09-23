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
  downloadUrl: (id) => `${API_BASE_URL}/assets/${id}/download`,

  // Authenticated download helpers (avoid opening URL without auth header)
  downloadBlob: downloadAssetBlob,

  openInNewTab: async (id) => {
    const { blob } = await downloadAssetBlob(id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Revoke later to free memory
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
