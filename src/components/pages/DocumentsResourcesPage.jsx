import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  SparklesIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon as TrashIconSolid,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { assetsService } from '../../services/assetsService';
import { CheatSheetModal } from '../common/CheatSheet';
import DocumentViewerModal from '../ui/DocumentViewerModal';
import FileRenameModal from '../ui/FileRenameModal';
import DeleteConfirmationModal from '../ui/DeleteConfirmationModal';
import FolderRenameModal from '../ui/FolderRenameModal';
import { getFileTypeInfo } from '../../utils/fileTypeUtils';
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
  const [previewDocument, setPreviewDocument] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [filesToRename, setFilesToRename] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [folderRenameModalOpen, setFolderRenameModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trashItems, setTrashItems] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const fileInputRef = useRef(null);

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
    loadTrashItems();
  }, []); // Only load folders once on mount

  useEffect(() => {
    loadItems(currentFolder);
  }, [currentFolder, search]); // Only reload items when folder or search changes

  // Listen for refresh events from other components
  useEffect(() => {
    const handleRefresh = (event) => {
      console.log('🔄 Documents & Resources received refresh event:', event.detail);
      loadAllFolders();
      loadItems(currentFolder);
    };

    window.addEventListener('fm:refresh', handleRefresh);
    return () => window.removeEventListener('fm:refresh', handleRefresh);
  }, [currentFolder]);

  // Lazy sync project folders - only create when needed, not on every page load
  // This improves initial page load time dramatically
  useEffect(() => {
    // Project folders are now created on-demand when a project is accessed
    // or can be triggered manually via a sync button if needed
    // Removing automatic sync on mount to improve performance
  }, []);

  const handleUpload = async (filesToUpload = null) => {
    const files = filesToUpload || selectedFiles;
    
    console.log('🚀 handleUpload called with:', {
      filesToUpload: filesToUpload?.length || filesToUpload,
      selectedFiles: selectedFiles?.length || selectedFiles,
      finalFiles: files?.length || files,
      fileNames: files?.map(f => f?.name || f?.title || 'no-name') || []
    });
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error('❌ No files to upload - aborting');
      toast.error('No files selected for upload');
      return;
    }
    
    // Validate all files are File instances
    const invalidFiles = files.filter(f => !(f instanceof File));
    if (invalidFiles.length > 0) {
      console.error('❌ Invalid file objects:', invalidFiles);
      toast.error(`Invalid file objects detected. Please try selecting files again.`);
      return;
    }
    
    setUploading(true);
    try {
      console.log('📤 Starting upload with files:', files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      })));
      
      const result = await assetsService.uploadFiles({ 
        files, 
        parentId: currentFolder || null 
      });
      
      console.log('✅ Upload result:', result);
      
      // Reset file input if it exists
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reload the current folder to show new files
      await loadItems(currentFolder);
      
      // Close modals and reset state
      setUploadModalOpen(false);
      setSelectedFiles([]);
      setFilesToRename([]);
      
      toast.success(`Successfully uploaded ${files.length} file(s)!`);
    } catch (err) {
      console.error('❌ Upload error details:', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack
      });
      
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Unknown error occurred';
      
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      // Move to trash instead of permanent delete
      await assetsService.bulkOperation({ 
        operation: 'moveToTrash', 
        assetIds: [itemToDelete.id] 
      });
      await Promise.all([
        loadItems(currentFolder),
        loadAllFolders(),
        loadTrashItems()
      ]);
      toast.success(`${itemToDelete.type === 'FOLDER' ? 'Folder' : 'File'} moved to trash`);
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const loadTrashItems = async () => {
    try {
      const data = await assetsService.list({ type: 'TRASH', limit: 100 });
      setTrashItems(data?.assets || []);
    } catch (err) {
      console.error('Failed to load trash items');
    }
  };

  const handleRenameFolder = (folder) => {
    setFolderToRename(folder);
    setFolderRenameModalOpen(true);
  };

  const confirmRenameFolder = async (newName) => {
    if (!folderToRename) return;
    
    try {
      await assetsService.bulkOperation({
        operation: 'rename',
        assetIds: [folderToRename.id],
        newName: newName,
        parentId: folderToRename.parentId
      });
      await Promise.all([
        loadItems(currentFolder),
        loadAllFolders()
      ]);
      toast.success('Folder renamed successfully');
    } catch (err) {
      toast.error('Rename failed');
    } finally {
      setFolderRenameModalOpen(false);
      setFolderToRename(null);
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

  // Handle reordering within the same parent
  const handleReorder = async (draggedItem, targetIndex, items) => {
    if (!draggedItem) return;
    
    try {
      // Create new order array with updated sortOrder values
      const newOrder = items.map((item, index) => ({
        id: item.id,
        sortOrder: index
      }));
      
      await assetsService.bulkOperation({
        operation: 'reorder',
        assetIds: items.map(item => item.id),
        newOrder: newOrder
      });

      await loadAllFolders();
      await loadItems(currentFolder);
      toast.success(`Reordered ${draggedItem.title}`);
    } catch (err) {
      toast.error('Reorder failed');
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
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder); }}
              className="p-1 hover:bg-blue-100 rounded"
            >
              <PencilIcon className="h-4 w-4 text-blue-600" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(folder); }}
              className="p-1 hover:bg-red-100 rounded"
            >
              <TrashIcon className="h-4 w-4 text-red-600" />
            </button>
          </div>
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
      <div className="flex-shrink-0 bg-[#F8FAFC] text-white shadow-lg">
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
                className="w-40 px-3 py-1.5 bg-white border border-white/30 rounded-lg text-sm text-white placeholder-white/70 focus:bg-white focus:outline-none"
              />
              <button
                onClick={createFolder}
                className="px-2 py-1.5 bg-white hover:bg-white rounded-lg transition"
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
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-white/30 rounded-lg text-sm text-white placeholder-white/70 focus:bg-white focus:outline-none"
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
              className="px-3 py-1.5 bg-white hover:bg-white rounded-lg text-sm font-medium transition"
            >
              <SparklesIcon className="h-4 w-4 inline mr-1.5" />
              Playbook
            </button>
            <button
              onClick={() => {
                setShowTrash(!showTrash);
                if (!showTrash) loadTrashItems();
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                showTrash 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-white hover:bg-white'
              }`}
            >
              <TrashIconSolid className="h-4 w-4 inline mr-1.5" />
              {showTrash ? 'Hide Trash' : 'Trash'}
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
          {/* Drag and Drop Zone */}
          <div
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) {
                setFilesToRename(files);
                setRenameModalOpen(true);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed border-transparent hover:border-blue-300 transition-colors ${
              showTrash ? 'bg-red-50' : 'bg-slate-50'
            }`}
          >
            {/* Files & Folders Grid */}
            <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0089D1]"></div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {/* Folders */}
                {filteredFolders.map(folder => {
                  // Check if this is a project folder with metadata
                  const isProjectFolder = folder.metadata?.isProjectFolder;
                  const projectNumber = folder.metadata?.projectNumber;
                  const customerName = folder.metadata?.customerName;
                  const address = folder.metadata?.address;

                  return (
                    <div
                      key={folder.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, folder)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, folder.id)}
                      onClick={() => setCurrentFolder(folder.id)}
                      className={`p-3 bg-white border-2 rounded-xl cursor-pointer hover:shadow-md hover:border-blue-300 transition group relative ${
                        draggedItem?.id === folder.id ? 'opacity-50' : ''
                      } ${dropTarget === folder.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
                    >
                      <FolderIcon className="h-10 w-10 text-amber-500 mx-auto mb-2" />

                      {isProjectFolder && projectNumber ? (
                        // Project folder with formatted display
                        <div className="text-center space-y-0.5">
                          <p className="text-xs font-bold text-blue-600">#{projectNumber}</p>
                          <p className="text-xs font-medium text-gray-800 leading-tight break-words">{customerName || 'Unknown'}</p>
                          <p className="text-xs text-gray-600 leading-tight break-words">{address || folder.title}</p>
                        </div>
                      ) : (
                        // Regular folder
                        <p className="text-xs font-medium text-center leading-tight break-words">{folder.title}</p>
                      )}

                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder); }}
                          className="p-1 bg-blue-50 rounded hover:bg-blue-100"
                        >
                          <PencilIcon className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(folder); }}
                          className="p-1 bg-red-50 rounded hover:bg-red-100"
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Files */}
                {filteredFiles.map(file => {
                  const fileTypeInfo = getFileTypeInfo(file.mimeType, file.title);
                  
                  return (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, file)}
                      className={`p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition group relative ${
                        draggedItem?.id === file.id ? 'opacity-50' : ''
                      }`}
                      onClick={() => {
                        setPreviewDocument(file);
                        setIsViewerOpen(true);
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${
                          fileTypeInfo.color.replace('text-', 'bg-').replace('-500', '-100')
                        }`}>
                          <span className="text-2xl">{fileTypeInfo.icon}</span>
                        </div>
                        <p className="text-xs font-medium text-center text-gray-600 mb-1">
                          {fileTypeInfo.type}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-center truncate mb-1">{file.title}</p>
                      <p className="text-xs text-slate-500 text-center">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-50 rounded hover:bg-red-100"
                      >
                        <TrashIcon className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Trash View */}
      {showTrash && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <TrashIconSolid className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Trash</h3>
                  <p className="text-sm text-gray-600">Items will be permanently deleted after 90 days</p>
                </div>
              </div>
              <button
                onClick={() => setShowTrash(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              {trashItems.length === 0 ? (
                <div className="text-center py-8">
                  <TrashIconSolid className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Trash is empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {trashItems.map(item => (
                    <div key={item.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.type === 'FOLDER' ? (
                          <FolderIcon className="h-8 w-8 text-amber-500" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <span className="text-lg">{getFileTypeInfo(item.mimeType, item.title).icon}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            Deleted {new Date(item.deletedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Upload Files</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select files to upload
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  console.log('📁 Files selected:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
                  
                  if (files.length > 0) {
                    // Validate files are actual File instances
                    const validFiles = files.filter(f => f instanceof File);
                    if (validFiles.length !== files.length) {
                      console.error('❌ Some files are not File instances');
                      toast.error('Invalid file selection. Please try again.');
                      return;
                    }
                    
                    setFilesToRename(validFiles);
                    setUploadModalOpen(false);
                    setRenameModalOpen(true);
                  } else {
                    console.warn('⚠️ No files selected');
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { 
                  setUploadModalOpen(false); 
                  setSelectedFiles([]);
                  setFilesToRename([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <CheatSheetModal visible={showPlaybook} onClose={() => setShowPlaybook(false)} colorMode={false} />

      <FileRenameModal
        isOpen={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setFilesToRename([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        files={filesToRename}
        onConfirm={async (renamedFiles) => {
          console.log('✅ FileRenameModal confirmed with files:', renamedFiles.map(f => ({
            name: f.name,
            isFile: f instanceof File,
            size: f.size
          })));
          
          if (!renamedFiles || renamedFiles.length === 0) {
            console.error('❌ No renamed files received');
            toast.error('No files to upload');
            setRenameModalOpen(false);
            return;
          }
          
          // Validate all files are File instances
          const validFiles = renamedFiles.filter(f => f instanceof File);
          if (validFiles.length !== renamedFiles.length) {
            console.error('❌ Some renamed files are not File instances');
            toast.error('Invalid file objects. Please try uploading again.');
            setRenameModalOpen(false);
            setFilesToRename([]);
            return;
          }
          
          setRenameModalOpen(false);
          // Pass files directly to handleUpload to avoid state timing issues
          await handleUpload(validFiles);
        }}
        onCancel={() => {
          setRenameModalOpen(false);
          setFilesToRename([]);
          setSelectedFiles([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        colorMode={false}
      />

      <DocumentViewerModal
        document={previewDocument}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setPreviewDocument(null);
        }}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={itemToDelete?.title || ''}
        itemType={itemToDelete?.type === 'FOLDER' ? 'folder' : 'file'}
        colorMode={false}
      />

      <FolderRenameModal
        isOpen={folderRenameModalOpen}
        onClose={() => {
          setFolderRenameModalOpen(false);
          setFolderToRename(null);
        }}
        onConfirm={confirmRenameFolder}
        currentName={folderToRename?.title || ''}
        colorMode={false}
      />
    </div>
  );
};

export default DocumentsResourcesPage;
