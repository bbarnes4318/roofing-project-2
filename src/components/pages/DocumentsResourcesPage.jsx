import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  EllipsisVerticalIcon,
  FolderIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { assetsService } from '../../services/assetsService';
import { CheatSheetModal } from '../common/CheatSheet';
import api from '../../services/api';

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

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

// Context Menu Component
const ContextMenu = ({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[180px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          disabled={item.disabled}
          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition ${
            item.danger
              ? 'text-red-600 hover:bg-red-50'
              : 'text-slate-700 hover:bg-slate-50'
          } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

// Sidebar folder tree item component
const FolderTreeItem = ({ folder, level = 0, isActive, onSelect, onDrop, draggingId, onContextMenu }) => {
  const [expanded, setExpanded] = useState(level === 0);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition group"
        style={{
          paddingLeft: `${8 + level * 16}px`,
          backgroundColor: isActive ? '#dbeafe' : undefined,
          color: isActive ? '#1d4ed8' : '#475569',
          opacity: draggingId === folder.id ? 0.5 : 1
        }}
        onClick={() => onSelect(folder)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, folder);
        }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/asset-id', folder.id);
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes('text/asset-id')) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(e, folder);
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex-shrink-0 hover:bg-slate-200 rounded p-0.5"
          >
            {expanded ? (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronRightIcon className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        {isActive || expanded ? (
          <FolderOpenIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#3b82f6' }} />
        ) : (
          <FolderIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
        )}
        <span className="text-sm truncate flex-1">{folder.folderName || folder.title}</span>
        {hasChildren && <span className="text-xs" style={{ color: '#94a3b8' }}>{folder.children.length}</span>}
      </div>
      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              isActive={false}
              onSelect={onSelect}
              onDrop={onDrop}
              draggingId={draggingId}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function DocumentsResourcesPage() {
  const fileInputRef = useRef(null);
  const [parentId, setParentId] = useState(null);
  const [items, setItems] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [view, setView] = useState('grid');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [showPlaybook, setShowPlaybook] = useState(false);

  const searchTimeoutRef = useRef();

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

  const loadFoldersTree = useCallback(async () => {
    try {
      const folders = await assetsService.listFolders({ parentId: null, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
      setAllFolders(Array.isArray(folders) ? folders : []);
    } catch (err) {
      console.error('Failed to load folders tree', err);
      setAllFolders([]);
    }
  }, []);

  // Auto-sync project folders with active projects
  const syncProjectFolders = useCallback(async () => {
    try {
      // Fetch all active projects
      const projectsResponse = await api.get('/projects');
      const projects = projectsResponse.data?.data || projectsResponse.data || [];
      
      if (!Array.isArray(projects) || projects.length === 0) return;

      // Find or create "Projects" parent folder
      const allRootFolders = await assetsService.listFolders({ parentId: null });
      let projectsFolder = allRootFolders.find(f => f.title === 'Projects' || f.folderName === 'Projects');
      
      if (!projectsFolder) {
        projectsFolder = await assetsService.createFolder({
          name: 'Projects',
          parentId: null,
          description: 'Automatically managed project folders'
        });
      }

      // Get existing project subfolders
      const existingProjectFolders = await assetsService.listFolders({ parentId: projectsFolder.id });
      
      // Create missing project folders
      for (const project of projects) {
        const projectNum = project.projectNumber || project.id;
        const folderName = `Project ${String(projectNum).padStart(5, '0')} - ${project.client?.name || project.clientName || 'Unknown'}`.substring(0, 100);
        
        // Check if folder already exists
        const exists = existingProjectFolders.find(f => f.metadata?.projectId === project.id);
        
        if (!exists) {
          await assetsService.createFolder({
            name: folderName,
            parentId: projectsFolder.id,
            description: `Auto-created folder for project ${projectNum}`,
            metadata: {
              projectId: project.id,
              projectNumber: projectNum,
              autoManaged: true
            }
          });
        }
      }

      // Reload folder tree after sync
      await loadFoldersTree();
    } catch (err) {
      console.error('Failed to sync project folders:', err);
    }
  }, [loadFoldersTree]);

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
    loadFoldersTree();
    // Auto-sync project folders on mount (debounced to avoid multiple calls)
    const timer = setTimeout(() => {
      syncProjectFolders();
    }, 1000);
    return () => clearTimeout(timer);
  }, [load, loadFoldersTree, syncProjectFolders]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Close context menu on Escape
      if (e.key === 'Escape') {
        setContextMenu(null);
        if (selectedItems.size > 0) {
          setSelectedItems(new Set());
        }
      }
      
      // Delete selected items on Delete/Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItems.size > 0 && !e.target.matches('input, textarea')) {
        e.preventDefault();
        deleteItems(Array.from(selectedItems));
      }
      
      // Select all with Ctrl+A
      if (e.key === 'a' && (e.ctrlKey || e.metaKey) && items.length > 0) {
        e.preventDefault();
        setSelectedItems(new Set(items.map(i => i.id)));
      }
      
      // Refresh with F5 or Ctrl+R
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
        e.preventDefault();
        load();
        loadFoldersTree();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, items, load, loadFoldersTree]);

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
    setUploading(true);
    try {
      // Check if uploading to a project folder by looking for project metadata in parent or ancestors
      let metadata = {};
      if (targetParentId) {
        // Find the target folder and check ancestors for project metadata
        const findProjectMetadata = (folderId) => {
          const folder = allFolders.find(f => f.id === folderId);
          if (!folder) return null;
          
          // Check current folder
          if (folder.metadata?.projectId) {
            return {
              projectId: folder.metadata.projectId,
              projectNumber: folder.metadata.projectNumber
            };
          }
          
          // Check parent folder recursively
          if (folder.parentId) {
            return findProjectMetadata(folder.parentId);
          }
          
          return null;
        };
        
        const projectMeta = findProjectMetadata(targetParentId);
        if (projectMeta) {
          metadata = projectMeta;
        }
      }

      await assetsService.uploadFiles({ 
        files: fileList, 
        parentId: targetParentId,
        metadata 
      });
      emitRefresh(targetParentId);
      await load(targetParentId);
      await loadFoldersTree();
      toast.success(`${fileList.length} ${fileList.length > 1 ? 'files' : 'file'} uploaded successfully`);
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
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
    const name = window.prompt('Folder name:');
    if (!name?.trim()) return;
    try {
      const folder = await assetsService.createFolder({ name: name.trim(), parentId });
      emitRefresh(parentId);
      await load(parentId);
      await loadFoldersTree();
      if (folder?.id) toast.success('Folder created successfully');
    } catch (err) {
      console.error('Create folder failed', err);
      toast.error(err.message || 'Could not create folder');
    }
  };

  const renameItem = async (item) => {
    const currentName = item.type === 'FOLDER' ? (item.folderName || item.title) : item.title;
    const newName = window.prompt(`Rename ${item.type === 'FOLDER' ? 'folder' : 'file'}:`, currentName);
    if (!newName?.trim() || newName === currentName) return;
    
    try {
      const updateData = item.type === 'FOLDER' 
        ? { title: newName.trim(), folderName: newName.trim() }
        : { title: newName.trim() };
      
      await assetsService.updateAsset(item.id, updateData);
      emitRefresh(parentId);
      await load(parentId);
      await loadFoldersTree();
      toast.success(`${item.type === 'FOLDER' ? 'Folder' : 'File'} renamed successfully`);
    } catch (err) {
      console.error('Rename failed', err);
      toast.error('Could not rename item');
    }
  };

  const deleteItems = async (itemIds) => {
    if (!itemIds || itemIds.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${itemIds.length} ${itemIds.length > 1 ? 'items' : 'item'}? This action cannot be undone.`
    );
    if (!confirmed) return;
    
    try {
      await assetsService.bulkOperation({ 
        operation: 'delete', 
        assetIds: Array.from(itemIds)
      });
      
      setSelectedItems(new Set());
      emitRefresh(parentId);
      await load(parentId);
      await loadFoldersTree();
      toast.success(`${itemIds.length} ${itemIds.length > 1 ? 'items' : 'item'} deleted successfully`);
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Could not delete items');
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

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: item.type === 'FOLDER' ? 'Open Folder' : 'Open File',
          icon: item.type === 'FOLDER' ? FolderOpenIcon : DocumentIcon,
          onClick: () => openItem(item),
        },
        {
          label: 'Rename',
          icon: PencilIcon,
          onClick: () => renameItem(item),
        },
        {
          label: 'Delete',
          icon: TrashIcon,
          danger: true,
          onClick: () => deleteItems([item.id]),
        },
      ],
    });
  };

  const handleItemClick = (item, e) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    } else if (e.detail === 2) {
      // Double click
      openItem(item);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Modern Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shadow-md" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                <FolderIcon className="h-5 w-5" style={{ color: '#ffffff' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Documents & Resources</h1>
                <p className="text-xs text-slate-500">Organize and manage your files</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', border: '1px solid' }}>
                <span className="text-sm font-medium" style={{ color: '#1d4ed8' }}>{selectedItems.size} selected</span>
                <button
                  onClick={() => deleteItems(Array.from(selectedItems))}
                  className="p-1 hover:bg-blue-100 rounded transition"
                  title="Delete selected"
                >
                  <TrashIcon className="h-4 w-4 text-red-600" />
                </button>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="p-1 hover:bg-blue-100 rounded transition"
                  title="Clear selection"
                >
                  <XMarkIcon className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowPlaybook(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition shadow-md"
              style={{ background: 'linear-gradient(to right, #f59e0b, #d97706)' }}
              title="Bubbles Assistant Playbook"
            >
              <SparklesIcon className="h-5 w-5" />
              Assistant Playbook
            </button>
            <button
              onClick={createFolder}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition shadow-sm disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              New Folder
            </button>
            <button
              onClick={handleUploadButton}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition shadow-md disabled:opacity-50"
              style={{ background: 'linear-gradient(to right, #2563eb, #1d4ed8)', color: '#ffffff' }}
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Folder Tree */}
        {!sidebarCollapsed && (
          <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Folders</h2>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 hover:bg-slate-100 rounded-md transition"
                title="Collapse sidebar"
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180 text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {/* Home/Root folder */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition"
                style={parentId === null ? {
                  background: 'linear-gradient(to right, #eff6ff, #dbeafe)',
                  color: '#1d4ed8',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                } : {}}
                onClick={() => {
                  setParentId(null);
                  load(null);
                  setSelectedItems(new Set());
                }}
                onDragOver={(e) => {
                  if (e.dataTransfer?.types?.includes('Files') || e.dataTransfer?.types?.includes('text/asset-id')) {
                    e.preventDefault();
                  }
                }}
                onDrop={handleRootDrop}
              >
                <FolderOpenIcon className="h-5 w-5 flex-shrink-0" style={{ color: parentId === null ? '#2563eb' : '#3b82f6' }} />
                <span className="text-sm font-semibold flex-1">Home</span>
                <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full">{allFolders.length}</span>
              </div>

              {/* Render all folders in tree structure */}
              {allFolders.map((folder) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  level={0}
                  isActive={parentId === folder.id}
                  onSelect={(f) => {
                    setParentId(f.id);
                    load(f.id);
                    setSelectedItems(new Set());
                  }}
                  onDrop={(e, f) => {
                    const assetId = e.dataTransfer.getData('text/asset-id');
                    if (assetId && assetId !== f.id) moveAsset(assetId, f.id);
                  }}
                  draggingId={draggingId}
                  onContextMenu={handleContextMenu}
                />
              ))}

              {allFolders.length === 0 && !loading && (
                <div className="px-3 py-12 text-center">
                  <FolderIcon className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500 mb-2">No folders yet</p>
                  <button
                    onClick={createFolder}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first folder
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Collapsed Sidebar Button */}
        {sidebarCollapsed && (
          <div className="w-14 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-4 shadow-sm">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2.5 hover:bg-slate-100 rounded-lg transition"
              title="Expand sidebar"
            >
              <FolderIcon className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        )}

        {/* Main Content Area: Documents & Breadcrumbs */}
        <main
          className="flex-1 flex flex-col overflow-hidden"
          onDragOver={(e) => {
            if (e.dataTransfer?.types?.includes('Files') || e.dataTransfer?.types?.includes('text/asset-id')) {
              e.preventDefault();
            }
          }}
          onDrop={handleRootDrop}
          onClick={() => setSelectedItems(new Set())}
        >
          {/* Breadcrumbs & Controls Bar */}
          <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <nav className="flex items-center gap-2 text-sm text-slate-600 min-w-0 flex-1">
                <button
                  onClick={() => {
                    setParentId(null);
                    load(null);
                  }}
                  className="px-3 py-1.5 rounded-md font-medium transition"
                  style={parentId === null ? { backgroundColor: '#dbeafe', color: '#1d4ed8' } : {}}
                >
                  Home
                </button>
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    <ChevronRightIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <button
                      onClick={() => {
                        setParentId(crumb.id);
                        load(crumb.id);
                      }}
                      className="px-3 py-1.5 rounded-md font-medium transition truncate"
                      style={idx === breadcrumbs.length - 1 ? {
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8'
                      } : { color: '#475569' }}
                    >
                      {crumb.title || crumb.folderName}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="Search..."
                    className="w-56 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition"
                  />
                </div>
                
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setView('grid')}
                    className="p-1.5 rounded-md transition shadow-sm"
                    style={view === 'grid' ? {
                      backgroundColor: '#ffffff',
                      color: '#2563eb'
                    } : { color: '#64748b' }}
                    title="Grid view"
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className="p-1.5 rounded-md transition shadow-sm"
                    style={view === 'list' ? {
                      backgroundColor: '#ffffff',
                      color: '#2563eb'
                    } : { color: '#64748b' }}
                    title="List view"
                  >
                    <Bars3Icon className="h-4 w-4" />
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    load();
                    loadFoldersTree();
                  }}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                  title="Refresh"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {items.length > 0 && (
            <div className="flex-shrink-0 px-6 py-2 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  <span className="font-medium">{stats.totalItems} items</span>
                  {stats.totalFolders > 0 && <span>{stats.totalFolders} folders</span>}
                  {stats.totalFiles > 0 && <span>{stats.totalFiles} files</span>}
                </div>
                {stats.totalSize > 0 && (
                  <span className="font-medium text-slate-700">{formatBytes(stats.totalSize)} total</span>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Documents Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ArrowPathIcon className="h-10 w-10 mx-auto mb-3 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-slate-600">Loading documents...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md px-6 py-12 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition">
                  <div className="p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)' }}>
                    <CloudArrowUpIcon className="h-10 w-10" style={{ color: '#2563eb' }} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Drop files here</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    {searchQuery ? 'No documents match your search.' : 'This folder is empty. Drag and drop files here or click the button below.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleUploadButton}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition shadow-md"
                      style={{ background: 'linear-gradient(to right, #2563eb, #1d4ed8)', color: '#ffffff' }}
                    >
                      <CloudArrowUpIcon className="h-5 w-5" />
                      Upload Files
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Folders Section */}
                {folders.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Folders</h3>
                    <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'space-y-2'}>
                      {folders.map((folder) => {
                        const isDragging = draggingId === folder.id;
                        const isDragOver = dragOverId === folder.id;
                        const isSelected = selectedItems.has(folder.id);
                        const folderName = folder.folderName || folder.title;

                        if (view === 'list') {
                          return (
                            <div
                              key={folder.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/asset-id', folder.id);
                                handleDragStart(folder.id);
                              }}
                              onDragOver={(e) => {
                                if (e.dataTransfer?.types?.includes('text/asset-id') && draggingId !== folder.id) {
                                  e.preventDefault();
                                  setDragOverId(folder.id);
                                }
                              }}
                              onDragLeave={() => setDragOverId(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragOverId(null);
                                const assetId = e.dataTransfer.getData('text/asset-id');
                                if (assetId && assetId !== folder.id) moveAsset(assetId, folder.id);
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => handleItemClick(folder, e)}
                              onContextMenu={(e) => handleContextMenu(e, folder)}
                              className="group flex items-center gap-3 px-4 py-3 rounded-lg border transition cursor-pointer"
                              style={isSelected ? {
                                borderColor: '#60a5fa',
                                backgroundColor: '#eff6ff',
                                boxShadow: '0 0 0 2px #bfdbfe'
                              } : isDragOver ? {
                                borderColor: '#4ade80',
                                backgroundColor: '#f0fdf4',
                                boxShadow: '0 0 0 2px #bbf7d0'
                              } : isDragging ? {
                                opacity: '0.5',
                                borderColor: '#cbd5e1',
                                backgroundColor: '#f8fafc'
                              } : {
                                borderColor: '#e2e8f0',
                                backgroundColor: '#ffffff'
                              }}
                            >
                              <FolderIcon className="h-5 w-5 flex-shrink-0" style={{ color: isSelected ? '#2563eb' : '#eab308' }} />
                              <span className="text-sm font-medium text-slate-900 truncate flex-1">{folderName}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContextMenu(e, folder);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition"
                              >
                                <EllipsisVerticalIcon className="h-4 w-4 text-slate-600" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={folder.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/asset-id', folder.id);
                              handleDragStart(folder.id);
                            }}
                            onDragOver={(e) => {
                              if (e.dataTransfer?.types?.includes('text/asset-id') && draggingId !== folder.id) {
                                e.preventDefault();
                                setDragOverId(folder.id);
                              }
                            }}
                            onDragLeave={() => setDragOverId(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverId(null);
                              const assetId = e.dataTransfer.getData('text/asset-id');
                              if (assetId && assetId !== folder.id) moveAsset(assetId, folder.id);
                            }}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => handleItemClick(folder, e)}
                            onContextMenu={(e) => handleContextMenu(e, folder)}
                            className="group relative p-4 rounded-xl border transition cursor-pointer"
                            style={isSelected ? {
                              borderColor: '#60a5fa',
                              backgroundColor: '#eff6ff',
                              boxShadow: '0 0 0 2px #bfdbfe'
                            } : isDragOver ? {
                              borderColor: '#4ade80',
                              backgroundColor: '#f0fdf4',
                              boxShadow: '0 0 0 2px #bbf7d0',
                              transform: 'scale(1.05)'
                            } : isDragging ? {
                              opacity: '0.5',
                              borderColor: '#cbd5e1',
                              backgroundColor: '#f8fafc'
                            } : {
                              borderColor: '#e2e8f0',
                              backgroundColor: '#ffffff'
                            }}
                          >
                            <div className="flex flex-col items-center text-center">
                              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: isSelected ? '#dbeafe' : '#fefce8' }}>
                                <FolderIcon className="h-8 w-8" style={{ color: isSelected ? '#2563eb' : '#eab308' }} />
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900 truncate w-full" title={folderName}>
                                {folderName}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContextMenu(e, folder);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition"
                              >
                                <EllipsisVerticalIcon className="h-4 w-4 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Files Section */}
                {files.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Files</h3>
                    <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'space-y-2'}>
                      {stats.orderedFiles.map((file) => {
                        const isDragging = draggingId === file.id;
                        const isSelected = selectedItems.has(file.id);
                        const title = file.title || file.originalName || file.fileName;

                        if (view === 'list') {
                          return (
                            <div
                              key={file.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/asset-id', file.id);
                                handleDragStart(file.id);
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => handleItemClick(file, e)}
                              onContextMenu={(e) => handleContextMenu(e, file)}
                              className="group flex items-center gap-3 px-4 py-3 rounded-lg border transition cursor-pointer"
                              style={isSelected ? {
                                borderColor: '#60a5fa',
                                backgroundColor: '#eff6ff',
                                boxShadow: '0 0 0 2px #bfdbfe'
                              } : isDragging ? {
                                opacity: '0.5',
                                borderColor: '#cbd5e1',
                                backgroundColor: '#f8fafc'
                              } : {
                                borderColor: '#e2e8f0',
                                backgroundColor: '#ffffff'
                              }}
                            >
                              <DocumentIcon className="h-5 w-5 flex-shrink-0" style={{ color: isSelected ? '#2563eb' : '#94a3b8' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate" title={title}>
                                  {title}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatBytes(file.fileSize)} • {formatDate(file.updatedAt || file.createdAt)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContextMenu(e, file);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition"
                              >
                                <EllipsisVerticalIcon className="h-4 w-4 text-slate-600" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={file.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/asset-id', file.id);
                              handleDragStart(file.id);
                            }}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => handleItemClick(file, e)}
                            onContextMenu={(e) => handleContextMenu(e, file)}
                            className="group relative p-4 rounded-xl border transition cursor-pointer"
                            style={isSelected ? {
                              borderColor: '#60a5fa',
                              backgroundColor: '#eff6ff',
                              boxShadow: '0 0 0 2px #bfdbfe'
                            } : isDragging ? {
                              opacity: '0.5',
                              borderColor: '#cbd5e1',
                              backgroundColor: '#f8fafc'
                            } : {
                              borderColor: '#e2e8f0',
                              backgroundColor: '#ffffff'
                            }}
                          >
                            <div className="flex flex-col items-center text-center">
                              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9' }}>
                                <DocumentIcon className="h-8 w-8" style={{ color: isSelected ? '#2563eb' : '#64748b' }} />
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900 truncate w-full mb-1" title={title}>
                                {title}
                              </h4>
                              <p className="text-xs text-slate-500">{formatBytes(file.fileSize)}</p>
                              <p className="text-xs text-slate-400">{formatDate(file.updatedAt || file.createdAt)}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContextMenu(e, file);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition"
                              >
                                <EllipsisVerticalIcon className="h-4 w-4 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Bubbles Assistant Playbook Modal */}
      <CheatSheetModal visible={showPlaybook} onClose={() => setShowPlaybook(false)} colorMode={false} />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
