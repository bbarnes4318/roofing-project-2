import api from './api';

const BASE_PATH = '/company-docs-enhanced';

const normalizeParentId = (parentId) => {
  if (parentId === undefined) return undefined;
  return parentId === null ? 'null' : parentId;
};

const buildParams = ({ parentId = null, search = '', type, sortBy, sortOrder, limit = 100, forceRefresh = false }) => {
  const params = {
    parentId: normalizeParentId(parentId),
    limit,
  };
  if (search) params.search = search;
  if (type) params.type = type;
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  if (forceRefresh) params._ = Date.now();
  return params;
};

const listAssets = async ({ parentId = null, search = '', type, sortBy, sortOrder, limit = 100, forceRefresh = false } = {}) => {
  const params = buildParams({ parentId, search, type, sortBy, sortOrder, limit, forceRefresh });
  const response = await api.get(`${BASE_PATH}/assets`, { params });
  return response.data?.data || { assets: [], breadcrumbs: [] };
};

const listFolders = async ({ parentId = null, search = '', limit = 500, forceRefresh = false } = {}) => {
  const data = await listAssets({ parentId, search, type: 'FOLDER', limit, forceRefresh });
  return data.assets || [];
};

const createFolder = async ({ name, parentId = null, description = '', section = null, accessLevel = 'private' }) => {
  const payload = {
    name,
    parentId,
    description,
    section,
    accessLevel,
  };
  const response = await api.post(`${BASE_PATH}/folders`, payload);
  return response.data?.data?.folder;
};

const uploadFiles = async ({ files, parentId = null, description = '', tags = [], accessLevel = 'private' }) => {
  if (!files || files.length === 0) {
    throw new Error('No files provided for upload');
  }
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  if (parentId !== null && parentId !== undefined) form.append('parentId', parentId);
  if (description) form.append('description', description);
  if (tags?.length) form.append('tags', JSON.stringify(tags));
  form.append('accessLevel', accessLevel);
  const response = await api.post(`${BASE_PATH}/assets/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data?.assets || [];
};

const moveAssets = async ({ assetIds, targetParentId }) => {
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw new Error('assetIds is required for move operation');
  }
  const response = await api.post(`${BASE_PATH}/bulk-operation`, {
    operation: 'move',
    assetIds,
    data: { parentId: targetParentId ?? null },
  });
  return response.data?.data;
};

const deleteAssets = async ({ assetIds, purge = false }) => {
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw new Error('assetIds is required for delete operation');
  }
  const operation = purge ? 'purge' : 'delete';
  const response = await api.post(`${BASE_PATH}/bulk-operation`, {
    operation,
    assetIds,
  });
  return response.data?.data;
};

const updateAsset = async (id, payload) => {
  const response = await api.patch(`${BASE_PATH}/assets/${id}`, payload);
  return response.data?.data?.asset;
};

const downloadAsset = async (id) => {
  const response = await api.get(`${BASE_PATH}/assets/${id}/download`, {
    responseType: 'blob',
  });
  const contentDisposition = response.headers['content-disposition'] || '';
  let filename = 'download';
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (match && match[1]) {
    filename = decodeURIComponent(match[1]);
  }
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const ensureFolderPath = async (segments = []) => {
  let parentId = null;
  let lastFolder = null;
  for (const rawName of segments) {
    const name = rawName.trim();
    if (!name) continue;
    const siblings = await listFolders({ parentId, limit: 1000, forceRefresh: false });
    lastFolder = siblings.find((folder) => (folder.folderName || folder.title || '').toLowerCase() === name.toLowerCase());
    if (!lastFolder) {
      lastFolder = await createFolder({ name, parentId });
    }
    parentId = lastFolder.id;
  }
  return lastFolder;
};

const ensureProjectFolder = async (project) => {
  if (!project) throw new Error('Project is required to resolve project folder');
  const rootFolder = await ensureFolderPath(['Projects']);
  const projectNumber = project.projectNumber || project.number || project.project_id;
  const projectName = project.projectName || project.name || 'Project';
  const displayName = projectNumber ? `${projectName} #${projectNumber}` : projectName;
  const projectFolder = await ensureFolderPath(['Projects', displayName]);
  return projectFolder || rootFolder;
};

const companyDocumentsService = {
  listAssets,
  listFolders,
  createFolder,
  uploadFiles,
  moveAssets,
  deleteAssets,
  updateAsset,
  downloadAsset,
  ensureProjectFolder,
};

export default companyDocumentsService;
