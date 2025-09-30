import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CloudArrowUpIcon, FolderIcon, TrashIcon } from '@heroicons/react/24/outline';
import companyDocumentsService from '../../services/companyDocumentsService';

const ProjectDocumentsPage = ({ project, onBack, colorMode = false }) => {
  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [search, setSearch] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const fileInputRef = useRef(null);

  const safeProjectName = project?.projectName || project?.name || 'Project';
  const projectNumber = project?.projectNumber || project?.number || project?.project_id;

  const loadFolderTree = useCallback(async ({ forceRefresh = false } = {}) => {
    setTreeLoading(true);
    try {
      const list = await companyDocumentsService.listFolders({
        parentId: null,
        limit: 1000,
        forceRefresh,
      });
      setFolders(list);
    } catch (error) {
      console.error('Folder tree load error', error);
      toast.error(error?.response?.data?.message || 'Failed to load folders');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const loadFolderItems = useCallback(
    async ({ folderId = currentFolderId, term = search, forceRefresh = false } = {}) => {
      if (folderId === undefined) return;
      setLoading(true);
      try {
        const { assets = [], breadcrumbs: crumb = [] } = await companyDocumentsService.listAssets({
          parentId: folderId,
          search: term,
          limit: 200,
          forceRefresh,
        });

        const folderItems = assets.filter((asset) => asset.type === 'FOLDER');
        const fileItems = assets.filter((asset) => asset.type !== 'FOLDER');

        setFolders((prev) => {
          const map = new Map(prev.map((f) => [f.id, f]));
          folderItems.forEach((f) => map.set(f.id, f));
          return Array.from(map.values());
        });
        setFiles(fileItems);
        setBreadcrumbs(crumb);
        setSelectedIds(new Set());
        setCurrentFolderId(folderId);
      } catch (error) {
        console.error('Folder items load error', error);
        toast.error(error?.response?.data?.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    },
    [currentFolderId, search]
  );

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        setLoading(true);
        const folder = await companyDocumentsService.ensureProjectFolder(project);
        if (!mounted) return;
        await loadFolderTree({ forceRefresh: true });
        await loadFolderItems({ folderId: folder?.id ?? null, forceRefresh: true });
      } catch (error) {
        console.error('Project folder bootstrap error', error);
        toast.error(error?.response?.data?.message || 'Failed to initialise project documents');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [project, loadFolderTree, loadFolderItems]);

  const filteredFolders = useMemo(() => {
    if (!search) return folders.filter((f) => f.parentId === currentFolderId || (currentFolderId === null && !f.parentId));
    const term = search.toLowerCase();
    return folders.filter((f) => (f.parentId || null) === (currentFolderId || null) && (f.title || '').toLowerCase().includes(term));
  }, [folders, search, currentFolderId]);

  const filteredFiles = useMemo(() => {
    if (!search) return files;
    const term = search.toLowerCase();
    return files.filter(
      (file) =>
        (file.title || '').toLowerCase().includes(term) ||
        (file.description || '').toLowerCase().includes(term) ||
        (file.metadata?.originalName || '').toLowerCase().includes(term)
    );
  }, [files, search]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const folder = await companyDocumentsService.createFolder({ name, parentId: currentFolderId });
      toast.success(`Folder “${folder?.title || name}” created`);
      setNewFolderName('');
      await loadFolderTree({ forceRefresh: true });
      await loadFolderItems({ folderId: currentFolderId, forceRefresh: true });
    } catch (error) {
      console.error('Create folder error', error);
      toast.error(error?.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    try {
      const uploaded = await companyDocumentsService.uploadFiles({
        files: uploadFiles,
        parentId: currentFolderId,
      });
      toast.success(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? '' : 's'}`);
      setUploadFiles([]);
      setUploadOpen(false);
      await loadFolderItems({ forceRefresh: true });
    } catch (error) {
      console.error('Upload error', error);
      toast.error(error?.response?.data?.message || 'Upload failed');
    }
  };

  const handleDelete = async (ids) => {
    const toDelete = Array.isArray(ids) ? ids : [ids];
    if (toDelete.length === 0) return;
    const confirm = window.confirm(`Delete ${toDelete.length} item${toDelete.length === 1 ? '' : 's'}?`);
    if (!confirm) return;

    try {
      await companyDocumentsService.deleteAssets({ assetIds: toDelete, purge: false });
      toast.success('Items moved to archive');
      await loadFolderTree({ forceRefresh: true });
      await loadFolderItems({ forceRefresh: true });
    } catch (error) {
      console.error('Delete error', error);
      toast.error(error?.response?.data?.message || 'Delete failed');
    }
  };

  const handleMove = async ({ ids, targetId }) => {
    if (!ids || ids.length === 0) return;
    try {
      await companyDocumentsService.moveAssets({
        assetIds: ids,
        targetParentId: targetId ?? null,
      });
      toast.success('Item moved');
      await loadFolderTree({ forceRefresh: true });
      await loadFolderItems({ forceRefresh: true });
    } catch (error) {
      console.error('Move error', error);
      toast.error(error?.response?.data?.message || 'Move failed');
    }
  };

  const handleDownload = async (fileId) => {
    try {
      await companyDocumentsService.downloadAsset(fileId);
    } catch (error) {
      console.error('Download error', error);
      toast.error(error?.response?.data?.message || 'Download failed');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDragStart = (id) => setDraggingId(id);
  const handleDragEnter = (folderId) => setDropTargetId(folderId);
  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const onDropFolder = async (targetFolderId) => {
    if (!draggingId && selectedIds.size === 0) return;
    const dragIds = draggingId ? [draggingId] : Array.from(selectedIds);
    await handleMove({ ids: dragIds, targetId: targetFolderId });
    handleDragEnd();
  };

  const onDropToBreadcrumb = async (crumbId, index) => {
    const target = index === breadcrumbs.length - 1 ? crumbId : breadcrumbs[index + 1]?.id;
    await onDropFolder(target || null);
  };

  const isDark = Boolean(colorMode);
  const surface = isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';
  const cardSurface = isDark ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-900 border-gray-200';
  const subduedText = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const accent = 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className={`min-h-screen ${surface}`}>
      <header className={`sticky top-0 z-20 shadow-sm ${isDark ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg border ${borderColor} ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              title="Back to project"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Project Documents</h1>
              <p className={`text-sm ${subduedText}`}>
                {safeProjectName}
                {projectNumber ? ` • #${projectNumber}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="New folder name"
              className={`px-3 py-2 rounded-lg border ${borderColor} ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}
            />
            <button
              onClick={handleCreateFolder}
              className={`px-3 py-2 rounded-lg border ${borderColor} ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              New Folder
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm ${accent}`}
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              Upload
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <section className="mb-6 flex flex-wrap justify-between gap-3 items-center">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => loadFolderItems({ folderId: null })} className="font-medium">
              Home
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.id} className="flex items-center gap-2">
                <span>/</span>
                <button
                  onClick={() => loadFolderItems({ folderId: crumb.id })}
                  className={`${idx === breadcrumbs.length - 1 ? 'font-semibold' : ''}`}
                  onDragEnter={() => handleDragEnter(crumb.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTargetId(crumb.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropToBreadcrumb(crumb.id, idx);
                  }}
                >
                  {crumb.title || crumb.folderName}
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files or folders..."
              className={`px-4 py-2 rounded-lg border ${borderColor} ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}
            />
            <button
              onClick={clearSelection}
              className={`px-3 py-2 rounded-lg border ${borderColor} ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              disabled={selectedIds.size === 0}
            >
              Clear Selection
            </button>
            <button
              onClick={() => handleDelete(Array.from(selectedIds))}
              className={`px-3 py-2 rounded-lg border ${borderColor} ${isDark ? 'hover:bg-red-900 hover:text-red-200' : 'hover:bg-red-50 hover:text-red-600'}`}
              disabled={selectedIds.size === 0}
            >
              Delete Selected
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className={`rounded-xl border ${borderColor} ${cardSurface} p-4 h-fit`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FolderIcon className="h-4 w-4" />
                Folder Tree
              </h2>
              {treeLoading && <span className={`text-xs ${subduedText}`}>Refreshing…</span>}
            </div>
            <div className="space-y-1 text-sm">
              <button
                onClick={() => loadFolderItems({ folderId: null })}
                className={`w-full text-left px-2 py-1 rounded ${
                  dropTargetId === null ? (isDark ? 'bg-gray-700' : 'bg-gray-200') : ''
                }`}
              >
                Home
              </button>
              {folders
                .filter((folder) => (folder.parentId || null) === null)
                .map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    activeId={currentFolderId}
                    dropTargetId={dropTargetId}
                    onOpen={(id) => loadFolderItems({ folderId: id })}
                    onMove={onDropFolder}
                    onDragEnter={handleDragEnter}
                    folders={folders}
                    level={0}
                    isDark={isDark}
                  />
                ))}
            </div>
          </aside>

          <section className="md:col-span-3">
            <div className={`rounded-xl border ${borderColor} ${cardSurface}`}>
              <div className="p-4 border-b flex justify-between items-center">
                <span className="text-sm font-semibold">
                  {loading ? 'Loading…' : `${filteredFolders.length} folders • ${filteredFiles.length} files`}
                </span>
                {selectedIds.size > 0 && (
                  <span className="text-xs font-medium">
                    {selectedIds.size} selected — drag into another folder or delete
                  </span>
                )}
              </div>
              <div className="p-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredFolders.map((folder) => (
                    <article
                      key={folder.id}
                      draggable
                      onDragStart={() => handleDragStart(folder.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragEnter(folder.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        onDropFolder(folder.id);
                      }}
                      onClick={() => loadFolderItems({ folderId: folder.id })}
                      className={`relative rounded-lg border ${borderColor} ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} cursor-pointer p-4 ${
                        dropTargetId === folder.id ? (isDark ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-400') : ''
                      }`}
                    >
                      <FolderIcon className="h-8 w-8 text-amber-400" />
                      <h3 className="font-semibold truncate mt-2">{folder.title || folder.folderName}</h3>
                      <p className={`text-xs ${subduedText}`}>Updated {new Date(folder.updatedAt || folder.createdAt).toLocaleDateString()}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(folder.id);
                        }}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/10"
                        title="Delete folder"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </article>
                  ))}

                  {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                    <div className={`col-span-full text-center py-12 ${subduedText}`}>
                      <div className="text-5xl mb-3">📁</div>
                      <p>No documents yet. Create a folder or upload files to get started.</p>
                    </div>
                  )}

                  {filteredFiles.map((file) => {
                    const selected = selectedIds.has(file.id);
                    return (
                      <article
                        key={file.id}
                        draggable
                        onDragStart={() => handleDragStart(file.id)}
                        onDragEnd={handleDragEnd}
                        className={`relative rounded-lg border ${selected ? 'border-blue-500 ring-2 ring-blue-300' : borderColor} ${
                          isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
                        } p-4`}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey) {
                            e.stopPropagation();
                            toggleSelect(file.id);
                          } else {
                            clearSelection();
                            toggleSelect(file.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold break-words">{file.title}</h3>
                            <p className={`text-xs mt-1 ${subduedText}`}>
                              {(file.metadata?.originalName && file.metadata.originalName !== file.title && file.metadata.originalName) || ''}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file.id);
                            }}
                            className="p-1 rounded hover:bg-red-500/10"
                            title="Delete file"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 text-xs space-y-1">
                          <p>
                            Uploaded by{' '}
                            <strong>
                              {file.uploadedBy?.firstName} {file.uploadedBy?.lastName}
                            </strong>
                          </p>
                          <p>Uploaded {new Date(file.createdAt).toLocaleString()}</p>
                          <p>{(file.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file.id);
                            }}
                            className={`px-3 py-1 rounded border ${borderColor} ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          >
                            Download
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove({ ids: [file.id], targetId: null });
                            }}
                            className={`px-3 py-1 rounded border ${borderColor} ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          >
                            Move to Home
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>

      {uploadOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className={`max-w-lg w-full rounded-2xl shadow-xl p-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
            <header className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CloudArrowUpIcon className="h-5 w-5" />
                Upload files
              </h2>
              <button
                onClick={() => {
                  setUploadOpen(false);
                  setUploadFiles([]);
                }}
                className="p-1 rounded hover:bg-gray-500/10"
              >
                ×
              </button>
            </header>

            <section className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${borderColor}`}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files || []);
                  if (files.length) {
                    setUploadFiles((prev) => [...prev, ...files]);
                  }
                }}
              >
                <div className="text-4xl mb-2">📄</div>
                <p className="text-sm font-medium">Click to choose files or drag them here</p>
                <p className={`text-xs mt-1 ${subduedText}`}>PDF, Word, Excel, images up to 50 MB each</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) {
                    setUploadFiles((prev) => [...prev, ...files]);
                  }
                }}
              />
            </section>

            {uploadFiles.length > 0 && (
              <section className={`mt-4 rounded-lg border ${borderColor} p-3 space-y-2 text-sm`}>
                {uploadFiles.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex justify-between">
                    <span className="truncate">{file.name}</span>
                    <span className={subduedText}>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                ))}
              </section>
            )}

            <footer className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setUploadOpen(false);
                  setUploadFiles([]);
                }}
                className={`px-4 py-2 rounded border ${borderColor} ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0}
                className={`px-4 py-2 rounded ${accent} disabled:bg-gray-500 disabled:cursor-not-allowed`}
              >
                Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

const FolderTreeItem = ({ folder, folders, level, activeId, dropTargetId, onOpen, onMove, onDragEnter, isDark }) => {
  const children = folders.filter((child) => child.parentId === folder.id);
  return (
    <div>
      <button
        onClick={() => onOpen(folder.id)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragEnter(folder.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onMove({ ids: [], targetId: folder.id });
        }}
        className={`w-full flex items-center gap-2 px-2 py-1 rounded ${
          activeId === folder.id ? (isDark ? 'bg-blue-500/20' : 'bg-blue-100') : ''
        } ${dropTargetId === folder.id ? (isDark ? 'ring-2 ring-blue-400' : 'ring-2 ring-blue-300') : ''}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <FolderIcon className="h-4 w-4 text-amber-400" />
        <span className="truncate">{folder.title || folder.folderName}</span>
      </button>
      {children.length > 0 && (
        <div className="pl-2">
          {children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              folders={folders}
              level={level + 1}
              activeId={activeId}
              dropTargetId={dropTargetId}
              onOpen={onOpen}
              onMove={onMove}
              onDragEnter={onDragEnter}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectDocumentsPage;