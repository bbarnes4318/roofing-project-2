import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  Bars3Icon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { assetsService } from '../../services/assetsService';
import { useProjects } from '../../hooks/useQueryApi';

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || value % 1 === 0 ? 0 : 1)} ${units[unit]}`;
};

const StatsCard = ({ icon: Icon, title, value, hint }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/90 shadow-sm px-4 py-3 border border-slate-200">
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-blue-500/20 flex items-center justify-center text-blue-600">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  </div>
);

const emptyDragEvents = (handler) => ({
  onDragOver: (e) => {
    if (e.dataTransfer?.types?.includes('Files') || e.dataTransfer?.types?.includes('text/asset-id')) {
      e.preventDefault();
    }
  },
  onDrop: handler,
});

export default function DocumentsResourcesPage() {
  const fileInputRef = useRef(null);
  const [parentId, setParentId] = useState(null);
  const [items, setItems] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [view, setView] = useState('grid');
  const [projectsRootId, setProjectsRootId] = useState(null);

  const searchTimeoutRef = useRef();

  const { data: projectsData } = useProjects();
  const projects = useMemo(() => {
    const raw = projectsData?.data || projectsData || [];
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 8);
  }, [projectsData]);

  const folders = useMemo(() => items.filter((i) => i.type === 'FOLDER'), [items]);
  const files = useMemo(() => items.filter((i) => i.type !== 'FOLDER'), [items]);

  const emitRefresh = (targetParentId = parentId) => {
    try {
      if (typeof window?.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: targetParentId ?? null } }));
      }
    } catch (_) {
      // no-op
    }
  };

  const load = useCallback(async (targetParentId = parentId, query = searchQuery) => {
    setLoading(true);
    try {
      const data = await assetsService.list({ parentId: targetParentId, search: query, limit: 200, sortBy: 'updatedAt', sortOrder: 'desc' });
      setItems(Array.isArray(data?.assets) ? data.assets : []);
      setBreadcrumbs(Array.isArray(data?.breadcrumbs) ? data.breadcrumbs : []);
    } catch (err) {
      console.error('Failed to load assets', err);
      setItems([]);
      setBreadcrumbs([]);
    } finally {
      setLoading(false);
    }
  }, [parentId, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event) => {
      const targetParentId = event?.detail?.parentId;
      if (typeof targetParentId !== 'undefined' && targetParentId !== null) {
        load(targetParentId);
      } else {
        load();
      }
    };
    window.addEventListener('fm:refresh', handler);
    return () => window.removeEventListener('fm:refresh', handler);
  }, [load]);

  useEffect(() => () => searchTimeoutRef.current && clearTimeout(searchTimeoutRef.current), []);

  const handleSearchInput = (value) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value.trim());
    }, 250);
  };

  const handleDragStart = (assetId) => {
    setDraggingId(assetId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const moveAsset = async (assetId, targetParentId) => {
    if (!assetId || targetParentId === undefined) return;
    try {
      await assetsService.bulkOperation({ operation: 'move', assetIds: [assetId], data: { parentId: targetParentId } });
      emitRefresh(targetParentId);
      await load();
      toast.success('Document moved');
    } catch (err) {
      console.error('Move failed', err);
      toast.error('Could not move item');
    } finally {
      handleDragEnd();
    }
  };

  const handleRootDrop = async (e) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/asset-id');
    if (assetId) {
      await moveAsset(assetId, parentId);
      return;
    }
    const filesDropped = Array.from(e.dataTransfer.files || []);
    if (!filesDropped.length) return;
    await uploadFiles(filesDropped, parentId);
  };

  const uploadFiles = async (fileList, targetParentId) => {
    if (!fileList.length) return;
    try {
      await assetsService.uploadFiles({ files: fileList, parentId: targetParentId });
      emitRefresh(targetParentId);
      await load(targetParentId);
      toast.success(fileList.length > 1 ? 'Files uploaded' : 'File uploaded');
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Upload failed');
    }
  };

  const ensureProjectsRoot = async () => {
    try {
      const roots = await assetsService.listFolders({ parentId: null, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
      let projRoot = roots.find((r) => (r.folderName || r.title) === 'Projects');
      if (!projRoot) {
        projRoot = await assetsService.createFolder({ name: 'Projects', parentId: null });
        emitRefresh(null);
      }
      if (projRoot?.id) setProjectsRootId(projRoot.id);
      return projRoot;
    } catch (err) {
      console.error('ensureProjectsRoot failed', err);
      return null;
    }
  };

  const ensureProjectFolder = async (project) => {
    if (!project) return null;
    const projRoot = projectsRootId ? { id: projectsRootId } : await ensureProjectsRoot();
    if (!projRoot?.id) return null;
    try {
      const children = await assetsService.listFolders({ parentId: projRoot.id, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
      const folderName = project.projectName || project.name || `Project ${project.id}`;
      let folder = children.find((c) => (c.folderName || c.title) === folderName);
      if (!folder) {
        folder = await assetsService.createFolder({ name: folderName, parentId: projRoot.id });
        emitRefresh(projRoot.id);
      }
      return folder;
    } catch (err) {
      console.error('ensureProjectFolder failed', err);
      return null;
    }
  };

  const openProjectFolder = async (project) => {
    const folder = await ensureProjectFolder(project);
    if (folder?.id) {
      setParentId(folder.id);
      await load(folder.id);
    }
  };

  const dropOnProject = async (e, project) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/asset-id');
    if (!assetId) return;
    const folder = await ensureProjectFolder(project);
    if (folder?.id) await moveAsset(assetId, folder.id);
  };

  const openItem = async (item) => {
    if (item.type === 'FOLDER') {
      setParentId(item.id);
      await load(item.id);
      return;
    }
    try {
      await assetsService.openInNewTab(item.id);
    } catch (err) {
      console.error('Preview failed', err);
      toast.error('Could not open document');
    }
  };

  const handleUploadButton = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileInputChange = async (e) => {
    const filesToUpload = Array.from(e.target.files || []);
    if (filesToUpload.length) await uploadFiles(filesToUpload, parentId);
    e.target.value = '';
  };

  const createFolder = async () => {
    const name = window.prompt('Folder name');
    if (!name) return;
    try {
      const folder = await assetsService.createFolder({ name: name.trim(), parentId });
      emitRefresh(parentId);
      await load(parentId);
      if (folder?.id) toast.success('Folder created');
    } catch (err) {
      console.error('Create folder failed', err);
      toast.error('Could not create folder');
    }
  };

  const goUp = () => {
    if (!breadcrumbs.length) {
      setParentId(null);
      return;
    }
    const next = [...breadcrumbs];
    next.pop();
    const target = next.length ? next[next.length - 1].id : null;
    setParentId(target ?? null);
  };

  const stats = useMemo(() => {
    const orderedFiles = files.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    const totalSize = orderedFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    return {
      totalItems: items.length,
      totalFolders: folders.length,
      totalFiles: files.length,
      totalSize,
      orderedFiles,
    };
  }, [items, folders.length, files]);

  const renderBreadcrumbs = () => (
    <nav className="flex items-center gap-1 text-sm text-slate-500">
      <button
        onClick={() => setParentId(null)}
        className={`px-2 py-1 rounded-md ${parentId === null ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}
      >
        Home
      </button>
      {breadcrumbs.map((crumb) => (
        <React.Fragment key={crumb.id}>
          <ChevronRightIcon className="h-4 w-4 text-slate-400" />
          <button
            onClick={() => setParentId(crumb.id)}
            className={`px-2 py-1 rounded-md ${parentId === crumb.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            {crumb.title || crumb.folderName}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );

  const fireProjectDocumentsEvent = (project) => {
    if (!project?.id) return;
    try {
      window.dispatchEvent(new CustomEvent('app:openProjectDocuments', { detail: { projectId: project.id, project } }));
    } catch (err) {
      console.error('Failed to emit project documents event', err);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white"
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
      }}
      onDrop={handleRootDrop}
    >
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />

      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 text-white">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.35),_transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm backdrop-blur">
                <SparklesIcon className="h-4 w-4" />
                Seamless document workspace
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Documents & Resources</h1>
              <p className="text-white/80 text-sm sm:text-base">
                Organize, share, and move everything effortlessly. Drag any document onto folders, projects, or this workspace to keep teams aligned.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                <div className="inline-flex items-center gap-1"><Squares2X2Icon className="h-4 w-4" /> Drag between sections</div>
                <div className="inline-flex items-center gap-1"><Bars3Icon className="h-4 w-4" /> Reorder anywhere</div>
                <div className="inline-flex items-center gap-1"><CloudArrowUpIcon className="h-4 w-4" /> Drop files to upload</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={createFolder}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2 border border-white/30 backdrop-blur hover:bg-white/20 transition"
              >
                <PlusIcon className="h-5 w-5" />
                New Folder
              </button>
              <button
                onClick={handleUploadButton}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-blue-600 font-semibold shadow-lg shadow-blue-800/20 hover:bg-blue-50 transition"
              >
                <CloudArrowUpIcon className="h-5 w-5" />
                Upload
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
            <StatsCard icon={FolderIcon} title="Folders" value={stats.totalFolders} />
            <StatsCard icon={DocumentIcon} title="Files" value={stats.totalFiles} hint={formatBytes(stats.totalSize)} />
            <StatsCard icon={ArrowPathIcon} title="In this view" value={`${stats.totalItems || 0} items`} hint={loading ? 'Refreshing…' : 'Updated moments ago'} />
            <StatsCard icon={CloudArrowUpIcon} title="Drag & drop" value="Enabled" hint="Move or upload anywhere" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={goUp}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                title="Go up one level"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </button>
              {renderBreadcrumbs()}
            </div>
            <div className="relative w-full max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search by file name, tags, or descriptions"
                className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2 text-sm shadow-inner focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className={`rounded-2xl border-2 border-dashed ${draggingId ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white'} p-4 transition`}
            {...emptyDragEvents(handleRootDrop)}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Drop here to move into this space</p>
                <p className="text-xs text-slate-500">You can also drop files to upload instantly.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CloudArrowUpIcon className="h-4 w-4" /> Drag files from anywhere
              </div>
            </div>
          </div>
        </section>

        {projects.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Projects quick access</h2>
              <p className="text-xs text-slate-500">Drop a file on a project to send it to that project folder.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id || project._id || project.projectId}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm transition hover:border-blue-300 hover:shadow-md ${draggingId ? 'ring-1 ring-blue-200' : ''}`}
                  onDragOver={(e) => {
                    if (e.dataTransfer?.types?.includes('text/asset-id')) e.preventDefault();
                  }}
                  onDrop={(e) => dropOnProject(e, project)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-blue-500/80">Project</p>
                      <h3 className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">{project.projectName || project.name}</h3>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-500">
                      <FolderIcon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                    {project.customer?.name || project.customerName || 'Linked documents'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => openProjectFolder(project)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                    >
                      <FolderIcon className="h-4 w-4" />
                      Open folder
                    </button>
                    <button
                      onClick={() => fireProjectDocumentsEvent(project)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                    >
                      <DocumentIcon className="h-4 w-4" />
                      Project docs
                    </button>
                  </div>
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-500/5 to-transparent" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Folders</h2>
            <span className="text-xs text-slate-400">Drag folders to nest them or drop files on a folder to move inside.</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.length === 0 && !loading ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center text-slate-400">
                <FolderIcon className="h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm font-semibold text-slate-500">No folders yet</p>
                <p className="text-xs text-slate-400">Create one to start organizing.
                </p>
              </div>
            ) : null}

            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`group relative rounded-2xl border px-4 py-5 shadow-sm transition ${draggingId === folder.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/asset-id', folder.id);
                  handleDragStart(folder.id);
                }}
                onDragEnd={handleDragEnd}
                onDoubleClick={() => openItem(folder)}
                onClick={() => openItem(folder)}
                onDragOver={(e) => {
                  if (e.dataTransfer?.types?.includes('text/asset-id')) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const assetId = e.dataTransfer.getData('text/asset-id');
                  if (!assetId || assetId === folder.id) return;
                  moveAsset(assetId, folder.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-500">
                    <FolderIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-slate-400">{(folder.children || []).length || ''}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900 line-clamp-2" title={folder.folderName || folder.title}>
                  {folder.folderName || folder.title}
                </h3>
                <p className="mt-2 text-xs text-slate-400" title={folder.description || ''}>
                  Updated {new Date(folder.updatedAt || folder.createdAt).toLocaleDateString()}
                </p>
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-100/30 to-transparent" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
              <span className="hidden md:inline text-xs text-slate-400">Drag to reorder visually or drop onto folders/projects to move.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setView('grid')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${view === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                  title="Grid view"
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${view === 'list' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                  title="List view"
                >
                  <Bars3Icon className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => load()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600"
              >
                <ArrowPathIcon className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>
          <span className="md:hidden block text-xs text-slate-400">Drag to reorder visually or drop onto folders/projects to move.</span>

          {stats.orderedFiles.length === 0 && folders.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
              <DocumentIcon className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 text-sm font-semibold text-slate-500">This space is empty</p>
              <p className="text-xs text-slate-400">Upload files or drag them from other folders to get started.</p>
            </div>
          ) : null}

          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {stats.orderedFiles.map((file) => {
              const isDragging = draggingId === file.id;
              const title = file.title || file.originalName || file.fileName;
              const commonHandlers = {
                draggable: true,
                onDragStart: (e) => {
                  e.dataTransfer.setData('text/asset-id', file.id);
                  handleDragStart(file.id);
                },
                onDragEnd: handleDragEnd,
                onDoubleClick: () => openItem(file),
                onClick: () => openItem(file),
              };

              if (view === 'list') {
                return (
                  <div
                    key={file.id}
                    {...commonHandlers}
                    className={`group flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 shadow-sm transition ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="rounded-xl bg-slate-100 p-3 text-slate-500">
                        <DocumentIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate" title={title}>
                          {title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatBytes(file.fileSize)} • Updated {new Date(file.updatedAt || file.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 justify-end">
                      {file.tags && file.tags.length ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          Tags
                          <span className="font-medium text-slate-700">{file.tags.slice(0, 2).join(', ')}{file.tags.length > 2 ? '…' : ''}</span>
                        </span>
                      ) : null}
                      {file.project?.name ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                          Linked to {file.project.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={file.id}
                  {...commonHandlers}
                  className={`group relative rounded-2xl border px-4 py-5 shadow-sm transition ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-slate-100 p-3 text-slate-500">
                      <DocumentIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate" title={title}>
                        {title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatBytes(file.fileSize)} • Updated {new Date(file.updatedAt || file.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                    {file.tags && file.tags.length ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                        Tags
                        <span className="font-medium text-slate-700">{file.tags.slice(0, 2).join(', ')}{file.tags.length > 2 ? '…' : ''}</span>
                      </span>
                    ) : null}
                    {file.project?.name ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                        Linked to {file.project.name}
                      </span>
                    ) : null}
                  </div>
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-100/20 to-transparent" />
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
