import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  SparklesIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { assetsService } from '../../services/assetsService';
import { CheatSheetModal } from '../common/CheatSheet';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DocumentsResourcesPage = () => {
  const [allFolders, setAllFolders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [newFolderName, setNewFolderName] = useState('');

  // Load folders for sidebar tree - optimized with smaller limit
  const loadAllFolders = async () => {
    try {
      const data = await assetsService.list({ type: 'FOLDER', limit: 100 });
      setAllFolders(data?.assets || []);
    } catch (err) {
      console.error('Failed to load folders');
    }
  };

  // Load items for current folder - optimized
  const loadItems = async (parentId = null) => {
    setLoading(true);
    try {
      const data = await assetsService.list({ parentId, search, limit: 50 });
      setItems(data?.assets || []);
      setBreadcrumbs(data?.breadcrumbs || []);
    } catch (err) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  // Optimized loading - folders load once, items reload on folder/search change
  useEffect(() => {
    loadAllFolders();
  }, []); // Only load folders once on mount

  useEffect(() => {
    loadItems(currentFolder);
  }, [currentFolder, search]); // Only reload items when folder or search changes

  // Lazy sync project folders - only create when needed, not on every page load
  // This improves initial page load time dramatically
  useEffect(() => {
    // Project folders are now created on-demand when a project is accessed
    // or can be triggered manually via a sync button if needed
    // Removing automatic sync on mount to improve performance
  }, []);

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      await assetsService.uploadFiles({ files: selectedFiles, parentId: currentFolder });
      await loadItems(currentFolder);
      setUploadModalOpen(false);
      setSelectedFiles([]);
      toast.success('Uploaded successfully!');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await assetsService.bulkOperation({ operation: 'delete', assetIds: [id] });
      await Promise.all([
        loadItems(currentFolder),
        loadAllFolders()
      ]);
      toast.success('Deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleDownload = async (item) => {
    try {
      await assetsService.saveToDisk(item.id, item.title);
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    
    console.log('Creating folder with:', { 
      name: newFolderName, 
      parentId: currentFolder 
    });
    
    try {
      const result = await assetsService.createFolder({ 
        name: newFolderName, 
        parentId: currentFolder 
      });
      
      console.log('Folder created successfully:', result);
      setNewFolderName('');
      await Promise.all([
        loadAllFolders(),
        loadItems(currentFolder)
      ]);
      toast.success(`Folder "${newFolderName}" created successfully!`);
    } catch (err) {
      console.error('Failed to create folder:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 400) {
        if (err.response?.data?.message?.toLowerCase().includes('already exists')) {
          toast.error(`A folder named "${newFolderName}" already exists in this location`);
        } else if (err.response?.data?.message) {
          toast.error(err.response.data.message);
        } else {
          toast.error('Invalid folder name. Please try a different name.');
        }
      } else if (err.response?.status === 401) {
        toast.error('Please log in to create folders');
      } else if (err.response?.status === 403) {
        toast.error('You do not have permission to create folders here');
      } else if (err.message === 'Network Error') {
        toast.error('Unable to connect to the server. Please check your connection.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to create folder. Please try again.');
      }
    }
  };

  // DRAG AND DROP HANDLERS
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;
    if (draggedItem.id === targetFolderId) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const nextParentId = targetFolderId ?? null;
    if (draggedItem.parentId === nextParentId) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    try {
      await assetsService.bulkOperation({
        operation: 'move',
        assetIds: [draggedItem.id],
        data: { parentId: nextParentId }
      });

      await loadAllFolders();
      await loadItems(currentFolder);
      toast.success(`Moved ${draggedItem.title}`);
    } catch (err) {
      toast.error('Move failed');
    } finally {
      setDraggedItem(null);
      setDropTarget(null);
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Build folder tree
  const buildFolderTree = (parentId = null) => {
    return allFolders.filter(f => (f.parentId || null) === parentId);
  };

  const folders = items.filter(i => i.type === 'FOLDER');
  const files = items.filter(i => i.type !== 'FOLDER');
  const filteredFolders = folders.filter(f => f.title?.toLowerCase().includes(search.toLowerCase()));
  const filteredFiles = files.filter(f => f.title?.toLowerCase().includes(search.toLowerCase()));

  // Recursive Folder Tree Component
  const FolderTreeItem = ({ folder, level = 0 }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const children = buildFolderTree(folder.id);
    
    return (
      <div>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition group ${
            currentFolder === folder.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'
          } ${dropTarget === folder.id ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onDragOver={(e) => { handleDragOver(e); setDropTarget(folder.id); }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          {children.length > 0 && (
            <button onClick={() => toggleFolder(folder.id)} className="p-0.5">
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          )}
          <FolderIcon className="h-5 w-5 flex-shrink-0 text-slate-500" />
          <span
            className="flex-1 text-sm truncate"
            onClick={() => setCurrentFolder(folder.id)}
          >
            {folder.title}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
          >
            <TrashIcon className="h-4 w-4 text-red-600" />
          </button>
        </div>
        {isExpanded && children.map(child => (
          <FolderTreeItem key={child.id} folder={child} level={level + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Compact Header with All Controls - Subtle Aqua Theme */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#0089D1] to-[#0069B5] text-white shadow-lg">
        <div className="px-6 py-3 flex items-center justify-between gap-6">
          {/* Left: Folder Creation */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold whitespace-nowrap">All Folders</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New folder..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                className="w-40 px-3 py-1.5 bg-white/20 border border-white/30 rounded-lg text-sm text-white placeholder-white/70 focus:bg-white/30 focus:outline-none"
              />
              <button
                onClick={createFolder}
                className="px-2 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Center: Search & Breadcrumbs */}
          <div className="flex-1 flex items-center gap-4">
            <div className="flex-1 relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white/20 border border-white/30 rounded-lg text-sm text-white placeholder-white/70 focus:bg-white/30 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setCurrentFolder(null)} className="text-white/90 hover:text-white font-medium">Home</button>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  <span className="text-white/60">/</span>
                  <button onClick={() => setCurrentFolder(crumb.id)} className="text-white/90 hover:text-white">{crumb.title}</button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowPlaybook(true)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition"
            >
              <SparklesIcon className="h-4 w-4 inline mr-1.5" />
              Playbook
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-3 py-1.5 bg-[#7ED242] text-white rounded-lg text-sm font-medium hover:bg-[#6BC22E] hover:shadow-lg transition"
            >
              <CloudArrowUpIcon className="h-4 w-4 inline mr-1.5" />
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Sidebar + Files */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR - ALL FOLDERS */}
        <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">
            <div
              className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer mb-1 ${
                currentFolder === null ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'
              }`}
              onClick={() => setCurrentFolder(null)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
            >
              <FolderIcon className="h-5 w-5 text-slate-500" />
              <span className="text-sm font-medium">Home</span>
            </div>
            {buildFolderTree(null).map(folder => (
              <FolderTreeItem key={folder.id} folder={folder} level={0} />
            ))}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Files & Folders Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0089D1]"></div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {/* Folders */}
                {filteredFolders.map(folder => (
                  <div
                    key={folder.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, folder.id)}
                    onClick={() => setCurrentFolder(folder.id)}
                    className={`p-4 bg-white border-2 rounded-xl cursor-pointer hover:shadow-md hover:border-blue-300 transition group ${
                      draggedItem?.id === folder.id ? 'opacity-50' : ''
                    } ${dropTarget === folder.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
                  >
                    <FolderIcon className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-center truncate">{folder.title}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-50 rounded hover:bg-red-100"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
                
                {/* Files */}
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                    className={`p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition group relative ${
                      draggedItem?.id === file.id ? 'opacity-50' : ''
                    }`}
                  >
                    <DocumentIcon className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-center truncate mb-1">{file.title}</p>
                    <p className="text-xs text-slate-500 text-center">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-50 rounded hover:bg-red-100"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Upload Files</h3>
            <input
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
              className="mb-4 w-full"
            />
            {selectedFiles.length > 0 && (
              <div className="mb-4 space-y-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="text-sm text-slate-600">{f.name}</div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setUploadModalOpen(false); setSelectedFiles([]); }}
                className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFiles.length || uploading}
                className="flex-1 px-6 py-3 bg-[#7ED242] text-white rounded-xl font-medium hover:bg-[#6BC22E] hover:shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CheatSheetModal visible={showPlaybook} onClose={() => setShowPlaybook(false)} colorMode={false} />
    </div>
  );
};

export default DocumentsResourcesPage;
